import { ArcadeSFX as SFX } from '../../arcade-sfx.js';
import { sleep, weightedPick } from '../../arcade-utils.js';

const WAM_DURATION = 30;
const WAM_HOLES = 12;
const WAM_TYPES = [
  { emoji: '🤖', name: 'DRONE', pts: 1, cls: 'normal', weight: 46, ttl: 820 },
  { emoji: '⚡', name: 'SCOUT', pts: 2, cls: 'fast', weight: 20, ttl: 520 },
  { emoji: '⭐', name: 'CORE', pts: 5, cls: 'golden', weight: 7, ttl: 660 },
  { emoji: '🔋', name: 'COOLANT', pts: 0, cls: 'coolant', weight: 7, ttl: 720, effect: 'slow' },
  { emoji: '💠', name: 'OVERCLOCK', pts: 0, cls: 'overclock', weight: 6, ttl: 680, effect: 'overclock' },
  { emoji: '💣', name: 'VIRUS', pts: -4, cls: 'bomb', weight: 14, ttl: 900 },
];
const PHASES = [
  { at: 0, name: 'WARMUP', maxActive: 2, label: 'Drones de surface' },
  { at: 10, name: 'OVERLOAD', maxActive: 3, label: 'Ports multiples' },
  { at: 20, name: 'MELTDOWN', maxActive: 4, label: 'Rush terminal' },
];

export class WhackAMoleGame {
  constructor({ mountId, getBet, debit, credit, addHistory, backToLobby }) {
    this.mountId = mountId;
    this.getBet = getBet;
    this.debit = debit;
    this.credit = credit;
    this.addHistory = addHistory;
    this.backToLobby = backToLobby;
    this.timers = [];
    this.running = false;
    this.starting = false;
    this.launchToken = 0;
    this.raf = null;
  }

  mount() {
    const game = document.getElementById(this.mountId);
    if (!game) return;
    game.innerHTML = `${this.header('DRONE', 'BASH')}
      <div class="wam-brief">
        <div><strong>TERMINAL RUN</strong><span>30 secondes pour nettoyer les ports, garder le combo et éviter les virus.</span></div>
        <div><strong>BONUS</strong><span>Coolant ralentit le flux. Overclock double les points quelques secondes.</span></div>
      </div>
      <div class="wam-arena wam-terminal" id="wam-arena">
        <div class="wam-phase-strip">
          <span id="wam-phase">WARMUP</span>
          <strong id="wam-directive">Drones de surface</strong>
          <span id="wam-accuracy">PREC 100%</span>
        </div>
        <div class="wam-hud">
          <div class="wam-hud-block"><span class="wam-hud-label">SCORE</span><span class="wam-hud-val" id="wam-score">0</span></div>
          <div class="wam-hud-block"><span class="wam-hud-label">TEMPS</span><span class="wam-hud-val wam-timer" id="wam-timer">${WAM_DURATION}</span></div>
          <div class="wam-hud-block"><span class="wam-hud-label">COMBO</span><span class="wam-hud-val wam-combo" id="wam-combo">x1</span></div>
          <div class="wam-hud-block"><span class="wam-hud-label">MAX</span><span class="wam-hud-val" id="wam-maxcombo">x1</span></div>
          <div class="wam-hud-block"><span class="wam-hud-label">CONTRAT</span><span class="wam-hud-val wam-ratio">12 pts = mise</span></div>
        </div>
        <div class="wam-effect-row">
          <span class="wam-effect-pill" id="wam-coolant">COOLANT OFF</span>
          <span class="wam-effect-pill" id="wam-overclock">OVERCLOCK OFF</span>
          <span class="wam-effect-pill" id="wam-streak">STREAK 0</span>
        </div>
        <div class="wam-grid" id="wam-grid">${Array.from({ length: WAM_HOLES }, (_, i) => this.hole(i)).join('')}</div>
        <div class="wam-timebar-wrap"><div class="wam-timebar" id="wam-timebar"></div></div>
      </div>
      <div class="game-msg" id="wam-msg">INSÈRE UN CONTRAT LOCAL ET BOOTE LA RUN</div>
      <div class="action-row"><button class="action-btn primary" id="wam-start">▶ BOOT RUN</button></div>`;
    document.getElementById('game-back')?.addEventListener('click', () => this.backToLobby());
    document.getElementById('wam-start')?.addEventListener('click', () => this.launch());
  }

