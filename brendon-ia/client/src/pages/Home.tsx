import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type ThemeMode = "light" | "dark";

export default function Home() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("brendon_theme") as ThemeMode | null;
    return saved === "dark" || saved === "light" ? saved : "light";
  });

  useEffect(() => {
    localStorage.setItem("brendon_theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const isDark = theme === "dark";

  const s = useMemo(() => makeStyles(isDark), [isDark]);

  function goLogin() {
    navigate("/login");
  }

  function goRegister() {
    navigate("/register");
  }

  return (
    <div style={s.page}>
      {/* background glows */}
      <div style={s.glowA} />
      <div style={s.glowB} />
      <div style={s.glowC} />

      {/* Top bar */}
      <header style={s.header}>
        <div style={s.brand} onClick={() => navigate("/")}>
          <div style={s.logoMark}>
            <span style={s.star}>✦</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
            <span style={s.brandText}>brendon.ia</span>
            <span style={s.brandSub}>Highlights inteligentes para creators</span>
          </div>
        </div>

        <div style={s.headerActions}>
          <button
            style={s.btnTheme}
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label="Alternar tema"
            title="Alternar tema"
          >
            {isDark ? "☀️ Claro" : "🌙 Escuro"}
          </button>

          <button style={s.btnGhost} onClick={goLogin}>
            Entrar
          </button>
          <button style={s.btnPrimary} onClick={goRegister}>
            Começar Grátis
          </button>
        </div>
      </header>

      <main style={s.main}>
        {/* HERO */}
        <section style={s.hero}>
          <div style={s.heroLeft}>
            <div style={s.pill}>
              <span style={s.pillDot} />
              Novo • Score de “momento viral” + timestamps
            </div>

            <h1 style={s.h1}>
              Descubra <span style={s.h1Accent}>exatamente</span> onde cortar
              <br />
              para ter mais retenção.
            </h1>

            <p style={s.lead}>
              Cole um link do YouTube (ou envie o vídeo). A IA encontra os trechos com maior
              potencial de viralização e te devolve os melhores momentos com timestamps e texto pronto.
            </p>

            <div style={s.heroCtas}>
              <button style={s.btnPrimaryBig} onClick={goRegister}>
                Começar grátis agora
                <span style={s.btnArrow}>→</span>
              </button>
              <button style={s.btnGhostBig} onClick={goLogin}>
                Ver demo
              </button>
            </div>

            <div style={s.trustRow}>
              <div style={s.trustItem}>
                <div style={s.trustTop}>⚡</div>
                <div style={s.trustText}>
                  <b>Rápido</b>
                  <span style={s.trustSub}>resultado em minutos</span>
                </div>
              </div>

              <div style={s.trustItem}>
                <div style={s.trustTop}>🎯</div>
                <div style={s.trustText}>
                  <b>Preciso</b>
                  <span style={s.trustSub}>timestamps exatos</span>
                </div>
              </div>

              <div style={s.trustItem}>
                <div style={s.trustTop}>🔒</div>
                <div style={s.trustText}>
                  <b>Seguro</b>
                  <span style={s.trustSub}>você controla o envio</span>
                </div>
              </div>
            </div>

            <div style={s.micro}>
              Sem cartão • Comece em 30s • 1 crédito = 1 minuto processado
            </div>
          </div>

          {/* hero card */}
          <div style={s.heroRight}>
            <div style={s.previewCard}>
              <div style={s.previewTop}>
                <div style={s.previewBadge}>Prévia</div>
                <div style={s.previewDots}>
                  <span style={s.dot} />
                  <span style={s.dot} />
                  <span style={s.dot} />
                </div>
              </div>

              <div style={s.previewBody}>
                <div style={s.previewLineStrong} />
                <div style={s.previewLine} />
                <div style={s.previewLine} />

                <div style={{ height: 14 }} />

                <div style={s.previewMetricRow}>
                  <div style={s.previewMetric}>
                    <div style={s.metricBig}>10</div>
                    <div style={s.metricSub}>momentos ranqueados</div>
                  </div>
                  <div style={s.previewMetric}>
                    <div style={s.metricBig}>95%</div>
                    <div style={s.metricSub}>precisão (beta)</div>
                  </div>
                </div>

                <div style={{ height: 14 }} />

                <div style={s.miniList}>
                  <div style={s.miniItem}>
                    <span style={s.miniTag}>Hook</span>
                    <span style={s.miniText}>00:42 – 01:08</span>
                    <span style={s.miniScore}>9.3</span>
                  </div>
                  <div style={s.miniItem}>
                    <span style={s.miniTag2}>Clímax</span>
                    <span style={s.miniText}>03:10 – 03:44</span>
                    <span style={s.miniScore}>8.8</span>
                  </div>
                  <div style={s.miniItem}>
                    <span style={s.miniTag3}>Quote</span>
                    <span style={s.miniText}>06:02 – 06:23</span>
                    <span style={s.miniScore}>8.4</span>
                  </div>
                </div>

                <div style={{ height: 14 }} />

                <button style={s.previewBtn} onClick={goRegister}>
                  Gerar meus momentos
                </button>

                <div style={s.previewNote}>
                  Dica: crie conta e comece grátis. Depois compre créditos quando quiser.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* social proof */}
        <section style={s.section}>
          <div style={s.sectionHeader}>
            <h2 style={s.h2}>Feito para converter mais com menos esforço</h2>
            <p style={s.sub}>
              Você economiza tempo e decide o corte com dados: ganchos, clímax e quotes.
            </p>
          </div>

          <div style={s.statsGrid}>
            <div style={s.statCard}>
              <div style={s.statValue}>+Retenção</div>
              <div style={s.statText}>Encontre trechos que seguram a audiência.</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statValue}>+Velocidade</div>
              <div style={s.statText}>Escolha 30s–15min e receba timestamps.</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statValue}>+Consistência</div>
              <div style={s.statText}>Padrão de edição com critérios claros.</div>
            </div>
          </div>
        </section>

        {/* how it works */}
        <section style={s.section}>
          <div style={s.sectionHeader}>
            <h2 style={s.h2}>Como funciona</h2>
            <p style={s.sub}>3 passos simples</p>
          </div>

          <div style={s.steps}>
            <div style={s.stepCard}>
              <div style={s.stepCircle}>1</div>
              <div style={s.stepTitle}>Envie ou cole o link</div>
              <div style={s.stepText}>
                Upload direto ou YouTube. Você escolhe o que analisar.
              </div>
            </div>
            <div style={s.stepCard}>
              <div style={s.stepCircle}>2</div>
              <div style={s.stepTitle}>Defina a duração</div>
              <div style={s.stepText}>
                30s, 1min, 3min… você escolhe o formato.
              </div>
            </div>
            <div style={s.stepCard}>
              <div style={s.stepCircle}>3</div>
              <div style={s.stepTitle}>Receba os cortes</div>
              <div style={s.stepText}>
                TOP momentos com score, timestamps e texto pronto.
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section style={s.section}>
          <div style={s.sectionHeader}>
            <h2 style={s.h2}>Pacotes de Créditos</h2>
            <p style={s.sub}>Compre e use quando quiser. Sem mensalidade.</p>
          </div>

          <div style={s.pricing3}>
            <div style={s.priceCard}>
              <div style={s.priceTop}>
                <div style={s.priceName}>Starter</div>
                <div style={s.anchor}>Economia</div>
              </div>

              <div style={s.priceBigRow}>
                <div style={s.priceBig}>150</div>
                <div style={s.priceUnit}>créditos</div>
              </div>

              <div style={s.priceDesc}>Ideal para testar e validar</div>

              <ul style={s.ul}>
                <li>✓ 150 minutos de processamento</li>
                <li>✓ Use quando quiser</li>
                <li>✓ Suporte básico</li>
              </ul>

              <div style={s.moneyRow}>
                <div style={s.money}>R$ 29,99</div>
                <div style={s.perMinute}>~ R$ 0,20 / min</div>
              </div>

              <button style={s.btnPrimaryFull} onClick={goLogin}>
                Comprar 150 créditos
              </button>

              <div style={s.tip}>Dica: faça login para garantir o e-mail certo no pagamento.</div>
            </div>

            <div style={s.priceCardFeatured}>
              <div style={s.badge}>Mais Popular</div>

              <div style={s.priceTop}>
                <div style={s.priceName}>Creator</div>
                <div style={s.anchor2}>Melhor custo</div>
              </div>

              <div style={s.priceBigRow}>
                <div style={s.priceBig}>300</div>
                <div style={s.priceUnit}>créditos</div>
              </div>

              <div style={s.priceDesc}>Melhor custo-benefício</div>

              <ul style={s.ul}>
                <li>✓ 300 minutos de processamento</li>
                <li>✓ Histórico salvo</li>
                <li>✓ Use quando quiser</li>
              </ul>

              <div style={s.moneyRow}>
                <div style={s.money}>R$ 49,99</div>
                <div style={s.perMinute}>~ R$ 0,17 / min</div>
              </div>

              <button style={s.btnPrimaryFull} onClick={goLogin}>
                Comprar 300 créditos
              </button>

              <div style={s.tip}>Recomendado para quem posta toda semana.</div>
            </div>

            <div style={s.priceCard}>
              <div style={s.priceTop}>
                <div style={s.priceName}>Pro</div>
                <div style={s.anchor3}>Performance</div>
              </div>

              <div style={s.priceBigRow}>
                <div style={s.priceBig}>500</div>
                <div style={s.priceUnit}>créditos</div>
              </div>

              <div style={s.priceDesc}>Pra quem vai rodar tráfego</div>

              <ul style={s.ul}>
                <li>✓ 500 minutos de processamento</li>
                <li>✓ Prioridade e histórico</li>
                <li>✓ Use quando quiser</li>
              </ul>

              <div style={s.moneyRow}>
                <div style={s.money}>R$ 79,99</div>
                <div style={s.perMinute}>~ R$ 0,16 / min</div>
              </div>

              <button style={s.btnPrimaryFull} onClick={goLogin}>
                Comprar 500 créditos
              </button>

              <div style={s.tip}>Perfeito para escala e volume.</div>
            </div>
          </div>

          {/* conversion closer */}
          <div style={s.ctaStrip}>
            <div>
              <div style={s.ctaTitle}>Comece agora e teste na prática</div>
              <div style={s.ctaSub}>
                Crie sua conta e rode seu primeiro teste. Depois você compra créditos quando quiser.
              </div>
            </div>
            <button style={s.btnPrimaryBig} onClick={goRegister}>
              Criar conta grátis <span style={s.btnArrow}>→</span>
            </button>
          </div>

          <div style={s.footerNote}>
            Aviso Legal: O usuário declara possuir direitos ou autorização sobre os vídeos enviados ou analisados.
            <br />
            © 2026 brendon.ia - Todos os direitos reservados
          </div>
        </section>
      </main>

      {/* Responsivo */}
      <style>{`
        @media (max-width: 1050px){
          .heroGrid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 980px){
          .grid3, .steps, .pricing3, .statsGrid { grid-template-columns: 1fr !important; }
          .heroCtas { justify-content: center !important; }
        }
      `}</style>
    </div>
  );
}

