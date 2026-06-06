// AnalyticsAI.jsx — порадник(OpenAI через Supabase Edge Function)
import { useState } from "react";
import { supabase } from "./supabaseClient";

const C = {
  surface:"#ffffff", border:"#e8e6de", borderLight:"#f0ede6",
  text:"#1a1a1a", muted:"#6b7280",
  income:"#2e7d32", expense:"#c62828",
  ai:"#6d28d9", aiLight:"#f5f3ff", aiMid:"#ede9fe",
};
const FONT = "'Georgia', 'Times New Roman', serif";

const CAT = {
  salary:"Зарплата", freelance:"Фріланс", food:"Їжа", transport:"Транспорт",
  housing:"Житло", health:"Здоров'я", entertainment:"Розваги",
  utilities:"Комунальні", investment:"Інвестиції", other:"Інше",
};
const catLabel = (c) => CAT[c] || (c ? c[0].toUpperCase() + c.slice(1) : "—");
const fmt = (n) => new Intl.NumberFormat("uk-UA", { maximumFractionDigits:0 }).format(n);

// ── Будуємо текстовий звіт для AI ──────────────────────────
function buildPrompt(expenses, incomes) {
  const totalExp = expenses.reduce((s, t) => s + Number(t.amount_base ?? t.amount), 0);
  const totalInc = incomes.reduce((s, t)  => s + Number(t.amount_base ?? t.amount), 0);
  const balance  = totalInc - totalExp;

  const byCat = {};
  expenses.forEach(t => {
    const k = catLabel(t.category || "other");
    byCat[k] = (byCat[k] || 0) + Number(t.amount_base ?? t.amount);
  });
  const catLines = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `• ${k}: ${fmt(v)} грн (${totalExp > 0 ? Math.round(v/totalExp*100) : 0}%)`)
    .join("\n");

  const byInc = {};
  incomes.forEach(t => {
    const k = catLabel(t.category || "other");
    byInc[k] = (byInc[k] || 0) + Number(t.amount_base ?? t.amount);
  });
  const incLines = Object.entries(byInc)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `• ${k}: ${fmt(v)} грн`)
    .join("\n");

  return `Ти — персональний фінансовий радник. Проаналізуй і дай рівно 4 практичні поради українською.

Доходи: ${fmt(totalInc)} грн | Витрати: ${fmt(totalExp)} грн | Баланс: ${fmt(balance)} грн ${balance < 0 ? "(ДЕФІЦИТ!)" : ""}

Витрати по категоріях:
${catLines || "немає даних"}

Доходи по категоріях:
${incLines || "немає даних"}

Вимоги:
- Рівно 4 поради, кожна з нового рядка
- Починай кожну пораду з емодзі
- Конкретні числа з даних
- Якщо баланс від'ємний — перша порада про це
- Без нумерації та зайвих слів`;
}

// ── Rule-based fallback (якщо AI недоступний) ──────────────
function fallbackTips(expenses, incomes) {
  const totalExp = expenses.reduce((s, t) => s + Number(t.amount_base ?? t.amount), 0);
  const totalInc = incomes.reduce((s, t)  => s + Number(t.amount_base ?? t.amount), 0);
  const balance  = totalInc - totalExp;
  const tips = [];

  const byCat = {};
  expenses.forEach(t => {
    const k = catLabel(t.category || "other").toLowerCase();
    byCat[k] = (byCat[k] || 0) + Number(t.amount_base ?? t.amount);
  });

  if (balance < 0)
    tips.push(`🚨 Баланс від'ємний: дефіцит ${fmt(Math.abs(balance))} грн. Необхідно скоротити витрати або збільшити доходи.`);
  if (byCat["їжа"] > totalExp * 0.4)
    tips.push(`🍕 На їжу йде ${Math.round(byCat["їжа"]/totalExp*100)}% витрат. Домашня готовка може заощадити 20-30%.`);
  if (byCat["розваги"] > totalExp * 0.15)
    tips.push(`🎮 Розваги: ${fmt(byCat["розваги"])} грн. Перегляньте підписки — можливо є невикористані.`);
  if (byCat["транспорт"] > totalExp * 0.2)
    tips.push(`🚗 Транспорт займає ${Math.round(byCat["транспорт"]/totalExp*100)}% витрат. Розгляньте альтернативи.`);
  if (byCat["комунальні"] > totalExp * 0.25)
    tips.push(`💡 Комунальні — ${fmt(byCat["комунальні"])} грн. Перевірте споживання електроенергії.`);
  if (tips.length < 2)
    tips.push(`☕ Щоденні дрібні витрати за місяць можуть скласти значну суму — спробуйте відстежити їх.`);
  if (tips.length < 3)
    tips.push(`💰 Правило 50/30/20: 50% — необхідне, 30% — бажане, 20% — заощадження.`);
  if (tips.length < 4)
    tips.push(`📅 Щотижневий огляд витрат допомагає швидше помітити де «витікають» гроші.`);

  return tips.slice(0, 4);
}

