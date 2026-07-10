import { triggerShake, spawnParticles } from './juice.js';
import { spawnDrop } from './drops.js';

const WALL        = 40;
const SPAWN_XMIN  = WALL + 60;
const SPAWN_XMAX  = 600 - 60;
const SPAWN_YMIN  = WALL + 40;
const SPAWN_YMAX  = WALL + 200;

const TEMPLATES = {
  shard:    { hp: 20,  speed: 160, damage: 8,  behavior: 'charge' },
  proxy:    { hp: 45,  speed: 90,  damage: 12, behavior: 'ranged_retreat' },
  sentinel: { hp: 35,  speed: 120, damage: 10, behavior: 'orbit' },
  knight:   { hp: 90,  speed: 60,  damage: 20, behavior: 'charge_delayed' },
  echo:     { hp: 30,  speed: 200, damage: 8,  behavior: 'mimic' },
};

export function spawnEnemy(state, type) {
  const t = TEMPLATES[type] || TEMPLATES.shard;
  state.enemies.push({
    type,
    x: SPAWN_XMIN + Math.random() * (SPAWN_XMAX - SPAWN_XMIN),
    y: SPAWN_YMIN + Math.random() * (SPAWN_YMAX - SPAWN_YMIN),
    hp: t.hp, maxHp: t.hp,
    speed: t.speed, damage: t.damage, behavior: t.behavior,
    hitFlash: 0,
    // per-type state
    shootCooldown: 1 + Math.random(),
    orbitAngle:    Math.random() * Math.PI * 2,
    chargeTimer:   2,
    chargeDuration: 0,
    charging:      false,
    chargeVx: 0, chargeVy: 0,
    history:       [],
    speedMult:     1,
    virusTimer:    0,
  });
}

export function updateEnemies(state, dt) {
  const p = state.player;
  if (!p || state.phase === 'dead') return;

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];

    if (e.hp <= 0) {
      onDeath(state, e, i);
      continue;
    }

    if (e.hitFlash > 0)   e.hitFlash   -= dt;
    if (e.virusTimer > 0) { e.virusTimer -= dt; if (e.virusTimer <= 0) e.speedMult = 1; }

    const speed = e.speed * (e.speedMult || 1);
    ai(e, p, state, dt, speed);

    e.x = Math.max(WALL + 14, Math.min(600 - 14, e.x));
    e.y = Math.max(WALL + 14, Math.min(600 - 14, e.y));

    // Contact damage
    const cx = p.x - e.x, cy = p.y - e.y;
    if (cx * cx + cy * cy < 26 * 26) {
      p.hp -= e.damage * dt * 0.5;
      triggerShake(state, 0.15);
    }
  }

  // Detect room clear
  if (state.enemies.length === 0 && state.phase === 'run') {
    state.phase = 'room_clear';
  }
}

function onDeath(state, e, idx) {
  spawnParticles(state, e.x, e.y, enemyColor(e.type), 14);
  triggerShake(state, 0.4);
  state.run.score += scoreFor(e.type);

  // Drop fragment (shard: ~40%, others: ~25%)
  const dropChance = e.type === 'shard' ? 0.4 : 0.25;
  if (Math.random() < dropChance) spawnDrop(state, e.x, e.y);

  // Onde Parasite AOE
  if (state.fragments.some(f => f.id === 'parasite')) {
    for (const other of state.enemies) {
      if (other === e || other.hp <= 0) continue;
      const dx = other.x - e.x, dy = other.y - e.y;
      if (dx * dx + dy * dy < 100 * 100) {
        other.hp -= 20;
        other.hitFlash = 0.2;
      }
    }
    spawnParticles(state, e.x, e.y, '#ff6600', 20);
  }

  state.enemies.splice(idx, 1);
}

function scoreFor(type) {
  return { shard: 10, proxy: 25, sentinel: 20, knight: 40, echo: 20 }[type] ?? 10;
}

function enemyColor(type) {
  return { shard: '#ff3300', proxy: '#cc00ff', sentinel: '#00ccff', knight: '#ddaa33', echo: '#33ff99' }[type] ?? '#ff3300';
}

// ---- AI behaviors ----

function ai(e, p, state, dt, speed) {
  const dx = p.x - e.x, dy = p.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = dx / dist, ny = dy / dist;

  switch (e.behavior) {

    case 'charge':
      e.x += nx * speed * dt;
      e.y += ny * speed * dt;
      break;

    case 'ranged_retreat': {
      const idealDist = 200;
      if (dist < idealDist - 30)      { e.x -= nx * speed * dt; e.y -= ny * speed * dt; }
      else if (dist > idealDist + 30) { e.x += nx * speed * dt; e.y += ny * speed * dt; }
      e.shootCooldown -= dt;
      if (e.shootCooldown <= 0) {
        e.shootCooldown = 1.4 + Math.random() * 0.6;
        fireEnemyBullet(state, e, nx, ny);
      }
      break;
    }

    case 'orbit': {
      e.orbitAngle += dt * 1.5;
      const od = 180;
      e.x = p.x + Math.cos(e.orbitAngle) * od;
      e.y = p.y + Math.sin(e.orbitAngle) * od;
      e.shootCooldown -= dt;
      if (e.shootCooldown <= 0) {
        e.shootCooldown = 0.8;
        const a = e.orbitAngle + Math.PI;
        fireEnemyBullet(state, e, Math.cos(a), Math.sin(a));
      }
      break;
    }

    case 'charge_delayed':
      if (!e.charging) {
        // Slow approach while winding up
        e.x += nx * speed * 0.3 * dt;
        e.y += ny * speed * 0.3 * dt;
        e.chargeTimer -= dt;
        if (e.chargeTimer <= 0) {
          e.charging      = true;
          e.chargeVx      = nx * speed * 3.5;
          e.chargeVy      = ny * speed * 3.5;
          e.chargeDuration = 0;
          spawnParticles(state, e.x, e.y, '#ddaa33', 6);
        }
      } else {
        e.x += e.chargeVx * dt;
        e.y += e.chargeVy * dt;
        e.chargeDuration += dt;
        if (e.chargeDuration > 0.5) {
          e.charging   = false;
          e.chargeTimer = 2;
        }
      }
      break;

    case 'mimic': {
      e.history.push({ x: p.x, y: p.y, t: performance.now() });
      const now = performance.now();
      while (e.history.length > 1 && now - e.history[0].t > 1000) e.history.shift();
      const target = e.history[0];
      const tdx = target.x - e.x, tdy = target.y - e.y;
      const td  = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
      e.x += (tdx / td) * speed * dt;
      e.y += (tdy / td) * speed * dt;
      break;
    }
  }
}

function fireEnemyBullet(state, e, nx, ny) {
  state.bullets.push({ x: e.x, y: e.y, vx: nx * 200, vy: ny * 200, damage: e.damage, radius: 5, fromPlayer: false, bounced: false });
}
