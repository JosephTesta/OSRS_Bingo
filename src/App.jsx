import { useState, useEffect, useCallback, useRef } from "react";
import { DEFAULT_TASKS } from "./data/tasks";
import { BOSSES_DATA } from "./data/bosses";
import { AdminPanel } from "./components/AdminPanel";
import { GameView } from "./components/GameView";

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

const makeTile = (task, dMin, dMax, isNew = false, randomizeDamage = true, fixedDamage = 100) => ({
  id: uid(), task,
  damage: randomizeDamage ? randInt(dMin, dMax) : fixedDamage, flipped: false, completed: false, isNew,
  pendingReplacement: null,
});

const makeBoard = (pool, dMin, dMax, randomizeDamage = true, fixedDamage = 100, shouldShuffle = true) => {
  const picked = shouldShuffle ? shuffle(pool).slice(0, 25) : pool.slice(0, 25);
  const board  = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => ({
      id: uid(), task: picked[r * 5 + c],
      damage: randomizeDamage ? randInt(dMin, dMax) : fixedDamage, flipped: false, completed: false, isNew: false,
      pendingReplacement: null,
    }))
  );
  return { board, exhaustedTasks: [...picked], completedPositions: Array(25).fill(false) };
};

const makeBosses = (selectedBosses) =>
  selectedBosses.map(b => ({ ...b, currentHp: b.maxHp, defeated: false }));

// Snapshot the team state exactly as-is — pendingReplacement is intentionally
// included so that undo restores tiles mid-animation with their future task intact.
const snapshotTeam = (t, g) => ({
  bosses:          t.bosses.map(b => ({ ...b })),
  activeBossIndex: t.activeBossIndex,
  board:           t.board.map(row => row.map(tile => ({ ...tile }))),
  exhaustedTasks:  [...t.exhaustedTasks],
  completedPositions:     [...(t.completedPositions || Array(25).fill(false))],
  lineCompletedPositions: [...(t.lineCompletedPositions || Array(25).fill(false))],
  replacedPositions:      [...(t.replacedPositions || Array(25).fill(false))],
});

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Text:ital,wght@0,400;0,600,1,400&display=swap');

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

