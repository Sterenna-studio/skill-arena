# Nécrobutinage

Jeu de gestion de colonie en temps réel pausable. Le joueur dirige une colonie
de *Trigona*, des abeilles sans dard nécrophages (« abeilles-vautours »), et doit
tenir une année de quatre saisons.

## Boucle

- **Carcasses** : elles apparaissent dans la forêt et passent de fraîche à mûre
  puis putride. Plus elles pourrissent, plus la chair se découpe vite, mais plus
  elle rapporte de microbes. Le joueur y affecte des équipes de butineuses.
- **Pots de cérumen** : la viande y mûrit et perd sa charge microbienne. La
  viande crue sans pot pourrit et se charge encore.
- **Infection** : alimentée par la viande consommée, résorbée lentement. Au-delà
  de 30 % le couvain meurt, au-delà de 60 % les ouvrières aussi.
- **Rôles** : butineuses, nourrices (capacité du couvain), gardiennes (raids de
  fourmis annoncés la veille), bâtisseuses (cérumen pour pots et cellules).
- **Microbiome** : la viande mûrie consommée rapporte des points de recherche.
- **Fin** : effondrement sous 5 ouvrières, ou année bouclée. Une année bouclée
  avec 60 ouvrières ou plus donne un essaimage, dépensé en bonus permanents.

## Fichiers

- `index.html`, `style.css` : interface DOM, carte sur `<canvas>`.
- `game.js` : règles et interface. Tous les leviers d'équilibrage sont dans
  `BALANCE`, en tête de fichier.
- `fx.js` : sons synthétisés en WebAudio, sans connaissance des règles.

Aucune dépendance ni fichier externe. Sauvegarde locale : `necrobutinage:v1`
(record, essaimages, bonus, son).

Couture de test : `window.__necro` expose l'état (`colony`), `BALANCE`,
`advance(jours)` pour avancer la simulation sans attendre l'horloge,
`spawnCarcass()` et `newColony()`.

Inspiration scientifique : le régime nécrophage de certaines *Trigona* et leur
microbiote intestinal riche en bactéries acidophiles ; les valeurs du jeu sont
des choix de jeu, pas des mesures.
