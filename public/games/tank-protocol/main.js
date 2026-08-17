// Tankgame V1.1 — Maps + Obstacles + Enemy Types + Boss + Drops + Gamepad
import { BioSFX } from "./shared/sfx.js";
import { Progress } from "./shared/progress.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.addEventListener("mousemove", (e)=>{
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
  mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
});
canvas.addEventListener("mousedown", ()=>{ mouse.down = true; shoot(); });
window.addEventListener("mouseup", ()=>{ mouse.down = false; });
const elHp = document.getElementById("hp");
const elScore = document.getElementById("score");
const elWave = document.getElementById("wave");
const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ovTitle");
const ovText = document.getElementById("ovText");
const btnResume = document.getElementById("btnResume");
const btnRestart = document.getElementById("btnRestart");
const btnBack = document.getElementById("btnBack");

const ctlAutofire = document.getElementById("ctlAutofire");
const ctlTurret = document.getElementById("ctlTurret");
const ctlTurretVal = document.getElementById("ctlTurretVal");
const btnMute = document.getElementById("mute");

const W = canvas.width, H = canvas.height;
loadSettings();

const TAU = Math.PI*2;
const SETTINGS_KEY = "bioarcade:tankgame:settings:v1";
function loadSettings(){
  try{
    const raw = localStorage.getItem(SETTINGS_KEY);
    if(!raw) return;
    const s = JSON.parse(raw);
        if(typeof s.autofire === "boolean") control.autofire = s.autofire;
    if(typeof s.turretInertia === "number"){
      const t = Math.max(0, Math.min(100, s.turretInertia));
      // 0..100 -> smooth 18..6 (more inertia => smaller smooth)
      turretParams.smooth = 6 + (1 - t/100) * 12; // 6..18
    }
  }catch(e){}
}
function saveSettings(){
  const inertiaPct = Math.round(100 * (1 - (turretParams.smooth - 6)/12));
  const s = { autofire: control.autofire, turretInertia: inertiaPct };
  try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }catch(e){}
}
function syncPauseUI(){
  if(!ctlMode) return;
  ctlAutofire.checked = !!control.autofire;
  const inertiaPct = Math.round(100 * (1 - (turretParams.smooth - 6)/12));
  ctlTurret.value = String(inertiaPct);
  ctlTurretVal.textContent = `${inertiaPct}%`;
}


function wrapAngle(a){
  while(a<=-Math.PI) a += TAU;
  while(a> Math.PI) a -= TAU;
  return a;
}
function updateTurret(dt){
  const p = state.player;

  // Mouse wheel applies incremental turn (radians). Consume smoothly.
  const wheelSpeed = 0.0028; // rad per wheel unit (tweak)
  const inc = wheelTurn * wheelSpeed;
  wheelTurn *= Math.max(0, 1 - dt * 18); // decay leftover quickly
  const target = p.ta + inc;

  // Inertia: accelerate turret velocity toward the delta needed.
  const diff = wrapAngle(target - p.ta);
  const maxVel = turretParams.maxVel;   // rad/s
  const gain = turretParams.gain;       // responsiveness
  const desired = Math.max(-maxVel, Math.min(maxVel, diff * gain));
  p.tav += (desired - p.tav) * Math.min(1, dt * turretParams.smooth);
  p.ta += p.tav * dt;

  // Shoot on click/space (handled elsewhere)
  if(mouse.down) shoot();
  if(control.autofire) shoot();
}

const mouse = { x:0, y:0, down:false };
let wheelTurn = 0; // accum wheel delta for turret rotation

const control = { mode: 'wheel', autofire:false };
const turretParams = { maxVel: 7.5, gain: 14.0, smooth: 10.0 }; // smooth higher = less inertia


const input = { left:false,right:false,up:false,down:false,shoot:false,dash:false };
let last = performance.now();
let paused = false;

function rand(a,b){ return a + Math.random()*(b-a); }
function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

function aabbCircleHit(rect, c, r){
  const nx = clamp(c.x, rect.x, rect.x+rect.w);
  const ny = clamp(c.y, rect.y, rect.y+rect.h);
  const dx = c.x-nx, dy=c.y-ny;
  return (dx*dx+dy*dy) <= r*r;
}
function resolveCircleRect(circle, r, rect){
  const nx = clamp(circle.x, rect.x, rect.x+rect.w);
  const ny = clamp(circle.y, rect.y, rect.y+rect.h);
  const dx = circle.x-nx, dy = circle.y-ny;
  const d = Math.hypot(dx,dy) || 0.0001;
  if(d>=r) return;
  const push = (r - d);
  circle.x += (dx/d)*push;
  circle.y += (dy/d)*push;
}

