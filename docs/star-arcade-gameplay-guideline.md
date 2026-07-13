# Star Arcade - gameplay guideline

Objectif : transformer les modules `public/arcade-casino/js/games/` en vrais mini-jeux arcade retro-cyberpunk, avec une logique de borne : le joueur choisit une machine, l'ecran passe en mode jeu, le HUD prend le dessus, puis la run donne un resultat clair, satisfaisant et rejouable.

Cette guideline ne change pas encore l'economie. Les Star Tokens restent locaux tant que l'audit ledger/Chronicles n'est pas fait.

## Vision commune

Chaque jeu doit suivre le meme rythme :

1. **Attract mode** : carte de borne dans le lobby, visuel anime, promesse lisible, dernier score ou record local.
2. **Insert / contrat** : choix de mise ou de run, sans noyer le joueur dans les regles.
3. **Boot screen** : transition plein ecran arcade, bruit court, countdown, nom du jeu.
4. **Run courte** : boucle principale de 30 a 90 secondes, input direct, score visible, objectifs intermediaires.
5. **Moment de payout** : resultat dramatise, score, multiplicateur, gain/perte, bonus declenches.
6. **Retry immediat** : rejouer, changer machine, retour lobby.

Le feeling doit venir de petites recompenses frequentes : sons, impacts, particules, combo, "near miss" lisible, jackpot visuel rare, et progression de run. Eviter les boucles predatrices : pas de pression artificielle, pas de faux compte a rebours monetise, pas de mecanique cachee qui pousse a miser plus.

## Shell arcade commun

A ajouter avant de refaire les jeux un par un :

- `arcade cabinet` commun autour des jeux : bezel, scanlines, marquee, haut-parleurs, boutons fictifs.
- Mode `.casino-game.active` plus immersif : largeur plus grande, canvas ou scene centrale prioritaire, HUD accroche a l'ecran.
- Transition commune `showGame(id)` : selection de borne -> boot overlay -> lancement.
- Result screen commun : score, rang, gain net, meilleur score local, boutons rejouer/lobby.
- Stockage local par jeu : high score, best combo, nombre de runs, derniere run.
- SFX et micro-feedback communs : click, start, hit, combo, jackpot, crash, payout.

## Regles de transformation

- Ne pas modifier les probabilites, tables de gains ou conversion credits dans un patch visuel.
- Separer les changements : `shell arcade`, puis `gameplay`, puis `balance`.
- Chaque jeu doit garder une duree courte et une promesse simple.
- Chaque jeu doit avoir au moins trois couches de succes :
  - succes frequent : hit, piece, drift, cashout safe ;
  - succes de run : combo, objectif, distance, ligne gagnante ;
  - succes rare : jackpot, perfect, overdrive, gros multiplicateur.
- Les pertes doivent donner une information utile : pourquoi la run s'arrete, comment faire mieux, quel risque a ete pris.

## Audit rapide actuel

### Whack-A-Mole

Etat actuel : grille de 12 trous, 30 secondes, types ponderes, combo jusqu'a x8, bombes qui cassent le combo. Le gain est `mise * score / 12`.

Probleme : bon squelette reflexe, mais theme trop generique et feedback limite. Il faut le transformer en borne de tir/maintenance cyberpunk.

Direction : **"Drone Bash Terminal"**.

Gameplay cible :

- Remplacer les taupes par drones, glitchs, batteries et virus.
- Ajouter des vagues lisibles : warming, overload, meltdown.
- Ajouter un score arcade distinct du payout : score, precision, combo max, perfect streak.
- Ajouter des bonus de run :
  - `battery` : ralentit les spawns 3 secondes ;
  - `overclock` : double les points pendant une courte fenetre ;
  - `virus` : piege qui inverse la couleur ou casse le combo ;
  - `gold drone` : cible rare a gros score.
- Ajouter des objectifs intermediaires toutes les 10 secondes pour creer du rythme.

Patch recommande :

1. Re-theme visuel et HUD.
2. Ajouter stats de run et result screen.
3. Ajouter bonus/pouvoirs sans changer la formule de payout.
4. Seulement ensuite rebalancer score -> gain.

### Crash

Etat actuel : multiplicateur exponentiel, crash point random avec edge alpha, auto-eject, graphe canvas, historique local.

Probleme : le jeu est fonctionnel mais ressemble encore a un graphe de casino. Il doit devenir une sequence d'echappee arcade.

Direction : **"Hyperjump Crash"**.

Gameplay cible :

- Garder le coeur : cashout avant rupture.
- Remplacer le graphe seul par une scene de tunnel/propulsion.
- Ajouter des paliers visibles : x1.25, x1.5, x2, x3, x5.
- Ajouter une jauge de stabilite qui tremble quand le risque monte.
- Ajouter des "safe sparks" quand le joueur cashout juste avant une rupture.
- Ajouter un mode de lecture des runs : historique avec couleurs, streak safe, meilleur cashout.

