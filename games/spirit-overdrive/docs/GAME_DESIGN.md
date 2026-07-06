# Game Design — Spirit Overdrive

## Pitch

Spirit Overdrive est un mini-jeu de course simple.

Le joueur possède une voiture, choisit une course, lance une simulation et utilise
les gains pour améliorer la voiture.

## Boucle principale

```text
Voir sa voiture
→ améliorer une stat
→ choisir une course
→ simuler le résultat
→ gagner crédits / réputation
→ recommencer
```

## Stats

```text
Vitesse
Accélération
Tenue de route
Fiabilité
```

## Améliorations

```text
Moteur
Pneus
Turbo
Châssis
```

Chaque amélioration coûte des crédits et monte jusqu'au niveau 5.

## Courses

Chaque course contient :

```text
nom
distance
coût d'entrée
réputation requise
difficulté
stats importantes
récompenses selon la place
```

## Simulation

Le jeu calcule un score avec :

```text
moyenne des stats importantes
bonus/malus de fiabilité
part de hasard
```

Le score donne une place : 1er, 2e, 3e ou 4e.
