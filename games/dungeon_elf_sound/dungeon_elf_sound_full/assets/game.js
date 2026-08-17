// ══════════════════════════ AUDIO ENGINE ════════════════════
let AC=null,muted=false,masterGain=null;
function getAC(){if(!AC){AC=new(window.AudioContext||window.webkitAudioContext)();masterGain=AC.createGain();masterGain.gain.value=.55;masterGain.connect(AC.destination);}if(AC.state==='suspended')AC.resume();return AC;}
function toggleMute(){muted=!muted;if(masterGain)masterGain.gain.value=muted?0:.55;document.getElementById('sound-indicator').textContent=muted?'🔇 Muet':'🔊 Son';}
function osc(freq,type,start,dur,vol=.3,detune=0){const ac=getAC();const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=freq;o.detune.value=detune;g.gain.setValueAtTime(vol,start);g.gain.exponentialRampToValueAtTime(0.001,start+dur);o.connect(g);g.connect(masterGain);o.start(start);o.stop(start+dur+.05);}
function noise(start,dur,vol=.15,lpFreq=800){const ac=getAC();const buf=ac.createBuffer(1,Math.floor(ac.sampleRate*.5),ac.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const src=ac.createBufferSource(),filt=ac.createBiquadFilter(),g=ac.createGain();src.buffer=buf;src.loop=true;filt.type='lowpass';filt.frequency.value=lpFreq;g.gain.setValueAtTime(vol,start);g.gain.exponentialRampToValueAtTime(0.001,start+dur);src.connect(filt);filt.connect(g);g.connect(masterGain);src.start(start);src.stop(start+dur+.05);}
let villageLoopActive=false,villageLoop=null;
const V_SCALE=[261.63,293.66,329.63,349.23,392,440,493.88,523.25];
const V_BASS=[130.81,164.81,196,130.81];
function startVillageMusic(){if(villageLoopActive)return;villageLoopActive=true;let step=0;function tick(){if(!villageLoopActive)return;const ac=getAC(),now=ac.currentTime;const i=step%V_SCALE.length;osc(V_SCALE[i],'square',now,.18,.12);osc(V_SCALE[(i+2)%8],'square',now+.09,.18,.08);if(step%4===0)osc(V_BASS[Math.floor(step/4)%4],'triangle',now,.36,.1);if(step%8===0)noise(now,.08,.12,200);if(step%8===4)noise(now,.06,.07,600);step++;villageLoop=setTimeout(tick,120);}tick();}
function stopVillageMusic(){villageLoopActive=false;clearTimeout(villageLoop);}
let dungeonLoopActive=false,dungeonLoop=null;
const D_SCALE=[138.59,155.56,174.61,185,207.65,233.08];
function startDungeonMusic(){if(dungeonLoopActive)return;dungeonLoopActive=true;let step=0;function tick(){if(!dungeonLoopActive)return;const ac=getAC(),now=ac.currentTime;const i=step%D_SCALE.length;osc(D_SCALE[i],'sawtooth',now,.22,.07,-10);osc(D_SCALE[i]*2,'sawtooth',now,.22,.04,10);if(step%6===0)osc(D_SCALE[0]*.5,'triangle',now,.7,.09);if(step%8===0){osc(80,'sine',now,.12,.18);noise(now,.06,.1,150);}if(step%8===4)noise(now,.05,.06,900);if(step%12===0)osc(D_SCALE[3]*2,'sine',now,.4,.05);step++;dungeonLoop=setTimeout(tick,160);}tick();}
function stopDungeonMusic(){dungeonLoopActive=false;clearTimeout(dungeonLoop);}
const SFX={
  slice(){const ac=getAC(),t=ac.currentTime;osc(880,'sawtooth',t,.04,.2);osc(660,'sawtooth',t+.02,.06,.15);noise(t,.05,.15,2000);},
  hurt(){const ac=getAC(),t=ac.currentTime;osc(180,'sawtooth',t,.15,.3);osc(160,'sawtooth',t+.05,.15,.2,-20);noise(t,.12,.15,300);},
  charge(){const ac=getAC(),t=ac.currentTime;[0,.06,.12].forEach((d,i)=>osc(330*Math.pow(1.25,i),'square',t+d,.12,.1));},
  fullCharge(){const ac=getAC(),t=ac.currentTime;[0,.08,.16,.24].forEach((d,i)=>osc(220*Math.pow(1.5,i),'square',t+d,.2,.13));osc(880,'sine',t+.24,.3,.1);},
  runeSuccess(){const ac=getAC(),t=ac.currentTime;[0,.07,.14,.21].forEach((d,i)=>osc([523,659,784,1047][i],'square',t+d,.18,.12));},
  runeFail(){const ac=getAC(),t=ac.currentTime;osc(220,'sawtooth',t,.2,.2,-30);osc(200,'sawtooth',t+.1,.15,.15,-30);},
  levelUp(){const ac=getAC(),t=ac.currentTime;[0,.1,.2,.3,.4].forEach((d,i)=>osc([262,330,392,523,784][i],'square',t+d,.22,.13));},
  dot_fire(){const ac=getAC(),t=ac.currentTime;noise(t,.08,.12,1200);osc(400,'sawtooth',t,.06,.08);},
  dot_poison(){const ac=getAC(),t=ac.currentTime;osc(180,'sine',t,.1,.08);osc(270,'sine',t+.05,.1,.06);},
  dot_ice(){const ac=getAC(),t=ac.currentTime;osc(1200,'sine',t,.12,.06);osc(1500,'sine',t+.04,.08,.04);},
  click(){const ac=getAC(),t=ac.currentTime;osc(1200,'square',t,.04,.06);},
  runeSound(id){const ac=getAC(),t=ac.currentTime;const map={circle:()=>{[0,.06,.12,.18].forEach((d,i)=>osc([523,659,784,659][i],'sine',t+d,.14,.1));},square:()=>{osc(330,'square',t,.2,.12);osc(330,'square',t+.1,.15,.09,-20);},triangle:()=>{osc(880,'square',t,.05,.18);noise(t,.05,.1,1800);},v:()=>{const o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(880,t+.2);g.gain.setValueAtTime(.15,t);g.gain.exponentialRampToValueAtTime(0.001,t+.3);o.connect(g);g.connect(masterGain);o.start(t);o.stop(t+.35);},zigzag:()=>{[0,.05,.1,.15,.2].forEach((d,i)=>osc(i%2===0?440:330,'sawtooth',t+d,.07,.09));},spiral:()=>{for(let i=0;i<8;i++)osc(220*Math.pow(1.12,i),'sine',t+i*.05,.12,.07);},cross:()=>{osc(440,'sine',t,.25,.12);osc(440,'sine',t,.25,.08,700);},star:()=>{[0,.04,.08,.12,.16,.2].forEach((d,i)=>osc([784,880,988,1047,988,880][i],'square',t+d,.1,.1));noise(t,.2,.08,2000);}};(map[id]||map.circle)();}
};
const CAST_VOICES={circle:[{f:440,d:.07},{f:523,d:.07},{f:440,d:.1}],square:[{f:330,d:.08},{f:294,d:.08},{f:330,d:.08}],triangle:[{f:587,d:.06},{f:698,d:.06},{f:784,d:.08}],v:[{f:523,d:.1},{f:262,d:.05},{f:523,d:.1}],zigzag:[{f:392,d:.05},{f:494,d:.05},{f:392,d:.05},{f:494,d:.05}],spiral:[{f:330,d:.06},{f:370,d:.06},{f:415,d:.06},{f:466,d:.06},{f:523,d:.09}],cross:[{f:440,d:.12},{f:440,d:.12}],star:[{f:784,d:.05},{f:880,d:.05},{f:988,d:.05},{f:1047,d:.08}]};
function playCastVoice(runeId,customBuffer=null){if(customBuffer){const ac=getAC();const src=ac.createBufferSource(),g=ac.createGain();src.buffer=customBuffer;g.gain.value=.7;src.connect(g);g.connect(masterGain);src.start();return;}const ac=getAC();let t=ac.currentTime;const seq=CAST_VOICES[runeId]||CAST_VOICES.circle;seq.forEach(n=>{osc(n.f,'square',t,n.d,.12);t+=n.d+.01;});}
const VENDOR_VOICE={staff:{freq:220,type:'square',vol:.06},hat:{freq:660,type:'sine',vol:.07},clothes:{freq:440,type:'triangle',vol:.06},lulu:{freq:880,type:'sine',vol:.05},default:{freq:330,type:'square',vol:.05}};
let dialogueTimeout=null,dialogueCancelFlag=false;
function playDialogue(vendorKey,portrait,name,color,text,cb){
  const box=document.getElementById('dialogue-box'),nameEl=document.getElementById('dialogue-name'),textEl=document.getElementById('dialogue-text'),portEl=document.getElementById('dialogue-portrait');
  portEl.textContent=portrait;nameEl.innerHTML=`<span style="color:${color};letter-spacing:2px">${name}</span>`;textEl.textContent='';box.style.display='block';dialogueCancelFlag=false;
  const voice=VENDOR_VOICE[vendorKey]||VENDOR_VOICE.default;let i=0;
  function typeChar(){if(dialogueCancelFlag||i>=text.length){textEl.textContent=text;if(cb)setTimeout(cb,600);return;}textEl.textContent+=text[i];if(text[i]!==' '&&text[i]!=='\n'){const ac=getAC(),t=ac.currentTime;const o=ac.createOscillator(),g=ac.createGain();o.type=voice.type;o.frequency.value=voice.freq*(0.9+Math.random()*.2);g.gain.setValueAtTime(voice.vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+.04);o.connect(g);g.connect(masterGain);o.start(t);o.stop(t+.05);}i++;dialogueTimeout=setTimeout(typeChar,text[i-1]==='.'||text[i-1]==='!'||text[i-1]==='?'?260:text[i-1]===','?140:45);}
  typeChar();
}
function skipDialogue(){dialogueCancelFlag=true;clearTimeout(dialogueTimeout);}
function hideDialogue(){document.getElementById('dialogue-box').style.display='none';}
let mediaStream=null,mediaRecorder=null,recChunks=[],isRecording=false;
const customCastSounds={};
async function startRecording(runeId,btnEl){if(isRecording)return;try{if(!mediaStream)mediaStream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});recChunks=[];isRecording=true;mediaRecorder=new MediaRecorder(mediaStream);mediaRecorder.ondataavailable=e=>recChunks.push(e.data);mediaRecorder.onstop=async()=>{const blob=new Blob(recChunks,{type:'audio/webm'});const arrayBuf=await blob.arrayBuffer();const ac=getAC();const audioBuf=await ac.decodeAudioData(arrayBuf);customCastSounds[runeId]=audioBuf;notify(`✦ Son enregistré !`,'#2ecc71');updateRuneRecBtn(runeId);};mediaRecorder.start();setTimeout(()=>{if(isRecording)stopRecording();},1000);if(btnEl){btnEl.textContent='⏺ Enr. (1s)';btnEl.className='btn btn-rec';}}catch(e){notify('Micro non disponible','#e74c3c');}}
function stopRecording(){if(mediaRecorder&&mediaRecorder.state!=='inactive')mediaRecorder.stop();isRecording=false;}
function updateRuneRecBtn(runeId){const el=document.getElementById('recbtn-'+runeId);if(el){el.textContent=customCastSounds[runeId]?'🔊 Re-enregistrer':'🎙 Enregistrer voix (1s)';el.className=customCastSounds[runeId]?'btn btn-green':'btn';}}

