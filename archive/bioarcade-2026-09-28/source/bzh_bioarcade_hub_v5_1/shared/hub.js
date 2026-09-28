// shared/hub.js
import { AudioBus } from "./audio.js";
import { applyDA, getCurrentDA } from "./da.js";
import { startAmbience } from "./soundscape.js";
import { BioSFX } from "./sfx.js";
import { Progress } from "./progress.js";

function qs(sel, el=document){ return el.querySelector(sel); }
function qsa(sel, el=document){ return Array.from(el.querySelectorAll(sel)); }

function renderAudio(){
  const st = AudioBus.getState();
  const vol = qs("#hubVolume");
  const mute = qs("#hubMute");
  const label = qs("#hubVolLabel");
  if(vol){
    vol.value = String(Math.round(st.volume * 100));
  }
  if(mute){
    mute.setAttribute("aria-pressed", st.muted ? "true" : "false");
    mute.textContent = st.muted ? "Muted" : "Mute";
  }
  if(label){
    label.textContent = st.muted ? "0%" : `${Math.round(st.volume*100)}%`;
  }
}

function renderUnlocks(){
  const badge = qs("#hubBadges");
  if(!badge) return;
  const p = Progress.get();
  const entries = Object.entries(p.unlocks || {});
  badge.innerHTML = "";
  if(entries.length === 0){
    const span = document.createElement("div");
    span.className = "badge empty";
    span.textContent = "No badges yet. Clear a Beta run to unlock one.";
    badge.appendChild(span);
    return;
  }
  for(const [id, data] of entries){
    const b = document.createElement("div");
    b.className = "badge";
    const title = document.createElement("div");
    title.className = "badge-title";
    title.textContent = id;
    const sub = document.createElement("div");
    sub.className = "badge-sub";
    sub.textContent = new Date(data.at).toLocaleString();
    b.appendChild(title);
    b.appendChild(sub);
    badge.appendChild(b);
  }
}

function wireCards(){
  qsa("[data-sfx]").forEach(el=>{
    el.addEventListener("pointerenter", ()=>BioSFX.play("blip"));
  });
  qsa("[data-reset-progress]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if(confirm("Reset unlocks?")){
        Progress.reset();
        BioSFX.play("error");
      }
    });
  });
}

function init(){
  const vol = qs("#hubVolume");
  const mute = qs("#hubMute");
  if(vol){
    vol.addEventListener("input", ()=>{
      AudioBus.setVolume(parseInt(vol.value,10)/100);
      BioSFX.play("blip");
    });
  }
  if(mute){
    mute.addEventListener("click", ()=>{
      AudioBus.toggleMute();
      BioSFX.play("blip");
    });
  }

  renderAudio();
  renderUnlocks();
  wireCards();

  window.addEventListener("bioarcade:audio", renderAudio);
  window.addEventListener("bioarcade:unlock", renderUnlocks);
}
applyDA();
startAmbience(getCurrentDA(), 0.20);

init();


