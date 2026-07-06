import { spawnParticles, triggerShake, triggerFlash } from './juice.js';
import { spawnEnemy } from './enemies.js';
import { damagePlayer } from './player.js';

const BOSS_PHASES = [
  { hpRatio: 1.0,  color: '#ff2244', speed: 60,  fireRate: 0.5,  spiralArms: 6,  label: 'Phase I'   },
  { hpRatio: 0.66, color: '#ff6600', speed: 90,  fireRate: 0.35, spiralArms: 8,  label: 'Phase II'  },
  { hpRatio: 0.33, color: '#cc00ff', speed: 130, fireRate: 0.28, spiralArms: 12, label: 'Phase III' },
];

export function spawnBoss(state) {
  state.boss = {
    x: 320, y: 160,
    hp: 600, maxHp: 600,
    phase: 0,
    angle: 0,
    orbitAngle: 0,
    fireTimer: 0,
    spiralAngle: 0,
    chargeTimer: 3.0,
    chargeState: 'idle',   // idle | charging | cooldown
    minionTimer: 2.0,
    chargeTargetX: 320,
    chargeTargetY: 320,
    vx: 0, vy: 0,
  };
}

export function updateBoss(state, dt) {
  const boss = state.boss;
  if (!boss) return;
  const pl = state.player;
  if (!pl) return;

  const cfg = BOSS_PHASES[boss.phase];

  // Transition de phase
  const ratio = boss.hp / boss.maxHp;
  if (boss.phase === 0 && ratio <= 0.66) _phaseTransition(state, 1);
  if (boss.phase === 1 && ratio <= 0.33) _phaseTransition(state, 2);

  // Mort du boss
  if (boss.hp <= 0) {
    spawnParticles(state, boss.x, boss.y, cfg.color, 40);
    triggerShake(state, 3); triggerFlash(state, 0.8);
    state.boss = null;
    // Victoire — fondu vers écran victory
    state._died = false;
    state._fadeAlpha = 0;
    state._fadeTarget = 'victory';
    state.phase = 'fading';
    return;
  }

  boss.fireTimer -= dt;

  switch (boss.phase) {
    case 0: _phase0(state, boss, pl, cfg, dt); break;
    case 1: _phase1(state, boss, pl, cfg, dt); break;
    case 2: _phase2(state, boss, pl, cfg, dt); break;
  }

  boss.x = Math.max(60, Math.min(580, boss.x));
  boss.y = Math.max(60, Math.min(300, boss.y));
}

function _phase0(state, boss, pl, cfg, dt) {
  boss.orbitAngle += 0.6 * dt;
  boss.x += Math.cos(boss.orbitAngle) * cfg.speed * dt;
  boss.y += Math.sin(boss.orbitAngle * 0.5) * 30 * dt;
  if (boss.fireTimer <= 0) {
    _spiralShot(state, boss, cfg.spiralArms);
    boss.fireTimer = cfg.fireRate;
  }
}

function _phase1(state, boss, pl, cfg, dt) {
  boss.chargeTimer -= dt;
  if (boss.chargeState === 'idle') {
    boss.orbitAngle += 0.9 * dt;
    boss.x += Math.cos(boss.orbitAngle) * cfg.speed * dt;
    boss.y += Math.sin(boss.orbitAngle * 0.5) * 40 * dt;
    if (boss.fireTimer <= 0) { _fanShot(state, boss, pl.x, pl.y, 7, 0.6); boss.fireTimer = cfg.fireRate; }
    if (boss.chargeTimer <= 0) {
      boss.chargeState = 'charging';
      boss.chargeTargetX = pl.x; boss.chargeTargetY = pl.y;
      boss.chargeTimer = 1.2;
    }
  } else if (boss.chargeState === 'charging') {
    const dx = boss.chargeTargetX - boss.x, dy = boss.chargeTargetY - boss.y;
    const d = Math.sqrt(dx*dx+dy*dy);
    if (d > 10) { boss.x += (dx/d)*380*dt; boss.y += (dy/d)*380*dt; }
    const pdx = pl.x-boss.x, pdy = pl.y-boss.y;
    if (Math.sqrt(pdx*pdx+pdy*pdy) < 40) { damagePlayer(state, 35); boss.chargeState='cooldown'; boss.chargeTimer=1.5; }
    if (boss.chargeTimer <= 0) { boss.chargeState='cooldown'; boss.chargeTimer=1.5; }
  } else {
    if (boss.chargeTimer <= 0) { boss.chargeState='idle'; boss.chargeTimer=2.5; }
  }
}

