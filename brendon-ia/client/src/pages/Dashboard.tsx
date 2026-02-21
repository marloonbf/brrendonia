import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/api";
import { useNavigate } from "react-router-dom";

type BalanceResponse = {
  ok: boolean;
  credits?: number;
  profile?: { credits?: number };
  error?: string;
};

type SubmitResponse = {
  ok: boolean;
  message?: string;
  credits_left?: number;
  credits?: number;
  video_id?: string;
  error?: string;
};


type VideoItem = {
  id: string;
  title?: string | null;
  source_url?: string | null;
  minutes?: number | null;
  status?: string | null;
  created_at?: string | null;
  user_id?: string | null;

  thumbnail_url?: string | null;
  channel?: string | null;
  duration_seconds?: number | null;

  clip_start_sec?: number | null;
  clip_end_sec?: number | null;
  protect_sec?: number | null;
  clip_duration_sec?: number | null;
  model?: string | null;
  categories?: string[] | null;
  specific_prompt?: string | null;
};

type MomentItem = {
  id: string;
  video_id: string;
  idx: number;
  start_sec: number;
  end_sec: number;
  score?: number | null;
  title?: string | null;
  reason?: string | null;
  text?: string | null;
  created_at?: string | null;
};

type YTPreview = {
  ok: boolean;
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  url?: string;
  error?: string;
};

