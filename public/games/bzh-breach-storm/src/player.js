import { spawnParticles } from './juice.js';

const WALL        = 40;
const BULLET_SPD  = 480;
const DASH_DUR    = 0.15;
const DASH_MULT   = 4;
const DASH_CD     = 1.2;

export function updatePlayer(state, dt) {
  const p = state.player;
  if (!p || state.phase === 'dead') return;

  const keys  = state.input.keys;
  const mouse = state.input.mouse;

  // --- Movement intent ---
  p.vx = 0; p.vy = 0;
  if (keys['KeyQ'] || keys['ArrowLeft'])  p.vx -= p.speed;
  if (keys['KeyD'] || keys['ArrowRight']) p.vx += p.speed;
  if (keys['KeyZ'] || keys['ArrowUp'])    p.vy -= p.speed;
  if (keys['KeyS'] || keys['ArrowDown'])  p.vy += p.speed;

  // Normalize diagonal
  const mv = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
  if (mv > p.speed) { p.vx = p.vx / mv * p.speed; p.vy = p.vy / mv * p.speed; }

  // --- Dash (one-shot on key press) ---
  const shiftHeld = !!(keys['ShiftLeft'] || keys['ShiftRight']);
  if (shiftHeld && !p.dashKey && p.dashCooldown <= 0 && mv > 0) {
    p.dashing   = DASH_DUR;
    p.dashCooldown = DASH_CD;
    p.dashVx    = p.vx / p.speed;
    p.dashVy    = p.vy / p.speed;
    spawnParticles(state, p.x, p.y, '#4488ff', 10);
    if (state.fragments.some(f => f.id === 'surcharge')) p.surchargeTimer = 4;
  }
  p.dashKey = shiftHeld;

  // --- Apply movement ---
  if (p.dashing > 0) {
    p.dashing -= dt;
    p.x += p.dashVx * p.speed * DASH_MULT * dt;
    p.y += p.dashVy * p.speed * DASH_MULT * dt;
  } else {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  // Clamp to room
  p.x = Math.max(WALL + 15, Math.min(625 - WALL, p.x));
  p.y = Math.max(WALL + 15, Math.min(625 - WALL, p.y));

  if (p.dashCooldown > 0)   p.dashCooldown   -= dt;
  if (p.surchargeTimer > 0) p.surchargeTimer  -= dt;

  // --- Auto-shoot ---
  if (p.shootCooldown > 0) {
    p.shootCooldown -= dt;
  } else {
    shoot(state, p, mouse);
    const baseRate = agentFireRate(p.agent);
    p.shootCooldown = p.surchargeTimer > 0 ? baseRate / 2 : baseRate;
  }

  // --- Death ---
  if (p.hp <= 0) {
    p.hp = 0;
    state.phase = 'dead';
  }
}

function agentFireRate(agent) {
  return agent === 'Sniky' ? 0.15 : agent === 'DrSoRn' ? 0.35 : 0.25;
}

function shoot(state, p, mouse) {
  const dx = mouse.x - p.x, dy = mouse.y - p.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = dx / dist, ny = dy / dist;

  const dmg    = baseDamage(state, p);
  const count  = p.agent === 'MutenRock' ? 3 : 1;
  const spread = p.agent === 'MutenRock' ? 0.14 : 0;

  for (let i = 0; i < count; i++) {
    const a = Math.atan2(ny, nx) + (i - Math.floor(count / 2)) * spread;
    spawnPlayerBullet(state, p.x + nx * 20, p.y + ny * 20, Math.cos(a), Math.sin(a), dmg);
  }

  // Réplication: every 3rd shot fires a perpendicular bullet
  p.shotCount = (p.shotCount || 0) + 1;
  if (state.fragments.some(f => f.id === 'replication') && p.shotCount % 3 === 0) {
    const perp = Math.atan2(ny, nx) + Math.PI / 2;
    spawnPlayerBullet(state, p.x, p.y, Math.cos(perp), Math.sin(perp), dmg);
  }

  // Echo MiniStar: ghost copy 0.3s later
  if (state.fragments.some(f => f.id === 'echo')) {
    const ex = p.x + nx * 20, ey = p.y + ny * 20;
    setTimeout(() => {
      if (state.phase !== 'dead')
        spawnPlayerBullet(state, ex, ey, nx, ny, dmg * 0.5);
    }, 300);
  }
}

function baseDamage(state, p) {
  let dmg = p.agent === 'Sniky' ? 14 : p.agent === 'DrSoRn' ? 8 : 10;
  // MutenRock passive: +1 dmg per fragment
  if (p.agent === 'MutenRock') dmg += state.fragments.length;
  return dmg;
}

function spawnPlayerBullet(state, x, y, nx, ny, damage) {
  state.bullets.push({ x, y, vx: nx * BULLET_SPD, vy: ny * BULLET_SPD, damage, radius: 4, fromPlayer: true, bounced: false });
}
