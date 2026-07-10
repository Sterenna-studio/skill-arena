# 🌳 Gold Garden Pro - Version Ultime

> **Statut Skill Arena** — ✅ Branché sur le hub (slug `lab-garden`,
> `public/games/lab-garden/`). Le jeu tourne en 100% localStorage
> (`game.js` ligne 1) — `SUPABASE_SETUP.sql` ci-dessous est **obsolète**,
> conservé pour référence historique seulement. Voir [`../README.md`](../README.md).

Jeu de farming très ambitieux avec des systèmes de progression complexes et secrets cachés.

## 📦 Installation

1. Décompresse dans `www/lab/farming_v2/`
2. Exécute les SQL Supabase
3. Accède via `https://sterenna.fr/lab/farming_v2/`

## 🎮 Systèmes de Jeu

### 1. 🌱 Système de Graines
6 types de graines avec progression de tiers:
- **Commune** (50💰) → Rare → Épique → Légendaire
- Chaque tier: temps réduit x1.8, or augmenté x2.0
- **Graines Spéciales**:
  - ⚡ Plante Croissance (boost croissance pots adjacents +10%/tier)
  - 💰 Plante Or (boost gold pots adjacents +5%/tier)

### 2. 🏪 Boutiques
**Boutique Fleuriste** 🌸
- Acheter les graines
- Accumulation dans le sac à dos

**Boutique Jardinier** 🧙‍♂️
- 📦 Augmenter pots: 6 → 9 → 12 → 20
- ✨ Luck: +5% → +20% (récolte dorée x3)
- ⏱️ Cooldown: -20% → -60%
- 💎 Spéciaux (progressifs)

### 3. 💎 Upgrades Spéciaux

| Upgrade | Coût | Effet |
|---------|------|-------|
| Jardinier | 1M💰 | Récolte automatique |
| +1 Dimension | 10M💰 | Double ressources (x2) |
| Évolution Quantique | 100M💰 | Jardinier = voyageur BZH_PW |
| Dimension Quantique | 1B💰 | **Superposition d'états** |

### 4. 🔒 Systèmes Spéciaux

**Verrouillage**
- Protéger les pots contre récoltes accidentelles
- Outil 🔒 dans la barre latérale

**Déterrage**
- Outil 🪓 pour retirer une graine imparfaite
- Pop-up de confirmation

**Boosts Adjacents**
- Les plantes boosters affectent 4 pots adjacents
- Les boosts s'ajoutent (effet multiplicatif)

### 5. 🌌 Multidimensionnel

À partir de 10M💰:
- Déverrouille le système de dimensions
- Chaque dimension coûte 10M💰
- Multiplicateur: x1 → x2 → x3 ... x10 MAX
- Au-delà de 10 dimensions: déblocage secret

### 6. ⚛️ Dimension Quantique (1B💰)

**L'Ultime Secret**
- 1 pot unique en superposition d'états
- Une graine peut être SIMULTANÉMENT:
  - 🌱 Plantée
  - 🌿 Poussant
  - 🌳 Prête à récolter
  - 💰 En train de générer de l'or

**Génération d'Or par Seconde**
Chaque graine a une stat cachée (1-50 💰/sec):
- Commune: 1 💰/sec
- Rare: 5 💰/sec
- Épique: 10 💰/sec
- Légendaire: 25 💰/sec
- Booster Growth: 50 💰/sec

**Fenêtre Quantique**
- Affichage glitché de l'état superposé
- Actions: Planter / Récolter / Déterrer
- Visuel cyberpunk alternatif

### 7. 🏆 Achievements

**Milestone (10,000 - 100M coins)**
- 10 + 100 + 1K + 10K = 250K💰

**Collector**
- 10 récoltes (+250)
- 100 récoltes (+2.5K)
- 1000 récoltes (+25K)
- 10000 récoltes (+250K)

**Tier Mastery**
- Atteindre tier 3 (+5K)
- Tier 3 Légendaire (+50K)

**Special**
- Planter un booster (+10K)
- Recruter jardinier (+100K)
- **HIDDEN**: Multidim (+5M)
- **HIDDEN**: Quantum Evolution (+50M)
- **HIDDEN**: Quantum Dimension (+500M)
- **HIDDEN**: Quantum Gold Gen (+100M)

### 8. 🧙‍♂️ Jardinier (1M💰)

**Avant**: Récolte manuelle uniquement
**Après**: 
- Récolte automatique les plantes matures
- Apparition visuelle sur l'écran
- Stats: nombre de récoltes automatiques
- Déverrouille le chemin vers le multidimensionnel

### 9. 🚀 Voyageur Quantique (100M💰)

**Évolution du Jardinier**
- Le jardinier devient un "Voyageur Quantique du BZH_PW Crew"
- Présence "rémanente" sur tous les pots
- Récolte partout, nulle part, hors du temps
- Récolte TOUS les pots instantanément à fin de croissance
- Visual: affichage fantomatique du jardinier

## 💾 Sauvegarde

**LocalStorage**
- Parcelles (`farming_plots_`)
- Inventaire (`farming_inventory_`)
- Upgrades (`farming_upgrades_`)
- Achievements (`farming_achievements_`)

**Supabase**
- Balance (or)
- Statistiques globales
- Ledger complet

## 🎨 Design

- Thème cyberpunk 100% vectoriel
- Animations fluides CSS
- Responsive design (mobile → 4K)
- Glitch effects pour quantum dimension
- Holographic backgrounds optionnel

## 📝 Progression Résumée

```
Starter (gratuit)
↓ 50K💰
6 pots → 9 pots → 12 pots
↓ 100K💰
Luck +5% → +20%
↓ 1M💰
Jardinier (auto-récolte)
↓ 10M💰
Dimensions x2 (double tout)
↓ 100M💰
Évolution Quantique (voyageur BZH_PW)
↓ 1B💰
Dimension Quantique (or/sec infini)
```

## 🔒 Anti-Triche

- RLS Supabase activé
- RPC signé avec SECURITY DEFINER
- Validation cooldown serveur
- Ledger d'audit complet

## 🐛 Debug

Commandes console:
```javascript
// Voir l'état
console.log(window.game)

// Ajouter or
window.game.balance += 1000000; window.game.updateBalance()

// Voir achievements
console.log(window.game.achievements)
```

## 🎯 Roadmap Possible

- [ ] PvP (voler graines?)
- [ ] Missions quotidiennes
- [ ] Cosmétiques (jardins à thème)
- [ ] Synergies entre joueurs
- [ ] Leaderboard global

---

**Status**: ✅ Production-Ready
**Taille**: ~50KB compressé
**Dépendances**: Aucune — 100% localStorage (voir bandeau de statut en haut, section Supabase ci-dessus désormais obsolète)
**Support**: France (BZH special!)

Bon farming! 🌳💰✨
