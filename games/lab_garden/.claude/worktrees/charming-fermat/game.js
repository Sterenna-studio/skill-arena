import { getClient, getUser } from '../shared/supaRaw.js';
import { getGold, spendGold, addGold, refreshGold } from '../shared/economy.js';

const SEED_DATA = {
  common_seed: { name: 'Graine Commune', emoji: '\u{1F331}', color: '#00ff88', tier: 1, baseCost: 50, tiers: [{level: 1, time: 3600, gold: 10, emoji: '\u{1F331}'}, {level: 2, time: 2000, gold: 20, emoji: '\u{1F33F}'}, {level: 3, time: 1111, gold: 40, emoji: '\u{1FAB4}'}] },
  rare_seed: { name: 'Graine Rare', emoji: '\u{1F49C}', color: '#9d4edd', tier: 2, baseCost: 200, tiers: [{level: 1, time: 3600, gold: 30, emoji: '\u{1F49C}'}, {level: 2, time: 2000, gold: 60, emoji: '\u{1F33A}'}, {level: 3, time: 1111, gold: 120, emoji: '\u{1F338}'}] },
  epic_seed: { name: 'Graine \u00C9pique', emoji: '\u{1F535}', color: '#3a86ff', tier: 3, baseCost: 800, tiers: [{level: 1, time: 3600, gold: 100, emoji: '\u{1F535}'}, {level: 2, time: 2000, gold: 200, emoji: '\u{1F30A}'}, {level: 3, time: 1111, gold: 400, emoji: '\u{1F48E}'}] },
  legendary_seed: { name: 'Graine L\u00E9gendaire', emoji: '\u{1F525}', color: '#ff006e', tier: 4, baseCost: 5000, tiers: [{level: 1, time: 3600, gold: 500, emoji: '\u{1F525}'}, {level: 2, time: 2000, gold: 1000, emoji: '\u26A1'}, {level: 3, time: 1111, gold: 2000, emoji: '\u{1F451}'}] },
  booster_growth: { name: 'Plante Croissance', emoji: '\u26A1', color: '#ffbe0b', tier: 5, type: 'booster_growth', baseCost: 10000, tiers: [{level: 1, boost: 0.1}, {level: 2, boost: 0.2}, {level: 3, boost: 0.3}] },
  booster_gold: { name: 'Plante Or', emoji: '\u{1F4B0}', color: '#ffd700', tier: 5, type: 'booster_gold', baseCost: 15000, tiers: [{level: 1, boost: 0.05}, {level: 2, boost: 0.10}, {level: 3, boost: 0.15}] }
};

/* ===== PARTICLE SYSTEM ===== */
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  addFirefly() {
    if (this.particles.length > 40) return;
    this.particles.push({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2.5 + 1,
      alpha: 0,
      alphaTarget: Math.random() * 0.5 + 0.2,
      hue: Math.random() > 0.7 ? 50 : 150, // gold or green
      life: Math.random() * 400 + 200,
      maxLife: 0,
    });
    const p = this.particles[this.particles.length - 1];
    p.maxLife = p.life;
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (Math.random() < 0.08) this.addFirefly();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx += (Math.random() - 0.5) * 0.05;
      p.vy += (Math.random() - 0.5) * 0.05;
      p.life--;

      const lifePct = p.life / p.maxLife;
      p.alpha = lifePct > 0.8 ? (1 - lifePct) * 5 * p.alphaTarget :
                lifePct < 0.2 ? lifePct * 5 * p.alphaTarget : p.alphaTarget;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.alpha})`;
      this.ctx.fill();

      // Glow
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.alpha * 0.15})`;
      this.ctx.fill();

      if (p.life <= 0) this.particles.splice(i, 1);
    }

    requestAnimationFrame(() => this.animate());
  }
}

/* ===== MAIN GAME ===== */
class FarmingGamePro {
  constructor() {
    this.user = null;
    this.supabase = null;
    this.balance = 0;
    this.totalHarvests = 0;
    this.streak = 0;
    this.plots = Array(6).fill(null);
    this.inventory = {};
    this.inventoryPage = 0;
    this.upgrades = { plotSlots: 1, luck: 0, cooldown: 1.0, gardenerActive: false, gardenerHarvests: 0, dimensions: 1, quantumDimension: false, quantumPlant: null };
    this.selectedTool = null;
    this.cooldownEnd = null;
    this.seedData = SEED_DATA;
    this.achievements = {};
    this.particleSystem = null;
  }

  async init() {
    try {
      // Init particle system
      const canvas = document.getElementById('particles-canvas');
      if (canvas) this.particleSystem = new ParticleSystem(canvas);

      this.supabase = await getClient();
      this.user = await getUser();
      if (!this.user) { window.location.href = '/auth/login'; return; }
      this.balance = await refreshGold();
      await this.loadState();
      await this.loadUpgrades();
      await this.loadAchievements();
      this.updateGardenGrid();
      this.updateInventory();
      this.setupEventListeners();
      this.setupModalListeners();
      this.render();
      this.startTimer();
      this.notify('Bienvenue dans Gold Garden Pro!', 'success');
    } catch (error) {
      console.error('Erreur init:', error);
      this.notify('Erreur: ' + error.message, 'error');
    }
  }

