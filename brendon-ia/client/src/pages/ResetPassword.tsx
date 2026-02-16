import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMsg("❌ " + error.message);
      setLoading(false);
      return;
    }

    setMsg("✅ Senha atualizada com sucesso! Redirecionando...");
    setLoading(false);

    setTimeout(() => {
      navigate("/login");
    }, 1500);
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Redefinir senha</h1>
        <p style={styles.subtitle}>
          Digite sua nova senha abaixo.
        </p>

        <form onSubmit={handleUpdate} style={styles.form}>
          <input
            type="password"
            placeholder="Nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Atualizando..." : "Atualizar senha"}
          </button>
        </form>

        {msg && <div style={styles.msg}>{msg}</div>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f7f8fc",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "system-ui",
  },
  card: {
    width: 420,
    background: "white",
    padding: 30,
    borderRadius: 16,
    boxShadow: "0 20px 60px rgba(0,0,0,.08)",
  },
  title: {
    margin: 0,
    fontSize: 24,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#555",
  },
  form: {
    marginTop: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  input: {
    padding: 12,
    borderRadius: 10,
    border: "1px solid #ddd",
  },
  button: {
    padding: 12,
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg,#6366f1,#38bdf8)",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
  msg: {
    marginTop: 16,
    fontSize: 14,
  },
};