.hp-track{background:#1a0800;border:1px solid #3a2000;border-radius:2px;overflow:hidden;position:relative;}
.hp-fill{height:100%;transition:width .7s cubic-bezier(.4,0,.2,1),background-color .5s;position:relative;}
.hp-fill::after{content:'';position:absolute;top:0;left:0;right:0;height:45%;background:rgba(255,255,255,.1);}

.dmg-float{position:absolute;pointer-events:none;font-family:'Cinzel',serif;font-weight:900;color:#fca5a5;text-shadow:2px 2px 0 #000,0 0 10px rgba(255,60,60,.7);animation:floatUp 1.5s ease-out forwards;z-index:50;white-space:nowrap;}
@keyframes floatUp{0%{opacity:1;transform:translateY(0) scale(1);}15%{opacity:1;transform:translateY(-12px) scale(1.4);}100%{opacity:0;transform:translateY(-60px) scale(.85);}}

.boss-shake{animation:bShake .35s cubic-bezier(.36,.07,.19,.97) both;}
@keyframes bShake{10%,90%{transform:translate3d(-1px,0,0);}20%,80%{transform:translate3d(3px,0,0);}30%,50%,70%{transform:translate3d(-3px,0,0);}40%,60%{transform:translate3d(3px,0,0);}}
.boss-active{animation:bGlow 2.5s ease-in-out infinite;}
@keyframes bGlow{0%,100%{border-color:#c8a951;box-shadow:0 0 8px rgba(200,169,81,.3);}50%{border-color:#f0d080;box-shadow:0 0 18px rgba(240,208,128,.55);}}
.boss-defeated{filter:grayscale(1) brightness(.3);transition:filter .8s;}

.log-row{font-family:'Crimson Text',serif;font-size:12px;padding:2px 6px;border-bottom:1px solid rgba(90,58,16,.2);animation:logIn .3s ease-out;}
@keyframes logIn{from{opacity:0;transform:translateX(-8px);}to{opacity:1;transform:translateX(0);}}

.v-overlay{position:fixed;inset:0;background:rgba(0,0,0,.87);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(6px);}
.v-card{animation:vIn .75s cubic-bezier(.34,1.56,.64,1);text-align:center;}
@keyframes vIn{from{opacity:0;transform:scale(.2) rotate(-8deg);}to{opacity:1;transform:scale(1) rotate(0);}}
.v-glow{animation:vGlow 2s ease-in-out infinite alternate;}
@keyframes vGlow{from{text-shadow:0 0 20px rgba(200,169,81,.5),2px 2px 0 #000;}to{text-shadow:0 0 50px rgba(255,210,60,1),0 0 100px rgba(255,180,0,.5),2px 2px 0 #000;}}

.tab-btn{font-family:'Cinzel',serif;font-size:11px;padding:7px 14px;background:transparent;border:1px solid #3a2800;border-bottom:none;color:#5a4020;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;transition:all .15s;border-radius:3px 3px 0 0;}
.tab-btn:hover,.tab-btn.active{background:linear-gradient(180deg,#3d2200,#1e1100);border-color:#8b6520;color:#c8a951;}
.tab-btn.active{margin-bottom:-1px;z-index:1;position:relative;}

.undo-flash{animation:undoFlash .5s ease-out;}
@keyframes undoFlash{0%{box-shadow:0 0 0 2px rgba(252,211,77,.8);}100%{box-shadow:none;}}
`;

const STORAGE_KEY = "osrs_bingo_v5";

export default function App() {
  const [phase, setPhase] = useState("setup");
  const [gs, setGs]       = useState(null);
  const timers            = useRef({});

  useEffect(() => {
    const el = document.createElement("style");
    el.innerHTML = CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

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

  useEffect(() => {
    if (phase === "game" && gs) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ phase, gs })); } catch {}
    }
  }, [phase, gs]);

  const handleStart = useCallback(({ selectedBosses, teamNames, settings }) => {
    const tasks = settings.tasks;
    const dMin = settings.dMin;
    const dMax = settings.dMax;
    const randomizeDamage = settings.randomizeDamage;
    const fixedDamage = settings.fixedDamage;
    const randomizeBoard = settings.randomizeBoard;
    
    const sharedBoard = makeBoard(tasks, dMin, dMax, randomizeDamage, fixedDamage, false);
    setGs({
      teams: teamNames.map(name => {
        const { board, exhaustedTasks } = randomizeBoard 
          ? makeBoard(tasks, dMin, dMax, randomizeDamage, fixedDamage, true)
          : { board: JSON.parse(JSON.stringify(sharedBoard.board)), exhaustedTasks: [...sharedBoard.exhaustedTasks] };
        return {
          id: uid(),
          name,
          board,
          exhaustedTasks,
          bosses: makeBosses(selectedBosses),
          activeBossIndex: 0,
          damageFloats: [],
          log: [],
          history: [],
          completedPositions: Array(25).fill(false),
          lineCompletedPositions: Array(25).fill(false),
          replacedPositions: Array(25).fill(false),
        };
      }),
      settings,
      winner: null,
      undoFlashTeamId: null,
    });
    setPhase("game");
  }, []);

  const dispatch = useCallback(action => {
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

    if (action.type === "UNDO") {
      const { teamId } = action;
      setGs(g => {
        if (!g) return g;
        const team = g.teams.find(t => t.id === teamId);
        if (!team || team.history.length === 0) return g;

        const history = [...team.history];
        const snapshot = history.pop();

        const damagedBossIdx = snapshot.activeBossIndex;
        const dmg_restored = snapshot.bosses[damagedBossIdx].currentHp - team.bosses[damagedBossIdx].currentHp;

        const restoreLogEntry = {
          id: uid(),
          time: fmtTime(),
          damage: dmg_restored,
          boss: snapshot.bosses[damagedBossIdx].name,
          task: '',
          type: 'restore',
        };

        const restoredBoard = snapshot.board;
        const resolvedPositions = [...(snapshot.completedPositions || Array(25).fill(false))];
        const resolvedReplaced = [...(snapshot.replacedPositions || Array(25).fill(false))];
        const revealedBoard = restoredBoard.map((row, ri) =>
          row.map((tl, ci) => {
            if (!tl.flipped) return tl;
            if (tl.pendingReplacement) {
              resolvedPositions[ri * 5 + ci] = false;
              resolvedReplaced[ri * 5 + ci] = true;
              return { ...tl.pendingReplacement, pendingReplacement: null };
            }
            resolvedPositions[ri * 5 + ci] = true;
            resolvedReplaced[ri * 5 + ci] = false;
            return { ...tl, flipped: false, completed: true, pendingReplacement: null };
          })
        );

        const updatedTeam = {
          ...team,
          bosses:                 snapshot.bosses,
          activeBossIndex:        snapshot.activeBossIndex,
          board:                  revealedBoard,
          exhaustedTasks:         snapshot.exhaustedTasks,
          completedPositions:     resolvedPositions,
          replacedPositions:      resolvedReplaced,
          lineCompletedPositions: snapshot.lineCompletedPositions,
          log:                    [...team.log, restoreLogEntry],
          damageFloats:           [],
          history,
        };

        const newTeams = g.teams.map(t => t.id === teamId ? updatedTeam : t);
        const winner = g.winner && newTeams.find(t => t.id === g.winner.id)?.bosses.every(b => b.defeated)
          ? g.winner : null;
        return { ...g, teams: newTeams, winner, undoFlashTeamId: teamId };
      });
      setTimeout(() => setGs(g => g ? { ...g, undoFlashTeamId: null } : g), 600);
    }

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

        const testBoard = team.board.map((row, ri) =>
          row.map((tl, ci) => ({ ...tl, flipped: tl.flipped || tl.completed || (team.completedPositions?.[ri * 5 + ci] ?? false) || (team.replacedPositions?.[ri * 5 + ci] ?? false) }))
        );
        testBoard[r][c] = { ...testBoard[r][c], flipped: true };

        const existingLines     = team.lineCompletedPositions || Array(25).fill(false);
        const existingCompleted = team.completedPositions     || Array(25).fill(false);
        const existingReplaced  = team.replacedPositions      || Array(25).fill(false);

        const rowIsCompleteNow   = testBoard[r].every((t, ci) => t.flipped || existingCompleted[r * 5 + ci] || existingReplaced[r * 5 + ci]);
        const colIsCompleteNow   = testBoard.every((row, ri) => row[c].flipped || existingCompleted[ri * 5 + c] || existingReplaced[ri * 5 + c]);
        const diag1IsCompleteNow = r === c && testBoard.every((row, i) => row[i].flipped || existingCompleted[i * 5 + i] || existingReplaced[i * 5 + i]);
        const diag2IsCompleteNow = (r + c === 4) && testBoard.every((row, i) => row[4-i].flipped || existingCompleted[i * 5 + (4-i)] || existingReplaced[i * 5 + (4-i)]);

        const rowWasComplete   = existingLines.slice(r * 5, r * 5 + 5).every(p => p);
        const colWasComplete   = [0,1,2,3,4].every(i => existingLines[i * 5 + c]);
        const diag1WasComplete = [0,1,2,3,4].every(i => existingLines[i * 5 + i]);
        const diag2WasComplete = [0,1,2,3,4].every(i => existingLines[i * 5 + (4 - i)]);

        let newCompletedLines = 0;
        if (rowIsCompleteNow   && !rowWasComplete)   newCompletedLines++;
        if (colIsCompleteNow   && !colWasComplete)   newCompletedLines++;
        if (diag1IsCompleteNow && !diag1WasComplete) newCompletedLines++;
        if (diag2IsCompleteNow && !diag2WasComplete) newCompletedLines++;

        const rowBonusEnabled = g.settings.enableRowBonus ?? true;
        const bonusDamage     = newCompletedLines > 0 && rowBonusEnabled ? newCompletedLines * g.settings.rowBonusDamage : 0;
        const totalDmg        = dmg + bonusDamage;

        const logEntry = {
          id: uid(),
          time: fmtTime(),
          damage: totalDmg,
          bonusDamage,
          boss: boss.name,
          task: tile.task,
          type: 'damage',
        };

        const newBosses = team.bosses.map((b, i) => {
          if (i !== team.activeBossIndex) return b;
          const hp = Math.max(0, b.currentHp - totalDmg);
          return { ...b, currentHp: hp, defeated: hp === 0 };
        });

        let newActiveIdx = team.activeBossIndex;
        if (newBosses[team.activeBossIndex].defeated && g.settings.sequential) {
          const next = newBosses.findIndex((b, i) => i > team.activeBossIndex && !b.defeated);
          if (next !== -1) newActiveIdx = next;
        }

        // --- Eagerly compute replacement so it is captured in the next snapshot ---
        // This ensures undo always restores tiles with their pending future task
        // intact, rather than a stale flipped state with no task assigned.
        let pendingReplacement = null;
        let newExhaustedTasks  = team.exhaustedTasks;
        if (g.settings.replacement) {
          const taskPool = team.exhaustedTasks;
          const available = g.settings.tasks.filter(task => !taskPool.includes(task));
          if (available.length > 0) {
            let newTask;
            if (g.settings.randomizeBoard) {
              newTask = available[randInt(0, available.length - 1)];
              newExhaustedTasks = [...team.exhaustedTasks, newTask];
            } else {
              newTask = available[0];
              newExhaustedTasks = [...team.exhaustedTasks, newTask];
            }
            pendingReplacement = makeTile(newTask, g.settings.dMin, g.settings.dMax, true, g.settings.randomizeDamage, g.settings.fixedDamage);
          }
        }

        const newFloat = {
          id: floatId, bossId: boss.id, damage: totalDmg,
          leftPct: 12 + Math.random() * 60, fontSize: 13 + Math.random() * 8,
        };

        const newBoard = team.board.map((row, ri) =>
          row.map((tl, ci) =>
            ri === r && ci === c ? { ...tl, flipped: true, pendingReplacement } : tl
          )
        );

        const newCompletedPositions = [...(team.completedPositions || Array(25).fill(false))];
        newCompletedPositions[r * 5 + c] = true;

        const newReplacedPositions = [...(team.replacedPositions || Array(25).fill(false))];
        if (pendingReplacement) {
          newReplacedPositions[r * 5 + c] = true;
        }

        const newLineCompletedPositions = [...(team.lineCompletedPositions || Array(25).fill(false))];
        if (newCompletedLines > 0) {
          if (rowIsCompleteNow   && !rowWasComplete)   for (let ci = 0; ci < 5; ci++) newLineCompletedPositions[r * 5 + ci]       = true;
          if (colIsCompleteNow   && !colWasComplete)   for (let ri = 0; ri < 5; ri++) newLineCompletedPositions[ri * 5 + c]       = true;
          if (diag1IsCompleteNow && !diag1WasComplete) for (let i  = 0; i  < 5; i++)  newLineCompletedPositions[i * 5 + i]        = true;
          if (diag2IsCompleteNow && !diag2WasComplete) for (let i  = 0; i  < 5; i++)  newLineCompletedPositions[i * 5 + (4 - i)] = true;
        }

        const allBossesDefeated = newBosses.every(b => b.defeated);

        const updatedTeam = {
          ...team,
          bosses:                 newBosses,
          activeBossIndex:        newActiveIdx,
          board:                  newBoard,
          exhaustedTasks:         newExhaustedTasks,
          completedPositions:     newCompletedPositions,
          replacedPositions:      newReplacedPositions,
          lineCompletedPositions: newLineCompletedPositions,
          log:                    [...team.log, logEntry],
          damageFloats:           [...(team.damageFloats || []), newFloat],
          history:                [...team.history, snapshotTeam(team, g)],
        };

        const newTeams    = g.teams.map(t => t.id === teamId ? updatedTeam : t);
        const winnerTeam  = !g.winner && allBossesDefeated ? updatedTeam : g.winner;
        const newGs       = { ...g, teams: newTeams, winner: winnerTeam || null };

        // Timer only reveals the pre-computed replacement — no task selection here.
        const key = `${teamId}-${r}-${c}`;
        clearTimeout(timers.current[key]);
        timers.current[key] = setTimeout(() => {
          setGs(prev => {
            if (!prev) return prev;
            const teamIdx = prev.teams.findIndex(t => t.id === teamId);
            if (teamIdx === -1) return prev;
            const t    = prev.teams[teamIdx];
            const tile = t.board[r]?.[c];

            // If this tile was undone (restored to flipped:false), skip silently.
            if (!tile?.flipped) return prev;

            const resolvedPositions = [...(t.completedPositions || Array(25).fill(false))];
            const resolvedReplaced = [...(t.replacedPositions || Array(25).fill(false))];
            const board = t.board.map((row, ri) =>
              row.map((tl, ci) => {
                if (ri !== r || ci !== c) return tl;
                if (tl.pendingReplacement) {
                  resolvedPositions[r * 5 + c] = false;
                  resolvedReplaced[r * 5 + c] = true;
                  return { ...tl.pendingReplacement, pendingReplacement: null };
                }
                resolvedPositions[r * 5 + c] = true;
                resolvedReplaced[r * 5 + c] = false;
                return { ...tl, flipped: false, completed: true, pendingReplacement: null };
              })
            );

            const newTeams = [...prev.teams];
            newTeams[teamIdx] = { ...t, board, completedPositions: resolvedPositions, replacedPositions: resolvedReplaced };
            return { ...prev, teams: newTeams };
          });
        }, 1400);

        // Clean up damage float after animation.
        setTimeout(() => {
          setGs(prev => {
            if (!prev) return prev;
            const teams = prev.teams.map(t =>
              t.id === teamId
                ? { ...t, damageFloats: (t.damageFloats || []).filter(f => f.id !== floatId) }
                : t
            );
            return { ...prev, teams };
          });
        }, 1650);

        return newGs;
      });
    }
  }, []);

  const handleReset = useCallback(() => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setGs(null);
    setPhase("setup");
  }, []);

  const handleExport = useCallback(() => {
    if (!gs) return;
    const data = {
      exportedAt: new Date().toISOString(),
      winner: gs.winner?.name ?? null,
      teams: gs.teams.map(t => ({
        name: t.name,
        bosses: t.bosses.map(b => ({ name: b.name, defeated: b.defeated, remainingHp: b.currentHp, maxHp: b.maxHp })),
        totalDamage: t.log.reduce((s, e) => s + e.damage, 0),
        tilesUsed: t.log.length,
        log: t.log,
      })),
      settings: { ...gs.settings, tasks: gs.settings.tasks.length + " tasks" },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"),
      { href: URL.createObjectURL(blob), download: `osrs-bingo-${Date.now()}.json` });
    a.click();
    URL.revokeObjectURL(a.href);
  }, [gs]);

  return (
    <div style={{ minHeight: "100vh", background: "#060300" }}>
      {phase === "setup" && <AdminPanel onStart={handleStart} />}
      {phase === "game"  && gs && (
        <GameView gs={gs} dispatch={dispatch} onReset={handleReset} onExport={handleExport} />
      )}
    </div>
  );
}