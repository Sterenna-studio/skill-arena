export function triggerShake(state, intensity) {
  state.juice.shake = Math.max(state.juice.shake, intensity);
}

export function triggerFlash(state, intensity) {
  state.juice.flash = Math.max(state.juice.flash, intensity);
}

export function spawnParticles(state, x, y, color, count = 6) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 120;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      color,
      radius: 2 + Math.random() * 3,
    });
  }
}

export function updateJuice(state, dt) {
  state.juice.shake = Math.max(0, state.juice.shake - dt * 8);
  state.juice.flash = Math.max(0, state.juice.flash - dt * 6);
  state.particles = state.particles.filter(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.9;
    p.vy *= 0.9;
    p.life -= dt;
    return p.life > 0;
  });
}
