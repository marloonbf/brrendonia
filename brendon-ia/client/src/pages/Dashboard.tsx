import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  const [credits, setCredits] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  const [loadingBtn, setLoadingBtn] = useState<boolean>(false);

  // Se não estiver logado, redireciona
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  // Carrega créditos ao entrar
  useEffect(() => {
    if (user) {
      loadCredits();
    }
  }, [user]);

  async function loadCredits() {
    try {
      const data = await apiFetch("/credits/balance", {
        method: "GET",
      });

      setCredits(data?.credits ?? 0);
    } catch (error) {
      setMessage("Erro ao carregar créditos.");
    }
  }

  async function handleAddCredits() {
    try {
      setLoadingBtn(true);
      setMessage("");

      const data = await apiFetch("/payments/create", {
        method: "POST",
        body: JSON.stringify({
          pack_id: "p150",
        }),
      });

      const checkoutUrl =
        data.checkout_url ||
        data.payment_url ||
        data.init_point ||
        data.url;

      if (!checkoutUrl) {
        setMessage("Checkout não retornado pela API.");
        return;
      }

      window.location.href = checkoutUrl;
    } catch (error) {
      setMessage("Erro ao criar pagamento.");
    } finally {
      setLoadingBtn(false);
    }
  }

  return (
    <div style={container}>
      <h1>Dashboard</h1>

      <div style={card}>
        <h2>Créditos disponíveis</h2>
        <p style={{ fontSize: 22, fontWeight: "bold" }}>{credits}</p>

        <button onClick={handleAddCredits} disabled={loadingBtn}>
          {loadingBtn ? "Abrindo checkout..." : "Adicionar créditos"}
        </button>

        <button onClick={loadCredits} style={{ marginLeft: 10 }}>
          Atualizar
        </button>

        <button
          onClick={async () => {
            await signOut();
            navigate("/login");
          }}
          style={{ marginLeft: 10 }}
        >
          Sair
        </button>

        {message && (
          <p style={{ color: "red", marginTop: 15 }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

const container: React.CSSProperties = {
  padding: 40,
  fontFamily: "Arial",
};

const card: React.CSSProperties = {
  marginTop: 20,
  padding: 20,
  border: "1px solid #ddd",
  borderRadius: 8,
  maxWidth: 400,
};