import { BingoTile } from "./BingoTile";

export function BingoBoard({ board, onTileComplete, disabled, completedPositions, lineCompletedPositions, replacedPositions, remoteFlashPositions }) {
  const rows = Array.isArray(board) ? board : [];
  const flashSet = new Set(remoteFlashPositions || []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 3, padding: "5px 7px" }}>
      {rows.map((row, r) =>
        Array.isArray(row)
          ? row.map((tile, c) =>
              tile ? (
                (() => {
                  const isReplacedFlag = replacedPositions && replacedPositions[r * 5 + c];
                  const isCompletedPos = completedPositions && completedPositions[r * 5 + c];
                  const isLineComp = lineCompletedPositions && lineCompletedPositions[r * 5 + c];
                  const noClickFlag = disabled || (tile.flipped || tile.completed);
                  const isFlashing = flashSet.has(r * 5 + c);
                  return (
                    <BingoTile
                      key={`${r}-${c}-${tile.id}`}
                      tile={tile}
                      r={r}
                      c={c}
                      onComplete={onTileComplete}
                      noClick={noClickFlag}
                      isCompletedPosition={isCompletedPos}
                      isLineCompleted={isLineComp}
                      isReplaced={isReplacedFlag}
                      isFlashing={isFlashing}
                    />
                  );
                })()
              ) : (
                <div key={`${r}-${c}-empty`} />
              )
            )
          : null
      )}
    </div>
  );
}