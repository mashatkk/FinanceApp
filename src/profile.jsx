import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient"; // ← скоригуй шлях
import useCurrencyRates from "./hooks/useCurrencyRates";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:          "#f7f6f2",
  surface:     "#ffffff",
  border:      "#e8e6de",
  borderLight: "#f0ede6",
  borderFocus: "#1a1a1a",
  text:        "#1a1a1a",
  muted:       "#888",
  accent:      "#c9783a",
  income:      "#2e7d32",
  incomeLight: "#e8f5e9",
  expense:     "#c62828",
  expenseLight:"#ffebee",
};
const FONT = "'Georgia', 'Times New Roman', serif";

// ─── Валюти ───────────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: "UAH", symbol: "грн", label: "Гривня"          },
  { code: "USD", symbol: "$",   label: "Долар США"        },
  { code: "EUR", symbol: "€",   label: "Євро"             },
  { code: "GBP", symbol: "£",   label: "Фунт стерлінгів" },
  { code: "PLN", symbol: "zł",  label: "Злотий"           },
];
const CUR_COLOR = { UAH:"#888", USD:"#1565c0", EUR:"#2e7d32", GBP:"#6a1b9a", PLN:"#c9783a" };

// ─── Стилі ────────────────────────────────────────────────────────────────────
const S = {
  root: {
    minHeight:"100vh", width:"100vw", overflowX:"hidden",
    boxSizing:"border-box", background:C.bg,
    fontFamily:FONT, color:C.text, paddingBottom:80,
  },
  topbar: {
    position:"sticky", top:0, zIndex:100, height:60, width:"100%",
    boxSizing:"border-box", display:"flex", alignItems:"center",
    justifyContent:"space-between", padding:"0 40px",
    background:C.surface, borderBottom:`1px solid ${C.border}`,
  },
  logo: { fontSize:18, fontWeight:"bold", letterSpacing:"-0.5px", userSelect:"none" },
  logoAccent: { color:C.accent },
  backBtn: (h) => ({
    padding:"7px 18px", background:h?C.text:"transparent",
    color:h?"#fff":C.text, border:`1.5px solid ${C.text}`,
    borderRadius:6, fontSize:13, fontFamily:FONT, cursor:"pointer",
    letterSpacing:"0.04em", transition:"background 0.15s, color 0.15s",
  }),
  content: { maxWidth:680, margin:"0 auto", padding:"44px 32px 0" },
  sectionLabel: {
    fontSize:11, letterSpacing:"0.15em", textTransform:"uppercase",
    color:C.muted, margin:"0 0 6px",
  },
  pageTitle: { fontSize:28, fontWeight:"normal", margin:"0 0 32px", lineHeight:1.15 },
  pageTitleAccent: { fontStyle:"italic", color:C.accent },

  // Card
  card: {
    background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:16, padding:"36px 40px 40px",
    boxShadow:"0 2px 16px rgba(0,0,0,0.06)", marginBottom:20,
    position:"relative", overflow:"hidden",
  },
  cardBar: (color) => ({
    position:"absolute", top:0, left:0, right:0,
    height:3, background:color, borderRadius:"16px 16px 0 0",
  }),
  cardTitle: {
    fontSize:13, fontWeight:"bold", letterSpacing:"0.05em",
    textTransform:"uppercase", color:C.muted, margin:"0 0 24px",
  },
  divider: { height:1, background:C.borderLight, margin:"28px 0" },

  // Avatar
  avatarWrap: {
    display:"flex", alignItems:"flex-end", gap:20, marginBottom:28,
  },
  avatarCircle: (hasImg) => ({
    width:88, height:88, borderRadius:"50%", flexShrink:0,
    background:hasImg?"transparent":C.bg,
    border:`2px solid ${C.border}`,
    display:"flex", alignItems:"center", justifyContent:"center",
    overflow:"hidden", position:"relative",
    boxShadow:"0 2px 8px rgba(0,0,0,0.09)",
  }),
  avatarImg: { width:"100%", height:"100%", objectFit:"cover" },
  avatarPlaceholder: { fontSize:36, userSelect:"none" },
  avatarActions: { display:"flex", flexDirection:"column", gap:8 },
  uploadBtn: (h) => ({
    padding:"8px 18px", background:h?"#333":C.text, color:"#fff",
    border:"none", borderRadius:7, fontSize:13, fontFamily:FONT,
    cursor:"pointer", letterSpacing:"0.04em", transition:"background 0.15s",
  }),
  removeBtn: (h) => ({
    padding:"6px 14px", background:h?C.expenseLight:"transparent",
    color:C.expense, border:`1px solid ${C.expense}`,
    borderRadius:7, fontSize:12, fontFamily:FONT, cursor:"pointer",
    transition:"background 0.15s",
  }),
  avatarHint: { fontSize:11, color:C.muted, fontStyle:"italic", marginTop:4 },

  // Form fields
  field: { display:"flex", flexDirection:"column", gap:7, marginBottom:18 },
  label: {
    fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase",
    color:C.muted, fontFamily:FONT,
  },
  input: (foc) => ({
    width:"100%", boxSizing:"border-box", padding:"11px 14px",
    fontSize:15, fontFamily:FONT, color:C.text, background:C.surface,
    border:`1.5px solid ${foc?C.borderFocus:C.border}`,
    borderRadius:8, outline:"none", transition:"border-color 0.15s",
  }),
  readonlyInput: {
    width:"100%", boxSizing:"border-box", padding:"11px 14px",
    fontSize:15, fontFamily:FONT, color:C.muted, background:C.bg,
    border:`1.5px solid ${C.border}`, borderRadius:8, outline:"none",
  },

  // Currency grid
  currencyGrid: {
    display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginTop:8,
  },
  curBtn: (active, code) => ({
    display:"flex", flexDirection:"column", alignItems:"center",
    gap:4, padding:"14px 8px",
    background:active?"#f0ede6":C.surface,
    border:`2px solid ${active?CUR_COLOR[code]:C.border}`,
    borderRadius:10, cursor:"pointer",
    transition:"all 0.15s", outline:"none", fontFamily:FONT,
  }),
  curSymbol: { fontSize:20, lineHeight:1 },
  curCode:   (active,code) => ({ fontSize:12, fontWeight:700, color:active?CUR_COLOR[code]:C.text }),
  curLabel:  { fontSize:10, color:C.muted, textAlign:"center", lineHeight:1.3 },

  // Status row
  statusRow: {
    background:"#faf9f5", border:`1px solid ${C.borderLight}`,
    borderRadius:8, padding:"10px 16px", fontSize:13, color:C.muted,
    display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20,
  },

  // Save button
  saveBtn: (h, dis) => ({
    width:"100%", padding:"13px 0",
    background:dis?"#ccc":h?"#333":C.text, color:"#fff",
    border:"none", borderRadius:8, fontSize:15, fontFamily:FONT,
    fontWeight:600, cursor:dis?"not-allowed":"pointer",
    letterSpacing:"0.05em", transition:"background 0.15s",
  }),

  // Banners
  successBanner: {
    background:C.incomeLight, border:"1px solid #a5d6a7",
    borderRadius:10, padding:"12px 18px", color:C.income,
    fontSize:14, marginBottom:20,
  },
  errorBanner: {
    background:"#fff5f5", border:"1px solid #f5c6c6",
    borderRadius:10, padding:"12px 18px", color:C.expense,
    fontSize:14, marginBottom:20,
  },
  warnBanner: {
    background:"#fff3e0", border:"1px solid #ffcc80",
    borderRadius:8, padding:"8px 14px", fontSize:12,
    color:"#e65100", marginBottom:16,
  },
  center: {
    display:"flex", alignItems:"center", justifyContent:"center",
    minHeight:"100vh", fontSize:16, color:C.muted, fontFamily:FONT,
  },
};

