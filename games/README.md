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
| Dungeon Elf | `dungeon_elf_sound/` | `dungeon-elf-sound` | ✅ Oui | Vanilla JS / Canvas 2D / Web Audio | 3 versions sélectionnables (Original/v3/v4), voir plus bas |
| BZH Breach Storm | `bzh-breach-storm/` | `bzh-breach-storm` | ✅ Oui | Vanilla JS / Canvas 2D | Un lien cassé a été corrigé (voir plus bas) |
| BZH Nemeton Lockdown | `bzh-nemeton-lockdown/` | `bzh-nemeton-lockdown` | ✅ Oui | Vanilla JS / DOM + Canvas | RAS |
| Spirit Overdrive | `spirit-overdrive/` | `spirit-overdrive` | ✅ Oui | Vanilla JS / ESM | RAS |
| Gold Garden Pro | `lab_garden/` | `lab-garden` | ✅ Oui | Vanilla JS, 100% localStorage | Ex-Supabase, migré ([voir README](lab_garden/README.md)) |
| Cyber Cellules v3 | `lab_roguelite/` | `lab-roguelite` | ✅ Oui | Vanilla JS / Canvas | RAS |
| Magnet Maze | `magnet-maze/` | `magnet-maze` | ✅ Oui (v12 seulement) | Vanilla JS | 2 versions restantes (v12 + v134), voir [magnet-maze/README.md](magnet-maze/README.md) |
| Escape Game Manager | *(hors repo, voir note)* | `escape-game-manager` | ✅ Oui | Vanilla JS / Canvas 2D | Import direct 2026-08-17, voir plus bas |
| Sniky | *(hors repo, voir note)* | `sniky` | ✅ Oui | Vanilla JS / ESM / Canvas 2D | Import direct 2026-08-17, voir plus bas |
| Tank Protocol | *(hors repo, voir note)* | `tank-protocol` | ✅ Oui | Vanilla JS / ESM / Canvas 2D | Import direct 2026-08-17, voir plus bas |

Tous les jeux de ce dossier sont désormais accessibles depuis la section
« 01 · JEUX COMPLETS » de la home ([src/app/page.tsx](../src/app/page.tsx)).

## Import — 2026-08-17 (BioArcade Hub)

`escape-game-manager`, `sniky` et `tank-protocol` viennent d'un hub externe
(`bzh_bioarcade_hub_v5_1`, projet "BZH Chronicles — BioArcade Hub", hors de ce
repo) qui regroupait plusieurs prototypes derrière un `shared/` commun
(`sfx.js`, `audio.js`, `audio_manifest.js`, `progress.js`, `skins.js`,
`base.css`) référencé en `../../shared/...`. Contrairement aux autres jeux de
ce tableau, il n'y a pas eu d'étape de staging dans `games/` : la curation
s'est faite directement depuis le dossier téléchargé vers `public/games/<slug>/`.

Deux prototypes du hub source n'ont pas été repris : `rpg/` (écran "module en
préparation", aucun gameplay) et `sniky-alpha/` (mini-loop antérieur,
explicitement remplacé par `sniky-beta` — devenu ici `sniky` — d'après son
propre texte in-jeu).

Chaque jeu importé est rendu **autonome** : les 6 fichiers `shared/` utilisés
ont été copiés dans `public/games/<slug>/shared/` (imports réécrits en
`./shared/...`) et les sons dans `public/games/<slug>/assets/audio/`, plutôt
que de pointer vers un `shared/` commun à la racine de `public/`. Ça évite de
reproduire la duplication imbriquée déjà rencontrée avec `bzh-breach-storm`
(voir plus haut) si une prochaine app venait un jour changer sa structure.

Effet de bord utile : dans le hub d'origine, `shared/audio.js` résout ses
fichiers via un chemin relatif (`assets/audio/...`) résolu contre l'URL de la
page — correct pour le hub à la racine, mais cassé pour une page à
`games/<slug>/index.html` (2 niveaux plus bas, sans `assets/` local). Le lien
« ← Hub » de chaque jeu pointe désormais vers `/arena/` (il n'y a plus de hub
BioArcade importé) et le bouton mute de `tank-protocol` (`main.js`, ex-ligne
597) charge `./shared/audio.js` en dynamique au lieu de `../../shared/audio.js`.

