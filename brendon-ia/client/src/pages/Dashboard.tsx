import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  const [credits, setCredits] = useState(0);
  const [message, setMessage] = useState("");
  const [loadingBtn, setLoadingBtn] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

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

      setCredits(data?.credits || 0);
    } catch (err: any) {
      setMessage("Erro ao carregar créditos");
    }
  }

  async function handleAddCredits() {
    try {
      setLoadingBtn(true);
      setMessage("");

      const data = await apiFetch("/payments/create", {
        method: "POST",
        body: JSON.stringify({ pack_id: "p150" }),
      });

      const url =
        data.checkout_url ||
        data.payment_url ||
        data.init_point ||
        data.url;

      if (!url) {
        setMessage("Checkout não retornado.");
        return;
      }

      window.location.href = url;
    } catch (err: any) {
      setMessage("Erro ao criar pagamento");
    } finally {
      setLoadingBtn(false);
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Dashboard</h1>
      <p>Créditos: {credits}</p>

      <button onClick={handleAddCredits} disabled={loadingBtn}>
        {loadingBtn ? "Abrindo..." : "Adicionar créditos"}
      </button>

      <button onClick={loadCredits}>Atualizar</button>

      <button
        onClick={async () => {
          await signOut();
          navigate("/login");
        }}
      >
        Sair
      </button>

      {message && <p style={{ color: "red" }}>{message}</p>}
    </div>
  );
}