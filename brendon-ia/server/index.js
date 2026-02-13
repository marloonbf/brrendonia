/* eslint-disable no-console */
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// ENV (server/.env)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY; // usado pra validar token (opcional)
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // usado pra escrever sem RLS

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Faltou SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no server/.env");
  process.exit(1);
}

// Client admin (bypassa RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Lê Bearer token e valida no Supabase Auth.
 * - Espera header: Authorization: Bearer <access_token>
 */
async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing Authorization Bearer token" });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid token" });
    }

    req.user = data.user;
    next();
  } catch (e) {
    console.error("requireAuth error:", e);
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}

/** HEALTH */
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "server", port: String(PORT) });
});

/** ====== CREDITS ====== **/

// Busca perfil + saldo
app.get("/credits/balance", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id,email,full_name,plan,credits")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    // Se não existir profile, cria
    if (!profile) {
      const { data: u } = await supabaseAdmin.auth.getUser(req.headers.authorization.slice(7));
      const email = u?.user?.email || null;

      const { data: created, error: createErr } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          email,
          full_name: null,
          plan: "free",
          credits: 0,
        })
        .select("id,email,full_name,plan,credits")
        .single();

      if (createErr) throw createErr;

      return res.json({ ok: true, profile: created });
    }

    return res.json({ ok: true, profile });
  } catch (e) {
    console.error("/credits/balance error:", e);
    return res.status(500).json({ ok: false, error: e?.message || "BALANCE_ERROR" });
  }
});

// Adiciona créditos
app.post("/credits/add", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount = 0, description = "add credits" } = req.body || {};

    const add = Number(amount);
    if (!Number.isFinite(add) || add <= 0) {
      return res.status(400).json({ ok: false, error: "INVALID_AMOUNT" });
    }

    // garante profile
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id,credits")
      .eq("id", userId)
      .maybeSingle();

    if (pErr) throw pErr;

    if (!profile) {
      const { error: createErr } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        email: req.user.email || null,
        full_name: null,
        plan: "free",
        credits: 0,
      });
      if (createErr) throw createErr;
    }

    // atualiza saldo
    const { data: updated, error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({ credits: (profile?.credits || 0) + add })
      .eq("id", userId)
      .select("credits")
      .single();

    if (upErr) throw upErr;

    // registra no ledger (se existir)
    await supabaseAdmin.from("credit_ledger").insert({
      user_id: userId,
      amount: add,
      description,
    });

    return res.json({ ok: true, credits: updated.credits });
  } catch (e) {
    console.error("/credits/add error:", e);
    return res.status(500).json({ ok: false, error: "ADD_CREDITS_ERROR" });
  }
});

/** ====== VIDEOS ====== **/

// Lista últimos 50
app.get("/videos/list", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from("videos")
      .select("id,title,source_type,source_url,target_duration,status,created_at,updated_at,processed_at,error_message")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    console.error("/videos/list error:", e);
    return res.status(500).json({ ok: false, error: "LIST_ERROR" });
  }
});

// Envia vídeo (YouTube) e desconta créditos
app.post("/videos/submit", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { url, minutes } = req.body || {};

    const cleanUrl = String(url || "").trim();
    const m = Number(minutes);

    if (!cleanUrl) return res.status(400).json({ ok: false, error: "MISSING_URL" });
    if (!Number.isFinite(m) || m <= 0) return res.status(400).json({ ok: false, error: "INVALID_MINUTES" });

    // pega saldo
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();

    if (pErr) throw pErr;

    const credits = Number(profile?.credits || 0);
    if (credits < m) {
      return res.status(402).json({ ok: false, error: "INSUFFICIENT_CREDITS", credits });
    }

    // desconta
    const newCredits = credits - m;
    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({ credits: newCredits })
      .eq("id", userId);

    if (upErr) throw upErr;

    // cria registro em videos COM SEU SCHEMA REAL:
    // - source_url (não url)
    // - target_duration (não minutes)
    // - title/source_type/category são obrigatórios
    const title = "YouTube video"; // depois você pode trocar por oEmbed
    const sourceType = "youtube";
    const category = "auto";
    const targetDuration = String(m); // seu campo é text

    const { data: inserted, error: vErr } = await supabaseAdmin
      .from("videos")
      .insert({
        user_id: userId,
        title,
        source_type: sourceType,
        source_url: cleanUrl,
        target_duration: targetDuration,
        category,
        status: "pending",
      })
      .select("id,title,status,created_at")
      .single();

    if (vErr) throw vErr;

    return res.json({
      ok: true,
      message: "Vídeo recebido! Processamento iniciado 🚀",
      credits_left: newCredits,
      video: inserted,
    });
  } catch (e) {
    console.error("/videos/submit error:", e);
    return res.status(500).json({ ok: false, error: "SUBMIT_ERROR" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${PORT}`);
});
