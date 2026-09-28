// shared/audio.js
// Hub-wide WebAudio manager (SFX + ambience) with global volume & mute.
// API used across project:
// - AudioBus.getState()
// - AudioBus.setVolume(v 0..1)
// - AudioBus.toggleMute()
// - AudioBus.play(kind)
// - AudioBus.getContext(), getMasterGain(), getAmbienceBus()

import { AUDIO_MANIFEST, resolveKind } from "./audio_manifest.js";

function clamp01(x){ return Math.max(0, Math.min(1, x)); }

const LS_KEY = "bioarcade_audio_v2";

async function fetchArrayBuffer(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.arrayBuffer();
}

export const AudioBus = {
  _ctx: null,
  _masterGain: null,
  _sfxGain: null,
  _ambienceGain: null,
  _buffers: new Map(), // url -> Promise<AudioBuffer>

  state: {
    volume: 0.25,
    muted: false,
  },

  _loadState(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(!raw) return;
      const s = JSON.parse(raw);
      if(s && typeof s.volume === "number") this.state.volume = clamp01(s.volume);
      if(s && typeof s.muted === "boolean") this.state.muted = s.muted;
    }catch(e){}
  },

  _saveState(){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(this.state)); }catch(e){}
  },

  _ensure(){
    if(this._ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return;
    this._ctx = new Ctx();

    this._masterGain = this._ctx.createGain();
    this._sfxGain = this._ctx.createGain();
    this._ambienceGain = this._ctx.createGain();

    this._sfxGain.connect(this._masterGain);
    this._ambienceGain.connect(this._masterGain);
    this._masterGain.connect(this._ctx.destination);

    this._applyGains();

    // resume audio on first user gesture
    const resume = () => {
      try{ this._ctx.resume(); }catch(e){}
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      window.removeEventListener("touchstart", resume);
    };
    window.addEventListener("pointerdown", resume, { once:true, passive:true });
    window.addEventListener("keydown", resume, { once:true, passive:true });
    window.addEventListener("touchstart", resume, { once:true, passive:true });
  },

  _applyGains(){
    if(!this._masterGain) return;
    const g = this.state.muted ? 0 : this.state.volume;
    this._masterGain.gain.value = g;
  },

  getContext(){ this._ensure(); return this._ctx; },
  getMasterGain(){ this._ensure(); return this._masterGain; },
  getAmbienceBus(){ this._ensure(); return this._ambienceGain; },

  getState(){
    this._loadState();
    return { ...this.state };
  },

  setVolume(v){
    this._loadState();
    this.state.volume = clamp01(v);
    this._saveState();
    this._ensure();
    this._applyGains();
    window.dispatchEvent(new CustomEvent("bioarcade:audio"));
    window.dispatchEvent(new CustomEvent("bio:volume", { detail:{ volume:this.state.volume } }));
  },

  setMuted(m){
    this._loadState();
    this.state.muted = !!m;
    this._saveState();
    this._ensure();
    this._applyGains();
    window.dispatchEvent(new CustomEvent("bioarcade:audio"));
    window.dispatchEvent(new CustomEvent("bio:mute", { detail:{ muted:this.state.muted } }));
  },

  toggleMute(){
    this._loadState();
    this.setMuted(!this.state.muted);
  },

  async _getBuffer(url){
    if(!this._buffers.has(url)){
      const p = (async()=>{
        this._ensure();
        const ab = await fetchArrayBuffer(url);
        return await this._ctx.decodeAudioData(ab.slice(0));
      })();
      this._buffers.set(url, p);
    }
    return await this._buffers.get(url);
  },

  async play(kind){
    this._loadState();
    const resolved = resolveKind(kind);
    const urls = AUDIO_MANIFEST.kinds?.[resolved];
    if(!urls || urls.length === 0){
      return false;
    }
    this._ensure();
    const base = AUDIO_MANIFEST.basePath || "";
    const pick = urls[Math.floor(Math.random()*urls.length)];
    const url = base ? `${base}${pick}` : pick;

    try{
      const buf = await this._getBuffer(url);
      const src = this._ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this._sfxGain);
      src.start(0);
      return true;
    }catch(e){
      console.warn("[AudioBus] play failed:", e);
      return false;
    }
  },
};

// init persisted state once
AudioBus._loadState();
