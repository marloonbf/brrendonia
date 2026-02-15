/* eslint-disable no-console */
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const { registerPaymentsRoutes } = require("./payments");

const app = express();

/**
 * =========================
 * CORS (PROFISSIONAL)
 * =========================
 */
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
app.use(
  cors({
    origin: CORS_ORIGIN === "*" ? "*" : CORS_ORIGIN,
    credentials: false,
  })
);

app.use(express.json());

const PORT = process.env.PORT || 3001;

// ENV
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Faltou SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no server/.env");
  process.exit(1);
}

// Client admin (bypassa RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * =========================
 * AUTH MIDDLEWARE
 * =========================
 */
async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Missing Authorization Bearer token",
      });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        ok: false,
        error: "Invalid token",
      });
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

/**
 * =========================
 * PAYMENTS (PAYEVO)
 * =========================
 */
registerPaymentsRoutes(app, supabaseAdmin);
console.log("✅ Payments routes registradas: /payments/create e /payments/webhook");

/** =========================
 * CREDITS
 * ========================= */

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
      const email = req.user.email || null;

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

      return res.json({ ok: true, credits: created.credits ?? 0, profile: created });
    }

    return res.json({ ok: true, credits: profile.credits ?? 0, profile });
  } catch (e) {
    console.error("/credits/balance error:", e);
    return res.status(500).json({ ok: false, error: e?.message || "BALANCE_ERROR" });
  }
});

// Bloqueado: crédito só via webhook
app.post("/credits/add", requireAuth, async (_req, res) => {
  return res.status(403).json({
    ok: false,
    error: "CREDITS_ADD_DISABLED",
    message: "Créditos só podem ser adicionados via pagamento (webhook).",
  });
});

/** =========================
 * VIDEOS
 * ========================= */

// Lista últimos 50
app.get("/videos/list", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from("videos")
      .select(
        "id,title,source_type,source_url,target_duration,minutes,status,created_at,updated_at,processed_at,error_message,user_id"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return res.json({ ok: true, videos: data || [] });
  } catch (e) {
    console.error("/videos/list error:", e);
    return res.status(500).json({ ok: false, error: "LIST_ERROR" });
  }
});

