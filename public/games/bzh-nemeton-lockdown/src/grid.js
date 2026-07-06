import { gameState } from './gameState.js';
import { recalculateSynergies } from './synergies.js';

export function initGrid(state) {
  const gridEl = document.getElementById('grid');
  gridEl.innerHTML = '';
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      if (r === 2 && c === 2) cell.classList.add('core');
      cell.addEventListener('dragover', e => { e.preventDefault(); cell.classList.add('dragover'); });
      cell.addEventListener('dragleave', () => cell.classList.remove('dragover'));
      cell.addEventListener('drop', e => {
        e.preventDefault();
        cell.classList.remove('dragover');
        const moduleId = e.dataTransfer.getData('moduleId');
        if (moduleId && !state.grid[r][c].module) {
          state.grid[r][c].module = moduleId;
          state.placedModules.push({ id: moduleId, row: r, col: c, level: 1, cooldown: 0 });
          recalculateSynergies(state);
          refreshGrid(state);
        }
      });
      gridEl.appendChild(cell);
    }
  }
}

export function refreshGrid(state) {
  document.querySelectorAll('.cell').forEach(cell => {
    const r = +cell.dataset.row, c = +cell.dataset.col;
    const mod = state.grid[r][c].module;
    cell.textContent = mod ? mod : '';
    cell.classList.toggle('synergy',
      state.activeSynergies.has(`${r},${c}`)
    );
  });
}
