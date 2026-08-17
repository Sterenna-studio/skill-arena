import { BioSFX } from "./shared/sfx.js";
import { AudioBus } from "./shared/audio.js";
/* Escape Game Manager — Web
   Objectif: porter la logique PyGame en HTML5 canvas, et améliorer l'UX.
   - requestAnimationFrame + deltaTime
   - HUD HTML
   - Modal fin de journée + shop
   - Save/Load localStorage
*/

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// UI refs
const elHint = document.getElementById('hint');
const elDebug = document.getElementById('debug');
const elDay = document.getElementById('hudDay');
const elMoney = document.getElementById('hudMoney');
const elServed = document.getElementById('hudServed');
const elNeeded = document.getElementById('hudNeeded');

const btnPause = document.getElementById('btnPause');
const btnReset = document.getElementById('btnReset');
const btnBuyRoom = document.getElementById('btnBuyRoom');
const btnSave = document.getElementById('btnSave');
const btnLoad = document.getElementById('btnLoad');

const spawnRate = document.getElementById('spawnRate');
const satLoss = document.getElementById('satLoss');

const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalPrimary = document.getElementById('modalPrimary');
const modalSecondary = document.getElementById('modalSecondary');
const shopNote = document.getElementById('shopNote');

// --- Helpers
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const moneyFmt = (n) => `${n.toFixed(2)}€`;

function randChoice(arr){return arr[(Math.random() * arr.length) | 0];}

const objectsList = [
  "Parapluie Inversé", "Boussole Cassée", "Sabre Laser Défectueux",
  "Chapeau Magique", "Machine à Popcorn Volante"
];
const themesList = [
  "Égypte Ancienne", "La Renaissance", "L'Atlantide",
  "Steampunk Victorien", "Futur Cyberpunk"
];
function generateRoomName(){
  return `${randChoice(objectsList)} — ${randChoice(themesList)}`;
}

// --- Game state
const DEFAULTS = {
  w: 960,
  h: 600,
  playerSize: 34,
  baseSpeed: 210, // px/s
  sprintMult: 1.55,
  sprintDrain: 0.22, // per sec
  sprintRegen: 0.16,
  groupSize: 26,
  interactRange: 54,
  basePayment: 50,
  roomDuration: 12, // seconds
  rentEveryDays: 3,
  rent: 50,
};

let running = true;
let paused = false;
let lastT = performance.now();

function makeInitialState(){
  return {
    day: 1,
    money: 100,
    groupsNeeded: 5,
    groupsServed: 0,

    player: {
      x: 150,
      y: 320,
      stamina: 1,
    },

    selectedGroupId: null,
    groups: [], // waiting groups (at accueil)

    rooms: [
      { id: crypto.randomUUID(), name: 'Vide', cls: 'C', x: 640, y: 140, w: 250, h: 60, occupied: false, t: 0, groupId: null },
      { id: crypto.randomUUID(), name: 'Vide', cls: 'C', x: 640, y: 240, w: 250, h: 60, occupied: false, t: 0, groupId: null },
    ],

    // Spawn management
    spawnCooldown: 0,
    spawnDelay: 6.0, // seconds base (controlled by slider)

    // Day flow
    dayEnded: false,
    allowShop: false,
    gameOver: false,

    // Balance
    satLossPerSec: 2,
  };
}

let S = makeInitialState();

// --- Input
const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();

  if (e.key.toLowerCase() === 'p') togglePause();
  if (e.key.toLowerCase() === 'e') interact();

  keys.add(e.key.toLowerCase());
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

btnPause.addEventListener('click', togglePause);
btnReset.addEventListener('click', () => {
  if (confirm('Reset la partie ?')) resetGame();
});

btnBuyRoom.addEventListener('click', () => {
  if (!S.allowShop) return;
  buyRoom();
});

btnSave.addEventListener('click', saveGame);
btnLoad.addEventListener('click', loadGame);

spawnRate.addEventListener('input', () => {
  // Slider 2..20 => delay 12..2
  const v = Number(spawnRate.value);
  S.spawnDelay = clamp(22 - v, 2, 20);
});

satLoss.addEventListener('input', () => {
  S.satLossPerSec = Number(satLoss.value);
});

modalSecondary.addEventListener('click', () => modal.close());

