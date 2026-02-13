import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

type BalanceResponse = {
  ok: boolean;
  credits?: number;
  profile?: { credits?: number };
  error?: string;
};

type AddCreditsResponse = {
  ok: boolean;
  credits?: number;
  error?: string;
};

type SubmitResponse = {
  ok: boolean;
  message?: string;
  credits_left?: number;
  credits?: number;
  error?: string;
};

type VideoItem = {
  id: string;
  title?: string | null;
  source_url?: string | null;
  target_duration?: string | null; // pode vir do banco
  minutes?: number | null; // se sua API devolver
  status?: string | null;
  created_at?: string | null;
};

type VideosListResponse = {
  ok: boolean;
  videos?: VideoItem[];
  error?: string;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const API_BASE = useMemo(() => "http://localhost:3001", []);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [credits, setCredits] = useState<number>(0);

  const [msg, setMsg] = useState<string>("");

  // form vídeo
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [minutes, setMinutes] = useState<number>(5);

  // histórico
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

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

    // se for JSON, garanta content-type
    const isJsonBody =
      init?.body && typeof init.body === "string" && !headers["Content-Type"];
    if (isJsonBody) headers["Content-Type"] = "application/json";

    const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
    return res;
  }

  function fmtDate(iso?: string | null) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      // pt-BR
      return d.toLocaleString("pt-BR");
    } catch {
      return iso;
    }
  }

  async function fetchBalance() {
    try {
      const res = await fetchAuthed(`/credits/balance`);
      const json: BalanceResponse = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Erro balance (${res.status})`);
      }

      const c = typeof json.credits === "number" ? json.credits : json.profile?.credits ?? 0;
      setCredits(c);
      return c;
    } catch (e: any) {
      setMsg(`❌ Erro ao buscar créditos: ${e?.message || e}`);
      return null;
    }
  }

  async function fetchVideos(limit = 50) {
    try {
      setLoadingVideos(true);
      const res = await fetchAuthed(`/videos/list?limit=${limit}`);
      const json: VideosListResponse = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Erro list (${res.status})`);
      }

      setVideos(json.videos ?? []);
    } catch (e: any) {
      // não travar a UI por causa do histórico
      setMsg((prev) => prev || `❌ Erro ao buscar histórico: ${e?.message || e}`);
    } finally {
      setLoadingVideos(false);
    }
  }

  async function addCredits(amount: number) {
    try {
      setMsg("");

      const res = await fetchAuthed(`/credits/add`, {
        method: "POST",
        body: JSON.stringify({
          amount,
          description: `Pacote ${amount} créditos`,
        }),
      });

      const json: AddCreditsResponse = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "ADD_CREDITS_ERROR");
      }

      setCredits(json.credits ?? credits);
      setMsg(`✅ Créditos adicionados! Saldo: ${json.credits ?? credits}`);

      await fetchVideos(50);
    } catch (e: any) {
      setMsg(`❌ Erro ao recarregar: ${e?.message || e}`);
    }
  }

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

      const res = await fetchAuthed(`/videos/submit`, {
        method: "POST",
        body: JSON.stringify({
          url: youtubeUrl.trim(),
          minutes: minutesInt,
        }),
      });

      const json: SubmitResponse = await res.json();

      // sem créditos (402)
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
      setMsg(`✅ ${json.message || "Vídeo recebido! Processamento iniciado 🚀"} | Créditos restantes: ${newCredits}`);
      setYoutubeUrl("");

      await fetchVideos(50);
    } catch (e: any) {
      setMsg(`❌ Erro ao enviar vídeo: ${e?.message || e}`);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

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

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Dashboard</h1>
            <div style={styles.sub}>
              Logado como: <b>{email || "—"}</b>
            </div>
          </div>

          <div style={styles.actionsTop}>
            <button style={styles.btnGhost} onClick={() => navigate("/")}>
              Voltar Home
            </button>
            <button style={styles.btnPrimary} onClick={handleLogout}>
              Sair
            </button>
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.box}>
            <div style={styles.boxTitle}>Seus créditos</div>
            <div style={styles.credits}>{loading ? "Carregando..." : credits}</div>
            <div style={styles.small}>1 crédito = 1 minuto processado</div>

            <div style={{ height: 12 }} />

            <button
              style={styles.btnPrimaryFull}
              onClick={() => addCredits(150)}
              disabled={loading || !userId}
            >
              Recarregar 150 créditos
            </button>

            <div style={{ height: 10 }} />

            <button
              style={styles.btnGhostFull}
              onClick={async () => {
                setMsg("");
                await fetchBalance();
                await fetchVideos(50);
              }}
              disabled={loading || !userId}
            >
              Atualizar saldo
            </button>
          </div>

          <div style={styles.box}>
            <div style={styles.boxTitle}>Enviar vídeo (YouTube)</div>

            <label style={styles.label}>Link do YouTube</label>
            <input
              style={styles.input}
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />

            <div style={{ height: 12 }} />

            <label style={styles.label}>Minutos para processar (gasta créditos)</label>
            <input
              style={styles.input}
              type="number"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />

            <div style={{ height: 14 }} />

            <button
              style={styles.btnPrimaryFull}
              onClick={submitVideo}
              disabled={loading || !userId}
            >
              Gerar momentos (iniciar processamento)
            </button>

            <div style={{ height: 10 }} />

            <div style={styles.small}>
              * Por enquanto a API só confirma recebimento. Depois a gente liga a IA pra gerar os “Top
              10 momentos”.
            </div>
          </div>
        </div>

        {/* Histórico */}
        <div style={{ height: 14 }} />
        <div style={styles.boxWide}>
          <div style={styles.boxTitle}>Histórico (últimos 50)</div>

          {loadingVideos ? (
            <div style={styles.small}>Carregando histórico...</div>
          ) : videos.length === 0 ? (
            <div style={styles.small}>Nenhum vídeo enviado ainda.</div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Título</th>
                    <th style={styles.th}>URL</th>
                    <th style={styles.th}>Min</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Criado</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((v) => (
                    <tr key={v.id}>
                      <td style={styles.td}>{v.title || "YouTube video"}</td>
                      <td style={styles.td}>
                        {v.source_url ? (
                          <a style={styles.link} href={v.source_url} target="_blank" rel="noreferrer">
                            abrir
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={styles.td}>
                        {typeof v.minutes === "number"
                          ? v.minutes
                          : v.target_duration
                          ? v.target_duration
                          : "—"}
                      </td>
                      <td style={styles.td}>{v.status || "—"}</td>
                      <td style={styles.td}>{fmtDate(v.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {msg ? <div style={styles.msg}>{msg}</div> : null}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 600px at 15% 10%, rgba(99,102,241,.25), transparent 60%), #0b0f16",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: 24,
    color: "rgba(255,255,255,.92)",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  card: {
    width: "min(980px, 100%)",
    background: "rgba(255,255,255,.03)",
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 20px 60px rgba(0,0,0,.45)",
    backdropFilter: "blur(10px)",
  },
  header: {
    display: "flex",
    gap: 16,
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginBottom: 18,
  },
  title: {
    margin: 0,
    fontSize: 40,
    letterSpacing: -0.6,
  },
  sub: {
    marginTop: 8,
    color: "rgba(255,255,255,.72)",
    fontSize: 14,
  },
  actionsTop: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  box: {
    padding: 16,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.18)",
  },
  boxWide: {
    padding: 16,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.18)",
  },
  boxTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 10,
  },
  credits: {
    fontSize: 46,
    fontWeight: 800,
    lineHeight: 1,
  },
  small: {
    marginTop: 8,
    color: "rgba(255,255,255,.60)",
    fontSize: 12,
    lineHeight: 1.35,
  },
  label: {
    display: "block",
    marginBottom: 6,
    color: "rgba(255,255,255,.72)",
    fontSize: 12,
  },
  input: {
    width: "100%",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.06)",
    color: "rgba(255,255,255,.92)",
    padding: "10px 12px",
    outline: "none",
  },
  btnPrimary: {
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    background: "rgba(99,102,241,.95)",
    color: "white",
    fontWeight: 700,
  },
  btnGhost: {
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    background: "transparent",
    border: "1px solid rgba(255,255,255,.18)",
    color: "rgba(255,255,255,.86)",
    fontWeight: 600,
  },
  btnPrimaryFull: {
    width: "100%",
    border: "none",
    borderRadius: 10,
    padding: "11px 14px",
    cursor: "pointer",
    background: "rgba(99,102,241,.95)",
    color: "white",
    fontWeight: 800,
  },
  btnGhostFull: {
    width: "100%",
    borderRadius: 10,
    padding: "11px 14px",
    cursor: "pointer",
    background: "transparent",
    border: "1px solid rgba(255,255,255,.18)",
    color: "rgba(255,255,255,.86)",
    fontWeight: 700,
  },
  msg: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.05)",
    color: "rgba(255,255,255,.90)",
    fontSize: 13,
  },
  tableWrap: {
    overflowX: "auto",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.10)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    color: "rgba(255,255,255,.72)",
    borderBottom: "1px solid rgba(255,255,255,.10)",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,.06)",
    color: "rgba(255,255,255,.88)",
    whiteSpace: "nowrap",
  },
  link: {
    color: "rgba(120,160,255,.95)",
    textDecoration: "none",
    fontWeight: 700,
  },
};
