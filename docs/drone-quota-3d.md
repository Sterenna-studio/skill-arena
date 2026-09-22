# Drone Quota 3D

Variante WebGL disponible à `/arena/games/drone-quota/?view=3d` depuis le
catalogue et le menu de Drone Quota. Lancer `npm run dev:arcade`, puis ouvrir
<http://127.0.0.1:4173/arena/games/drone-quota/?view=3d>.

Le plateau, les sept familles de cibles et les tourelles sont des volumes
procéduraux éclairés par face. Aucun moteur externe, CDN, modèle ou texture
n'est téléchargé. La caméra fixe conserve les douze ports visibles.

## Règles et sauvegarde

La version 3D utilise les mêmes scripts, règles, préférences et sauvegarde que
la 2D : quotas sur trois rounds, chaînes, BOOST, boucliers, parade, atelier et
prestige. Les achats et records sont partagés ; réinitialiser la progression
affecte donc les deux vues. Le lien de changement de vue est dans le menu.
Ajouter `&essais` pour retrouver les quatre modes de frappe expérimentaux.

`game.js` fournit uniquement `DQView.ports()`, une projection en lecture de
l'état utile au rendu. `view3d.js` ne calcule ni scores ni dégâts. Les boutons
HTML existants sont positionnés avec la même projection que les modèles :
clic, balayage, clavier, libellés accessibles et effets continuent de passer
par les gestionnaires originaux. `view3d.css` ne s'applique qu'en mode 3D.
Le zoom CSS de duel est neutralisé pour conserver l'alignement du canvas et
des zones interactives ; la jauge de parade reste au premier plan.

Les effets réduits désactivent oscillations et transitions de sortie. Le
rendu est suspendu hors du plateau et lorsque l'onglet est masqué. La densité
de pixels est plafonnée à 2. Sans WebGL, ou lors d'une perte de contexte, le
plateau 2D reprend les interactions sans interrompre la run.

## Vérification

`node scripts/check-drone-quota-3d.mjs` utilise un Chrome de test exposant CDP
sur le port 9333 et le serveur arcade sur 4173. Utiliser un profil jetable,
car le script lance une run et configure les préférences de ce profil.
Exemple PowerShell, après lancement du serveur :

```powershell
Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -WindowStyle Hidden -ArgumentList '--headless=new','--remote-debugging-port=9333','--user-data-dir=C:\DEV\repos\skill-arena\node_modules\.cache\dq3d-chrome','--no-first-run','about:blank'
node scripts/check-drone-quota-3d.mjs
```

Le harnais vérifie des clics réels sur les zones projetées, un gain de score,
un coup de bouclier, le déclenchement d'un duel, les douze zones de frappe
à 1100 et 375 px, l'absence de débordement et d'exception JavaScript, puis le
repli après perte de contexte WebGL. Les captures sont enregistrées dans
`node_modules/.cache/dq3d-validation/` (ignoré par Git).

Validation initiale : ces contrôles, TypeScript et le build Next passent.
Le lint global conserve sept erreurs JSX préexistantes. Les captures ont été
inspectées ; le confort de jeu prolongé, le son et les performances sur un
téléphone physique restent à éprouver.
