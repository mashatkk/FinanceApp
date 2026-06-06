import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient"; // ← adjust path as needed

// ─── Design tokens (same as Dashboard) ───────────────────────────────────────
const C = {
  bg:           "#f7f6f2",
  surface:      "#ffffff",
  border:       "#e8e6de",
  borderLight:  "#f0ede6",
  borderFocus:  "#1a1a1a",
  borderError:  "#e57373",
  text:         "#1a1a1a",
  muted:        "#888",
  accent:       "#c9783a",
  income:       "#2e7d32",
  incomeLight:  "#e8f5e9",
  expense:      "#c62828",
  expenseLight: "#ffebee",
  hover:        "#faf9f5",
  errorBg:      "#fff5f5",
  successBg:    "#f0fdf4",
  successText:  "#2e7d32",
};
const FONT = "'Georgia', 'Times New Roman', serif";

// ─── Preset categories ────────────────────────────────────────────────────────
const CATEGORIES = [
  "Їжа",
  "Транспорт",
  "Покупки",
  "Розваги",
  "Комунальні",
  "Зарплата",
  "Фріланс",
  "Здоров'я",
  "Житло",
  "Інвестиції",
  "Інше",
];

// ─── НОВЕ: варіанти валют ─────────────────────────────────────────────────────
const CURRENCY_OPTIONS = [
  { value: "UAH", label: "Гривня (₴)"  },
  { value: "USD", label: "Долар ($)"   },
  { value: "EUR", label: "Євро (€)"    },
  { value: "GBP", label: "Фунт (£)"    },
  { value: "PLN", label: "Злотий (zł)" },
];

