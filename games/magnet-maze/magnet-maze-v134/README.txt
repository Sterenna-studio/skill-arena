[Statut Skill Arena] ❌ Non déployée — quasi-identique à v133 (seul
admin.js diffère) ; nécessite le même serveur Node/WebSocket, non
compatible avec l'hébergement statique du hub. La v12 (statique) est la
version branchée. Committe aussi node_modules/ (paquet ws, ~192Ko) — à
nettoyer si cette version est reprise. Détail : ../README.md

Magnet Maze v1.3.2 — Fix shared helpers + fix server + reconnexion/pause

Magnet Maze v1.3.1 — Auto-pause jusqu’à reconnexion (LAN)

Magnet Maze v1.3 (LAN)

Pourquoi ça bloque en "sync" sur un autre PC ?
- v1.2 utilisait BroadcastChannel/localStorage : OK sur la même machine, PAS entre deux PCs.
- v1.3 ajoute un serveur WebSocket (server.js) qui relaie l'état.

Run:
- start.bat (Windows) ou:
  npm install
  npm start

Ouvrir:
- Lobby: http://<host>:8000/
- Admin: http://<host>:8000/admin.html
