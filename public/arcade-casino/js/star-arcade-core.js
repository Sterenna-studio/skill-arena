/**
 * star-arcade-core.js — Star Arcade router
 *
 * This file now only owns the lobby, local wallet, bet panel, history and game routing.
 * Each mini-game lives in its own folder under /star/casino/js/games/.
 */
import { ArcadeSFX as SFX } from './arcade-sfx.js';
import { WhackAMoleGame } from './games/whack-a-mole/whack-a-mole.js';
import { CrashGame } from './games/crash/crash.js';
import { SlotMachineGame } from './games/slot-machine/slot-machine.js';
import { NeonRacer } from './games/neon-racer/neon-racer.js';

const STAR_TOKEN_STORAGE_KEY = 'star-arcade:star-tokens:v1';
const ARCADE_STATS_STORAGE_KEY = 'star-arcade:machine-stats:v1';
const STAR_TOKEN_START_BALANCE = 1000;
const STAR_TOKEN_SYMBOL = 'ST';
const BOOT_DURATION_MS = 680;

const GAME_CARDS = [
  {
    id: 'wam',
    icon: '🔨',
    tag: '// CABINET 01',
    machine: 'DRONE BASH',
    title: 'WHACK-A-MOLE',
    desc: '30 secondes. Frappe les entités, évite les bombes, garde ton combo. Jeu plutôt skill.',
    meta: 'REFLEXES · COMBO',
    attract: '30 SEC RUN',
    controls: 'TAP / CLIC',
    color: 'var(--c-orange)',
  },
  {
    id: 'crash',
    icon: '🚀',
    tag: '// CABINET 02',
    machine: 'HYPERJUMP',
    title: 'CRASH',
    desc: 'Le multiplicateur monte. Éjecte-toi avant le crash ou utilise l’auto-eject.',
    meta: 'RISQUE · CASHOUT',
    attract: 'MULTIPLIER RUSH',
    controls: 'EJECT',
    color: 'var(--c-pink)',
  },
  {
    id: 'slots',
    icon: '🎰',
    tag: '// CABINET 03',
    machine: 'COIN REACTOR',
    title: 'SLOT MACHINE',
    desc: '5 rouleaux × 3 lignes. Gains gauche → droite sur 5 lignes. Version réparée.',
    meta: 'LUCK · PAYLINES',
    attract: '5 LIGNES',
    controls: 'SPIN',
    color: 'var(--c-amber)',
  },
  {
    id: 'nr',
    icon: '🏁',
    tag: '// CABINET 04',
    machine: 'NEON CIRCUIT',
    title: 'NEON RACER',
    desc: 'Course arcade à axes alternés. Choisis véhicule et cœurs. Jeu skill/risque.',
    meta: 'SKILL · COURSE',
    attract: 'DRIFT / BOOST',
    controls: 'ARROWS',
    color: 'var(--c-cyan)',
  },
];

function emptyMachineStats() {
  return { runs: 0, wins: 0, bestNet: null, lastNet: null, lastResult: 'none' };
}

export class StarArcadeCore {
  static async boot({ mount, user }) {
    const inst = new StarArcadeCore(mount, user);
    inst.loadMachineStats();
    await inst.loadCredits();
    return inst;
  }

  constructor(mount, user) {
    this.mountSel = mount;
    this.user = user;
    this.userId = user?.id ?? null;
    this.credits = 0;
    this.bet = 10;
    this.history = [];
    this.activeGame = null;
    this.activeGameId = null;
    this.nrResult = null;
    this.nrBack = null;
    this.machineStats = {};
    this.booting = false;
  }

  storageKey() {
    return `${STAR_TOKEN_STORAGE_KEY}:${this.userId || 'guest'}`;
  }

  statsKey() {
    return `${ARCADE_STATS_STORAGE_KEY}:${this.userId || 'guest'}`;
  }

