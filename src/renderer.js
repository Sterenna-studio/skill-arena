const WALL    = 40;
const FLOOR_SZ = 40;

const ENEMY_PALETTE = {
  shard:    { body: '#ff3300', core: '#ff8866', glow: '#ff3300' },
  proxy:    { body: '#cc00ff', core: '#ee88ff', glow: '#cc00ff' },
  sentinel: { body: '#00ccff', core: '#88eeff', glow: '#00ccff' },
  knight:   { body: '#886600', core: '#ddaa33', glow: '#aa8800' },
  echo:     { body: '#33ff99', core: '#aaffdd', glow: '#33ff99' },
};

export function render(ctx, state) {
  ctx.save();
  if (state.juice.shake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * state.juice.shake * 8,
      (Math.random() - 0.5) * state.juice.shake * 8,
    );
  }

  drawRoom(ctx);

  for (const d of state.drops)    drawDrop(ctx, d);
  for (const b of state.bullets)  drawBullet(ctx, b);
  for (const e of state.enemies)  drawEnemy(ctx, e);
  if (state.player) drawPlayer(ctx, state.player, state.input.mouse);
  for (const p of state.particles) drawParticle(ctx, p);

  ctx.restore();

  // Flash overlay (not affected by shake)
  if (state.juice.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${state.juice.flash})`;
    ctx.fillRect(0, 0, 640, 640);
  }

  drawHUD(ctx, state);
  drawOverlay(ctx, state);
}

// ---- Room ----

function drawRoom(ctx) {
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, 640, 640);

  // Floor tiles
  ctx.fillStyle = '#0e0e20';
  for (let x = WALL; x < 600; x += FLOOR_SZ) {
    for (let y = WALL; y < 600; y += FLOOR_SZ) {
      ctx.fillRect(x + 1, y + 1, FLOOR_SZ - 2, FLOOR_SZ - 2);
    }
  }

  // Floor grid lines
  ctx.strokeStyle = '#151528';
  ctx.lineWidth = 1;
  for (let x = WALL; x <= 600; x += FLOOR_SZ) {
    ctx.beginPath(); ctx.moveTo(x, WALL); ctx.lineTo(x, 600); ctx.stroke();
  }
  for (let y = WALL; y <= 600; y += FLOOR_SZ) {
    ctx.beginPath(); ctx.moveTo(WALL, y); ctx.lineTo(600, y); ctx.stroke();
  }

  // Walls
  ctx.fillStyle = '#12122a';
  ctx.fillRect(0, 0, 640, WALL);
  ctx.fillRect(0, 600, 640, 40);
  ctx.fillRect(0, 0, WALL, 640);
  ctx.fillRect(600, 0, 40, 640);

  // Wall border glow
  ctx.strokeStyle = '#2a2a5a';
  ctx.lineWidth = 2;
  ctx.strokeRect(WALL, WALL, 560, 560);

  // Corner rivets
  ctx.fillStyle = '#3a3a7a';
  for (const [cx, cy] of [[WALL, WALL], [600, WALL], [WALL, 600], [600, 600]]) {
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
  }
}

// ---- Player ----

function drawPlayer(ctx, p, mouse) {
  const angle = Math.atan2(mouse.y - p.y, mouse.x - p.x);

  ctx.save();
  ctx.translate(p.x, p.y);

  // Body glow
  ctx.shadowBlur  = 20;
  ctx.shadowColor = '#4488ff';
  ctx.fillStyle   = '#1a44aa';
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#88aaff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();

  // Barrel
  ctx.rotate(angle);
  ctx.shadowBlur = 0;
  ctx.fillStyle  = '#aaccff';
  ctx.fillRect(8, -3, 14, 6);

  ctx.restore();

  // Dash cooldown arc
  if (p.dashCooldown > 0) {
    const fill = 1 - p.dashCooldown / 1.2;
    ctx.save();
    ctx.strokeStyle = 'rgba(80,160,255,0.5)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 19, -Math.PI / 2, -Math.PI / 2 + fill * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Surcharge indicator
  if (p.surchargeTimer > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,200,0,0.8)';
    ctx.lineWidth   = 3;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#ffcc00';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ---- Enemy ----

function drawEnemy(ctx, e) {
  const pal = ENEMY_PALETTE[e.type] || ENEMY_PALETTE.shard;
  const hitPct = Math.max(0, e.hitFlash);

  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.shadowBlur  = 10;
  ctx.shadowColor = pal.glow;

  const bodyColor = hitPct > 0 ? blendToWhite(pal.body, hitPct * 6) : pal.body;
  ctx.fillStyle = bodyColor;

  if (e.type === 'shard') {
    ctx.beginPath();
    ctx.moveTo(0, -13); ctx.lineTo(11, 0); ctx.lineTo(0, 13); ctx.lineTo(-11, 0);
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 'knight') {
    ctx.fillRect(-12, -12, 24, 24);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  // Core
  ctx.shadowBlur = 4;
  ctx.fillStyle  = pal.core;
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  // Virus tint
  if (e.virusTimer > 0) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle   = '#00ff88';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // HP bar
  const bw = 28, ratio = e.hp / e.maxHp;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(-bw / 2, -22, bw, 4);
  ctx.fillStyle = ratio > 0.5 ? '#44ee44' : ratio > 0.25 ? '#ffaa00' : '#ff3300';
  ctx.fillRect(-bw / 2, -22, bw * ratio, 4);

  // Charge windup indicator for knight
  if (e.behavior === 'charge_delayed' && !e.charging && e.chargeTimer < 1.5) {
    ctx.globalAlpha = (1.5 - e.chargeTimer) / 1.5 * 0.6;
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ---- Bullet ----

function drawBullet(ctx, b) {
  ctx.save();
  ctx.shadowBlur  = 10;
  ctx.shadowColor = b.fromPlayer ? '#00ffcc' : '#ff4444';
  ctx.fillStyle   = b.fromPlayer ? '#55ffdd' : '#ff5555';
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius || 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---- Drop ----

function drawDrop(ctx, d) {
  const t   = performance.now() / 1000;
  const bob = Math.sin(t * 2.8 + d.x * 0.05) * 3;

  ctx.save();
  ctx.translate(d.x, d.y + bob);
  ctx.shadowBlur  = 16;
  ctx.shadowColor = '#ffcc00';
  ctx.fillStyle   = '#ffcc00';

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    i === 0
      ? ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10)
      : ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fff8aa';
  ctx.font      = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('F', 0, 3);

  ctx.restore();
}

// ---- Particle ----

function drawParticle(ctx, p) {
  const alpha = p.life / p.maxLife;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle   = p.color;
  ctx.shadowBlur  = 6;
  ctx.shadowColor = p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---- HUD ----

function drawHUD(ctx, state) {
  const p = state.player;
  if (!p) return;

  // HP bar
  const bx = 50, by = 8, bw = 200, bh = 14;
  const hpR = p.hp / p.maxHp;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = hpR > 0.5 ? '#22dd55' : hpR > 0.25 ? '#ffaa00' : '#ff2222';
  ctx.fillRect(bx, by, bw * hpR, bh);
  ctx.strokeStyle = '#334';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = '#fff';
  ctx.font = '10px monospace';
  ctx.fillText(`HP  ${Math.ceil(p.hp)} / ${p.maxHp}`, bx + 4, by + 11);

  // Sector / room
  ctx.fillStyle = '#7788bb';
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Secteur ${state.run.sector}  ·  Salle ${state.run.room}`, bx, by + 30);

  // Agent name
  ctx.fillStyle = '#4488ff';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(p.agent, 592, by + 14);

  // Score
  ctx.fillStyle = '#aabbdd';
  ctx.font = '13px monospace';
  ctx.fillText(`${state.run.score} pts`, 592, by + 30);

  // Active fragments (bottom wall strip)
  if (state.fragments.length > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 606, 640, 34);
    ctx.fillStyle = '#ffcc44';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    const labels = state.fragments.map(f => f.label).join('  ·  ');
    ctx.fillText('⚡ ' + labels, 12, 628);
  }

  ctx.textAlign = 'left';
}

// ---- Phase overlays ----

function drawOverlay(ctx, state) {
  if (state.phase === 'room_clear') {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 270, 640, 100);
    ctx.fillStyle = '#44ff88';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SALLE DÉGAGÉE', 320, 310);
    ctx.fillStyle = '#aabbcc';
    ctx.font = '15px monospace';
    ctx.fillText('Appuyez sur  R  pour continuer', 320, 345);
    ctx.textAlign = 'left';
  }

  if (state.phase === 'dead') {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 240, 640, 160);
    ctx.fillStyle = '#ff3344';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BREACH TERMINÉ', 320, 295);
    ctx.fillStyle = '#cccccc';
    ctx.font = '15px monospace';
    ctx.fillText(`Score final :  ${state.run.score} pts`, 320, 330);
    ctx.fillStyle = '#8899aa';
    ctx.fillText('Appuyez sur  R  pour recommencer', 320, 365);
    ctx.textAlign = 'left';
  }
}

// ---- Helpers ----

function blendToWhite(hex, t) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const clamp = v => Math.min(255, Math.round(v + (255 - v) * Math.min(1, t)));
  return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
}
