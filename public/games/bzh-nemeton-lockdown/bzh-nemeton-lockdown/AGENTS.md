# AGENTS.md — BZH Chronicles: Nemeton Lockdown

Ce fichier est destiné aux agents IA (Cursor, Copilot, Claude, GPT) travaillant sur ce projet.
Lis ce fichier en entier avant toute modification.

---

## Contexte du projet

**BZH Chronicles: Nemeton Lockdown** est un roguelite de défense tactique en Vanilla JS.
L'interface de grille est en **DOM pur** (CSS Grid 5×5).
Un **canvas overlay** est superposé à la grille pour les effets visuels (animations de combat, particules).
Pas de framework. Pas de LLM. Pas de bundler.

## Règles absolues

1. **Aucun framework JS** (pas de React, Vue, Phaser, PIXI). DOM natif + Canvas pour les effets.
2. **ES6 modules** uniquement. Un système = un fichier dans `src/`.
3. **Pas de LLM** dans la boucle de jeu. Tout le contenu est hardcodé dans `data/`.
4. **La grille est en CSS Grid** : 5×5 cells, chaque cellule est un `<div>` avec data attributes.
5. **L'état est dans `gameState.js`** et n'est jamais stocké dans le DOM (data attributes = affichage seulement).
6. **Le canvas overlay** est positionné `absolute` par-dessus la grille, pointer-events none.

## Architecture attendue

```
src/
  main.js          ← init, orchestration des phases, RAF pour le canvas
  gameState.js     ← état complet (grille, vague, modules posés, synergies, ennemis actifs)
  grid.js          ← rendu DOM de la grille, drag & drop, mise à jour cellules
  modules.js       ← définitions des modules, calcul des synergies, activation/surcharge
  synergies.js     ← détection et affichage des synergies actives (appelé après chaque pose)
  enemies.js       ← factory ennemis, pathfinding A*, update positions
  wave.js          ← spawner de vagues, timer, fin de vague
  actions.js       ← actions actives joueur (surcharge, verrouillage de couloir)
  upgrades.js      ← pool d'upgrades, tirage 3 parmi pool, application
  canvas.js        ← pipeline de rendu canvas (particules, attaques, explosions)
  juice.js         ← screen shake, flash, particules
  ui.js            ← HUD HP Cœur, timer vague, boutons actions actives
  save.js          ← localStorage run + fetch méta-progression Nitro
data/
  modules.json     ← définitions modules (id, label, tags, effet, range, damage)
  enemies.json     ← configs ennemis (id, hp, speed, behavior, loot)
  synergies.json   ← règles de synergies (conditions, bonus, label affiché)
  upgrades.json    ← pool d'upgrades par catégorie (module, passif, amélioration)
  permanents.json  ← runes permanentes de méta-progression
  sites.json       ← configs des 3 sites (layout grille, modificateur actif)
```

## Conventions de code

- La grille est un array 5×5 : `gameState.grid[row][col] = { module: null, blocked: false }`.
- Les modules posés sont dans `gameState.placedModules = [{ id, row, col, level, cooldown }]`.
- Les ennemis actifs sont dans `gameState.enemies = [{ x, y, hp, path, ... }]` — coordonnées en pixels sur le canvas overlay.
- Les synergies actives sont dans `gameState.activeSynergies = Set<string>` — recalculées à chaque pose.
- La phase est dans `gameState.phase` : `'placement' | 'wave' | 'resolution' | 'run_end'`.

## Pathfinding

Utiliser un A* simple sur la grille 5×5.
Les cellules avec `module.tag === 'BLOCK'` et HP > 0 sont des obstacles.
Les Éclats du Code ignorent les obstacles (chemin direct Euclidien).

## Drag & Drop

Utiliser les events HTML5 natifs : `dragstart`, `dragover`, `drop`.
Les modules draggables viennent d'un panel latéral.
À chaque `drop` : appeler `synergies.recalculate(gameState)` et `grid.refresh(gameState)`.

## Priorités d'implémentation

1. Grille DOM 5×5 + drag & drop d'un module (Tourelle Runique en premier).
2. Spawner d'un ennemi (Éclat du Code, chemin direct) + canvas overlay.
3. Logique d'attaque de la Tourelle (cherche ennemi à portée, réduit HP).
4. Mort d'ennemi + particules canvas.
5. Système de synergies (Forge + Tourelle en premier).
6. Phase Résolution + choix d'upgrade.
7. Puis : actions actives, méta-progression, modificateurs de site.

## Déploiement

- Repo GitHub : `MutenRock/bzh-nemeton-lockdown`
- Webhook sur push `main` → Nitro server
- Accessible : `nitro.sterenna.fr/bzh/nemeton-lockdown`
- Pas de build step. Fichiers servis statiquement.
