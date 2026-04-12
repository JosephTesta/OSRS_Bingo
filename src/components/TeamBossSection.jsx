import { BossBar } from "./BossBar";

export function TeamBossSection({ bosses, activeBossIndex, damageFloats, onSetActive }) {
  return (
    <div style={{ padding: "6px 7px", borderBottom: "1px solid #3a2800" }}>
      <div className="cf" style={{ fontSize: 8, color: "#5a4020", letterSpacing: ".08em", marginBottom: 5 }}>⚔ BOSS HP — CLICK TO TARGET</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {bosses.map((boss, idx) => (
          <div key={boss.id} style={{ position: "relative" }}>
            <BossBar
              boss={boss}
              active={idx === activeBossIndex && !boss.defeated}
              shaking={damageFloats.some(f => f.bossId === boss.id && f.teamId === undefined)}
              onClick={onSetActive}
            />
            {damageFloats
              .filter(f => f.bossId === boss.id)
              .map(f => (
                <span key={f.id} className="dmg-float" style={{ top: "4px", left: f.leftPct + "%", fontSize: f.fontSize + "px" }}>
                  -{f.damage}
                </span>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}