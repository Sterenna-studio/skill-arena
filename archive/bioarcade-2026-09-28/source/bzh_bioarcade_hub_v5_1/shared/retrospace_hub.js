import { AudioBus } from "./audio.js";
import { BioSFX } from "./sfx.js";
import { startAmbience } from "./soundscape.js";
import { loadGames } from "./scanner.js";

const qs=(s,e=document)=>e.querySelector(s);

let started=false;
let games=[];
let activeIndex=0;

function toast(msg){
  const t=qs("#toast");
  t.textContent=msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),1300);
}

function normStatus(s){
  const v=String(s||"").toLowerCase();
  if(v.includes("alpha")) return "alpha";
  if(v.includes("beta")) return "beta";
  if(v.includes("stable")||v.includes("v1")) return "stable";
  return v || "dev";
}

function clampActive(){
  if(activeIndex<0) activeIndex=0;
  if(activeIndex>=games.length) activeIndex=Math.max(0,games.length-1);
}

function updateActivePill(){
  const g=games[activeIndex];
  qs("#activePill").textContent = g ? `${g.id} • ${g.title||""}`.trim() : "—";
}

function render(){
  qs("#infoDA").textContent = "NEOGEO";
  qs("#infoStatus").textContent = started ? "ONLINE" : "LOCKED";
  qs("#infoCount").textContent = String(games.length);

  const grid=qs("#gamesGrid");
  grid.innerHTML="";
  games.forEach((g,i)=>{
    const btn=document.createElement("button");
    btn.className = "rs-gamebtn" + (i===activeIndex ? " active" : "");
    btn.setAttribute("data-sfx","");
    btn.innerHTML = `
      <div class="rs-game-title">${g.title || g.id}</div>
      <div class="rs-game-meta">
        <span class="rs-tag ${normStatus(g.status)}">${(g.status||"dev").toUpperCase()}</span>
        <span class="rs-tag">${(g.version||"").toUpperCase() || "—"}</span>
        ${(Array.isArray(g.genre) && g.genre.length) ? `<span class="rs-tag">${String(g.genre[0]).toUpperCase()}</span>` : ""}
      </div>
    `;
    btn.addEventListener("click", ()=>{
      activeIndex=i;
      BioSFX.play("blip");
      updateActivePill();
      render();
      if(started) launchActive();
      else toast("Locked — PRESS START");
    });
    btn.addEventListener("mouseenter", ()=>BioSFX.play("blip"));
    grid.appendChild(btn);
  });

  updateActivePill();
}

function setVolumeUI(){
  const st=AudioBus.getState();
  qs("#vol").value=String(Math.round(st.volume*100));
  qs("#volLabel").textContent = st.muted ? "0%" : `${Math.round(st.volume*100)}%`;
  const mute=qs("#muteBtn");
  mute.setAttribute("aria-pressed", st.muted ? "true":"false");
  mute.textContent = st.muted ? "Muted" : "Mute";
}

function unlock(){
  if(started) return;
  started=true;
  BioSFX.play("coin");
  qs("#pressOverlay").classList.add("hidden");
  qs("#led").classList.remove("red");
  qs("#pillText").textContent="SYSTEM ONLINE";
  setTimeout(()=>BioSFX.play("success"),120);
  render();
  toast("ONLINE");
}

function launchActive(){
  const g=games[activeIndex];
  if(!g) return;
  const entry=g.entry || "index.html";
  const url = `./games/${g.id}/${entry}`;
  BioSFX.play("success");
  window.location.href=url;
}

async function scan(){
  BioSFX.play("blip");
  toast("Scanning…");
  const raw = await loadGames();
  games = (Array.isArray(raw)? raw: []).map(x=>({
    id: x.id || x.slug || "unknown",
    title: x.title || x.name || x.id || "Untitled",
    version: x.version || "",
    status: x.status || "dev",
    genre: x.genre || x.tags || [],
    entry: x.entry || "index.html",
  }));
  clampActive();
  render();
  toast(games.length ? `Found ${games.length} game(s)` : "No manifest found");
}

function init(){
  startAmbience("NEOGEO", 0.18);
  setVolumeUI();

  // Press overlay
  qs("#pressStart").addEventListener("click", unlock);
  qs("#startBtn").addEventListener("click", unlock);

  window.addEventListener("keydown",(e)=>{
    if((e.key==="Enter" || e.key===" ") && !started){
      e.preventDefault(); unlock(); return;
    }
    if(e.key==="ArrowUp" || e.key==="w" || e.key==="W"){
      activeIndex--; clampActive(); BioSFX.play("blip"); render(); e.preventDefault(); return;
    }
    if(e.key==="ArrowDown" || e.key==="s" || e.key==="S"){
      activeIndex++; clampActive(); BioSFX.play("blip"); render(); e.preventDefault(); return;
    }
    if(e.key==="Enter" && started){
      e.preventDefault(); launchActive(); return;
    }
  }, {passive:false});

  qs("#vol").addEventListener("input", ()=>{
    AudioBus.setVolume(parseInt(qs("#vol").value,10)/100);
    BioSFX.play("blip");
    setVolumeUI();
  });
  qs("#muteBtn").addEventListener("click", ()=>{
    AudioBus.toggleMute(); BioSFX.play("blip"); setVolumeUI();
  });

  qs("#scanBtn").addEventListener("click", scan);

  window.addEventListener("bioarcade:audio", setVolumeUI);
    scan();
  render();
}
init();
