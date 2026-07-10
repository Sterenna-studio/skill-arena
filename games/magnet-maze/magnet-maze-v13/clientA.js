(() => {
  'use strict';
  const MZ = window.MZ;

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const connEl = document.getElementById('conn');
  const labyEl = document.getElementById('laby');
  const progEl = document.getElementById('prog');
  const pulseEl = document.getElementById('pulse');
  const msgEl = document.getElementById('msg');

  const myId = 'a-' + Math.random().toString(16).slice(2);

  let mazeData = null;
  let state = null;

  function getNick(){
    try { return sessionStorage.getItem('mz_nick') || localStorage.getItem('mz_nick') || ''; } catch { return ''; }
  }


  function setConn(ok, txt='') {
    connEl.textContent = ok ? ('OK' + (txt?(' — '+txt):'')) : ('…' + (txt?(' — '+txt):''));
  }

  function render() {
    MZ.drawBackground(ctx, W, H, 'A');

    if (!mazeData || !state) {
      ctx.save();
      ctx.fillStyle = 'rgba(232,238,252,0.75)';
      ctx.font = '900 14px ui-monospace, monospace';
      ctx.fillText('En attente de synchro admin…', 14, 28);
      ctx.restore();
      return;
    }

    const md = { ...mazeData, mazeUnlocked: state.sim.mazeUnlocked, gateRects: mazeData.gateRects };
    MZ.drawMaze(ctx, md, false, true);
    MZ.drawObject(ctx, state.entities.obj);

    // Magnet visible only on "visible" pulse (1/5) AND during pulse timer
    const showMagnet = state.sim.pulse.visibleThisPulse && (state.sim.pulse.timer > 0);
    if (showMagnet) MZ.drawMagnet(ctx, state.entities.magnet, md.cellSize, true);

    MZ.drawNeonTextInRoom(ctx, md, state.sim.revealFx);

    ctx.save();
    ctx.fillStyle = 'rgba(232,238,252,0.82)';
    ctx.font = '900 12px ui-monospace, monospace';
    ctx.fillText('AGENT A', 12, 18);
    ctx.restore();
  }

  function updateHUD() {
    const nickEl = document.getElementById('nick');
    if (nickEl) nickEl.textContent = getNick() || '—';
    if (!mazeData || !state) return;
    labyEl.textContent = `#${(state.level.idx+1)}/${state.level.segments.length} • seed ${state.config.seed}`;
    const parts = state.level.segments.map((seg,i)=> state.level.discovered[i] ? seg : '▢'.repeat(Math.max(1, seg.length)));
    progEl.textContent = parts.join('  ');
    const cd = Math.ceil(state.sim.pulse.cooldown || 0);
    pulseEl.textContent = cd<=0 ? `Pulse prêt (visible 1/${state.config.visiblePulseEvery})` : `CD: ${cd}s • visible 1/${state.config.visiblePulseEvery}`;
  }

  function handleMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'MAZE') { mazeData = msg.payload; setConn(true, 'maze'); }
    if (msg.type === 'STATE') {
      state = msg.payload;
      setConn(true, 'state');
      updateHUD();
      if (state.toast) { msgEl.textContent = state.toast; MZ.toast(state.toast); }
    }
  }

  MZ.onMessage(handleMessage);

  setInterval(() => {
    MZ.post({ type:'PING', from: myId, payload:{ id: myId, role:'A' }});
  }, 1500);

  MZ.post({ type:'HELLO', from: myId, payload:{ id: myId, role:'A' }});
  setConn(false, 'hello envoyé');

  function loop() { render(); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
})();