// AnalyticsBudget.jsx
import { useState } from "react";

const C = {
  surface:"#ffffff", border:"#e8e6de", borderLight:"#f0ede6",
  text:"#1a1a1a", muted:"#6b7280", accent:"#c9783a",
  income:"#2e7d32", expense:"#c62828", warn:"#d97706",
  expenseLight:"#fef2f2", warnLight:"#fefce8",
};
const FONT = "'Georgia', 'Times New Roman', serif";

const CAT = {
  salary:"Зарплата", freelance:"Фріланс", food:"Їжа", transport:"Транспорт",
  housing:"Житло", health:"Здоров'я", entertainment:"Розваги",
  utilities:"Комунальні", investment:"Інвестиції", other:"Інше",
};
const CAT_ICONS = {
  food:"🍕", transport:"🚗", housing:"🏠", health:"💊",
  entertainment:"🎮", utilities:"💡", salary:"💼",
  freelance:"💻", investment:"📈", other:"📦",
};
const catLabel = (c) => CAT[c] || (c ? c[0].toUpperCase() + c.slice(1) : "—");

const CURRENCY_SYMBOLS = { UAH:"₴", USD:"$", EUR:"€", GBP:"£", PLN:"zł" };

// ── Конвертація UAH → profileCurrency (та сама логіка що в Dashboard) ──
function uahTo(amountUAH, cur, rates) {
  if (!rates || cur === "UAH") return Number(amountUAH);
  const rate = rates[cur];
  return rate ? Number(amountUAH) * rate : Number(amountUAH);
}

function fmtCur(amountUAH, cur, rates) {
  const sym = CURRENCY_SYMBOLS[cur] ?? cur;
  const val = uahTo(amountUAH, cur, rates);
  const num = new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(val);
  return cur === "UAH" ? `${num} ₴` : `${sym}${num}`;
}

// Бюджет задається в UAH (простіше), конвертуємо тільки для показу
function spentInPeriod(expenses, days) {
  const cutoff = Date.now() - days * 86_400_000;
  const map = {};
  expenses.forEach(t => {
    if (new Date(t.created_at).getTime() < cutoff) return;
    const k = t.category || "other";
    map[k] = (map[k] || 0) + Number(t.amount_base ?? t.amount);
  });
  return map; // завжди в UAH
}

// ── Кругова SVG шкала ──────────────────────────────────────
function Ring({ pct, over, noLimit, size = 56 }) {
  const r    = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const color = noLimit ? "#e5e7eb"
    : over     ? C.expense
    : pct > 80 ? C.warn
    : C.income;
  const filled = noLimit ? 0 : Math.min(pct, 100);

  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)", flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={`${(filled/100)*circ} ${circ}`}
        style={{ transition:"stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1)" }}
      />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
        style={{ transform:`rotate(90deg)`, transformOrigin:`${size/2}px ${size/2}px`,
          fontSize:11, fontFamily:FONT, fontWeight:700,
          fill: noLimit ? "#d1d5db" : color }}>
        {noLimit ? "—" : `${Math.round(pct)}%`}
      </text>
    </svg>
  );
}

// ── Одна категорія ─────────────────────────────────────────
function BudgetRow({ cat, spent, limit, profileCurrency, rates,
                     inputVal, onChangeInput, focused, onFocus, onBlur }) {
  const pct    = limit ? (spent / limit) * 100 : 0;
  const over   = !!limit && spent > limit;
  const noLim  = !limit;
  const color  = over ? C.expense : pct > 80 ? C.warn : C.income;

  const spentDisp = fmtCur(spent, profileCurrency, rates);
  const limitDisp = limit ? fmtCur(limit, profileCurrency, rates) : null;
  const leftDisp  = limit ? fmtCur(Math.max(limit - spent, 0), profileCurrency, rates) : null;

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:16,
      padding:"14px 0",
      borderBottom:`1px solid ${C.borderLight}`,
    }}>
      {/* Ring */}
      <Ring pct={pct} over={over} noLimit={noLim} size={52} />

      {/* Category info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
          <span style={{ fontSize:15 }}>{CAT_ICONS[cat] ?? "📦"}</span>
          <span style={{ fontSize:14, fontWeight:600, color:C.text }}>{catLabel(cat)}</span>
          {!noLim && (
            <span style={{
              marginLeft:"auto", fontSize:11, fontWeight:700,
              padding:"2px 8px", borderRadius:20,
              background: over ? "#fef2f2" : pct > 80 ? "#fefce8" : "#f0fdf4",
              color,
            }}>
              {over ? "Перевищено" : pct > 80 ? "Майже" : "В нормі"}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height:5, background:"#f3f4f6", borderRadius:3, overflow:"hidden", marginBottom:6 }}>
          <div style={{
            height:"100%", width:noLim ? "0%" : `${Math.min(pct,100)}%`,
            background:color, borderRadius:3,
            transition:"width 0.7s cubic-bezier(.4,0,.2,1)",
          }} />
        </div>

        <div style={{ fontSize:12, color:C.muted }}>
          {spentDisp}
          {limitDisp && <span> / {limitDisp}</span>}
          {leftDisp && !over && <span style={{ color:C.income }}> · залишилось {leftDisp}</span>}
          {over && <span style={{ color:C.expense }}> · перевищено на {fmtCur(spent-limit, profileCurrency, rates)}</span>}
        </div>
      </div>

      {/* Input — бюджет задається в грн */}
      <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
        <input
          type="number" min="0" placeholder="Ліміт"
          value={inputVal}
          onChange={e => onChangeInput(e.target.value)}
          onFocus={onFocus} onBlur={onBlur}
          style={{
            width:90, padding:"6px 10px", fontSize:13, fontFamily:FONT,
            border:`1.5px solid ${focused ? C.text : C.border}`,
            borderRadius:8, outline:"none", color:C.text,
            background:"#fafafa", transition:"border-color 0.15s",
          }}
        />
        <span style={{ fontSize:11, color:C.muted }}>₴</span>
      </div>
    </div>
  );
}