modalPrimary.addEventListener('click', () => {
  // Continue day -> start next day
  if (S.gameOver) {
    resetGame();
    modal.close();
    return;
  }

  // If in shop step, just close and go next day
  modal.close();
  startNextDay();
});

// --- Core mechanics
function spawnGroup(){
  // Spawn at accueil on the left
  const idx = S.groups.length;
  const gx = 170;
  const gy = 120 + idx * 54;
  const group = {
    id: crypto.randomUUID(),
    x: gx,
    y: gy,
    sat: 100,
    clients: 2 + ((Math.random() * 5) | 0), // 2..6
    active: true,
  };
  S.groups.push(group);
}

function getSelectedGroup(){
  return S.groups.find(g => g.id === S.selectedGroupId) || null;
}

function interact(){
  if (S.dayEnded || S.gameOver) return;

  const p = S.player;

  // If no selected group: pick nearest active group
  if (!S.selectedGroupId){
    let best = null;
    let bestD = Infinity;
    for (const g of S.groups){
      if (!g.active) continue;
      const d = dist({x:p.x,y:p.y}, {x:g.x,y:g.y});
      if (d < DEFAULTS.interactRange && d < bestD){
        best = g; bestD = d;
      }
    }
    if (best){
      S.selectedGroupId = best.id;
      best.active = false;
      toast(`Groupe pris en charge (${best.clients} clients). Dépose-le dans une salle libre.`);
    } else {
      toast('Aucun groupe à proximité.');
    }
    return;
  }

  // Else: try to drop into a free room
  const g = getSelectedGroup();
  if (!g){ S.selectedGroupId = null; return; }

  for (const r of S.rooms){
    const d = dist({x:p.x,y:p.y}, {x:r.x + r.w/2, y:r.y + r.h/2});
    if (!r.occupied && d < DEFAULTS.interactRange + 40){
      r.occupied = true;
      r.groupId = g.id;
      r.t = DEFAULTS.roomDuration;
      // Name/cls if empty
      if (r.name === 'Vide') r.name = generateRoomName();
      if (r.cls === 'C') r.cls = randChoice(['C','B','A','S']);

      S.selectedGroupId = null;
      toast(`Groupe installé : ${r.name} (${r.cls})`);
      return;
    }
  }

  toast('Aucune salle libre à proximité.');
}

function update(dt){
  if (paused || S.gameOver) return;

  // Live tuning from sliders (also applied after load)
  S.satLossPerSec = Number(satLoss.value);

  // Movement
  const p = S.player;
  let vx = 0, vy = 0;
  if (keys.has('arrowup') || keys.has('w')) vy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) vy += 1;
  if (keys.has('arrowleft') || keys.has('a')) vx -= 1;
  if (keys.has('arrowright') || keys.has('d')) vx += 1;
  const mag = Math.hypot(vx, vy) || 1;
  vx /= mag; vy /= mag;

  let speed = DEFAULTS.baseSpeed;
  const sprinting = keys.has('shift');
  if (sprinting && p.stamina > 0.02){
    speed *= DEFAULTS.sprintMult;
    p.stamina = clamp(p.stamina - DEFAULTS.sprintDrain * dt, 0, 1);
  } else {
    p.stamina = clamp(p.stamina + DEFAULTS.sprintRegen * dt, 0, 1);
  }

  p.x += vx * speed * dt;
  p.y += vy * speed * dt;

  // Bounds
  p.x = clamp(p.x, 30, DEFAULTS.w - 30);
  p.y = clamp(p.y, 40, DEFAULTS.h - 30);

  // Selected group follows
  const sg = getSelectedGroup();
  if (sg){
    sg.x = p.x - 52;
    sg.y = p.y;
  }

  // Room timers & satisfaction
  for (const r of S.rooms){
    if (!r.occupied) continue;

    r.t -= dt;
    const g = S.groups.find(x => x.id === r.groupId);
    if (g){
      g.sat = clamp(g.sat - S.satLossPerSec * dt, 0, 100);
    }

    if (r.t <= 0){
      // complete
      if (g){
        const gain = DEFAULTS.basePayment * (g.sat / 100);
        S.money += gain;
        S.groupsServed += 1;
        // Remove group from list
        S.groups = S.groups.filter(x => x.id !== g.id);
      }
      r.occupied = false;
      r.groupId = null;
      r.t = 0;
    }
  }

  // Spawn
  S.spawnCooldown -= dt;
  const canSpawn = S.groups.length < S.groupsNeeded;
  if (!S.dayEnded && canSpawn && S.spawnCooldown <= 0){
    spawnGroup();
    S.spawnCooldown = S.spawnDelay;
  }

  // End day
  if (!S.dayEnded && S.groupsServed >= S.groupsNeeded){
    endDay();
  }

  // Hint
  elHint.innerHTML = hintText();
}

