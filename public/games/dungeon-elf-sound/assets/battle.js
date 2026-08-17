import { state } from './state.js';
import { enemies, spells } from './content.js';
import { clamp, randomInt, pickRandom } from './utils.js';
import { playCharge, playCast, playVictory } from './audio.js';
import { refreshHud, renderSpellbook, bindSpellSelection, setBattleMeta, setBattleLog, showBattle, showResult, updateCharge, refreshCombatBars, showVillage } from './ui.js';
import { grantRewards, consumeRest } from './progression.js';

export function startBattle(mode = 'training') {
  state.battle.mode = mode;
  state.battle.enemy = structuredClone(pickRandom(enemies[mode]));
  state.battle.enemy.maxHp = state.battle.enemy.hp;
  state.battle.charge = 0;
  state.battle.direction = 1;
  state.battle.active = true;
  updateCharge(0);
  showBattle();
  renderSpellbook();
  bindSpellSelection(selectSpell);
  setBattleMeta({
    title: state.battle.enemy.name,
    tier: state.battle.enemy.tier,
    mode: mode === 'training' ? 'Entraînement' : 'Chasse',
    intent: state.battle.enemy.intent
  });
  refreshCombatBars();
  setBattleLog('Sélectionne un sort, canalise, puis lance au bon moment.');
}

export function selectSpell(spellId) {
  state.player.selectedSpell = spellId;
  renderSpellbook();
  bindSpellSelection(selectSpell);
}

export function chargeSpell() {
  if (!state.battle.active) return;
  cancelAnimationFrame(state.battle.rafId);
  const step = () => {
    state.battle.charge += 2.8 * state.battle.direction;
    if (state.battle.charge >= 100) { state.battle.charge = 100; state.battle.direction = -1; }
    if (state.battle.charge <= 0) { state.battle.charge = 0; state.battle.direction = 1; }
    updateCharge(state.battle.charge);
    playCharge();
    state.battle.rafId = requestAnimationFrame(step);
  };
  state.battle.rafId = requestAnimationFrame(step);
}

export function castSelectedSpell() {
  if (!state.battle.active || !state.battle.enemy) return;
  const spell = spells[state.player.selectedSpell];
  if (!spell) return;
  if (state.player.mana < spell.cost) {
    setBattleLog('Mana insuffisant. Repose-toi ou choisis un sort plus léger.');
    return;
  }
  cancelAnimationFrame(state.battle.rafId);
  const charge = clamp(state.battle.charge, 0, 100);
  const perfect = charge >= 78 && charge <= 95;
  const critChance = perfect ? 0.45 : 0.12;
  const crit = Math.random() < critChance;
  const weaponBonus = state.player.weapon.includes('quartz') ? 4 : state.player.weapon.includes('if') ? 2 : 0;
  const damage = randomInt(spell.min + weaponBonus, spell.max + weaponBonus) + Math.round(charge * spell.scaling) + (crit ? spell.critBonus : 0);
  state.player.mana = clamp(state.player.mana - spell.cost, 0, state.player.maxMana);
  state.battle.enemy.hp = clamp(state.battle.enemy.hp - damage, 0, state.battle.enemy.maxHp);
  playCast();
  state.battle.charge = 0;
  updateCharge(0);
  refreshCombatBars();
  setBattleLog(crit ? `${spell.name} critique : ${damage} dégâts.` : `${spell.name} inflige ${damage} dégâts.`);

  if (state.battle.enemy.hp <= 0) {
    winBattle({ perfect });
    return;
  }

  enemyTurn();
}

export function retryBattle() {
  state.player.hp = state.player.maxHp;
  state.player.mana = state.player.maxMana;
  refreshHud();
  startBattle(state.battle.mode || 'training');
}

export function returnVillage() {
  stopCharge();
  state.battle.active = false;
  showVillage();
}

function enemyTurn() {
  const enemy = state.battle.enemy;
  const reduced = state.player.robe.includes('obsidienne') ? 3 : 0;
  const damage = Math.max(1, randomInt(enemy.minAtk, enemy.maxAtk) - reduced);
  state.player.hp = clamp(state.player.hp - damage, 0, state.player.maxHp);
  refreshCombatBars();
  refreshHud();
  setBattleLog(`${enemy.name} riposte et inflige ${damage} dégâts.`);
  if (state.player.hp <= 0) loseBattle();
}

function winBattle({ perfect }) {
  stopCharge();
  state.battle.active = false;
  const enemy = state.battle.enemy;
  const bonusGold = perfect ? 4 : 0;
  const bonusXp = perfect ? 4 : 0;
  const rewards = [`+${enemy.rewardGold + bonusGold} or`, `+${enemy.rewardXp + bonusXp} XP`];
  if (state.battle.mode === 'hunt' && !state.player.inventory.includes('Essence spectrale')) {
    state.player.inventory.push('Essence spectrale');
    rewards.push('Essence spectrale trouvée');
  }
  grantRewards({ gold: enemy.rewardGold + bonusGold, xp: enemy.rewardXp + bonusXp });
  consumeRest(state.battle.mode === 'hunt' ? 38 : 22);
  playVictory();
  showResult({ title: 'Victoire', copy: `Tu triomphes de ${enemy.name}.`, rewards });
}

function loseBattle() {
  stopCharge();
  state.battle.active = false;
  showResult({ title: 'Défaite', copy: 'Le duel t’échappe. Repose-toi puis recommence.', rewards: ['Aucune récompense'] });
}

function stopCharge() {
  cancelAnimationFrame(state.battle.rafId);
  state.battle.rafId = null;
}
