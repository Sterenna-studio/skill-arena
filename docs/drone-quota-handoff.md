# Drone Quota — dossier de reprise

Tout ce qu'il faut pour reprendre le jeu sans contexte préalable : ce qu'il
est, comment le lancer, ce sur quoi il repose, ce qui est vérifié, ce qui ne
l'est pas, et par où continuer.

Écrit le 2026-09-09, à jour du commit `2c3538f`.

---

## 1. Ce que c'est

Un whack-a-mole roguelite autonome, servi en statique dans le catalogue Skill
Arena. Le joueur frappe ce qui sort de douze ports pendant un round chronométré
et doit avoir assez en banque à la fin pour régler un **palier**. Le palier
monte géométriquement. Entre deux manches, la banque achète des nœuds d'un
arbre de compétences **permanent** — et c'est le dilemme central : la banque
paie la facture *et* achète les nœuds, donc investir, c'est reculer sur le
palier suivant.

- En ligne : <https://nitro.sterenna.fr/arena/games/drone-quota/>
- Dépôt : `Sterenna-studio/skill-arena`, branche `master`
- Dossier : `public/games/drone-quota/`

### Pourquoi ce jeu existe

Le whack-a-mole n'existait que comme borne de 30 secondes dans
`public/arcade-casino/`, sans progression et derrière l'authentification Gwen
Ha Star. Il a été sorti en jeu complet et autonome. **La borne DRONE BASH du
lobby arcade existe toujours et n'a pas été touchée** — les deux coexistent.

---

## 2. Lancer et vérifier

```bash
npm run dev:arcade
```

puis <http://127.0.0.1:4173/arena/games/drone-quota/>.

Le script est `scripts/dev-arcade.mjs` (165 l., zéro dépendance). Il monte
`public/` sur `/arena/` et le dépôt voisin `gwen-ha-star-static` sur `/`. **Ce
jeu-ci n'a besoin ni du voisin ni d'authentification** : il est autonome. Le
harnais existe surtout pour l'arcade `arcade-casino/`, qui elle en dépend.
N'importe quel serveur statique servant `public/` fait donc l'affaire.

Pas d'étape de build pour le jeu : c'est du HTML/CSS/JS servi tel quel.
`npm run build` ne concerne que le hub Next.js.

`npm run lint` sort **7 erreurs préexistantes** dans `src/app/*.tsx`
(`react/jsx-no-comment-textnodes`, des `// 01 · TITRE` écrits en texte JSX).
Elles n'ont rien à voir avec le jeu — ne pas les corriger au passage sans
qu'on le demande.

---

## 3. Fichiers et responsabilités

```txt
public/games/drone-quota/
├── index.html   208 l.  structure : écrans, meuble, HUD, panneau de parade
├── style.css    853 l.  meuble, orifices, états de port, duel, interlude
├── game.js     1401 l.  règles, économie, arbre, machine à états
└── fx.js        485 l.  son, particules, secousses, traces d'usure
```

Le jeu est aussi déclaré à deux endroits côté hub Next.js :

- `src/lib/games.ts` — entrée du catalogue (`external: '/arena/games/drone-quota/'`)
- `src/app/page.tsx` — carte du hub, tableau `FULLGAMES` **codé en dur** en
  tête de fichier

### La frontière qui compte : `fx.js` ↔ `game.js`

`fx.js` ne connaît **rien** du gameplay. `game.js` ne connaît de `fx.js` qu'une
API publique, exposée en `window.DQFX` :

| Appel | Rôle |
|---|---|
| `sfx.hit(ratio, pan)` | impact ; `ratio` 0→1 monte la hauteur avec le combo |
| `sfx.crit / virus / shield / bonus / turret / miss / escape` | variantes |
| `sfx.tick / go / paid / failed / buy / lowLife` | interface et verdicts |
| `hum(bool)` | ronflement de la machine pendant le round |
| `burst(el, kind, power)` | étincelles + poussière + anneau sur un élément |
| `tracer(fromEl, toEl)` | traçante d'un flanc vers un port |
| `shake(el, amount)` | secousse amortie appliquée en `transform` |
| `scar(el, kind)` / `clearScars()` | traces d'impact persistantes sur la tôle |
| `attach(canvas, host)` / `resize()` / `clear()` | cycle de vie du canvas |
| `setMuted / isMuted / unlock` | sourdine persistante, ouverture du contexte audio |