// Maps
const MAPS = [
  { id:"VESSEL", name:"Bio-Vessel", obstacles:[
    {x:260,y:140,w:90,h:260},
    {x:560,y:140,w:90,h:260},
    {x:420,y:60,w:120,h:70},
    {x:420,y:410,w:120,h:70},
  ]},
  { id:"LAB", name:"Mucus Lab", obstacles:[
    {x:180,y:250,w:160,h:70},
    {x:620,y:250,w:160,h:70},
    {x:410,y:140,w:140,h:60},
    {x:410,y:340,w:140,h:60},
  ]},
];
function pickMap(wave){ return MAPS[(wave-1)%MAPS.length]; }
function spawnEdge(){
  const edge = Math.floor(Math.random()*4);
  let x=0,y=0;
  if(edge===0){ x = rand(40, W-40); y = -30; }
  if(edge===1){ x = W+30; y = rand(40, H-40); }
  if(edge===2){ x = rand(40, W-40); y = H+30; }
  if(edge===3){ x = -30; y = rand(40, H-40); }
  return {x,y};
}

let state;

function spawnEnemy(type, x, y, wave){
  const base = { x,y, vx:0, vy:0, dead:false, hitFlash:0 };
  if(type==="grub") return { ...base, type, r:14, hp: 1 + Math.floor(wave/3), spd: 55 + wave*4 };
  if(type==="spitter") return { ...base, type, r:16, hp: 2 + Math.floor(wave/3), spd: 38 + wave*3, shotCd: rand(0.6,1.2) };
  if(type==="charger") return { ...base, type, r:18, hp: 3 + Math.floor(wave/2), spd: 42 + wave*2, chargeCd: rand(1.0,1.8), charging:false, chargeT:0 };
  return { ...base, type:"grub", r:14, hp:1, spd:60 };
}

function reset(){
  state = {
    t:0,
    hp:6,
    score:0,
    wave:1,
    map: pickMap(1),
    obstacles: [],
    enemies: [],
    bullets: [],
    drops: [],
    particles: [],
    cooldown:0,
    dashCd:0,
    dashT:0,
    power:{ rapidT:0, shieldT:0 },
    boss:null,
    player:{ x:W*0.5, y:H*0.65, a:-Math.PI/2, ta:-Math.PI/2, tav:0, r:16 , dashCd:0, dashT:0 }
  };
  state.obstacles = state.map.obstacles.map(o=>({...o}));
  spawnWave();
  paused = false;
  hideOverlay();
  renderHud();
}

function spawnWave(){
  state.map = pickMap(state.wave);
  state.obstacles = state.map.obstacles.map(o=>({...o}));
  state.enemies.length = 0;
  state.boss = null;

  const n = 5 + state.wave*2;
  for(let i=0;i<n;i++){
    const t = state.wave<3 ? "grub" : (Math.random()<0.55 ? "grub" : Math.random()<0.6 ? "spitter" : "charger");
    const pos = spawnEdge();
    state.enemies.push(spawnEnemy(t, pos.x, pos.y, state.wave));
  }

  if(state.wave % 5 === 0){
    const bpos = spawnEdge();
    const maxHp = 20 + state.wave*6;
    state.boss = { x:bpos.x, y:bpos.y, r:34, hp:maxHp, maxHp, spd: 40 + state.wave*1.5, shotCd:0.9, slamCd:1.8, flash:0 };
    BioSFX.play("alert");
  }
}

function hitEffect(x,y, n=10){
  for(let i=0;i<n;i++){
    const a = rand(0, TAU);
    const s = rand(60, 240);
    state.particles.push({ x,y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life: rand(0.18,0.5) });
  }
}

function maybeDrop(x,y){
  const r = Math.random();
  if(r < 0.10) state.drops.push({ x,y, r:10, kind:"heal", t:0 });
  else if(r < 0.18) state.drops.push({ x,y, r:10, kind:"rapid", t:0 });
  else if(r < 0.24) state.drops.push({ x,y, r:10, kind:"shield", t:0 });
}

