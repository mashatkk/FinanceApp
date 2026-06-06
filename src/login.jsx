import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate, Link } from "react-router-dom";

const C = {
  bg:      "#f7f6f2",
  surface: "#ffffff",
  border:  "#e8e6de",
  text:    "#1a1a1a",
  muted:   "#888",
  accent:  "#c9783a",
  expense: "#c62828",
  income:  "#2e7d32",
};
const FONT = "'Georgia', 'Times New Roman', serif";

export default function SignIn() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [message,  setMessage]  = useState("");
  const [isError,  setIsError]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const [emailFoc, setEmailFoc] = useState(false);
  const [passFoc,  setPassFoc]  = useState(false);
  const [btnHov,   setBtnHov]   = useState(false);
  const [linkHov,  setLinkHov]  = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage("Помилка входу: " + error.message);
      setIsError(true);
    } else {
      setMessage("Успішний вхід!");
      console.log("User:", data.user);
      navigate("/dashboard");
    }

    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100vw", boxSizing: "border-box",
      background: C.bg, fontFamily: FONT, color: C.text,
      display: "flex", flexDirection: "column",
    }}>

      {/* ── Top bar ── */}
      <header style={{
        height: 60, width: "100%", boxSizing: "border-box",
        display: "flex", alignItems: "center", padding: "0 40px",
        background: C.surface, borderBottom: `1px solid ${C.border}`,
      }}>
        <Link to="/" style={{ textDecoration: "none", color: C.text }}>
          <span style={{ fontSize: 18, fontWeight: "bold", letterSpacing: "-0.5px", userSelect: "none" }}>
            фін<span style={{ color: C.accent }}>·</span>відстеження
          </span>
        </Link>
      </header>

      {/* ── Card ── */}
      <main style={{
        flex: 1, display: "flex", alignItems: "center",
        justifyContent: "center", padding: "40px 24px",
      }}>
        <div style={{
          width: "100%", maxWidth: 420,
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: "40px 40px 44px",
          boxShadow: "0 2px 20px rgba(0,0,0,0.07)",
        }}>

          {/* Header */}
          <p style={{
            fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase",
            color: C.muted, margin: "0 0 8px",
          }}>
            Акаунт
          </p>
          <h1 style={{
            fontSize: 26, fontWeight: "normal", margin: "0 0 28px", lineHeight: 1.2,
          }}>
            Вхід до <span style={{ fontStyle: "italic", color: C.accent }}>застосунку</span>
          </h1>

          <form onSubmit={handleLogin} noValidate>

            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: "block", fontSize: 11, letterSpacing: "0.12em",
                textTransform: "uppercase", color: C.muted, marginBottom: 6,
              }}>
                Email
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setEmailFoc(true)}
                onBlur={() => setEmailFoc(false)}
                required
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "11px 14px", fontSize: 15, fontFamily: FONT,
                  color: C.text, background: C.surface,
                  border: `1.5px solid ${emailFoc ? C.text : C.border}`,
                  borderRadius: 8, outline: "none",
                  transition: "border-color 0.15s",
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 28 }}>
              <label style={{
                display: "block", fontSize: 11, letterSpacing: "0.12em",
                textTransform: "uppercase", color: C.muted, marginBottom: 6,
              }}>
                Пароль
              </label>
              <input
                type="password"
                placeholder="Ваш пароль"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setPassFoc(true)}
                onBlur={() => setPassFoc(false)}
                required
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "11px 14px", fontSize: 15, fontFamily: FONT,
                  color: C.text, background: C.surface,
                  border: `1.5px solid ${passFoc ? C.text : C.border}`,
                  borderRadius: 8, outline: "none",
                  transition: "border-color 0.15s",
                }}
              />
            </div>

            {/* Message banner */}
            {message && (
              <div style={{
                padding: "11px 16px", borderRadius: 8, marginBottom: 20, fontSize: 13,
                background: isError ? "#fff5f5" : "#f0fdf4",
                border: `1px solid ${isError ? "#f5c6c6" : "#a5d6a7"}`,
                color: isError ? C.expense : C.income,
              }}>
                {isError ? "⚠ " : "✓ "}{message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => setBtnHov(true)}
              onMouseLeave={() => setBtnHov(false)}
              style={{
                width: "100%", padding: "13px 0",
                background: loading ? "#ccc" : btnHov ? "#333" : C.text,
                color: "#fff", border: "none", borderRadius: 8,
                fontSize: 15, fontFamily: FONT, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "0.05em",
                transition: "background 0.15s",
              }}
            >
              {loading ? "Вхід…" : "Увійти"}
            </button>

          </form>

          {/* Divider */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, margin: "24px 0",
          }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 12, color: C.muted }}>або</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          {/* Link to signup */}
          <p style={{ textAlign: "center", margin: 0, fontSize: 14, color: C.muted }}>
            Ще немає акаунту?{" "}
            <Link
              to="/signup"
              onMouseEnter={() => setLinkHov(true)}
              onMouseLeave={() => setLinkHov(false)}
              style={{
                color: linkHov ? C.accent : C.text,
                fontWeight: 600, textDecoration: "none",
                transition: "color 0.15s",
              }}
            >
              Зареєструватися
            </Link>
          </p>

        </div>
      </main>

    </div>
  );
}