function initArcadeSelector(){
  const cards = qsa("a.card");
  if(cards.length === 0) return;

  // Make focusable for keyboard navigation (links already focusable, but we track selection)
  let selected = 0;

  function setSelected(i, play=true){
    i = Math.max(0, Math.min(cards.length-1, i));
    cards.forEach(c=>c.classList.remove("is-selected"));
    const el = cards[i];
    el.classList.add("is-selected");
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    selected = i;
    if(play) BioSFX.play("blip");
  }

  // Directional navigation based on DOM order + rough layout
  function move(dir){
    const from = cards[selected].getBoundingClientRect();
    let best = selected;
    let bestScore = Infinity;

    for(let i=0;i<cards.length;i++){
      if(i===selected) continue;
      const r = cards[i].getBoundingClientRect();
      const dx = (r.left + r.width/2) - (from.left + from.width/2);
      const dy = (r.top + r.height/2) - (from.top + from.height/2);

      // filter by direction
      if(dir==="left" && dx >= -2) continue;
      if(dir==="right" && dx <= 2) continue;
      if(dir==="up" && dy >= -2) continue;
      if(dir==="down" && dy <= 2) continue;

      // score: primary axis + secondary penalty
      const primary = (dir==="left"||dir==="right") ? Math.abs(dx) : Math.abs(dy);
      const secondary = (dir==="left"||dir==="right") ? Math.abs(dy) : Math.abs(dx);
      const score = primary*1.0 + secondary*0.35;

      if(score < bestScore){
        bestScore = score;
        best = i;
      }
    }

    if(best !== selected) setSelected(best);
    else BioSFX.play("blip");
  }

  function playTransitionThenNavigate(href){
    const t = qs("#arcadeTransition");
    if(!t){ window.location.href = href; return; }
    t.hidden = false;
    t.innerHTML = '<div class="line"></div>';
    t.classList.add("on");
    // coin-ish feedback: reuse success/pickup
    BioSFX.play("success");
    setTimeout(()=>{ window.location.href = href; }, 520);
  }

  // Hover → select (noisy but satisfying)
  cards.forEach((c, i)=>{
    c.addEventListener("mouseenter", ()=> setSelected(i, true), { passive:true });
    c.addEventListener("focus", ()=> setSelected(i, false), { passive:true });
    c.addEventListener("click", (e)=>{
      const href = c.getAttribute("href");
      if(!href) return;
      // only animate for intra-site navigation
      if(href.endsWith(".html") || href.includes("/")){
        e.preventDefault();
        playTransitionThenNavigate(href);
      }
    });
  });

  window.addEventListener("keydown", (e)=>{
    const k = e.key.toLowerCase();
    if(k==="arrowleft"||k==="a") { e.preventDefault(); move("left"); }
    if(k==="arrowright"||k==="d") { e.preventDefault(); move("right"); }
    if(k==="arrowup"||k==="w") { e.preventDefault(); move("up"); }
    if(k==="arrowdown"||k==="s") { e.preventDefault(); move("down"); }
    if(k==="enter" || k===" ") {
      const el = cards[selected];
      const href = el.getAttribute("href");
      if(href){ e.preventDefault(); playTransitionThenNavigate(href); }
    }
    if(k==="escape"){ BioSFX.play("error"); }
  }, { passive:false });

  setSelected(0, false);
}

initArcadeSelector();


// --- Attract Mode (idle 20s) ---
let _idleT = 0;
let _attract = false;
let _attractTimer = null;
let _jingleTimer = null;

function stopAttract(){
  if(!_attract) return;
  _attract = false;
  if(_attractTimer){ clearInterval(_attractTimer); _attractTimer=null; }
  if(_jingleTimer){ clearInterval(_jingleTimer); _jingleTimer=null; }
  const badge = document.querySelector(".attract-badge");
  if(badge) badge.remove();
}

function startAttract(){
  if(_attract) return;
  _attract = true;

  const b = document.createElement("div");
  b.className = "attract-badge mono";
  b.textContent = "ATTRACT MODE";
  document.body.appendChild(b);

  _attractTimer = setInterval(()=>{
    const cards = Array.from(document.querySelectorAll(".card[href]"));
    if(cards.length===0) return;
    const active = document.querySelector(".card.is-active") || document.activeElement?.closest?.(".card");
    let idx = Math.max(0, cards.indexOf(active));
    idx = (idx+1) % cards.length;
    cards[idx].focus?.();
    cards[idx].classList.add("is-active");
    if(active && active!==cards[idx]) active.classList.remove("is-active");
    window.dispatchEvent(new CustomEvent("bio:sfx",{detail:{kind:"blip"}}));
  }, 2600);

  _jingleTimer = setInterval(()=>{
    if(!_attract) return;
    window.dispatchEvent(new CustomEvent("bio:sfx",{detail:{kind:"success"}}));
  }, 12000);
}

function markActivity(){
  _idleT = 0;
  stopAttract();
}

["pointermove","pointerdown","keydown","wheel","touchstart"].forEach(ev=>{
  window.addEventListener(ev, markActivity, { passive:true });
});

setInterval(()=>{
  _idleT += 1;
  if(_idleT >= 20) startAttract();
}, 1000);
