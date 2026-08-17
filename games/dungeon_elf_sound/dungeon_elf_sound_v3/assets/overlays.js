import { state } from './state.js';
import { quests, manualEntries } from './content.js';
import { openModal } from './ui.js';

export function openInventory() {
  const items = [state.player.weapon, ...state.player.inventory, ...state.player.hats, ...state.player.robes];
  const content = items.length
    ? items.map((item) => `<div class="list-card">${item}</div>`).join('')
    : '<div class="list-card">Ton sac est vide.</div>';
  openModal({ title: 'Inventaire', copy: 'Ton équipement et tes trouvailles.', content });
}

export function openQuests() {
  const content = quests.map((quest) => `<div class="list-card"><strong>${quest.title}</strong><p class="modal-copy">${quest.detail}</p><span class="price-tag">${quest.reward}</span></div>`).join('');
  openModal({ title: 'Quêtes', copy: 'Objectifs secondaires du mage.', content });
}

export function openManual() {
  const content = manualEntries.map((entry) => `<div class="list-card"><strong>${entry.title}</strong><p class="modal-copy">${entry.detail}</p></div>`).join('');
  openModal({ title: 'Manuel du sorcier', copy: 'Rappels utiles pour survivre.', content });
}