// ══════════════════════════ DATA ═══════════════════════════
const SD={
  twig:    {name:"Baguette d'Apprenti",color:'#c8a87e',glow:'#e8c97a',glowRgb:'200,168,126',trailStyle:'dots',   trailW:4,cd:3,  atkTime:2,  dmg:20,price:0,  mod:{},           desc:'CD 3s · ATK 2s · Dégâts 20'},
  fire:    {name:'Bâton de Feu',       color:'#ff6b35',glow:'#ff4500',glowRgb:'255,107,53', trailStyle:'flame',  trailW:6,cd:5,  atkTime:2.5,dmg:45,price:80, mod:{dot:'fire'},  desc:'CD 5s · 🔥 DoT feu'},
  ice:     {name:'Bâton de Givre',     color:'#4ecdc4',glow:'#00ffff',glowRgb:'78,205,196', trailStyle:'crystal',trailW:4,cd:4,  atkTime:3,  dmg:30,price:70, mod:{dot:'ice'},   desc:'CD 4s · ❄️ Gel'},
  poison:  {name:'Bâton Venin',        color:'#55efc4',glow:'#00b894',glowRgb:'85,239,196', trailStyle:'drip',   trailW:5,cd:4.5,atkTime:2.5,dmg:25,price:90, mod:{dot:'poison'},desc:'CD 4.5s · ☠️ Poison'},
  lightning:{name:'Bâton Foudre',      color:'#ffe66d',glow:'#ffff00',glowRgb:'255,230,109',trailStyle:'spark',  trailW:3,cd:6,  atkTime:2,  dmg:60,price:110,mod:{chain:true},  desc:'CD 6s · ⚡ Dégâts 60'},
  shadow:  {name:'Bâton des Ombres',   color:'#a29bfe',glow:'#6c5ce7',glowRgb:'162,155,254',trailStyle:'void',   trailW:7,cd:8,  atkTime:3.5,dmg:80,price:150,mod:{superBonus:1.4},desc:'CD 8s · 🌑 Surcharge ×1.4'},
  mirror:  {name:'Bâton Miroir',       color:'#81ecec',glow:'#ffffff',glowRgb:'129,236,236',trailStyle:'prism',  trailW:5,cd:7,  atkTime:2,  dmg:50,price:130,mod:{mirror:true}, desc:'CD 7s · 🪞 Sorts ×2'},
};
const VENDORS={
  staff:{name:'Mordecai',portrait:'🧔',color:'#ff6b35',key:'staff',lines:['"Parle vite. Je forge."','"Tu veux un bâton. Regarde. Choisis. Pars."']},
  hat:  {name:'Mme Fripouille',portrait:'👵',color:'#e74c3c',key:'hat',lines:['"Oh là là, un client avec du GOÛT !"','"Ce chapeau appartenait à un grand mage. Il est mort. Le chapeau, lui, va très bien."']},
  clothes:{name:'Séraphin',portrait:'🧝',color:'#1abc9c',key:'clothes',lines:['"♪ Bienvenue dans mon humble atelier ♪"','"Du fil de lune. De la résine de chêne enchanté."']},
  lulu: {name:'Lulu Berlu',portrait:'🦉',color:'#a29bfe',key:'lulu',lines:['"Houh houh... très bonnes runes. Enfin, la plupart."','"Ces runes viennent d\'un mage très inventif. Son nom... houh... parti avec lui."']},
};
const RUNES=[
  {id:'circle',  name:'Ignis',    shape:'circle',  color:'#ff6b35',dmg:25,  desc:'Nova de Feu — onde sur tous',           known:true},
  {id:'square',  name:'Scutum',   shape:'square',  color:'#4ecdc4',dmg:0,   desc:'Bouclier Givre — -30% dégâts 4s',       known:true},
  {id:'triangle',name:'Fulgur',   shape:'triangle',color:'#ffe66d',dmg:30,  desc:'Éclair Précis — frappe directe',         known:true},
  {id:'v',       name:'Titan',    shape:'v',       color:'#e17055',dmg:45,  desc:'Frappe Titan — ×1.5 si surchargé',       known:false},
  {id:'zigzag',  name:'Tempestus',shape:'zigzag',  color:'#a29bfe',dmg:35,  desc:'Tempête Ombres — multi-impacts',         known:false},
  {id:'spiral',  name:'Vortex',   shape:'spiral',  color:'#81ecec',dmg:40,  desc:'Vortex Miroir — renvoie proj.',          known:false},
  {id:'cross',   name:'Sanatio',  shape:'cross',   color:'#2ecc71',dmg:-25, desc:'Soin Sacré — restaure 25 PV',            known:false},
  {id:'star',    name:'Stella',   shape:'star',    color:'#f1c40f',dmg:60,  desc:'Éclat Stellaire — dégâts massifs',       known:false},
];
const DOT_CFG={
  fire:  {color:'#ff6b35',bg:'#ff4500',label:'🔥',tickDmg:6,tickInterval:1,  duration:5,stackable:false},
  poison:{color:'#55efc4',bg:'#00b894',label:'☠️',tickDmg:4,tickInterval:.8, duration:6,stackable:true},
  ice:   {color:'#4ecdc4',bg:'#00cec9',label:'❄️',tickDmg:0,tickInterval:1,  duration:3,stackable:false,slow:true},
};
const ENEMIES=[
  {name:'Golem',   hp:120,col:'#8B7355',acc:'#C4A87E',sz:78, pCol:'#C4A87E',pSz:14,pSpd:2.5,gold:8, dmg:8,
   shootPatterns:[{type:'single',angle:0,count:1}]},
  {name:'Liche',   hp:90, col:'#6c5ce7',acc:'#a29bfe',sz:72, pCol:'#9b59b6',pSz:11,pSpd:3.5,gold:12,dmg:10,
   shootPatterns:[{type:'fan',count:3,spread:.4},{type:'spiral',count:1,spiralT:0}]},
  {name:'Démon',   hp:150,col:'#e17055',acc:'#ff6b35',sz:82, pCol:'#ff4500',pSz:13,pSpd:3.0,gold:10,dmg:12,
   shootPatterns:[{type:'burst',count:4,delay:.15}]},
  {name:'Spectre', hp:70, col:'#74b9ff',acc:'#0984e3',sz:68, pCol:'#0984e3',pSz:10,pSpd:4.5,gold:14,dmg:7,
   shootPatterns:[{type:'aimed',count:1},{type:'aimed',count:1}]},
  {name:'Troll',   hp:220,col:'#55efc4',acc:'#00b894',sz:92, pCol:'#00b894',pSz:18,pSpd:1.8,gold:6, dmg:15,
   shootPatterns:[{type:'single',angle:-.1,count:1},{type:'single',angle:.1,count:1}]},
];
const BOSSES=[
  {name:'Roi Liche',hp:400,col:'#2d3436',acc:'#636e72',sz:108,pCol:'#6c5ce7',pSz:16,pSpd:3.5,gold:60,dmg:18,isBoss:true,
   shootPatterns:[{type:'fan',count:5,spread:.6},{type:'spiral',count:2,spiralT:0},{type:'aimed',count:1}]},
  {name:'Dragon',  hp:500,col:'#c0392b',acc:'#e74c3c',sz:118,pCol:'#e74c3c',pSz:18,pSpd:3.0,gold:80,dmg:22,isBoss:true,
   shootPatterns:[{type:'burst',count:6,delay:.1},{type:'fan',count:3,spread:.3}]},
];

// ══════════════════════════ STATE ═══════════════════════════
let phase='menu';
let player={hp:100,maxHp:100,power:1.0,gold:30,level:1,staff:'twig',hat:'none',clothes:'robe',knownRunes:new Set(['circle','square','triangle']),inventory:[]};
let statuses=[];
let pendingLoot=[],lootCb=null,selectedQuest=null;
// Wand trail system
let trail=[]; // [{x,y,t,vx,vy}] fading points
let sparkParticles=[]; // lateral sparks
let glowPulse=0;
// Arc zone
const ARC_Y_FRAC=0.62; // arc center Y as fraction of H
const ARC_RADIUS_FRAC=0.38; // arc radius as fraction of W
let combat={enemies:[],curEnemy:null,projs:[],particles:[],chargeT:0,charged:false,superCharged:false,atkPhase:false,atkTimer:0,atkBaseTime:2,runeStrokes:[],curStroke:null,spawnT:0,shake:{x:0,y:0,t:0},flash:{col:'#fff',a:0},enemyT:0,enemyHurt:0,win:false,_onWin:null,patternIdx:0,patternT:0};
let training={active:false,timer:0,runeStrokes:[],curStroke:null};
let spaceReady=false;
// Modal stack for back button
let modalStack=[];

