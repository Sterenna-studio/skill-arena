// Simple client-side market simulator (V0) — no backend.
// Tickers (lore)
const TICKERS = [
  {sym:'STER', name:'Sterenna Group', sector:'Services/Tech'},
  {sym:'ZRN',  name:'Zyra Runics', sector:'Biotech runique'},
  {sym:'SNKY', name:'Sniky Dynamics', sector:'Sécurité'},
  {sym:'ALGX', name:'Aligax Ironworks', sector:'Mécha/Blindage'},
  {sym:'SPRT', name:'Spirit & Spike Logistics', sector:'Transport'},
  {sym:'SORN', name:'Dr. Sorn Narratives', sector:'Médias/Jeux'},
  {sym:'GBLN', name:'Gabilone Wildtech', sector:'Agri‑tech'},
  {sym:'MNTR', name:'Monastery Terra', sector:'Immobilier'},
  {sym:'REDX', name:'Red Dagger Mining', sector:'Minage'},
  {sym:'CHRO', name:'The Chronicle', sector:'Crypto'},
  {sym:'BZHX', name:'Breizh Expanse', sector:'Astro‑extraction'},
  {sym:'HUDN', name:'Houdini Archive', sector:'Archives/Illusions'}
];

const STATE = {
  paused:false,
  admin:false,
  series:{},   // sym -> [{t, p}]
  lastChg:{},  // sym -> %
  events:[],
  selected:'STER'
};

// État du joueur pour la V1 trading (client-only)
// Cash de départ en OR et portefeuille de parts.
const PLAYER = {
  // Solde initial en OR
  cash: 100000,
  // Détention de parts par symbole. Par défaut vide ; certaines positions initiales peuvent être ajoutées ici.
  holdings: {}
};
// Exemple de position de départ : 5 actions STER (facultatif, à ajuster selon préférence)
PLAYER.holdings['STER'] = 5;

const TICK_MS = 30000; // 30s
const POINTS_MAX = 200;
const BASE_PRICE = 100;

// RNG with seed for stable session
let seed = 42;
function rand(){ // LCG
  seed = (seed*1664525 + 1013904223) % 4294967296;
  return seed/4294967296;
}

function nowISO(){ return new Date().toISOString(); }

function gbmStep(p, vola=0.15, drift=0.0, dt=30/86400){
  const z = Math.sqrt(-2*Math.log(rand())) * Math.cos(2*Math.PI*rand()); // N(0,1)
  const step = Math.exp((drift - 0.5*vola*vola)*dt + vola*Math.sqrt(dt)*z);
  return Math.max(0.01, p*step);
}

// Nouveau calcul de prix pour des variations plus fortes et aléatoires.
// La plupart du temps la variation est comprise entre -25 et +25 unités,
// parfois entre -50 et +50, et occasionnellement une hausse importante entre +50 et +95.
function priceStep(p){
  const r = rand();
  let delta;
  if(r < 0.85){
    // Variation principale : -25 à +25
    delta = (rand()*50) - 25;
  } else if(r < 0.97){
    // Variation intermédiaire : -50 à +50
    delta = (rand()*100) - 50;
  } else {
    // Variation rare : forte hausse entre +50 et +95
    delta = 50 + rand()*45;
  }
  let np = p + delta;
  // Empêcher un prix négatif ou nul
  if(np < 0.01) np = 0.01;
  return np;
}

function ensureSeries(){
  for(const t of TICKERS){
    if(!STATE.series[t.sym]){
      const arr = [];
      let p = BASE_PRICE + (rand()-0.5)*10;
      for(let i=0;i<60;i++){
        p = gbmStep(p, 0.12, 0.00, 30/86400);
        arr.push({t:Date.now() - (60-i)*TICK_MS, p});
      }
      STATE.series[t.sym]=arr;
      STATE.lastChg[t.sym]=0;
    }
  }
}

