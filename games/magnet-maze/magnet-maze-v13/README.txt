[Statut Skill Arena] ❌ Non déployée — nécessite un serveur Node
(server.js/WebSocket) que l'hébergement statique du hub ne fait pas
tourner. La v12 (statique) est la version branchée. Détail : ../README.md

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