Patch recommande :

1. Ameliorer la scene canvas sans toucher `crashPoint()`.
2. Ajouter feedback de tension : shake, alarmes, couleur moteur.
3. Ajouter result screen detaille.
4. Ensuite envisager variantes de run : moteurs differents, assurance locale, objectifs de streak.

### Slot Machine

Etat actuel : slot 5x3, 5 lignes, symboles ponderes, payout gauche vers droite, RTP alpha autour de 90%.

Probleme : mecanique trop passive. Pour devenir un vrai mini-jeu arcade, il faut ajouter de l'agence entre les spins, pas seulement lancer les rouleaux.

Direction : **"Coin Reactor"** plutot que simple slot.

Gameplay cible :

- Garder les symboles et lignes comme moteur de resultat initial.
- Apres le spin, transformer le gain potentiel en pieces qui tombent dans une petite machine physique 2D.
- Ajouter des elements roguelite a placer entre les runs :
  - `bumper` : fait rebondir une piece et ajoute +x% ;
  - `amplifier` : augmente la valeur des pieces qui passent dedans ;
  - `teleporter` : renvoie une piece en haut une fois ;
  - `splitter` : chance de dupliquer une petite piece ;
  - `magnet` : attire les pieces vers une zone bonus ;
  - `gate` : multiplicateur si la piece traverse avec assez de vitesse.
- Le joueur gagne des modules temporaires via des symboles speciaux, pas par achat permanent au depart.
- Les modules doivent etre places sur une grille simple avant la chute.

Patch recommande :

1. Extraire les styles inline vers CSS.
2. Ajouter paytable visible et result screen.
3. Ajouter une phase "coin drop" purement visuelle qui ne change pas encore les gains.
4. Ensuite activer les modules comme multiplicateurs bornes.
5. Ajouter simulation/debug RTP avant toute vraie modification du payout.

### Neon Racer

Etat actuel : pseudo-3D OutRun, route procedurale par segments, 3 vehicules differencies, obstacles, boost, drift, vies par contrat.

Probleme : techniquement le plus avance, mais la demande visuelle va plutot vers sprites 2D side/top circuit. Il faut choisir une direction stable avant de patcher.

Direction recommandee : **"Neon Circuit"**, petit circuit 2D vu de dessus ou trois-quarts, camera accrochee au vehicule.

Pourquoi : les sprites vehicules 2D sont deja la, les capacites differentes peuvent etre plus lisibles, et les courbes procedurales peuvent donner une sensation de vitesse sans simuler une vraie 3D.

Gameplay cible :

- Camera centree autour du vehicule, route qui defile sous lui.
- Circuit procedurale en spline/courbes : virages, lignes droites, chicanes, zones boost.
- Vehicule accroche au terrain : friction, drift, sortie de route, vibreur.
- Trois vehicules bien differencies :
  - `MASH` : leger, drift facile, combo drift plus fort ;
  - `CITROEN AX` : stable, bouclier/recuperation, parfait pour debuter ;
  - `BAROSSA` : rapide, lourd, gros payout si run propre.
- Objectifs de run : distance, checkpoints, drift chain, pieces, no-crash streak.
- HUD arcade : speed, lap/sector, boost, combo, damage, score.

Patch recommande :

1. Garder l'ecran selection vehicule.
2. Prototyper une scene 2D circuit separee derriere un flag ou une nouvelle classe.
3. Reutiliser les stats vehicules actuelles.
4. Ajouter collisions simples route/offroad/bonus.
5. Basculer le payout distance/drift seulement apres validation du feeling.

## Ordre de refonte recommande

1. **Shell arcade commun** : borne, transition, HUD commun, result screen.
2. **Whack-A-Mole -> Drone Bash** : refonte rapide, faible risque, bon test pour feedback/combo.
3. **Crash -> Hyperjump Crash** : refonte visuelle canvas, logique intacte.
4. **Neon Racer -> Neon Circuit prototype** : gros changement de gameplay, a isoler proprement.
5. **Slot -> Coin Reactor** : plus ambitieux, necessite simulation RTP avant de toucher aux gains.

## Definition of done par jeu

- Le jeu se lance depuis une borne identifiable.
- L'ecran de jeu prend le focus, sans impression de page web.
- Le joueur comprend quoi faire en moins de 5 secondes.
- Il y a score, combo ou progression visible pendant la run.
- La fin de run donne une envie claire de rejouer : meilleur score, presque reussi, bonus rate, prochain objectif.
- Mobile reste jouable dans l'iframe `/arcade`.
- Les credits affiches restent coherents avec l'historique.

