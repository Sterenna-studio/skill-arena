import { state } from './state.js';
import { shops } from './content.js';
import { openModal, closeModal, refreshHud } from './ui.js';
import { playBuySound } from './audio.js';

export function openShop(key) {
  const shop = shops[key];
  if (!shop) return;

  const content = `<div class="shop-list">${shop.items.map((item) => `
    <div class="shop-item">
      <div class="item-row">
        <div>
          <strong>${item.name}</strong>
          <p class="modal-copy">${item.type}</p>
        </div>
        <span class="price-tag">${item.price} or</span>
      </div>
      <button class="btn btn-primary" type="button" data-buy-item="${item.name}">Acheter</button>
    </div>
  `).join('')}</div>`;

  openModal({ title: shop.title, copy: 'Choisis un objet à ajouter à ton attirail.', content });

  document.querySelectorAll('[data-buy-item]').forEach((button) => {
    button.addEventListener('click', () => buyItem(key, button.dataset.buyItem));
  });
}

function buyItem(shopKey, itemName) {
  const item = shops[shopKey].items.find((entry) => entry.name === itemName);
  if (!item) return;
  if (state.player.gold < item.price) {
    openModal({ title: 'Pas assez d’or', copy: 'Retourne t’entraîner avant cet achat.', content: '<div class="list-card">Il te manque quelques pièces.</div>' });
    return;
  }

  state.player.gold -= item.price;
  if (item.type === 'weapon') state.player.weapon = item.name;
  else if (item.type === 'hat') state.player.hats.push(item.name);
  else if (item.type === 'robe') state.player.robes.push(item.name);
  else state.player.inventory.push(item.name);
  refreshHud();
  playBuySound();
  closeModal();
}
