const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const proteinLabel = document.getElementById('protein-label');
const infectionLabel = document.getElementById('infection-label');
const proteinBar = document.getElementById('protein-bar');
const infectionBar = document.getElementById('infection-bar');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlay-text');
const restartButton = document.getElementById('restart');

const keys = {};
const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
addEventListener('keydown', e => {
  keys[e.key] = true;
  // Les flèches feraient défiler la page pendant qu'on joue.
  if (SCROLL_KEYS.includes(e.key)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.key] = false; });
// Une touche relâchée hors de la fenêtre resterait enfoncée.
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// Tactile et souris : l'abeille suit le doigt tant qu'il reste posé.
let pointer = null;
function toCanvas(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * canvas.width / rect.width,
    y: (e.clientY - rect.top) * canvas.height / rect.height,
  };
}
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  pointer = toCanvas(e);
});
canvas.addEventListener('pointermove', e => { if (pointer) pointer = toCanvas(e); });
['pointerup', 'pointercancel'].forEach(type => canvas.addEventListener(type, () => { pointer = null; }));

const GAME_STATE = {
  RUNNING: 'running',
  GAME_OVER: 'game_over',
};

let state = GAME_STATE.RUNNING;

const bee = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  r: 10,
  speed: 140,
};

const proteinTarget = 120;
const infectionMax = 100;
let protein = 0;
let infection = 0;
let time = 0;

const patches = [];
const microbes = [];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function spawnPatch() {
  const margin = 60;
  patches.push({
    x: rand(margin, canvas.width - margin),
    y: rand(margin, canvas.height - margin),
    r: rand(10, 16),
    value: rand(8, 18),
  });
}

function spawnMicrobe() {
  const margin = 60;
  const center = { x: canvas.width / 2, y: canvas.height / 2 };
  let microbe;
  // Jamais sur le point de départ : l'abeille s'infecterait avant d'avoir bougé.
  do {
    microbe = {
      x: rand(margin, canvas.width - margin),
      y: rand(margin, canvas.height - margin),
      r: rand(14, 22),
      rate: rand(12, 24),
    };
  } while (distance(microbe, center) < microbe.r + bee.r + 40);
  microbes.push(microbe);
}

function resetGame() {
  state = GAME_STATE.RUNNING;
  bee.x = canvas.width / 2;
  bee.y = canvas.height / 2;
  protein = 0;
  infection = 0;
  time = 0;
  patches.length = 0;
  microbes.length = 0;

  for (let i = 0; i < 9; i++) spawnPatch();
  for (let i = 0; i < 5; i++) spawnMicrobe();

  overlay.hidden = true;
}

resetGame();

restartButton.addEventListener('click', () => {
  resetGame();
});

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function update(dt) {
  if (state !== GAME_STATE.RUNNING) return;

  time += dt;

  if (keys['ArrowUp'] || keys['z'] || keys['Z']) bee.y -= bee.speed * dt;
  if (keys['ArrowDown'] || keys['s'] || keys['S']) bee.y += bee.speed * dt;
  if (keys['ArrowLeft'] || keys['q'] || keys['Q']) bee.x -= bee.speed * dt;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) bee.x += bee.speed * dt;

  if (pointer) {
    const dx = pointer.x - bee.x;
    const dy = pointer.y - bee.y;
    const d = Math.hypot(dx, dy);
    if (d > 2) {
      const step = Math.min(d, bee.speed * dt);
      bee.x += (dx / d) * step;
      bee.y += (dy / d) * step;
    }
  }

  bee.x = Math.max(bee.r, Math.min(canvas.width - bee.r, bee.x));
  bee.y = Math.max(bee.r, Math.min(canvas.height - bee.r, bee.y));

  // Chaque zone récoltée en fait apparaître une autre : les 9 zones de départ
  // valent en moyenne 117 pour un objectif de 120, et sans renouvellement la
  // majorité des parties ne pouvaient plus se terminer.
  for (let i = patches.length - 1; i >= 0; i--) {
    const p = patches[i];
    if (distance(bee, p) < bee.r + p.r) {
      patches.splice(i, 1);
      protein += p.value;
      spawnPatch();
    }
  }

  microbes.forEach(m => {
    if (distance(bee, m) < bee.r + m.r) {
      infection += m.rate * dt;
    }
  });

  protein = Math.min(protein, proteinTarget * 1.5);
  infection = Math.min(infection, infectionMax * 1.5);

  proteinLabel.textContent = `${protein.toFixed(0)} / ${proteinTarget}`;
  infectionLabel.textContent = `${Math.round((infection / infectionMax) * 100)}%`;

  proteinBar.style.width = `${Math.min(100, (protein / proteinTarget) * 100)}%`;
  infectionBar.style.width = `${Math.min(100, (infection / infectionMax) * 100)}%`;

  if (protein >= proteinTarget && infection < infectionMax) {
    endRun(true);
  } else if (infection >= infectionMax) {
    endRun(false);
  }
}

function endRun(success) {
  state = GAME_STATE.GAME_OVER;
  overlay.hidden = false;
  if (success) {
    overlayText.textContent = `La colonie reçoit ${protein.toFixed(0)} unités de protéines en ${time.toFixed(1)} s, tout en maintenant l’infection à ${Math.round((infection / infectionMax) * 100)}%.`;
  } else {
    overlayText.textContent = `L’infection a dépassé le seuil critique (${Math.round((infection / infectionMax) * 100)}%). Les microbes des carcasses ont submergé la colonie.`;
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#2a1a14';
  ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);

  ctx.fillStyle = '#5a2f1f';
  ctx.beginPath();
  ctx.ellipse(canvas.width / 2, canvas.height / 2, canvas.width / 3, canvas.height / 4, 0, 0, Math.PI * 2);
  ctx.fill();

  patches.forEach(p => {
    ctx.fillStyle = '#9acd32';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });

  microbes.forEach(m => {
    const gradient = ctx.createRadialGradient(m.x, m.y, m.r * 0.1, m.x, m.y, m.r);
    gradient.addColorStop(0, 'rgba(255, 80, 120, 0.9)');
    gradient.addColorStop(1, 'rgba(120, 0, 30, 0.0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.save();
  ctx.translate(bee.x, bee.y);
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(0, 0, bee.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#222';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-bee.r * 0.6, -bee.r * 0.4);
  ctx.lineTo(bee.r * 0.6, -bee.r * 0.4);
  ctx.moveTo(-bee.r * 0.6, bee.r * 0.2);
  ctx.lineTo(bee.r * 0.6, bee.r * 0.2);
  ctx.stroke();

  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#c8e4ff';
  ctx.beginPath();
  ctx.ellipse(-bee.r * 0.3, -bee.r * 1.2, bee.r * 0.8, bee.r * 0.5, -0.3, 0, Math.PI * 2);
  ctx.ellipse(bee.r * 0.3, -bee.r * 1.2, bee.r * 0.8, bee.r * 0.5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const hint = 'ZQSD, flèches ou glisser : déplacer l’abeille – Collecter les verts, limiter les rouges.';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(12, canvas.height - 28, ctx.measureText(hint).width + 12, 20);
  ctx.fillStyle = '#ddd';
  ctx.fillText(hint, 18, canvas.height - 14);
}

let last = performance.now();
function loop(now) {
  // Plafonné : au retour d'un onglet masqué, un pas énorme téléportait
  // l'abeille et faisait bondir l'infection.
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
