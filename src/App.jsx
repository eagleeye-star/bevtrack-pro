import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// BEVTRACK PRO — LICENCE SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
// Each copy of this app is bound to one business by a unique licence key.
// Licence data is stored in localStorage under APP_LICENCE_KEY.
// Admin credentials are required to issue or renew a licence.
// Without a valid licence, the app is fully locked. On expiry it goes read-only.
// ═══════════════════════════════════════════════════════════════════════════════

const APP_LICENCE_KEY = "LICENCE_BevTrackPro_v1";
const APP_NAME        = "BevTrack Pro";
const APP_ICON        = "🥤";
const ADMIN_USER      = "gilbert_admin";
const ADMIN_PASS      = "AIFarms@2026!";
const CONTACT_PHONE   = "0597147460";
const CONTACT_EMAIL   = "aifarms101@gmail.com";

const PLANS = [
  { id: "starter",    label: "Starter",    price: 149, days: 30,  desc: "1 outlet, 2 users" },
  { id: "business",   label: "Business",   price: 299, days: 30,  desc: "1 outlet, 5 users, full features" },
  { id: "quarterly",  label: "Business Quarterly", price: 807, days: 90, desc: "Business plan × 3 months (10% off)" },
  { id: "enterprise", label: "Enterprise", price: 599, days: 30,  desc: "Up to 5 outlets, unlimited users" },
  { id: "ent_annual", label: "Enterprise Annual", price: 6469, days: 365, desc: "Enterprise × 12 months (10% off)" },
];

const LC = {
  navy: "#0A1628", gold: "#D4A017", goldLight: "#F4C842",
  accent: "#2E86AB", green: "#27AE60", red: "#C0392B",
  bg: "#F0F4F8", card: "#FFFFFF", border: "#CBD5E1",
  text: "#1E293B", textSub: "#64748B", textLight: "#94A3B8",
  navyLight: "#1E3A5F",
};

function loadLicence() {
  try { return JSON.parse(localStorage.getItem(APP_LICENCE_KEY)) || null; }
  catch { return null; }
}
function saveLicence(data) {
  localStorage.setItem(APP_LICENCE_KEY, JSON.stringify(data));
}
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(APP_LICENCE_KEY + "_history")) || []; }
  catch { return []; }
}
function saveHistory(h) {
  localStorage.setItem(APP_LICENCE_KEY + "_history", JSON.stringify(h));
}

function licenceStatus(lic) {
  if (!lic) return "none";
  const now = new Date();
  const exp = new Date(lic.expiryDate);
  const daysLeft = Math.ceil((exp - now) / 86400000);
  if (daysLeft <= 0)  return "expired";
  if (daysLeft <= 7)  return "critical";
  if (daysLeft <= 30) return "warning";
  return "active";
}
function daysLeft(lic) {
  if (!lic) return 0;
  return Math.max(0, Math.ceil((new Date(lic.expiryDate) - new Date()) / 86400000));
}

