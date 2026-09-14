'use strict';

// Sons synthétisés (WebAudio) : aucun fichier, aucune connaissance des règles.
window.NecroFX = (() => {
  let ac = null;
  let master = null;
  let muted = false;

  function context() {
    if (muted) return null;
    try {
      if (!ac) {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain();
        master.gain.value = 0.35;
        master.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    } catch {
      return null;
    }
  }

  function tone(freq, { dur = 0.15, type = 'sine', vol = 0.2, at = 0, to = null } = {}) {
    const a = context();
    if (!a) return;
    const t = a.currentTime + at;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  const arpeggio = (notes, opts, gap) => notes.forEach((f, i) => tone(f, { ...opts, at: i * gap }));

  return {
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.35;
    },
    click() { tone(1400, { dur: 0.03, type: 'square', vol: 0.03 }); },
    discovery() { arpeggio([660, 990], { dur: 0.12, type: 'triangle', vol: 0.12 }, 0.08); },
    build() { arpeggio([220, 330], { dur: 0.09, type: 'square', vol: 0.07 }, 0.07); },
    research() { arpeggio([784, 988, 1175], { dur: 0.18, vol: 0.1 }, 0.07); },
    raidWarn() { [0, 0.22, 0.44].forEach(at => tone(110, { dur: 0.16, type: 'sawtooth', vol: 0.12, at, to: 90 })); },
    raidWon() { arpeggio([392, 523, 659], { dur: 0.16, type: 'triangle', vol: 0.12 }, 0.09); },
    raidLost() { arpeggio([330, 262, 196], { dur: 0.22, type: 'sawtooth', vol: 0.1 }, 0.12); },
    season() { [523, 659, 784].forEach(f => tone(f, { dur: 0.9, vol: 0.06 })); },
    victory() { arpeggio([523, 659, 784, 1047], { dur: 0.3, type: 'triangle', vol: 0.12 }, 0.12); },
    collapse() { tone(300, { dur: 1.2, type: 'sawtooth', vol: 0.1, to: 60 }); },
  };
})();
