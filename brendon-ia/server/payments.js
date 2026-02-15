/* eslint-disable no-console */
require("dotenv").config();

/**
 * PayEvo via LINK DE PAGAMENTO (mais rápido e confiável)
 * - Você cria os links no painel PayEvo
 * - O backend só devolve o link certo por pack_id
 */

const PACKS = {
  p150: { credits: 150, linkEnv: "PAYEVO_LINK_P150" },
  // depois a gente ativa:
  // p300: { credits: 300, linkEnv: "PAYEVO_LINK_P300" },
  // p500: { credits: 500, linkEnv: "PAYEVO_LINK_P500" },
};

function pickCheckoutUrl(packId) {
  const pack = PACKS[packId];
  if (!pack) return null;

  const url = process.env[pack.linkEnv];
  if (!url) return null;

  return url;
}

function registerPaymentsRoutes(app, { requireAuth } = {}) {
  // ✅ criar checkout
  app.post("/payments/create", requireAuth || ((req, _res, next) => next()), async (req, res) => {
    try {
      const { pack_id, pack, payer_email } = req.body || {};

      // aceitamos pack_id ou pack
      const packId = String(pack_id || pack || "").trim();

      if (!packId) {
        return res.status(400).json({ ok: false, error: "MISSING_PACK_ID" });
      }

      // (payer_email é opcional nesse modo, mas deixo validado pra você ver no network)
      const email = payer_email ? String(payer_email).trim() : null;

      const checkoutUrl = pickCheckoutUrl(packId);

      if (!checkoutUrl) {
        // Aqui é exatamente o que estava virando MISSING_DATA
        // agora devolvemos um erro MAIS CLARO do que está faltando
        const expected = PACKS[packId]?.linkEnv || "PAYEVO_LINK_<PACK>";
        return res.status(400).json({
          ok: false,
          error: "MISSING_DATA",
          details: {
            missing: expected,
            received: { pack_id: packId, payer_email: email },
          },
        });
      }

      // ✅ retorno padrão pro Dashboard abrir em nova aba
      return res.json({
        ok: true,
        checkout_url: checkoutUrl,
        pack_id: packId,
      });
    } catch (e) {
      console.error("/payments/create error:", e);
      return res.status(500).json({ ok: false, error: "PAY_CREATE_ERROR" });
    }
  });

  // ✅ webhook (vamos configurar depois)
  app.post("/payments/webhook", async (_req, res) => {
    return res.json({ ok: true, message: "webhook endpoint online (em breve)" });
  });

  console.log("✅ Payments routes registradas: /payments/create e /payments/webhook");
}

module.exports = { registerPaymentsRoutes };
