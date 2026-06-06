import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import AnalyticsBudget from "./AnalyticsBudget";
import AnalyticsAI from "./AnalyticsAI";

// ─── Design tokens ────────────────────────────────────────────
const C = {
  bg:"#f7f6f2", surface:"#ffffff", border:"#e8e6de", borderLight:"#f0ede6",
  text:"#1a1a1a", muted:"#888", accent:"#c9783a",
  income:"#2e7d32", incomeLight:"#e8f5e9", expense:"#c62828", expenseLight:"#ffebee",
  hover:"#faf9f5", warn:"#e65100", warnLight:"#fff3e0",
  forecast:"#1565c0", forecastLight:"#e3f2fd",
};
const FONT = "'Georgia', 'Times New Roman', serif";
const PALETTE = ["#c9783a","#2e7d32","#1565c0","#6a1b9a","#c62828","#00695c","#f57f17","#37474f","#ad1457","#4527a0"];

// ─── Currency ─────────────────────────────────────────────────
const CURRENCY_SYMBOLS = { UAH:"₴", USD:"$", EUR:"€", GBP:"£", PLN:"zł" };
// rates["USD"] = 0.0241 → скільки USD за 1 UAH
// amountUAH * rates[target] = сума у target-валюті
const _ratesCache = { ts: 0, data: null };
async function getRatesFromUAH() {
  const ONE_HOUR = 3_600_000;
  if (_ratesCache.data && Date.now() - _ratesCache.ts < ONE_HOUR) return _ratesCache.data;
  try {
    const res  = await fetch("https://open.er-api.com/v6/latest/UAH");
    const json = await res.json();
    _ratesCache.data = json.rates;
    _ratesCache.ts   = Date.now();
    return json.rates;
  } catch { return null; }
}

function uahTo(amountUAH, targetCur, rates) {
  if (!rates || targetCur === "UAH") return Number(amountUAH);
  const rate = rates[targetCur];
  return rate ? Number(amountUAH) * rate : Number(amountUAH);
}

const fmtMoney = (n, cur = "UAH") => {
  const sym = CURRENCY_SYMBOLS[cur] ?? cur;
  const num = new Intl.NumberFormat("uk-UA", { minimumFractionDigits:2, maximumFractionDigits:2 }).format(n);
  return cur === "UAH" ? `${num} ₴` : `${sym}${num}`;
};

const fmtInCur = (amountUAH, cur, rates) =>
  fmtMoney(uahTo(amountUAH, cur, rates), cur);

// ─── Helpers ──────────────────────────────────────────────────
const fmtShortCur = (amountUAH, cur, rates) => {
  const sym = CURRENCY_SYMBOLS[cur] ?? cur;
  const val = uahTo(amountUAH, cur, rates);
  const num = new Intl.NumberFormat("uk-UA", { maximumFractionDigits:2 }).format(val);
  return cur === "UAH" ? `${num} ₴` : `${sym}${num}`;
};

const CATEGORY_MAP = {
  salary:"Зарплата", freelance:"Фріланс", food:"Їжа", transport:"Транспорт",
  housing:"Житло", health:"Здоров'я", entertainment:"Розваги",
  utilities:"Комунальні", investment:"Інвестиції", other:"Інше",
};
const catLabel = (c) => CATEGORY_MAP[c] || (c ? c[0].toUpperCase() + c.slice(1) : "—");

