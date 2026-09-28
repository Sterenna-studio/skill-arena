import { AudioBus } from "./audio.js";
import { BioSFX } from "./sfx.js";
import { DAS, getCurrentDA, setCurrentDA, applyDA } from "./da.js";
import { startAmbience } from "./soundscape.js";

const qs=(s,e=document)=>e.querySelector(s);

function renderAudio(){
  const st = AudioBus.getState();
  qs("#hubVolume").value = String(Math.round(st.volume*100));
  qs("#hubVolLabel").textContent = st.muted ? "0%" : `${Math.round(st.volume*100)}%`;
  const mute = qs("#hubMute");
  mute.setAttribute("aria-pressed", st.muted ? "true" : "false");
  mute.textContent = st.muted ? "Muted" : "Mute";
}

function renderDA(){
  const grid = qs("#daGrid");
  const current = getCurrentDA();
  grid.innerHTML = "";
  for(const d of DAS){
    const card = document.createElement("div");
    card.className = "badge";
    card.style.cursor = "pointer";
    card.innerHTML = `
      <div class="badge-title">${d.name}${d.id===current ? " — ACTIVE" : ""}</div>
      <div class="badge-sub">${d.desc}</div>
      <div class="badge-sub" style="margin-top:6px;">ID: <span class="mono">${d.id}</span></div>
    `;
    card.addEventListener("click", ()=>{
      setCurrentDA(d.id);
      startAmbience(d.id, 0.20);
      BioSFX.play("success");
      renderDA();
    });
    grid.appendChild(card);
  }
}

function init(){
  applyDA();
  startAmbience(getCurrentDA(), 0.20);
  renderAudio();
  renderDA();

  qs("#hubVolume").addEventListener("input", ()=>{
    AudioBus.setVolume(parseInt(qs("#hubVolume").value,10)/100);
    BioSFX.play("blip");
  });
  qs("#hubMute").addEventListener("click", ()=>{
    AudioBus.toggleMute(); BioSFX.play("blip"); renderAudio();
  });

  window.addEventListener("bioarcade:audio", renderAudio);
  window.addEventListener("bio:da", ()=>{ applyDA(); renderDA(); });
}
init();
