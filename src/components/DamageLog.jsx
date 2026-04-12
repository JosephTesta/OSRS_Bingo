import { useEffect, useRef } from "react";

export function DamageLog({ log }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log.length]);
  return (
    <div ref={ref} className="panel" style={{ maxHeight: 90, overflowY: "auto", borderTop: "none", borderRadius: "0 0 3px 3px" }}>
      {log.length === 0 ? (
        <div style={{ textAlign: "center", color: "#2a1a00", padding: "6px 0", fontSize: 11 }}>No activity…</div>
      ) : (
        [...log].slice(-50).map(e => {
          const isRestore = e.type === "restore";
          const damageText = isRestore ? `+${e.damage}` : `-${e.damage}`;
          const damageColor = isRestore ? "#22c55e" : "#ef4444";
          const bossText = isRestore ? `Restored to ${e.boss}` : e.boss;
          const bonusText = !isRestore && e.bonusDamage > 0 ? ` (+${e.bonusDamage})` : "";
          return (
            <div key={e.id} className="log-row">
              <span style={{ color: "#4a3808" }}>{e.time}</span>{" "}
              <span style={{ color: damageColor, fontWeight: 600 }}>{damageText}</span>
              {!isRestore && e.bonusDamage > 0 && <span style={{ color: "#c8a951", fontWeight: 600 }}>{bonusText}</span>}
              {" "}
              <span style={{ color: "#6a5030" }}>→ {bossText}</span>
              {" "}
              <span style={{ color: "#3a2800" }}>{e.task}</span>
            </div>
          );
        })
      )}
    </div>
  );
}