import { triggerShake, triggerFlash, spawnParticles } from './juice.js';

const WALL = 40;

export function updateBullets(state, dt) {
  const frags = new Set(state.fragments.map(f => f.id));

  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Wall bounce / remove
    if (!advanceBullet(b, frags)) {
      state.bullets.splice(i, 1);
      continue;
    }

    if (b.fromPlayer) {
      if (hitEnemies(b, i, state, frags)) continue;
    } else {
      hitPlayer(b, i, state);
    }
  }
}

function advanceBullet(b, frags) {
  let dead = false;
  if (b.x < WALL + 4 || b.x > 600 - 4) {
    if (frags.has('ricochet') && b.fromPlayer && !b.bounced) { b.vx = -b.vx; b.bounced = true; }
    else dead = true;
  }
  if (b.y < WALL + 4 || b.y > 600 - 4) {
    if (frags.has('ricochet') && b.fromPlayer && !b.bounced) { b.vy = -b.vy; b.bounced = true; }
    else dead = true;
  }
  if (b.x < -10 || b.x > 650 || b.y < -10 || b.y > 650) dead = true;
  return !dead;
}

// Returns true if the bullet was removed
function hitEnemies(b, bi, state, frags) {
  const hasPerforation = frags.has('perforation');
  const hasVirus       = frags.has('virus');
  let removed = false;

  for (let j = state.enemies.length - 1; j >= 0; j--) {
    const e = state.enemies[j];
    if (e.hp <= 0) continue;
    const dx = b.x - e.x, dy = b.y - e.y;
    if (dx * dx + dy * dy > 16 * 16) continue;

    e.hp -= b.damage;
    e.hitFlash = 0.12;
    spawnParticles(state, b.x, b.y, '#ff6622', 4);

    if (hasVirus) applyVirus(e, state.enemies);

    if (!hasPerforation) {
      state.bullets.splice(bi, 1);
      removed = true;
      break;
    }
  }
  return removed;
}

function hitPlayer(b, bi, state) {
  const p = state.player;
  if (!p || state.phase === 'dead') return;
  const dx = b.x - p.x, dy = b.y - p.y;
  if (dx * dx + dy * dy < 18 * 18) {
    p.hp -= b.damage;
    state.bullets.splice(bi, 1);
    triggerShake(state, 0.5);
    triggerFlash(state, 0.25);
  }
}

function applyVirus(target, enemies) {
  target.speedMult  = 0.4;
  target.virusTimer = 3;
  for (const other of enemies) {
    if (other === target || other.hp <= 0) continue;
    const dx = other.x - target.x, dy = other.y - target.y;
    if (dx * dx + dy * dy < 80 * 80) {
      other.speedMult  = 0.4;
      other.virusTimer = 3;
    }
  }
}
