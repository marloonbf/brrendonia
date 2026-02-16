import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) {
    return res.status(401).json({ ok: false, error: "MISSING_BEARER_TOKEN" });
  }

  // TODO: validar token no Supabase e buscar credits do profile
  return res.status(200).json({ ok: true, credits: 0 });
}
