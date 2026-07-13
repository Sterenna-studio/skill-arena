import { ArcadeSFX as SFX } from '../../arcade-sfx.js';
import { sleep, weightedPick } from '../../arcade-utils.js';

const ROWS = 3;
const COLS = 5;
const LINES = [
  { id:'mid', name:'MILIEU', rows:[1,1,1,1,1], mult:1.0, color:'#00ff80' },
  { id:'top', name:'HAUT', rows:[0,0,0,0,0], mult:.55, color:'#60a5fa' },
  { id:'bot', name:'BAS', rows:[2,2,2,2,2], mult:.55, color:'#f97316' },
  { id:'d1', name:'DIAG ↘', rows:[0,0,1,2,2], mult:.75, color:'#f472b6' },
  { id:'d2', name:'DIAG ↗', rows:[2,2,1,0,0], mult:.75, color:'#c084fc' },
];
const SYMBOLS = [
  { id:'coin',   name:'COIN',   emoji:'🪙', weight:34, pay:{3:.35, 4:.9,  5:2.5} },
  { id:'leaf',   name:'LEAF',   emoji:'🍃', weight:26, pay:{3:.45, 4:1.2, 5:4} },
  { id:'spirit', name:'SPIRIT', img:'/shared/images/pixel_pp/pixel_pp_spirit.png', weight:18, pay:{3:.7, 4:2.2, 5:7} },
  { id:'abad',   name:'ABAD',   img:'/shared/images/pixel_pp/pixel_pp_abad.png',   weight:11, pay:{3:1.1, 4:4,   5:14} },
  { id:'cowboy', name:'COWBOY', img:'/shared/images/pixel_pp/pixel_pp_cowboy.png', weight:7,  pay:{3:1.7, 4:7,   5:24} },
  { id:'aligax', name:'ALIGAX', img:'/shared/images/pixel_pp/pixel_pp_aligax.png', weight:3,  pay:{3:3.5, 4:18,  5:70} },
  { id:'sniky',  name:'SNIKY',  img:'/shared/images/pixel_pp/pixel_pp_sniky.png',  weight:3,  pay:{3:3.5, 4:18,  5:70} },
  { id:'star',   name:'STAR',   emoji:'⭐', weight:2, pay:{3:6, 4:35, 5:140} },
];

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

export class SlotMachineGame {
  constructor({ mountId, getBet, debit, credit, addHistory, backToLobby }) {
    this.mountId = mountId;
    this.getBet = getBet;
    this.debit = debit;
    this.credit = credit;
    this.addHistory = addHistory;
    this.backToLobby = backToLobby;
    this.spinning = false;
    this.stats = { spins: 0, wagered: 0, paid: 0 };
  }

  mount() {
    const game = document.getElementById(this.mountId);
    if (!game) return;
    game.innerHTML = `${this.header('COIN', 'REACTOR')}
      <div class="sl-machine coin-reactor">
        <div class="sl-scoreboard">
          <div class="sl-score-block"><span class="sl-score-lbl">GAIN</span><span class="sl-score-val sl-score-gain" id="sl-gain">—</span></div>
          <div class="sl-score-block"><span class="sl-score-lbl">LIGNES</span><span class="sl-score-val sl-score-lines">5</span></div>
          <div class="sl-score-block"><span class="sl-score-lbl">RÈGLE</span><span class="sl-score-val sl-score-rule">3+ gauche → droite</span></div>
        </div>
        <div class="coin-reactor-core">
          <div id="slot-grid" class="slot-grid"></div>
          <div class="coin-drop" id="coin-drop" aria-hidden="true"></div>
        </div>
        <div id="slot-lines" class="slot-lines"></div>
        <div class="slot-paytable" id="slot-paytable">${this.paytable()}</div>
        <div id="slot-breakdown" class="slot-breakdown"></div>
        <div class="sl-msg" id="sl-msg">REACTEUR LOCAL · 5 LIGNES ACTIVES · PAYOUT INCHANGÉ</div>
        <div class="action-row"><button class="action-btn primary" id="sl-spin">🪙 ACTIVER</button></div>
      </div>`;
    document.getElementById('game-back')?.addEventListener('click', () => this.backToLobby());
    document.getElementById('sl-spin')?.addEventListener('click', () => this.spin());
    this.renderGrid(this.randomGrid());
    this.renderLineLegend();
  }

  header(title, accent = '') {
    return `<div class="game-header">
      <button class="game-back-btn" id="game-back">← LOBBY</button>
      <span class="game-title">${title} ${accent ? `<span class="game-title-accent">${accent}</span>` : ''}</span>
    </div>`;
  }

  renderLineLegend(activeIds = []) {
    const wrap = document.getElementById('slot-lines');
    if (!wrap) return;
    wrap.innerHTML = LINES.map(line => `<span class="slot-line-pill${activeIds.includes(line.id) ? ' active' : ''}" style="--line-color:${line.color}">${line.name} ×${line.mult}</span>`).join('');
  }

