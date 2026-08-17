import { state } from './state.js';
import { spells } from './content.js';

const el = {};

export function cacheDom() {
  el.hudHp = document.getElementById('hud-hp');
  el.hudMana = document.getElementById('hud-mana');
  el.hudGold = document.getElementById('hud-gold');
  el.hudLevel = document.getElementById('hud-level');
  el.hudWeapon = document.getElementById('hud-weapon');
  el.xpText = document.getElementById('xp-text');
  el.xpFill = document.getElementById('xp-fill');
  el.restText = document.getElementById('rest-text');
  el.restFill = document.getElementById('rest-fill');
  el.equippedSummary = document.getElementById('equipped-summary');
  el.village = document.getElementById('village-screen');
  el.battle = document.getElementById('battle-screen');
  el.result = document.getElementById('result-screen');
  el.modal = document.getElementById('modal-layer');
  el.resultTitle = document.getElementById('result-title');
  el.resultCopy = document.getElementById('result-copy');
  el.resultRewards = document.getElementById('result-rewards');
  el.battleTitle = document.getElementById('battle-title');
  el.battleTier = document.getElementById('battle-tier');
  el.battleMode = document.getElementById('battle-mode');
  el.battleLog = document.getElementById('battle-log');
  el.playerHpFill = document.getElementById('player-hp-fill');
  el.playerHpText = document.getElementById('player-hp-text');
  el.playerManaFill = document.getElementById('player-mana-fill');
  el.playerManaText = document.getElementById('player-mana-text');
  el.enemyName = document.getElementById('enemy-name');
  el.enemyHpFill = document.getElementById('enemy-hp-fill');
  el.enemyHpText = document.getElementById('enemy-hp-text');
  el.enemyIntent = document.getElementById('enemy-intent');
  el.chargeValue = document.getElementById('charge-value');
  el.chargeFill = document.getElementById('charge-fill');
  el.spellList = document.getElementById('spell-list');
}

export function refreshHud() {
  const p = state.player;
  el.hudHp.textContent = `${p.hp} / ${p.maxHp}`;
  el.hudMana.textContent = `${p.mana} / ${p.maxMana}`;
  el.hudGold.textContent = String(p.gold);
  el.hudLevel.textContent = String(p.level);
  el.hudWeapon.textContent = p.weapon;
  el.xpText.textContent = `${p.xp} / ${p.xpToNext}`;
  el.xpFill.style.width = `${(p.xp / p.xpToNext) * 100}%`;
  el.restText.textContent = p.restCharge >= 100 ? 'Prêt' : `${Math.round(p.restCharge)}%`;
  el.restFill.style.width = `${p.restCharge}%`;
  el.equippedSummary.innerHTML = [
    ['Chapeau', p.hat], ['Robe', p.robe], ['Grigri', p.trinket]
  ].map(([label, value]) => `<div class="summary-card"><strong>${label}</strong><div class="meter-caption">${value}</div></div>`).join('');
  refreshCombatBars();
}

export function renderSpellbook() {
  el.spellList.innerHTML = state.player.learnedSpells.map((spellId) => {
    const spell = spells[spellId];
    const selected = state.player.selectedSpell === spellId ? ' is-selected' : '';
    return `<button class="spell-button${selected}" type="button" data-select-spell="${spellId}"><strong>${spell.name}</strong><div class="meter-caption">${spell.desc}</div><div class="item-row"><span>Coût ${spell.cost}</span><span>${spell.min}-${spell.max}</span></div></button>`;
  }).join('');
}

export function bindSpellSelection(onSelect) {
  el.spellList.querySelectorAll('[data-select-spell]').forEach((button) => {
    button.addEventListener('click', () => onSelect(button.dataset.selectSpell));
  });
}

export function showVillage() {
  el.village.hidden = false;
  el.battle.hidden = true;
  el.result.hidden = true;
}

export function showBattle() {
  el.village.hidden = true;
  el.result.hidden = true;
  el.battle.hidden = false;
}

export function showResult({ title, copy, rewards = [] }) {
  el.result.hidden = false;
  el.resultTitle.textContent = title;
  el.resultCopy.textContent = copy;
  el.resultRewards.innerHTML = rewards.map((reward) => `<div class="reward-card">${reward}</div>`).join('');
}

export function setBattleMeta({ title, tier, mode, intent }) {
  el.battleTitle.textContent = title;
  el.battleTier.textContent = `Niveau ${tier}`;
  el.battleMode.textContent = mode;
  el.enemyIntent.textContent = intent;
}

export function setBattleLog(text) { el.battleLog.textContent = text; }

export function refreshCombatBars() {
  const p = state.player;
  el.playerHpText.textContent = `${p.hp} / ${p.maxHp}`;
  el.playerHpFill.style.width = `${(p.hp / p.maxHp) * 100}%`;
  el.playerManaText.textContent = `${p.mana} / ${p.maxMana} mana`;
  el.playerManaFill.style.width = `${(p.mana / p.maxMana) * 100}%`;
  if (state.battle.enemy) {
    el.enemyName.textContent = state.battle.enemy.name;
    el.enemyHpText.textContent = `${state.battle.enemy.hp} / ${state.battle.enemy.maxHp}`;
    el.enemyHpFill.style.width = `${(state.battle.enemy.hp / state.battle.enemy.maxHp) * 100}%`;
  }
}

export function updateCharge(value) {
  el.chargeValue.textContent = `${Math.round(value)}%`;
  el.chargeFill.style.width = `${value}%`;
}

export function openModal({ title, copy = '', content = '', actions = [] }) {
  el.modal.classList.add('is-open');
  el.modal.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="modal-header">
        <div><h2 class="modal-title">${title}</h2><p class="modal-copy">${copy}</p></div>
        <button class="btn btn-ghost" type="button" data-close-modal>Fermer</button>
      </div>
      <div class="shop-list">${content}</div>
      <div class="result-actions">${actions.map((action, idx) => `<button class="btn ${action.variant || 'btn-secondary'}" type="button" data-modal-action="${idx}">${action.label}</button>`).join('')}</div>
    </div>`;
  el.modal.querySelector('[data-close-modal]').addEventListener('click', closeModal);
  el.modal.querySelectorAll('[data-modal-action]').forEach((button) => {
    button.addEventListener('click', () => actions[Number(button.dataset.modalAction)]?.onClick?.());
  });
}

export function closeModal() {
  el.modal.classList.remove('is-open');
  el.modal.innerHTML = '';
}
