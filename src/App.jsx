import { useState, useEffect, useCallback, useRef } from "react";
import { DEFAULT_TASKS } from "./data/tasks";
import { BOSSES_DATA } from "./data/bosses";

const TASK_POOL = DEFAULT_TASKS.map(t => t.description);

// ═══════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════

const uid     = () => Math.random().toString(36).slice(2, 9);
const randInt = (mn, mx) => Math.floor(Math.random() * (mx - mn + 1)) + mn;
const fmtTime = () => new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" });

const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const makeTile = (task, dMin, dMax, isNew = false) => ({
  id: uid(), task,
  damage: randInt(dMin, dMax), flipped: false, completed: false, isNew,
});

const makeBoard = (pool, dMin, dMax) => {
  const picked = shuffle(pool).slice(0, 25);
  const board  = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => ({
      id: uid(), task: picked[r * 5 + c],
      damage: randInt(dMin, dMax), flipped: false, completed: false, isNew: false,
    }))
  );
  return { board, exhaustedTasks: [...picked], completedPositions: Array(25).fill(false) };
};

const makeBosses = (selectedBosses) =>
  selectedBosses.map(b => ({ ...b, currentHp: b.maxHp, defeated: false }));

// Snapshot everything needed to fully restore a team's state on undo
const snapshotTeam = (t) => ({
  bosses:          t.bosses.map(b => ({ ...b })),
  activeBossIndex: t.activeBossIndex,
  board:           t.board.map(row => row.map(tile => ({ ...tile }))),
  exhaustedTasks:  [...t.exhaustedTasks],
  completedPositions: [...(t.completedPositions || Array(25).fill(false))],
});

const hpPct   = (cur, max) => Math.max(0, Math.min(100, (cur / max) * 100));
const hpColor = (cur, max) => {
  const p = cur / max;
  return p > 0.5 ? "#22c55e" : p > 0.25 ? "#f59e0b" : "#ef4444";
};

// ═══════════════════════════════════════════════════════════
//  GLOBAL STYLES
// ═══════════════════════════════════════════════════════════

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:#060300;font-family:'Crimson Text',Georgia,serif;color:#c8a951;min-height:100vh;}
.cf{font-family:'Cinzel','Times New Roman',serif;}

