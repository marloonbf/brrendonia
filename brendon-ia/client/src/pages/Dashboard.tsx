import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type BalanceResponse = {
  ok: boolean;
  credits?: number;
  profile?: { credits?: number };
  error?: string;
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const loadBalance = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      // Se não estiver logado, manda pro login
      if (!accessToken) {
        navigate("/login");
        return;
      }

      // Ajuste a rota se sua API for diferente:
      // exemplo: "/api/credits/balance" ou "/api/balance"
      const res = await fetch("/api/balance", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = (await res.json()) as BalanceResponse;

      if (!res.ok || !data.ok) {
        setError(data.error || "Não foi possível carregar seus créditos.");
        return;
      }

      const c = data.credits ?? data.profile?.credits ?? 0;
      setCredits(typeof c === "number" ? c : 0);
    } catch (e) {
      setError("Erro ao carregar créditos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const handleLogout = async () => {
    setLoading(true);
    setError("");
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch {
      setError("Não foi possível sair. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredits = () => {
    // Se você tiver uma tela de pricing/checkout
    navigate("/pricing");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f1115",
        color: "white",
        padding: 32,
      }}
    >
      <h1 style={{ fontSize: 42, margin: "0 0 20px 0" }}>Dashboard</h1>

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 12,
          padding: 18,
          width: 360,
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 10 }}>
          Créditos disponíveis
        </div>

        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 14 }}>
          {loading ? "Carregando..." : credits}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleAddCredits}
            disabled={loading}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.25)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              background: "rgba(255,255,255,0.06)",
              color: "white",
            }}
          >
            Adicionar créditos
          </button>

          <button
            onClick={loadBalance}
            disabled={loading}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.25)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              background: "rgba(255,255,255,0.06)",
              color: "white",
            }}
          >
            Atualizar
          </button>

          <button
            onClick={handleLogout}
            disabled={loading}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.25)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              background: "rgba(255,255,255,0.06)",
              color: "white",
            }}
          >
            Sair
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 12, color: "#ff6b6b" }}>{error}</div>
        )}
      </div>
    </div>
  );
}