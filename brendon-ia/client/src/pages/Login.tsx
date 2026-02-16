import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

type Mode = "login" | "reset";

export default function Login() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMsg("❌ " + error.message);
      setLoading(false);
      return;
    }

    setMsg("✅ Login realizado! Indo para o dashboard...");
    setLoading(false);

    setTimeout(() => navigate("/dashboard"), 600);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    // IMPORTANTE: precisa estar permitido no Supabase Auth (passo 2)
    const redirectTo =
      import.meta.env.VITE_APP_URL
        ? `${import.meta.env.VITE_APP_URL}/reset-password`
        : `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      setMsg("❌ " + error.message);
      setLoading(false);
      return;
    }

    setMsg("✅ Enviamos um link de recuperação para seu e-mail. Verifique a caixa de entrada e o spam.");
    setLoading(false);
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.brand} onClick={() => navigate("/")}>
          <div style={s.logo}>✦</div>
          <div>
            <div style={s.brandText}>brendon.ia</div>
            <div style={s.brandSub}>Acesse sua conta</div>
          </div>
        </div>

        <button style={s.back} onClick={() => navigate("/")}>
          ← Voltar para Home
        </button>
      </div>

      <main style={s.main}>
        <div style={s.card}>
          <div style={s.top}>
            <h1 style={s.title}>
              {mode === "login" ? "Entrar" : "Recuperar senha"}
            </h1>
            <p style={s.subtitle}>
              {mode === "login"
                ? "Entre para ver créditos, comprar pacotes e enviar vídeos."
                : "Digite seu e-mail e enviaremos um link para redefinir sua senha."}
            </p>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} style={s.form}>
              <label style={s.label}>E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={s.input}
              />

              <label style={s.label}>Senha</label>
              <input
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={s.input}
              />

              <button type="submit" disabled={loading} style={s.btnPrimary}>
                {loading ? "Entrando..." : "Entrar"}
              </button>

              <div style={s.rowLinks}>
                <button
                  type="button"
                  style={s.link}
                  onClick={() => setMode("reset")}
                >
                  Esqueceu a senha?
                </button>

                <button
                  type="button"
                  style={s.link}
                  onClick={() => navigate("/register")}
                >
                  Criar conta
                </button>
              </div>

              {msg && <div style={s.msg}>{msg}</div>}
            </form>
          ) : (
            <form onSubmit={handleReset} style={s.form}>
              <label style={s.label}>E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={s.input}
              />

              <button type="submit" disabled={loading} style={s.btnPrimary}>
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </button>

              <div style={s.rowLinks}>
                <button
                  type="button"
                  style={s.link}
                  onClick={() => setMode("login")}
                >
                  Voltar para login
                </button>
              </div>

              {msg && <div style={s.msg}>{msg}</div>}
            </form>
          )}

          <div style={s.footer}>
            Ao entrar, você garante que o pagamento use o e-mail correto para créditos.
          </div>
        </div>
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 600px at 12% 10%, rgba(99,102,241,.18), transparent 60%), radial-gradient(900px 520px at 88% 18%, rgba(56,189,248,.14), transparent 55%), #f7f8fc",
    color: "#0b1020",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    padding: 18,
  },

  header: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  brand: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    color: "white",
    fontWeight: 900,
    background: "linear-gradient(135deg, rgba(99,102,241,1), rgba(56,189,248,1))",
    boxShadow: "0 18px 45px rgba(99,102,241,.18)",
  },
  brandText: { fontWeight: 950, letterSpacing: -0.3 },
  brandSub: { fontSize: 12, color: "rgba(10,16,32,.62)" },

  back: {
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    background: "rgba(255,255,255,.75)",
    border: "1px solid rgba(10,16,32,.12)",
    color: "rgba(10,16,32,.86)",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  main: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "grid",
    placeItems: "center",
    paddingTop: 28,
    paddingBottom: 28,
  },

  card: {
    width: "min(520px, 100%)",
    background: "rgba(255,255,255,.82)",
    border: "1px solid rgba(10,16,32,.08)",
    borderRadius: 18,
    boxShadow: "0 24px 70px rgba(10,16,32,.10)",
    padding: 18,
  },

  top: { marginBottom: 12 },
  title: { margin: 0, fontSize: 28, letterSpacing: -0.6 },
  subtitle: { marginTop: 8, marginBottom: 0, color: "rgba(10,16,32,.70)", fontSize: 13, lineHeight: 1.5 },

  form: { display: "flex", flexDirection: "column", gap: 10, marginTop: 8 },

  label: { fontSize: 12, fontWeight: 900, color: "rgba(10,16,32,.72)" },
  input: {
    width: "100%",
    borderRadius: 12,
    padding: "12px 12px",
    border: "1px solid rgba(10,16,32,.14)",
    background: "rgba(255,255,255,.95)",
    outline: "none",
    fontSize: 14,
  },

  btnPrimary: {
    marginTop: 6,
    border: "none",
    borderRadius: 12,
    padding: "12px 14px",
    cursor: "pointer",
    background: "linear-gradient(135deg, rgba(99,102,241,1), rgba(56,189,248,1))",
    color: "white",
    fontWeight: 950,
    boxShadow: "0 18px 45px rgba(99,102,241,.18)",
  },

  rowLinks: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  link: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: 0,
    color: "rgba(99,102,241,1)",
    fontWeight: 900,
    fontSize: 13,
    textAlign: "left",
  },

  msg: {
    marginTop: 6,
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(10,16,32,.12)",
    background: "rgba(10,16,32,.03)",
    color: "rgba(10,16,32,.86)",
    fontSize: 13,
    lineHeight: 1.4,
  },

  footer: {
    marginTop: 14,
    fontSize: 11,
    color: "rgba(10,16,32,.60)",
    lineHeight: 1.4,
  },
};
