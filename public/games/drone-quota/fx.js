/**
 * fx.js — couche sensorielle de Drone Quota : son, particules, secousses.
 *
 * Séparée de `game.js` volontairement. Le rendu de la machine est un chantier
 * à part (issue #4) et il doit pouvoir être remplacé sans rouvrir les règles :
 * `game.js` ne connaît que l'API publique ci-dessous, jamais un oscillateur ni
 * un contexte 2D.
 *
 * Tout est synthétisé ou dessiné à la volée — aucun fichier audio, aucune
 * image, le dossier du jeu reste autonome.
 */
window.DQFX = (() => {
  'use strict';

  const MUTE_KEY = 'drone-quota:mute:v1';

  // ── audio ───────────────────────────────────────────────────────────────

  let ctx = null;
  let master = null;
  let humNodes = null;
  let muted = false;

  try {
    muted = window.localStorage.getItem(MUTE_KEY) === '1';
  } catch { muted = false; }

  function audio() {
    if (muted) return null;
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      try {
        ctx = new Ctor();
      } catch {
        return null;
      }
      master = ctx.createGain();
      master.gain.value = 0.9;

      // Un léger compresseur colle les impacts entre eux : sans lui, un combo
      // rapide donne une bouillie de clics qui satur.
      const glue = ctx.createDynamicsCompressor();
      glue.threshold.value = -18;
      glue.knee.value = 22;
      glue.ratio.value = 5;
      glue.attack.value = 0.003;
      glue.release.value = 0.16;

      master.connect(glue);
      glue.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** Chaîne osc → gain → (pan) → master, avec enveloppe percussive. */
  function blip({ freq = 440, type = 'square', gain = 0.16, attack = 0.004, decay = 0.11, pan = 0, sweep = null, delay = 0 }) {
    const c = audio();
    if (!c) return;
    const t0 = c.currentTime + delay;

    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (sweep !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweep), t0 + decay);

    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);

    let tail = env;
    if (pan && c.createStereoPanner) {
      const panner = c.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      env.connect(panner);
      tail = panner;
    }

    osc.connect(env);
    tail.connect(master);
    osc.start(t0);
    osc.stop(t0 + decay + 0.03);
  }

  /** Souffle filtré : sert pour la tôle, la fumée et les tirs. */
  function noise({ gain = 0.12, decay = 0.12, freq = 1400, q = 1, kind = 'bandpass', pan = 0, delay = 0 }) {
    const c = audio();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const frames = Math.max(1, Math.floor(c.sampleRate * (decay + 0.02)));
    const buffer = c.createBuffer(1, frames, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    const src = c.createBufferSource();
    src.buffer = buffer;

    const filter = c.createBiquadFilter();
    filter.type = kind;
    filter.frequency.value = freq;
    filter.Q.value = q;

    const env = c.createGain();
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);

    let tail = env;
    if (pan && c.createStereoPanner) {
      const panner = c.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      env.connect(panner);
      tail = panner;
    }

    src.connect(filter);
    filter.connect(env);
    tail.connect(master);
    src.start(t0);
  }

  const sfx = {
    /** `ratio` = avancement du combo (0 → 1). Le ton monte avec la chaîne. */
    hit(ratio = 0, pan = 0) {
      const freq = 320 + Math.pow(Math.max(0, Math.min(1, ratio)), 0.8) * 560;
      blip({ freq, type: 'square', gain: 0.1, decay: 0.07, sweep: freq * 1.5, pan });
      noise({ gain: 0.05, decay: 0.05, freq: 2600, q: 0.8, pan });
    },
    crit(pan = 0) {
      blip({ freq: 720, type: 'triangle', gain: 0.14, decay: 0.16, sweep: 1500, pan });
      blip({ freq: 1080, type: 'triangle', gain: 0.1, decay: 0.2, sweep: 2100, pan, delay: 0.045 });
      noise({ gain: 0.1, decay: 0.14, freq: 4200, q: 0.6, pan });
    },
    virus(pan = 0) {
      blip({ freq: 180, type: 'sawtooth', gain: 0.2, decay: 0.3, sweep: 48, pan });
      noise({ gain: 0.16, decay: 0.26, freq: 620, q: 0.5, kind: 'lowpass', pan });
    },
    shield(pan = 0) {
      blip({ freq: 880, type: 'sine', gain: 0.12, decay: 0.28, pan });
      blip({ freq: 1320, type: 'sine', gain: 0.07, decay: 0.34, pan, delay: 0.02 });
    },
    bonus(kind) {
      const base = kind === 'coolant' ? [520, 392, 330] : [523, 659, 784, 1047];
      base.forEach((f, i) => blip({ freq: f, type: 'triangle', gain: 0.1, decay: 0.16, delay: i * 0.055 }));
    },
    turret(pan = 0) {
      noise({ gain: 0.11, decay: 0.07, freq: 1900, q: 1.4, pan });
      blip({ freq: 240, type: 'square', gain: 0.06, decay: 0.06, sweep: 120, pan });
    },
    miss(pan = 0) {
      blip({ freq: 150, type: 'sine', gain: 0.07, decay: 0.08, sweep: 90, pan });
    },
    escape() {
      blip({ freq: 300, type: 'sine', gain: 0.05, decay: 0.1, sweep: 190 });
    },
    tick() {
      blip({ freq: 1100, type: 'square', gain: 0.08, decay: 0.05 });
    },
    go() {
      [523, 784, 1047].forEach((f, i) => blip({ freq: f, type: 'square', gain: 0.11, decay: 0.2, delay: i * 0.05 }));
    },
    paid() {
      [392, 523, 659, 880].forEach((f, i) => blip({ freq: f, type: 'triangle', gain: 0.13, decay: 0.26, delay: i * 0.075 }));
      noise({ gain: 0.07, decay: 0.3, freq: 3200, q: 0.5, delay: 0.1 });
    },
    failed() {
      [330, 262, 196, 131].forEach((f, i) => blip({ freq: f, type: 'sawtooth', gain: 0.14, decay: 0.34, delay: i * 0.14 }));
    },
    buy() {
      noise({ gain: 0.12, decay: 0.08, freq: 900, q: 1.2 });
      blip({ freq: 420, type: 'square', gain: 0.1, decay: 0.1, sweep: 640 });
    },
    lowLife() {
      blip({ freq: 660, type: 'square', gain: 0.09, decay: 0.12, sweep: 440 });
      blip({ freq: 660, type: 'square', gain: 0.09, decay: 0.12, sweep: 440, delay: 0.18 });
    },
  };

  /** Ronflement du meuble : la machine est allumée, on l'entend. */
  function hum(on) {
    const c = audio();
    if (!c) {
      humNodes = null;
      return;
    }
    if (on && humNodes) return;

    if (!on) {
      if (!humNodes) return;
      const { gain, oscs } = humNodes;
      gain.gain.cancelScheduledValues(c.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.35);
      oscs.forEach(osc => osc.stop(c.currentTime + 0.4));
      humNodes = null;
      return;
    }

    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, c.currentTime + 0.6);

    const lowpass = c.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 320;

    // Deux fondamentales légèrement désaccordées : le battement lent évite le
    // bourdonnement synthétique parfaitement stable.
    const oscs = [50, 50.7, 101].map((f, i) => {
      const osc = c.createOscillator();
      osc.type = i === 2 ? 'triangle' : 'sawtooth';
      osc.frequency.value = f;
      osc.connect(lowpass);
      osc.start();
      return osc;
    });

    lowpass.connect(gain);
    gain.connect(master);
    humNodes = { gain, oscs };
  }

  function setMuted(value) {
    muted = Boolean(value);
    try {
      window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch { /* navigation privée : le réglage ne survit pas, tant pis */ }
    if (muted) {
      if (humNodes && ctx) {
        humNodes.oscs.forEach(osc => osc.stop());
        humNodes = null;
      }
      if (master) master.gain.value = 0;
    } else if (master) {
      master.gain.value = 0.9;
    }
    return muted;
  }

  // ── particules ──────────────────────────────────────────────────────────

  let canvas = null;
  let c2d = null;
  let host = null;
  let dpr = 1;
  const particles = [];
  const shakes = new Map();
  let raf = null;

  function attach(canvasEl, hostEl) {
    canvas = canvasEl;
    host = hostEl;
    c2d = canvas.getContext('2d');
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
    else window.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas || !host) return;
    const rect = host.getBoundingClientRect();
    // Écran encore masqué : garder la taille précédente plutôt que d'écraser
    // le canvas à 1 px, sinon les premières particules du round dessinent dans
    // le vide en attendant que le ResizeObserver rattrape.
    if (rect.width < 2 || rect.height < 2) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }

  /** Centre d'un élément dans le repère du canvas. */
  function centerOf(el) {
    if (!host || !el) return { x: 0, y: 0, w: 0, h: 0 };
    const a = el.getBoundingClientRect();
    const b = host.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2, w: a.width, h: a.height };
  }

  const PALETTE = {
    hit: ['#8ef7ff', '#35e6ff', '#d8fbff'],
    crit: ['#ffe89a', '#ffbe3c', '#fff6d8'],
    bad: ['#ff8d9c', '#ff4d63', '#ffd0d6'],
    turret: ['#cbb0ff', '#a274ff', '#ece0ff'],
    bonus: ['#9dffd8', '#3cf0a0', '#e0fff2'],
  };

  function push(p) {
    // Plafond dur : sur un combo long, mieux vaut perdre les plus vieilles
    // étincelles que faire tomber la fréquence d'images.
    if (particles.length > 320) particles.splice(0, particles.length - 320);
    particles.push(p);
    start();
  }

  function burst(el, kind = 'hit', power = 1) {
    if (!c2d) return;
    const { x, y, w } = centerOf(el);
    const colors = PALETTE[kind] ?? PALETTE.hit;
    const count = Math.round((kind === 'crit' ? 22 : kind === 'bad' ? 18 : 12) * power);

    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * (kind === 'bad' ? 3.4 : 2.2);
      const speed = (0.9 + Math.random() * 2.6) * (kind === 'crit' ? 1.5 : 1) * power;
      push({
        kind: 'spark',
        x: x + (Math.random() - 0.5) * w * 0.4,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.018 + Math.random() * 0.022,
        size: 1 + Math.random() * (kind === 'crit' ? 2.6 : 1.7),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // Poussière : lente, opaque, elle donne le poids que les étincelles seules
    // ne donnent pas.
    for (let i = 0; i < Math.round(5 * power); i++) {
      push({
        kind: 'dust',
        x: x + (Math.random() - 0.5) * w * 0.7,
        y: y + w * 0.1,
        vx: (Math.random() - 0.5) * 0.7,
        vy: -0.25 - Math.random() * 0.5,
        life: 1,
        decay: 0.012 + Math.random() * 0.01,
        size: 3 + Math.random() * 7,
        color: kind === 'bad' ? 'rgba(255,120,140,0.16)' : 'rgba(190,215,255,0.13)',
      });
    }

    push({ kind: 'ring', x, y, life: 1, decay: 0.055, size: w * 0.28, color: colors[1] });
  }

  /** Traçante d'un flanc vers un port, avec flash de bouche. */
  function tracer(fromEl, toEl, color = '#a274ff') {
    if (!c2d) return;
    const a = centerOf(fromEl);
    const b = centerOf(toEl);
    push({ kind: 'tracer', x: a.x, y: b.y, x2: b.x, y2: b.y, life: 1, decay: 0.12, size: 2.2, color });
    push({ kind: 'ring', x: a.x, y: b.y, life: 1, decay: 0.1, size: 9, color });
  }

  function shake(el, amount = 4) {
    if (!el) return;
    const current = shakes.get(el) ?? 0;
    shakes.set(el, Math.min(14, Math.max(current, amount)));
    start();
  }

  function start() {
    if (raf === null) raf = requestAnimationFrame(frame);
  }

  function frame() {
    raf = null;

    if (c2d) {
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      c2d.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= p.decay;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        draw(p);
        if (p.kind === 'spark') {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.09;
          p.vx *= 0.985;
        } else if (p.kind === 'dust') {
          p.x += p.vx;
          p.y += p.vy;
          p.vy *= 0.97;
          p.size += 0.35;
        }
      }
    }

    for (const [el, amount] of shakes) {
      if (amount < 0.4) {
        el.style.removeProperty('transform');
        shakes.delete(el);
        continue;
      }
      const x = (Math.random() - 0.5) * amount;
      const y = (Math.random() - 0.5) * amount;
      const r = (Math.random() - 0.5) * amount * 0.1;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${r.toFixed(3)}deg)`;
      shakes.set(el, amount * 0.82);
    }

    if (particles.length || shakes.size) start();
  }

  function draw(p) {
    c2d.save();
    c2d.globalAlpha = Math.max(0, Math.min(1, p.life));

    if (p.kind === 'spark') {
      c2d.strokeStyle = p.color;
      c2d.lineWidth = p.size;
      c2d.lineCap = 'round';
      c2d.shadowColor = p.color;
      c2d.shadowBlur = 8;
      c2d.beginPath();
      c2d.moveTo(p.x, p.y);
      c2d.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
      c2d.stroke();
    } else if (p.kind === 'dust') {
      c2d.fillStyle = p.color;
      c2d.beginPath();
      c2d.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c2d.fill();
    } else if (p.kind === 'ring') {
      c2d.strokeStyle = p.color;
      c2d.lineWidth = 2 * p.life;
      c2d.shadowColor = p.color;
      c2d.shadowBlur = 12;
      c2d.beginPath();
      c2d.arc(p.x, p.y, p.size * (1.6 - p.life), 0, Math.PI * 2);
      c2d.stroke();
    } else if (p.kind === 'tracer') {
      const t = 1 - p.life;
      const hx = p.x + (p.x2 - p.x) * Math.min(1, t * 2.4);
      c2d.strokeStyle = p.color;
      c2d.lineWidth = p.size;
      c2d.lineCap = 'round';
      c2d.shadowColor = p.color;
      c2d.shadowBlur = 14;
      c2d.beginPath();
      c2d.moveTo(p.x, p.y);
      c2d.lineTo(hx, p.y2);
      c2d.stroke();
    }

    c2d.restore();
  }

  function clear() {
    particles.length = 0;
    for (const el of shakes.keys()) el.style.removeProperty('transform');
    shakes.clear();
    if (c2d) {
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      c2d.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
  }

  // ── impacts persistants sur la tôle ─────────────────────────────────────

  /** Marque le contour du port : les traces s'accumulent pendant la run. */
  function scar(el, kind = 'hit') {
    const layer = el.querySelector('.scars');
    if (!layer) return;
    if (layer.children.length >= 7) layer.firstElementChild.remove();
    const mark = document.createElement('i');
    mark.className = `scar ${kind}`;
    mark.style.left = `${12 + Math.random() * 76}%`;
    mark.style.top = `${18 + Math.random() * 64}%`;
    mark.style.setProperty('--rot', `${Math.random() * 360}deg`);
    mark.style.setProperty('--scale', (0.7 + Math.random() * 0.8).toFixed(2));
    layer.appendChild(mark);
  }

  function clearScars() {
    document.querySelectorAll('.scars').forEach(layer => { layer.innerHTML = ''; });
  }

  return {
    attach, resize,
    sfx, hum, setMuted, isMuted: () => muted, unlock: () => audio(),
    burst, tracer, shake, clear,
    scar, clearScars,
    centerOf,
  };
})();
