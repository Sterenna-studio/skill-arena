// BZH Chronicles: Cyber Cellules - Complete & Fixed Game Engine
// Version finale combinant UI d'app.js + moteur fonctionnel de game.js

class CyberCellules {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        
        // Canvas dimensions
        this.WIDTH = 800;
        this.HEIGHT = 600;
        
        // Canvas resize handler
        this.resizeCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = this.canvas.getBoundingClientRect();
            const w = Math.floor(rect.width * dpr);
            const h = Math.floor(rect.height * dpr);
            
            if (this.canvas.width !== w || this.canvas.height !== h) {
                this.canvas.width = w;
                this.canvas.height = h;
                this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }
            
            this.WIDTH = Math.floor(rect.width);
            this.HEIGHT = Math.floor(rect.height);
        };
        
        // Game data
        this.gameData = {
            characters: [
                {
                    id: "neo_druid",
                    name: "Néo-Druide",
                    description: "Maître des forces naturelles cybernétiques",
                    baseStats: {hp: 120, speed: 90, damage: 95, regen: 2},
                    startWeapon: "Vigne Neural",
                    unlockAchievement: "starter",
                    special: "Régénération naturelle"
                },
                {
                    id: "cyber_corsaire",
                    name: "Cyber-Corsaire",
                    description: "Pirate spatial aux réflexes augmentés",
                    baseStats: {hp: 80, speed: 130, damage: 110, regen: 0},
                    startWeapon: "Pistons Plasma",
                    unlockAchievement: "reach_stage_10",
                    special: "Vitesse de déplacement accrue"
                },
                {
                    id: "tech_shaman",
                    name: "Tech-Chaman",
                    description: "Invocateur de drones et maître des réseaux",
                    baseStats: {hp: 100, speed: 80, damage: 85, regen: 1},
                    startWeapon: "Essaim Drones",
                    unlockAchievement: "kill_1000_enemies",
                    special: "Contrôle de drones"
                },
                {
                    id: "void_walker",
                    name: "Marcheur du Vide",
                    description: "Manipulateur de l'espace-temps",
                    baseStats: {hp: 90, speed: 100, damage: 120, regen: 0},
                    startWeapon: "Faisceau Quantique",
                    unlockAchievement: "no_damage_stage",
                    special: "Téléportation courte distance"
                }
            ],
            achievements: [
                {
                    id: "first_blood",
                    name: "Premier Sang",
                    description: "Éliminer votre premier ennemi",
                    reward: "Débloquer: Statistiques détaillées",
                    category: "combat"
                },
                {
                    id: "reach_stage_10",
                    name: "Explorateur Spatial",
                    description: "Atteindre le stage 10",
                    reward: "Débloquer: Cyber-Corsaire",
                    category: "progression"
                },
                {
                    id: "kill_1000_enemies",
                    name: "Génocide Cybernétique",
                    description: "Éliminer 1000 ennemis au total",
                    reward: "Débloquer: Tech-Chaman",
                    category: "combat"
                },
                {
                    id: "no_damage_stage",
                    name: "Intouchable",
                    description: "Compléter un stage sans prendre de dégâts",
                    reward: "Débloquer: Marcheur du Vide",
                    category: "mastery"
                }
            ],
            weapons: [
                {
                    name: "Vigne Neural",
                    type: "Organique",
                    description: "Lianes cybernétiques qui s'étendent automatiquement",
                    baseDamage: 25,
                    evolution: "Réseau Neural Complet"
                },
                {
                    name: "Pistons Plasma",
                    type: "Énergie",
                    description: "Tirs rapides de plasma concentré",
                    baseDamage: 30,
                    evolution: "Canon à Plasma Cyclique"
                }
            ],
            talents: [
                {
                    name: "Vitalité Augmentée",
                    description: "Augmente les PV maximum de 10 par niveau",
                    maxLevel: 10,
                    costProgression: [10, 15, 25, 40, 60, 85, 115, 150, 200, 300]
                },
                {
                    name: "Puissance de Feu",
                    description: "Augmente les dégâts de 5% par niveau",
                    maxLevel: 10,
                    costProgression: [15, 20, 30, 45, 65, 90, 120, 160, 210, 320]
                },
                {
                    name: "Vitesse d'Attaque",
                    description: "Réduit le délai entre les tirs de 5% par niveau",
                    maxLevel: 10,
                    costProgression: [12, 18, 28, 42, 62, 87, 117, 155, 205, 310]
                }
            ]
        };
        
        // Game state
        this.gameState = 'menu'; // 'menu', 'playing', 'paused', 'gameOver', 'upgrade'
        this.selectedCharacter = null;
        this.currentRun = null;
        this.isPaused = false;
        
        // Save data
        this.saveData = this.loadGameData();
        
        // Game entities (from game.js engine)
        this.player = null;
        this.entities = [];
        this.bullets = [];
        this.particles = [];
        this.pickups = [];
        
        // Timing
        this.lastTime = 0;
        this.gameTime = 0;
        this.startTime = 0;
        
        // Input
        this.keys = {};
        this.mouse = {x: 0, y: 0, buttons: 0};
        
        // Game variables
        this.stage = 1;
        this.room = 1;
        this.roomsPerStage = 5;
        this.score = 0;
        this.shards = 0;
        this.kills = 0;
        this.toKill = 0;
        this.killGoal = 15;
        this.spawnTimer = 0;
        this.fireTimer = 0;
        this.weaponLevel = 1;
        
        this.init();
    }
    
    // INITIALIZATION
    
    loadGameData() {
        const saved = localStorage.getItem('cyberCellulesSave');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load save data:', e);
            }
        }
        
        return {
            totalShards: 0,
            totalKills: 0,
            totalDeaths: 0,
            bestScore: 0,
            totalPlayTime: 0,
            achievements: {},
            unlockedCharacters: ["neo_druid"],
            talents: {
                "Vitalité Augmentée": 0,
                "Puissance de Feu": 0,
                "Vitesse d'Attaque": 0
            },
            settings: {volume: 0.7, sfxVolume: 0.8}
        };
    }
    
    saveGameData() {
        localStorage.setItem('cyberCellulesSave', JSON.stringify(this.saveData));
    }
    
    init() {
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas);
        this.setupEventListeners();
        this.updateUI();
        this.renderCharacterSelection();
        this.gameLoop();
    }
    
    setupEventListeners() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Escape' && this.gameState === 'playing') {
                this.togglePause();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        // UI Buttons
        const btn = (id, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', handler);
        };
        
        btn('startGame', () => this.startNewRun());
        btn('pauseBtn', () => this.togglePause());
        btn('resumeBtn', () => this.togglePause());
        btn('playAgainBtn', () => this.startNewRun());
        btn('quitToMenuBtn', () => this.returnToMenu());
        btn('backToMenuBtn', () => this.returnToMenu());
        
        btn('achievementsBtn', () => this.showAchievements());
        btn('talentsBtn', () => this.showTalents());
        
        document.querySelectorAll('.backToMenu').forEach(btn => {
            btn.addEventListener('click', () => this.returnToMenu());
        });
    }
    
    // UI MANAGEMENT
    
    updateUI() {
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        
        set('totalShards', this.saveData.totalShards);
        set('bestScore', this.saveData.bestScore);
        set('achievementCount', `${Object.keys(this.saveData.achievements).length}/${this.gameData.achievements.length}`);
    }
    
    renderCharacterSelection() {
        const container = document.getElementById('characterSelection');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.gameData.characters.forEach(character => {
            const isUnlocked = this.saveData.unlockedCharacters.includes(character.id);
            const card = document.createElement('div');
            card.className = `character-card ${!isUnlocked ? 'locked' : ''}`;
            
            if (this.selectedCharacter?.id === character.id) {
                card.classList.add('selected');
            }
            
            card.innerHTML = `
                <h3>${character.name}</h3>
                <p>${character.description}</p>
                <div class="stats">
                    <span>HP: ${character.baseStats.hp}</span>
                    <span>Speed: ${character.baseStats.speed}</span>
                    <span>Damage: ${character.baseStats.damage}</span>
                    <span>Regen: ${character.baseStats.regen}</span>
                </div>
                ${!isUnlocked ? '<p style="color: #ff0; font-size: 11px; margin-top: 8px;">🔒 Locked</p>' : ''}
            `;
            
            if (isUnlocked) {
                card.addEventListener('click', () => {
                    this.selectedCharacter = character;
                    this.renderCharacterSelection();
                });
            }
            
            container.appendChild(card);
        });
    }
    
    showAchievements() {
        document.getElementById('mainMenu').classList.remove('active');
        document.getElementById('achievementsScreen').classList.add('active');
        
        const container = document.getElementById('achievementsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.gameData.achievements.forEach(achievement => {
            const isUnlocked = this.saveData.achievements[achievement.id];
            const card = document.createElement('div');
            card.className = `achievement-card ${isUnlocked ? 'unlocked' : ''}`;
            
            card.innerHTML = `
                <h4 class="achievement-title">${achievement.name}</h4>
                <p class="achievement-description">${achievement.description}</p>
                <div class="achievement-reward">${achievement.reward}</div>
                ${isUnlocked ? '<p style="color: #0f0; font-size: 12px; margin-top: 8px;">✓ Unlocked</p>' : ''}
            `;
            
            container.appendChild(card);
        });
    }
    
    showTalents() {
        document.getElementById('mainMenu').classList.remove('active');
        document.getElementById('talentsScreen').classList.add('active');
        
        document.getElementById('availableShards').textContent = this.saveData.totalShards;
        
        const container = document.getElementById('talentsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.gameData.talents.forEach(talent => {
            const currentLevel = this.saveData.talents[talent.name] || 0;
            const nextCost = talent.costProgression[currentLevel] || '—';
            const maxed = currentLevel >= talent.maxLevel;
            
            const card = document.createElement('div');
            card.className = 'talent-card';
            
            card.innerHTML = `
                <div class="talent-header">
                    <div class="talent-name">${talent.name}</div>
                    <div class="talent-level">${currentLevel}/${talent.maxLevel}</div>
                </div>
                <p class="talent-description">${talent.description}</p>
                <div class="talent-upgrade">
                    <span class="talent-cost">Cost: ${nextCost} shards</span>
                    <button class="cyber-btn ${maxed || this.saveData.totalShards < nextCost ? 'disabled' : ''}" 
                            ${maxed || this.saveData.totalShards < nextCost ? 'disabled' : ''}>
                        ${maxed ? 'MAX' : 'Upgrade'}
                    </button>
                </div>
            `;
            
            if (!maxed && this.saveData.totalShards >= nextCost) {
                const btn = card.querySelector('button');
                btn.addEventListener('click', () => {
                    this.saveData.talents[talent.name]++;
                    this.saveData.totalShards -= nextCost;
                    this.saveGameData();
                    this.showTalents();
                });
            }
            
            container.appendChild(card);
        });
    }
    
    returnToMenu() {
        this.gameState = 'menu';
        document.querySelectorAll('.screen, .overlay').forEach(el => el.classList.remove('active'));
        document.getElementById('mainMenu').classList.add('active');
        this.updateUI();
        this.renderCharacterSelection();
    }
    
    // GAME FLOW
    
    startNewRun() {
        if (!this.selectedCharacter) {
            this.selectedCharacter = this.gameData.characters[0];
        }
        
        // Hide menu, show game
        document.getElementById('mainMenu')?.classList.remove('active');
        document.getElementById('gameScreen')?.classList.add('active');
        
        this.gameState = 'playing';
        this.resetRun();
    }
    
    resetRun() {
        const charStats = this.selectedCharacter.baseStats;
        const vitalityBonus = (this.saveData.talents["Vitalité Augmentée"] || 0) * 10;
        const damageBonus = 1 + (this.saveData.talents["Puissance de Feu"] || 0) * 0.05;
        const fireRateBonus = 1 - (this.saveData.talents["Vitesse d'Attaque"] || 0) * 0.05;
        
        // Initialize player
        this.player = {
            x: this.WIDTH / 2,
            y: this.HEIGHT / 2,
            radius: 8,
            speed: charStats.speed / 10,
            maxHp: charStats.hp + vitalityBonus,
            hp: charStats.hp + vitalityBonus,
            damage: (charStats.damage / 10) * damageBonus,
            fireRate: 20 * fireRateBonus,
            invuln: 0,
            regen: charStats.regen
        };
        
        this.entities = [];
        this.bullets = [];
        this.particles = [];
        this.pickups = [];
        
        this.stage = 1;
        this.room = 1;
        this.score = 0;
        this.shards = 0;
        this.kills = 0;
        this.toKill = this.killGoal;
        this.spawnTimer = 60;
        this.fireTimer = 0;
        this.weaponLevel = 1;
        this.gameTime = 0;
        this.startTime = Date.now();
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pauseScreen')?.classList.add('active');
            this.updatePauseScreen();
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pauseScreen')?.classList.remove('active');
        }
    }
    
    updatePauseScreen() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        
        set('pauseTime', `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
        set('pauseKills', this.kills);
        set('pauseShards', this.shards);
    }
    
    die() {
        this.gameState = 'gameOver';
        document.getElementById('gameOverScreen')?.classList.add('active');
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        
        set('finalScore', this.score);
        set('finalStage', this.stage);
        set('finalKills', this.kills);
        set('finalTime', `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
        set('finalShards', this.shards);
        set('newAchievements', 0);
        
        // Update save data
        this.saveData.totalDeaths++;
        this.saveData.totalKills += this.kills;
        this.saveData.totalShards += this.shards;
        
        if (this.score > this.saveData.bestScore) {
            this.saveData.bestScore = this.score;
        }
        
        // Check achievements
        if (this.kills > 0 && !this.saveData.achievements.first_blood) {
            this.saveData.achievements.first_blood = true;
        }
        
        if (this.stage >= 10 && !this.saveData.achievements.reach_stage_10) {
            this.saveData.achievements.reach_stage_10 = true;
            if (!this.saveData.unlockedCharacters.includes('cyber_corsaire')) {
                this.saveData.unlockedCharacters.push('cyber_corsaire');
            }
        }
        
        if (this.saveData.totalKills >= 1000 && !this.saveData.achievements.kill_1000_enemies) {
            this.saveData.achievements.kill_1000_enemies = true;
            if (!this.saveData.unlockedCharacters.includes('tech_shaman')) {
                this.saveData.unlockedCharacters.push('tech_shaman');
            }
        }
        
        this.saveGameData();
    }
    
    showUpgrade() {
        this.gameState = 'upgrade';
        document.getElementById('upgradeScreen')?.classList.add('active');
        
        // Generate upgrade options
        const upgrades = [
            {
                name: "+20 HP Max",
                description: "Augmente les PV maximum",
                apply: () => {
                    this.player.maxHp += 20;
                    this.player.hp += 20;
                }
            },
            {
                name: "+15% Dégâts",
                description: "Augmente les dégâts infligés",
                apply: () => {
                    this.player.damage *= 1.15;
                }
            },
            {
                name: "+10% Vitesse",
                description: "Augmente la vitesse de déplacement",
                apply: () => {
                    this.player.speed *= 1.1;
                }
            },
            {
                name: "+10% Cadence de Tir",
                description: "Réduit le délai entre les tirs",
                apply: () => {
                    this.player.fireRate *= 0.9;
                }
            }
        ];
        
        // Shuffle and take 3
        const shuffled = upgrades.sort(() => Math.random() - 0.5).slice(0, 3);
        
        // Display upgrade choices
        const choices = document.getElementById('upgradeChoices');
        if (choices) {
            choices.innerHTML = '';
            
            shuffled.forEach(upgrade => {
                const btn = document.createElement('button');
                btn.className = 'upgrade-choice';
                btn.innerHTML = `
                    <div style="font-size: 18px; margin-bottom: 8px;">${upgrade.name}</div>
                    <div style="font-size: 12px; opacity: 0.8;">${upgrade.description}</div>
                `;
                btn.addEventListener('click', () => {
                    upgrade.apply();
                    document.getElementById('upgradeScreen')?.classList.remove('active');
                    this.gameState = 'playing';
                    this.toKill = Math.floor(this.killGoal + this.stage * 1.2);
                    this.spawnTimer = 60;
                    this.weaponLevel++;
                });
                choices.appendChild(btn);
            });
        }
    }
    
    // GAME ENGINE (from game.js)
    
    update(dt) {
        this.gameTime += dt;
        
        // Update player
        this.updatePlayer(dt);
        
        // Update entities
        this.updateEntities(dt);
        
        // Update bullets
        this.updateBullets(dt);
        
        // Update particles
        this.updateParticles(dt);
        
        // Update pickups
        this.updatePickups(dt);
        
        // Check collisions
        this.checkCollisions();
        
        // Spawn enemies
        this.updateSpawns(dt);
        
        // Auto-fire
        this.updateFiring(dt);
        
        // Update HUD
        this.updateHUD();
        
        // Check room complete
        this.checkRoomComplete();
    }
    
    updatePlayer(dt) {
        if (!this.player) return;
        
        // Movement
        let dx = 0, dy = 0;
        
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
        
        // Normalize diagonal movement
        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
        }
        
        this.player.x += dx * this.player.speed * dt;
        this.player.y += dy * this.player.speed * dt;
        
        // Bounds checking
        const pr = this.player.radius;
        this.player.x = Math.max(pr, Math.min(this.WIDTH - pr, this.player.x));
        this.player.y = Math.max(pr, Math.min(this.HEIGHT - pr, this.player.y));
        
        // Invulnerability
        if (this.player.invuln > 0) {
            this.player.invuln -= dt;
        }
        
        // Regeneration
        if (this.player.regen > 0 && this.player.hp < this.player.maxHp) {
            this.player.hp += this.player.regen * dt * 0.01;
            this.player.hp = Math.min(this.player.hp, this.player.maxHp);
        }
    }
    
    updateEntities(dt) {
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const e = this.entities[i];
            
            // Move towards player
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                e.x += (dx / dist) * e.speed * dt;
                e.y += (dy / dist) * e.speed * dt;
            }
            
            // Remove dead enemies
            if (e.hp <= 0) {
                this.killEnemy(i);
            }
        }
    }
    
    updateBullets(dt) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            
            // Remove off-screen bullets
            if (b.x < -20 || b.x > this.WIDTH + 20 || b.y < -20 || b.y > this.HEIGHT + 20) {
                this.bullets.splice(i, 1);
            }
        }
    }
    
    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    updatePickups(dt) {
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const p = this.pickups[i];
            
            // Check if player collects
            const dx = this.player.x - p.x;
            const dy = this.player.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < this.player.radius + 8) {
                this.shards += p.value;
                this.pickups.splice(i, 1);
            }
        }
    }
    
    checkCollisions() {
        // Bullets vs Enemies
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            
            for (let j = this.entities.length - 1; j >= 0; j--) {
                const e = this.entities[j];
                const dx = b.x - e.x;
                const dy = b.y - e.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < b.r + e.radius) {
                    e.hp -= b.dmg;
                    this.bullets.splice(i, 1);
                    
                    // Particle effect
                    this.createParticles(e.x, e.y, 5);
                    
                    if (e.hp <= 0) {
                        this.killEnemy(j);
                    }
                    break;
                }
            }
        }
        
        // Player vs Enemies
        if (this.player.invuln <= 0) {
            for (const e of this.entities) {
                const dx = this.player.x - e.x;
                const dy = this.player.y - e.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < this.player.radius + e.radius) {
                    this.player.hp -= 10;
                    this.player.invuln = 60;
                    
                    if (this.player.hp <= 0) {
                        this.die();
                    }
                    break;
                }
            }
        }
    }
    
    updateSpawns(dt) {
        this.spawnTimer -= dt;
        
        if (this.spawnTimer <= 0 && this.toKill > 0) {
            this.spawnEnemy();
            this.spawnTimer = 40;
            this.toKill--;
        }
    }
    
    spawnEnemy() {
        const edge = Math.floor(Math.random() * 4);
        let x, y;
        
        switch(edge) {
            case 0: x = Math.random() * this.WIDTH; y = -30; break;
            case 1: x = this.WIDTH + 30; y = Math.random() * this.HEIGHT; break;
            case 2: x = Math.random() * this.WIDTH; y = this.HEIGHT + 30; break;
            case 3: x = -30; y = Math.random() * this.HEIGHT; break;
        }
        
        this.entities.push({
            x, y,
            hp: 30 + this.stage * 5,
            radius: 12,
            speed: 1.5 + this.stage * 0.1,
            damage: 10
        });
    }
    
    killEnemy(index) {
        const e = this.entities[index];
        this.entities.splice(index, 1);
        
        this.score += 10 + this.stage * 2;
        this.kills++;
        
        // Create particles
        this.createParticles(e.x, e.y, 10);
        
        // Maybe drop shard
        if (Math.random() < 0.3) {
            this.pickups.push({
                x: e.x,
                y: e.y,
                type: 'shard',
                value: 1
            });
        }
    }
    
    createParticles(x, y, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30,
                kind: 'spark'
            });
        }
    }
    
    updateFiring(dt) {
        this.fireTimer -= dt;
        
        if (this.fireTimer <= 0) {
            this.fire();
            this.fireTimer = this.player.fireRate;
        }
    }
    
    fire() {
        if (this.entities.length === 0) return;
        
        // Find closest enemy
        let closest = null;
        let closestDist = Infinity;
        
        for (const e of this.entities) {
            const dx = e.x - this.player.x;
            const dy = e.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < closestDist) {
                closestDist = dist;
                closest = e;
            }
        }
        
        if (closest) {
            const dx = closest.x - this.player.x;
            const dy = closest.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const speed = 8;
            
            this.bullets.push({
                x: this.player.x,
                y: this.player.y,
                vx: (dx / dist) * speed,
                vy: (dy / dist) * speed,
                r: 4,
                dmg: this.player.damage
            });
        }
    }
    
    checkRoomComplete() {
        if (this.entities.length === 0 && this.toKill <= 0) {
            this.room++;
            
            if (this.room > this.roomsPerStage) {
                this.room = 1;
                this.stage++;
                this.showUpgrade();
            } else {
                this.toKill = Math.floor(this.killGoal + this.stage * 1.2);
                this.spawnTimer = 60;
            }
        }
    }
    
    updateHUD() {
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        
        // HP Bar
        const hpBar = document.querySelector('.hp-bar');
        const hpText = document.querySelector('.hp-text');
        if (hpBar && this.player) {
            const hpPercent = (this.player.hp / this.player.maxHp) * 100;
            hpBar.style.width = `${hpPercent}%`;
            
            if (hpPercent < 30) {
                hpBar.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)';
            } else if (hpPercent < 60) {
                hpBar.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc44)';
            } else {
                hpBar.style.background = 'linear-gradient(90deg, #00ff00, #00ff88)';
            }
        }
        if (hpText && this.player) {
            hpText.textContent = `${Math.ceil(this.player.hp)}/${this.player.maxHp}`;
        }
        
        // Character & Weapon
        set('characterDisplay', this.selectedCharacter?.name || '');
        set('weaponName', this.selectedCharacter?.startWeapon || '');
        set('weaponLevel', this.weaponLevel);
        set('weaponLevelNum', this.weaponLevel);
        
        // Game Stats
        set('currentStage', this.stage);
        set('currentRoom', this.room);
        set('enemiesLeft', this.entities.length + this.toKill);
        set('currentScore', this.score);
        set('shardsCollected', this.shards);
    }
    
    // RENDERING
    
    render() {
        const ctx = this.ctx;
        
        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        
        // Grid background
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 1;
        
        for (let x = 0; x < this.WIDTH; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.HEIGHT);
            ctx.stroke();
        }
        
        for (let y = 0; y < this.HEIGHT; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.WIDTH, y);
            ctx.stroke();
        }
        
        // Particles
        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life / 30);
            ctx.fillStyle = '#ff6699';
            ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
            ctx.globalAlpha = 1;
        }
        
        // Pickups
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 10;
        for (const p of this.pickups) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        
        // Bullets
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 8;
        for (const b of this.bullets) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        
        // Enemies
        for (const e of this.entities) {
            // Enemy body
            ctx.fillStyle = '#ff3366';
            ctx.shadowColor = '#ff3366';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // HP bar
            const barW = e.radius * 2;
            const barH = 3;
            const maxHp = 30 + this.stage * 5;
            const hpPercent = e.hp / maxHp;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(e.x - barW/2, e.y - e.radius - 8, barW, barH);
            
            ctx.fillStyle = hpPercent > 0.5 ? '#0f0' : hpPercent > 0.25 ? '#ff0' : '#f00';
            ctx.fillRect(e.x - barW/2, e.y - e.radius - 8, barW * hpPercent, barH);
        }
        
        // Player
        if (this.player) {
            const flash = this.player.invuln > 0 && Math.floor(this.gameTime / 5) % 2 === 0;
            
            if (!flash) {
                ctx.fillStyle = '#00ff88';
                ctx.shadowColor = '#00ff88';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }
    
    // GAME LOOP
    
    gameLoop(currentTime = 0) {
        const deltaTime = Math.min((currentTime - this.lastTime) / 16.667, 2);
        this.lastTime = currentTime;
        
        if (this.gameState === 'playing') {
            this.update(deltaTime);
            this.render();
        } else if (this.gameState === 'menu') {
            // Just clear canvas on menu
            this.ctx.fillStyle = '#0a0a0f';
            this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        }
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Initialize game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.game = new CyberCellules();
    });
} else {
    window.game = new CyberCellules();
}