function applyDrop(kind){
  if(kind==="heal"){ state.hp = Math.min(8, state.hp+1); BioSFX.play("pickup"); }
  if(kind==="rapid"){ state.power.rapidT = 10; BioSFX.play("success"); }
  if(kind==="shield"){ state.power.shieldT = 8; BioSFX.play("success"); }
  renderHud();
}

function damagePlayer(amount=1){
  if(state.power.shieldT>0){ BioSFX.play("blip"); return; }
  state.hp -= amount;
  BioSFX.play("alert");
  renderHud();
  if(state.hp<=0) showOverlay("Defeat","Press R to restart.");
}

function doDash(){
  const p = state.player;
  if(p.dashCd>0 || p.dashT>0) return;
  p.dashT = 0.18;      // dash duration (s)
  p.dashCd = 1.10;     // cooldown (s)
  BioSFX.play("success");
}

function shoot(){
  if(state.cooldown>0) return;
  const p = state.player;
  const spd = 460;
  state.bullets.push({ x:p.x+Math.cos(p.ta)*20, y:p.y+Math.sin(p.ta)*20, vx:Math.cos(p.ta)*spd, vy:Math.sin(p.ta)*spd, r:4, dmg:1, life:1.2, from:"player" });
  state.cooldown = state.power.rapidT>0 ? 0.07 : 0.14;
  BioSFX.play("blip");
}

function enemyShoot(e){
  const p = state.player;
  const dx = p.x-e.x, dy=p.y-e.y;
  const d = Math.hypot(dx,dy) || 1;
  const spd = 220;
  state.bullets.push({ x:e.x+(dx/d)*(e.r+8), y:e.y+(dy/d)*(e.r+8), vx:(dx/d)*spd, vy:(dy/d)*spd, r:4, dmg:1, life:2.2, from:"enemy" });
  BioSFX.play("alert");
}

function bossShoot(){
  const b = state.boss;
  if(!b) return;
  const p = state.player;
  const dx = p.x-b.x, dy=p.y-b.y;
  const baseA = Math.atan2(dy,dx);
  const spd = 260;
  for(const off of [-0.22,0,0.22]){
    const a = baseA + off;
    state.bullets.push({ x:b.x+Math.cos(a)*(b.r+10), y:b.y+Math.sin(a)*(b.r+10), vx:Math.cos(a)*spd, vy:Math.sin(a)*spd, r:5, dmg:1, life:2.4, from:"enemy" });
  }
  BioSFX.play("alert");
}

function dash(){
  if(state.dashCd>0) return;
  state.dashCd = 1.4;
  state.dashT = 0.14;
  BioSFX.play("pickup");
}

function winCheck(){
  const bossAlive = !!(state.boss && state.boss.hp>0);
  if(state.enemies.length===0 && !bossAlive){
    state.wave += 1;
    state.score += 35;
    BioSFX.play("success");
    if(state.wave >= 6) Progress.unlock("TANKGAME_V1_CLEARED");
    if(state.wave >= 10) Progress.unlock("TANKGAME_V1_1_CLEARED");
    spawnWave();
  }
}

