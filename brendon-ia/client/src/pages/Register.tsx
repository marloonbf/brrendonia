import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err" | "info"; text: string } | null>(null);

  const origin = useMemo(() => window.location.origin, []);

  function validate() {
    if (!name.trim()) return "Digite seu nome.";
    if (!email.trim()) return "Digite seu e-mail.";
    if (pass.length < 6) return "A senha precisa ter no mínimo 6 caracteres.";
    if (pass !== pass2) return "As senhas não conferem.";
    return null;
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const v = validate();
    if (v) {
      setMsg({ type: "err", text: v });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pass,
      options: {
        data: { full_name: name.trim() },
        // Se você usa confirmação de e-mail no Supabase, o link volta pro seu site:
        emailRedirectTo: `${origin}/login`,
      },
    });

    if (error) {
      setMsg({ type: "err", text: error.message });
      setLoading(false);
      return;
    }

    setMsg({
      type: "ok",
      text:
        "Conta criada! Se o Supabase estiver com confirmação por e-mail ativada, confira sua caixa de entrada. Depois faça login.",
    });

    setLoading(false);

    // Pequeno delay pra pessoa ler
    setTimeout(() => navigate("/login"), 900);
  }

  return (
    <div style={s.page}>
      <div style={s.shell}>
        {/* Coluna esquerda (benefícios) */}
        <div style={s.left}>
          <div style={s.brandRow}>
            <div style={s.logo} aria-hidden />
            <div>
              <div style={s.brand}>brendon.ia</div>
              <div style={s.tagline}>Descubra exatamente onde cortar para reter mais</div>
            </div>
          </div>

          <h1 style={s.h1}>
            Crie sua conta em <span style={s.grad}>30 segundos</span>
          </h1>

          <div style={s.bullets}>
            <Bullet title="Top 10 momentos" text="Timestamps + texto pronto (sem ver o vídeo inteiro)." />
            <Bullet title="Momentos específicos" text="Peça trechos por tema: ‘dopamina’, ‘virada’, ‘objeção’…" />
            <Bullet title="Créditos por minuto" text="Você compra e usa quando quiser. 1 crédito = 1 minuto." />
          </div>

          <div style={s.miniNote}>
            Ao criar conta, você confirma que possui direitos ou autorização para analisar o conteúdo enviado.
          </div>

          <div style={s.backRow}>
            <button type="button" style={s.backBtn} onClick={() => navigate("/")}>
              ← Voltar para Home
            </button>
          </div>
        </div>

        {/* Coluna direita (form) */}
        <div style={s.right}>
          <div style={s.card}>
            <div style={s.cardHead}>
              <div style={s.cardTitle}>Criar conta</div>
              <div style={s.cardSub}>Comece grátis e faça upgrade quando precisar</div>
            </div>

            <form onSubmit={onRegister} style={s.form}>
              <label style={s.label}>Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
                style={s.input}
              />

              <label style={s.label}>E-mail</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                type="email"
                autoComplete="email"
                style={s.input}
              />

              <label style={s.label}>Senha</label>
              <div style={s.passWrap}>
                <input
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  style={{ ...s.input, marginBottom: 0, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  style={s.eyeBtn}
                  aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>

              <label style={s.label}>Confirmar senha</label>
              <input
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                placeholder="Repita a senha"
                type={showPass ? "text" : "password"}
                autoComplete="new-password"
                style={s.input}
              />

              <button type="submit" disabled={loading} style={{ ...s.primary, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Criando..." : "Criar conta grátis"}
              </button>

              <div style={s.dividerRow}>
                <div style={s.divider} />
                <div style={s.dividerText}>ou</div>
                <div style={s.divider} />
              </div>

              <button type="button" style={s.ghost} onClick={() => navigate("/login")}>
                Já tenho conta → Entrar
              </button>

              {msg ? (
                <div
                  style={{
                    ...s.msg,
                    borderColor:
                      msg.type === "ok"
                        ? "rgba(34,197,94,.35)"
                        : msg.type === "err"
                        ? "rgba(239,68,68,.35)"
                        : "rgba(99,102,241,.25)",
                    background:
                      msg.type === "ok"
                        ? "rgba(34,197,94,.10)"
                        : msg.type === "err"
                        ? "rgba(239,68,68,.10)"
                        : "rgba(99,102,241,.08)",
                  }}
                >
                  {msg.text}
                </div>
              ) : null}

              <div style={s.tos}>
                Ao continuar, você concorda com os Termos e a Política de Privacidade.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bullet({ title, text }: { title: string; text: string }) {
  return (
    <div style={b.row}>
      <div style={b.dot} aria-hidden />
      <div>
        <div style={b.title}>{title}</div>
        <div style={b.text}>{text}</div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(900px 520px at 20% 12%, rgba(99,102,241,.22), transparent 60%), radial-gradient(680px 460px at 78% 20%, rgba(56,189,248,.18), transparent 55%), #f7f8fc",
    color: "#0b1020",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    padding: 18,
  },
  shell: {
    maxWidth: 1120,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1.05fr .95fr",
    gap: 16,
    alignItems: "stretch",
  },

  left: {
    borderRadius: 18,
    padding: 22,
    background: "rgba(255,255,255,.72)",
    border: "1px solid rgba(10,16,32,.10)",
    boxShadow: "0 18px 60px rgba(10,16,32,.10)",
  },
  brandRow: { display: "flex", gap: 12, alignItems: "center" },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background:
      "linear-gradient(135deg, rgba(99,102,241,1), rgba(56,189,248,1))",
    boxShadow: "0 14px 30px rgba(99,102,241,.25)",
  },
  brand: { fontWeight: 900, letterSpacing: -0.4, fontSize: 16 },
  tagline: { marginTop: 2, fontSize: 12, color: "rgba(10,16,32,.62)" },

  h1: { margin: "18px 0 0", fontSize: 38, lineHeight: 1.05, letterSpacing: -1.1 },
  grad: {
    background: "linear-gradient(90deg, rgba(99,102,241,1), rgba(56,189,248,1))",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },

  bullets: { marginTop: 16, display: "grid", gap: 12 },

  miniNote: {
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    background: "rgba(99,102,241,.08)",
    border: "1px solid rgba(99,102,241,.18)",
    color: "rgba(10,16,32,.75)",
    fontSize: 12,
    lineHeight: 1.45,
  },

  backRow: { marginTop: 16 },
  backBtn: {
    border: "1px solid rgba(10,16,32,.14)",
    background: "rgba(255,255,255,.65)",
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 800,
  },

  right: {
    borderRadius: 18,
    padding: 0,
  },

  card: {
    borderRadius: 18,
    background: "rgba(255,255,255,.90)",
    border: "1px solid rgba(10,16,32,.10)",
    boxShadow: "0 18px 60px rgba(10,16,32,.10)",
    overflow: "hidden",
  },
  cardHead: { padding: 20, borderBottom: "1px solid rgba(10,16,32,.08)" },
  cardTitle: { fontSize: 18, fontWeight: 900, letterSpacing: -0.3 },
  cardSub: { marginTop: 6, fontSize: 12, color: "rgba(10,16,32,.62)" },

  form: { padding: 20, display: "grid", gap: 10 },
  label: { fontSize: 12, fontWeight: 800, color: "rgba(10,16,32,.70)" },
  input: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(10,16,32,.14)",
    background: "white",
    padding: "11px 12px",
    outline: "none",
    fontSize: 14,
  },

  passWrap: { position: "relative" },
  eyeBtn: {
    position: "absolute",
    right: 8,
    top: 8,
    height: 34,
    width: 34,
    borderRadius: 10,
    border: "1px solid rgba(10,16,32,.10)",
    background: "rgba(10,16,32,.04)",
    cursor: "pointer",
  },

  primary: {
    marginTop: 6,
    width: "100%",
    border: "none",
    borderRadius: 12,
    padding: "12px 14px",
    cursor: "pointer",
    background: "linear-gradient(90deg, rgba(99,102,241,1), rgba(56,189,248,1))",
    color: "white",
    fontWeight: 950,
    letterSpacing: -0.2,
    boxShadow: "0 16px 30px rgba(99,102,241,.18)",
  },
  ghost: {
    width: "100%",
    borderRadius: 12,
    padding: "12px 14px",
    cursor: "pointer",
    background: "transparent",
    border: "1px solid rgba(10,16,32,.14)",
    color: "rgba(10,16,32,.86)",
    fontWeight: 900,
  },

  dividerRow: { display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center", marginTop: 6 },
  divider: { height: 1, background: "rgba(10,16,32,.10)" },
  dividerText: { fontSize: 12, color: "rgba(10,16,32,.55)", fontWeight: 800 },

  msg: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(99,102,241,.20)",
    fontSize: 13,
    lineHeight: 1.35,
  },

  tos: { marginTop: 4, fontSize: 11, color: "rgba(10,16,32,.55)", lineHeight: 1.45 },
};

const b: Record<string, React.CSSProperties> = {
  row: { display: "flex", gap: 10, alignItems: "flex-start" },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 6,
    background: "linear-gradient(90deg, rgba(99,102,241,1), rgba(56,189,248,1))",
    boxShadow: "0 10px 18px rgba(99,102,241,.18)",
  },
  title: { fontWeight: 950, letterSpacing: -0.2 },
  text: { marginTop: 4, fontSize: 12, color: "rgba(10,16,32,.68)", lineHeight: 1.45 },
};
