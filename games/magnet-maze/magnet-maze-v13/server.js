// Magnet Maze v1.3 — LAN WebSocket relay + lobby role assignment
// Run: npm install && npm start

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;
const WS_PATH = '/ws';
const root = __dirname;

const contentType = (p) => {
  if (p.endsWith('.html')) return 'text/html; charset=utf-8';
  if (p.endsWith('.css')) return 'text/css; charset=utf-8';
  if (p.endsWith('.js')) return 'application/javascript; charset=utf-8';
  return 'application/octet-stream';
};

function safePath(urlPath){
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const rel = clean === '/' ? '/index.html' : clean;
  const full = path.join(root, rel);
  if (!full.startsWith(root)) return null;
  return full;
}

const server = http.createServer((req,res)=>{
  const filePath = safePath(req.url);
  if (!filePath) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err,data)=>{
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': contentType(filePath), 'Cache-Control':'no-store' });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server, path: WS_PATH });

const clients = new Map(); // ws -> {id,nick,lastSeen}
let lobby = {
  players: [],
  doors: { left:{ taken:false, by:null }, right:{ taken:false, by:null } },
  mapping: null
};

const now = () => Date.now();
const send = (ws,msg) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg));
const broadcast = (msg) => {
  const raw = JSON.stringify(msg);
  for (const ws of clients.keys()) if (ws.readyState === WebSocket.OPEN) ws.send(raw);
};

const lobbyState = () => ({
  players: lobby.players.map(p => ({ id:p.id, nick:p.nick, role:p.role||null, door:p.door||null })),
  doors: lobby.doors
});

function upsertPlayer(id, nick){
  let p = lobby.players.find(x => x.id === id);
  if (!p) { p = { id, nick, role:null, door:null }; lobby.players.push(p); }
  if (nick) p.nick = nick;
  return p;
}

function assignRoleForDoor(door){
  if (!lobby.mapping) {
    const flip = Math.random() < 0.5;
    lobby.mapping = flip ? { left:'A', right:'B' } : { left:'B', right:'A' };
  }
  return lobby.mapping[door];
}

function handleDoorChoice(ws, payload){
  const { id, nick, door } = payload || {};
  if (!id || !nick || !door || !['left','right'].includes(door)) {
    send(ws, { type:'ERROR', payload:{ id, message:'Choix invalide.' }});
    return;
  }
  if (lobby.players.length >= 2 && !lobby.players.find(p => p.id === id)) {
    send(ws, { type:'ERROR', payload:{ id, message:'Deux joueurs déjà connectés.' }});
    return;
  }
  const d = lobby.doors[door];
  if (d.taken && d.by !== id) {
    send(ws, { type:'ERROR', payload:{ id, message:'Cette porte est déjà ouverte.' }});
    return;
  }

  d.taken = true; d.by = id;

  const p = upsertPlayer(id, String(nick).trim().slice(0,18));
  p.door = door;
  p.role = assignRoleForDoor(door);

  const c = clients.get(ws);
  if (c) { c.id = id; c.nick = p.nick; c.lastSeen = now(); }

  send(ws, { type:'ROLE_ASSIGNED', payload:{ id, nick:p.nick, role:p.role, door }});
  broadcast({ type:'LOBBY_STATE', payload: lobbyState() });
}

function onMessage(ws, raw){
  let data; try{ data = JSON.parse(raw); }catch{ return; }
  const c = clients.get(ws); if (c) c.lastSeen = now();
  if (!data || typeof data !== 'object') return;

  if (data.type === 'LOBBY_PING') { send(ws, { type:'LOBBY_STATE', payload: lobbyState() }); return; }
  if (data.type === 'LOBBY_HELLO') {
    const { id, nick } = data.payload || {};
    if (id && nick) {
      upsertPlayer(id, String(nick).trim().slice(0,18));
      broadcast({ type:'LOBBY_STATE', payload: lobbyState() });
    }
    return;
  }
  if (data.type === 'DOOR_CHOICE') { handleDoorChoice(ws, data.payload); return; }
  if (data.type === 'PING') return;

  // game relay (admin <-> clients)
  broadcast(data);
}

wss.on('connection', (ws)=>{
  clients.set(ws, { id:null, nick:null, lastSeen: now() });
  send(ws, { type:'LOBBY_STATE', payload: lobbyState() });

  ws.on('message', (m)=> onMessage(ws, m));
  ws.on('close', ()=>{
    const c = clients.get(ws);
    clients.delete(ws);
    if (c?.id) {
      lobby.players = lobby.players.filter(p => p.id !== c.id);
      for (const side of ['left','right']) if (lobby.doors[side].by === c.id) lobby.doors[side] = { taken:false, by:null };
      if (lobby.players.length === 0) lobby.mapping = null;
      broadcast({ type:'LOBBY_STATE', payload: lobbyState() });
    }
  });
});

setInterval(()=>{
  const t = now();
  for (const [ws,c] of clients.entries()) if (t - c.lastSeen > 30000) { try{ ws.terminate(); }catch{} }
}, 10000);

server.listen(PORT, ()=> console.log(`[Magnet Maze] http://localhost:${PORT}/ (LAN: http://<host>:${PORT}/)`));
