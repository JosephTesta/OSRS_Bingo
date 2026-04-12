import { hpPct, hpColor } from "../utils/gameUtils";

export function BossBar({ boss, active, shaking, onClick }) {
  const pct = hpPct(boss.currentHp, boss.maxHp);
  const col = hpColor(boss.currentHp, boss.maxHp);
  return (
    <div
      className={`panel${boss.defeated ? " boss-defeated" : active ? " boss-active" : ""}${shaking ? " boss-shake" : ""}`}
      style={{ padding: "6px 8px", cursor: boss.defeated ? "default" : "pointer", position: "relative" }}
      onClick={() => !boss.defeated && onClick && onClick(boss.id)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 28,
              height: 28,
              flexShrink: 0,
              borderRadius: 2,
              overflow: "hidden",
              background: "#0d0800",
              border: "1px solid #3a2000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={boss.img}
              alt={boss.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                imageRendering: "pixelated",
                filter: boss.defeated ? "grayscale(1) brightness(.35)" : "drop-shadow(0 1px 2px rgba(0,0,0,.8))",
              }}
              onError={e => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div>
            <div className="cf" style={{ fontSize: 9, color: "#c8a951", fontWeight: 600, lineHeight: 1.2 }}>
              {boss.name}
            </div>
            <div style={{ fontSize: 8, color: "#5a4020" }}>
              {boss.defeated ? "⚔ DEFEATED" : active ? "◀ Active" : "Click to target"}
            </div>
          </div>
        </div>
        <div className="cf" style={{ fontSize: 9, textAlign: "right", color: boss.defeated ? "#3a2a10" : col }}>
          <span style={{ fontWeight: 700 }}>{boss.defeated ? 0 : boss.currentHp.toLocaleString()}</span>
          <span style={{ color: "#3a2800", fontSize: 8 }}>/{boss.maxHp.toLocaleString()}</span>
        </div>
      </div>
      <div className="hp-track" style={{ height: 9 }}>
        <div className="hp-fill" style={{ width: `${pct}%`, background: col }} />
      </div>
    </div>
  );
}