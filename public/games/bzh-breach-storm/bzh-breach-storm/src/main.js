import { gameState, resetRun } from './gameState.js';
import { handleInput, initInput } from './input.js';
import { updatePlayer } from './player.js';
import { updateEnemies } from './enemies.js';
import { updateBullets } from './bullets.js';
import { updateDrops } from './drops.js';
import { updateJuice } from './juice.js';
import { render } from './renderer.js';
import { startRoom } from './room.js';

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

initInput(canvas);
resetRun();
startRoom(gameState);

// R key: restart after death, or advance to next room after clear
window.addEventListener('keydown', e => {
  if (e.code !== 'KeyR') return;
  if (gameState.phase === 'dead') {
    resetRun();
    startRoom(gameState);
  } else if (gameState.phase === 'room_clear') {
    gameState.run.room++;
    if (gameState.run.room > 3) {
      gameState.run.room = 1;
      gameState.run.sector++;
    }
    startRoom(gameState);
  }
});

let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  handleInput(gameState);
  updatePlayer(gameState, dt);
  updateBullets(gameState, dt);
  updateEnemies(gameState, dt);
  updateDrops(gameState, dt);
  updateJuice(gameState, dt);
  render(ctx, gameState);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