  loadMachineStats() {
    try {
      const raw = window.localStorage.getItem(this.statsKey());
      const parsed = raw ? JSON.parse(raw) : {};
      this.machineStats = Object.fromEntries(
        GAME_CARDS.map(card => [card.id, { ...emptyMachineStats(), ...(parsed[card.id] ?? {}) }]),
      );
    } catch (error) {
      console.warn('[Star Arcade] local machine stats fallback:', error?.message ?? error);
      this.machineStats = Object.fromEntries(GAME_CARDS.map(card => [card.id, emptyMachineStats()]));
    }
  }

  saveMachineStats() {
    try {
      window.localStorage.setItem(this.statsKey(), JSON.stringify(this.machineStats));
    } catch (error) {
      console.warn('[Star Arcade] local machine stats save failed:', error?.message ?? error);
    }
  }

  getMachineStats(id) {
    if (!this.machineStats[id]) this.machineStats[id] = emptyMachineStats();
    return this.machineStats[id];
  }

  async loadCredits() {
    try {
      const stored = window.localStorage.getItem(this.storageKey());
      const parsed = Number(stored);
      this.credits = Number.isFinite(parsed) && parsed >= 0 ? parsed : STAR_TOKEN_START_BALANCE;
      await this.saveCredits();
    } catch (error) {
      console.warn('[Star Arcade] local Star Tokens fallback:', error?.message ?? error);
      this.credits = STAR_TOKEN_START_BALANCE;
    }
  }

  async saveCredits() {
    try {
      window.localStorage.setItem(this.storageKey(), String(Math.max(0, Math.floor(this.credits))));
    } catch (error) {
      console.warn('[Star Arcade] local Star Tokens save failed:', error?.message ?? error);
    }

    this.updateCreditsDisplay();
  }

  showLobby() {
    this.cleanupActiveGame();

    const root = document.querySelector(this.mountSel);
    if (!root) return;

    root.innerHTML = `
      <div class="scanlines" aria-hidden="true"></div>
      <div class="casino-page" id="casino-page">
        <nav class="casino-statusbar">
          <div class="sb-left">
            <span class="sb-logo">STAR · ARCADE</span>
            <a href="/star/" class="sb-back">← RETOUR HUB</a>
          </div>
          <div class="sb-right">
            <span class="sb-credits-label">STAR TOKENS</span>
            <span class="sb-credits-val" id="sb-credits">${this.formatWithUnit(this.credits)}</span>
            <span class="sb-dot"></span>
          </div>
        </nav>

        <section class="casino-lobby" id="view-lobby">
          <div class="lobby-hero">
            <h1 class="lobby-hero-title">ARCADE</h1>
            <p class="lobby-hero-sub">4 MINI-JEUX · STAR TOKENS LOCAUX · CONVERSION CHRONICLES PLUS TARD</p>
            <span class="lobby-hero-line"></span>
          </div>

          <div class="arcade-floor-panel">
            <span>SELECT MACHINE</span>
            <strong>BOOT · PLAY · SCORE · RETRY</strong>
            <span>LOCAL ST MODE</span>
          </div>

          <div class="jackpot-banner" style="width:100%;max-width:620px;margin-bottom:32px">
            <span class="jp-icon">🪙</span>
            <span class="jp-label">MODE LOCAL ACTIVÉ</span>
            <span class="jp-val" id="jp-val">CHRONICLES BLOQUÉS</span>
          </div>

          <div class="lobby-grid">
            ${GAME_CARDS.map(card => this.card(card)).join('')}
          </div>

          <div class="history-section" style="margin-top:48px;width:100%" id="history-section">
            <div class="history-head"><span>JEU</span><span>RÉSULTAT</span><span>MISE</span><span>GAIN</span><span>SOLDE</span></div>
            <div class="history-body" id="history-body"></div>
          </div>
        </section>

        <section class="casino-game arcade-machine-screen" id="game-wam" data-machine="DRONE BASH"></section>
        <section class="casino-game arcade-machine-screen" id="game-crash" data-machine="HYPERJUMP"></section>
        <section class="casino-game arcade-machine-screen" id="game-slots" data-machine="COIN REACTOR"></section>
        <section class="casino-game arcade-machine-screen" id="game-nr" data-machine="NEON CIRCUIT"></section>
      </div>`;

    GAME_CARDS.forEach(card => {
      document.getElementById(`card-${card.id}`)?.addEventListener('click', () => {
        SFX.click();
        this.showGame(card.id);
      });
    });

    this.renderHistory();
  }

