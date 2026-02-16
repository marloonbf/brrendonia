import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    return res.status(401).json({ ok: false, error: "MISSING_BEARER_TOKEN" });
  }

  const body = (typeof req.body === "string" ? safeJson(req.body) : req.body) as any;
  const pack_id = body?.pack_id || "p150";
  const payer_email = body?.payer_email;

  // TODO: aqui você vai criar o link de pagamento no PayEvo/Mercado Pago
  // Por enquanto: retorna link fake só pra testar o fluxo no front
  return res.status(200).json({
    ok: true,
    pack_id,
    payer_email,
    payment_url: "https://example.com/checkout-fake"
  });
}

function safeJson(str: string) {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}