function applyEvent(kind){
  // Push an event to feed + store an active effect for a few ticks
  const ev = { kind, at: nowISO() };
  STATE.events.unshift(ev);
  STATE.events = STATE.events.slice(0,50);
  // Map event to per-symbol temporary drift/vola
  switch(kind){
    case 'CRASH_GLOBAL':
      for(const sym of Object.keys(STATE.series)){
        // apply instant -12% and higher vola for 4 ticks
        let s = STATE.series[sym];
        if(s.length){
          s[s.length-1].p *= 0.88;
          s.push({t:Date.now(), p:s[s.length-1].p});
        }
      }
      break;
    case 'HYPE_SPACE':
      for(const sym of ['BZHX','SPRT']){
        const s = STATE.series[sym]; if(!s) continue;
        s[s.length-1].p *= 1.05; s.push({t:Date.now(), p:s[s.length-1].p});
      }
      break;
    case 'DIVIDENDE':
      // Cosmetic in V0: boost STER
      const st = STATE.series['STER']; if(st){ st[st.length-1].p *= 1.01; st.push({t:Date.now(), p:st[st.length-1].p}); }
      break;
    case 'FUD_CHRO':
      const ch = STATE.series['CHRO']; if(ch){ ch[ch.length-1].p *= 0.90; ch.push({t:Date.now(), p:ch[ch.length-1].p}); }
      break;
    case 'MINING_BOOM':
      const rx = STATE.series['REDX']; if(rx){ rx[rx.length-1].p *= 1.08; rx.push({t:Date.now(), p:rx[rx.length-1].p}); }
      break;
  }
  renderEvents();
  renderList();
  renderChart();
}

function tick(){
  if(STATE.paused) return;
  for(const t of TICKERS){
    const arr = STATE.series[t.sym];
    let last = arr[arr.length-1].p;
    // Nouvelle variation aléatoire avec fortes amplitudes
    const p = priceStep(last);
    arr.push({t:Date.now(), p});
    while(arr.length>POINTS_MAX) arr.shift();
    const p0 = arr[0].p;
    STATE.lastChg[t.sym] = ((p - p0)/p0)*100;
  }
  renderList();
  renderChart();
  // Mettre à jour le panneau trading avec les nouveaux prix
  renderTradePanel();
}

function formatPct(x){
  return (x>=0?'+':'') + x.toFixed(2) + '%';
}
function fmt(x){ return x.toFixed(2); }

function renderList(){
  const q = document.getElementById('search').value.toLowerCase();
  const el = document.getElementById('tickerList');
  el.innerHTML = '';
  for(const t of TICKERS){
    if(q && !t.sym.toLowerCase().includes(q) && !t.name.toLowerCase().includes(q)) continue;
    const arr = STATE.series[t.sym], last = arr[arr.length-1].p;
    const chg = STATE.lastChg[t.sym]||0;
    const item = document.createElement('div');
    item.className='item';
    item.onclick=()=>{ STATE.selected=t.sym; renderChart(); renderInfo(); };
    item.innerHTML = `
      <div>
        <div class="sym">${t.sym}</div>
        <div class="name">${t.name}</div>
      </div>
      <div class="right">
        <div class="price">${fmt(last)}</div>
        <div class="chg ${chg>=0?'up':'down'}">${formatPct(chg)}</div>
      </div>`;
    el.appendChild(item);
  }
}

function renderEvents(){
  const list = document.getElementById('eventFeed');
  list.innerHTML = STATE.events.map(e => `<li><span class="ts">${e.at}</span>${e.kind.replace('_',' ')}</li>`).join('');
}

function renderInfo(){
  const t = TICKERS.find(x=>x.sym===STATE.selected);
  const arr = STATE.series[t.sym];
  const p = arr[arr.length-1].p;
  const chg = STATE.lastChg[t.sym]||0;
  document.getElementById('info').innerHTML = `
    <div><strong>${t.sym}</strong> — ${t.name}</div>
    <div>Secteur : ${t.sector}</div>
    <div>Dernier : <strong>${fmt(p)}</strong> | Variation session : <strong class="${chg>=0?'up':'down'}">${formatPct(chg)}</strong></div>
  `;

  // Mettre à jour le panneau trading lorsque l'on change de sélection
  renderTradePanel();
}

