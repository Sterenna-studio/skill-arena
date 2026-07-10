(() => {
  'use strict';
  const MZ = window.MZ;

  const nickEl = document.getElementById('nick');
  const joinBtn = document.getElementById('joinBtn');
  const connEl = document.getElementById('conn');
  const playersEl = document.getElementById('players');
  const doorsEl = document.getElementById('doors');
  const infoEl = document.getElementById('info');

  const doorL = document.getElementById('doorL');
  const doorR = document.getElementById('doorR');
  const sealL = document.getElementById('sealL');
  const sealR = document.getElementById('sealR');

  const myId = 'u-' + Math.random().toString(16).slice(2);
  let joined = false;
  let lobby = null;

  function setConn(txt){ connEl.textContent = txt; }
  function storeNick(nick){ try{ sessionStorage.setItem('mz_nick', nick); localStorage.setItem('mz_nick', nick);}catch{} }
  function myNick(){ try{ return (nickEl.value || sessionStorage.getItem('mz_nick') || localStorage.getItem('mz_nick') || '').trim(); }catch{ return (nickEl.value||'').trim(); } }

  function render(){
    const leftTaken = !!(lobby?.doors?.left?.taken);
    const rightTaken = !!(lobby?.doors?.right?.taken);

    sealL.textContent = leftTaken ? 'OUVERTE' : 'FERMÉE';
    sealR.textContent = rightTaken ? 'OUVERTE' : 'FERMÉE';
    doorL.classList.toggle('open', leftTaken);
    doorR.classList.toggle('open', rightTaken);

    doorsEl.textContent = `Gauche:${leftTaken?'open':'closed'} • Droite:${rightTaken?'open':'closed'}`;
    const list = (lobby?.players||[]).map(p => p.nick + (p.role ? `(${p.role})` : '')).join(', ');
    playersEl.textContent = list || '—';
    infoEl.textContent = (lobby?.players||[]).length >= 2 ? 'Deux joueurs présents : OK.' : 'En attente du second joueur…';
  }

  function requestJoin(){
    const nick = myNick();
    if (!nick) { MZ.toast('Entre un pseudo'); return; }
    storeNick(nick);
    joined = true;
    setConn('connecté');
    MZ.post({ type:'LOBBY_HELLO', from: myId, payload:{ id: myId, nick }});
    MZ.toast('Connecté au lobby');
  }

  function chooseDoor(side){
    if (!joined) requestJoin();
    if (lobby?.doors?.[side]?.taken) return;
    const nick = myNick();
    if (!nick) { MZ.toast('Entre un pseudo'); return; }
    MZ.post({ type:'DOOR_CHOICE', from: myId, payload:{ id: myId, nick, door: side }});
  }

  joinBtn.addEventListener('click', requestJoin);
  nickEl.addEventListener('keydown', (e)=>{ if(e.key==='Enter') requestJoin(); });

  doorL.addEventListener('click', ()=> chooseDoor('left'));
  doorR.addEventListener('click', ()=> chooseDoor('right'));

  MZ.onMessage((msg)=>{
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'LOBBY_STATE') {
      lobby = msg.payload;
      setConn('OK');
      render();
    }
    if (msg.type === 'ROLE_ASSIGNED') {
      const p = msg.payload || {};
      if (p.id !== myId) return;
      storeNick(p.nick || myNick());
      if (p.role === 'A') location.href = 'a.html';
      if (p.role === 'B') location.href = 'b.html';
    }
    if (msg.type === 'ERROR') {
      const p = msg.payload || {};
      if (p.id && p.id !== myId) return;
      if (p.message) MZ.toast(p.message);
    }
  });

  try {
    const saved = sessionStorage.getItem('mz_nick') || localStorage.getItem('mz_nick');
    if (saved) nickEl.value = saved;
  } catch {}

  MZ.connect();
  MZ.post({ type:'LOBBY_PING', from: myId, payload:{ id: myId }});
  setConn('…');
  setInterval(()=> MZ.post({ type:'PING', from: myId, payload:{ id: myId, role:'LOBBY' }}), 2000);
})();