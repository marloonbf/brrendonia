import { z } from "zod";

const PACKS: Record<string, { credits: number; linkEnv: string }> = {
  p150: { credits: 150, linkEnv: "PAYEVO_LINK_P150" },
  // depois você ativa:
  // p300: { credits: 300, linkEnv: "PAYEVO_LINK_P300" },
  // p500: { credits: 500, linkEnv: "PAYEVO_LINK_P500" },
};

function pickCheckoutUrl(packId: string) {
  const pack = PACKS[packId];
  if (!pack) return null;
  const url = process.env[pack.linkEnv];
  return url ? String(url) : null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const Body = z.object({
      pack_id: z.string().min(1).optional(),
      pack: z.string().min(1).optional(),
      payer_email: z.string().email().optional(),
    });

    const { pack_id, pack, payer_email } = Body.parse(req.body || {});
    const packId = String(pack_id || pack || "").trim();

    if (!packId) return res.status(400).json({ ok: false, error: "MISSING_PACK_ID" });

    const checkoutUrl = pickCheckoutUrl(packId);
    if (!checkoutUrl) {
      const expected = PACKS[packId]?.linkEnv || "PAYEVO_LINK_<PACK>";
      return res.status(400).json({
        ok: false,
        error: "MISSING_DATA",
        details: { missing: expected, received: { pack_id: packId, payer_email } },
      });
    }

    return res.json({ ok: true, checkout_url: checkoutUrl, pack_id: packId });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "PAY_CREATE_ERROR" });
  }
}