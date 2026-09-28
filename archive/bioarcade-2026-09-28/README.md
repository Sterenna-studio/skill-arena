# BioArcade — archive du 28 septembre 2026

Origine : `C:\DEV\toCheck\bioarcade`. Les 71 fichiers sont conservés à
l'identique dans `source/`, avec empreintes SHA-256 dans `manifest.json`.
La source d'origine reste intacte. Aucun jeu actuel de Skill Arena n'est remplacé.

Ce hub expérimental regroupe Tankgame, Sniky Alpha/Beta, Steam Manager et RPG.
Skill Arena possède déjà les jeux `tank-protocol`, `sniky` et
`escape-game-manager` ; une comparaison de contenu retrouve 32 fichiers
identiques, dont des sons. Les 39 autres fichiers restent des variantes
historiques à examiner, pas des nouveautés automatiquement activées.

## Défauts connus conservés

- Le manifeste liste `tankgame`, `sniky-run` et `steam-puzzle`.
- Les dossiers `sniky-run` et `steam-puzzle` n'existent pas : deux liens du hub
  sont donc cassés. Les originaux ne sont pas corrigés pour préserver la provenance.
- Les README anciens ne décrivent pas tous la même version.

Le dossier est hors de `public/` et du catalogue actif. Il ne fait pas partie de
l'export `out/` déployé sur Nitro. Aucun nouveau lien public ou déploiement ajouté.
Pour un examen local, servir `source/bzh_bioarcade_hub_v5_1` avec un serveur
statique. Les modules JS nécessitent HTTP ; le double-clic n'est pas un test fiable.

Validation : SHA-256 des 71 fichiers, syntaxe JS/JSON lors de l'audit et contrôle
des chemins de catalogue. Aucun parcours complet de jeu ni validation audio.
