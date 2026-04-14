import { useState } from "react";

export function VictoryScreen({ winner, onReset }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const shareUrl = window.location.href;

  return (
    <div className="v-overlay">
      <div className="v-card panel-gold" style={{ padding: "42px 52px", maxWidth: 480, width: "92%" }}>
        <div style={{ fontSize: 64, marginBottom: 6 }}>🏆</div>
        <div style={{ fontSize: 22, color: "#6a5020", marginBottom: 12, letterSpacing: ".3em" }}>✦ ✦ ✦</div>
        <h2 className="cf v-glow" style={{ fontSize: "clamp(28px,5vw,44px)", color: "#c8a951", fontWeight: 900, marginBottom: 8 }}>
          VICTORY!
        </h2>
        <div className="cf" style={{ fontSize: 20, color: "#e8d5a0", marginBottom: 6 }}>{winner.name}</div>
        <div style={{ fontSize: 14, color: "#5a4020", fontStyle: "italic", marginBottom: 28 }}>
          has vanquished all bosses and claimed eternal glory!
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-blue" onClick={() => setShowShareModal(true)}>
            🔗 Share
          </button>
          <button className="btn btn-red" onClick={onReset}>
            ↩ New Event
          </button>
        </div>
      </div>

      {showShareModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }} onClick={() => setShowShareModal(false)}>
          <div style={{ background: "#1a0e00", padding: "30px", borderRadius: "8px", border: "1px solid #c8a951", maxWidth: "450px", width: "90%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#c8a951", marginBottom: "20px", fontFamily: "Cinzel, serif", fontSize: "20px" }}>Share This Game</h2>
            <p style={{ color: "#8b6520", marginBottom: "15px", fontSize: "13px" }}>
              Share this link with others to let them view the game.
            </p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
              <input
                type="text"
                value={shareUrl}
                readOnly
                style={{ flex: 1, fontSize: "12px", padding: "8px" }}
              />
              <button
                className="btn btn-amber"
                style={{ fontSize: "11px", padding: "8px 12px" }}
                onClick={() => { navigator.clipboard.writeText(shareUrl); }}
              >
                Copy
              </button>
            </div>
            <button className="btn" style={{ background: "#3a2800", borderColor: "#5a3a10", color: "#c8a951" }} onClick={() => setShowShareModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}