`game.js` porte un objet de repli si `fx.js` n'a pas chargé : le jeu doit
rester jouable en silence plutôt que planter au premier clic.

**Cette frontière est délibérée** : le rendu de la machine est un chantier à
part (issue #4) et doit pouvoir être remplacé sans rouvrir les règles. Ne pas
faire fuiter de logique de jeu dans `fx.js`, ni d'oscillateur ou de contexte 2D
dans `game.js`.

---

## 4. La boucle

### Structure

- Un **round** dure `roundSeconds` (26 s de base, + `RALLONGE`).
- En fin de round, le **palier** est prélevé sur la banque. S'il manque un
  point, la run s'arrête. Il n'y a **pas de vies** : la pression, c'est le
  temps et le palier.
- **Trois rounds font une manche.** Entre deux rounds d'une même manche : un
  souffle de quelques secondes (écran `#interlude`, auto-avance, bouton pour
  passer). En fin de manche : l'**atelier**, qui ouvre l'arbre.
- Palier : `1500 × 1.5^(round−1)`, réduit par `NÉGOCIATION`.

### Écrans

`#scr-menu` → `#scr-brief` → `#scr-round` → (`#interlude` | `#scr-shop`) →
`#scr-round` … → `#scr-over`. Plus `#scr-tree` en consultation depuis
l'accueil. Un seul porte `.active` à la fois (`show(id)`).

### Cibles

| id | glyphe | pts | poids | ttl | particularité |
|---|---|---|---|---|---|
| `drone` | 🤖 | 6 | 40 | 900 | — |
| `scout` | ⚡ | 12 | 18 | 560 | rapide |
| `core` | ⭐ | 30 | 7 | 700 | rare, poids ×`SIGNAL RARE` |
| `coolant` | 🔋 | 0 | 6 | 760 | ralentit le flux 3,2 s |
| `overclock` | 💠 | 0 | 5 | 720 | double les points 4,2 s |
| `blinde` | 🛡️ | 14 | 10 | 1500 | 3 coups de bouclier, puis ×2.2 |
| `sentinelle` | ⚔️ | 18 | 14 | 1300 | pare : déclenche le duel, puis ×2.8 |

### Chaîne d'étourdissement

Une cible frappée **ne disparaît pas** : elle reste sonnée dans son orifice.
Chaque coup suivant vaut `1 + 0.45 × index` de plus, jusqu'à `chainMax` = 5,
après quoi elle est mise hors service. La fenêtre d'étourdissement rétrécit à
chaque coup (`560 ms × 0.74^n`), donc la chaîne se referme d'elle-même.

Un drone mené au bout : 9 → 26 → 51 → 85 → 126 (arbre `frappe:2`).

**Conséquence à connaître** : si la fenêtre expire en cours de chaîne, la cible
s'échappe et **casse le combo**. Abandonner une chaîne coûte donc cher — c'est
volontaire, mais voir §9, ce n'est peut-être pas assez lisible pour le joueur.

### Blindés

Trois coups absorbés (aucun point, aucun combo — rien n'a touché), chacun
prolongeant l'étourdissement pour garder la fenêtre ouverte. Une fois brisé, il
paie à ×2.2 et se chaîne normalement.

### Parade

Frapper une sentinelle intacte ouvre un duel :

1. `round.paused = true` — le plateau se fige, les autres ports sont inertes.
2. Les compteurs de disparition sont **suspendus** (`freezeTtls`) et réarmés
   après (`thawTtls`) : on ne perd pas des cibles sans les voir.
3. **Le chrono du round continue de tourner.** Volontaire : sinon rater la
   parade deviendrait un abri où souffler quand le plateau déborde.
4. La dalle zoome sur le port (`#glass-inner.duel`, origine du transform
   calée sur le port).
5. Un curseur fait au minimum un aller-retour : chaque traversée dure
   `qteSweepMs` (1450 ms) et `qteSweepLegs` vaut 2. Une zone de `qteZone`
   (24 %, élargie par `RÉFLEXE`) est placée au hasard. Le clic ou la barre
   d'espace sont acceptés dans les deux sens.
6. **Réussi** : la garde s'ouvre, la sentinelle devient une cible sonnée
   enchaînable. **Raté** : le joueur reste étourdi 1 s, ses clics sont ignorés.

Le balayage triangulaire est lu au **temps écoulé**, pas à la position CSS du
curseur : l'issue est donc vérifiable sans dépendre du rendu.

Une tourelle qui tire sur une sentinelle intacte se fait parer **sans**
déclencher de duel — le joueur n'a pas frappé, il n'a pas à être puni.

### Arbre — 17 nœuds, permanent

Acheté avec la banque, conservé d'une run à l'autre. Quatre branches :

- **ARMEMENT** : `frappe` (4), `combo` (3), `etourdi` (3), `critique` (3),
  `onde` (2)
- **FLUX** : `cadence` (3), `densite` (3), `fenetre` (2), `rarete` (3)
- **TOURELLES** : `tourelleG` (3), `tourelleD` (3), `ciblage` (2),
  `surchauffe` (2)
- **VITAL** : `rallonge` (3), `reflexe` (2), `amorti` (2), `negoce` (3)

Chaque nœud écrit dans l'objet de stats via `apply(stats, lvl)`, et
`deriveStats(tree)` fait une passe unique. Ajouter un nœud = ajouter une entrée
dans `TREE`, rien d'autre.

Seuls cinq nœuds ont un prérequis (`critique` et `onde` derrière `frappe`,
`tourelleD`, `ciblage` et `surchauffe` derrière `tourelleG`). Les douze autres
sont accessibles dès la première visite à l'atelier, et les branches FLUX et
VITAL n'ont aucun verrou. **Ce n'est donc pas un arbre mais quatre listes**, et
c'est l'objet de l'issue #5 — voir la priorité 3 du §10.

`loadSave()` filtre les identifiants inconnus et borne les niveaux au `max` :
une sauvegarde d'une version antérieure dégrade proprement au lieu d'injecter
un niveau fantôme. C'est ce qui a permis de supprimer `vie` et `bouclier` sans
migration.

Sauvegarde : `localStorage['drone-quota:v1']` =
`{ tree, bestRound, bestScore, runs }`. Sourdine : `drone-quota:mute:v1`.

---

## 5. L'équilibrage, et comment le refaire

Le facteur limitant **n'est pas le débit des ports mais la main du joueur** :
la chaîne d'étourdissement a triplé le plafond de revenu sans bouger le
plancher. Le modèle raisonne donc en **budget de frappes** : `secondes × taps
par seconde`, réparti sur les cibles selon leur poids, chaque cible coûtant
`(coups de bouclier) + (parade) + (longueur de chaîne)` frappes.

Résultat visé, avec `quotaBase = 1500` et `quotaGrowth = 1.5` :

| arbre | débutant (1 coup/cible, 2,5 f/s) | bon joueur (chaînes complètes, 4 f/s) |
|---|---|---|
| vide | round 5 (~3 900/round) | round 10 (~16 000) |
| milieu | 10 | 14 |
| plein | 14 | 17 |

Valeur par frappe, arbre vide : drone 39, scout 79, blindé 127, core 198.

**La croissance doit rester géométrique.** Une courbe polynomiale a déjà été
essayée (`round^1.12`) : le revenu d'un round étant à peu près constant, une
courbe quasi linéaire finit par être dépassée définitivement et la run ne
s'arrête jamais — l'arbre plein donnait des runs infinies. C'est la croissance
qui crée le mur, pas la base.

> **Ces chiffres sont modélisés, pas éprouvés à la manette.** Voir §8.

---

## 6. Contraintes à ne pas casser

1. **Autonomie du dossier.** Aucune dépendance, aucun CDN, aucun appel réseau,
   aucun fichier d'asset. Tout est synthétisé (WebAudio) ou dessiné (CSS,
   canvas). Si un asset devient nécessaire, il vit dans le dossier du jeu.
2. **Tactile.** Les ports sont des `<button>` : le hit-testing,
   le clavier et l'accessibilité sont gratuits, il faut que ça le reste. Cibles
   d'au moins ~44 px, page qui ne déborde pas horizontalement à 375 px de
   large. Le rendu actuel donne 63 px sur mobile.
3. **Le canvas ne capte rien.** `#fx-layer` est en `pointer-events: none`.
4. **Pas de vies.** La pression est le temps et le palier. Toute nouvelle
   punition se paie en secondes, pas en compteur de cœurs.
5. **Le chrono ne s'arrête jamais**, duel compris.
6. **Séparation `fx.js` / `game.js`** (§3).
7. **Ne pas écrire dans `games/`.** L'arbre `games/` est l'atelier historique
   et il **diverge** de `public/games/` (chantier ouvert, cf.
   `docs/arcade-audit-2026-09-08.md`). Ce jeu-ci n'existe que dans `public/`,
   qui est l'arbre déployé. Ne pas en créer une copie dans `games/`.
8. **Le français partout** : interface, commentaires, messages de commit.

---

## 7. Couture de mise au point

`window.__droneQuota` expose de quoi tester sans jouer vingt rounds :

```js
const dq = window.__droneQuota;

dq.BALANCE                    // mutable à chaud
dq.TARGETS, dq.TREE, dq.NODES
dq.ports                      // les 12 objets de port
dq.run, dq.round, dq.save, dq.stats
dq.quotaFor(r, stats)
dq.deriveStats(tree)
dq.mancheOf(r), dq.stepInManche(r), dq.isMancheEnd(r)

dq.forceSpawn(index, typeId)  // place une cible précise sur un port
dq.fireTurretNow(0 | 1)       // déclenche un tir de flanc
dq.resolveQteNow(true|false)  // force l'issue du duel en cours
```

Ces crochets court-circuitent **l'attente, jamais les règles** : un
`forceSpawn` passe par le même habillage de port qu'un spawn naturel, et
`resolveQteNow` appelle le vrai `resolveQte`.

### Pièges de test, appris à la dure

- **`BALANCE` est mutable et persiste jusqu'au rechargement.** Un test qui met
  `roundSeconds = 2` pour aller vite fausse silencieusement tout calcul
  d'équilibrage lancé après lui. **Recharger la page avant de mesurer quoi que
  ce soit d'économique.**
- **`requestAnimationFrame` est suspendu quand l'onglet est masqué.** Les
  particules et les secousses ne bougent pas, et les captures d'écran les
  montrent figées. Le reste tourne : la boucle de round est volontairement sur
  `setInterval` + `performance.now()`, pas sur rAF, pour que les rounds se
  terminent quand même.
- Chrome applique en plus un bridage intensif après quelques minutes d'onglet
  masqué (minuteurs ~1/minute). Un test qui attend en boucle finit en timeout.
- Un duel expire tout seul après l'aller-retour complet, soit 2900 ms avec les
  valeurs de base. Pour un test déterministe, ouvrir et appeler
  `resolveQteNow` dans le même script reste préférable.

---

## 8. Ce qui est vérifié, et ce qui ne l'est pas

### Vérifié en pilotant les vrais modules

Chaîne d'étourdissement (valeurs exactes à chaque cran, mise hors service au
5e), bouclier à trois coups puis paiement, duel gagné laissant la sentinelle
sonnée et enchaînable, duel perdu étourdissant le joueur 998 ms puis
rétablissant ses clics, plateau figé et autres ports inertes pendant le duel,
tourelles limitées à leur colonne, souffle entre rounds d'une manche, atelier
en fin de manche, prérequis de nœuds, migration d'une sauvegarde d'avant la
refonte, ports atteignables par le hit-testing réel du navigateur, mobile
375 px sans débordement.

