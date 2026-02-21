import React, { useEffect, useMemo, useRef, useState } from "react";
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

type PaymentCreateResponse = {
  ok: boolean;
  error?: string;
  payment_url?: string;
  checkout_url?: string;
  url?: string;
  init_point?: string;
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
   * ✅ Sempre chame a API serverless pela mesma origem (HTTPS) usando /api.
   */
  const API_BASE = "";
  const API_PREFIX = "/api";

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [credits, setCredits] = useState<number>(0);
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
  const [clipStartSec, setClipStartSec] = useState<number>(0);
  const [clipEndSec, setClipEndSec] = useState<number>(0);
  const [protectSec, setProtectSec] = useState<number>(0);

  // preview yt
  const [yt, setYt] = useState<YTPreview>({ ok: false });
  const [ytLoading, setYtLoading] = useState<boolean>(false);

  // histórico + moments
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [moments, setMoments] = useState<MomentItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingMoments, setLoadingMoments] = useState(false);

  // ações
  const [submitLoading, setSubmitLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  const previewDebounce = useRef<number | null>(null);

  // ========= auth/session =========
  async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function fetchAuthed(path: string, init?: RequestInit) {
    const token = await getAccessToken();
    if (!token) throw new Error("Sem sessão. Faça login novamente.");

    const headers: Record<string, string> = {
      ...(init?.headers as any),
      Authorization: `Bearer ${token}`,
    };

    if (init?.body && typeof init.body === "string" && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

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

  // ========= init =========
  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session?.user) {
        navigate("/login");
        return;
      }

      if (!mounted) return;
      setUserId(session.user.id);
      setEmail(session.user.email || "");

      await refreshAll();
      setLoading(false);
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_ev, sess) => {
      if (!sess?.user) {
        navigate("/login");
        return;
      }
      setUserId(sess.user.id);
      setEmail(sess.user.email || "");
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshCredits() {
    try {
      const res = await fetchAuthed(`/credits/balance`);
      const raw = await res.text();
      let json: BalanceResponse | any = null;
      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        json = { ok: false, error: raw };
      }

      if (!res.ok || !json?.ok) throw new Error(json?.error || `BALANCE_ERROR (HTTP ${res.status})`);

      const c = Number(json?.credits ?? json?.profile?.credits ?? 0);
      setCredits(Number.isFinite(c) ? c : 0);
    } catch (e: any) {
      setCredits(0);
      setMsg(`❌ Erro ao buscar créditos: ${e?.message || e}`);
    }
  }

  async function refreshHistory() {
    try {
      setLoadingHistory(true);
      const res = await fetchAuthed(`/videos/list`);
      const raw = await res.text();
      let json: any = null;
      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        json = { ok: false, error: raw };
      }

      if (!res.ok || !json?.ok) throw new Error(json?.error || `LIST_ERROR (HTTP ${res.status})`);
      setVideos(json.videos || []);
    } catch (e: any) {
      setVideos([]);
      setMsg(`❌ Erro ao carregar histórico: ${e?.message || e}`);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function refreshAll() {
    await Promise.all([refreshCredits(), refreshHistory()]);
  }

  // ========= preview youtube (oembed) =========
  useEffect(() => {
    if (previewDebounce.current) window.clearTimeout(previewDebounce.current);

    const url = youtubeUrl.trim();
    if (!url) {
      setYt({ ok: false });
      return;
    }

    previewDebounce.current = window.setTimeout(async () => {
      try {
        setYtLoading(true);
        setYt({ ok: false });

        const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(
          url
        )}&format=json`;

        const res = await fetch(oembed);
        if (!res.ok) throw new Error("oEmbed failed");

        const json = await res.json();
        setYt({
          ok: true,
          title: json?.title,
          author_name: json?.author_name,
          thumbnail_url: json?.thumbnail_url,
          url,
        });
      } catch {
        // fallback: thumb by id
        const id = parseYouTubeId(url);
        if (id) {
          setYt({
            ok: true,
            title: "YouTube video",
            author_name: "",
            thumbnail_url: ytThumbFromId(id, "hq"),
            url,
          });
        } else {
          setYt({ ok: false, error: "Link inválido" });
        }
      } finally {
        setYtLoading(false);
      }
    }, 450);

    return () => {
      if (previewDebounce.current) window.clearTimeout(previewDebounce.current);
    };
  }, [youtubeUrl]);

  // ========= moments =========
  async function fetchMoments(videoId: string) {
    try {
      setLoadingMoments(true);
      setMoments([]);

      const { data, error } = await supabase
        .from("moments")
        .select("*")
        .eq("video_id", videoId)
        .order("idx", { ascending: true });

      if (error) throw error;
      setMoments((data as any) || []);
    } catch (e: any) {
      setMoments([]);
      setMsg(`❌ Erro ao buscar Top 10: ${e?.message || e}`);
    } finally {
      setLoadingMoments(false);
    }
  }

  // ========= submit =========
  async function submit() {
    try {
      if (submitLoading) return;
      setSubmitLoading(true);
      setMsg("");

      if (!youtubeUrl.trim()) throw new Error("Cole um link do YouTube.");

      const payload = {
        source_url: youtubeUrl.trim(),
        minutes,
        model,
        clip_duration_sec: clipDurationSec,
        hook_enabled: hookEnabled,
        categories,
        specific_prompt: specificPrompt || null,
        clip_start_sec: clipStartSec,
        clip_end_sec: clipEndSec,
        protect_sec: protectSec,
      };

      const res = await fetchAuthed(`/videos/submit`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      let json: SubmitResponse | any = null;
      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        json = { ok: false, error: raw };
      }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `SUBMIT_ERROR (HTTP ${res.status})`);
      }

      const left = Number(json?.credits_left ?? json?.credits ?? 0);
      if (Number.isFinite(left)) setCredits(left);

      setMsg("✅ Pedido enviado! Abra um item no Histórico para ver resultados.");
      await refreshHistory();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || e}`);
    } finally {
      setSubmitLoading(false);
    }
  }

  // ========= polling simples (status) =========
  useEffect(() => {
    if (!selectedVideo?.id) return;

    const timer = window.setInterval(async () => {
      await refreshHistory();
    }, 7000);

    return () => {
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideo?.id, selectedVideo?.status]);

  // =========================
  // Comprar créditos (PayEvo)
  // =========================
  async function buyCredits150() {
    try {
      if (payLoading) return;
      setPayLoading(true);
      setMsg("");

      const json: any = await apiFetch("/api/payments/create", {
        method: "POST",
        body: JSON.stringify({
          pack_id: "p150",
          payer_email: email || undefined,
        }),
      });

      if (!json?.ok) throw new Error(json?.error || "PAY_CREATE_ERROR");

      const link =
        json.payment_url || json.checkout_url || json.url || json.init_point;
      if (!link) throw new Error("PAY_CREATE_NO_URL");

      window.location.href = link;
    } catch (e: any) {
      setMsg(`❌ Erro ao criar pagamento: ${e?.message || e}`);
    } finally {
      setPayLoading(false);
    }
  }

  // ========= UI =========
  if (loading) {
    return (
      <div style={{ padding: 24, color: "white", fontFamily: "system-ui" }}>
        Carregando…
      </div>
    );
  }

  const ytThumb =
    yt.thumbnail_url ||
    (parseYouTubeId(youtubeUrl) ? ytThumbFromId(parseYouTubeId(youtubeUrl)!, "hq") : "");

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.brand}>
          <div style={s.logoDot} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={s.brandText}>brendon.ia</span>
              <span style={s.badge}>Workflow</span>
            </div>
            <div style={s.mutedSmall}>Logado como: {email}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              build: 2026-02-21-13h20
            </div>
          </div>
        </div>

        <div style={s.headerActions}>
          <div style={s.creditsPill}>
            <span style={s.dotOnline} />
            <span style={s.creditsText}>{credits} créditos</span>
          </div>

          <button style={s.btnPrimary} onClick={buyCredits150} disabled={payLoading}>
            {payLoading ? "Abrindo..." : "Adicionar créditos"}
          </button>

          <button style={s.btnGhost} onClick={refreshAll} disabled={loadingHistory}>
            Atualizar
          </button>

          <button
            style={s.btnDanger}
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/login");
            }}
          >
            Sair
          </button>
        </div>
      </header>

      <main style={s.main}>
        <section style={s.left}>
          <div style={s.card}>
            <h2 style={s.h2}>Obter momentos em 1 clique</h2>
            <p style={s.p}>
              Cole um link do YouTube. Você recebe Top 10 momentos com timestamps + texto — sem
              precisar assistir tudo.
            </p>

            <label style={s.label}>Link do YouTube</label>
            <input
              style={s.input}
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />

            <div style={s.previewBox}>
              <div style={s.thumb}>
                {ytLoading ? (
                  <div style={s.thumbSkeleton} />
                ) : ytThumb ? (
                  <img
                    src={ytThumb}
                    alt="thumb"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={s.thumbSkeleton} />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={s.previewTitle}>{yt?.title || "YouTube video"}</div>
                <div style={s.previewMeta}>
                  Canal: {yt?.author_name || "—"}
                  <br />
                  Dica: selecione abaixo a parte do vídeo (range) que você quer analisar.
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <a
                    href={youtubeUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    style={s.btnGhost as any}
                    onClick={(e) => {
                      if (!youtubeUrl) e.preventDefault();
                    }}
                  >
                    Abrir no YouTube
                  </a>

                  <button style={s.btnPrimary} onClick={submit} disabled={submitLoading}>
                    {submitLoading ? "Enviando..." : "Gerar meus momentos"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={s.card}>
            <div style={s.tabs}>
              <button style={s.tabActive}>Corte por IA</button>
              <button style={s.tab}>Não recortar</button>
            </div>

            <div style={s.grid2}>
              <div>
                <label style={s.label}>Modelo de clipe</label>
                <select style={s.select} value={model} onChange={(e) => setModel(e.target.value)}>
                  <option value="ClipAny">ClipAny</option>
                  <option value="ClipPodcast">ClipPodcast</option>
                </select>
              </div>

              <div>
                <label style={s.label}>Duração do Clip</label>
                <select
                  style={s.select}
                  value={clipDurationSec}
                  onChange={(e) => setClipDurationSec(Number(e.target.value))}
                >
                  <option value={45}>Automático (&lt;90s)</option>
                  <option value={30}>Curto (&lt;30s)</option>
                  <option value={60}>Médio (60s)</option>
                  <option value={90}>Longo (90s)</option>
                </select>
              </div>
            </div>

            <div style={s.rowBetween}>
              <div style={s.label}>Gancho automático</div>
              <button
                style={{
                  ...s.toggle,
                  background: hookEnabled ? "rgba(120,120,255,.35)" : "rgba(255,255,255,.08)",
                }}
                onClick={() => setHookEnabled((v) => !v)}
              >
                <span
                  style={{
                    ...s.toggleDot,
                    transform: hookEnabled ? "translateX(18px)" : "translateX(0px)",
                  }}
                />
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={s.mutedSmall}>Para melhores resultados, escolha gêneros</div>
              <div style={s.pills}>
                {[
                  { id: "auto", label: "Deixe a IA detectar" },
                  { id: "podcast", label: "Podcast" },
                  { id: "lifestyle", label: "Estilo de vida" },
                  { id: "sports", label: "Esportes" },
                  { id: "marketing", label: "Marketing e webinar" },
                  { id: "entertainment", label: "Entretenimento" },
                  { id: "news", label: "Notícias" },
                  { id: "education", label: "Informativos e educacionais" },
                ].map((c) => {
                  const active = categories.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      style={{
                        ...s.pill,
                        borderColor: active ? "rgba(120,120,255,.6)" : "rgba(255,255,255,.12)",
                        background: active ? "rgba(120,120,255,.18)" : "rgba(255,255,255,.06)",
                      }}
                      onClick={() => {
                        setCategories((prev) => {
                          if (prev.includes(c.id)) return prev.filter((x) => x !== c.id);
                          return [...prev.filter((x) => x !== "auto"), c.id];
                        });
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={s.label}>momentos específicos</label>
              <input
                style={s.input}
                value={specificPrompt}
                onChange={(e) => setSpecificPrompt(e.target.value)}
                placeholder="Exemplo: encontre todos os momentos em que alguém marcou um gol"
              />
              <div style={s.mutedSmall}>(Opcional) Quanto mais específico, melhor.</div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={s.rowBetween}>
                <div style={s.label}>Selecionar trecho do vídeo</div>
                <div style={s.mutedSmall}>
                  Duração detectada:{" "}
                  {selectedVideo?.duration_seconds ? fmtTime(selectedVideo.duration_seconds) : "—"}
                </div>
              </div>

              <div style={s.grid2}>
                <div>
                  <div style={s.label}>Início</div>
                  <div style={s.timeBox}>{fmtTime(clipStartSec)}</div>
                  <input
                    style={s.slider}
                    type="range"
                    min={0}
                    max={Math.max(0, (selectedVideo?.duration_seconds || 0) - 1)}
                    value={clipStartSec}
                    onChange={(e) => setClipStartSec(Number(e.target.value))}
                  />
                </div>

                <div>
                  <div style={s.label}>Fim</div>
                  <div style={s.timeBox}>{fmtTime(clipEndSec)}</div>
                  <input
                    style={s.slider}
                    type="range"
                    min={0}
                    max={Math.max(0, selectedVideo?.duration_seconds || 0)}
                    value={clipEndSec}
                    onChange={(e) => setClipEndSec(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={s.label}>Tempo de proteção</div>
                <input
                  style={s.slider}
                  type="range"
                  min={0}
                  max={30}
                  value={protectSec}
                  onChange={(e) => setProtectSec(Number(e.target.value))}
                />
                <div style={s.mutedSmall}>{fmtTime(protectSec)}</div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={s.label}>Minutos para processar (gasta créditos)</div>
                <input
                  style={s.input}
                  type="number"
                  min={1}
                  max={60}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                />
                <div style={s.mutedSmall}>
                  Máximo permitido agora: {credits} minutos • 1 crédito = 1 minuto
                </div>
              </div>
            </div>

            {msg ? <div style={s.msgBox}>{msg}</div> : null}
          </div>

          <div style={s.card}>
            <h3 style={s.h3}>Top 10 Momentos</h3>

            {loadingMoments ? (
              <div style={s.mutedSmall}>Carregando momentos…</div>
            ) : moments.length === 0 ? (
              <div style={s.mutedSmall}>
                Clique em um item do Histórico para carregar os resultados.
                <br />
                Se continuar vazio, significa que ainda não foram gerados “moments” para esse vídeo.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {moments.map((m) => {
                  const ytId = parseYouTubeId(selectedVideo?.source_url || youtubeUrl);
                  const startLink = ytId
                    ? `https://www.youtube.com/watch?v=${ytId}&t=${m.start_sec}s`
                    : selectedVideo?.source_url || "#";

                  return (
                    <div key={m.id} style={s.momentRow}>
                      <div style={s.momentLeft}>
                        <div style={s.momentTime}>
                          {fmtTime(m.start_sec)} → {fmtTime(m.end_sec)}
                        </div>
                        <div style={s.momentTitle}>{m.title || "Momento"}</div>
                        <div style={s.momentReason}>{m.reason || m.text || "—"}</div>
                      </div>

                      <div style={s.momentRight}>
                        <a href={startLink} target="_blank" rel="noreferrer" style={s.btnGhost as any}>
                          Abrir
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside style={s.right}>
          <div style={s.card}>
            <div style={s.rowBetween}>
              <h3 style={s.h3}>Histórico</h3>
              <div style={s.mutedSmall}>Últimos 50 pedidos</div>
            </div>

            {loadingHistory ? (
              <div style={s.mutedSmall}>Carregando…</div>
            ) : videos.length === 0 ? (
              <div style={s.mutedSmall}>Nenhum vídeo ainda.</div>
            ) : (
              <div style={s.historyList}>
                {videos.map((v) => {
                  const thumb = v.thumbnail_url || getThumbFromUrl(v.source_url);
                  const active = selectedVideo?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      style={{ ...s.historyItem, borderColor: active ? "rgba(120,120,255,.5)" : "rgba(255,255,255,.10)" }}
                      onClick={() => {
                        setSelectedVideo(v);
                        setClipStartSec(v.clip_start_sec || 0);
                        setClipEndSec(v.clip_end_sec || 0);
                        setProtectSec(v.protect_sec || 0);
                        fetchMoments(v.id);
                      }}
                    >
                      <div style={s.historyThumb}>
                        {thumb ? (
                          <img src={thumb} alt="thumb" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={s.thumbSkeleton} />
                        )}
                      </div>

                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={s.historyTitle}>{v.title || "YouTube video"}</div>
                        <div style={s.mutedSmall}>
                          Min: {v.minutes ?? "—"} • {fmtDate(v.created_at)}
                        </div>
                      </div>

                      <div style={s.historyRight}>
                        <span style={s.statusPill}>{v.status || "—"}</span>
                        <span style={s.openLabel}>abrir</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 700px at 20% 10%, rgba(120,120,255,.18), transparent 60%), radial-gradient(1200px 700px at 80% 0%, rgba(0,200,255,.10), transparent 60%), #070A12",
    color: "rgba(255,255,255,.92)",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 22px",
    borderBottom: "1px solid rgba(255,255,255,.08)",
    background: "rgba(0,0,0,.18)",
    backdropFilter: "blur(10px)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    background: "rgba(120,120,255,.9)",
    boxShadow: "0 0 0 6px rgba(120,120,255,.12)",
  },
  brandText: { fontWeight: 800, letterSpacing: 0.2 },
  badge: {
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.06)",
    color: "rgba(255,255,255,.78)",
  },
  headerActions: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  creditsPill: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.06)",
  },
  dotOnline: { width: 8, height: 8, borderRadius: 99, background: "rgba(90,255,170,.9)" },
  creditsText: { fontWeight: 700, fontSize: 13 },
  btnPrimary: {
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid rgba(120,120,255,.45)",
    background: "rgba(120,120,255,.22)",
    color: "rgba(255,255,255,.92)",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnGhost: {
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.06)",
    color: "rgba(255,255,255,.90)",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDanger: {
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,120,120,.35)",
    background: "rgba(255,120,120,.14)",
    color: "rgba(255,255,255,.92)",
    fontWeight: 700,
    cursor: "pointer",
  },
  main: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 1.6fr) minmax(300px, .9fr)",
    gap: 18,
    padding: 18,
    alignItems: "start",
  },
  left: { display: "flex", flexDirection: "column", gap: 14 },
  right: { position: "sticky", top: 86 },
  card: {
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.05)",
    borderRadius: 16,
    padding: 16,
    backdropFilter: "blur(10px)",
  },
  h2: { margin: "0 0 6px", fontSize: 18 },
  h3: { margin: 0, fontSize: 16 },
  p: { margin: "0 0 10px", color: "rgba(255,255,255,.70)", fontSize: 13, lineHeight: 1.4 },
  label: { fontSize: 12, color: "rgba(255,255,255,.75)", marginBottom: 6, display: "block" },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.22)",
    color: "rgba(255,255,255,.92)",
    outline: "none",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.22)",
    color: "rgba(255,255,255,.92)",
    outline: "none",
  },
  previewBox: {
    marginTop: 12,
    display: "flex",
    gap: 12,
    alignItems: "stretch",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 14,
    background: "rgba(0,0,0,.18)",
    padding: 12,
  },
  thumb: {
    width: 150,
    height: 92,
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.05)",
    flexShrink: 0,
  },
  thumbSkeleton: { width: "100%", height: "100%", background: "rgba(255,255,255,.06)" },
  previewTitle: { fontWeight: 800, marginBottom: 4 },
  previewMeta: { color: "rgba(255,255,255,.65)", fontSize: 12, lineHeight: 1.35 },
  mutedSmall: { color: "rgba(255,255,255,.62)", fontSize: 12 },
  tabs: { display: "flex", gap: 8, marginBottom: 12 },
  tabActive: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(120,120,255,.35)",
    background: "rgba(120,120,255,.18)",
    color: "rgba(255,255,255,.92)",
    fontWeight: 700,
    cursor: "pointer",
  },
  tab: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.05)",
    color: "rgba(255,255,255,.85)",
    fontWeight: 700,
    cursor: "pointer",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  rowBetween: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.12)",
    padding: 3,
    cursor: "pointer",
    position: "relative",
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 99,
    background: "rgba(255,255,255,.92)",
    display: "block",
    transition: "transform .18s ease",
  },
  pills: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 },
  pill: {
    padding: "7px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.06)",
    color: "rgba(255,255,255,.88)",
    fontSize: 12,
    cursor: "pointer",
  },
  timeBox: {
    marginBottom: 6,
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.22)",
    textAlign: "center",
    fontWeight: 800,
  },
  slider: { width: "100%" },
  msgBox: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.22)",
    color: "rgba(255,255,255,.85)",
    fontSize: 13,
    whiteSpace: "pre-wrap",
  },
  momentRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(0,0,0,.16)",
  },
  momentLeft: { flex: 1, minWidth: 0 },
  momentRight: { display: "flex", alignItems: "center", gap: 8 },
  momentTime: { fontWeight: 900, fontSize: 13, marginBottom: 4 },
  momentTitle: { fontWeight: 800, marginBottom: 4 },
  momentReason: { color: "rgba(255,255,255,.70)", fontSize: 12, lineHeight: 1.35 },
  historyList: { display: "flex", flexDirection: "column", gap: 10, marginTop: 12, maxHeight: 520, overflow: "auto" },
  historyItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.16)",
    cursor: "pointer",
  },
  historyThumb: {
    width: 56,
    height: 40,
    borderRadius: 10,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.05)",
    flexShrink: 0,
  },
  historyTitle: { fontWeight: 800, fontSize: 13, marginBottom: 2 },
  historyRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 },
  statusPill: {
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.06)",
    color: "rgba(255,255,255,.80)",
  },
  openLabel: { fontSize: 11, color: "rgba(120,120,255,.85)", fontWeight: 800 },
};