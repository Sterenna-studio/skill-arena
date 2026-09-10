# Drone Quota — dossier de reprise

Tout ce qu'il faut pour reprendre le jeu sans contexte préalable : ce qu'il
est, comment le lancer, ce sur quoi il repose, ce qui est vérifié, ce qui ne
l'est pas, et par où continuer.

Écrit le 2026-09-09, mis à jour le 2026-09-10 après la passe de retours
pop/cyberpunk et de pression visuelle du duel.

---

## 1. Ce que c'est

Un whack-a-mole roguelite autonome, servi en statique dans le catalogue Skill
Arena. Le joueur frappe ce qui sort de douze ports pendant trois rounds
chronométrés et doit avoir assez en banque à la fin pour régler l'**objectif de
manche**. Cette facture est la somme des trois anciens paliers et monte
géométriquement. Entre deux manches, la banque achète des nœuds d'un
arbre de compétences **persistant** — et c'est le dilemme central : la banque
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
├── index.html   319 l.  écrans, meuble, HUD, tutoriel, réglages, prestige
├── style.css   1518 l.  meuble, ports, états, écrans et responsive
├── game.js     2249 l.  règles, économie, boost, arbre, machine à états
├── fx.js        648 l.  son, particules, secousses, traces d'usure
└── prefs.js     167 l.  préférences locales et viseur DOM optionnel
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
| `configureAudio(options)` | volume, effets ponctuels et ambiance séparés |
| `setReducedEffects(bool)` | force ou libère le mode sensoriel dégradé |

`game.js` porte un objet de repli si `fx.js` n'a pas chargé : le jeu doit
rester jouable en silence plutôt que planter au premier clic.

`prefs.js` est une troisième frontière, sans règle de score : il normalise les
préférences et anime le viseur DOM. Le viseur CSS est un point de remplacement
prévu pour un futur sprite, sans imposer d'asset aujourd'hui.

