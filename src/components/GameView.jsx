import { TeamCard } from "./TeamCard";
import { VictoryScreen } from "./VictoryScreen";
import { useState } from "react";

export function GameView({ gs, dispatch, onReset, onExport, isAdmin = true }) {
  const { teams, winner } = gs;
  const [showShareModal, setShowShareModal] = useState(false);

  const shareUrl = window.location.href;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "10px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <h1 className="cf" style={{ fontSize: "clamp(15px,2.8vw,24px)", color: "#c8a951", fontWeight: 900, textShadow: "2px 2px 0 #000" }}>
          ⚔ OSRS Bingo Boss Event
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-blue" style={{ fontSize: 11, padding: "6px 14px" }} onClick={() => setShowShareModal(true)}>
            🔗 Share
          </button>
          {isAdmin && (
            <>
              <button className="btn btn-red" style={{ fontSize: 11, padding: "6px 14px" }} onClick={onReset}>
                ↩ Reset
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
        {teams.map(team => (
          <TeamCard
            key={team.id}
            team={team}
            disabled={!!winner || !isAdmin}
            undoFlash={gs.undoFlashTeamId === team.id}
            onTileComplete={(teamId, r, c) => isAdmin && dispatch({ type: "TILE_CLICK", teamId, r, c })}
            onSetActiveBoss={(teamId, bossId) => isAdmin && dispatch({ type: "SET_ACTIVE_BOSS", teamId, bossId })}
            onUndo={teamId => isAdmin && dispatch({ type: "UNDO", teamId })}
            isAdmin={isAdmin}
          />
        ))}
      </div>

      {winner && <VictoryScreen winner={winner} onReset={onReset} />}

      {showShareModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => setShowShareModal(false)}>
          <div style={{ background: "#1a0e00", padding: "30px", borderRadius: "8px", border: "1px solid #c8a951", maxWidth: "450px", width: "90%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#c8a951", marginBottom: "20px", fontFamily: "Cinzel, serif", fontSize: "20px" }}>Share This Game</h2>
            <p style={{ color: "#8b6520", marginBottom: "15px", fontSize: "13px" }}>
              Share this link with others to let them view the game. Use admin login to make changes.
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