# BZH Chronicles — BioArcade Hub (Web) — v1

## Structure
- `index.html` : hub (multi-jeux)
- `shared/` : DA + composants communs
- `games/steam-manager/` : Escape Game Manager (jouable)
- `games/tankgame/` : placeholder (à porter)
- `games/rpg/` : placeholder (à porter)

## Lancer
Le plus simple :
- **Windows** : ouvrir `index.html`
- recommandé : servir avec un mini serveur
  - `python -m http.server 8000`
  - puis ouvrir `http://localhost:8000`

## Notes palette
Les couleurs sont des variables CSS dans `shared/base.css`.
Tu peux les remapper à ta palette stricte en remplaçant les valeurs dans `:root{ ... }`.

## Hub-wide audio + unlocks
- Volume/mute persisted in localStorage (`bioarcade_audio_v1`).
- Unlocks persisted in localStorage (`bioarcade_progress_v1`).
- Clearing **Sniky Beta** unlocks badge `Sniky_BETA_CLEARED`.
- Clearing **Tankgame V1** (wave >= 6) unlocks badge `TANKGAME_V1_CLEARED`.
