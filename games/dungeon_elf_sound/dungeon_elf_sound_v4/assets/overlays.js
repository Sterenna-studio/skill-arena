import { state } from './state.js';
import { quests, manualEntries, spells } from './content.js';
import { openModal, closeModal, refreshHud } from './ui.js';

export function openInventory() {
  const items = [
    `Arme : ${state.player.weapon}`,
    `Chapeau : ${state.player.hat}`,
    `Robe : ${state.player.robe}`,
    `Grigri : ${state.player.trinket}`,
    ...state.player.inventory
  ];
  const content = items.map((item) => `<div class="list-card">${item}</div>`).join('');
  openModal({ title: 'Inventaire', copy: 'Ton équipement et tes objets.', content });
}

export function openManual() {
  const content = manualEntries.map((entry) => `<div class="list-card"><strong>${entry.title}</strong><p class="modal-copy">${entry.detail}</p></div>`).join('');
  openModal({ title: 'Manuel du sorcier', copy: 'Petit guide de survie magique.', content });
}

export function openQuests() {
  const content = quests.map((quest) => `<div class="list-card"><strong>${quest.title}</strong><p class="modal-copy">${quest.detail}</p><span class="price-tag">${quest.reward}</span></div>`).join('');
  openModal({ title: 'Quêtes', copy: 'Objectifs disponibles.', content });
}

export function openSpells() {
  const content = state.player.learnedSpells.map((spellId) => {
    const spell = spells[spellId];
    const active = state.player.selectedSpell === spellId ? ' (actif)' : '';
    return `<div class="list-card"><strong>${spell.name}${active}</strong><p class="modal-copy">${spell.desc}</p><div class="item-row"><span>Coût ${spell.cost}</span><span>${spell.min}-${spell.max} dégâts</span></div></div>`;
  }).join('');
  openModal({ title: 'Sorts connus', copy: 'Choisis ton style de jeu selon le combat.', content, actions: [{ label: 'Fermer', onClick: closeModal }] });
}

export function applyShopPurchase(item) {
  if (item.slot === 'weapon') state.player.weapon = item.name;
  if (item.slot === 'hat') {
    state.player.hat = item.name;
    state.player.maxMana = item.name.includes('astrale') ? 72 : 68;
    state.player.mana = Math.min(state.player.mana, state.player.maxMana);
  }
  if (item.slot === 'robe') {
    state.player.robe = item.name;
    state.player.maxHp = item.name.includes('obsidienne') ? 116 : 110;
    state.player.hp = Math.min(state.player.hp, state.player.maxHp);
  }
  if (item.slot === 'trinket') state.player.trinket = item.name;
  if (item.slot === 'spell' && item.spellId && !state.player.learnedSpells.includes(item.spellId)) state.player.learnedSpells.push(item.spellId);
  refreshHud();
}
