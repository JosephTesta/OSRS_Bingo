import { Boss } from '../types';

export const DEFAULT_BOSSES: Omit<Boss, 'currentHp' | 'isDefeated'>[] = [
  {
    id: 'b001',
    name: 'Abyssal Sire',
    maxHp: 400,
    description: 'The Abyssal Sire is an Abyssal demon boss that can only be fought in the Abyssal Nexus.',
  },
  {
    id: 'b002',
    name: 'Alchemical Hydra',
    maxHp: 1100,
    description: 'The Alchemical Hydra is a boss found in the Karuulm Slayer Dungeon.',
  },
  {
    id: 'b003',
    name: 'Barrows Brothers',
    maxHp: 115,
    description: 'A set of powerful undead warriors whose equipment is highly sought after.',
  },
  {
    id: 'b004',
    name: 'Callisto',
    maxHp: 4000,
    description: 'A powerful bear boss found in the wilderness.',
  },
  {
    id: 'b005',
    name: 'Cerberus',
    maxHp: 600,
    description: 'The guardian of the River of Souls, a three-headed hellhound boss.',
  },
  {
    id: 'b006',
    name: 'Chambers of Xeric',
    maxHp: 3000,
    description: 'A large group raid with multiple boss encounters.',
  },
  {
    id: 'b007',
    name: 'Chaos Elemental',
    maxHp: 300,
    description: 'A floating, purple cloud of chaos found deep in the wilderness.',
  },
  {
    id: 'b008',
    name: 'Chaos Fanatic',
    maxHp: 200,
    description: 'A deranged mage found in the wilderness, obsessed with chaos.',
  },
  {
    id: 'b009',
    name: 'Commander Zilyana',
    maxHp: 800,
    description: 'The Saradominist general, commander of the Saradomin forces in the God Wars Dungeon.',
  },
  {
    id: 'b010',
    name: 'Corporeal Beast',
    maxHp: 2000,
    description: 'A powerful boss residing in its cave, accessible through the Spirit Realm.',
  },
  {
    id: 'b011',
    name: 'Crazy Archaeologist',
    maxHp: 200,
    description: 'An eccentric archaeologist found in the Forgotten Cemetery.',
  },
  {
    id: 'b012',
    name: 'Dagannoth Kings',
    maxHp: 255,
    description: 'Three Dagannoth brothers - Prime, Rex, and Supreme - rulers of Waterbirth Island.',
  },
  {
    id: 'b013',
    name: 'General Graardor',
    maxHp: 800,
    description: 'The Bandosian general, a massive ourg leading the Bandos forces.',
  },
  {
    id: 'b014',
    name: 'Giant Mole',
    maxHp: 3000,
    description: 'A massive mole lurking beneath Falador Park.',
  },
  {
    id: 'b015',
    name: 'Grotesque Guardians',
    maxHp: 500,
    description: 'Dusk and Dawn, the gargoyle guardians at the top of the Slayer Tower.',
  },
  {
    id: 'b016',
    name: 'Hespori',
    maxHp: 2500,
    description: 'A powerful plant boss that grows in the Farming Guild.',
  },
  {
    id: 'b017',
    name: 'Kalphite Queen',
    maxHp: 255,
    description: 'The ruler of the Kalphite species, found within the Kalphite Lair.',
  },
  {
    id: 'b018',
    name: 'King Black Dragon',
    maxHp: 240,
    description: 'The most powerful of all chromatic dragons, lurking in his Lair.',
  },
  {
    id: 'b019',
    name: 'Kraken',
    maxHp: 255,
    description: 'A massive sea creature boss found in the Kraken Cove.',
  },
  {
    id: 'b020',
    name: "Kree'arra",
    maxHp: 800,
    description: "The Armadylean general, leader of Armadyl's forces in the God Wars Dungeon.",
  },
  {
    id: 'b021',
    name: "K'ril Tsutsaroth",
    maxHp: 800,
    description: 'The Zamorakian general, a powerful demon leading the Zamorak forces.',
  },
  {
    id: 'b022',
    name: 'Nightmare of Ashihama',
    maxHp: 2400,
    description: 'A terrifying dream entity inhabiting the body of Slepe villagers.',
  },
  {
    id: 'b023',
    name: 'Sarachnis',
    maxHp: 800,
    description: 'A giant spider boss found in the Forthos Dungeon.',
  },
  {
    id: 'b024',
    name: 'Scorpia',
    maxHp: 225,
    description: 'A powerful scorpion boss found in the Scorpion Pit in the Wilderness.',
  },
  {
    id: 'b025',
    name: 'Skotizo',
    maxHp: 400,
    description: 'A demonic boss summoned in the Catacombs of Kourend using a Totem of the Dead.',
  },
  {
    id: 'b026',
    name: 'Theatre of Blood',
    maxHp: 5000,
    description: 'An advanced group raid located in Ver Sinhaza.',
  },
  {
    id: 'b027',
    name: 'Thermonuclear Smoke Devil',
    maxHp: 3000,
    description: 'A smoke devil boss found in the Smoke Devil Dungeon.',
  },
  {
    id: 'b028',
    name: 'TzKal-Zuk',
    maxHp: 1400,
    description: 'The final boss of the Inferno, an ancient TzHaar elder.',
  },
  {
    id: 'b029',
    name: 'TzTok-Jad',
    maxHp: 250,
    description: 'The fearsome final boss of the TzHaar Fight Cave.',
  },
  {
    id: 'b030',
    name: 'Venenatis',
    maxHp: 4000,
    description: 'A massive spider found in the Wilderness.',
  },
  {
    id: 'b031',
    name: "Vet'ion",
    maxHp: 2000,
    description: 'A powerful skeleton found in the Graveyard of Shadows in the Wilderness.',
  },
  {
    id: 'b032',
    name: 'Vorkath',
    maxHp: 750,
    description: 'A draconic undead boss found on Ungael, awakened during Dragon Slayer II.',
  },
  {
    id: 'b033',
    name: 'Wintertodt',
    maxHp: 3000,
    description: 'A powerful weather entity that the Arceuus mages battle at the top of Great Kourend.',
  },
  {
    id: 'b034',
    name: 'Zalcano',
    maxHp: 2000,
    description: 'A powerful demon imprisoned within the Zalcano dungeon in Prifddinas.',
  },
  {
    id: 'b035',
    name: 'Zulrah',
    maxHp: 500,
    description: 'A sacred serpent found on a remote island, known for its valuable drops.',
  },
];

export function createBoss(bossTemplate: Omit<Boss, 'currentHp' | 'isDefeated'>): Boss {
  return {
    ...bossTemplate,
    currentHp: bossTemplate.maxHp,
    isDefeated: false,
  };
}
