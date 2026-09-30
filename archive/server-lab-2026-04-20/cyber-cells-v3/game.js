// BZH Chronicles: Rogue Cells - v3
// Bosses, Secondary Weapons, Meta-Progression, Gamepad
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const $ = (sel) => document.querySelector(sel);
  const menu = $('#menu');
  const hud = $('#hud');
  const upgradeOverlay = $('#upgrade');
  const deathOverlay = $('#death');
  const pauseOverlay = $('#pause');
  const bestLevelEl = $('#bestLevel');
  const bestScoreEl = $('#bestScore');
  const metaShardsEl = $('#metaShards');
  const heartsEl = $('#hearts');
  const stageEl = $('#stage');
  const roomEl = $('#room');
  const scoreEl = $('#score');
  const shardsEl = $('#shards');
  const ztEl = $('#zt');
  const secEl = $('#sec');
  const finalScoreEl = $('#finalScore');
  const finalLevelEl = $('#finalLevel');
  const finalShardsEl = $('#finalShards');
  const menuLeaderboardEl = $('#menuLeaderboard');
  const deathLeaderboardEl = $('#deathLeaderboard');
  const initialsInput = $('#initials');
  const saveBtn = $('#saveScoreBtn');
  const saveStatus = $('#saveStatus');
  const metaPanel = $('#metaPanel');
  const gpState = $('#gpState');

  const playBtn = $('#playBtn');
  const retryBtn = $('#retryBtn');
  const menuBtn = $('#menuBtn');
  const autoBtn = $('#autoBtn');
  const pauseBtn = $('#pauseBtn');
  const resumeBtn = $('#resumeBtn');
  const toggleAutoBtn = $('#toggleAutoBtn');
  const quitBtn = $('#quitBtn');

  const choicesEl = $('#choices');

  // Local save
  const save = JSON.parse(localStorage.getItem('bzh_rogue_save_v1')||'{}');
  const persist = () => localStorage.setItem('bzh_rogue_save_v1', JSON.stringify(save));

  // Meta progression
  const META_KEY = 'bzh_rogue_meta_v1';
  const meta = Object.assign({shards:0, talents:{hp:0,dmg:0,fr:0,pickup:0}}, JSON.parse(localStorage.getItem(META_KEY)||'{}'));
  const metaSave = () => localStorage.setItem(META_KEY, JSON.stringify(meta));

  // Leaderboard
  const LB_KEY = 'bzh_rogue_lb_v1';
  const loadLB = () => JSON.parse(localStorage.getItem(LB_KEY)||'[]');
  const storeLB = (arr) => localStorage.setItem(LB_KEY, JSON.stringify(arr.slice(0,10)));
  const addScore = (name, score, level) => {
    name = (name||'AAAA').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4).padEnd(4,'A');
    const arr = loadLB();
    arr.push({name, score, level, date: Date.now()});
    arr.sort((a,b) => b.score - a.score || b.level - a.level || a.date - b.date);
    storeLB(arr);
    renderLB();
  };
  const renderLB = () => {
    const arr = loadLB();
    const render = (el) => {
      if (!el) return;
      el.innerHTML = arr.map((e,i)=>`<li>#${String(i+1).padStart(2,'0')} — <b>${e.name}</b> — <span>${e.score}</span> pts (Lv ${e.level})</li>`).join('') || '<li>Aucun score pour le moment.</li>';
    };
    render(menuLeaderboardEl);
    render(deathLeaderboardEl);
  };

  // Meta talents UI
  function talentRow(id, label, desc, costFn, lvlMax=5){
    const lvl = meta.talents[id]||0;
    const cost = lvl>=lvlMax ? '-' : costFn(lvl);
    return `<div class="meta-card">
      <h3>${label} — Lv ${lvl}/${lvlMax}</h3>
      <div class="meta-desc">${desc}</div>
      <div class="meta-cost">Coût: <b>${cost}</b> shards</div>
      <button data-talent="${id}" ${lvl>=lvlMax?'disabled':''}>Acheter</button>
    </div>`;
  }
  function renderMeta(){
    metaShardsEl.textContent = meta.shards||0;
    metaPanel.innerHTML = [
      talentRow('hp','Cuirasse Runique', '+1 PV max au départ par niveau.', l=> 20 + l*20, 5),
      talentRow('dmg','Glyphes de Puissance', '+10% dégâts par niveau.', l=> 30 + l*30, 5),
      talentRow('fr','Condenseur Chrono', '+10% cadence de tir par niveau.', l=> 35 + l*35, 5),
      talentRow('pickup','Triskel Magnétique', '+15 portée de ramassage par niveau.', l=> 15 + l*15, 5),
    ].join('');
    metaPanel.querySelectorAll('button[data-talent]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-talent');
        const costFn = {hp:l=>20+l*20, dmg:l=>30+l*30, fr:l=>35+l*35, pickup:l=>15+l*15}[id];
        const lvlMax = 5;
        const lvl = meta.talents[id]||0;
        if (lvl>=lvlMax) return;
        const cost = costFn(lvl);
        if ((meta.shards||0) >= cost){
          meta.shards -= cost;
          meta.talents[id] = lvl+1;
          metaSave();
          renderMeta();
        }
      });
    });
  }

  // Init UI
  bestLevelEl.textContent = save.bestLevel || 0;
  bestScoreEl.textContent = save.bestScore || 0;
  renderLB();
  renderMeta();

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  // Input
  const keys = {};
  const mouse = {x: WIDTH/2, y: HEIGHT/2, down: false, sec:false};
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if(['1','2','3'].includes(e.key) && upgradeOverlay.classList.contains('visible')) pickByKey(e.key);
    if (k === 'p' || e.key === 'Escape') togglePause();
    if (k === ' ') mouse.sec = true;
  });
  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
    if (e.key === ' ') mouse.sec = false;
  });
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button===0) mouse.down = true;
    if (e.button===2) mouse.sec = true;
  });
  canvas.addEventListener('mouseup', (e) => {
    if (e.button===0) mouse.down = false;
    if (e.button===2) mouse.sec = false;
  });
  canvas.addEventListener('contextmenu', (e)=> e.preventDefault());
  canvas.addEventListener('pointerdown', () => { canvas.focus({preventScroll:true}); });

  // Gamepad
  let gpIndex = null;
  let prevButtons = [];
  window.addEventListener('gamepadconnected', (e)=>{ gpIndex = e.gamepad.index; gpState.textContent='connecté'; });
  window.addEventListener('gamepaddisconnected', ()=>{ gpIndex = null; gpState.textContent='non détecté'; });

  function readGamepad(){
    if (gpIndex==null) return;
    const gp = navigator.getGamepads()[gpIndex];
    if (!gp) return;
    // Movement (left stick)
    const ax = gp.axes[0] || 0;
    const ay = gp.axes[1] || 0;
    const dead=0.2;
    let gdx = Math.abs(ax)>dead ? ax : 0;
    let gdy = Math.abs(ay)>dead ? ay : 0;
    // Set keyboard-like state
    keys['gp_dx'] = gdx; keys['gp_dy'] = gdy;

    // Aim (right stick)
    const rx = gp.axes[2] ?? gp.axes[3] ?? 0;
    const ry = gp.axes[3] ?? gp.axes[4] ?? 0;
    const arx = Math.abs(rx)>dead ? rx : 0;
    const ary = Math.abs(ry)>dead ? ry : 0;
    if (arx!==0 || ary!==0){
      aimVec.x = arx; aimVec.y = ary; aimVec.active = true;
    } else {
      aimVec.active = false;
    }

    // Buttons
    const b = gp.buttons.map(x=> !!x.pressed);
    const pressed = (i) => b[i] && !prevButtons[i];
    // Fire primary: A (0) or RT (7)
    mouse.down = b[0] || b[7];
    // Secondary: LT (6)
    mouse.sec = b[6];
    // Toggle auto: Y (3)
    if (pressed(3)) toggleAuto();
    // Pause: Start (9)
    if (pressed(9)) togglePause();
    // ZT Focus: LB (4)
    if (pressed(4)) tryZT();

    prevButtons = b;
  }

  // Audio
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const beep = (f=220, t=0.06, g=0.04) => {
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = f;
      osc.type = 'triangle';
      gain.gain.value = g;
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + t);
    } catch {}
  };

  // Helpers
  const rand = (a,b) => Math.random()*(b-a)+a;
  const randi = (a,b) => Math.floor(rand(a,b+1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist2 = (a,b,x,y) => (a-x)*(a-x) + (b-y)*(b-y);

  // Game state
  let state = 'menu';
  let entities = [];
  let bullets = [];
  let enemyBullets = [];
  let particles = [];
  let beams = [];
  let drones = [];
  let shards = 0;
  let score = 0;
  let stage = 1;
  let roomInStage = 1;
  let killGoal = 12;
  let toKill = killGoal;
  let spawnTimer = 0;
  let slowMo = 1.0;
  let slowMoTimer = 0;
  let slowMoCD = 0;
  let player;
  let autoFire = false;
  let savedThisRun = false;
  let bossMode = false;
  let bossAlive = false;
  let secondary = {type:null, cd:0, cdMax:240};
  const aimVec = {x:0,y:0,active:false};

  function applyMeta(p){
    const t = meta.talents||{};
    const hp = t.hp||0, dmg=t.dmg||0, fr=t.fr||0, pk=t.pickup||0;
    p.hpMax += hp;
    p.hp = Math.min(p.hp + hp, p.hpMax);
    p.damage *= (1 + 0.10*dmg);
    p.fireRate = Math.max(3, Math.floor(p.fireRate * Math.pow(0.9, fr)));
    p.pickupRange += pk*15;
  }

  function resetRun() {
    entities.length = 0; bullets.length = 0; enemyBullets.length = 0; particles.length = 0; beams.length = 0; drones.length = 0;
    shards = 0; score = 0; stage = 1; roomInStage = 1;
    killGoal = 10; toKill = killGoal; spawnTimer = 0;
    slowMo = 1.0; slowMoTimer = 0; slowMoCD = 0;
    savedThisRun = false;
    bossMode = false; bossAlive=false;
    secondary = {type:null, cd:0, cdMax:240};
    player = {
      kind: 'player',
      x: WIDTH/2, y: HEIGHT/2, r: 12,
      speed: 3.0,
      vx:0, vy:0,
      hp: 5, hpMax: 5,
      fireCD: 0,
      fireRate: 9, // lower is faster
      bulletSpeed: 8,
      damage: 1,
      projectiles: 1,
      spread: 0.07,
      pickupRange: 60,
    };
    applyMeta(player);
  }

  // Upgrades (with secondary unlocks)
  const UPGRADES = [
    { name:"Rose de Métal (Aligax)", desc:"+1 PV max, +1 PV", apply:p=>{p.hpMax+=1;p.hp=Math.min(p.hp+1,p.hpMax);} },
    { name:"Vigne-Module (MutenRock)", desc:"+10% vitesse & +1 portée pick-up", apply:p=>{p.speed*=1.1;p.pickupRange+=10;} },
    { name:"Masque à Visière (Sniky)", desc:"+1 projectile, léger spread", apply:p=>{p.projectiles+=1;p.spread+=0.02;} },
    { name:"Focus ZT renforcé", desc:"ZT Focus dure +1.5s, CD -20%", apply:p=>{p._ztBoost=(p._ztBoost||0)+1;} },
    { name:"Gladius Runiques (Dr. Sorn)", desc:"+25% dégâts", apply:p=>{p.damage*=1.25;} },
    { name:"Lien à Spike (Spirit)", desc:"Régénère 1 PV après chaque salle", apply:p=>{p._regen=true;} },
    { name:"DruidWare (Gabilone)", desc:"+15% cadence de tir", apply:p=>{p.fireRate=Math.max(3, Math.floor(p.fireRate*0.85));} },
    { name:"Condensateur Cuivré", desc:"+20% vitesse des balles", apply:p=>{p.bulletSpeed*=1.2;} },
    { name:"Triskel Circuits", desc:"+20% portée de ramassage", apply:p=>{p.pickupRange+=20;} },
    { name:"BZH POWER", desc:"+1 projectile & +10% dégâts", apply:p=>{p.projectiles+=1;p.damage*=1.1;} },

    { name:"Railgun Proto", desc:"Débloque l'arme secondaire: RAILGUN (clic droit / espace / LT).", apply:()=>{ secondary.type='railgun'; secondary.cdMax=150; } },
    { name:"Shotgun Mk.I", desc:"Débloque l'arme secondaire: SHOTGUN (salve courte).", apply:()=>{ secondary.type='shotgun'; secondary.cdMax=90; } },
    { name:"Drones Orbitaux", desc:"Débloque 2 drones offensifs (tir auto).", apply:()=>{ if(secondary.type!=='drones'){ secondary.type='drones'; drones = []; for(let i=0;i<2;i++) drones.push(newDrone(i)); } else { drones.push(newDrone(drones.length)); } } },
  ];

  function newDrone(i){
    return {angle: (i* Math.PI*2)/Math.max(1,(2)), dist: 26, shootCD: 40};
  }

  // Enemies & Boss
  function spawnEnemy() {
    const edge = randi(0,3);
    const margin = 24;
    let x=0,y=0;
    if(edge===0){ x=margin; y=rand(margin, HEIGHT-margin); }
    if(edge===1){ x=WIDTH-margin; y=rand(margin, HEIGHT-margin); }
    if(edge===2){ x=rand(margin, WIDTH-margin); y=margin; }
    if(edge===3){ x=rand(margin, WIDTH-margin); y=HEIGHT-margin; }

    const t = Math.random();
    let enemy;
    if (t < 0.55) {
      enemy = {kind:'chaser', x,y, r:10, hp: 2+Math.floor(stage*0.4), speed: 1.3+stage*0.05, score: 10};
    } else if (t < 0.85) {
      enemy = {kind:'swarmer', x,y, r:7, hp: 1+Math.floor(stage*0.25), speed: 1.9+stage*0.06, score: 6};
    } else {
      enemy = {kind:'shooter', x,y, r:12, hp: 3+Math.floor(stage*0.6), speed: 0.9+stage*0.03, shootCD: 60, score: 18};
    }
    entities.push(enemy);
  }

  function spawnBoss(){
    const boss = {
      kind:'boss', x: WIDTH/2, y: HEIGHT/2 - 160, r: 26,
      hp: 60 + stage*25, speed: 1.2, shootCD: 40, pattern:0, score: 300
    };
    entities.push(boss);
    bossAlive = true;
  }

  // Draw
  function drawBG() {
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    ctx.save();
    const grd = ctx.createRadialGradient(WIDTH/2,HEIGHT/2,0, WIDTH/2,HEIGHT/2, Math.max(WIDTH,HEIGHT)/1.2);
    grd.addColorStop(0,'rgba(0,255,220,0.06)');
    grd.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0,0,WIDTH,HEIGHT);

    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#8ff';
    ctx.lineWidth = 1;
    const step=40, offX=(Date.now()/2000)%step, offY=(Date.now()/2500)%step;
    ctx.beginPath();
    for(let x=-offX; x<WIDTH; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,HEIGHT); }
    for(let y=-offY; y<HEIGHT; y+=step){ ctx.moveTo(0,y); ctx.lineTo(WIDTH,y); }
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = bossMode ? 'rgba(255,51,95,.65)' : 'rgba(184,115,51,.55)';
    ctx.lineWidth = 4;
    ctx.strokeRect(20,20,WIDTH-40,HEIGHT-40);

    ctx.fillStyle = bossMode ? 'rgba(255,51,95,.35)' : 'rgba(184,115,51,.35)';
    for (const [cx,cy] of [[30,30],[WIDTH-30,30],[30,HEIGHT-30],[WIDTH-30,HEIGHT-30]]){
      ctx.beginPath(); ctx.arc(cx,cy,10,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  function drawEntity(e) {
    if (e.kind==='player') {
      ctx.save();
      ctx.shadowColor = '#6af7ff';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#a98bff';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
      ctx.fill();
      const ang = Math.atan2(getAimY()-e.y, getAimX()-e.x);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#6af7ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(ang)* (e.r+10), e.y + Math.sin(ang)*(e.r+10));
      ctx.stroke();
      ctx.restore();
    } else if (e.kind==='boss'){
      ctx.save();
      ctx.fillStyle = '#ff335f';
      ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#770a1f'; ctx.stroke();
      ctx.fillStyle = 'rgba(255,51,95,.15)';
      ctx.fillRect(200,30, WIDTH-400, 12);
      const ratio = Math.max(0, e.hp / (60 + stage*25));
      ctx.fillStyle = '#ff335f';
      ctx.fillRect(200,30, (WIDTH-400)*ratio, 12);
      ctx.restore();
    } else {
      ctx.save();
      if (e.kind==='chaser'){ ctx.fillStyle = '#ff4d79'; }
      else if (e.kind==='swarmer'){ ctx.fillStyle = '#ff9bd1'; }
      else { ctx.fillStyle = '#ffd166'; }
      ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }

  function drawBullet(b, enemy=false) {
    ctx.save();
    ctx.fillStyle = enemy ? 'rgba(255,210,102,.95)' : '#6af7ff';
    ctx.beginPath(); ctx.arc(b.x,b.y, b.r, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawBeam(beam){
    ctx.save();
    ctx.globalAlpha = Math.max(0, beam.life/10);
    ctx.strokeStyle = '#8be9ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function spawnShard(x,y,amount=1){
    for(let i=0;i<amount;i++){
      particles.push({kind:'shard', x, y, vx: Math.random()*2-1, vy: Math.random()*2-1, life: 600, r: 3});
    }
  }

  function spawnHit(x,y, count=6){
    for(let i=0;i<count;i++){
      particles.push({kind:'spark', x, y, vx: Math.random()*4-2, vy: Math.random()*4-2, life: Math.floor(Math.random()*22)+18});
    }
  }

  function getAimX(){ return aimVec.active ? (player.x + aimVec.x*120) : mouse.x; }
  function getAimY(){ return aimVec.active ? (player.y + aimVec.y*120) : mouse.y; }

  function fire() {
    if (player.fireCD>0) return;
    beep(280, .03, .03);
    const angle = Math.atan2(getAimY()-player.y, getAimX()-player.x);
    const spread = player.spread;
    const count = player.projectiles;
    for (let i=0;i<count;i++){
      const a = angle + (Math.random()*2-1)*spread + (i-(count-1)/2) * (spread*0.6);
      bullets.push({
        x: player.x + Math.cos(a)*player.r,
        y: player.y + Math.sin(a)*player.r,
        vx: Math.cos(a)*player.bulletSpeed,
        vy: Math.sin(a)*player.bulletSpeed,
        r: 4,
        dmg: player.damage,
        life: 180
      });
    }
    player.fireCD = player.fireRate;
  }

  function fireSecondary(){
    if (!secondary.type) return;
    if (secondary.cd>0) return;
    if (secondary.type==='railgun'){
      const x2 = getAimX(), y2 = getAimY();
      const ang = Math.atan2(y2-player.y, x2-player.x);
      const L = 1200;
      const bx2 = player.x + Math.cos(ang)*L;
      const by2 = player.y + Math.sin(ang)*L;
      let hits=0;
      for (const e of entities){
        if (e.kind==='player') continue;
        const d = distPointToSegment(e.x,e.y, player.x,player.y,bx2,by2);
        if (d < e.r+2){
          e.hp -= Math.max(3, Math.floor(player.damage*2.5));
          hits++;
          spawnHit(e.x,e.y,14);
        }
      }
      beams.push({x1:player.x,y1:player.y,x2:bx2,y2:by2, life:10});
      beep(520,.06,.06);
      secondary.cd = secondary.cdMax;
      score += hits*5;
    } else if (secondary.type==='shotgun'){
      const angle = Math.atan2(getAimY()-player.y, getAimX()-player.x);
      const pellets = 8;
      for (let i=0;i<pellets;i++){
        const a = angle + (Math.random()*2-1)*0.35;
        bullets.push({
          x: player.x + Math.cos(a)*player.r,
          y: player.y + Math.sin(a)*player.r,
          vx: Math.cos(a)* (player.bulletSpeed*0.9),
          vy: Math.sin(a)* (player.bulletSpeed*0.9),
          r: 4.5,
          dmg: player.damage*0.8,
          life: 50
        });
      }
      beep(360,.05,.05);
      secondary.cd = secondary.cdMax*0.6;
    } else if (secondary.type==='drones'){
      drones.push(newDrone(drones.length));
      beep(260,.04,.04);
      secondary.cd = 360;
    }
  }

  function distPointToSegment(px,py, x1,y1, x2,y2){
    const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
    const dot = A*C + B*D;
    const len_sq = C*C + D*D;
    let t = dot / len_sq;
    t = Math.max(0, Math.min(1, t));
    const xx = x1 + C*t, yy = y1 + D*t;
    const dx = px - xx, dy = py - yy;
    return Math.hypot(dx,dy);
  }

  function enemyShoot(e) {
    const a = Math.atan2(player.y-e.y, player.x-e.x);
    enemyBullets.push({x:e.x,y:e.y, vx:Math.cos(a)*(3+stage*0.05), vy:Math.sin(a)*(3+stage*0.05), r:4, dmg:1});
  }

  function bossPattern(e, dt){
    e.shootCD -= dt*slowMo;
    e.x += Math.sin(Date.now()/400)*0.8*dt;
    if (e.shootCD<=0){
      e.pattern = (e.pattern+1)%3;
      if (e.pattern===0){
        for (let k=0;k<18;k++){
          const ang = (k/18)*Math.PI*2;
          enemyBullets.push({x:e.x,y:e.y, vx:Math.cos(ang)*(2.8+stage*0.03), vy:Math.sin(ang)*(2.8+stage*0.03), r:4, dmg:1});
        }
        e.shootCD = Math.max(50, 90 - stage*2);
      } else if (e.pattern===1){
        for (let k=0;k<6;k++){
          const a = Math.atan2(player.y-e.y, player.x-e.x) + (k-2.5)*0.08;
          enemyBullets.push({x:e.x,y:e.y, vx:Math.cos(a)*(3.4+stage*0.04), vy:Math.sin(a)*(3.4+stage*0.04), r:4, dmg:1});
        }
        e.shootCD = Math.max(45, 80 - stage*2);
      } else {
        const base = (Date.now()/200)% (Math.PI*2);
        for (let k=0;k<20;k++){
          const a = base + k*0.3;
          enemyBullets.push({x:e.x,y:e.y, vx:Math.cos(a)*(2.6+stage*0.03), vy:Math.sin(a)*(2.6+stage*0.03), r:4, dmg:1});
        }
        e.shootCD = Math.max(60, 100 - stage*2);
      }
    }
  }

  function update(dt) {
    readGamepad();

    if (slowMoTimer>0){ slowMoTimer -= dt; if(slowMoTimer<=0){ slowMo=1.0; } }
    if (slowMoCD>0) slowMoCD -= dt;

    if (secondary.cd>0) secondary.cd -= dt;
    secEl.textContent = secondary.type ? (secondary.cd<=0 ? `${secondary.type} prêt` : `${Math.ceil(secondary.cd/60)}s`) : '-';

    let dx = (keys['d']||keys['arrowright']?1:0) - (keys['q']||keys['arrowleft']?1:0);
    let dy = (keys['s']||keys['arrowdown']?1:0) - (keys['z']||keys['arrowup']?1:0);
    if (typeof keys['gp_dx']==='number' && typeof keys['gp_dy']==='number'){
      dx += keys['gp_dx']; dy += keys['gp_dy'];
    }
    const len = Math.hypot(dx,dy) || 1;
    const sp = player.speed;
    player.vx = (dx/len)*sp;
    player.vy = (dy/len)*sp;
    player.x = Math.max(20+player.r, Math.min(WIDTH-20-player.r, player.x + player.vx*dt));
    player.y = Math.max(20+player.r, Math.min(HEIGHT-20-player.r, player.y + player.vy*dt));

    if (mouse.down || autoFire) fire();
    if (mouse.sec) { fireSecondary(); mouse.sec = false; }
    if (player.fireCD>0) player.fireCD -= dt;

    if (bossMode){
      if (!bossAlive) { spawnBoss(); }
    } else {
      spawnTimer -= dt;
      if (spawnTimer<=0 && toKill>0) {
        spawnEnemy();
        spawnTimer = Math.max(12, 60 - stage*2);
      }
    }

    for (let i=entities.length-1;i>=0;i--){
      const e = entities[i];
      if (e.kind==='boss'){
        bossPattern(e, dt);
        if ((e.x-player.x)**2 + (e.y-player.y)**2 < (e.r+player.r)**2) {
          player.hp -= 2;
          spawnHit(player.x, player.y, 20);
          beep(80,.06,.1);
          if (player.hp<=0){ entities.splice(i,1); die(); return; }
        }
        continue;
      }
      const a = Math.atan2(player.y-e.y, player.x-e.x);
      const spd = e.speed * (slowMo===1?1:0.65);
      e.x += Math.cos(a)*spd*dt; e.y += Math.sin(a)*spd*dt;
      if (e.kind==='shooter'){
        e.shootCD -= dt*slowMo;
        if (e.shootCD<=0){ enemyShoot(e); e.shootCD = Math.max(40, 80 - stage*3); }
      }
      if ((e.x-player.x)**2 + (e.y-player.y)**2 < (e.r+player.r)**2) {
        player.hp -= 1;
        spawnHit(player.x, player.y, 16);
        beep(90,.05,.08);
        entities.splice(i,1);
        if (player.hp<=0){ die(); return; }
      }
    }

    for (let i=bullets.length-1;i>=0;i--){
      const b = bullets[i];
      b.x += b.vx*dt; b.y += b.vy*dt;
      if (--b.life<=0 || b.x<-10||b.x>WIDTH+10||b.y<-10||b.y>HEIGHT+10){ bullets.splice(i,1); continue; }
      for (let j=entities.length-1;j>=0;j--){
        const e = entities[j];
        if (e.kind==='player') continue;
        if ((b.x-e.x)**2 + (b.y-e.y)**2 < (b.r+e.r)**2) {
          e.hp -= b.dmg;
          spawnHit(e.x,e.y,6);
          bullets.splice(i,1);
          if (e.hp<=0){
            score += e.score;
            shards += (e.kind==='boss'? 12: 1);
            if (e.kind==='boss'){ bossAlive=false; }
            toKill -= (e.kind==='boss'? 9999: 1);
            spawnShard(e.x,e.y, e.kind==='boss'? 18 : (Math.floor(Math.random()*2)+1));
            entities.splice(j,1);
            beep(450,.03,.03);
          }
          break;
        }
      }
    }

    for (let i=beams.length-1;i>=0;i--){
      const bm = beams[i];
      bm.life -= dt;
      if (bm.life<=0) beams.splice(i,1);
    }

    for (let i=enemyBullets.length-1;i>=0;i--){
      const b = enemyBullets[i];
      b.x += b.vx*dt*(slowMo===1?1:0.65);
      b.y += b.vy*dt*(slowMo===1?1:0.65);
      if (b.x<-10||b.x>WIDTH+10||b.y<-10||b.y>HEIGHT+10){ enemyBullets.splice(i,1); continue; }
      if ((b.x-player.x)**2 + (b.y-player.y)**2 < (b.r+player.r)**2){
        player.hp -= b.dmg;
        spawnHit(player.x,player.y,10);
        enemyBullets.splice(i,1);
        beep(110,.04,.06);
        if (player.hp<=0){ die(); return; }
      }
    }

    for (const d of drones){
      d.angle += 0.03*dt;
      const tx = player.x + Math.cos(d.angle)*d.dist;
      const ty = player.y + Math.sin(d.angle)*d.dist;
      particles.push({kind:'dr', x:tx, y:ty, life:2});
      d.shootCD -= dt;
      if (d.shootCD<=0){
        const t = nearestEnemy(tx,ty);
        if (t){
          const a = Math.atan2(t.y-ty, t.x-tx);
          bullets.push({x:tx,y:ty, vx:Math.cos(a)* (player.bulletSpeed*0.9), vy:Math.sin(a)*(player.bulletSpeed*0.9), r:3.5, dmg: player.damage*0.6, life:120});
          d.shootCD = 40;
        } else {
          d.shootCD = 20;
        }
      }
    }

    for (let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      if (p.kind==='spark'){
        p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt;
        if (p.life<=0) particles.splice(i,1);
      } else if (p.kind==='shard'){
        const d2 = (p.x-player.x)**2 + (p.y-player.y)**2;
        if (d2 < player.pickupRange*player.pickupRange) {
          const a = Math.atan2(player.y-p.y, player.x-p.x);
          p.vx += Math.cos(a)*0.08;
          p.vy += Math.sin(a)*0.08;
        }
        p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt;
        if (p.life<=0) { particles.splice(i,1); continue; }
        if ((p.x-player.x)**2 + (p.y-player.y)**2 < player.r*player.r){
          shards += 1;
          score += 2;
          particles.splice(i,1);
          beep(520,.02,.025);
        }
      } else if (p.kind==='dr'){
        p.life -= dt;
        if (p.life<=0) particles.splice(i,1);
      }
    }

    if (!bossMode){
      if (toKill<=0 && entities.length===0) {
        nextRoom();
      }
    } else {
      if (!bossAlive && entities.filter(x=>x.kind==='boss').length===0){
        nextRoom();
      }
    }

    stageEl.textContent = stage;
    roomEl.textContent = roomInStage;
    scoreEl.textContent = score;
    shardsEl.textContent = shards;
    ztEl.textContent = slowMoCD<=0 ? 'prêt' : Math.ceil(slowMoCD/60)+'s';
    secEl.textContent = secondary.type ? (secondary.cd<=0 ? `${secondary.type} prêt` : `${Math.ceil(secondary.cd/60)}s`) : '-';

    heartsEl.innerHTML = '';
    for (let i=0;i<player.hp;i++) { const span = document.createElement('span'); span.className='heart'; heartsEl.appendChild(span); }
    for (let i=player.hp;i<player.hpMax;i++) { const span = document.createElement('span'); span.className='heart'; span.style.opacity=.2; heartsEl.appendChild(span); }
  }

  function nearestEnemy(x,y){
    let best=null, bd=1e9;
    for (const e of entities){
      if (e.kind==='chaser' || e.kind==='swarmer' || e.kind==='shooter' || e.kind==='boss'){
        const d2v = (e.x-x)**2 + (e.y-y)**2;
        if (d2v<bd){ bd=d2v; best=e; }
      }
    }
    return best;
  }

  function nextRoom() {
    if (player._regen) { player.hp = Math.min(player.hp+1, player.hpMax); }

    roomInStage += 1;
    if (roomInStage>3){
      stage += 1;
      roomInStage = 1;
    }
    entities.length = 0; bullets.length=0; enemyBullets.length=0; particles.length=0; beams.length=0;
    slowMo = 1.0; slowMoTimer=0;
    bossMode = (roomInStage===3);
    bossAlive = false;
    toKill = bossMode ? 0 : Math.floor(killGoal + stage*1.4);
    spawnTimer = 20;

    showUpgrades();
  }

  function showUpgrades() {
    state='upgrade';
    hud.classList.remove('hidden');
    upgradeOverlay.classList.remove('hidden'); upgradeOverlay.classList.add('visible');
    const pool = [...UPGRADES];
    const picks = [];
    for (let i=0;i<3;i++){
      const idx = Math.floor(Math.random()*pool.length);
      picks.push(pool.splice(idx,1)[0]);
    }
    choicesEl.innerHTML = '';
    picks.forEach((u, idx) => {
      const div = document.createElement('div');
      div.className = 'choice';
      div.innerHTML = `<h3>${idx+1}. ${u.name}</h3><p>${u.desc}</p>`;
      div.addEventListener('click', () => pickUpgrade(u));
      choicesEl.appendChild(div);
    });
    showUpgrades.current = picks;
  }
  function pickByKey(k){
    const idx = parseInt(k)-1;
    const picks = showUpgrades.current || [];
    if (picks[idx]) pickUpgrade(picks[idx]);
  }
  function pickUpgrade(u){
    u.apply(player);
    upgradeOverlay.classList.add('hidden'); upgradeOverlay.classList.remove('visible');
    state='game';
  }

  function tryZT(){
    if (slowMoCD>0) return;
    const extra = player._ztBoost? player._ztBoost*0.75: 0;
    slowMo = 0.35;
    slowMoTimer = 120 + extra*60;
    slowMoCD = 600 - (player._ztBoost? player._ztBoost*60: 0);
    beep(120, .12, .05);
  }

  function die() {
    state='death';
    finalScoreEl.textContent = score;
    finalLevelEl.textContent = stage;
    finalShardsEl.textContent = shards;
    if (!save.bestScore || score>save.bestScore) save.bestScore = score;
    if (!save.bestLevel || stage>save.bestLevel) save.bestLevel = stage;
    persist();
    meta.shards = (meta.shards||0) + shards;
    metaSave();
    renderMeta();
    bestLevelEl.textContent = save.bestLevel;
    bestScoreEl.textContent = save.bestScore;
    deathOverlay.classList.remove('hidden'); deathOverlay.classList.add('visible');
    renderLB();
    initialsInput.value = '';
    saveStatus.textContent = '';
    savedThisRun = false;
    setTimeout(()=>{ initialsInput.focus(); }, 50);
  }

  function draw() {
    drawBG();
    for (const p of particles) {
      if (p.kind==='spark'){
        ctx.globalAlpha = Math.max(0, p.life/40);
        ctx.fillStyle = '#ff6699';
        ctx.fillRect(p.x-1,p.y-1,2,2);
        ctx.globalAlpha = 1;
      } else if (p.kind==='shard'){
        ctx.fillStyle = '#6af7ff';
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      } else if (p.kind==='dr'){
        ctx.fillStyle = '#a98bff';
        ctx.fillRect(p.x-1, p.y-1, 2, 2);
      }
    }
    for (const bm of beams) drawBeam(bm);
    for (const b of bullets) drawBullet(b, false);
    for (const b of enemyBullets) drawBullet(b, true);
    for (const e of entities) drawEntity(e);
    drawEntity(player);
  }

  let last = 0;
  function loop(ts){
    const raw_dt = (ts - last) / 16.6667;
    last = ts;
    const dt = Math.max(0, Math.min(2, raw_dt)) * (slowMo===1?1:slowMo);

    if (state==='game') update(dt);
    if (state!=='menu') draw();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  // Buttons & UI
  playBtn.addEventListener('click', () => { startGame(); });
  retryBtn.addEventListener('click', () => { deathOverlay.classList.add('hidden'); deathOverlay.classList.remove('visible'); startGame(); });
  menuBtn.addEventListener('click', () => {
    deathOverlay.classList.add('hidden'); deathOverlay.classList.remove('visible');
    upgradeOverlay.classList.add('hidden'); upgradeOverlay.classList.remove('visible');
    pauseOverlay.classList.add('hidden'); pauseOverlay.classList.remove('visible');
    state='menu'; hud.classList.add('hidden'); menu.classList.add('visible'); menu.classList.remove('hidden');
  });

  autoBtn.addEventListener('click', () => toggleAuto());
  pauseBtn.addEventListener('click', () => togglePause());
  resumeBtn.addEventListener('click', () => togglePause(false));
  toggleAutoBtn.addEventListener('click', () => toggleAuto());
  quitBtn.addEventListener('click', () => {
    pauseOverlay.classList.add('hidden'); pauseOverlay.classList.remove('visible');
    state='menu'; hud.classList.add('hidden'); menu.classList.add('visible'); menu.classList.remove('hidden');
  });

  initialsInput.addEventListener('input', () => {
    initialsInput.value = initialsInput.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);
  });
  initialsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') trySaveScore();
  });
  saveBtn.addEventListener('click', trySaveScore);
  function trySaveScore(){
    if (savedThisRun) { saveStatus.textContent = 'Déjà enregistré.'; return; }
    const name = (initialsInput.value||'AAAA').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4).padEnd(4,'A');
    addScore(name, score, stage);
    saveStatus.textContent = 'Score enregistré !';
    savedThisRun = true;
  }

  function setAutoUI(){
    autoBtn.textContent = `Auto: ${autoFire?'ON':'OFF'}`;
    toggleAutoBtn.textContent = `Auto-Fire: ${autoFire?'ON':'OFF'}`;
  }
  function toggleAuto(value){
    autoFire = (typeof value === 'boolean') ? value : !autoFire;
    setAutoUI();
  }
  setAutoUI();

  function togglePause(force){
    if (state==='menu' || state==='upgrade' || state==='death') return;
    if (typeof force==='boolean'){
      if (force && state!=='pause'){ state='pause'; pauseOverlay.classList.remove('hidden'); pauseOverlay.classList.add('visible'); }
      if (!force && state==='pause'){ state='game'; pauseOverlay.classList.add('hidden'); pauseOverlay.classList.remove('visible'); }
      return;
    }
    if (state==='game'){
      state='pause';
      pauseOverlay.classList.remove('hidden'); pauseOverlay.classList.add('visible');
    } else if (state==='pause'){
      state='game';
      pauseOverlay.classList.add('hidden'); pauseOverlay.classList.remove('visible');
    }
  }

  function startGame(){
    menu.classList.add('hidden'); menu.classList.remove('visible');
    upgradeOverlay.classList.add('hidden'); deathOverlay.classList.add('hidden'); pauseOverlay.classList.add('hidden');
    hud.classList.remove('hidden');
    state='game';
    resetRun();
    toKill = Math.floor(killGoal + stage*1.2);
    spawnTimer = 20;
    canvas.focus({preventScroll:true});
  }
})();