// Envia vídeo e desconta créditos
app.post("/videos/submit", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { url, minutes } = req.body || {};

    const cleanUrl = String(url || "").trim();
    const m = Number(minutes);

    if (!cleanUrl) return res.status(400).json({ ok: false, error: "MISSING_URL" });
    if (!Number.isFinite(m) || m <= 0) {
      return res.status(400).json({ ok: false, error: "INVALID_MINUTES" });
    }

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

    // cria registro do vídeo
    const title = "YouTube video";
    const sourceType = "youtube";
    const category = "auto";
    const targetDuration = String(m);

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

/**
 * ===============================
 * ✅ WEBHOOK PAYEVO (IDEMPOTENTE)
 * ===============================
 */

// Teste GET
app.get("/webhook/payevo", (_req, res) => {
  return res.status(200).send("✅ webhook payevo GET OK");
});

// Helpers
function pickPaymentPayload(body) {
  if (body && typeof body === "object") {
    return body.data && typeof body.data === "object" ? body.data : body;
  }
  return {};
}

function extractEmail(payment) {
  return (
    payment?.customer?.email ||
    payment?.buyer?.email ||
    payment?.email ||
    payment?.metadata?.email ||
    null
  );
}

function extractStatus(payment) {
  return String(payment?.status || payment?.payment_status || "").toLowerCase();
}

function extractDescription(payment) {
  return (
    payment?.description ||
    payment?.product?.name ||
    payment?.productName ||
    payment?.title ||
    ""
  );
}

// ✅ ID ÚNICO DO PAGAMENTO (pra não duplicar)
function extractProviderTxId(raw, payment) {
  // tenta pegar o melhor ID possível (PayEvo pode mandar de jeitos diferentes)
  return (
    payment?.id ||
    payment?.transactionId ||
    raw?.objectId ||
    raw?.data?.id ||
    raw?.id ||
    null
  );
}

function creditsFromPayment(payment) {
  const desc = extractDescription(payment).toLowerCase();
  if (desc.includes("150") && desc.includes("cr")) return 150;
  if (desc.includes("300") && desc.includes("cr")) return 300;
  if (desc.includes("500") && desc.includes("cr")) return 500;
  return 0;
}

function shouldActivatePro(payment) {
  const desc = extractDescription(payment).toLowerCase();
  return desc.includes("pro");
}

app.post("/webhook/payevo", async (req, res) => {
  try {
    const raw = req.body;
    const payment = pickPaymentPayload(raw);

    console.log("🔥🔥🔥 WEBHOOK PAYEVO RECEBIDO 🔥🔥🔥");
    // cuidado: payload pode ser grande, mas ok pra debug
    console.log(JSON.stringify(raw, null, 2));

    const status = extractStatus(payment);

    // Só processa quando realmente estiver pago
    if (status !== "paid") {
      console.log("ℹ️ Status não é paid ainda:", status);
      return res.status(200).json({ ok: true, ignored: true, status });
    }

    const email = extractEmail(payment);
    if (!email) {
      console.log("⚠️ Não achei email no payload. Não consigo dar PRO/Créditos.");
      return res.status(200).json({ ok: true, ignored: true, reason: "missing_email" });
    }

    const provider = "payevo";
    const providerTxId = extractProviderTxId(raw, payment);

    if (!providerTxId) {
      console.log("⚠️ Não achei providerTxId no payload. Sem isso, não dá pra garantir anti-duplicidade.");
      return res.status(200).json({ ok: true, ignored: true, reason: "missing_provider_tx_id" });
    }

    // ✅ PASSO A: tenta registrar o evento ANTES de aplicar crédito (idempotência)
    // Se já existir (mesmo provider + providerTxId), não aplica de novo.
    const { error: insErr } = await supabaseAdmin
      .from("payment_events")
      .insert({
        provider,
        provider_tx_id: String(providerTxId),
        email,
        status,
        credits: null, // vamos atualizar depois se aplicar
        raw,           // jsonb
      });

    if (insErr) {
      // Se for erro de duplicidade, ignora (já processado)
      // Postgres: unique_violation geralmente vem como 23505
      if (String(insErr.code) === "23505") {
        console.log("🔁 Webhook duplicado detectado. Ignorando. providerTxId:", providerTxId);
        return res.status(200).json({ ok: true, duplicate: true });
      }
      throw insErr;
    }

    // Busca profile por email
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id,email,plan,credits")
      .eq("email", email)
      .maybeSingle();

    if (pErr) throw pErr;

    if (!profile) {
      console.log("⚠️ Não existe profile com esse email no banco:", email);
      return res.status(200).json({ ok: true, ignored: true, reason: "profile_not_found" });
    }

    const addCredits = creditsFromPayment(payment);
    const activatePro = shouldActivatePro(payment);

    const updatePayload = {};

    if (addCredits > 0) {
      const newCredits = Number(profile.credits || 0) + Number(addCredits || 0);
      updatePayload.credits = newCredits;
    }

    if (activatePro) {
      updatePayload.plan = "pro";
      updatePayload.subscription_status = "active";
    }

    if (Object.keys(updatePayload).length === 0) {
      console.log("ℹ️ Pagamento paid, mas nenhuma regra aplicou (sem créditos/sem pro).");

      // atualiza o payment_events com credits=0 (só pra ficar bonitinho)
      await supabaseAdmin
        .from("payment_events")
        .update({ credits: 0 })
        .eq("provider", provider)
        .eq("provider_tx_id", String(providerTxId));

      return res.status(200).json({ ok: true, ignored: true, reason: "no_rule_matched" });
    }

    // Aplica atualização no perfil
    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update(updatePayload)
      .eq("id", profile.id);

    if (upErr) throw upErr;

    // Atualiza payment_events com os créditos aplicados (se aplicou)
    if (typeof addCredits === "number") {
      await supabaseAdmin
        .from("payment_events")
        .update({ credits: addCredits })
        .eq("provider", provider)
        .eq("provider_tx_id", String(providerTxId));
    }

    console.log("✅ Perfil atualizado:", { email, ...updatePayload });

    return res.status(200).json({
      ok: true,
      applied: true,
      email,
      update: updatePayload,
      providerTxId,
    });
  } catch (e) {
    console.error("❌ Erro webhook payevo:", e);
    return res.status(500).json({ ok: false, error: e?.message || "WEBHOOK_ERROR" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${PORT}`);
});
