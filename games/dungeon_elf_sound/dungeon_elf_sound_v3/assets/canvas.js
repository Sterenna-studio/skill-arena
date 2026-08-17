import { state } from './state.js';

let canvas;
let ctx;
let stars = [];

export function setupCanvas() {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  stars = Array.from({ length: 80 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 2 + 0.5,
    s: Math.random() * 0.0008 + 0.0004
  }));
  window.addEventListener('resize', resizeCanvas);
  requestAnimationFrame(draw);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(960, rect.width * window.devicePixelRatio);
  canvas.height = Math.max(540, rect.height * window.devicePixelRatio);
}

function draw() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, '#12081d');
  gradient.addColorStop(1, '#090413');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  stars.forEach((star) => {
    star.y += star.s;
    if (star.y > 1) star.y = 0;
    ctx.beginPath();
    ctx.fillStyle = 'rgba(244, 238, 254, 0.75)';
    ctx.arc(star.x * w, star.y * h, star.r * window.devicePixelRatio, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#b088ff';
  ctx.beginPath();
  ctx.arc(w * 0.16, h * 0.22, h * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (state.battle.active && state.battle.enemy) {
    ctx.save();
    ctx.translate(w * 0.68, h * 0.48);
    ctx.fillStyle = '#ff8390';
    ctx.beginPath();
    ctx.arc(0, 0, 42 * window.devicePixelRatio, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b102d';
    ctx.beginPath();
    ctx.arc(-14 * window.devicePixelRatio, -10 * window.devicePixelRatio, 5 * window.devicePixelRatio, 0, Math.PI * 2);
    ctx.arc(14 * window.devicePixelRatio, -10 * window.devicePixelRatio, 5 * window.devicePixelRatio, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  requestAnimationFrame(draw);
}
