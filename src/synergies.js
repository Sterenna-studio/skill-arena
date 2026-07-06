import { refreshGrid } from './grid.js';

export function recalculateSynergies(state) {
  state.activeSynergies.clear();
  // Règle : Forge Bretonne adjacente à Tourelle Runique
  for (const mod of state.placedModules) {
    if (mod.id === 'FORGE') {
      const neighbors = getNeighbors(mod.row, mod.col);
      for (const [r, c] of neighbors) {
        if (state.grid[r][c].module === 'TOURELLE') {
          state.activeSynergies.add(`${mod.row},${mod.col}`);
          state.activeSynergies.add(`${r},${c}`);
        }
      }
    }
  }
  // TODO : ajouter d'autres règles depuis synergies.json
}

function getNeighbors(r, c) {
  return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([rr,cc]) => rr>=0&&rr<5&&cc>=0&&cc<5);
}