function endDay(){
  S.dayEnded = true;
  S.allowShop = true;

  // Rent every N days
  let rentLine = '';
  let rentPaid = 0;
  if (S.day % DEFAULTS.rentEveryDays === 0){
    rentPaid = DEFAULTS.rent;
    S.money -= rentPaid;
    rentLine = `<div style="margin-top:10px">Loyer : <b style="color:#ff6b6b">-${moneyFmt(rentPaid)}</b></div>`;
    if (S.money < 0){
      S.gameOver = true;
    }
  }

  shopNote.textContent = 'Disponible maintenant (fin de journée)';
  btnBuyRoom.disabled = !S.allowShop;

  modalTitle.textContent = S.gameOver ? 'GAME OVER' : `Fin de la journée ${S.day}`;
  modalBody.innerHTML = `
    <div>Argent actuel : <b>${moneyFmt(S.money)}</b></div>
    <div>Groupes servis : <b>${S.groupsServed}/${S.groupsNeeded}</b></div>
    ${rentLine}
    <div style="margin-top:10px">Astuce : achète une salle ou continue direct. (Tu peux aussi sauvegarder.)</div>
  `;

  modalPrimary.textContent = S.gameOver ? 'Recommencer' : 'Continuer (jour suivant)';
  modal.showModal();
}

function startNextDay(){
  // Clear waiting groups
  S.groups.length = 0;
  S.selectedGroupId = null;

  // Increase difficulty
  S.day += 1;
  S.groupsServed = 0;
  S.groupsNeeded += 2;

  S.dayEnded = false;
  S.allowShop = false;
  shopNote.textContent = 'Disponible en fin de journée';
  btnBuyRoom.disabled = true;

  // small pacing
  S.spawnCooldown = 1.0;
}

function buyRoom(){
  const cost = 50;
  if (S.money < cost){
    toast('Pas assez d’argent.');
    return;
  }
  S.money -= cost;

  // Place new room stacked
  const i = S.rooms.length;
  const x = 640;
  const y = 340 + (i-2) * 80;
  const newRoom = {
    id: crypto.randomUUID(),
    name: generateRoomName(),
    cls: randChoice(['C','B','A','S']),
    x, y,
    w: 250,
    h: 60,
    occupied:false,
    t:0,
    groupId:null,
  };
  S.rooms.push(newRoom);
  toast('Nouvelle salle ajoutée.');
}

function resetGame(){
  S = makeInitialState();
  paused = false;
  btnPause.textContent = '⏸ Pause';
  btnBuyRoom.disabled = true;
  shopNote.textContent = 'Disponible en fin de journée';
  toast('Partie réinitialisée.');
}

function togglePause(){
  paused = !paused;
  btnPause.textContent = paused ? '▶ Reprendre' : '⏸ Pause';
}

function hintText(){
  const g = getSelectedGroup();
  const nearbyGroup = nearestActiveGroup();
  const nearbyRoom = nearestFreeRoom();

  let line1 = g
    ? `Tu escortes un groupe (${g.clients} clients). Approche une salle libre puis appuie sur <b>E</b>.`
    : `Approche un groupe à l’accueil puis appuie sur <b>E</b> pour le prendre.`;

  let line2 = '';
  if (!g && nearbyGroup) line2 = `Groupe le plus proche : ~${nearbyGroup.d.toFixed(0)}px.`;
  if (g && nearbyRoom) line2 = `Salle libre la plus proche : ~${nearbyRoom.d.toFixed(0)}px.`;

  return `${line1}<br><span style="color:#9aa4b2">${line2}</span>`;
}

function nearestActiveGroup(){
  const p = S.player;
  let best = null;
  for (const g of S.groups){
    if (!g.active) continue;
    const d = dist(p, g);
    if (!best || d < best.d) best = {g, d};
  }
  return best;
}