### Pas vérifié

- **Le jeu n'a jamais été joué à la manette.** Tout a été piloté en script,
  volet navigateur masqué. Les particules, les secousses et le ronflement
  n'ont jamais été vus ni entendus en mouvement.
- **L'équilibrage est modélisé, pas éprouvé.** Le tableau du §5 sort d'un
  modèle de budget de frappes, pas de parties réelles.
- La lisibilité du duel en conditions réelles (est-ce qu'on comprend ce qui se
  passe quand ça zoome ?) n'a pas été évaluée.

---

## 9. Aspérités connues et questions ouvertes

- **Abandonner une chaîne casse le combo.** Quand la fenêtre expire, la cible
  « s'échappe » et le combo retombe à 1. C'est une vraie tension, mais rien ne
  le dit au joueur : il verra son combo tomber sans comprendre pourquoi.
- **Une sentinelle qu'on ignore casse aussi le combo** en partant, comme
  n'importe quelle cible à points positifs. Est-ce qu'éviter une sentinelle
  doit être puni ? À trancher.
- Le blindé immobilise huit frappes. C'est le pari le plus engageant du jeu,
  mais rien ne prévient le joueur de ce qu'il s'apprête à investir.
- `run.active` est écrit mais jamais lu.
- Il n'y a pas de meilleur score **par round atteint** au-delà de `bestRound`,
  ni de statistiques de fin de run (précision, plus longue chaîne, parades
  gagnées) alors que `round.chainBest`, `round.parries` et `round.parriesWon`
  sont déjà comptés.
