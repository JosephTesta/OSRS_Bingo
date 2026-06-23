import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { DEFAULT_TASKS } from "./data/tasks";
import { BOSSES_DATA } from "./data/bosses";
import { AdminPanel } from "./components/AdminPanel";
import { GameView } from "./components/GameView";
import { getGame, getTeams, getTeam, verifyAdminPassword, createGame, createTeam, saveUndoState, applyTileAction, setGameWinner } from "./lib/api";
import { supabase } from "./lib/supabase";

const uid     = () => Math.random().toString(36).slice(2, 9);
const uuid    = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
const randInt = (mn, mx) => Math.floor(Math.random() * (mx - mn + 1)) + mn;
const fmtTime = () => new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" });
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = value => typeof value === "string" && uuidPattern.test(value);

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
  log:                   [...(t.log || [])],
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

.tile-flash{animation:tileFlash 2s ease-out;}
@keyframes tileFlash{0%{box-shadow:0 0 0 0 rgba(252,211,77,.8);}50%{box-shadow:0 0 20px 6px rgba(252,211,77,.6);}100%{box-shadow:none;}}

.toast-container{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;font-family:'Cinzel',serif;pointer-events:none;animation:toastIn .3s ease-out;}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
`;

export default function App() {
  const [phase, setPhase] = useState("setup");
  const [gs, setGs] = useState(null);
  const gsRef = useRef(null);
  useEffect(() => { gsRef.current = gs; }, [gs]);
  const processingRef = useRef(false);
  const timers = useRef({});
  const localActionIds = useRef(new Set());
  const [searchParams] = useSearchParams();
  const rawGameId = searchParams.get("id");
  const paramGameId = rawGameId && isUuid(rawGameId) ? rawGameId : null;
  const [activeGameId, setActiveGameId] = useState(null);
  const gameId = activeGameId || paramGameId;  // Use active state if set, otherwise fall back to URL params
  useEffect(() => {
    if (gs?.winner?.id && gameId) {
      setGameWinner(gameId, gs.winner.id).catch(err => {
        console.error('Failed to save winner:', err);
      });
    }
  }, [gs?.winner?.id, gameId]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [requiresAdmin, setRequiresAdmin] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message) => {
    setToast({ id: Date.now(), message });
    setTimeout(() => setToast(null), 3000);
  }, []);
  const [persistentNote, setPersistentNote] = useState(null);
  const [savedSettings, setSavedSettings] = useState(null);

  useEffect(() => {
    const el = document.createElement("style");
    el.innerHTML = CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  useEffect(() => {
    if (rawGameId && !isUuid(rawGameId)) {
      window.history.replaceState(null, "", "/");
      setGs(null);
      setPhase("setup");
      setIsAdmin(false);
      setRequiresAdmin(false);
      return;
    }

    if (gameId) {
      loadSharedGame();
    }
  }, [rawGameId, gameId]);

  useEffect(() => {
    if (gs && gameId && requiresAdmin) {
      const storedAdmin = localStorage.getItem(`admin_${gameId}`);
      if (storedAdmin) {
        verifyAdminPassword(gameId, storedAdmin).then(result => {
          if (result) {
            setIsAdmin(true);
          } else {
            localStorage.removeItem(`admin_${gameId}`);
          }
        });
      }
    }
  }, [gs, gameId, requiresAdmin]);

  async function loadSharedGame() {
    try {
      const game = await getGame(gameId);
      if (!game) {
        window.history.replaceState(null, "", "/");
        setGs(null);
        setActiveGameId(null);
        setPhase("setup");
        setIsAdmin(false);
        setRequiresAdmin(false);
        alert("Game not found");
        return;
      }
      
      setActiveGameId(gameId);
      const requiresPassword = Boolean(game.admin_password_hash?.trim());
      setRequiresAdmin(requiresPassword);
      setIsAdmin(!requiresPassword);

      const teams = await getTeams(gameId);
      const loadedTeams = teams.map(transformTeam);
      const savedWinner = game.winner ? loadedTeams.find(t => t.id === game.winner) : null;
      setGs({
        settings: game.settings,
        teams: loadedTeams,
        winner: savedWinner || null,
        undoFlashTeamId: null,
      });
      setPhase("game");
      
      if (requiresPassword) {
        const storedAdmin = localStorage.getItem(`admin_${gameId}`);
        if (storedAdmin) {
          const isValid = await verifyAdminPassword(gameId, storedAdmin);
          if (isValid) setIsAdmin(true);
          else localStorage.removeItem(`admin_${gameId}`);
        }
      }
    } catch (err) {
      console.error("Failed to load game:", err);
      alert("Failed to load game");
    }
  }

  function normalizeBoolArray(value) {
    const fallback = Array(25).fill(false);
    if (!Array.isArray(value)) return fallback;
    return Array.from({ length: 25 }, (_, i) => Boolean(value[i]));
  }

  function normalizeBoard(value) {
    if (!Array.isArray(value)) return Array.from({ length: 5 }, () => Array(5).fill(null));
    if (value.length === 5 && value.every(row => Array.isArray(row) && row.length === 5)) {
      return value.map(row => row.map(tile => tile ?? null));
    }
    if (value.length === 25) {
      return Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 5 }, (_, c) => value[r * 5 + c] ?? null)
      );
    }
    return Array.from({ length: 5 }, () => Array(5).fill(null));
  }

  function transformTeam(team) {
    return {
      id: team.id,
      name: team.name,
      board: normalizeBoard(team.board),
      exhaustedTasks: team.exhausted_tasks || [],
      completedPositions: normalizeBoolArray(team.completed_positions),
      lineCompletedPositions: normalizeBoolArray(team.line_completed_positions),
      replacedPositions: normalizeBoolArray(team.replaced_positions),
      bosses: team.bosses,
      activeBossIndex: team.active_boss_index || 0,
      log: team.log || [],
      history: Array.isArray(team.history)
        ? team.history
        : typeof team.history === 'string'
        ? (() => {
            try {
              return JSON.parse(team.history);
            } catch (err) {
              console.warn('[transformTeam] failed to parse history string', err, team.history);
              return [];
            }
          })()
        : [],
      damageFloats: [],
    };
  }

  function transformBack(team) {
    return {
      board: team.board,
      exhausted_tasks: team.exhaustedTasks,
      completed_positions: team.completedPositions,
      line_completed_positions: team.lineCompletedPositions,
      replaced_positions: team.replacedPositions,
      bosses: team.bosses,
      active_boss_index: team.activeBossIndex,
      log: team.log,
      history: team.history,
    };
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (!requiresAdmin) return;
    const isValid = await verifyAdminPassword(gameId, passwordInput);
    if (isValid) {
      localStorage.setItem(`admin_${gameId}`, passwordInput);
      setIsAdmin(true);
      setShowPasswordPrompt(false);
      setPasswordInput("");
      setPasswordError("");
    } else {
      setPasswordError("Incorrect password");
    }
  }

  const canEdit = useCallback(() => {
    return !gameId || isAdmin;
  }, [gameId, isAdmin]);

  useEffect(() => {
    // Subscribe all connected clients (not just admins) to game actions so viewers
    // see updates immediately when another client applies a tile action.
    if (phase === "game" && gameId) {
      const channel = supabase.channel(`game-actions-${gameId}`);
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_actions', filter: `game_id=eq.${gameId}` }, payload => {
        console.log('[realtime] channel payload received:', payload);
        const action = payload.new;
        const clientActionId = action?.payload?.client_action_id;
        if (clientActionId && localActionIds.current.has(clientActionId)) {
          localActionIds.current.delete(clientActionId);
          return;
        }

        const remoteTeam = action?.payload?.team ? transformTeam(action.payload.team) : null;
        if (!remoteTeam) return;

        setGs(prev => {
          if (!prev) return prev;
          const idx = prev.teams.findIndex(t => t.id === remoteTeam.id);
          if (idx === -1) return prev;
          const existing = prev.teams[idx];

          const remoteCompleted = remoteTeam.completedPositions || Array(25).fill(false);
          const remoteReplaced = remoteTeam.replacedPositions || Array(25).fill(false);
          const newFlashPositions = [];
          const newUndonePositions = [];
          for (let i = 0; i < 25; i++) {
            const wasOccupied = (existing.completedPositions?.[i] || existing.replacedPositions?.[i]);
            const nowOccupied = (remoteCompleted[i] || remoteReplaced[i]);
            if (!wasOccupied && nowOccupied) {
              newFlashPositions.push(i);
            }
            if (wasOccupied && !nowOccupied) {
              newUndonePositions.push(i);
            }
          }

          const history = Array.isArray(remoteTeam.history) && remoteTeam.history.length > 0 ? remoteTeam.history : existing.history || [];
          const teams = [...prev.teams];
          teams[idx] = { ...remoteTeam, history, damageFloats: [], remoteFlashPositions: newFlashPositions, hasRemoteUpdate: (newFlashPositions.length > 0 || newUndonePositions.length > 0) };

          if (newFlashPositions.length > 0) {
            showToast(`Another player completed ${newFlashPositions.length} tile(s)`);
            setTimeout(() => {
              setGs(prev2 => {
                if (!prev2) return prev2;
                const t2 = [...prev2.teams];
                const clearIdx = t2.findIndex(t => t.id === remoteTeam.id);
                if (clearIdx !== -1) t2[clearIdx] = { ...t2[clearIdx], remoteFlashPositions: [] };
                return { ...prev2, teams: t2 };
              });
            }, 2500);
          }

          if (newUndonePositions.length > 0) {
            setPersistentNote({
              id: Date.now(),
              message: `Another player undid ${newUndonePositions.length} tile(s) on "${existing.name}". The board has been updated.`,
            });
          }

          return { ...prev, teams };
        });
      });

      // Subscribe and log status
      try {
        const sub = channel.subscribe(status => console.log('[realtime] channel subscribe status:', status));
        console.log('[realtime] channel object:', channel, 'subscribe result:', sub);
      } catch (e) {
        console.error('[realtime] channel.subscribe() threw:', e);
      }

      // Fallback listener using legacy supabase.from().on().subscribe (only if supported)
      let fromSub = null;
      try {
        const maybeFrom = typeof supabase.from === 'function'
          ? supabase.from(`game_actions:game_id=eq.${gameId}`)
          : null;
        if (maybeFrom && typeof maybeFrom.on === 'function' && typeof maybeFrom.subscribe === 'function') {
          fromSub = maybeFrom.on('INSERT', payload => {
            console.log('[realtime] from() payload received:', payload);
            const action = payload.new;
            const clientActionId = action?.payload?.client_action_id;
            if (clientActionId && localActionIds.current.has(clientActionId)) {
              localActionIds.current.delete(clientActionId);
              return;
            }
            const remoteTeam = action?.payload?.team ? transformTeam(action.payload.team) : null;
            if (!remoteTeam) return;
            setGs(prev => {
              if (!prev) return prev;
              const idx = prev.teams.findIndex(t => t.id === remoteTeam.id);
              if (idx === -1) return prev;
              const existing = prev.teams[idx];

              const remoteCompleted = remoteTeam.completedPositions || Array(25).fill(false);
              const remoteReplaced = remoteTeam.replacedPositions || Array(25).fill(false);
              const newFlashPositions = [];
              const newUndonePositions = [];
              for (let i = 0; i < 25; i++) {
                const wasOccupied = (existing.completedPositions?.[i] || existing.replacedPositions?.[i]);
                const nowOccupied = (remoteCompleted[i] || remoteReplaced[i]);
                if (!wasOccupied && nowOccupied) {
                  newFlashPositions.push(i);
                }
                if (wasOccupied && !nowOccupied) {
                  newUndonePositions.push(i);
                }
              }

              const history = Array.isArray(remoteTeam.history) && remoteTeam.history.length > 0 ? remoteTeam.history : existing.history || [];
              const teams = [...prev.teams];
              teams[idx] = { ...remoteTeam, history, damageFloats: [], remoteFlashPositions: newFlashPositions, hasRemoteUpdate: (newFlashPositions.length > 0 || newUndonePositions.length > 0) };

              if (newFlashPositions.length > 0) {
                showToast(`Another player completed ${newFlashPositions.length} tile(s)`);
                setTimeout(() => {
                  setGs(prev2 => {
                    if (!prev2) return prev2;
                    const t2 = [...prev2.teams];
                    const clearIdx = t2.findIndex(t => t.id === remoteTeam.id);
                    if (clearIdx !== -1) t2[clearIdx] = { ...t2[clearIdx], remoteFlashPositions: [] };
                    return { ...prev2, teams: t2 };
                  });
                }, 2500);
              }

              if (newUndonePositions.length > 0) {
                setPersistentNote({
                  id: Date.now(),
                  message: `Another player undid ${newUndonePositions.length} tile(s) on "${existing.name}". The board has been updated.`,
                });
              }

              return { ...prev, teams };
            });
          }).subscribe();
          console.log('[realtime] from() subscription created', fromSub);
        } else {
          console.log('[realtime] legacy supabase.from().on().subscribe not supported by this client; skipping fallback');
        }
      } catch (e) {
        console.error('[realtime] supabase.from() subscribe threw:', e);
      }

      return () => {
        try { supabase.removeChannel(channel); } catch (e) { console.warn('removeChannel failed', e); }
        try {
          if (fromSub && typeof fromSub.unsubscribe === 'function') {
            fromSub.unsubscribe();
          }
        } catch (e) { /* ignore */ }
      };
    }
  }, [phase, gameId, isAdmin]);

  const handleStart = useCallback(async ({ selectedBosses, teamNames, settings }) => {
    const tasks = settings.tasks;
    const dMin = settings.dMin;
    const dMax = settings.dMax;
    const randomizeDamage = settings.randomizeDamage;
    const fixedDamage = settings.fixedDamage;
    const randomizeBoard = settings.randomizeBoard;
    const adminPassword = settings.adminPassword?.trim() || "";
    
    const sharedBoard = makeBoard(tasks, dMin, dMax, randomizeDamage, fixedDamage, false);
    const teams = teamNames.map(name => {
      const { board, exhaustedTasks } = randomizeBoard 
        ? makeBoard(tasks, dMin, dMax, randomizeDamage, fixedDamage, true)
        : { board: JSON.parse(JSON.stringify(sharedBoard.board)), exhaustedTasks: [...sharedBoard.exhaustedTasks] };
      return {
        id: uuid(),
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
        remoteFlashPositions: [],
      };
    });
    
    const cleanSettings = { ...settings, adminPassword };
    const newGs = {
      teams,
      settings: cleanSettings,
      winner: null,
      undoFlashTeamId: null,
    };
    
    try {
      const game = await createGame(cleanSettings, adminPassword);
      
      const savedTeams = [];
      for (const team of teams) {
        const savedTeam = await createTeam(game.id, {
          name: team.name,
          board: team.board,
          exhausted_tasks: team.exhaustedTasks,
          completed_positions: team.completedPositions,
          line_completed_positions: team.lineCompletedPositions,
          replaced_positions: team.replacedPositions,
          bosses: team.bosses,
          active_boss_index: team.activeBossIndex,
          log: team.log,
          history: team.history,
        });
        savedTeams.push(savedTeam);
      }

      savedTeams.forEach((savedTeam, i) => {
        if (savedTeam?.id) teams[i].id = savedTeam.id;
      });

      const dbTeams = await getTeams(game.id);
      dbTeams.forEach(dbTeam => {
        const localTeam = teams.find(t => t.name === dbTeam.name);
        if (localTeam && dbTeam.id) localTeam.id = dbTeam.id;
      });
      
      window.history.replaceState(null, "", `?id=${game.id}`);
      setActiveGameId(game.id);
      setIsAdmin(true);
      setRequiresAdmin(Boolean(adminPassword));
      if (adminPassword) localStorage.setItem(`admin_${game.id}`, adminPassword);
    } catch (err) {
      console.error("Failed to save to database:", err);
      setRequiresAdmin(false);
      alert("Failed to save game to database. Game will work locally but won't be shareable.");
    }
    
    setSavedSettings({
      selectedBossIds: selectedBosses.map(b => b.id),
      teamNames,
      teamCount: teamNames.length,
      dMin: settings.dMin,
      dMax: settings.dMax,
      dMinRaw: String(settings.dMin),
      dMaxRaw: String(settings.dMax),
      randomizeDamage: settings.randomizeDamage,
      fixedDamage: settings.fixedDamage,
      fixedDamageRaw: String(settings.fixedDamage),
      randomizeBoard: settings.randomizeBoard,
      replacement: settings.replacement,
      sequential: settings.sequential,
      rowBonusDamage: settings.rowBonusDamage,
      enableRowBonus: settings.enableRowBonus,
      adminPassword: settings.adminPassword?.trim() || "",
      tasks: settings.tasks,
    });
    setGs(newGs);
    setPhase("game");
  }, []);

  const dispatch = useCallback(async action => {
    const canEdit = !gameId || isAdmin;
    if (!canEdit) return;

    // SET_ACTIVE_BOSS is synchronous and fast — no lock needed.
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
      return;
    }

    if (action.type === "UNDO") {
      // Serialize async operations so two dispatches never read stale gs or pop
      // the same history entry concurrently.
      if (processingRef.current) {
        console.warn('[dispatch] processing lock held — dropping UNDO. Wait a moment and try again.');
        return;
      }
      processingRef.current = true;
      try {
        const { teamId } = action;
        const foundTeam = gsRef.current?.teams?.find(t => t.id === teamId);
        console.log('[undo] triggered for team', teamId, {
          gsPresent: !!gsRef.current,
          teamFound: !!foundTeam,
          teamKeys: foundTeam ? Object.keys(foundTeam) : null,
          completedInTeam: foundTeam ? 'completedPositions' in foundTeam : null,
          replacedInTeam: foundTeam ? 'replacedPositions' in foundTeam : null,
          historyLen: foundTeam && Array.isArray(foundTeam.history) ? foundTeam.history.length : 0,
        });

        // Read current client state snapshot
        const clientGs = gsRef.current;
      if (!clientGs) {
        console.warn('[undo] gs not available, aborting');
        return;
      }
      let team = clientGs.teams.find(t => t.id === teamId);
      if (!team) {
        console.warn('[undo] team not found in gs', teamId);
        return;
      }
      if (!Array.isArray(team.history) || team.history.length === 0) {
        console.warn('[undo] no history available for team', teamId, 'historyLength:', team.history ? team.history.length : 0);
        return;
      }

      const history = [...team.history];
      const snapshot = history.pop();
      console.log('[undo] preparing to restore snapshot for team', teamId, 'from history depth:', history.length, 'snapshotKeys:', snapshot ? Object.keys(snapshot) : null);

      // Fetch latest server state to detect concurrent modifications
      let serverLatest = null;
      try {
        if (gameId) serverLatest = await getTeam(teamId);
      } catch (e) {
        console.error('[undo] failed to fetch latest team from server:', e);
      }

      const serverCompleted = (serverLatest && serverLatest.completedPositions) || (team.completedPositions || Array(25).fill(false));
      const serverReplaced = (serverLatest && serverLatest.replacedPositions) || (team.replacedPositions || Array(25).fill(false));

      // If team has pending remote updates, merge server state now to avoid
      // false stale positives and allow undo to proceed.
      if (team.hasRemoteUpdate && serverLatest) {
        console.log('[undo] team has remote updates, merging server state before stale check', teamId);
        const curCompleted = team.completedPositions || Array(25).fill(false);
        const curReplaced = team.replacedPositions || Array(25).fill(false);
        team = {
          ...team,
          completedPositions: curCompleted.map((v, i) => Boolean(v) || Boolean(serverCompleted[i])),
          replacedPositions: curReplaced.map((v, i) => Boolean(v) || Boolean(serverReplaced[i])),
          hasRemoteUpdate: false,
        };
      }

      // Stale-snapshot check: if the server state differs from our current
      // team state, another session made changes we haven't synced. Abort undo.
      if (gameId && serverLatest) {
        let stale = false;
        let staleReason = '';
        const teamCompleted = team.completedPositions || Array(25).fill(false);
        const teamReplaced = team.replacedPositions || Array(25).fill(false);
        const snapCompleted = snapshot.completedPositions || Array(25).fill(false);
        const snapReplaced = snapshot.replacedPositions || Array(25).fill(false);

        console.log('[undo] stale check inputs', {
          serverCompleted: serverCompleted.map((v,i)=>v?i:-1).filter(v=>v>=0),
          serverReplaced: serverReplaced.map((v,i)=>v?i:-1).filter(v=>v>=0),
          snapCompleted: snapCompleted.map((v,i)=>v?i:-1).filter(v=>v>=0),
          snapReplaced: snapReplaced.map((v,i)=>v?i:-1).filter(v=>v>=0),
          teamCompletedKeys: Object.keys(team).filter(k=>k.includes('ompleted')||k.includes('eplaced')),
          teamCompleted: teamCompleted.map((v,i)=>v?i:-1).filter(v=>v>=0),
          teamReplaced: teamReplaced.map((v,i)=>v?i:-1).filter(v=>v>=0),
          serverLatestKeys: Object.keys(serverLatest).filter(k=>k.includes('ompleted')||k.includes('eplaced')),
          teamId,
          hasTeamCompleted: 'completedPositions' in team,
          hasTeamReplaced: 'replacedPositions' in team,
          serverHasCompleted: 'completedPositions' in serverLatest,
          serverHasReplaced: 'replacedPositions' in serverLatest,
        });

        // Treat completed + replaced as a combined "occupied" state — a position
        // is done if either is true. This avoids false positives when the server
        // sets completedPositions=false for replacement tiles while the client
        // still has it true (before the flip timer fires).
        for (let i = 0; i < 25; i++) {
          const serverOccupied = serverCompleted[i] || serverReplaced[i];
          const snapOccupied = snapCompleted[i] || snapReplaced[i];
          const teamOccupied = teamCompleted[i] || teamReplaced[i];
          if (serverOccupied && !snapOccupied && !teamOccupied) {
            stale = true;
            staleReason = `pos ${i}: serverOccupied=${serverOccupied} snapOccupied=${snapOccupied} teamOccupied=${teamOccupied} (server has more than both)`;
            break;
          }
          if (!serverOccupied && snapOccupied && teamOccupied) {
            stale = true;
            staleReason = `pos ${i}: serverOccupied=${serverOccupied} snapOccupied=${snapOccupied} teamOccupied=${teamOccupied} (server missing what both have)`;
            break;
          }
        }

        if (stale) {
          console.warn('[undo] concurrent modification detected', staleReason, {
            staleReason,
            serverCompleted,
            serverReplaced,
            snapCompleted,
            snapReplaced,
            teamCompleted,
            teamReplaced,
          });
          alert('The game state has changed in another session. Reloading latest state. Please try the undo again.');
          loadSharedGame();
          return;
        } else {
          console.log('[undo] stale check passed (not stale)');
        }
      }

      const undoActionId = uid();
      const restoredBoard = snapshot.board;
      const resolvedPositions = [...(snapshot.completedPositions || Array(25).fill(false))];
      const resolvedReplaced = [...(snapshot.replacedPositions || Array(25).fill(false))];

      const revealedBoard = restoredBoard.map((row, ri) =>
        row.map((tl, ci) => {
          if (!tl.flipped) return tl;
          if (tl.pendingReplacement) {
            // pending replacement should only be applied if server hasn't replaced it
            const idx = ri * 5 + ci;
            if (serverReplaced[idx]) {
              // preserve server replacement
              return tl;
            }
            resolvedPositions[idx] = false;
            resolvedReplaced[idx] = true;
            return { ...tl.pendingReplacement, pendingReplacement: null };
          }
          const idx = ri * 5 + ci;
          // If server has this completed, don't revert it
          if (serverCompleted[idx]) return tl;
          resolvedPositions[idx] = true;
          resolvedReplaced[idx] = false;
          return { ...tl, flipped: false, completed: true, pendingReplacement: null };
        })
      );

      // Recompute line-completed positions from the restored board and the
      // resolved/completed/replaced flags. This ensures undo removes outlines
      // for lines that were completed by the tile being undone.
      const recomputeLineCompleted = (board, completedArr, replacedArr) => {
        const lines = Array(25).fill(false);
        // rows
        for (let r = 0; r < 5; r++) {
          let ok = true;
          for (let c = 0; c < 5; c++) {
            const idx = r * 5 + c;
            const t = board[r]?.[c];
            const flipped = Boolean(t?.flipped);
            if (!(flipped || Boolean(completedArr[idx]) || Boolean(replacedArr[idx]))) {
              ok = false; break;
            }
          }
          if (ok) for (let c = 0; c < 5; c++) lines[r * 5 + c] = true;
        }
        // cols
        for (let c = 0; c < 5; c++) {
          let ok = true;
          for (let r = 0; r < 5; r++) {
            const idx = r * 5 + c;
            const t = board[r]?.[c];
            const flipped = Boolean(t?.flipped);
            if (!(flipped || Boolean(completedArr[idx]) || Boolean(replacedArr[idx]))) {
              ok = false; break;
            }
          }
          if (ok) for (let r = 0; r < 5; r++) lines[r * 5 + c] = true;
        }
        // diag 1
        let ok1 = true;
        for (let i = 0; i < 5; i++) {
          const idx = i * 5 + i;
          const t = board[i]?.[i];
          const flipped = Boolean(t?.flipped);
          if (!(flipped || Boolean(completedArr[idx]) || Boolean(replacedArr[idx]))) { ok1 = false; break; }
        }
        if (ok1) for (let i = 0; i < 5; i++) lines[i * 5 + i] = true;
        // diag 2
        let ok2 = true;
        for (let i = 0; i < 5; i++) {
          const idx = i * 5 + (4 - i);
          const t = board[i]?.[4 - i];
          const flipped = Boolean(t?.flipped);
          if (!(flipped || Boolean(completedArr[idx]) || Boolean(replacedArr[idx]))) { ok2 = false; break; }
        }
        if (ok2) for (let i = 0; i < 5; i++) lines[i * 5 + (4 - i)] = true;
        return lines;
      };

      const finalLinePositions = recomputeLineCompleted(revealedBoard, resolvedPositions, resolvedReplaced);

      console.log('[undo] recompute line positions', {
        teamId,
        resolvedPositionsSample: resolvedPositions.slice(0, 25).map((v,i)=>({i,v})),
        resolvedReplacedSample: resolvedReplaced.slice(0,25).map((v,i)=>({i,v})),
        finalLinePositions,
      });

      const damagedBossIdx = snapshot.activeBossIndex;
      const currentTeamBossHp = team.bosses[damagedBossIdx]?.currentHp ?? 0;
      const snapBossHp = snapshot.bosses[damagedBossIdx]?.currentHp;
      const serverBossHp = serverLatest?.bosses?.[damagedBossIdx]?.currentHp ?? currentTeamBossHp;
      const hasExternalDamage = serverLatest && snapBossHp != null && serverBossHp < currentTeamBossHp;
      const dmg_restored = !hasExternalDamage && snapBossHp != null ? Math.max(0, snapBossHp - currentTeamBossHp) : 0;

      // Merge bosses: restore the damaged boss to its pre-click snapHp so undo
      // actually reverts the health cost. Other bosses prefer the lower HP
      // (preserve damage applied by other sessions).
      const mergedBosses = (snapshot.bosses || []).map((sb, idx) => {
        const srv = serverLatest && serverLatest.bosses && serverLatest.bosses[idx] ? serverLatest.bosses[idx] : null;
        const srvHp = srv ? Number(srv.currentHp || 0) : null;
        const snapHp = Number(sb.currentHp || 0);
        const currentHp = idx === damagedBossIdx
          ? snapHp
          : (srvHp !== null && srvHp < snapHp) ? srvHp : snapHp;
        // For the damaged boss (the one being undone), ignore srv.defeated —
        // the server still has the old defeated=true because the RPC processed
        // this tile, but the undo is reverting it. Use only the snapshot and HP.
        const defeated = idx === damagedBossIdx
          ? Boolean(sb.defeated) || currentHp <= 0
          : Boolean(sb.defeated) || (srv ? Boolean(srv.defeated) : false) || currentHp <= 0;
        return { ...sb, currentHp, defeated };
      });

      const restoreLogEntry = {
        id: uid(),
        time: fmtTime(),
        damage: dmg_restored || 0,
        boss: snapshot.bosses[damagedBossIdx]?.name || 'Unknown',
        task: '',
        type: 'restore',
      };
      // Keep the full log history — preserve damage entries from the tile being
      // undone and append the restore entry so the full history is visible.
      const baseLog = [...(team.log || [])];

      const updatedTeam = {
        ...team,
        bosses:                 mergedBosses,
        activeBossIndex:        snapshot.activeBossIndex,
        board:                  revealedBoard,
        exhaustedTasks:         snapshot.exhaustedTasks,
        completedPositions:     resolvedPositions,
        replacedPositions:      resolvedReplaced,
        lineCompletedPositions: finalLinePositions,
        log:                    [...baseLog, restoreLogEntry],
        damageFloats:           [],
        history,
      };

      setGs(g => {
        if (!g) return g;
        const newTeams = g.teams.map(t => t.id === teamId ? updatedTeam : t);
        const winner = g.winner && newTeams.find(t => t.id === g.winner.id)?.bosses.every(b => b.defeated)
          ? g.winner : null;
        return { ...g, teams: newTeams, winner, undoFlashTeamId: teamId };
      });

      if (gameId && isAdmin) {
        console.log('[undo] saving undone team state to database');
        const teamData = transformBack(updatedTeam);
        localActionIds.current.add(undoActionId);
        saveUndoState(teamId, teamData, gameId, serverCompleted, serverReplaced, undoActionId).catch(err => {
          if (err?.message?.includes('concurrent_modification') || err?.details?.includes('concurrent_modification')) {
            console.warn('[undo] concurrent modification detected by server, reloading');
            alert('Another change was made while undoing. Reloading latest state.');
            loadSharedGame();
          } else {
            console.error('[undo] failed to save undo state:', err);
          }
        });
      }

      setTimeout(() => setGs(g => g ? { ...g, undoFlashTeamId: null } : g), 600);
      } finally {
        processingRef.current = false;
      }
    } else if (action.type === "TILE_CLICK") {
      if (processingRef.current) {
        console.warn('[dispatch] processing lock held — dropping TILE_CLICK. Wait a moment and try again.');
        return;
      }
      processingRef.current = true;
      try {
        const { teamId, r, c } = action;

        // Before applying optimistic update, fetch latest server state to incorporate
        // any completed/replaced tiles or boss changes made by other clients.
        let serverLatest = null;
        try {
          if (gameId) serverLatest = await getTeam(teamId);
        } catch (e) {
          console.error('[tile-click] failed to fetch latest team from server:', e);
        }

        setGs(g => {
        if (!g || g.winner) return g;
        let team = g.teams.find(t => t.id === teamId);
        // If we have a server state, merge completed/replaced/board/bosses conservatively
        const preMergeCompleted = [...(team.completedPositions || Array(25).fill(false))];
        const preMergeReplaced = [...(team.replacedPositions || Array(25).fill(false))];
        if (serverLatest && team && serverLatest.id === teamId) {
          try {
            const serverCompleted = serverLatest.completedPositions || Array(25).fill(false);
            const serverReplaced = serverLatest.replacedPositions || Array(25).fill(false);
            const serverBoard = serverLatest.board || team.board;
            const serverBosses = serverLatest.bosses || team.bosses;

            const mergedCompleted = (team.completedPositions || Array(25).fill(false)).map((v, i) => Boolean(v) || Boolean(serverCompleted[i]));
            const mergedReplaced = (team.replacedPositions || Array(25).fill(false)).map((v, i) => Boolean(v) || Boolean(serverReplaced[i]));

            // Detect positions the server added (completed by another player) and
            // positions the server removed (undone by another player). Compare against
            // the raw SERVER state — the OR-merge preserves local state so undone
            // positions would never show as !nowOccupied.
            const mergedFlashPositions = [];
            const mergedUndonePositions = [];
            for (let i = 0; i < 25; i++) {
              const wasOccupied = preMergeCompleted[i] || preMergeReplaced[i];
              const serverOccupied = Boolean(serverCompleted[i]) || Boolean(serverReplaced[i]);
              const nowOccupied = mergedCompleted[i] || mergedReplaced[i];
              if (!wasOccupied && nowOccupied) {
                mergedFlashPositions.push(i);
              }
              if (wasOccupied && !serverOccupied && !preMergeReplaced[i]) {
                mergedUndonePositions.push(i);
              }
            }

            // Merge bosses: prefer the lower currentHp (preserve damage applied by others)
            const mergedBosses = (team.bosses || []).map((b, i) => {
              const sb = serverBosses[i] || {};
              const tbHp = Number(b.currentHp || 0);
              const sbHp = Number(sb.currentHp || tbHp);
              const currentHp = Math.min(tbHp, sbHp);
              const defeated = Boolean(b.defeated) || Boolean(sb.defeated) || currentHp <= 0;
              return { ...b, ...sb, currentHp, defeated };
            });

            team = { ...team, board: serverBoard, bosses: mergedBosses, completedPositions: mergedCompleted, replacedPositions: mergedReplaced, activeBossIndex: serverLatest.activeBossIndex ?? team.activeBossIndex, hasRemoteUpdate: false };

            if (mergedFlashPositions.length > 0) {
              team = { ...team, remoteFlashPositions: mergedFlashPositions };
              setTimeout(() => {
                setGs(prev2 => {
                  if (!prev2) return prev2;
                  const clearTeams = [...prev2.teams];
                  const clearIdx = clearTeams.findIndex(t => t.id === teamId);
                  if (clearIdx !== -1) clearTeams[clearIdx] = { ...clearTeams[clearIdx], remoteFlashPositions: [] };
                  return { ...prev2, teams: clearTeams };
                });
              }, 2500);
            }

            if (mergedFlashPositions.length > 0 || mergedUndonePositions.length > 0) {
              const parts = [];
              if (mergedFlashPositions.length > 0) parts.push(`completed ${mergedFlashPositions.length} tile(s)`);
              if (mergedUndonePositions.length > 0) parts.push(`undid ${mergedUndonePositions.length} tile(s)`);
              setPersistentNote({
                id: Date.now(),
                message: `Another player ${parts.join(' and ')}. The board has been updated.`,
              });
            }
          } catch (e) {
            console.error('[tile-click] error merging server state:', e);
          }
        }
        if (!team) return g;
        const tileIndex = r * 5 + c;
        if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r > 4 || c < 0 || c > 4) {
          alert(`Invalid tile position: row ${r}, col ${c}`);
          return g;
        }
        if (!isUuid(teamId)) {
          alert(`This game uses an old team id (${teamId}). Create a new game to enable shared editing.`);
          return g;
        }
        if (!Array.isArray(team.board) || team.board.length !== 5 || !Array.isArray(team.board[r]) || team.board[r].length !== 5) {
          alert("This game board is corrupted. Create a new game.");
          return g;
        }
        const tile = team.board[r][c];
        console.log("[tile-click] teamId:", teamId, "row:", r, "col:", c, "tileIndex:", tileIndex, "tile:", tile);
        if (!tile) {
          alert(`Tile not found locally at row ${r}, col ${c}.`);
          return g;
        }
        if (team.replacedPositions?.[tileIndex]) {
          // Replaced positions take precedence over completedPositions, since the
          // OR-merge may re-set completedPositions=true from stale server data.
          if (serverLatest && !preMergeReplaced[tileIndex] && serverLatest.replacedPositions?.[tileIndex]) {
            console.warn('[tile-click] position replaced by another session, reloading', { teamId, r, c, tileIndex });
            alert('This tile was already completed by another player. Reloading...');
            loadSharedGame();
            return g;
          }
          const currentTile = team.board[r][c];
          if (!currentTile) {
            console.warn('[tile-click] replaced position has no current tile', { teamId, r, c, tileIndex });
            return g;
          }
          if (currentTile.flipped || currentTile.completed) {
            console.warn('[tile-click] replaced tile already flipped/completed, blocking click', { teamId, r, c, tileIndex });
            return g;
          }
        } else if (team.completedPositions?.[tileIndex]) {
          if (serverLatest && !preMergeCompleted[tileIndex] && serverLatest.completedPositions?.[tileIndex]) {
            console.warn('[tile-click] position completed by another session, reloading', { teamId, r, c, tileIndex });
            alert('This tile was already completed by another player. Reloading...');
            loadSharedGame();
            return g;
          }
          // If the server says this tile is free (another session undid it),
          // allow the click even though our merged state still shows it.
          if (serverLatest && !serverLatest.completedPositions?.[tileIndex] && !serverLatest.replacedPositions?.[tileIndex]) {
            console.log('[tile-click] tile was undone by another session, allowing click', { teamId, r, c, tileIndex });
          } else {
            console.warn('[tile-click] position already completed, blocking click', { teamId, r, c, tileIndex });
            return g;
          }
        }
        if (tile.flipped || tile.completed) {
          console.warn('[tile-click] tile already flipped or completed', { teamId, r, c, tileIndex, flipped: tile.flipped, completed: tile.completed });
          return g;
        }
        const boss = team.bosses[team.activeBossIndex];
        if (!boss || boss.defeated) {
          console.warn('[tile-click] boss not available', { teamId, r, c, tileIndex, boss, activeBossIndex: team.activeBossIndex });
          return g;
        }

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
        const clientActionId = uid();

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
            pendingReplacement = makeTile(newTask, g.settings.dMin, g.settings.dMax, false, g.settings.randomizeDamage, g.settings.fixedDamage);
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
          hasRemoteUpdate:        false,
        };

        const newTeams = g.teams.map(t => t.id === teamId ? updatedTeam : t);
        const winnerTeam = !g.winner && allBossesDefeated ? updatedTeam : g.winner;
        const newGs = { ...g, teams: newTeams, winner: winnerTeam || null };

        if (gameId && isAdmin) {
          const actionPayload = {
            clientActionId,
            tileIndex,
            row: r,
            col: c,
            damage: totalDmg,
            oldActiveBossIndex: team.activeBossIndex,
            newActiveBossIndex: newActiveIdx,
            logEntry,
            historySnapshot: snapshotTeam(team, g),
            pendingReplacement,
            completedPositions: newCompletedPositions,
            replacedPositions: newReplacedPositions,
            lineCompletedPositions: newLineCompletedPositions,
            exhaustedTasks: newExhaustedTasks,
          };
          console.log("[tile-click] applying action:", actionPayload);
          localActionIds.current.add(clientActionId);
          applyTileAction(gameId, teamId, actionPayload).then(result => {
            console.log("[tile-click] rpc result:", result);
            if (result?.applied === false) {
              localActionIds.current.delete(clientActionId);
              loadSharedGame();
              alert(`Could not apply this tile action: ${result.reason || 'unknown reason'}`);
            } else if (result?.applied === true && result?.team) {
              // Server applied the action — reconcile optimistic state with the
              // authoritative server response so the originating tab doesn't keep
              // stale state (e.g. old tiles from before another session undid them).
              localActionIds.current.delete(clientActionId);
              setGs(prev => {
                if (!prev) return prev;
                const teams = [...prev.teams];
                const idx = teams.findIndex(t => t.id === teamId);
                if (idx !== -1) {
                  const serverTeam = transformTeam(result.team);
                  teams[idx] = { ...serverTeam, damageFloats: teams[idx].damageFloats || [] };
                }
                return { ...prev, teams };
              });
            }
          }).catch(err => {
            localActionIds.current.delete(clientActionId);
            console.error("Failed to apply tile action:", err);
            loadSharedGame();
            const message = err?.message || err?.details || JSON.stringify(err);
            alert(`Could not save this tile action to the database: ${message}`);
          });
          setTimeout(() => localActionIds.current.delete(clientActionId), 5000);
        }

        // Timer only reveals the pre-computed replacement — no task selection here.
        const key = `${teamId}-${r}-${c}`;
        clearTimeout(timers.current[key]);
        timers.current[key] = setTimeout(() => {
          try {
            setGs(prev => {
              if (!prev) return prev;
              const teamIdx = prev.teams.findIndex(t => t.id === teamId);
              if (teamIdx === -1) {
                console.warn('[tile-click] team not found during replacement reveal');
                return prev;
              }
              const t    = prev.teams[teamIdx];
              const tile = t.board[r]?.[c];

              // If this tile was undone (restored to flipped:false), skip silently.
              if (!tile?.flipped) {
                console.log('[tile-click] tile was undone, skipping replacement reveal');
                return prev;
              }

              const resolvedPositions = [...(t.completedPositions || Array(25).fill(false))];
              const resolvedReplaced = [...(t.replacedPositions || Array(25).fill(false))];
              const board = t.board.map((row, ri) =>
                row.map((tl, ci) => {
                  if (ri !== r || ci !== c) return tl;
                  if (tl.pendingReplacement) {
                    resolvedPositions[r * 5 + c] = false;
                    resolvedReplaced[r * 5 + c] = true;
                    console.log('[tile-click] replacement revealed for ', r, c);
                    return { ...tl.pendingReplacement, pendingReplacement: null };
                  }
                  resolvedPositions[r * 5 + c] = true;
                  resolvedReplaced[r * 5 + c] = false;
                  return { ...tl, flipped: false, completed: true, pendingReplacement: null };
                })
              );

              const newTeams = [...prev.teams];
              newTeams[teamIdx] = { ...t, board, completedPositions: resolvedPositions, replacedPositions: resolvedReplaced };

              let winner = prev.winner;
              if (!winner) {
                const updated = newTeams[teamIdx];
                const boardCleared = updated.board.every(row => row.every(tl => tl.completed || tl.flipped));
                const tasksExhausted = !prev.settings.replacement || updated.exhaustedTasks.length >= prev.settings.tasks.length;
                if (boardCleared && tasksExhausted) {
                  console.log('[tile-click] board cleared — team', teamId, 'wins');
                  winner = updated;
                }
              }

              return { ...prev, teams: newTeams, winner: winner || null };
            });
          } catch (err) {
            console.error('[tile-click] error in replacement reveal timer:', err);
          }
        }, 1400);

        // Clean up damage float after animation.
        setTimeout(() => {
          try {
            setGs(prev => {
              if (!prev) return prev;
              const teams = prev.teams.map(t =>
                t.id === teamId
                  ? { ...t, damageFloats: (t.damageFloats || []).filter(f => f.id !== floatId) }
                  : t
              );
              return { ...prev, teams };
            });
          } catch (err) {
            console.error('[tile-click] error in damage float cleanup:', err);
          }
        }, 1650);

        return newGs;
      });
      } finally {
        processingRef.current = false;
      }
    }
  }, [isAdmin, gameId]);

  const handleNewGame = useCallback(() => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    if (gameId) {
      localStorage.removeItem(`admin_${gameId}`);
      window.history.replaceState(null, "", "/");
    } else {
      try { localStorage.clear(); } catch {}
    }
    setGs(null);
    setActiveGameId(null);
    setSavedSettings(null);
    setPhase("setup");
    setIsAdmin(false);
    setRequiresAdmin(false);
  }, [gameId]);

  const handleCopySettings = useCallback(() => {
    if (!savedSettings) return;
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    if (gameId) {
      localStorage.removeItem(`admin_${gameId}`);
      window.history.replaceState(null, "", "/");
    } else {
      try { localStorage.clear(); } catch {}
    }
    setGs(null);
    setActiveGameId(null);
    setPhase("setup");
    setIsAdmin(false);
    setRequiresAdmin(false);
  }, [gameId, savedSettings]);

  const handleReset = useCallback(() => {
    if (!gs) return;
    const ok = window.confirm("Reset this game? All progress for all teams will be cleared. This cannot be undone.");
    if (!ok) return;
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    setGs(prev => {
      if (!prev) return prev;
      const resetTeams = prev.teams.map(t => ({
        ...t,
        board:           t.board.map(row => row.map(tile => ({ ...tile, flipped: false, completed: false, pendingReplacement: null, isNew: false }))),
        bosses:          t.bosses.map(b => ({ ...b, currentHp: b.maxHp, defeated: false })),
        log:             [],
        damageFloats:    [],
        history:         [],
        completedPositions:     Array(25).fill(false),
        replacedPositions:      Array(25).fill(false),
        lineCompletedPositions: Array(25).fill(false),
        exhaustedTasks:         [...prev.settings.tasks],
        activeBossIndex:        0,
        hasRemoteUpdate:        false,
        remoteFlashPositions:   [],
      }));
      return { ...prev, teams: resetTeams, winner: null };
    });
  }, [gs]);

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
      {phase === "setup" && <AdminPanel key={savedSettings ? "copy" : "blank"} onStart={handleStart} initialSettings={savedSettings} />}
      {phase === "game" && gs && (
        <GameView 
          gs={gs} 
          dispatch={dispatch} 
          onReset={handleReset}
          onNewGame={handleNewGame}
          onCopySettings={handleCopySettings}
          onExport={handleExport} 
          isAdmin={isAdmin}
          requiresAdmin={requiresAdmin}
          gameId={gameId}
          onShowPasswordPrompt={() => setShowPasswordPrompt(true)}
          onAdminLogout={() => { setIsAdmin(false); localStorage.removeItem(`admin_${gameId}`); window.location.reload(); }}
        />
      )}
      {toast && (
        <div className="toast-container" key={toast.id}>
          <div style={{
            background: "linear-gradient(180deg,#1a0e00,#0d0600)",
            border: "1px solid #c8a951",
            borderRadius: 4,
            padding: "10px 22px",
            color: "#fcd34d",
            fontSize: 13,
            boxShadow: "0 4px 30px rgba(0,0,0,.8), 0 0 20px rgba(200,169,81,.12)",
            textAlign: "center",
          }}>
            {toast.message}
          </div>
        </div>
      )}
      {persistentNote && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998, backdropFilter: "blur(2px)" }} onClick={() => setPersistentNote(null)}>
          <div style={{ background: "linear-gradient(145deg,#1a0e00,#0d0600)", border: "2px solid #f59e0b", borderRadius: 6, padding: "28px 36px", maxWidth: 420, width: "90%", textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,.9), 0 0 30px rgba(245,158,11,.15)" }} onClick={e => e.stopPropagation()}>
            <div className="cf" style={{ fontSize: 14, color: "#f59e0b", fontWeight: 700, marginBottom: 12, letterSpacing: ".08em", textTransform: "uppercase" }}>
              ⚠ Board Updated
            </div>
            <p style={{ color: "#c8a951", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
              {persistentNote.message}
            </p>
            <button className="btn btn-amber" style={{ fontSize: 11, padding: "8px 24px" }} onClick={() => setPersistentNote(null)}>
              Got it
            </button>
          </div>
        </div>
      )}
      {showPasswordPrompt && requiresAdmin && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <form onSubmit={handlePasswordSubmit} style={{ background: "#1a0e00", padding: "40px", borderRadius: "8px", border: "1px solid #4a3010", position: "relative" }}>
            <button type="button" onClick={() => { setShowPasswordPrompt(false); setPasswordInput(""); setPasswordError(""); }} style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", color: "#5a4020", fontSize: 20, cursor: "pointer" }}>×</button>
            <h2 style={{ color: "#c8a951", marginBottom: "20px", fontFamily: "Cinzel, serif" }}>Admin Access</h2>
            <input
              type="password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              placeholder="Enter admin password"
              style={{ width: "100%", marginBottom: "10px" }}
            />
            {passwordError && <p style={{ color: "#f87171", marginBottom: "10px" }}>{passwordError}</p>}
            <button type="submit" className="btn btn-amber">Unlock</button>
          </form>
        </div>
      )}
    </div>
  );
}