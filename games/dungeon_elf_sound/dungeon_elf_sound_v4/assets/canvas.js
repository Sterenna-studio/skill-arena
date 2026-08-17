import { state } from './state.js';
let canvas, ctx, motes = [];
export function setupCanvas() {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  resize();
  motes = Array.from({ length: 110 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 2 + .5, s: Math.random() * .001 + .00035 }));
  window.addEventListener('resize', resize);
  requestAnimationFrame(loop);
}
function resize() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1280, rect.width * ratio);
  canvas.height = Math.max(720, rect.height * ratio);
}
function loop() {
  const w = canvas.width, h = canvas.height;
  const gradient = ctx.createLinearGradient(0,0,0,h);
  gradient.addColorStop(0, '#14081f');
  gradient.addColorStop(1, '#090413');
  ctx.fillStyle = gradient;
  ctx.fillRect(0,0,w,h);
  motes.forEach((m) => {
    m.y += m.s;
    if (m.y > 1) m.y = 0;
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.arc(m.x * w, m.y * h, m.r * (window.devicePixelRatio || 1), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.save();
  ctx.globalAlpha = .18;
  ctx.fillStyle = '#b088ff';
  ctx.beginPath();
  ctx.arc(w * .18, h * .18, h * .14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (state.battle.active && state.battle.enemy) {
    ctx.save();
    ctx.translate(w * .68, h * .48);
    ctx.fillStyle = '#ff7d94';
    ctx.beginPath();
    ctx.arc(0,0,48 * (window.devicePixelRatio || 1),0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#180f28';
    ctx.beginPath();
    ctx.arc(-16 * (window.devicePixelRatio || 1), -10 * (window.devicePixelRatio || 1), 6 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
    ctx.arc(16 * (window.devicePixelRatio || 1), -10 * (window.devicePixelRatio || 1), 6 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  requestAnimationFrame(loop);
}
