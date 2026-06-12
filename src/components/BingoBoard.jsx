import { BingoTile } from "./BingoTile";

export function BingoBoard({ board, onTileComplete, disabled, completedPositions, lineCompletedPositions, replacedPositions }) {
  const rows = Array.isArray(board) ? board : [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 3, padding: "5px 7px" }}>
      {rows.map((row, r) =>
        Array.isArray(row)
          ? row.map((tile, c) =>
              tile ? (
                <BingoTile
                  key={`${r}-${c}-${tile.id}`}
                  tile={tile}
                  r={r}
                  c={c}
                  onComplete={onTileComplete}
                  noClick={disabled || tile.flipped || tile.completed}
                  isCompletedPosition={completedPositions && completedPositions[r * 5 + c]}
                  isLineCompleted={lineCompletedPositions && lineCompletedPositions[r * 5 + c]}
                  isReplaced={replacedPositions && replacedPositions[r * 5 + c]}
                />
              ) : (
                <div key={`${r}-${c}-empty`} />
              )
            )
          : null
      )}
    </div>
  );
}