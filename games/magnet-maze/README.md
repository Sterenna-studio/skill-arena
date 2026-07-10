# Magnet Maze — versions

Jeu coopératif à deux vues (Agent A voit le labyrinthe, Agent B pilote un
aimant en aveugle). **Seule `magnet-maze-v12` est branchée sur le hub**
(`public/games/magnet-maze/`, slug `magnet-maze`).

## Statut par version

| Version | Réseau | Déployée ? | Différence clé |
|---|---|---|---|
| `magnet-maze-v12/` | Aucun — une seule page, deux `<canvas>` côte à côte (`BroadcastChannel`/localStorage) | ✅ **Oui — c'est la version en prod** | Offline, aucun serveur requis, ouvre `index.html` directement |
| `magnet-maze-v134/` | Serveur WebSocket (`server.js`) pour jouer sur deux PC séparés via LAN | ❌ Non | Auto-pause + reconnexion : diffuse la position de l'aimant à ~10Hz pendant la pause au lieu de tout geler |

## Pourquoi v12 et pas v134 ?

v12 est la seule version **statique** (aucun serveur Node à faire tourner) —
elle correspond au modèle de déploiement du hub (export statique Next.js,
`public/games/<slug>/`). v134 nécessite de lancer `server.js` (WebSocket,
dépendance `ws`) en continu à côté du site, ce que l'hébergement statique
actuel ne permet pas. La brancher demanderait un petit service Node séparé
(ou une réécriture en WebRTC/Supabase Realtime, comme le reste du hub
multijoueur — voir `src/hooks/useRoom.ts`).

## Cleanup — 2026-07-11

`magnet-maze-v13/` et `magnet-maze-v133/` (versions intermédiaires
dépassées — v133 réécrivait v13 en quasi-totalité, et v134 ne différait de
v133 que par un fichier) ont été supprimées. Elles restent récupérables sur
la branche `archive/cleanup-2026-07-11`.
