# 🎮 BZH Chronicles: Cyber Cellules - v3

## ROGUE-LITE CYBERPUNK COMPLET

Une v3 hybride combinant :
- ✅ **Moteur de la v1** : Architecture robuste, rooms/stages, progression claire
- ✅ **Complétude de la v2** : Multi-personnages, talents globaux, achievements
- ✅ **Système d'EXP** : Orbes à collecter avec fusion automatique + zone de collecte upgradable
- ✅ **Boss** : Salle 5/15/25... mini-boss | Salle 10/20/30... boss majeur
- ✅ **Ennemis v1** : Bestiaire classique, pas d'ennemis armés v2
- ✅ **Design Cyberpunk** : Néons, scanlines, glows, polices custom
- ✅ **Statistiques** : XP gagnée par run/cumul, zone de collecte visible et upgradable

---

## 📦 FICHIERS FOURNIS

### index-v3.html
Structure HTML complète avec :
- Menu avec sélection de personnages
- Écran de talents/upgrades globaux
- HUD de jeu (HP, stage, room, ennemis, EXP, zone)
- Overlays (pause, game over, upgrades)
- Canvas pour le rendu

### app-v3.js
Moteur complet (2000+ lignes) :
- **Système EXP** :
  - Orbes colorées par valeur (1/10/100/1000)
  - Fusion automatique des orbes proches
  - Magnétisme vers zone de collecte
  - Stats XP par run + cumul
  
- **Zones de collecte** :
  - Rayon 120px de base
  - Upgradable via talents (+10 par niveau)
  - Visible en jeu (cercle semi-transparent)
  - Affichée dans HUD
  
- **Progression** :
  - Stages/Rooms (5 rooms = 1 stage)
  - Room 5/15/25 = mini-boss
  - Room 10/20/30 = boss majeur
  
- **Boss** :
  - 1.5× HP pour majeur, 0.8× pour mini
  - Pattern d'attaque (salves projectiles)
  - Reward généreuse (100 XP)
  
- **Talents globaux** (non-perso) :
  - Zone Collectrice +10 px/niv
  - Harvest +5% XP/niv
  - Taux de Drop +10% orbes/niv
  
- **Personnages** :
  - Néo-Druide (base, débloqué)
  - Cyber-Corsaire (500 XP)
  - Tech-Chaman (1000 XP)
  - Marcheur du Vide (1500 XP)
  
- **Upgrades in-run** (3 choix par room complétée) :
  - Vitalité (+20 HP)
  - Surcharge (+15% DMG)
  - Boost Quantique (+10% SPD)
  - Accélérateur Temporal (-10% cooldown)
  - Zone Élargie (+30 zone)
  - Magnet XP (attirance bonus)

### style-v3.css
Feuille de style cyberpunk complète (2500+ lignes) :
- **Typographie** : Orbitron pour titres, Share Tech Mono pour chiffres
- **Effets** : Scanlines animées, glows cyan/magenta, animations pulse/flicker
- **Layout** : Responsive, clip-path angulaires, gradients néon
- **Composants** : Buttons, cards, bars, overlays, grilles
- **Couleurs** : Cyan, Magenta, Yellow, Green, Blue, Violet (système cohérent)

### README.md
Ce fichier

---

## 🚀 INSTALLATION RAPIDE

### 1. Télécharge les 3 fichiers
```
index-v3.html
app-v3.js
style-v3.css
```

### 2. Mets-les dans le même dossier

### 3. Ouvre `index-v3.html` dans un navigateur moderne
- Chrome ✅
- Firefox ✅
- Safari ✅
- Edge ✅

---

## 🎮 COMMENT JOUER

### Démarrage
1. Sélectionne un personnage (seul Néo-Druide est débloqué au démarrage)
2. Regarde les talents globaux (optionnel)
3. Lance la mission

### Gameplay
- **WASD / Flèches** : Déplacement
- **Tir automatique** : Vers l'ennemi le plus proche
- **ESC** : Pause
- **Collecte XP** : Automatique dans la zone visible

