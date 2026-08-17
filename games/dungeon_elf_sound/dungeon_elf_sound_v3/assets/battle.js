import { state } from './state.js';
import { clamp, randomInt } from './utils.js';
import { updateCharge, updateEnemy, setBattleLog, showBattle, showVillage, showResult, refreshHud } from './ui.js';
import { playChargeSound, playHitSound, playVictorySound } from './audio.js';

export function startTrainingBattle() {
  state.battle.active = true;
  state.battle.enemy = { name: 'Fantôme d'entraînement', hp: 40, maxHp: 40 };
  state.battle.charge = 0;
  state.battle.chargeDirection = 1;
  updateCharge(0);
  showBattle(state.battle.enemy);
}

export function chargeSpell() {
  if (!state.battle.active) return;
  cancelAnimationFrame(state.battle.rafId);
  const step = () => {
    state.battle.charge += 2.4 * state.battle.chargeDirection;
    if (state.battle.charge >= 100) {
      state.battle.charge = 100;
      state.battle.chargeDirection = -1;
    }
    if (state.battle.charge <= 0) {
      state.battle.charge = 0;
      state.battle.chargeDirection = 1;
    }
    updateCharge(state.battle.charge);
    playChargeSound();
    state.battle.rafId = requestAnimationFrame(step);
  };
  state.battle.rafId = requestAnimationFrame(step);
}

export function castSpell() {
  if (!state.battle.active || !state.battle.enemy) return;
  cancelAnimationFrame(state.battle.rafId);
  const charge = clamp(state.battle.charge, 0, 100);
  const critical = charge >= 80;
  const damage = randomInt(8, 14) + Math.round(charge / 10) + (critical ? 8 : 0);
  state.battle.enemy.hp = clamp(state.battle.enemy.hp - damage, 0, state.battle.enemy.maxHp);
  updateEnemy(state.battle.enemy);
  setBattleLog(critical ? `Impact critique : ${damage} dégâts.` : `Sort lancé : ${damage} dégâts.`);
  playHitSound();
  state.battle.charge = 0;
  updateCharge(0);

  if (state.battle.enemy.hp <= 0) {
    winBattle(critical);
    return;
  }

  const retaliation = randomInt(4, 10);
  state.player.hp = clamp(state.player.hp - retaliation, 0, state.player.maxHp);
  refreshHud();
  setBattleLog(`Le fantôme riposte et inflige ${retaliation} dégâts.`);

  if (state.player.hp <= 0) {
    loseBattle();
  }
}

export function fleeBattle() {
  stopBattleLoop();
  state.battle.active = false;
  showVillage();
}

export function retryBattle() {
  state.player.hp = state.player.maxHp;
  refreshHud();
  startTrainingBattle();
}

function winBattle(critical) {
  stopBattleLoop();
  state.battle.active = false;
  const goldGain = critical ? 14 : 10;
  state.player.gold += goldGain;
  state.player.xp += 12;
  if (state.player.xp >= 20) {
    state.player.level += 1;
    state.player.xp = 0;
    state.player.maxHp += 10;
    state.player.hp = state.player.maxHp;
  }
  refreshHud();
  playVictorySound();
  showResult({
    title: 'Victoire',
    copy: `Tu remportes le combat et récupères ${goldGain} pièces.`,
    rewards: [`+${goldGain} or`, critical ? 'Coup critique maîtrisé' : 'Sort stabilisé']
  });
}

function loseBattle() {
  stopBattleLoop();
  state.battle.active = false;
  showResult({
    title: 'Défaite',
    copy: 'Ton entraînement tourne mal, mais tu peux recommencer.',
    rewards: ['Retour conseillé au village'],
    canRetry: true
  });
}

function stopBattleLoop() {
  cancelAnimationFrame(state.battle.rafId);
  state.battle.rafId = null;
}
