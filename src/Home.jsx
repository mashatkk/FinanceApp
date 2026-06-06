import { useState } from "react";
import { Link } from "react-router-dom";

const C = {
  bg:      "#f7f6f2",
  surface: "#ffffff",
  border:  "#e8e6de",
  text:    "#1a1a1a",
  muted:   "#888",
  accent:  "#c9783a",
};
const FONT = "'Georgia', 'Times New Roman', serif";

export default function Home() {
  const [loginHov,  setLoginHov]  = useState(false);
  const [signupHov, setSignupHov] = useState(false);

  return (
    <div style={{
      minHeight: "100vh", width: "100vw", boxSizing: "border-box",
      background: C.bg, fontFamily: FONT, color: C.text,
      display: "flex", flexDirection: "column",
    }}>

      {/* ── Top bar ── */}
     <header style={{
  height: 72, width: "100%", boxSizing: "border-box",
  display: "flex", alignItems: "center", padding: "0 40px",
  background: C.surface, borderBottom: `1px solid ${C.border}`,
}}>
  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <span style={{ fontSize: 18, fontWeight: "bold", letterSpacing: "-0.5px", userSelect: "none", lineHeight: 1.2 }}>
      <span style={{ fontStyle: "italic", color: C.accent }}>Твій</span> фінансовий порадник
    </span>
    <span style={{ fontSize: 12, color: C.muted, fontStyle: "italic", letterSpacing: "0.01em" }}>
      Аналіз фінансових операцій та прогнозування майбутніх витрат
    </span>
  </div>
</header>
      {/* ── Hero ── */}
      <main style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "60px 32px",
      }}>
        <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>

          {/* Icon */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: C.surface, border: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 28px", fontSize: 32,
            boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
          }}>
            💰
          </div>

          {/* Title */}
          <p style={{
            fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase",
            color: C.muted, margin: "0 0 10px",
          }}>
            Особисті фінанси
          </p>
          <h1 style={{
            fontSize: 38, fontWeight: "normal", margin: "0 0 16px", lineHeight: 1.15,
          }}>
            Ласкаво <span style={{ fontStyle: "italic", color: C.accent }}>просимо</span>
          </h1>
          <p style={{
            fontSize: 16, color: C.muted, margin: "0 0 44px", lineHeight: 1.6,
          }}>
            Відстежуйте витрати та доходи, встановлюйте бюджети<br />
            і отримуйте аналітику своїх фінансів в одному місці.
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/login" style={{ textDecoration: "none" }}>
              <button
                style={{
                  padding: "12px 36px",
                  background: loginHov ? "#333" : C.text,
                  color: "#fff", border: "none", borderRadius: 8,
                  fontSize: 15, fontFamily: FONT, cursor: "pointer",
                  letterSpacing: "0.04em", transition: "background 0.15s",
                }}
                onMouseEnter={() => setLoginHov(true)}
                onMouseLeave={() => setLoginHov(false)}
              >
                Увійти
              </button>
            </Link>

            <Link to="/signup" style={{ textDecoration: "none" }}>
              <button
                style={{
                  padding: "12px 36px",
                  background: signupHov ? C.text : "transparent",
                  color: signupHov ? "#fff" : C.text,
                  border: `1.5px solid ${C.text}`,
                  borderRadius: 8, fontSize: 15, fontFamily: FONT,
                  cursor: "pointer", letterSpacing: "0.04em",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={() => setSignupHov(true)}
                onMouseLeave={() => setSignupHov(false)}
              >
                Зареєструватися
              </button>
            </Link>
          </div>

          {/* Feature cards */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16, marginTop: 60,
          }}>
            {[
              { icon: "📊", title: "Аналітика",    desc: "Графіки та звіти по категоріях" },
              { icon: "🎯", title: "Бюджети",       desc: "Ліміти витрат і сповіщення"    },
              { icon: "🔮", title: "Прогнозування", desc: "Прогноз витрат на місяць"       },
            ].map(f => (
              <div key={f.title} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: "20px 16px", textAlign: "center",
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{f.desc}</div>
              </div>
            ))}
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        height: 48, display: "flex", alignItems: "center", justifyContent: "center",
        borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.muted,
      }}>
        фін·відстеження — ваш особистий фінансовий помічник
      </footer>

    </div>
  );
}
