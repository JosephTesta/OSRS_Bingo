import { Task } from '../types';

export const DEFAULT_TASKS: Task[] = [
  // Boss Uniques
  { id: 't001', description: 'Get 2 unique drops from Zulrah', category: 'combat', difficulty: 'hard', isDefault: true },
  { id: 't002', description: 'Get 2 unique drops from Vorkath', category: 'combat', difficulty: 'hard', isDefault: true },
  { id: 't003', description: 'Get a unique drop from the Nightmare', category: 'combat', difficulty: 'hard', isDefault: false },
  { id: 't004', description: 'Get a unique drop from Alchemical Hydra', category: 'combat', difficulty: 'hard', isDefault: true },
  { id: 't005', description: 'Get a unique drop from Duke Sucellus', category: 'combat', difficulty: 'hard', isDefault: false },
  { id: 't006', description: 'Get a unique drop from The Leviathan', category: 'combat', difficulty: 'hard', isDefault: false },
  { id: 't007', description: 'Get a unique drop from The Whisperer', category: 'combat', difficulty: 'hard', isDefault: false },
  { id: 't008', description: 'Get a unique drop from Vardorvis', category: 'combat', difficulty: 'hard', isDefault: false },
  { id: 't009', description: 'Get a unique drop from Phantom Muspah', category: 'combat', difficulty: 'hard', isDefault: true },
  { id: 't010', description: 'Get a unique drop from Nex', category: 'combat', difficulty: 'hard', isDefault: false },

  // Raid Tasks
  { id: 't011', description: 'Get a Chambers of Xeric unique', category: 'combat', difficulty: 'hard', isDefault: false },
  { id: 't012', description: 'Get a Theatre of Blood unique', category: 'combat', difficulty: 'hard', isDefault: false },
  { id: 't013', description: 'Get a Tombs of Amascut unique', category: 'combat', difficulty: 'hard', isDefault: false },
  { id: 't014', description: 'Complete 5 raids (any type)', category: 'combat', difficulty: 'medium', isDefault: true },
  { id: 't015', description: 'Complete a raid with no deaths (team)', category: 'combat', difficulty: 'medium', isDefault: true },
  { id: 't016', description: 'Complete a solo raid', category: 'combat', difficulty: 'hard', isDefault: false },

  // Skilling Bosses
  { id: 't017', description: 'Get a Wintertodt unique drop', category: 'skilling', difficulty: 'medium', isDefault: true },
  { id: 't018', description: 'Get a Tempoross unique drop', category: 'skilling', difficulty: 'medium', isDefault: true },
  { id: 't019b', description: 'Get a Gotr unique (Guardians of the Rift)', category: 'skilling', difficulty: 'medium', isDefault: false },

  // Slayer / RNG
  { id: 't019', description: 'Get a Slayer monster head (stuffed or otherwise)', category: 'combat', difficulty: 'medium', isDefault: true },
  { id: 't020', description: 'Get all 3 Dagannoth King rings', category: 'combat', difficulty: 'elite', isDefault: false },
  { id: 't021', description: 'Get a Champion scroll', category: 'combat', difficulty: 'hard', isDefault: false },

  // Pets
  { id: 't022', description: 'Get any boss pet', category: 'combat', difficulty: 'hard', isDefault: true },
  { id: 't023', description: 'Get a skilling pet', category: 'skilling', difficulty: 'elite', isDefault: false },

  // Clues
  { id: 't024', description: 'Complete a clue scroll worth over 1M GP', category: 'achievement', difficulty: 'hard', isDefault: false },
  { id: 't025', description: 'Complete 3 Elite clue scrolls', category: 'achievement', difficulty: 'hard', isDefault: true },
  { id: 't026', description: 'Complete a Master clue scroll', category: 'achievement', difficulty: 'hard', isDefault: false },
  { id: 't027', description: 'Open 25 clue caskets (any tier)', category: 'achievement', difficulty: 'medium', isDefault: true },
  { id: 't027b', description: 'Get a Ranger boots or Wizard boots from medium clues', category: 'achievement', difficulty: 'hard', isDefault: false },

  // XP
  { id: 't028', description: 'Gain 1M XP in any combat skill', category: 'combat', difficulty: 'hard', isDefault: true },
  { id: 't029', description: 'Gain 500K XP in Herblore', category: 'skilling', difficulty: 'hard', isDefault: false },
  { id: 't030', description: 'Gain 750K XP in any skill', category: 'skilling', difficulty: 'medium', isDefault: true },
  { id: 't031', description: 'Gain 250K XP in 3 different skills', category: 'skilling', difficulty: 'medium', isDefault: false },

  // Wilderness / PvP
  { id: 't032', description: 'Earn 1M GP from Revenants', category: 'combat', difficulty: 'hard', isDefault: false },
  { id: 't033', description: 'Kill a player in the Wilderness', category: 'combat', difficulty: 'medium', isDefault: true },
  { id: 't034', description: 'Kill Artio, Spindel, or Calvar\'ion', category: 'combat', difficulty: 'medium', isDefault: true },
  { id: 't034b', description: 'Kill the Chaos Elemental', category: 'combat', difficulty: 'medium', isDefault: false },
  { id: 't034c', description: 'Kill Scorpia', category: 'combat', difficulty: 'easy', isDefault: false },
  { id: 't034d', description: 'Loot a Larran\'s key from a Wilderness Slayer task', category: 'combat', difficulty: 'medium', isDefault: false },

  // Barrows / Mid PvM
  { id: 't035', description: 'Complete 10 Barrows chests', category: 'combat', difficulty: 'medium', isDefault: true },
  { id: 't036', description: 'Get a Barrows item', category: 'combat', difficulty: 'medium', isDefault: true },

  // God Wars Dungeon
  { id: 't036b', description: 'Get a unique drop from General Graardor', category: 'combat', difficulty: 'hard', isDefault: false },
  { id: 't036c', description: 'Get a unique drop from Commander Zilyana', category: 'combat', difficulty: 'hard', isDefault: false },
  { id: 't036d', description: 'Get a unique drop from Kree\'arra', category: 'combat', difficulty: 'hard', isDefault: false },
  { id: 't036e', description: 'Get a unique drop from K\'ril Tsutsaroth', category: 'combat', difficulty: 'hard', isDefault: false },
  { id: 't036f', description: 'Get a unique from all 4 GWD generals', category: 'combat', difficulty: 'elite', isDefault: false },

  // Mid-tier Bosses
  { id: 't036g', description: 'Kill the Corporeal Beast', category: 'combat', difficulty: 'medium', isDefault: false },
  { id: 't036h', description: 'Get a unique drop from Sarachnis', category: 'combat', difficulty: 'easy', isDefault: true },
  { id: 't036i', description: 'Get a unique drop from the Grotesque Guardians', category: 'combat', difficulty: 'medium', isDefault: false },
  { id: 't036j', description: 'Get a unique drop from Abyssal Sire', category: 'combat', difficulty: 'medium', isDefault: false },
  { id: 't036k', description: 'Get a unique drop from Cerberus', category: 'combat', difficulty: 'medium', isDefault: true },
  { id: 't036l', description: 'Get a unique drop from Kraken', category: 'combat', difficulty: 'easy', isDefault: true },
  { id: 't036m', description: 'Kill the Kalphite Queen', category: 'combat', difficulty: 'medium', isDefault: false },
  { id: 't036n', description: 'Kill the King Black Dragon', category: 'combat', difficulty: 'easy', isDefault: true },
  { id: 't036o', description: 'Get a unique drop from the Thermonuclear Smoke Devil', category: 'combat', difficulty: 'medium', isDefault: false },
  { id: 't036p', description: 'Kill Skotizo', category: 'combat', difficulty: 'medium', isDefault: false },
  { id: 't036q', description: 'Kill Giant Mole', category: 'combat', difficulty: 'easy', isDefault: false },

  // Gauntlet
  { id: 't037', description: 'Complete 5 Gauntlet runs', category: 'minigame', difficulty: 'medium', isDefault: false },
  { id: 't038', description: 'Complete 25 Corrupted Gauntlet runs', category: 'minigame', difficulty: 'elite', isDefault: false },
  { id: 't038b', description: 'Get a unique drop from the Corrupted Gauntlet', category: 'minigame', difficulty: 'hard', isDefault: false },

  // Core PvM
  { id: 't039', description: 'Complete the Fight Caves (earn a TzRek-Jad cape)', category: 'minigame', difficulty: 'hard', isDefault: true },
  { id: 't040', description: 'Complete the Inferno', category: 'minigame', difficulty: 'elite', isDefault: false },
  { id: 't040b', description: 'Complete the Fortis Colosseum', category: 'minigame', difficulty: 'elite', isDefault: false },
  { id: 't040c', description: 'Complete 10 Pest Control games', category: 'minigame', difficulty: 'easy', isDefault: true },
  { id: 't040d', description: 'Win a game of Last Man Standing', category: 'minigame', difficulty: 'medium', isDefault: false },
  { id: 't040e', description: 'Complete a wave of Barbarian Assault as any role', category: 'minigame', difficulty: 'easy', isDefault: false },
  { id: 't040f', description: 'Earn 1,000 Pest Control points', category: 'minigame', difficulty: 'medium', isDefault: false },
  { id: 't040g', description: 'Get a unique from Soul Wars', category: 'minigame', difficulty: 'medium', isDefault: false },

  // Valuable Drops
  { id: 't041', description: 'Get a Draconic visage', category: 'combat', difficulty: 'hard', isDefault: false },
  { id: 't042', description: 'Get an Abyssal whip', category: 'combat', difficulty: 'medium', isDefault: true },
  { id: 't043', description: 'Get a Trident of the swamp', category: 'combat', difficulty: 'medium', isDefault: true },
  { id: 't044', description: 'Get a Blood shard', category: 'combat', difficulty: 'hard', isDefault: false },
  { id: 't045', description: 'Get a Dragon defender', category: 'combat', difficulty: 'easy', isDefault: true },
  { id: 't045b', description: 'Get a Berserker ring from Dagannoth Rex', category: 'combat', difficulty: 'medium', isDefault: false },
  { id: 't045c', description: 'Get a Dragon axe drop (any source)', category: 'combat', difficulty: 'medium', isDefault: false },
  { id: 't045d', description: 'Get a Spectral or Arcane sigil from Corp', category: 'combat', difficulty: 'hard', isDefault: false },

  // High-End RNG
  { id: 't046', description: 'Get a Twisted bow', category: 'combat', difficulty: 'elite', isDefault: false },
  { id: 't047', description: 'Get a Scythe of vitur', category: 'combat', difficulty: 'elite', isDefault: false },
  { id: 't048', description: 'Get a Dragon warhammer', category: 'combat', difficulty: 'elite', isDefault: false },
  { id: 't049', description: 'Get any 3rd age item from a clue', category: 'achievement', difficulty: 'elite', isDefault: false },
  { id: 't049b', description: 'Get an Elysian sigil from Corp', category: 'combat', difficulty: 'elite', isDefault: false },
  { id: 't049c', description: 'Get a Tumeken\'s shadow', category: 'combat', difficulty: 'elite', isDefault: false },

  // Skilling
  { id: 't050', description: 'Catch 500 Karambwans', category: 'skilling', difficulty: 'medium', isDefault: false },
  { id: 't051', description: 'Cook 1,000 food', category: 'skilling', difficulty: 'easy', isDefault: false },
  { id: 't052', description: 'Mine 500 ores', category: 'skilling', difficulty: 'easy', isDefault: false },
  { id: 't053', description: 'Chop 1,000 logs', category: 'skilling', difficulty: 'easy', isDefault: false },
  { id: 't054', description: 'Fletch 1,000 items', category: 'skilling', difficulty: 'easy', isDefault: false },
  { id: 't055', description: 'Craft 1,000 runes at the Abyss or Altar', category: 'skilling', difficulty: 'medium', isDefault: false },
  { id: 't056', description: 'Pickpocket 1,000 times', category: 'skilling', difficulty: 'easy', isDefault: false },
  { id: 't057', description: 'Complete 25 Farming patches', category: 'skilling', difficulty: 'medium', isDefault: false },
  { id: 't057b', description: 'Complete an Agility Pyramid lap', category: 'skilling', difficulty: 'easy', isDefault: false },
  { id: 't057c', description: 'Complete 100 Rooftop Agility laps', category: 'skilling', difficulty: 'medium', isDefault: false },
  { id: 't057d', description: 'Make 100 Potions (4-dose)', category: 'skilling', difficulty: 'easy', isDefault: false },
  { id: 't057e', description: 'Catch 100 Hunter creatures', category: 'skilling', difficulty: 'easy', isDefault: false },
  { id: 't057f', description: 'Build 10 furniture pieces in your POH', category: 'skilling', difficulty: 'easy', isDefault: false },
  { id: 't057g', description: 'Bury 500 bones (any type)', category: 'skilling', difficulty: 'easy', isDefault: false },
  { id: 't057h', description: 'Smelt 500 bars', category: 'skilling', difficulty: 'easy', isDefault: false },
  { id: 't057i', description: 'Reach level 99 in any skill', category: 'skilling', difficulty: 'elite', isDefault: false },

  // GP
  { id: 't058', description: 'Earn 2M GP total', category: 'achievement', difficulty: 'medium', isDefault: true },
  { id: 't059', description: 'Earn 5M GP total', category: 'achievement', difficulty: 'hard', isDefault: true },
  { id: 't060', description: 'Get a single drop worth over 2M GP', category: 'combat', difficulty: 'hard', isDefault: true },

  // Team / Interaction
  { id: 't061', description: 'Be present for 3 unique drops (team)', category: 'combat', difficulty: 'medium', isDefault: true },
  { id: 't062', description: 'Complete 5 boss kills as a full team (all members present)', category: 'combat', difficulty: 'medium', isDefault: false },

  // Achievement Diaries
  { id: 't062b', description: 'Complete any Hard Achievement Diary', category: 'achievement', difficulty: 'hard', isDefault: false },
  { id: 't062c', description: 'Complete any Medium Achievement Diary', category: 'achievement', difficulty: 'medium', isDefault: true },
  { id: 't062d', description: 'Complete any Elite Achievement Diary', category: 'achievement', difficulty: 'elite', isDefault: false },

  // Quests
  { id: 't062e', description: 'Complete a quest with 3+ Quest Points', category: 'achievement', difficulty: 'easy', isDefault: false },
  { id: 't062f', description: 'Complete 5 quests', category: 'achievement', difficulty: 'medium', isDefault: true },
  { id: 't062g', description: 'Complete Dragon Slayer II', category: 'achievement', difficulty: 'hard', isDefault: false },
  { id: 't062h', description: 'Complete Song of the Elves', category: 'achievement', difficulty: 'elite', isDefault: false },

  // Collection Log
  { id: 't066', description: 'Obtain 5 new collection log slots', category: 'achievement', difficulty: 'medium', isDefault: true },
  { id: 't067', description: 'Obtain 15 new collection log slots', category: 'achievement', difficulty: 'hard', isDefault: false },
  { id: 't067b', description: 'Complete a full collection log page (any boss/activity)', category: 'achievement', difficulty: 'hard', isDefault: false },

  // Kill Count Milestones
  { id: 't068', description: 'Equip a full Barrows set', category: 'combat', difficulty: 'hard', isDefault: true },
  { id: 't069', description: 'Kill 25 Zulrah', category: 'combat', difficulty: 'medium', isDefault: false },
  { id: 't070', description: 'Kill 25 Vorkath', category: 'combat', difficulty: 'medium', isDefault: false },
  { id: 't070b', description: 'Kill 50 boss monsters', category: 'combat', difficulty: 'medium', isDefault: false },
  { id: 't070c', description: 'Kill 100 Slayer monsters on-task', category: 'combat', difficulty: 'easy', isDefault: false },
  { id: 't070d', description: 'Complete 10 Slayer tasks', category: 'combat', difficulty: 'medium', isDefault: false },
  { id: 't070e', description: 'Kill 50 Blue Dragons', category: 'combat', difficulty: 'easy', isDefault: false },
  { id: 't070f', description: 'Kill 100 Aviansies (including GWD)', category: 'combat', difficulty: 'easy', isDefault: false },
  { id: 't070g', description: 'Get a Slayer streak of 5 tasks from the same master', category: 'combat', difficulty: 'medium', isDefault: false },

  // Fun / Miscellaneous
  { id: 't070h', description: 'Die to the same boss 3 times in one session', category: 'achievement', difficulty: 'easy', isDefault: false },
  { id: 't070i', description: 'Get a Clue scroll from a boss', category: 'achievement', difficulty: 'easy', isDefault: false },
  { id: 't070k', description: 'Alch an item worth over 500K GP', category: 'achievement', difficulty: 'medium', isDefault: false },
  { id: 't070l', description: 'Use an Ornament kit on any item', category: 'achievement', difficulty: 'medium', isDefault: false },

  // Speedrun World
  { id: 't071', description: 'Achieve a Diamond time on a quest (Speedrunning world)', category: 'achievement', difficulty: 'hard', isDefault: false },
  { id: 't072', description: 'Achieve a Platinum time on a quest (Speedrunning world)', category: 'achievement', difficulty: 'elite', isDefault: false },
];