# Star Arcade — audit d'état (2026-09-08)

Point d'étape sur `public/arcade-casino/`, mesuré sur le code de `master`
(`c26227b`) et vérifié en jeu via le harnais local `npm run dev:arcade`.

À lire avec [star-arcade-gameplay-guideline.md](star-arcade-gameplay-guideline.md)
(la cible) et [star-arcade-rework.md](star-arcade-rework.md) (le patch UI).

## Où on en est

L'ordre de refonte de la guideline est suivi à **3,5 étapes sur 5**.

| # | Étape | État |
|---|-------|------|
| 1 | Shell arcade commun | ✅ fait |
| 2 | Whack-A-Mole → Drone Bash | ✅ fait |
| 3 | Crash → Hyperjump | ✅ visuel fait, contenu de run en attente |
| 4 | Neon Racer → Neon Circuit | 🟡 prototype jouable, pas fini |
| 5 | Slot → Coin Reactor | 🟡 3 étapes sur 5 |

### 1. Shell arcade commun — ✅

`css/arcade-shell.css` (436 l.) + `js/star-arcade-core.js` : cartes-borne avec
attract mode et scanline, boot overlay « INSERT STAR TOKEN » de 680 ms
(`star-arcade-core.js:239`), transition `showGame()`, stats locales par machine
(runs / best / last), historique de 30 lignes, retour lobby fiable. Aucune
classe CSS manquante sur les 4 jeux.

Réserve : les stats de borne gardent le **net en tokens**, pas le meilleur
score de run. La guideline demande un high score par jeu — il n'existe pas.

### 2. Drone Bash — ✅ le plus abouti

`js/games/whack-a-mole/whack-a-mole.js` (394 l.). Re-thème drones/virus,
3 phases (WARMUP / OVERLOAD / MELTDOWN), bonus coolant et overclock avec pills
de durée, précision, combo max, streak, countdown, result screen avec rang
S→D. Les trois couches de succès de la guideline sont là.

Manque : les objectifs intermédiaires toutes les 10 s, et le high score
persisté.

### 3. Hyperjump — ✅ visuel, ⏳ contenu

`js/games/crash/crash.js` (489 l.). Scène tunnel canvas avec vaisseau et
explosion, jauge de stabilité, rail de paliers ×1.25→×5 qui s'allument au
passage, sparks, result screen avec rang. `crashPoint()` intact (edge 0.94),
comme le patch le demandait.

Manque :

- pas de détection de *near-miss* réelle — les « safe sparks » se déclenchent
  au cashout, pas quand le joueur sort juste avant la rupture ;
- meilleur cashout et safe-streak non persistés ;
- variantes de run (moteurs différents, assurance locale) pas commencées.

### 4. Neon Circuit — 🟡

`js/games/neon-racer/neon-racer.js` (581 l.). Le virage vers le circuit 2D a
bien eu lieu : ruban de route construit par normales le long d'une spline,
caméra accrochée au véhicule, 10 districts nommés avec palettes et annonce de
secteur, 3 véhicules différenciés, drift / boost / bouclier / hors-piste.

Manque :

- **pas de tours, checkpoints ni secteurs** — le HUD n'a pas de lap, alors que
  la guideline en fait un objectif de run ;
- objectifs de run absents (distance seule) ;
- le jeu tourne **hors du wallet commun** : il garde sa propre copie de
  `credits` et passe par `onCreditsChange`, au lieu des `debit` / `credit` du
  core comme les trois autres.

### 5. Coin Reactor — 🟡 3/5

`js/games/slot-machine/slot-machine.js` (207 l.). Fait : CSS extrait, paytable
visible, phase « coin drop » purement cosmétique (`slot-machine.js:180`).

**Pas commencé** : les modules roguelite (bumper, amplifier, teleporter,
splitter, magnet, gate), la grille de placement avant la chute, et la
simulation RTP.

Note technique : chaque case est tirée indépendamment (`randomGrid()`), il n'y
a pas de bandes de rouleaux. Le RTP « ~90% » annoncé dans le README n'a jamais
été mesuré et ne peut pas l'être sans le simulateur.

## Ce qui bloque la jouabilité

### ~~La mise est relue à la fin de la run~~ — corrigé (`31f9f45`)

Drone Bash et Hyperjump relisaient `getBet()` au moment du résultat alors que
le panneau restait cliquable : on lançait à 1 ST, on montait à 100 avant la
fin, le gain tombait sur 100. Vérifié en jeu avant correctif — les six presets
répondaient en pleine phase WARMUP.

Les deux jeux capturent désormais le montant prélevé dans `stake` au
lancement, et le core expose `lockBet()` : les handlers testent `betLocked` en
plus de `disabled`, donc un panneau re-rendu ne rouvre pas une mise payée.
Hyperjump attend la rupture plutôt que le cashout pour lever le verrou.

Coin Reactor capturait déjà sa mise dans `spin()` ; il a reçu le verrou pour
la cohérence.

### Perf — le hack de renommage tourne à 60 fps