function nearestFreeRoom(){
  const p = S.player;
  let best = null;
  for (const r of S.rooms){
    if (r.occupied) continue;
    const center = {x:r.x+r.w/2, y:r.y+r.h/2};
    const d = dist(p, center);
    if (!best || d < best.d) best = {r, d};
  }
  return best;
}

// --- Rendering
function draw(){
  // Clear
  ctx.clearRect(0,0,DEFAULTS.w,DEFAULTS.h);

  // Background
  ctx.fillStyle = '#0b0e14';
  ctx.fillRect(0,0,DEFAULTS.w,DEFAULTS.h);

  // Areas
  drawArea(80, 70, 320, 200, 'QG', '#ff6b6b');
  drawArea(90, 300, 520, 250, 'Accueil / Attente', '#6ea8fe');

  // Rooms zone (right)
  drawArea(620, 70, 320, 480, 'Salles', '#51cf66');

  // Groups (waiting)
  for (const g of S.groups){
    drawGroup(g);
  }

  // Rooms
  for (const r of S.rooms){
    drawRoom(r);
  }

  // Player
  drawPlayer();

  // Overlay stamina
  drawStamina();

  // Debug
  elDebug.textContent = `fps≈${fpsTracker.fps.toFixed(0)} | groups=${S.groups.length} | rooms=${S.rooms.length} | spawnDelay=${S.spawnDelay.toFixed(1)}s | satLoss=${S.satLossPerSec.toFixed(1)}/s`;
}

function drawArea(x,y,w,h,label,stroke){
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.9;
  ctx.strokeRect(x,y,w,h);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = stroke;
  ctx.fillRect(x,y,w,h);
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x,y, w, 22);

  ctx.fillStyle = '#e7eef8';
  ctx.font = '700 12px system-ui';
  ctx.fillText(label, x+8, y+15);
  ctx.restore();
}

function drawPlayer(){
  const p = S.player;
  const s = DEFAULTS.playerSize;
  ctx.save();
  ctx.fillStyle = '#6ea8fe';
  ctx.fillRect(p.x - s/2, p.y - s/2, s, s);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(p.x - s/2, p.y - s/2, s, s);

  // direction marker
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(p.x - 3, p.y - s/2 - 7, 6, 6);
  ctx.restore();
}

function drawStamina(){
  const p = S.player;
  const x = 16, y = 16, w = 160, h = 10;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(x,y,w,h);
  ctx.fillStyle = 'rgba(110,168,254,0.85)';
  ctx.fillRect(x,y,w*p.stamina,h);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.strokeRect(x,y,w,h);
  ctx.fillStyle = 'rgba(231,238,248,0.75)';
  ctx.font = '12px system-ui';
  ctx.fillText('Endurance', x, y + 26);
  ctx.restore();
}

function drawGroup(g){
  const s = DEFAULTS.groupSize;
  ctx.save();
  ctx.fillStyle = g.active ? '#ff6b6b' : '#d94848';
  ctx.fillRect(g.x - s/2, g.y - s/2, s, s);

  // satisfaction bar
  const bw = 36;
  const bh = 6;
  const bx = g.x - bw/2;
  const by = g.y - s/2 - 14;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = g.sat > 66 ? 'rgba(81,207,102,0.9)' : g.sat > 33 ? 'rgba(255,214,102,0.9)' : 'rgba(255,107,107,0.95)';
  ctx.fillRect(bx, by, bw * (g.sat/100), bh);

  ctx.fillStyle = 'rgba(231,238,248,0.85)';
  ctx.font = '12px system-ui';
  ctx.fillText(`${g.clients}`, g.x - 3, g.y + 4);
  ctx.restore();
}

function drawRoom(r){
  ctx.save();
  ctx.fillStyle = r.occupied ? 'rgba(81,207,102,0.26)' : 'rgba(255,255,255,0.06)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = r.occupied ? 'rgba(81,207,102,0.85)' : 'rgba(154,164,178,0.28)';
  ctx.lineWidth = 2;
  ctx.strokeRect(r.x, r.y, r.w, r.h);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(r.x, r.y, r.w, 18);

  ctx.fillStyle = '#e7eef8';
  ctx.font = '700 12px system-ui';
  const name = (r.name || 'Vide').slice(0, 28);
  ctx.fillText(`${name} (${r.cls})`, r.x + 8, r.y + 13);

  if (r.occupied){
    ctx.fillStyle = 'rgba(231,238,248,0.8)';
    ctx.font = '12px system-ui';
    ctx.fillText(`Timer: ${Math.ceil(r.t)}s`, r.x + 8, r.y + 38);
  }
  ctx.restore();
}

