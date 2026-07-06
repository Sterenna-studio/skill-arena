import { CHARACTERS } from './characters.js';

const FRAG_COLORS = {
  ricochet:'#aaddff', perforation:'#ff88aa', parasite:'#cc44ff',
  surcharge:'#ffdd00', replication:'#44ffaa', virus:'#88ff44', echo:'#00ffee'
};
const PASSIVE_LABELS = {
  drone:     { label: 'Drone',     desc: '10 kills',   color: '#4af' },
  armor:     { label: 'Armure',    desc: '+30 HP max', color: '#44ff88' },
  cooldown:  { label: 'Cadence',   desc: 'Tir rapide', color: '#ffdd00' },
  overdrive: { label: 'Overdrive', desc: '+vitesse',   color: '#ff6600' },
};
const CHAR_MEDAL = ['🥇','🥈','🥉','④','⑤'];
const CONTROLS = [
  { key: 'ZQSD / ←↑↑→', action: 'Se déplacer' },
  { key: 'Clic gauche', action: 'Tir auto vers la souris' },
  { key: 'Shift + dir.', action: 'Dash' },
  { key: 'Espace / Entrée', action: 'Valider / Continuer' },
];

export function drawUI(ctx, state) {
  if (state.phase === 'splash')      _drawSplash(ctx, state);
  if (state.phase === 'run' || state.phase === 'boss') _drawHUD(ctx, state);
  if (state.phase === 'door_choice') _drawDoorChoice(ctx, state);
  if (state.phase === 'death')       _drawDeath(ctx, state);
  if (state.phase === 'victory')     _drawVictory(ctx, state);
  if (state.phase === 'meta')        _drawMeta(ctx, state);
  // Fondu en cours
  if (state.phase === 'fading' && state._fadeAlpha > 0) {
    ctx.fillStyle = `rgba(0,0,0,${state._fadeAlpha})`;
    ctx.fillRect(0, 0, 640, 640);
  }
}

// ── SPLASH ─────────────────────────────────────────────────────
function _drawSplash(ctx, state) {
  // Fond étoileé
  ctx.fillStyle = '#080c18';
  ctx.fillRect(0, 0, 640, 640);
  _drawStars(ctx);

  // Titre
  ctx.textAlign = 'center';
  ctx.shadowColor = '#4a9eff'; ctx.shadowBlur = 32;
  ctx.fillStyle = '#4a9eff';
  ctx.font = 'bold 44px monospace';
  ctx.fillText('BZH', 320, 110);
  ctx.shadowColor = '#ff4a4a'; ctx.shadowBlur = 24;
  ctx.fillStyle = '#ff4a4a';
  ctx.font = 'bold 28px monospace';
  ctx.fillText('BREACH STORM', 320, 152);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#445566'; ctx.font = '11px monospace';
  ctx.fillText('Un rôguelite de brouillard et de balles', 320, 180);

  // Séparateur
  ctx.strokeStyle = '#1a2a4a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(100, 200); ctx.lineTo(540, 200); ctx.stroke();

  // Contrôles
  ctx.fillStyle = '#6688aa'; ctx.font = 'bold 11px monospace';
  ctx.fillText('CONTRÔLES', 320, 228);
  CONTROLS.forEach((c, i) => {
    const y = 252 + i * 24;
    ctx.fillStyle = '#4af'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'right';
    ctx.fillText(c.key, 310, y);
    ctx.fillStyle = '#8899aa'; ctx.font = '12px monospace'; ctx.textAlign = 'left';
    ctx.fillText(c.action, 322, y);
  });

  // Bouton START
  const t = Date.now() / 1000;
  const bx = 220, by = 340, bw = 200, bh = 56;
  const pulse = 0.85 + 0.15 * Math.sin(t * 2.5);
  ctx.textAlign = 'center';
  ctx.shadowColor = `rgba(74,158,255,${pulse})`;
  ctx.shadowBlur = 20 * pulse;
  ctx.strokeStyle = `rgba(74,158,255,${0.5 + 0.5 * pulse})`;
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(10,25,55,0.95)';
  _roundRect(ctx, bx, by, bw, bh, 8);
  ctx.fillStyle = '#4a9eff'; ctx.font = 'bold 18px monospace';
  ctx.shadowBlur = 0;
  ctx.fillText('[ JOUER ]', 320, 376);

  // Version / crédits
  ctx.fillStyle = '#2a3a4a'; ctx.font = '10px monospace';
  ctx.fillText('v0.1  —  MutenRock  —  2026', 320, 610);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
}