// ══════════════════════════ CANVAS ══════════════════════════
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const vc=document.getElementById('vc'),vctx=vc.getContext('2d');
const rc=document.getElementById('rune-canvas'),rctx=rc.getContext('2d');
const ac2=document.getElementById('arc-canvas'),actx=ac2.getContext('2d');
let W,H;
function resize(){W=cv.width=vc.width=rc.width=ac2.width=window.innerWidth;H=cv.height=vc.height=rc.height=ac2.height=window.innerHeight;}
resize();window.addEventListener('resize',resize);

// ══════════════════════════ UTILS ═══════════════════════════
function sData(){return SD[player.staff];}
function maxHp(){return player.maxHp;}
function rand(arr){return arr[Math.floor(Math.random()*arr.length)];}
function updateHUD(){
  const mhp=maxHp(),pct=Math.max(0,player.hp/mhp*100);
  document.getElementById('h-hp').textContent=player.hp;document.getElementById('h-mhp').textContent=mhp;
  document.getElementById('h-staff').textContent=sData().name;document.getElementById('h-gold').textContent=player.gold;
  document.getElementById('hp-fill').style.width=pct+'%';document.getElementById('hp-fill').style.background=pct>50?'#2ecc71':pct>25?'#f39c12':'#e74c3c';
  ['v-hp','v-mhp','v-gold','v-lvl'].forEach(id=>{const el=document.getElementById(id);if(!el)return;({  'v-hp':()=>el.textContent=player.hp,'v-mhp':()=>el.textContent=mhp,'v-gold':()=>el.textContent=player.gold,'v-lvl':()=>el.textContent=player.level})[id]?.();});
}
function hurtPlayer(dmg){
  player.hp=Math.max(0,player.hp-dmg);updateHUD();SFX.hurt();
  document.getElementById('hurt-vignette').style.opacity='1';setTimeout(()=>document.getElementById('hurt-vignette').style.opacity='0',200);
  combat.flash={col:'#e74c3c',a:.4};notify(`💔 -${dmg}`,'#e74c3c');
  if(player.hp<=0){stopDungeonMusic();document.getElementById('go-msg').innerHTML=`Niveau ${player.level} · Or ${player.gold}💰`;showScreen('gameover');}
}
window.restartRun=function(){player.hp=player.maxHp;player.gold=Math.floor(player.gold*.5);hideAllScreens();goVillage();};
function showScreen(n){hideAllScreens();document.getElementById(n+'-screen').style.display='flex';}
function hideAllScreens(){['gameover','victory','loot'].forEach(n=>document.getElementById(n+'-screen').style.display='none');}
function showLootScreen(items,cb){pendingLoot=items;lootCb=cb;document.getElementById('loot-items').innerHTML=items.map((item,i)=>`<div style="border:1px solid ${item.color||'#4a2a7a'};padding:14px;cursor:pointer;min-width:120px;text-align:center" onclick="pickLoot(${i})"><div style="font-size:12px;color:${item.color};font-weight:bold;margin-bottom:4px">${item.name}</div><div style="font-size:10px;color:#9b8ec4">${item.desc||''}</div><div style="margin-top:8px"><button class="btn btn-gold" style="font-size:10px;width:100%">Prendre</button></div></div>`).join('');showScreen('loot');}
window.pickLoot=function(i){const item=pendingLoot[i];if(!item)return;player.inventory.push({...item});notify(`💎 ${item.name}`,'#f1c40f');closeLoot();};
window.closeLoot=function(){hideAllScreens();if(lootCb)lootCb();lootCb=null;};

// ══════════════════════════ ARC ZONE ════════════════════════
// Player zone: arc in bottom portion of screen
// arcCX, arcCY = center of arc circle (below screen bottom)
function arcCenter(){return {cx:W/2,cy:H*ARC_Y_FRAC};}
function arcRadius(){return W*ARC_RADIUS_FRAC;}
function isInArc(x,y){
  const {cx,cy}=arcCenter(),r=arcRadius();
  // Only bottom half arc — point must be inside circle AND below the arc center line
  const dist=Math.hypot(x-cx,y-cy);
  return dist<=r&&y>=cy-r*.15; // allow a tiny bit above center for comfort
}
function drawArc(dt){
  actx.clearRect(0,0,W,H);
  if(phase!=='combat'&&phase!=='training')return;
  const {cx,cy}=arcCenter(),r=arcRadius();
  const s=sData();
  glowPulse+=dt*3;
  const pulse=.5+Math.sin(glowPulse)*.3;
  // Outer glow ring
  const grad=actx.createRadialGradient(cx,cy,r*.85,cx,cy,r*1.08);
  grad.addColorStop(0,'transparent');
  grad.addColorStop(.5,`rgba(${s.glowRgb},${.08*pulse})`);
  grad.addColorStop(1,'transparent');
  actx.fillStyle=grad;actx.beginPath();actx.arc(cx,cy,r*1.08,0,Math.PI*2);actx.fill();
  // Arc line (bottom semicircle)
  actx.save();
  actx.strokeStyle=`rgba(${s.glowRgb},${.25+pulse*.15})`;
  actx.lineWidth=1.5;
  actx.setLineDash([6,8]);
  actx.beginPath();
  actx.arc(cx,cy,r,Math.PI*.1,Math.PI*.9); // bottom arc
  actx.stroke();
  actx.setLineDash([]);
  // Zone fill gradient (inside arc, combat area)
  const fill=actx.createRadialGradient(cx,cy,0,cx,cy,r);
  fill.addColorStop(0,`rgba(${s.glowRgb},${.03*pulse})`);
  fill.addColorStop(1,'transparent');
  actx.fillStyle=fill;
  actx.beginPath();actx.arc(cx,cy,r,0,Math.PI*2);actx.fill();
  // Player avatar at center bottom of arc
  const px=cx,py=cy+r*.05;
  actx.globalAlpha=.7;
  actx.fillStyle=s.color;
  // Elf silhouette (simple pixel art)
  actx.fillRect(px-5,py-18,10,14); // body
  actx.beginPath();actx.arc(px,py-22,6,0,Math.PI*2);actx.fill(); // head
  // Staff glow
  const sg=actx.createRadialGradient(px+10,py-14,0,px+10,py-14,12);
  sg.addColorStop(0,`rgba(${s.glowRgb},.6)`);sg.addColorStop(1,'transparent');
  actx.fillStyle=sg;actx.beginPath();actx.arc(px+10,py-14,12,0,Math.PI*2);actx.fill();
  actx.fillStyle=s.color;actx.fillRect(px+6,py-24,3,18);
  actx.globalAlpha=1;
  actx.restore();
  // "Hors zone" warning if mouse outside arc during combat
  if(phase==='combat'&&!combat.atkPhase&&mouse.down&&!isInArc(mouse.x,mouse.y)){
    actx.fillStyle='rgba(231,76,60,.12)';actx.fillRect(0,0,W,H);
    actx.fillStyle='#e74c3c';actx.font='11px monospace';actx.textAlign='center';
    actx.fillText('⚠ Zone hors portée',W/2,H*.4);
  }
}

// ══════════════════════════ WAND TRAIL ══════════════════════
function addTrailPoint(x,y,prevX,prevY){
  const s=sData();
  const speed=Math.hypot(x-prevX,y-prevY);
  // Main trail point
  trail.push({x,y,t:1,size:s.trailW,color:s.color,glow:s.glow,glowRgb:s.glowRgb,style:s.trailStyle});
  // Dot cloud
  for(let i=0;i<3;i++){
    trail.push({x:x+(Math.random()-.5)*8,y:y+(Math.random()-.5)*8,t:.7+Math.random()*.3,size:s.trailW*.5+Math.random()*3,color:s.color,glow:s.glow,glowRgb:s.glowRgb,style:'dot',isDot:true});
  }
  // Lateral sparks on fast movement
  if(speed>6){
    const angle=Math.atan2(y-prevY,x-prevX);
    for(let i=0;i<4;i++){
      const perpAngle=angle+Math.PI/2+(Math.random()-.5)*1.2;
      const spd=1+Math.random()*3;
      sparkParticles.push({x,y,vx:Math.cos(perpAngle)*spd,vy:Math.sin(perpAngle)*spd,t:1,size:1.5+Math.random()*2.5,color:s.glow,glowRgb:s.glowRgb});
    }
  }
}
function drawWandTrail(){
  if(!trail.length&&!sparkParticles.length)return;
  // Draw trail segments (pairs of consecutive points)
  for(let i=1;i<trail.length;i++){
    const a=trail[i-1],b=trail[i];
    if(a.isDot||b.isDot)continue;
    const alpha=Math.min(a.t,b.t);
    if(alpha<=0)continue;
    const s=b;
    ctx.save();
    ctx.globalAlpha=alpha*.8;
    // Outer glow
    ctx.strokeStyle=`rgba(${s.glowRgb},${alpha*.5})`;
    ctx.lineWidth=(s.size+6)*alpha;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    // Core line with style
    ctx.globalAlpha=alpha;
    switch(s.style){
      case 'flame':ctx.strokeStyle=`rgba(255,${100+Math.floor(Math.random()*80)},0,${alpha})`;break;
      case 'crystal':ctx.strokeStyle=`rgba(78,205,196,${alpha})`;break;
      case 'spark':ctx.strokeStyle=Math.random()>.5?`rgba(255,230,109,${alpha})`:`rgba(255,255,255,${alpha})`;break;
      case 'void':ctx.strokeStyle=`rgba(108,92,231,${alpha})`;break;
      case 'prism':const hue=(Date.now()/10+i*20)%360;ctx.strokeStyle=`hsla(${hue},90%,75%,${alpha})`;break;
      default:ctx.strokeStyle=s.color;
    }
    ctx.lineWidth=s.size*alpha;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    // White core
    ctx.strokeStyle=`rgba(255,255,255,${alpha*.4})`;ctx.lineWidth=s.size*.25*alpha;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.restore();
  }
  // Draw dot particles
  trail.forEach(p=>{
    if(!p.isDot||p.t<=0)return;
    ctx.save();ctx.globalAlpha=p.t;
    // Glow
    const grd=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*2.5);
    grd.addColorStop(0,`rgba(${p.glowRgb},.8)`);grd.addColorStop(1,'transparent');
    ctx.fillStyle=grd;ctx.beginPath();ctx.arc(p.x,p.y,p.size*2.5,0,Math.PI*2);ctx.fill();
    // Core dot
    ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size*.8,0,Math.PI*2);ctx.fill();
    ctx.restore();
  });
  // Sparks
  sparkParticles.forEach(p=>{
    if(p.t<=0)return;
    ctx.save();ctx.globalAlpha=p.t;
    const grd=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*2);
    grd.addColorStop(0,`rgba(${p.glowRgb},.9)`);grd.addColorStop(1,'transparent');
    ctx.fillStyle=grd;ctx.beginPath();ctx.arc(p.x,p.y,p.size*2,0,Math.PI*2);ctx.fill();
    ctx.restore();
  });
}
function updateTrail(dt){
  trail.forEach(p=>{p.t-=dt*(p.isDot?2.5:1.8);});
  trail=trail.filter(p=>p.t>0);
  sparkParticles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=.88;p.vy*=.88;p.t-=dt*3.5;});
  sparkParticles=sparkParticles.filter(p=>p.t>0);
}