- Le zoom du duel déborde de la dalle sur les ports de bord (masqué par
  `overflow: hidden`). Ça passe, mais ce n'est pas cadré.

---

## 10. Par où continuer

### Priorité 1 — jouer et confirmer l'équilibrage

C'est le seul point qui ne peut pas être fait en script. Trois ou quatre runs
suffisent à répondre à :

- Le round 1 est-il franchissable sans rien connaître ?
- La chaîne écrase-t-elle le reste, ou reste-t-elle un choix ?
- La parade est-elle lisible, ou juste une interruption pénible ?
- Le souffle entre rounds fait-il respirer, ou casse-t-il le rythme ?

Les leviers sont tous groupés dans `BALANCE` en tête de `game.js`.

### Priorité 2 — finir l'habillage (issue #4)

L'issue <https://github.com/Sterenna-studio/skill-arena/issues/4> porte le
rendu réaliste de la machine, et son fil contient déjà la décision
d'architecture. Il reste : de vraies matières (plastique injecté, métal brossé,
courbure du verre), des lumières locales qui éclairent les surfaces voisines au
lieu de `box-shadow` statiques, de la poussière et des éclats au fond du puits,
et un mode dégradé si le coût devient sensible sur mobile.

### Priorité 3 — restructurer l'arbre, puis l'élargir