  card(card) {
    const stats = this.getMachineStats(card.id);
    return `<button class="game-card arcade-cabinet-card" id="card-${card.id}" style="--card-color:${card.color}" aria-label="Sélectionner ${card.machine}">
      <div class="gc-cabinet-top"><span>${card.tag}</span><span class="gc-live">READY</span></div>
      <div class="gc-screen">
        <div class="gc-icon">${card.icon}</div>
        <div class="gc-attract">${card.attract}</div>
        <div class="gc-scan"></div>
      </div>
      <div class="gc-tag">${card.machine}</div>
      <div class="gc-title">${card.title}</div>
      <div class="gc-desc">${card.desc}</div>
      <div class="gc-meta">
        <span class="gc-badge">${card.meta}</span>
        <span class="gc-badge">${card.controls}</span>
      </div>
      <div class="gc-stats">
        <span>RUNS <strong id="stat-${card.id}-runs">${this.format(stats.runs)}</strong></span>
        <span>BEST <strong id="stat-${card.id}-best">${this.formatNet(stats.bestNet)}</strong></span>
        <span>LAST <strong id="stat-${card.id}-last">${this.formatNet(stats.lastNet)}</strong></span>
      </div>
      <div class="gc-controls" aria-hidden="true"><span class="gc-stick"></span><span></span><span></span></div>
      <div class="gc-play-btn">▶ BOOT MACHINE</div>
    </button>`;
  }

  async showGame(name) {
    if (this.booting) return;
    const card = GAME_CARDS.find(item => item.id === name);
    if (!card) return;

    this.booting = true;
    this.cleanupActiveGame();

    try {
      await this.bootMachine(card);

      const page = document.getElementById('casino-page');
      page?.classList.add('in-machine');
      if (page) page.dataset.activeMachine = card.machine;

      document.getElementById('view-lobby')?.style.setProperty('display', 'none');
      document.querySelectorAll('.casino-game').forEach(g => g.classList.remove('active'));
      document.getElementById(`game-${name}`)?.classList.add('active');

      this.activeGameId = name;

      const common = {
        mountId: `game-${name}`,
        getBet: () => this.bet,
        debit: amount => this.debit(amount),
        credit: amount => this.credit(amount),
        addHistory: (...args) => this.addHistory(...args),
        backToLobby: () => this.backToLobby(),
      };

      if (name === 'wam') this.activeGame = new WhackAMoleGame(common);
      if (name === 'crash') this.activeGame = new CrashGame(common);
      if (name === 'slots') this.activeGame = new SlotMachineGame(common);

      if (name === 'nr') {
        this.mountNeonRacer();
      } else if (this.activeGame?.mount) {
        this.activeGame.mount();
        this.renderBetPanel(name);
      }

      this.decorateMachineScreen(card);
    } finally {
      this.booting = false;
      document.getElementById('casino-page')?.classList.remove('machine-booting');
    }
  }

  bootMachine(card) {
    const page = document.getElementById('casino-page');
    if (!page) return Promise.resolve();

    page.classList.add('machine-booting');
    document.getElementById('arcade-boot-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'arcade-boot-overlay';
    overlay.className = 'arcade-boot-overlay';
    overlay.style.setProperty('--machine-color', card.color);
    overlay.innerHTML = `<div class="boot-frame">
      <span class="boot-kicker">INSERT STAR TOKEN</span>
      <strong>${card.machine}</strong>
      <span>${card.title}</span>
      <div class="boot-progress"><i></i></div>
      <em>${card.controls} · ${card.meta}</em>
    </div>`;
    page.appendChild(overlay);

    SFX.tick();
    setTimeout(() => SFX.tick(), 180);
    setTimeout(() => SFX.click(), 420);

    return new Promise(resolve => {
      setTimeout(() => {
        overlay.classList.add('leaving');
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 180);
      }, BOOT_DURATION_MS);
    });
  }

