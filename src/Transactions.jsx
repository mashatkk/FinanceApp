import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient"; // ← adjust path as needed

// ─── Design tokens (identical to Dashboard) ───────────────────────────────────
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
  danger:       "#c62828",
  dangerLight:  "#ffebee",
};
const FONT = "'Georgia', 'Times New Roman', serif";

// ─── Валюти (ті самі що в Dashboard) ─────────────────────────────────────────
const currencySymbols = {
  UAH: "₴",
  USD: "$",
  EUR: "€",
  GBP: "£",
  PLN: "zł",
};

// Курси: open.er-api.com/v6/latest/UAH → { USD: 0.0241, EUR: 0.0223, ... }
// rates[targetCurrency] = скільки targetCurrency за 1 UAH
const _ratesCache = { ts: 0, data: null };
async function getRatesFromUAH() {
  const ONE_HOUR = 3_600_000;
  if (_ratesCache.data && Date.now() - _ratesCache.ts < ONE_HOUR)
    return _ratesCache.data;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/UAH");
    if (!res.ok) return null;
    const json = await res.json();
    _ratesCache.data = json.rates;
    _ratesCache.ts = Date.now();
    return json.rates;
  } catch { return null; }
}

// Конвертує amountUAH → targetCurrency
function uahTo(amountUAH, targetCurrency, rates) {
  if (!rates || targetCurrency === "UAH") return Number(amountUAH);
  const rate = rates[targetCurrency];
  return rate ? Number(amountUAH) * rate : Number(amountUAH);
}

// Форматує число з символом валюти
const fmt2 = (n) => new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(n);

