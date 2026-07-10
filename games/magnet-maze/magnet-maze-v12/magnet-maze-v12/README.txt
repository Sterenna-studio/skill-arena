Magnet Maze v1.2 — Pages séparées + Admin + Boussole (Agent B)

Changements (demandés)
- Hublots supprimés : Agent B ne voit jamais la bille.
- Cooldown de pulse = 10s (configurable dans Admin).
- 1 pulse sur 5 est visible par Agent A (A voit l’aimant UNIQUEMENT pendant ces pulses visibles).

Pages
- admin.html : simulation + configuration + synchro (source de vérité).
- a.html : Agent A (labyrinthe + bille + sortie).
- b.html : Agent B (aimant + boussole, pas de murs, pas de bille).

Important
- Pour une synchro fiable, lance un petit serveur local :
  Windows : start.bat
  Linux/macOS : start.sh

Ensuite ouvre :
- http://localhost:8000/admin.html
- http://localhost:8000/a.html
- http://localhost:8000/b.html
