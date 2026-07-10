(() => {
  'use strict';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const randInt = (a, b) => (a + Math.floor(Math.random() * (b - a + 1)));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const normalizeText = (s) => (s || '').trim().replace(/\s+/g, ' ');

  const canvasA = document.getElementById('canvasA');
  const canvasB = document.getElementById('canvasB');
  const ctxA = canvasA.getContext('2d');
  const ctxB = canvasB.getContext('2d');

  const newLevelBtn = document.getElementById('newLevelBtn');
  const resetBtn = document.getElementById('resetBtn');
  const hardMode = document.getElementById('hardMode');
  const showGrid = document.getElementById('showGrid');

  const progressA = document.getElementById('progressA');
  const progressB = document.getElementById('progressB');
  const pulseInfo = document.getElementById('pulseInfo');

  const adminBtn = document.getElementById('adminBtn');
  const adminOverlay = document.getElementById('adminOverlay');
  const adminTarget = document.getElementById('adminTarget');
  const adminMode = document.getElementById('adminMode');
  const adminMaxMazes = document.getElementById('adminMaxMazes');
  const adminPulseCD = document.getElementById('adminPulseCD');
  const adminApplyBtn = document.getElementById('adminApplyBtn');
  const adminCloseBtn = document.getElementById('adminCloseBtn');

  const endOverlay = document.getElementById('endOverlay');
  const endTitle = document.getElementById('endTitle');
  const endSubtitle = document.getElementById('endSubtitle');
  const nextMazeBtn = document.getElementById('nextMazeBtn');
  const closeEndBtn = document.getElementById('closeEndBtn');

  const revealToast = document.getElementById('revealToast');

  const WORDS = [
    "HORLOGERIE", "GIRAFE À VAPEUR", "ENGRENAGE", "AETHER", "AÉTHEROMANCIE",
    "DIRIGEABLE", "CAPSULE TEMPORELLE", "CHRONOMÈTRE", "LANTERNE À GAZ",
    "BUREAU DES PARADOXES", "PORTAIL", "CABINET D'ARTEFACTS", "MÉCANISME",
    "CUIVRE", "LAITON", "SERRURE", "COMPAS", "TRISKÈLE MÉCANIQUE",
    "ATELIER DES AGENTS", "ARCHIVES DU TEMPS", "BILLE D'ORICHALQUE",
    "LOCOMOTIVE FANTÔME", "CARTE DES ÉPOQUES", "AGENCE S.T.E.A.M.",
    "VOYAGEUR CHRONIQUE", "CHRONIQUEUR", "INVERSION", "SABLIER NOIR"
  ];

  const PHRASES = [
    "L'AGENCE S.T.E.A.M. RECOUD LE TEMPS",
    "UN PARADOXE À VAPEUR S'EST ÉCHAPPÉ",
    "LE COMPAS CHRONIQUE POINTE VERS L'ORIGINE",
    "ENTRE CUIVRE ET BRUME, LA PORTE S'OUVRE",
    "LES ARCHIVES DU TEMPS NE MENTENT JAMAIS",
    "LA MACHINE MURMURE : RETOUR À L'ÉPOQUE",
    "UN ENGRENAGE FISSURÉ CHANTE LA ROUTE",
    "LA CAPSULE TEMPORELLE EXIGE UN FRAGMENT"
  ];

  const DEVICES = [
    "La connerie, c’est la décontraction de l’intelligence.",
    "Plus on ferme, plus dehors reste dehors.",
    "Je crée pour détruire / je détruis pour créer.",
    "Je sais que je chute — et j’avance quand même.",
    "La culture : ce qui fait de l’homme autre chose qu’un accident de l’univers.",
    "La réalité, c’est ce qui refuse de disparaître quand on cesse d’y croire."
  ];

  const GRID_W = 18, GRID_H = 12;
  const W = canvasA.width, H = canvasA.height;
  const PAD = 28;
  const cellSize = Math.floor(Math.min((W - PAD * 2) / GRID_W, (H - PAD * 2) / GRID_H));
  const mazePxW = cellSize * GRID_W;
  const mazePxH = cellSize * GRID_H;
  const mazeX = Math.floor((W - mazePxW) / 2);
  const mazeY = Math.floor((H - mazePxH) / 2);
  const wallThickness = Math.max(6, Math.floor(cellSize * 0.18));

  const obj = { x: 0, y: 0, vx: 0, vy: 0, r: Math.max(8, Math.floor(cellSize * 0.22)) };
  const magnet = {
    x: 0, y: 0, vx: 0, vy: 0,
    r: Math.max(10, Math.floor(cellSize * 0.18)),
    strength: 95000,
    pulseDuration: 0.35,
    pulseTimer: 0,
    pulseCooldown: 10.0,
    cooldownTimer: 0
  };

  const exitZone = { x: mazeX + mazePxW - cellSize, y: mazeY + mazePxH - cellSize, w: cellSize, h: cellSize };

  let won = false;
  let mazeUnlocked = false;
  let revealFx = { t: 0, text: "", room: null };

  let maze = null;
  let walls = [];
  let rooms = [];
  let gateRects = [];

  let pulseCount = 0;
  let pulseVisibleToA = false;

  const level = { targetText: "", segments: [], idx: 0, discovered: [], maxMazes: 5, mode: "auto" };

  function makeSegments(text, mode, maxMazes) {
    const t = normalizeText(text);
    const isPhrase = t.includes(' ');
    const chosenMode = mode === 'auto' ? (isPhrase ? 'phrase' : 'word') : mode;

    if (chosenMode === 'phrase') {
      const words = t.split(' ').filter(Boolean);
      if (words.length <= maxMazes) return words;
      const chunks = [];
      const per = Math.ceil(words.length / maxMazes);
      for (let i = 0; i < words.length; i += per) chunks.push(words.slice(i, i + per).join(' '));
      return chunks.slice(0, maxMazes);
    } else {
      const letters = [...t.replace(/ /g, '')];
      if (letters.length <= maxMazes) return letters;
      const chunks = [];
      const per = Math.ceil(letters.length / maxMazes);
      for (let i = 0; i < letters.length; i += per) chunks.push(letters.slice(i, i + per).join(''));
      return chunks.slice(0, maxMazes);
    }
  }

  function currentSegment() { return level.segments[level.idx] || ""; }

  function updateProgressUI(extra = "") {
    const parts = level.segments.map((seg, i) => level.discovered[i] ? seg : "▢".repeat(Math.max(1, seg.length)));
    const prog = parts.join("  ");
    const head = `Laby ${level.idx + 1}/${level.segments.length}  •  `;
    progressA.textContent = head + prog + (extra ? ("  •  " + extra) : "");
    progressB.textContent = head + prog;
  }

  function startNewLevel(customText = "", mode = "auto", maxMazes = 5) {
    level.mode = mode;
    level.maxMazes = maxMazes;

    const poolText =
      customText && customText.trim()
        ? customText.trim()
        : (Math.random() < 0.45 ? pick(WORDS) : pick(PHRASES));

    level.targetText = normalizeText(poolText);
    level.segments = makeSegments(level.targetText, mode, maxMazes);
    level.idx = 0;
    level.discovered = level.segments.map(() => false);

    newMazeForCurrentSegment();
    updateProgressUI();
  }

  function makeMaze(w, h) {
    const cells = Array.from({ length: h }, () =>
      Array.from({ length: w }, () => ({ v:false, top:true, right:true, bottom:true, left:true }))
    );
    const stack = [{x:0,y:0}];
    cells[0][0].v = true;

    const dirs = [
      { dx:0, dy:-1, a:'top', b:'bottom' },
      { dx:1, dy:0, a:'right', b:'left' },
      { dx:0, dy:1, a:'bottom', b:'top' },
      { dx:-1, dy:0, a:'left', b:'right' },
    ];

    while (stack.length) {
      const cur = stack[stack.length-1];
      const opts = [];
      for (const d of dirs) {
        const nx = cur.x + d.dx, ny = cur.y + d.dy;
        if (nx<0||nx>=w||ny<0||ny>=h) continue;
        if (!cells[ny][nx].v) opts.push({nx,ny,d});
      }
      if (!opts.length) { stack.pop(); continue; }
      const p = opts[Math.floor(Math.random()*opts.length)];
      cells[cur.y][cur.x][p.d.a] = false;
      cells[p.ny][p.nx][p.d.b] = false;
      cells[p.ny][p.nx].v = true;
      stack.push({x:p.nx,y:p.ny});
    }

    cells[0][0].left = false;
    cells[h-1][w-1].right = false;
    return cells;
  }

  function carveRooms(cells, count) {
    rooms = [];
    for (let i=0;i<count;i++){
      const rw = randInt(2,4), rh = randInt(2,4);
      const rx = randInt(1, GRID_W - rw - 1);
      const ry = randInt(1, GRID_H - rh - 1);

      for (let y=ry;y<ry+rh;y++){
        for (let x=rx;x<rx+rw;x++){
          const c = cells[y][x];
          if (y>ry) c.top = false;
          if (y<ry+rh-1) c.bottom = false;
          if (x>rx) c.left = false;
          if (x<rx+rw-1) c.right = false;
        }
      }

      for (let d=0; d<randInt(1,2); d++){
        const side = randInt(0,3);
        let x=rx, y=ry;
        if (side===0){ x=randInt(rx,rx+rw-1); y=ry; cells[y][x].top=false; if (y-1>=0) cells[y-1][x].bottom=false; }
        else if (side===1){ x=rx+rw-1; y=randInt(ry,ry+rh-1); cells[y][x].right=false; if (x+1<GRID_W) cells[y][x+1].left=false; }
        else if (side===2){ x=randInt(rx,rx+rw-1); y=ry+rh-1; cells[y][x].bottom=false; if (y+1<GRID_H) cells[y+1][x].top=false; }
        else { x=rx; y=randInt(ry,ry+rh-1); cells[y][x].left=false; if (x-1>=0) cells[y][x-1].right=false; }
      }

      rooms.push({ x:rx, y:ry, w:rw, h:rh });
    }
  }

  function rectIntersects(a,b){ return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }

  function rebuildGate() {
    gateRects = [];
    if (mazeUnlocked) return;
    gateRects.push({
      x: exitZone.x + exitZone.w*0.25,
      y: exitZone.y + exitZone.h*0.25,
      w: exitZone.w*0.5,
      h: exitZone.h*0.5
    });
  }

  function rebuildWalls() {
    walls = [];
    for (let y=0;y<GRID_H;y++){
      for (let x=0;x<GRID_W;x++){
        const c = maze[y][x];
        const px = mazeX + x*cellSize;
        const py = mazeY + y*cellSize;
        if (c.top) walls.push({ x:px, y:py-wallThickness/2, w:cellSize, h:wallThickness });
        if (c.left) walls.push({ x:px-wallThickness/2, y:py, w:wallThickness, h:cellSize });
        if (c.bottom) walls.push({ x:px, y:py+cellSize-wallThickness/2, w:cellSize, h:wallThickness });
        if (c.right) walls.push({ x:px+cellSize-wallThickness/2, y:py, w:wallThickness, h:cellSize });
      }
    }

    const ox=mazeX, oy=mazeY;
    walls.push({ x:ox-wallThickness, y:oy-wallThickness, w:mazePxW+wallThickness*2, h:wallThickness });
    walls.push({ x:ox-wallThickness, y:oy+mazePxH, w:mazePxW+wallThickness*2, h:wallThickness });
    walls.push({ x:ox-wallThickness, y:oy-wallThickness, w:wallThickness, h:mazePxH+wallThickness*2 });
    walls.push({ x:ox+mazePxW, y:oy-wallThickness, w:wallThickness, h:mazePxH+wallThickness*2 });

    const ent = { x: mazeX - wallThickness, y: mazeY + cellSize*0.25, w: wallThickness, h: cellSize*0.5 };
    const ext = { x: mazeX + mazePxW, y: mazeY + mazePxH - cellSize*0.75, w: wallThickness, h: cellSize*0.5 };
    walls = walls.filter(r => !rectIntersects(r, ent) && !rectIntersects(r, ext));

    rebuildGate();
  }

  function resetPositions() {
    obj.x = mazeX + cellSize*0.5; obj.y = mazeY + cellSize*0.5; obj.vx=0; obj.vy=0;
    magnet.x = mazeX + cellSize*1.5; magnet.y = mazeY + cellSize*1.5; magnet.vx=0; magnet.vy=0;
    won = false;
    revealFx = { t:0, text:"", room:null };
    hideEndOverlay();
  }

  function newMazeForCurrentSegment() {
    mazeUnlocked = false;
    maze = makeMaze(GRID_W, GRID_H);
    carveRooms(maze, randInt(2,4));
    rebuildWalls();
    resetPositions();
    updateProgressUI(`Fragment à révéler : ${"▢".repeat(Math.max(1, currentSegment().length))}`);
    updatePulseUI();
  }

  function circleRectResolve(cx, cy, r, rect) {
    const px = clamp(cx, rect.x, rect.x + rect.w);
    const py = clamp(cy, rect.y, rect.y + rect.h);
    const dx = cx - px, dy = cy - py;
    const d2 = dx*dx + dy*dy;
    if (d2 >= r*r) return null;
    const d = Math.sqrt(d2) || 0.00001;
    return { nx: dx/d, ny: dy/d, penetration: r - d };
  }

  function isPointInRoomCell(px, py) {
    const cx = Math.floor((px - mazeX) / cellSize);
    const cy = Math.floor((py - mazeY) / cellSize);
    for (const r of rooms) {
      if (cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h) return r;
    }
    return null;
  }

  let mouseActive = false;
  let mouseTarget = { x: 0, y: 0 };

  function canvasPosFromEvent(canvas, evt) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - r.left) * (canvas.width / r.width),
      y: (evt.clientY - r.top) * (canvas.height / r.height),
    };
  }

  canvasB.addEventListener('pointerdown', (e) => {
    canvasB.setPointerCapture(e.pointerId);
    mouseActive = true;
    mouseTarget = canvasPosFromEvent(canvasB, e);
  });
  canvasB.addEventListener('pointermove', (e) => {
    if (!mouseActive) return;
    mouseTarget = canvasPosFromEvent(canvasB, e);
  });
  canvasB.addEventListener('pointerup', () => { mouseActive = false; });

  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D',' '].includes(e.key)) e.preventDefault();
    keys.add(e.key);
    if (e.key === ' ') tryPulse();
  }, { passive:false });
  window.addEventListener('keyup', (e) => keys.delete(e.key));

  function showToast(txt) {
    revealToast.textContent = txt;
    revealToast.classList.remove('hidden');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => revealToast.classList.add('hidden'), 2800);
  }

  function tryPulse() {
    if (magnet.cooldownTimer > 0) return;

    pulseCount += 1;
    pulseVisibleToA = (pulseCount % 5 === 0);

    magnet.pulseTimer = magnet.pulseDuration;
    magnet.cooldownTimer = magnet.pulseCooldown;

    const room = isPointInRoomCell(obj.x, obj.y);
    if (room && !mazeUnlocked) revealCurrentFragment(room);

    if (pulseVisibleToA) showToast("PULSE BRUYANT (visible par A)");
  }

  function revealCurrentFragment(room) {
    mazeUnlocked = true;
    rebuildGate();

    const frag = currentSegment();
    level.discovered[level.idx] = true;
    revealFx = { t: 2.6, text: frag, room };

    showToast(`FRAGMENT RÉVÉLÉ : ${frag} — ${pick(DEVICES)}`);
    updateProgressUI();
  }

  function updatePulseUI() {
    const ready = magnet.cooldownTimer <= 0;
    pulseInfo.textContent = ready
      ? `PRÊT — Espace pour pulser (CD=${Math.round(magnet.pulseCooldown)}s)`
      : `RECHARGE : ${Math.ceil(magnet.cooldownTimer)}s`;
  }

  function step(dt) {
    if (won) return;

    if (magnet.cooldownTimer > 0) magnet.cooldownTimer = Math.max(0, magnet.cooldownTimer - dt);
    if (magnet.pulseTimer > 0) magnet.pulseTimer = Math.max(0, magnet.pulseTimer - dt);

    const speed = 900;
    let ax=0, ay=0;
    if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) ay -= 1;
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) ay += 1;
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) ax -= 1;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) ax += 1;
    const len = Math.hypot(ax,ay) || 1;
    ax/=len; ay/=len;

    magnet.vx = lerp(magnet.vx, ax*speed, 1 - Math.pow(0.001, dt));
    magnet.vy = lerp(magnet.vy, ay*speed, 1 - Math.pow(0.001, dt));

    if (mouseActive) {
      const dx = mouseTarget.x - magnet.x;
      const dy = mouseTarget.y - magnet.y;
      const follow = 14;
      magnet.vx = lerp(magnet.vx, dx*follow, 1 - Math.pow(0.001, dt));
      magnet.vy = lerp(magnet.vy, dy*follow, 1 - Math.pow(0.001, dt));
    }

    magnet.x += magnet.vx*dt;
    magnet.y += magnet.vy*dt;
    magnet.x = clamp(magnet.x, mazeX, mazeX + mazePxW);
    magnet.y = clamp(magnet.y, mazeY, mazeY + mazePxH);

    const dx = magnet.x - obj.x;
    const dy = magnet.y - obj.y;
    const dist = Math.hypot(dx,dy) || 0.00001;

    const hard = hardMode.checked;
    const strength = (hard ? 95000*0.72 : 95000) * (magnet.pulseTimer>0 ? 1.55 : 1.0);
    const maxAccel = hard ? 2600 : 3200;
    const inv = 1 / Math.max(70, dist*dist);

    let fx = clamp(dx * strength * inv, -maxAccel, maxAccel);
    let fy = clamp(dy * strength * inv, -maxAccel, maxAccel);

    obj.vx += fx*dt;
    obj.vy += fy*dt;

    const damp = hard ? 0.88 : 0.84;
    obj.vx *= Math.pow(damp, dt*60);
    obj.vy *= Math.pow(damp, dt*60);

    obj.x += obj.vx*dt;
    obj.y += obj.vy*dt;

    for (let iter=0; iter<2; iter++){
      let collided=false;

      for (const w of walls) {
        const res = circleRectResolve(obj.x, obj.y, obj.r, w);
        if (!res) continue;
        collided = true;
        obj.x += res.nx * res.penetration;
        obj.y += res.ny * res.penetration;
        const vn = obj.vx*res.nx + obj.vy*res.ny;
        if (vn < 0) { obj.vx -= 1.55*vn*res.nx; obj.vy -= 1.55*vn*res.ny; }
      }

      for (const g of gateRects) {
        const res = circleRectResolve(obj.x, obj.y, obj.r, g);
        if (!res) continue;
        collided = true;
        obj.x += res.nx * res.penetration;
        obj.y += res.ny * res.penetration;
        const vn = obj.vx*res.nx + obj.vy*res.ny;
        if (vn < 0) { obj.vx -= 1.65*vn*res.nx; obj.vy -= 1.65*vn*res.ny; }
      }

      if (!collided) break;
    }

    if (revealFx.t > 0) revealFx.t = Math.max(0, revealFx.t - dt);

    if (mazeUnlocked && obj.x > exitZone.x + obj.r && obj.y > exitZone.y + obj.r) {
      won = true;
      showEndOverlay();
    }

    updatePulseUI();
  }

  function drawBackground(ctx, variant) {
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
  }

  function drawMaze(ctx, withExit, withGrid) {
    ctx.save();
    ctx.translate(0.5,0.5);

    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(mazeX, mazeY, mazePxW, mazePxH);

    for (const r of rooms) {
      const px = mazeX + r.x*cellSize;
      const py = mazeY + r.y*cellSize;
      ctx.fillStyle = 'rgba(232,238,252,0.045)';
      ctx.fillRect(px, py, r.w*cellSize, r.h*cellSize);
    }

    if (withGrid) {
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
    for (const w of walls) ctx.fillRect(w.x,w.y,w.w,w.h);

    if (withExit) {
      if (!mazeUnlocked) {
        ctx.fillStyle = 'rgba(255,110,136,0.08)';
        ctx.fillRect(exitZone.x, exitZone.y, exitZone.w, exitZone.h);
        ctx.strokeStyle = 'rgba(255,110,136,0.55)';
        ctx.lineWidth = 2;
        ctx.strokeRect(exitZone.x+2, exitZone.y+2, exitZone.w-4, exitZone.h-4);

        ctx.fillStyle = 'rgba(255,110,136,0.35)';
        for (const g of gateRects) ctx.fillRect(g.x,g.y,g.w,g.h);

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
  }

  function drawObject(ctx) {
    const og = ctx.createRadialGradient(obj.x-obj.r*0.2,obj.y-obj.r*0.2,obj.r*0.2,obj.x,obj.y,obj.r*1.2);
    og.addColorStop(0,'rgba(232,238,252,0.95)');
    og.addColorStop(1,'rgba(232,238,252,0.20)');
    ctx.fillStyle = og;
    ctx.beginPath(); ctx.arc(obj.x,obj.y,obj.r,0,Math.PI*2); ctx.fill();

    ctx.fillStyle = 'rgba(110,243,255,0.25)';
    ctx.beginPath(); ctx.arc(obj.x,obj.y,Math.max(2,obj.r*0.45),0,Math.PI*2); ctx.fill();
  }

  function drawMagnet(ctx, pulsingLook=false) {
    const pulsing = pulsingLook || (magnet.pulseTimer>0);
    const radius = pulsing ? cellSize*1.35 : cellSize*1.10;

    ctx.save();
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
  }

  function drawNeonRevealInRoom(ctx) {
    if (!revealFx.text || !revealFx.room) return;
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
  }

  function drawLabels(ctx, label, note) {
    ctx.save();
    ctx.font = '800 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillStyle = 'rgba(232,238,252,0.75)';
    ctx.fillText(label, 12, 18);

    ctx.fillStyle = note === 'A' ? 'rgba(132,255,177,0.70)' : 'rgba(255,110,136,0.60)';
    ctx.fillText(note === 'A' ? 'SORTIE VERROUILLÉE/OUVERTE' : 'MURS & OBJET MASQUÉS', W-210, 18);
    ctx.restore();
  }

  function render() {
    drawBackground(ctxA,'A');
    drawMaze(ctxA,true,showGrid.checked);
    ctxA.save();
    drawObject(ctxA);
    ctxA.restore();

    if ((magnet.pulseTimer > 0) && pulseVisibleToA) drawMagnet(ctxA, true);

    drawNeonRevealInRoom(ctxA);
    drawLabels(ctxA,'Vue A (labyrinthe)','A');

    drawBackground(ctxB,'B');
    ctxB.save();
    ctxB.fillStyle = 'rgba(255,255,255,0.018)';
    ctxB.fillRect(mazeX,mazeY,mazePxW,mazePxH);
    ctxB.strokeStyle = 'rgba(232,238,252,0.10)';
    ctxB.lineWidth = 2;
    ctxB.strokeRect(mazeX,mazeY,mazePxW,mazePxH);
    ctxB.restore();

    drawMagnet(ctxB, magnet.pulseTimer>0);

    if (magnet.pulseTimer > 0) {
      ctxB.save();
      ctxB.globalAlpha = 0.25;
      ctxB.fillStyle = 'rgba(176,124,255,0.20)';
      ctxB.fillRect(0,0,W,H);
      ctxB.restore();
    }

    if (revealFx.t > 0 && revealFx.text) {
      ctxB.save();
      ctxB.globalAlpha = Math.min(0.55, revealFx.t*0.25);
      ctxB.fillStyle = 'rgba(110,243,255,0.10)';
      ctxB.fillRect(0,0,W,H);
      ctxB.font = '900 34px ui-monospace, monospace';
      ctxB.textAlign = 'center';
      ctxB.textBaseline = 'middle';
      ctxB.shadowColor = 'rgba(176,124,255,0.65)';
      ctxB.shadowBlur = 18;
      ctxB.fillStyle = 'rgba(232,238,252,0.85)';
      ctxB.fillText(revealFx.text, W/2, H*0.18);
      ctxB.restore();
    }

    drawLabels(ctxB,'Vue B (pilotage aimant)','B');
  }

  function showEndOverlay() {
    const frag = currentSegment();
    endTitle.textContent = "✅ Sortie franchie";
    endSubtitle.textContent = `Fragment validé : “${frag}”. ${level.idx+1}/${level.segments.length}.`;
    endOverlay.classList.remove('hidden');
    nextMazeBtn.textContent = (level.idx >= level.segments.length-1) ? "Niveau suivant (nouveau tirage)" : "Labyrinthe suivant";
  }
  function hideEndOverlay(){ endOverlay.classList.add('hidden'); }

  function nextMazeOrNewLevel() {
    hideEndOverlay();
    won = false;
    if (level.idx >= level.segments.length-1) { startNewLevel("", level.mode, level.maxMazes); return; }
    level.idx += 1;
    newMazeForCurrentSegment();
  }

  newLevelBtn.addEventListener('click', () => startNewLevel("", level.mode, level.maxMazes));
  resetBtn.addEventListener('click', () => newMazeForCurrentSegment());

  nextMazeBtn.addEventListener('click', nextMazeOrNewLevel);
  closeEndBtn.addEventListener('click', () => endOverlay.classList.add('hidden'));

  adminBtn.addEventListener('click', () => {
    adminTarget.value = level.targetText || "";
    adminMode.value = level.mode || "auto";
    adminMaxMazes.value = String(level.maxMazes || 5);
    adminPulseCD.value = String(Math.round(magnet.pulseCooldown || 10));
    adminOverlay.classList.remove('hidden');
  });
  adminCloseBtn.addEventListener('click', () => adminOverlay.classList.add('hidden'));
  adminApplyBtn.addEventListener('click', () => {
    const txt = adminTarget.value.trim();
    const mode = adminMode.value;
    const maxMazes = parseInt(adminMaxMazes.value,10) || 5;
    const cd = clamp(parseInt(adminPulseCD.value,10) || 10, 1, 120);

    magnet.pulseCooldown = cd;

    adminOverlay.classList.add('hidden');
    startNewLevel(txt, mode, maxMazes);
  });

  let last = performance.now();
  function loop(now){
    const dt = clamp((now-last)/1000, 0, 0.033);
    last = now;
    step(dt);
    render();
    requestAnimationFrame(loop);
  }

  startNewLevel("", "auto", 5);
  requestAnimationFrame(loop);
})();