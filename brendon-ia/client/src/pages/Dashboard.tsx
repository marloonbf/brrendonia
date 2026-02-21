import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/api";

type BalanceResponse = {
  ok: boolean;
  credits?: number;
  profile?: { credits?: number };
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

export default function Dashboard() {
  const navigate = useNavigate();

  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const loadBalance = async () => {
    setError("");
    setLoading(true);
    try {
      const res = (await apiFetch("/api/balance")) as BalanceResponse;

      if (!res?.ok) {
        throw new Error(res?.error || "Falha ao carregar créditos");
      }

      const c =
        typeof res.credits === "number"
          ? res.credits
          : typeof res.profile?.credits === "number"
          ? res.profile.credits
          : 0;

      setCredits(c);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    setError("");
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (e: any) {
      setError(e?.message || "Erro ao sair");
    } finally {
      setBusy(false);
    }
  };

  const handleBuyCredits = async () => {
    setBusy(true);
    setError("");
    try {
      const res = (await apiFetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: "credits_150" }), // ajuste conforme seu backend
      })) as PaymentCreateResponse;

      if (!res?.ok) {
        throw new Error(res?.error || "Erro ao criar pagamento");
      }

      const url = res.payment_url || res.checkout_url || res.url || res.init_point;
      if (!url) throw new Error("Checkout não retornou URL");

      window.location.href = url;
    } catch (e: any) {
      setError(e?.message || "Erro ao iniciar pagamento");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <h1 style={s.h1}>Dashboard</h1>

        <div style={s.card}>
          <div style={s.cardTitle}>Créditos disponíveis</div>
          <div style={s.credits}>{loading ? "Carregando..." : credits}</div>

          <div style={s.actions}>
            <button
              onClick={handleBuyCredits}
              style={{ ...s.btn, ...(busy ? s.btnDisabled : {}) }}
              disabled={busy}
              title="Abrir checkout"
            >
              Adicionar créditos
            </button>

            <button
              onClick={loadBalance}
              style={{ ...s.btn, ...(busy ? s.btnDisabled : {}) }}
              disabled={busy}
              title="Atualizar saldo"
            >
              Atualizar
            </button>

            <button
              onClick={handleLogout}
              style={{ ...s.btn, ...(busy ? s.btnDisabled : {}) }}
              disabled={busy}
              title="Sair da conta"
            >
              Sair
            </button>
          </div>

          {!!error && <div style={s.error}>{error}</div>}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0b0f17",
    color: "rgba(255,255,255,.92)",
    padding: 32,
  },
  wrap: { maxWidth: 980, margin: "0 auto" },
  h1: { fontSize: 42, margin: "20px 0 18px 0" },

  card: {
    width: 340,
    padding: 16,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.15)",
    background: "rgba(255,255,255,.04)",
    boxShadow: "0 10px 30px rgba(0,0,0,.35)",
  },
  cardTitle: { fontSize: 14, opacity: 0.85, marginBottom: 10 },
  credits: { fontSize: 28, fontWeight: 700, marginBottom: 14 },

  actions: { display: "flex", gap: 10, flexWrap: "wrap" },

  btn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.18)",
    background: "rgba(255,255,255,.06)",
    color: "rgba(255,255,255,.92)",
    cursor: "pointer",
    fontWeight: 600,
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },

  error: { marginTop: 12, color: "#ff6b6b", fontSize: 13 },
};