function _phase2(state, boss, pl, cfg, dt) {
  // Mouvement erratique
  boss.vx += (Math.random()-0.5)*400*dt;
  boss.vy += (Math.random()-0.5)*200*dt;
  boss.vx *= 0.92; boss.vy *= 0.92;
  boss.x += boss.vx*dt; boss.y += boss.vy*dt;
  // Spirale dense
  if (boss.fireTimer <= 0) { _spiralShot(state, boss, cfg.spiralArms); boss.fireTimer = cfg.fireRate; }
  // Minions
  boss.minionTimer -= dt;
  if (boss.minionTimer <= 0) {
    spawnEnemy(state, ['shard','echo','sentinel'][Math.floor(Math.random()*3)]);
    boss.minionTimer = 2.0 + Math.random();
  }
  // Contact
  const dx=pl.x-boss.x, dy=pl.y-boss.y;
  if (Math.sqrt(dx*dx+dy*dy) < 50) damagePlayer(state, 8*dt);
}

function _phaseTransition(state, phase) {
  state.boss.phase = phase;
  triggerShake(state, 2.5); triggerFlash(state, 0.6);
  spawnParticles(state, state.boss.x, state.boss.y, BOSS_PHASES[phase].color, 25);
}

function _spiralShot(state, boss, arms) {
  state.enemyBullets = state.enemyBullets || [];
  boss.spiralAngle = (boss.spiralAngle || 0) + 0.25;
  for (let i = 0; i < arms; i++) {
    const a = boss.spiralAngle + (i / arms) * Math.PI * 2;
    state.enemyBullets.push({ x: boss.x, y: boss.y, vx: Math.cos(a)*180, vy: Math.sin(a)*180, damage: 10 });
  }
}

function _fanShot(state, boss, tx, ty, count, spread) {
  state.enemyBullets = state.enemyBullets || [];
  const base = Math.atan2(ty - boss.y, tx - boss.x);
  for (let i = 0; i < count; i++) {
    const a = base - spread + (i * spread * 2) / (count-1||1);
    state.enemyBullets.push({ x: boss.x, y: boss.y, vx: Math.cos(a)*200, vy: Math.sin(a)*200, damage: 12 });
  }
}

export function drawBoss(ctx, state) {
  const boss = state.boss;
  if (!boss) return;
  const cfg = BOSS_PHASES[boss.phase];
  const t = Date.now()/1000;

  // Corps
  ctx.save();
  ctx.shadowColor = cfg.color; ctx.shadowBlur = 30 + 10*Math.sin(t*4);
  ctx.strokeStyle = cfg.color; ctx.lineWidth = 3;
  ctx.fillStyle = `rgba(${boss.phase===0?'40,0,20':boss.phase===1?'40,20,0':'30,0,40'},0.9)`;
  ctx.beginPath();
  // Forme hexagonale
  for (let i = 0; i < 6; i++) {
    const a = (i/6)*Math.PI*2 + t*0.5;
    const r = 34 + 6*Math.sin(t*3+i);
    i===0 ? ctx.moveTo(boss.x+Math.cos(a)*r, boss.y+Math.sin(a)*r)
           : ctx.lineTo(boss.x+Math.cos(a)*r, boss.y+Math.sin(a)*r);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();

  // Indicateur de phase (coins)
  ctx.fillStyle = cfg.color; ctx.font = 'bold 11px monospace';
  ctx.fillText(cfg.label, boss.x - 20, boss.y - 44);

  // Barre de vie boss en haut de l'écran
  const bw = 400, bh = 8, bx = 120, by = 8;
  const ratio = boss.hp / boss.maxHp;
  ctx.fillStyle = '#111'; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = cfg.color;
  ctx.shadowColor = cfg.color; ctx.shadowBlur = 10;
  ctx.fillRect(bx, by, bw * ratio, bh);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#8899aa'; ctx.font = '10px monospace';
  ctx.fillText(`NŒUD PRIMAIRE  ${(ratio*100)|0}%`, bx, by + 20);
}
