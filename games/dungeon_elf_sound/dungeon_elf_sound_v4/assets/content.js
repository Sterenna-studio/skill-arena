export const quests = [
  { title: 'Premier duel', detail: 'Gagne un entraînement.', reward: '+10 or' },
  { title: 'Chasseur nocturne', detail: 'Gagne une chasse.', reward: '+15 or' },
  { title: 'Mage équipé', detail: 'Achète une baguette en boutique.', reward: 'Débloque un meilleur burst' }
];

export const manualEntries = [
  { title: 'Charge parfaite', detail: 'Une fenêtre entre 78% et 95% augmente les dégâts et les chances de critique.' },
  { title: 'Mana', detail: 'Chaque sort coûte du mana. Le repos le restaure totalement.' },
  { title: 'Équipement', detail: 'Les boutiques améliorent l’arme ou ajoutent des bonus utilitaires.' }
];

export const spells = {
  'arcane-bolt': { name: 'Arcane Bolt', cost: 8, min: 10, max: 16, scaling: 0.22, critBonus: 10, desc: 'Projectile fiable et peu coûteux.' },
  'ember-burst': { name: 'Ember Burst', cost: 14, min: 16, max: 26, scaling: 0.32, critBonus: 14, desc: 'Sort plus brutal, meilleur sur charge haute.' },
  'lunar-lance': { name: 'Lunar Lance', cost: 20, min: 24, max: 36, scaling: 0.42, critBonus: 18, desc: 'Percée magique rare pour les chasses avancées.' }
};

export const enemies = {
  training: [
    { name: 'Fantôme d'entraînement', hp: 42, minAtk: 4, maxAtk: 8, intent: 'Attaque simple', rewardGold: 10, rewardXp: 12, tier: 1 },
    { name: 'Pantin runique', hp: 54, minAtk: 6, maxAtk: 9, intent: 'Décharge instable', rewardGold: 12, rewardXp: 15, tier: 1 }
  ],
  hunt: [
    { name: 'Loup des cryptes', hp: 68, minAtk: 8, maxAtk: 13, intent: 'Morsure rapide', rewardGold: 18, rewardXp: 20, tier: 2 },
    { name: 'Spectre d'ambre', hp: 84, minAtk: 10, maxAtk: 16, intent: 'Drain occulté', rewardGold: 24, rewardXp: 25, tier: 3 }
  ]
};

export const shops = {
  wands: {
    title: 'Mordecai',
    items: [
      { name: 'Baguette en if', price: 12, slot: 'weapon', bonus: '+2 dégâts minimum' },
      { name: 'Baguette en quartz', price: 24, slot: 'weapon', bonus: '+4 dégâts minimum' },
      { name: 'Lunar Lance', price: 36, slot: 'spell', spellId: 'lunar-lance', bonus: 'Débloque un nouveau sort' }
    ]
  },
  hats: {
    title: 'Mme Fripouille',
    items: [
      { name: 'Chapeau lunaire', price: 10, slot: 'hat', bonus: '+8 mana max' },
      { name: 'Capuche astrale', price: 18, slot: 'hat', bonus: '+12 mana max' }
    ]
  },
  robes: {
    title: 'Séraphin',
    items: [
      { name: 'Robe de mousse', price: 14, slot: 'robe', bonus: '+10 PV max' },
      { name: 'Robe d'obsidienne', price: 22, slot: 'robe', bonus: '+16 PV max' }
    ]
  },
  owl: {
    title: 'Lulu Berlu',
    items: [
      { name: 'Plume-guide', price: 16, slot: 'trinket', bonus: '+5% critique' },
      { name: 'Sifflet nocturne', price: 28, slot: 'trinket', bonus: 'Repos recharge aussi le mana bonus' }
    ]
  }
};