// ══════════════════════════ DoT ═════════════════════════════
function applyStatus(type){const cfg=DOT_CFG[type];const ex=statuses.find(s=>s.type===type);if(ex&&!cfg.stackable){ex.timer=cfg.duration;return;}if(ex&&cfg.stackable){ex.stacks=Math.min(4,ex.stacks+1);ex.timer=cfg.duration;return;}statuses.push({type,timer:cfg.duration,tickT:cfg.tickInterval,stacks:1});}
function updateStatuses(dt){const e=combat.curEnemy;statuses=statuses.filter(s=>{s.timer-=dt;s.tickT-=dt;const cfg=DOT_CFG[s.type];if(s.tickT<=0&&e&&!e.dead){const dmg=cfg.tickDmg*s.stacks;e.curHp=Math.max(0,e.curHp-dmg);s.tickT=cfg.tickInterval;SFX['dot_'+s.type]?.();dotFx(e.x,e.y,cfg.color,dmg);if(cfg.slow)e._slowT=1.5;if(e.curHp<=0)killEnemy(e);}return s.timer>0;});document.getElementById('status-bar').innerHTML=statuses.map(s=>{const c=DOT_CFG[s.type];return`<div class="status-pill" style="color:${c.color};border-color:${c.color}66;background:${c.bg}22">${c.label}${s.stacks>1?' ×'+s.stacks:''} ${Math.ceil(s.timer)}s</div>`;}).join('');}

// ══════════════════════════ SHOOT PATTERNS ══════════════════
function firePattern(e){
  const patterns=e.shootPatterns||[{type:'single',angle:0,count:1}];
  const pat=patterns[combat.patternIdx%patterns.length];
  combat.patternIdx++;
  const baseSpd=e.pSpd*(.8+Math.random()*.4);
  switch(pat.type){
    case 'single':spawnProj(e,pat.angle||0,baseSpd);break;
    case 'fan':{const n=pat.count||3,sp=pat.spread||.4;for(let i=0;i<n;i++){const a=(i/(n-1)-.5)*sp;spawnProj(e,a,baseSpd);}break;}
    case 'burst':{const n=pat.count||4;for(let i=0;i<n;i++){setTimeout(()=>{if(combat.curEnemy===e&&!e.dead)spawnProj(e,(Math.random()-.5)*.6,baseSpd);},i*(pat.delay||.15)*1000);}break;}
    case 'aimed':{const ax=W/2,ay=H*.85;const ang=Math.atan2(ay-e.y,ax-e.x);spawnProj(e,ang-Math.PI/2,baseSpd,true);break;}
    case 'spiral':{if(e._spiralAngle===undefined)e._spiralAngle=0;const n=pat.count||1;for(let i=0;i<n;i++){spawnProj(e,e._spiralAngle+i*(Math.PI*2/n),baseSpd*.7+.5);}e._spiralAngle+=.45;break;}
  }
}
function spawnProj(e,angle,spd,aimed=false){
  let vx,vy;
  if(aimed){vx=Math.cos(angle)*spd;vy=Math.sin(angle)*spd;}
  else{vx=Math.sin(angle)*spd;vy=Math.cos(angle)*spd+spd*.3;}
  combat.projs.push({x:e.x+(Math.random()-.5)*e.sz*.4,y:e.y+e.sz*.45,vx,vy,a:Math.random()*Math.PI*2,spin:(Math.random()-.5)*.12,color:e.pCol,size:e.pSz,shape:e.pShp||'rock',dead:false,hit:false});
}

// ══════════════════════════ COMBAT ══════════════════════════
function startCombat(eList,onWin){
  phase='combat';
  document.getElementById('village').style.display='none';
  document.getElementById('combat-ui').style.display='block';
  document.getElementById('rune-canvas').style.display='block';
  document.getElementById('hud-r').innerHTML=`<button class="btn" onclick="goVillage()">⏭ Village</button>`;
  stopVillageMusic();startDungeonMusic();
  statuses=[];trail=[];sparkParticles=[];
  Object.assign(combat,{enemies:eList,curEnemy:null,projs:[],particles:[],chargeT:0,charged:false,superCharged:false,atkPhase:false,atkTimer:0,runeStrokes:[],curStroke:null,spawnT:0,shake:{x:0,y:0,t:0},flash:{col:'#fff',a:0},enemyT:0,enemyHurt:0,win:false,_onWin:onWin,patternIdx:0,patternT:0});
  nextEnemy();
}
function nextEnemy(){
  if(!combat.enemies.length){combat.win=true;setTimeout(()=>{stopDungeonMusic();if(combat._onWin)combat._onWin();},1200);return;}
  const def=combat.enemies.shift();const m=1+player.level*.1;
  combat.curEnemy={...def,maxHp:Math.round((def.hp||100)*m),curHp:Math.round((def.hp||100)*m),x:W/2,y:H*.16,dead:false,_slowT:0,_spiralAngle:0};
  combat.chargeT=0;combat.charged=false;combat.superCharged=false;combat.atkPhase=false;
  combat.runeStrokes=[];combat.curStroke=null;combat.spawnT=0;spaceReady=false;statuses=[];combat.patternIdx=0;
  document.getElementById('phase-hint').textContent='Défléchissez les attaques';
  document.getElementById('attack-timer-bar').style.display='none';
  rctx.clearRect(0,0,W,H);
}
function killEnemy(e){if(e.dead)return;e.dead=true;player.gold+=e.gold||0;updateHUD();notify(`${e.name} vaincu ! +${e.gold||0}💰`,'#2ecc71');setTimeout(nextEnemy,900);}
function updateCombat(dt){
  const e=combat.curEnemy;if(!e||e.dead||combat.win)return;
  updateStatuses(dt);updateTrail(dt);
  combat.enemyT+=dt;if(combat.enemyHurt>0)combat.enemyHurt-=dt*2.5;if(e._slowT>0)e._slowT-=dt;
  if(combat.shake.t>0){combat.shake.x=(Math.random()-.5)*9*combat.shake.t;combat.shake.y=(Math.random()-.5)*6*combat.shake.t;combat.shake.t-=dt*3;}else{combat.shake.x=0;combat.shake.y=0;}
  combat.flash.a=Math.max(0,combat.flash.a-dt*2.5);
  const cd=sData().cd;
  if(!combat.atkPhase){
    combat.chargeT+=dt;
    const half=Math.min(combat.chargeT/cd,1),full=Math.min(combat.chargeT/(cd*2),1);
    document.getElementById('cb-fill').style.width=(half*50)+'%';
    document.getElementById('cb-fill2').style.width=(full*100)+'%';
    document.getElementById('cb-pct').textContent=Math.floor(half*100)+'%';
    const wasC=combat.charged;
    combat.charged=combat.chargeT>=cd;combat.superCharged=combat.chargeT>=cd*2;
    document.getElementById('cb-super').style.display=combat.superCharged?'inline':'none';
    if(combat.charged&&!wasC){document.getElementById('phase-hint').textContent='[ESPACE] pour attaquer !';spaceReady=true;SFX.fullCharge();}
    combat.spawnT-=dt;
    if(combat.spawnT<=0){firePattern(e);combat.spawnT=1/((e.pRate||1.5)*(e._slowT>0?.4:1));}
  } else {
    combat.atkTimer-=dt;
    const fill=document.getElementById('attack-timer-fill');if(fill)fill.style.width=Math.max(0,combat.atkTimer/combat.atkBaseTime*100)+'%';
    if(combat.atkTimer<=0)endAtkPhase();
  }
  const spd=e._slowT>0?.35:1;
  combat.projs.forEach(p=>{p.x+=p.vx*spd;p.y+=p.vy*spd;p.a+=p.spin;
    if(p.y>H-52&&!p.hit){p.hit=true;p.dead=true;if(!combat.atkPhase)hurtPlayer(e.dmg||8);}
    if(p.y>H+30)p.dead=true;});
  combat.projs=combat.projs.filter(p=>!p.dead);
  updParts(combat.particles,dt);
}
function checkSlice(x1,y1,x2,y2){
  // Only slice if in arc zone
  if(!isInArc(x1,y1)&&!isInArc(x2,y2))return;
  combat.projs.forEach(p=>{
    if(p.dead||p.hit)return;
    const dx=p.x-x1,dy=p.y-y1,ex=x2-x1,ey=y2-y1,l2=ex*ex+ey*ey;if(l2<1)return;
    const t=Math.max(0,Math.min(1,(dx*ex+dy*ey)/l2));const nx=x1+t*ex-p.x,ny=y1+t*ey-p.y;
    if(nx*nx+ny*ny<(p.size*2)**2){p.dead=true;hitFx(p.x,p.y,p.color,sData().color);SFX.slice();if(!combat.atkPhase&&!combat.charged)combat.chargeT+=.12;}
  });
}
function beginAtkPhase(){
  if(!combat.charged)return;
  combat.atkPhase=true;
  const sm=combat.superCharged?(sData().mod?.superBonus||2):1;
  combat.atkBaseTime=sData().atkTime*sm;combat.atkTimer=combat.atkBaseTime;
  combat.runeStrokes=[];combat.curStroke=null;combat.projs=[];spaceReady=false;trail=[];sparkParticles=[];
  document.getElementById('attack-timer-bar').style.display='block';
  document.getElementById('phase-hint').textContent='Tracez vos runes !';
  document.getElementById('rune-results').style.display='none';SFX.charge();
}
function endAtkPhase(){
  combat.atkPhase=false;document.getElementById('attack-timer-bar').style.display='none';
  combat.chargeT=0;combat.charged=false;combat.superCharged=false;
  document.getElementById('cb-fill').style.width='0%';document.getElementById('cb-fill2').style.width='0%';
  document.getElementById('phase-hint').textContent='Défléchissez les attaques';
  const results=combat.runeStrokes.filter(s=>s.length>6).map(recognizeRune).filter(Boolean);
  rctx.clearRect(0,0,W,H);applyRuneResults(results);
}
function applyRuneResults(results){
  if(!results.length){SFX.runeFail();showRuneResults([{name:'Aucune rune',color:'#e74c3c',dmg:0}]);return;}
  const e=combat.curEnemy;
  results.forEach(rune=>{
    SFX.runeSound(rune.id);setTimeout(()=>playCastVoice(rune.id,customCastSounds[rune.id]),180);
    const mirror=sData().mod?.mirror?2:1;const dmg=rune.dmg<0?rune.dmg:Math.round(rune.dmg*player.power*mirror);
    if(dmg<0){player.hp=Math.min(maxHp(),player.hp+Math.abs(dmg));updateHUD();}
    else if(e&&!e.dead){e.curHp=Math.max(0,e.curHp-dmg);spellFx(e.x,e.y,rune.color,dmg);combat.shake={x:0,y:0,t:.4};combat.flash={col:rune.color,a:.4};combat.enemyHurt=.5;const dot=sData().mod?.dot;if(dot)applyStatus(dot);}
    if(!player.knownRunes.has(rune.id)){player.knownRunes.add(rune.id);SFX.levelUp();notify(`✦ Rune découverte : ${rune.name} !`,'#f1c40f');}
  });
  SFX.runeSuccess();showRuneResults(results);
  const e2=combat.curEnemy;if(e2&&e2.curHp<=0)killEnemy(e2);
}
function showRuneResults(results){
  const el=document.getElementById('rune-results');el.style.display='block';
  el.innerHTML=results.map(r=>`<div style="color:${r.color};font-size:13px;font-family:monospace;font-weight:bold;text-shadow:0 0 10px ${r.color};margin:3px 0">${r.dmg>0?`✦ ${r.name} — ${Math.round(r.dmg*player.power)} dég.`:r.dmg<0?`✦ ${r.name} — +${Math.abs(r.dmg)} PV`:`✕ ${r.name}`}</div>`).join('');
  setTimeout(()=>{el.style.display='none';},1800);
}

