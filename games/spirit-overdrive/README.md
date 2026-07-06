# Spirit Overdrive

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
