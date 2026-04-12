import { TeamCard } from "./TeamCard";
import { VictoryScreen } from "./VictoryScreen";

export function GameView({ gs, dispatch, onReset, onExport }) {
  const { teams, winner } = gs;
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "10px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <h1 className="cf" style={{ fontSize: "clamp(15px,2.8vw,24px)", color: "#c8a951", fontWeight: 900, textShadow: "2px 2px 0 #000" }}>
          ⚔ OSRS Bingo Boss Event
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-blue" style={{ fontSize: 11, padding: "6px 14px" }} onClick={onExport}>
            📄 Export
          </button>
          <button className="btn btn-red" style={{ fontSize: 11, padding: "6px 14px" }} onClick={onReset}>
            ↩ Reset
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
        {teams.map(team => (
          <TeamCard
            key={team.id}
            team={team}
            disabled={!!winner}
            undoFlash={gs.undoFlashTeamId === team.id}
            onTileComplete={(teamId, r, c) => dispatch({ type: "TILE_CLICK", teamId, r, c })}
            onSetActiveBoss={(teamId, bossId) => dispatch({ type: "SET_ACTIVE_BOSS", teamId, bossId })}
            onUndo={teamId => dispatch({ type: "UNDO", teamId })}
          />
        ))}
      </div>

      {winner && <VictoryScreen winner={winner} onReset={onReset} onExport={onExport} />}
    </div>
  );
}