import { state } from './state.js';

let audioContext;

function beep(freq = 440, duration = 0.08, type = 'sine', gainValue = 0.03) {
  if (!state.audio.enabled) return;
  audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + duration);
}

export function toggleSound() {
  state.audio.enabled = !state.audio.enabled;
  return state.audio.enabled;
}

export function playChargeSound() { beep(520, 0.03, 'triangle', 0.015); }
export function playHitSound() { beep(230, 0.12, 'sawtooth', 0.04); }
export function playVictorySound() { beep(660, 0.12, 'square', 0.04); setTimeout(() => beep(880, 0.16, 'square', 0.03), 80); }
export function playBuySound() { beep(720, 0.05, 'triangle', 0.025); }
