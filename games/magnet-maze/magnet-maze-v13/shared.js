(() => {
  'use strict';
  const MZ = {};
  window.MZ = MZ;

  MZ.VERSION = '1.3';
  MZ.CHANNEL = 'magnet-maze-v13';
  MZ.WS_PATH = '/ws';

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

  // fallback same-machine (useful for offline tests)
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
})();