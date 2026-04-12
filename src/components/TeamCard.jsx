import { BingoBoard } from "./BingoBoard";
import { TeamBossSection } from "./TeamBossSection";
import { DamageLog } from "./DamageLog";

export function TeamCard({ team, onTileComplete, onSetActiveBoss, onUndo, disabled, undoFlash }) {
  const done = team.board.flat().filter(t => t.completed || t.flipped).length;
  const canUndo = team.history.length > 0 && !disabled;
  const allDone = team.bosses.every(b => b.defeated);

  return (
    <div
      className={`panel${undoFlash ? " undo-flash" : ""}`}
      style={{ flex: "1 1 265px", minWidth: 252, overflow: "hidden", border: allDone ? "2px solid #c8a951" : undefined }}
    >
      {/* Header */}
      <div
        style={{
          padding: "6px 10px",
          borderBottom: "1px solid #3a2800",
          background: "linear-gradient(90deg,rgba(200,169,81,.07),transparent)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {allDone && <span style={{ fontSize: 14 }}>🏆</span>}
          <span className="cf" style={{ fontSize: 13, color: allDone ? "#f0d080" : "#c8a951", fontWeight: 700 }}>
            {team.name}
          </span>
          {allDone && <span className="cf" style={{ fontSize: 9, color: "#c8a951", letterSpacing: ".08em" }}>VICTORIOUS</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: "#5a4020" }}>{done}/25 ✓</span>
          <button
            className="btn btn-amber"
            style={{ fontSize: 9, padding: "3px 9px" }}
            disabled={!canUndo}
            title={canUndo ? `Undo last tile (${team.history.length} available)` : "Nothing to undo"}
            onClick={() => onUndo(team.id)}
          >
            ↩ Undo{team.history.length > 0 ? ` (${team.history.length})` : ""}
          </button>
        </div>
      </div>

      {/* Per-team boss HP */}
      <TeamBossSection bosses={team.bosses} activeBossIndex={team.activeBossIndex} damageFloats={team.damageFloats || []} onSetActive={bossId => onSetActiveBoss(team.id, bossId)} />

      {/* Board */}
      <BingoBoard
        board={team.board}
        onTileComplete={(r, c) => onTileComplete(team.id, r, c)}
        disabled={disabled || allDone}
        completedPositions={team.completedPositions}
        lineCompletedPositions={team.lineCompletedPositions}
      />

      {/* Log */}
      <div style={{ padding: "0 7px 6px" }}>
        <div className="cf" style={{ fontSize: 9, color: "#5a4020", letterSpacing: ".07em", padding: "3px 0 3px 1px", borderTop: "1px solid #3a2800" }}>
          DAMAGE LOG
        </div>
        <DamageLog log={team.log} />
      </div>
    </div>
  );
}