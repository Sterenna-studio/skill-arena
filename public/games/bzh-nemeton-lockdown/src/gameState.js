export const gameState = {
  phase: 'placement',   // placement | wave | resolution | run_end
  wave: 1,
  coreHp: 30,
  coreMaxHp: 30,
  grid: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ({ module: null, blocked: false }))),
  placedModules: [],
  activeSynergies: new Set(),
  enemies: [],
  particles: [],
  activeActions: { surcharge: 2, lockdown: 1 },   // charges par vague
  permanents: [],        // runes permanentes entre runs
  juice: { shake: 0, flash: 0 },
};

// Cœur Nemeton au centre (2,2)
gameState.grid[2][2] = { module: 'CORE', blocked: false };