let _stars = null;
function _drawStars(ctx) {
  if (!_stars) {
    _stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * 640, y: Math.random() * 640,
      r: 0.5 + Math.random() * 1.5,
      a: 0.3 + Math.random() * 0.7,
      s: 0.5 + Math.random() * 2,
    }));
  }
  const t = Date.now() / 1000;
  for (const s of _stars) {
    ctx.globalAlpha = s.a * (0.7 + 0.3 * Math.sin(t * s.s + s.x));
    ctx.fillStyle = '#c8d8ff';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── HUD (pendant une run) ─────────────────────────────────────────
function _drawHUD(ctx, state) {
  const pl = state.player;
  if (!pl) return;
  const charColor = state._character ? state._character.color : '#aabbcc';
  ctx.fillStyle = charColor; ctx.font = '14px monospace';
  ctx.fillText(`Score : ${state.run.score}`, 30, 18);
  ctx.fillStyle = '#aabbcc';
  ctx.fillText(`Secteur ${state.run.sector} — Salle ${state.run.room}`, 30, 36);
  if (state._roomMod) {
    const modColors = { calm:'#44ffaa', fog:'#aaddff', surge:'#ff6644', cursed:'#cc44ff', fast:'#ff8c00', elite:'#ffdd00' };
    ctx.fillStyle = modColors[state._roomMod] || '#fff'; ctx.font = '11px monospace';
    ctx.fillText(`[ ${state._roomMod.toUpperCase()} ]`, 30, 54);
  }
  let fx = 30;
  for (const fid of state.fragments) {
    ctx.fillStyle = FRAG_COLORS[fid] || '#fff';
    ctx.shadowColor = FRAG_COLORS[fid] || '#fff'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(fx, 620, 7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#ccc'; ctx.font = '9px monospace';
    ctx.fillText(fid.slice(0,4), fx - 10, 635); fx += 60;
  }
  ctx.fillStyle = '#ff6644'; ctx.shadowBlur = 0; ctx.font = '13px monospace';
  ctx.fillText(`Ennemis : ${state.enemies.length}`, 500, 18);
}

// ── CHOIX DE PORTE ───────────────────────────────────────────────
function _drawDoorChoice(ctx, state) {
  ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, 640, 640);
  ctx.fillStyle = '#c8d8ff'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
  ctx.fillText('— CHOISIS UNE PORTE —', 320, 120);
  (state._pendingDoors || []).forEach((door, i) => {
    const cx = 160 + i * 320, y = 260, w = 240, h = 180;
    const mx = state.input.mouse.x, my = state.input.mouse.y;
    const hover = mx > cx-w/2 && mx < cx+w/2 && my > y-20 && my < y+h;
    ctx.strokeStyle = hover ? '#4af' : '#2a3a5a'; ctx.lineWidth = hover ? 2 : 1;
    ctx.fillStyle = hover ? 'rgba(20,40,80,0.9)' : 'rgba(10,20,40,0.9)';
    _roundRect(ctx, cx-w/2, y-20, w, h, 8);
    ctx.fillStyle = door.color || '#4af'; ctx.font = 'bold 15px monospace';
    ctx.fillText(door.label, cx, y + 20);
    ctx.fillStyle = '#8899aa'; ctx.font = '12px monospace';
    let line = '', ly = y + 50;
    for (const wd of door.desc.split(' ')) {
      const test = line + wd + ' ';
      if (ctx.measureText(test).width > 200 && line) { ctx.fillText(line.trim(), cx, ly); ly += 18; line = wd + ' '; } else line = test;
    }
    if (line) ctx.fillText(line.trim(), cx, ly);
  });
  ctx.textAlign = 'left';
}

// ── ÉCRAN DE MORT ─────────────────────────────────────────────────
function _drawDeath(ctx, state) {
  ctx.fillStyle = 'rgba(0,0,0,0.92)'; ctx.fillRect(0, 0, 640, 640);
  ctx.textAlign = 'center';

  // Croix animée
  const t = Date.now() / 1000;
  ctx.save();
  ctx.translate(320, 160);
  ctx.rotate(Math.sin(t * 0.8) * 0.06);
  ctx.shadowColor = '#ff2222'; ctx.shadowBlur = 40;
  ctx.fillStyle = '#ff2222'; ctx.font = 'bold 72px monospace';
  ctx.fillText('✗', 0, 0);
  ctx.restore(); ctx.shadowBlur = 0;

  ctx.fillStyle = '#ff4444'; ctx.font = 'bold 28px monospace';
  ctx.fillText('BRÈCHE PERDUE', 320, 230);

  ctx.fillStyle = '#556677'; ctx.font = '13px monospace';
  ctx.fillText('Tu as été éliminé(e) au', 320, 268);
  ctx.fillStyle = '#8899aa'; ctx.font = '15px monospace';
  ctx.fillText(`Secteur ${state.run.sector} — Salle ${state.run.room}`, 320, 292);

  ctx.fillStyle = '#c8d8ff'; ctx.font = '18px monospace';
  ctx.fillText(`Score final : ${state.run.score}`, 320, 336);

  if (state._meta && state._meta.highScore > 0) {
    const isNew = state.run.score > state._meta.highScore;
    ctx.fillStyle = isNew ? '#ffdd00' : '#445566'; ctx.font = '13px monospace';
    ctx.fillText(isNew ? `✨ NOUVEAU RECORD !` : `Record : ${state._meta.highScore}`, 320, 364);
  }

  ctx.fillStyle = '#334455'; ctx.font = '13px monospace';
  ctx.fillText('Fragments collectés : ' + (state.fragments.join(' · ') || '—'), 320, 400);

  // Clignotement sur le bouton
  const alpha = 0.6 + 0.4 * Math.sin(t * 3);
  ctx.fillStyle = `rgba(74,158,255,${alpha})`; ctx.font = '15px monospace';
  ctx.fillText('[ ESPACE ] Retour aux stats', 320, 468);
  ctx.textAlign = 'left';
}

// ── ÉCRAN DE VICTOIRE ──────────────────────────────────────────────
function _drawVictory(ctx, state) {
  ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(0, 0, 640, 640);
  ctx.textAlign = 'center';

  const t = Date.now() / 1000;
  // Particules de victoire (simulées en canvas)
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + t;
    const r = 60 + 10 * Math.sin(t * 2 + i);
    const cx = 320 + Math.cos(angle) * r;
    const cy = 150 + Math.sin(angle) * r * 0.4;
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3 + i);
    ctx.fillStyle = ['#44ffaa','#4a9eff','#ffdd00'][i % 3];
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.shadowColor = '#44ffaa'; ctx.shadowBlur = 30;
  ctx.fillStyle = '#44ffaa'; ctx.font = 'bold 60px monospace';
  ctx.fillText('✓', 320, 175);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#44ffaa'; ctx.font = 'bold 24px monospace';
  ctx.fillText('SECTEUR DÉGAGÉ', 320, 230);

  ctx.fillStyle = '#8899aa'; ctx.font = '13px monospace';
  ctx.fillText(`Boss terminé — Secteur ${state.run.sector}`, 320, 264);

  ctx.fillStyle = '#c8d8ff'; ctx.font = '20px monospace';
  ctx.fillText(`Score : ${state.run.score}`, 320, 310);

  if (state._meta && state.run.score > (state._meta.highScore || 0)) {
    ctx.fillStyle = '#ffdd00'; ctx.font = 'bold 14px monospace';
    ctx.fillText('✨ NOUVEAU RECORD !', 320, 342);
  }

  ctx.fillStyle = '#667788'; ctx.font = '13px monospace';
  ctx.fillText('Fragments : ' + (state.fragments.join(' · ') || '—'), 320, 380);

  const alpha = 0.6 + 0.4 * Math.sin(t * 2.5);
  ctx.fillStyle = `rgba(74,255,170,${alpha})`; ctx.font = '15px monospace';
  ctx.fillText('[ ESPACE ] Retour aux stats', 320, 460);
  ctx.textAlign = 'left';
}

