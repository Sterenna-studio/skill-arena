import { AudioBus } from "./audio.js";

let nodes = null;
let currentDA = null;

function stop(){
  if(!nodes) return;
  try{
    for(const n of nodes) n.disconnect();
  }catch(e){}
  nodes = null;
  currentDA = null;
}

function makeNoise(ctx){
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1) * 0.25;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

function ensureAmbienceBus(ctx){
  if(AudioBus.getAmbienceBus && AudioBus.getAmbienceBus()) return AudioBus.getAmbienceBus();
  const amb = ctx.createGain();
  amb.gain.value = 0.0001;
  const master = (AudioBus.getMasterGain && AudioBus.getMasterGain()) || AudioBus._masterGain || ctx.destination;
  amb.connect(master);
  AudioBus._ambienceGain = amb;
  return amb;
}

export function startAmbience(da, level=0.22){
  const ctx = (AudioBus.getContext && AudioBus.getContext()) || AudioBus._ctx;
  if(!ctx) return;
  if(currentDA===da && nodes) return;

  stop();
  currentDA = da;

  const ambGain = ensureAmbienceBus(ctx);
  ambGain.gain.value = level;

  const g = ctx.createGain();
  g.gain.value = 1.0;
  g.connect(ambGain);

  const n = makeNoise(ctx);
  const nF = ctx.createBiquadFilter();
  nF.type = "lowpass";
  nF.frequency.value = (da==="NEOGEO") ? 900 : (da==="BIOPUNK" ? 700 : 1200);
  n.connect(nF); nF.connect(g);
  n.start();

  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.value = (da==="NEOGEO") ? 55 : (da==="BIOPUNK" ? 46 : 62);
  const o1g = ctx.createGain();
  o1g.gain.value = (da==="BIOPUNK") ? 0.14 : 0.11;
  osc1.connect(o1g); o1g.connect(g);
  osc1.start();

  const osc2 = ctx.createOscillator();
  osc2.type = (da==="SYNTHWAVE") ? "triangle" : "sawtooth";
  osc2.frequency.value = (da==="SYNTHWAVE") ? 124 : (da==="NEOGEO" ? 92 : 80);
  const o2g = ctx.createGain();
  o2g.gain.value = (da==="SYNTHWAVE") ? 0.05 : 0.04;

  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = (da==="SYNTHWAVE") ? 0.18 : 0.12;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 0.03;
  lfo.connect(lfoG); lfoG.connect(o2g.gain);

  osc2.connect(o2g); o2g.connect(g);
  lfo.start(); osc2.start();

  nodes = [g, nF, n, osc1, osc2, o1g, o2g, lfo, lfoG, ambGain];
}

export function stopAmbience(){ stop(); }