// Affiche le portefeuille, le solde et les boutons d'achat/vente pour le symbole sélectionné.
function renderTradePanel(){
  const tradeEl = document.getElementById('trade');
  if(!tradeEl) return;
  const sym = STATE.selected;
  // Dernier cours du symbole courant
  const series = STATE.series[sym] || [];
  const last = series.length ? series[series.length-1].p : 0;
  // Quantité détenue du symbole
  const qtyHeld = PLAYER.holdings[sym] || 0;
  // Liste des positions détenues (>0) pour affichage du portefeuille
  const holdingsList = Object.entries(PLAYER.holdings)
    .filter(([s,q]) => q > 0)
    .map(([s,q]) => `${s}: ${q}`)
    .join(', ') || '—';
  tradeEl.innerHTML = `
    <div class="portfolio">Solde OR : <strong>${PLAYER.cash.toFixed(2)}</strong></div>
    <div class="portfolio">Positions : <span>${holdingsList}</span></div>
    <div class="trade-inputs">
      <label>Quantité : <input id="qtyInput" type="number" min="1" value="1" style="width:80px"></label>
      <button id="buyBtn">Acheter (${sym})</button>
      <button id="sellBtn">Vendre (${sym})</button>
    </div>
    <div id="tradeMsg" class="trade-msg"></div>
  `;
  // Attacher les handlers après insertion DOM
  document.getElementById('buyBtn').addEventListener('click', handleBuy);
  document.getElementById('sellBtn').addEventListener('click', handleSell);

  // Mettre à jour l'inventaire global du joueur en parallèle
  renderInventoryPanel();
}

// Affiche un message dans la zone tradeMsg, avec style success ou error
function showTradeMsg(msg, isError=false){
  const el = document.getElementById('tradeMsg');
  if(!el) return;
  el.textContent = msg;
  el.classList.remove('error','success');
  el.classList.add(isError ? 'error' : 'success');
}

// Met à jour le panneau inventaire du joueur (solde OR, CHRO et positions)
function renderInventoryPanel(){
  const inv = document.getElementById('inventory');
  if(!inv) return;
  const orBal = PLAYER.cash;
  const chroBal = PLAYER.holdings['CHRO'] || 0;
  const positionsList = Object.entries(PLAYER.holdings)
    .filter(([sym, qty]) => sym !== 'CHRO' && qty > 0)
    .map(([sym, qty]) => `${sym}: ${qty}`)
    .join(', ') || '—';
  inv.innerHTML = `
    <div>OR : <strong>${orBal.toFixed(2)}</strong></div>
    <div>CHRO : <strong>${chroBal.toFixed(2)}</strong></div>
    <div>Positions : <span>${positionsList}</span></div>
  `;
}

// Gestion de l'achat d'actions pour le symbole sélectionné
function handleBuy(){
  const sym = STATE.selected;
  const input = document.getElementById('qtyInput');
  if(!input) return;
  const qty = parseInt(input.value, 10) || 0;
  if(qty <= 0){ showTradeMsg('Quantité invalide', true); return; }
  const series = STATE.series[sym] || [];
  const last = series.length ? series[series.length-1].p : 0;
  const cost = last * qty;
  if(cost > PLAYER.cash){ showTradeMsg('Fonds insuffisants', true); return; }
  // Effectuer la transaction
  PLAYER.cash -= cost;
  PLAYER.holdings[sym] = (PLAYER.holdings[sym] || 0) + qty;
  showTradeMsg(`Achat de ${qty} ${sym} pour ${cost.toFixed(2)}`, false);
  renderTradePanel();
}

// Gestion de la vente d'actions pour le symbole sélectionné
function handleSell(){
  const sym = STATE.selected;
  const input = document.getElementById('qtyInput');
  if(!input) return;
  const qty = parseInt(input.value, 10) || 0;
  if(qty <= 0){ showTradeMsg('Quantité invalide', true); return; }
  const held = PLAYER.holdings[sym] || 0;
  if(qty > held){ showTradeMsg('Quantité trop élevée par rapport à vos parts', true); return; }
  const series = STATE.series[sym] || [];
  const last = series.length ? series[series.length-1].p : 0;
  const revenue = last * qty;
  PLAYER.cash += revenue;
  PLAYER.holdings[sym] = held - qty;
  showTradeMsg(`Vente de ${qty} ${sym} pour ${revenue.toFixed(2)}`, false);
  renderTradePanel();
}

