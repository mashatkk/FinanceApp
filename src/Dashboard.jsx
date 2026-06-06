import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient"; // ← adjust path to your Supabase client

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ── НОВЕ: мапа символів валют ──
const currencySymbols = {
  UAH: "₴",
  USD: "$",
  EUR: "€",
  GBP: "£",
  PLN: "zł",
};

// ── НОВЕ: форматування з урахуванням валюти ──
const fmtCur = (n, currency = "UAH") => {
  const sym = currencySymbols[currency] ?? currency;
  const num = new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  // Символ завжди перед числом (₴100, $45, €22)
  return `${sym}${num}`;
};

// ─── Курси валют: UAH → будь-яка валюта ─────────────────────────────────────
// Повертає { USD: 0.024, EUR: 0.022, ... } — скільки targetCurrency за 1 UAH
const _ratesCache = { ts: 0, data: null };
async function getRatesFromUAH() {
  const ONE_HOUR = 3600_000;
  if (_ratesCache.data && Date.now() - _ratesCache.ts < ONE_HOUR)
    return _ratesCache.data;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/UAH");
    if (!res.ok) return null;
    const json = await res.json();
    _ratesCache.data = json.rates; // { USD: 0.0241, EUR: 0.0223, ... }
    _ratesCache.ts = Date.now();
    return json.rates;
  } catch { return null; }
}
// Конвертує суму з UAH у targetCurrency
// rates["USD"] = 0.0241 → скільки USD за 1 UAH
// amountUAH * rates[target] = сума у target-валюті
function uahTo(amountUAH, targetCurrency, rates) {
  if (!rates || targetCurrency === "UAH") return Number(amountUAH);
  const rate = rates[targetCurrency];
  return rate ? Number(amountUAH) * rate : Number(amountUAH);
}

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const CATEGORY_LABELS = {
  salary:        "Зарплата",
  freelance:     "Фріланс",
  food:          "Їжа",
  transport:     "Транспорт",
  housing:       "Житло",
  health:        "Здоров'я",
  entertainment: "Розваги",
  utilities:     "Комунальні",
  investment:    "Інвестиції",
  other:         "Інше",
};
const catLabel = (c) =>
  CATEGORY_LABELS[c] || (c ? c[0].toUpperCase() + c.slice(1) : "—");

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:           "#f7f6f2",
  surface:      "#ffffff",
  border:       "#e8e6de",
  borderLight:  "#f0ede6",
  text:         "#1a1a1a",
  muted:        "#888",
  accent:       "#c9783a",
  income:       "#2e7d32",
  incomeLight:  "#e8f5e9",
  expense:      "#c62828",
  expenseLight: "#ffebee",
  hover:        "#faf9f5",
};
const FONT = "'Georgia', 'Times New Roman', serif";

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
  },
  logoAccent: { color: C.accent },
  topRight: { display: "flex", alignItems: "center", gap: 16 },
  greeting: {
    fontSize: 13,
    color: C.muted,
    fontStyle: "italic",
    maxWidth: 260,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  avatarBtn: (h) => ({
    width: 34,
    height: 34,
    borderRadius: "50%",
    border: `2px solid ${h ? C.accent : C.border}`,
    background: C.bg,
    overflow: "hidden",
    cursor: "pointer",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "border-color 0.15s",
    padding: 0,
  }),
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  avatarFallback: {
    fontSize: 16,
    lineHeight: 1,
    userSelect: "none",
  },
  logoutBtn: (h) => ({
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
  }),
  content: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "44px 32px 0",
  },
  headingRow: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 20,
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
    margin: 0,
    lineHeight: 1.15,
  },
  pageTitleAccent: { fontStyle: "italic", color: C.accent },
  addBtn: (h) => ({
    padding: "10px 24px",
    background: h ? "#333" : C.text,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: FONT,
    cursor: "pointer",
    letterSpacing: "0.04em",
    transition: "background 0.15s",
    whiteSpace: "nowrap",
  }),

  // ── НОВЕ: рядок фільтра ──
  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 28,
    flexWrap: "wrap",
  },
  filterBtn: (active) => ({
    padding: "6px 16px",
    background: active ? C.text : "transparent",
    color: active ? "#fff" : C.muted,
    border: `1.5px solid ${active ? C.text : C.border}`,
    borderRadius: 6,
    fontSize: 12,
    fontFamily: FONT,
    cursor: "pointer",
    letterSpacing: "0.04em",
    transition: "background 0.15s, color 0.15s, border-color 0.15s",
  }),
  monthInput: {
    padding: "5px 10px",
    fontSize: 12,
    fontFamily: FONT,
    color: C.text,
    background: C.surface,
    border: `1.5px solid ${C.border}`,
    borderRadius: 6,
    outline: "none",
    cursor: "pointer",
  },

  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 20,
    marginBottom: 44,
  },
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: "26px 28px 22px",
    position: "relative",
    overflow: "hidden",
  },
  cardBar: (color) => ({
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 3,
    background: color,
    borderRadius: "12px 12px 0 0",
  }),
  cardLabel: {
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 12,
  },
  cardValue: (color) => ({
    fontSize: 28,
    fontWeight: "bold",
    color: color || C.text,
    letterSpacing: "-0.5px",
    lineHeight: 1,
    wordBreak: "break-word",
  }),
  cardSub: (color) => ({
    marginTop: 8,
    fontSize: 12,
    color: color || C.muted,
  }),
  tableSection: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    overflow: "hidden",
  },
  tableTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 24px 16px",
    borderBottom: `1px solid ${C.border}`,
  },
  tableTitle: { fontSize: 15, fontWeight: "bold", margin: 0 },
  txCount: { fontSize: 12, color: C.muted, letterSpacing: "0.04em" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },
  thead: {
    background: "#faf9f5",
    borderBottom: `1px solid ${C.border}`,
  },
  th: {
    padding: "11px 20px",
    textAlign: "left",
    fontSize: 11,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: C.muted,
    fontWeight: "normal",
    fontFamily: FONT,
    whiteSpace: "nowrap",
  },
  thRight: {
    padding: "11px 20px",
    textAlign: "right",
    fontSize: 11,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: C.muted,
    fontWeight: "normal",
    fontFamily: FONT,
    whiteSpace: "nowrap",
  },
  td: (h, last) => ({
    padding: "13px 20px",
    borderBottom: last ? "none" : `1px solid ${C.borderLight}`,
    background: h ? C.hover : "transparent",
    transition: "background 0.08s",
    verticalAlign: "middle",
    fontFamily: FONT,
    color: C.text,
  }),
  tdRight: (h, last) => ({
    padding: "13px 20px",
    borderBottom: last ? "none" : `1px solid ${C.borderLight}`,
    background: h ? C.hover : "transparent",
    transition: "background 0.08s",
    textAlign: "right",
    verticalAlign: "middle",
    fontFamily: FONT,
  }),
  typeBadge: (type) => ({
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    background: type === "income" ? C.incomeLight : C.expenseLight,
    color: type === "income" ? C.income : C.expense,
  }),
  amountText: (type) => ({
    fontWeight: "bold",
    color: type === "income" ? C.income : C.expense,
    letterSpacing: "-0.2px",
  }),
  descStrong: {
    fontWeight: 600,
    marginBottom: 2,
    maxWidth: 280,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "block",
  },
  descSub: { fontSize: 12, color: C.muted, display: "block" },
  stateRow: {
    padding: "56px 24px",
    textAlign: "center",
    color: C.muted,
    fontSize: 15,
    fontStyle: "italic",
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
  errorBanner: {
    background: "#fff5f5",
    border: "1px solid #f5c6c6",
    borderRadius: 10,
    padding: "13px 20px",
    color: C.expense,
    fontSize: 14,
    marginBottom: 28,
  },
  viewBtn: (h) => ({
    display: "block",
    width: "100%",
    padding: "13px 0",
    marginTop: 1,
    background: h ? C.hover : C.surface,
    color: h ? C.text : C.muted,
    border: "none",
    borderTop: `1px solid ${C.border}`,
    fontSize: 13,
    fontFamily: FONT,
    cursor: "pointer",
    letterSpacing: "0.06em",
    textAlign: "center",
    transition: "background 0.15s, color 0.15s",
  }),
  analyticsBlock: {
    marginTop: 24,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: "24px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
  },
  analyticsLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  analyticsLabel: {
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: C.muted,
  },
  analyticsDesc: {
    fontSize: 15,
    color: C.text,
    lineHeight: 1.45,
    margin: 0,
  },
  analyticsAccent: {
    color: C.accent,
    fontStyle: "italic",
  },
  analyticsBtn: (h) => ({
    padding: "10px 28px",
    background: h ? C.accent : "transparent",
    color: h ? "#fff" : C.accent,
    border: `1.5px solid ${C.accent}`,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: FONT,
    cursor: "pointer",
    letterSpacing: "0.04em",
    transition: "background 0.15s, color 0.15s",
    whiteSpace: "nowrap",
    flexShrink: 0,
  }),
};

