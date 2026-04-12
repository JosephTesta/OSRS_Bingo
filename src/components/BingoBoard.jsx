import { BingoTile } from "./BingoTile";

export function BingoBoard({ board, onTileComplete, disabled, completedPositions, lineCompletedPositions }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 3, padding: "5px 7px" }}>
      {board.map((row, r) =>
        row.map((tile, c) => (
          <BingoTile
            key={`${r}-${c}-${tile.id}`}
            tile={tile}
            r={r}
            c={c}
            onComplete={onTileComplete}
            noClick={disabled || tile.flipped || tile.completed}
            isCompletedPosition={completedPositions && completedPositions[r * 5 + c]}
            isLineCompleted={lineCompletedPositions && lineCompletedPositions[r * 5 + c]}
          />
        ))
      )}
    </div>
  );
}