(() => {
  'use strict';

  const MZ = {};
  window.MZ = MZ;

  MZ.VERSION = '1.3.3';
  MZ.CHANNEL = 'magnet-maze-v132';
  MZ.WS_PATH = '/ws';

  // Persistent client id (for lobby reconnection)
  MZ.getClientId = () => {
    try {
      let id = localStorage.getItem('mz_uid');
      if (!id) {
        id = 'u-' + Math.random().toString(16).slice(2);
        localStorage.setItem('mz_uid', id);
      }
      try { sessionStorage.setItem('mz_uid', id); } catch {}
      return id;
    } catch {
      return 'u-' + Math.random().toString(16).slice(2);
    }
  };

  // Messaging: WebSocket (LAN) first, then BroadcastChannel/localStorage fallback
  const listeners = new Set();
  MZ.onMessage = (fn) => listeners.add(fn);
  const emit = (msg) => { for (const fn of listeners) { try { fn(msg); } catch {} } };

  const wsUrl = () => {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}${MZ.WS_PATH}`;
  };

  MZ.ws = null;
  MZ.connect = () => {
    if (MZ.ws && (MZ.ws.readyState === WebSocket.OPEN || MZ.ws.readyState === WebSocket.CONNECTING)) return;
    try {
      MZ.ws = new WebSocket(wsUrl());
      MZ.ws.addEventListener('message', (ev) => { try { emit(JSON.parse(ev.data)); } catch {} });
    } catch { MZ.ws = null; }
  };

  MZ.bc = null;
  try { MZ.bc = new BroadcastChannel(MZ.CHANNEL); } catch { MZ.bc = null; }
  if (MZ.bc) MZ.bc.onmessage = (ev) => emit(ev.data);
  window.addEventListener('storage', (e) => {
    if (e.key !== MZ.CHANNEL || !e.newValue) return;
    try { emit(JSON.parse(e.newValue)); } catch {}
  });

  MZ.post = (msg) => {
    const payload = { ...msg, _ts: Date.now() };
    if (MZ.ws && MZ.ws.readyState === WebSocket.OPEN) {
      try { MZ.ws.send(JSON.stringify(payload)); return; } catch {}
    }
    if (MZ.bc) { try { MZ.bc.postMessage(payload); return; } catch {} }
    try { localStorage.setItem(MZ.CHANNEL, JSON.stringify(payload)); } catch {}
  };

  MZ.toast = (txt) => {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = txt;
    el.classList.remove('hidden');
    clearTimeout(MZ.toast._t);
    MZ.toast._t = setTimeout(() => el.classList.add('hidden'), 2800);
  };

  MZ.connect();

  MZ.clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  MZ.lerp = (a,b,t) => a + (b-a)*t;

  // Deterministic RNG (mulberry32)
  MZ.mulberry32 = (seed) => {
    let t = seed >>> 0;
    return () => {
      t += 0x6D2B79F5;
      let x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  };

  // FNV-1a string -> seed
  MZ.hashStringToSeed = (s) => {
    let h = 2166136261 >>> 0;
    for (let i=0;i<s.length;i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  MZ.normalizeText = (s) => (s || '').trim().replace(/\s+/g, ' ');

  // STEAM-ish pools
  MZ.WORDS = [
    "HORLOGERIE","ENGRENAGE","AÉTHER","DIRIGEABLE","CAPSULE TEMPORELLE",
    "CHRONOMÈTRE","LANTERNE À GAZ","BUREAU DES PARADOXES","PORTAIL",
    "CABINET D'ARTEFACTS","MÉCANISME","CUIVRE","LAITON","SERRURE",
    "COMPAS","ARCHIVES DU TEMPS","LOCOMOTIVE FANTÔME","CARTE DES ÉPOQUES",
    "AGENCE S.T.E.A.M.","SABLIER NOIR"
  ];
  MZ.PHRASES = [
    "L'AGENCE S.T.E.A.M. RECOUD LE TEMPS",
    "UN PARADOXE À VAPEUR S'EST ÉCHAPPÉ",
    "LE COMPAS CHRONIQUE POINTE VERS L'ORIGINE",
    "ENTRE CUIVRE ET BRUME, LA PORTE S'OUVRE",
    "LES ARCHIVES DU TEMPS NE MENTENT JAMAIS",
    "LA MACHINE MURMURE : RETOUR À L'ÉPOQUE",
    "UN ENGRENAGE FISSURÉ CHANTE LA ROUTE",
    "LA CAPSULE TEMPORELLE EXIGE UN FRAGMENT"
  ];
  MZ.DEVICES = [
    "La connerie, c’est la décontraction de l’intelligence.",
    "Plus on ferme, plus dehors reste dehors.",
    "Je sais que je chute — et j’avance quand même.",
    "La culture : ce qui fait de l’homme autre chose qu’un accident de l’univers.",
    "La réalité, c’est ce qui refuse de disparaître quand on cesse d’y croire."
  ];

  MZ.pick = (rng, arr) => arr[Math.floor(rng()*arr.length)];

  MZ.makeSegments = (text, mode, maxMazes) => {
    const t = MZ.normalizeText(text);
    const isPhrase = t.includes(' ');
    const chosenMode = mode === 'auto' ? (isPhrase ? 'phrase' : 'word') : mode;

    if (chosenMode === 'phrase') {
      const words = t.split(' ').filter(Boolean);
      if (words.length <= maxMazes) return words;
      const chunks = [];
      const per = Math.ceil(words.length / maxMazes);
      for (let i=0;i<words.length;i+=per) chunks.push(words.slice(i, i+per).join(' '));
      return chunks.slice(0, maxMazes);
    } else {
      const letters = [...t.replace(/ /g,'')];
      if (letters.length <= maxMazes) return letters;
      const chunks = [];
      const per = Math.ceil(letters.length / maxMazes);
      for (let i=0;i<letters.length;i+=per) chunks.push(letters.slice(i, i+per).join(''));
      return chunks.slice(0, maxMazes);
    }
  };

  // Drawing helpers
  MZ.drawBackground = (ctx, W, H, variant) => {
    ctx.save();
    ctx.fillStyle = '#060812';
    ctx.fillRect(0,0,W,H);

    const g = ctx.createRadialGradient(W*0.35, H*0.25, 20, W*0.5, H*0.5, Math.max(W,H)*0.7);
    if (variant==='B') { g.addColorStop(0,'rgba(176,124,255,0.10)'); g.addColorStop(0.55,'rgba(110,243,255,0.06)'); }
    else { g.addColorStop(0,'rgba(110,243,255,0.10)'); g.addColorStop(0.55,'rgba(176,124,255,0.06)'); }
    g.addColorStop(1,'rgba(0,0,0,0.00)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);
    ctx.restore();
  };

  MZ.drawObject = (ctx, obj) => {
    ctx.save();
    const og = ctx.createRadialGradient(obj.x-obj.r*0.2,obj.y-obj.r*0.2,obj.r*0.2,obj.x,obj.y,obj.r*1.2);
    og.addColorStop(0,'rgba(232,238,252,0.95)');
    og.addColorStop(1,'rgba(232,238,252,0.20)');
    ctx.fillStyle = og;
    ctx.beginPath(); ctx.arc(obj.x,obj.y,obj.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(110,243,255,0.25)';
    ctx.beginPath(); ctx.arc(obj.x,obj.y,Math.max(2,obj.r*0.45),0,Math.PI*2); ctx.fill();
    ctx.restore();
  };

  MZ.drawMagnet = (ctx, magnet, cellSize, pulseLook) => {
    ctx.save();
    const pulsing = !!pulseLook;
    const radius = pulsing ? cellSize*1.35 : cellSize*1.10;

    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = pulsing ? 'rgba(176,124,255,0.78)' : 'rgba(110,243,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(magnet.x,magnet.y,radius,0,Math.PI*2); ctx.stroke();

    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    for (let i=0;i<4;i++){
      ctx.beginPath(); ctx.arc(magnet.x,magnet.y,radius*(0.55+i*0.16),0,Math.PI*2); ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(232,238,252,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(magnet.x-10,magnet.y); ctx.lineTo(magnet.x+10,magnet.y);
    ctx.moveTo(magnet.x,magnet.y-10); ctx.lineTo(magnet.x,magnet.y+10);
    ctx.stroke();

    ctx.fillStyle = pulsing ? 'rgba(176,124,255,0.35)' : 'rgba(110,243,255,0.25)';
    ctx.beginPath(); ctx.arc(magnet.x,magnet.y,magnet.r,0,Math.PI*2); ctx.fill();
    ctx.restore();
  };

  MZ.drawMaze = (ctx, mazeData, showGrid=false, showExit=true) => {
    const { mazeX, mazeY, mazePxW, mazePxH, walls, rooms, exitZone, gateRects, mazeUnlocked, cellSize, GRID_W, GRID_H } = mazeData;
    ctx.save();
    ctx.translate(0.5,0.5);

    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(mazeX, mazeY, mazePxW, mazePxH);

    // rooms background
    for (const r of rooms || []) {
      const px = mazeX + r.x*cellSize;
      const py = mazeY + r.y*cellSize;
      ctx.fillStyle = 'rgba(232,238,252,0.045)';
      ctx.fillRect(px, py, r.w*cellSize, r.h*cellSize);
    }

    if (showGrid) {
      ctx.strokeStyle = 'rgba(232,238,252,0.06)';
      for (let x=0;x<=GRID_W;x++){
        const px = mazeX + x*cellSize;
        ctx.beginPath(); ctx.moveTo(px,mazeY); ctx.lineTo(px,mazeY+mazePxH); ctx.stroke();
      }
      for (let y=0;y<=GRID_H;y++){
        const py = mazeY + y*cellSize;
        ctx.beginPath(); ctx.moveTo(mazeX,py); ctx.lineTo(mazeX+mazePxW,py); ctx.stroke();
      }
    }

    ctx.fillStyle = 'rgba(232,238,252,0.16)';
    for (const w of walls || []) ctx.fillRect(w.x,w.y,w.w,w.h);

    if (showExit && exitZone) {
      if (!mazeUnlocked) {
        ctx.fillStyle = 'rgba(255,110,136,0.08)';
        ctx.fillRect(exitZone.x, exitZone.y, exitZone.w, exitZone.h);
        ctx.strokeStyle = 'rgba(255,110,136,0.55)';
        ctx.lineWidth = 2;
        ctx.strokeRect(exitZone.x+2, exitZone.y+2, exitZone.w-4, exitZone.h-4);

        ctx.fillStyle = 'rgba(255,110,136,0.35)';
        for (const g of gateRects || []) ctx.fillRect(g.x,g.y,g.w,g.h);

        ctx.fillStyle = 'rgba(255,110,136,0.85)';
        ctx.font = '900 11px ui-monospace, monospace';
        ctx.fillText('LOCK', exitZone.x+8, exitZone.y+16);
      } else {
        ctx.fillStyle = 'rgba(132,255,177,0.12)';
        ctx.fillRect(exitZone.x, exitZone.y, exitZone.w, exitZone.h);
        ctx.strokeStyle = 'rgba(132,255,177,0.55)';
        ctx.lineWidth = 2;
        ctx.strokeRect(exitZone.x+2, exitZone.y+2, exitZone.w-4, exitZone.h-4);
      }
    }

    ctx.restore();
  };

  MZ.drawNeonTextInRoom = (ctx, mazeData, revealFx) => {
    if (!revealFx || revealFx.t <= 0 || !revealFx.text || !revealFx.room) return;
    const { mazeX, mazeY, cellSize } = mazeData;
    const r = revealFx.room;
    const px = mazeX + (r.x + r.w/2)*cellSize;
    const py = mazeY + (r.y + r.h/2)*cellSize;

    ctx.save();
    const glow = Math.min(1, 0.3 + revealFx.t*0.25);
    ctx.font = `900 ${Math.max(22, Math.floor(cellSize*0.58))}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = 'rgba(110,243,255,0.65)';
    ctx.shadowBlur = 18*glow;
    ctx.fillStyle = 'rgba(110,243,255,0.25)';
    ctx.fillText(revealFx.text, px, py);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(232,238,252,0.85)';
    ctx.lineWidth = 3;
    ctx.strokeText(revealFx.text, px, py);

    ctx.fillStyle = 'rgba(232,238,252,0.85)';
    ctx.fillText(revealFx.text, px, py);
    ctx.restore();
  };

  // Compass widget (canvas overlay)
  // bearingRad: angle from magnet -> target (obj), 0=right, pi/2=down, etc.
  // strength01: 0 far, 1 close
  MZ.drawCompass = (ctx, x, y, r, bearingRad, strength01) => {
    ctx.save();
    ctx.translate(x, y);

    // ring
    ctx.strokeStyle = 'rgba(232,238,252,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke();

    // strength fill
    const rr = r - 5;
    ctx.strokeStyle = 'rgba(110,243,255,0.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0,0,rr, -Math.PI/2, -Math.PI/2 + Math.PI*2 * MZ.clamp(strength01,0,1));
    ctx.stroke();

    // arrow
    ctx.rotate(bearingRad);
    ctx.fillStyle = 'rgba(176,124,255,0.65)';
    ctx.beginPath();
    ctx.moveTo(r*0.85, 0);
    ctx.lineTo(r*0.25, -r*0.18);
    ctx.lineTo(r*0.25, r*0.18);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(232,238,252,0.60)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r*0.20,0);
    ctx.lineTo(r*0.15,0);
    ctx.stroke();

    ctx.restore();
  };
})();