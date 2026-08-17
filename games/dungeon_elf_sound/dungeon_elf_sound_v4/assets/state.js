export const state = {
  player: {
    hp: 100,
    maxHp: 100,
    mana: 60,
    maxMana: 60,
    gold: 30,
    level: 1,
    xp: 0,
    xpToNext: 30,
    weapon: 'Baguette novice',
    hat: 'Aucun',
    robe: 'Aucune',
    trinket: 'Aucun',
    inventory: ['Potion mineure'],
    learnedSpells: ['arcane-bolt', 'ember-burst'],
    selectedSpell: 'arcane-bolt',
    restCharge: 100
  },
  battle: {
    active: false,
    mode: 'training',
    enemy: null,
    charge: 0,
    direction: 1,
    rafId: null
  },
  audio: { enabled: true },
  ui: { resultPrimaryAction: 'village' }
};
