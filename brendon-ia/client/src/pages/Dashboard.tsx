import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [duration, setDuration] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!youtubeUrl) {
      alert("Cole um link do YouTube");
      return;
    }

    if (!duration) {
      alert("Selecione a duração");
      return;
    }

    alert("Aqui vamos integrar com a API depois 🚀");
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Analisar Vídeo</h1>
        <p style={styles.subtitle}>
          Descubra os melhores momentos do seu vídeo em segundos
        </p>

        <div style={styles.card}>
          <form onSubmit={handleSubmit}>
            <label style={styles.label}>Link do YouTube</label>
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>Duração dos momentos</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={styles.select}
            >
              <option value="">Selecione...</option>
              <option value="under-30">&lt;30s</option>
              <option value="30-59">30s–59s</option>
              <option value="60-89">60s–89s</option>
              <option value="90-180">90s–3m</option>
              <option value="180-300">3m–5m</option>
              <option value="300-600">5m–10m</option>
              <option value="600-900">10m–15m</option>
            </select>

            <button type="submit" style={styles.button}>
              ✨ Analisar Vídeo
            </button>
          </form>
        </div>

        <div style={styles.infoCard}>
          <h3>O que você vai receber?</h3>

          <ul style={styles.list}>
            <li>🔥 TOP 3 ou TOP 10 momentos</li>
            <li>⏱️ Timestamps exatos</li>
            <li>📝 Transcrição completa</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    padding: "60px 20px",
    color: "white",
  },
  container: {
    maxWidth: "700px",
    margin: "0 auto",
  },
  title: {
    fontSize: "32px",
    fontWeight: "bold",
    marginBottom: "8px",
  },
  subtitle: {
    color: "#94a3b8",
    marginBottom: "40px",
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    padding: "30px",
    borderRadius: "12px",
    backdropFilter: "blur(10px)",
    marginBottom: "30px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    marginTop: "20px",
    fontSize: "14px",
    color: "#cbd5e1",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "white",
  },
  select: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "white",
  },
  button: {
    marginTop: "30px",
    width: "100%",
    padding: "14px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(90deg,#6366f1,#8b5cf6)",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },
  infoCard: {
    background: "rgba(255,255,255,0.05)",
    padding: "20px",
    borderRadius: "12px",
  },
  list: {
    marginTop: "15px",
    lineHeight: "1.8",
    color: "#cbd5e1",
  },
};