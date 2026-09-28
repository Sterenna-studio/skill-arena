export const AUDIO_MANIFEST = {
  "version": 1,
  "basePath": "assets/audio/",
  "kinds": {
    "ui_blip": [
      "assets/audio/ui_blip_01.wav",
      "assets/audio/ui_blip_02.wav",
      "assets/audio/ui_blip_03.wav"
    ],
    "ui_success": [
      "assets/audio/ui_success_01.wav",
      "assets/audio/ui_success_02.wav"
    ],
    "ui_error": [
      "assets/audio/ui_error_01.wav",
      "assets/audio/ui_error_02.wav"
    ],
    "pickup": [
      "assets/audio/pickup_01.wav",
      "assets/audio/pickup_02.wav"
    ],
    "alert": [
      "assets/audio/alert_01.ogg",
      "assets/audio/alert_02.wav"
    ],
    "hit": [
      "assets/audio/hit_01.ogg",
      "assets/audio/hit_02.ogg"
    ],
    "slime": [
      "assets/audio/slime_01.ogg",
      "assets/audio/slime_02.ogg"
    ],
    "shoot": [
      "assets/audio/shoot_01.ogg",
      "assets/audio/shoot_02.ogg"
    ],
    "explosion": [
      "assets/audio/explosion_01.ogg",
      "assets/audio/explosion_02.ogg"
    ],
    "door_open": [
      "assets/audio/door_open_01.ogg"
    ],
    "mech": [
      "assets/audio/mech_clank_01.wav",
      "assets/audio/mech_rattle_01.wav",
      "assets/audio/mech_click_01.wav"
    ],
    "blip": [
      "assets/audio/ui_blip_01.wav",
      "assets/audio/ui_blip_02.wav",
      "assets/audio/ui_blip_03.wav"
    ],
    "success": [
      "assets/audio/ui_success_01.wav",
      "assets/audio/ui_success_02.wav"
    ],
    "error": [
      "assets/audio/ui_error_01.wav",
      "assets/audio/ui_error_02.wav"
    ]
  },
  "notes": "Curated subset (2-3 files per pack) to keep project light. Use via window.dispatchEvent(new CustomEvent('bio:sfx',{detail:{kind:\"pickup\"}})) or AudioBus.play('pickup').",
  "aliases": {
    "coin": "ui_success",
    "confirm": "ui_success",
    "cancel": "ui_error",
    "hover": "ui_blip"
  }
};


// Resolve SFX kind aliases + provide a stable API for AudioBus.
// Returns a canonical key present in the manifest, or the original kind.
export function resolveKind(kind){
  if(!kind) return kind;
  const k = String(kind);
  const m = AUDIO_MANIFEST;
  // direct hit
  if(m && Object.prototype.hasOwnProperty.call(m, k)) return k;
  // alias table (optional)
  const aliases = (m && m.__aliases) ? m.__aliases : null;
  if(aliases && Object.prototype.hasOwnProperty.call(aliases, k)) {
    const v = aliases[k];
    if(typeof v === "string") return v;
    if(Array.isArray(v) && v.length) return v[0];
  }
  return k;
}