### Progression
- Tue les ennemis → Gagne du score + XP
- Complète une room → Choisis 1 upgrade parmi 3
- XP se fusionne automatiquement (1→1, 10→10, 100→100, 1000→1000)
- Zones 5/10/15... déclenchent boss

### XP Orbes
- 🟢 Vert = 1 XP
- 🔵 Bleu = 10 XP
- 🟣 Violet = 100 XP
- 🟡 Or = 1000 XP
- **Automatiquement attirées** dans la zone de collecte
- **Se fusionnent** quand proches

---

## 📊 SYSTÈMES CLÉS

### 1. ZONE DE COLLECTE

**Base** : 120px de rayon autour du joueur
- Visible comme cercle semi-transparent cyan

**Upgrades** :
- Talent "Zone Collectrice +" : +10 px par niveau (max 10 = +100 px total)
- Upgrade in-run "Zone Élargie" : +30 px par prise

**Affichage HUD** : "ZONE: 120px" mis à jour en temps réel

### 2. SYSTÈME D'XP

**Génération** :
- À la mort de chaque ennemi : 10 + stage×2 XP
- Boss : 100 XP (généreux)
- Multiplicateurs : talents Harvest (+5% par niveau)

**Fusion** :
- Distance de fusion : 30px
- Deux orbes de même valeur se mergent
- Nouvelle orbe = somme des deux
- Grade augmente si fusion en palier supérieur

**Collecte** :
- Orbes attirent vers joueur dès l'entrée en zone
- Speed d'attraction : 5 + magnet×2 px/frame
- Collection = destruction + particules feedback

### 3. BOSS CYCLES

| Room | Type |
|------|------|
| 5 | Mini-boss (0.8× HP) |
| 10 | BOSS (1× HP) |
| 15 | Mini-boss (0.8× HP) |
| 20 | BOSS (1× HP) |
| 25 | Mini-boss (0.8× HP) |
| 30 | BOSS (1× HP) |

**Stats** :
- HP base : 200 × mult × (1 + stage × 0.15)
- Attaque : Salves de 3 projectiles
- Pattern : Attack toutes les 60-100 frames

### 4. TALENTS GLOBAUX

Non-spécifiques au personnage, persistants :

```
Zone Collectrice +
├─ Coût : 100 XP
├─ Max niveau : 10
├─ Par niveau : +10 px zone
└─ Total max : +100 px (220px zone)

Harvest +
├─ Coût : 150 XP
├─ Max niveau : 10
├─ Par niveau : +5% XP
└─ Total max : +50% XP gagné

Taux de Drop
├─ Coût : 100 XP
├─ Max niveau : 5
├─ Par niveau : +10% orbes
└─ Total max : +50% drop rate
```

---

## 💾 SAUVEGARDE

Tout est stocké en `localStorage` avec clé `cyberCellulesV3` :

```json
{
  "bestScore": 12500,
  "bestStage": 25,
  "totalExpEarned": 450000,
  "unlockedCharacters": ["neo_druid", "cyber_corsaire"],
  "talents": {
    "exp_zone": 5,
    "exp_gain": 3,
    "pickup_rate": 2
  }
}
```

---

## 🎨 DESIGN CYBERPUNK