// --- HUD update
function syncHUD(){
  elDay.textContent = String(S.day);
  elMoney.textContent = moneyFmt(S.money);
  elServed.textContent = String(S.groupsServed);
  elNeeded.textContent = String(S.groupsNeeded);
}

// --- Toast/hints
let toastT = 0;
let toastMsg = '';
function toast(msg){
  toastMsg = msg;
  toastT = 2.2;
}

function drawToast(dt){
  if (toastT <= 0) return;
  toastT -= dt;
  const alpha = clamp(toastT / 2.2, 0, 1);

  ctx.save();
  ctx.globalAlpha = 0.85 * alpha;
  ctx.fillStyle = 'rgba(18,24,38,0.9)';
  ctx.strokeStyle = 'rgba(36,49,79,0.9)';
  ctx.lineWidth = 1;

  const pad = 10;
  ctx.font = '13px system-ui';
  const metrics = ctx.measureText(toastMsg);
  const w = clamp(metrics.width + pad*2, 220, 560);
  const h = 34;
  const x = (DEFAULTS.w - w) / 2;
  const y = DEFAULTS.h - 56;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e7eef8';
  ctx.fillText(toastMsg, x + pad, y + 22);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// --- Save/Load
const SAVE_KEY = 'escape_game_manager_save_v1';

function saveGame(){
  try{
    const payload = {
      S,
      sliders: {
        spawnRate: Number(spawnRate.value),
        satLoss: Number(satLoss.value),
      }
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    toast('Sauvegarde OK.');
  } catch (e){
    console.error(e);
    toast('Erreur sauvegarde.');
  }
}

function loadGame(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw){ toast('Aucune sauvegarde trouvée.'); return; }
    const payload = JSON.parse(raw);

    // Basic validation
    if (!payload?.S?.player || !Array.isArray(payload?.S?.rooms)){
      toast('Sauvegarde invalide.');
      return;
    }

    S = payload.S;

    if (payload.sliders){
      spawnRate.value = String(payload.sliders.spawnRate ?? spawnRate.value);
      satLoss.value = String(payload.sliders.satLoss ?? satLoss.value);
      // apply
      S.spawnDelay = clamp(22 - Number(spawnRate.value), 2, 20);
      S.satLossPerSec = Number(satLoss.value);
    }

    btnBuyRoom.disabled = !S.allowShop;
    shopNote.textContent = S.allowShop ? 'Disponible maintenant (fin de journée)' : 'Disponible en fin de journée';

    toast('Sauvegarde chargée.');
  } catch (e){
    console.error(e);
    toast('Erreur chargement.');
  }
}

// --- FPS tracker
const fpsTracker = {
  fps: 60,
  _acc: 0,
  _n: 0,
  tick(dt){
    this._acc += dt;
    this._n += 1;
    if (this._acc >= 0.5){
      this.fps = this._n / this._acc;
      this._acc = 0;
      this._n = 0;
    }
  }
};

// --- Main loop
function loop(t){
  if (!running) return;
  const dt = clamp((t - lastT) / 1000, 0, 0.05);
  lastT = t;

  fpsTracker.tick(dt);

  update(dt);
  draw();
  drawToast(dt);
  syncHUD();

  requestAnimationFrame(loop);
}

// Bootstrap
function boot(){
  // ensure canvas internal size matches constants
  canvas.width = DEFAULTS.w;
  canvas.height = DEFAULTS.h;

  // init sliders
  spawnRate.dispatchEvent(new Event('input'));
  satLoss.dispatchEvent(new Event('input'));

  btnBuyRoom.disabled = true;
  toast('Prêt. Va chercher un groupe et appuie sur E.');
  requestAnimationFrame(loop);
}

boot();


// BioArcade SFX (best-effort)
document.querySelectorAll("[data-sfx]").forEach(el=>{
  el.addEventListener("pointerenter", ()=>BioSFX.play("blip"));
});
