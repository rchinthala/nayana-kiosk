import { useState, useEffect, useCallback } from "react";

// ─── CONFIG — fill these in after Drive setup ─────────────────────────────────
const CONTENT_FILE_ID = "1CDdoa0Pz9dWsZmBouTYFkR7G5zMFZam5";  // kiosk-content.json (public viewer)
const AUTH_FILE_ID    = "1LWkLPOuJp-4N3XgOGLcG5i0DopJg7trk";      // kiosk-auth.json (private, viewer)
const API_KEY         = "AIzaSyDo3TJ5jaeCg8wa-Muyv8upNXN3M2yZkRY";    // Google Cloud API key (Drive read)

function driveUrl(fileId) {
  return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;
}

// ─── SESSION (tab-scoped, 8 hours) ───────────────────────────────────────────
const SK = "kiosk_sess";
const TTL = 8 * 60 * 60 * 1000;
const getSession  = () => { try { const s = JSON.parse(sessionStorage.getItem(SK)); return s && Date.now() < s.e ? true : null; } catch { return null; } };
const setSession  = () => sessionStorage.setItem(SK, JSON.stringify({ e: Date.now() + TTL }));
const clearSession = () => sessionStorage.removeItem(SK);

// ─── DEFAULT CONTENT ──────────────────────────────────────────────────────────
const defaultContent = {
  announcements: [
    { id: 1, text: "Welcome to our lobby!", active: true },
    { id: 2, text: "Office hours: Mon–Fri 9am–5pm", active: true },
  ],
  slides: [
    { id: 1, url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1280&q=80", caption: "Our Headquarters", active: true },
    { id: 2, url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1280&q=80", caption: "Conference Rooms Available", active: true },
  ],
  schedule: [
    { id: 1, time: "9:00 AM", event: "All-Hands Meeting", room: "Conf A", active: true },
    { id: 2, time: "11:00 AM", event: "Product Demo", room: "Conf B", active: true },
    { id: 3, time: "2:00 PM", event: "Training Session", room: "Conf A", active: true },
  ],
  media: [{ id: 1, type: "youtube", url: "https://www.youtube.com/embed/dQw4w9WgXcQ", title: "Company Intro", active: false }],
  settings: { slideDuration: 5, announcementDuration: 6, showClock: true, accentColor: "#6C63FF", orgName: "My Organization", slideFolderId: "" },
};

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0a14", surface: "#12121f", card: "#1a1a2e", border: "#252538",
  accent: "#6C63FF", text: "#f1f5f9", muted: "#94a3b8", dim: "#4b5563",
  error: "#ef4444", success: "#22c55e",
};

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const input = {
  background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
  color: C.text, padding: "11px 14px", fontSize: 14, outline: "none",
  width: "100%", boxSizing: "border-box", fontFamily: "inherit",
};
const cardRow = {
  display: "flex", alignItems: "center", gap: 12,
  background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px",
};
const btn = {
  background: C.accent, color: "#fff", border: "none", borderRadius: 8,
  padding: "11px 22px", cursor: "pointer", fontWeight: 600, fontSize: 14,
  whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit",
};
const ghostBtn = {
  background: "transparent", border: `1px solid ${C.border}`, color: C.dim,
  borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 13,
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};
const sH = { fontSize: 20, fontWeight: 700, marginBottom: 6, color: C.text };
const sD = { fontSize: 14, color: C.muted, marginBottom: 24 };

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
      background: value ? C.accent : C.border, transition: "background 0.2s",
      position: "relative", flexShrink: 0,
    }}>
      <span style={{
        position: "absolute", top: 3, left: value ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s", display: "block",
      }} />
    </button>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);

  const attempt = async () => {
    if (!username.trim() || !password) { setError("Enter your username and password."); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch(driveUrl(AUTH_FILE_ID));
      if (!res.ok) throw new Error("fetch_failed");
      const auth = await res.json();
      const users = Array.isArray(auth.users) ? auth.users : [auth];
      const ok = users.find(u => u.username === username.trim() && u.password === password);
      if (ok) { setSession(); onLogin(); }
      else setError("Incorrect username or password.");
    } catch (e) {
      if (e.message === "fetch_failed") setError("Could not load credentials. Check your AUTH_FILE_ID and API_KEY.");
      else setError("Login failed. Make sure your Drive file is readable.");
    }
    setBusy(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`* { box-sizing:border-box } @keyframes up { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } } input:focus { border-color:${C.accent}!important; outline:none!important }`}</style>
      <div style={{ width: 400, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "40px 36px", boxShadow: "0 24px 64px rgba(0,0,0,.5)", animation: "up .4s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, background: C.accent, borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 14 }}>📺</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: C.text }}>Nayana Kiosk</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Sign in to manage your display</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontWeight: 600, fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && attempt()}
            placeholder="admin" autoComplete="username" style={input} />
        </div>

        <div style={{ marginBottom: 22, position: "relative" }}>
          <label style={{ display: "block", fontWeight: 600, fontSize: 13, color: "#cbd5e1", marginBottom: 6 }}>Password</label>
          <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && attempt()} placeholder="••••••••" autoComplete="current-password"
            style={{ ...input, paddingRight: 44 }} />
          <button onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: 12, bottom: 11, background: "none", border: "none", cursor: "pointer", color: C.dim, fontSize: 16, padding: 0 }}>
            {showPass ? "🙈" : "👁️"}
          </button>
        </div>

        {error && (
          <div style={{ background: "#ef444415", border: `1px solid ${C.error}`, borderRadius: 8, padding: "10px 14px", marginBottom: 18, color: C.error, fontSize: 13 }}>
            {error}
          </div>
        )}

        <button onClick={attempt} disabled={busy} style={{ ...btn, width: "100%", padding: 13, fontSize: 15, opacity: busy ? 0.7 : 1, background: "linear-gradient(135deg,#6C63FF,#8b5cf6)" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <div style={{ marginTop: 22, background: C.card, borderRadius: 8, padding: 14, fontSize: 12, color: C.dim, lineHeight: 1.65 }}>
          <strong style={{ color: C.muted }}>To change credentials:</strong> Edit <code style={{ color: C.accent }}>kiosk-auth.json</code> in your Google Drive folder — no redeployment needed.
        </div>
      </div>
    </div>
  );
}

