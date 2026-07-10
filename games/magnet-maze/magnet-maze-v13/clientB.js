(() => {
  'use strict';
  const MZ = window.MZ;

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const connEl = document.getElementById('conn');
  const pulseEl = document.getElementById('pulse');
  const progEl = document.getElementById('prog');
  const compassTxt = document.getElementById('compassTxt');

  const pulseBtn = document.getElementById('pulseBtn');
  const centerBtn = document.getElementById('centerBtn');

  const myId = 'b-' + Math.random().toString(16).slice(2);

  let mazeData = null;
  let state = null;

  function getNick(){
    try { return sessionStorage.getItem('mz_nick') || localStorage.getItem('mz_nick') || ''; } catch { return ''; }
  }


  const input = { ax:0, ay:0, mouseActive:false, mouseX:0, mouseY:0 };

  function setConn(ok, txt='') {
    connEl.textContent = ok ? ('OK' + (txt?(' — '+txt):'')) : ('…' + (txt?(' — '+txt):''));
  }

  function canvasPosFromEvent(evt) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - r.left) * (canvas.width / r.width),
      y: (evt.clientY - r.top) * (canvas.height / r.height),
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    input.mouseActive = true;
    const p = canvasPosFromEvent(e);
    input.mouseX = p.x; input.mouseY = p.y;
    sendInput();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!input.mouseActive) return;
    const p = canvasPosFromEvent(e);
    input.mouseX = p.x; input.mouseY = p.y;
    sendInput();
  });
  canvas.addEventListener('pointerup', () => {
    input.mouseActive = false;
    sendInput();
  });

  const keys = new Set();
  function computeAxis() {
    let ax=0, ay=0;
    if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) ay -= 1;
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) ay += 1;
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) ax -= 1;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) ax += 1;
    const len = Math.hypot(ax,ay) || 1;
    input.ax = ax/len; input.ay = ay/len;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D',' '].includes(e.key)) e.preventDefault();
    keys.add(e.key);
    computeAxis();
    if (e.key === ' ') sendInput({ pulse:true });
    else sendInput();
  }, { passive:false });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.key);
    computeAxis();
    sendInput();
  });

  pulseBtn.addEventListener('click', () => sendInput({ pulse:true }));
  centerBtn.addEventListener('click', () => sendInput({ center:true }));

  function sendInput(extra={}) {
    MZ.post({
      type: 'INPUT',
      from: myId,
      payload: {
        id: myId,
        role: 'B',
        ax: input.ax,
        ay: input.ay,
        mouseActive: input.mouseActive,
        mouseX: input.mouseX,
        mouseY: input.mouseY,
        ...extra
      }
    });
  }

  function angleToCardinal(rad) {
    // 8-way
    const dirs = ['E','SE','S','SW','W','NW','N','NE'];
    const a = ((rad % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    const idx = Math.round(a / (Math.PI/4)) % 8;
    return dirs[idx];
  }

  function render() {
    MZ.drawBackground(ctx, W, H, 'B');

    if (!mazeData || !state) {
      ctx.save();
      ctx.fillStyle = 'rgba(232,238,252,0.75)';
      ctx.font = '900 14px ui-monospace, monospace';
      ctx.fillText('En attente de synchro admin…', 14, 28);
      ctx.restore();
      return;
    }

    // bounds only
    const { mazeX, mazeY, mazePxW, mazePxH } = mazeData;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.018)';
    ctx.fillRect(mazeX, mazeY, mazePxW, mazePxH);
    ctx.strokeStyle = 'rgba(232,238,252,0.10)';
    ctx.lineWidth = 2;
    ctx.strokeRect(mazeX, mazeY, mazePxW, mazePxH);
    ctx.restore();

    const pulseLook = (state.sim.pulse.timer > 0);
    MZ.drawMagnet(ctx, state.entities.magnet, mazeData.cellSize, pulseLook);

    // Compass overlay (top-right)
    if (state.compass) {
      MZ.drawCompass(ctx, W-56, 56, 34, state.compass.bearingRad, state.compass.strength01);
    }

    if (pulseLook) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = 'rgba(176,124,255,0.18)';
      ctx.fillRect(0,0,W,H);
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = 'rgba(232,238,252,0.82)';
    ctx.font = '900 12px ui-monospace, monospace';
    ctx.fillText('AGENT B', 12, 18);
    ctx.restore();
  }

  function updateHUD() {
    const nickEl = document.getElementById('nick');
    if (nickEl) nickEl.textContent = getNick() || '—';
    if (!state) return;
    const parts = state.level.segments.map((seg,i)=> state.level.discovered[i] ? seg : '▢'.repeat(Math.max(1, seg.length)));
    progEl.textContent = parts.join('  ');

    const cd = Math.ceil(state.sim.pulse.cooldown || 0);
    pulseEl.textContent = cd<=0 ? `PRÊT (CD ${state.config.pulseCooldown}s)` : `CD: ${cd}s / ${state.config.pulseCooldown}s`;

    if (state.compass) {
      const dir = angleToCardinal(state.compass.bearingRad);
      const heat = Math.round(state.compass.strength01 * 100);
      compassTxt.textContent = `${dir} • intensité ${heat}%`;
    } else {
      compassTxt.textContent = '—';
    }
  }

  function handleMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'MAZE') { mazeData = msg.payload; setConn(true, 'maze'); }
    if (msg.type === 'STATE') {
      state = msg.payload;
      setConn(true, 'state');
      updateHUD();
      if (state.toast) MZ.toast(state.toast);
    }
  }

  MZ.onMessage(handleMessage);

  setInterval(() => {
    MZ.post({ type:'PING', from: myId, payload:{ id: myId, role:'B' }});
  }, 1500);

  MZ.post({ type:'HELLO', from: myId, payload:{ id: myId, role:'B' }});
  setConn(false, 'hello envoyé');

  function loop(){ render(); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
})();