import { ArcadeSFX as SFX } from '../../arcade-sfx.js';

const HYPERJUMP_STAGES = [
  { at: 1.25, name: 'IGNITION', label: 'Moteur stable' },
  { at: 1.5, name: 'BOOST', label: 'Flux charge' },
  { at: 2, name: 'RIFT', label: 'Zone risque' },
  { at: 3, name: 'VOID', label: 'Tension haute' },
  { at: 5, name: 'OMEGA', label: 'Signal rare' },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class CrashGame {
  constructor({ mountId, getBet, debit, credit, addHistory, backToLobby }) {
    this.mountId = mountId;
    this.getBet = getBet;
    this.debit = debit;
    this.credit = credit;
    this.addHistory = addHistory;
    this.backToLobby = backToLobby;
    this.running = false;
    this.raf = null;
    this.milestones = new Set();
  }

  mount() {
    const game = document.getElementById(this.mountId);
    if (!game) return;
    game.innerHTML = `${this.header('HYPER', 'JUMP')}
      <div class="crash-rules">
        <div class="crash-rules-title">⚡ HYPERJUMP PROTOCOL</div>
        <div class="crash-rules-grid">
          <div class="crash-rule-block"><span class="crb-icon">🛸</span><span class="crb-label">CHARGE</span><span class="crb-desc">Le tunnel accélère et le multiplicateur grimpe tant que le moteur tient.</span></div>
          <div class="crash-rule-block"><span class="crb-icon">⏏</span><span class="crb-label">CASHOUT</span><span class="crb-desc">Verrouille le gain avant la rupture. Après cashout, regarde jusqu'où le flux aurait tenu.</span></div>
          <div class="crash-rule-block"><span class="crb-icon">🤖</span><span class="crb-label">AUTO</span><span class="crb-desc">Auto-eject conseillé entre ×1.6 et ×2.5 pour une run plus stable.</span></div>
        </div>
      </div>
      <div class="crash-layout">
        <div class="hyperjump-hud">
          <div class="hyperjump-hud-block"><span>MULT</span><strong id="cr-hud-mult">1.00×</strong></div>
          <div class="hyperjump-hud-block"><span>STABILITÉ</span><strong id="cr-stability">100%</strong></div>
          <div class="hyperjump-hud-block"><span>PALIER</span><strong id="cr-stage">ARMING</strong></div>
          <div class="hyperjump-hud-block"><span>POTENTIEL</span><strong id="cr-potential">+0 ST</strong></div>
        </div>
        <div class="hyperjump-stability"><span id="cr-stability-fill"></span></div>
        <div class="crash-canvas-wrap hyperjump-canvas-wrap" id="cr-canvas-wrap">
          <canvas class="crash-canvas hyperjump-canvas" id="cr-canvas" width="900" height="320"></canvas>
          <div class="crash-mult" id="cr-mult">1.00×</div>
          <div class="hyperjump-status" id="cr-status">ENGINE IDLE</div>
          <div class="hyperjump-sparks" id="cr-sparks"></div>
        </div>
        <div class="hyperjump-rail" id="cr-rail">
          ${HYPERJUMP_STAGES.map(stage => `<span class="hyperjump-mark" data-stage="${stage.at}"><strong>×${stage.at}</strong>${stage.name}</span>`).join('')}
        </div>
        <div class="crash-history" id="cr-history"></div>
        <div class="crash-controls">
          <button class="action-btn primary" id="cr-start">▶ HYPERJUMP</button>
          <button class="action-btn" id="cr-eject" disabled>⏏ CASHOUT</button>
          <div class="crash-autoeject-row">AUTO ×<input class="crash-autoeject-inp" id="cr-auto" type="number" min="1.1" max="50" step="0.1" value="2.0"></div>
        </div>
        <div class="game-msg" id="cr-msg">CHOISIS TON SEUIL ET BOOTE LE SAUT</div>
        <div class="hyperjump-result" id="cr-result"></div>
      </div>`;
    document.getElementById('game-back')?.addEventListener('click', () => this.backToLobby());
    document.getElementById('cr-start')?.addEventListener('click', () => this.start());
    document.getElementById('cr-eject')?.addEventListener('click', () => this.eject());
    this.points = [[0, 1]];
    this.mult = 1;
    this.updateHud(1);
    this.draw(1, false);
  }

  header(title, accent = '') {
    return `<div class="game-header">
      <button class="game-back-btn" id="game-back">← LOBBY</button>
      <span class="game-title">${title} ${accent ? `<span class="game-title-accent">${accent}</span>` : ''}</span>
    </div>`;
  }

  async start() {
    if (this.running) return;
    const bet = this.getBet();
    if (!(await this.debit(bet))) return this.setMsg('STAR TOKENS INSUFFISANTS', 'lose');
    this.running = true;
    this.cashed = false;
    this.cashout = null;
    this.target = this.crashPoint();
    this.auto = Math.max(1.1, Math.min(50, Number(document.getElementById('cr-auto')?.value ?? 0) || 0));
    this.t0 = performance.now();
    this.points = [[0, 1]];
    this.exhaust = [];
    this.milestones = new Set();
    this.clearResult();
    this.resetRail();
    this.resetVisualState();
    document.getElementById('cr-start').disabled = true;
    document.getElementById('cr-eject').disabled = false;
    document.getElementById('cr-start').textContent = '▶ HYPERJUMP';
    this.setMsg('TUNNEL ACTIF — CASHOUT AVANT LA RUPTURE', 'neutral');
    this.addSpark('LAUNCH', 'info');
    this.updateHud(1);
    this.loop();
  }

  crashPoint() {
    const houseEdge = 0.94;
    const r = Math.max(0.002, Math.random());
    const point = Math.floor((houseEdge / r) * 100) / 100;
    return Math.max(1.01, Math.min(point, 80));
  }

  loop() {
    if (!this.running) return;
    const elapsed = (performance.now() - this.t0) / 1000;
    this.mult = Math.round(Math.pow(1.075, elapsed * 5) * 100) / 100;
    this.points.push([elapsed, this.mult]);
    if (this.points.length > 420) this.points.shift();
    this.updateHud(this.mult);
    this.updateMilestones(this.mult);
    this.draw(this.mult, false);
    if (this.auto > 1 && this.mult >= this.auto && !this.cashed) this.eject(true);
    if (this.mult >= this.target) return this.crash();
    this.raf = requestAnimationFrame(() => this.loop());
  }

  async eject(auto = false) {
    if (!this.running || this.cashed) return;
    this.cashed = true;
    const bet = this.getBet();
    const gain = Math.round(bet * this.mult);
    const net = gain - bet;
    this.cashout = { auto, bet, gain, net, mult: this.mult };
    await this.credit(gain);
    this.addHistory('CRASH', bet, 'win', net);
    this.setMsg(`${auto ? 'AUTO ' : ''}CASHOUT ×${this.mult.toFixed(2)} · +${net} ST VERROUILLÉS`, 'win');
    document.getElementById('cr-eject').disabled = true;
    document.getElementById('cr-canvas-wrap')?.classList.add('cashed');
    this.addPill(this.mult, 'safe');
    this.addSpark(auto ? 'AUTO LOCK' : 'SAFE LOCK', 'safe');
    this.updateHud(this.mult);
    SFX.win();
  }

  crash() {
    this.stop(false);
    const mult = document.getElementById('cr-mult');
    if (mult) {
      mult.textContent = `💥 ${this.mult.toFixed(2)}×`;
      mult.classList.add('crashed');
    }
    document.getElementById('cr-canvas-wrap')?.classList.add('crashed');
    this.draw(this.mult, true);
    const cat = this.mult < 1.5 ? 'danger' : this.mult < 3 ? 'risky' : 'safe';
    this.addPill(this.mult, cat);
    if (!this.cashed) {
      const bet = this.getBet();
      this.addHistory('CRASH', bet, 'lose', -bet);
      this.setMsg(`RUPTURE MOTEUR ×${this.mult.toFixed(2)} · -${bet} ST`, 'lose');
      this.showResult({ result: 'lose', bet, gain: 0, net: -bet, mult: this.mult, crashedAt: this.mult });
      SFX.crash();
    } else {
      this.setMsg(`LOCK SAFE ×${this.cashout.mult.toFixed(2)} · RUPTURE À ×${this.mult.toFixed(2)}`, 'win');
      this.showResult({ result: 'win', ...this.cashout, crashedAt: this.mult });
    }
    document.getElementById('cr-start').disabled = false;
    document.getElementById('cr-start').textContent = '↺ RELANCER';
    document.getElementById('cr-eject').disabled = true;
  }

  addPill(mult, cat) {
    const wrap = document.getElementById('cr-history');
    if (!wrap) return;
    const pill = document.createElement('span');
    pill.className = `crash-hist-pill ${cat}`;
    pill.textContent = `${mult.toFixed(2)}×`;
    wrap.prepend(pill);
    while (wrap.children.length > 12) wrap.lastElementChild.remove();
  }

  stop(reset = true) {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.running = false;
    if (reset) this.cashed = false;
  }

  resetVisualState() {
    const mult = document.getElementById('cr-mult');
    if (mult) {
      mult.textContent = '1.00×';
      mult.classList.remove('crashed');
    }
    const wrap = document.getElementById('cr-canvas-wrap');
    wrap?.classList.remove('cashed', 'crashed', 'critical');
    document.getElementById('cr-status').textContent = 'ENGINE ONLINE';
    document.getElementById('cr-potential').textContent = '+0 ST';
  }

  clearResult() {
    const node = document.getElementById('cr-result');
    if (node) node.innerHTML = '';
  }

  updateHud(mult) {
    const bet = this.getBet();
    const stability = this.stabilityFor(mult);
    const stage = this.stageFor(mult);
    const potential = Math.round(bet * mult) - bet;

    document.getElementById('cr-mult').textContent = `${mult.toFixed(2)}×`;
    document.getElementById('cr-hud-mult').textContent = `${mult.toFixed(2)}×`;
    document.getElementById('cr-stability').textContent = `${stability}%`;
    document.getElementById('cr-stage').textContent = stage.name;
    document.getElementById('cr-potential').textContent = this.cashed
      ? `LOCK +${this.cashout?.net ?? 0} ST`
      : `${potential >= 0 ? '+' : ''}${potential} ST`;
    document.getElementById('cr-status').textContent = this.cashed ? 'CASHOUT LOCKED' : stage.label;
    document.getElementById('cr-stability-fill').style.transform = `scaleX(${stability / 100})`;
    document.getElementById('cr-canvas-wrap')?.classList.toggle('critical', stability <= 35 && !this.cashed);
  }

  stabilityFor(mult) {
    const base = 100 - Math.min(92, Math.log2(Math.max(1, mult)) * 34);
    const pulse = mult > 2 ? Math.sin(performance.now() / 70) * 5 : 0;
    return clamp(Math.round(base + pulse), 4, 100);
  }

  stageFor(mult) {
    return HYPERJUMP_STAGES.reduce(
      (current, stage) => mult >= stage.at ? stage : current,
      { name: 'ARMING', label: 'Moteur en charge' },
    );
  }

  updateMilestones(mult) {
    for (const stage of HYPERJUMP_STAGES) {
      if (mult < stage.at || this.milestones.has(stage.at)) continue;
      this.milestones.add(stage.at);
      const node = document.querySelector(`#cr-rail [data-stage="${stage.at}"]`);
      node?.classList.add('hit');
      this.addSpark(`${stage.name} ×${stage.at}`, stage.at >= 3 ? 'hot' : 'info');
      SFX.tick();
    }
  }

  resetRail() {
    document.querySelectorAll('#cr-rail .hyperjump-mark').forEach(node => node.classList.remove('hit'));
  }

  addSpark(text, type = 'info') {
    const wrap = document.getElementById('cr-sparks');
    if (!wrap) return;
    const spark = document.createElement('span');
    spark.className = `hyperjump-spark ${type}`;
    spark.textContent = text;
    wrap.appendChild(spark);
    setTimeout(() => spark.remove(), 850);
  }

  showResult({ result, bet, gain, net, mult, crashedAt, auto = false }) {
    const node = document.getElementById('cr-result');
    if (!node) return;
    const rank = this.rank({ result, mult, crashedAt, auto });
    const locked = result === 'win';
    node.innerHTML = `<div class="hyperjump-result-card ${locked ? 'win' : 'lose'}">
      <div class="hyperjump-result-title">${locked ? 'JUMP LOCKED' : 'ENGINE LOST'}</div>
      <div class="hyperjump-result-rank">RANK ${rank}</div>
      <div class="hyperjump-result-main">×${mult.toFixed(2)}</div>
      <div class="hyperjump-result-grid">
        <span><strong>${bet} ST</strong> contrat</span>
        <span><strong>${gain} ST</strong> gain</span>
        <span><strong>${net >= 0 ? '+' : ''}${net} ST</strong> net</span>
        <span><strong>×${crashedAt.toFixed(2)}</strong> rupture</span>
      </div>
    </div>`;
  }

  rank({ result, mult, crashedAt, auto }) {
    if (result !== 'win') return mult >= 2 ? 'C' : 'D';
    const gap = crashedAt - mult;
    if (!auto && mult >= 5) return 'S';
    if (!auto && gap <= 0.22 && mult >= 2) return 'S';
    if (mult >= 3) return 'A';
    if (mult >= 1.7) return 'B';
    return 'C';
  }

  draw(mult, crashed) {
    const canvas = document.getElementById('cr-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    this.drawHyperTunnel(ctx, W, H, mult, crashed);

    if (!this.points?.length) return;
    this.drawMultiplierTrace(ctx, W, H, mult, crashed);

    const shipX = W * 0.55 + Math.sin(performance.now() / 180) * 8;
    const shipY = H * 0.52 - Math.min(mult, 8) * 5;
    this.drawShipTrail(ctx, shipX, shipY, crashed);
    this.drawHubShip(ctx, shipX, shipY, 1, crashed ? 0.95 : 0.82 + Math.min(mult, 8) * 0.035, crashed);
    if (this.cashed) this.drawSafeBurst(ctx, shipX, shipY);
    if (crashed) this.drawExplosion(ctx, shipX, shipY);
  }

  drawMultiplierTrace(ctx, W, H, mult, crashed) {
    const maxT = Math.max(this.points.at(-1)[0], 5);
    const maxM = Math.max(mult * 1.2, 2);
    const graphW = W * 0.33;
    const graphH = H * 0.34;
    const graphX = 26;
    const graphY = H - graphH - 24;
    const toX = t => graphX + (t / maxT) * graphW;
    const toY = m => graphY + graphH - (m / maxM) * graphH;

    ctx.save();
    ctx.globalAlpha = 0.84;
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.strokeRect(graphX, graphY, graphW, graphH);

    ctx.beginPath();
    ctx.strokeStyle = crashed ? '#ff4757' : this.cashed ? '#00ff80' : '#00e5ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 14;
    this.points.forEach(([t, m], i) => i ? ctx.lineTo(toX(t), toY(m)) : ctx.moveTo(toX(t), toY(m)));
    ctx.stroke();
    ctx.fillStyle = 'rgba(168,230,255,.72)';
    ctx.font = '10px Share Tech Mono, monospace';
    ctx.fillText('MULT TRACE', graphX + 8, graphY + 16);
    ctx.restore();
  }

  drawHyperTunnel(ctx, W, H, mult, crashed) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, crashed ? '#1b0308' : '#050716');
    bg.addColorStop(0.45, this.cashed ? '#041b14' : '#0b0822');
    bg.addColorStop(1, '#020308');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const cx = W * 0.56;
    const cy = H * 0.48;
    const speed = performance.now() * 0.0015 * Math.min(10, mult);

    ctx.save();
    for (let i = 0; i < 18; i++) {
      const p = ((i / 18 + speed) % 1);
      const radiusX = 28 + p * W * 0.74;
      const radiusY = 12 + p * H * 0.48;
      ctx.globalAlpha = (1 - p) * (crashed ? 0.35 : 0.22) + 0.04;
      ctx.strokeStyle = crashed ? '#ff4757' : i % 3 === 0 ? '#ff6eb4' : '#00e5ff';
      ctx.lineWidth = 1 + p * 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = crashed ? 0.38 : 0.2;
    for (let i = 0; i < 42; i++) {
      const angle = (Math.PI * 2 * i) / 42 + speed;
      const length = 110 + (i % 7) * 32;
      const x1 = cx + Math.cos(angle) * 38;
      const y1 = cy + Math.sin(angle) * 18;
      const x2 = cx + Math.cos(angle) * length;
      const y2 = cy + Math.sin(angle) * length * 0.45;
      ctx.strokeStyle = i % 2 ? 'rgba(0,229,255,.24)' : 'rgba(255,110,180,.18)';
      ctx.lineWidth = i % 5 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = crashed ? 0.26 : 0.16;
    const starSpeed = performance.now() * 0.025 + mult * 12;
    for (let i = 0; i < 48; i++) {
      const x = (i * 83 + starSpeed * (i % 5 + 1)) % W;
      const y = (i * 47) % H;
      ctx.fillStyle = i % 3 === 0 ? '#00ffcc' : i % 3 === 1 ? '#ffffff' : '#ffcc00';
      ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    }
    ctx.restore();
  }

  // Same silhouette as the hub canvas ship in index.html, adapted for the Crash graph.
  drawHubShip(ctx, x, y, dir = 1, scale = 1, crashed = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(crashed ? -0.9 : -0.18);
    ctx.scale(dir, 1);
    ctx.scale(scale, scale);

    ctx.strokeStyle = crashed ? '#ff4757' : '#00ffcc';
    ctx.shadowColor = crashed ? '#ff4757' : '#00ffcc';
    ctx.shadowBlur = crashed ? 24 : 18;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-30, -10);
    ctx.lineTo(-36, 0);
    ctx.lineTo(-30, 10);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-12, -6);
    ctx.lineTo(-20, -22);
    ctx.lineTo(-30, -10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-12, 6);
    ctx.lineTo(-20, 22);
    ctx.lineTo(-30, 10);
    ctx.stroke();

    ctx.shadowBlur = crashed ? 30 : 24;
    ctx.shadowColor = crashed ? '#ffcc00' : '#ff6600';
    ctx.strokeStyle = crashed ? '#ffcc00' : '#ff9933';
    ctx.beginPath();
    ctx.moveTo(-36, -5);
    ctx.lineTo(-48 - Math.random() * 12, 0);
    ctx.lineTo(-36, 5);
    ctx.stroke();
    ctx.restore();
  }

  drawShipTrail(ctx, x, y, crashed) {
    ctx.save();
    const grad = ctx.createLinearGradient(x - 130, y + 18, x, y);
    grad.addColorStop(0, 'rgba(255,102,0,0)');
    grad.addColorStop(0.55, crashed ? 'rgba(255,71,87,.34)' : this.cashed ? 'rgba(0,255,128,.28)' : 'rgba(255,153,51,.24)');
    grad.addColorStop(1, crashed ? 'rgba(255,204,0,.65)' : this.cashed ? 'rgba(0,255,128,.62)' : 'rgba(0,255,204,.42)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = crashed ? 7 : 5;
    ctx.shadowColor = crashed ? '#ff4757' : this.cashed ? '#00ff80' : '#00ffcc';
    ctx.shadowBlur = crashed ? 18 : 12;
    ctx.beginPath();
    ctx.moveTo(x - 126, y + 24);
    ctx.quadraticCurveTo(x - 68, y + 11, x - 22, y + 3);
    ctx.stroke();
    ctx.restore();
  }

  drawSafeBurst(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,255,128,.72)';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00ff80';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(x, y, 68, 34, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawExplosion(ctx, x, y) {
    ctx.save();
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16;
      const r = 10 + Math.random() * 28;
      ctx.strokeStyle = i % 2 ? '#ff4757' : '#ffcc00';
      ctx.lineWidth = 2;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.restore();
  }

  setMsg(text, type = '') {
    const node = document.getElementById('cr-msg');
    if (!node) return;
    node.textContent = text;
    node.className = 'game-msg' + (type ? ` ${type}` : '');
  }
}
