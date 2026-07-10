# 🪬 BZH Chronicles: Nemeton Lockdown

> Roguelite de défense tactique — Vanilla JS / DOM + Canvas

---

> **Statut Skill Arena** — ✅ Branché sur le hub (slug `bzh-nemeton-lockdown`,
> `public/games/bzh-nemeton-lockdown/`). Un dossier dupliqué en trop dans
> `public/` a été nettoyé le 2026-07-11 — voir [`../README.md`](../README.md).

---

## Lore

Les **Nemetons** sont d'anciens sanctuaires de la Bretagne Originelle devenus des ancres de stabilité
dans les Chronicles — des points fixes qui empêchent la Brèche de se propager vers d'autres mondes.

Le **Code** les cible en priorité. En les corrompant, il peut retourner chaque sanctuaire en relais
pour amplifier ses propres signaux dans le multivers.

BZH Power a reçu la mission : tenir le Nemeton suffisamment longtemps pour qu'une fenêtre de fermeture
partielle de la Brèche soit possible. Tu n'as pas à gagner la guerre — juste à survivre assez longtemps.

---

## Gameplay

### Boucle de run (~10-15 min)

```
Choix de site (3 maps 5×5) → Phase POSE (30 sec) → Phase VAGUE → Résolution → Choix d'upgrade
                                     ↑___________________________|  (×N vagues)
                                                                       ↓
                                                                    Fin de run → méta-unlock
```

### Phase POSE

Tu poses jusqu'à **5 modules** sur une grille 5×5 (cellules libres uniquement).
Les **synergies s'allument en temps réel** pendant le drag & drop :
- Modules adjacents avec affinité → bordure dorée + indicateur de bonus actif

### Phase VAGUE

Les ennemis arrivent depuis les bords de la grille et progressent vers le **Cœur Nemeton** (centre).
Tu peux déclencher **2 actions actives** par vague :
- Surcharge d'un module (×2 dégâts, 4 sec, puis cooldown)
- Verrouillage de couloir (bloque un chemin 3 sec)

### Phase Résolution

- Compte des HP du Cœur restants = score de vague
- Choix parmi **3 upgrades** : nouvelle salle, nouveau modificateur passif, ou amélioration d'un module existant
- Après 5 vagues : nouveau site (biome suivant) ou fin de run si le Cœur tombe

### Modificateurs de site (aléatoires)

| Modificateur          | Effet                                                        |
|-----------------------|--------------------------------------------------------------|
| Flux Aphalone         | Les ennemis viennent aussi du centre vers les bords (inversé) |
| Interférence Gwen-Ha  | Les modules ont 15% de chance de rate leur activation         |
| Signal MiniStar       | Les ennemis morts laissent un signal qui booste les suivants  |
| Corruption Active     | Le Cœur Nemeton perd 1 HP/sec passif                          |

---

## Modules (bâtiments posables)

| Module              | Effet                                                     | Tag synergies |
|---------------------|-----------------------------------------------------------|---------------|
| Tourelle Runique    | Tire sur l'ennemi le plus proche, portée 2 cases          | [RUNE]        |
| Chambre Nemeton     | Ralentit tous les ennemis dans un rayon 2                 | [SLOW][RUNE]  |
| Brouilleur MiniStar | Annule les bonus de Signal des ennemis morts              | [TECH]        |
| Mur Organique       | Bloque un couloir, 30 HP, peut être détruit               | [BLOCK]       |
| Piège à Echo        | Se déclenche au passage, AOE, 1× par vague                | [ECHO]        |
| Forge Bretonne      | Booste les dégâts des modules [RUNE] adjacents            | [RUNE][BOOST] |
| Nexus de Drain      | Récupère 1 HP Cœur pour chaque ennemi tué dans un rayon 3 | [TECH][RUNE]  |

### Exemples de synergies actives

```
[FORGE BRETONNE] + [TOURELLE RUNIQUE] adjacente → Tourelle fait +40% dégâts, affichage orange
[CHAMBRE NEMETON] + [PIÈGE À ECHO] dans même rangée → Piège se déclenche sur ennemis déjà ralentis (stun 1 sec)
3× modules [RUNE] sur la grille → Bonus global : "Résonance Nemeton" → tous les [RUNE] ont +15% portée
```

---

## Ennemis

| Ennemi              | Comportement                                          | Contre-mesure naturelle     |
|---------------------|-------------------------------------------------------|-----------------------------|
| Éclat du Code       | Chemin direct vers le Cœur, ignore les murs           | Piège à Echo, AOE           |
| Proxy Corrompu      | Préfère les chemins sans modules [RUNE]               | Brouilleur MiniStar         |
| Chevalier Brisé     | Attaque les murs organiques en priorité               | Forge Bretonne + Tourelle   |
| Nœud Réplicant      | Spawn un Éclat à sa mort                              | Nexus de Drain              |
| Fantôme du Signal   | Invisible sauf à portée d'un module [TECH]            | Brouilleur MiniStar         |

---

## Progression persistante (entre runs)

Les runs débloquent des **Runes Permanentes** : 1 choix parmi 3 à chaque fin de run.

| Rune Permanente            | Effet                                                         |
|----------------------------|---------------------------------------------------------------|
| Mémoire Nemeton            | Commence avec 1 module gratuit posé (aléatoire)               |
| Forge Ancienne             | La Forge Bretonne booste aussi les modules [TECH]             |
| Résilience Originelle      | Le Cœur Nemeton commence avec +5 HP max                       |
| Piège Automatique          | Le Piège à Echo se réarme automatiquement après 8 sec         |
| Signal Brouillé            | Au début de chaque vague, tous les bonus Signal sont annulés  |

---

## Stack technique

- **Langage** : Vanilla JS pur (ES6 modules)
- **Rendu** : DOM (grille CSS) + Canvas overlay pour les animations de combat
- **Persistance** : localStorage (run en cours) + fetch vers API Nitro (méta-progression)
- **Déploiement** : GitHub webhook → Nitro server `nitro.sterenna.fr/bzh/nemeton-lockdown`
- **Cible** : desktop, clavier + souris, drag & drop natif HTML5

---

## Feuille de route

- [x] Structure de projet initialisée
- [ ] Grille 5×5 interactive (drag & drop modules)
- [ ] Rendu des synergies en temps réel
- [ ] Spawner d'ennemis + pathfinding simple (A*)
- [ ] Phase VAGUE avec actions actives (surcharge, verrou)
- [ ] Phase Résolution + 3 choix d'upgrade
- [ ] Juice canvas : explosions, particules, shake
- [ ] Méta-progression localStorage
- [ ] Déploiement Nitro
