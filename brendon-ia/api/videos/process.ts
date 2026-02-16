import { OpenAI } from "openai";
import { z } from "zod";
import { YoutubeTranscript } from "youtube-transcript";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function parseYouTubeId(url: string): string | null {
  const u = (url || "").trim();
  const short = u.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (short?.[1]) return short[1];
  const watch = u.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (watch?.[1]) return watch[1];
  const shorts = u.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/);
  if (shorts?.[1]) return shorts[1];
  const embed = u.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (embed?.[1]) return embed[1];
  return null;
}

function secToTimestamp(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

const MomentSchema = z.object({
  idx: z.number().int().min(1).max(10),
  start_sec: z.number().int().min(0),
  end_sec: z.number().int().min(1),
  title: z.string().min(3).max(80),
  hook: z.string().optional(),
  reason: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
});

const OutputSchema = z.object({
  moments: z.array(MomentSchema).length(10),
});

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok: false });

    const { video_id } = req.body || {};
    if (!video_id) return res.status(400).json({ ok: false, error: "MISSING_VIDEO_ID" });

    // 1) pega dados do vídeo
    const { data: video, error: vErr } = await supabaseAdmin
      .from("videos")
      .select("id, source_url, minutes, protect_start_sec, protect_end_sec, status")
      .eq("id", video_id)
      .single();

    if (vErr || !video) return res.status(404).json({ ok: false, error: "VIDEO_NOT_FOUND" });

    // marca como processing
    await supabaseAdmin.from("videos").update({ status: "processing", processing_error: null }).eq("id", video_id);

    const url = video.source_url || "";
    const ytId = parseYouTubeId(url);
    if (!ytId) throw new Error("INVALID_YOUTUBE_URL");

    // 2) transcript (sem baixar vídeo)
    const transcriptItems = await YoutubeTranscript.fetchTranscript(ytId);
    // items: {text, offset, duration}
    const protectStart = video.protect_start_sec ?? 0;
    const protectEnd = video.protect_end_sec; // pode ser null

    // limita por "minutes" (1 crédito = 1 minuto)
    const limitSec = Math.max(60, (Number(video.minutes) || 1) * 60);

    const filtered = transcriptItems
      .map((it: any) => ({
        text: (it.text || "").replace(/\s+/g, " ").trim(),
        start: Math.floor((it.offset ?? 0) / 1000),
        dur: Math.floor((it.duration ?? 0) / 1000),
      }))
      .filter((it: any) => it.text)
      .filter((it: any) => it.start >= protectStart)
      .filter((it: any) => (protectEnd ? it.start <= protectEnd : true))
      .filter((it: any) => it.start <= limitSec);

    if (filtered.length < 20) throw new Error("TRANSCRIPT_TOO_SHORT_OR_MISSING");

    // 3) monta texto com timestamps
    const transcriptText = filtered
      .map((it: any) => `[${secToTimestamp(it.start)}] ${it.text}`)
      .join("\n");

    // 4) chama IA e força JSON
    // A API /v1/responses é a atual (Responses API). :contentReference[oaicite:0]{index=0}
    const prompt = `
Você é um editor de cortes para TikTok/Reels.
A partir do transcript com timestamps, encontre os TOP 10 melhores momentos para viralizar.
Regras:
- Cada momento precisa ter start_sec e end_sec (em segundos).
- Duração ideal: 20s a 60s (pode variar, mas evite >90s).
- Deve ser um trecho com GANCHO forte (curiosidade, contraste, emoção, promessa, conflito, punchline).
- NÃO invente falas: use apenas o transcript.
- Selecione momentos bem espaçados (não repetir a mesma parte).
Retorne exatamente 10.

TRANSCRIPT:
${transcriptText}
    `.trim();

    const r = await openai.responses.create({
      model: "gpt-4.1",
      input: prompt,
      text: { format: { type: "json_schema", name: "TopMoments", schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          moments: {
            type: "array",
            minItems: 10,
            maxItems: 10,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                idx: { type: "integer", minimum: 1, maximum: 10 },
                start_sec: { type: "integer", minimum: 0 },
                end_sec: { type: "integer", minimum: 1 },
                title: { type: "string" },
                hook: { type: "string" },
                reason: { type: "string" },
                score: { type: "number", minimum: 0, maximum: 100 }
              },
              required: ["idx", "start_sec", "end_sec", "title"]
            }
          }
        },
        required: ["moments"]
      } }
    });

    const raw = (r.output_text || "").trim();
    const parsed = OutputSchema.parse(JSON.parse(raw));

    // 5) salva no banco (zera antigos, insere 10)
    await supabaseAdmin.from("moments").delete().eq("video_id", video_id);

    const rows = parsed.moments.map(m => ({
      video_id,
      idx: m.idx,
      start_sec: m.start_sec,
      end_sec: m.end_sec,
      title: m.title,
      hook: m.hook || null,
      reason: m.reason || null,
      score: m.score ?? null,
    }));

    const { error: iErr } = await supabaseAdmin.from("moments").insert(rows);
    if (iErr) throw iErr;

    await supabaseAdmin.from("videos")
      .update({ status: "done", processed_at: new Date().toISOString() })
      .eq("id", video_id);

    return res.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || String(e);
    // tenta marcar erro
    try {
      if (req?.body?.video_id) {
        await supabaseAdmin.from("videos")
          .update({ status: "error", processing_error: msg })
          .eq("id", req.body.video_id);
      }
    } catch {}
    return res.status(500).json({ ok: false, error: msg });
  }
}
