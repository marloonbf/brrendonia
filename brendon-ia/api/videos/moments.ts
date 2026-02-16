import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") return res.status(405).json({ ok: false });

    const video_id = req.query.video_id;
    if (!video_id) return res.status(400).json({ ok: false, error: "MISSING_VIDEO_ID" });

    const { data, error } = await supabaseAdmin
      .from("moments")
      .select("idx,start_sec,end_sec,title,hook,reason,score")
      .eq("video_id", video_id)
      .order("idx", { ascending: true });

    if (error) throw error;

    return res.json({ ok: true, moments: data || [] });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
