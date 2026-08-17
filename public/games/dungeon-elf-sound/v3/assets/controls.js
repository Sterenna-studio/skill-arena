import { toggleSound } from './audio.js';
import { startTrainingBattle, chargeSpell, castSpell, fleeBattle, retryBattle } from './battle.js';
import { openInventory, openManual, openQuests } from './overlays.js';
import { openShop } from './shops.js';
import { showVillage } from './ui.js';

export function bindControls() {
  const map = {
    'toggle-sound': () => {
      const enabled = toggleSound();
      const button = document.querySelector('[data-action="toggle-sound"]');
      button.textContent = enabled ? '🔊 Son' : '🔇 Son';
    },
    'start-training': startTrainingBattle,
    'open-inventory': openInventory,
    'open-manual': openManual,
    'open-quests': openQuests,
    'shop-wands': () => openShop('wands'),
    'shop-hats': () => openShop('hats'),
    'shop-robes': () => openShop('robes'),
    'shop-owl': () => openShop('owl'),
    'charge-spell': chargeSpell,
    'cast-spell': castSpell,
    'return-village': () => {
      fleeBattle();
      showVillage();
    },
    'retry-battle': retryBattle,
    'result-primary': showVillage
  };

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => map[button.dataset.action]?.());
  });
}