const fmtAmt = (n, cur) => {
  const sym = currencySymbols[cur] ?? cur;
  return `${sym}${fmt2(n)}`;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" });

const CATEGORY_LABELS = {
  salary: "Зарплата", freelance: "Фріланс", food: "Їжа",
  transport: "Транспорт", housing: "Житло", health: "Здоров'я",
  entertainment: "Розваги", utilities: "Комунальні", investment: "Інвестиції", other: "Інше",
};
const CATEGORIES = Object.values(CATEGORY_LABELS);
const catLabel = (c) => CATEGORY_LABELS[c] || (c ? c[0].toUpperCase() + c.slice(1) : "—");

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  root: {
    minHeight: "100vh", width: "100vw", overflowX: "hidden",
    boxSizing: "border-box", background: C.bg, fontFamily: FONT,
    color: C.text, paddingBottom: 80,
  },
  topbar: {
    position: "sticky", top: 0, zIndex: 100, height: 60, width: "100%",
    boxSizing: "border-box", display: "flex", alignItems: "center",
    justifyContent: "space-between", padding: "0 40px",
    background: C.surface, borderBottom: `1px solid ${C.border}`,
  },
  logo: { fontSize: 18, fontWeight: "bold", letterSpacing: "-0.5px", userSelect: "none" },
  logoAccent: { color: C.accent },
  topRight: { display: "flex", alignItems: "center", gap: 14 },
  btnDark: (h) => ({
    padding: "7px 18px", background: h ? "#333" : C.text, color: "#fff",
    border: "none", borderRadius: 6, fontSize: 13, fontFamily: FONT,
    cursor: "pointer", letterSpacing: "0.04em", transition: "background 0.15s", whiteSpace: "nowrap",
  }),
  btnOutline: (h) => ({
    padding: "7px 18px", background: h ? C.text : "transparent",
    color: h ? "#fff" : C.text, border: `1.5px solid ${C.text}`,
    borderRadius: 6, fontSize: 13, fontFamily: FONT, cursor: "pointer",
    letterSpacing: "0.04em", transition: "background 0.15s, color 0.15s", whiteSpace: "nowrap",
  }),
  btnDanger: (h) => ({
    padding: "5px 12px", background: h ? C.danger : C.dangerLight,
    color: h ? "#fff" : C.danger, border: `1px solid ${C.danger}`,
    borderRadius: 6, fontSize: 12, fontFamily: FONT, cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
  }),
  btnEdit: (h) => ({
    padding: "5px 12px", background: h ? "#e3f2fd" : C.surface,
    color: "#1565c0", border: "1px solid #90caf9",
    borderRadius: 6, fontSize: 12, fontFamily: FONT, cursor: "pointer",
    transition: "background 0.15s",
  }),
  btnSuccess: (h, disabled) => ({
    padding: "10px 28px", background: disabled ? "#ccc" : h ? "#1b5e20" : C.income,
    color: "#fff", border: "none", borderRadius: 8, fontSize: 14,
    fontFamily: FONT, cursor: disabled ? "not-allowed" : "pointer",
    letterSpacing: "0.04em", transition: "background 0.15s",
  }),
  content: { maxWidth: 1100, margin: "0 auto", padding: "44px 32px 0" },
  headingRow: {
    display: "flex", alignItems: "flex-end",
    justifyContent: "space-between", marginBottom: 36,
  },
  sectionLabel: {
    fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase",
    color: C.muted, margin: "0 0 6px",
  },
  pageTitle: { fontSize: 28, fontWeight: "normal", margin: 0, lineHeight: 1.15 },
  pageTitleAccent: { fontStyle: "italic", color: C.accent },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 36 },
  card: {
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
    padding: "22px 26px 18px", position: "relative", overflow: "hidden",
  },
  cardBar: (color) => ({
    position: "absolute", top: 0, left: 0, right: 0,
    height: 3, background: color, borderRadius: "12px 12px 0 0",
  }),
  cardLabel: {
    fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
    color: C.muted, marginBottom: 10,
  },
  cardValue: (color) => ({
    fontSize: 24, fontWeight: "bold", color: color || C.text,
    letterSpacing: "-0.5px", lineHeight: 1, wordBreak: "break-word",
  }),
  cardSub: (color) => ({ marginTop: 6, fontSize: 12, color: color || C.muted }),
  filtersCard: {
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
    padding: "20px 24px", marginBottom: 24,
    display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap",
  },
  filterGroup: { display: "flex", flexDirection: "column", gap: 5 },
  filterLabel: {
    fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted,
  },
  filterSelect: (focused) => ({
    padding: "8px 12px", fontSize: 13, fontFamily: FONT, color: C.text,
    background: C.surface, border: `1.5px solid ${focused ? C.text : C.border}`,
    borderRadius: 7, outline: "none", cursor: "pointer",
    appearance: "none", minWidth: 140,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: 28,
    transition: "border-color 0.15s",
  }),
  filterInput: (focused) => ({
    padding: "8px 12px", fontSize: 13, fontFamily: FONT, color: C.text,
    background: C.surface, border: `1.5px solid ${focused ? C.text : C.border}`,
    borderRadius: 7, outline: "none", width: 148, transition: "border-color 0.15s",
  }),
  resetBtn: (h) => ({
    padding: "8px 16px", background: h ? "#f5f5f5" : "transparent",
    color: C.muted, border: `1px solid ${C.border}`, borderRadius: 7,
    fontSize: 12, fontFamily: FONT, cursor: "pointer", transition: "background 0.15s",
    alignSelf: "flex-end",
  }),
  tableSection: {
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 12, overflow: "hidden",
  },
  tableTopRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "18px 24px 16px", borderBottom: `1px solid ${C.border}`,
  },
  tableTitle: { fontSize: 15, fontWeight: "bold", margin: 0 },
  txCount: { fontSize: 12, color: C.muted, letterSpacing: "0.04em" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  thead: { background: "#faf9f5", borderBottom: `1px solid ${C.border}` },
  th: {
    padding: "11px 18px", textAlign: "left", fontSize: 11,
    letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted,
    fontWeight: "normal", fontFamily: FONT, whiteSpace: "nowrap",
  },
  thRight: {
    padding: "11px 18px", textAlign: "right", fontSize: 11,
    letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted,
    fontWeight: "normal", fontFamily: FONT, whiteSpace: "nowrap",
  },
  thCenter: {
    padding: "11px 18px", textAlign: "center", fontSize: 11,
    letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted,
    fontWeight: "normal", fontFamily: FONT, whiteSpace: "nowrap",
  },
  td: (h, last) => ({
    padding: "12px 18px", borderBottom: last ? "none" : `1px solid ${C.borderLight}`,
    background: h ? C.hover : "transparent", transition: "background 0.08s",
    verticalAlign: "middle", fontFamily: FONT, color: C.text,
  }),
  tdRight: (h, last) => ({
    padding: "12px 18px", borderBottom: last ? "none" : `1px solid ${C.borderLight}`,
    background: h ? C.hover : "transparent", transition: "background 0.08s",
    textAlign: "right", verticalAlign: "middle", fontFamily: FONT,
  }),
  tdCenter: (h, last) => ({
    padding: "12px 18px", borderBottom: last ? "none" : `1px solid ${C.borderLight}`,
    background: h ? C.hover : "transparent", transition: "background 0.08s",
    textAlign: "center", verticalAlign: "middle", fontFamily: FONT,
  }),
  typeBadge: (type) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 20,
    fontSize: 12, fontWeight: 600,
    background: type === "income" ? C.incomeLight : C.expenseLight,
    color: type === "income" ? C.income : C.expense,
  }),
  amountText: (type) => ({
    fontWeight: "bold", color: type === "income" ? C.income : C.expense, letterSpacing: "-0.2px",
  }),
  descStrong: {
    fontWeight: 600, marginBottom: 2, maxWidth: 260,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block",
  },
  descSub: { fontSize: 12, color: C.muted, display: "block" },
  actionGroup: { display: "flex", gap: 6, justifyContent: "center" },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
    zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
  },
  modal: {
    background: C.surface, borderRadius: 16, padding: "36px 40px 40px",
    width: "100%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
    fontFamily: FONT,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", margin: "0 0 28px" },
  modalForm: { display: "flex", flexDirection: "column", gap: 18 },
  typeRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  typeBtn: (active, type) => ({
    padding: "10px 0", border: `2px solid ${active ? (type === "income" ? C.income : C.expense) : C.border}`,
    borderRadius: 9, fontFamily: FONT, fontSize: 14, cursor: "pointer",
    background: active ? (type === "income" ? C.incomeLight : C.expenseLight) : C.surface,
    color: active ? (type === "income" ? C.income : C.expense) : C.muted,
    fontWeight: active ? 700 : 400, transition: "all 0.15s",
  }),
  fieldGroup: { display: "flex", flexDirection: "column", gap: 5 },
  fieldLabel: {
    fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
    color: C.muted, fontFamily: FONT,
  },
  fieldInput: (err, focused) => ({
    padding: "10px 13px", fontSize: 14, fontFamily: FONT, color: C.text,
    background: C.surface, width: "100%", boxSizing: "border-box",
    border: `1.5px solid ${err ? C.danger : focused ? C.text : C.border}`,
    borderRadius: 8, outline: "none", transition: "border-color 0.15s",
  }),
  fieldSelect: (err, focused) => ({
    padding: "10px 13px", fontSize: 14, fontFamily: FONT, color: C.text,
    background: C.surface, width: "100%", boxSizing: "border-box",
    border: `1.5px solid ${err ? C.danger : focused ? C.text : C.border}`,
    borderRadius: 8, outline: "none", appearance: "none", cursor: "pointer",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32,
    transition: "border-color 0.15s",
  }),
  amountWrap: { position: "relative", display: "flex", alignItems: "center" },
  amountBadge: {
    position: "absolute", right: 13, fontSize: 12,
    color: C.muted, pointerEvents: "none",
  },
  fieldErr: { fontSize: 12, color: C.danger, fontStyle: "italic" },
  modalBtns: { display: "flex", gap: 10, marginTop: 6 },
  divider: { height: 1, background: C.borderLight, margin: "2px 0" },
  stateRow: {
    padding: "56px 24px", textAlign: "center",
    color: C.muted, fontSize: 15, fontStyle: "italic",
  },
  center: {
    display: "flex", alignItems: "center", justifyContent: "center",
    minHeight: "100vh", fontSize: 16, color: C.muted, fontFamily: FONT,
  },
  errorBanner: {
    background: "#fff5f5", border: "1px solid #f5c6c6", borderRadius: 10,
    padding: "12px 18px", color: C.danger, fontSize: 14, marginBottom: 24,
  },
  successBanner: {
    background: "#f0fdf4", border: "1px solid #a5d6a7", borderRadius: 10,
    padding: "12px 18px", color: C.income, fontSize: 14, marginBottom: 24,
  },
};