// ── Головний компонент ─────────────────────────────────────
export default function AnalyticsBudget({
  expenses = [],
  profileCurrency = "UAH",
  rates = null,
}) {
  const [budgets, setBudgets] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fin_budgets_v2") || "{}"); }
    catch { return {}; }
  });
  const [inputs, setInputs] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("fin_budgets_v2") || "{}");
      const r = {};
      Object.entries(s).forEach(([k, v]) => {
        r[k] = { week: v.week != null ? String(v.week) : "", month: v.month != null ? String(v.month) : "" };
      });
      return r;
    } catch { return {}; }
  });

  const [period,  setPeriod]  = useState("month"); // "week" | "month"
  const [saved,   setSaved]   = useState(false);
  const [focused, setFocused] = useState("");
  const [saveHov, setSaveHov] = useState(false);

  const days  = period === "week" ? 7 : 30;
  const cats  = [...new Set(expenses.map(t => t.category || "other"))].sort();
  const spent = spentInPeriod(expenses, days); // UAH

  const overList = cats.filter(cat => {
    const b = budgets[cat]?.[period];
    return b && (spent[cat] || 0) > b;
  });

  const setInp = (cat, prd, val) =>
    setInputs(p => ({ ...p, [cat]: { ...(p[cat] || {}), [prd]: val } }));

  const save = () => {
    const out = {};
    Object.entries(inputs).forEach(([k, v]) => {
      out[k] = {
        week:  v.week  ? parseFloat(v.week)  : null,
        month: v.month ? parseFloat(v.month) : null,
      };
    });
    setBudgets(out);
    localStorage.setItem("fin_budgets_v2", JSON.stringify(out));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>

      {/* ── Header ── */}
      <div style={{ padding:"20px 24px 16px", borderBottom:`1px solid ${C.borderLight}` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:15, fontWeight:700 }}>🎯 Бюджети</div>

          {/* Period — мінімалістичний switcher */}
          <div style={{ display:"flex", gap:0, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden" }}>
            {[
              { key:"week",  label:"Тиждень" },
              { key:"month", label:"Місяць"  },
            ].map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                padding:"5px 16px", fontSize:12, fontFamily:FONT, cursor:"pointer",
                border:"none", borderRight: p.key==="week" ? `1px solid ${C.border}` : "none",
                background: period===p.key ? C.text : C.surface,
                color:      period===p.key ? "#fff" : C.muted,
                fontWeight: period===p.key ? 600 : 400,
                transition:"background 0.15s, color 0.15s",
              }}>{p.label}</button>
            ))}
          </div>
        </div>

        {/* Overbudget alert */}
        {overList.length > 0 && (
          <div style={{ marginTop:12, padding:"8px 12px", background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:8, fontSize:12, color:C.expense, display:"flex", gap:8, alignItems:"center" }}>
            <span>⚠️</span>
            <span>Перевищено: <strong>{overList.map(catLabel).join(", ")}</strong></span>
          </div>
        )}
      </div>

      {/* ── Rows ── */}
      <div style={{ padding:"0 24px" }}>
        {cats.length === 0 ? (
          <div style={{ padding:"36px 0", textAlign:"center", color:C.muted, fontSize:14, fontStyle:"italic" }}>
            Немає витрат для налаштування бюджету
          </div>
        ) : cats.map(cat => (
          <BudgetRow
            key={cat}
            cat={cat}
            spent={spent[cat] || 0}
            limit={budgets[cat]?.[period] || null}
            profileCurrency={profileCurrency}
            rates={rates}
            inputVal={inputs[cat]?.[period] ?? ""}
            onChangeInput={val => setInp(cat, period, val)}
            focused={focused === cat}
            onFocus={() => setFocused(cat)}
            onBlur={() => setFocused("")}
          />
        ))}
      </div>

      {/* ── Footer ── */}
      {cats.length > 0 && (
        <div style={{ padding:"16px 24px", borderTop:`1px solid ${C.borderLight}`, display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={save}
            onMouseEnter={() => setSaveHov(true)}
            onMouseLeave={() => setSaveHov(false)}
            style={{
              padding:"8px 22px", fontSize:13, fontFamily:FONT, cursor:"pointer",
              background: saveHov ? "#1b5e20" : C.income, color:"#fff",
              border:"none", borderRadius:8, fontWeight:600, letterSpacing:"0.03em",
              transition:"background 0.15s",
            }}>
            Зберегти
          </button>
          {saved && <span style={{ fontSize:13, color:C.income, fontStyle:"italic" }}>✓ Збережено</span>}
          <span style={{ marginLeft:"auto", fontSize:11, color:C.muted }}>
            Ліміти вводяться в ₴ · відображаються у {CURRENCY_SYMBOLS[profileCurrency] ?? profileCurrency}
          </span>
        </div>
      )}
    </div>
  );
}
