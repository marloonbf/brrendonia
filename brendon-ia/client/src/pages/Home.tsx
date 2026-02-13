import React from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.brand}>
          <div style={s.logoDot} />
          <span style={s.brandText}>brendon.ia</span>
        </div>

        <div style={s.headerActions}>
          <button style={s.btnGhost} onClick={() => navigate("/login")}>
            Entrar
          </button>
          <button style={s.btnPrimary} onClick={() => navigate("/register")}>
            Começar Grátis
          </button>
        </div>
      </header>

      <main style={s.main}>
        {/* HERO */}
        <section style={s.hero}>
          <h1 style={s.h1}>
            Descubra os melhores
            <br />
            momentos do seu vídeo
          </h1>
          <p style={s.p}>
            O corte é você quem decide. Nossa IA analisa seu vídeo e mostra exatamente
            onde estão os momentos mais virais.
          </p>

          <div style={s.heroActions}>
            <button style={s.btnPrimaryBig} onClick={() => navigate("/register")}>
              Começar Agora - Grátis
            </button>
            <button style={s.btnGhostBig} onClick={() => navigate("/dashboard")}>
              Ver Demo
            </button>
          </div>
        </section>

        {/* POR QUE */}
        <section style={s.section}>
          <h2 style={s.h2}>Por que brendon.ia?</h2>
          <p style={s.sub}>Feito para criadores que valorizam tempo e resultados</p>

          <div style={s.grid3}>
            <div style={s.card}>
              <div style={s.icon}>⚡</div>
              <div style={s.cardTitle}>Análise em Segundos</div>
              <div style={s.cardText}>
                Processe vídeos e receba os melhores momentos com timestamps.
              </div>
            </div>

            <div style={s.card}>
              <div style={s.icon}>🎯</div>
              <div style={s.cardTitle}>Precisão Cirúrgica</div>
              <div style={s.cardText}>
                Identificamos trechos com alto potencial de retenção e viralização.
              </div>
            </div>

            <div style={s.card}>
              <div style={s.icon}>📈</div>
              <div style={s.cardTitle}>Otimizado para Viral</div>
              <div style={s.cardText}>
                Sugestões focadas em ganchos, frases e momentos de alta conversão.
              </div>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section style={s.section}>
          <h2 style={s.h2}>Como Funciona</h2>
          <p style={s.sub}>3 passos para descobrir seus melhores momentos</p>

          <div style={s.steps}>
            <div style={s.step}>
              <div style={s.stepCircle}>1</div>
              <div style={s.stepTitle}>Envie seu vídeo</div>
              <div style={s.stepText}>Upload direto ou cole um link do YouTube</div>
            </div>

            <div style={s.step}>
              <div style={s.stepCircle}>2</div>
              <div style={s.stepTitle}>Escolha as preferências</div>
              <div style={s.stepText}>Defina duração dos momentos e categoria do conteúdo</div>
            </div>

            <div style={s.step}>
              <div style={s.stepCircle}>3</div>
              <div style={s.stepTitle}>Receba os melhores cortes</div>
              <div style={s.stepText}>TOP momentos com timestamps e textos prontos</div>
            </div>
          </div>
        </section>

        {/* PLANOS */}
        <section style={s.section}>
          <h2 style={s.h2}>Planos Simples</h2>
          <p style={s.sub}>Comece grátis, faça upgrade quando precisar</p>

          <div style={s.pricing}>
            <div style={s.priceCard}>
              <div style={s.priceName}>Grátis</div>
              <div style={s.priceValue}>R$ 0</div>
              <div style={s.priceDesc}>Para começar</div>

              <ul style={s.ul}>
                <li>✓ 1 vídeo analisado</li>
                <li>✓ TOP 3 momentos</li>
                <li>✓ Sem histórico salvo</li>
              </ul>

              <button style={s.btnOutlineFull} onClick={() => navigate("/register")}>
                Começar Grátis
              </button>
            </div>

            <div style={{ ...s.priceCard, borderColor: "rgba(99,102,241,.55)" }}>
              <div style={s.badge}>Mais Popular</div>
              <div style={s.priceName}>Pro</div>
              <div style={s.priceValue}>R$ 80,00<span style={s.per}>/mês</span></div>
              <div style={s.priceDesc}>Para criadores sérios</div>

              <ul style={s.ul}>
                <li>✓ Análises ilimitadas</li>
                <li>✓ TOP 10 momentos completos</li>
                <li>✓ Histórico salvo</li>
                <li>✓ Exportação liberada</li>
                <li>✓ Prioridade no processamento</li>
              </ul>

              <button style={s.btnPrimaryFull} onClick={() => navigate("/register")}>
                Começar Período Trial
              </button>
            </div>
          </div>

          <div style={s.footerNote}>
            Aviso Legal: O usuário declara possuir direitos ou autorização sobre os vídeos enviados ou analisados.
            <br />
            © 2026 brendon.ia - Todos os direitos reservados
          </div>
        </section>
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f7f8fc",
    color: "#0b1020",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  header: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "18px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  logoDot: {
    width: 22,
    height: 22,
    borderRadius: 8,
    background: "rgba(99,102,241,1)",
  },
  brandText: { fontWeight: 800, letterSpacing: -0.2 },

  headerActions: { display: "flex", gap: 10, alignItems: "center" },

  main: { maxWidth: 1120, margin: "0 auto", padding: "0 18px 70px" },

  hero: {
    textAlign: "center",
    padding: "70px 0 30px",
  },
  h1: { fontSize: 44, margin: 0, letterSpacing: -1.2, lineHeight: 1.05 },
  p: {
    margin: "18px auto 0",
    maxWidth: 720,
    color: "rgba(10,16,32,.72)",
    lineHeight: 1.5,
    fontSize: 14,
  },
  heroActions: { marginTop: 18, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" },

  btnPrimary: {
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    background: "rgba(99,102,241,1)",
    color: "white",
    fontWeight: 800,
  },
  btnGhost: {
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    background: "transparent",
    border: "1px solid rgba(10,16,32,.14)",
    color: "rgba(10,16,32,.86)",
    fontWeight: 700,
  },
  btnPrimaryBig: {
    border: "none",
    borderRadius: 10,
    padding: "11px 16px",
    cursor: "pointer",
    background: "rgba(99,102,241,1)",
    color: "white",
    fontWeight: 900,
  },
  btnGhostBig: {
    borderRadius: 10,
    padding: "11px 16px",
    cursor: "pointer",
    background: "transparent",
    border: "1px solid rgba(10,16,32,.14)",
    color: "rgba(10,16,32,.86)",
    fontWeight: 800,
  },

  section: { paddingTop: 46 },
  h2: { margin: 0, textAlign: "center", fontSize: 26, letterSpacing: -0.6 },
  sub: { marginTop: 10, textAlign: "center", color: "rgba(10,16,32,.62)", fontSize: 13 },

  grid3: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
  },
  card: {
    background: "white",
    borderRadius: 14,
    border: "1px solid rgba(10,16,32,.08)",
    padding: 18,
    boxShadow: "0 12px 28px rgba(10,16,32,.06)",
  },
  icon: { fontSize: 20, width: 34, height: 34, display: "grid", placeItems: "center" },
  cardTitle: { fontWeight: 900, marginTop: 6 },
  cardText: { marginTop: 6, color: "rgba(10,16,32,.70)", fontSize: 13, lineHeight: 1.45 },

  steps: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
  },
  step: { textAlign: "center" },
  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 999,
    background: "rgba(99,102,241,1)",
    color: "white",
    display: "grid",
    placeItems: "center",
    margin: "0 auto 8px",
    fontWeight: 900,
  },
  stepTitle: { fontWeight: 900 },
  stepText: { marginTop: 6, color: "rgba(10,16,32,.68)", fontSize: 12, lineHeight: 1.4 },

  pricing: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 14,
    alignItems: "stretch",
  },
  priceCard: {
    position: "relative",
    background: "white",
    borderRadius: 14,
    border: "1px solid rgba(10,16,32,.08)",
    padding: 18,
    boxShadow: "0 12px 28px rgba(10,16,32,.06)",
    minHeight: 260,
  },
  badge: {
    position: "absolute",
    top: -10,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(99,102,241,1)",
    color: "white",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
  },
  priceName: { fontWeight: 900, fontSize: 16 },
  priceValue: { marginTop: 6, fontWeight: 950, fontSize: 28 },
  per: { fontSize: 12, fontWeight: 800, color: "rgba(10,16,32,.65)" },
  priceDesc: { marginTop: 2, color: "rgba(10,16,32,.65)", fontSize: 12 },

  ul: { marginTop: 12, paddingLeft: 18, color: "rgba(10,16,32,.80)", fontSize: 13, lineHeight: 1.7 },

  btnOutlineFull: {
    marginTop: 12,
    width: "100%",
    borderRadius: 10,
    padding: "11px 14px",
    cursor: "pointer",
    background: "transparent",
    border: "1px solid rgba(10,16,32,.14)",
    fontWeight: 900,
  },
  btnPrimaryFull: {
    marginTop: 12,
    width: "100%",
    border: "none",
    borderRadius: 10,
    padding: "11px 14px",
    cursor: "pointer",
    background: "rgba(99,102,241,1)",
    color: "white",
    fontWeight: 950,
  },

  footerNote: {
    marginTop: 26,
    textAlign: "center",
    fontSize: 11,
    color: "rgba(10,16,32,.55)",
    lineHeight: 1.5,
  },
};