## Multi-version — 2026-08-17 (Dungeon Elf)

`dungeon_elf_sound/` a reçu trois versions distinctes en staging
(`dungeon_elf_sound_full/`, `dungeon_elf_sound_v3/`, `dungeon_elf_sound_v4/`) —
pas des itérations d'un même fichier mais trois implémentations différentes
(l'originale, puis une refonte avec système audio dédié en v3, v4 ajoutant
mana/sorts/XP/mode chasse par-dessus v3). Déployées en parallèle plutôt que la
dernière remplaçant les précédentes :

```txt
public/games/dungeon-elf-sound/
├── index.html + assets/   ← v4 (chargée par défaut sur /arena/games/dungeon-elf-sound/)
├── v3/                    ← ex-dungeon_elf_sound_v3
└── legacy/                ← ex-dungeon_elf_sound_full (version originale, "Dungeon Elf")
```

Un `<select>` flottant (`#version-switch`, injecté en haut de chaque `<body>`,
`onchange="location.href=this.value"`) permet de changer de version ; chemins
relatifs entre les 3 dossiers, pas de dépendance à un `shared/` externe.

**Bugs trouvés en vérifiant** : `content.js` (v4), et `battle.js` / `content.js`
/ `shops.js` (v3) contenaient des apostrophes françaises non échappées dans des
chaînes `'...'` (ex. `'Fantôme d'entraînement'`), ce qui cassait le parsing ES
module (`SyntaxError: Unexpected identifier`) et empêchait tout le script de
s'exécuter — silencieux à l'œil, seulement visible dans la console. Corrigé en
alignant sur l'apostrophe typographique (’) déjà utilisée correctement ailleurs
dans ces mêmes fichiers. Les 24 fichiers JS des 3 versions sont depuis passés
au crible avec `node --input-type=module --check < fichier.js` (le seul mode
qui valide vraiment la syntaxe ES module — `node --check` seul ne suffit pas
ici) : plus aucune erreur.

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

## Cleanup — 2026-07-11

- **`games/lab-garden/`** (avec un tiret) ne contenait qu'un reliquat de
  worktree Claude Code (`.claude/worktrees/charming-fermat/`), non suivi par
  git — supprimé.
- **`magnet-maze/magnet-maze-v133/`** et **`magnet-maze-v134/`** committaient
  leur `node_modules/` (paquet `ws`) — retiré du suivi git (`git rm -r
  --cached`), les fichiers restent sur disque (déjà couverts par
  `**/node_modules/` dans `.gitignore`, donc pas re-trackés).

## Nettoyage doublons/anciennes versions — 2026-07-11

Contenu supprimé de `master` après vérification qu'il n'était référencé nulle
part ; récupérable sur la branche `archive/cleanup-2026-07-11` :

- **`magnet-maze/magnet-maze-v13/`** et **`magnet-maze-v133/`** — versions
  intermédiaires dépassées (v133 réécrivait v13 en quasi-totalité ; v134,
  conservée, ne différait de v133 que par un fichier). Voir
  [magnet-maze/README.md](magnet-maze/README.md).
- **`lab_garden/{SUPABASE_SETUP.sql, achievements.json, seed_system.json,
  lab-css-additions.css}`** — reliquats de l'ère Supabase, non référencés
  depuis la migration 100% localStorage.
- **`public/arcade-casino/js/casino-core.js`** et les fichiers qu'il était
  seul à référencer (`js/games/blackjack.js`, `js/games/dice.js`,
  `js/games/roulette.js`, `js/games/slots.js` — un doublon de
  `js/games/slot-machine/slot-machine.js` —, `js/midnight-chase.js`,
  `js/road-runner.js`, `css/road-runner.css`) — ~140 Ko jamais chargés par
  `index.html`, qui utilise `js/star-arcade-core.js` comme point d'entrée
  réel.

## Non traité (à trancher plus tard)

- Chaque jeu importé par merge commit (`bzh-breach-storm`,
  `bzh-nemeton-lockdown`, `spirit-overdrive`) n'a ni `LICENSE` ni fichier de
  crédits — à vérifier si ces assets ont des contraintes de licence avant
  publication.
