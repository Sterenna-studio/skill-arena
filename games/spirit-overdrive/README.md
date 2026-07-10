# Spirit Overdrive

> **Statut Skill Arena** — ✅ Branché sur le hub (slug `spirit-overdrive`,
> `public/games/spirit-overdrive/`). Un dossier dupliqué en trop dans
> `public/` a été nettoyé le 2026-07-11 — voir [`../README.md`](../README.md).

Petit jeu web de course automobile en vanilla HTML/CSS/JS.

## Principe

- Tu as une voiture : **Spirit GT**
- Tu gagnes des crédits et de la réputation en simulant des courses
- Tu dépenses les crédits pour améliorer la voiture
- Les meilleures courses se débloquent avec la réputation

Le jeu reste volontairement simple : pas de loot, pas de Heat, pas de réparation,
pas d'inventaire complexe.

## Lancer le jeu

Ouvre `index.html` dans un navigateur, ou lance :

```bash
python -m http.server 8080
```

Puis ouvre `http://localhost:8080`.

## Structure

```text
spirit-overdrive/
├─ index.html
├─ package.json
├─ src/
│  ├─ main.js
│  ├─ style.css
│  ├─ data/races.js
│  ├─ systems/car.js
│  ├─ systems/raceEngine.js
│  ├─ systems/save.js
│  └─ ui/render.js
└─ docs/
```