// ─── Profile Page ─────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate    = useNavigate();
  const fileInputRef = useRef(null);
  const { rates, loading: ratesLoading, error: ratesError } = useCurrencyRates();

  // ── State ──
  const [authUser,   setAuthUser]   = useState(null);
  const [fullName,   setFullName]   = useState("");
  const [currency,   setCurrency]   = useState("UAH");
  const [avatarUrl,  setAvatarUrl]  = useState("");
  const [avatarFile, setAvatarFile] = useState(null);   // File object
  const [avatarPreview, setAvatarPreview] = useState(""); // blob URL

  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState(null);

  const [backHov,    setBackHov]    = useState(false);
  const [saveHov,    setSaveHov]    = useState(false);
  const [uploadHov,  setUploadHov]  = useState(false);
  const [removeHov,  setRemoveHov]  = useState(false);
  const [nameFoc,    setNameFoc]    = useState(false);

  // ── Load profile ──
  useEffect(() => {
    let cancelled = false;
    async function load() {
      // 1. Auth user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login", { replace: true }); return; }
      const user = session.user;
      if (!cancelled) setAuthUser(user);

      // 2. Load profile row
      const { data: existing, error: fetchErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (fetchErr) { if (!cancelled) { setError(fetchErr.message); setLoading(false); } return; }

      if (existing) {
        // Profile found
        if (!cancelled) {
          setFullName(existing.full_name ?? "");
          setCurrency(existing.currency ?? "UAH");
          setAvatarUrl(existing.avatar_url ?? "");
          setLoading(false);
        }
      } else {
        // Auto-create profile
        const { error: insertErr } = await supabase.from("profiles").insert([{
          id:       user.id,
          email:    user.email,
          currency: "UAH",
        }]);
        if (!cancelled) {
          if (insertErr) setError(insertErr.message);
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [navigate]);

  // ── Handle file selection ──
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Файл занадто великий. Максимум 2 МБ."); return; }
    if (!file.type.startsWith("image/")) { setError("Виберіть зображення (JPG, PNG, WebP)."); return; }
    setError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // ── Remove avatar ──
  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview("");
    setAvatarUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Save profile ──
  const handleSave = async () => {
    if (!authUser) return;
    setSaving(true); setError(null); setSuccess(false);

    let finalAvatarUrl = avatarUrl;

    // 1. Upload new avatar if selected
    if (avatarFile) {
      setUploading(true);
      const ext  = avatarFile.name.split(".").pop().toLowerCase();
      // Path must start with the user's uid to satisfy RLS policy:
      // (storage.foldername(name))[1] = auth.uid()::text
      const path = `${authUser.id}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true, cacheControl: "3600" });

      setUploading(false);

      if (upErr) {
        setError("Помилка завантаження фото: " + upErr.message);
        setSaving(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      finalAvatarUrl = urlData?.publicUrl ?? "";
      setAvatarUrl(finalAvatarUrl);
      setAvatarFile(null);
    }

    // 2. Upsert profile row
    const { error: updateErr } = await supabase.from("profiles").upsert({
      id:         authUser.id,
      email:      authUser.email,
      full_name:  fullName.trim(),
      currency,
      avatar_url: finalAvatarUrl,
    });

    setSaving(false);

    if (updateErr) {
      setError("Помилка збереження: " + updateErr.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    }
  };

  // ── Render helpers ──
  const displayAvatar = avatarPreview || avatarUrl;
  const isBusy        = saving || uploading;

  if (loading) return <div style={S.center}>Завантаження…</div>;

  return (
    <div style={S.root}>

      {/* ── Top bar ── */}
      <header style={S.topbar}>
        <span style={S.logo}>фін<span style={S.logoAccent}>·</span>відстеження</span>
        <button
          style={S.backBtn(backHov)}
          onMouseEnter={() => setBackHov(true)} onMouseLeave={() => setBackHov(false)}
          onClick={() => navigate("/Dashboard")}
        >← Головна панель</button>
      </header>

      <div style={S.content}>
        <p style={S.sectionLabel}>Акаунт</p>
        <h1 style={S.pageTitle}>
          👤 Мій <span style={S.pageTitleAccent}>профіль</span>
        </h1>

        {/* ════ Main card ════ */}
        <div style={S.card}>
          <div style={S.cardBar(C.accent)} />

          {/* ── Avatar section ── */}
          <div style={S.cardTitle}>Фото профілю</div>
          <div style={S.avatarWrap}>
            {/* Avatar preview */}
            <div style={S.avatarCircle(!!displayAvatar)}>
              {displayAvatar
                ? <img src={displayAvatar} alt="avatar" style={S.avatarImg} />
                : <span style={S.avatarPlaceholder}>👤</span>
              }
            </div>

            {/* Upload controls */}
            <div style={S.avatarActions}>
              <button
                style={S.uploadBtn(uploadHov)}
                onMouseEnter={() => setUploadHov(true)}
                onMouseLeave={() => setUploadHov(false)}
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
              >
                {uploading ? "Завантаження…" : "📷 Обрати фото"}
              </button>
              {displayAvatar && (
                <button
                  style={S.removeBtn(removeHov)}
                  onMouseEnter={() => setRemoveHov(true)}
                  onMouseLeave={() => setRemoveHov(false)}
                  onClick={handleRemoveAvatar}
                  disabled={isBusy}
                >✕ Видалити</button>
              )}
              <span style={S.avatarHint}>JPG, PNG, WebP — до 2 МБ</span>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display:"none" }}
              onChange={handleFileSelect}
            />
          </div>

          <div style={S.divider} />

          {/* ── Personal info ── */}
          <div style={S.cardTitle}>Особисті дані</div>

          {/* Email (readonly) */}
          <div style={S.field}>
            <label style={S.label}>Email</label>
            <input
              type="text"
              value={authUser?.email ?? ""}
              readOnly
              style={S.readonlyInput}
            />
          </div>

          {/* Full name */}
          <div style={S.field}>
            <label style={S.label}>Ім'я</label>
            <input
              type="text"
              placeholder="Як до вас звертатися?"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              onFocus={() => setNameFoc(true)}
              onBlur={() => setNameFoc(false)}
              style={S.input(nameFoc)}
            />
          </div>

          <div style={S.divider} />

          {/* ── Currency section ── */}
          <div style={S.cardTitle}>Валюта відображення</div>
          <p style={{ fontSize:13, color:C.muted, fontStyle:"italic", margin:"0 0 16px", lineHeight:1.5 }}>
            Усі суми в застосунку будуть показані у вибраній валюті.<br/>
            Транзакції зберігаються в гривнях і конвертуються автоматично.
          </p>

          {/* Currency grid */}
          {ratesError && (
            <div style={{ background:"#fff3e0", border:"1px solid #ffcc80", borderRadius:8, padding:"8px 14px", fontSize:12, color:"#e65100", marginBottom:12 }}>
              ⚠ {ratesError}
            </div>
          )}
          <div style={S.currencyGrid}>
            {CURRENCIES.map(cur => {
              const active = currency === cur.code;
              // Rate label: UAH = base, others = X грн per 1 unit
              const rateLabel = cur.code === "UAH"
                ? "базова"
                : rates
                  ? `1 ${cur.code} = ${(rates[cur.code] ?? 0).toFixed(2)} грн`
                  : ratesLoading ? "…" : "—";
              return (
                <button
                  key={cur.code}
                  onClick={() => setCurrency(cur.code)}
                  style={S.curBtn(active, cur.code)}
                >
                  <span style={S.curSymbol}>{cur.symbol}</span>
                  <span style={S.curCode(active, cur.code)}>{cur.code}</span>
                  <span style={S.curLabel}>{cur.label}</span>
                  <span style={{
                    fontSize:9, marginTop:2, fontStyle:"italic",
                    color: active ? CUR_COLOR[cur.code] : C.muted,
                    lineHeight:1.3, textAlign:"center",
                  }}>{rateLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Selected currency status */}
          <div style={{ ...S.statusRow, marginTop:16 }}>
            <span>Обрана валюта:</span>
            <span style={{ fontWeight:700, color:CUR_COLOR[currency]||C.text, fontSize:15 }}>
              {CURRENCIES.find(c => c.code === currency)?.label} ({currency})
            </span>
          </div>

          {/* ── Banners ── */}
          {success && (
            <div style={S.successBanner}>✓ Профіль успішно збережено!</div>
          )}
          {error && (
            <div style={S.errorBanner}>⚠ {error}</div>
          )}

          {/* ── Save button ── */}
          <button
            onClick={handleSave}
            disabled={isBusy}
            style={S.saveBtn(saveHov, isBusy)}
            onMouseEnter={() => setSaveHov(true)}
            onMouseLeave={() => setSaveHov(false)}
          >
            {isBusy ? "Збереження…" : "💾 Зберегти профіль"}
          </button>
        </div>

        {/* ════ Account info card ════ */}
        <div style={{ ...S.card, padding:"24px 36px" }}>
          <div style={S.cardBar("#e8e6de")} />
          <div style={S.cardTitle}>Інформація про акаунт</div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {[
              { label:"ID користувача", value:authUser?.id?.slice(0,8) + "…" },
              { label:"Метод входу",    value:"Email / Password" },
              { label:"Дата реєстрації",value: authUser?.created_at
                  ? new Date(authUser.created_at).toLocaleDateString("uk-UA",{day:"2-digit",month:"long",year:"numeric"})
                  : "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.borderLight}` }}>
                <span style={{ fontSize:13, color:C.muted }}>{label}</span>
                <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