### Palette
- **Cyan** (#00ffff) : Primary, HUD, borders
- **Magenta** (#ff00ff) : Accents, secondary
- **Yellow** (#ffff00) : Scores, numbers
- **Green** (#00ff88) : HP, health
- **Violet** (#8000ff) : XP 100
- **Gold** (#ffd700) : XP 1000

### Effets
- Scanlines animées (mouvement vertical)
- Glow sur textes/buttons/éléments
- Clip-path angulaires (cyber-aesthetic)
- Gradient radial fond (radiance)
- Animations pulse/flicker
- Ombres inset

---

## 🔄 STATISTIQUES EN JEU

### HUD Affichage
- XP Cette Run : 0 → ∞ (côté score)
- Zone Collecte : 120-220+ px (côté score)
- Temps depuis mort ennemis dans HUD au pause

### Stats Écran Game Over
- Score Final
- Étage Atteint
- Ennemis Éliminés
- XP Gagnée
- Temps Survie

### Menu Stats Globales
- Meilleur Score
- Meilleur Étage
- XP Total Gagnée (cumul)
- Zone Collecte Actuelle (avec talentbonus)

---

## 🎭 PERSONNAGES (4)

### 1. Néo-Druide ✅
- **Débloqué** : De base
- **HP** : 120 | **SPD** : 90 | **DMG** : 95 | **RGN** : 2
- **Couleur** : Vert Cyan
- **Playstyle** : Équilibré avec régénération

### 2. Cyber-Corsaire
- **Coût** : 500 XP
- **HP** : 80 | **SPD** : 130 | **DMG** : 110 | **RGN** : 0
- **Couleur** : Cyan
- **Playstyle** : Ultra rapide, peu tanky

### 3. Tech-Chaman
- **Coût** : 1000 XP
- **HP** : 100 | **SPD** : 80 | **DMG** : 85 | **RGN** : 1
- **Couleur** : Magenta
- **Playstyle** : Équilibré, bon survie

### 4. Marcheur du Vide
- **Coût** : 1500 XP
- **HP** : 90 | **SPD** : 100 | **DMG** : 150 | **RGN** : 0
- **Couleur** : Violet
- **Playstyle** : One-shot mais fragile

---

## 🐛 DEBUGGING

### Ouvrir DevTools
- **F12** ou **Ctrl+Shift+I** (Windows/Linux)
- **Cmd+Option+I** (Mac)

### Console Logs Clés
```javascript
// Vérifier la sauvegarde
window.game.saveData

// Sauvegarde force
window.game.saveGameData()

// Charger les données
window.game.loadGameData()

// Donner XP pour test
window.game.expThisRun += 1000; window.game.updateHUD()

// Trigger boss pour test
window.game.isBossRoom = true; window.game.spawnBoss()
```

---

## 🚀 PROCHAINES ÉTAPES POSSIBLES

### V4 Enhancements
- Ennemis armés (lasers, mines, flammes) de la v2
- Armes spéciales par personnage
- Boutique meta avec upgrades permanents
- Leaderboard cloud (Supabase)
- Animaux/familiars à recruter
- Difficulté +20% par étage

### Gameplay
- Paliers d'étage (tous les 10) avec thème visuel différent
- Boss patterns plus complexes
- Items équipables
- Combinaisons d'upgrades (synergies)

### Tech
- Séparation physique/rendu (fixed timestep)
- Pooling des entities/projectiles
- Audio (musique synthwave, SFX)
- Telemetry/analytics

---

## 📄 LICENSE & CREDITS

**BZH Chronicles** - Projet Rogue-Lite Educational

Design & Code : Full Custom Cyberpunk Implementation
Inspiration : Vampire Survivors, Hades, Noita
Music : Synthwave/Cyberpunk

---

## ❓ FAQ

### Q: Pourquoi mes orbes n'apparaissent pas ?
**A**: Vérifie que tu as tué un ennemi et que la zone de collecte est visible. Les orbes naissent autour du point de mort.

### Q: Comment débloquer les personnages ?
**A**: En accumlant XP between runs. Check le menu "Talents" pour voir les coûts et progresser.

### Q: Les boss sont trop forts ?
**A**: Prends les upgrades "Vitalité" et "Zone Élargie" pour survivre, puis "Surcharge" pour DPS.

### Q: Comment agrandir la zone ?
**A**: Talent "Zone Collectrice +" dans le menu talents (coûte 100 XP, max 10 niveaux).

### Q: Pourquoi pas d'ennemis armés ?
**A**: v3 conserve le bestiaire v1 pour stabilité. Les armés avec armes spéciales viennent potentiellement en v4.

---

## 🎮 BON JEU !

Bienvenue dans **CYBER CELLULES v3**.

Survive. Collect XP. Upgrade. Repeat.

**Good luck, runner.** 🌐⚡

---

**Version**: 3.0.0  
**Last Updated**: 2025-11-05  
**Status**: Production Ready ✅
