export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type AchievementCategory = 'territory' | 'combat' | 'builder' | 'naval' | 'nuclear' | 'defense' | 'diplomat' | 'economist' | 'speed' | 'special';

export interface Achievement {
  id: string;
  name: string;
  shortDesc: string; // 5-10 words max
  fullDescription: string;
  icon: string; // Emoji
  category: AchievementCategory;
  rarity: AchievementRarity;
  points: number;
  requirement: {
    type: string;
    value: number;
    current?: number;
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  // Territory Control (🗺️)
  {
    id: 'first_blood',
    name: 'First Blood',
    shortDesc: 'Capture your first territory',
    fullDescription: 'Take control of your first enemy territory',
    icon: '🗺️',
    category: 'territory',
    rarity: 'common',
    points: 10,
    requirement: { type: 'territories_captured', value: 1 }
  },
  {
    id: 'expansionist',
    name: 'Expansionist',
    shortDesc: 'Control 50 territories',
    fullDescription: 'Expand your empire to control 50 territories',
    icon: '🗺️',
    category: 'territory',
    rarity: 'common',
    points: 25,
    requirement: { type: 'territories_controlled', value: 50 }
  },
  {
    id: 'continental',
    name: 'Continental',
    shortDesc: 'Control 200 territories',
    fullDescription: 'Build a continental empire of 200 territories',
    icon: '🗺️',
    category: 'territory',
    rarity: 'rare',
    points: 50,
    requirement: { type: 'territories_controlled', value: 200 }
  },
  {
    id: 'world_power',
    name: 'World Power',
    shortDesc: 'Control 500 territories',
    fullDescription: 'Become a world power with 500 territories',
    icon: '🗺️',
    category: 'territory',
    rarity: 'epic',
    points: 100,
    requirement: { type: 'territories_controlled', value: 500 }
  },
  {
    id: 'map_domination',
    name: 'Map Domination',
    shortDesc: 'Win by controlling 80% of map',
    fullDescription: 'Achieve victory by controlling 80% of the map',
    icon: '🗺️',
    category: 'territory',
    rarity: 'legendary',
    points: 200,
    requirement: { type: 'map_control_win', value: 80 }
  },

  // Combat Victories (⚔️)
  {
    id: 'victor',
    name: 'Victor',
    shortDesc: 'Win your first game',
    fullDescription: 'Achieve your first victory in battle',
    icon: '⚔️',
    category: 'combat',
    rarity: 'common',
    points: 15,
    requirement: { type: 'games_won', value: 1 }
  },
  {
    id: 'veteran',
    name: 'Veteran',
    shortDesc: 'Win 10 games',
    fullDescription: 'Prove your skill with 10 victories',
    icon: '⚔️',
    category: 'combat',
    rarity: 'common',
    points: 30,
    requirement: { type: 'games_won', value: 10 }
  },
  {
    id: 'champion',
    name: 'Champion',
    shortDesc: 'Win 50 games',
    fullDescription: 'Become a champion with 50 victories',
    icon: '⚔️',
    category: 'combat',
    rarity: 'rare',
    points: 75,
    requirement: { type: 'games_won', value: 50 }
  },
  {
    id: 'legend',
    name: 'Legend',
    shortDesc: 'Win 100 games',
    fullDescription: 'Achieve legendary status with 100 victories',
    icon: '⚔️',
    category: 'combat',
    rarity: 'epic',
    points: 150,
    requirement: { type: 'games_won', value: 100 }
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    shortDesc: 'Win 5 games in a row',
    fullDescription: 'Show dominance with 5 consecutive victories',
    icon: '⚔️',
    category: 'combat',
    rarity: 'rare',
    points: 60,
    requirement: { type: 'win_streak', value: 5 }
  },

  // Builder (🏗️)
  {
    id: 'first_foundation',
    name: 'First Foundation',
    shortDesc: 'Build your first city',
    fullDescription: 'Establish your first city',
    icon: '🏗️',
    category: 'builder',
    rarity: 'common',
    points: 10,
    requirement: { type: 'cities_built', value: 1 }
  },
  {
    id: 'urban_planner',
    name: 'Urban Planner',
    shortDesc: 'Build 10 cities in one game',
    fullDescription: 'Create an urban empire with 10 cities in a single game',
    icon: '🏗️',
    category: 'builder',
    rarity: 'rare',
    points: 40,
    requirement: { type: 'cities_built_single_game', value: 10 }
  },
  {
    id: 'fortress',
    name: 'Fortress',
    shortDesc: 'Build 25 defense posts total',
    fullDescription: 'Fortify your territories with 25 defense posts',
    icon: '🏗️',
    category: 'builder',
    rarity: 'common',
    points: 35,
    requirement: { type: 'defense_posts_built', value: 25 }
  },
  {
    id: 'harbor_master',
    name: 'Harbor Master',
    shortDesc: 'Build 15 ports total',
    fullDescription: 'Master the seas with 15 ports',
    icon: '🏗️',
    category: 'builder',
    rarity: 'common',
    points: 35,
    requirement: { type: 'ports_built', value: 15 }
  },
  {
    id: 'nuclear_power',
    name: 'Nuclear Power',
    shortDesc: 'Build your first missile silo',
    fullDescription: 'Enter the nuclear age with your first missile silo',
    icon: '🏗️',
    category: 'builder',
    rarity: 'common',
    points: 20,
    requirement: { type: 'silos_built', value: 1 }
  },

  // Naval Commander (⚓)
  {
    id: 'admiral',
    name: 'Admiral',
    shortDesc: 'Build 10 warships in one game',
    fullDescription: 'Command a fleet of 10 warships in a single game',
    icon: '⚓',
    category: 'naval',
    rarity: 'rare',
    points: 45,
    requirement: { type: 'warships_built_single_game', value: 10 }
  },
  {
    id: 'sea_control',
    name: 'Sea Control',
    shortDesc: 'Destroy 50 enemy warships total',
    fullDescription: 'Dominate the seas by destroying 50 enemy warships',
    icon: '⚓',
    category: 'naval',
    rarity: 'rare',
    points: 50,
    requirement: { type: 'warships_destroyed', value: 50 }
  },
  {
    id: 'blockade',
    name: 'Blockade',
    shortDesc: 'Control all ports on a coastline',
    fullDescription: 'Establish complete naval supremacy on a coastline',
    icon: '⚓',
    category: 'naval',
    rarity: 'epic',
    points: 80,
    requirement: { type: 'coastline_control', value: 1 }
  },
  {
    id: 'naval_supremacy',
    name: 'Naval Supremacy',
    shortDesc: 'Have 20 active warships',
    fullDescription: 'Command the largest fleet with 20 active warships',
    icon: '⚓',
    category: 'naval',
    rarity: 'epic',
    points: 90,
    requirement: { type: 'warships_active', value: 20 }
  },

  // Nuclear Arsenal (☢️)
  {
    id: 'manhattan_project',
    name: 'Manhattan Project',
    shortDesc: 'Launch your first atom bomb',
    fullDescription: 'Enter the nuclear era with your first atom bomb',
    icon: '☢️',
    category: 'nuclear',
    rarity: 'common',
    points: 25,
    requirement: { type: 'atom_bombs_launched', value: 1 }
  },
  {
    id: 'megaton',
    name: 'Megaton',
    shortDesc: 'Launch your first hydrogen bomb',
    fullDescription: 'Unleash devastating power with a hydrogen bomb',
    icon: '☢️',
    category: 'nuclear',
    rarity: 'rare',
    points: 40,
    requirement: { type: 'hydrogen_bombs_launched', value: 1 }
  },
  {
    id: 'mirv_master',
    name: 'MIRV Master',
    shortDesc: 'Successfully deploy a MIRV',
    fullDescription: 'Master advanced warfare with MIRV deployment',
    icon: '☢️',
    category: 'nuclear',
    rarity: 'epic',
    points: 60,
    requirement: { type: 'mirvs_launched', value: 1 }
  },
  {
    id: 'deterrent',
    name: 'Deterrent',
    shortDesc: 'Have 5 active missile silos',
    fullDescription: 'Build a nuclear deterrent with 5 active silos',
    icon: '☢️',
    category: 'nuclear',
    rarity: 'rare',
    points: 50,
    requirement: { type: 'silos_active', value: 5 }
  },
  {
    id: 'mutually_assured',
    name: 'Mutually Assured',
    shortDesc: 'Launch 10 nukes in one game',
    fullDescription: 'Embrace MAD doctrine with 10 nuclear launches',
    icon: '☢️',
    category: 'nuclear',
    rarity: 'legendary',
    points: 100,
    requirement: { type: 'nukes_launched_single_game', value: 10 }
  },

  // Defense Specialist (🛡️)
  {
    id: 'iron_dome',
    name: 'Iron Dome',
    shortDesc: 'Build your first SAM launcher',
    fullDescription: 'Protect your nation with missile defense',
    icon: '🛡️',
    category: 'defense',
    rarity: 'common',
    points: 20,
    requirement: { type: 'sams_built', value: 1 }
  },
  {
    id: 'interceptor',
    name: 'Interceptor',
    shortDesc: 'Shoot down 10 missiles with SAMs',
    fullDescription: 'Prove your defense capabilities by intercepting 10 missiles',
    icon: '🛡️',
    category: 'defense',
    rarity: 'rare',
    points: 50,
    requirement: { type: 'missiles_intercepted', value: 10 }
  },
  {
    id: 'fortress_nation',
    name: 'Fortress Nation',
    shortDesc: 'Have 10+ defense posts active',
    fullDescription: 'Create an impenetrable fortress with 10 defense posts',
    icon: '🛡️',
    category: 'defense',
    rarity: 'rare',
    points: 45,
    requirement: { type: 'defense_posts_active', value: 10 }
  },
  {
    id: 'untouchable',
    name: 'Untouchable',
    shortDesc: 'Survive without losing a city',
    fullDescription: 'Win a game without losing a single city',
    icon: '🛡️',
    category: 'defense',
    rarity: 'legendary',
    points: 150,
    requirement: { type: 'perfect_defense_win', value: 1 }
  },

  // Diplomat (🤝)
  {
    id: 'first_alliance',
    name: 'First Alliance',
    shortDesc: 'Form your first alliance',
    fullDescription: 'Begin diplomatic relations with your first alliance',
    icon: '🤝',
    category: 'diplomat',
    rarity: 'common',
    points: 15,
    requirement: { type: 'alliances_formed', value: 1 }
  },
  {
    id: 'peace_broker',
    name: 'Peace Broker',
    shortDesc: 'Have 3 active alliances',
    fullDescription: 'Master diplomacy with 3 simultaneous alliances',
    icon: '🤝',
    category: 'diplomat',
    rarity: 'rare',
    points: 40,
    requirement: { type: 'alliances_active', value: 3 }
  },
  {
    id: 'betrayal',
    name: 'Betrayal',
    shortDesc: 'Break alliance and eliminate player',
    fullDescription: 'Show ruthlessness by betraying and eliminating an ally',
    icon: '🤝',
    category: 'diplomat',
    rarity: 'epic',
    points: 60,
    requirement: { type: 'betrayal_eliminations', value: 1 }
  },
  {
    id: 'united_front',
    name: 'United Front',
    shortDesc: 'Win with an alliance intact',
    fullDescription: 'Achieve victory while maintaining diplomatic ties',
    icon: '🤝',
    category: 'diplomat',
    rarity: 'rare',
    points: 50,
    requirement: { type: 'allied_wins', value: 1 }
  },

  // Economist (💰)
  {
    id: 'trader',
    name: 'Trader',
    shortDesc: 'Complete 10 trade ship routes',
    fullDescription: 'Establish yourself as a trader with 10 trade routes',
    icon: '💰',
    category: 'economist',
    rarity: 'common',
    points: 20,
    requirement: { type: 'trade_routes_completed', value: 10 }
  },
  {
    id: 'merchant',
    name: 'Merchant',
    shortDesc: 'Earn 1M gold from trade ships',
    fullDescription: 'Become wealthy through maritime trade',
    icon: '💰',
    category: 'economist',
    rarity: 'rare',
    points: 45,
    requirement: { type: 'trade_gold_earned', value: 1000000 }
  },
  {
    id: 'supply_chain',
    name: 'Supply Chain',
    shortDesc: 'Deploy 20 supply trucks total',
    fullDescription: 'Master logistics with 20 supply truck deployments',
    icon: '💰',
    category: 'economist',
    rarity: 'common',
    points: 30,
    requirement: { type: 'supply_trucks_deployed', value: 20 }
  },
  {
    id: 'economic_victory',
    name: 'Economic Victory',
    shortDesc: 'Have 10M gold in reserves',
    fullDescription: 'Achieve economic dominance with massive gold reserves',
    icon: '💰',
    category: 'economist',
    rarity: 'legendary',
    points: 120,
    requirement: { type: 'gold_reserves', value: 10000000 }
  },

  // Speed Achievements (⏱️)
  {
    id: 'blitzkrieg',
    name: 'Blitzkrieg',
    shortDesc: 'Win a game in under 10 minutes',
    fullDescription: 'Achieve lightning victory in under 10 minutes',
    icon: '⏱️',
    category: 'speed',
    rarity: 'epic',
    points: 80,
    requirement: { type: 'speed_win', value: 600 } // seconds
  },
  {
    id: 'quick_start',
    name: 'Quick Start',
    shortDesc: 'Control 50 territories in 5 minutes',
    fullDescription: 'Rapid expansion at the start of the game',
    icon: '⏱️',
    category: 'speed',
    rarity: 'rare',
    points: 40,
    requirement: { type: 'early_expansion', value: 50 }
  },
  {
    id: 'rapid_deploy',
    name: 'Rapid Deploy',
    shortDesc: 'Build 5 structures in 2 minutes',
    fullDescription: 'Show construction speed in early game',
    icon: '⏱️',
    category: 'speed',
    rarity: 'common',
    points: 25,
    requirement: { type: 'early_buildings', value: 5 }
  },

  // Special/Secret (🎯)
  {
    id: 'david_vs_goliath',
    name: 'David vs Goliath',
    shortDesc: 'Win from last place',
    fullDescription: 'Achieve impossible comeback victory from last place',
    icon: '🎯',
    category: 'special',
    rarity: 'legendary',
    points: 200,
    requirement: { type: 'comeback_win', value: 1 }
  },
  {
    id: 'pacifist',
    name: 'Pacifist',
    shortDesc: 'Win without using nukes',
    fullDescription: 'Achieve victory through conventional warfare only',
    icon: '🎯',
    category: 'special',
    rarity: 'epic',
    points: 75,
    requirement: { type: 'no_nuke_win', value: 1 }
  },
  {
    id: 'survivor',
    name: 'Survivor',
    shortDesc: 'Win through alliance after elimination',
    fullDescription: 'Be eliminated but win through your alliance',
    icon: '🎯',
    category: 'special',
    rarity: 'legendary',
    points: 150,
    requirement: { type: 'posthumous_win', value: 1 }
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    shortDesc: 'Win without losing a single unit',
    fullDescription: 'Flawless victory without any casualties',
    icon: '🎯',
    category: 'special',
    rarity: 'legendary',
    points: 250,
    requirement: { type: 'perfect_win', value: 1 }
  }
];

// Helper functions
export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.category === category);
}

export function getAchievementsByRarity(rarity: AchievementRarity): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.rarity === rarity);
}

export function calculateTotalPossiblePoints(): number {
  return ACHIEVEMENTS.reduce((total, achievement) => total + achievement.points, 0);
}