import { applyDA, getCurrentDA } from "./da.js";
import { applySkinToDocument } from "./skins.js";
import { BioSFX } from "./sfx.js";
import { startAmbience } from "./soundscape.js";

// Hub behaviors (selection, volume slider, attract mode)
import "./hub.js";

const overlay = document.getElementById("pressOverlay");
const wrap = document.getElementById("pressHubWrap");
const startBtn = document.getElementById("pressStart");

let started = false;

function unlock(){
  if(started) return;
  started = true;
  BioSFX.play("coin");
  overlay.classList.add("hidden");
  wrap.classList.remove("locked");
  wrap.setAttribute("aria-busy","false");
  setTimeout(()=>BioSFX.play("success"), 120);
}

function init(){
  applyDA();
  applySkinToDocument();
  startAmbience(getCurrentDA(), 0.20);

  startBtn?.addEventListener("click", unlock);
  window.addEventListener("keydown",(e)=>{
    if(e.key==="Enter" || e.key===" "){
      if(!started){
        e.preventDefault();
        unlock();
      }
    }
  }, { passive:false });

  startBtn?.focus();
}

init();