// ══════════════════════════ RUNE RECOGNITION ════════════════
function recognizeRune(pts){
  if(pts.length<6)return null;
  const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const bw=maxX-minX,bh=maxY-minY,diag=Math.hypot(bw,bh);
  const se=Math.hypot(pts[0].x-pts[pts.length-1].x,pts[0].y-pts[pts.length-1].y);
  const closed=se<diag*.38;let pLen=0;for(let i=1;i<pts.length;i++)pLen+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
  let xC=0,yC=0,lxd=null,lyd=null;for(let i=1;i<pts.length;i++){const xd=pts[i].x>pts[i-1].x?1:-1,yd=pts[i].y>pts[i-1].y?1:-1;if(lxd!==null&&xd!==lxd)xC++;if(lyd!==null&&yd!==lyd)yC++;lxd=xd;lyd=yd;}
  let angSum=0;for(let i=2;i<pts.length;i++){const a1=Math.atan2(pts[i-1].y-pts[i-2].y,pts[i-1].x-pts[i-2].x),a2=Math.atan2(pts[i].y-pts[i-1].y,pts[i].x-pts[i-1].x);angSum+=Math.abs(a2-a1);}
  const avgC=angSum/pts.length;const mid=pts[Math.floor(pts.length/2)];const ratio=bw>0&&bh>0?Math.min(bw,bh)/Math.max(bw,bh):0;const vValley=mid.y>pts[0].y+bh*.25&&mid.y>pts[pts.length-1].y+bh*.25&&bh>bw*.4;
  const cands=[];
  if(closed&&ratio>.44&&bw>40&&avgC<.25&&xC>4&&yC>4)cands.push({id:'circle',score:ratio+.3});
  if(closed&&ratio>.48&&bw>40&&xC>=2&&yC>=2&&avgC>.08)cands.push({id:'square',score:ratio*(avgC>.15?1.2:1)});
  if(closed&&bw>28&&bh>24&&xC<=3&&yC<=3&&avgC>.1)cands.push({id:'triangle',score:.6+ratio*.2});
  if(!closed&&vValley&&xC<=2)cands.push({id:'v',score:.7});
  if(!closed&&xC>=3&&bw>bh*1.3)cands.push({id:'zigzag',score:.5+xC*.05});
  if(ratio>.48&&xC>=2&&yC>=2&&!closed&&bw>38&&bh>38&&xC+yC>=5)cands.push({id:'cross',score:.6});
  if(!closed&&pLen>diag*2.6&&bw>48&&avgC>.04)cands.push({id:'spiral',score:pLen/diag*.15});
  if(!closed&&xC>=4&&yC>=2&&bw>48&&bh>38)cands.push({id:'star',score:.5+xC*.04});
  if(!cands.length)return null;cands.sort((a,b)=>b.score-a.score);return RUNES.find(r=>r.id===cands[0].id)||null;
}

// ══════════════════════════ TRAINING ════════════════════════
function beginTraining(){
  phase='training';document.getElementById('village').style.display='none';document.getElementById('combat-ui').style.display='block';document.getElementById('rune-canvas').style.display='block';
  document.getElementById('hud-r').innerHTML=`<span id="train-timer" style="color:#e8c97a">30s</span><button class="btn" style="margin-left:8px" onclick="endTraining()">✕ Fin</button>`;
  document.getElementById('phase-hint').textContent='Tracez des runes !';document.getElementById('attack-timer-bar').style.display='none';
  training={active:true,timer:30,runeStrokes:[],curStroke:null};
  combat.atkPhase=true;combat.runeStrokes=training.runeStrokes;combat.curStroke=null;combat.projs=[];combat.particles=[];statuses=[];trail=[];sparkParticles=[];
  combat.curEnemy={name:'Mannequin',maxHp:999,curHp:999,x:W/2,y:H*.16,col:'#4a3a6a',acc:'#9b8ec4',sz:62,dead:false,isTraining:true,_slowT:0,dmg:0,gold:0};
}
function updateTraining(dt){training.timer-=dt;updateTrail(dt);const el=document.getElementById('train-timer');if(el)el.textContent=Math.ceil(training.timer)+'s';if(training.timer<=0)endTraining();updParts(combat.particles,dt);}
window.endTraining=function(){training.active=false;let found=0;training.runeStrokes.filter(s=>s.length>6).forEach(s=>{const r=recognizeRune(s);if(r&&!player.knownRunes.has(r.id)){player.knownRunes.add(r.id);found++;SFX.levelUp();notify(`✦ Rune découverte : ${r.name} !`,'#f1c40f');}});if(!found)notify('Aucune nouvelle rune.','#9b8ec4');rctx.clearRect(0,0,W,H);combat.atkPhase=false;combat.curEnemy=null;trail=[];sparkParticles=[];goVillage();};

// ══════════════════════════ FX ══════════════════════════════
function hitFx(x,y,c1,c2){for(let i=0;i<8;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*4;combat.particles.push({type:'spark',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,color:Math.random()<.5?c1:c2,life:1,size:2+Math.random()*3});}}
function spellFx(x,y,col,dmg){for(let i=0;i<24;i++){const a=Math.random()*Math.PI*2,s=4+Math.random()*8;combat.particles.push({type:'spark',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1.5,color:col,life:1,size:3+Math.random()*5});}for(let r=0;r<3;r++)combat.particles.push({type:'ring',x,y,r:8+r*18,rg:11+r*3,color:col,life:1});combat.particles.push({type:'txt',x,y:y-20,vx:0,vy:-1.4,color:col,life:1.6,size:22,txt:`-${dmg}`});}
function dotFx(x,y,col,dmg){for(let i=0;i<6;i++){const a=Math.random()*Math.PI*2,s=1.5+Math.random()*3;combat.particles.push({type:'spark',x:x+(Math.random()-.5)*30,y:y+(Math.random()-.5)*20,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1,color:col,life:.9,size:2+Math.random()*3});}if(dmg>0)combat.particles.push({type:'txt',x,y:y-30,vx:(Math.random()-.5)*.5,vy:-1,color:col,life:1.2,size:13,txt:`-${dmg}`});}
function updParts(arr,dt){arr.forEach(p=>{p.x+=(p.vx||0);p.y+=(p.vy||0);if(p.vy!==undefined)p.vy+=.12;p.life-=dt*1.4;if(p.type==='ring')p.r+=p.rg*dt;if(p.size&&p.type==='spark')p.size*=.93;});for(let i=arr.length-1;i>=0;i--)if(arr[i].life<=0)arr.splice(i,1);}