// ─── DATA HOOK ────────────────────────────────────────────────────────────────
function useData() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus]   = useState("idle"); // idle | saving | saved | error

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(driveUrl(CONTENT_FILE_ID));
        setData(r.ok ? await r.json() : defaultContent);
      } catch { setData(defaultContent); }
      setLoading(false);
    })();
  }, []);

  const save = useCallback(async (next) => {
    setData(next);
    setStatus("saving");
    try {
      const token = sessionStorage.getItem("gtoken");
      if (!token) throw new Error("no token");
      const r = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${CONTENT_FILE_ID}?uploadType=media`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(next, null, 2),
      });
      setStatus(r.ok ? "saved" : "error");
    } catch { setStatus("error"); }
    setTimeout(() => setStatus("idle"), 2500);
  }, []);

  return { data, save, loading, status };
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
function Announcements({ data, onSave }) {
  const [items, setItems] = useState(data.announcements);
  const [txt, setTxt] = useState("");
  const commit = u => { setItems(u); onSave({ ...data, announcements: u }); };
  const add    = () => { if (!txt.trim()) return; commit([...items, { id: Date.now(), text: txt.trim(), active: true }]); setTxt(""); };
  return (
    <div>
      <h2 style={sH}>Announcements</h2>
      <p style={sD}>Scroll as a ticker bar at the bottom of the display.</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Type an announcement…" style={input} />
        <button onClick={add} style={btn}>Add</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map(item => (
          <div key={item.id} style={{ ...cardRow, opacity: item.active ? 1 : 0.45 }}>
            <input value={item.text} onChange={e => commit(items.map(i => i.id === item.id ? { ...i, text: e.target.value } : i))}
              style={{ ...input, flex: 1, background: "transparent", border: "none", padding: "0 4px" }} />
            <Toggle value={item.active} onChange={() => commit(items.map(i => i.id === item.id ? { ...i, active: !i.active } : i))} />
            <button onClick={() => commit(items.filter(i => i.id !== item.id))} style={ghostBtn}>✕</button>
          </div>
        ))}
        {!items.length && <p style={{ color: C.dim, fontSize: 14 }}>No announcements yet.</p>}
      </div>
    </div>
  );
}

function Slides({ data, onSave }) {
  const [items, setItems] = useState(data.slides);
  const [url, setUrl] = useState(""); const [cap, setCap] = useState("");
  const commit = u => { setItems(u); onSave({ ...data, slides: u }); };
  const add    = () => { if (!url.trim()) return; commit([...items, { id: Date.now(), url: url.trim(), caption: cap.trim(), active: true }]); setUrl(""); setCap(""); };
  return (
    <div>
      <h2 style={sH}>Image Slideshow</h2>
      <p style={sD}>Images cycle automatically. Paste any direct image URL.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Image URL (https://…)" style={input} />
        <div style={{ display: "flex", gap: 10 }}>
          <input value={cap} onChange={e => setCap(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Caption (optional)" style={input} />
          <button onClick={add} style={btn}>Add</button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map(item => (
          <div key={item.id} style={{ ...cardRow, opacity: item.active ? 1 : 0.45, gap: 14 }}>
            <img src={item.url} alt="" style={{ width: 96, height: 60, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: C.card }} onError={e => e.target.style.opacity = 0.15} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 5, wordBreak: "break-all" }}>{item.url.slice(0, 60)}{item.url.length > 60 ? "…" : ""}</div>
              <input value={item.caption} onChange={e => commit(items.map(i => i.id === item.id ? { ...i, caption: e.target.value } : i))} placeholder="Caption" style={{ ...input, padding: "6px 8px", fontSize: 13 }} />
            </div>
            <Toggle value={item.active} onChange={() => commit(items.map(i => i.id === item.id ? { ...i, active: !i.active } : i))} />
            <button onClick={() => commit(items.filter(i => i.id !== item.id))} style={ghostBtn}>✕</button>
          </div>
        ))}
        {!items.length && <p style={{ color: C.dim, fontSize: 14 }}>No slides yet.</p>}
      </div>
    </div>
  );
}

function Schedule({ data, onSave }) {
  const [items, setItems] = useState(data.schedule);
  const [form, setForm]   = useState({ time: "", event: "", room: "" });
  const commit = u => { setItems(u); onSave({ ...data, schedule: u }); };
  const add    = () => { if (!form.time || !form.event) return; commit([...items, { id: Date.now(), ...form, active: true }]); setForm({ time: "", event: "", room: "" }); };
  return (
    <div>
      <h2 style={sH}>Schedule</h2>
      <p style={sD}>Today's events shown in the right-hand panel of the display.</p>
      <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 110px auto", gap: 10, marginBottom: 20, alignItems: "center" }}>
        <input value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} placeholder="9:00 AM" style={input} />
        <input value={form.event} onChange={e => setForm({ ...form, event: e.target.value })} placeholder="Event name" style={input} />
        <input value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} onKeyDown={e => e.key === "Enter" && add()} placeholder="Room" style={input} />
        <button onClick={add} style={btn}>Add</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(item => (
          <div key={item.id} style={{ ...cardRow, opacity: item.active ? 1 : 0.45 }}>
            <input value={item.time} onChange={e => commit(items.map(i => i.id === item.id ? { ...i, time: e.target.value } : i))}
              style={{ ...input, width: 100, flexShrink: 0, background: "transparent", border: "none", fontWeight: 700, color: C.accent, padding: "0 4px" }} />
            <input value={item.event} onChange={e => commit(items.map(i => i.id === item.id ? { ...i, event: e.target.value } : i))}
              style={{ ...input, flex: 1, background: "transparent", border: "none", padding: "0 4px" }} />
            <input value={item.room} onChange={e => commit(items.map(i => i.id === item.id ? { ...i, room: e.target.value } : i))}
              style={{ ...input, width: 100, flexShrink: 0, background: "transparent", border: "none", color: C.muted, padding: "0 4px" }} />
            <Toggle value={item.active} onChange={() => commit(items.map(i => i.id === item.id ? { ...i, active: !i.active } : i))} />
            <button onClick={() => commit(items.filter(i => i.id !== item.id))} style={ghostBtn}>✕</button>
          </div>
        ))}
        {!items.length && <p style={{ color: C.dim, fontSize: 14 }}>No events scheduled.</p>}
      </div>
    </div>
  );
}

function Media({ data, onSave }) {
  const [items, setItems] = useState(data.media);
  const [form, setForm]   = useState({ type: "youtube", url: "", title: "" });
  const commit = u => { setItems(u); onSave({ ...data, media: u }); };
  const add    = () => { if (!form.url || !form.title) return; commit([...items, { id: Date.now(), ...form, active: true }]); setForm({ type: "youtube", url: "", title: "" }); };
  return (
    <div>
      <h2 style={sH}>Media</h2>
      <p style={sD}>YouTube embeds or direct video URLs. First active item plays on the display.</p>
      <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr auto", gap: 10, marginBottom: 20, alignItems: "center" }}>
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={input}>
          <option value="youtube">YouTube</option>
          <option value="video">Video URL</option>
        </select>
        <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder={form.type === "youtube" ? "https://youtube.com/embed/…" : "https://…/video.mp4"} style={input} />
        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} onKeyDown={e => e.key === "Enter" && add()} placeholder="Title" style={input} />
        <button onClick={add} style={btn}>Add</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map(item => (
          <div key={item.id} style={{ ...cardRow, opacity: item.active ? 1 : 0.45 }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{item.type === "youtube" ? "▶️" : "🎬"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: C.dim, wordBreak: "break-all" }}>{item.url.slice(0, 70)}{item.url.length > 70 ? "…" : ""}</div>
            </div>
            <Toggle value={item.active} onChange={() => commit(items.map(i => i.id === item.id ? { ...i, active: !i.active } : i))} />
            <button onClick={() => commit(items.filter(i => i.id !== item.id))} style={ghostBtn}>✕</button>
          </div>
        ))}
        {!items.length && <p style={{ color: C.dim, fontSize: 14 }}>No media added yet.</p>}
      </div>
    </div>
  );
}

function Settings({ data, onSave }) {
  const [s, setS] = useState(data.settings);
  const upd = (f, v) => { const u = { ...s, [f]: v }; setS(u); onSave({ ...data, settings: u }); };
  const lbl = { display: "block", fontWeight: 600, fontSize: 13, color: "#cbd5e1", marginBottom: 6 };
  return (
    <div>
      <h2 style={sH}>Display Settings</h2>
      <p style={sD}>Controls how the Nayana kiosk looks and behaves.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 480 }}>
        <div><label style={lbl}>Organization name</label><input value={s.orgName} onChange={e => upd("orgName", e.target.value)} style={input} /></div>
        <div>
          <label style={lbl}>Accent color</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input type="color" value={s.accentColor} onChange={e => upd("accentColor", e.target.value)} style={{ width: 48, height: 40, border: "none", background: "none", cursor: "pointer", borderRadius: 6 }} />
            <code style={{ color: C.muted, fontSize: 14 }}>{s.accentColor}</code>
          </div>
        </div>
        <div><label style={lbl}>Slide duration — {s.slideDuration}s</label><input type="range" min={3} max={30} value={s.slideDuration} onChange={e => upd("slideDuration", +e.target.value)} style={{ width: "100%" }} /></div>
        <div><label style={lbl}>Announcement duration — {s.announcementDuration}s</label><input type="range" min={3} max={20} value={s.announcementDuration} onChange={e => upd("announcementDuration", +e.target.value)} style={{ width: "100%" }} /></div>
        <div>
          <label style={lbl}>
            🖼️ Drive slide folder ID
            <span style={{ fontWeight: 400, color: C.dim, marginLeft: 6 }}>(optional)</span>
          </label>
          <input
            value={s.slideFolderId || ""}
            onChange={e => upd("slideFolderId", e.target.value)}
            placeholder="Paste folder ID from Drive URL…"
            style={input}
          />
          <div style={{ fontSize: 12, color: C.dim, marginTop: 8, lineHeight: 1.6 }}>
            Upload images to a shared Drive folder and they appear in the slideshow automatically.
            Get the ID from the folder URL:<br />
            <code style={{ color: C.accent }}>drive.google.com/drive/folders/<strong>FOLDER_ID_HERE</strong></code>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ ...lbl, marginBottom: 0 }}>Show clock on display</label>
          <Toggle value={s.showClock} onChange={v => upd("showClock", v)} />
        </div>
      </div>
    </div>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ s }) {
  const m = { saving: [C.accent, "Saving…"], saved: [C.success, "Saved to Drive ✓"], error: [C.error, "Save failed — check token"], idle: [C.dim, "Changes save to Drive"] };
  const [color, label] = m[s] || m.idle;
  return <span style={{ fontSize: 12, color, transition: "color .3s" }}>{label}</span>;
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const TABS = ["announcements", "slides", "schedule", "media", "settings"];
const ICONS = { announcements: "📢", slides: "🖼️", schedule: "📅", media: "▶️", settings: "⚙️" };

export default function App() {
  const [authed, setAuthed] = useState(!!getSession());
  const [tab, setTab]       = useState("announcements");
  const { data, save, loading, status } = useData();

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  if (loading)  return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.accent, fontSize: 18, fontFamily: "system-ui" }}>Loading…</div>;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`* { box-sizing:border-box } input:focus,select:focus { border-color:${C.accent}!important; outline:none!important } ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}`}</style>

      {/* Header */}
      <header style={{ height: 64, borderBottom: `1px solid ${C.border}`, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, background: C.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>📺</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1 }}>Nayana Kiosk</div>
            <div style={{ fontSize: 12, color: C.accent, marginTop: 2 }}>{data?.settings?.orgName}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <StatusBadge s={status} />
          <button onClick={() => { clearSession(); setAuthed(false); }}
            style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            Sign out
          </button>
        </div>
      </header>

      <div style={{ display: "flex", height: "calc(100vh - 64px)" }}>
        {/* Sidebar */}
        <nav style={{ width: 200, borderRight: `1px solid ${C.border}`, padding: "20px 10px", display: "flex", flexDirection: "column", gap: 3, flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
              background: tab === t ? `${C.accent}22` : "transparent",
              color: tab === t ? C.accent : C.muted,
              fontWeight: tab === t ? 600 : 400, fontSize: 14, textAlign: "left",
            }}>
              <span>{ICONS[t]}</span>
              <span style={{ textTransform: "capitalize" }}>{t}</span>
              {t !== "settings" && data?.[t] && (
                <span style={{ marginLeft: "auto", fontSize: 11, background: C.card, padding: "2px 7px", borderRadius: 10, color: C.dim }}>
                  {data[t].filter(i => i.active).length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Content */}
        <main style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>
          {tab === "announcements" && <Announcements data={data} onSave={save} />}
          {tab === "slides"        && <Slides        data={data} onSave={save} />}
          {tab === "schedule"      && <Schedule      data={data} onSave={save} />}
          {tab === "media"         && <Media         data={data} onSave={save} />}
          {tab === "settings"      && <Settings      data={data} onSave={save} />}
        </main>
      </div>
    </div>
  );
}