  header(title, accent = '') {
    return `<div class="game-header">
      <button class="game-back-btn" id="game-back">← LOBBY</button>
      <span class="game-title">${title} ${accent ? `<span class="game-title-accent">${accent}</span>` : ''}</span>
    </div>`;
  }

  hole(index) {
    const port = String(index + 1).padStart(2, '0');
    return `<button class="wam-hole" id="wam-hole-${index}" data-type="idle" aria-label="Port ${port}">
      <span class="wam-port-id">P${port}</span>
      <span class="wam-mole">⬡</span>
      <span class="wam-target-label">IDLE</span>
    </button>`;
  }

  async launch() {
    if (this.running || this.starting) return;
    const bet = this.getBet();
    if (!(await this.debit(bet))) return this.setMsg('STAR TOKENS INSUFFISANTS', 'lose');
    this.starting = true;
    const token = ++this.launchToken;
    this.resetRun();
    this.updateHud();
    this.clearResult();
    const btn = document.getElementById('wam-start');
    if (btn) btn.disabled = true;
    await this.countdown();
    if (token !== this.launchToken || !document.getElementById(this.mountId)?.classList.contains('active')) {
      this.starting = false;
      const start = document.getElementById('wam-start');
      if (start) start.disabled = false;
      return;
    }
    this.starting = false;
    this.running = true;
    this.startedAt = performance.now();
    this.setMsg('DRONE FLUX ACTIF — GARDE LE COMBO', 'neutral');
    this.scheduleMoles();
    this.raf = requestAnimationFrame(() => this.tick());
  }

  resetRun() {
    this.score = 0;
    this.combo = 1;
    this.maxCombo = 1;
    this.hits = 0;
    this.hazards = 0;
    this.escaped = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.targetsSeen = 0;
    this.phaseName = 'WARMUP';
    this.slowUntil = 0;
    this.overclockUntil = 0;
    document.querySelectorAll('.wam-hole').forEach(hole => this.resetHole(hole));
    document.getElementById('wam-timebar')?.classList.remove('urgent');
    document.getElementById('wam-timer')?.classList.remove('urgent');
  }

  async countdown() {
    const arena = document.getElementById('wam-arena');
    if (!arena) return;
    for (const text of ['3', '2', '1', 'BASH']) {
      SFX.tick();
      const node = document.createElement('div');
      node.className = 'wam-countdown';
      node.textContent = text;
      arena.appendChild(node);
      await sleep(360);
      node.remove();
    }
  }

  scheduleMoles() {
    if (!this.running) return;
    const holes = [...document.querySelectorAll('.wam-hole:not(.active):not(.hit):not(.miss):not(.escaped)')];
    const elapsed = (performance.now() - this.startedAt) / 1000;
    const phase = this.phaseFor(elapsed);
    const maxActive = phase.maxActive;
    if (holes.length && document.querySelectorAll('.wam-hole.active').length < maxActive) {
      this.popDrone(holes[Math.floor(Math.random() * holes.length)], elapsed);
    }
    const slow = this.isSlowActive();
    const base = slow ? 520 : elapsed > 20 ? 230 : elapsed > 10 ? 280 : 340;
    const variance = slow ? 380 : 360;
    this.timers.push(setTimeout(() => this.scheduleMoles(), base + Math.random() * variance));
  }

  popDrone(hole, elapsed) {
    const type = weightedPick(WAM_TYPES);
    hole.className = `wam-hole active ${type.cls}`;
    hole.dataset.type = type.cls;
    hole.dataset.name = type.name;
    hole.querySelector('.wam-mole').textContent = type.emoji;
    hole.querySelector('.wam-target-label').textContent = type.name;
    this.targetsSeen += type.pts > 0 ? 1 : 0;

    const phaseSpeed = elapsed > 20 ? 0.82 : elapsed > 10 ? 0.92 : 1;
    const ttl = Math.round(type.ttl * phaseSpeed * (this.isSlowActive() ? 1.38 : 1));
    const timeout = setTimeout(() => this.escapeHole(hole, type), ttl);
    hole.onclick = () => {
      clearTimeout(timeout);
      if (!hole.classList.contains('active')) return;
      this.hitTarget(hole, type);
    };
  }