function renderChart(){
  const svg = document.getElementById('chart');
  const w = 800, h = 360, pad=36;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  // clear
  while(svg.firstChild) svg.removeChild(svg.firstChild);

  const t = TICKERS.find(x=>x.sym===STATE.selected);
  document.getElementById('chartTitle').textContent = 'Cours — ' + t.sym + ' • ' + t.name;

  const arr = STATE.series[t.sym];
  const xs = arr.map((_,i)=>i/(arr.length-1));
  const ys = arr.map(p=>p.p);
  const min = Math.min(...ys), max = Math.max(...ys);
  const path = [];
  for(let i=0;i<arr.length;i++){
    const x = pad + xs[i]*(w-2*pad);
    const y = h-pad - (ys[i]-min)/(max-min || 1)*(h-2*pad);
    path.push(i===0?`M${x},${y}`:`L${x},${y}`);
  }
  const grid = document.createElementNS('http://www.w3.org/2000/svg','g');
  for(let i=0;i<5;i++){
    const y = pad + i*(h-2*pad)/4;
    const ln = document.createElementNS('http://www.w3.org/2000/svg','line');
    ln.setAttribute('x1', pad); ln.setAttribute('x2', w-pad);
    ln.setAttribute('y1', y);   ln.setAttribute('y2', y);
    ln.setAttribute('stroke', '#18253a'); ln.setAttribute('stroke-width','1');
    grid.appendChild(ln);
  }
  svg.appendChild(grid);

  const pth = document.createElementNS('http://www.w3.org/2000/svg','path');
  pth.setAttribute('d', path.join(' '));
  pth.setAttribute('fill','none');
  pth.setAttribute('stroke','#8fd1ff');
  pth.setAttribute('stroke-width','2.2');
  svg.appendChild(pth);

  // y-axis labels
  const labels = [min, (min*3+max)/4, (min+max)/2, (min+max*3)/4, max];
  labels.forEach((v,i)=>{
    const y = h-pad - i*(h-2*pad)/4;
    const tx = document.createElementNS('http://www.w3.org/2000/svg','text');
    tx.textContent = v.toFixed(2);
    tx.setAttribute('x', 4); tx.setAttribute('y', y+4);
    tx.setAttribute('fill','#99b3d1'); tx.setAttribute('font-size','10');
    svg.appendChild(tx);
  });

  // legend
  document.getElementById('legend').innerHTML = `
    <span><span class="dot" style="background:#8fd1ff"></span> Prix</span>
    <span>Points: ${arr.length}</span>
  `;
}

function boot(){
  ensureSeries();
  renderList();
  renderEvents();
  renderChart();
  renderInfo();

  // Initialiser le panneau trading (affichage du portefeuille et boutons)
  renderTradePanel();

  // 30s ticks
  setInterval(()=>{ tick(); }, TICK_MS);

  // admin toggle
  const adminToggle = document.getElementById('adminToggle');
  adminToggle.addEventListener('change', ()=>{
    STATE.admin = adminToggle.checked;
    document.getElementById('adminPanel').classList.toggle('hidden', !STATE.admin);
  });

  // admin buttons
  for(const btn of document.querySelectorAll('.admin-grid button')){
    btn.addEventListener('click', ()=>{
      if(!STATE.admin) return;
      applyEvent(btn.dataset.ev);
    });
  }

  document.getElementById('pauseBtn').addEventListener('click', (e)=>{
    STATE.paused = !STATE.paused;
    e.target.classList.toggle('paused', STATE.paused);
    e.target.textContent = STATE.paused ? 'Reprendre marché' : 'Pause marché';
  });

  document.getElementById('search').addEventListener('input', renderList);
}

boot();
