// Magnet Maze v1.3.2 — LAN WebSocket relay + lobby portes + rôles + reconnexion
// Run: npm install && npm start

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;
const WS_PATH = '/ws';

// If a player disconnects, keep their slot reserved for a while (pause until reconnection)
const FREE_AFTER_MS = 2 * 60 * 1000; // 2 minutes

const root = __dirname;

function contentType(p) {
  if (p.endsWith('.html')) return 'text/html; charset=utf-8';
  if (p.endsWith('.css')) return 'text/css; charset=utf-8';
  if (p.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.svg')) return 'image/svg+xml';
  if (p.endsWith('.ico')) return 'image/x-icon';
  return 'application/octet-stream';
}

function safePath(urlPath) {
  const clean = decodeURIComponent((urlPath || '/').split('?')[0]);
  const rel = clean === '/' ? '/index.html' : clean;
  const full = path.join(root, rel);
  if (!full.startsWith(root)) return null;
  return full;
}

const server = http.createServer((req, res) => {
  const filePath = safePath(req.url);
  if (!filePath) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': contentType(filePath), 'Cache-Control': 'no-store' });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server, path: WS_PATH });

function now() { return Date.now(); }

const wsMeta = new Map(); // ws -> { id, lastSeen }
const conn = new Map();   // id -> lastSeen

let lobby = {
  players: [], // {id, nick, role, door, disconnectedAt}
  doors: { left: { taken: false, by: null }, right: { taken: false, by: null } },
  mapping: null, // {left:'A'|'B', right:'A'|'B'}
};

function send(ws, msg) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(msg));
}

function broadcast(msg) {
  const raw = JSON.stringify(msg);
  for (const ws of wsMeta.keys()) {
    if (ws.readyState === WebSocket.OPEN) ws.send(raw);
  }
}

function lobbyState() {
  return {
    players: lobby.players.map(p => ({
      id: p.id,
      nick: p.nick,
      role: p.role || null,
      door: p.door || null,
      connected: conn.has(p.id),
      disconnectedAt: p.disconnectedAt || null,
    })),
    doors: lobby.doors,
  };
}

function upsertPlayer(id, nick) {
  let p = lobby.players.find(x => x.id === id);
  if (!p) {
    p = { id, nick: nick || 'Agent', role: null, door: null, disconnectedAt: null };
    lobby.players.push(p);
  }
  if (nick) p.nick = String(nick).trim().slice(0, 18);
  p.disconnectedAt = null;
  return p;
}

function assignRoleForDoor(door) {
  if (!lobby.mapping) {
    const flip = Math.random() < 0.5;
    lobby.mapping = flip ? { left: 'A', right: 'B' } : { left: 'B', right: 'A' };
  }
  return lobby.mapping[door];
}

function cleanupDisconnectedSlots() {
  const t = now();
  let changed = false;

  // Free players whose disconnectedAt is too old
  const keep = [];
  for (const p of lobby.players) {
    if (p.disconnectedAt && (t - p.disconnectedAt) > FREE_AFTER_MS) {
      // free door
      if (p.door && lobby.doors[p.door]?.by === p.id) {
        lobby.doors[p.door] = { taken: false, by: null };
      }
      changed = true;
      continue;
    }
    keep.push(p);
  }
  lobby.players = keep;

  if (lobby.players.length === 0) {
    lobby.mapping = null;
    lobby.doors.left = { taken: false, by: null };
    lobby.doors.right = { taken: false, by: null };
    changed = true;
  }

  if (changed) broadcast({ type: 'LOBBY_STATE', payload: lobbyState() });
}

function markConnected(id) {
  conn.set(id, now());
  // clear disconnectedAt if present
  const p = lobby.players.find(x => x.id === id);
  if (p) p.disconnectedAt = null;
}

function markDisconnected(id) {
  conn.delete(id);
  const p = lobby.players.find(x => x.id === id);
  if (p && !p.disconnectedAt) p.disconnectedAt = now();
}

function handleLobbyHello(ws, payload) {
  const id = payload?.id;
  const nick = payload?.nick;
  if (!id || !nick) return;
  upsertPlayer(id, nick);
  markConnected(id);
  broadcast({ type: 'LOBBY_STATE', payload: lobbyState() });

  // If this player already has a role, tell them (useful after refresh)
  const p = lobby.players.find(x => x.id === id);
  if (p?.role) {
    send(ws, { type: 'ROLE_ASSIGNED', payload: { id, nick: p.nick, role: p.role, door: p.door } });
  }
}

function handleDoorChoice(ws, payload) {
  const id = payload?.id;
  const nick = payload?.nick;
  const door = payload?.door;
  if (!id || !nick || !door || !['left', 'right'].includes(door)) {
    send(ws, { type: 'ERROR', payload: { id, message: 'Choix de porte invalide.' } });
    return;
  }

  // Max 2 players in lobby (including disconnected slots that are still reserved)
  const existing = lobby.players.find(p => p.id === id);
  if (!existing && lobby.players.length >= 2) {
    send(ws, { type: 'ERROR', payload: { id, message: "Deux joueurs déjà enregistrés. Attends qu'un slot se libère (ou reset)." } });
    return;
  }

  // Door availability
  const doorState = lobby.doors[door];
  if (doorState.taken && doorState.by !== id) {
    send(ws, { type: 'ERROR', payload: { id, message: 'Cette porte est déjà ouverte.' } });
    return;
  }

  // Open door for this id
  lobby.doors[door] = { taken: true, by: id };

  const p = upsertPlayer(id, nick);
  p.door = door;
  p.role = p.role || assignRoleForDoor(door);

  markConnected(id);

  send(ws, { type: 'ROLE_ASSIGNED', payload: { id, nick: p.nick, role: p.role, door } });
  broadcast({ type: 'LOBBY_STATE', payload: lobbyState() });
}

function onMessage(ws, raw) {
  let data;
  try { data = JSON.parse(raw); } catch { return; }
  if (!data || typeof data !== 'object') return;

  // update wsMeta ping
  const meta = wsMeta.get(ws);
  if (meta) meta.lastSeen = now();

  // presence update if payload has id
  const pid = data.payload?.id;
  if (pid) {
    if (meta) meta.id = pid;
    markConnected(pid);
  }

  if (data.type === 'LOBBY_PING') {
    send(ws, { type: 'LOBBY_STATE', payload: lobbyState() });
    return;
  }
  if (data.type === 'LOBBY_HELLO') {
    handleLobbyHello(ws, data.payload);
    return;
  }
  if (data.type === 'DOOR_CHOICE') {
    handleDoorChoice(ws, data.payload);
    return;
  }
  if (data.type === 'PING') {
    // just presence
    return;
  }

  // Relay all other messages (admin state, input, etc.)
  broadcast(data);
}

wss.on('connection', (ws) => {
  wsMeta.set(ws, { id: null, lastSeen: now() });
  send(ws, { type: 'LOBBY_STATE', payload: lobbyState() });

  ws.on('message', (msg) => onMessage(ws, msg));
  ws.on('close', () => {
    const meta = wsMeta.get(ws);
    wsMeta.delete(ws);
    if (meta?.id) markDisconnected(meta.id);
    broadcast({ type: 'LOBBY_STATE', payload: lobbyState() });
  });
});

// cleanup: stale ws + free disconnected slots after timeout
setInterval(() => {
  const t = now();
  for (const [ws, meta] of wsMeta.entries()) {
    if (t - meta.lastSeen > 30000) {
      try { ws.terminate(); } catch {}
    }
  }
  cleanupDisconnectedSlots();
}, 5000);

server.listen(PORT, () => {
  console.log(`[Magnet Maze] http://localhost:${PORT}/  (LAN: http://<host>:${PORT}/)`);
  console.log(`[Magnet Maze] WebSocket at ws://<host>:${PORT}${WS_PATH}`);
});
