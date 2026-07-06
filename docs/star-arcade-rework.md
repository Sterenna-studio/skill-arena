# Star Arcade — rework UI

Objectif : retravailler l'écran Arcade accessible depuis Gwen Ha Star sans casser les mini-jeux existants.

## Priorités visuelles

- Donner au lobby une vraie identité de terminal Star : cadre lumineux, header plus immersif, scanlines légères.
- Rendre les cartes de jeux plus lisibles : icône cadrée, titre fort, description courte, bouton d'action clair.
- Clarifier la session : solde, nombre de parties, résultat net local, historique plus lisible.
- Garder le style néon / cockpit déjà présent dans la Star connectée.

## Patch recommandé

1. Ajouter une surcouche CSS dédiée :

```txt
public/arcade-casino/css/star-arcade-polish.css
```

2. La charger dans :

```txt
public/arcade-casino/index.html
```

juste après :

```html
<link rel="stylesheet" href="./css/casino.css">
```

3. Optionnel : ajouter un petit module runtime :

```txt
public/arcade-casino/js/casino-polish.js
```

pour enrichir le lobby avec un panneau de session sans modifier les jeux.

## Contraintes

- Ne pas modifier les mécaniques de crédit dans ce patch UI.
- Ne pas changer les probabilités, gains ou règles de jeu.
- Garder le patch réversible : CSS/module séparé plutôt que réécriture du core.
- Vérifier mobile : le lobby doit rester utilisable en iframe dans `/arena/arcade`.

## Points à revoir ensuite

- Remplacer les écritures directes sur `profiles.chronicles` par des RPC/ledger si l'économie Star doit devenir canonique.
- Ajouter un historique serveur si on veut suivre les sessions au-delà du local runtime.
- Harmoniser le style avec les hero cards Star : orb, badge, grille perspective, terminal cards.
