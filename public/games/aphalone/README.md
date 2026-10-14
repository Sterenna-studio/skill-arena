# Aphalone — Crystal Quest Web

> Repris du dépôt archivé `Sterenna-studio/aphalone-crystal-quest` (commit `25dbb2d`). En ligne sur Skill Arena : `/arena/games/aphalone/` ; l'ancienne adresse `/rpg/` n'est plus servie.

Prototype HTML/CSS/JS jouable.

## Inclus
- Intérieur de taverne jouable
- Transition taverne ↔ landes extérieures d'Aphalone
- Déplacement ZQSD par défaut avec menu de configuration
- Combats magiques en vue de côté
- Mini-jeu de rythme : appuyer sur la bonne touche au bon moment pour lancer un sort
- Ciblage automatique des ennemis
- Ennemis qui avancent à chaque erreur et attaquent à portée
- Dash avec jauge d'énergie
- Progression warlock : niveau, XP, points de sort et arbre de sorts
- Bâton de pacte comme arme principale
- Boss de fin après les 5 cristaux
- Tonics à ramasser et utiliser
- Minicarte intégrée au HUD
- Pause et sauvegarde locale avec reprise de partie
- Contrôles tactiles pour mobile/tablette
- Slimes avec points de vie
- Cristaux à collecter
- Dialogues avec portraits de réaction d'Ardamir
- Sprite de marche d'Ardamir utilisé pour le personnage principal
- Texte de combat flottant (dégâts, soins, ramassages)
- Bonus de timing parfait dans les duels (dégâts +1, énergie réduite)
- Cinquième sort : Foudre runique (niv. 3, 2 points, 3 dégâts)
- XP gagnée aussi sur les éliminations à la mêlée
- Nouvel ennemi : Spectre d'Aphalone (plus rapide, plus résistant, duel au timing plus serré, XP doublée)

## Contrôles
- **ZQSD** : bouger par défaut
- **Configuration** : menu pour changer les touches ou passer en WASD
- **Flèches** : déplacement de secours
- **Espace** : lancer / entrer dans un duel magique
- **Touches affichées dans le duel** : lancer le sort au bon timing
- **E** : interagir / entrer-sortir / parler
- **Shift / X** : dash
- **R** : utiliser un tonic
- **Échap / P** : pause
- **Entrée / Espace / clic** : avancer les dialogues
- **Mobile/tablette** : boutons tactiles affichés sur le canvas

## Objectif
1. Parler à Jean-Dolmac dans la taverne
2. Sortir dans les landes d'Aphalone
3. Récupérer 5 cristaux
4. Combattre les slimes en duels de rythme
5. Vaincre le gardien cristallin
6. Revenir dans la taverne
7. Parler à Jean-Dolmac pour finir

## Lancer
Ouvre `index.html` dans un navigateur, ou lance un serveur local :

```bash
python -m http.server 4173 --bind 127.0.0.1
```

Puis ouvre `http://127.0.0.1:4173/`.

## Structure
- `index.html`
- `styles.css`
- `script.js`
- `assets/walk/` : frames de marche
- `assets/portraits/` : portraits de dialogue