`index.html:120` observe `document.body` en `characterData + subtree`, et
chaque mutation relance un `createTreeWalker` sur tout le document
(`index.html:67`) pour remplacer « CHRONICLES » par « STAR TOKENS ». Drone Bash
et Hyperjump écrivent du texte de HUD à chaque frame → parcours complet de
l'arbre à chaque frame.

Correctif : corriger les chaînes à la source et supprimer l'observer. Reste à
reprendre `star-arcade-core.js:179` et `:192`, qui donnent d'ailleurs
« CONVERSION STAR TOKENS PLUS TARD » et « STAR TOKENS BLOQUÉS » après
remplacement — des phrases qui ne veulent plus rien dire. `slot-machine.js`
est déjà passé aux Star Tokens.

### Tactile — absent partout

Aucun `touchstart` ni `pointerdown` dans `js/`. Neon Circuit est clavier-only
(flèches + espace) : **injouable sur mobile dans l'iframe**, ce qui casse la
definition of done de la guideline. Les trois autres passent parce qu'ils sont
en DOM cliquable.

### Économie — aucun enjeu

Bonus d'accueil de +10 000 ST (`index.html:96`), bouton « +1000 ST » toujours
disponible, et des formules très généreuses :

- Drone Bash : `mise × score / 12` — un score de 60 rend ×5 la mise ;
- Neon Circuit : `mise × dist/220 × risque + drift`, **doublé** pour BAROSSA —
  une run de 2 000 m rend ~450 ST pour 50 misés.

Rien n'est jamais perdu. À rebalancer, mais après le simulateur RTP et pas
avant : la guideline sépare explicitement gameplay et balance.

### Environnement — l'arcade n'était pas testable hors prod

`index.html:44` importe `/shared/guards.js`, servi seulement par la racine de
nitro.sterenna.fr, et qui exige une session Supabase. Hors de cette racine la
page affichait « Star Arcade indisponible » ; en prod non connecté elle
redirige vers `/login.html`.

**Résolu** par `scripts/dev-arcade.mjs` (`npm run dev:arcade`) — voir plus bas.

### CSP — l'iframe est déjà en violation

Sur nitro, `frame-src` n'autorise que `www.youtube.com` et `player.twitch.tv`.
L'iframe de `/arena/arcade` viole la règle, mais celle-ci est en
**report-only**, donc ça passe. Le jour où la CSP est appliquée, la page
arcade devient blanche. À traiter côté plateforme, pas ici.

### Vitrine — elle annonce l'ancien jeu

- `src/app/page.tsx:225` : cartes hardcodées « Whack-a-Mole / Crash / Slot
  Machine / Neon Racer », les 4 pointant sur `/arcade` sans deep-link.
- `src/app/arcade/page.tsx:11` : le marquee liste les mêmes anciens noms.
- Dans le lobby lui-même, `gc-title` affiche l'ancien nom en gros et le nom de
  borne en petit au-dessus : c'est « WHACK-A-MOLE » qui saute aux yeux, pas
  « DRONE BASH ».
- Les 4 `js/games/*/README.md` décrivent l'état d'**avant** la refonte
  (« taupes », « axes alternés tous les 500 m »).

## Harnais local

`scripts/dev-arcade.mjs` rejoue la topologie de prod sans dépendance :

```txt
/arena/...          →  <repo>/public/
/...                →  gwen-ha-star-static/   (css, shared/images, /star/)
/shared/guards.js   →  stub de session invitée
```

```bash
npm run dev:arcade
```

puis `http://127.0.0.1:4173/arena/arcade-casino/`.

Le stub vit uniquement dans le script : rien dans `public/` ne change, aucun
chemin d'authentification n'est touché en production. Il affiche un bandeau
« MODE DEV LOCAL · SESSION INVITÉE » pour qu'on ne le confonde pas avec une
vraie session.

`STAR_ROOT` pointe par défaut sur `../gwen-ha-star-static`. Sans ce repo à
côté, l'arcade se lance quand même mais sans thème ni sprites.

## Ordre proposé

1. ~~Harnais local~~ — fait.
2. ~~Capturer la mise au lancement, verrouiller le bet panel pendant la run~~
   — fait (`31f9f45`).
3. Supprimer l'observer de renommage en corrigeant les chaînes à la source.
   Reste `star-arcade-core.js:179` et `:192` — `slot-machine.js` est déjà
   passé aux Star Tokens.
4. Contrôles tactiles partagés, Neon Circuit en premier.
5. Finir Neon Circuit : tours, checkpoints, objectifs, wallet du core.
6. Coin Reactor : modules roguelite, puis simulateur RTP.
7. Rebalancer les payouts, puis remettre vitrine et README à jour.

## Hors arcade — à savoir

`games/` (atelier) et `public/games/` (déployé) divergent : le moteur VFX du
commit `c26227b` n'existe que dans `games/dungeon_elf_sound/` (index.html de
37 l. qui charge `vfx-engine.js`), alors que `public/games/dungeon-elf-sound/`
sert encore l'ancienne version de 155 l. **Le travail VFX n'est pas en ligne**,
et il n'existe aucun script de synchronisation entre les deux arbres.