  async loadState() {
    const resp = await this.supabase.from('farming_state').select('*').eq('id', this.user.id).maybeSingle();
    const data = resp.data;
    if (data) {
      this.totalHarvests = data.total_harvests || 0;
      this.streak = data.streak_days || 0;
      this.cooldownEnd = data.last_claim ? new Date(data.last_claim) : null;
      if (this.cooldownEnd) this.cooldownEnd.setHours(this.cooldownEnd.getHours() + 1);
    } else {
      await this.supabase.from('farming_state').insert({id: this.user.id});
    }
    const savedPlots = localStorage.getItem('farming_plots_' + this.user.id);
    if (savedPlots) {
      try {
        this.plots = JSON.parse(savedPlots);
        this.plots = (this.plots || []).map((p) => {
          if (!p || typeof p !== 'object') return null;
          if (!p.hasOwnProperty('locked')) p.locked = false;
          if (!p.boosts || typeof p.boosts !== 'object') p.boosts = { growth: 0, gold: 0 };
          else { if (typeof p.boosts.growth !== 'number') p.boosts.growth = 0; if (typeof p.boosts.gold !== 'number') p.boosts.gold = 0; }
          if (typeof p.goldValue !== 'number') p.goldValue = 0;
          if (typeof p.plantedAt !== 'number') p.plantedAt = Date.now();
          if (typeof p.growthTime !== 'number') p.growthTime = 3600000;
          return p;
        });
      } catch (e) { console.error('Erreur parse plots:', e); this.plots = Array(6).fill(null); }
    }
    const savedInventory = localStorage.getItem('farming_inventory_' + this.user.id);
    if (savedInventory) this.inventory = JSON.parse(savedInventory);
  }

  async loadUpgrades() {
    const savedUpgrades = localStorage.getItem('farming_upgrades_' + this.user.id);
    if (savedUpgrades) this.upgrades = Object.assign(this.upgrades, JSON.parse(savedUpgrades));
    const plotCount = [6, 9, 12, 20][this.upgrades.plotSlots - 1] || 6;
    this.plots = this.plots.slice(0, plotCount).concat(Array(Math.max(0, plotCount - this.plots.length)).fill(null));
  }

  async loadAchievements() {
    const savedAchievements = localStorage.getItem('farming_achievements_' + this.user.id);
    if (savedAchievements) this.achievements = JSON.parse(savedAchievements);
  }

  savePlots() { localStorage.setItem('farming_plots_' + this.user.id, JSON.stringify(this.plots)); }
  saveInventory() { localStorage.setItem('farming_inventory_' + this.user.id, JSON.stringify(this.inventory)); }
  saveUpgrades() { localStorage.setItem('farming_upgrades_' + this.user.id, JSON.stringify(this.upgrades)); }
  saveAchievements() { localStorage.setItem('farming_achievements_' + this.user.id, JSON.stringify(this.achievements)); }

  async buySeed(seedType) {
    const seed = this.seedData[seedType];
    if (!seed) { this.notify('Graine invalide', 'error'); return; }
    const cost = Math.floor(Number(seed.baseCost) || 0);
    const payerGold = await getGold();
    if (payerGold < cost) { this.notify('Or insuffisant!', 'warning'); return; }
    const newGold = await spendGold(cost);
    this.balance = newGold;
    this.inventory[seedType] = (this.inventory[seedType] || 0) + 1;
    this.saveInventory();
    this.updateBalance();
    this.updateInventory();
    this.notify('Achet\u00E9: ' + seed.name, 'success');
  }

