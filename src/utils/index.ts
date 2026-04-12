import { Task, BingoTile, Boss, Team } from '../types';
import { DEFAULT_TASKS } from '../data/tasks';

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateBoard(tasks: Task[], damageMin: number, damageMax: number, usedTaskIds: Set<string> = new Set()): BingoTile[] {
  const availableTasks = tasks.filter(t => !usedTaskIds.has(t.id));
  
  // If not enough tasks, reuse from pool
  const pool = availableTasks.length >= 25 ? availableTasks : [...tasks];
  const shuffled = shuffleArray(pool);
  const selected = shuffled.slice(0, 25);

  return selected.map((task, index) => ({
    id: generateId(),
    task,
    damage: randomInt(damageMin, damageMax),
    completed: false,
    wasCompleted: false,
    isFlipping: false,
    isNew: false,
  }));
}

export function generateNewTile(tasks: Task[], damageMin: number, damageMax: number, excludeTaskIds: string[]): BingoTile {
  const available = tasks.filter(t => !excludeTaskIds.includes(t.id));
  const pool = available.length > 0 ? available : tasks;
  const task = pool[Math.floor(Math.random() * pool.length)];
  
  return {
    id: generateId(),
    task,
    damage: randomInt(damageMin, damageMax),
    completed: false,
    wasCompleted: false,
    isFlipping: false,
    isNew: true,
  };
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function getCategoryColor(category: Task['category']): string {
  const colors: Record<Task['category'], string> = {
    combat: '#cc2020',
    skilling: '#2a8a2a',
    collection: '#8040c0',
    exploration: '#2060c0',
    minigame: '#d06820',
    achievement: '#c8a84b',
  };
  return colors[category];
}

export function getCategoryIcon(category: Task['category']): string {
  const icons: Record<Task['category'], string> = {
    combat: '⚔️',
    skilling: '⛏️',
    collection: '🎒',
    exploration: '🗺️',
    minigame: '🏆',
    achievement: '⭐',
  };
  return icons[category];
}

export function getDifficultyMultiplier(difficulty: Task['difficulty']): number {
  return { easy: 1, medium: 1.5, hard: 2.5 }[difficulty];
}

export function checkBingo(board: BingoTile[]): boolean {
  const grid = Array(5).fill(null).map((_, row) =>
    Array(5).fill(null).map((_, col) => board[row * 5 + col]?.completed ?? false)
  );

  // Check rows
  for (let r = 0; r < 5; r++) {
    if (grid[r].every(Boolean)) return true;
  }
  // Check columns
  for (let c = 0; c < 5; c++) {
    if (grid.map(row => row[c]).every(Boolean)) return true;
  }
  // Diagonals
  if ([0,1,2,3,4].map(i => grid[i][i]).every(Boolean)) return true;
  if ([0,1,2,3,4].map(i => grid[i][4-i]).every(Boolean)) return true;

  return false;
}

export function getCompletedRows(board: BingoTile[]): number[] {
  const grid = Array(5).fill(null).map((_, row) =>
    Array(5).fill(null).map((_, col) => board[row * 5 + col]?.completed ?? false)
  );

  const completedTiles: number[] = [];

  // Check rows
  for (let r = 0; r < 5; r++) {
    if (grid[r].every(Boolean)) {
      for (let c = 0; c < 5; c++) {
        completedTiles.push(r * 5 + c);
      }
    }
  }

  // Check columns
  for (let c = 0; c < 5; c++) {
    if (grid.map(row => row[c]).every(Boolean)) {
      for (let r = 0; r < 5; r++) {
        const idx = r * 5 + c;
        if (!completedTiles.includes(idx)) completedTiles.push(idx);
      }
    }
  }

  // Check diagonals
  if ([0,1,2,3,4].map(i => grid[i][i]).every(Boolean)) {
    for (let i = 0; i < 5; i++) {
      const idx = i * 5 + i;
      if (!completedTiles.includes(idx)) completedTiles.push(idx);
    }
  }

  if ([0,1,2,3,4].map(i => grid[i][4-i]).every(Boolean)) {
    for (let i = 0; i < 5; i++) {
      const idx = i * 5 + (4 - i);
      if (!completedTiles.includes(idx)) completedTiles.push(idx);
    }
  }

  return completedTiles;
}

export function checkRowCompletion(completedPositions: boolean[], tileIndex: number): boolean {
  const row = Math.floor(tileIndex / 5);
  const col = tileIndex % 5;
  const grid = Array(5).fill(null).map((_, r) =>
    Array(5).fill(null).map((_, c) => completedPositions[r * 5 + c] ?? false)
  );

  // Temporarily mark the tile as completed for checking
  grid[row][col] = true;

  // Check row
  if (grid[row].every(Boolean)) return true;
  // Check column
  if (grid.map(r => r[col]).every(Boolean)) return true;
  // Check main diagonal
  if (row === col && [0,1,2,3,4].map(i => grid[i][i]).every(Boolean)) return true;
  // Check anti-diagonal
  if (row + col === 4 && [0,1,2,3,4].map(i => grid[i][4-i]).every(Boolean)) return true;

  return false;
}

export function checkTeamVictory(team: Team): boolean {
  const bossesDefeated = team.bosses.every(b => b.isDefeated);
  const allTilesCompleted = team.board.every(tile => tile.completed === true);
  return bossesDefeated || allTilesCompleted;
}

export function exportResults(teams: Team[], winner?: string): void {
  const results = {
    exportTime: new Date().toISOString(),
    winner,
    teams: teams.map(t => ({
      name: t.name,
      totalDamage: t.totalDamageDealt,
      completedTasks: t.completedTasks,
      bosses: t.bosses.map(b => ({
        name: b.name,
        defeated: b.isDefeated,
        remainingHp: b.currentHp,
        maxHp: b.maxHp,
      })),
      damageLog: t.damageLog,
    })),
  };

  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `osrs-bingo-results-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const STORAGE_KEY = 'osrs-bingo-state';

export function saveToStorage(data: unknown): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function loadFromStorage<T>(): T | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export const TEAM_COLORS = [
  '#e53e3e', // red
  '#3182ce', // blue
  '#38a169', // green
  '#d69e2e', // yellow
  '#805ad5', // purple
  '#ed8936', // orange
];

export const TEAM_COLOR_NAMES = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'];
