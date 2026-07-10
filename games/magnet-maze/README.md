# Magnet Maze — versions

Jeu coopératif à deux vues (Agent A voit le labyrinthe, Agent B pilote un
aimant en aveugle). Quatre versions ont été développées en parallèle ;
**seule `magnet-maze-v12` est branchée sur le hub** (`public/games/magnet-maze/`,
slug `magnet-maze`).

## Statut par version

| Version | Réseau | Déployée ? | Différence clé |
|---|---|---|---|
| `magnet-maze-v12/` | Aucun — une seule page, deux `<canvas>` côte à côte (`BroadcastChannel`/localStorage) | ✅ **Oui — c'est la version en prod** | Offline, aucun serveur requis, ouvre `index.html` directement |
| `magnet-maze-v13/` | Serveur WebSocket (`server.js`) pour jouer sur deux PC séparés via LAN | ❌ Non | v12 ne synchronisait pas entre deux machines ; v13 ajoute le relais réseau |
| `magnet-maze-v133/` | Idem v13 | ❌ Non | v1.3.2 — fix des helpers partagés + reconnexion/pause auto |
| `magnet-maze-v134/` | Idem v13 | ❌ Non | Quasi-identique à v133 (seul `admin.js` diffère) — probablement un correctif ponctuel plutôt qu'une vraie nouvelle version |

## Pourquoi v12 et pas v13+ ?

v12 est la seule version **statique** (aucun serveur Node à faire tourner) —
elle correspond au modèle de déploiement du hub (export statique Next.js,
`public/games/<slug>/`). Les versions v13/v133/v134 nécessitent de lancer
`server.js` (WebSocket, dépendance `ws`) en continu à côté du site, ce que
l'hébergement statique actuel ne permet pas. Les brancher demanderait un
petit service Node séparé (ou une réécriture en WebRTC/Supabase Realtime,
comme le reste du hub multijoueur — voir `src/hooks/useRoom.ts`).

`magnet-maze-v133/` et `magnet-maze-v134/` committent leur `node_modules/`
(paquet `ws`) — à nettoyer si l'une de ces versions est reprise un jour.
