import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GameState, Team, Boss, Task, AdminSettings, DamageLogEntry, FloatingDamage
} from '../types';
import { DEFAULT_TASKS } from '../data/tasks';
import { DEFAULT_BOSSES, createBoss } from '../data/bosses';
import {
  generateBoard, generateNewTile, generateId, randomInt,
  checkTeamVictory, TEAM_COLORS, saveToStorage, loadFromStorage, checkRowCompletion
} from '../utils';

interface GameStore extends GameState {
  floatingDamages: FloatingDamage[];

  // Setup actions
  initGame: () => void;
  startGame: () => void;
  resetGame: () => void;
  updateSettings: (settings: Partial<AdminSettings>) => void;
  updateTaskPool: (tasks: Task[]) => void;

  // Game actions
  completeTile: (teamId: string, tileIndex: number) => void;
  setActiveBoss: (teamId: string, bossIndex: number) => void;
  setTileFlipping: (teamId: string, tileIndex: number, flipping: boolean) => void;

  // UI
  addFloatingDamage: (damage: FloatingDamage) => void;
  removeFloatingDamage: (id: string) => void;
}

const DEFAULT_SETTINGS: AdminSettings = {
  damageMin: 50,
  damageMax: 200,
  tileReplacement: true,
  rowBonusDamage: 50,
  enableRowBonus: true,
  selectedBossIds: ['b035', 'b018'], // Zulrah, KBD
  teamNames: ['Team Dragon', 'Team Zulrah', 'Team Bandos', 'Team Armadyl'],
  teamCount: 2,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      phase: 'active',
      teams: [],
      settings: DEFAULT_SETTINGS,
      taskPool: DEFAULT_TASKS,
      bossPool: DEFAULT_BOSSES.map(createBoss),
      floatingDamages: [],
      winner: undefined,
      startTime: undefined,
      endTime: undefined,
      completedTaskIds: new Set<string>(),

      initGame: () => {
        const { settings, taskPool, bossPool } = get();
        const selectedBosses = settings.selectedBossIds
          .map(id => bossPool.find(b => b.id === id))
          .filter(Boolean) as Boss[];

        if (selectedBosses.length === 0) return;

        const teams: Team[] = Array.from({ length: settings.teamCount }, (_, i) => {
          const board = generateBoard(taskPool, settings.damageMin, settings.damageMax);
          const bosses: Boss[] = selectedBosses.map(b => ({
            ...b,
            currentHp: b.maxHp,
            isDefeated: false,
          }));

          return {
            id: generateId(),
            name: settings.teamNames[i] || `Team ${i + 1}`,
            color: TEAM_COLORS[i % TEAM_COLORS.length],
            board,
            bosses,
            activeBossIndex: 0,
            damageLog: [],
            completedTasks: 0,
            totalDamageDealt: 0,
            hasWon: false,
            completedPositions: new Array(25).fill(false),
          };
        });

        set({ teams, phase: 'setup' });
      },

      startGame: () => {
        const { teams } = get();
        if (teams.length === 0) get().initGame();
        set({ phase: 'active', startTime: Date.now() });
      },

      resetGame: () => {
        set({
          phase: 'setup',
          teams: [],
          winner: undefined,
          startTime: undefined,
          endTime: undefined,
          completedTaskIds: new Set<string>(),
        });
      },

      updateSettings: (newSettings) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      updateTaskPool: (tasks) => {
        set({ taskPool: tasks });
      },

      completeTile: (teamId, tileIndex) => {
        const state = get();
        if (state.phase !== 'active') return;

        const teamIndex = state.teams.findIndex(t => t.id === teamId);
        if (teamIndex === -1) return;

        const team = state.teams[teamIndex];
        if (team.hasWon) return;

        const tile = team.board[tileIndex];
        if (!tile || tile.completed) return;

        const activeBossIndex = team.activeBossIndex;
        const activeBoss = team.bosses[activeBossIndex];

        // If there's no valid active boss (e.g. all bosses defeated or none selected),
        // allow completing tiles so a team can still win by completing the whole board.
        const damage = (activeBoss && !activeBoss.isDefeated) ? tile.damage : 0;
        const newHp = activeBoss ? Math.max(0, activeBoss.currentHp - damage) : undefined;
        const bossDefeated = newHp === 0;

        // Build log entry for the tile completion
        const logEntry: DamageLogEntry = {
          id: generateId(),
          timestamp: Date.now(),
          taskDescription: tile.task.description,
          damage,
          bossName: activeBoss ? activeBoss.name : 'No Boss',
          tilePosition: tileIndex,
        };

        let bonusLogEntry: DamageLogEntry | undefined;

        let newTeams = state.teams.map((t, idx) => {
          if (idx !== teamIndex) return t;

          // Check if completing this tile would complete a row
          const isRowCompleted = checkRowCompletion(t.completedPositions, tileIndex);
          
          // Calculate bonus damage if row is completed
          let totalDamage = damage;
          let bonusDamage = 0;
          if (isRowCompleted && state.settings.enableRowBonus && state.settings.rowBonusDamage > 0) {
            bonusDamage = state.settings.rowBonusDamage;
            totalDamage += bonusDamage;
          }
          
          const newHpWithBonus = activeBoss ? Math.max(0, activeBoss.currentHp - totalDamage) : undefined;
          const bossDefeatedWithBonus = newHpWithBonus === 0;

          // Update bosses with potential bonus damage
          let updatedBosses = t.bosses;
          let nextActiveBossIndex = activeBossIndex;
          if (activeBoss && !activeBoss.isDefeated) {
            updatedBosses = t.bosses.map((b, bIdx) => {
              if (bIdx !== activeBossIndex) return b;
              return { ...b, currentHp: newHpWithBonus as number, isDefeated: bossDefeatedWithBonus };
            });

            // Determine next active boss if current is defeated
            if (bossDefeatedWithBonus) {
              const nextIdx = updatedBosses.findIndex((b, i) => i > activeBossIndex && !b.isDefeated);
              if (nextIdx !== -1) nextActiveBossIndex = nextIdx;
            }
          }

          // Create separate bonus log entry if applicable
          if (bonusDamage > 0) {
            bonusLogEntry = {
              id: generateId(),
              timestamp: Date.now(),
              taskDescription: `Row/Column/Diagonal Bonus`,
              damage: bonusDamage,
              bossName: activeBoss ? activeBoss.name : 'No Boss',
              tilePosition: tileIndex,
            };
          }

          // Update board with wasCompleted tracking
          let newBoard = [...t.board];
          if (state.settings.tileReplacement) {
            const currentTaskIds = newBoard.filter((_, i) => i !== tileIndex).map(tile => tile.task.id);
            const newTile = generateNewTile(state.taskPool, state.settings.damageMin, state.settings.damageMax, currentTaskIds);
            newBoard[tileIndex] = newTile;
            // Mark the original tile as having been completed before replacement
            newBoard[tileIndex] = { ...newTile, wasCompleted: true };
          } else {
            newBoard[tileIndex] = { ...tile, completed: true, isFlipping: false };
          }

          // Determine victory either by all bosses defeated or by completing all tiles
          const newCompletedPositions = [...t.completedPositions];
          newCompletedPositions[tileIndex] = true;

          const tentativeTeam = {
            ...t,
            board: newBoard,
            bosses: updatedBosses,
            activeBossIndex: nextActiveBossIndex,
            damageLog: bonusLogEntry ? [bonusLogEntry, logEntry, ...t.damageLog].slice(0, 100) : [logEntry, ...t.damageLog].slice(0, 100),
            completedTasks: t.completedTasks + 1,
            totalDamageDealt: t.totalDamageDealt + totalDamage,
            completedPositions: newCompletedPositions,
          } as Team;

          // Victory rules:
          // - Win if all bosses are defeated
          // - OR when tile replacement is enabled: win once the team has completed 25 or more tiles cumulatively
          // - OR when tile replacement is disabled: win when all 25 tiles on the current board are completed
          const bossesDefeated = updatedBosses.every(b => b.isDefeated);
          const tileReplacementEnabled = state.settings.tileReplacement;
          const tilesCompletedCumulative = tentativeTeam.completedTasks;
          const allTilesCompletedNow = tentativeTeam.board.every(tile => tile.completed === true);

          const tileWin = tileReplacementEnabled ? (tilesCompletedCumulative >= 25) : allTilesCompletedNow;
          const hasWon = bossesDefeated || tileWin;
          const reason: 'bosses' | 'tiles' | undefined = bossesDefeated ? 'bosses' : tileWin ? 'tiles' : undefined;

          return {
            ...tentativeTeam,
            hasWon,
            winReason: hasWon && !t.hasWon ? reason : t.winReason,
            winTime: hasWon && !t.hasWon ? Date.now() : t.winTime,
          };
        });

        // Add task to completed tasks
        const newCompletedTaskIds = new Set(state.completedTaskIds);
        newCompletedTaskIds.add(tile.task.id);

        // Check for overall winner
        // Determine overall winner. If no team was marked hasWon above, also
        // check the cumulative tile-completion condition (covers replacement mode).
        let winningTeam = newTeams.find((t: Team) => t.hasWon);

        if (!winningTeam && state.settings.tileReplacement) {
          const tileWinner = newTeams.find((t: Team) => t.completedTasks >= 25);
          if (tileWinner) {
            winningTeam = tileWinner;
            // ensure the team object reflects the win
            newTeams = newTeams.map(t =>
              t.id === tileWinner.id ? { ...t, hasWon: true, winReason: 'tiles', winTime: t.winTime || Date.now() } : t
            );
          }
        }

        const newPhase = winningTeam ? 'finished' : state.phase;

        set({
          teams: newTeams,
          phase: newPhase,
          winner: winningTeam?.name,
          winReason: winningTeam?.winReason,
          endTime: winningTeam ? Date.now() : state.endTime,
          completedTaskIds: newCompletedTaskIds,
        });
      },

      setActiveBoss: (teamId, bossIndex) => {
        set(state => ({
          teams: state.teams.map(t =>
            t.id === teamId ? { ...t, activeBossIndex: bossIndex } : t
          ),
        }));
      },

      setTileFlipping: (teamId, tileIndex, flipping) => {
        set(state => ({
          teams: state.teams.map(t => {
            if (t.id !== teamId) return t;
            const newBoard = [...t.board];
            newBoard[tileIndex] = { ...newBoard[tileIndex], isFlipping: flipping };
            return { ...t, board: newBoard };
          }),
        }));
      },

      addFloatingDamage: (damage) => {
        set(state => ({ floatingDamages: [...state.floatingDamages, damage] }));
      },

      removeFloatingDamage: (id) => {
        set(state => ({ floatingDamages: state.floatingDamages.filter(d => d.id !== id) }));
      },
    }),
    {
      name: 'osrs-bingo-state',
      partialize: (state) => ({
        phase: state.phase,
        teams: state.teams,
        settings: state.settings,
        taskPool: state.taskPool,
        bossPool: state.bossPool,
        winner: state.winner,
        startTime: state.startTime,
        endTime: state.endTime,
        completedTaskIds: Array.from(state.completedTaskIds),
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.completedTaskIds)) {
          state.completedTaskIds = new Set(state.completedTaskIds);
        }
        if (state && state.teams) {
          state.teams = state.teams.map(team => ({
            ...team,
            completedPositions: team.completedPositions || new Array(25).fill(false),
          }));
        }
      },
    }
  )
);