function update(dt){
  state.t += dt;
  state.cooldown = Math.max(0, state.cooldown-dt);
  state.dashCd = Math.max(0, state.dashCd-dt);
  state.dashT = Math.max(0, state.dashT-dt);
  state.power.rapidT = Math.max(0, state.power.rapidT-dt);
  state.power.shieldT = Math.max(0, state.power.shieldT-dt);

  // movement
  let ax=0, ay=0;
  if(input.left) ax-=1;
  if(input.right) ax+=1;
  if(input.up) ay-=1;
  if(input.down) ay+=1;
  const m = Math.hypot(ax,ay) || 1;
  ax/=m; ay/=m;

  const p = state.player;
  const baseSpd = 150;
  const dashBoost = state.dashT>0 ? 280 : 0;
  const spd = baseSpd + dashBoost;

  p.x += ax*spd*dt; p.y += ay*spd*dt;
  if(Math.abs(ax)+Math.abs(ay) > 0.01) p.a = Math.atan2(ay,ax);
  p.x = clamp(p.x, p.r, W-p.r); p.y = clamp(p.y, p.r, H-p.r);
  for(const o of state.obstacles) resolveCircleRect(p, p.r, o);

  if(input.shoot) shoot();
  if(input.dash){ dash(); input.dash=false; }

  // bullets
  for(const b of state.bullets){
    b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt;
    for(const o of state.obstacles){
      if(aabbCircleHit(o,b,b.r)){ b.life=-1; hitEffect(b.x,b.y,6); }
    }
  }
  state.bullets = state.bullets.filter(b=>b.life>0 && b.x>-40 && b.x<W+40 && b.y>-40 && b.y<H+40);

  // enemies
  for(const e of state.enemies){
    e.hitFlash = Math.max(0, e.hitFlash-dt);
    const dx = p.x-e.x, dy=p.y-e.y;
    const d = Math.hypot(dx,dy) || 1;

    if(e.type==="spitter"){
      e.shotCd -= dt;
      const desired = 200;
      const dir = d < desired ? -1 : 1;
      e.vx = (dx/d)*e.spd*dir; e.vy=(dy/d)*e.spd*dir;
      if(e.shotCd<=0 && d<360){ enemyShoot(e); e.shotCd = rand(0.9,1.6) * (0.92 - Math.min(0.25, state.wave*0.015)); }
    } else if(e.type==="charger"){
      e.chargeCd -= dt;
      if(e.chargeCd<=0 && !e.charging && d<380){ e.charging=true; e.chargeT=0.55; e.chargeCd=rand(1.3,2.2); BioSFX.play("alert"); }
      if(e.charging){
        e.chargeT -= dt;
        const cspd = e.spd + 220;
        e.vx = (dx/d)*cspd; e.vy=(dy/d)*cspd;
        if(e.chargeT<=0) e.charging=false;
      } else {
        e.vx=(dx/d)*e.spd; e.vy=(dy/d)*e.spd;
      }
    } else {
      e.vx=(dx/d)*e.spd; e.vy=(dy/d)*e.spd;
    }

    e.x += e.vx*dt; e.y += e.vy*dt;
    for(const o of state.obstacles) resolveCircleRect(e, e.r, o);

    if(d < (e.r+p.r)){ hitEffect(p.x,p.y,12); e.x -= (dx/d)*18; e.y -= (dy/d)*18; damagePlayer(1); }
  }

  // boss
  if(state.boss && state.boss.hp>0){
    const b = state.boss;
    b.flash = Math.max(0,b.flash-dt);
    const dx = p.x-b.x, dy=p.y-b.y;
    const d = Math.hypot(dx,dy) || 1;
    b.x += (dx/d)*b.spd*dt; b.y += (dy/d)*b.spd*dt;
    for(const o of state.obstacles) resolveCircleRect(b, b.r, o);

    b.shotCd -= dt;
    if(b.shotCd<=0 && d<520){ bossShoot(); b.shotCd = rand(0.8,1.3); }

    b.slamCd -= dt;
    if(b.slamCd<=0 && d<140){
      b.slamCd = rand(1.6,2.3);
      hitEffect(b.x,b.y,26);
      if(d<130) damagePlayer(2);
      BioSFX.play("alert");
    }
    if(d < (b.r+p.r)) damagePlayer(1);
  }

  // bullet hits
  for(const b of state.bullets){
    if(b.from==="player"){
      for(const e of state.enemies){
        const d = Math.hypot(b.x-e.x, b.y-e.y);
        if(d < e.r + b.r){
          e.hp -= b.dmg; e.hitFlash=0.12; b.life=-1;
          hitEffect(e.x,e.y,10);
          if(e.hp<=0){ e.dead=true; state.score+=6; BioSFX.play("pickup"); maybeDrop(e.x,e.y); }
        }
      }
      if(state.boss && state.boss.hp>0){
        const d = Math.hypot(b.x-state.boss.x, b.y-state.boss.y);
        if(d < state.boss.r + b.r){
          state.boss.hp -= b.dmg; state.boss.flash=0.12; b.life=-1;
          hitEffect(state.boss.x,state.boss.y,14);
          BioSFX.play("blip");
          if(state.boss.hp<=0){ state.score+=50; BioSFX.play("success"); maybeDrop(state.boss.x,state.boss.y); }
        }
      }
    } else {
      const d = Math.hypot(b.x-p.x, b.y-p.y);
      if(d < p.r + b.r){ b.life=-1; hitEffect(p.x,p.y,10); damagePlayer(1); }
    }
  }
  state.enemies = state.enemies.filter(e=>!e.dead);

  // drops
  for(const d of state.drops){
    d.t += dt;
    if(Math.hypot(d.x-p.x, d.y-p.y) < d.r + p.r){ d.picked=true; applyDrop(d.kind); }
  }
  state.drops = state.drops.filter(d=>!d.picked && d.t<14);

  // particles
  for(const pt of state.particles){
    pt.x += pt.vx*dt; pt.y += pt.vy*dt; pt.life -= dt;
    pt.vx *= Math.pow(0.06, dt);
    pt.vy *= Math.pow(0.06, dt);
  }
  state.particles = state.particles.filter(p=>p.life>0);

  winCheck();
  renderHud();
}

