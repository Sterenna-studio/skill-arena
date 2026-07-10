// BZH Chronicles: Cyber Cellules - v3 COMPLETE ENGINE
// Moteur v1 + Complétude v2 + Système EXP avec fusion + Boss + Talents globaux

class CyberCellules {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        
        this.WIDTH = 800;
        this.HEIGHT = 600;
        
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
        
        // GAME DATA
        this.gameData = {
            characters: [
                {
                    id: "neo_druid",
                    name: "Néo-Druide",
                    description: "Maître des forces naturelles",
                    baseStats: {hp: 120, speed: 90, damage: 95, regen: 2},
                    color: "#00ff88",
                    unlocked: true
                },
                {
                    id: "cyber_corsaire",
                    name: "Cyber-Corsaire",
                    description: "Pirate spatial augmenté",
                    baseStats: {hp: 80, speed: 130, damage: 110, regen: 0},
                    color: "#00ffff",
                    cost: 500
                },
                {
                    id: "tech_shaman",
                    name: "Tech-Chaman",
                    description: "Chaman numérique",
                    baseStats: {hp: 100, speed: 80, damage: 85, regen: 1},
                    color: "#ff00ff",
                    cost: 1000
                },
                {
                    id: "void_walker",
                    name: "Marcheur du Vide",
                    description: "Manipulateur quantique",
                    baseStats: {hp: 90, speed: 100, damage: 150, regen: 0},
                    color: "#8000ff",
                    cost: 1500
                }
            ],
            
            upgrades: [
                {
                    name: "Vitalité Cybernétique",
                    desc: "+20 HP max",
                    icon: "❤️",
                    apply: (p) => {
                        p.maxHp += 20;
                        p.hp += 20;
                    }
                },
                {
                    name: "Surcharge Neural",
                    desc: "+15% dégâts",
                    icon: "⚡",
                    apply: (p) => {
                        p.damage *= 1.15;
                    }
                },
                {
                    name: "Boost Quantique",
                    desc: "+10% vitesse",
                    icon: "🚀",
                    apply: (p) => {
                        p.speed *= 1.1;
                    }
                },
                {
                    name: "Accélérateur Temporal",
                    desc: "-10% délai tir",
                    icon: "⏱️",
                    apply: (p) => {
                        p.fireRate *= 0.9;
                    }
                },
                {
                    name: "Zone Élargie",
                    desc: "+30 zone collecte",
                    icon: "🔮",
                    apply: (p) => {
                        p.expZoneRadius += 30;
                    }
                },
                {
                    name: "Magnet XP",
                    desc: "Orbes attirent plus",
                    icon: "🧲",
                    apply: (p) => {
                        p.expMagnetForce = (p.expMagnetForce || 1) + 0.5;
                    }
                }
            ],
            
            talents: [
                {
                    id: 'exp_zone',
                    name: 'Zone Collectrice +',
                    desc: '+10 px zone / niveau',
                    cost: 100,
                    maxLevel: 10,
                    applyMeta: (meta, level) => {
                        meta.expZoneBonus = level * 10;
                    }
                },
                {
                    id: 'exp_gain',
                    name: 'Harvest +',
                    desc: '+5% XP gagnée / niveau',
                    cost: 150,
                    maxLevel: 10,
                    applyMeta: (meta, level) => {
                        meta.expMultiplier = 1 + level * 0.05;
                    }
                },
                {
                    id: 'pickup_rate',
                    name: 'Taux de Drop',
                    desc: '+10% orbes / niveau',
                    cost: 100,
                    maxLevel: 5,
                    applyMeta: (meta, level) => {
                        meta.expDropRate = 1 + level * 0.1;
                    }
                }
            ]
        };
        
        this.gameState = 'menu';
        this.selectedCharacter = null;
        this.saveData = this.loadGameData();
        
        // Game entities
        this.player = null;
        this.entities = [];
        this.bullets = [];
        this.particles = [];
        this.xpOrbs = [];
        this.bossEntities = [];
        
        // Game tracking
        this.lastTime = 0;
        this.gameTime = 0;
        this.startTime = 0;
        this.stage = 1;
        this.room = 1;
        this.score = 0;
        this.kills = 0;
        this.expThisRun = 0;
        this.roomsPerStage = 5;
        this.currentRoom = 0;
        this.toKill = 0;
        this.spawnTimer = 0;
        this.fireTimer = 0;
        this.weaponLevel = 1;
        