// ── ÉCRAN MÉTA ─────────────────────────────────────────────────────
function _drawMeta(ctx, state) {
  ctx.fillStyle = 'rgba(5,8,20,0.97)'; ctx.fillRect(0, 0, 640, 640);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4a9eff'; ctx.font = 'bold 20px monospace';
  ctx.fillText('BZH BREACH STORM', 320, 44);
  ctx.fillStyle = '#c8d8ff'; ctx.font = '12px monospace';
  const meta = state._meta || {};
  ctx.fillText(`Runs : ${meta.runs||0}   Kills : ${meta.totalKills||0}   Best : ${meta.highScore||0}`, 320, 68);

  // Persos
  ctx.fillStyle = '#6688aa'; ctx.font = '11px monospace';
  ctx.fillText('PERSONNAGE', 320, 94);
  const selChar = meta.selectedChar || 'striker';
  CHARACTERS.forEach((c, i) => {
    const bx = 80 + i * 160, by = 102, bw = 140, bh = 76;
    const selected = c.id === selChar;
    const mx = state.input.mouse.x, my = state.input.mouse.y;
    const hover = mx > bx && mx < bx+bw && my > by && my < by+bh;
    ctx.strokeStyle = selected ? c.color : (hover ? '#4af' : '#2a3a5a'); ctx.lineWidth = selected ? 2 : 1;
    ctx.fillStyle = selected ? 'rgba(20,40,80,0.95)' : (hover ? 'rgba(15,30,60,0.9)' : 'rgba(10,18,35,0.9)');
    _roundRect(ctx, bx, by, bw, bh, 6);
    ctx.fillStyle = c.color; ctx.font = 'bold 13px monospace';
    ctx.fillText(`${c.badge} ${c.label}`, bx+bw/2, by+22);
    ctx.fillStyle = '#8899aa'; ctx.font = '9px monospace';
    let line = '', ly = by+40;
    for (const wd of c.desc.split(' ')) {
      const test = line+wd+' ';
      if (ctx.measureText(test).width > 120 && line) { ctx.fillText(line.trim(), bx+bw/2, ly); ly+=14; line=wd+' '; } else line=test;
    }
    if (line) ctx.fillText(line.trim(), bx+bw/2, ly);
  });

  // Passifs
  ctx.fillStyle = '#6688aa'; ctx.font = '11px monospace'; ctx.fillText('PASSIFS', 320, 202);
  const all = ['drone','armor','cooldown','overdrive'];
  const unlocked = meta.unlockedPassives || [];
  all.forEach((id, i) => {
    const p = PASSIVE_LABELS[id];
    const isU = unlocked.includes(id);
    const bx = 80 + i*120, by = 210;
    ctx.strokeStyle = isU ? p.color : '#2a2a3a'; ctx.lineWidth = isU ? 2 : 1;
    ctx.fillStyle = isU ? 'rgba(20,40,80,0.9)' : 'rgba(12,12,20,0.9)';
    _roundRect(ctx, bx, by, 100, 52, 5);
    ctx.fillStyle = isU ? p.color : '#3a4a5a'; ctx.font = 'bold 11px monospace';
    ctx.fillText(p.label, bx+50, by+20);
    ctx.fillStyle = isU ? '#c8d8ff' : '#3a4a5a'; ctx.font = '9px monospace';
    ctx.fillText(p.desc, bx+50, by+38);
  });

  // Leaderboard
  ctx.fillStyle = '#6688aa'; ctx.font = '11px monospace'; ctx.fillText('TOP RUNS', 320, 286);
  const lb = meta.leaderboard || [];
  if (!lb.length) {
    ctx.fillStyle = '#445566'; ctx.font = '11px monospace'; ctx.fillText('Aucune run enregistrée.', 320, 314);
  } else {
    lb.forEach((e, i) => {
      const y = 306 + i*26;
      const medal = CHAR_MEDAL[i] || `${i+1}.`;
      const charDef = CHARACTERS.find(c => c.id === e.char) || CHARACTERS[0];
      ctx.fillStyle = i===0 ? 'rgba(40,30,10,0.8)' : 'rgba(15,20,35,0.6)';
      ctx.fillRect(100, y-14, 440, 22);
      ctx.fillStyle = i===0 ? '#ffdd00' : '#8899aa';
      ctx.font = (i===0?'bold ':'')+`12px monospace`; ctx.textAlign='left';
      ctx.fillText(`${medal}`, 108, y+2);
      ctx.fillStyle = charDef.color; ctx.fillText(`${charDef.badge}${charDef.label}`, 140, y+2);
      ctx.fillStyle = i===0?'#ffdd00':'#c8d8ff'; ctx.fillText(`${e.score} pts`, 260, y+2);
      ctx.fillStyle = '#667788'; ctx.font='10px monospace'; ctx.fillText(`S${e.sector}  ·  ${e.kills}k`, 360, y+2);
      ctx.textAlign='center';
    });
  }

  // Nouveaux passifs
  if (meta._newPassives && meta._newPassives.length > 0) {
    ctx.fillStyle = '#ffdd00'; ctx.font = 'bold 12px monospace';
    ctx.fillText('✨ Débloqué : ' + meta._newPassives.join(', '), 320, 450);
  }

  const t2 = Date.now()/1000;
  const a2 = 0.6 + 0.4*Math.sin(t2*2.5);
  ctx.fillStyle=`rgba(74,158,255,${a2})`; ctx.font='14px monospace';
  ctx.fillText('[ ESPACE ] Lancer la run', 320, 480);
  ctx.fillStyle='#2a3a4a'; ctx.font='10px monospace';
  ctx.fillText('[ Echap ] Retour au titre', 320, 504);
  ctx.textAlign='left';
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
  ctx.fill(); ctx.stroke();
}
