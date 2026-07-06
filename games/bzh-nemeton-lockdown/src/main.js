import { gameState } from './gameState.js';
import { initGrid, refreshGrid } from './grid.js';
import { startWavePhase } from './wave.js';
import { renderOverlay } from './canvas.js';
import { updateJuice } from './juice.js';

initGrid(gameState);
refreshGrid(gameState);

let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  if (gameState.phase === 'wave') {
    // updateEnemies, checkAttacks etc. sont appelés depuis wave.js
  }
  updateJuice(gameState, dt);
  renderOverlay(gameState);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