function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function draw(){
  ctx.clearRect(0,0,W,H);

  // grid
  ctx.save();
  ctx.globalAlpha=0.12;
  ctx.beginPath();
  for(let x=0;x<=W;x+=32){ ctx.moveTo(x,0); ctx.lineTo(x,H); }
  for(let y=0;y<=H;y+=32){ ctx.moveTo(0,y); ctx.lineTo(W,y); }
  ctx.strokeStyle="#ffffff"; ctx.lineWidth=1; ctx.stroke();
  ctx.restore();

  // obstacles
  for(const o of state.obstacles){
    ctx.save();
    ctx.globalAlpha=0.14;
    ctx.fillStyle="#ffffff";
    roundRect(o.x,o.y,o.w,o.h,16);
    ctx.fill();
    ctx.restore();
  }

  // drops
  for(const d of state.drops){
    ctx.save();
    ctx.translate(d.x,d.y);
    ctx.globalAlpha=0.75;
    ctx.beginPath(); ctx.arc(0,0,d.r,0,TAU); ctx.fillStyle="#ffffff"; ctx.fill();
    ctx.globalAlpha=1;
    ctx.fillStyle="#000000"; ctx.font="12px monospace";
    const t = d.kind==="heal" ? "+" : d.kind==="rapid" ? "R" : "S";
    ctx.fillText(t, -4, 4);
    ctx.restore();
  }

  // bullets
  for(const b of state.bullets){
    ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,TAU);
    ctx.globalAlpha = b.from==="enemy" ? 0.55 : 0.8;
    ctx.fillStyle="#ffffff"; ctx.fill();
    ctx.globalAlpha=1;
  }

  // enemies
  for(const e of state.enemies){
    ctx.save();
    ctx.translate(e.x,e.y);
    ctx.globalAlpha = e.hitFlash>0 ? 1 : 0.75;
    ctx.fillStyle="#ffffff";
    ctx.beginPath(); ctx.arc(0,0,e.r,0,TAU); ctx.fill();
    ctx.globalAlpha=1;
    ctx.fillStyle="#000000"; ctx.font="12px monospace";
    const g = e.type==="grub" ? "g" : e.type==="spitter" ? "s" : "c";
    ctx.fillText(g, -4, 4);
    ctx.restore();
  }

  // boss
  if(state.boss && state.boss.hp>0){
    const b = state.boss;
    ctx.save();
    ctx.translate(b.x,b.y);
    ctx.globalAlpha = b.flash>0 ? 1 : 0.72;
    ctx.fillStyle="#ffffff";
    ctx.beginPath(); ctx.arc(0,0,b.r,0,TAU); ctx.fill();
    ctx.globalAlpha=1;
    ctx.fillStyle="#000000"; ctx.font="14px monospace";
    ctx.fillText("B", -5, 5);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha=0.35; ctx.fillStyle="#ffffff";
    ctx.fillRect(180, 16, 600, 10);
    ctx.globalAlpha=0.85;
    ctx.fillRect(180, 16, 600*clamp(b.hp/b.maxHp,0,1), 10);
    ctx.restore();
  }

  // player
const p = state.player;

// body
ctx.save();
ctx.translate(p.x,p.y);
ctx.rotate(p.a);
ctx.globalAlpha=0.9;
ctx.fillStyle="#ffffff";
roundRect(-16,-12,32,24,8); ctx.fill();
// hatch
roundRect(-6,-6,12,12,6); ctx.fill();
ctx.restore();

// turret (separate inertia angle)
ctx.save();
ctx.translate(p.x,p.y);
ctx.rotate(p.ta);
ctx.globalAlpha=0.95;
ctx.fillStyle="#ffffff";
roundRect(-2,-4,22,8,4); ctx.fill();
ctx.fillRect(16,-2,18,4);
ctx.restore();

