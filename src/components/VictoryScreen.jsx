export function VictoryScreen({ winner, onReset, onExport }) {
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
          <button className="btn btn-green" onClick={onExport}>
            📄 Export Results
          </button>
          <button className="btn btn-red" onClick={onReset}>
            ↩ New Event
          </button>
        </div>
      </div>
    </div>
  );
}