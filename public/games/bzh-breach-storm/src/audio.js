// Audio via Web Audio API — oscillateurs synthétiques, zéro fichier externe

let _ctx = null;

function _getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  return _ctx;
}

function _resume() {
  const c = _getCtx();
  if (c.state === 'suspended') c.resume();
  return c;
}

function _osc(freq, type, duration, gainVal, detune = 0) {
  const c = _resume();
  const g = c.createGain();
  g.gain.setValueAtTime(gainVal, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  o.detune.setValueAtTime(detune, c.currentTime);
  o.connect(g); g.connect(c.destination);
  o.start(); o.stop(c.currentTime + duration);
}

function _noise(duration, gainVal) {
  const c = _resume();
  const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(gainVal, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  src.connect(g); g.connect(c.destination); src.start();
}

const SOUNDS = {
  shoot:       () => { _osc(880, 'square', 0.08, 0.15); _osc(440, 'sawtooth', 0.06, 0.08, -20); },
  hit_enemy:   () => { _noise(0.06, 0.18); _osc(220, 'square', 0.1, 0.1); },
  player_hit:  () => { _noise(0.12, 0.3); _osc(110, 'sawtooth', 0.15, 0.2); },
  enemy_die:   () => { _osc(660, 'square', 0.05, 0.12); _osc(330, 'square', 0.12, 0.1, -30); _noise(0.08, 0.1); },
  dash:        () => { _osc(1200, 'sine', 0.12, 0.18); _osc(600, 'sine', 0.1, 0.08); },
  drop_pickup: () => { _osc(880, 'sine', 0.1, 0.2); _osc(1320, 'sine', 0.15, 0.15); },
  boss_hit:    () => { _noise(0.05, 0.22); _osc(180, 'sawtooth', 0.18, 0.25); },
  boss_phase:  () => { _osc(80, 'sawtooth', 0.4, 0.4); _noise(0.3, 0.2); },
  boss_die:    () => { [80,100,140,200,280].forEach((f,i) => setTimeout(() => { _osc(f,'sawtooth',0.5,0.35); _noise(0.3,0.2); }, i*120)); },
  room_clear:  () => { [523,659,784,1047].forEach((f,i) => setTimeout(() => _osc(f,'sine',0.2,0.18), i*80)); },
  door_pick:   () => { _osc(440, 'sine', 0.08, 0.12); _osc(550, 'sine', 0.12, 0.1); },
  game_over:   () => { [330,260,200,150].forEach((f,i) => setTimeout(() => _osc(f,'sawtooth',0.35,0.25), i*150)); },
};

export function play(id) {
  try { if (SOUNDS[id]) SOUNDS[id](); } catch(e) {}
}

export function initAudio() {
  const unlock = () => { _resume(); document.removeEventListener('keydown', unlock); document.removeEventListener('click', unlock); };
  document.addEventListener('keydown', unlock);
  document.addEventListener('click', unlock);
}