  hitTarget(hole, type) {
    if (type.effect) {
      this.applyEffect(type.effect);
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.combo = Math.min(8, this.combo + 1);
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.flashHole(hole, type, type.effect === 'overclock' ? 'OVERCLOCK' : 'SLOW FLOW', false);
      this.updateHud();
      SFX.jackpot?.();
      return;
    }

    const boosted = type.pts > 0 && this.isOverclockActive();
    const rawPts = type.pts < 0 ? type.pts : type.pts * this.combo;
    const pts = boosted ? rawPts * 2 : rawPts;
    this.score = Math.max(0, this.score + pts);

    if (type.pts < 0) {
      this.hazards += 1;
      this.combo = 1;
      this.streak = 0;
    } else {
      this.hits += 1;
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.combo = Math.min(8, this.combo + 1);
      this.maxCombo = Math.max(this.maxCombo, this.combo);
    }

    this.flashHole(hole, type, `${pts > 0 ? '+' : ''}${pts}${boosted ? ' ×OC' : ''}`, type.pts < 0);
    this.updateHud();
    type.pts < 0 ? SFX.lose() : SFX.tick();
  }

  applyEffect(effect) {
    const now = performance.now();
    if (effect === 'slow') {
      this.slowUntil = Math.max(this.slowUntil, now + 3200);
      this.setMsg('COOLANT INJECTÉ — FLUX RALENTI', 'win');
    }
    if (effect === 'overclock') {
      this.overclockUntil = Math.max(this.overclockUntil, now + 4300);
      this.setMsg('OVERCLOCK ARMÉ — POINTS DOUBLÉS', 'win');
    }
  }

  escapeHole(hole, type) {
    if (!hole.classList.contains('active')) return;
    if (type.pts > 0) {
      this.escaped += 1;
      this.combo = Math.max(1, this.combo - 1);
      this.streak = 0;
      hole.className = 'wam-hole escaped';
      this.updateHud();
      setTimeout(() => this.resetHole(hole), 180);
      return;
    }
    this.resetHole(hole);
  }

  flashHole(hole, type, text, negative) {
    hole.className = `wam-hole ${negative ? 'miss' : 'hit'}`;
    const pop = document.createElement('span');
    pop.className = `wam-score-pop${negative ? ' neg' : ''}`;
    pop.textContent = text;
    hole.appendChild(pop);
    setTimeout(() => {
      this.resetHole(hole);
      pop.remove();
    }, 300);
  }

  resetHole(hole) {
    hole.className = 'wam-hole';
    hole.dataset.type = 'idle';
    hole.dataset.name = 'IDLE';
    const target = hole.querySelector('.wam-mole');
    const label = hole.querySelector('.wam-target-label');
    if (target) target.textContent = '⬡';
    if (label) label.textContent = 'IDLE';
    hole.querySelectorAll('.wam-score-pop').forEach(node => node.remove());
    hole.onclick = null;
  }

  tick() {
    if (!this.running) return;
    const elapsed = (performance.now() - this.startedAt) / 1000;
    const left = Math.max(0, WAM_DURATION - elapsed);
    const urgent = left <= 6;
    const phase = this.phaseFor(elapsed);
    this.phaseName = phase.name;

    document.getElementById('wam-timer').textContent = Math.ceil(left);
    document.getElementById('wam-timebar').style.transform = `scaleX(${left / WAM_DURATION})`;
    document.getElementById('wam-timer')?.classList.toggle('urgent', urgent);
    document.getElementById('wam-timebar')?.classList.toggle('urgent', urgent);
    document.getElementById('wam-phase').textContent = phase.name;
    document.getElementById('wam-directive').textContent = phase.label;
    this.updateEffectHud();
    if (left <= 0) return this.end();
    this.raf = requestAnimationFrame(() => this.tick());
  }

  async end() {
    this.stop();
    const bet = this.getBet();
    const gain = Math.max(0, Math.round(bet * this.score / 12));
    const net = gain - bet;
    if (gain > 0) await this.credit(gain);
    const result = net > 0 ? 'win' : net < 0 ? 'lose' : 'push';
    this.addHistory('DRONE', bet, result, net);
    this.setMsg(`Score ${this.score} · ${this.hits} drones · ${net >= 0 ? '+' : ''}${net} ST`, result);
    this.showResult({ bet, gain, net, result });
    const btn = document.getElementById('wam-start');
    if (btn) { btn.disabled = false; btn.textContent = '↺ REBOOT RUN'; }
    result === 'win' ? SFX.win() : SFX.lose();
  }

