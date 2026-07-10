(() => {
  'use strict';
  const MZ = window.MZ;

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const seedEl = document.getElementById('seed');
  const targetEl = document.getElementById('target');
  const modeEl = document.getElementById('mode');
  const maxMazesEl = document.getElementById('maxMazes');
  const pulseCdEl = document.getElementById('pulseCd');

  const applyBtn = document.getElementById('applyBtn');
  const resetBtn = document.getElementById('resetBtn');
  const nextBtn = document.getElementById('nextBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const syncBtn = document.getElementById('syncBtn');

  const clientsEl = document.getElementById('clients');
  const progEl = document.getElementById('prog');
  const pulseEl = document.getElementById('pulse');
  const infoEl = document.getElementById('info');

  const GRID_W = 18, GRID_H = 12;
  const PAD = 28;
  const cellSize = Math.floor(Math.min((W - PAD*2)/GRID_W, (H - PAD*2)/GRID_H));
  const mazePxW = cellSize*GRID_W;
  const mazePxH = cellSize*GRID_H;
  const mazeX = Math.floor((W - mazePxW)/2);
  const mazeY = Math.floor((H - mazePxH)/2);
  const wallThickness = Math.max(6, Math.floor(cellSize*0.18));

  const exitZone = { x: mazeX + mazePxW - cellSize, y: mazeY + mazePxH - cellSize, w: cellSize, h: cellSize };

  const myId = 'admin-' + Math.random().toString(16).slice(2);
  const clients = new Map(); // id -> {role,lastSeen}

  const config = {
    seed: (Date.now() & 0xffffffff) >>> 0,
    targetText: '',
    mode: 'auto',
    maxMazes: 5,
    pulseCooldown: 10,      // admin editable
    pulseDuration: 0.35,
    visiblePulseEvery: 5,   // 1 pulse / 5 visible by A
  };

  const level = { segments: [], discovered: [], idx: 0 };

  const obj = { x: 0, y: 0, vx: 0, vy: 0, r: Math.max(8, Math.floor(cellSize*0.22)) };
  const magnet = { x: 0, y: 0, vx: 0, vy: 0, r: Math.max(10, Math.floor(cellSize*0.18)) };

  const sim = {
    running: true,
    manualPaused: false,
    autoPaused: false,
    started: false,
    pauseReason: '',
    won: false,
    mazeUnlocked: false,
    revealFx: { t: 0, text: '', room: null },
    pulse: { cooldown: 0, timer: 0, count: 0, visibleThisPulse: false },
    input: { ax:0, ay:0, mouseActive:false, mouseX:0, mouseY:0, center:false }
  };

  let maze = null;
  let walls = [];
  let rooms = [];
  let gateRects = [];

  // ===== maze generation (deterministic) =====
  function makeMaze(rng, w, h) {
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
      const p = opts[Math.floor(rng()*opts.length)];
      cells[cur.y][cur.x][p.d.a] = false;
      cells[p.ny][p.nx][p.d.b] = false;
      cells[p.ny][p.nx].v = true;
      stack.push({x:p.nx,y:p.ny});
    }

    cells[0][0].left = false;
    cells[h-1][w-1].right = false;
    return cells;
  }

  function carveRooms(rng, cells, count) {
    rooms = [];
    const randInt = (a,b)=> (a + Math.floor(rng()*(b-a+1)));
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

      // door(s)
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
    if (sim.mazeUnlocked) return;
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

    // outer bounds
    const ox=mazeX, oy=mazeY;
    walls.push({ x:ox-wallThickness, y:oy-wallThickness, w:mazePxW+wallThickness*2, h:wallThickness });
    walls.push({ x:ox-wallThickness, y:oy+mazePxH, w:mazePxW+wallThickness*2, h:wallThickness });
    walls.push({ x:ox-wallThickness, y:oy-wallThickness, w:wallThickness, h:mazePxH+wallThickness*2 });
    walls.push({ x:ox+mazePxW, y:oy-wallThickness, w:wallThickness, h:mazePxH+wallThickness*2 });

    // open entrance/exit gaps
    const ent = { x: mazeX - wallThickness, y: mazeY + cellSize*0.25, w: wallThickness, h: cellSize*0.5 };
    const ext = { x: mazeX + mazePxW, y: mazeY + mazePxH - cellSize*0.75, w: wallThickness, h: cellSize*0.5 };
    walls = walls.filter(r => !rectIntersects(r, ent) && !rectIntersects(r, ext));

    rebuildGate();
  }

  function resetPositions() {
    obj.x = mazeX + cellSize*0.5; obj.y = mazeY + cellSize*0.5; obj.vx=0; obj.vy=0;
    magnet.x = mazeX + cellSize*1.5; magnet.y = mazeY + cellSize*1.5; magnet.vx=0; magnet.vy=0;
    sim.won = false;
    sim.revealFx = { t:0, text:'', room:null };
    sim.pulse.timer = 0;
    sim.pulse.visibleThisPulse = false;
  }

  function currentSegment(){ return level.segments[level.idx] || ''; }

  function makeProgressString() {
    const parts = level.segments.map((seg,i)=> level.discovered[i] ? seg : '▢'.repeat(Math.max(1, seg.length)));
    return `Laby ${level.idx+1}/${level.segments.length} • ` + parts.join('  ');
  }

  function startNewLevel() {
    const rng = MZ.mulberry32(config.seed);

    const chosenText = config.targetText && config.targetText.trim()
      ? config.targetText.trim()
      : (rng() < 0.45 ? MZ.pick(rng, MZ.WORDS) : MZ.pick(rng, MZ.PHRASES));
    config.targetText = MZ.normalizeText(chosenText);

    level.segments = MZ.makeSegments(config.targetText, config.mode, config.maxMazes);
    level.discovered = level.segments.map(()=>false);
    level.idx = 0;

    newMazeForSegment();
  }

  function newMazeForSegment() {
    const segSeed = (config.seed + level.idx*1337 + MZ.hashStringToSeed(currentSegment())) >>> 0;
    const rng = MZ.mulberry32(segSeed);

    sim.mazeUnlocked = false;
    sim.revealFx = { t:0, text:'', room:null };
    sim.pulse.cooldown = 0;
    sim.pulse.timer = 0;
    sim.pulse.visibleThisPulse = false;

    maze = makeMaze(rng, GRID_W, GRID_H);
    carveRooms(rng, maze, 2 + Math.floor(rng()*3));
    rebuildWalls();
    resetPositions();
    broadcastMaze(true);
    broadcastState(true);
  }

  function nextMaze() {
    if (level.idx >= level.segments.length-1) {
      config.seed = (config.seed + 1) >>> 0;
      startNewLevel();
      return;
    }
    level.idx += 1;
    newMazeForSegment();
  }

  function isPointInRoomCell(px, py) {
    const cx = Math.floor((px - mazeX) / cellSize);
    const cy = Math.floor((py - mazeY) / cellSize);
    for (const r of rooms) {
      if (cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h) return r;
    }
    return null;
  }

  function revealFragment(room) {
    sim.mazeUnlocked = true;
    rebuildGate();
    const frag = currentSegment();
    level.discovered[level.idx] = true;
    sim.revealFx = { t: 2.6, text: frag, room };
    MZ.toast(`FRAGMENT RÉVÉLÉ : ${frag}`);
    broadcastMaze(false);
    const device = MZ.pick(MZ.mulberry32((config.seed^0xABCDEF)>>>0), MZ.DEVICES);
    broadcastState(true, `FRAGMENT RÉVÉLÉ : ${frag} — ${device}`);
  }

  // ===== Physics =====
  function circleRectResolve(cx, cy, r, rect) {
    const px = MZ.clamp(cx, rect.x, rect.x + rect.w);
    const py = MZ.clamp(cy, rect.y, rect.y + rect.h);
    const dx = cx - px, dy = cy - py;
    const d2 = dx*dx + dy*dy;
    if (d2 >= r*r) return null;
    const d = Math.sqrt(d2) || 0.00001;
    return { nx: dx/d, ny: dy/d, penetration: r - d };
  }

  // ===== Pulse =====
  function doPulse() {
    if (sim.pulse.cooldown > 0) return;

    sim.pulse.timer = config.pulseDuration;
    sim.pulse.cooldown = Math.max(1, config.pulseCooldown);
    sim.pulse.count += 1;
    sim.pulse.visibleThisPulse = (sim.pulse.count % config.visiblePulseEvery) === 0;

    const room = isPointInRoomCell(obj.x, obj.y);
    if (room && !sim.mazeUnlocked) revealFragment(room);

    broadcastState(true, sim.pulse.visibleThisPulse ? 'Pulse (visible A)' : 'Pulse');
  }

  // ===== Main step =====
  let broadcastAcc = 0;

  function step(dt) {
    // clients cleanup (even when paused)

    const now = Date.now();
    for (const [id, c] of clients) {
      if (now - c.lastSeen > 6000) clients.delete(id);
    }
    // auto-pause if A or B missing
    const hasA = Array.from(clients.values()).some(c => c.role === 'A');
    const hasB = Array.from(clients.values()).some(c => c.role === 'B');
    if (hasA && hasB) sim.started = true;
    const needAuto = sim.started ? !(hasA && hasB) : false;

    const prevRunning = sim.running;
    const prevAuto = sim.autoPaused;

    if (needAuto) {
      sim.autoPaused = true;
      sim.pauseReason = 'Attente de reconnexion (A/B)';
    } else {
      sim.autoPaused = false;
      sim.pauseReason = '';
    }

    sim.running = !(sim.manualPaused || sim.autoPaused);
    pauseBtn.textContent = sim.running ? 'Pause' : 'Play';

    if (prevRunning !== sim.running || prevAuto !== sim.autoPaused) {
      broadcastState(true, sim.running ? '▶️ Reprise (reconnecté)' : '⏸️ Pause (attente reconnexion)');
    }

    if (!sim.running) return;


    if (sim.pulse.cooldown > 0) sim.pulse.cooldown = Math.max(0, sim.pulse.cooldown - dt);
    if (sim.pulse.timer > 0) sim.pulse.timer = Math.max(0, sim.pulse.timer - dt);
    if (sim.revealFx.t > 0) sim.revealFx.t = Math.max(0, sim.revealFx.t - dt);

    if (sim.input.center) {
      magnet.x = mazeX + cellSize*1.5;
      magnet.y = mazeY + cellSize*1.5;
      sim.input.center = false;
    }

    const speed = 900;
    magnet.vx = MZ.lerp(magnet.vx, sim.input.ax*speed, 1 - Math.pow(0.001, dt));
    magnet.vy = MZ.lerp(magnet.vy, sim.input.ay*speed, 1 - Math.pow(0.001, dt));

    if (sim.input.mouseActive) {
      const dx = sim.input.mouseX - magnet.x;
      const dy = sim.input.mouseY - magnet.y;
      const follow = 14;
      magnet.vx = MZ.lerp(magnet.vx, dx*follow, 1 - Math.pow(0.001, dt));
      magnet.vy = MZ.lerp(magnet.vy, dy*follow, 1 - Math.pow(0.001, dt));
    }

    magnet.x += magnet.vx*dt;
    magnet.y += magnet.vy*dt;
    magnet.x = MZ.clamp(magnet.x, mazeX, mazeX + mazePxW);
    magnet.y = MZ.clamp(magnet.y, mazeY, mazeY + mazePxH);

    // magnetic force
    const dx = magnet.x - obj.x;
    const dy = magnet.y - obj.y;
    const dist = Math.hypot(dx,dy) || 0.00001;

    const strength = 95000 * (sim.pulse.timer>0 ? 1.55 : 1.0);
    const maxAccel = 3200;
    const inv = 1 / Math.max(70, dist*dist);

    obj.vx += MZ.clamp(dx*strength*inv, -maxAccel, maxAccel) * dt;
    obj.vy += MZ.clamp(dy*strength*inv, -maxAccel, maxAccel) * dt;

    const damp = 0.84;
    obj.vx *= Math.pow(damp, dt*60);
    obj.vy *= Math.pow(damp, dt*60);

    obj.x += obj.vx*dt;
    obj.y += obj.vy*dt;

    for (let iter=0; iter<2; iter++){
      let collided=false;

      for (const w of walls) {
        const res = circleRectResolve(obj.x,obj.y,obj.r,w);
        if (!res) continue;
        collided=true;
        obj.x += res.nx*res.penetration;
        obj.y += res.ny*res.penetration;
        const vn = obj.vx*res.nx + obj.vy*res.ny;
        if (vn<0){ obj.vx -= 1.55*vn*res.nx; obj.vy -= 1.55*vn*res.ny; }
      }

      for (const g of gateRects) {
        const res = circleRectResolve(obj.x,obj.y,obj.r,g);
        if (!res) continue;
        collided=true;
        obj.x += res.nx*res.penetration;
        obj.y += res.ny*res.penetration;
        const vn = obj.vx*res.nx + obj.vy*res.ny;
        if (vn<0){ obj.vx -= 1.65*vn*res.nx; obj.vy -= 1.65*vn*res.ny; }
      }

      if (!collided) break;
    }

    if (sim.mazeUnlocked && obj.x > exitZone.x + obj.r && obj.y > exitZone.y + obj.r) {
      if (!sim.won) {
        sim.won = true;
        MZ.toast('✅ Sortie franchie — (Admin) clique “Labyrinthe suivant”');
        broadcastState(true, '✅ Sortie franchie (Admin : Labyrinthe suivant)');
      }
    }

    broadcastAcc += dt;
    if (broadcastAcc >= 0.05) { // ~20 Hz
      broadcastAcc = 0;
      broadcastState(false);
    }
  }

  // ===== Networking =====
  function broadcastMaze(force) {
    MZ.post({
      type: 'MAZE',
      from: myId,
      payload: {
        GRID_W, GRID_H,
        mazeX, mazeY, mazePxW, mazePxH, cellSize,
        walls,
        rooms,
        exitZone,
        gateRects,
        mazeUnlocked: sim.mazeUnlocked,
        seed: config.seed,
        segIndex: level.idx,
        segment: currentSegment()
      }
    });
  }

  function computeCompass() {
    const dx = obj.x - magnet.x;
    const dy = obj.y - magnet.y;
    const dist = Math.hypot(dx,dy);
    const bearing = Math.atan2(dy, dx); // 0 right, pi/2 down
    // normalize strength: close => 1, far => 0
    const maxD = Math.hypot(mazePxW, mazePxH);
    const strength01 = 1 - MZ.clamp(dist / maxD, 0, 1);
    return { bearingRad: bearing, strength01, dist };
  }

  function broadcastState(forceToast=false, toastText='') {
    const compass = computeCompass();

    MZ.post({
      type: 'STATE',
      from: myId,
      payload: {
        t: Date.now(),
        config: {
          seed: config.seed,
          mode: config.mode,
          maxMazes: config.maxMazes,
          pulseCooldown: config.pulseCooldown,
          pulseDuration: config.pulseDuration,
          visiblePulseEvery: config.visiblePulseEvery,
          targetText: config.targetText
        },
        level: {
          segments: level.segments,
          discovered: level.discovered,
          idx: level.idx
        },
        sim: {
          running: sim.running,
          manualPaused: sim.manualPaused,
          autoPaused: sim.autoPaused,
          pauseReason: sim.pauseReason,
          won: sim.won,
          mazeUnlocked: sim.mazeUnlocked,
          revealFx: sim.revealFx,
          pulse: {
            cooldown: sim.pulse.cooldown,
            timer: sim.pulse.timer,
            count: sim.pulse.count,
            visibleThisPulse: sim.pulse.visibleThisPulse
          }
        },
        entities: { obj, magnet },
        compass,
        toast: forceToast ? toastText : ''
      }
    });
  }

  function handleMessage(msg) {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'HELLO' || msg.type === 'PING') {
      const { id, role } = msg.payload || {};
      if (id) clients.set(id, { role, lastSeen: Date.now() });
      if (msg.type === 'HELLO') { broadcastMaze(false); broadcastState(false); }
      return;
    }

    if (msg.type === 'INPUT') {
      const p = msg.payload || {};
      const { id, role } = p;
      if (id) clients.set(id, { role, lastSeen: Date.now() });

      if (role !== 'B') return;

      if (typeof p.ax === 'number') sim.input.ax = MZ.clamp(p.ax, -1, 1);
      if (typeof p.ay === 'number') sim.input.ay = MZ.clamp(p.ay, -1, 1);
      if (typeof p.mouseActive === 'boolean') sim.input.mouseActive = p.mouseActive;
      if (typeof p.mouseX === 'number') sim.input.mouseX = p.mouseX;
      if (typeof p.mouseY === 'number') sim.input.mouseY = p.mouseY;
      if (p.center === true) sim.input.center = true;
      if (p.pulse === true) doPulse();
      return;
    }
  }

  MZ.onMessage(handleMessage);

  // presence ping
  setInterval(() => {
    MZ.post({ type:'PING', from: myId, payload:{ id: myId, role:'ADMIN' }});
  }, 1500);

  // ===== UI actions =====
  function applyConfigFromUI() {
    const seedVal = int(seedEl.value);
    config.seed = (seedVal !== null) ? (seedVal >>> 0) : ((Date.now() & 0xffffffff) >>> 0);
    config.targetText = targetEl.value.trim();
    config.mode = modeEl.value || 'auto';
    config.maxMazes = int(maxMazesEl.value) ?? 5;
    config.pulseCooldown = Math.max(1, int(pulseCdEl.value) ?? 10);
  }

  function syncToUI() {
    seedEl.value = String(config.seed);
    targetEl.value = config.targetText || '';
    modeEl.value = config.mode || 'auto';
    maxMazesEl.value = String(config.maxMazes || 5);
    pulseCdEl.value = String(config.pulseCooldown || 10);
  }

  function int(v) {
    const n = parseInt(v,10);
    return Number.isFinite(n) ? n : null;
  }

  applyBtn.addEventListener('click', () => {
    applyConfigFromUI();
    startNewLevel();
    syncToUI();
    MZ.toast('✅ Nouveau niveau appliqué');
  });

  resetBtn.addEventListener('click', () => {
    sim.won = false;
    newMazeForSegment();
    MZ.toast('Reset laby');
  });

  nextBtn.addEventListener('click', () => {
    sim.won = false;
    nextMaze();
    MZ.toast('Labyrinthe suivant');
  });

  pauseBtn.addEventListener('click', () => {
    sim.manualPaused = !sim.manualPaused;
    sim.running = !(sim.manualPaused || sim.autoPaused);
    pauseBtn.textContent = sim.running ? 'Pause' : 'Play';
    broadcastState(true, sim.running ? '▶️ Reprise' : '⏸️ Pause');
  });

  syncBtn.addEventListener('click', () => {
    broadcastMaze(false);
    broadcastState(true, '🔄 Sync');
    MZ.toast('Sync envoyé');
  });

  // ===== render =====
  function renderAdmin() {
    MZ.drawBackground(ctx, W, H, 'A');

    const md = {
      GRID_W, GRID_H,
      mazeX, mazeY, mazePxW, mazePxH, cellSize,
      walls, rooms, exitZone, gateRects,
      mazeUnlocked: sim.mazeUnlocked
    };

    MZ.drawMaze(ctx, md, false, true);
    MZ.drawObject(ctx, obj);
    MZ.drawMagnet(ctx, magnet, cellSize, sim.pulse.timer > 0);
    MZ.drawNeonTextInRoom(ctx, md, sim.revealFx);

    // small compass debug
    const c = computeCompass();
    MZ.drawCompass(ctx, W-56, 56, 34, c.bearingRad, c.strength01);

    ctx.save();
    ctx.fillStyle = 'rgba(232,238,252,0.82)';
    ctx.font = '900 12px ui-monospace, monospace';
    ctx.fillText('ADMIN VIEW', 12, 18);
    ctx.restore();
  }

  function updateHUD() {
    clientsEl.textContent = [...clients.values()].map(c=>c.role).sort().join(', ') || '—';
    progEl.textContent = makeProgressString();
    pulseEl.textContent = (sim.pulse.cooldown <= 0) ? `PRÊT (CD ${config.pulseCooldown}s)` : `CD: ${Math.ceil(sim.pulse.cooldown)}s / ${config.pulseCooldown}s`;
    infoEl.textContent = `Segment: “${currentSegment()}” • Sortie: ${sim.mazeUnlocked ? 'OUVERTE' : 'LOCK'} • Pulse visible A: 1/${config.visiblePulseEvery}`;
  }

  function boot() {
    syncToUI();
    startNewLevel();
    updateHUD();
    MZ.post({ type:'HELLO', from: myId, payload:{ id: myId, role:'ADMIN' }});
  }

  let last = performance.now();
  function loop(now) {
    const dt = MZ.clamp((now-last)/1000, 0, 0.033);
    last = now;
    step(dt);
    renderAdmin();
    updateHUD();
    requestAnimationFrame(loop);
  }

  boot();
  requestAnimationFrame(loop);
})();