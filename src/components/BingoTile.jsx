import { useState, useEffect, useRef } from "react";

export function BingoTile({ tile, r, c, onComplete, noClick, isCompletedPosition, isLineCompleted }) {
  const [animCls, setAnimCls] = useState("");
  const prevId = useRef(tile.id);

  useEffect(() => {
    if (tile.id !== prevId.current && tile.isNew) {
      setAnimCls("tile-new");
      const t = setTimeout(() => setAnimCls(""), 500);
      prevId.current = tile.id;
      return () => clearTimeout(t);
    }
    prevId.current = tile.id;
  }, [tile.id, tile.isNew]);

  const isDone = tile.flipped || tile.completed;
  const showBack = isDone;
  const clickable = !noClick && !isDone;

  const showCompletedOutline = isDone && (isCompletedPosition || isLineCompleted);

  const showOutline = isCompletedPosition || isLineCompleted;

  return (
    <div
      className={`tile-scene ${!clickable ? "no-hover" : ""}`}
      style={{
        width: "100%",
        aspectRatio: "1",
        outline: showOutline ? (isLineCompleted ? "2px solid #f59e0b" : "2px solid #c8a951") : "none",
        outlineOffset: showOutline ? "2px" : "0",
        boxShadow: showOutline ? (isLineCompleted ? "0 0 10px rgba(245,158,11,0.6)" : "0 0 8px rgba(200,168,75,0.5)") : "none",
      }}
      onClick={() => clickable && onComplete(r, c)}
    >
      <div className={`tile-card ${showBack ? "is-flipped" : ""} ${!clickable ? "no-click" : ""} ${animCls}`} style={{ width: "100%", height: "100%" }}>
        <div className={`tile-face tile-front ${tile.completed ? "is-done" : ""}`}>
          {tile.completed ? (
            <span style={{ fontSize: 18, color: "#1f5c1f" }}>✓</span>
          ) : (
            <span
              style={{
                fontSize: 9,
                lineHeight: 1.3,
                textAlign: "center",
                color: "#c8a951",
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {tile.task}
            </span>
          )}
        </div>
        <div className={`tile-face tile-back ${tile.completed ? "is-done" : ""}`}>
          <span className="cf" style={{ fontWeight: 900, fontSize: 18, color: "#f87171", textShadow: "2px 2px 0 #000" }}>
            -{tile.damage}
          </span>
          <span style={{ fontSize: 8, color: "#7a2a2a", marginTop: 2, fontFamily: "'Cinzel',serif", letterSpacing: "0.05em" }}>DMG</span>
        </div>
      </div>
    </div>
  );
}