# ⚡ BZH Chronicles: Breach Storm

> Shooter roguelite top-down — Vanilla JS / Canvas 2D

---

> **Statut Skill Arena** — ✅ Branché sur le hub (slug `bzh-breach-storm`,
> `public/games/bzh-breach-storm/`). Un lien cassé dans le catalogue a été
> corrigé le 2026-07-11 (le jeu déployé vivait dans un sous-dossier imbriqué
> en trop) — voir [`../README.md`](../README.md) pour le détail de l'audit.

---

## Lore

La Brèche interdimensionnelle ouverte par le **Code** dans la Bretagne Originelle a déstabilisé les Chronicles.
Des secteurs entiers de réalités arrachées aux mondes reliés — Aphalone, Gwen-Ha, MiniStar — dérivent maintenant
dans des couloirs de guerre instables.

Tu incarnes un agent de **BZH Power** (MutenRock, Sniky, ou Dr. SoRn) envoyé dans ces couloirs pour récupérer
les **Fragments du Code** avant qu'ils ne reconstruisent une entité autonome capable de fermer la Brèche de l'intérieur.

---

## Gameplay

### Boucle de run (~10 min)

```
Choix d'agent → Salle 1 → Drop → Porte → Salle 2 → Drop → Elite → Boss Secteur 1
                                                              ↓
                                                        Secteur 2 (×2)
                                                              ↓
                                                        Boss Final → Fin de run
```

### Contrôles

| Action       | Touche        |
|--------------|---------------|
| Déplacement  | ZQSD          |
| Viser        | Souris        |
| Tir          | Automatique   |
| Dash         | SHIFT         |

### Agents (archétypes de départ)

| Agent      | HP  | Vitesse | Tir de base        | Passif spécial                    |
|------------|-----|---------|--------------------|-----------------------------------|
| MutenRock  | 120 | Moyen   | Rafale 3 balles    | +10% dégâts par fragment collecté |
| Sniky      | 80  | Rapide  | Balle unique rapide| Dash recharge 50% plus vite        |
| Dr. SoRn   | 100 | Lent    | Onde courte AOE    | Les drops tombent 2× plus souvent  |

### Fragments du Code (power-ups stackables)

Les drops **ne se remplacent pas** — ils se superposent et transforment radicalement le comportement du tir.

| Fragment       | Effet                                                        |
|----------------|--------------------------------------------------------------|
| Ricochet       | Les balles rebondissent 1 fois sur les murs                  |
| Perforation    | Les balles traversent les ennemis                            |
| Onde Parasite  | Chaque kill crée une impulsion AOE                           |
| Surcharge      | Tir cadencé ×2 pendant 4 sec après un dash                   |
| Réplication    | Chaque 3e tir duplique la balle                              |
| Virus          | Les ennemis touchés ralentissent et contaminent les voisins  |
| Echo MiniStar  | La dernière balle tirée est répétée 0.3 sec plus tard        |

### Types d'ennemis

| Ennemi              | Comportement                           | Lore                              |
|---------------------|----------------------------------------|-----------------------------------|
| Éclat du Code       | Fonce en ligne droite, kamikaze        | Fragment brut d'anomalie          |
| Proxy Corrompu      | Tire en burst et se repositionne       | Ancienne IA de surveillance       |
| Sentinelle Gwen-Ha  | Orbite autour du joueur, tire en spirale | Gardien biopunk de couloir       |
| Chevalier Brisé     | Lent, lourd, charge après 2 sec        | Héros d'Aphalone passé par la Brèche |
| Echo Signal         | Clone le dernier mouvement du joueur   | Parasite mimétique du Code        |

### Portes (choix de salle)

Chaque fin de salle propose deux portes avec un modificateur visible :

| Modificateur      | Effet gameplay                               |
|-------------------|----------------------------------------------|
| Brouillard Breach | Vision réduite à un cercle autour du joueur  |
| Ricochet Zone     | Tous les projectiles rebondissent            |
| Surpopulation     | +4 ennemis, drop garanti rare                |
| Salle Corrompue   | Les power-ups sont maudits (+effet, -HP max) |
| Signal Fort       | Les ennemis bougent 30% plus vite            |

### Bosses de secteur

| Boss               | Secteur | Mécanique signature                              |
|--------------------|---------|--------------------------------------------------|
| Nœud Primaire      | 1       | Téléporte + envoie des Éclats en étoile           |
| GR4CE Fragment     | 2       | Crée des copies fantômes qui imitent le joueur    |
| Le Code Incomplet  | 3 (final)| Change de phase à 50% HP, absorbe les Fragments du sol |

### Progression persistante (entre runs)

- Chaque run complété débloque **1 Fragment Passif** permanent parmi 3 choix
- Les Fragments Passifs ne modifient pas les stats brutes — ils changent les règles :
  - *"Les Éclats du Code ont 20% de chance de lâcher un Fragment supplémentaire"*
  - *"Après chaque boss tué, régénère 15 HP"*
  - *"Chaque ricochet compte comme un hit supplémentaire"*

---

## Stack technique

- **Langage** : Vanilla JS pur (ES6 modules)
- **Rendu** : Canvas 2D natif
- **Persistance** : localStorage (run en cours) + fetch vers API Nitro (méta-progression)
- **Déploiement** : GitHub webhook → Nitro server `nitro.sterenna.fr/bzh/breach-storm`
- **Cible** : 60 FPS, canvas 640×640, mobile non ciblé (clavier/souris)

---

## Feuille de route

- [x] Structure de projet initialisée
- [ ] Noyau : canvas, boucle 60FPS, vaisseau ZQSD
- [ ] Système de tir + aiming souris
- [ ] Ennemi de base (Éclat du Code)
- [ ] Système de drops stackables
- [ ] Choix de portes
- [ ] Boss secteur 1 (Nœud Primaire)
- [ ] Juice : screen shake, particules, flash
- [ ] Méta-progression localStorage
- [ ] Déploiement Nitro