// ══════════════════════════ DRAW ════════════════════════════
let vT=0;
function drawVillage(dt){
  vT+=dt;vctx.fillStyle='#060310';vctx.fillRect(0,0,W,H);
  vctx.save();for(let i=0;i<140;i++){const sx=(i*137.5+11)%W,sy=(i*93.7+17)%(H*.72);vctx.globalAlpha=.18+Math.sin(vT*1.5+i)*.14;vctx.fillStyle=i%5===0?'#ffe9a0':'#ffffff';vctx.fillRect(sx,sy,i%7===0?2:1,i%7===0?2:1);}vctx.restore();
  const hg=vctx.createLinearGradient(0,H*.6,0,H*.8);hg.addColorStop(0,'#1a0a2e');hg.addColorStop(1,'#0d0618');vctx.fillStyle=hg;vctx.fillRect(0,H*.6,W,H*.4);
  [[.08,.4,.11,.3,'#100828'],[.26,.36,.09,.36,'#0d061e'],[.44,.43,.07,.29,'#12082a'],[.58,.39,.1,.33,'#0e071f'],[.76,.44,.08,.28,'#100828']].forEach(([x,y,w,h,c])=>{vctx.fillStyle=c;vctx.fillRect(x*W,y*H,w*W,h*H);});
  const mg=vctx.createRadialGradient(W*.82,H*.13,0,W*.82,H*.13,55);mg.addColorStop(0,'#ffe9a044');mg.addColorStop(1,'transparent');vctx.fillStyle=mg;vctx.beginPath();vctx.arc(W*.82,H*.13,55,0,Math.PI*2);vctx.fill();
  [[.1,.68],[.35,.65],[.62,.67],[.88,.66]].forEach(([x,y])=>{const lg=vctx.createRadialGradient(x*W,y*H,0,x*W,y*H,30);lg.addColorStop(0,'#e8c97a22');lg.addColorStop(1,'transparent');vctx.fillStyle=lg;vctx.beginPath();vctx.arc(x*W,y*H,30,0,Math.PI*2);vctx.fill();});
}
function drawCombat(){
  ctx.fillStyle='#060310';ctx.fillRect(0,0,W,H);
  ctx.save();ctx.globalAlpha=.05;ctx.strokeStyle='#4a2a7a';ctx.lineWidth=.5;for(let x=0;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}ctx.restore();
  ctx.strokeStyle='#4a2a7a33';ctx.lineWidth=1;ctx.setLineDash([4,8]);ctx.beginPath();ctx.moveTo(0,H*.33);ctx.lineTo(W,H*.33);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#4a2a7a';ctx.font='9px monospace';ctx.textAlign='left';ctx.fillText('ZONE ENNEMIE',8,H*.33-5);ctx.fillText('ZONE DE COMBAT',8,H*.33+12);
  const fg=ctx.createRadialGradient(W/2,H,0,W/2,H,W*.7);fg.addColorStop(0,sData().glow+'12');fg.addColorStop(1,'transparent');ctx.fillStyle=fg;ctx.fillRect(0,0,W,H);
  statuses.forEach((s,i)=>{const c=DOT_CFG[s.type];ctx.save();ctx.globalAlpha=.04+Math.sin(Date.now()/300+i)*.02;ctx.fillStyle=c.color;ctx.fillRect(0,0,W,H*.33);ctx.restore();});
  drawEnemy();drawProjs();drawParts(combat.particles);
  // Draw wand trail ABOVE particles, BELOW rune canvas
  drawWandTrail();
  if(combat.atkPhase){ctx.save();ctx.fillStyle=sData().color+'07';ctx.fillRect(0,H*.33,W,H*.67);ctx.restore();}
  if(combat.flash.a>0){ctx.fillStyle=combat.flash.col+Math.floor(combat.flash.a*255).toString(16).padStart(2,'0');ctx.fillRect(0,0,W,H);}
  if(combat.win){ctx.fillStyle='#060310cc';ctx.fillRect(0,0,W,H);ctx.fillStyle='#2ecc71';ctx.font='bold 24px monospace';ctx.textAlign='center';ctx.shadowBlur=18;ctx.shadowColor='#2ecc71';ctx.fillText('✦ VICTOIRE ✦',W/2,H/2);ctx.shadowBlur=0;}
}
function drawEnemy(){
  const e=combat.curEnemy;if(!e)return;
  const bob=Math.sin(combat.enemyT*.04)*4;const ex=e.x+combat.shake.x,ey=e.y+bob+combat.shake.y;
  ctx.save();ctx.translate(ex,ey);if(combat.enemyHurt>0)ctx.globalAlpha=.3+Math.random()*.7;
  statuses.forEach(s=>{const c=DOT_CFG[s.type];ctx.save();ctx.globalAlpha=.18+Math.sin(Date.now()/200)*.08;const g=ctx.createRadialGradient(0,0,0,0,0,e.sz*1.1);g.addColorStop(0,c.color+'88');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,e.sz*1.1,0,Math.PI*2);ctx.fill();ctx.restore();});
  const eg=ctx.createRadialGradient(0,0,0,0,0,e.sz*.9);eg.addColorStop(0,e.acc+'22');eg.addColorStop(1,'transparent');ctx.fillStyle=eg;ctx.beginPath();ctx.arc(0,0,e.sz*.9,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=combat.enemyHurt>0?.3+Math.random()*.7:1;
  ctx.fillStyle='#00000044';ctx.beginPath();ctx.ellipse(0,e.sz*.5,e.sz*.38,e.sz*.08,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=e._slowT>0?'#4ecdc4':e.col;ctx.fillRect(-e.sz*.38,-e.sz*.48,e.sz*.76,e.sz*.95);
  ctx.strokeStyle=e.acc;ctx.lineWidth=1.5;ctx.strokeRect(-e.sz*.38,-e.sz*.48,e.sz*.76,e.sz*.95);
  [-.2,.2].forEach(ox=>{const g=ctx.createRadialGradient(e.sz*ox,-e.sz*.1,0,e.sz*ox,-e.sz*.1,e.sz*.09);g.addColorStop(0,'#fff');g.addColorStop(.5,e.acc);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.arc(e.sz*ox,-e.sz*.1,e.sz*.07,0,Math.PI*2);ctx.fill();});
  ctx.globalAlpha=1;const bw=e.sz*1.3,bh=8,bx=-bw/2,by=-e.sz*.63;
  ctx.fillStyle='#1a0a2e';ctx.fillRect(bx,by,bw,bh);ctx.fillStyle=e.curHp/e.maxHp>.5?'#2ecc71':e.curHp/e.maxHp>.25?'#f39c12':'#e74c3c';ctx.fillRect(bx,by,bw*(e.curHp/e.maxHp),bh);ctx.strokeStyle='#ffffff22';ctx.lineWidth=.5;ctx.strokeRect(bx,by,bw,bh);
  ctx.fillStyle='#e8c97a';ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.fillText((e.isBoss?'👁 ':e.isTraining?'🪆 ':'')+e.name+` ${Math.ceil(e.curHp||0)}/${e.maxHp||0}`,0,by-7);
  ctx.restore();
}
function drawProjs(){combat.projs.forEach(p=>{if(p.dead)return;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);const pg=ctx.createRadialGradient(0,0,0,0,0,p.size*2);pg.addColorStop(0,p.color+'aa');pg.addColorStop(1,'transparent');ctx.fillStyle=pg;ctx.beginPath();ctx.arc(0,0,p.size*2,0,Math.PI*2);ctx.fill();ctx.fillStyle=p.color;if(p.shape==='orb'||p.shape==='rock'){ctx.beginPath();ctx.arc(0,0,p.size,0,Math.PI*2);ctx.fill();}else if(p.shape==='skull'){ctx.beginPath();ctx.arc(0,-p.size*.2,p.size*.6,0,Math.PI*2);ctx.fill();ctx.fillRect(-p.size*.5,p.size*.1,p.size,p.size*.4);}else if(p.shape==='flame'){ctx.beginPath();ctx.moveTo(0,-p.size);ctx.lineTo(p.size*.6,p.size*.4);ctx.lineTo(0,p.size*.2);ctx.lineTo(-p.size*.6,p.size*.4);ctx.closePath();ctx.fill();}ctx.restore();});}
function drawParts(arr){arr.forEach(p=>{ctx.save();ctx.globalAlpha=Math.max(0,p.life);if(p.type==='spark'){ctx.fillStyle=p.color;ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);}else if(p.type==='ring'){ctx.strokeStyle=p.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.stroke();}else if(p.type==='txt'){ctx.font=`bold ${p.size}px monospace`;ctx.fillStyle=p.color;ctx.textAlign='center';ctx.fillText(p.txt,p.x,p.y);}ctx.restore();});}
function drawRuneCanvas(){
  rctx.clearRect(0,0,W,H);if(!combat.atkPhase&&phase!=='training')return;
  combat.runeStrokes.forEach(stroke=>{if(stroke.length<2)return;rctx.save();rctx.strokeStyle=sData().color+'bb';rctx.lineWidth=3;rctx.lineCap='round';rctx.lineJoin='round';rctx.shadowBlur=8;rctx.shadowColor=sData().glow;rctx.beginPath();rctx.moveTo(stroke[0].x,stroke[0].y);stroke.forEach(p=>rctx.lineTo(p.x,p.y));rctx.stroke();rctx.restore();});
  if(combat.curStroke&&combat.curStroke.length>1){rctx.save();rctx.strokeStyle=sData().color;rctx.lineWidth=3.5;rctx.lineCap='round';rctx.lineJoin='round';rctx.shadowBlur=14;rctx.shadowColor=sData().glow;rctx.beginPath();rctx.moveTo(combat.curStroke[0].x,combat.curStroke[0].y);combat.curStroke.forEach(p=>rctx.lineTo(p.x,p.y));rctx.stroke();rctx.restore();}
}