  decorateMachineScreen(card) {
    const game = document.getElementById(`game-${card.id}`);
    if (!game) return;

    game.style.setProperty('--machine-color', card.color);
    game.dataset.machine = card.machine;
    game.dataset.machineMeta = `${card.controls} / ${card.meta}`;

    const header = game.querySelector('.game-header');
    if (!header || header.querySelector('.machine-led')) return;
    header.insertAdjacentHTML('beforeend', `<span class="machine-led">${card.attract}</span>`);
  }

  renderBetPanel(name) {
    const game = document.getElementById(`game-${name}`);
    if (!game || name === 'nr') return;

    const existing = game.querySelector('.bet-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.innerHTML = this.betPanel(name);

    const header = game.querySelector('.game-header');
    if (header) header.insertAdjacentElement('afterend', panel.firstElementChild);
    else game.prepend(panel.firstElementChild);

    this.bindBetPanel(name);
  }

  backToLobby() {
    this.cleanupActiveGame();
    document.querySelectorAll('.casino-game').forEach(g => g.classList.remove('active'));
    document.getElementById('view-lobby')?.style.removeProperty('display');
    const page = document.getElementById('casino-page');
    page?.classList.remove('in-machine', 'machine-booting');
    if (page) delete page.dataset.activeMachine;
    this.activeGameId = null;
    this.updateCreditsDisplay();
    this.renderHistory();
  }

  cleanupActiveGame() {
    if (this.activeGame?.stop) this.activeGame.stop();
    this.activeGame = null;
    this.cleanupNeonRacer();
  }

  betPanel(id, presets = [1, 5, 10, 25, 50, 100]) {
    const maxBet = Math.max(1, Math.min(100, this.credits));
    if (this.bet > maxBet) this.bet = maxBet;

    return `<div class="bet-panel">
      <span class="bet-label">MISE ${STAR_TOKEN_SYMBOL}</span>
      <button class="bet-btn" id="${id}-bet-down">−</button>
      <span class="bet-val" id="${id}-bet-val">${this.bet}</span>
      <button class="bet-btn" id="${id}-bet-up">+</button>
      <div class="bet-presets">
        ${presets.map(p => `<button class="bet-preset${this.bet === p ? ' active' : ''}" data-preset="${p}" ${p > this.credits ? 'disabled' : ''}>${p}</button>`).join('')}
      </div>
    </div>`;
  }

  bindBetPanel(id) {
    const update = () => {
      const maxBet = Math.max(1, Math.min(100, this.credits));
      this.bet = Math.max(1, Math.min(maxBet, this.bet));

      const val = document.getElementById(`${id}-bet-val`);
      if (val) val.textContent = this.bet;

      document.querySelectorAll(`#game-${id} .bet-preset`).forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.preset) === this.bet);
        btn.disabled = Number(btn.dataset.preset) > this.credits;
      });
    };

    document.getElementById(`${id}-bet-down`)?.addEventListener('click', () => {
      SFX.click();
      this.bet = Math.max(1, this.bet - (this.bet > 10 ? 5 : 1));
      update();
    });

    document.getElementById(`${id}-bet-up`)?.addEventListener('click', () => {
      SFX.click();
      this.bet += this.bet >= 10 ? 5 : 1;
      update();
    });

    document.querySelectorAll(`#game-${id} .bet-preset`).forEach(btn => {
      btn.addEventListener('click', () => {
        SFX.click();
        this.bet = Number(btn.dataset.preset);
        update();
      });
    });

    update();
  }

  async debit(amount) {
    if (this.credits < amount) return false;
    this.credits -= amount;
    await this.saveCredits();
    return true;
  }

  async credit(amount) {
    this.credits += amount;
    await this.saveCredits();
  }

  addHistory(game, bet, result, gain) {
    this.history.unshift({ game, bet, result, gain, balance: this.credits, ts: Date.now() });
    if (this.history.length > 30) this.history.pop();
    this.trackMachineRun(this.activeGameId ?? this.resolveGameId(game), result, gain);
    this.renderHistory();
  }

  resolveGameId(game) {
    const normalized = String(game ?? '').toUpperCase();
    if (normalized.includes('WHACK')) return 'wam';
    if (normalized.includes('CRASH')) return 'crash';
    if (normalized.includes('SLOT')) return 'slots';
    if (normalized.includes('NEON')) return 'nr';
    return null;
  }

  trackMachineRun(id, result, net) {
    if (!id) return;
    const stats = { ...emptyMachineStats(), ...this.getMachineStats(id) };
    const numericNet = Number(net) || 0;
    stats.runs += 1;
    if (result === 'win') stats.wins += 1;
    stats.lastResult = result;
    stats.lastNet = numericNet;
    if (stats.bestNet === null || numericNet > stats.bestNet) stats.bestNet = numericNet;
    this.machineStats[id] = stats;
    this.saveMachineStats();
    this.updateMachineStatCard(id);
  }

  updateMachineStatCard(id) {
    const stats = this.getMachineStats(id);
    const runs = document.getElementById(`stat-${id}-runs`);
    const best = document.getElementById(`stat-${id}-best`);
    const last = document.getElementById(`stat-${id}-last`);
    if (runs) runs.textContent = this.format(stats.runs);
    if (best) best.textContent = this.formatNet(stats.bestNet);
    if (last) last.textContent = this.formatNet(stats.lastNet);
  }

  renderHistory() {
    const body = document.getElementById('history-body');
    if (!body) return;

    if (!this.history.length) {
      body.innerHTML = '<div class="history-empty">Aucune partie jouée en Star Tokens</div>';
      return;
    }

    body.innerHTML = this.history.map(h => {
      const cls = h.result === 'win' ? 'win' : h.result === 'lose' ? 'lose' : 'push';
      const gain = h.gain > 0 ? `+${h.gain}` : `${h.gain}`;
      return `<div class="history-row ${cls}">
        <span>${h.game}</span>
        <span class="history-result">${h.result.toUpperCase()}</span>
        <span>${h.bet} ${STAR_TOKEN_SYMBOL}</span>
        <span class="history-gain">${gain} ${STAR_TOKEN_SYMBOL}</span>
        <span>${this.formatWithUnit(h.balance)}</span>
      </div>`;
    }).join('');
  }

  updateCreditsDisplay() {
    const el = document.getElementById('sb-credits');
    if (el) el.textContent = this.formatWithUnit(this.credits);
  }

  mountNeonRacer() {
    const game = document.getElementById('game-nr');
    if (!game) return;

    game.innerHTML = '<div id="nr-mount"></div>';

    this.nrResult = event => {
      const { bet = 50, result = 'push', net = 0 } = event.detail ?? {};
      this.addHistory('NEON', bet, result, net);
      this.updateCreditsDisplay();
    };

    this.nrBack = () => this.backToLobby();

    document.addEventListener('neon-racer:result', this.nrResult);
    document.addEventListener('neon-racer:back', this.nrBack);

    this.activeGame = new NeonRacer('nr-mount', this.userId, this.credits, async newCredits => {
      this.credits = newCredits;
      this.updateCreditsDisplay();
      await this.saveCredits();
    });

    this.activeGame.mount();
  }

  cleanupNeonRacer() {
    if (this.nrResult) {
      document.removeEventListener('neon-racer:result', this.nrResult);
      this.nrResult = null;
    }

    if (this.nrBack) {
      document.removeEventListener('neon-racer:back', this.nrBack);
      this.nrBack = null;
    }
  }

  format(value) {
    return Number(value ?? 0).toLocaleString('fr-FR');
  }

  formatWithUnit(value) {
    return `${this.format(value)} ${STAR_TOKEN_SYMBOL}`;
  }

  formatNet(value) {
    if (value === null || value === undefined) return '—';
    const numeric = Number(value) || 0;
    return `${numeric > 0 ? '+' : ''}${this.format(numeric)} ${STAR_TOKEN_SYMBOL}`;
  }
}
