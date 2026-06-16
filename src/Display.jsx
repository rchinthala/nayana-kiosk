import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "nayana-kiosk-content";

const fallbackData = {
  announcements: [{ id: 1, text: "Welcome! Connect the Admin Panel to manage this display.", active: true }],
  slides: [],
  schedule: [],
  media: [],
  settings: {
    slideDuration: 5,
    announcementDuration: 6,
    showClock: true,
    accentColor: "#6C63FF",
    orgName: "My Organization",
  },
};

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

function useKioskData() {
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await window.storage.get(STORAGE_KEY, true);
      setData(result ? JSON.parse(result.value) : fallbackData);
    } catch {
      setData(fallbackData);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000); // poll every 8s for live updates
    return () => clearInterval(interval);
  }, [load]);

  return data;
}

function Ticker({ announcements, duration, color }) {
  const [idx, setIdx] = useState(0);
  const active = announcements.filter(a => a.active);

  useEffect(() => {
    if (active.length < 2) return;
    const t = setInterval(() => setIdx(i => (i + 1) % active.length), duration * 1000);
    return () => clearInterval(t);
  }, [active.length, duration]);

  if (!active.length) return null;

  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, height: 64,
      background: "rgba(0,0,0,0.85)", borderTop: `3px solid ${color}`,
      display: "flex", alignItems: "center", gap: 0, overflow: "hidden",
    }}>
      <div style={{
        background: color, padding: "0 24px", height: "100%",
        display: "flex", alignItems: "center", fontWeight: 700,
        fontSize: 18, color: "#fff", whiteSpace: "nowrap", flexShrink: 0,
        letterSpacing: 1,
      }}>
        📢 ANNOUNCEMENT
      </div>
      <div key={idx} style={{
        flex: 1, padding: "0 32px", fontSize: 22, color: "#fff",
        fontWeight: 500, animation: "fadeSlide 0.5s ease",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {active[idx % active.length]?.text}
      </div>
      {active.length > 1 && (
        <div style={{ display: "flex", gap: 6, padding: "0 24px", flexShrink: 0 }}>
          {active.map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: i === idx % active.length ? color : "rgba(255,255,255,0.3)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

function SlideShow({ slides, duration, color, hasSchedule }) {
  const [idx, setIdx] = useState(0);
  const active = slides.filter(s => s.active);

  useEffect(() => {
    if (active.length < 2) return;
    const t = setInterval(() => setIdx(i => (i + 1) % active.length), duration * 1000);
    return () => clearInterval(t);
  }, [active.length, duration]);

  if (!active.length) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a14", color: "#374151", fontSize: 20 }}>
      No slides configured
    </div>
  );

  const slide = active[idx % active.length];

  return (
    <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
      <img
        key={slide.id}
        src={slide.url}
        alt={slide.caption}
        style={{
          width: "100%", height: "100%", objectFit: "cover",
          animation: "fadeIn 0.8s ease",
        }}
      />
      {slide.caption && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
          padding: "40px 40px 24px",
          color: "#fff", fontSize: hasSchedule ? 20 : 26, fontWeight: 500,
        }}>
          {slide.caption}
        </div>
      )}
      {active.length > 1 && (
        <div style={{
          position: "absolute", top: 16, right: 16,
          display: "flex", gap: 6,
        }}>
          {active.map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: i === idx % active.length ? color : "rgba(255,255,255,0.35)",
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

function SchedulePanel({ schedule, color, orgName }) {
  const active = schedule.filter(s => s.active);

  return (
    <div style={{
      width: 380, background: "rgba(10,10,20,0.95)", display: "flex",
      flexDirection: "column", borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ padding: "28px 28px 20px", borderBottom: "1px solid #1e1e2e" }}>
        <div style={{ fontSize: 12, color, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Today's Schedule</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#f1f5f9" }}>{orgName}</div>
      </div>
      <div style={{ flex: 1, overflowY: "hidden", padding: "16px 0" }}>
        {active.length === 0 ? (
          <div style={{ padding: "40px 28px", color: "#4b5563", fontSize: 16 }}>No events scheduled</div>
        ) : active.map((item, i) => (
          <div key={item.id} style={{
            padding: "14px 28px",
            borderBottom: i < active.length - 1 ? "1px solid #1a1a2a" : "none",
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <div style={{ fontSize: 13, color, fontWeight: 700, letterSpacing: 0.5 }}>{item.time}</div>
            <div style={{ fontSize: 17, color: "#f1f5f9", fontWeight: 600 }}>{item.event}</div>
            {item.room && <div style={{ fontSize: 13, color: "#6b7280" }}>📍 {item.room}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaPlayer({ media, muted }) {
  const active = media.filter(m => m.active);
  if (!active.length) return null;
  const item = active[0];
  if (item.type === "youtube") {
    // Rebuild iframe src when muted changes so YouTube picks it up
    const muteParam = muted ? "&mute=1" : "&mute=0";
    return (
      <iframe
        key={`yt-${muted}`}
        src={item.url + "?autoplay=1&loop=1&controls=0" + muteParam}
        style={{ width: "100%", height: "100%", border: "none" }}
        allow="autoplay"
        title={item.title}
      />
    );
  }
  return (
    <video
      key={`vid-${muted}`}
      src={item.url}
      autoPlay
      muted={muted}
      loop
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

export default function KioskDisplay() {
  const data = useKioskData();
  const time = useClock();
  const [view, setView] = useState("slides"); // slides | media
  const [muted, setMuted] = useState(true);   // audio off by default
  const [showAudioHint, setShowAudioHint] = useState(false);
  const viewTimer = useRef(null);

  useEffect(() => {
    if (!data) return;
    const hasMedia = data.media.some(m => m.active);
    const hasSlides = data.slides.some(s => s.active);
    if (!hasMedia || !hasSlides) return;
    // Alternate between slides and media
    viewTimer.current = setInterval(() => {
      setView(v => v === "slides" ? "media" : "slides");
    }, (data.settings.slideDuration * data.slides.filter(s => s.active).length + 15) * 1000);
    return () => clearInterval(viewTimer.current);
  }, [data]);

  if (!data) return (
    <div style={{ width: "100vw", height: "100vh", background: "#0a0a14", display: "flex", alignItems: "center", justifyContent: "center", color: "#6C63FF", fontSize: 24, fontFamily: "system-ui, sans-serif" }}>
      Loading display…
    </div>
  );

  const { settings, announcements, slides, schedule, media } = data;
  const { accentColor, showClock, orgName, slideDuration, announcementDuration } = settings;
  const hasSchedule = schedule.some(s => s.active);
  const hasActiveMedia = media.some(m => m.active);
  const hasActiveSlides = slides.some(s => s.active);

  const fmtTime = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtDate = time.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <div style={{
      width: "100vw", height: "100vh", background: "#0a0a14",
      display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: "'Inter', system-ui, sans-serif", color: "#f1f5f9",
      position: "relative",
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fadeSlide { from { opacity: 0; transform: translateX(20px) } to { opacity: 1; transform: translateX(0) } }
        * { box-sizing: border-box; margin: 0; padding: 0 }
      `}</style>

      {/* Top bar */}
      <div style={{
        height: 68, background: "rgba(0,0,0,0.9)", borderBottom: `3px solid ${accentColor}`,
        display: "flex", alignItems: "center", padding: "0 36px", gap: 20, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <div style={{ width: 36, height: 36, background: accentColor, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📺</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 20, lineHeight: 1 }}>{orgName}</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Information Display</div>
          </div>
        </div>
        {showClock && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1 }}>{fmtTime}</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{fmtDate}</div>
          </div>
        )}

        {/* Audio toggle — always visible in top bar */}
        <button
          onClick={() => { setMuted(m => !m); setShowAudioHint(true); setTimeout(() => setShowAudioHint(false), 2000); }}
          title={muted ? "Unmute audio" : "Mute audio"}
          style={{
            background: muted ? "rgba(255,255,255,0.08)" : accentColor,
            border: `1px solid ${muted ? "rgba(255,255,255,0.15)" : accentColor}`,
            borderRadius: 8, color: "#fff", cursor: "pointer",
            width: 44, height: 44, fontSize: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "background 0.2s, border 0.2s",
          }}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* Main body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Content area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          <div style={{ flex: 1, overflow: "hidden" }}>
            {view === "media" && hasActiveMedia ? (
              <MediaPlayer media={media} muted={muted} />
            ) : hasActiveSlides ? (
              <SlideShow slides={slides} duration={slideDuration} color={accentColor} hasSchedule={hasSchedule} />
            ) : hasActiveMedia ? (
              <MediaPlayer media={media} muted={muted} />
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#374151", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 48 }}>📺</div>
                <div style={{ fontSize: 20 }}>No content configured</div>
                <div style={{ fontSize: 14, color: "#4b5563" }}>Open the Admin Panel to add slides or media</div>
              </div>
            )}
          </div>
        </div>

        {/* Schedule sidebar */}
        {hasSchedule && (
          <SchedulePanel schedule={schedule} color={accentColor} orgName={orgName} />
        )}
      </div>

      {/* Audio hint toast */}
      {showAudioHint && (
        <div style={{
          position: "fixed", top: 80, right: 24, zIndex: 9999,
          background: "rgba(0,0,0,0.85)", border: `1px solid ${accentColor}`,
          borderRadius: 10, padding: "10px 18px",
          color: "#fff", fontSize: 15, fontWeight: 600,
          animation: "fadeIn 0.2s ease",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {muted ? "🔇 Audio muted" : "🔊 Audio on"}
        </div>
      )}

      {/* Announcement ticker */}
      <Ticker announcements={announcements} duration={announcementDuration} color={accentColor} />
    </div>
  );
}
