# Games — zone de staging

Ce dossier est l'**atelier** : chaque sous-dossier est le code source d'un jeu,
avant curation manuelle vers `public/games/<slug>/` (la copie réellement servie
par l'app Next.js, cf. [`../CONTRIBUTING.md`](../CONTRIBUTING.md)). Rien ici
n'est déployé automatiquement — un changement dans `games/` n'apparaît sur le
hub que si quelqu'un recopie les fichiers utiles dans `public/games/<slug>/`
et ajoute une entrée dans `src/lib/games.ts` + `src/app/page.tsx`.

## Audit — 2026-07-11

| Jeu | Dossier source | Slug hub | Branché ? | Stack | Notes |
|---|---|---|---|---|---|
| BZH Breach Storm | `bzh-breach-storm/` | `bzh-breach-storm` | ✅ Oui | Vanilla JS / Canvas 2D | Un lien cassé a été corrigé (voir plus bas) |
| BZH Nemeton Lockdown | `bzh-nemeton-lockdown/` | `bzh-nemeton-lockdown` | ✅ Oui | Vanilla JS / DOM + Canvas | RAS |
| Spirit Overdrive | `spirit-overdrive/` | `spirit-overdrive` | ✅ Oui | Vanilla JS / ESM | RAS |
| Gold Garden Pro | `lab_garden/` | `lab-garden` | ✅ Oui | Vanilla JS, 100% localStorage | Ex-Supabase, migré ([voir README](lab_garden/README.md)) |
| Cyber Cellules v3 | `lab_roguelite/` | `lab-roguelite` | ✅ Oui | Vanilla JS / Canvas | RAS |
| Magnet Maze | `magnet-maze/` | `magnet-maze` | ✅ Oui (v12 seulement) | Vanilla JS | 4 versions en parallèle, voir [magnet-maze/README.md](magnet-maze/README.md) |

Tous les jeux de ce dossier sont désormais accessibles depuis la section
« 01 · JEUX COMPLETS » de la home ([src/app/page.tsx](../src/app/page.tsx)).

## Bug trouvé et corrigé pendant l'audit

`src/lib/games.ts` pointait `bzh-breach-storm` vers
`public/games/bzh-breach-storm/index.html`, qui n'existait pas — le jeu
complet vivait dans un sous-dossier imbriqué
`public/games/bzh-breach-storm/bzh-breach-storm/`, généré par un import en
merge commit qui a doublé l'arborescence. Le lien du catalogue (`games.ts`)
était donc mort ; seule la carte de la home (qui pointait sur le chemin
imbriqué) fonctionnait.

**Correctif appliqué** : le contenu du sous-dossier imbriqué a été remonté à
la racine de `public/games/bzh-breach-storm/`, les doublons et le dossier
`.claude/` (config d'outillage, ne devrait pas être déployé) ont été
supprimés. Le même nettoyage a été fait pour `bzh-nemeton-lockdown` et
`spirit-overdrive`, qui avaient la même duplication imbriquée mais dont la
copie à plat fonctionnait déjà (donc pas de lien cassé, juste du poids mort).
`src/app/page.tsx` a été mis à jour pour pointer vers les chemins à plat.

## Cleanup restant (non traité, à trancher plus tard)

- **`games/lab-garden/`** (avec un tiret, à ne pas confondre avec
  `games/lab_garden/` en underscore) ne contient qu'un reliquat de worktree
  Claude Code (`.claude/worktrees/charming-fermat/`) — non suivi par git,
  probablement une session abandonnée. À supprimer manuellement si confirmé
  inutile.
- **`magnet-maze/magnet-maze-v133/`** et **`magnet-maze-v134/`** committent
  leur `node_modules/` (le paquet `ws`, ~192 Ko chacun) — à retirer du suivi
  git et ajouter à `.gitignore` si ces versions sont conservées.
- Chaque jeu importé par merge commit (`bzh-breach-storm`,
  `bzh-nemeton-lockdown`, `spirit-overdrive`) n'a ni `LICENSE` ni fichier de
  crédits — à vérifier si ces assets ont des contraintes de licence avant
  publication.
