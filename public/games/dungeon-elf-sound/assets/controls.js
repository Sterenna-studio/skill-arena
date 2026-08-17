import { toggleSound, playRest } from './audio.js';
import { startBattle, chargeSpell, castSelectedSpell, retryBattle, returnVillage } from './battle.js';
import { openInventory, openManual, openQuests, openSpells } from './overlays.js';
import { openShop } from './shops.js';
import { restPlayer } from './progression.js';
import { showVillage, refreshHud } from './ui.js';

export function bindControls() {
  const map = {
    'toggle-sound': () => {
      const enabled = toggleSound();
      document.querySelector('[data-action="toggle-sound"]').textContent = enabled ? '🔊 Son' : '🔇 Son';
    },
    'rest-player': () => { restPlayer(); playRest(); refreshHud(); },
    'start-training': () => startBattle('training'),
    'start-hunt': () => startBattle('hunt'),
    'open-spells': openSpells,
    'open-quests': openQuests,
    'open-inventory': openInventory,
    'open-manual': openManual,
    'shop-wands': () => openShop('wands'),
    'shop-hats': () => openShop('hats'),
    'shop-robes': () => openShop('robes'),
    'shop-owl': () => openShop('owl'),
    'charge-spell': chargeSpell,
    'cast-selected-spell': castSelectedSpell,
    'return-village': returnVillage,
    'retry-battle': retryBattle,
    'result-primary': showVillage
  };
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => map[button.dataset.action]?.());
  });
}