  renderGrid(grid, wins = []) {
    const root = document.getElementById('slot-grid');
    if (!root) return;
    const winCells = new Set();
    wins.forEach(win => {
      for (let c = 0; c < win.count; c++) winCells.add(`${win.line.rows[c]}-${c}`);
    });
    root.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const sym = grid[r][c];
        const active = winCells.has(`${r}-${c}`);
        const cell = document.createElement('div');
        cell.className = `slot-cell${active ? ' active' : ''}`;
        cell.innerHTML = this.symbolHTML(sym);
        root.appendChild(cell);
      }
    }
  }

  async spin() {
    if (this.spinning) return;
    const bet = this.getBet();
    if (!(await this.debit(bet))) return this.setMsg('CRÉDITS INSUFFISANTS', 'lose');
    this.spinning = true;
    const btn = document.getElementById('sl-spin');
    if (btn) btn.disabled = true;
    document.getElementById('slot-breakdown').textContent = '';
    document.getElementById('sl-gain').textContent = '—';
    document.getElementById('coin-drop').innerHTML = '';
    this.setMsg('REACTEUR EN ROTATION…', 'neutral');

    let grid = this.randomGrid();
    for (let t = 0; t < 20; t++) {
      grid = this.randomGrid();
      this.renderGrid(grid);
      SFX.tick();
      await sleep(48 + t * 5);
    }

    grid = this.randomGrid();
    const { wins, gain } = this.evaluate(grid, bet);
    this.renderGrid(grid, wins);
    this.renderLineLegend(wins.map(w => w.line.id));
    await this.playCoinDrop(gain, wins);

    if (gain > 0) await this.credit(gain);
    const net = gain - bet;
    const status = net > 0 ? 'win' : net < 0 ? 'lose' : 'push';
    document.getElementById('sl-gain').textContent = gain > 0 ? `+${gain}` : '—';
    document.getElementById('slot-breakdown').innerHTML = wins.length
      ? wins.map(w => `<span style="color:${w.line.color}">${w.line.name}</span> · ${w.count}× ${w.symbol.name} · +${w.gain} ST`).join('<br>')
      : 'Aucune ligne gagnante.';
    this.setMsg(wins.length ? `${wins.length} ligne${wins.length > 1 ? 's' : ''} · ${net >= 0 ? '+' : ''}${net} ST` : `PERDU · -${bet} ST`, status);
    this.addHistory('SLOTS', bet, status, net);
    this.stats.spins += 1;
    this.stats.wagered += bet;
    this.stats.paid += gain;
    if (wins.some(w => w.symbol.id === 'star' && w.count >= 5)) SFX.jackpot();
    else status === 'win' ? SFX.win() : SFX.lose();
    this.spinning = false;
    if (btn) btn.disabled = false;
  }

  randomGrid() {
    return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => weightedPick(SYMBOLS)));
  }

  evaluate(grid, bet) {
    const wins = [];
    for (const line of LINES) {
      const first = grid[line.rows[0]][0];
      let count = 1;
      for (let c = 1; c < COLS; c++) {
        const sym = grid[line.rows[c]][c];
        if (sym.id === first.id) count += 1;
        else break;
      }
      if (count >= 3) {
        const rawMult = first.pay[count] ?? 0;
        const gain = Math.max(1, Math.round(bet * rawMult * line.mult));
        wins.push({ line, symbol: first, count, gain });
      }
    }
    return { wins, gain: wins.reduce((sum, win) => sum + win.gain, 0) };
  }

  symbolHTML(sym) {
    const label = `<span class="slot-symbol-label">${sym.name}</span>`;
    if (sym.emoji) return `<span class="slot-symbol-emoji">${sym.emoji}</span>${label}`;
    return `<img src="${sym.img}" alt="${sym.name}" width="42" height="42" loading="lazy" onerror="this.style.opacity=.12">${label}`;
  }

  paytable() {
    return SYMBOLS.map(sym => `<span class="slot-pay-symbol">
      ${sym.emoji ? `<b>${sym.emoji}</b>` : `<img src="${sym.img}" alt="" loading="lazy" onerror="this.style.opacity=.12">`}
      <strong>${sym.name}</strong>
      <em>3:${sym.pay[3]}× · 4:${sym.pay[4]}× · 5:${sym.pay[5]}×</em>
    </span>`).join('');
  }

  async playCoinDrop(gain, wins) {
    const root = document.getElementById('coin-drop');
    if (!root) return;
    root.innerHTML = '';
    const count = gain > 0 ? clamp(wins.length * 4 + Math.ceil(Math.min(gain, 400) / 40), 5, 18) : 7;
    for (let i = 0; i < count; i++) {
      const coin = document.createElement('span');
      coin.className = `coin-particle${gain > 0 ? ' win' : ' lose'}`;
      coin.textContent = gain > 0 ? '🪙' : '·';
      coin.style.setProperty('--coin-x', `${12 + Math.random() * 76}%`);
      coin.style.setProperty('--coin-delay', `${i * 42}ms`);
      coin.style.setProperty('--coin-tilt', `${-30 + Math.random() * 60}deg`);
      root.appendChild(coin);
      if (i % 3 === 0) SFX.tick();
      await sleep(24);
    }
    await sleep(720);
  }

  stop() {
    this.spinning = false;
  }

  setMsg(text, type = '') {
    const node = document.getElementById('sl-msg');
    if (!node) return;
    node.textContent = text;
    node.className = 'sl-msg' + (type ? ` sl-msg--${type}` : '');
  }
}
