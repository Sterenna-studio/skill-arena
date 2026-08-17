import { state } from './state.js';
let context;
function tone(freq = 440, duration = 0.08, type = 'sine', gainLevel = 0.03) {
  if (!state.audio.enabled) return;
  context = context || new (window.AudioContext || window.webkitAudioContext)();
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainLevel;
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start();
  osc.stop(context.currentTime + duration);
}
export function toggleSound() { state.audio.enabled = !state.audio.enabled; return state.audio.enabled; }
export function playCharge() { tone(540, 0.03, 'triangle', 0.015); }
export function playCast() { tone(280, 0.08, 'square', 0.03); }
export function playVictory() { tone(660, 0.12, 'square', 0.04); setTimeout(() => tone(880, 0.14, 'square', 0.03), 90); }
export function playBuy() { tone(760, 0.05, 'triangle', 0.02); }
export function playRest() { tone(480, 0.1, 'sine', 0.02); }