  plantSeed(plotIndex, seedType) {
    if (!seedType || !this.seedData[seedType]) { this.notify('Graine inconnue', 'warning'); return; }
    if (!this.inventory[seedType] || this.inventory[seedType] <= 0) { this.notify('Graine non disponible!', 'warning'); return; }
    if (this.plots[plotIndex]) { this.notify('Parcelle occup\u00E9e!', 'info'); return; }
    const seed = this.seedData[seedType];
    const tier = seed.tiers[0];
    const goldVal = Math.floor(Number(tier.gold) || 0);
    const timeMs = Math.floor(Number(tier.time) || 3600) * 1000;
    this.plots[plotIndex] = { seedType: seedType, plantedAt: Date.now(), growthTime: timeMs, goldValue: goldVal, locked: false, boosts: { growth: 0, gold: 0 } };
    this.inventory[seedType]--;
    this.savePlots();
    this.saveInventory();
    this.updateInventory();
    this.render();
    // Plant animation
    const plotEl = document.querySelector('[data-index="' + plotIndex + '"]');
    if (plotEl) {
      plotEl.style.animation = 'none';
      plotEl.offsetHeight; // reflow
      plotEl.style.animation = 'plant-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }
    this.notify('Graine plant\u00E9e!', 'success');
  }

  isPlotReady(plot) { if (!plot) return false; const elapsed = Date.now() - (Number(plot.plantedAt) || 0); return elapsed >= (Number(plot.growthTime) || 0); }
  getPlotProgress(plot) { if (!plot) return 0; const elapsed = Date.now() - (Number(plot.plantedAt) || 0); return Math.min(elapsed / (Number(plot.growthTime) || 1), 1); }

  async harvest(plotIndex) {
    const plot = this.plots[plotIndex];
    if (!plot || plot.locked) return;
    if (!this.isPlotReady(plot)) { this.notify('Plante pas encore mature!', 'warning'); return; }
    if (this.cooldownEnd && Date.now() < this.cooldownEnd) { const remaining = Math.ceil((this.cooldownEnd - Date.now()) / 1000); this.notify('Cooldown: ' + remaining + 's', 'warning'); return; }
    try {
      const isGolden = Math.random() < (Number(this.upgrades.luck) || 0) + 0.1;
      let goldAmount = Math.floor(Number(plot.goldValue) || 0);
      goldAmount = isGolden ? goldAmount * 3 : goldAmount;
      const boostGold = Number(plot.boosts?.gold) || 0;
      goldAmount = Math.floor(goldAmount * (1 + boostGold));
      const dimMult = Number(this.upgrades.dimensions) || 1;
      goldAmount = Math.floor(goldAmount * dimMult);
      if (!Number.isFinite(goldAmount) || goldAmount < 0) goldAmount = 0;
      const resp = await this.supabase.rpc('claim_farming_gold', { p_player_id: this.user.id, p_gold_amount: goldAmount, p_game_type: 'gold-garden' });
      if (resp.error) throw resp.error;
      const synced = await refreshGold();
      this.balance = synced;
      this.totalHarvests++;
      this.plots[plotIndex] = null;
      this.savePlots();
      this.cooldownEnd = new Date(resp.data.next_claim);

      // Harvest particles from plot position
      const plotEl = document.querySelector('[data-index="' + plotIndex + '"]');
      if (plotEl) this.spawnHarvestParticles(plotEl, isGolden);

      if (isGolden) {
        this.showGoldenHarvest(goldAmount);
        this.notify('R\u00C9COLTE DOR\u00C9E! +' + goldAmount + '\u{1F4B0}', 'golden');
        document.body.classList.add('screen-shake');
        setTimeout(() => document.body.classList.remove('screen-shake'), 400);
      } else {
        this.showReward(goldAmount);
        this.notify('+' + goldAmount + '\u{1F4B0}', 'success');
      }

      // Animate balance bump
      const balEl = document.getElementById('balance');
      if (balEl) {
        balEl.classList.remove('bump');
        balEl.offsetHeight;
        balEl.classList.add('bump');
      }

      this.checkAchievements();
      this.render();
    } catch (error) { console.error('Erreur harvest:', error); this.notify('Erreur r\u00E9colte', 'error'); }
  }

  spawnHarvestParticles(plotEl, isGolden) {
    const rect = plotEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const count = isGolden ? 12 : 6;
    const emojis = isGolden ? ['\u{1F4B0}', '\u2728', '\u{1F31F}', '\u{1F4B0}'] : ['\u2728', '\u{1F33F}', '\u{1F343}'];

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'harvest-particle';
      particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
      const dist = 40 + Math.random() * 60;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist - 40;
      particle.style.left = cx + 'px';
      particle.style.top = cy + 'px';
      particle.style.setProperty('--tx', tx + 'px');
      particle.style.setProperty('--ty', ty + 'px');
      document.body.appendChild(particle);
      setTimeout(() => { if (particle.parentNode) particle.parentNode.removeChild(particle); }, 1500);
    }
  }

  clearPlot(plotIndex) {
    const plot = this.plots[plotIndex];
    if (!plot) return;
    this.showConfirmation('D\u00E9terrer?', '\u00CAtes-vous s\u00FBr de vouloir d\u00E9terrer cette graine?', () => { this.plots[plotIndex] = null; this.savePlots(); this.render(); this.notify('Graine d\u00E9terr\u00E9e', 'info'); });
  }

  toggleLock(plotIndex) {
    const plot = this.plots[plotIndex];
    if (!plot) return;
    plot.locked = !plot.locked;
    this.savePlots();
    this.render();
    const msg = plot.locked ? 'verrouill\u00E9' : 'd\u00E9verrouill\u00E9';
    this.notify('Pot ' + msg, 'info');
  }

  applyBoosts() {
    this.plots.forEach((plot, idx) => {
      if (!plot) return;
      if (!plot.boosts || typeof plot.boosts !== 'object') plot.boosts = { growth: 0, gold: 0 };
      plot.boosts.growth = 0;
      plot.boosts.gold = 0;
      const adjacent = this.getAdjacentIndices(idx);
      adjacent.forEach((adjIdx) => {
        const adjPlot = this.plots[adjIdx];
        if (!adjPlot) return;
        const adjSeed = this.seedData[adjPlot.seedType];
        if (adjSeed && adjSeed.type === 'booster_growth' && adjSeed.tiers && adjSeed.tiers[0]) {
          plot.boosts.growth += Number(adjSeed.tiers[0].boost) || 0;
        }
        if (adjSeed && adjSeed.type === 'booster_gold' && adjSeed.tiers && adjSeed.tiers[0]) {
          plot.boosts.gold += Number(adjSeed.tiers[0].boost) || 0;
        }
      });
    });
  }

