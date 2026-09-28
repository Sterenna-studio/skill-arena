# Escape Game Manager — Web (V1)

Portage du prototype PyGame vers une version web (HTML5 Canvas) avec quelques améliorations côté UX.

## Lancer en local

Option simple :
- Double-clique `index.html`.

Option recommandée (évite certains blocages navigateur) :

```bash
python -m http.server 8000
```
Puis ouvre `http://localhost:8000`.

## Contrôles
- WASD / Flèches : déplacer l’agent
- E : prendre un groupe (à l’accueil) / déposer dans une salle libre
- Shift : sprint (endurance)
- P : pause

## Fonctionnalités
- Spawn de groupes au fil du temps
- Satisfaction qui baisse pendant une session (impacte le paiement)
- Salles avec timer et libération automatique
- Fin de journée quand objectif atteint (+ loyer tous les 3 jours)
- Boutique : acheter une salle (50€) en fin de journée
- Sliders live : vitesse spawn & perte satisfaction (équilibrage)
- Save/Load via `localStorage`

## Prochaines améliorations (idées)
- Pathfinding / file d’attente plus réaliste
- Différencier les classes de salles (durée, paiement, difficulté)
- Événements (pannes, VIP, retards) + objectifs journaliers
- UI “planning” (calendrier) et stats long terme
- Mode mobile + joystick virtuel