function parseYouTubeId(url: string): string | null {
  if (!url) return null;
  const u = url.trim();

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

function ytThumbFromId(videoId: string, quality: "hq" | "mq" | "sd" = "hq") {
  const q =
    quality === "sd" ? "sddefault" : quality === "mq" ? "mqdefault" : "hqdefault";
  return `https://i.ytimg.com/vi/${videoId}/${q}.jpg`;
}

function fmtTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(r)}`;
  return `${m}:${pad(r)}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();

  /**
   * DICA IMPORTANTE:
   * - Em produção (Vercel), o melhor é chamar sua API serverless via mesma origem.
   * - Então, deixe VITE_API_BASE vazio (ou nem crie), e use API_PREFIX "/api".
   *
   * Se você usa backend externo, coloque VITE_API_BASE="https://seu-backend.com"
   */

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [credits, setCredits] = useState<number>(0);
  const [userId, setUserId] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  // ===== formulário
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [minutes, setMinutes] = useState<number>(5);

  // UI “opus-like”
  const [model, setModel] = useState<string>("ClipAny");
  const [clipDurationSec, setClipDurationSec] = useState<number>(60);
  const [hookEnabled, setHookEnabled] = useState<boolean>(true);
  const [categories, setCategories] = useState<string[]>(["auto"]);
  const [specificPrompt, setSpecificPrompt] = useState<string>("");

  // range + proteção
  const [videoDurationSec, setVideoDurationSec] = useState<number>(0);
  const [clipStartSec, setClipStartSec] = useState<number>(0);
  const [clipEndSec, setClipEndSec] = useState<number>(0);
  const [protectSec, setProtectSec] = useState<number>(0);

  // preview youtube
  const [ytPreview, setYtPreview] = useState<YTPreview | null>(null);
  const [ytLoading, setYtLoading] = useState(false);
  const ytTimer = useRef<number | null>(null);

  // histórico
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // seleção do histórico
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  // top 10 moments
  const [moments, setMoments] = useState<MomentItem[]>([]);
  const [loadingMoments, setLoadingMoments] = useState(false);

  // pagamento
  const [payLoading, setPayLoading] = useState(false);

  // ======== créditos => trava minutos
  const maxMinutes = Math.max(1, credits);

  function clampMinutes(value: number) {
    if (!Number.isFinite(value)) return 1;
    if (value < 1) return 1;
    if (value > maxMinutes) return maxMinutes;
    return value;
  }

  const canSubmit =
    !loading &&
    !!userId &&
    youtubeUrl.trim().length > 0 &&
    minutes >= 1 &&
    minutes <= credits;

  async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

    // chama: {API_BASE}{API_PREFIX}{path}
    const url = `${API_BASE}${API_PREFIX}${path}`;
    const res = await fetch(url, { ...init, headers });
    return res;
  }

  function getThumbFromUrl(url?: string | null) {
    if (!url) return null;
    const id = parseYouTubeId(url);
    if (!id) return null;
    return ytThumbFromId(id, "mq");
  }

  // =========================
  // PREVIEW: capa + título
  // =========================
  async function loadYouTubePreview(url: string) {
    const clean = url.trim();
    if (!clean) {
      setYtPreview(null);
      return;
    }

    const looksLikeYT =
      clean.includes("youtube.com") ||
      clean.includes("youtu.be") ||
      clean.includes("youtube-nocookie.com");

    if (!looksLikeYT) {
      setYtPreview({ ok: false, error: "Cole um link do YouTube válido." });
      return;
    }

    const id = parseYouTubeId(clean);

    setYtLoading(true);
    setYtPreview(null);

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        clean
      )}&format=json`;

      const res = await fetch(oembedUrl);
      if (!res.ok) throw new Error(`oEmbed error (${res.status})`);

      const data = await res.json();

      const thumb = data?.thumbnail_url || (id ? ytThumbFromId(id, "hq") : undefined);

      setYtPreview({
        ok: true,
        title: data?.title,
        author_name: data?.author_name,
        thumbnail_url: thumb,
        url: clean,
      });
    } catch (e: any) {
      if (id) {
        setYtPreview({
          ok: true,
          title: "YouTube video",
          author_name: "Canal do YouTube",
          thumbnail_url: ytThumbFromId(id, "hq"),
          url: clean,
        });
      } else {
        setYtPreview({ ok: false, error: e?.message || "Falha ao carregar preview." });
      }
    } finally {
      setYtLoading(false);
    }
  }

  useEffect(() => {
    if (ytTimer.current) window.clearTimeout(ytTimer.current);
    ytTimer.current = window.setTimeout(() => {
      loadYouTubePreview(youtubeUrl);
    }, 450);

    return () => {
      if (ytTimer.current) window.clearTimeout(ytTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeUrl]);

  // =========================
  // Créditos
  // =========================
  async function fetchBalance() {
    try {
      const res = await apiFetch(`/credits/balance`);
      const json: BalanceResponse = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Erro balance (${res.status})`);
      }

      const c =
        typeof json.credits === "number"
          ? json.credits
          : json.profile?.credits ?? 0;

      setCredits(c);
      setMinutes((prev) => clampMinutes(prev));
      return c;
    } catch (e: any) {
      setMsg(`❌ Erro ao buscar créditos: ${e?.message || e}`);
      return null;
    }
  }

  // =========================
  // Histórico (Supabase)
  // =========================
  async function fetchVideos(limit = 50) {
    try {
      setLoadingVideos(true);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const user = userData?.user;
      if (!user) throw new Error("Usuário não encontrado (sem sessão).");

      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      const list = (data as VideoItem[]) || [];
      setVideos(list);

      if (selectedVideo) {
        const refreshed = list.find((v) => v.id === selectedVideo.id);
        if (refreshed) setSelectedVideo(refreshed);
      }

      return list;
    } catch (e: any) {
      setMsg((prev) => prev || `❌ Erro ao buscar histórico: ${e?.message || e}`);
      return [];
    } finally {
      setLoadingVideos(false);
    }
  }

  // =========================
  // Moments (Top 10)
  // =========================
  async function fetchMoments(videoId: string) {
    try {
      setLoadingMoments(true);

      const { data, error } = await supabase
        .from("moments")
        .select("*")
        .eq("video_id", videoId)
        .order("idx", { ascending: true })
        .limit(20);

      if (error) throw error;

      setMoments((data as MomentItem[]) || []);
    } catch (e: any) {
      setMoments([]);
      setMsg((prev) => prev || `❌ Erro ao buscar Top 10: ${e?.message || e}`);
    } finally {
      setLoadingMoments(false);
    }
  }

  function applyVideoToRangeUI(v: VideoItem) {
    const dur = typeof v.duration_seconds === "number" ? v.duration_seconds : 0;
    setVideoDurationSec(dur);

    const start = typeof v.clip_start_sec === "number" ? v.clip_start_sec : 0;
    const end =
      typeof v.clip_end_sec === "number"
        ? v.clip_end_sec
        : dur > 0
        ? dur
        : 0;

    setClipStartSec(Math.max(0, start));
    setClipEndSec(Math.max(0, end));
    setProtectSec(typeof v.protect_sec === "number" ? v.protect_sec : 0);

    setModel(v.model || "ClipAny");
    setClipDurationSec(typeof v.clip_duration_sec === "number" ? v.clip_duration_sec : 60);
    setCategories(Array.isArray(v.categories) && v.categories.length ? v.categories : ["auto"]);
    setSpecificPrompt(v.specific_prompt || "");
  }

  async function selectVideo(v: VideoItem) {
    setSelectedVideo(v);
    setMsg("");
    applyVideoToRangeUI(v);
    await fetchMoments(v.id);
  }

  /**
   * ✅ FIX DEFINITIVO (sem gambiarra):
   * - Nada de selectedVideo?.id virando string|undefined
   * - Guarda o videoId como string (após checar selectedVideo)
   * - O tick usa apenas o videoId estável
   * - Se mudar o selectedVideo/status, o interval anterior é limpo
   */
  useEffect(() => {
    if (!selectedVideo) return;

    const videoId: string = selectedVideo.id; // string garantida
    const status = (selectedVideo.status || "").toLowerCase();

    let timer: number | null = null;

    const tick = async () => {
      await fetchVideos(50);
      await fetchMoments(videoId);
    };

    if (status === "pending") {
      timer = window.setInterval(() => {
        void tick();
      }, 4000);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideo?.id, selectedVideo?.status]);

  // =========================
  // Comprar créditos (PayEvo)
  // =========================
  async function buyCredits(packId: string) {
    try {
      setPayLoading(true);
      setPayError("");

      // cria o checkout no backend (Vercel: /api/payments/create)
      const data = await apiFetch<{ ok: boolean; checkout_url?: string; error?: string }>(
        "/payments/create",
        {
          method: "POST",
          body: JSON.stringify({ pack_id: packId }),
        },
        true
      );

      if (!data?.ok || !data.checkout_url) {
        throw new Error(data?.error || "PAY_CREATE_FAILED");
      }

      window.location.href = data.checkout_url;
    } catch (e: any) {
      setPayError(e?.message || "Erro ao criar pagamento");
    } finally {
      setPayLoading(false);
    }
  }

      const link =
        json.payment_url ||
        json.checkout_url ||
        json.url ||
        json.init_point;

      if (!link) throw new Error("PAY_CREATE_NO_URL");

      window.open(link, "_blank", "noopener,noreferrer");
      setMsg("✅ Checkout aberto. Após pagar, volte e clique em “Atualizar saldo”.");
    } catch (e: any) {
      setMsg(`❌ Erro ao criar pagamento: ${e?.message || e}`);
    } finally {
      setPayLoading(false);
    }
  }

  // =========================
  // Envia vídeo (API)
  // =========================
  async function submitVideo() {
    try {
      setMsg("");

      if (!youtubeUrl.trim()) {
        setMsg("⚠️ Cole um link do YouTube.");
        return;
      }

      const minutesInt = Number(minutes);
      if (!Number.isFinite(minutesInt) || minutesInt <= 0) {
        setMsg("⚠️ Minutos precisa ser maior que 0.");
        return;
      }

      if (minutesInt > credits) {
        setMsg(`❌ Você tem ${credits} créditos. Reduza para no máximo ${credits}.`);
        return;
      }

      let start = Math.max(0, Math.floor(clipStartSec));
      let end = Math.max(0, Math.floor(clipEndSec));
      if (videoDurationSec > 0) {
        start = Math.min(start, videoDurationSec);
        end = Math.min(end, videoDurationSec);
        if (end < start) [start, end] = [end, start];
      }

      const res = await apiFetch(`/videos/submit`, {
        method: "POST",
        body: JSON.stringify({
          url: youtubeUrl.trim(),
          minutes: minutesInt,

          model,
          clip_duration_sec: clipDurationSec,
          hook_enabled: hookEnabled,
          categories,
          specific_prompt: specificPrompt,
          clip_start_sec: start,
          clip_end_sec: end,
          protect_sec: protectSec,
        }),
      });

      const json: SubmitResponse = await res.json();

      if (!res.ok || !json.ok) {
        if (res.status === 402 || json.error === "INSUFFICIENT_CREDITS") {
          const current = typeof json.credits === "number" ? json.credits : credits;
          setMsg(`❌ Sem créditos suficientes. Saldo atual: ${current}`);
          return;
        }
        throw new Error(json.error || "SUBMIT_ERROR");
      }

      const newCredits =
        typeof json.credits_left === "number"
          ? json.credits_left
          : typeof json.credits === "number"
          ? json.credits
          : credits;

      setCredits(newCredits);
      setMsg(
        `✅ ${json.message || "Vídeo recebido! Processamento iniciado 🚀"} | Créditos restantes: ${newCredits}`
      );

      setMinutes((prev) => clampMinutes(prev));

      const list = await fetchVideos(50);

      if (json.video_id) {
        const found = list.find((v) => v.id === json.video_id);
        if (found) await selectVideo(found);
      }
    } catch (e: any) {
      setMsg(`❌ Erro ao enviar vídeo: ${e?.message || e}`);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  // init
  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");

      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        navigate("/login");
        return;
      }

      const uid = data.user.id;
      setUserId(uid);
      setEmail(data.user.email || "");

      await fetchBalance();
      await fetchVideos(50);

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCategory(key: string) {
    setCategories((prev) => {
      const has = prev.includes(key);
      if (has) return prev.filter((x) => x !== key);
      return [...prev.filter((x) => x !== "auto"), key];
    });
  }

  const categoryButtons: { key: string; label: string }[] = [
    { key: "auto", label: "Deixe a IA detectar" },
    { key: "podcast", label: "Podcast" },
    { key: "lifestyle", label: "Estilo de vida" },
    { key: "sports", label: "Esportes" },
    { key: "marketing", label: "Marketing e webinar" },
    { key: "entertainment", label: "Entretenimento" },
    { key: "news", label: "Notícias" },
    { key: "education", label: "Informativos e educacionais" },
  ];

  const clipDurationOptions = [
    { label: "Automático (<90s)", value: 80 },
    { label: "30–59s", value: 45 },
    { label: "60–89s", value: 75 },
    { label: "90s–3m", value: 150 },
  ];

  const selectedThumb =
    selectedVideo?.thumbnail_url ||
    (selectedVideo?.source_url ? getThumbFromUrl(selectedVideo.source_url) : null);

  const selectedDuration =
    typeof selectedVideo?.duration_seconds === "number"
      ? selectedVideo.duration_seconds
      : videoDurationSec;

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topbar}>
          <div>
            <div style={styles.brandRow}>
              <div style={styles.dot} />
              <div style={{ fontWeight: 900 }}>brendon.ia</div>
              <div style={styles.badge}>Workflow</div>
            </div>
            <div style={styles.sub}>
              Logado como: <b>{email || "—"}</b>
            </div>
          </div>

          <div style={styles.topActions}>
            <div style={styles.creditsPill}>
              ⚡ <b style={{ marginLeft: 6 }}>{loading ? "…" : credits}</b>&nbsp;créditos
            </div>

            <button
              style={{
                ...styles.btnPrimary,
                opacity: payLoading || loading ? 0.75 : 1,
                cursor: payLoading || loading ? "not-allowed" : "pointer",
              }}
              onClick={() => buyCredits("pl50")}
              disabled={payLoading || loading}
            >
              Adicionar créditos
            </button>

            <button
              style={styles.btnGhost}
              onClick={async () => {
                setMsg("");
                await fetchBalance();
                await fetchVideos(50);
                const id = selectedVideo?.id;
                if (id) await fetchMoments(id);
              }}
              disabled={loading}
            >
              Atualizar
            </button>

            <button style={styles.btnGhost} onClick={handleLogout}>
              Sair
            </button>
          </div>
        </div>

        <div style={styles.grid}>
          <div>
            <div style={styles.card}>
              <div style={styles.cardTitle}>Obter momentos em 1 clique</div>
              <div style={styles.help}>
                Cole um link do YouTube. Você recebe <b>Top 10 momentos</b> com{" "}
                <b>timestamps + texto</b> — sem precisar assistir tudo.
              </div>

              <div style={{ height: 10 }} />

              <label style={styles.label}>Link do YouTube</label>
              <input
                style={styles.input}
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />

              <div style={{ height: 12 }} />

              <div style={styles.previewWrap}>
                {ytLoading ? (
                  <div style={styles.previewSkeleton}>
                    <div style={styles.skelThumb} />
                    <div style={{ flex: 1 }}>
                      <div style={styles.skelLine} />
                      <div style={{ height: 8 }} />
                      <div style={{ ...styles.skelLine, width: "65%" }} />
                    </div>
                  </div>
                ) : ytPreview?.ok ? (
                  <div style={styles.previewCard}>
                    <div style={styles.previewThumbWrap}>
                      <img
                        src={ytPreview.thumbnail_url}
                        alt="Capa do vídeo"
                        style={styles.previewThumb}
                        onError={(e) => {
                          const id = parseYouTubeId(ytPreview.url || "");
                          if (id) e.currentTarget.src = ytThumbFromId(id, "mq");
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.previewTitle} title={ytPreview.title}>
                        {ytPreview.title}
                      </div>
                      <div style={styles.previewMeta}>
                        {ytPreview.author_name
                          ? `Canal: ${ytPreview.author_name}`
                          : "Canal do YouTube"}
                      </div>
                      <div style={styles.previewMeta2}>
                        Dica: selecione abaixo a <b>parte do vídeo</b> (range) que você quer
                        analisar.
                      </div>

                      <div style={{ height: 10 }} />

                      <div style={styles.previewActions}>
                        <button
                          style={styles.btnGhostSm}
                          onClick={() =>
                            window.open(ytPreview.url, "_blank", "noopener,noreferrer")
                          }
                        >
                          Abrir no YouTube
                        </button>
                        <button
                          style={{
                            ...styles.btnPrimarySm,
                            opacity: canSubmit ? 1 : 0.6,
                            cursor: canSubmit ? "pointer" : "not-allowed",
                          }}
                          onClick={submitVideo}
                          disabled={!canSubmit}
                        >
                          Gerar meus momentos
                        </button>
                      </div>
                    </div>
                  </div>
                ) : youtubeUrl.trim() ? (
                  <div style={styles.previewError}>
                    {ytPreview?.error || "Cole um link do YouTube válido para ver a capa."}
                  </div>
                ) : (
                  <div style={styles.previewHint}>
                    Cole um link e vamos mostrar a <b>capa do vídeo</b> aqui (igual Opus).
                  </div>
                )}
              </div>

              <div style={{ height: 14 }} />

              <div style={styles.opusPanel}>
                <div style={styles.opusTabs}>
                  <div style={styles.opusTabActive}>Corte por IA</div>
                  <div style={styles.opusTab}>Não recortar</div>
                </div>

                <div style={styles.opusRow}>
                  <div style={{ minWidth: 180 }}>
                    <div style={styles.opusLabel}>Modelo de clipe</div>
                    <select
                      style={styles.select}
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    >
                      <option value="ClipAny">ClipAny</option>
                      <option value="ViralHook">ViralHook</option>
                      <option value="EduPro">EduPro</option>
                    </select>
                  </div>

                  <div style={{ minWidth: 220 }}>
                    <div style={styles.opusLabel}>Duração do Clip</div>
                    <select
                      style={styles.select}
                      value={clipDurationSec}
                      onChange={(e) => setClipDurationSec(Number(e.target.value))}
                    >
                      {clipDurationOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div style={styles.opusLabel}>Gancho automático</div>
                    <button
                      onClick={() => setHookEnabled((p) => !p)}
                      style={{
                        ...styles.toggle,
                        background: hookEnabled
                          ? "rgba(99,102,241,.95)"
                          : "rgba(255,255,255,.08)",
                      }}
                      aria-label="Gancho automático"
                    >
                      <span
                        style={{
                          ...styles.toggleDot,
                          transform: hookEnabled
                            ? "translateX(18px)"
                            : "translateX(0px)",
                        }}
                      />
                    </button>
                  </div>
                </div>

                <div style={styles.opusLabel}>Para melhores resultados, escolha gêneros</div>
                <div style={styles.chips}>
                  {categoryButtons.map((b) => {
                    const active =
                      categories.includes(b.key) ||
                      (b.key === "auto" &&
                        categories.length === 1 &&
                        categories[0] === "auto");
                    return (
                      <button
                        key={b.key}
                        onClick={() => {
                          if (b.key === "auto") setCategories(["auto"]);
                          else toggleCategory(b.key);
                        }}
                        style={{
                          ...styles.chip,
                          borderColor: active
                            ? "rgba(99,102,241,.65)"
                            : "rgba(255,255,255,.10)",
                          background: active
                            ? "rgba(99,102,241,.18)"
                            : "rgba(255,255,255,.04)",
                        }}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ height: 10 }} />

                <div style={styles.opusRow2}>
                  <div style={{ flex: 1 }}>
                    <div style={styles.opusLabelRow}>
                      <div style={styles.opusLabel}>momentos específicos</div>
                      <div style={styles.opusHint}>Ex.: “compile todos os momentos hilários”</div>
                    </div>
                    <input
                      style={styles.input}
                      placeholder="Exemplo: encontre todos os momentos em que alguém marcou um gol"
                      value={specificPrompt}
                      onChange={(e) => setSpecificPrompt(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ height: 12 }} />

                <div style={styles.rangeTitleRow}>
                  <div style={styles.opusLabel}>Selecionar trecho do vídeo</div>
                  <div style={styles.rangeMeta}>
                    Duração detectada: <b>{selectedDuration ? fmtTime(selectedDuration) : "—"}</b>
                  </div>
                </div>

                <div style={styles.rangeRow}>
                  <div style={styles.rangeBox}>
                    <div style={styles.rangeSmall}>Início</div>
                    <div style={styles.rangeTime}>{fmtTime(clipStartSec)}</div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, selectedDuration || 0)}
                      value={Math.min(clipStartSec, selectedDuration || clipStartSec)}
                      onChange={(e) => setClipStartSec(Number(e.target.value))}
                      style={styles.range}
                      disabled={!selectedDuration}
                    />
                  </div>

                  <div style={styles.rangeBox}>
                    <div style={styles.rangeSmall}>Fim</div>
                    <div style={styles.rangeTime}>
                      {fmtTime(clipEndSec || (selectedDuration || 0))}
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, selectedDuration || 0)}
                      value={Math.min(
                        clipEndSec || (selectedDuration || 0),
                        selectedDuration || (clipEndSec || 0)
                      )}
                      onChange={(e) => setClipEndSec(Number(e.target.value))}
                      style={styles.range}
                      disabled={!selectedDuration}
                    />
                  </div>
                </div>

                <div style={{ height: 10 }} />

                <div style={styles.rangeTitleRow}>
                  <div style={styles.opusLabel}>Tempo de proteção</div>
                  <div style={styles.rangeMeta}>
                    <b>{fmtTime(protectSec)}</b>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={30}
                  value={protectSec}
                  onChange={(e) => setProtectSec(Number(e.target.value))}
                  style={styles.range}
                />
              </div>

              <div style={{ height: 12 }} />

              <label style={styles.label}>Minutos para processar (gasta créditos)</label>
              <input
                style={styles.input}
                type="number"
                min={1}
                max={maxMinutes}
                value={minutes}
                onChange={(e) => setMinutes(clampMinutes(Number(e.target.value)))}
              />

              <div style={styles.small}>
                Máximo permitido agora: <b>{credits}</b> minutos • 1 crédito = 1 minuto
              </div>

              {msg ? <div style={styles.msg}>{msg}</div> : null}
            </div>

            <div style={{ height: 12 }} />

            <div style={styles.card}>
              <div style={styles.cardTitle}>Top 10 Momentos</div>
              <div style={styles.help}>
                Clique em um item do <b>Histórico</b> para carregar os resultados.
              </div>

              <div style={{ height: 10 }} />

              {!selectedVideo ? (
                <div style={styles.empty}>Selecione um vídeo no histórico.</div>
              ) : loadingMoments ? (
                <div style={styles.small}>Carregando momentos…</div>
              ) : moments.length === 0 ? (
                <div style={styles.empty}>
                  Ainda sem resultados. Status atual: <b>{selectedVideo.status || "—"}</b>.
                  <br />
                  Se ficar “pending” para sempre, o seu worker/IA não está gravando na tabela{" "}
                  <b>moments</b>.
                </div>
              ) : (
                <div style={styles.momentsList}>
                  {moments.slice(0, 10).map((m) => (
                    <div key={m.id} style={styles.momentCard}>
                      <div style={styles.momentTop}>
                        <div style={styles.momentIdx}>#{(m.idx ?? 0) + 1}</div>
                        <div style={styles.momentTime}>
                          {fmtTime(m.start_sec)} – {fmtTime(m.end_sec)}
                        </div>
                        <div style={styles.momentScore}>
                          Score{" "}
                          {typeof m.score === "number" ? Number(m.score).toFixed(1) : "—"}
                        </div>
                      </div>

                      <div style={styles.momentTitle}>{m.title || "Momento sugerido"}</div>

                      {m.reason ? <div style={styles.momentReason}>{m.reason}</div> : null}

                      {m.text ? <div style={styles.momentText}>{m.text}</div> : null}

                      <div style={styles.momentBtns}>
                        <button
                          style={styles.btnGhostSm}
                          onClick={() => {
                            const t = fmtTime(m.start_sec);
                            navigator.clipboard.writeText(t);
                            setMsg(`✅ Timestamp copiado: ${t}`);
                          }}
                        >
                          Copiar timestamp
                        </button>

                        {selectedVideo.source_url ? (
                          <button
                            style={styles.btnPrimarySm}
                            onClick={() => {
                              const id = parseYouTubeId(selectedVideo.source_url || "");
                              if (!id) return;
                              const url = `https://www.youtube.com/watch?v=${id}&t=${Math.max(
                                0,
                                m.start_sec
                              )}s`;
                              window.open(url, "_blank", "noopener,noreferrer");
                            }}
                          >
                            Abrir no YouTube
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={styles.right}>
            <div style={styles.card}>
              <div style={styles.cardTitleRow}>
                <div>
                  <div style={styles.cardTitle}>Histórico</div>
                  <div style={styles.help}>Últimos 50 pedidos</div>
                </div>
              </div>

              {loadingVideos ? (
                <div style={styles.small}>Carregando…</div>
              ) : videos.length === 0 ? (
                <div style={styles.empty}>Nenhum vídeo enviado ainda.</div>
              ) : (
                <div style={styles.historyList}>
                  {videos.map((v) => {
                    const thumb =
                      v.thumbnail_url || (v.source_url ? getThumbFromUrl(v.source_url) : null);

                    const active = selectedVideo?.id === v.id;

                    return (
                      <button
                        key={v.id}
                        style={{
                          ...styles.historyItem,
                          borderColor: active ? "rgba(99,102,241,.65)" : "rgba(255,255,255,.10)",
                          background: active ? "rgba(99,102,241,.10)" : "rgba(255,255,255,.03)",
                        }}
                        onClick={() => selectVideo(v)}
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt="thumb"
                            style={styles.historyThumb}
                            loading="lazy"
                            onError={(e) => {
                              const id = parseYouTubeId(v.source_url || "");
                              if (id) e.currentTarget.src = ytThumbFromId(id, "mq");
                            }}
                          />
                        ) : (
                          <div style={styles.thumbFallback} />
                        )}

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={styles.historyTitle} title={v.title || ""}>
                            {v.title || "YouTube video"}
                          </div>
                          <div style={styles.historyMeta}>
                            Min: <b>{typeof v.minutes === "number" ? v.minutes : "—"}</b> •{" "}
                            {fmtDate(v.created_at)}
                          </div>
                        </div>

                        <div style={styles.historyRight}>
                          <div style={styles.statusPill}>{(v.status || "pending").toLowerCase()}</div>
                          {v.source_url ? <span style={styles.openLink}>abrir</span> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedVideo ? (
              <div style={{ ...styles.card, marginTop: 12 }}>
                <div style={styles.cardTitle}>Selecionado</div>
                <div style={styles.selectedRow}>
                  {selectedThumb ? (
                    <img src={selectedThumb} alt="thumb" style={styles.selectedThumb} />
                  ) : (
                    <div style={styles.selectedThumbFallback} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.selectedTitle}>
                      {selectedVideo.title || "YouTube video"}
                    </div>
                    <div style={styles.selectedMeta}>
                      Status: <b>{selectedVideo.status || "—"}</b> • Duração:{" "}
                      <b>{selectedDuration ? fmtTime(selectedDuration) : "—"}</b>
                    </div>
                    {selectedVideo.source_url ? (
                      <button
                        style={{ ...styles.btnGhostSm, marginTop: 10 }}
                        onClick={() =>
                          window.open(selectedVideo.source_url!, "_blank", "noopener,noreferrer")
                        }
                      >
                        Abrir no YouTube
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 600px at 15% 10%, rgba(99,102,241,.25), transparent 60%), #0b0f16",
    color: "rgba(255,255,255,.92)",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    padding: 22,
  },
  shell: { width: "min(1280px, 100%)", margin: "0 auto" },

  topbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
    alignItems: "center",
    padding: "10px 10px 16px 10px",
  },
  brandRow: { display: "flex", gap: 10, alignItems: "center" },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    background: "rgba(99,102,241,.95)",
    boxShadow: "0 0 0 3px rgba(99,102,241,.18)",
  },
  badge: {
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.04)",
    fontSize: 12,
    color: "rgba(255,255,255,.75)",
  },
  sub: { marginTop: 6, color: "rgba(255,255,255,.70)", fontSize: 13 },

  topActions: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  creditsPill: {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.04)",
    fontSize: 13,
  },

  grid: { display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 14 },
  right: { alignSelf: "start" },

  card: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.03)",
    boxShadow: "0 20px 60px rgba(0,0,0,.45)",
    backdropFilter: "blur(10px)",
    padding: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: 900, marginBottom: 6 },
  cardTitleRow: { display: "flex", justifyContent: "space-between", gap: 10 },
  help: { color: "rgba(255,255,255,.62)", fontSize: 12, lineHeight: 1.35 },

  label: { display: "block", marginBottom: 6, color: "rgba(255,255,255,.72)", fontSize: 12 },
  input: {
    width: "100%",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.06)",
    color: "rgba(255,255,255,.92)",
    padding: "10px 12px",
    outline: "none",
  },
  select: {
    width: "100%",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.06)",
    color: "rgba(255,255,255,.92)",
    padding: "9px 10px",
    outline: "none",
  },
  small: { marginTop: 10, color: "rgba(255,255,255,.60)", fontSize: 12, lineHeight: 1.35 },

  btnPrimary: {
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    background: "rgba(99,102,241,.95)",
    color: "white",
    fontWeight: 900,
  },
  btnGhost: {
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    background: "transparent",
    border: "1px solid rgba(255,255,255,.18)",
    color: "rgba(255,255,255,.86)",
    fontWeight: 800,
  },

  previewWrap: {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.14)",
    padding: 12,
  },
  previewHint: { color: "rgba(255,255,255,.62)", fontSize: 12, lineHeight: 1.4 },
  previewError: { color: "rgba(255,190,190,.92)", fontSize: 12, lineHeight: 1.4 },
  previewCard: { display: "flex", gap: 12, alignItems: "stretch" },
  previewThumbWrap: {
    width: 220,
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.04)",
    flexShrink: 0,
  },
  previewThumb: { width: "100%", height: 124, objectFit: "cover", display: "block" },
  previewTitle: {
    fontWeight: 900,
    fontSize: 14,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  previewMeta: { marginTop: 6, color: "rgba(255,255,255,.66)", fontSize: 12 },
  previewMeta2: { marginTop: 6, color: "rgba(255,255,255,.60)", fontSize: 12, lineHeight: 1.35 },
  previewActions: { display: "flex", gap: 10, flexWrap: "wrap" },

  btnGhostSm: {
    borderRadius: 10,
    padding: "9px 12px",
    cursor: "pointer",
    background: "transparent",
    border: "1px solid rgba(255,255,255,.18)",
    color: "rgba(255,255,255,.88)",
    fontWeight: 800,
    fontSize: 12,
  },
  btnPrimarySm: {
    border: "none",
    borderRadius: 10,
    padding: "9px 12px",
    cursor: "pointer",
    background: "rgba(99,102,241,.95)",
    color: "white",
    fontWeight: 900,
    fontSize: 12,
  },

  previewSkeleton: { display: "flex", gap: 12, alignItems: "center" },
  skelThumb: {
    width: 220,
    height: 124,
    borderRadius: 12,
    background: "rgba(255,255,255,.08)",
    border: "1px solid rgba(255,255,255,.10)",
  },
  skelLine: {
    height: 12,
    width: "90%",
    borderRadius: 999,
    background: "rgba(255,255,255,.08)",
  },

  msg: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.05)",
    color: "rgba(255,255,255,.90)",
    fontSize: 13,
  },

  empty: {
    padding: 12,
    borderRadius: 12,
    border: "1px dashed rgba(255,255,255,.14)",
    color: "rgba(255,255,255,.62)",
    fontSize: 13,
    lineHeight: 1.4,
  },

  opusPanel: {
    marginTop: 10,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.18)",
    padding: 12,
  },
  opusTabs: { display: "flex", gap: 10, marginBottom: 10 },
  opusTabActive: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(99,102,241,.45)",
    background: "rgba(99,102,241,.18)",
    fontWeight: 900,
    fontSize: 12,
  },
  opusTab: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.03)",
    fontWeight: 800,
    fontSize: 12,
    color: "rgba(255,255,255,.70)",
  },
  opusRow: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" },
  opusRow2: { display: "flex", gap: 12, flexWrap: "wrap" },
  opusLabel: { color: "rgba(255,255,255,.72)", fontSize: 12, marginBottom: 6, fontWeight: 800 },
  opusLabelRow: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 6 },
  opusHint: { color: "rgba(255,255,255,.55)", fontSize: 12 },

  toggle: {
    width: 42,
    height: 24,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.12)",
    position: "relative",
    cursor: "pointer",
    padding: 2,
  },
  toggleDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    background: "white",
    display: "block",
    transition: "transform .18s ease",
  },

  chips: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    padding: "9px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.04)",
    color: "rgba(255,255,255,.86)",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },

  rangeTitleRow: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
  rangeMeta: { color: "rgba(255,255,255,.60)", fontSize: 12 },
  rangeRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 },
  rangeBox: {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.03)",
    padding: 10,
  },
  rangeSmall: { color: "rgba(255,255,255,.62)", fontSize: 12 },
  rangeTime: { fontWeight: 900, marginTop: 4 },
  range: { width: "100%", marginTop: 10 },

  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 10,
    maxHeight: "70vh",
    overflow: "auto",
    paddingRight: 6,
  },
  historyItem: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: 10,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.03)",
    cursor: "pointer",
    textAlign: "left",
  },
  historyThumb: {
    width: 56,
    height: 36,
    borderRadius: 10,
    objectFit: "cover",
    border: "1px solid rgba(255,255,255,.10)",
  },
  thumbFallback: {
    width: 56,
    height: 36,
    borderRadius: 10,
    background: "rgba(255,255,255,.06)",
    border: "1px dashed rgba(255,255,255,.12)",
  },
  historyTitle: {
    fontWeight: 900,
    fontSize: 13,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 280,
  },
  historyMeta: { marginTop: 4, color: "rgba(255,255,255,.60)", fontSize: 12 },
  historyRight: { display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" },
  statusPill: {
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.04)",
    fontSize: 11,
    fontWeight: 900,
    color: "rgba(255,255,255,.75)",
  },
  openLink: { fontSize: 12, color: "rgba(120,160,255,.95)", fontWeight: 900 },

  selectedRow: { display: "flex", gap: 12, alignItems: "center", marginTop: 10 },
  selectedThumb: { width: 110, height: 62, borderRadius: 12, objectFit: "cover", border: "1px solid rgba(255,255,255,.10)" },
  selectedThumbFallback: { width: 110, height: 62, borderRadius: 12, background: "rgba(255,255,255,.06)", border: "1px dashed rgba(255,255,255,.12)" },
  selectedTitle: { fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  selectedMeta: { marginTop: 6, color: "rgba(255,255,255,.62)", fontSize: 12 },

  momentsList: { display: "flex", flexDirection: "column", gap: 12, marginTop: 6 },
  momentCard: {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.16)",
    padding: 12,
  },
  momentTop: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  momentIdx: {
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(99,102,241,.45)",
    background: "rgba(99,102,241,.18)",
    fontWeight: 900,
    fontSize: 12,
  },
  momentTime: { fontWeight: 900, fontSize: 13 },
  momentScore: { marginLeft: "auto", color: "rgba(255,255,255,.65)", fontSize: 12, fontWeight: 800 },
  momentTitle: { marginTop: 10, fontWeight: 900 },
  momentReason: { marginTop: 8, color: "rgba(255,255,255,.70)", fontSize: 12, lineHeight: 1.35 },
  momentText: {
    marginTop: 10,
    color: "rgba(255,255,255,.86)",
    fontSize: 13,
    lineHeight: 1.45,
    borderLeft: "3px solid rgba(99,102,241,.55)",
    paddingLeft: 10,
  },
  momentBtns: { marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" },
};