**Cette frontière est délibérée** : le rendu de la machine est un chantier à
part (issue #4) et doit pouvoir être remplacé sans rouvrir les règles. Ne pas
faire fuiter de logique de jeu dans `fx.js`, ni d'oscillateur ou de contexte 2D
dans `game.js`.

---

## 4. La boucle

### Structure

- Un **round** dure `roundSeconds` (26 s de base, + `RALLONGE`).
- La banque s'accumule pendant les trois rounds. **Le joueur ne peut pas perdre
  pendant une manche** : le verdict et le prélèvement arrivent seulement après
  le round 3/3. Un retard aux rounds 1 ou 2 peut donc être rattrapé.
- **Trois rounds font une manche.** Entre deux rounds d'une même manche : un
  souffle de quelques secondes (écran `#interlude`, auto-avance, bouton pour
  passer). En fin de manche : l'**atelier**, qui ouvre l'arbre.
- Objectif de manche : somme des trois valeurs
  `1500 × 1.5^(round−1)`, réduites par `NÉGOCIATION`. La première demande
  7 125 ; ce regroupement conserve le coût cumulé historique tout en retirant
  les défaites intermédiaires.

### Écrans

`#scr-menu` → `#scr-brief` → `#scr-round` → (`#interlude` | `#scr-shop`) →
`#scr-round` … → `#scr-over`. Plus `#scr-tree`, `#scr-prestige` et
`#scr-settings` en consultation. `#tutorial` est une modale de trois panneaux,
ouverte au premier lancement et rejouable depuis les réglages. Un seul écran
porte `.active` à la fois (`show(id)`).

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

Avec `frappe:2`, un drone mené au bout donne désormais environ
9 → 13 → 17 → 42 → 50 : la jauge franchit ×2 après le troisième coup, et ce
nouveau multiplicateur s'applique à partir du coup suivant.

Si la fenêtre expire, la cible s'échappe mais le BOOST reste intact. Une fuite
n'est plus une sanction cachée : seuls cinq clics vides consécutifs dissipent
la jauge et ramènent son multiplicateur à ×1.

### BOOST et tolérance des ratés

Chaque touche manuelle remplit une jauge selon une base fixe et la racine du
score marqué ; les coups de bouclier et bonus apportent une charge plus petite.
À 100 %, le multiplicateur monte d'un cran jusqu'à `comboCap`, la jauge repart
et les impacts deviennent visuellement et auditivement plus forts. Les
tourelles ne participent que si leur nœud d'arbre le permet.

Un clic dans un port vide affiche `RATÉ n/5` mais ne retire ni score, ni BOOST,
ni multiplicateur. Une touche remet cette série à zéro. Au cinquième raté
consécutif seulement, le BOOST retombe à zéro et le multiplicateur à ×1. Une
cible ignorée ou une parade perdue ne compte pas comme clic vide.

Les touches manuelles et clics vides font alterner six onomatopées de chaque
famille et quatre silhouettes typographiques : affiche pop, chromes disco,
cartouche cyber et bulle arcade. La grande voix et le détail utile (points ou
`RATÉ n/5`) sont deux lignes distinctes. Ces retours sont placés dans l'arène,
pas dans le `<button>` dont le puits masque les débordements ; leur centre est
borné sur les cases de bord. Les tourelles et dommages d'onde gardent le petit
retour chiffré pour ne pas saturer la dalle d'onomatopées automatiques.

### Blindés

Trois coups absorbés (aucun point, aucun combo — rien n'a touché), chacun
prolongeant l'étourdissement pour garder la fenêtre ouverte et apportant une
petite charge de BOOST. Une fois brisé, il paie à ×2.2 et se chaîne normalement.

### Parade

Frapper une sentinelle intacte ouvre un duel :

1. `round.paused = true` — le plateau se fige, les autres ports sont inertes.
2. Les compteurs de disparition sont **suspendus** (`freezeTtls`) et réarmés
   après (`thawTtls`) : on ne perd pas des cibles sans les voir.
3. **Le chrono du round continue de tourner.** Volontaire : sinon rater la
   parade deviendrait un abri où souffler quand le plateau déborde.
4. La dalle zoome sur le port (`#glass-inner.duel`, origine du transform
   calée sur le port). Pendant le balayage, la grille oscille et avance/recule
   légèrement comme une caméra qui plonge dans le plateau. Le mode d'effets
   réduits conserve un zoom fixe.
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

### Arbre — 17 nœuds persistants

Acheté avec la banque, conservé d'une run à l'autre. Les quatre branches sont
maintenant de vrais arbres stricts : un nœud principal a zéro ou un parent,
et reste **absent du DOM** jusqu'à ce que ce parent ait au moins un niveau.
Les racines sont les quatre seuls nœuds principaux visibles sur un arbre vide.

- **ARMEMENT** : `frappe` → (`combo`, `etourdi`) ; `combo` → `onde` ;
  spécialisation flottante `critique`.
- **FLUX** : `cadence` → (`densite`, `fenetre`) ; `densite` → `rarete`.
- **TOURELLES** : `tourelleG` → `tourelleD` → `surchauffe` ; spécialisation
  flottante `ciblage`.
- **VITAL** : `rallonge` → `reflexe` → `negoce` ; spécialisation flottante
  `amorti`.

Le tier 3 exige aussi **trois niveaux investis dans sa branche**. Les trois
spécialisations flottantes exigent une profondeur 2 et trois niveaux investis.
Avant leur premier achat, leur emplacement et leur condition sont lisibles,
mais leur icône et leurs statistiques restent opaques. Leur ouverture dépend
uniquement de la profondeur et de l'investissement : les jetons de prestige ne
gâtent jamais l'arbre de score.

Le rendu est une grille CSS explicite par branche. Un SVG créé dans le DOM,
en `pointer-events: none`, relie uniquement les nœuds principaux révélés. Sous
620 px, la grille devient une colonne verticale et les liens sont recalculés.
Les nœuds restent tous des `<button>`.

Chaque nœud écrit dans l'objet de stats via `apply(stats, lvl)`, et
`deriveStats(tree, loadout)` applique ensuite les constantes de structure et
les buffs du loadout de prestige.

`loadSave()` filtre les identifiants inconnus, borne les niveaux au `max`, puis
appelle `normalizeTree()`. Si une sauvegarde historique possède un descendant
dont le nouveau parent manque, les ancêtres requis sont ajoutés gratuitement.
C'est le choix de migration sans perte : un achat ancien ne devient ni
invisible ni inactif, au prix d'un petit cadeau ponctuel de niveaux parents.

L'atelier est transactionnel. `enterShop()` prend un instantané `{ tree,
bank, credit }`; `buy()` consomme d'abord le crédit de reconstruction, puis la
banque, sans persister. « ANNULER LES ACHATS » restaure les trois valeurs, et
« MANCHE SUIVANTE » appelle `validateShop()`, qui écrit avant de figer les
achats. Un rechargement ou le lien Arena appelle `discardShopChanges()` : un
état à moitié acheté ne rejoint jamais `localStorage`.

Sauvegarde : `localStorage['drone-quota:v1']` =
`{ tree, bestRound, bestManche, bestScore, runs, loadout, credit, prestiges }`.
Sourdine : `drone-quota:mute:v1`. La clé n'a pas changé ; une sauvegarde sans
les nouveaux champs reçoit leurs valeurs par défaut. Pour une sauvegarde
ancienne, `bestManche` est amorcé à `floor(bestRound / 3)`.

Préférences d'appareil : `localStorage['drone-quota:prefs:v1']` contient le
mode de pointeur, la réactivité du viseur, son global, effets, ambiance, volume,
effets visuels réduits et passage du tutoriel. Le premier chargement respecte
l'ancienne clé de sourdine avant de créer ces préférences.

### Prestige — jetons dérivés et loadout réversible

Une **manche record terminée** accorde implicitement un jeton. Aucun solde
n'est stocké : `total = bestManche` et `disponibles = total - coût(loadout)`.
Le panneau `#scr-prestige`, accessible seulement depuis le menu entre deux
runs, permet d'affecter et retirer librement ces jetons. « TOUT DÉSAFFECTER »
agit immédiatement, sans confirmation, puisque l'opération est gratuite et
réversible.

Les six points permanents changent des constantes que l'arbre ne modifie pas :

- `CHAÎNE PROFONDE` : chaîne 5 → 8, un coup par point ;
- `BLINDAGE LÉGER` : un bouclier de blindé en moins par point ;
- `GARDE LUE` : une traversée de parade en plus par point ;
- `AVANCE` : +300 de banque de départ par point ;
- `ÉLAN` : BOOST ×2 au début de chaque round ;
- `RÉCUPÉRATION` : crédit de reconstruction 60 → 70 %, +5 % par point.

Les six buffs de départ présentent toujours l'avantage et sa contrepartie avec
le même poids visuel : `BRÈCHE` (blindage −1 / CORE ×0,5), `SURTENSION`
(chaîne ≥7 / étourdissement −30 %), `RESPIRATION` (+4 s / plafond de BOOST −2),
`PROTOCOLE CALME` (aucune sentinelle / paliers +15 %), `PREMIÈRE HEURE`
(points ×2 en manche 1 / paliers +10 % dès la manche 2) et `SURCHARGE`
(deux cibles de plus / TTL −20 %).

Le reset de l'arbre reste dans `#scr-tree` et demande confirmation. Il efface
uniquement l'arbre, incrémente `prestiges`, puis rend 60 % du score investi
(jusqu'à 70 % avec `RÉCUPÉRATION`) dans une poche `credit` séparée. Ce crédit
ne règle jamais un palier et ne finance rien d'autre qu'un nœud. Le reset
global du pied de menu reste la seule action qui efface toute la progression.

### Lisibilité et réglages

L'accueil résume maintenant les règles en trois blocs et le premier lancement
ouvre trois panneaux maximum : survie jusqu'au round 3, cible sonnée, puis
BOOST et cinq ratés. Le panneau reste accessible depuis « COMMENT JOUER » et
les réglages.

Une cible sonnée porte un cadre ambre, une pose inclinée, le texte `SONNÉ 0,6s`
et une barre qui se vide sur la durée réelle de `stunTarget()`. Le HUD sépare
nettement l'objectif cumulé et le BOOST ; chaque touche affiche `TOUCHÉ`, chaque
clic vide affiche son rang dans la tolérance.

`#scr-settings` configure : pointeur normal ou viseur arme, réactivité du viseur
1–10, son global, effets, ambiance, volume 0–100 et effets visuels réduits. Une
page web ne peut pas modifier la sensibilité du curseur système : le curseur
normal reste natif et la réactivité ne s'applique qu'au viseur DOM. Les
réglages complets ne s'ouvrent pas pendant un round chronométré ; le bouton de
sourdine immédiate reste disponible.

Le jeu applique `user-select: none` et retire le halo tactile sans masquer le
focus clavier. Sous 620 px, les outils flottants et tous les contrôles du
panneau de réglages offrent au moins 44 px.

---

## 5. L'équilibrage, et comment le refaire

Le facteur limitant **n'est pas le débit des ports mais la main du joueur** :
la chaîne d'étourdissement a triplé le plafond de revenu sans bouger le
plancher. Le modèle raisonne donc en **budget de frappes** : `secondes × taps
par seconde`, réparti sur les cibles selon leur poids, chaque cible coûtant
`(coups de bouclier) + (parade) + (longueur de chaîne)` frappes.

Résultat historique visé, avec `quotaBase = 1500` et `quotaGrowth = 1.5` :

| arbre | débutant (1 coup/cible, 2,5 f/s) | bon joueur (chaînes complètes, 4 f/s) |
|---|---|---|
| vide | round 5 (~3 900/round) | round 10 (~16 000) |
| milieu | 10 | 14 |
| plein | 14 | 17 |

Ancien repère avant la jauge progressive, valeur par frappe arbre vide :
drone 39, scout 79, blindé 127, core 198. Ne pas l'utiliser comme mesure du
build actuel sans recalcul.

Le prélèvement par manche conserve exactement la somme de ces paliers, mais la
possibilité de rattraper un mauvais round change la variance et le ressenti. Le
nouveau BOOST change aussi la vitesse d'accès aux multiplicateurs : les bornes
du tableau ne doivent plus être traitées comme validées sans nouvelles runs.

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
dq.PRESTIGE_STATS, dq.PRESTIGE_BUFFS
dq.ports                      // les 12 objets de port
dq.run, dq.round, dq.save, dq.stats
dq.quotaFor(r, stats)
dq.mancheQuotaFor(r, stats)
dq.deriveStats(tree, loadout)
dq.normalizeTree(tree)
dq.branchInvestment(branch, tree), dq.branchDepth(branch, tree)
dq.unlockCheck(node, tree), dq.nodeState(node, tree, bank, credit)
dq.enterShop(), dq.cancelShopPurchases(), dq.validateShop()
dq.emptyLoadout(), dq.normalizeLoadout(loadout, budget)
dq.loadoutCost(loadout), dq.tokenSummary(save)
dq.treeInvestedScore(tree), dq.resetTree()
dq.setStatPoint(id, -1|1), dq.togglePrestigeBuff(id), dq.clearLoadout()
dq.recordClearedRound(round)
dq.mancheOf(r), dq.stepInManche(r), dq.isMancheEnd(r)
dq.chargeBoost(points, port, fixedGain), dq.registerMiss(port)
dq.popText(port, detail, kind, voix)
dq.nextHitFeedback(), dq.nextMissFeedback()
dq.updateHud(), dq.endRound(), dq.startRound(), dq.newRun()
dq.preferences, dq.openTutorial(), dq.openSettings()

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

Les essais de ressenti encore ouverts sont centralisés dans
l'**issue <https://github.com/Sterenna-studio/skill-arena/issues/9>**. Elle
contient trois passes courtes et un modèle de commentaire copiable afin de
comparer les retours sans les reformater.

### Vérifié en pilotant les vrais modules

Chaîne d'étourdissement (valeurs exactes à chaque cran, mise hors service au
5e), bouclier à trois coups puis paiement, duel gagné laissant la sentinelle
sonnée et enchaînable, duel perdu étourdissant le joueur 998 ms puis
rétablissant ses clics, plateau figé et autres ports inertes pendant le duel,
tourelles limitées à leur colonne, souffle entre rounds d'une manche, atelier
en fin de manche, ports atteignables par le hit-testing réel du navigateur.

Pour l'arbre de l'issue #5 : quatre racines seules sur une sauvegarde vide,
révélation parentale, seuil de tier 3, condition combinée des spécialisations,
SVG de liaison, migration d'une sauvegarde ancienne incohérente, application de
ses effets, achat sans écriture, annulation, validation, rechargement et sortie
Arena. Le rendu a été inspecté dans un onglet Chrome visible à 1280 px puis
375 px ; à 375 px, largeur exacte 375/375 et cibles de nœuds d'au moins 76 px.

Pour le prestige de l'issue #6, dans un onglet Chrome réellement visible :

- migration d'une sauvegarde sans les nouveaux champs, avec `bestRound: 8` :
  `bestManche: 2`, loadout vide, crédit et compteurs à zéro ;
- une manche record ajoute exactement un jeton, la répétition ne l'ajoute pas,
  et une propriété historique `unlock.prestige` injectée ne bloque aucun nœud ;
- affectation, désaffectation complète sans confirmation et réaffectation d'un
  autre loadout, avec coût et solde dérivés puis sauvegardés ;
- application effective des six constantes et des six buffs : banque et combo
  de départ, boucliers, trois traversées de parade, chaîne, absence de
  sentinelles, densité, TTL, scores et paliers ;
- achat d'un nœud payé d'abord au crédit, puis annulation restaurant exactement
  `{ tree, bank, credit }`, sans écriture intermédiaire dans `localStorage` ;
- reset d'un arbre ayant 1 320 investis avec `RÉCUPÉRATION` niveau 1 : 858 de
  crédit (65 %), arbre vide, loadout et records conservés ;
- écran prestige contrôlé à 1000 px et à 375 px : aucune largeur excédentaire
  (375/375), contrôles de point à 44 px, cartes de buffs sur une colonne en
  mobile, avantage et contrepartie tous deux visibles ; écran de reset inspecté
  à 1000 px.

Pour la passe UX du 2026-09-10, dans un onglet Chrome visible :

- objectif de manche 1 égal à 7 125, exactement `1500 + 2250 + 3375` ; banque
  insuffisante aux rounds 1 et 2 sans défaite, puis verdict au round 3 ; avec
  7 225 en banque, le paiement laisse 100, passe au round 4 et ouvre l'atelier ;
- les trois panneaux du tutoriel, leur sortie vers le briefing et la mémorisation
  locale ; rendu inspecté à 1000 px et 375 px ;
- quatre clics vides conservant un BOOST ×3 chargé à 55 %, cinquième clic
  ramenant multiplicateur et jauge à zéro ;
- cible sonnée avec classe, libellé `SONNÉ 0.6s`, barre animée sur 0,56 s et
  retour `TOUCHÉ` ; HUD boost inspecté à 1000 px ;
- réglages persistants : bascule arme/normal, réactivité 4/10, effets sonores,
  mode visuel réduit et qualité `dégradé` ; tous les boutons de l'écran font au
  moins 44 px ; la sourdine historique migre vers `audioEnabled: false` ;
- viseur arme DOM observé au point de tir, puis disparition immédiate en mode
  normal ; `user-select: none` effectif ;
- à 375 px : largeur exacte 375/375, ports à 63 px, jauge boost à 311 px,
  réglages en une colonne de 359 px.

### Pas vérifié

- **Le jeu n'a jamais été joué à la manette.** Les contrôles de l'arbre et du
  prestige ont été pilotés dans un onglet visible, mais pas au fil de trois
  rounds réellement joués. Les réglages audio ont été contrôlés par leur état
  et l'API, mais leur volume perçu, les particules et les secousses n'ont pas
  été jugés à l'oreille ou sur une partie complète pendant cette reprise.
- **L'équilibrage est modélisé, pas éprouvé.** Le tableau du §5 sort d'un
  modèle de budget de frappes, pas de parties réelles.
- La lisibilité du duel en conditions réelles (est-ce qu'on comprend ce qui se
  passe quand ça zoome ?) n'a pas été évaluée.
- Les quatre voix d'impact ont été inspectées dans un onglet visible, à
  1100 px et 375 px, avec une largeur de document exacte (1100/1100 et
  375/375). Une vraie touche et un vrai clic vide produisent respectivement
  `ZAP ! +6` et `PLOP ! RATÉ 1/5`. Le duel affiche `duel-camera` et sa pose
  médiane mesurée est bien un zoom ×1,82 avec léger décalage/roulis. Le rythme
  sur les 2,9 s complets reste à apprécier en partie, pas sur une pose figée.

---

## 9. Aspérités connues et questions ouvertes

- Le seuil de **cinq ratés consécutifs** est une valeur de départ demandée pour
  essai. Il faut observer s'il pardonne l'imprécision sans rendre le balayage de
  tous les ports optimal.
- La charge actuelle (`20 + min(34, sqrt(points) × 4)`) fait monter le BOOST en
  quelques touches et crée volontairement un emballement. Sa vitesse, surtout
  avec les chaînes et `PREMIÈRE HEURE`, n'est pas encore équilibrée en jeu réel.
- Le regroupement des paliers en facture de manche conserve le coût total mais
  autorise le rattrapage. Il faut vérifier si cette sécurité améliore la lecture
  sans rendre les deux premiers rounds trop peu tendus.
- Le viseur arme est un dessin CSS provisoire. L'issue #8 précise les formats,
  états et arbitrages nécessaires avant un éventuel remplacement par sprite.
- Le blindé immobilise huit frappes. C'est le pari le plus engageant du jeu,
  mais rien ne prévient le joueur de ce qu'il s'apprête à investir.
- `run.active` est écrit mais jamais lu.
- Il n'y a pas de meilleur score **par round atteint** au-delà de `bestRound`,
  ni de statistiques de fin de run (précision, plus longue chaîne, parades
  gagnées) alors que `round.chainBest`, `round.parries` et `round.parriesWon`
  sont déjà comptés.
- Le zoom du duel déborde de la dalle sur les ports de bord (masqué par
  `overflow: hidden`). Ça passe, mais ce n'est pas cadré.
- La migration de l'arbre privilégie la conservation : un descendant ancien
  complète gratuitement ses nouveaux ancêtres. C'est volontaire et borné au
  premier chargement logique, mais les joueurs concernés reçoivent donc
  quelques niveaux qu'ils n'ont pas payés.
- Les coûts n'ont pas été rééquilibrés après la nouvelle cadence de révélation.
  La structure et les transactions sont déterministes ; le rythme d'achat doit
  encore être éprouvé dans de vraies runs.
- Les caps et coûts initiaux du prestige sont cohérents et bornés, mais restent
  des valeurs de départ : `AVANCE` (+300), le prix des buffs (1 ou 2 jetons) et
  la combinaison `PREMIÈRE HEURE` + `PROTOCOLE CALME` demandent des runs réelles.
- `RÉCUPÉRATION` rend 60, 65 ou 70 % du coût historique des nœuds. La poche
  séparée protège le dilemme banque/palier, mais la vitesse de reconstruction
  après plusieurs resets n'a pas encore été éprouvée en partie longue.
- L'issue #7 doit maintenant couvrir des **terrains modulaires** : nombres et
  formes de cases variables, cases absentes ou désactivées, et cases bonus à
  forte probabilité de parade. Les tourelles de flanc doivent devenir un
  équipement placé avant la manche : slot latéral, case ciblée choisie, cadence
  propre, puis frappes répétées tant qu'une cible est présente. Une variante de
  contrôle ferait peu de points mais prolongerait prioritairement un
  étourdissement amorcé par le joueur. Rien de ce modèle n'est encore codé.

---

## 10. Par où continuer

### Priorité 1 — jouer et confirmer l'équilibrage

C'est le seul point qui ne peut pas être fait en script. Trois ou quatre runs
suffisent à répondre à :

- La facture au seul round 3 garde-t-elle de la tension pendant toute la manche ?
- Le BOOST monte-t-il trop vite avec une chaîne rentable ?
- Cinq ratés pardonnent-ils sans encourager le spam ?
- La parade est-elle lisible, ou juste une interruption pénible ?
- Le souffle entre rounds fait-il respirer, ou casse-t-il le rythme ?

Les leviers sont tous groupés dans `BALANCE` en tête de `game.js`.
Consigner les mesures et impressions avec le formulaire de l'issue #9.

### Priorité 2 — finir l'habillage (issue #4)

L'issue <https://github.com/Sterenna-studio/skill-arena/issues/4> porte le
rendu réaliste de la machine, et son fil contient déjà la décision
d'architecture. Il reste : de vraies matières (plastique injecté, métal brossé,
courbure du verre), des lumières locales qui éclairent les surfaces voisines au
lieu de `box-shadow` statiques, de la poussière et des éclats au fond du puits,
et un mode dégradé si le coût devient sensible sur mobile.

