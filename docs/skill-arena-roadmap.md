# Skill Arena — contexte de travail global

Ce repo devient le point principal de travail pour les modules de jeu Skill Arena.

Repo : `Sterenna-studio/skill-arena`
Branche actuelle : `master`

## Objectif global

Faire de Skill Arena un hub de mini-jeux cohérent avec l'écosystème Nitro / Gwen Ha Star :

- un accueil plus vivant et plus clair ;
- des cartes de jeux plus lisibles ;
- une expérience Arcade plus immersive ;
- des jeux rapides à lancer ;
- une intégration propre avec les Chronicles et le profil utilisateur ;
- une base assez propre pour ajouter ensuite scores, défis, récompenses et classements.

## Zones principales du repo

### Hub Next.js

```txt
src/app/page.tsx
src/app/arcade/page.tsx
src/lib/games.ts
```

Rôle : entrée Skill Arena, liste des jeux, accès aux modules, pages Next.

### Expérience Arcade embarquée

```txt
public/arcade-casino/
```

Rôle : interface Arcade chargée depuis la page `/arena/arcade`.

Fichiers importants :

```txt
public/arcade-casino/index.html
public/arcade-casino/js/star-arcade-core.js
public/arcade-casino/css/casino.css
public/arcade-casino/js/games/
```

## Priorités de rework

### 1. Habillage global Skill Arena

- Donner au hub une vraie identité Skill Arena / Nitro.
- Rendre les jeux disponibles plus identifiables.
- Ajouter des infos utiles : type de jeu, durée, score, difficulté, état alpha/beta.
- Harmoniser le style avec la Star connectée.

### 2. Lobby Arcade

- Rendre le lobby plus dense et plus terminal/cockpit.
- Améliorer les cartes de modules.
- Ajouter un panneau de session : solde, parties jouées, dernier résultat, état de synchronisation.
- Garder les modifications visuelles séparées autant que possible pour éviter de casser les jeux.

### 3. Économie Chronicles

À auditer avant toute grosse modification.

Objectif : éviter les désynchronisations entre solde affiché, historique et profil.

### 4. Scores, défis, récompenses

Pistes futures :

- score local immédiat ;
- score serveur par jeu ;
- défi quotidien Skill Arena ;
- bonus de première partie ;
- leaderboard global ;
- passerelles vers le panneau de récompenses Star.

### 5. Qualité de jeu

Pour chaque mini-jeu :

- règles lisibles avant lancement ;
- feedback clair ;
- sons et animations non agressifs ;
- mobile utilisable ;
- historique de session visible ;
- retour lobby fiable.

## Règles de travail

- Travailler dans `Sterenna-studio/skill-arena` par défaut.
- Ne toucher à `Sterenna-studio/gwen-ha-star-static` que pour les liens d'entrée, cartes hero ou intégrations Star.
- Ne pas modifier les règles de gains sans audit.
- Préférer des patchs séparés : style, UI, logique, données.
- Garder une expérience fonctionnelle même si Supabase est indisponible.

## Prochaine étape recommandée

Commencer par un patch visuel non destructif :

1. améliorer `src/app/page.tsx` ;
2. améliorer `src/app/arcade/page.tsx` ;
3. ajouter une surcouche CSS pour `public/arcade-casino/` ;
4. seulement ensuite revoir la logique de crédits / historique.