  getAdjacentIndices(idx) {
    const total = this.plots.length;
    let cols = 3;
    if (total >= 20) cols = 5;
    else if (total >= 12) cols = 4;
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const adjacent = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    directions.forEach(function(dir) {
      const dr = dir[0];
      const dc = dir[1];
      const r = row + dr;
      const c = col + dc;
      const rows = Math.ceil(total / cols);
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        const newIdx = r * cols + c;
        if (newIdx < total) adjacent.push(newIdx);
      }
    });
    return adjacent;
  }

  buyUpgrade(upgradeType, level) {
    const upgradeCosts = { slots: [0, 50000, 200000, 1000000], luck: [0, 10000, 50000, 200000, 500000], cooldown: [0, 25000, 100000, 250000], gardener: 1000000, dimension: 10000000, quantum: 100000000, quantumDim: 1000000000 };
    const arrayOrValue = upgradeCosts[upgradeType];
    const cost = Array.isArray(arrayOrValue) ? arrayOrValue[level] : arrayOrValue;
    if (!cost && cost !== 0) return;
    if (this.balance < cost) { this.notify('Or insuffisant!', 'warning'); return; }
    this.balance -= cost;
    this.updateBalance();
    switch (upgradeType) {
      case 'slots': { this.upgrades.plotSlots = level; const slotCounts = [6, 9, 12, 20]; const newCount = slotCounts[level - 1]; this.plots = this.plots.slice(0, newCount).concat(Array(Math.max(0, newCount - this.plots.length)).fill(null)); this.updateGardenGrid(); this.notify('Jardin \u00E9tendu! ' + newCount + ' pots', 'success'); break; }
      case 'luck': { const luckLevels = [0, 0.05, 0.10, 0.15, 0.20]; this.upgrades.luck = luckLevels[level] || 0; this.notify('Luck: +' + Math.round((this.upgrades.luck) * 100) + '%', 'success'); break; }
      case 'cooldown': { const cdLevels = [1.0, 0.8, 0.6, 0.4]; this.upgrades.cooldown = cdLevels[level] || 1.0; this.notify('Cooldown r\u00E9duit!', 'success'); break; }
      case 'gardener': { this.upgrades.gardenerActive = true; this.notify('Le jardinier est recrut\u00E9!', 'golden'); break; }
      case 'dimension': { this.upgrades.dimensions += 1; this.notify('Dimension ' + this.upgrades.dimensions + ' d\u00E9verrouill\u00E9e!', 'golden'); break; }
      case 'quantum': { this.upgrades.quantumDimension = true; this.notify('Dimension Quantique d\u00E9verrouill\u00E9e!', 'golden'); break; }
    }
    this.saveUpgrades();
    this.checkAchievements();
  }

  checkAchievements() {
    const checks = {
      first_harvest: () => this.totalHarvests === 1, collector_10: () => this.totalHarvests === 10, collector_100: () => this.totalHarvests === 100,
      collector_1000: () => this.totalHarvests === 1000, collector_10000: () => this.totalHarvests === 10000,
      gold_rush_100: () => this.balance >= 10000, gold_rush_1000: () => this.balance >= 100000, gold_rush_10000: () => this.balance >= 1000000,
      gardener_hire: () => this.upgrades.gardenerActive && !this.achievements.gardener_hire,
      multidim_unlock: () => this.upgrades.dimensions > 1 && !this.achievements.multidim_unlock,
      quantum_evolution_unlock: () => this.upgrades.quantumDimension && !this.achievements.quantum_evolution_unlock
    };
    Object.keys(checks).forEach(function(id) { if (!this.achievements[id] && checks[id]()) this.unlockAchievement(id); }.bind(this));
  }

  unlockAchievement(achievementId) {
    const ACH = {
      first_harvest: { name: 'Premier Pas', reward: 100 }, collector_10: { name: 'Petit Collectionneur', reward: 250 },
      collector_100: { name: 'Fermier Acharn\u00E9', reward: 2500 }, collector_1000: { name: 'Esclave du Farming', reward: 25000 },
      collector_10000: { name: 'Addiction S\u00E9v\u00E8re', reward: 250000 }, gold_rush_100: { name: 'Riche et C\u00E9l\u00E8bre', reward: 500 },
      gold_rush_1000: { name: 'Millionnaire Vert', reward: 5000 }, gold_rush_10000: { name: 'Pharaon des Jardins', reward: 50000 },
      gardener_hire: { name: 'Le Jardinier Arrive', reward: 100000 }, multidim_unlock: { name: 'Dimension D\u00E9verrouill\u00E9e', reward: 5000000 },
      quantum_evolution_unlock: { name: '\u00C9volution Quantique', reward: 50000000 }
    };
    const a = ACH[achievementId];
    if (!a) return;
    this.achievements[achievementId] = true;
    this.balance += a.reward;
    this.showAchievementPopup(achievementId, a.name, a.reward);
    this.saveAchievements();
    this.updateBalance();
  }

  showAchievementPopup(id, name, reward) {
    const popup = document.getElementById('achievement-unlock-popup');
    if (!popup) return;
    const nameEl = document.getElementById('popup-achievement-name');
    const rewardEl = document.getElementById('popup-achievement-reward');
    if (nameEl) nameEl.textContent = name;
    if (rewardEl) {
      const spanEl = rewardEl.querySelector('span');
      if (spanEl) spanEl.textContent = String(reward);
    }
    popup.style.display = 'flex';
    setTimeout(function () { popup.style.display = 'none'; }, 3000);
  }

  updateGardenGrid() {
    const garden = document.getElementById('garden-grid');
    if (!garden) return;
    garden.innerHTML = '';
    let cols = 3;
    if (this.plots.length >= 20) cols = 5;
    else if (this.plots.length >= 12) cols = 4;
    garden.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    for (let idx = 0; idx < this.plots.length; idx++) {
      const plotEl = document.createElement('div');
      plotEl.className = 'plot';
      plotEl.dataset.index = String(idx);
      plotEl.addEventListener('click', this.handlePlotClick.bind(this, idx));
      garden.appendChild(plotEl);
    }
    this.setupPlotDragDrop();
  }

  setupPlotDragDrop() {
    const garden = document.getElementById('garden-grid');
    if (!garden) return;
    const plots = garden.querySelectorAll('.plot');
    const self = this;
    plots.forEach(function(plotEl, idx) {
      plotEl.addEventListener('dragover', function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; plotEl.classList.add('drag-over'); });
      plotEl.addEventListener('dragleave', function(e) { plotEl.classList.remove('drag-over'); });
      plotEl.addEventListener('drop', function(e) {
        e.preventDefault();
        plotEl.classList.remove('drag-over');
        const seedType = e.dataTransfer.getData('seedType');
        if (seedType && self.seedData[seedType]) { self.plantSeed(idx, seedType); }
        else { self.notify('Graine inconnue', 'warning'); }
      });
    });
  }

  handlePlotClick(idx) {
    const plot = this.plots[idx];
    if (this.selectedTool === 'shovel') { this.clearPlot(idx); this.selectedTool = null; const el = document.getElementById('tool-shovel'); if (el) el.classList.remove('active'); return; }
    if (this.selectedTool === 'lock') { this.toggleLock(idx); this.selectedTool = null; const el2 = document.getElementById('tool-lock'); if (el2) el2.classList.remove('active'); return; }
    if (!plot) { this.notify('Drag une graine depuis le sac', 'info'); return; }
    if (this.isPlotReady(plot)) { this.harvest(idx); return; }
    this.notify('Plante pas encore mature', 'info');
  }

  updateInventory() {
    const inventory = document.getElementById('inventory');
    if (!inventory) return;
    inventory.innerHTML = '';
    const keys = Object.keys(this.inventory);
    const filtered = keys.filter(function(k) { return this.inventory[k] > 0; }.bind(this));
    const itemsPerPage = 4;
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (totalPages === 0) {
      inventory.innerHTML = '<p style="text-align: center; opacity: 0.4; grid-column: 1/-1; padding: 20px; font-size: 0.85em;">Vide</p>';
      this.updateInventoryControls(0, 0);
      return;
    }
    this.inventoryPage = this.inventoryPage % totalPages;
    if (this.inventoryPage < 0) this.inventoryPage = totalPages - 1;
    const start = this.inventoryPage * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = filtered.slice(start, end);
    const self = this;
    pageItems.forEach(function(key) {
      const qty = self.inventory[key];
      const seed = self.seedData[key];
      if (!seed) return;
      const item = document.createElement('div');
      item.className = 'inventory-item';
      item.style.borderColor = seed.color || '#00ff88';
      item.draggable = true;
      item.dataset.seedType = key;
      const emojiDiv = document.createElement('div');
      emojiDiv.className = 'item-emoji';
      emojiDiv.textContent = seed.emoji || '?';
      const qtyDiv = document.createElement('div');
      qtyDiv.className = 'item-qty';
      qtyDiv.textContent = String(qty);
      const nameDiv = document.createElement('div');
      nameDiv.className = 'item-name';
      nameDiv.textContent = seed.name || 'Unknown';
      item.appendChild(emojiDiv);
      item.appendChild(qtyDiv);
      item.appendChild(nameDiv);
      item.addEventListener('dragstart', function(e) { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('seedType', key); item.style.opacity = '0.5'; });
      item.addEventListener('dragend', function(e) { e.preventDefault(); item.style.opacity = '1'; });
      inventory.appendChild(item);
    });
    this.updateInventoryControls(this.inventoryPage, totalPages);
  }

  updateInventoryControls(currentPage, totalPages) {
    let nav = document.getElementById('inventory-nav');
    if (nav) nav.remove();
    if (totalPages <= 1) return;
    const inventoryContainer = document.getElementById('inventory').parentNode;
    const navDiv = document.createElement('div');
    navDiv.id = 'inventory-nav';
    navDiv.className = 'inventory-nav';
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '\u25C0';
    const self = this;
    prevBtn.addEventListener('click', function() { self.inventoryPage--; self.updateInventory(); });
    const pageLabel = document.createElement('span');
    pageLabel.textContent = (currentPage + 1) + ' / ' + totalPages;
    pageLabel.className = 'page-label';
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '\u25B6';
    nextBtn.addEventListener('click', function() { self.inventoryPage++; self.updateInventory(); });
    navDiv.appendChild(prevBtn);
    navDiv.appendChild(pageLabel);
    navDiv.appendChild(nextBtn);
    inventoryContainer.appendChild(navDiv);
  }

  updateBalance() {
    const bal = document.getElementById('balance');
    const har = document.getElementById('harvests');
    const st = document.getElementById('streak');
    const lk = document.getElementById('stat-luck');
    const gd = document.getElementById('stat-gardener');
    if (bal) bal.textContent = this.formatNumber(Math.floor(this.balance));
    if (har) har.textContent = String(this.totalHarvests);
    if (st) st.textContent = String(this.streak);
    if (lk) lk.textContent = Math.round(((this.upgrades.luck || 0) + 0.1) * 100) + '%';
    if (gd) gd.textContent = this.upgrades.gardenerActive ? 'Actif \u2705' : 'Non recrut\u00E9';
  }

  formatNumber(num) {
    const n = Math.floor(Number(num) || 0);
    if (n >= 1000000000) return (n / 1000000000).toFixed(1) + 'B';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  render() {
    this.applyBoosts();
    this.updateBalance();
    this.renderCooldown();
    this.renderPlots();
    this.renderActiveBoosts();
    const dimWrap = document.getElementById('dimension-counter');
    if (dimWrap) {
      if (this.upgrades.dimensions > 1) {
        dimWrap.style.display = 'flex';
        const c = document.getElementById('dimension-count');
        const m = document.getElementById('dimension-multiplier');
        if (c) c.textContent = String(this.upgrades.dimensions);
        if (m) m.textContent = String(this.upgrades.dimensions);
      } else {
        dimWrap.style.display = 'none';
      }
    }
  }

  renderActiveBoosts() {
    const el = document.getElementById('stat-boosts');
    if (!el) return;
    let count = 0;
    this.plots.forEach(p => {
      if (p && p.boosts) {
        if (p.boosts.growth > 0) count++;
        if (p.boosts.gold > 0) count++;
      }
    });
    el.textContent = String(count);
  }

  renderCooldown() {
    const bar = document.getElementById('cooldown-bar');
    const fill = document.getElementById('cooldown-fill');
    const txt = document.getElementById('cooldown-text');
    if (this.cooldownEnd && Date.now() < this.cooldownEnd) {
      const total = 60 * 60 * 1000;
      const remaining = this.cooldownEnd - Date.now();
      const progress = (total - remaining) / total;
      if (bar) bar.style.display = 'block';
      if (fill) fill.style.width = String(Math.max(0, Math.min(100, progress * 100))) + '%';
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      if (txt) txt.textContent = 'Cooldown: ' + minutes + 'm ' + seconds + 's';
    } else {
      if (bar) bar.style.display = 'none';
      if (txt) txt.textContent = '';
    }
  }

  renderPlots() {
    for (let i = 0; i < this.plots.length; i++) {
      const plot = this.plots[i];
      const plotEl = document.querySelector('[data-index="' + i + '"]');
      if (!plotEl) continue;

      if (!plot) {
        plotEl.innerHTML = '<div class="plot-content"><span class="plot-emoji" style="font-size:1.5em; opacity:0.3">+</span></div>';
        plotEl.className = 'plot empty';
        continue;
      }

      const progress = this.getPlotProgress(plot);
      const seed = this.seedData[plot.seedType];
      if (!seed) { plotEl.innerHTML = '<div class="plot-content">Erreur</div>'; plotEl.className = 'plot'; continue; }

      let emoji = seed.tiers[0]?.emoji || '\u{1F331}';
      if (progress > 0.66) emoji = seed.tiers[2]?.emoji || '\u{1F333}';
      else if (progress > 0.33) emoji = seed.tiers[1]?.emoji || '\u{1F33F}';

      const gold = Math.floor(Number(plot.goldValue) || 0);
      let html = '<div class="plot-content">';
      html += '<span class="plot-emoji">' + emoji + '</span>';

      if (progress >= 1) {
        html += '<span class="plot-gold">' + gold + '\u{1F4B0}</span>';
        plotEl.className = 'plot ready';
      } else {
        const pct = Math.floor(progress * 100);
        html += '<div class="plot-progress"><div class="plot-progress-fill" style="width:' + pct + '%"></div></div>';
        html += '<span class="plot-progress-text">' + pct + '%</span>';
        plotEl.className = 'plot growing';
      }

      html += '</div>';

      // Lock indicator
      if (plot.locked) html += '<span class="plot-lock">\u{1F512}</span>';

      // Boost indicators
      const boostGrowth = Number(plot.boosts?.growth) || 0;
      const boostGold = Number(plot.boosts?.gold) || 0;
      if (boostGrowth > 0 || boostGold > 0) {
        html += '<div class="plot-boosts">';
        if (boostGrowth > 0) html += '<span class="boost-badge growth">\u26A1+' + Math.round(boostGrowth * 100) + '%</span>';
        if (boostGold > 0) html += '<span class="boost-badge gold">\u{1F4B0}+' + Math.round(boostGold * 100) + '%</span>';
        html += '</div>';
      }

      plotEl.innerHTML = html;
    }
  }

  setupEventListeners() {
    const btnShop = document.getElementById('btn-shop');
    const btnUp = document.getElementById('btn-upgrades');
    const btnAch = document.getElementById('btn-achievements');
    const shovel = document.getElementById('tool-shovel');
    const lockBtn = document.getElementById('tool-lock');
    if (btnShop) btnShop.addEventListener('click', this.showShop.bind(this));
    if (btnUp) btnUp.addEventListener('click', this.showUpgrades.bind(this));
    if (btnAch) btnAch.addEventListener('click', this.showAchievements.bind(this));
    if (shovel) { shovel.addEventListener('click', () => { this.selectedTool = (this.selectedTool === 'shovel') ? null : 'shovel'; shovel.classList.toggle('active'); }); }
    if (lockBtn) { lockBtn.addEventListener('click', () => { this.selectedTool = (this.selectedTool === 'lock') ? null : 'lock'; lockBtn.classList.toggle('active'); }); }
  }

  setupModalListeners() {
    // Close modals via X button
    const closeMap = { 'btn-close-shop': 'shop-modal', 'btn-close-upgrades': 'upgrades-modal', 'btn-close-achievements': 'achievements-modal' };
    Object.keys(closeMap).forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) btn.addEventListener('click', () => {
        const modal = document.getElementById(closeMap[btnId]);
        if (modal) modal.style.display = 'none';
      });
    });

    // Close modals via backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
      const backdrop = modal.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', () => { modal.style.display = 'none'; });
      }
    });
  }

  showShop() {
    const modal = document.getElementById('shop-modal');
    const grid = document.getElementById('shop-grid');
    if (!modal || !grid) return;
    grid.innerHTML = '';
    const self = this;
    Object.keys(this.seedData).forEach(function(key) {
      const seed = self.seedData[key];
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.style.borderColor = seed.color || '#00ff88';
      const emoji = document.createElement('div');
      emoji.className = 'card-emoji';
      emoji.textContent = seed.emoji || '?';
      const name = document.createElement('div');
      name.className = 'card-name';
      name.textContent = seed.name || 'Unknown';
      const cost = document.createElement('div');
      cost.className = 'card-cost';
      cost.textContent = String(Math.floor(Number(seed.baseCost) || 0)) + '\u{1F4B0}';
      const btn = document.createElement('button');
      btn.className = 'btn-buy';
      btn.textContent = 'Acheter';
      btn.addEventListener('click', self.buySeed.bind(self, key));
      card.appendChild(emoji);
      card.appendChild(name);
      card.appendChild(cost);
      card.appendChild(btn);
      grid.appendChild(card);
    });
    modal.style.display = 'flex';
  }

  showUpgrades() {
    const modal = document.getElementById('upgrades-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    const tabs = document.querySelectorAll('.tab-btn');
    const self = this;
    tabs.forEach(function(tab) {
      tab.onclick = function(e) {
        tabs.forEach(function(t) { t.classList.remove('active'); });
        e.target.classList.add('active');
        const tabName = e.target.getAttribute('data-tab');
        self.renderUpgradesContent(tabName);
      };
    });
    this.renderUpgradesContent('slots');
  }

  renderUpgradesContent(tab) {
    const content = document.getElementById('upgrades-content');
    if (!content) return;
    content.innerHTML = '';
    const itemsList = tab === 'slots' ? [{ level: 1, cost: 0, label: '6 pots', current: this.upgrades.plotSlots === 1 }, { level: 2, cost: 50000, label: '9 pots', current: this.upgrades.plotSlots === 2 }, { level: 3, cost: 200000, label: '12 pots', current: this.upgrades.plotSlots === 3 }, { level: 4, cost: 1000000, label: '20 pots', current: this.upgrades.plotSlots === 4 }] :
      tab === 'luck' ? [{ level: 1, cost: 10000, label: '+5%' }, { level: 2, cost: 50000, label: '+10%' }, { level: 3, cost: 200000, label: '+15%' }] :
      tab === 'cooldown' ? [{ level: 1, cost: 25000, label: '80%' }, { level: 2, cost: 100000, label: '60%' }, { level: 3, cost: 250000, label: '40%' }] :
      tab === 'special' ? [{ id: 'gardener', cost: 1000000, label: 'Jardinier', active: this.upgrades.gardenerActive }, { id: 'dimension', cost: 10000000, label: '+1 Dimension', active: this.upgrades.dimensions > 1 }, { id: 'quantum', cost: 100000000, label: 'Dimension Quantique', active: this.upgrades.quantumDimension }] : [];
    const self = this;
    itemsList.forEach(function(it) {
      const btn = document.createElement('button');
      btn.className = 'upgrade-btn';
      if (tab === 'slots') { btn.disabled = it.current; btn.textContent = it.label + ' \u2014 ' + self.formatNumber(it.cost) + '\u{1F4B0}'; btn.addEventListener('click', self.buyUpgrade.bind(self, 'slots', it.level)); }
      else if (tab === 'special') { btn.disabled = it.active; btn.textContent = it.label + ' \u2014 ' + self.formatNumber(it.cost) + '\u{1F4B0}'; btn.addEventListener('click', self.buyUpgrade.bind(self, it.id)); }
      else { btn.textContent = it.label + ' \u2014 ' + self.formatNumber(it.cost) + '\u{1F4B0}'; btn.addEventListener('click', self.buyUpgrade.bind(self, tab, it.level)); }
      content.appendChild(btn);
    });
  }

  showAchievements() {
    const modal = document.getElementById('achievements-modal');
    const list = document.getElementById('achievements-list');
    if (!modal || !list) return;
    list.innerHTML = '';
    const ALL = {
      first_harvest: { name: 'Premier Pas', desc: 'R\u00E9colte ta premi\u00E8re graine', reward: 100, hidden: false },
      collector_10: { name: 'Petit Collectionneur', desc: 'R\u00E9colte 10 fois', reward: 250, hidden: false },
      collector_100: { name: 'Fermier Acharn\u00E9', desc: 'R\u00E9colte 100 fois', reward: 2500, hidden: false },
      collector_1000: { name: 'Esclave du Farming', desc: 'R\u00E9colte 1000 fois', reward: 25000, hidden: false },
      collector_10000: { name: 'Addiction S\u00E9v\u00E8re', desc: 'R\u00E9colte 10000 fois', reward: 250000, hidden: false },
      gold_rush_100: { name: 'Riche et C\u00E9l\u00E8bre', desc: '10000 coins', reward: 500, hidden: false },
      gold_rush_1000: { name: 'Millionnaire Vert', desc: '100000 coins', reward: 5000, hidden: false },
      gold_rush_10000: { name: 'Pharaon des Jardins', desc: '1000000 coins', reward: 50000, hidden: false },
      gardener_hire: { name: 'Le Jardinier Arrive', desc: 'Recrute un jardinier', reward: 100000, hidden: false },
      multidim_unlock: { name: 'Dimension D\u00E9verrouill\u00E9e', desc: 'Acc\u00E8s au multidimensionnel', reward: 5000000, hidden: true },
      quantum_evolution_unlock: { name: '\u00C9volution Quantique', desc: 'Voyageur Quantique', reward: 50000000, hidden: true }
    };
    const self = this;
    Object.keys(ALL).forEach(function(id) {
      const data = ALL[id];
      const isUnlocked = !!self.achievements[id];
      if (!isUnlocked && data.hidden) return;
      const item = document.createElement('div');
      item.className = 'achievement-item';
      if (isUnlocked) item.classList.add('unlocked');
      const icon = document.createElement('div');
      icon.className = 'achievement-icon';
      icon.textContent = isUnlocked ? '\u{1F3C6}' : '\u{1F512}';
      const info = document.createElement('div');
      info.className = 'achievement-info';
      const h4 = document.createElement('h4');
      h4.textContent = isUnlocked ? data.name : '???';
      const p = document.createElement('p');
      p.textContent = isUnlocked ? data.desc : 'Secret...';
      const r = document.createElement('p');
      r.className = 'reward';
      r.textContent = isUnlocked ? ('+' + self.formatNumber(data.reward) + '\u{1F4B0}') : '?????';
      info.appendChild(h4);
      info.appendChild(p);
      info.appendChild(r);
      item.appendChild(icon);
      item.appendChild(info);
      list.appendChild(item);
    });
    modal.style.display = 'flex';
  }

  notify(message, type) {
    const container = document.getElementById('notifications');
    if (!container) return;
    const notif = document.createElement('div');
    notif.className = 'notification ' + (type || 'info');
    notif.textContent = message;
    container.appendChild(notif);
    setTimeout(function () { notif.classList.add('fade-out'); setTimeout(function () { if (notif && notif.parentNode) notif.parentNode.removeChild(notif); }, 300); }, 3000);
  }

  showReward(amount) {
    const n = Math.floor(Number(amount) || 0);
    if (!Number.isFinite(n)) return;
    const popup = document.createElement('div');
    popup.className = 'gold-reward';
    popup.textContent = '+' + n + '\u{1F4B0}';
    document.body.appendChild(popup);
    setTimeout(function () { if (popup && popup.parentNode) popup.parentNode.removeChild(popup); }, 2000);
  }

  showGoldenHarvest(amount) {
    const n = Math.floor(Number(amount) || 0);
    if (!Number.isFinite(n)) return;
    const popup = document.createElement('div');
    popup.className = 'gold-reward golden';
    popup.textContent = '\u2728 +' + n + '\u{1F4B0} \u2728';
    document.body.appendChild(popup);
    setTimeout(function () { if (popup && popup.parentNode) popup.parentNode.removeChild(popup); }, 3000);
  }

  showConfirmation(title, text, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    const t = document.getElementById('confirmation-title');
    const p = document.getElementById('confirmation-text');
    const yes = document.getElementById('btn-confirm-yes');
    const no = document.getElementById('btn-confirm-no');
    if (!modal || !t || !p || !yes || !no) return;
    t.textContent = title;
    p.textContent = text;
    yes.onclick = function () { modal.style.display = 'none'; if (typeof onConfirm === 'function') onConfirm(); };
    no.onclick = function () { modal.style.display = 'none'; };
    modal.style.display = 'flex';
  }

  startTimer() { setInterval(this.render.bind(this), 500); }
}

window.game = new FarmingGamePro();
window.addEventListener('DOMContentLoaded', function () { window.game.init(); });
