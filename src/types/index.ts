export interface Task {
  id: string;
  description: string;
  category: 'combat' | 'skilling' | 'achievement' | 'minigame';
  difficulty: 'easy' | 'medium' | 'hard' | 'elite';
  isDefault: boolean;
}

export interface BingoTile {
  id: string;
  task: Task;
  damage: number;
  completed: boolean;
  wasCompleted: boolean;
  isFlipping: boolean;
  isNew: boolean;
}

export interface Boss {
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  imageUrl?: string;
  description?: string;
  isDefeated: boolean;
}

export interface DamageLogEntry {
  id: string;
  timestamp: number;
  taskDescription: string;
  damage: number;
  bonusDamage?: number;
  bossName: string;
  tilePosition: number;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  board: BingoTile[];
  bosses: Boss[];
  activeBossIndex: number;
  damageLog: DamageLogEntry[];
  completedTasks: number;
  totalDamageDealt: number;
  hasWon: boolean;
  winTime?: number;
  winReason?: 'bosses' | 'tiles';
  completedPositions: boolean[];
}

export interface AdminSettings {
  damageMin: number;
  damageMax: number;
  tileReplacement: boolean;
  rowBonusDamage: number;
  enableRowBonus: boolean;
  selectedBossIds: string[];
  teamNames: string[];
  teamCount: number;
}

export interface GameState {
  phase: 'setup' | 'active' | 'finished';
  teams: Team[];
  settings: AdminSettings;
  winner?: string;
  winReason?: 'bosses' | 'tiles';
  startTime?: number;
  endTime?: number;
  taskPool: Task[];
  bossPool: Boss[];
  completedTaskIds: Set<string>;
}

export interface FloatingDamage {
  id: string;
  damage: number;
  x: number;
  y: number;
  teamId: string;
}