// ── Картка поради ───────────────────────────────────────────
function TipCard({ tip, index }) {
  const emojiRe = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|[\u{1F300}-\u{1FAFF}])\s*/u;
  const match   = typeof tip === "string" ? tip.match(emojiRe) : null;
  const icon    = match ? match[0].trim() : ["💡","📊","🎯","💸"][index % 4];
  const text    = typeof tip === "string"
    ? tip.replace(emojiRe, "").replace(/^\d+[.)]\s*/, "").trim()
    : tip;

  return (
    <div style={{
      display:"flex", gap:12, padding:"14px 16px",
      background:C.aiLight, borderRadius:10, border:`1px solid ${C.aiMid}`,
      animation:`tipIn 0.35s ease ${index * 0.08}s both`,
    }}>
      <div style={{
        fontSize:18, lineHeight:1, flexShrink:0,
        width:36, height:36, display:"flex", alignItems:"center",
        justifyContent:"center", background:C.aiMid, borderRadius:8,
      }}>{icon}</div>
      <div style={{ fontSize:14, color:"#4c1d95", lineHeight:1.6, paddingTop:1 }}>
        {text}
      </div>
    </div>
  );
}

// ── Головний компонент ──────────────────────────────────────
export default function AnalyticsAI({ expenses = [], incomes = [] }) {
  const [tips,    setTips]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAI,    setIsAI]    = useState(false);
  const [btnHov,  setBtnHov]  = useState(false);
  const hasData = expenses.length + incomes.length > 0;

  const ask = async () => {
    if (!hasData) return;
    setLoading(true);
    setTips([]);
    setIsAI(false);

    const prompt = buildPrompt(expenses, incomes);

    // ── Спроба 1: OpenAI через Supabase Edge Function ────────
    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-advisor", {
        body: { prompt },
      });

      if (fnError) throw new Error(fnError.message);

      const text = data?.text ?? "";
      if (!text) throw new Error("Порожня відповідь");

      const parsed = text
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 10 && !/^#+/.test(l));

      if (parsed.length === 0) throw new Error("Не вдалося розібрати відповідь");

      setTips(parsed.slice(0, 4));
      setIsAI(true);
      setLoading(false);
      return;

    } catch (e) {
      console.warn("AI недоступний:", e.message);
    }

    // ── Спроба 2: Rule-based fallback ────────────────────────
    setTips(fallbackTips(expenses, incomes));
    setIsAI(false);
    setLoading(false);
  };

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
      <style>{`
        @keyframes tipIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes spin  { to { transform:rotate(360deg); } }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        padding:"18px 24px",
        background:"linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
        borderBottom:`1px solid ${C.aiMid}`,
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
      }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
            <span style={{ fontSize:20 }}>🤖</span>
            <span style={{ fontSize:15, fontWeight:700, color:"#4c1d95" }}>Порадник</span>
            {isAI && (
              <span style={{ fontSize:10, padding:"2px 7px", borderRadius:20, background:C.ai, color:"#fff", fontWeight:600, letterSpacing:"0.05em" }}>
                AI
              </span>
            )}
          </div>
          <div style={{ fontSize:12, color:"#7c3aed" }}>
            Персональний аналіз на основі твоїх транзакцій
          </div>
        </div>

        <button
          onClick={ask}
          disabled={loading || !hasData}
          onMouseEnter={() => setBtnHov(true)}
          onMouseLeave={() => setBtnHov(false)}
          style={{
            padding:"9px 20px", fontSize:13, fontFamily:FONT, fontWeight:600,
            cursor: (!hasData || loading) ? "not-allowed" : "pointer",
            background: !hasData ? "#e5e7eb" : btnHov ? "#5b21b6" : C.ai,
            color: !hasData ? C.muted : "#fff",
            border:"none", borderRadius:9,
            transition:"background 0.15s",
            opacity: loading ? 0.75 : 1,
            flexShrink:0,
          }}>
          {loading ? "Аналізую…" : tips.length > 0 ? "🔄 Оновити" : "✨ Аналізувати"}
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ padding:"18px 24px" }}>

        {/* Loading */}
        {loading && (
          <div style={{ display:"flex", alignItems:"center", gap:14, padding:"20px 0" }}>
            <div style={{ width:22, height:22, border:`3px solid ${C.aiMid}`, borderTopColor:C.ai, borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 }} />
            <span style={{ fontSize:14, color:"#7c3aed", fontStyle:"italic" }}>Аналізую фінанси…</span>
          </div>
        )}

        {/* Tips */}
        {!loading && tips.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {isAI && (
              <div style={{ fontSize:11, color:C.ai, fontStyle:"italic", marginBottom:2 }}>
                ✦ Згенеровано AI · {expenses.length + incomes.length} транзакцій проаналізовано
              </div>
            )}
            {tips.map((tip, i) => <TipCard key={i} tip={tip} index={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && tips.length === 0 && (
          <div style={{ textAlign:"center", padding:"32px 0", color:C.muted }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🧠</div>
            <div style={{ fontSize:14, marginBottom:4 }}>
              {!hasData ? "Додай транзакції для аналізу" : "Натисни «Аналізувати» для отримання порад"}
            </div>
            {hasData && (
              <div style={{ fontSize:12, color:"#9ca3af" }}>
                {expenses.length} витрат · {incomes.length} доходів
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