// ── Licence Gate ──────────────────────────────────────────────────────────────
export function LicenceGate({ children }) {
  const [lic, setLic]           = useState(loadLicence);
  // ── Auto-activate from portal launch URL ──────────────────────────────
  useEffect(() => {
    const urlKey = new URLSearchParams(window.location.search).get('key');
    if (urlKey && !loadLicence()) {
      const k = urlKey.toUpperCase().trim();
      if (/^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(k)) {
        const plan = k.split("-")[1]||"";
        const days = plan==="TRIAL"?14:plan==="1M"?30:plan==="6M"?182:plan==="12M"?365:/^\d+Y$/.test(plan)?Math.round(parseInt(plan)*365):365;
        const expiry = new Date(); expiry.setDate(expiry.getDate()+days);
        const newLic = { key:k, activatedAt:new Date().toISOString(), expiresAt:expiry.toISOString(), plan:k.split("-")[0]+"-"+plan, status:"active" };
        saveLicence(newLic); setLic(newLic);
        window.history.replaceState({},document.title,window.location.pathname);
      }
    }
  }, []);
  const [history, setHistory]   = useState(loadHistory);
  const [showAdmin, setShowAdmin] = useState(false);
  const [authed, setAuthed]     = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [authErr, setAuthErr]   = useState("");
  const [tab, setTab]           = useState("issue");

  // Issue / Renew form
  const [form, setForm] = useState({
    holderName: "", businessName: "", businessType: "Bar / Drinks Shop",
    plan: "business", startDate: new Date().toISOString().split("T")[0],
    payMethod: "MoMo", payRef: "", notes: "",
  });

  const status = licenceStatus(lic);
  const dl     = daysLeft(lic);

  const handleAuth = () => {
    if (adminUser === ADMIN_USER && adminPass === ADMIN_PASS) {
      setAuthed(true); setAuthErr("");
    } else {
      setAuthErr("Invalid credentials.");
    }
  };

  const issueLicence = () => {
    if (!form.holderName || !form.businessName || !form.payRef) {
      alert("Fill in holder name, business name, and payment reference."); return;
    }
    const plan = PLANS.find(p => p.id === form.plan);
    const start = new Date(form.startDate);
    const expiry = new Date(start);
    expiry.setDate(expiry.getDate() + plan.days);
    const newLic = {
      holderName:   form.holderName,
      businessName: form.businessName,
      businessType: form.businessType,
      plan:         plan.label,
      planId:       plan.id,
      price:        plan.price,
      startDate:    start.toISOString().split("T")[0],
      expiryDate:   expiry.toISOString().split("T")[0],
      payMethod:    form.payMethod,
      payRef:       form.payRef,
      notes:        form.notes,
      issuedAt:     new Date().toISOString(),
      licenceId:    "BVT-GH-" + Math.random().toString(36).substring(2,8).toUpperCase(),
    };
    saveLicence(newLic);
    const newHistory = [{ ...newLic, action: lic ? "Renewal" : "New Licence" }, ...history];
    saveHistory(newHistory);
    setLic(newLic);
    setHistory(newHistory);
    setShowAdmin(false);
    setAuthed(false);
    setAdminUser(""); setAdminPass("");
    setTimeout(() => printCertificate(newLic), 300);
  };

  const printCertificate = (l) => {
    const win = window.open("", "_blank", "width=700,height=600");
    win.document.write(`
      <html><head><title>BevTrack Pro Licence Certificate</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #0A1628; }
        .header { background: #0A1628; color: #D4A017; padding: 24px 32px; border-radius: 8px; text-align: center; margin-bottom: 24px; }
        .header h1 { margin: 0; font-size: 28px; } .header p { margin: 4px 0; color: #94A3B8; font-size: 13px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .field { background: #F5F7FA; border-radius: 6px; padding: 12px 16px; }
        .field label { font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px; }
        .field span { font-size: 14px; font-weight: 600; color: #0A1628; }
        .id { background: #0A1628; color: #D4A017; padding: 14px; border-radius: 8px; text-align: center; font-size: 20px; font-weight: 900; letter-spacing: 4px; margin-bottom: 20px; }
        .footer { font-size: 10px; color: #94A3B8; text-align: center; border-top: 1px solid #CBD5E1; padding-top: 14px; }
        .warn { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 10px 16px; font-size: 11px; color: #C0392B; margin-bottom: 16px; text-align: center; }
      </style></head><body>
      <div class="header">
        <h1>🥤 BevTrack Pro</h1>
        <p>Official Licence Certificate</p>
      </div>
      <div class="id">${l.licenceId}</div>
      <div class="grid">
        <div class="field"><label>Licence Holder</label><span>${l.holderName}</span></div>
        <div class="field"><label>Business Name</label><span>${l.businessName}</span></div>
        <div class="field"><label>Business Type</label><span>${l.businessType}</span></div>
        <div class="field"><label>Plan</label><span>${l.plan}</span></div>
        <div class="field"><label>Start Date</label><span>${l.startDate}</span></div>
        <div class="field"><label>Expiry Date</label><span>${l.expiryDate}</span></div>
        <div class="field"><label>Payment Method</label><span>${l.payMethod}</span></div>
        <div class="field"><label>Payment Reference</label><span>${l.payRef}</span></div>
        <div class="field"><label>Amount Paid</label><span>GH₵ ${l.price.toLocaleString()}</span></div>
        <div class="field"><label>Issued On</label><span>${new Date(l.issuedAt).toLocaleString()}</span></div>
      </div>
      <div class="warn">⚠ This licence is valid for ONE business only. Sharing, reselling, or transferring is a breach of the software licence agreement and may result in legal action.</div>
      <div class="footer">BevTrack Pro · Contact: ${CONTACT_PHONE} · ${CONTACT_EMAIL}<br>© 2026 BevTrack Pro. All rights reserved. Licence ID: ${l.licenceId}</div>
      <script>window.onload = () => { window.print(); }<\/script>
      </body></html>
    `);
    win.document.close();
  };

  const LBtn = ({ onClick, children, color = LC.navy, bg = LC.gold, small = false }) => (
    <button onClick={onClick} style={{
      background: bg, color, border: "none", borderRadius: 8, padding: small ? "6px 14px" : "10px 22px",
      fontWeight: 700, fontSize: small ? 12 : 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
    }}>{children}</button>
  );

  // ── LOCKED SCREEN (no licence) ─────────────────────────────
  if (status === "none") {
    return (
      <div style={{ minHeight: "100vh", background: LC.navy, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ width: 480, background: LC.card, borderRadius: 20, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
          {/* Header */}
          <div style={{ background: LC.navy, padding: "32px 36px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🥤</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: LC.gold }}>BevTrack Pro</div>
            <div style={{ fontSize: 13, color: LC.textLight, marginTop: 4 }}>Beverage Distribution Management System</div>
          </div>

          <div style={{ padding: "28px 36px" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: LC.text, marginBottom: 6 }}>🔒 Licence Required</div>
              <div style={{ fontSize: 13, color: LC.textSub, lineHeight: 1.6 }}>
                This software requires a valid licence to operate. Contact the software provider to purchase a licence and activate your copy.
              </div>
            </div>

            {/* Plans */}
            <div style={{ marginBottom: 24 }}>
              {PLANS.slice(0, 3).map(p => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: LC.bg, borderRadius: 8, marginBottom: 8, border: `1px solid ${LC.border}` }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: LC.navy }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: LC.textSub }}>{p.desc}</div>
                  </div>
                  <div style={{ fontWeight: 900, color: LC.gold, fontSize: 15 }}>GH₵ {p.price}<span style={{ fontSize: 10, fontWeight: 400, color: LC.textSub }}>/mo</span></div>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div style={{ background: LC.navy, borderRadius: 10, padding: "14px 18px", marginBottom: 20, textAlign: "center" }}>
              <div style={{ color: LC.gold, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Contact to Purchase</div>
              <div style={{ color: "#fff", fontSize: 13 }}>📞 {CONTACT_PHONE}</div>
              <div style={{ color: LC.textLight, fontSize: 12, marginTop: 2 }}>✉ {CONTACT_EMAIL}</div>
              <div style={{ color: LC.textLight, fontSize: 11, marginTop: 6 }}>WhatsApp available · 7am – 8pm Mon–Sat</div>
            </div>

            <div style={{ textAlign: "center" }}>
              <LBtn onClick={() => setShowAdmin(true)}>🔐 Activate with Admin Code</LBtn>
            </div>
          </div>
        </div>

        {showAdmin && <AdminModal
          authed={authed} adminUser={adminUser} adminPass={adminPass} authErr={authErr}
          setAdminUser={setAdminUser} setAdminPass={setAdminPass} setAuthErr={setAuthErr}
          handleAuth={handleAuth} tab={tab} setTab={setTab}
          form={form} setForm={setForm} issueLicence={issueLicence}
          lic={lic} history={history} onClose={() => { setShowAdmin(false); setAuthed(false); setAdminUser(""); setAdminPass(""); }}
          printCertificate={printCertificate}
        />}
      </div>
    );
  }

  // ── EXPIRED (read-only) ────────────────────────────────────
  if (status === "expired") {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: LC.red, color: "#fff", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
          <span>🔴 <strong>LICENCE EXPIRED</strong> — {APP_NAME} is in read-only mode. Your data is safe. Contact {CONTACT_PHONE} to renew.</span>
          <LBtn onClick={() => setShowAdmin(true)} bg="#fff" color={LC.red} small>Renew Now</LBtn>
        </div>
        <div style={{ pointerEvents: "none", opacity: 0.65 }}>{children}</div>
        {showAdmin && <AdminModal
          authed={authed} adminUser={adminUser} adminPass={adminPass} authErr={authErr}
          setAdminUser={setAdminUser} setAdminPass={setAdminPass} setAuthErr={setAuthErr}
          handleAuth={handleAuth} tab={tab} setTab={setTab}
          form={form} setForm={setForm} issueLicence={issueLicence}
          lic={lic} history={history} onClose={() => { setShowAdmin(false); setAuthed(false); setAdminUser(""); setAdminPass(""); }}
          printCertificate={printCertificate}
        />}
      </div>
    );
  }

  // ── ACTIVE (with warning banners) ─────────────────────────
  const bannerBg   = status === "critical" ? LC.red : LC.gold;
  const bannerText = status === "critical" ? "#fff"  : LC.navy;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {(status === "warning" || status === "critical") && (
        <div style={{ background: bannerBg, color: bannerText, padding: "9px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
          <span>
            {status === "critical" ? "🔴" : "⚠️"} <strong>Licence expires in {dl} day{dl !== 1 ? "s" : ""}</strong>
            {status === "critical" ? " — App will go read-only on expiry!" : " — Renew soon to avoid interruption."}
          </span>
          <LBtn onClick={() => setShowAdmin(true)} bg={status === "critical" ? "#fff" : LC.navy} color={status === "critical" ? LC.red : "#fff"} small>Renew Now</LBtn>
        </div>
      )}

      {children}

      {/* Floating licence button */}
      <button onClick={() => setShowAdmin(true)} title="Licence Admin" style={{
        position: "fixed", bottom: 18, right: 18, zIndex: 999,
        background: LC.navy, color: LC.gold, border: "none", borderRadius: 50,
        width: 42, height: 42, fontSize: 16, cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,.4)",
      }}>🔐</button>

      {showAdmin && <AdminModal
        authed={authed} adminUser={adminUser} adminPass={adminPass} authErr={authErr}
        setAdminUser={setAdminUser} setAdminPass={setAdminPass} setAuthErr={setAuthErr}
        handleAuth={handleAuth} tab={tab} setTab={setTab}
        form={form} setForm={setForm} issueLicence={issueLicence}
        lic={lic} history={history} onClose={() => { setShowAdmin(false); setAuthed(false); setAdminUser(""); setAdminPass(""); }}
        printCertificate={printCertificate}
      />}
    </div>
  );
}

// ── Admin Modal ────────────────────────────────────────────────────────────────
function AdminModal({ authed, adminUser, adminPass, authErr, setAdminUser, setAdminPass, setAuthErr,
  handleAuth, tab, setTab, form, setForm, issueLicence, lic, history, onClose, printCertificate }) {

  const LInp = ({ label, value, onChange, type = "text", placeholder, options }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: LC.textSub }}>{label}</label>
      {options
        ? <select value={value} onChange={e => onChange(e.target.value)} style={{ padding: "8px 10px", border: `1.5px solid ${LC.border}`, borderRadius: 7, fontSize: 13 }}>
            {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
          </select>
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={{ padding: "8px 10px", border: `1.5px solid ${LC.border}`, borderRadius: 7, fontSize: 13 }} />
      }
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: LC.card, borderRadius: 16, width: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,.5)", fontFamily: "system-ui, sans-serif" }}>

        {/* Modal header */}
        <div style={{ background: LC.navy, padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "16px 16px 0 0" }}>
          <div>
            <div style={{ color: LC.gold, fontWeight: 800, fontSize: 15 }}>🔐 BevTrack Pro — Licence Admin</div>
            <div style={{ color: LC.textLight, fontSize: 11, marginTop: 2 }}>Authorised personnel only</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: "24px" }}>
          {/* ── Auth ── */}
          {!authed ? (
            <div>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
                <div style={{ fontWeight: 700, color: LC.navy }}>Admin Login Required</div>
                <div style={{ fontSize: 12, color: LC.textSub, marginTop: 4 }}>Enter your administrator credentials to continue</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                <LInp label="Username" value={adminUser} onChange={setAdminUser} placeholder="Admin username" />
                <LInp label="Password" value={adminPass} onChange={setAdminPass} type="password" placeholder="Admin password" />
              </div>
              {authErr && <div style={{ color: LC.red, fontSize: 12, marginBottom: 12, textAlign: "center" }}>{authErr}</div>}
              <button onClick={handleAuth} style={{ width: "100%", background: LC.navy, color: LC.gold, border: "none", borderRadius: 9, padding: "11px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                Login →
              </button>
            </div>
          ) : (
            <>
              {/* ── Tabs ── */}
              <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                {[["issue", "Issue / Renew"], ["status", "Current Licence"], ["history", "History"]].map(([id, label]) => (
                  <button key={id} onClick={() => setTab(id)} style={{
                    flex: 1, padding: "8px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700,
                    background: tab === id ? LC.navy : LC.bg, color: tab === id ? LC.gold : LC.text,
                  }}>{label}</button>
                ))}
              </div>

              {/* ── Issue / Renew Tab ── */}
              {tab === "issue" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <LInp label="Holder Name *" value={form.holderName} onChange={v => setForm(f => ({...f, holderName: v}))} placeholder="e.g. Kofi Mensah" />
                    <LInp label="Business Name *" value={form.businessName} onChange={v => setForm(f => ({...f, businessName: v}))} placeholder="e.g. Accra Beverages" />
                    <LInp label="Business Type" value={form.businessType} onChange={v => setForm(f => ({...f, businessType: v}))}
                      options={["Bar / Drinks Shop","Beverages Distributor","Supermarket","Chop Bar","Wholesale Store","Other"]} />
                    <LInp label="Plan" value={form.plan} onChange={v => setForm(f => ({...f, plan: v}))}
                      options={PLANS.map(p => ({ value: p.id, label: `${p.label} — GH₵${p.price}` }))} />
                    <LInp label="Start Date" value={form.startDate} onChange={v => setForm(f => ({...f, startDate: v}))} type="date" />
                    <LInp label="Payment Method" value={form.payMethod} onChange={v => setForm(f => ({...f, payMethod: v}))}
                      options={["MoMo","Cash","Bank Transfer","Cheque"]} />
                  </div>
                  <LInp label="Payment Reference *" value={form.payRef} onChange={v => setForm(f => ({...f, payRef: v}))} placeholder="e.g. MoMo ref or bank tran ID" />
                  <LInp label="Notes (optional)" value={form.notes} onChange={v => setForm(f => ({...f, notes: v}))} placeholder="Any extra notes..." />

                  {/* Plan summary */}
                  {(() => {
                    const p = PLANS.find(pl => pl.id === form.plan);
                    const exp = new Date(form.startDate);
                    exp.setDate(exp.getDate() + p.days);
                    return (
                      <div style={{ background: LC.navy, borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 12 }}>
                        <div style={{ color: LC.gold, fontWeight: 700, marginBottom: 6 }}>Licence Summary</div>
                        <div>Plan: <strong>{p.label}</strong> · GH₵ {p.price.toLocaleString()}</div>
                        <div>Valid for: <strong>{p.days} days</strong> · Expires: <strong>{exp.toISOString().split("T")[0]}</strong></div>
                        <div style={{ color: LC.textLight, marginTop: 4, fontSize: 11 }}>{p.desc}</div>
                      </div>
                    );
                  })()}

                  <button onClick={issueLicence} style={{ background: LC.gold, color: LC.navy, border: "none", borderRadius: 9, padding: "12px", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>
                    ✓ Issue Licence & Print Certificate
                  </button>
                </div>
              )}

              {/* ── Current Licence Tab ── */}
              {tab === "status" && (
                <div>
                  {lic ? (
                    <div>
                      <div style={{ background: LC.bg, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                        <div style={{ fontSize: 11, color: LC.textSub, marginBottom: 2 }}>LICENCE ID</div>
                        <div style={{ fontWeight: 900, fontSize: 20, color: LC.navy, letterSpacing: 3 }}>{lic.licenceId}</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {[
                          ["Holder", lic.holderName],
                          ["Business", lic.businessName],
                          ["Plan", lic.plan],
                          ["Business Type", lic.businessType],
                          ["Start Date", lic.startDate],
                          ["Expiry Date", lic.expiryDate],
                          ["Payment Method", lic.payMethod],
                          ["Payment Ref", lic.payRef],
                          ["Amount Paid", `GH₵ ${lic.price?.toLocaleString()}`],
                          ["Days Remaining", `${daysLeft(lic)} days`],
                        ].map(([k, v]) => (
                          <div key={k} style={{ background: LC.bg, borderRadius: 8, padding: "10px 12px" }}>
                            <div style={{ fontSize: 10, color: LC.textSub, fontWeight: 600, textTransform: "uppercase" }}>{k}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: LC.navy, marginTop: 2 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
                        <button onClick={() => printCertificate(lic)} style={{ flex: 1, background: LC.navy, color: LC.gold, border: "none", borderRadius: 8, padding: "9px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                          🖨 Reprint Certificate
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: 30, color: LC.textSub }}>No active licence found.</div>
                  )}
                </div>
              )}

              {/* ── History Tab ── */}
              {tab === "history" && (
                <div>
                  {history.length === 0
                    ? <div style={{ textAlign: "center", padding: 30, color: LC.textSub }}>No licence history yet.</div>
                    : history.map((h, i) => (
                      <div key={i} style={{ background: LC.bg, borderRadius: 10, padding: "12px 14px", marginBottom: 10, border: `1px solid ${LC.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ background: h.action === "Renewal" ? LC.accent : LC.green, color: "#fff", borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{h.action}</span>
                          <span style={{ fontSize: 11, color: LC.textSub }}>{new Date(h.issuedAt).toLocaleDateString()}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: LC.navy }}>{h.businessName} · {h.plan}</div>
                        <div style={{ fontSize: 12, color: LC.textSub }}>{h.startDate} → {h.expiryDate} · GH₵ {h.price?.toLocaleString()} via {h.payMethod}</div>
                        <div style={{ fontSize: 11, color: LC.textLight }}>Ref: {h.payRef} · ID: {h.licenceId}</div>
                      </div>
                    ))
                  }
                </div>
              )}
            </>
          )}
        </div>
  
      {showReset&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20}}>
          <div style={{background:C.card,border:"1px solid #ef444444",borderRadius:14,padding:28,width:"min(94vw,400px)"}}>
            <div style={{fontSize:18,fontWeight:800,color:"#ef4444",marginBottom:8}}>⚠️ Reset All Data</div>
            <p style={{fontSize:13,color:C.textSub,marginBottom:20,lineHeight:1.7}}>This permanently deletes ALL BevTrack data. Type <strong style={{color:"#ef4444"}}>RESET</strong> to confirm.</p>
            <input id="bev-reset-input" placeholder="Type RESET" style={{width:"100%",padding:11,background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:12,fontFamily:"inherit",textTransform:"uppercase"}} />
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowReset(false)} style={{flex:1,padding:"10px 0",background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,color:C.textSub,fontWeight:600,cursor:"pointer"}}>Cancel</button>
              <button onClick={()=>{
                if(document.getElementById("bev-reset-input")?.value?.toUpperCase()==="RESET"){
                  ["LICENCE_BevTrackPro_v1","bevtrack_pro_data","bevtrack_pro_data_inst"].forEach(k=>localStorage.removeItem(k));
                  window.location.reload();
                } else { alert("Please type RESET to confirm."); }
              }} style={{flex:1,padding:"10px 0",background:"#dc2626",color:"#fff",border:"none",borderRadius:8,fontWeight:800,cursor:"pointer"}}>Delete All Data</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// END OF LICENCE SYSTEM
// ─────────────────────────────────────────────────────────────────────────────



// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SUPPLIERS = ["Coca-Cola Ghana", "Kasapreko", "Guinness Ghana", "Voltic Ghana", "Fan Milk", "Alvaro / ABInBev"];
const INITIAL_PRODUCTS = [];
const INITIAL_SALES = [];
const INITIAL_DELIVERIES = [];
const INITIAL_CUSTOMERS = [];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n) => `GH₵ ${Number(n).toFixed(2)}`;
const today = () => new Date().toISOString().split("T")[0];
const uid = () => Date.now() + Math.random();

// ─── ICONS (inline SVG) ───────────────────────────────────────────────────────
const Icon = ({ d, size = 18, color = "currentColor", strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);
const Icons = {
  dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  truck: "M1 3h15v13H1zM16 8h4l3 3v5h-7V8z",
  box: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 001 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  pos: "M3 3h18v18H3zM9 9h6v6H9z",
  chart: "M18 20V10M12 20V4M6 20v-6",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6z",
  plus: "M12 5v14M5 12h14",
  check: "M20 6L9 17l-5-5",
  alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  backup: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
};

// ─── COLOURS ──────────────────────────────────────────────────────────────────
const C = {
  navy: "#0A1628", navyLight: "#1E3A5F", gold: "#D4A017", goldLight: "#F4C842",
  accent: "#2E86AB", green: "#27AE60", red: "#C0392B", orange: "#E67E22",
  bg: "#F0F4F8", card: "#FFFFFF", border: "#CBD5E1",
  text: "#1E293B", textSub: "#64748B", textLight: "#94A3B8",
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = C.navy, icon }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: C.textSub, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
        <span style={{ background: color + "18", padding: "5px 7px", borderRadius: 8 }}><Icon d={icon} size={16} color={color} /></span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textSub }}>{sub}</div>}
    </div>
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
function Badge({ label, color = C.accent }) {
  return <span style={{ background: color + "22", color: color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{label}</span>;
}

// ─── BUTTON ───────────────────────────────────────────────────────────────────
function Btn({ onClick, children, variant = "primary", size = "md", disabled = false }) {
  const base = { border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6, transition: "opacity .15s", opacity: disabled ? 0.5 : 1 };
  const variants = {
    primary: { background: C.navy, color: "#fff", padding: size === "sm" ? "6px 14px" : "9px 20px", fontSize: size === "sm" ? 12 : 13 },
    gold: { background: C.gold, color: C.navy, padding: size === "sm" ? "6px 14px" : "9px 20px", fontSize: size === "sm" ? 12 : 13 },
    outline: { background: "transparent", color: C.navy, border: `1.5px solid ${C.border}`, padding: size === "sm" ? "5px 13px" : "8px 19px", fontSize: size === "sm" ? 12 : 13 },
    danger: { background: C.red, color: "#fff", padding: "6px 14px", fontSize: 12 },
    green: { background: C.green, color: "#fff", padding: size === "sm" ? "6px 14px" : "9px 20px", fontSize: size === "sm" ? 12 : 13 },
  };
  return <button style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled}>{children}</button>;
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
function Input({ label, value, onChange, type = "text", placeholder, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: C.textSub }}>{label}{required && <span style={{ color: C.red }}> *</span>}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ padding: "8px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, background: "#fff", outline: "none" }} />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: C.textSub }}>{label}{required && <span style={{ color: C.red }}> *</span>}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ padding: "8px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, background: "#fff" }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  );
}

// ─── TABLE ────────────────────────────────────────────────────────────────────
function Table({ cols, rows, emptyMsg = "No data" }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.navy }}>
            {cols.map(c => <th key={c} style={{ padding: "10px 14px", color: C.gold, fontWeight: 700, textAlign: "left", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", whiteSpace: "nowrap" }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={cols.length} style={{ padding: 24, textAlign: "center", color: C.textSub }}>{emptyMsg}</td></tr>
            : rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#F8FAFC", borderBottom: `1px solid ${C.border}` }}>
                {row.map((cell, j) => <td key={j} style={{ padding: "10px 14px", color: C.text, verticalAlign: "middle" }}>{cell}</td>)}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
function SectionHeader({ title, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
      <div>
        <div style={{ width: 4, height: 22, background: C.gold, borderRadius: 4, display: "inline-block", marginRight: 10, verticalAlign: "middle" }} />
        <span style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>{title}</span>
      </div>
      {action}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function Dashboard({ products, sales, deliveries, customers }) {
  const todaySales = sales.filter(s => s.date === today());
  const revenue = todaySales.reduce((a, s) => a + s.total, 0);
  const totalSalesRevenue = sales.reduce((a, s) => a + s.total, 0);

  const lowStock = products.filter(p => p.stock <= p.reorderLevel);
  const nearExpiry = products.filter(p => {
    const days = (new Date(p.expiry) - new Date()) / 86400000;
    return days <= 30 && days > 0;
  });

  const cogs = sales.reduce((acc, s) => {
    return acc + s.items.reduce((a, i) => {
      const p = products.find(x => x.id === i.productId);
      return a + (p ? p.costPrice * i.qty : 0);
    }, 0);
  }, 0);
  const gross = totalSalesRevenue - cogs;
  const margin = totalSalesRevenue > 0 ? ((gross / totalSalesRevenue) * 100).toFixed(1) : 0;

  // Brand performance
  const brandMap = {};
  sales.forEach(s => s.items.forEach(i => {
    const p = products.find(x => x.id === i.productId);
    if (p) { brandMap[p.brand] = (brandMap[p.brand] || 0) + i.qty * i.price; }
  }));
  const topBrands = Object.entries(brandMap).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.navy }}>Welcome back 👋</div>
        <div style={{ color: C.textSub, fontSize: 13 }}>Here's your business at a glance — {new Date().toLocaleDateString("en-GH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="Today's Revenue" value={fmt(revenue)} sub={`${todaySales.length} transactions`} color={C.green} icon={Icons.chart} />
        <StatCard label="Total Revenue" value={fmt(totalSalesRevenue)} sub={`${sales.length} total sales`} color={C.accent} icon={Icons.chart} />
        <StatCard label="Gross Profit" value={fmt(gross)} sub={`${margin}% margin`} color={C.gold} icon={Icons.chart} />
        <StatCard label="Stock SKUs" value={products.length} sub={`${lowStock.length} low stock alerts`} color={lowStock.length > 0 ? C.red : C.navy} icon={Icons.box} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Alerts */}
        <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 14, fontSize: 14 }}>⚠ Active Alerts</div>
          {lowStock.length === 0 && nearExpiry.length === 0
            ? <div style={{ color: C.green, fontSize: 13 }}>✓ All clear — no alerts right now</div>
            : <>
              {lowStock.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ color: C.red }}>📦</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.red }}>Low stock: {p.stock} units (reorder at {p.reorderLevel})</div>
                  </div>
                </div>
              ))}
              {nearExpiry.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ color: C.orange }}>⏰</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.orange }}>Expires: {p.expiry}</div>
                  </div>
                </div>
              ))}
            </>}
        </div>

        {/* Brand Performance */}
        <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 14, fontSize: 14 }}>📊 Brand Performance</div>
          {topBrands.map(([brand, rev], i) => {
            const pct = totalSalesRevenue > 0 ? (rev / totalSalesRevenue) * 100 : 0;
            const barColors = [C.gold, C.accent, C.green, C.navy];
            return (
              <div key={brand} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: C.text }}>{brand.replace(" Ghana", "").replace(" Ghana Ltd", "")}</span>
                  <span style={{ color: C.textSub }}>{fmt(rev)}</span>
                </div>
                <div style={{ height: 7, background: C.border, borderRadius: 4 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: barColors[i], borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Sales */}
      <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 700, color: C.navy, marginBottom: 14, fontSize: 14 }}>🧾 Recent Transactions</div>
        <Table
          cols={["Date", "Customer", "Items", "Total", "Payment", "Cashier"]}
          rows={[...sales].reverse().slice(0, 5).map(s => [
            s.date, s.customer,
            s.items.map(i => { const p = products.find(x => x.id === i.productId); return `${p?.name ?? "?"} ×${i.qty}`; }).join(", "),
            <strong style={{ color: C.green }}>{fmt(s.total)}</strong>,
            <Badge label={s.payment} color={s.payment === "Credit" ? C.orange : s.payment === "MoMo" ? C.accent : C.green} />,
            s.cashier
          ])}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRUCK DELIVERIES
// ═══════════════════════════════════════════════════════════════════════════════
function Deliveries({ deliveries, setDeliveries, products, setProducts }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ supplier: SUPPLIERS[0], driver: "", truck: "", date: today(), items: [] });
  const [newItem, setNewItem] = useState({ productId: "", qtyOrdered: "", qtyReceived: "", cost: "" });

  const addItem = () => {
    if (!newItem.productId || !newItem.qtyReceived) return;
    setForm(f => ({ ...f, items: [...f.items, { ...newItem, productId: Number(newItem.productId), qtyOrdered: Number(newItem.qtyOrdered), qtyReceived: Number(newItem.qtyReceived), cost: Number(newItem.cost) }] }));
    setNewItem({ productId: "", qtyOrdered: "", qtyReceived: "", cost: "" });
  };

  const submitDelivery = () => {
    if (!form.driver || form.items.length === 0) return alert("Add driver name and at least one product.");
    const newDel = { ...form, id: uid(), status: "Completed" };
    setDeliveries(d => [newDel, ...d]);
    // Update stock
    setProducts(prods => prods.map(p => {
      const item = form.items.find(i => i.productId === p.id);
      if (item) return { ...p, stock: p.stock + item.qtyReceived, costPrice: item.cost || p.costPrice };
      return p;
    }));
    setShowForm(false);
    setForm({ supplier: SUPPLIERS[0], driver: "", truck: "", date: today(), items: [] });
  };

  return (
    <div>
      <SectionHeader title="Truck Delivery & Stock Receipt" action={<Btn onClick={() => setShowForm(!showForm)}><Icon d={Icons.plus} size={14} /> New Delivery</Btn>} />

      {showForm && (
        <div style={{ background: C.card, border: `1.5px solid ${C.gold}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 16, fontSize: 15 }}>📦 Log New Truck Delivery</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
            <Select label="Supplier" value={form.supplier} onChange={v => setForm(f => ({ ...f, supplier: v }))} options={SUPPLIERS} required />
            <Input label="Driver Name" value={form.driver} onChange={v => setForm(f => ({ ...f, driver: v }))} placeholder="e.g. Kwame Asante" required />
            <Input label="Truck Number" value={form.truck} onChange={v => setForm(f => ({ ...f, truck: v }))} placeholder="e.g. GE 4821-22" />
            <Input label="Delivery Date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} type="date" />
          </div>

          <div style={{ background: C.bg, borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <div style={{ fontWeight: 600, color: C.navy, marginBottom: 12, fontSize: 13 }}>Add Products Received</div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
              <Select label="Product" value={newItem.productId} onChange={v => { const p = products.find(x => x.id === Number(v)); setNewItem(n => ({ ...n, productId: v, cost: p?.costPrice || "" })); }} options={[{ value: "", label: "— Select product —" }, ...products.map(p => ({ value: p.id, label: p.name }))]} />
              <Input label="Qty Ordered" value={newItem.qtyOrdered} onChange={v => setNewItem(n => ({ ...n, qtyOrdered: v }))} type="number" placeholder="0" />
              <Input label="Qty Received" value={newItem.qtyReceived} onChange={v => setNewItem(n => ({ ...n, qtyReceived: v }))} type="number" placeholder="0" />
              <Input label="Unit Cost (GH₵)" value={newItem.cost} onChange={v => setNewItem(n => ({ ...n, cost: v }))} type="number" placeholder="0.00" />
              <Btn onClick={addItem} variant="gold" size="sm">Add</Btn>
            </div>
          </div>

          {form.items.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Table
                cols={["Product", "Qty Ordered", "Qty Received", "Variance", "Unit Cost", "Line Total"]}
                rows={form.items.map(i => {
                  const p = products.find(x => x.id === i.productId);
                  const variance = i.qtyReceived - i.qtyOrdered;
                  return [
                    p?.name || "?",
                    i.qtyOrdered,
                    i.qtyReceived,
                    <span style={{ color: variance < 0 ? C.red : C.green, fontWeight: 700 }}>{variance >= 0 ? "+" : ""}{variance}</span>,
                    fmt(i.cost),
                    <strong>{fmt(i.cost * i.qtyReceived)}</strong>
                  ];
                })}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={submitDelivery} variant="green">✓ Confirm & Update Stock</Btn>
            <Btn onClick={() => setShowForm(false)} variant="outline">Cancel</Btn>
          </div>
        </div>
      )}

      <Table
        cols={["Date", "Supplier", "Driver", "Truck No.", "Items", "Total Value", "Discrepancies", "Status"]}
        rows={deliveries.map(d => {
          const totalVal = d.items.reduce((a, i) => a + i.cost * i.qtyReceived, 0);
          const discrepancies = d.items.filter(i => i.qtyReceived !== i.qtyOrdered).length;
          return [
            d.date, d.supplier, d.driver, d.truck,
            `${d.items.length} SKU(s)`,
            <strong style={{ color: C.green }}>{fmt(totalVal)}</strong>,
            discrepancies > 0 ? <Badge label={`${discrepancies} variance(s)`} color={C.red} /> : <Badge label="All OK" color={C.green} />,
            <Badge label={d.status} color={C.green} />
          ];
        })}
        emptyMsg="No deliveries recorded yet"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════════════════════════════════════
function Inventory({ products, setProducts }) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", brand: "", unit: "Bottle", costPrice: "", sellPrice: "", stock: 0, reorderLevel: 24, expiry: "" });

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()));

  const addProduct = () => {
    if (!form.name || !form.costPrice || !form.sellPrice) return alert("Fill in all required fields.");
    setProducts(ps => [...ps, { ...form, id: uid(), costPrice: Number(form.costPrice), sellPrice: Number(form.sellPrice), stock: Number(form.stock), reorderLevel: Number(form.reorderLevel) }]);
    setShowAdd(false);
    setForm({ name: "", brand: "", unit: "Bottle", costPrice: "", sellPrice: "", stock: 0, reorderLevel: 24, expiry: "" });
  };

  return (
    <div>
      <SectionHeader title="Inventory Management" action={
        <div style={{ display: "flex", gap: 10 }}>
          <input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, width: 200 }} />
          <Btn onClick={() => setShowAdd(!showAdd)}><Icon d={Icons.plus} size={14} /> Add Product</Btn>
        </div>
      } />

      {showAdd && (
        <div style={{ background: C.card, border: `1.5px solid ${C.gold}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 16 }}>Add New Product / SKU</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 16 }}>
            <Input label="Product Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Coke 330ml" required />
            <Input label="Brand / Supplier" value={form.brand} onChange={v => setForm(f => ({ ...f, brand: v }))} placeholder="e.g. Coca-Cola Ghana" required />
            <Select label="Unit Type" value={form.unit} onChange={v => setForm(f => ({ ...f, unit: v }))} options={["Bottle", "Can", "Sachet", "Crate", "Pack", "Piece"]} />
            <Input label="Cost Price (GH₵)" value={form.costPrice} onChange={v => setForm(f => ({ ...f, costPrice: v }))} type="number" placeholder="0.00" required />
            <Input label="Sell Price (GH₵)" value={form.sellPrice} onChange={v => setForm(f => ({ ...f, sellPrice: v }))} type="number" placeholder="0.00" required />
            <Input label="Opening Stock" value={form.stock} onChange={v => setForm(f => ({ ...f, stock: v }))} type="number" placeholder="0" />
            <Input label="Reorder Level" value={form.reorderLevel} onChange={v => setForm(f => ({ ...f, reorderLevel: v }))} type="number" placeholder="24" />
            <Input label="Expiry Date" value={form.expiry} onChange={v => setForm(f => ({ ...f, expiry: v }))} type="date" />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={addProduct} variant="green">Save Product</Btn>
            <Btn onClick={() => setShowAdd(false)} variant="outline">Cancel</Btn>
          </div>
        </div>
      )}

      <Table
        cols={["Product Name", "Brand", "Unit", "Cost Price", "Sell Price", "Margin", "Stock", "Reorder Level", "Status", "Expiry"]}
        rows={filtered.map(p => {
          const margin = (((p.sellPrice - p.costPrice) / p.sellPrice) * 100).toFixed(0);
          const isLow = p.stock <= p.reorderLevel;
          const daysToExpiry = p.expiry ? (new Date(p.expiry) - new Date()) / 86400000 : 999;
          return [
            <strong style={{ color: C.navy }}>{p.name}</strong>,
            p.brand.replace(" Ghana", ""), p.unit,
            fmt(p.costPrice), fmt(p.sellPrice),
            <Badge label={`${margin}%`} color={Number(margin) > 25 ? C.green : Number(margin) > 15 ? C.gold : C.red} />,
            <span style={{ color: isLow ? C.red : C.text, fontWeight: isLow ? 700 : 400 }}>{p.stock}</span>,
            p.reorderLevel,
            isLow ? <Badge label="LOW STOCK" color={C.red} /> : <Badge label="OK" color={C.green} />,
            <span style={{ color: daysToExpiry < 30 ? C.orange : C.text }}>{p.expiry || "—"}</span>
          ];
        })}
        emptyMsg="No products found"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// POINT OF SALE
// ═══════════════════════════════════════════════════════════════════════════════
function POS({ products, setProducts, sales, setSales, customers }) {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState("Cash");
  const [customer, setCustomer] = useState("Walk-in");
  const [cashier] = useState("Abena");
  const [lastReceipt, setLastReceipt] = useState(null);

  const filtered = products.filter(p =>
    p.stock > 0 && (p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (product) => {
    setCart(c => {
      const existing = c.find(i => i.productId === product.id);
      if (existing) return c.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { productId: product.id, name: product.name, price: product.sellPrice, qty: 1 }];
    });
  };

  const updateQty = (productId, qty) => {
    if (qty <= 0) setCart(c => c.filter(i => i.productId !== productId));
    else setCart(c => c.map(i => i.productId === productId ? { ...i, qty } : i));
  };

  const total = cart.reduce((a, i) => a + i.price * i.qty, 0);

  const completeSale = () => {
    if (cart.length === 0) return;
    const sale = {
      id: uid(), date: today(), items: cart.map(i => ({ productId: i.productId, qty: i.qty, price: i.price })),
      total, payment, customer, cashier
    };
    setSales(s => [sale, ...s]);
    setProducts(ps => ps.map(p => {
      const item = cart.find(i => i.productId === p.id);
      return item ? { ...p, stock: p.stock - item.qty } : p;
    }));
    setLastReceipt({ ...sale, cartSnapshot: [...cart] });
    setCart([]);
    setSearch("");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>
      {/* Product Grid */}
      <div>
        <div style={{ marginBottom: 14 }}>
          <input placeholder="🔍 Search product name or brand..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", border: `2px solid ${C.navy}`, borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {filtered.map(p => (
            <div key={p.id} onClick={() => addToCart(p)}
              style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", transition: "border-color .15s", userSelect: "none" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.gold}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>🥤</div>
              <div style={{ fontWeight: 700, fontSize: 12, color: C.navy, marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: C.textSub, marginBottom: 6 }}>{p.brand.replace(" Ghana", "")}</div>
              <div style={{ fontWeight: 800, color: C.green, fontSize: 14 }}>{fmt(p.sellPrice)}</div>
              <div style={{ fontSize: 10, color: C.textLight }}>Stock: {p.stock}</div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ gridColumn: "1/-1", padding: 30, textAlign: "center", color: C.textSub }}>No products match your search</div>}
        </div>
      </div>

      {/* Cart */}
      <div style={{ background: C.card, borderRadius: 14, border: `2px solid ${C.navy}`, overflow: "hidden", position: "sticky", top: 20 }}>
        <div style={{ background: C.navy, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: C.gold, fontWeight: 800, fontSize: 15 }}>🛒 Cart</span>
          {cart.length > 0 && <Btn onClick={() => setCart([])} variant="danger" size="sm">Clear</Btn>}
        </div>

        <div style={{ padding: 16, minHeight: 200 }}>
          {cart.length === 0
            ? <div style={{ textAlign: "center", color: C.textSub, paddingTop: 40, fontSize: 13 }}>Tap a product to add it</div>
            : cart.map(item => (
              <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: C.textSub }}>{fmt(item.price)} each</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => updateQty(item.productId, item.qty - 1)} style={{ background: C.border, border: "none", borderRadius: 4, width: 24, height: 24, cursor: "pointer", fontWeight: 700 }}>−</button>
                  <span style={{ fontWeight: 700, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.productId, item.qty + 1)} style={{ background: C.navy, color: "#fff", border: "none", borderRadius: 4, width: 24, height: 24, cursor: "pointer", fontWeight: 700 }}>+</button>
                  <strong style={{ minWidth: 55, textAlign: "right", color: C.green }}>{fmt(item.price * item.qty)}</strong>
                </div>
              </div>
            ))}
        </div>

        <div style={{ padding: 16, borderTop: `1px solid ${C.border}`, background: C.bg }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>TOTAL</span>
            <span style={{ fontWeight: 900, fontSize: 20, color: C.green }}>{fmt(total)}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <Select label="Payment" value={payment} onChange={setPayment} options={["Cash", "MoMo", "Bank Transfer", "Credit"]} />
            <Select label="Customer" value={customer} onChange={setCustomer} options={["Walk-in", ...customers.map(c => c.name)]} />
          </div>
          <Btn onClick={completeSale} variant="gold" disabled={cart.length === 0} size="md">
            ✓ Complete Sale
          </Btn>
        </div>
      </div>

      {/* Receipt Modal */}
      {lastReceipt && (
        <div style={{ position: "fixed", inset: 0, background: "#00000080", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 30, width: 340, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 30 }}>🧾</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>BevTrack Pro Receipt</div>
              <div style={{ fontSize: 12, color: C.textSub }}>{lastReceipt.date} • Cashier: {lastReceipt.cashier}</div>
            </div>
            <div style={{ borderTop: "1px dashed #ccc", borderBottom: "1px dashed #ccc", padding: "12px 0", marginBottom: 12 }}>
              {lastReceipt.cartSnapshot.map(i => (
                <div key={i.productId} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span>{i.name} ×{i.qty}</span>
                  <span>{fmt(i.price * i.qty)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
              <span>TOTAL</span><span style={{ color: C.green }}>{fmt(lastReceipt.total)}</span>
            </div>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 16 }}>Payment: {lastReceipt.payment} • Customer: {lastReceipt.customer}</div>
            <Btn onClick={() => setLastReceipt(null)} variant="primary">Close Receipt</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════════
function Reports({ sales, products, deliveries }) {
  const [range, setRange] = useState("all");

  const now = new Date();
  const filtered = sales.filter(s => {
    const d = new Date(s.date);
    if (range === "today") return s.date === today();
    if (range === "week") return (now - d) / 86400000 <= 7;
    return true;
  });

  const revenue = filtered.reduce((a, s) => a + s.total, 0);
  const cogs = filtered.reduce((acc, s) => acc + s.items.reduce((a, i) => {
    const p = products.find(x => x.id === i.productId);
    return a + (p ? p.costPrice * i.qty : 0);
  }, 0), 0);
  const gross = revenue - cogs;

  // SKU profitability
  const skuMap = {};
  filtered.forEach(s => s.items.forEach(i => {
    const p = products.find(x => x.id === i.productId);
    if (!p) return;
    if (!skuMap[p.name]) skuMap[p.name] = { revenue: 0, cogs: 0, qty: 0, brand: p.brand };
    skuMap[p.name].revenue += i.price * i.qty;
    skuMap[p.name].cogs += p.costPrice * i.qty;
    skuMap[p.name].qty += i.qty;
  }));
  const skuRows = Object.entries(skuMap).map(([name, d]) => [name, d.brand.replace(" Ghana", ""), d.qty, fmt(d.revenue), fmt(d.cogs), fmt(d.revenue - d.cogs), <Badge label={`${(((d.revenue - d.cogs) / d.revenue) * 100).toFixed(0)}%`} color={C.green} />]).sort((a, b) => b[5].localeCompare(a[5]));

  // Payment breakdown
  const payMap = {};
  filtered.forEach(s => { payMap[s.payment] = (payMap[s.payment] || 0) + s.total; });

  // Cashier performance
  const cashierMap = {};
  filtered.forEach(s => { cashierMap[s.cashier] = (cashierMap[s.cashier] || 0) + s.total; });

  return (
    <div>
      <SectionHeader title="Reports & Analytics" action={
        <Select value={range} onChange={setRange} options={[{ value: "today", label: "Today" }, { value: "week", label: "Last 7 Days" }, { value: "all", label: "All Time" }]} />
      } />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Revenue" value={fmt(revenue)} color={C.accent} icon={Icons.chart} />
        <StatCard label="Cost of Goods" value={fmt(cogs)} color={C.orange} icon={Icons.box} />
        <StatCard label="Gross Profit" value={fmt(gross)} color={C.green} icon={Icons.chart} />
        <StatCard label="Gross Margin" value={`${revenue > 0 ? ((gross / revenue) * 100).toFixed(1) : 0}%`} color={C.gold} icon={Icons.chart} />
        <StatCard label="Transactions" value={filtered.length} color={C.navy} icon={Icons.chart} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 14 }}>Payment Method Breakdown</div>
          {Object.entries(payMap).map(([method, amt]) => (
            <div key={method} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <Badge label={method} color={method === "Credit" ? C.orange : method === "MoMo" ? C.accent : C.green} />
              <strong>{fmt(amt)}</strong>
            </div>
          ))}
          {Object.keys(payMap).length === 0 && <div style={{ color: C.textSub, fontSize: 13 }}>No data for this period</div>}
        </div>

        <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 14 }}>Cashier Performance</div>
          {Object.entries(cashierMap).sort((a, b) => b[1] - a[1]).map(([name, amt]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontWeight: 600 }}>👤 {name}</span>
              <strong style={{ color: C.green }}>{fmt(amt)}</strong>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 700, color: C.navy, marginBottom: 14 }}>SKU Profitability Analysis</div>
        <Table
          cols={["Product", "Brand", "Units Sold", "Revenue", "COGS", "Gross Profit", "Margin"]}
          rows={skuRows}
          emptyMsg="No sales data for this period"
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════════════════════════════════════
function Customers({ customers, setCustomers, sales }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", type: "Bar", creditLimit: 500 });

  const addCustomer = () => {
    if (!form.name) return;
    setCustomers(c => [...c, { ...form, id: uid(), creditBalance: 0, creditLimit: Number(form.creditLimit) }]);
    setShowAdd(false);
    setForm({ name: "", phone: "", type: "Bar", creditLimit: 500 });
  };

  return (
    <div>
      <SectionHeader title="Customer & Credit Management" action={<Btn onClick={() => setShowAdd(!showAdd)}><Icon d={Icons.plus} size={14} /> Add Customer</Btn>} />

      {showAdd && (
        <div style={{ background: C.card, border: `1.5px solid ${C.gold}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 16 }}>Add New Customer</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 16 }}>
            <Input label="Customer Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
            <Input label="Phone Number" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="024X XXX XXX" />
            <Select label="Business Type" value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))} options={["Bar", "Chop Bar", "Wholesaler", "Shop", "Individual"]} />
            <Input label="Credit Limit (GH₵)" value={form.creditLimit} onChange={v => setForm(f => ({ ...f, creditLimit: v }))} type="number" />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={addCustomer} variant="green">Save Customer</Btn>
            <Btn onClick={() => setShowAdd(false)} variant="outline">Cancel</Btn>
          </div>
        </div>
      )}

      <Table
        cols={["Customer", "Phone", "Type", "Credit Limit", "Outstanding Balance", "Credit Used", "Status"]}
        rows={customers.map(c => {
          const pct = c.creditLimit > 0 ? (c.creditBalance / c.creditLimit) * 100 : 0;
          return [
            <strong>{c.name}</strong>, c.phone,
            <Badge label={c.type} color={C.accent} />,
            fmt(c.creditLimit),
            <strong style={{ color: c.creditBalance > 0 ? C.orange : C.green }}>{fmt(c.creditBalance)}</strong>,
            <div style={{ width: 80 }}>
              <div style={{ height: 6, background: C.border, borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: pct > 80 ? C.red : pct > 50 ? C.orange : C.green, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 10, color: C.textSub }}>{pct.toFixed(0)}%</div>
            </div>,
            pct > 80 ? <Badge label="HIGH RISK" color={C.red} /> : c.creditBalance > 0 ? <Badge label="HAS DEBT" color={C.orange} /> : <Badge label="CLEAR" color={C.green} />
          ];
        })}
        emptyMsg="No customers yet"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════

// ── INSTITUTION HELPERS (Update 5) ───────────────────────────────────────────
function loadInstitution(key) {
  try { return JSON.parse(localStorage.getItem(key + "_inst")) || { name: "", address: "" }; } catch { return { name: "", address: "" }; }
}
function saveInstitution(key, inst) {
  try { localStorage.setItem(key + "_inst", JSON.stringify(inst)); } catch {}
}


// ── LICENCE EXPIRY BANNER (Update 8) ─────────────────────────────────────────
function ExpiryBanner({ expiry, phone }) {
  if (!expiry || expiry === "—") return null;
  const days = Math.ceil((new Date(expiry) - new Date()) / 86400000);
  if (days > 30) return null;
  const bg  = days <= 7 ? "#dc2626" : "#d97706";
  const msg = days <= 0
    ? `Licence has expired — contact ${phone||"0597147460"} to renew`
    : days <= 7
      ? `⚠ Licence expires in ${days} day${days!==1?"s":""} — renew immediately`
      : `Licence expires in ${days} day${days!==1?"s":""} — contact ${phone||"0597147460"} to renew`;
  return (
    <div style={{ background: bg, color: "#fff", textAlign: "center", padding: "7px 16px", fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>
      {msg}
    </div>
  );
}


// ── RESET MODAL (Update 1) ───────────────────────────────────────────────────
function ResetModal({ onConfirm, onCancel, adminPin, accent, cardBg }) {
  const [pin,  setPin]  = useState("");
  const [err,  setErr]  = useState("");
  const [step, setStep] = useState(1);
  const check = () => {
    if (!adminPin) { setErr("No admin PIN set yet. Complete the setup wizard first."); return; }
    if (pin !== String(adminPin)) { setErr("Incorrect PIN. Try again."); setPin(""); return; }
    setStep(2);
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, padding:20 }}>
      <div style={{ background: cardBg||"#1f2330", border:"1px solid #ef444455", borderRadius:14, padding:28, width:"min(94vw,400px)" }}>
        {step === 1 ? (<>
          <div style={{ fontSize:18, fontWeight:800, color:"#ef4444", marginBottom:8 }}>🔐 Admin PIN Required</div>
          <p style={{ fontSize:13, color:"#94a3b8", marginBottom:16 }}>Enter your admin PIN to access the reset function.</p>
          <input type="password" inputMode="numeric" maxLength={6} value={pin}
            onChange={e=>{setPin(e.target.value.replace(/\D/g,""));setErr("");}}
            onKeyDown={e=>e.key==="Enter"&&check()} placeholder="••••" autoFocus
            style={{ width:"100%", padding:12, background:"rgba(255,255,255,0.06)", border:`1.5px solid ${err?"#ef4444":"rgba(255,255,255,0.15)"}`, borderRadius:8, color:"#fff", fontSize:20, textAlign:"center", letterSpacing:6, outline:"none", boxSizing:"border-box", marginBottom:8, fontFamily:"inherit" }} />
          {err && <div style={{ color:"#fca5a5", fontSize:12, marginBottom:8 }}>{err}</div>}
          <div style={{ display:"flex", gap:10, marginTop:8 }}>
            <button onClick={onCancel} style={{ flex:1, padding:"10px 0", background:"transparent", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, color:"#94a3b8", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={check}    style={{ flex:1, padding:"10px 0", background:accent||"#2E86AB", color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Verify PIN</button>
          </div>
        </>) : (<>
          <div style={{ fontSize:18, fontWeight:800, color:"#ef4444", marginBottom:8 }}>⚠️ Confirm Full Reset</div>
          <p style={{ fontSize:13, color:"#94a3b8", marginBottom:6, lineHeight:1.7 }}>This will <strong style={{ color:"#ef4444" }}>permanently delete ALL data</strong> in this app — records, settings, everything.</p>
          <p style={{ fontSize:13, color:"#ef4444", fontWeight:700, marginBottom:20 }}>This cannot be undone.</p>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onCancel}  style={{ flex:1, padding:"10px 0", background:"transparent", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, color:"#94a3b8", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={onConfirm} style={{ flex:1, padding:"10px 0", background:"#dc2626", color:"#fff", border:"none", borderRadius:8, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>Delete All Data</button>
          </div>
        </>)}
      </div>
    </div>
  );
}

const BEV_STORAGE_KEY = "bevtrack_pro_data";
const bevLoad = () => { try { const r = localStorage.getItem(BEV_STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };

function App() {
  const saved = bevLoad();
  const [products, setProducts]     = useState(saved?.products     || INITIAL_PRODUCTS);
  const [sales, setSales]           = useState(saved?.sales        || INITIAL_SALES);
  const [deliveries, setDeliveries] = useState(saved?.deliveries   || INITIAL_DELIVERIES);
  const [customers, setCustomers]   = useState(saved?.customers    || INITIAL_CUSTOMERS);
  const [tab, setTab]               = useState("dashboard");
  const [showReset, setShowReset]   = useState(false);
  const [restorePreview, setRestorePreview] = useState(null);
  const [backupMsg, setBackupMsg]   = useState(null);
  const bevFileRef                  = useRef(null);

  // Persist all data to localStorage on any change
  useEffect(() => {
    try { localStorage.setItem(BEV_STORAGE_KEY, JSON.stringify({ products, sales, deliveries, customers })); } catch {}
  }, [products, sales, deliveries, customers]);

  const nav = [
    { id: "dashboard",  label: "Dashboard",        icon: Icons.dashboard },
    { id: "deliveries", label: "Truck Deliveries",  icon: Icons.truck },
    { id: "inventory",  label: "Inventory",         icon: Icons.box },
    { id: "pos",        label: "Point of Sale",     icon: Icons.pos },
    { id: "reports",    label: "Reports",           icon: Icons.chart },
    { id: "customers",  label: "Customers",         icon: Icons.users },
    { id: "backup",     label: "Backup & Restore",  icon: Icons.backup },
  ];

  const lowStockCount = products.filter(p => p.stock <= p.reorderLevel).length;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', -apple-system, sans-serif", background: C.bg, color: C.text }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: C.navy, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid #ffffff18` }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.gold }}>BevTrack</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginTop: -4 }}>Pro</div>
          <div style={{ fontSize: 10, color: C.textLight, marginTop: 4, letterSpacing: 1 }}>BEVERAGE MANAGEMENT</div>
        </div>

        {/* Licence Badge */}
        <div style={{ margin: "12px 16px", background: "#ffffff12", borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon d={Icons.lock} size={12} color={C.gold} />
            <span style={{ fontSize: 10, color: C.gold, fontWeight: 700 }}>LICENSED TO</span>
          </div>
          <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, marginTop: 2 }}>Accra Beverages Ltd</div>
          <div style={{ fontSize: 10, color: C.textLight }}>Licence: BVT-GH-00142</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 10px" }}>
          {nav.map(n => (
            <div key={n.id} onClick={() => setTab(n.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
                background: tab === n.id ? C.gold : "transparent",
                color: tab === n.id ? C.navy : "#ffffffb0",
                fontWeight: tab === n.id ? 800 : 500, fontSize: 13, position: "relative" }}
              onMouseEnter={e => { if (tab !== n.id) e.currentTarget.style.background = "#ffffff14"; }}
              onMouseLeave={e => { if (tab !== n.id) e.currentTarget.style.background = "transparent"; }}>
              <Icon d={n.icon} size={16} color={tab === n.id ? C.navy : "#ffffffb0"} />
              {n.label}
              {n.id === "inventory" && lowStockCount > 0 && (
                <span style={{ marginLeft: "auto", background: C.red, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{lowStockCount}</span>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: `1px solid #ffffff18` }}>
          <div style={{ fontSize: 10, color: C.textLight }}>© 2026 BevTrack Pro</div>
          <div style={{ fontSize: 10, color: C.textLight }}>Single-Business Licence</div>
          <div style={{ fontSize: 10, color: C.red, fontWeight: 700, marginTop: 2 }}>⚠ Not for redistribution</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ padding: "28px 32px", maxWidth: tab === "pos" ? "none" : 1100 }}>
          {tab === "dashboard" && <Dashboard products={products} sales={sales} deliveries={deliveries} customers={customers} />}
          {tab === "deliveries" && <Deliveries deliveries={deliveries} setDeliveries={setDeliveries} products={products} setProducts={setProducts} />}
          {tab === "inventory" && <Inventory products={products} setProducts={setProducts} />}
          {tab === "pos" && <POS products={products} setProducts={setProducts} sales={sales} setSales={setSales} customers={customers} />}
          {tab === "reports" && <Reports sales={sales} products={products} deliveries={deliveries} />}
          {tab === "customers" && <Customers customers={customers} setCustomers={setCustomers} sales={sales} />}
          {tab === "backup" && (() => {
            const allData = { products, sales, deliveries, customers };
            const download = () => {
              const blob = new Blob([JSON.stringify({ app: "BevTrack Pro", exportedAt: new Date().toISOString(), version: 1, data: allData }, null, 2)], { type: "application/json" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
              a.download = `BevTrackPro-backup-${new Date().toISOString().slice(0,10)}.json`;
              document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
              setBackupMsg({ type: "ok", text: `Backup downloaded — ${products.length} products, ${sales.length} sales, ${deliveries.length} deliveries.` });
              setTimeout(() => setBackupMsg(null), 5000);
            };
            const onFile = (e) => {
              const file = e.target.files[0]; if (!file) return;
              const reader = new FileReader();
              reader.onload = () => { try {
                const p = JSON.parse(reader.result);
                if (!p.data?.products) { setBackupMsg({ type: "err", text: "Not a valid BevTrack Pro backup file." }); setTimeout(() => setBackupMsg(null), 4000); return; }
                setRestorePreview(p);
              } catch { setBackupMsg({ type: "err", text: "Could not read file." }); setTimeout(() => setBackupMsg(null), 4000); } };
              reader.readAsText(file); e.target.value = "";
            };
            const exportCSV = () => {
              const rows = [["Product", "Category", "Unit", "Stock", "Reorder Level", "Cost (GH₵)", "Sell (GH₵)"]];
              products.forEach(p => rows.push([p.name, p.category, p.unit, p.stock, p.reorderLevel, p.costPrice, p.sellingPrice]));
              const csv = rows.map(r => r.map(c => `"${String(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
              const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
              a.download = `BevTrackPro-inventory-${new Date().toISOString().slice(0,10)}.csv`;
              document.body.appendChild(a); a.click(); a.remove();
              setBackupMsg({ type: "ok", text: "CSV exported." }); setTimeout(() => setBackupMsg(null), 3000);
            };
            return (
              <div style={{ maxWidth: 700 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.navy, marginBottom: 6 }}>💾 Backup & Restore</div>
                <p style={{ color: C.textSub, fontSize: 13, marginBottom: 24, lineHeight: 1.7 }}>All your BevTrack data (inventory, sales, deliveries, customers) is saved in this browser. Download backups regularly and store them safely — Google Drive, email, USB — to protect years of records.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: C.navy, marginBottom: 8 }}>⬇️ Export Backup</div>
                    <p style={{ fontSize: 12, color: C.textSub, marginBottom: 14, lineHeight: 1.6 }}>Downloads all data as a single JSON file.</p>
                    <button onClick={download} style={{ width: "100%", background: C.navy, color: C.gold, border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>⬇️ Download Backup (.json)</button>
                  </div>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: C.navy, marginBottom: 8 }}>⬆️ Restore from Backup</div>
                    <p style={{ fontSize: 12, color: C.textSub, marginBottom: 14, lineHeight: 1.6 }}>Select a .json backup file to restore all data.</p>
                    <label style={{ display: "block", textAlign: "center", padding: "10px 0", background: "#f1f5f9", border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, color: C.textSub }}>
                      📂 Choose Backup File…
                      <input ref={bevFileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={onFile} />
                    </label>
                  </div>
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: C.navy, marginBottom: 8 }}>📊 Export Inventory to CSV</div>
                  <p style={{ fontSize: 12, color: C.textSub, marginBottom: 14 }}>Export your current product list as a spreadsheet.</p>
                  <button onClick={exportCSV} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>📊 Export to CSV</button>
                </div>
                {backupMsg && (
                  <div style={{ padding: "12px 16px", borderRadius: 8, marginBottom: 12, background: backupMsg.type === "ok" ? "#f0fdf4" : "#fef2f2", color: backupMsg.type === "ok" ? "#15803d" : "#dc2626", fontSize: 13, fontWeight: 600, border: `1px solid ${backupMsg.type === "ok" ? "#bbf7d0" : "#fecaca"}` }}>
                    {backupMsg.type === "ok" ? "✅ " : "❌ "}{backupMsg.text}
                  </div>
                )}
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 11, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Current Data Summary</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                    {[["Products", products.length], ["Sales", sales.length], ["Deliveries", deliveries.length], ["Customers", customers.length]].map(([l,v]) => (
                      <div key={l} style={{ textAlign: "center", background: "#f8fafc", borderRadius: 8, padding: "12px 0" }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: C.navy }}>{v}</div>
                        <div style={{ fontSize: 11, color: C.textSub }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {restorePreview && (
                  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400 }} onClick={() => setRestorePreview(null)}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 440, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: C.navy, marginBottom: 10 }}>⚠️ Confirm Restore</div>
                      <p style={{ fontSize: 13, color: C.textSub, marginBottom: 8 }}>Backup from <strong>{new Date(restorePreview.exportedAt).toLocaleString()}</strong></p>
                      <p style={{ fontSize: 13, color: C.textSub, marginBottom: 20 }}>This replaces <strong style={{ color: C.red }}>all current data</strong> with the backup. This cannot be undone.</p>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => setRestorePreview(null)} style={{ flex: 1, background: "#f1f5f9", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 0", color: C.textSub, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                        <button onClick={() => {
                          const d = restorePreview.data;
                          setProducts(d.products || []); setSales(d.sales || []); setDeliveries(d.deliveries || []); setCustomers(d.customers || []);
                          setRestorePreview(null); setBackupMsg({ type: "ok", text: "Data restored successfully." }); setTimeout(() => setBackupMsg(null), 4000);
                        }} style={{ flex: 1, background: C.red, color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 700, cursor: "pointer" }}>✅ Yes, Restore</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── LICENSED EXPORT ────────────────────────────────────────────────────────
export default function LicencedApp() {
  return (
    <LicenceGate>
      <App />
    </LicenceGate>
  );
}