// shield ring
if(state.power.shieldT>0){
  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.globalAlpha=0.35;
  ctx.strokeStyle="#ffffff";
  ctx.lineWidth=3;
  ctx.beginPath(); ctx.arc(0,0,26,0,TAU); ctx.stroke();
  ctx.restore();
}

  // particles
  ctx.save();
  for(const pt of state.particles){
    ctx.globalAlpha = clamp(pt.life*3,0,1)*0.7;
    ctx.beginPath(); ctx.arc(pt.x,pt.y,2.2,0,TAU);
    ctx.fillStyle="#ffffff"; ctx.fill();
  }
  ctx.restore();

  // power text
  ctx.save();
  ctx.globalAlpha=0.7;
  ctx.fillStyle="#ffffff"; ctx.font="12px monospace";
  const a = state.power.rapidT>0 ? `RAPID ${state.power.rapidT.toFixed(0)}s` : "";
  const s = state.power.shieldT>0 ? `SHIELD ${state.power.shieldT.toFixed(0)}s` : "";
  ctx.fillText([a,s].filter(Boolean).join("  "), 18, H-18);
  ctx.restore();
}

function renderHud(){
  elHp.textContent = String(state.hp);
  elScore.textContent = String(state.score);
  elWave.textContent = String(state.wave);
}

function showOverlay(title, text){
  paused = true;
  ovTitle.textContent = title;
  ovText.textContent = text;
  overlay.classList.remove("hidden");
  syncPauseUI();
}
function hideOverlay(){ overlay.classList.add("hidden"); }
function togglePause(){
  paused = !paused;
  if(paused) showOverlay("Paused","Press P to resume.");
  else hideOverlay();
}

btnResume.addEventListener("click", ()=>{ BioSFX.play("blip"); paused=false; hideOverlay(); });
btnRestart.addEventListener("click", ()=>{ BioSFX.play("error"); reset(); hideOverlay(); paused=false; });
btnMute.addEventListener("click", async ()=>{
  const mod = await import("./shared/audio.js");
  mod.AudioBus.toggleMute();
  BioSFX.play("blip");
});
ctlAutofire?.addEventListener("change", ()=>{
  control.autofire = !!ctlAutofire.checked;
  BioSFX.play("blip");
  saveSettings();
});
ctlTurret?.addEventListener("input", ()=>{
  const v = parseInt(ctlTurret.value, 10);
  turretParams.smooth = 6 + (1 - (v/100)) * 12;
  ctlTurretVal.textContent = `${v}%`;
  BioSFX.play("blip");
  saveSettings();
});
btnBack?.addEventListener("click", ()=>{
  BioSFX.play("success");
  setTimeout(()=>{ window.location.href = "/arena/"; }, 120);
});


window.addEventListener("keydown",(e)=>{
  const k = e.key.toLowerCase();

if(e.key === " "){ // Space shoot
  e.preventDefault();
  shoot();
  return;
}
if(e.key === "Shift"){ // Dash
  e.preventDefault();
  doDash();
  return;
}
  if(k==="arrowleft"||k==="a") input.left=true;
  if(k==="arrowright"||k==="d") input.right=true;
  if(k==="arrowup"||k==="w") input.up=true;
  if(k==="arrowdown"||k==="s") input.down=true;
  if(e.key===" ") input.shoot=true;
  if(e.key==="Shift") input.dash=true;
  if(k==="p") togglePause();
  if(k==="f"){ control.autofire = !control.autofire; BioSFX.play("blip"); saveSettings(); return; }
  if(k==="r") reset();
},{passive:true});
window.addEventListener("keyup",(e)=>{
  const k = e.key.toLowerCase();
  if(k==="arrowleft"||k==="a") input.left=false;
  if(k==="arrowright"||k==="d") input.right=false;
  if(k==="arrowup"||k==="w") input.up=false;
  if(k==="arrowdown"||k==="s") input.down=false;
  if(e.key===" ") input.shoot=false;
},{passive:true});

function pollGamepad(){
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = pads && pads[0];
  if(!gp) return;
  const ax = gp.axes[0] || 0;
  const ay = gp.axes[1] || 0;
  const dead = 0.18;
  input.left = ax < -dead;
  input.right = ax > dead;
  input.up = ay < -dead;
  input.down = ay > dead;
  input.shoot = gp.buttons[0]?.pressed || false;
  if(gp.buttons[1]?.pressed) input.dash = true;
}

function loop(ts){
  const dt = Math.min(0.033, (ts-last)/1000);
  last = ts;
  pollGamepad();
  if(!paused) update(dt);
  draw();
  requestAnimationFrame(loop);
}

reset();
requestAnimationFrame(loop);
