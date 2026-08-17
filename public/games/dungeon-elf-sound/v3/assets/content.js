export const quests = [
  { title: 'Premier entraînement', detail: 'Gagne un combat dans l’arène.', reward: '+10 or' },
  { title: 'Collectionneur prudent', detail: 'Achète un objet dans une boutique.', reward: '+1 potion mentale' }
];

export const manualEntries = [
  { title: 'Charge', detail: 'Plus tu canalises longtemps, plus ton sort frappe fort.' },
  { title: 'Fenêtre critique', detail: 'Lance entre 80% et 100% pour un coup renforcé.' },
  { title: 'Repli', detail: 'Tu peux quitter l’arène à tout moment sans récompense.' }
];

export const shops = {
  wands: {
    title: 'Mordecai',
    items: [
      { name: 'Baguette en if', price: 12, type: 'weapon' },
      { name: 'Baguette en quartz', price: 24, type: 'weapon' }
    ]
  },
  hats: {
    title: 'Mme Fripouille',
    items: [
      { name: 'Chapeau lunaire', price: 10, type: 'hat' },
      { name: 'Capuche astrale', price: 18, type: 'hat' }
    ]
  },
  robes: {
    title: 'Séraphin',
    items: [
      { name: 'Robe de mousse', price: 14, type: 'robe' },
      { name: 'Robe d’obsidienne', price: 22, type: 'robe' }
    ]
  },
  owl: {
    title: 'Lulu Berlu',
    items: [
      { name: 'Plume-guide', price: 16, type: 'trinket' },
      { name: 'Sifflet nocturne', price: 28, type: 'trinket' }
    ]
  }
};