### Priorité 3 — retour au joueur

La passe UX apporte tutoriel, objectif cumulé, cible sonnée, BOOST et réglages.
Il reste surtout un écran de fin de run qui exploite les compteurs déjà
collectés et les essais réels listés au §9.

### Priorité 4 — concevoir les terrains et l'équipement (issue #7)

Les nouvelles orientations sont consignées au §9 et dans l'issue #7. Avant
de coder, il reste à trancher si les terrains sont choisis avant la run ou
traversés, comment leurs revenus restent comparables, et si les records restent
globaux. Le premier incrément doit extraire une configuration de terrain sans
changer le plateau 4 × 3 actuel, puis seulement ajouter des formes alternatives.

### Priorité 5 — éprouver l'arbre restructuré, puis l'élargir

**Issue <https://github.com/Sterenna-studio/skill-arena/issues/5> implémentée.**

La restructuration est en place : nœuds cachés, double ouverture parent +
investissement, arbre strict, trois spécialisations flottantes opaques et
annulation transactionnelle. La migration sans perte complète les parents des
anciens achats. Desktop et disposition verticale 375 px ont été contrôlés à
l'écran ; voir §8 pour la limite entre vérification fonctionnelle et
équilibrage réel.

**Éprouver d'abord, élargir ensuite** : les prochaines runs doivent dire si
trois niveaux est le bon seuil de tier 3, si les modules opaques donnent envie
plutôt qu'ils ne frustrent, et si l'annulation est assez visible. Ensuite
seulement : chaîne plus longue, parade à plusieurs passes, blindés qui laissent
tomber un bonus en se brisant, tourelles qui participent aux chaînes.

### Priorité 6 — éprouver le prestige, sans l'élargir

**Issue <https://github.com/Sterenna-studio/skill-arena/issues/6> implémentée.**

Les jetons sont dérivés de `bestManche`, réaffectables depuis un écran dédié et
réservés aux points de structure et aux buffs avec contrepartie. Ils n'ouvrent
aucun nœud de l'arbre. Le reset rend un crédit séparé qui n'achète que des
nœuds ; annuler l'atelier restaure aussi cette poche.

La prochaine étape est de mesurer en vraies runs si les caps, coûts et
contreparties créent des loadouts réellement concurrents. Ne pas ajouter de
tables ou de cosmétiques ici : les jalons de tables sont l'issue #7 et les
cosmétiques restent rattachés à l'issue #4.

### Travail parallèle — apports graphiques

**Issue <https://github.com/Sterenna-studio/skill-arena/issues/8> ouverte.**

Elle centralise les sprites éventuels, leurs états, références de direction
artistique, droits et arbitrages de priorité que Pierre peut fournir en
parallèle. Aucun asset ne doit être intégré avant confirmation explicite de
l'exception à la contrainte actuelle « aucun fichier d'asset ».

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