::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-track{background:#080400;}
::-webkit-scrollbar-thumb{background:#3a2800;border-radius:3px;}

input,textarea{background:#0d0800;border:1px solid #3a2800;color:#c8a951;font-family:'Crimson Text',serif;font-size:14px;border-radius:3px;outline:none;padding:6px 10px;}
input:focus,textarea:focus{border-color:#8b6520;box-shadow:0 0 8px rgba(200,169,81,.15);}
input[type=checkbox]{accent-color:#c8a951;width:14px;height:14px;cursor:pointer;}
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}
input[type=number]{-moz-appearance:textfield;}
textarea{resize:vertical;}

.panel{background:linear-gradient(145deg,#1a0e00,#100800);border:1px solid #4a3010;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,.6),inset 0 1px 0 rgba(200,160,80,.06);}
.panel-gold{background:linear-gradient(145deg,#1a0e00,#100800);border:2px solid #c8a951;border-radius:4px;box-shadow:0 6px 30px rgba(0,0,0,.7),0 0 30px rgba(200,169,81,.08),inset 0 1px 0 rgba(200,160,80,.12);}

.btn{font-family:'Cinzel',serif;background:linear-gradient(180deg,#2d1a00,#1a0e00);border:1px solid #6b4a18;color:#c8a951;padding:7px 18px;cursor:pointer;font-size:12px;letter-spacing:.06em;text-transform:uppercase;border-radius:3px;transition:all .15s;display:inline-flex;align-items:center;gap:6px;}
.btn:hover:not(:disabled){background:linear-gradient(180deg,#4a2d00,#2d1a00);border-color:#c8a951;box-shadow:0 0 12px rgba(200,169,81,.25);transform:translateY(-1px);}
.btn:active:not(:disabled){transform:translateY(0);}
.btn:disabled{opacity:.4;cursor:not-allowed;}
.btn-red{border-color:#7a2020;color:#fca5a5;}
.btn-red:hover:not(:disabled){background:linear-gradient(180deg,#3d0000,#200000);border-color:#fca5a5;box-shadow:0 0 12px rgba(252,165,165,.2);}
.btn-green{border-color:#207a20;color:#86efac;}
.btn-green:hover:not(:disabled){background:linear-gradient(180deg,#003d00,#002000);border-color:#86efac;box-shadow:0 0 12px rgba(134,239,172,.2);}
.btn-blue{border-color:#20507a;color:#93c5fd;}
.btn-blue:hover:not(:disabled){background:linear-gradient(180deg,#00203d,#001020);border-color:#93c5fd;box-shadow:0 0 12px rgba(147,197,253,.2);}
.btn-amber{border-color:#7a5a10;color:#fcd34d;}
.btn-amber:hover:not(:disabled){background:linear-gradient(180deg,#3d2800,#1e1400);border-color:#fcd34d;box-shadow:0 0 12px rgba(252,211,77,.2);}

/* ── Tile 3‑D flip ── */
.tile-scene{perspective:600px;}
.tile-card{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .55s cubic-bezier(.4,0,.2,1);cursor:pointer;}
.tile-card.is-flipped{transform:rotateY(180deg);}
.tile-card.no-click{cursor:default;}
.tile-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:3px;padding:3px;overflow:hidden;}
.tile-front{background:linear-gradient(145deg,#241500,#160c00);border:1px solid #5a3a10;transition:border-color .15s,box-shadow .15s;}
.tile-scene:not(.no-hover):hover .tile-front{border-color:#c8a951;box-shadow:0 0 8px rgba(200,169,81,.2);}
.tile-front.is-done{background:linear-gradient(145deg,#001800,#000e00)!important;border-color:#1a4a1a!important;box-shadow:none!important;}
.tile-back{background:linear-gradient(145deg,#1f0000,#0e0000);border:1px solid #7a1a1a;transform:rotateY(180deg);}
.tile-back.is-done{opacity:.38;border-color:#3a1010;background:linear-gradient(145deg,#0a0000,#050000);}
.tile-new{animation:tileIn .45s cubic-bezier(.34,1.36,.64,1) both;}
@keyframes tileIn{from{opacity:0;transform:scale(.55) rotateY(-20deg);}to{opacity:1;transform:scale(1) rotateY(0);}}

/* ── HP bar ── */
.hp-track{background:#1a0800;border:1px solid #3a2000;border-radius:2px;overflow:hidden;position:relative;}
.hp-fill{height:100%;transition:width .7s cubic-bezier(.4,0,.2,1),background-color .5s;position:relative;}
.hp-fill::after{content:'';position:absolute;top:0;left:0;right:0;height:45%;background:rgba(255,255,255,.1);}

/* ── Damage float ── */
.dmg-float{position:absolute;pointer-events:none;font-family:'Cinzel',serif;font-weight:900;color:#fca5a5;text-shadow:2px 2px 0 #000,0 0 10px rgba(255,60,60,.7);animation:floatUp 1.5s ease-out forwards;z-index:50;white-space:nowrap;}
@keyframes floatUp{0%{opacity:1;transform:translateY(0) scale(1);}15%{opacity:1;transform:translateY(-12px) scale(1.4);}100%{opacity:0;transform:translateY(-60px) scale(.85);}}

/* ── Boss effects ── */
.boss-shake{animation:bShake .35s cubic-bezier(.36,.07,.19,.97) both;}
@keyframes bShake{10%,90%{transform:translate3d(-1px,0,0);}20%,80%{transform:translate3d(3px,0,0);}30%,50%,70%{transform:translate3d(-3px,0,0);}40%,60%{transform:translate3d(3px,0,0);}}
.boss-active{animation:bGlow 2.5s ease-in-out infinite;}
@keyframes bGlow{0%,100%{border-color:#c8a951;box-shadow:0 0 8px rgba(200,169,81,.3);}50%{border-color:#f0d080;box-shadow:0 0 18px rgba(240,208,128,.55);}}
.boss-defeated{filter:grayscale(1) brightness(.3);transition:filter .8s;}

/* ── Log ── */
.log-row{font-family:'Crimson Text',serif;font-size:12px;padding:2px 6px;border-bottom:1px solid rgba(90,58,16,.2);animation:logIn .3s ease-out;}
@keyframes logIn{from{opacity:0;transform:translateX(-8px);}to{opacity:1;transform:translateX(0);}}

/* ── Victory ── */
.v-overlay{position:fixed;inset:0;background:rgba(0,0,0,.87);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(6px);}
.v-card{animation:vIn .75s cubic-bezier(.34,1.56,.64,1);text-align:center;}
@keyframes vIn{from{opacity:0;transform:scale(.2) rotate(-8deg);}to{opacity:1;transform:scale(1) rotate(0);}}
.v-glow{animation:vGlow 2s ease-in-out infinite alternate;}
@keyframes vGlow{from{text-shadow:0 0 20px rgba(200,169,81,.5),2px 2px 0 #000;}to{text-shadow:0 0 50px rgba(255,210,60,1),0 0 100px rgba(255,180,0,.5),2px 2px 0 #000;}}

/* ── Tabs ── */
.tab-btn{font-family:'Cinzel',serif;font-size:11px;padding:7px 14px;background:transparent;border:1px solid #3a2800;border-bottom:none;color:#5a4020;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;transition:all .15s;border-radius:3px 3px 0 0;}
.tab-btn:hover,.tab-btn.active{background:linear-gradient(180deg,#3d2200,#1e1100);border-color:#8b6520;color:#c8a951;}
.tab-btn.active{margin-bottom:-1px;z-index:1;position:relative;}

/* ── Undo flash ── */
.undo-flash{animation:undoFlash .5s ease-out;}
@keyframes undoFlash{0%{box-shadow:0 0 0 2px rgba(252,211,77,.8);}100%{box-shadow:none;}}
`;

// ═══════════════════════════════════════════════════════════
//  BingoTile
// ═══════════════════════════════════════════════════════════

function BingoTile({ tile, r, c, onComplete, noClick, isCompletedPosition }) {
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

  const showBack  = tile.flipped || tile.completed;
  const clickable = !noClick && !tile.flipped && !tile.completed;
  const isDone = tile.flipped || tile.completed;

  return (
    <div
      className={`tile-scene ${!clickable ? "no-hover" : ""}`}
      style={{ 
        width:"100%", 
        aspectRatio:"1",
        outline: isCompletedPosition && !isDone ? "2px solid #c8a951" : "none",
        outlineOffset: isCompletedPosition && !isDone ? "2px" : "0",
        boxShadow: isCompletedPosition && !isDone ? "0 0 8px rgba(200,168,75,0.5)" : "none",
      }}
      onClick={() => clickable && onComplete(r, c)}
    >
      <div className={`tile-card ${showBack ? "is-flipped" : ""} ${!clickable ? "no-click" : ""} ${animCls}`}
        style={{ width:"100%", height:"100%" }}>
        <div className={`tile-face tile-front ${tile.completed ? "is-done" : ""}`}>
          {tile.completed ? (
            <span style={{ fontSize:18, color:"#1f5c1f" }}>✓</span>
          ) : (
            <span style={{
              fontSize:9, lineHeight:1.3, textAlign:"center", color:"#c8a951",
              display:"-webkit-box", WebkitLineClamp:4, WebkitBoxOrient:"vertical", overflow:"hidden",
            }}>
              {tile.task}
            </span>
          )}
        </div>
        <div className={`tile-face tile-back ${tile.completed ? "is-done" : ""}`}>
          <span className="cf" style={{ fontWeight:900, fontSize:18, color:"#f87171", textShadow:"2px 2px 0 #000" }}>
            -{tile.damage}
          </span>
          <span style={{ fontSize:8, color:"#7a2a2a", marginTop:2, fontFamily:"'Cinzel',serif", letterSpacing:"0.05em" }}>
            DMG
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  BingoBoard
// ═══════════════════════════════════════════════════════════

function BingoBoard({ board, onTileComplete, disabled, completedPositions }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:3, padding:"5px 7px" }}>
      {board.map((row, r) =>
        row.map((tile, c) => (
          <BingoTile key={`${r}-${c}-${tile.id}`} tile={tile} r={r} c={c}
            onComplete={onTileComplete}
            noClick={disabled || tile.flipped || tile.completed}
            isCompletedPosition={completedPositions && completedPositions[r * 5 + c]} />
        ))
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  BossBar
// ═══════════════════════════════════════════════════════════

function BossBar({ boss, active, shaking, onClick }) {
  const pct = hpPct(boss.currentHp, boss.maxHp);
  const col = hpColor(boss.currentHp, boss.maxHp);
  return (
    <div
      className={`panel${boss.defeated ? " boss-defeated" : active ? " boss-active" : ""}${shaking ? " boss-shake" : ""}`}
      style={{ padding:"6px 8px", cursor:boss.defeated?"default":"pointer", position:"relative" }}
      onClick={() => !boss.defeated && onClick && onClick(boss.id)}
    >
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{
            width:28, height:28, flexShrink:0, borderRadius:2, overflow:"hidden",
            background:"#0d0800", border:"1px solid #3a2000",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <img src={boss.img} alt={boss.name}
              style={{ width:"100%", height:"100%", objectFit:"contain", imageRendering:"pixelated",
                filter: boss.defeated ? "grayscale(1) brightness(.35)" : "drop-shadow(0 1px 2px rgba(0,0,0,.8))" }}
              onError={e => { e.currentTarget.style.display="none"; }}
            />
          </div>
          <div>
            <div className="cf" style={{ fontSize:9, color:"#c8a951", fontWeight:600, lineHeight:1.2 }}>{boss.name}</div>
            <div style={{ fontSize:8, color:"#5a4020" }}>
              {boss.defeated ? "⚔ DEFEATED" : active ? "◀ Active" : "Click to target"}
            </div>
          </div>
        </div>
        <div className="cf" style={{ fontSize:9, textAlign:"right", color:boss.defeated?"#3a2a10":col }}>
          <span style={{ fontWeight:700 }}>{boss.defeated?0:boss.currentHp.toLocaleString()}</span>
          <span style={{ color:"#3a2800", fontSize:8 }}>/{boss.maxHp.toLocaleString()}</span>
        </div>
      </div>
      <div className="hp-track" style={{ height:9 }}>
        <div className="hp-fill" style={{ width:`${pct}%`, background:col }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  TeamBossSection  (each team's own boss HP panel)
// ═══════════════════════════════════════════════════════════

function TeamBossSection({ bosses, activeBossIndex, damageFloats, onSetActive }) {
  return (
    <div style={{ padding:"6px 7px", borderBottom:"1px solid #3a2800" }}>
      <div className="cf" style={{ fontSize:8, color:"#5a4020", letterSpacing:".08em", marginBottom:5 }}>
        ⚔ BOSS HP — CLICK TO TARGET
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {bosses.map((boss, idx) => (
          <div key={boss.id} style={{ position:"relative" }}>
            <BossBar boss={boss} active={idx === activeBossIndex && !boss.defeated}
              shaking={damageFloats.some(f => f.bossId === boss.id && f.teamId === undefined)}
              onClick={onSetActive} />
            {damageFloats.filter(f => f.bossId === boss.id).map(f => (
              <span key={f.id} className="dmg-float"
                style={{ top:"4px", left:f.leftPct+"%", fontSize:f.fontSize+"px" }}>
                -{f.damage}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  DamageLog
// ═══════════════════════════════════════════════════════════

function DamageLog({ log }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [log.length]);
  return (
    <div ref={ref} className="panel"
      style={{ maxHeight:90, overflowY:"auto", borderTop:"none", borderRadius:"0 0 3px 3px" }}>
      {log.length === 0
        ? <div style={{ textAlign:"center", color:"#2a1a00", padding:"6px 0", fontSize:11 }}>No activity…</div>
        : [...log].slice(-50).map(e => {
            const isRestore = e.type === 'restore';
            const damageText = isRestore ? `+${e.damage}` : `-${e.damage}`;
            const damageColor = isRestore ? "#22c55e" : "#ef4444";
            const bossText = isRestore ? `Restored to ${e.boss}` : e.boss;
            const bonusText = !isRestore && e.bonusDamage > 0 ? ` (+${e.bonusDamage})` : '';
            return (
              <div key={e.id} className="log-row">
                <span style={{ color:"#4a3808" }}>{e.time}</span>{" "}
                <span style={{ color:damageColor, fontWeight:600 }}>{damageText}</span>
                {!isRestore && e.bonusDamage > 0 && <span style={{ color:"#c8a951", fontWeight:600 }}>{bonusText}</span>}
                {" "}<span style={{ color:"#6a5030" }}>→ {bossText}</span>
                {" "}<span style={{ color:"#3a2800" }}>{e.task}</span>
              </div>
            );
          })
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  TeamCard
// ═══════════════════════════════════════════════════════════

function TeamCard({ team, onTileComplete, onSetActiveBoss, onUndo, disabled, undoFlash }) {
  const done      = team.board.flat().filter(t => t.completed || t.flipped).length;
  const canUndo   = team.history.length > 0 && !disabled;
  const allDone   = team.bosses.every(b => b.defeated);

  return (
    <div className={`panel${undoFlash ? " undo-flash" : ""}`}
      style={{ flex:"1 1 265px", minWidth:252, overflow:"hidden",
        border: allDone ? "2px solid #c8a951" : undefined }}>

      {/* Header */}
      <div style={{
        padding:"6px 10px", borderBottom:"1px solid #3a2800",
        background:"linear-gradient(90deg,rgba(200,169,81,.07),transparent)",
        display:"flex", justifyContent:"space-between", alignItems:"center", gap:6,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {allDone && <span style={{ fontSize:14 }}>🏆</span>}
          <span className="cf" style={{ fontSize:13, color: allDone ? "#f0d080" : "#c8a951", fontWeight:700 }}>
            {team.name}
          </span>
          {allDone && (
            <span className="cf" style={{ fontSize:9, color:"#c8a951", letterSpacing:".08em" }}>VICTORIOUS</span>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:10, color:"#5a4020" }}>{done}/25 ✓</span>
          <button
            className="btn btn-amber"
            style={{ fontSize:9, padding:"3px 9px" }}
            disabled={!canUndo}
            title={canUndo ? `Undo last tile (${team.history.length} available)` : "Nothing to undo"}
            onClick={() => onUndo(team.id)}
          >
            ↩ Undo{team.history.length > 0 ? ` (${team.history.length})` : ""}
          </button>
        </div>
      </div>

      {/* Per-team boss HP */}
      <TeamBossSection
        bosses={team.bosses}
        activeBossIndex={team.activeBossIndex}
        damageFloats={team.damageFloats || []}
        onSetActive={(bossId) => onSetActiveBoss(team.id, bossId)}
      />

      {/* Board */}
      <BingoBoard board={team.board}
        onTileComplete={(r, c) => onTileComplete(team.id, r, c)}
        disabled={disabled || allDone}
        completedPositions={team.completedPositions} />

      {/* Log */}
      <div style={{ padding:"0 7px 6px" }}>
        <div className="cf" style={{ fontSize:9, color:"#5a4020", letterSpacing:".07em",
          padding:"3px 0 3px 1px", borderTop:"1px solid #3a2800" }}>DAMAGE LOG</div>
        <DamageLog log={team.log} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  VictoryScreen
// ═══════════════════════════════════════════════════════════

function VictoryScreen({ winner, onReset, onExport }) {
  return (
    <div className="v-overlay">
      <div className="v-card panel-gold" style={{ padding:"42px 52px", maxWidth:480, width:"92%" }}>
        <div style={{ fontSize:64, marginBottom:6 }}>🏆</div>
        <div style={{ fontSize:22, color:"#6a5020", marginBottom:12, letterSpacing:".3em" }}>✦ ✦ ✦</div>
        <h2 className="cf v-glow" style={{ fontSize:"clamp(28px,5vw,44px)", color:"#c8a951", fontWeight:900, marginBottom:8 }}>
          VICTORY!
        </h2>
        <div className="cf" style={{ fontSize:20, color:"#e8d5a0", marginBottom:6 }}>{winner.name}</div>
        <div style={{ fontSize:14, color:"#5a4020", fontStyle:"italic", marginBottom:28 }}>
          has vanquished all bosses and claimed eternal glory!
        </div>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <button className="btn btn-green" onClick={onExport}>📄 Export Results</button>
          <button className="btn btn-red"   onClick={onReset}>↩ New Event</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  AdminPanel
// ═══════════════════════════════════════════════════════════

function AdminPanel({ onStart }) {
  const [tab, setTab]               = useState("bosses");
  const [selBosses, setSelBosses]   = useState(["zulrah","vorkath"]);
  const [teamCount, setTeamCount]   = useState(2);
  const [teamNames, setTeamNames]   = useState([
    "Team Alpha","Team Bravo","Team Charlie","Team Delta","Team Echo","Team Foxtrot"
  ]);
  const [dMin, setDMin]             = useState(50);
  const [dMax, setDMax]             = useState(200);
  const [dMinRaw, setDMinRaw]       = useState("50");
  const [dMaxRaw, setDMaxRaw]       = useState("200");
  const [rowBonusDamage, setRowBonusDamage] = useState(50);
  const [enableRowBonus, setEnableRowBonus] = useState(true);
  const dRangeValid                 = dMin > 0 && dMax > 0 && dMin < dMax;
  const [replacement, setReplacement] = useState(true);
  const [sequential, setSequential]   = useState(true);
  const [taskDifficulties, setTaskDifficulties] = useState(new Set());
  const [taskCategories, setTaskCategories] = useState(new Set());
  const filteredTasks = taskDifficulties.size === 0 && taskCategories.size === 0 
    ? DEFAULT_TASKS.filter(t => t.isDefault)
    : DEFAULT_TASKS.filter(t => (taskDifficulties.size === 0 || taskDifficulties.has(t.difficulty)) && (taskCategories.size === 0 || taskCategories.has(t.category)));
  const [taskText, setTaskText]     = useState(filteredTasks.map(t => t.description).join("\n"));
  const [tasks, setTasks]           = useState(filteredTasks.map(t => t.description));

  const toggleBoss = id =>
    setSelBosses(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const toggleTaskDifficulty = (difficulty) => {
    const newSet = new Set(taskDifficulties);
    if (newSet.has(difficulty)) {
      newSet.delete(difficulty);
    } else {
      newSet.add(difficulty);
    }
    setTaskDifficulties(newSet);
  };

  const toggleTaskCategory = (category) => {
    const newSet = new Set(taskCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setTaskCategories(newSet);
  };

  // Update tasks when filters change
  useEffect(() => {
    const newFilteredTasks = taskDifficulties.size === 0 && taskCategories.size === 0
      ? DEFAULT_TASKS.filter(t => t.isDefault)
      : DEFAULT_TASKS.filter(t => (taskDifficulties.size === 0 || taskDifficulties.has(t.difficulty)) && (taskCategories.size === 0 || taskCategories.has(t.category)));
    const newTaskDescriptions = newFilteredTasks.map(t => t.description);
    setTasks(newTaskDescriptions);
    setTaskText(newTaskDescriptions.join("\n"));
  }, [taskDifficulties, taskCategories]);

  const handleTaskChange = val => {
    setTaskText(val);
    setTasks(val.split("\n").map(t => t.trim()).filter(Boolean));
  };

  const canStart = selBosses.length > 0 && tasks.length >= 25 && dRangeValid;

  const handleStart = () => {
    if (!canStart) return;
    onStart({
      selectedBosses: BOSSES_DATA.filter(b => selBosses.includes(b.id)),
      teamNames: teamNames.slice(0, teamCount).map((n, i) => n.trim() || `Team ${i + 1}`),
      settings: { dMin, dMax, replacement, sequential, rowBonusDamage, enableRowBonus, tasks },
    });
  };

  const tabs = [
    { id:"bosses",   label:"⚔ Bosses"   },
    { id:"teams",    label:"🛡 Teams"    },
    { id:"settings", label:"⚙ Settings"  },
    { id:"tasks",    label:"📜 Tasks"    },
  ];

  return (
    <div style={{ maxWidth:860, margin:"0 auto", padding:"24px 14px" }}>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <h1 className="cf" style={{
          fontSize:"clamp(22px,4.5vw,42px)", fontWeight:900, color:"#c8a951",
          textShadow:"0 0 40px rgba(200,169,81,.35),2px 2px 0 #000",
          letterSpacing:".07em", marginBottom:8,
        }}>
          ⚔ OSRS BINGO BOSS EVENT ⚔
        </h1>
        <p style={{ color:"#5a4020", fontSize:14, fontStyle:"italic" }}>
          Configure your teams, select your prey, and let the chaos begin.
        </p>
      </div>

      <div style={{ display:"flex", gap:2, borderBottom:"1px solid #3a2800" }}>
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="panel" style={{ padding:18, borderRadius:"0 3px 3px 3px", minHeight:320 }}>

        {/* BOSSES */}
        {tab === "bosses" && (
          <div>
            <p style={{ fontSize:13, color:"#6a5030", marginBottom:14 }}>
              Select bosses — each team must defeat all of them to win. ({selBosses.length} selected)
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(168px,1fr))", gap:8 }}>
              {BOSSES_DATA.map(b => {
                const sel = selBosses.includes(b.id);
                return (
                  <div key={b.id} onClick={() => toggleBoss(b.id)} style={{
                    display:"flex", alignItems:"center", gap:8, padding:"8px 10px",
                    borderRadius:3, border:"1px solid", cursor:"pointer", transition:"all .15s",
                    borderColor: sel ? "#c8a951" : "#3a2800",
                    background: sel
                      ? "linear-gradient(135deg,rgba(200,169,81,.1),rgba(61,34,0,.5))"
                      : "linear-gradient(135deg,#130900,#080400)",
                  }}>
                    <div style={{
                      width:32, height:32, flexShrink:0, background:"#0d0800",
                      border:"1px solid #2a1800", borderRadius:2, overflow:"hidden",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      <img src={b.img} alt={b.name}
                        style={{ width:"100%", height:"100%", objectFit:"contain", imageRendering:"pixelated" }}
                        onError={e => { e.currentTarget.style.display="none"; }}
                      />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="cf" style={{ fontSize:10, color:sel?"#c8a951":"#6a5030", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{b.name}</div>
                      <div style={{ fontSize:10, color:sel?"#c8a951":"#6a5030" }}>❤ {b.maxHp.toLocaleString()}</div>
                    </div>
                    {sel && <span style={{ color:"#c8a951", fontSize:13, flexShrink:0 }}>✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TEAMS */}
        {tab === "teams" && (
          <div>
            <p style={{ fontSize:13, color:"#6a5030", marginBottom:12 }}>Number of teams</p>
            <div style={{ display:"flex", gap:6, marginBottom:20 }}>
              {[2,3,4,5,6].map(n => (
                <button key={n} className="btn" style={{
                  padding:"6px 16px",
                  borderColor: teamCount===n ? "#c8a951" : "#6b4a18",
                  background:  teamCount===n ? "linear-gradient(180deg,#4a2d00,#2d1a00)" : undefined,
                  color:       teamCount===n ? "#f0d080" : "#c8a951",
                }} onClick={() => setTeamCount(n)}>{n}</button>
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {Array.from({ length:teamCount }, (_, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span className="cf" style={{ color:"#5a4020", fontSize:11, width:55, textAlign:"right" }}>
                    Team {i+1}
                  </span>
                  <input type="text" value={teamNames[i]||""} style={{ width:220 }}
                    placeholder={`Team ${i+1}`}
                    onChange={e => { const n=[...teamNames]; n[i]=e.target.value; setTeamNames(n); }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
            <div>
              <p style={{ fontSize:13, color:"#6a5030", marginBottom:10 }}>
                Tile Damage Range
                {dRangeValid && <span style={{ color:"#c8a951" }}> — {dMin} to {dMax}</span>}
              </p>
              <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
                {[
                  { lbl:"Min", raw:dMinRaw, other:dMax, setRaw:setDMinRaw, setVal:setDMin, isMin:true },
                  { lbl:"Max", raw:dMaxRaw, other:dMin, setRaw:setDMaxRaw, setVal:setDMax, isMin:false },
                ].map(({ lbl, raw, other, setRaw, setVal, isMin }) => {
                  const parsed = parseInt(raw, 10);
                  const isEmpty = raw.trim() === "";
                  const isInvalid = !isEmpty && (isNaN(parsed) || parsed < 1 ||
                    (isMin ? parsed >= other : parsed <= other));
                  return (
                    <div key={lbl}>
                      <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13 }}>
                        <span style={{ color:"#5a4020", width:28 }}>{lbl}</span>
                        <input type="text" inputMode="numeric" value={raw}
                          onChange={e => {
                            const v = e.target.value.replace(/[^0-9]/g, "");
                            setRaw(v);
                            const n = parseInt(v, 10);
                            if (!isNaN(n) && n >= 1) setVal(n);
                          }}
                          style={{ width:90, borderColor: isInvalid ? "#7a2020" : isEmpty ? "#5a3808" : "#3a2800" }}
                          placeholder="e.g. 50" />
                      </label>
                      {isInvalid && (
                        <p style={{ fontSize:11, color:"#ef4444", marginTop:4, marginLeft:36 }}>
                          {isMin ? (parsed >= other ? "Must be less than max" : "Must be at least 1")
                                 : (parsed <= other ? "Must be greater than min" : "Must be at least 1")}
                        </p>
                      )}
                      {isEmpty && <p style={{ fontSize:11, color:"#7a5020", marginTop:4, marginLeft:36 }}>Enter a number</p>}
                    </div>
                  );
                })}
              </div>
              {!dRangeValid && !(dMinRaw.trim()==="" || dMaxRaw.trim()==="") && (
                <p style={{ fontSize:11, color:"#ef4444", marginTop:8 }}>
                  ⚠ Min must be lower than Max before you can start.
                </p>
              )}
            </div>

            {[
              { val:replacement, set:setReplacement,
                label:"Tile Replacement", desc:"Completed tiles are replaced with fresh random tasks (never repeating)" },
              { val:sequential, set:setSequential,
                label:"Sequential Bosses", desc:"Auto-advance to next boss when current is defeated" },
              { val:enableRowBonus, set:setEnableRowBonus,
                label:"Row Completion Bonus", desc:"Award bonus damage when completing rows, columns, or diagonals", hasInput:true },
            ].map(item => (
              <div key={item.label}>
                <label style={{ display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer" }}>
                  <input type="checkbox" checked={item.val} onChange={e=>item.set(e.target.checked)} style={{ marginTop:3 }}/>
                  <div>
                    <div style={{ fontSize:14, color:"#c8a951" }}>{item.label}</div>
                    <div style={{ fontSize:12, color:"#5a4020" }}>{item.desc}</div>
                  </div>
                </label>
                {item.hasInput && enableRowBonus && (
                  <div style={{ marginLeft:30, marginTop:8, paddingLeft:10, borderLeft:"2px solid rgba(200,168,75,0.2)" }}>
                    <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
                      <span style={{ color:"#5a4020", width:60 }}>Bonus Damage:</span>
                      <input type="text" inputMode="numeric" value={rowBonusDamage}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g, "");
                          setRowBonusDamage(v === "" ? 0 : parseInt(v, 10));
                        }}
                        style={{ width:80 }}
                        placeholder="e.g. 50" />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TASKS */}
        {tab === "tasks" && (
          <div>
            <p style={{ fontSize:13, color:"#6a5030", marginBottom:14 }}>
              Filter tasks by difficulty and category. ({filteredTasks.length} available)
            </p>

            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
              <div>
                <p style={{ fontSize:12, color:"#5a4020", marginBottom:6 }}>Difficulty</p>
                <div style={{ display:"flex", gap:12 }}>
                  {['easy', 'medium', 'hard', 'elite'].map(diff => (
                    <label key={diff} style={{ display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
                      <input type="checkbox" checked={taskDifficulties.has(diff)}
                        onChange={() => toggleTaskDifficulty(diff)} />
                      <span style={{ fontSize:12, color:"#c8a951", textTransform:"capitalize" }}>{diff}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize:12, color:"#5a4020", marginBottom:6 }}>Category</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
                  {['combat', 'skilling', 'achievement', 'minigame'].map(cat => (
                    <label key={cat} style={{ display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
                      <input type="checkbox" checked={taskCategories.has(cat)}
                        onChange={() => toggleTaskCategory(cat)} />
                      <span style={{ fontSize:12, color:"#c8a951", textTransform:"capitalize" }}>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <p style={{ fontSize:13, color:"#6a5030" }}>
                {tasks.length} tasks selected
                {tasks.length < 25 && <span style={{ color:"#ef4444" }}> — need at least 25!</span>}
              </p>
              <button className="btn" style={{ fontSize:11 }}
                onClick={() => {
                  setTaskDifficulties(new Set());
                  setTaskCategories(new Set());
                }}>
                Restore Default
              </button>
            </div>

            <div style={{ maxHeight:200, overflowY:"auto", border:"1px solid #3a2800", padding:8, background:"#0d0800" }}>
              {filteredTasks.map(task => (
                <div key={task.id} style={{ fontSize:11, color:"#6a5030", marginBottom:4, padding:2, borderBottom:"1px solid #1a1000" }}>
                  <span style={{ color:"#3a2800" }}>[{task.category}]</span> {task.description}
                  <span style={{
                    float:"right",
                    color: task.difficulty === 'easy' ? '#22c55e' : task.difficulty === 'medium' ? '#f59e0b' : '#ef4444',
                    fontWeight:"bold"
                  }}>
                    {task.difficulty}
                  </span>
                </div>
              ))}
            </div>

            <p style={{ fontSize:11, color:"#5a4020", marginTop:8 }}>
              Or edit manually below:
            </p>
            <textarea value={taskText} onChange={e=>handleTaskChange(e.target.value)}
              style={{ width:"100%", height:100, fontSize:12, marginTop:4 }}
              placeholder="One task per line (minimum 25)" />
          </div>
        )}
      </div>

      <div style={{ textAlign:"center", marginTop:24 }}>
        <button className="btn btn-green" style={{ fontSize:14, padding:"12px 48px" }}
          onClick={handleStart} disabled={!canStart}>
          ⚔ BEGIN THE EVENT ⚔
        </button>
        {!canStart && (
          <p style={{ color:"#7a2a2a", fontSize:12, marginTop:8 }}>
            {selBosses.length===0 ? "Select at least one boss"
             : tasks.length<25   ? "Need at least 25 tasks in pool"
             : "Fix damage range: Min must be a positive number less than Max"}
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  GameView
// ═══════════════════════════════════════════════════════════

function GameView({ gs, dispatch, onReset, onExport }) {
  const { teams, winner } = gs;
  return (
    <div style={{ maxWidth:1400, margin:"0 auto", padding:"10px 10px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:10, flexWrap:"wrap", gap:8 }}>
        <h1 className="cf" style={{
          fontSize:"clamp(15px,2.8vw,24px)", color:"#c8a951",
          fontWeight:900, textShadow:"2px 2px 0 #000" }}>
          ⚔ OSRS Bingo Boss Event
        </h1>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn btn-blue" style={{ fontSize:11, padding:"6px 14px" }} onClick={onExport}>📄 Export</button>
          <button className="btn btn-red"  style={{ fontSize:11, padding:"6px 14px" }} onClick={onReset}>↩ Reset</button>
        </div>
      </div>

      <div style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"flex-start" }}>
        {teams.map(team => (
          <TeamCard
            key={team.id}
            team={team}
            disabled={!!winner}
            undoFlash={gs.undoFlashTeamId === team.id}
            onTileComplete={(teamId, r, c) => dispatch({ type:"TILE_CLICK", teamId, r, c })}
            onSetActiveBoss={(teamId, bossId) => dispatch({ type:"SET_ACTIVE_BOSS", teamId, bossId })}
            onUndo={(teamId) => dispatch({ type:"UNDO", teamId })}
          />
        ))}
      </div>

      {winner && <VictoryScreen winner={winner} onReset={onReset} onExport={onExport} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  ROOT APP
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = "osrs_bingo_v5";

export default function App() {
  const [phase, setPhase] = useState("setup");
  const [gs, setGs]       = useState(null);
  const timers            = useRef({});

  // Inject CSS
  useEffect(() => {
    const el = document.createElement("style");
    el.innerHTML = CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  // Restore from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const { phase: p, gs: g } = JSON.parse(raw);
      if (p === "game" && g) {
        const clean = {
          ...g,
          undoFlashTeamId: null,
          teams: g.teams.map(t => ({
            ...t,
            damageFloats: [],
            board: t.board.map(row => row.map(tile => ({ ...tile, isNew: false }))),
          })),
        };
        setGs(clean);
        setPhase("game");
      }
    } catch {}
  }, []);

  // Persist
  useEffect(() => {
    if (phase === "game" && gs) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ phase, gs })); } catch {}
    }
  }, [phase, gs]);

  // ── Start game ──────────────────────────────────────────
  const handleStart = useCallback(({ selectedBosses, teamNames, settings }) => {
    setGs({
      teams: teamNames.map(name => {
        const { board, exhaustedTasks } = makeBoard(settings.tasks, settings.dMin, settings.dMax);
        return {
          id: uid(),
          name,
          board,
          exhaustedTasks,
          bosses: makeBosses(selectedBosses),
          activeBossIndex: 0,
          damageFloats: [],
          log: [],
          history: [],   // undo stack: each entry is a full team snapshot
        };
      }),
      settings,
      winner: null,
      undoFlashTeamId: null,
    });
    setPhase("game");
  }, []);

  // ── Dispatch ─────────────────────────────────────────────
  const dispatch = useCallback(action => {

    // ── SET_ACTIVE_BOSS (per team) ──
    if (action.type === "SET_ACTIVE_BOSS") {
      const { teamId, bossId } = action;
      setGs(g => {
        if (!g) return g;
        const teams = g.teams.map(t => {
          if (t.id !== teamId) return t;
          const idx = t.bosses.findIndex(b => b.id === bossId && !b.defeated);
          return idx === -1 ? t : { ...t, activeBossIndex: idx };
        });
        return { ...g, teams };
      });
    }

    // ── UNDO ──
    if (action.type === "UNDO") {
      const { teamId } = action;
      // Cancel any pending tile-replacement timer for this team
      Object.keys(timers.current).forEach(k => {
        if (k.startsWith(teamId)) {
          clearTimeout(timers.current[k]);
          delete timers.current[k];
        }
      });
      setGs(g => {
        if (!g) return g;
        const teams = g.teams.map(t => {
          if (t.id !== teamId) return t;
          if (t.history.length === 0) return t;
          const history  = [...t.history];
          const snapshot = history.pop();

          // Compute restored damage
          const damagedBossIdx = snapshot.activeBossIndex;
          const dmg_restored = snapshot.bosses[damagedBossIdx].currentHp - t.bosses[damagedBossIdx].currentHp;

          // Find the undone tile
          let undoneTask = '';
          for (let ri = 0; ri < t.board.length; ri++) {
            for (let ci = 0; ci < t.board[ri].length; ci++) {
              if (t.board[ri][ci].flipped && !snapshot.board[ri][ci].flipped) {
                undoneTask = t.board[ri][ci].task;
                break;
              }
            }
            if (undoneTask) break;
          }

          const restoreLogEntry = {
            id: uid(),
            time: fmtTime(),
            damage: dmg_restored,
            boss: snapshot.bosses[damagedBossIdx].name,
            task: undoneTask,
            type: 'restore'
          };

          return {
            ...t,
            bosses:          snapshot.bosses,
            activeBossIndex: snapshot.activeBossIndex,
            board:           snapshot.board,
            exhaustedTasks:  snapshot.exhaustedTasks,
            log:             [...t.log, restoreLogEntry],
            damageFloats:    [],
            history,
          };
        });
        // Check if undo killed a winner state
        const winner = g.winner && teams.find(t => t.id === g.winner.id)?.bosses.every(b => b.defeated)
          ? g.winner : null;
        return { ...g, teams, winner, undoFlashTeamId: teamId };
      });
      // Clear flash after animation
      setTimeout(() => setGs(g => g ? { ...g, undoFlashTeamId: null } : g), 600);
    }

    // ── TILE_CLICK ──
    if (action.type === "TILE_CLICK") {
      const { teamId, r, c } = action;

      setGs(g => {
        if (!g || g.winner) return g;
        const team = g.teams.find(t => t.id === teamId);
        if (!team) return g;
        const tile = team.board[r][c];
        if (tile.flipped || tile.completed) return g;
        const boss = team.bosses[team.activeBossIndex];
        if (!boss || boss.defeated) return g;

        let dmg = tile.damage;
        const floatId = uid();

        // Check if this tile completion completes any rows/columns/diagonals
        // A tile is "done" if either flipped or completed
        const testBoard = team.board.map((row, ri) => 
          row.map((tl, ci) => ({ ...tl, flipped: tl.flipped || tl.completed }))
        );
        // Mark the clicked tile as flipped in testBoard
        testBoard[r][c] = { ...testBoard[r][c], flipped: true };
        
        // Check each possible line and count them
        let completedLines = 0;
        
        // Check row
        if (testBoard[r].every(t => t.flipped)) completedLines++;
        // Check column
        if (testBoard.every(row => row[c].flipped)) completedLines++;
        // Check main diagonal (r === c)
        if (r === c && testBoard.every((row, i) => row[i].flipped)) completedLines++;
        // Check anti-diagonal (r + c === 4)
        if (r + c === 4 && testBoard.every((row, i) => row[4-i].flipped)) completedLines++;
        
        // Calculate bonus damage (bonus per line completed)
        const rowBonusEnabled = g.settings.enableRowBonus ?? true;
        const bonusDamage = completedLines > 0 && rowBonusEnabled ? completedLines * g.settings.rowBonusDamage : 0;
        const totalDmg = dmg + bonusDamage;

        const logEntry = { 
          id:uid(), 
          time:fmtTime(), 
          damage:totalDmg, 
          bonusDamage: bonusDamage,
          boss:boss.name, 
          task:tile.task, 
          type: 'damage' 
        };

        // Update this team's boss HP
        const newBosses = team.bosses.map((b, i) => {
          if (i !== team.activeBossIndex) return b;
          const hp = Math.max(0, b.currentHp - totalDmg);
          return { ...b, currentHp:hp, defeated:hp===0 };
        });

        // Advance active boss if defeated + sequential
        let newActiveIdx = team.activeBossIndex;
        if (newBosses[team.activeBossIndex].defeated && g.settings.sequential) {
          const next = newBosses.findIndex((b, i) => i > team.activeBossIndex && !b.defeated);
          if (next !== -1) newActiveIdx = next;
        }

        const newFloat = { id:floatId, bossId:boss.id, damage:totalDmg,
          leftPct:12+Math.random()*60, fontSize:13+Math.random()*8 };

        // Flip the tile
        const newBoard = team.board.map((row, ri) =>
          row.map((tl, ci) => ri===r && ci===c ? { ...tl, flipped:true } : tl)
        );

        const allBossesDefeated = newBosses.every(b => b.defeated);

        const updatedTeam = {
          ...team,
          bosses:          newBosses,
          activeBossIndex: newActiveIdx,
          board:           newBoard,
          log:             [...team.log, logEntry],
          damageFloats:    [...(team.damageFloats||[]), newFloat],
          history:         [...team.history, snapshotTeam(team)],
        };

        const newTeams = g.teams.map(t => t.id === teamId ? updatedTeam : t);

        // Winner = first team to defeat all their own bosses
        const winnerTeam = !g.winner && allBossesDefeated ? updatedTeam : g.winner;

        const newGs = { ...g, teams: newTeams, winner: winnerTeam || null };

        // Resolve tile after 1400ms
        const key = `${teamId}-${r}-${c}`;
        clearTimeout(timers.current[key]);
        timers.current[key] = setTimeout(() => {
          setGs(prev => {
            if (!prev) return prev;
            const resolved = prev.teams.map(t => {
              if (t.id !== teamId) return t;
              if (!t.board[r]?.[c]?.flipped) return t;

              if (!prev.settings.replacement) {
                const board = t.board.map((row, ri) =>
                  row.map((tl, ci) => ri===r && ci===c ? { ...tl, flipped:false, completed:true } : tl)
                );
                return { ...t, board };
              }

              const available = prev.settings.tasks.filter(task => !t.exhaustedTasks.includes(task));
              if (available.length === 0) {
                const board = t.board.map((row, ri) =>
                  row.map((tl, ci) => ri===r && ci===c ? { ...tl, flipped:false, completed:true } : tl)
                );
                return { ...t, board };
              }

              const newTask = available[randInt(0, available.length - 1)];
              const newTile = makeTile(newTask, prev.settings.dMin, prev.settings.dMax, true);
              const newExhausted = [...t.exhaustedTasks, newTask];
              const board = t.board.map((row, ri) =>
                row.map((tl, ci) => ri===r && ci===c ? newTile : tl)
              );
              return { ...t, board, exhaustedTasks: newExhausted };
            });
            return { ...prev, teams: resolved };
          });
        }, 1400);

        // Clear float after animation
        setTimeout(() => {
          setGs(prev => {
            if (!prev) return prev;
            const teams = prev.teams.map(t =>
              t.id === teamId
                ? { ...t, damageFloats:(t.damageFloats||[]).filter(f => f.id!==floatId) }
                : t
            );
            return { ...prev, teams };
          });
        }, 1650);

        return newGs;
      });
    }

    // ── TILE_CLICK ──
    if (action.type === "TILE_CLICK") {
      const { teamId, r, c } = action;

      setGs(g => {
        if (!g || g.winner) return g;
        const team = g.teams.find(t => t.id === teamId);
        if (!team) return g;
        const tile = team.board[r][c];
        if (tile.flipped || tile.completed) return g;
        const boss = team.bosses[team.activeBossIndex];
        if (!boss || boss.defeated) return g;

        let dmg = tile.damage;
        const floatId = uid();

        // Check if this tile completion completes any rows/columns/diagonals
        // A tile is "done" if either flipped or completed
        const testBoard = team.board.map((row, ri) => 
          row.map((tl, ci) => ({ ...tl, flipped: tl.flipped || tl.completed }))
        );
        // Mark the clicked tile as flipped in testBoard
        testBoard[r][c] = { ...testBoard[r][c], flipped: true };
        
        // Check each possible line and count them
        let completedLines = 0;
        
        // Check row
        if (testBoard[r].every(t => t.flipped)) completedLines++;
        // Check column
        if (testBoard.every(row => row[c].flipped)) completedLines++;
        // Check main diagonal (r === c)
        if (r === c && testBoard.every((row, i) => row[i].flipped)) completedLines++;
        // Check anti-diagonal (r + c === 4)
        if (r + c === 4 && testBoard.every((row, i) => row[4-i].flipped)) completedLines++;
        
        // Calculate bonus damage (bonus per line completed)
        const rowBonusEnabled = g.settings.enableRowBonus ?? true;
        const bonusDamage = completedLines > 0 && rowBonusEnabled ? completedLines * g.settings.rowBonusDamage : 0;
        const totalDmg = dmg + bonusDamage;

        const logEntry = { 
          id:uid(), 
          time:fmtTime(), 
          damage:totalDmg, 
          bonusDamage: bonusDamage,
          boss:boss.name, 
          task:tile.task, 
          type: 'damage' 
        };

        // Update this team's boss HP
        const newBosses = team.bosses.map((b, i) => {
          if (i !== team.activeBossIndex) return b;
          const hp = Math.max(0, b.currentHp - totalDmg);
          return { ...b, currentHp:hp, defeated:hp===0 };
        });

        // Advance active boss if defeated + sequential
        let newActiveIdx = team.activeBossIndex;
        if (newBosses[team.activeBossIndex].defeated && g.settings.sequential) {
          const next = newBosses.findIndex((b, i) => i > team.activeBossIndex && !b.defeated);
          if (next !== -1) newActiveIdx = next;
        }

        const newFloat = { id:floatId, bossId:boss.id, damage:totalDmg,
          leftPct:12+Math.random()*60, fontSize:13+Math.random()*8 };

        // Flip the tile
        const newBoard = team.board.map((row, ri) =>
          row.map((tl, ci) => ri===r && ci===c ? { ...tl, flipped:true } : tl)
        );

        // Mark this position as completed (for bingo tracking)
        const newCompletedPositions = [...(team.completedPositions || Array(25).fill(false))];
        newCompletedPositions[r * 5 + c] = true;

        const allBossesDefeated = newBosses.every(b => b.defeated);

        const updatedTeam = {
          ...team,
          bosses:          newBosses,
          activeBossIndex: newActiveIdx,
          board:           newBoard,
          completedPositions: newCompletedPositions,
          log:             [...team.log, logEntry],
          damageFloats:    [...(team.damageFloats||[]), newFloat],
          history:         [...team.history, snapshotTeam(team)],
        };

        const newTeams = g.teams.map(t => t.id === teamId ? updatedTeam : t);

        // Winner = first team to defeat all their own bosses
        const winnerTeam = !g.winner && allBossesDefeated ? updatedTeam : g.winner;

        const newGs = { ...g, teams: newTeams, winner: winnerTeam || null };

        // Resolve tile after 1400ms
        const key = `${teamId}-${r}-${c}`;
        clearTimeout(timers.current[key]);
        timers.current[key] = setTimeout(() => {
          setGs(prev => {
            if (!prev) return prev;
            const resolved = prev.teams.map(t => {
              if (t.id !== teamId) return t;
              if (!t.board[r]?.[c]?.flipped) return t;

              if (!prev.settings.replacement) {
                const board = t.board.map((row, ri) =>
                  row.map((tl, ci) => ri===r && ci===c ? { ...tl, flipped:false, completed:true } : tl)
                );
                return { ...t, board };
              }

              const available = prev.settings.tasks.filter(task => !t.exhaustedTasks.includes(task));
              if (available.length === 0) {
                const board = t.board.map((row, ri) =>
                  row.map((tl, ci) => ri===r && ci===c ? { ...tl, flipped:false, completed:true } : tl)
                );
                return { ...t, board };
              }

              const newTask = available[randInt(0, available.length - 1)];
              const newTile = makeTile(newTask, prev.settings.dMin, prev.settings.dMax, true);
              const newExhausted = [...t.exhaustedTasks, newTask];
              const board = t.board.map((row, ri) =>
                row.map((tl, ci) => ri===r && ci===c ? newTile : tl)
              );
              return { ...t, board, exhaustedTasks: newExhausted };
            });
            return { ...prev, teams: resolved };
          });
        }, 1400);

        // Clear float after animation
        setTimeout(() => {
          setGs(prev => {
            if (!prev) return prev;
            const teams = prev.teams.map(t =>
              t.id === teamId
                ? { ...t, damageFloats:(t.damageFloats||[]).filter(f => f.id!==floatId) }
                : t
            );
            return { ...prev, teams };
          });
        }, 1650);

        return newGs;
      });
    }
  }, []);

  // ── Reset ────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setGs(null);
    setPhase("setup");
  }, []);

  // ── Export ───────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!gs) return;
    const data = {
      exportedAt: new Date().toISOString(),
      winner: gs.winner?.name ?? null,
      teams: gs.teams.map(t => ({
        name: t.name,
        bosses: t.bosses.map(b => ({ name:b.name, defeated:b.defeated, remainingHp:b.currentHp, maxHp:b.maxHp })),
        totalDamage: t.log.reduce((s,e)=>s+e.damage,0),
        tilesUsed: t.log.length,
        log: t.log,
      })),
      settings: { ...gs.settings, tasks: gs.settings.tasks.length+" tasks" },
    };
    const blob = new Blob([JSON.stringify(data,null,2)], { type:"application/json" });
    const a = Object.assign(document.createElement("a"),
      { href:URL.createObjectURL(blob), download:`osrs-bingo-${Date.now()}.json` });
    a.click();
    URL.revokeObjectURL(a.href);
  }, [gs]);

  return (
    <div style={{ minHeight:"100vh", background:"#060300" }}>
      {phase==="setup" && <AdminPanel onStart={handleStart} />}
      {phase==="game"  && gs && (
        <GameView gs={gs} dispatch={dispatch} onReset={handleReset} onExport={handleExport} />
      )}
    </div>
  );
}