// ─── Transaction Row ──────────────────────────────────────────────────────────
// Логіка відображення:
//   amount_base = сума в UAH (завжди)
//   displayAmt  = amount_base конвертований у валюту профілю
//   Під сумою завжди показуємо: "оригінал (txCurrency)" + "≈ X UAH" якщо потрібно
function TxRow({ tx, isLast, profileCurrency, rates }) {
  const [h, setH] = useState(false);

  const fmt2 = (n) => new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);

  const sym = (cur) => currencySymbols[cur] ?? cur;
  const fmtAmt = (n, cur) => `${sym(cur)}${fmt2(n)}`;

  // amount_base — UAH-еквівалент, збережений при створенні транзакції
  const hasBase   = tx.amount_base != null && Number(tx.amount_base) !== 0;
  const baseUAH   = hasBase ? Number(tx.amount_base) : null;
  const txCur     = tx.currency || "UAH";

  // Основна сума для відображення: конвертуємо baseUAH → profileCurrency
  let mainAmt, mainCur;
  if (hasBase && rates) {
    mainAmt = uahTo(baseUAH, profileCurrency, rates);
    mainCur = profileCurrency;
  } else {
    // Немає курсів або amount_base — показуємо як є
    mainAmt = Number(tx.amount);
    mainCur = txCur;
  }

  const sign = tx.type === "income" ? "+" : "−";

  // Підрядок 1: оригінальна валюта транзакції (якщо відрізняється від profileCurrency)
  const showOrigLine = txCur !== profileCurrency && txCur !== "UAH";
  const origLine     = showOrigLine ? `${sign}${fmtAmt(tx.amount, txCur)}` : null;

  // Підрядок 2: ≈ X ₴ (якщо profileCurrency ≠ UAH і є baseUAH)
  const showUAHLine = profileCurrency !== "UAH" && hasBase;
  const uahLine     = showUAHLine ? `≈ ${fmtAmt(baseUAH, "UAH")}` : null;

  // Підрядок 3: якщо profileCurrency = UAH але txCur ≠ UAH → показуємо оригінал
  const showTxOrigLine = profileCurrency === "UAH" && txCur !== "UAH";
  const txOrigLine     = showTxOrigLine ? `${sign}${fmtAmt(tx.amount, txCur)}` : null;

  return (
    <tr onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
      <td style={S.td(h, isLast)}>{fmtDate(tx.created_at)}</td>
      <td style={S.td(h, isLast)}>
        <span style={S.descStrong}>{tx.description || "—"}</span>
        <span style={S.descSub}>{catLabel(tx.category)}</span>
      </td>
      <td style={S.td(h, isLast)}>
        <span style={S.typeBadge(tx.type)}>
          {tx.type === "income" ? "Дохід" : "Витрата"}
        </span>
      </td>
      <td style={S.tdRight(h, isLast)}>
        {/* Основна сума у валюті профілю */}
        <span style={S.amountText(tx.type)}>
          {sign}{fmtAmt(mainAmt, mainCur)}
        </span>
        {/* Оригінальна валюта транзакції якщо ≠ профілю */}
        {origLine && (
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
            {origLine}
          </div>
        )}
        {/* ≈ UAH якщо профіль не UAH */}
        {uahLine && (
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>
            {uahLine}
          </div>
        )}
        {/* Оригінал якщо профіль UAH а транзакція в іншій валюті */}
        {txOrigLine && (
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
            {txOrigLine}
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();

  const [user,           setUser]           = useState(null);
  const [profile,        setProfile]        = useState(null);
  const [transactions,   setTransactions]   = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [txError,        setTxError]        = useState(null);
  const [logoutHov,      setLogoutHov]      = useState(false);
  const [addHov,         setAddHov]         = useState(false);
  const [viewHov,        setViewHov]        = useState(false);
  const [analyticsHov,   setAnalyticsHov]   = useState(false);
  const [avatarHov,      setAvatarHov]      = useState(false);
  const [rates,          setRates]          = useState(null); // UAH→other rates

  // ── фільтр по періоду ──
  const [filterType,     setFilterType]     = useState("all"); // all | month | custom
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");

  // ── НОВЕ: валюта з профілю ──
  const currency = profile?.currency ?? "UAH";

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login", { replace: true }); return; }
      if (!cancelled) setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, currency") // ← НОВЕ: додали currency
        .eq("id", session.user.id)
        .single();
      if (!cancelled) setProfile(profileData);

      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, amount_base, currency, type, category, description, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch currency rates for display conversion
      const fetchedRates = await getRatesFromUAH();

      if (!cancelled) {
        if (error) setTxError("Не вдалося завантажити транзакції.");
        else setTransactions(data || []);
        if (fetchedRates) setRates(fetchedRates);
        setLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_e, session) => { if (!session) navigate("/login", { replace: true }); }
    );

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  // ── Конвертація грн → валюта профілю для відображення ──
  const displayVal = (amountUAH) => uahTo(amountUAH, currency, rates);

  // ── фільтрована вибірка для статистики (фронт-фільтрація) ──
  const filteredTransactions = transactions.filter((t) => {
    const date = new Date(t.created_at);
    if (filterType === "month") {
      const now = new Date();
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }
    if (filterType === "custom") {
      if (!dateFrom || !dateTo) return true;
      return (
        date >= new Date(dateFrom) &&
        date <= new Date(new Date(dateTo).setHours(23, 59, 59, 999))
      );
    }
    return true; // "all"
  });

  // ── Розрахунки тільки з filteredTransactions ──
  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount_base ?? t.amount), 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount_base ?? t.amount), 0);

  const balance = totalIncome - totalExpense;

  // ── Підпис для поточного фільтра ──
  const filterLabel = () => {
    if (filterType === "month")
      return new Date().toLocaleDateString("uk-UA", { month: "long", year: "numeric" });
    if (filterType === "custom" && dateFrom && dateTo)
      return `${dateFrom} — ${dateTo}`;
    return null;
  };

  if (loading) return <div style={S.center}>Завантаження…</div>;

  return (
    <div style={S.root}>

      {/* ════ Top bar ════ */}
      <header style={S.topbar}>
        <span style={S.logo}>
          фін<span style={S.logoAccent}>·</span>відстеження
        </span>
        <div style={S.topRight}>
          <span style={S.greeting}>
            Вітаємо, {profile?.full_name || user?.email}
          </span>
          <button
            style={S.avatarBtn(avatarHov)}
            onMouseEnter={() => setAvatarHov(true)}
            onMouseLeave={() => setAvatarHov(false)}
            onClick={() => navigate("/profile")}
            title="Мій профіль"
          >
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" style={S.avatarImg} />
              : <span style={S.avatarFallback}>👤</span>
            }
          </button>
          <button
            style={S.logoutBtn(logoutHov)}
            onMouseEnter={() => setLogoutHov(true)}
            onMouseLeave={() => setLogoutHov(false)}
            onClick={handleLogout}
          >
            Вийти
          </button>
        </div>
      </header>

      {/* ════ Page body ════ */}
      <div style={S.content}>

        <div style={S.headingRow}>
          <div>
            <p style={S.sectionLabel}>Головна</p>
            <h1 style={S.pageTitle}>
              Ваші <span style={S.pageTitleAccent}>фінанси</span>
            </h1>
          </div>
          <button
            style={S.addBtn(addHov)}
            onMouseEnter={() => setAddHov(true)}
            onMouseLeave={() => setAddHov(false)}
            onClick={() => navigate("/add-transaction")}
          >
            + Додати транзакцію
          </button>
        </div>

        {txError && <div style={S.errorBanner}>{txError}</div>}

        {/* ════ Фільтр по періоду ════ */}
        <div style={S.filterRow}>
          <span style={{ fontSize:12, color:C.muted, marginRight:4 }}>Період:</span>
          {[
            { key: "all",    label: "Весь період"  },
            { key: "month",  label: "Цей місяць"   },
            { key: "custom", label: "Свій період"  },
          ].map(({ key, label }) => (
            <button
              key={key}
              style={S.filterBtn(filterType === key)}
              onClick={() => setFilterType(key)}
            >
              {label}
            </button>
          ))}
          {filterType === "custom" && (
            <>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={S.monthInput}
              />
              <span style={{ fontSize:12, color:C.muted }}>—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={S.monthInput}
              />
            </>
          )}
          {filterLabel() && (
            <span style={{ fontSize:12, color:C.accent, fontStyle:"italic", marginLeft:4 }}>
              {filterLabel()}
            </span>
          )}
        </div>

        {/* ════ Stat cards ════ */}
        <div style={S.statsRow}>
          <div style={S.card}>
            <div style={S.cardBar("#4caf50")} />
            {/* ← НОВЕ: currency в мітці */}
            <div style={S.cardLabel}>Доходи · {currencySymbols[currency] ?? currency}</div>
            {/* ← НОВЕ: fmtCur замість fmt */}
            <div style={S.cardValue(C.income)}>{fmtCur(displayVal(totalIncome), currency)}</div>
            <div style={S.cardSub(C.income)}>
              {filteredTransactions.filter((t) => t.type === "income").length} транзакцій
            </div>
          </div>
          <div style={S.card}>
            <div style={S.cardBar("#e57373")} />
            <div style={S.cardLabel}>Витрати · {currencySymbols[currency] ?? currency}</div>
            <div style={S.cardValue(C.expense)}>{fmtCur(displayVal(totalExpense), currency)}</div>
            <div style={S.cardSub(C.expense)}>
              {filteredTransactions.filter((t) => t.type === "expense").length} транзакцій
            </div>
          </div>
          <div style={S.card}>
            <div style={S.cardBar(C.accent)} />
            <div style={S.cardLabel}>Баланс · {currencySymbols[currency] ?? currency}</div>
            <div style={S.cardValue(balance >= 0 ? C.text : C.expense)}>
              {fmtCur(displayVal(balance), currency)}
            </div>
            <div style={S.cardSub()}>
              {balance >= 0 ? "Позитивний баланс" : "Від'ємний баланс"}
            </div>
          </div>
        </div>

        {/* ════ Transactions table — не змінюємо ════ */}
        <div style={S.tableSection}>
          <div style={S.tableTopRow}>
            <h2 style={S.tableTitle}>5 останніх транзакцій</h2>
            <span style={S.txCount}>{transactions.length} записів</span>
          </div>

          {transactions.length === 0 ? (
            <div style={S.stateRow}>Немає транзакцій</div>
          ) : (
            <table style={S.table}>
              <thead style={S.thead}>
                <tr>
                  <th style={S.th}>Дата</th>
                  <th style={S.th}>Опис / Категорія</th>
                  <th style={S.th}>Тип</th>
                  <th style={S.thRight}>Сума</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <TxRow
                    key={tx.id}
                    tx={tx}
                    isLast={i === transactions.length - 1}
                    profileCurrency={currency}
                    rates={rates}
                  />
                ))}
              </tbody>
            </table>
          )}

          <button
            style={S.viewBtn(viewHov)}
            onMouseEnter={() => setViewHov(true)}
            onMouseLeave={() => setViewHov(false)}
            onClick={() => navigate("/transactions")}
          >
            Переглянути всі транзакції →
          </button>
        </div>

        {/* ════ Аналітика ════ */}
        <div style={S.analyticsBlock}>
          <div style={S.analyticsLeft}>
            <span style={S.analyticsLabel}>Аналітика</span>
            <p style={S.analyticsDesc}>
              Перегляньте детальну{" "}
              <span style={S.analyticsAccent}>аналітику витрат та доходів</span>
            </p>
          </div>
          <button
            style={S.analyticsBtn(analyticsHov)}
            onMouseEnter={() => setAnalyticsHov(true)}
            onMouseLeave={() => setAnalyticsHov(false)}
            onClick={() => navigate("/analytics")}
          >
            📊 Відкрити аналітику
          </button>
        </div>

      </div>
    </div>
  );
}