const emptyForm = () => ({
  type: "expense", amount: "", category: "", customCategory: "", description: "",
});

// ─── Transaction Row (з мультивалютністю) ────────────────────────────────────
function TxRow({ tx, isLast, onEdit, onDelete, profileCurrency, rates }) {
  const [h,       setH]       = useState(false);
  const [editHov, setEditHov] = useState(false);
  const [delHov,  setDelHov]  = useState(false);

  const sign    = tx.type === "income" ? "+" : "−";
  const txCur   = tx.currency || "UAH";
  const hasBase = tx.amount_base != null && Number(tx.amount_base) !== 0;
  const baseUAH = hasBase ? Number(tx.amount_base) : null;

  // Основна сума: конвертуємо UAH → profileCurrency
  let mainAmt, mainCur;
  if (hasBase && rates) {
    mainAmt = uahTo(baseUAH, profileCurrency, rates);
    mainCur = profileCurrency;
  } else {
    mainAmt = Number(tx.amount);
    mainCur = txCur;
  }

  // Підрядок: оригінальна валюта (якщо ≠ profileCurrency і ≠ UAH)
  const showOrigLine    = txCur !== profileCurrency && txCur !== "UAH";
  // Підрядок: ≈ UAH (якщо профіль не UAH і є amount_base)
  const showUAHLine     = profileCurrency !== "UAH" && hasBase;
  // Підрядок: оригінал у не-UAH якщо профіль UAH
  const showTxOrigLine  = profileCurrency === "UAH" && txCur !== "UAH";

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
        {/* Оригінальна валюта транзакції */}
        {showOrigLine && (
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
            {sign}{fmtAmt(tx.amount, txCur)}
          </div>
        )}
        {/* ≈ UAH якщо профіль не UAH */}
        {showUAHLine && (
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>
            ≈ {fmtAmt(baseUAH, "UAH")}
          </div>
        )}
        {/* Оригінал якщо профіль UAH, транзакція в іншій валюті */}
        {showTxOrigLine && (
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
            {sign}{fmtAmt(tx.amount, txCur)}
          </div>
        )}
      </td>
      <td style={S.tdCenter(h, isLast)}>
        <div style={S.actionGroup}>
          <button
            style={S.btnEdit(editHov)}
            onMouseEnter={() => setEditHov(true)} onMouseLeave={() => setEditHov(false)}
            onClick={() => onEdit(tx)}
          >✏ Змін.</button>
          <button
            style={S.btnDanger(delHov)}
            onMouseEnter={() => setDelHov(true)} onMouseLeave={() => setDelHov(false)}
            onClick={() => onDelete(tx.id)}
          >✕ Вид.</button>
        </div>
      </td>
    </tr>
  );
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────
function TxModal({ initial, onSave, onClose, saving, saveError }) {
  const [form,    setForm]    = useState(initial || emptyForm());
  const [errors,  setErrors]  = useState({});
  const [focused, setFocused] = useState("");
  const [saveHov,   setSaveHov]   = useState(false);
  const [cancelHov, setCancelHov] = useState(false);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) e.amount = "Введіть суму";
    if (!form.category) e.category = "Оберіть категорію";
    if (form.category === "Інше" && !form.customCategory.trim()) e.customCategory = "Введіть категорію";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const finalCat = form.category === "Інше" ? form.customCategory.trim() : form.category;
    onSave({
      type: form.type,
      amount: Number(form.amount),
      category: finalCat,
      description: form.description.trim() || null,
    });
  };

  return (
    <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={S.modal}>
        <h2 style={S.modalTitle}>
          {initial?.id ? "✏ Редагувати транзакцію" : "➕ Нова транзакція"}
        </h2>
        <form style={S.modalForm} onSubmit={handleSubmit} noValidate>

          <div style={S.fieldGroup}>
            <span style={S.fieldLabel}>Тип транзакції</span>
            <div style={S.typeRow}>
              <button type="button" style={S.typeBtn(form.type === "income", "income")} onClick={() => set("type", "income")}>↑ Дохід</button>
              <button type="button" style={S.typeBtn(form.type === "expense", "expense")} onClick={() => set("type", "expense")}>↓ Витрата</button>
            </div>
          </div>

          <div style={S.fieldGroup}>
            <label style={S.fieldLabel}>Сума (грн)</label>
            <div style={S.amountWrap}>
              <input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                onFocus={() => setFocused("amount")} onBlur={() => setFocused("")}
                style={{ ...S.fieldInput(!!errors.amount, focused === "amount"), paddingRight: 46 }}
              />
              <span style={S.amountBadge}>₴</span>
            </div>
            {errors.amount && <span style={S.fieldErr}>{errors.amount}</span>}
          </div>

          <div style={S.fieldGroup}>
            <label style={S.fieldLabel}>Категорія</label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              onFocus={() => setFocused("cat")} onBlur={() => setFocused("")}
              style={S.fieldSelect(!!errors.category, focused === "cat")}
            >
              <option value="" disabled>Оберіть категорію…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <span style={S.fieldErr}>{errors.category}</span>}
          </div>

          {form.category === "Інше" && (
            <div style={S.fieldGroup}>
              <label style={S.fieldLabel}>Власна категорія</label>
              <input
                type="text" placeholder="Наприклад: Подарунки"
                value={form.customCategory}
                onChange={(e) => set("customCategory", e.target.value)}
                onFocus={() => setFocused("customCat")} onBlur={() => setFocused("")}
                style={S.fieldInput(!!errors.customCategory, focused === "customCat")}
              />
              {errors.customCategory && <span style={S.fieldErr}>{errors.customCategory}</span>}
            </div>
          )}

          <div style={S.fieldGroup}>
            <label style={S.fieldLabel}>
              Опис <span style={{ fontStyle: "italic", textTransform: "none", letterSpacing: 0, color: C.muted }}>(необов'язково)</span>
            </label>
            <input
              type="text" placeholder="Короткий опис…"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              onFocus={() => setFocused("desc")} onBlur={() => setFocused("")}
              style={S.fieldInput(false, focused === "desc")}
            />
          </div>

          <div style={S.divider} />
          {saveError && <div style={S.errorBanner}>{saveError}</div>}

          <div style={S.modalBtns}>
            <button
              type="submit" disabled={saving}
              style={{ ...S.btnSuccess(saveHov, saving), flex: 1 }}
              onMouseEnter={() => setSaveHov(true)} onMouseLeave={() => setSaveHov(false)}
            >
              {saving ? "Збереження…" : "💾 Зберегти"}
            </button>
            <button
              type="button"
              style={S.btnOutline(cancelHov)}
              onMouseEnter={() => setCancelHov(true)} onMouseLeave={() => setCancelHov(false)}
              onClick={onClose}
            >Скасувати</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Transactions Page ────────────────────────────────────────────────────────
export default function Transactions() {
  const navigate = useNavigate();

  const [user,            setUser]            = useState(null);
  const [profileCurrency, setProfileCurrency] = useState("UAH");
  const [rates,           setRates]           = useState(null);
  const [transactions,    setTransactions]    = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [fetchError,      setFetchError]      = useState(null);

  const [filterType,     setFilterType]     = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo,   setFilterDateTo]   = useState("");
  const [focusedFilter,  setFocusedFilter]  = useState("");

  const [modalOpen,  setModalOpen]  = useState(false);
  const [editingTx,  setEditingTx]  = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [backHov,  setBackHov]  = useState(false);
  const [addHov,   setAddHov]   = useState(false);
  const [resetHov, setResetHov] = useState(false);

  // ── Auth + profile + rates ──
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login", { replace: true }); return; }
      if (!cancelled) setUser(session.user);

      // Профіль — валюта користувача
      const { data: profile } = await supabase
        .from("profiles")
        .select("currency")
        .eq("id", session.user.id)
        .single();
      if (!cancelled && profile?.currency) setProfileCurrency(profile.currency);

      // Курси валют
      const fetchedRates = await getRatesFromUAH();
      if (!cancelled && fetchedRates) setRates(fetchedRates);

      // Перший завантаження транзакцій (з userId напряму, не через state)
      if (!cancelled) {
        let q = supabase
          .from("transactions")
          .select("id, amount, amount_base, currency, type, category, description, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });
        const { data: txData, error: txErr } = await q;
        if (!cancelled) {
          if (txErr) setFetchError("Не вдалося завантажити транзакції.");
          else setTransactions(txData || []);
          setLoading(false);
        }
      }
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate("/login", { replace: true });
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [navigate]);

  // ── Fetch transactions (plain async function, called imperatively) ──
  // Using a ref to hold the latest userId so filters effect can call it
  // without violating react-hooks/set-state-in-effect.
  const fetchTransactions = async (uid) => {
    const userId = uid ?? user?.id;
    if (!userId) return;
    setFetchError(null);

    let query = supabase
      .from("transactions")
      .select("id, amount, amount_base, currency, type, category, description, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (filterType)     query = query.eq("type", filterType);
    if (filterCategory) query = query.eq("category", filterCategory);
    if (filterDateFrom) query = query.gte("created_at", filterDateFrom);
    if (filterDateTo)   query = query.lte("created_at", filterDateTo + "T23:59:59");

    const { data, error } = await query;
    if (error) setFetchError("Не вдалося завантажити транзакції.");
    else setTransactions(data || []);
    setLoading(false);
  };

  // ── Refetch when filters change (after initial load) ──
  // setTimeout moves the setState calls out of the synchronous effect body,
  // satisfying the react-hooks/set-state-in-effect rule.
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => { fetchTransactions(user.id); }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filterType, filterCategory, filterDateFrom, filterDateTo]);

  // ── Save (create or update) ──
  const handleSave = async (fields) => {
    setSaving(true); setSaveError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login", { replace: true }); return; }

    let error;
    if (editingTx?.id) {
      ({ error } = await supabase.from("transactions").update(fields).eq("id", editingTx.id));
    } else {
      ({ error } = await supabase.from("transactions").insert([{ ...fields, user_id: session.user.id }]));
    }

    setSaving(false);
    if (error) { setSaveError("Помилка збереження. Спробуйте ще раз."); return; }

    setModalOpen(false); setEditingTx(null);
    setSuccessMsg(editingTx?.id ? "Транзакцію оновлено." : "Транзакцію додано.");
    setTimeout(() => setSuccessMsg(null), 3000);
    fetchTransactions();
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    if (!window.confirm("Видалити цю транзакцію?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) { setFetchError("Помилка видалення."); return; }
    setSuccessMsg("Транзакцію видалено.");
    setTimeout(() => setSuccessMsg(null), 3000);
    fetchTransactions();
  };

  // ── Open modal for edit ──
  const handleEdit = (tx) => {
    setEditingTx({
      id: tx.id, type: tx.type,
      amount: String(tx.amount_base ?? tx.amount), // редагуємо в грн
      category: CATEGORIES.includes(tx.category) ? tx.category : "Інше",
      customCategory: CATEGORIES.includes(tx.category) ? "" : tx.category,
      description: tx.description || "",
    });
    setSaveError(null);
    setModalOpen(true);
  };

  const resetFilters = () => {
    setFilterType(""); setFilterCategory("");
    setFilterDateFrom(""); setFilterDateTo("");
  };

  // ── Статистика по amount_base (UAH), потім конвертуємо у profileCurrency ──
  const baseOf = (t) => Number(t.amount_base ?? t.amount);
  const totalIncomeUAH  = transactions.filter(t => t.type === "income").reduce((s, t) => s + baseOf(t), 0);
  const totalExpenseUAH = transactions.filter(t => t.type === "expense").reduce((s, t) => s + baseOf(t), 0);
  const balanceUAH      = totalIncomeUAH - totalExpenseUAH;

  // Конвертуємо підсумки у валюту профілю для відображення
  const dispIncome  = uahTo(totalIncomeUAH,  profileCurrency, rates);
  const dispExpense = uahTo(totalExpenseUAH, profileCurrency, rates);
  const dispBalance = uahTo(balanceUAH,      profileCurrency, rates);

  const usedCategories = [...new Set(transactions.map(t => t.category).filter(Boolean))].sort();
  const sym = currencySymbols[profileCurrency] ?? profileCurrency;

  if (loading) return <div style={S.center}>Завантаження…</div>;

  return (
    <div style={S.root}>

      <header style={S.topbar}>
        <span style={S.logo}>фін<span style={S.logoAccent}>·</span>відстеження</span>
        <div style={S.topRight}>
          <button
            style={S.btnOutline(backHov)}
            onMouseEnter={() => setBackHov(true)} onMouseLeave={() => setBackHov(false)}
            onClick={() => navigate("/Dashboard")}
          >← Головна панель</button>
          <button
            style={S.btnDark(addHov)}
            onMouseEnter={() => setAddHov(true)} onMouseLeave={() => setAddHov(false)}
            onClick={() => { setEditingTx(null); setSaveError(null); setModalOpen(true); }}
          >+ Додати транзакцію</button>
        </div>
      </header>

      <div style={S.content}>

        <div style={S.headingRow}>
          <div>
            <p style={S.sectionLabel}>Фінанси</p>
            <h1 style={S.pageTitle}>
              Всі <span style={S.pageTitleAccent}>транзакції</span>
            </h1>
          </div>
        </div>

        {fetchError  && <div style={S.errorBanner}>{fetchError}</div>}
        {successMsg  && <div style={S.successBanner}>✓ {successMsg}</div>}

        {/* ── Stat cards ── */}
        <div style={S.statsRow}>
          <div style={S.card}>
            <div style={S.cardBar("#4caf50")} />
            <div style={S.cardLabel}>Доходи · {sym}</div>
            <div style={S.cardValue(C.income)}>{fmtAmt(dispIncome, profileCurrency)}</div>
            <div style={S.cardSub(C.income)}>{transactions.filter(t => t.type === "income").length} транзакцій</div>
          </div>
          <div style={S.card}>
            <div style={S.cardBar("#e57373")} />
            <div style={S.cardLabel}>Витрати · {sym}</div>
            <div style={S.cardValue(C.expense)}>{fmtAmt(dispExpense, profileCurrency)}</div>
            <div style={S.cardSub(C.expense)}>{transactions.filter(t => t.type === "expense").length} транзакцій</div>
          </div>
          <div style={S.card}>
            <div style={S.cardBar(C.accent)} />
            <div style={S.cardLabel}>Баланс · {sym}</div>
            <div style={S.cardValue(dispBalance >= 0 ? C.text : C.expense)}>{fmtAmt(dispBalance, profileCurrency)}</div>
            <div style={S.cardSub()}>{dispBalance >= 0 ? "Позитивний баланс" : "Від'ємний баланс"}</div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div style={S.filtersCard}>
          <div style={S.filterGroup}>
            <span style={S.filterLabel}>Тип</span>
            <select
              value={filterType} onChange={e => setFilterType(e.target.value)}
              onFocus={() => setFocusedFilter("type")} onBlur={() => setFocusedFilter("")}
              style={S.filterSelect(focusedFilter === "type")}
            >
              <option value="">Всі типи</option>
              <option value="income">Доходи</option>
              <option value="expense">Витрати</option>
            </select>
          </div>
          <div style={S.filterGroup}>
            <span style={S.filterLabel}>Категорія</span>
            <select
              value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              onFocus={() => setFocusedFilter("cat")} onBlur={() => setFocusedFilter("")}
              style={S.filterSelect(focusedFilter === "cat")}
            >
              <option value="">Всі категорії</option>
              {usedCategories.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
            </select>
          </div>
          <div style={S.filterGroup}>
            <span style={S.filterLabel}>Дата від</span>
            <input
              type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              onFocus={() => setFocusedFilter("from")} onBlur={() => setFocusedFilter("")}
              style={S.filterInput(focusedFilter === "from")}
            />
          </div>
          <div style={S.filterGroup}>
            <span style={S.filterLabel}>Дата до</span>
            <input
              type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
              onFocus={() => setFocusedFilter("to")} onBlur={() => setFocusedFilter("")}
              style={S.filterInput(focusedFilter === "to")}
            />
          </div>
          <button
            style={S.resetBtn(resetHov)}
            onMouseEnter={() => setResetHov(true)} onMouseLeave={() => setResetHov(false)}
            onClick={resetFilters}
          >✕ Скинути</button>
        </div>

        {/* ── Table ── */}
        <div style={S.tableSection}>
          <div style={S.tableTopRow}>
            <h2 style={S.tableTitle}>Список транзакцій</h2>
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
                  <th style={S.thRight}>Сума ({sym})</th>
                  <th style={S.thCenter}>Дії</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <TxRow
                    key={tx.id} tx={tx}
                    isLast={i === transactions.length - 1}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    profileCurrency={profileCurrency}
                    rates={rates}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && (
        <TxModal
          initial={editingTx}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingTx(null); }}
          saving={saving}
          saveError={saveError}
        />
      )}

    </div>
  );
}
