import { state } from './state.js';
import { shops } from './content.js';
import { openModal, closeModal, refreshHud } from './ui.js';
import { applyShopPurchase } from './overlays.js';
import { playBuy } from './audio.js';

export function openShop(key) {
  const shop = shops[key];
  if (!shop) return;
  const content = shop.items.map((item) => `
    <div class="shop-item">
      <div class="item-row">
        <div><strong>${item.name}</strong><p class="modal-copy">${item.bonus}</p></div>
        <span class="price-tag">${item.price} or</span>
      </div>
      <button class="btn btn-primary" type="button" data-buy-item="${item.name}">Acheter</button>
    </div>`).join('');
  openModal({ title: shop.title, copy: 'Améliore ton arsenal.', content });
  document.querySelectorAll('[data-buy-item]').forEach((button) => {
    button.addEventListener('click', () => buyItem(key, button.dataset.buyItem));
  });
}

function buyItem(shopKey, itemName) {
  const item = shops[shopKey].items.find((entry) => entry.name === itemName);
  if (!item) return;
  if (state.player.gold < item.price) {
    openModal({ title: 'Or insuffisant', copy: 'Reviens après quelques combats.', content: '<div class="list-card">Le marchand refuse le crédit.</div>' });
    return;
  }
  state.player.gold -= item.price;
  applyShopPurchase(item);
  refreshHud();
  playBuy();
  closeModal();
}