// ══════════════════════════ MODAL SYSTEM ════════════════════
function openModal(type,pushStack=true){
  if(pushStack)modalStack.push(type);
  document.getElementById('modal-overlay').style.display='flex';
  const body=document.getElementById('modal-body');
  body.innerHTML=renderModal(type);SFX.click();
  // Back button
  const box=document.getElementById('modal-content')||document.querySelector('.modal-box');
  let backBtn=document.querySelector('.back-btn');
  if(backBtn)backBtn.remove();
  if(modalStack.length>1){
    const btn=document.createElement('button');btn.className='back-btn';btn.textContent='← Retour';
    btn.onclick=()=>goBack();
    document.querySelector('.modal-box').prepend(btn);
  }
}
function goBack(){
  modalStack.pop();
  if(modalStack.length===0){closeModal();return;}
  openModal(modalStack[modalStack.length-1],false);
}
function closeModal(){document.getElementById('modal-overlay').style.display='none';modalStack=[];hideDialogue();}
function renderModal(t){
  if(t==='spellbook')return renderSpellbook();if(t==='quests')return renderQuests();
  if(t==='inventory')return renderInventory();if(t==='training')return renderTrainingModal();
  if(t==='shop-staff')return renderShopFor('staff');if(t==='shop-hat')return renderShopFor('hat');
  if(t==='shop-clothes')return renderShopFor('clothes');if(t==='shop-lulu')return renderLulu();
  return '';
}
function openVendor(key){
  const v=VENDORS[key];SFX.click();
  playDialogue(key,v.portrait,v.name,v.color,rand(v.lines),()=>{hideDialogue();openModal('shop-'+key);});
}
function renderShopFor(key){
  const dbs={staff:SD,hat:{wizard:{name:'Chapeau Mage',color:'#e74c3c',desc:'Dégâts +20%',price:60},shadow:{name:'Capuche Ombre',color:'#2d3436',desc:'CD -0.5s',price:85},feather:{name:'Tricorne Plumes',color:'#c8a87e',desc:'ATK +0.5s',price:70},void:{name:'Coiffe Néant',color:'#6c5ce7',desc:'Dégâts +35%',price:140}},clothes:{leather:{name:'Armure Cuir',color:'#8B4513',desc:'PV +40',price:90},silk:{name:'Tunique Soie',color:'#fd79a8',desc:'ATK +0.3s',price:75},runic:{name:'Armure Runique',color:'#4ecdc4',desc:'PV+30, Dég+10%',price:120}}};
  const db=dbs[key]||SD;const names={staff:'🪄 Bâtons',hat:'🎩 Chapeaux',clothes:'👗 Vêtements'};
  const items=Object.entries(db).filter(([k])=>k!=='twig'&&k!=='none').sort(()=>Math.random()-.5).slice(0,4);
  return `<h2>${names[key]||'Boutique'}</h2><div class="shop-grid">${items.map(([k,item])=>`<div class="shop-item" onclick="buyItem('${key}','${k}',${item.price||30},\`${item.name}\`,\`${item.desc||''}\`,\`${item.color||'#e8c97a'}\`)"><h4 style="color:${item.color||'#e8c97a'}">${item.name}</h4><p>${item.desc||'—'}</p><div class="price">${item.price||30}💰</div></div>`).join('')}</div>`;
}
window.buyItem=function(type,key,price,name,desc,color){
  if(player.gold<price){notify('Pas assez d\'or !','#e74c3c');return;}
  player.gold-=price;SFX.levelUp();
  if(type==='staff'&&SD[key]){player.staff=key;notify(`🪄 ${SD[key].name} équipé !`,'#2ecc71');}
  else{player.inventory.push({id:key,itemType:type,name,color,desc,price});notify(`✓ ${name} dans l'inventaire`,'#2ecc71');}
  updateHUD();
};
function renderLulu(){
  const LULU_SHOP=[{runeId:'spiral',price:50,luluDesc:'"Quelque chose avec des miroirs. Ou des tourbillons."'},{runeId:'star',price:80,luluDesc:'"Grande rune brillante. Ou une recette. Je confonds."'},{runeId:'v',price:35,luluDesc:'"Rune de victoire. Ou de voyage. On verra bien."'},{runeId:'cross',price:40,luluDesc:'"Rune de soin je crois... ou de croissants. Houh."'}];
  return `<h2>🦉 Runes Mystérieuses</h2><div class="shop-grid">${LULU_SHOP.map(lr=>{const rune=RUNES.find(r=>r.id===lr.runeId);const owned=player.knownRunes.has(lr.runeId);return `<div class="shop-item" onclick="buyRune('${lr.runeId}',${lr.price})"><h4 style="color:${rune?.color||'#a29bfe'}">${owned?rune.name:'Rune ???'}</h4><p style="color:#a29bfe;font-style:italic">${lr.luluDesc}</p><div class="price">${owned?'✓ Connue':`${lr.price}💰`}</div></div>`;}).join('')}</div>`;
}
window.buyRune=function(id,price){if(player.gold<price){notify('Pas assez d\'or !','#e74c3c');return;}if(player.knownRunes.has(id)){notify('Rune déjà connue.','#9b8ec4');return;}player.gold-=price;player.knownRunes.add(id);updateHUD();notify(`🦉 Rune apprise !`,'#a29bfe');openModal('shop-lulu',false);};
function renderInventory(){
  let h=`<h2>🎒 Inventaire</h2><p style="font-size:11px;color:#9b8ec4">Bâton : <span style="color:${sData().color}">${sData().name}</span></p>`;
  if(!player.inventory.length)h+=`<p>Aucun objet.</p>`;
  player.inventory.forEach((item,i)=>{h+=`<div class="inv-item"><div style="width:9px;height:9px;border-radius:50%;background:${item.color||'#555'};flex-shrink:0"></div><div style="flex:1"><div style="font-size:11px">${item.name}</div><div style="font-size:10px;color:#9b8ec4">${item.desc||''}</div></div><button class="btn" style="font-size:10px;padding:4px 9px" onclick="equipItem(${i})">Équiper</button><button class="btn btn-red" style="font-size:10px;padding:4px 9px" onclick="sellItem(${i})">Vendre ${Math.floor((item.price||20)*.5)}💰</button></div>`;});
  return h;
}
window.equipItem=function(i){const item=player.inventory[i];if(!item)return;if(item.itemType==='staff'&&SD[item.id])player.staff=item.id;player.inventory.splice(i,1);updateHUD();openModal('inventory',false);};
window.sellItem=function(i){player.gold+=Math.floor((player.inventory[i]?.price||20)*.5);player.inventory.splice(i,1);updateHUD();openModal('inventory',false);};
function renderSpellbook(){
  const known=RUNES.filter(r=>player.knownRunes.has(r.id)),unknown=RUNES.filter(r=>!player.knownRunes.has(r.id));
  let h=`<h2>📖 Manuel du Sorcier Elf</h2><p>Tracez des runes en phase d'attaque (ESPACE). Chaque rune a son son propre + voix de cast enregistrable.</p><div style="margin-top:10px">`;
  if(known.length){h+=`<div style="font-size:10px;color:#4a2a7a;letter-spacing:2px;margin-bottom:7px">— CONNUES (${known.length}) —</div>`;known.forEach(r=>{const hasCustom=!!customCastSounds[r.id];h+=`<div class="rune-entry"><div class="rune-preview" style="color:${r.color};border-color:${r.color}44;background:${r.color}11">${_ri(r.shape)}</div><div style="flex:1"><div style="font-size:12px;color:${r.color};font-weight:bold">${r.name}</div><div style="font-size:10px;color:#9b8ec4;margin-top:2px">${r.desc}</div><div class="rec-btn-wrap"><button id="recbtn-${r.id}" class="btn${hasCustom?' btn-green':''}" style="font-size:10px;padding:3px 9px" onclick="startRecording('${r.id}',this)">${hasCustom?'🔊 Re-enregistrer':'🎙 Enregistrer voix'}</button>${hasCustom?`<button class="btn btn-red" style="font-size:10px;padding:3px 9px" onclick="clearCustomSound('${r.id}')">✕</button>`:''}<button class="btn" style="font-size:10px;padding:3px 9px" onclick="previewRune('${r.id}')">▶</button></div></div></div>`;});}
  if(unknown.length){h+=`<div style="font-size:10px;color:#4a2a7a;letter-spacing:2px;margin:10px 0 7px">— INCONNUES (${unknown.length}) —</div>`;unknown.forEach(()=>{h+=`<div class="rune-entry" style="opacity:.25"><div class="rune-preview" style="color:#4a2a7a">?</div><div><div style="font-size:11px;color:#4a2a7a">Rune inconnue</div></div></div>`;});}
  return h+'</div>';
}
window.clearCustomSound=function(id){delete customCastSounds[id];openModal('spellbook',false);};
window.previewRune=function(id){SFX.runeSound(id);setTimeout(()=>playCastVoice(id,customCastSounds[id]),200);};
function _ri(s){return{circle:'○',square:'□',triangle:'△',v:'∨',zigzag:'〰',spiral:'🌀',cross:'✚',star:'★'}[s]||'?';}
function renderQuests(){
  const quests=[{name:'Cryptes Oubliées',desc:'3 ennemis · 1 boss · Facile',e:3,b:1,reward:40},{name:'Tour des Ombres',desc:'5 ennemis · 1 boss · Normale',e:5,b:1,reward:70},{name:"Abîme Éternel",desc:'7 ennemis · 2 boss · Difficile',e:7,b:2,reward:120}];
  return `<h2>📜 Quêtes</h2><p>Choisissez votre donjon. Les patterns d'attaque varient par ennemi.</p>${quests.map((q,i)=>`<div class="quest-card${selectedQuest===i?' selected':''}" onclick="selQ(${i})" id="qc${i}"><div style="font-size:12px;font-weight:bold;margin-bottom:4px">${q.name}</div><div style="font-size:11px;color:#9b8ec4">${q.desc} · Récompense ${q.reward}💰</div></div>`).join('')}<button class="btn btn-gold" style="width:100%;margin-top:5px" onclick="launchQuest()">▶ PARTIR</button>`;
}
window.selQ=function(i){selectedQuest=i;document.querySelectorAll('.quest-card').forEach((el,j)=>el.classList.toggle('selected',j===i));};
window.launchQuest=function(){
  if(selectedQuest===null){notify('Choisissez un donjon !','#e74c3c');return;}
  closeModal();
  const q=[{e:3,b:1,reward:40},{e:5,b:1,reward:70},{e:7,b:2,reward:120}][selectedQuest];
  const eList=[];for(let i=0;i<q.e;i++)eList.push({...rand(ENEMIES)});for(let i=0;i<q.b;i++)eList.push({...rand(BOSSES)});
  startCombat(eList,()=>{
    player.gold+=q.reward;player.level++;updateHUD();SFX.levelUp();
    document.getElementById('vic-msg').innerHTML=`Niveau <b style="color:#e8c97a">${player.level}</b> · +<b style="color:#f1c40f">${q.reward}💰</b>`;
    showScreen('victory');stopDungeonMusic();
  });
};
function renderTrainingModal(){return `<h2>🗡 Salle d'Entraînement</h2><p>30 secondes contre un mannequin pour découvrir de nouvelles runes.</p><div style="margin:10px 0;padding:9px;border:1px solid #4a2a7a22;font-size:11px;color:#9b8ec4">○ Cercle &nbsp;□ Carré &nbsp;△ Triangle &nbsp;∨ V &nbsp;〰 Zigzag &nbsp;✚ Croix &nbsp;★ Étoile &nbsp;🌀 Spirale</div><p style="color:#f1c40f;font-size:11px">Coût : 5💰 · Or : ${player.gold}💰</p><button class="btn btn-gold" style="width:100%" onclick="doStartTraining()">▶ Entrer</button>`;}
window.doStartTraining=function(){if(player.gold<5){notify('Pas assez d\'or !','#e74c3c');return;}player.gold-=5;updateHUD();closeModal();beginTraining();};

