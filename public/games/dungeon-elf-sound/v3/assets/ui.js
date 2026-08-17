import { state } from './state.js';

const el = {};

export function cacheDom() {
  el.hudHp = document.getElementById('hud-hp');
  el.hudGold = document.getElementById('hud-gold');
  el.hudLevel = document.getElementById('hud-level');
  el.hudWeapon = document.getElementById('hud-weapon');
  el.village = document.getElementById('village-screen');
  el.battle = document.getElementById('battle-screen');
  el.result = document.getElementById('result-screen');
  el.resultTitle = document.getElementById('result-title');
  el.resultCopy = document.getElementById('result-copy');
  el.resultRewards = document.getElementById('result-rewards');
  el.enemyName = document.getElementById('enemy-name');
  el.enemyHp = document.getElementById('enemy-hp');
  el.enemyBarFill = document.getElementById('enemy-bar-fill');
  el.chargeValue = document.getElementById('charge-value');
  el.chargeFill = document.getElementById('charge-fill');
  el.battleLog = document.getElementById('battle-log');
  el.modalLayer = document.getElementById('modal-layer');
}

export function refreshHud() {
  el.hudHp.textContent = `${state.player.hp} / ${state.player.maxHp}`;
  el.hudGold.textContent = String(state.player.gold);
  el.hudLevel.textContent = String(state.player.level);
  el.hudWeapon.textContent = state.player.weapon;
}

export function showVillage() {
  el.village.hidden = false;
  el.battle.hidden = true;
  el.result.hidden = true;
}

export function showBattle(enemy) {
  el.village.hidden = true;
  el.result.hidden = true;
  el.battle.hidden = false;
  el.enemyName.textContent = enemy.name;
  updateEnemy(enemy);
  setBattleLog('Charge ton sort et vise la fenêtre critique.');
}

export function updateEnemy(enemy) {
  el.enemyHp.textContent = `${enemy.hp} / ${enemy.maxHp}`;
  el.enemyBarFill.style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;
}

export function updateCharge(value) {
  el.chargeValue.textContent = `${Math.round(value)}%`;
  el.chargeFill.style.width = `${value}%`;
}

export function setBattleLog(text) {
  el.battleLog.textContent = text;
}

export function openModal({ title, copy = '', content = '', actions = [] }) {
  el.modalLayer.classList.add('is-open');
  el.modalLayer.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="modal-header">
        <div>
          <h2 class="modal-title">${title}</h2>
          <p class="modal-copy">${copy}</p>
        </div>
        <button class="btn btn-ghost" type="button" data-close-modal>Fermer</button>
      </div>
      <div class="modal-content">${content}</div>
      <div class="result-actions">${actions.map((action, index) => `<button class="btn ${action.variant || 'btn-secondary'}" type="button" data-modal-action="${index}">${action.label}</button>`).join('')}</div>
    </div>
  `;

  el.modalLayer.querySelector('[data-close-modal]').addEventListener('click', closeModal);
  el.modalLayer.querySelectorAll('[data-modal-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = actions[Number(button.dataset.modalAction)];
      action?.onClick?.();
    });
  });
}

export function closeModal() {
  el.modalLayer.classList.remove('is-open');
  el.modalLayer.innerHTML = '';
}

export function showResult({ title, copy, rewards = [], canRetry = true }) {
  el.result.hidden = false;
  el.resultTitle.textContent = title;
  el.resultCopy.textContent = copy;
  el.resultRewards.innerHTML = rewards.map((reward) => `<div class="reward-card">${reward}</div>`).join('');
  const retryButton = document.querySelector('[data-action="retry-battle"]');
  retryButton.hidden = !canRetry;
}