**Issue <https://github.com/Sterenna-studio/skill-arena/issues/5>.**

L'arbre actuel n'est pas un arbre : quatre listes plates, dont 12 nœuds sur 17
sans aucun prérequis, et deux branches entières ouvertes dès la première
visite. Rien ne s'ouvre à mesure qu'on investit.

**Restructurer d'abord, élargir ensuite** : ajouter des nœuds à quatre listes
plates ne ferait que rendre le problème plus visible. L'issue détaille les cinq
questions à trancher avant de coder (nœuds verrouillés visibles ou cachés,
prérequis par nœud ou seuil de branche, arbre strict ou graphe, réversibilité,
second axe de déverrouillage), le piège de sauvegarde à traiter et la question
du rendu mobile.

Une fois la structure en place, les pistes de nœuds qui collent aux mécaniques
actuelles : chaîne plus longue, parade à plusieurs passes, blindés qui laissent
tomber un bonus en se brisant, tourelles qui participent aux chaînes.

### Priorité 4 — retour au joueur

Les aspérités du §9, en particulier dire au joueur *pourquoi* son combo tombe,
et un écran de fin de run qui exploite les compteurs déjà collectés.

---

## 11. Conventions du dépôt

- Branche `master`. **Pousser déclenche un déploiement** : le workflow
  `.github/workflows/deploy-ovh.yml` fait un `rsync` vers OVH.
- Messages de commit en français, format conventionnel
  (`feat(drone-quota): …`), et le corps explique **pourquoi**, pas seulement
  quoi.
- Documentation dans `docs/`. À lire pour le contexte plus large :
  `docs/arcade-audit-2026-09-08.md` (état de l'arcade et chantiers ouverts),
  `docs/star-arcade-gameplay-guideline.md` (la cible de feeling arcade),
  `docs/skill-arena-roadmap.md` (le hub).
