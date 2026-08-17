export const state = {
  player: {
    hp: 100,
    maxHp: 100,
    gold: 30,
    level: 1,
    xp: 0,
    weapon: 'Baguette novice',
    inventory: ['Potion mineure'],
    hats: [],
    robes: []
  },
  battle: {
    active: false,
    enemy: null,
    charge: 0,
    chargeDirection: 1,
    rafId: null
  },
  audio: {
    enabled: true
  },
  ui: {
    lastResult: null
  }
};
