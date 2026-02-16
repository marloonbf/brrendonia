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
  const url = String(body?.url || "").trim();
  const minutes = Number(body?.minutes || 0);

  if (!url) return res.status(400).json({ ok: false, error: "MISSING_URL" });
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return res.status(400).json({ ok: false, error: "INVALID_MINUTES" });
  }

  // TODO: salvar no Supabase e enfileirar processamento
  return res.status(200).json({
    ok: true,
    message: "Vídeo recebido (stub).",
    credits_left: 0,
    video_id: "stub-video-id"
  });
}

function safeJson(str: string) {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}