function makeStyles(isDark: boolean): Record<string, React.CSSProperties> {
  const bg = isDark ? "#070a12" : "#f7f8fc";
  const text = isDark ? "rgba(255,255,255,.92)" : "#0b1020";
  const muted = isDark ? "rgba(255,255,255,.70)" : "rgba(10,16,32,.70)";
  const surface = isDark ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.78)";
  const border = isDark ? "rgba(255,255,255,.10)" : "rgba(10,16,32,.08)";
  const shadow = isDark ? "0 22px 70px rgba(0,0,0,.55)" : "0 22px 70px rgba(10,16,32,.10)";

  const gradA = "rgba(99,102,241,1)";
  const gradB = "rgba(56,189,248,1)";

  return {
    page: {
      minHeight: "100vh",
      background: isDark
        ? `radial-gradient(1200px 600px at 12% 12%, rgba(99,102,241,.25), transparent 60%),
           radial-gradient(900px 520px at 88% 18%, rgba(56,189,248,.18), transparent 55%),
           ${bg}`
        : `radial-gradient(1200px 600px at 12% 12%, rgba(99,102,241,.22), transparent 60%),
           radial-gradient(900px 520px at 88% 18%, rgba(56,189,248,.16), transparent 55%),
           ${bg}`,
      color: text,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      position: "relative",
      overflow: "hidden",
      transition: "background .2s ease, color .2s ease",
    },

    glowA: {
      position: "absolute",
      inset: "-240px auto auto -260px",
      width: 560,
      height: 560,
      background: "radial-gradient(circle, rgba(99,102,241,.30), transparent 60%)",
      filter: "blur(10px)",
      pointerEvents: "none",
      opacity: isDark ? 0.8 : 0.65,
    },
    glowB: {
      position: "absolute",
      inset: "-260px -260px auto auto",
      width: 560,
      height: 560,
      background: "radial-gradient(circle, rgba(56,189,248,.26), transparent 60%)",
      filter: "blur(10px)",
      pointerEvents: "none",
      opacity: isDark ? 0.8 : 0.6,
    },
    glowC: {
      position: "absolute",
      inset: "auto auto -260px 30%",
      width: 620,
      height: 620,
      background: "radial-gradient(circle, rgba(99,102,241,.18), transparent 60%)",
      filter: "blur(14px)",
      pointerEvents: "none",
      opacity: isDark ? 0.7 : 0.45,
    },

    header: {
      maxWidth: 1160,
      margin: "0 auto",
      padding: "16px 18px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 10,
      background: isDark ? "rgba(7,10,18,.72)" : "rgba(247,248,252,.72)",
      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,.08)" : "rgba(10,16,32,.06)"}`,
      backdropFilter: "blur(12px)",
    },

    brand: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" },
    logoMark: {
      width: 34,
      height: 34,
      borderRadius: 12,
      background: `linear-gradient(135deg, ${gradA}, ${gradB})`,
      display: "grid",
      placeItems: "center",
      boxShadow: "0 18px 50px rgba(99,102,241,.25)",
    },
    star: { color: "white", fontWeight: 900, transform: "translateY(-1px)" as any },
    brandText: { fontWeight: 950, letterSpacing: -0.3 },
    brandSub: { fontSize: 11, color: muted },

    headerActions: { display: "flex", gap: 10, alignItems: "center" },

    btnTheme: {
      borderRadius: 12,
      padding: "10px 12px",
      cursor: "pointer",
      background: isDark ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.75)",
      border: `1px solid ${isDark ? "rgba(255,255,255,.12)" : "rgba(10,16,32,.12)"}`,
      color: isDark ? "rgba(255,255,255,.88)" : "rgba(10,16,32,.86)",
      fontWeight: 900,
    },

    btnPrimary: {
      border: "none",
      borderRadius: 12,
      padding: "10px 14px",
      cursor: "pointer",
      background: `linear-gradient(135deg, ${gradA}, ${gradB})`,
      color: "white",
      fontWeight: 950,
      boxShadow: "0 18px 45px rgba(99,102,241,.22)",
      transform: "translateZ(0)",
    },
    btnGhost: {
      borderRadius: 12,
      padding: "10px 14px",
      cursor: "pointer",
      background: isDark ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.70)",
      border: `1px solid ${isDark ? "rgba(255,255,255,.12)" : "rgba(10,16,32,.12)"}`,
      color: isDark ? "rgba(255,255,255,.88)" : "rgba(10,16,32,.86)",
      fontWeight: 900,
    },

    main: { maxWidth: 1160, margin: "0 auto", padding: "0 18px 74px", position: "relative" },

    hero: {
      display: "grid",
      gridTemplateColumns: "1.1fr .9fr",
      gap: 18,
      alignItems: "center",
      padding: "64px 0 26px",
    },

    heroLeft: {},
    heroRight: {},

    pill: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 999,
      background: isDark ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.80)",
      border: `1px solid ${border}`,
      color: muted,
      fontWeight: 800,
      fontSize: 12,
    },
    pillDot: {
      width: 8,
      height: 8,
      borderRadius: 99,
      background: `linear-gradient(135deg, ${gradA}, ${gradB})`,
      boxShadow: "0 10px 24px rgba(99,102,241,.25)",
    },

    h1: { fontSize: 46, margin: "14px 0 0", letterSpacing: -1.2, lineHeight: 1.05 },
    h1Accent: {
      background: `linear-gradient(135deg, ${gradA}, ${gradB})`,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
    },

    lead: {
      margin: "14px 0 0",
      maxWidth: 680,
      color: muted,
      lineHeight: 1.6,
      fontSize: 14,
    },

    heroCtas: { marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" },
    btnPrimaryBig: {
      border: "none",
      borderRadius: 14,
      padding: "12px 18px",
      cursor: "pointer",
      background: `linear-gradient(135deg, ${gradA}, ${gradB})`,
      color: "white",
      fontWeight: 980,
      boxShadow: "0 22px 55px rgba(99,102,241,.24)",
      transform: "translateZ(0)",
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
    },
    btnArrow: { opacity: 0.95 },

    btnGhostBig: {
      borderRadius: 14,
      padding: "12px 18px",
      cursor: "pointer",
      background: isDark ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.72)",
      border: `1px solid ${isDark ? "rgba(255,255,255,.12)" : "rgba(10,16,32,.12)"}`,
      color: isDark ? "rgba(255,255,255,.88)" : "rgba(10,16,32,.86)",
      fontWeight: 950,
    },

    trustRow: {
      marginTop: 16,
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 10,
    },
    trustItem: {
      borderRadius: 16,
      padding: 12,
      background: surface,
      border: `1px solid ${border}`,
      boxShadow: isDark ? "none" : "0 16px 40px rgba(10,16,32,.08)",
      display: "flex",
      gap: 10,
      alignItems: "center",
    },
    trustTop: {
      width: 34,
      height: 34,
      borderRadius: 14,
      background: isDark ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.85)",
      border: `1px solid ${border}`,
      display: "grid",
      placeItems: "center",
    },
    trustText: { display: "flex", flexDirection: "column", gap: 2 },
    trustSub: { fontSize: 11, color: muted },

    micro: { marginTop: 12, fontSize: 12, color: muted },

    previewCard: {
      borderRadius: 20,
      background: isDark ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.82)",
      border: `1px solid ${border}`,
      boxShadow: shadow,
      overflow: "hidden",
      backdropFilter: "blur(12px)",
    },
    previewTop: {
      padding: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.90)",
    },
    previewBadge: {
      fontSize: 12,
      fontWeight: 950,
      padding: "6px 10px",
      borderRadius: 999,
      background: `linear-gradient(135deg, ${gradA}, ${gradB})`,
      color: "white",
      boxShadow: "0 16px 40px rgba(99,102,241,.18)",
    },
    previewDots: { display: "flex", gap: 6 },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 99,
      background: isDark ? "rgba(255,255,255,.25)" : "rgba(10,16,32,.25)",
    },

    previewBody: { padding: 16 },
    previewLineStrong: {
      height: 12,
      borderRadius: 999,
      background: isDark ? "rgba(255,255,255,.14)" : "rgba(10,16,32,.12)",
      width: "80%",
    },
    previewLine: {
      marginTop: 8,
      height: 10,
      borderRadius: 999,
      background: isDark ? "rgba(255,255,255,.10)" : "rgba(10,16,32,.10)",
      width: "64%",
    },

    previewMetricRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    previewMetric: {
      borderRadius: 16,
      padding: 12,
      border: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.85)",
    },
    metricBig: { fontSize: 24, fontWeight: 980, letterSpacing: -0.4 },
    metricSub: { marginTop: 4, fontSize: 11, color: muted, fontWeight: 800 },

    miniList: { display: "grid", gap: 10 },
    miniItem: {
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      gap: 10,
      alignItems: "center",
      borderRadius: 14,
      padding: 10,
      border: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.86)",
    },
    miniTag: {
      fontSize: 11,
      fontWeight: 950,
      padding: "4px 8px",
      borderRadius: 999,
      background: "rgba(99,102,241,.18)",
      color: isDark ? "rgba(255,255,255,.88)" : "rgba(10,16,32,.86)",
      border: `1px solid ${isDark ? "rgba(99,102,241,.25)" : "rgba(99,102,241,.25)"}`,
    },
    miniTag2: {
      fontSize: 11,
      fontWeight: 950,
      padding: "4px 8px",
      borderRadius: 999,
      background: "rgba(56,189,248,.18)",
      color: isDark ? "rgba(255,255,255,.88)" : "rgba(10,16,32,.86)",
      border: `1px solid ${isDark ? "rgba(56,189,248,.25)" : "rgba(56,189,248,.25)"}`,
    },
    miniTag3: {
      fontSize: 11,
      fontWeight: 950,
      padding: "4px 8px",
      borderRadius: 999,
      background: "rgba(16,185,129,.16)",
      color: isDark ? "rgba(255,255,255,.88)" : "rgba(10,16,32,.86)",
      border: `1px solid rgba(16,185,129,.22)`,
    },
    miniText: { fontSize: 12, color: muted, fontWeight: 850 },
    miniScore: { fontSize: 12, fontWeight: 980 },

    previewBtn: {
      marginTop: 12,
      width: "100%",
      border: "none",
      borderRadius: 14,
      padding: "12px 14px",
      cursor: "pointer",
      background: `linear-gradient(135deg, ${gradA}, ${gradB})`,
      color: "white",
      fontWeight: 980,
      boxShadow: "0 20px 55px rgba(99,102,241,.20)",
    },
    previewNote: { marginTop: 10, fontSize: 11, color: muted },

    section: { paddingTop: 54 },

    sectionHeader: { textAlign: "center" },
    h2: { margin: 0, fontSize: 28, letterSpacing: -0.6 },
    sub: { marginTop: 10, color: muted, fontSize: 13 },

    statsGrid: {
      marginTop: 16,
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 12,
    },
    statCard: {
      borderRadius: 18,
      padding: 16,
      background: surface,
      border: `1px solid ${border}`,
      boxShadow: isDark ? "none" : "0 18px 50px rgba(10,16,32,.08)",
    },
    statValue: {
      fontWeight: 980,
      fontSize: 16,
      background: `linear-gradient(135deg, ${gradA}, ${gradB})`,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
    },
    statText: { marginTop: 8, color: muted, fontSize: 13, lineHeight: 1.45 },

    steps: {
      marginTop: 16,
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 12,
    },
    stepCard: {
      borderRadius: 18,
      padding: 16,
      background: surface,
      border: `1px solid ${border}`,
      boxShadow: isDark ? "none" : "0 18px 50px rgba(10,16,32,.08)",
      textAlign: "center",
    },
    stepCircle: {
      width: 40,
      height: 40,
      borderRadius: 999,
      background: `linear-gradient(135deg, ${gradA}, ${gradB})`,
      color: "white",
      display: "grid",
      placeItems: "center",
      margin: "0 auto 10px",
      fontWeight: 980,
      boxShadow: "0 16px 45px rgba(99,102,241,.18)",
    },
    stepTitle: { fontWeight: 980 },
    stepText: { marginTop: 6, color: muted, fontSize: 12, lineHeight: 1.5 },

    pricing3: {
      marginTop: 16,
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 12,
      alignItems: "stretch",
    },

    priceCard: {
      position: "relative",
      borderRadius: 20,
      padding: 18,
      background: surface,
      border: `1px solid ${border}`,
      boxShadow: isDark ? "none" : "0 22px 70px rgba(10,16,32,.10)",
    },

    priceCardFeatured: {
      position: "relative",
      borderRadius: 20,
      padding: 18,
      background: isDark ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.88)",
      border: `1px solid rgba(99,102,241,.35)`,
      boxShadow: "0 26px 90px rgba(99,102,241,.18)",
      transform: "translateY(-6px)",
    },

    badge: {
      position: "absolute",
      top: -10,
      left: "50%",
      transform: "translateX(-50%)",
      background: `linear-gradient(135deg, ${gradA}, ${gradB})`,
      color: "white",
      padding: "6px 12px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 980,
      boxShadow: "0 18px 50px rgba(99,102,241,.22)",
    },

    priceTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
    priceName: { fontWeight: 980, fontSize: 16 },

    anchor: {
      fontSize: 11,
      fontWeight: 980,
      padding: "4px 10px",
      borderRadius: 999,
      background: isDark ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.90)",
      border: `1px solid ${border}`,
      color: muted,
    },
    anchor2: {
      fontSize: 11,
      fontWeight: 980,
      padding: "4px 10px",
      borderRadius: 999,
      background: "rgba(99,102,241,.12)",
      border: "1px solid rgba(99,102,241,.22)",
      color: muted,
    },
    anchor3: {
      fontSize: 11,
      fontWeight: 980,
      padding: "4px 10px",
      borderRadius: 999,
      background: "rgba(56,189,248,.12)",
      border: "1px solid rgba(56,189,248,.22)",
      color: muted,
    },

    priceBigRow: { display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 },
    priceBig: { fontWeight: 990, fontSize: 40, letterSpacing: -0.6 },
    priceUnit: { fontSize: 13, fontWeight: 900, color: muted },

    priceDesc: { marginTop: 6, color: muted, fontSize: 12 },

    ul: {
      marginTop: 12,
      paddingLeft: 18,
      color: muted,
      fontSize: 13,
      lineHeight: 1.75,
      fontWeight: 750,
    },

    moneyRow: { marginTop: 10, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 },
    money: { fontWeight: 990, fontSize: 16 },
    perMinute: { fontSize: 11, color: muted, fontWeight: 900 },

    btnPrimaryFull: {
      marginTop: 12,
      width: "100%",
      border: "none",
      borderRadius: 14,
      padding: "12px 14px",
      cursor: "pointer",
      background: `linear-gradient(135deg, ${gradA}, ${gradB})`,
      color: "white",
      fontWeight: 990,
      boxShadow: "0 22px 60px rgba(99,102,241,.20)",
    },

    tip: { marginTop: 10, fontSize: 11, color: muted },

    ctaStrip: {
      marginTop: 16,
      borderRadius: 22,
      padding: 18,
      border: `1px solid ${border}`,
      background: isDark
        ? "linear-gradient(135deg, rgba(99,102,241,.10), rgba(56,189,248,.08))"
        : "linear-gradient(135deg, rgba(99,102,241,.12), rgba(56,189,248,.10))",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      flexWrap: "wrap",
      boxShadow: isDark ? "none" : "0 22px 70px rgba(10,16,32,.10)",
    },
    ctaTitle: { fontWeight: 990, letterSpacing: -0.3 },
    ctaSub: { marginTop: 6, fontSize: 12, color: muted, fontWeight: 800 },

    footerNote: {
      marginTop: 26,
      textAlign: "center",
      fontSize: 11,
      color: muted,
      lineHeight: 1.5,
    },
  };
}
