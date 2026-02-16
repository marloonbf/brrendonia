/* eslint-disable no-console */
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.URL_SUPABASE || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      return res.status(200).send("✅ webhook payevo GET OK (vercel)");
    }

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        ok: false,
        error: "MISSING_ENV",
        message: "Faltou SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY na Vercel",
      });
    }

    const raw = req.body || {};
    const payment = pickPaymentPayload(raw);

    console.log("🔥 WEBHOOK PAYEVO (VERCEL) RECEBIDO");
    console.log(JSON.stringify(raw, null, 2));

    const status = extractStatus(payment);
    if (status !== "paid") {
      console.log("ℹ️ Ignorado: status != paid:", status);
      return res.status(200).json({ ok: true, ignored: true, status });
    }

    const email = extractEmail(payment);
    if (!email) {
      console.log("⚠️ Sem email no payload");
      return res.status(200).json({ ok: true, ignored: true, reason: "missing_email" });
    }

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id,email,plan,credits")
      .eq("email", email)
      .maybeSingle();

    if (pErr) throw pErr;

    if (!profile) {
      console.log("⚠️ Profile não encontrado:", email);
      return res.status(200).json({ ok: true, ignored: true, reason: "profile_not_found" });
    }

    const addCredits = creditsFromPayment(payment);
    const activatePro = shouldActivatePro(payment);

    const updatePayload = {};
    if (addCredits > 0) updatePayload.credits = Number(profile.credits || 0) + addCredits;
    if (activatePro) {
      updatePayload.plan = "pro";
      updatePayload.subscription_status = "active";
    }

    if (Object.keys(updatePayload).length === 0) {
      console.log("ℹ️ paid, mas sem regra");
      return res.status(200).json({ ok: true, ignored: true, reason: "no_rule_matched" });
    }

    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update(updatePayload)
      .eq("id", profile.id);

    if (upErr) throw upErr;

    console.log("✅ Perfil atualizado:", email, updatePayload);

    return res.status(200).json({ ok: true, applied: true, email, update: updatePayload });
  } catch (e) {
    console.error("❌ Erro webhook vercel:", e);
    return res.status(500).json({ ok: false, error: e?.message || "WEBHOOK_ERROR" });
  }
};
