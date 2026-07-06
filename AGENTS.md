# AGENTS.md — BZH Chronicles: Breach Storm

Ce fichier est destiné aux agents IA (Cursor, Copilot, Claude, GPT) travaillant sur ce projet.
Lis ce fichier en entier avant toute modification.

---

## Contexte du projet

**BZH Chronicles: Breach Storm** est un shooter roguelite 2D top-down en Vanilla JS / Canvas 2D.
Pas de framework. Pas de bundler. Pas de LLM intégré dans le gameplay.
Le jeu tourne sur un canvas 640×640 à 60 FPS cible.

## Règles absolues

1. **Aucun framework JS** (pas de React, Vue, Three.js, Phaser). Canvas 2D natif uniquement.
2. **ES6 modules** : `import/export` standard. Chaque système = un fichier dans `src/`.
3. **Pas de LLM** dans la boucle de jeu. Tout le contenu est hardcodé ou procédural en JS pur.
4. **Séparation stricte** : data dans `data/`, logique dans `src/`, entrée/sortie dans `src/input.js` et `src/renderer.js`.
5. **Pas de mutation globale** : passe l'état `gameState` par référence explicite, ne pas utiliser `window.xxx`.
6. **Performance** : pas d'allocation dans la boucle de jeu. Les objets (balles, ennemis) viennent de pools.

## Architecture attendue

```
src/
  main.js          ← point d'entrée, init canvas, boucle RAF
  gameState.js     ← objet d'état global (run, salle, joueur, ennemis, bullets)
  player.js        ← update/draw joueur, gestion dash, collision
  enemies.js       ← factory + update/draw des entités ennemies
  bullets.js       ← pool de balles, update, collision
  drops.js         ← spawn, collect, application des fragments
  room.js          ← génération d'une salle (obstacles, spawns)
  boss.js          ← FSM des bosses (phases, patterns)
  ui.js            ← HUD, écran de fin de salle, choix de portes
  renderer.js      ← pipeline de rendu (background, entités, effets, UI)
  input.js         ← gestion clavier/souris, état des touches
  juice.js         ← screen shake, flash, particules
  save.js          ← localStorage run + fetch méta-progression
  audio.js         ← sons (oscillateur Web Audio API, pas de fichiers externes)
data/
  agents.json      ← stats des 3 agents BZH Power
  fragments.json   ← liste des power-ups stackables
  enemies.json     ← configs des types d'ennemis
  bosses.json      ← configs des bosses et leurs phases
  passives.json    ← fragments passifs de méta-progression
  rooms.json       ← configs de modificateurs de salles
```

## Conventions de code

- Les entités sont des objets plats : `{ x, y, hp, vx, vy, ... }` — pas de classes.
- La boucle principale est dans `main.js` : `requestAnimationFrame(loop)`.
- `gameState` est importé par tous les modules qui en ont besoin.
- Les effets de juice sont déclenchés via `juice.trigger(type, x, y)`.
- Les sons via `audio.play(id)` — ids définis dans `audio.js`.

## Priorités d'implémentation

1. Noyau canvas + joueur qui se déplace (ZQSD) et tire vers la souris.
2. Un ennemi (Éclat du Code) avec pathfinding simple (ligne droite vers joueur).
3. Collision bullet/ennemi + death + drop.
4. Système de fragments stackables (Ricochet en premier).
5. Juice (screen shake, flash sur hit).
6. Puis seulement : choix de portes, boss, méta-progression.

## Comportement attendu des drops

Les drops sont stackables. Chaque Fragment modifie le comportement de `bullets.js` via des flags :
```js
// gameState.fragments = ['ricochet', 'perforation', 'parasite']
// bullets.js lit ces flags à chaque update de balle
```
Ne jamais recalculer les stats de base — appliquer les effets en cascade à partir des flags actifs.

## Déploiement

- Repo GitHub : `MutenRock/bzh-breach-storm`
- Webhook sur push `main` → Nitro server
- Accessible : `nitro.sterenna.fr/bzh/breach-storm`
- Pas de build step. Les fichiers sont servis statiquement.
