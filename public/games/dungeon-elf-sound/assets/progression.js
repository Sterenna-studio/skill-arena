import { state } from './state.js';
import { refreshHud } from './ui.js';

export function grantRewards({ gold = 0, xp = 0 }) {
  state.player.gold += gold;
  state.player.xp += xp;
  while (state.player.xp >= state.player.xpToNext) {
    state.player.xp -= state.player.xpToNext;
    state.player.level += 1;
    state.player.xpToNext += 10;
    state.player.maxHp += 12;
    state.player.maxMana += 8;
    state.player.hp = state.player.maxHp;
    state.player.mana = state.player.maxMana;
  }
  refreshHud();
}

export function restPlayer() {
  state.player.hp = state.player.maxHp;
  state.player.mana = state.player.maxMana;
  state.player.restCharge = 100;
  refreshHud();
}

export function consumeRest(amount = 30) {
  state.player.restCharge = Math.max(0, state.player.restCharge - amount);
  refreshHud();
}