// ─── Єдина функція конвертації ──────────────────────────────────────────────
// Використовує /v6/latest/{from} → rates[to] = скільки 'to' за 1 'from'
// convert(52, "UAH", "USD") → 52 * 0.0241 ≈ 1.25
// convert(100, "USD", "UAH") → 100 * 41.5  ≈ 4150
const _rateCache = {};
async function convert(amount, from, to) {
  if (!amount || from === to) return Number(amount);
  try {
    if (!_rateCache[from]) {
      const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
      if (!res.ok) return Number(amount);
      const json = await res.json();
      _rateCache[from] = json.rates;
    }
    const rate = _rateCache[from][to];
    return rate ? Math.round(Number(amount) * rate * 100) / 100 : Number(amount);
  } catch {
    return Number(amount);
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  root: {
    minHeight: "100vh",
    width: "100vw",
    overflowX: "hidden",
    boxSizing: "border-box",
    background: C.bg,
    fontFamily: FONT,
    color: C.text,
    paddingBottom: 80,
  },
  topbar: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    height: 60,
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 40px",
    background: C.surface,
    borderBottom: `1px solid ${C.border}`,
  },
  logo: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: "-0.5px",
    userSelect: "none",
    color: C.text,
  },
  logoAccent: { color: C.accent },
  backBtn: (h) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 18px",
    background: h ? C.text : "transparent",
    color: h ? "#fff" : C.text,
    border: `1.5px solid ${C.text}`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: FONT,
    cursor: "pointer",
    letterSpacing: "0.04em",
    transition: "background 0.15s, color 0.15s",
    textDecoration: "none",
  }),
  content: {
    maxWidth: 600,
    margin: "0 auto",
    padding: "44px 32px 0",
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: C.muted,
    margin: "0 0 6px",
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "normal",
    margin: "0 0 32px",
    lineHeight: 1.15,
  },
  pageTitleAccent: { fontStyle: "italic", color: C.accent },
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: "36px 40px 40px",
    boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  typeRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  typeBtn: (active, type) => ({
    padding: "12px 0",
    border: `2px solid ${active
      ? (type === "income" ? C.income : C.expense)
      : C.border}`,
    borderRadius: 10,
    background: active
      ? (type === "income" ? C.incomeLight : C.expenseLight)
      : C.surface,
    color: active
      ? (type === "income" ? C.income : C.expense)
      : C.muted,
    fontSize: 14,
    fontFamily: FONT,
    fontWeight: active ? 700 : 400,
    cursor: "pointer",
    letterSpacing: "0.04em",
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  }),
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: C.muted,
    fontFamily: FONT,
  },
  input: (hasError, focused) => ({
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 14px",
    fontSize: 15,
    fontFamily: FONT,
    color: C.text,
    background: C.surface,
    border: `1.5px solid ${hasError ? C.borderError : focused ? C.borderFocus : C.border}`,
    borderRadius: 8,
    outline: "none",
    transition: "border-color 0.15s",
  }),
  amountWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  amountInput: (hasError, focused) => ({
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 56px 11px 14px",
    fontSize: 15,
    fontFamily: FONT,
    color: C.text,
    background: C.surface,
    border: `1.5px solid ${hasError ? C.borderError : focused ? C.borderFocus : C.border}`,
    borderRadius: 8,
    outline: "none",
    transition: "border-color 0.15s",
  }),
  amountBadge: {
    position: "absolute",
    right: 14,
    fontSize: 13,
    color: C.muted,
    pointerEvents: "none",
    fontFamily: FONT,
  },
  select: (hasError, focused) => ({
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 14px",
    fontSize: 15,
    fontFamily: FONT,
    color: C.text,
    background: C.surface,
    border: `1.5px solid ${hasError ? C.borderError : focused ? C.borderFocus : C.border}`,
    borderRadius: 8,
    outline: "none",
    appearance: "none",
    cursor: "pointer",
    transition: "border-color 0.15s",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    paddingRight: 36,
  }),
  errorMsg: {
    fontSize: 12,
    color: C.expense,
    marginTop: 2,
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    background: C.borderLight,
    margin: "4px 0",
  },
  submitBtn: (h) => ({
    width: "100%",
    padding: "13px 0",
    background: h ? "#333" : C.text,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontFamily: FONT,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.05em",
    transition: "background 0.15s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  }),
  successBanner: {
    background: C.successBg,
    border: `1px solid #a5d6a7`,
    borderRadius: 10,
    padding: "12px 18px",
    color: C.successText,
    fontSize: 14,
    marginBottom: 0,
  },
  errorBanner: {
    background: C.errorBg,
    border: "1px solid #f5c6c6",
    borderRadius: 10,
    padding: "12px 18px",
    color: C.expense,
    fontSize: 14,
  },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    fontSize: 16,
    color: C.muted,
    fontFamily: FONT,
  },

  // ── НОВЕ: підказка конвертації ────────────────────────────────────────────
  convertHint: {
    fontSize: 12,
    color: C.muted,
    fontStyle: "italic",
    marginTop: 4,
    paddingLeft: 2,
  },
};