const groupByCategory = (txs) => {
  const map = {};
  txs.forEach(t => {
    const k = t.category || "other";
    map[k] = (map[k] || 0) + Number(t.amount_base ?? t.amount);
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
};

const byMonth = (txs) => {
  const map = {};
  txs.forEach(t => {
    const d = new Date(t.created_at);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    map[k] = (map[k] || 0) + Number(t.amount_base ?? t.amount);
  });
  return map;
};

// ─── Date presets ─────────────────────────────────────────────
const PRESETS = [
  { key:"all",   label:"Весь час" },
  { key:"week",  label:"Тиждень"  },
  { key:"month", label:"Місяць"   },
  { key:"custom",label:"Вибрати"  },
];

function getPresetDates(key) {
  const now   = new Date();
  const today = now.toISOString().slice(0,10);
  if (key === "week") {
    const d = new Date(now); d.setDate(d.getDate() - 7);
    return { from: d.toISOString().slice(0,10), to: today };
  }
  if (key === "month") {
    const d = new Date(now); d.setMonth(d.getMonth() - 1);
    return { from: d.toISOString().slice(0,10), to: today };
  }
  return { from: "", to: "" };
}

function filterByDate(txs, from, to) {
  return txs.filter(t => {
    const d = new Date(t.created_at);
    if (from && d < new Date(from)) return false;
    if (to   && d > new Date(to + "T23:59:59")) return false;
    return true;
  });
}

// ─── Donut Chart ──────────────────────────────────────────────
function DonutChart({ data, size = 160, profileCurrency = "UAH", rates = null }) {
  const ref   = useRef(null);
  const total = data.reduce((s, d) => s + d.value, 0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || total === 0) return;
    const ctx   = canvas.getContext("2d");
    const cx = size/2, cy = size/2, r = size/2-10, inner = r*0.58;
    ctx.clearRect(0, 0, size, size);
    let angle = -Math.PI/2;
    data.forEach((d, i) => {
      const slice = (d.value/total) * 2*Math.PI;
      ctx.beginPath(); ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,r,angle,angle+slice); ctx.closePath();
      ctx.fillStyle = PALETTE[i % PALETTE.length]; ctx.fill();
      angle += slice;
    });
    ctx.beginPath(); ctx.arc(cx,cy,inner,0,2*Math.PI);
    ctx.fillStyle = C.surface; ctx.fill();
    ctx.fillStyle = C.text; ctx.font = `bold 12px Georgia,serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`${data.length} кат.`, cx, cy);
  }, [data, size, total]);

  if (total === 0) return <div style={{ color:C.muted, fontSize:13, fontStyle:"italic" }}>Немає даних</div>;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:20 }}>
      <canvas ref={ref} width={size} height={size} style={{ flexShrink:0 }} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:7 }}>
        {data.slice(0,7).map((d,i) => (
          <div key={d.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:PALETTE[i%PALETTE.length], flexShrink:0 }} />
            <span style={{ fontSize:12, color:C.text, flex:1 }}>{catLabel(d.label)}</span>
            <span style={{ fontSize:12, color:C.muted, fontWeight:600 }}>{fmtShortCur(d.value, profileCurrency, rates)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Monthly Chart ────────────────────────────────────────────
function MonthlyChart({ incomeByMonth, expenseByMonth, profileCurrency = "UAH", rates = null }) {
  const months = [...new Set([...Object.keys(incomeByMonth), ...Object.keys(expenseByMonth)])].sort();
  const max    = Math.max(...months.map(m => Math.max(incomeByMonth[m]||0, expenseByMonth[m]||0)), 1);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {months.slice(-6).map(m => {
        const inc = incomeByMonth[m] || 0;
        const exp = expenseByMonth[m] || 0;
        const [y, mo] = m.split("-");
        const label = new Date(Number(y), Number(mo)-1).toLocaleDateString("uk-UA", { month:"short", year:"2-digit" });
        const bar = (val, color) => (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:30, fontSize:10, color }}>{val===inc?"Дох.":"Вит."}</div>
            <div style={{ flex:1, height:8, background:C.borderLight, borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${(val/max)*100}%`, background:color, borderRadius:4, transition:"width 0.5s" }} />
            </div>
            <div style={{ fontSize:11, color, minWidth:75, textAlign:"right" }}>{fmtShortCur(val, profileCurrency, rates)}</div>
          </div>
        );
        return (
          <div key={m}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:3, letterSpacing:"0.08em" }}>{label}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
              {bar(inc, C.income)}
              {bar(exp, C.expense)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────
function BarChart({ data, profileCurrency = "UAH", rates = null }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      {data.map(d => (
        <div key={d.label} style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize:13, color:C.text, fontWeight:600 }}>{catLabel(d.label)}</span>
            <span style={{ fontSize:12, color:C.muted }}>{fmtShortCur(d.value, profileCurrency, rates)}</span>
          </div>
          <div style={{ height:10, background:C.borderLight, borderRadius:6, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(d.value/max)*100}%`, background:C.expense, borderRadius:6, transition:"width 0.6s cubic-bezier(.4,0,.2,1)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const card = {
  background:C.surface, border:`1px solid ${C.border}`,
  borderRadius:12, padding:"24px 28px", position:"relative", overflow:"hidden",
};
const cardBar = (color) => ({
  position:"absolute", top:0, left:0, right:0,
  height:3, background:color, borderRadius:"12px 12px 0 0",
});

// ─── Analytics Page ───────────────────────────────────────────
export default function Analytics() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [profileCurrency, setProfileCurrency] = useState("UAH");
  const [rates,           setRates]           = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Date filter
  const [preset,   setPreset]   = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  // Hover
  const [backHov, setBackHov] = useState(false);

  // ── Load ──
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { data:{ session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login", { replace:true }); return; }

      // Profile currency
      const { data:prof } = await supabase
        .from("profiles").select("currency").eq("id", session.user.id).single();
      if (!cancelled && prof?.currency) setProfileCurrency(prof.currency);

      // Currency rates
      const fetchedRates = await getRatesFromUAH();
      if (!cancelled && fetchedRates) setRates(fetchedRates);

      // Transactions
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, amount_base, currency, type, category, description, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending:true });

      if (!cancelled) {
        if (error) setError("Не вдалося завантажити транзакції.");
        else setTransactions(data || []);
        setLoading(false);
      }
    }
    init();
    const { data:{ subscription } } = supabase.auth.onAuthStateChange(
      (_e, session) => { if (!session) navigate("/login", { replace:true }); }
    );
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [navigate]);

  // ── Date filter logic ──
  const handlePreset = (key) => {
    setPreset(key);
    if (key !== "custom") {
      const { from, to } = getPresetDates(key);
      setDateFrom(from);
      setDateTo(to);
    }
  };

  const filtered     = filterByDate(transactions, dateFrom, dateTo);
  const expenses     = filtered.filter(t => t.type === "expense");
  const incomes      = filtered.filter(t => t.type === "income");
  const totalExpense = expenses.reduce((s,t) => s + Number(t.amount_base ?? t.amount), 0);
  const totalIncome  = incomes.reduce((s,t)  => s + Number(t.amount_base ?? t.amount), 0);
  const balance      = totalIncome - totalExpense;

  const expByCategory  = groupByCategory(expenses);
  const incByCategory  = groupByCategory(incomes);
  const incomeByMonth  = byMonth(incomes);
  const expenseByMonth = byMonth(expenses);

  const donutExpData = expByCategory.map(([label,value]) => ({ label, value }));
  const donutIncData = incByCategory.map(([label,value]) => ({ label, value }));
  const barExpData   = expByCategory.map(([label,value]) => ({ label, value }));

  // Forecast
  const [nowTs] = useState(() => Date.now());
  const firstExp = expenses.length > 0 ? new Date(expenses[0].created_at) : null;
  const daysSince = firstExp ? (nowTs - firstExp.getTime()) / 86_400_000 : 0;
  const forecastReady = daysSince >= 7;
  const avgDaily  = forecastReady && daysSince > 0 ? totalExpense / daysSince : 0;

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", fontFamily:FONT, color:C.muted }}>
      Завантаження…
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", width:"100vw", overflowX:"hidden", boxSizing:"border-box", background:C.bg, fontFamily:FONT, color:C.text, paddingBottom:80 }}>

      {/* Topbar */}
      <header style={{ position:"sticky", top:0, zIndex:100, height:60, width:"100%", boxSizing:"border-box", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 40px", background:C.surface, borderBottom:`1px solid ${C.border}` }}>
        <span style={{ fontSize:18, fontWeight:"bold", letterSpacing:"-0.5px" }}>
          фін<span style={{ color:C.accent }}>·</span>відстеження
        </span>
        <button
          style={{ padding:"7px 18px", background:backHov?C.text:"transparent", color:backHov?"#fff":C.text, border:`1.5px solid ${C.text}`, borderRadius:6, fontSize:13, fontFamily:FONT, cursor:"pointer", letterSpacing:"0.04em", transition:"background 0.15s, color 0.15s" }}
          onMouseEnter={() => setBackHov(true)} onMouseLeave={() => setBackHov(false)}
          onClick={() => navigate("/Dashboard")}
        >← Головна панель</button>
      </header>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"44px 32px 0" }}>

        {/* Heading */}
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:28 }}>
          <div>
            <p style={{ fontSize:11, letterSpacing:"0.15em", textTransform:"uppercase", color:C.muted, margin:"0 0 6px" }}>Фінанси</p>
            <h1 style={{ fontSize:28, fontWeight:"normal", margin:0, lineHeight:1.15 }}>
              📊 Детальна <span style={{ fontStyle:"italic", color:C.accent }}>аналітика</span>
            </h1>
          </div>
        </div>

        {error && <div style={{ background:"#fff5f5", border:"1px solid #f5c6c6", borderRadius:10, padding:"12px 18px", color:C.expense, fontSize:14, marginBottom:24 }}>{error}</div>}

        {/* ── Date filter ── */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 20px", marginBottom:24, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, color:C.muted, marginRight:4 }}>Період:</span>
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => handlePreset(p.key)} style={{
              padding:"6px 16px", fontSize:12, fontFamily:FONT, cursor:"pointer",
              border:`1.5px solid ${preset===p.key ? C.text : C.border}`,
              borderRadius:6, background:preset===p.key ? C.text : "transparent",
              color:preset===p.key ? "#fff" : C.muted, transition:"all 0.15s",
            }}>{p.label}</button>
          ))}
          {preset === "custom" && (
            <>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={{ padding:"6px 10px", fontSize:12, fontFamily:FONT, border:`1.5px solid ${C.border}`, borderRadius:6, outline:"none", color:C.text }} />
              <span style={{ fontSize:12, color:C.muted }}>—</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                style={{ padding:"6px 10px", fontSize:12, fontFamily:FONT, border:`1.5px solid ${C.border}`, borderRadius:6, outline:"none", color:C.text }} />
            </>
          )}
          <span style={{ fontSize:12, color:C.muted, marginLeft:"auto" }}>
            {filtered.length} транзакцій
          </span>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20, marginBottom:24 }}>
          {[
            { label:`Доходи · ${CURRENCY_SYMBOLS[profileCurrency]??profileCurrency}`, val:fmtInCur(totalIncome, profileCurrency, rates), color:C.income, bar:"#4caf50" },
            { label:`Витрати · ${CURRENCY_SYMBOLS[profileCurrency]??profileCurrency}`, val:fmtInCur(totalExpense, profileCurrency, rates), color:C.expense, bar:"#e57373" },
            { label:"Баланс",  val:fmtInCur(balance, profileCurrency, rates), color:balance>=0?C.text:C.expense, bar:C.accent },
          ].map(c => (
            <div key={c.label} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 24px", position:"relative", overflow:"hidden" }}>
              <div style={cardBar(c.bar)} />
              <div style={{ fontSize:11, letterSpacing:"0.13em", textTransform:"uppercase", color:C.muted, marginBottom:8 }}>{c.label}</div>
              <div style={{ fontSize:26, fontWeight:"bold", color:c.color, letterSpacing:"-0.5px", lineHeight:1, wordBreak:"break-word" }}>{c.val}</div>
            </div>
          ))}
        </div>

        {/* ── Donuts ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:24 }}>
          <div style={card}>
            <div style={cardBar(C.expense)} />
            <div style={{ fontSize:14, fontWeight:"bold", margin:"0 0 18px" }}>Витрати по категоріях</div>
            <DonutChart data={donutExpData} size={160} profileCurrency={profileCurrency} rates={rates} />
            <p style={{ fontSize:12, color:C.muted, margin:"10px 0 0", fontStyle:"italic" }}>Розподіл витрат між категоріями за обраний період</p>
          </div>
          <div style={card}>
            <div style={cardBar(C.income)} />
            <div style={{ fontSize:14, fontWeight:"bold", margin:"0 0 18px" }}>Доходи по категоріях</div>
            <DonutChart data={donutIncData} size={160} profileCurrency={profileCurrency} rates={rates} />
            <p style={{ fontSize:12, color:C.muted, margin:"10px 0 0", fontStyle:"italic" }}>Розподіл доходів між категоріями за обраний період</p>
          </div>
        </div>

        {/* ── Monthly ── */}
        <div style={{ ...card, marginBottom:24 }}>
          <div style={cardBar(C.accent)} />
          <div style={{ fontSize:14, fontWeight:"bold", margin:"0 0 18px" }}>Доходи та витрати по місяцях (останні 6)</div>
          {Object.keys(incomeByMonth).length === 0 && Object.keys(expenseByMonth).length === 0
            ? <div style={{ color:C.muted, fontSize:13, fontStyle:"italic" }}>Немає даних за обраний період</div>
            : <MonthlyChart incomeByMonth={incomeByMonth} expenseByMonth={expenseByMonth} profileCurrency={profileCurrency} rates={rates} />
          }
        </div>

        {/* ── Bar by category ── */}
        <div style={{ ...card, marginBottom:24 }}>
          <div style={cardBar(C.expense)} />
          <div style={{ fontSize:14, fontWeight:"bold", margin:"0 0 18px" }}>Витрати по категоріях</div>
          {barExpData.length === 0
            ? <div style={{ color:C.muted, fontSize:13, fontStyle:"italic" }}>Немає витрат за обраний період</div>
            : <BarChart data={barExpData} profileCurrency={profileCurrency} rates={rates} />
          }
        </div>

        {/* ── Forecast ── */}
        <div style={{ marginBottom:24 }}>
          <div style={{ background:C.forecastLight, border:"1px solid #90caf9", borderRadius:12, padding:"22px 26px" }}>
            <div style={{ fontSize:13, fontWeight:"bold", color:C.forecast, marginBottom:14 }}>🔮 Прогнозування витрат</div>
            {!forecastReady ? (
              <div style={{ textAlign:"center", padding:"16px 0", color:C.forecast, fontSize:14, fontStyle:"italic" }}>
                {expenses.length === 0
                  ? "Додайте першу витрату, щоб увімкнути прогнозування."
                  : `Прогноз буде доступний через ${Math.ceil(7-daysSince)} д. — потрібно накопичити дані за тиждень.`}
              </div>
            ) : (
              <>
                {[
                  { label:"Прогноз на 7 днів",  val:fmtInCur(avgDaily*7,  profileCurrency, rates) },
                  { label:"Прогноз на 30 днів", val:fmtInCur(avgDaily*30, profileCurrency, rates) },
                ].map(r => (
                  <div key={r.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #bbdefb" }}>
                    <span style={{ fontSize:13, color:C.text }}>{r.label}</span>
                    <span style={{ fontSize:14, fontWeight:"bold", color:C.forecast }}>{r.val}</span>
                  </div>
                ))}
                <p style={{ fontSize:12, color:"#5c8fd6", margin:"12px 0 0", fontStyle:"italic" }}>
                  * Прогноз базується на середньоденних витратах за обраний період.
                </p>
              </>
            )}
          </div>
        </div>

        {/* ── Budget (subcomponent) ── */}
        <div style={{ marginBottom:24 }}>
          <AnalyticsBudget
            expenses={transactions.filter(t => t.type === "expense")}
            profileCurrency={profileCurrency}
            rates={rates}
          />
        </div>

        {/* ── AI Advisor (subcomponent) ── */}
        <div style={{ marginBottom:0 }}>
          <AnalyticsAI
            expenses={transactions.filter(t => t.type === "expense")}
            incomes={transactions.filter(t  => t.type === "income")}
          />
        </div>

      </div>
    </div>
  );
}
