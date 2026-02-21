import { useEffect, useState } from "react";
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
  checkout_url?: string;
  payment_url?: string;
  url?: string;
  init_point?: string;
};

export default function Dashboard() {
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [payLoading, setPayLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadBalance() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<BalanceResponse>("/api/credits/balance", {
        method: "GET",
      });

      const c =
        typeof data.credits === "number"
          ? data.credits
          : typeof data.profile?.credits === "number"
            ? data.profile.credits
            : 0;

      setCredits(c);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar créditos");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCredits() {
    setPayLoading(true);
    setError(null);

    try {
      const data = await apiFetch<PaymentCreateResponse>("/api/payments/create", {
        method: "POST",
        body: { pack_id: "p150" },
      });

      const checkout =
        data.checkout_url || data.payment_url || data.url || data.init_point;

      if (!checkout) {
        throw new Error("Não recebi checkout_url do servidor.");
      }

      // redireciona pro checkout
      window.location.href = checkout;
    } catch (e: any) {
      setError(e?.message || "Erro ao criar pagamento");
    } finally {
      setPayLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  useEffect(() => {
    loadBalance();
  }, []);

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 44, marginBottom: 20 }}>Dashboard</h1>

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 10,
          padding: 18,
          width: 340,
          background: "rgba(0,0,0,0.10)",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Créditos disponíveis
        </div>

        {loading ? (
          <div>Carregando...</div>
        ) : (
          <div style={{ fontSize: 20 }}>{credits}</div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            onClick={handleAddCredits}
            disabled={payLoading}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.25)",
              cursor: payLoading ? "not-allowed" : "pointer",
            }}
          >
            {payLoading ? "Abrindo..." : "Adicionar créditos"}
          </button>

          <button
            onClick={loadBalance}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.25)",
              cursor: "pointer",
            }}
          >
            Atualizar
          </button>

          <button
            onClick={handleLogout}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.25)",
              cursor: "pointer",
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