// ─── AddTransaction ───────────────────────────────────────────────────────────
export default function AddTransaction() {
  const navigate = useNavigate();

  // ── Form state ──
  const [type,           setType]           = useState("expense");
  const [amount,         setAmount]         = useState("");
  const [currency,       setCurrency]       = useState("UAH"); // ← НОВЕ
  const [userCurrency,   setUserCurrency]   = useState("UAH"); // валюта профілю
  const [category,       setCategory]       = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [description,    setDescription]    = useState("");

  // ── UI state ──
  const [loading,        setLoading]        = useState(true);
  const [submitting,     setSubmitting]     = useState(false);
  const [submitError,    setSubmitError]    = useState(null);
  const [submitSuccess,  setSubmitSuccess]  = useState(false);

  // ── Focus state ──
  const [focused,        setFocused]        = useState("");

  // ── Validation errors ──
  const [errors,         setErrors]         = useState({});

  // ── Hover state ──
  const [backHov,        setBackHov]        = useState(false);
  const [submitHov,      setSubmitHov]      = useState(false);
  const [currFoc,        setCurrFoc]        = useState(false); // ← НОВЕ

  // підказка конвертації: { toUser, toUAH }
  const [convertedAmount, setConvertedAmount] = useState(null);

  // ── Auth check + profile currency + fetch rates ──
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login", { replace: true }); return; }

      // НОВЕ: отримати currency з профілю як default
      const { data: profile } = await supabase
        .from("profiles")
        .select("currency")
        .eq("id", session.user.id)
        .single();
      if (profile?.currency) {
        setCurrency(profile.currency);
        setUserCurrency(profile.currency); // зберігаємо валюту профілю окремо
      }

      setLoading(false);
    }
    init();
  }, [navigate]);

  // ── Live конвертація: перераховується при зміні amount або currency ──
  useEffect(() => {
    let cancelled = false;
    async function recalc() {
      const num = parseFloat(amount);
      if (!num || num <= 0) { setConvertedAmount(null); return; }
      // Якщо валюта транзакції = валюта профілю — підказка не потрібна
      if (currency === userCurrency) { setConvertedAmount(null); return; }
      // Конвертуємо в валюту профілю
      const toUser = await convert(num, currency, userCurrency);
      // Якщо валюта профілю не UAH — ще показуємо і UAH
      const toUAH = userCurrency !== "UAH"
        ? await convert(num, currency, "UAH")
        : null;
      if (!cancelled) setConvertedAmount({ toUser, toUAH });
    }
    recalc();
    return () => { cancelled = true; };
  }, [amount, currency, userCurrency]);

  // ── Validation ──
  const validate = () => {
    const e = {};
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      e.amount = "Введіть коректну суму";
    if (!category)
      e.category = "Оберіть категорію";
    if (category === "Інше" && !customCategory.trim())
      e.customCategory = "Введіть назву категорії";
    return e;
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login", { replace: true }); return; }

    const finalCategory = category === "Інше" ? customCategory.trim() : category;
    const originalAmount = Number(amount);

    // Конвертуємо в UAH через convert() для збереження в amount_base
    const amountBase = await convert(originalAmount, currency, "UAH");

    const { error } = await supabase.from("transactions").insert([
      {
        user_id:     session.user.id,
        type,
        amount:      originalAmount,
        amount_base: amountBase,   // сума в UAH для аналітики
        currency,                  // оригінальна валюта
        category:    finalCategory,
        description: description.trim() || null,
      },
    ]);

    setSubmitting(false);

    if (error) {
      setSubmitError("Помилка при збереженні. Спробуйте ще раз.");
    } else {
      setSubmitSuccess(true);
      setTimeout(() => navigate("/Dashboard"), 1000);
    }
  };


  if (loading) return <div style={S.center}>Завантаження…</div>;

  return (
    <div style={S.root}>

      {/* ── Top bar ── */}
      <header style={S.topbar}>
        <span style={S.logo}>
          фін<span style={S.logoAccent}>·</span>відстеження
        </span>
        <button
          style={S.backBtn(backHov)}
          onMouseEnter={() => setBackHov(true)}
          onMouseLeave={() => setBackHov(false)}
          onClick={() => navigate("/Dashboard")}
        >
          ← Назад до головної панелі
        </button>
      </header>

      {/* ── Content ── */}
      <div style={S.content}>

        <p style={S.sectionLabel}>Транзакції</p>
        <h1 style={S.pageTitle}>
          ➕ Додати <span style={S.pageTitleAccent}>транзакцію</span>
        </h1>

        <div style={S.card}>
          <form style={S.form} onSubmit={handleSubmit} noValidate>

            {/* ── Type toggle ── */}
            <div style={S.field}>
              <span style={S.label}>Тип транзакції</span>
              <div style={S.typeRow}>
                <button
                  type="button"
                  style={S.typeBtn(type === "income", "income")}
                  onClick={() => setType("income")}
                >
                  ↑ Дохід
                </button>
                <button
                  type="button"
                  style={S.typeBtn(type === "expense", "expense")}
                  onClick={() => setType("expense")}
                >
                  ↓ Витрата
                </button>
              </div>
            </div>

            {/* ── Amount ── */}
            <div style={S.field}>
              <label style={S.label}>Сума</label>
              <div style={S.amountWrapper}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: null })); }}
                  onFocus={() => setFocused("amount")}
                  onBlur={() => setFocused("")}
                  style={S.amountInput(!!errors.amount, focused === "amount")}
                />
                {/* ── НОВЕ: символ активної валюти замість "грн" ── */}
                <span style={S.amountBadge}>
                  {currency === "UAH" ? "грн" : currency}
                </span>
              </div>
              {errors.amount && <span style={S.errorMsg}>{errors.amount}</span>}
              {/* ── підказка конвертації: оновлюється live ── */}
              {convertedAmount?.toUser != null && (
                <div style={{ marginTop: 6 }}>
                  <span style={S.convertHint}>
                    ≈ {new Intl.NumberFormat("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(convertedAmount.toUser)} {userCurrency}
                  </span>
                  {convertedAmount.toUAH != null && (
                    <span style={{ ...S.convertHint, marginLeft: 10, color: "#aaa" }}>
                      · {new Intl.NumberFormat("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(convertedAmount.toUAH)} грн
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ── НОВЕ: Вибір валюти ── */}
            <div style={S.field}>
              <label style={S.label}>Валюта</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                onFocus={() => setCurrFoc(true)}
                onBlur={() => setCurrFoc(false)}
                style={S.select(false, currFoc)}
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* ── Category select ── */}
            <div style={S.field}>
              <label style={S.label}>Категорія</label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setErrors((p) => ({ ...p, category: null })); }}
                onFocus={() => setFocused("category")}
                onBlur={() => setFocused("")}
                style={S.select(!!errors.category, focused === "category")}
              >
                <option value="" disabled>Оберіть категорію…</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <span style={S.errorMsg}>{errors.category}</span>}
            </div>

            {/* ── Custom category ── */}
            {category === "Інше" && (
              <div style={S.field}>
                <label style={S.label}>Власна категорія</label>
                <input
                  type="text"
                  placeholder="Наприклад: Подарунки"
                  value={customCategory}
                  onChange={(e) => { setCustomCategory(e.target.value); setErrors((p) => ({ ...p, customCategory: null })); }}
                  onFocus={() => setFocused("customCategory")}
                  onBlur={() => setFocused("")}
                  style={S.input(!!errors.customCategory, focused === "customCategory")}
                />
                {errors.customCategory && <span style={S.errorMsg}>{errors.customCategory}</span>}
              </div>
            )}

            {/* ── Description ── */}
            <div style={S.field}>
              <label style={S.label}>Опис <span style={{ color: C.muted, fontStyle: "italic", textTransform: "none", letterSpacing: 0 }}>(необов'язково)</span></label>
              <input
                type="text"
                placeholder="Коротко опишіть транзакцію…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={() => setFocused("description")}
                onBlur={() => setFocused("")}
                style={S.input(false, focused === "description")}
              />
            </div>

            {/* ── Divider ── */}
            <div style={S.divider} />

            {/* ── Error / success banners ── */}
            {submitError && <div style={S.errorBanner}>{submitError}</div>}
            {submitSuccess && (
              <div style={S.successBanner}>
                ✓ Транзакцію збережено! Переходимо на Dashboard…
              </div>
            )}

            {/* ── Submit button ── */}
            <button
              type="submit"
              disabled={submitting || submitSuccess}
              style={{
                ...S.submitBtn(submitHov),
                opacity: submitting || submitSuccess ? 0.7 : 1,
                cursor: submitting || submitSuccess ? "not-allowed" : "pointer",
              }}
              onMouseEnter={() => setSubmitHov(true)}
              onMouseLeave={() => setSubmitHov(false)}
            >
              {submitting ? "Збереження…" : "💾 Зберегти транзакцію"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