  stop() {
    this.running = false;
    this.starting = false;
    this.launchToken += 1;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    document.querySelectorAll('.wam-hole').forEach(hole => this.resetHole(hole));
  }

  phaseFor(elapsed) {
    return PHASES.reduce((current, phase) => elapsed >= phase.at ? phase : current, PHASES[0]);
  }

  isSlowActive() {
    return performance.now() < this.slowUntil;
  }

  isOverclockActive() {
    return performance.now() < this.overclockUntil;
  }

  accuracy() {
    const total = this.hits + this.hazards + this.escaped;
    if (!total) return 100;
    return Math.max(0, Math.round((this.hits / total) * 100));
  }

  rank(result) {
    if (this.accuracy() >= 92 && this.maxCombo >= 8 && result === 'win') return 'S';
    if (this.score >= 36 && result === 'win') return 'A';
    if (this.score >= 24 && result !== 'lose') return 'B';
    if (this.score >= 12) return 'C';
    return 'D';
  }

  updateHud() {
    document.getElementById('wam-score').textContent = this.score;
    document.getElementById('wam-combo').textContent = `x${this.combo}`;
    document.getElementById('wam-maxcombo').textContent = `x${this.maxCombo}`;
    document.getElementById('wam-accuracy').textContent = `PREC ${this.accuracy()}%`;
    document.getElementById('wam-streak').textContent = `STREAK ${this.bestStreak}`;
    this.updateEffectHud();
  }

  updateEffectHud() {
    const now = performance.now();
    const coolant = document.getElementById('wam-coolant');
    const overclock = document.getElementById('wam-overclock');
    const coolantLeft = Math.max(0, Math.ceil((this.slowUntil - now) / 1000));
    const overclockLeft = Math.max(0, Math.ceil((this.overclockUntil - now) / 1000));
    if (coolant) {
      coolant.classList.toggle('active', coolantLeft > 0);
      coolant.textContent = coolantLeft > 0 ? `COOLANT ${coolantLeft}s` : 'COOLANT OFF';
    }
    if (overclock) {
      overclock.classList.toggle('active', overclockLeft > 0);
      overclock.textContent = overclockLeft > 0 ? `OVERCLOCK ${overclockLeft}s` : 'OVERCLOCK OFF';
    }
  }

  clearResult() {
    document.getElementById('wam-result')?.remove();
  }

  showResult({ bet, gain, net, result }) {
    const arena = document.getElementById('wam-arena');
    if (!arena) return;
    this.clearResult();

    const rank = this.rank(result);
    const panel = document.createElement('div');
    panel.id = 'wam-result';
    panel.className = 'wam-result-screen drone-result-screen';
    panel.innerHTML = `
      <div class="wam-result-title">RUN COMPLETE</div>
      <div class="drone-result-rank">RANK ${rank}</div>
      <div class="wam-result-score">${this.score}</div>
      <div class="drone-result-grid">
        <span><strong>${this.hits}</strong> drones</span>
        <span><strong>${this.accuracy()}%</strong> precision</span>
        <span><strong>x${this.maxCombo}</strong> max combo</span>
        <span><strong>${this.bestStreak}</strong> streak</span>
      </div>
      <div class="wam-result-gain">CONTRAT ${bet} ST → GAIN <strong>${gain} ST</strong> <span class="${net >= 0 ? 'gain-pos' : 'gain-neg'}">${net >= 0 ? '+' : ''}${net} ST</span></div>
      <div class="action-row"><button class="action-btn primary" id="wam-result-retry">↺ REBOOT RUN</button></div>`;
    arena.appendChild(panel);
    document.getElementById('wam-result-retry')?.addEventListener('click', () => this.launch());
  }

  setMsg(text, type = '') {
    const node = document.getElementById('wam-msg');
    if (!node) return;
    node.textContent = text;
    node.className = 'game-msg' + (type ? ` ${type}` : '');
  }
}