// ══════════════════════════ INPUT ═══════════════════════════
const mouse={x:W/2,y:H*.8,px:W/2,py:H*.8,down:false};
function pDown(x,y){
  mouse.down=true;mouse.px=mouse.x=x;mouse.py=mouse.y=y;
  if(combat.atkPhase||phase==='training')combat.curStroke=[{x,y}];
}
function pMove(x,y){
  const prevX=mouse.x,prevY=mouse.y;mouse.x=x;mouse.y=y;
  const spd=Math.hypot(x-mouse.px,y-mouse.py);if(spd<3)return;
  if((phase==='combat'||phase==='training')&&mouse.down){
    // Trail always follows mouse in combat zone (regardless of arc — trail is visual)
    addTrailPoint(x,y,prevX,prevY);
    if(combat.atkPhase||phase==='training'){
      if(combat.curStroke)combat.curStroke.push({x,y});
    } else if(phase==='combat'&&!combat.atkPhase){
      // Slice only if in arc
      if(isInArc(x,y)||isInArc(mouse.px,mouse.py))checkSlice(mouse.px,mouse.py,x,y);
    }
  }
  mouse.px=x;mouse.py=y;
}
function pUp(){
  mouse.down=false;
  if((combat.atkPhase||phase==='training')&&combat.curStroke&&combat.curStroke.length>4)combat.runeStrokes.push([...combat.curStroke]);
  combat.curStroke=null;
}
[cv,rc,ac2].forEach(el=>{
  el.addEventListener('mousedown',e=>{getAC();pDown(e.clientX,e.clientY);});
  el.addEventListener('mousemove',e=>pMove(e.clientX,e.clientY));
  el.addEventListener('mouseup',pUp);
  el.addEventListener('touchstart',e=>{e.preventDefault();getAC();const t=e.touches[0];pDown(t.clientX,t.clientY);},{passive:false});
  el.addEventListener('touchmove',e=>{e.preventDefault();const t=e.touches[0];pMove(t.clientX,t.clientY);},{passive:false});
  el.addEventListener('touchend',e=>{e.preventDefault();pUp();},{passive:false});
});
window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();if(phase==='combat'&&spaceReady&&!combat.atkPhase)beginAtkPhase();}});

// ══════════════════════════ NOTIFY ══════════════════════════
const notifStack=[];
function notify(msg,color='#e8c97a'){const el=document.createElement('div');const top=14+notifStack.filter(x=>document.body.contains(x)).length*24;el.style.cssText=`position:fixed;top:${top}px;right:12px;font-size:11px;color:${color};font-family:monospace;text-align:right;z-index:100;pointer-events:none;opacity:1;transition:opacity 1.5s;max-width:280px`;el.textContent=msg;document.body.appendChild(el);notifStack.push(el);setTimeout(()=>{el.style.opacity='0';setTimeout(()=>el.remove(),1600);},2000);}

// ══════════════════════════ NAV ═════════════════════════════
function goVillage(){
  hideAllScreens();phase='village';
  document.getElementById('village').style.display='block';
  document.getElementById('combat-ui').style.display='none';
  document.getElementById('rune-canvas').style.display='none';
  document.getElementById('hud-r').innerHTML=`<button class="btn btn-gold" onclick="openModal('quests')">📜 Quêtes</button><button class="btn" onclick="openModal('spellbook')">📖 Manuel</button>`;
  combat.atkPhase=false;combat.curEnemy=null;combat.win=false;statuses=[];trail=[];sparkParticles=[];
  player.hp=Math.min(maxHp(),player.hp+Math.round(maxHp()*.1));
  stopDungeonMusic();startVillageMusic();updateHUD();
}
window.goVillage=goVillage;

// ══════════════════════════ MENU ════════════════════════════
function showMenu(){
  document.getElementById('modal-overlay').style.display='flex';
  document.getElementById('modal-body').innerHTML=`
  <h2 style="text-align:center;letter-spacing:5px">✦ DUNGEON ELF ✦</h2>
  <p style="text-align:center;font-size:11px;margin-bottom:14px">Slicez · Tracez des runes · Explorez</p>
  ${Object.entries(SD).filter(([k])=>['twig','fire','ice'].includes(k)).map(([k,s])=>`<div class="shop-item" onclick="chooseStaff('${k}',this)" style="margin-bottom:7px;border-color:${s.color}44"><div style="font-size:11px;color:${s.color};font-weight:bold">${s.name}</div><div style="font-size:10px;color:#9b8ec4">${s.desc}</div></div>`).join('')}
  <button class="btn btn-gold" style="width:100%;margin-top:10px;font-size:13px;padding:10px" onclick="startGame()">▶ COMMENCER</button>`;
  document.querySelector('.close-btn').style.display='none';
}
window.chooseStaff=function(k,el){player.staff=k;document.querySelectorAll('#modal-body .shop-item').forEach(x=>x.style.background='transparent');el.style.background=SD[k].color+'22';};
window.startGame=function(){closeModal();goVillage();};

// ══════════════════════════ LOOP ════════════════════════════
let lastTs=0;
function loop(ts){
  const dt=Math.min((ts-lastTs)/1000,.05);lastTs=ts;
  if(phase==='village'){drawVillage(dt);actx.clearRect(0,0,W,H);}
  else if(phase==='combat'){updateCombat(dt);drawCombat();drawArc(dt);drawRuneCanvas();}
  else if(phase==='training'){updateTraining(dt);drawCombat();drawArc(dt);drawRuneCanvas();}
  requestAnimationFrame(loop);
}
showMenu();requestAnimationFrame(loop);
window.startRecording=startRecording;

window.showQuests = typeof showQuests !== 'undefined' ? showQuests : window.showQuests;
window.showInventory = typeof showInventory !== 'undefined' ? showInventory : window.showInventory;
window.showManual = typeof showManual !== 'undefined' ? showManual : window.showManual;
window.startBattle = typeof startBattle !== 'undefined' ? startBattle : window.startBattle;
window.showShop = typeof showShop !== 'undefined' ? showShop : window.showShop;
window.retryBattle = typeof retryBattle !== 'undefined' ? retryBattle : window.retryBattle;
window.returnVillage = typeof returnVillage !== 'undefined' ? returnVillage : window.returnVillage;
window.closeLoot = typeof closeLoot !== 'undefined' ? closeLoot : window.closeLoot;
window.toggleSound = typeof toggleSound !== 'undefined' ? toggleSound : window.toggleSound;

(function(){
  function on(sel, evt, fn){ document.querySelectorAll(sel).forEach(el => el.addEventListener(evt, fn)); }
  document.addEventListener('DOMContentLoaded', () => {
    const actionMap = {
      'quests': () => window.showQuests && window.showQuests(),
      'inventory': () => window.showInventory && window.showInventory(),
      'manual': () => window.showManual && window.showManual(),
      'training': () => window.startBattle && window.startBattle('training'),
      'shop-wands': () => window.showShop && window.showShop('wands'),
      'shop-hats': () => window.showShop && window.showShop('hats'),
      'shop-robes': () => window.showShop && window.showShop('robes'),
      'shop-owl': () => window.showShop && window.showShop('owl')
    };
    document.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', () => {
        const fn = actionMap[el.dataset.action];
        if (fn) fn();
      });
    });
    const retry = document.getElementById('retry-button');
    if (retry) retry.addEventListener('click', () => window.retryBattle && window.retryBattle());
    const village = document.getElementById('village-button');
    if (village) village.addEventListener('click', () => window.returnVillage && window.returnVillage());
    const cont = document.getElementById('loot-continue-button');
    if (cont) cont.addEventListener('click', () => window.closeLoot && window.closeLoot());
    const sound = document.getElementById('sound-toggle-button');
    if (sound) sound.addEventListener('click', () => window.toggleSound && window.toggleSound());
  });
})();
