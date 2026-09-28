import { applyDA, getCurrentDA } from "./da.js";
import { applySkinToDocument } from "./skins.js";
import { BioSFX } from "./sfx.js";
import { startAmbience } from "./soundscape.js";

function go(){
  BioSFX.play("coin");
  window.location.href = "hub.html";
}

function init(){
  applyDA();
  applySkinToDocument();
  startAmbience(getCurrentDA(), 0.18);

  const el = document.getElementById("pressStart");
  el.addEventListener("click", go);
  window.addEventListener("keydown",(e)=>{
    if(e.key==="Enter" || e.key===" "){
      e.preventDefault();
      go();
    }
  }, { passive:false });
}
init();