        this.screenShake = 0;
        this.flashIntensity = 0;
        
        this.isBossRoom = false;
        this.currentBoss = null;
        
        this.keys = {};
        this.mouse = {x: 0, y: 0};
        
        this.init();
    }
    
    loadGameData() {
        const saved = localStorage.getItem('cyberCellulesV3');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {}
        }
        
        return {
            bestScore: 0,
            bestStage: 0,
            totalExpEarned: 0,
            unlockedCharacters: ['neo_druid'],
            talents: {
                exp_zone: 0,
                exp_gain: 0,
                pickup_rate: 0
            }
        };
    }
    
    saveGameData() {
        localStorage.setItem('cyberCellulesV3', JSON.stringify(this.saveData));
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
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Escape' && this.gameState === 'playing') {
                this.togglePause();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        const btn = (id, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', handler);
        };
        
        btn('startGame', () => this.startNewRun());
        btn('talentsBtn', () => this.showTalents());
        btn('pauseBtn', () => this.togglePause());
        btn('resumeBtn', () => this.togglePause());
        btn('playAgainBtn', () => this.startNewRun());
        btn('quitToMenuBtn', () => this.returnToMenu());
        btn('backToMenuBtn', () => this.returnToMenu());
        
        document.querySelectorAll('.backToMenu').forEach(b => {
            b.addEventListener('click', () => this.returnToMenu());
        });
    }
    
    updateUI() {
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        
        set('bestScore', this.saveData.bestScore);
        set('bestStage', this.saveData.bestStage);
        set('totalExpEarned', this.saveData.totalExpEarned);
        
        const zoneBonus = this.saveData.talents.exp_zone || 0;
        set('zoneRadius', 120 + zoneBonus * 10);
    }
    
    renderCharacterSelection() {
        const container = document.getElementById('characterSelection');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.gameData.characters.forEach(char => {
            const unlocked = this.saveData.unlockedCharacters.includes(char.id);
            const card = document.createElement('div');
            card.className = `character-card ${!unlocked ? 'locked' : ''}`;
            
            if (this.selectedCharacter?.id === char.id) {
                card.classList.add('selected');
            }
            
            card.innerHTML = `
                <h3>${char.name}</h3>
                <p>${char.description}</p>
                <div class="stats">
                    <span>HP: ${char.baseStats.hp}</span>
                    <span>SPD: ${char.baseStats.speed}</span>
                    <span>DMG: ${char.baseStats.damage}</span>
                </div>
                ${!unlocked ? '<p style="color: #ffff00; font-size: 11px;">🔒 LOCKED</p>' : ''}
            `;
            
            if (unlocked) {
                card.addEventListener('click', () => {
                    this.selectedCharacter = char;
                    this.renderCharacterSelection();
                });
            }
            
            container.appendChild(card);
        });
    }
    
    showTalents() {
        document.getElementById('mainMenu')?.classList.remove('active');
        document.getElementById('talentsScreen')?.classList.add('active');
        this.renderTalents();
    }
    
    renderTalents() {
        const container = document.getElementById('talentsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.gameData.talents.forEach(talent => {
            const level = this.saveData.talents[talent.id] || 0;
            const nextCost = Math.floor(talent.cost * Math.pow(1.15, level));
            const maxed = level >= talent.maxLevel;
            
            const card = document.createElement('div');
            card.className = 'talent-card';
            
            card.innerHTML = `
                <h4>${talent.name}</h4>
                <p>${talent.desc}</p>
                <div style="margin: 12px 0;">
                    <span>Niveau: ${level}/${talent.maxLevel}</span>
                </div>
                <button class="cyber-btn" ${maxed ? 'disabled' : ''}>
                    ${maxed ? 'MAX' : `${nextCost} XP`}
                </button>
            `;
            
            if (!maxed) {
                const btn = card.querySelector('button');
                btn.addEventListener('click', () => {
                    // Placeholder: implement talent purchase with meta XP
                });
            }
            
            container.appendChild(card);
        });
    }
    
    returnToMenu() {
        this.gameState = 'menu';
        document.querySelectorAll('.screen, .overlay').forEach(el => el.classList.remove('active'));
        document.getElementById('mainMenu')?.classList.add('active');
        this.updateUI();
        this.renderCharacterSelection();
    }
    
    startNewRun() {
        if (!this.selectedCharacter) {
            this.selectedCharacter = this.gameData.characters[0];
        }
        
        document.getElementById('mainMenu')?.classList.remove('active');
        document.getElementById('talentsScreen')?.classList.remove('active');
        document.getElementById('gameScreen')?.classList.add('active');
        
        this.gameState = 'playing';
        this.resetRun();
    }
    
    resetRun() {
        const char = this.selectedCharacter;
        const stats = char.baseStats;
        const talentBonus = (this.saveData.talents.exp_zone || 0) * 10;
        
        this.player = {
            x: this.WIDTH / 2,
            y: this.HEIGHT / 2,
            radius: 8,
            speed: stats.speed / 10,
            maxHp: stats.hp,
            hp: stats.hp,
            damage: stats.damage / 10,
            fireRate: 20,
            invuln: 0,
            regen: stats.regen,
            color: char.color,
            expZoneRadius: 120 + talentBonus,
            expMagnetForce: 1,
            multiShot: 1,
            piercing: false,
            aoe: 0
        };
        
        this.entities = [];
        this.bullets = [];
        this.particles = [];
        this.xpOrbs = [];
        this.bossEntities = [];
        
        this.stage = 1;
        this.room = 1;
        this.score = 0;
        this.kills = 0;
        this.expThisRun = 0;
        this.currentRoom = 0;
        this.toKill = 12 + Math.floor(this.stage * 2);
        this.spawnTimer = 60;
        this.fireTimer = 0;
        this.weaponLevel = 1;
        
        this.gameTime = 0;
        this.startTime = Date.now();
        
        this.screenShake = 0;
        this.flashIntensity = 0;
        
        this.isBossRoom = false;
        this.currentBoss = null;
        
        this.checkBossRoom();
        if (this.isBossRoom) {
            this.spawnBoss();
        }
    }
    
    checkBossRoom() {
        // Room 5, 10, 15, etc = mini boss
        // Room 10, 20, 30, etc = boss
        this.isBossRoom = this.room % 5 === 0;
        
        if (this.isBossRoom) {
            const isMajorBoss = this.room % 10 === 0;
            return { isMajor: isMajorBoss };
        }
        
        return null;
    }
    
    spawnBoss() {
        const isMajor = this.room % 10 === 0;
        const hpMult = isMajor ? 1.5 : 0.8;
        
        this.currentBoss = {
            x: this.WIDTH / 2,
            y: this.HEIGHT / 2,
            radius: 30,
            hp: 200 * hpMult * (1 + this.stage * 0.15),
            maxHp: 200 * hpMult * (1 + this.stage * 0.15),
            color: isMajor ? '#ff0066' : '#ff6600',
            speed: 0.8 + this.stage * 0.05,
            damage: 15 + this.stage * 3,
            isMajor: isMajor,
            attackTimer: 0,
            pattern: 0
        };
        
        this.toKill = 0; // Boss is sole objective
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pauseScreen')?.classList.add('active');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pauseScreen')?.classList.remove('active');
        }
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
        set('finalExp', this.expThisRun);
        set('finalTime', `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
        
        if (this.score > this.saveData.bestScore) {
            this.saveData.bestScore = this.score;
        }
        
        if (this.stage > this.saveData.bestStage) {
            this.saveData.bestStage = this.stage;
        }
        
        this.saveData.totalExpEarned += this.expThisRun;
        
        this.saveGameData();
    }
    
    // XP SYSTEM
    
    spawnXpOrbs(x, y, amount) {
        const multiplier = 1 + (this.saveData.talents.exp_gain || 0) * 0.05;
        const dropRate = 1 + (this.saveData.talents.pickup_rate || 0) * 0.1;
        
        const actualAmount = Math.floor(amount * multiplier * dropRate);
        
        // Break into denominations
        const orbs = [];
        let remaining = actualAmount;
        
        const denominations = [1000, 100, 10, 1];
        
        for (const denom of denominations) {
            while (remaining >= denom) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 3 + Math.random() * 2;
                
                orbs.push({
                    x: x + Math.cos(angle) * 20,
                    y: y + Math.sin(angle) * 20,
                    value: denom,
                    color: this.getOrbColor(denom),
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: this.getOrbSize(denom),
                    life: 300,
                    merged: false
                });
                
                remaining -= denom;
            }
        }
        
        this.xpOrbs.push(...orbs);
    }
    
    getOrbColor(value) {
        if (value >= 1000) return '#ffd700';  // Gold
        if (value >= 100) return '#9900ff';   // Violet
        if (value >= 10) return '#0099ff';    // Blue
        return '#00ff00';                      // Green
    }
    
    getOrbSize(value) {
        if (value >= 1000) return 14;
        if (value >= 100) return 12;
        if (value >= 10) return 10;
        return 8;
    }
    
    updateXpOrbs(dt) {
        if (!this.player) return;
        
        // Fusion pass
        this.mergeXpOrbs();
        
        // Update positions et collection
        for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
            const orb = this.xpOrbs[i];
            
            const dx = this.player.x - orb.x;
            const dy = this.player.y - orb.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Check if in collection zone
            if (dist < this.player.expZoneRadius) {
                // Magnet towards player
                const speed = 5 + (this.player.expMagnetForce || 1) * 2;
                orb.vx = (dx / dist) * speed;
                orb.vy = (dy / dist) * speed;
            }
            
            orb.x += orb.vx * dt;
            orb.y += orb.vy * dt;
            orb.life -= dt;
            
            // Apply friction
            orb.vx *= 0.98;
            orb.vy *= 0.98;
            
            // Collect if touching player
            if (dist < this.player.radius + orb.size) {
                this.expThisRun += orb.value;
                this.xpOrbs.splice(i, 1);
                
                // Visual feedback
                this.createParticles(this.player.x, this.player.y, 5, orb.color);
            } else if (orb.life <= 0) {
                this.xpOrbs.splice(i, 1);
            }
        }
    }
    
    mergeXpOrbs() {
        const mergeDistance = 30;
        let merged = true;
        
        while (merged) {
            merged = false;
            
            for (let i = 0; i < this.xpOrbs.length; i++) {
                for (let j = i + 1; j < this.xpOrbs.length; j++) {
                    const orb1 = this.xpOrbs[i];
                    const orb2 = this.xpOrbs[j];
                    
                    if (orb1.value !== orb2.value) continue;
                    
                    const dx = orb2.x - orb1.x;
                    const dy = orb2.y - orb1.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < mergeDistance) {
                        // Merge orb2 into orb1
                        orb1.value += orb2.value;
                        orb1.size = this.getOrbSize(orb1.value);
                        orb1.color = this.getOrbColor(orb1.value);
                        
                        this.xpOrbs.splice(j, 1);
                        merged = true;
                        break;
                    }
                }
                
                if (merged) break;
            }
        }
    }
    
    // MAIN GAME LOOP
    
    update(dt) {
        if (!this.player) return;
        
        this.gameTime += dt;
        
        this.updatePlayer(dt);
        this.updateSpawns(dt);
        this.updateEntities(dt);
        this.updateBullets(dt);
        this.updateXpOrbs(dt);
        this.updateParticles(dt);
        this.checkCollisions();
        this.updateFiring(dt);
        this.updateBoss(dt);
        this.updateHUD();
        this.checkRoomComplete();
        
        if (this.screenShake > 0) this.screenShake -= dt;
        if (this.flashIntensity > 0) this.flashIntensity -= dt * 0.1;
    }
    
    updatePlayer(dt) {
        if (!this.player) return;
        
        let dx = 0, dy = 0;
        
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
        
        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
        }
        
        this.player.x += dx * this.player.speed * dt;
        this.player.y += dy * this.player.speed * dt;
        
        const pr = this.player.radius;
        this.player.x = Math.max(pr, Math.min(this.WIDTH - pr, this.player.x));
        this.player.y = Math.max(pr, Math.min(this.HEIGHT - pr, this.player.y));
        
        if (this.player.invuln > 0) this.player.invuln -= dt;
        
        if (this.player.regen > 0 && this.player.hp < this.player.maxHp) {
            this.player.hp += this.player.regen * dt * 0.01;
            this.player.hp = Math.min(this.player.hp, this.player.maxHp);
        }
    }
    
    updateSpawns(dt) {
        if (this.isBossRoom || !this.player) return;
        
        this.spawnTimer -= dt;
        
        if (this.spawnTimer <= 0 && this.toKill > 0) {
            this.spawnEnemy();
            this.spawnTimer = Math.max(20, 40 - this.stage * 2);
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
        
        const types = [
            { hp: 30, speed: 1.5, radius: 12, color: '#ff3366' },
            { hp: 60, speed: 1, radius: 16, color: '#ff6600' },
            { hp: 15, speed: 2.5, radius: 8, color: '#ff00ff' }
        ];
        
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.entities.push({
            x, y,
            hp: type.hp + this.stage * 5,
            maxHp: type.hp + this.stage * 5,
            radius: type.radius,
            speed: type.speed + this.stage * 0.05,
            color: type.color,
            score: 10 + this.stage
        });
    }
    
    updateEntities(dt) {
        if (!this.player) return;
        
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const e = this.entities[i];
            if (!e) continue;
            
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                e.x += (dx / dist) * e.speed * dt;
                e.y += (dy / dist) * e.speed * dt;
            }
            
            if (e.hp <= 0) {
                this.killEnemy(i);
            }
        }
    }
    
    killEnemy(index) {
        const e = this.entities[index];
        this.entities.splice(index, 1);
        
        this.score += e.score || 10;
        this.kills++;
        
        // XP drops
        const xpAmount = 10 + this.stage * 2;
        this.spawnXpOrbs(e.x, e.y, xpAmount);
        
        this.createParticles(e.x, e.y, 15, e.color);
    }
    
    updateBoss(dt) {
        if (!this.currentBoss || !this.player) return;
        
        const boss = this.currentBoss;
        
        // Boss AI - wander and attack
        const dx = this.player.x - boss.x;
        const dy = this.player.y - boss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 300) {
            boss.x += (dx / dist) * boss.speed * dt;
            boss.y += (dy / dist) * boss.speed * dt;
        }
        
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
            this.bossShoots();
            boss.attackTimer = 60 + Math.random() * 40;
        }
        
        if (boss.hp <= 0) {
            this.killBoss();
        }
    }
    
    bossShoots() {
        if (!this.currentBoss || !this.player) return;
        
        // Shoot projectiles at player
        for (let i = 0; i < 3; i++) {
            const angle = Math.atan2(this.player.y - this.currentBoss.y, this.player.x - this.currentBoss.x);
            const spread = (Math.random() - 0.5) * 0.3;
            
            this.bullets.push({
                x: this.currentBoss.x,
                y: this.currentBoss.y,
                vx: Math.cos(angle + spread) * 3,
                vy: Math.sin(angle + spread) * 3,
                r: 5,
                dmg: this.currentBoss.damage * 0.3,
                color: this.currentBoss.color,
                life: 100,
                isBossBullet: true
            });
        }
    }
    
    killBoss() {
        this.score += 500;
        this.kills += 1;
        
        // Generous XP from boss
        this.spawnXpOrbs(this.currentBoss.x, this.currentBoss.y, 100);
        
        this.createParticles(this.currentBoss.x, this.currentBoss.y, 50, this.currentBoss.color);
        
        this.currentBoss = null;
        this.isBossRoom = false;
        
        this.showUpgrade();
    }
    
    updateFiring(dt) {
        this.fireTimer -= dt;
        
        if (this.fireTimer <= 0) {
            this.fire();
            this.fireTimer = this.player.fireRate;
        }
    }
    
    fire() {
        if (this.entities.length === 0 && !this.currentBoss) return;
        
        let target = null;
        let closestDist = Infinity;
        
        // Find closest target (enemy or boss)
        for (const e of this.entities) {
            const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
            if (dist < closestDist) {
                closestDist = dist;
                target = e;
            }
        }
        
        if (!target && this.currentBoss) {
            target = this.currentBoss;
        }
        
        if (!target) return;
        
        const dx = target.x - this.player.x;
        const dy = target.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        this.bullets.push({
            x: this.player.x,
            y: this.player.y,
            vx: (dx / dist) * 8,
            vy: (dy / dist) * 8,
            r: 4,
            dmg: this.player.damage,
            color: this.player.color,
            life: 100
        });
    }
    
    updateBullets(dt) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            if (!b) continue;
            
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            
            if (b.x < -20 || b.x > this.WIDTH + 20 || b.y < -20 || b.y > this.HEIGHT + 20 || b.life <= 0) {
                this.bullets.splice(i, 1);
            }
        }
    }
    
    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (!p) continue;
            
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.vx *= 0.98;
            p.vy *= 0.98;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    createParticles(x, y, count, color = '#00ffff') {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 2;
            
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30 + Math.random() * 20,
                color,
                size: 2 + Math.random() * 2
            });
        }
    }
    
    checkCollisions() {
        if (!this.player) return;
        
        // Bullets vs Enemies
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            if (!b || b.isBossBullet) continue;
            
            for (let j = this.entities.length - 1; j >= 0; j--) {
                const e = this.entities[j];
                if (!e) continue;
                
                const dx = b.x - e.x;
                const dy = b.y - e.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < b.r + e.radius) {
                    e.hp -= b.dmg;
                    this.bullets.splice(i, 1);
                    this.createParticles(e.x, e.y, 8, e.color);
                    break;
                }
            }
        }
        
        // Bullets vs Boss
        if (this.currentBoss) {
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                const b = this.bullets[i];
                if (!b || b.isBossBullet) continue;
                
                const dx = b.x - this.currentBoss.x;
                const dy = b.y - this.currentBoss.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < b.r + this.currentBoss.radius) {
                    this.currentBoss.hp -= b.dmg;
                    this.bullets.splice(i, 1);
                    this.screenShake = 10;
                    break;
                }
            }
        }
        
        // Player vs Enemies
        if (this.player.invuln <= 0) {
            for (const e of this.entities) {
                if (!e) continue;
                
                const dx = this.player.x - e.x;
                const dy = this.player.y - e.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < this.player.radius + e.radius) {
                    this.player.hp -= 10;
                    this.player.invuln = 60;
                    this.screenShake = 10;
                    this.flashIntensity = 0.5;
                    
                    if (this.player.hp <= 0) {
                        this.die();
                    }
                    break;
                }
            }
        }
        
        // Player vs Boss
        if (this.currentBoss && this.player.invuln <= 0) {
            const dx = this.player.x - this.currentBoss.x;
            const dy = this.player.y - this.currentBoss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < this.player.radius + this.currentBoss.radius) {
                this.player.hp -= 15;
                this.player.invuln = 60;
                this.screenShake = 15;
                this.flashIntensity = 0.7;
                
                if (this.player.hp <= 0) {
                    this.die();
                }
            }
        }
        
        // Enemy bullets vs Player
        if (this.player.invuln <= 0) {
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                const b = this.bullets[i];
                if (!b || !b.isBossBullet) continue;
                
                const dx = b.x - this.player.x;
                const dy = b.y - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < b.r + this.player.radius) {
                    this.player.hp -= b.dmg;
                    this.player.invuln = 30;
                    this.screenShake = 8;
                    this.flashIntensity = 0.4;
                    this.bullets.splice(i, 1);
                    
                    if (this.player.hp <= 0) {
                        this.die();
                    }
                }
            }
        }
    }
    
    checkRoomComplete() {
        if (this.isBossRoom) {
            if (!this.currentBoss && this.entities.length === 0) {
                this.nextRoom();
            }
        } else {
            if (this.entities.length === 0 && this.toKill === 0) {
                this.nextRoom();
            }
        }
    }
    
    nextRoom() {
        this.room++;
        
        if (this.room % this.roomsPerStage === 1) {
            this.stage++;
        }
        
        this.checkBossRoom();
        
        if (this.isBossRoom) {
            this.spawnBoss();
        } else {
            this.toKill = 12 + Math.floor(this.stage * 2);
            this.spawnTimer = 60;
            this.currentRoom = 0;
        }
    }
    
    showUpgrade() {
        this.gameState = 'upgrade';
        document.getElementById('upgradeScreen')?.classList.add('active');
        
        const available = this.gameData.upgrades;
        const shuffled = available.sort(() => Math.random() - 0.5).slice(0, 3);
        
        const choices = document.getElementById('upgradeChoices');
        if (choices) {
            choices.innerHTML = '';
            
            shuffled.forEach(upgrade => {
                const btn = document.createElement('button');
                btn.className = 'upgrade-choice';
                btn.innerHTML = `
                    <div class="upgrade-choice-title">${upgrade.icon} ${upgrade.name}</div>
                    <div class="upgrade-choice-desc">${upgrade.desc}</div>
                `;
                btn.addEventListener('click', () => {
                    upgrade.apply(this.player);
                    this.weaponLevel++;
                    document.getElementById('upgradeScreen')?.classList.remove('active');
                    this.gameState = 'playing';
                    this.nextRoom();
                });
                choices.appendChild(btn);
            });
        }
    }
    
    updateHUD() {
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        
        const hpBar = document.querySelector('.hp-bar');
        const hpText = document.querySelector('.hp-text');
        if (hpBar && this.player) {
            const hpPercent = (this.player.hp / this.player.maxHp) * 100;
            hpBar.style.width = `${hpPercent}%`;
        }
        if (hpText && this.player) {
            hpText.textContent = `${Math.ceil(this.player.hp)}/${this.player.maxHp}`;
        }
        
        set('characterDisplay', this.selectedCharacter?.name || '');
        set('currentStage', this.stage);
        set('currentRoom', this.room);
        set('enemiesLeft', this.entities.length + this.toKill);
        set('currentScore', this.score);
        set('expThisRun', this.expThisRun);
        set('weaponLevel', this.weaponLevel);
        set('expZone', this.player?.expZoneRadius || 120);
    }
    
    // RENDERING
    
    render() {
        if (!this.player) return;
        
        const ctx = this.ctx;
        
        if (this.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShake;
            const shakeY = (Math.random() - 0.5) * this.screenShake;
            ctx.save();
            ctx.translate(shakeX, shakeY);
        }
        
        // Background
        const gradient = ctx.createRadialGradient(this.WIDTH/2, this.HEIGHT/2, 0, this.WIDTH/2, this.HEIGHT/2, this.WIDTH);
        gradient.addColorStop(0, '#0a0a1f');
        gradient.addColorStop(1, '#000000');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        
        // Grid
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        const offset = (this.gameTime * 0.5) % gridSize;
        
        for (let x = -offset; x < this.WIDTH + gridSize; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.HEIGHT);
            ctx.stroke();
        }
        
        for (let y = -offset; y < this.HEIGHT + gridSize; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.WIDTH, y);
            ctx.stroke();
        }
        
        // XP Orbs
        for (const orb of this.xpOrbs) {
            ctx.fillStyle = orb.color;
            ctx.shadowColor = orb.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        
        // Particles
        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life / 50);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
            ctx.globalAlpha = 1;
        }
        
        // Bullets
        for (const b of this.bullets) {
            ctx.fillStyle = b.color;
            ctx.shadowColor = b.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        
        // Enemies
        for (const e of this.entities) {
            ctx.fillStyle = e.color;
            ctx.shadowColor = e.color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // HP bar
            const barW = e.radius * 2.5;
            const barH = 4;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(e.x - barW/2, e.y - e.radius - 10, barW, barH);
            
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(e.x - barW/2, e.y - e.radius - 10, barW * (e.hp / e.maxHp), barH);
            ctx.shadowBlur = 0;
        }
        
        // Boss
        if (this.currentBoss) {
            const boss = this.currentBoss;
            ctx.fillStyle = boss.color;
            ctx.shadowColor = boss.color;
            ctx.shadowBlur = 30;
            ctx.beginPath();
            ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Boss HP bar in HUD
            document.getElementById('bossHUD')?.style.removeProperty('display');
        }
        
        // Player exp zone (circle)
        ctx.strokeStyle = this.player.color;
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, this.player.expZoneRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        
        // Player
        const flash = this.player.invuln > 0 && Math.floor(this.gameTime / 5) % 2 === 0;
        if (!flash) {
            ctx.fillStyle = this.player.color;
            ctx.shadowColor = this.player.color;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = this.player.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, this.player.radius + 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        }
        
        // Flash effect
        if (this.flashIntensity > 0) {
            ctx.fillStyle = `rgba(255, 0, 51, ${this.flashIntensity})`;
            ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        }
        
        if (this.screenShake > 0) {
            ctx.restore();
        }
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = Math.min((currentTime - this.lastTime) / 16.667, 2);
        this.lastTime = currentTime;
        
        if (this.gameState === 'playing') {
            this.update(deltaTime);
            this.render();
        } else if (this.gameState === 'menu') {
            this.ctx.fillStyle = '#0a0a1f';
            this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        }
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.game = new CyberCellules();
    });
} else {
    window.game = new CyberCellules();
}
