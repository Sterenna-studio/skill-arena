# Audio credits (Bioarcade Hub)

This project bundles a **small curated subset** of CC0 audio files to keep the repo light.
All files remain under their original licenses.

## Included packs / sources (curated)

### Button SFX Pack III - Assortment ot Hi - Tech
- Author: **Circlerun**
- Source: https://opengameart.org/content/button-sfx-pack-iii-assortment-ot-hi-tech
- License: **CC0**

Curated files (renamed):
- ui_blip_01.wav, ui_blip_02.wav, ui_blip_03.wav
- ui_success_01.wav, ui_success_02.wav
- ui_error_01.wav, ui_error_02.wav
- pickup_01.wav, pickup_02.wav
- alert_02.wav

### Sci-Fi Sounds
- Author: **Kenney**
- Source: https://opengameart.org/content/sci-fi-sounds
- License: **CC0** (credit optional)

Curated files (renamed):
- alert_01.ogg
- hit_01.ogg
- shoot_01.ogg, shoot_02.ogg
- explosion_01.ogg, explosion_02.ogg
- door_open_01.ogg

### Mechanical Sounds
- Author: **BMacZero** (Brian MacIntosh)
- Source: https://opengameart.org/content/mechanical-sounds
- License: **CC0** (credit optional)

Curated files (renamed):
- mech_clank_01.wav
- mech_rattle_01.wav
- mech_click_01.wav

### 25 CC0 mud sfx
- Author: **rubberduck**
- Source: https://opengameart.org/content/25-cc0-mud-sfx
- License: **CC0**

Curated files (renamed):
- hit_02.ogg
- slime_01.ogg, slime_02.ogg

---

## How the hub uses audio

- Shared API: `AudioBus.play(kind)`
- Global event: `window.dispatchEvent(new CustomEvent("bio:sfx",{detail:{kind:"pickup"}}))`
- Hub-wide volume: `bio:volume` event + slider (stored in localStorage key `bioarcade_audio_v2`)
