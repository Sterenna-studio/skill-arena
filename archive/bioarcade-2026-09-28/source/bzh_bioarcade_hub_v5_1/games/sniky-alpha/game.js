(()=>{
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  const uiSpore = document.getElementById("spore");
  const uiTime = document.getElementById("time");
  const uiBest = document.getElementById("best");
  const uiSave = document.getElementById("saveState");
  const btnRestart = document.getElementById("btnRestart");

  const KEY = "bzh_sniky_alpha_v1";
  const W = canvas.width, H = canvas.height;

  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const dist2 = (ax,ay,bx,by)=>{const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy;};
  const rand = (a,b)=>a+Math.random()*(b-a);

  const input = {left:false,right:false,up:false,down:false};
  window.addEventListener("keydown",(e)=>{
    if(["ArrowLeft","a","A"].includes(e.key)) input.left=true;
    if(["ArrowRight","d","D"].includes(e.key)) input.right=true;
    if(["ArrowUp","w","W"].includes(e.key)) input.up=true;
    if(["ArrowDown","s","S"].includes(e.key)) input.down=true;
    if(e.key === "r" || e.key === "R") restart();
  }, {passive:true});
  window.addEventListener("keyup",(e)=>{
    if(["ArrowLeft","a","A"].includes(e.key)) input.left=false;
    if(["ArrowRight","d","D"].includes(e.key)) input.right=false;
    if(["ArrowUp","w","W"].includes(e.key)) input.up=false;
    if(["ArrowDown","s","S"].includes(e.key)) input.down=false;
  }, {passive:true});

  btnRestart.addEventListener("click", restart);

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  }
  function save(s){
    try{
      localStorage.setItem(KEY, JSON.stringify(s));
      uiSave.textContent = "OK";
    }catch{
      uiSave.textContent = "FAIL";
    }
  }

  let state = load();
  let best = Number.isFinite(state.best) ? state.best : null;

  function fmtBest(v){
    if(v==null) return "—";
    return `${v.toFixed(1)}s`;
  }
  uiBest.textContent = fmtBest(best);

  const player = {x: W*0.5, y:H*0.72, r:10, speed: 220};
  const goalCount = 7;
  let spores = [];
  let collected = 0;
  let startedAt = performance.now();
  let done = false;

  function genSpores(){
    spores = [];
    for(let i=0;i<goalCount;i++){
      spores.push({
        x: rand(80, W-80),
        y: rand(70, H-120),
        r: 10,
        phase: rand(0,Math.PI*2)
      });
    }
  }

  function restart(){
    collected = 0;
    done = false;
    player.x = W*0.5;
    player.y = H*0.72;
    startedAt = performance.now();
    genSpores();
  }

  restart();

  let last = performance.now();
  function step(now){
    const dt = Math.min(0.033, (now-last)/1000);
    last = now;

    // update
    if(!done){
      let vx = (input.right?1:0) - (input.left?1:0);
      let vy = (input.down?1:0) - (input.up?1:0);
      const mag = Math.hypot(vx,vy) || 1;
      vx /= mag; vy /= mag;

      player.x = clamp(player.x + vx*player.speed*dt, 18, W-18);
      player.y = clamp(player.y + vy*player.speed*dt, 18, H-18);

      for(const s of spores){
        if(s.dead) continue;
        if(dist2(player.x,player.y,s.x,s.y) < (player.r+s.r)*(player.r+s.r)){
          s.dead = true;
          collected++;
          if(collected >= goalCount){
            done = true;
            const t = (now - startedAt)/1000;
            if(best == null || t < best){
              best = t;
              uiBest.textContent = fmtBest(best);
              state.best = best;
              save(state);
            }
          }
        }
      }
    }

    // render
    ctx.clearRect(0,0,W,H);

    // background grid / bio veins
    ctx.save();
    ctx.globalAlpha = 0.16;
    for(let y=0;y<H;y+=24){
      ctx.beginPath();
      ctx.moveTo(0,y);
      ctx.lineTo(W,y);
      ctx.strokeStyle = "rgba(231,238,247,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    for(let x=0;x<W;x+=24){
      ctx.beginPath();
      ctx.moveTo(x,0);
      ctx.lineTo(x,H);
      ctx.strokeStyle = "rgba(55,245,197,0.28)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();

    // spores
    for(const s of spores){
      if(s.dead) continue;
      const bob = Math.sin(now*0.004 + s.phase)*3;
      const pulse = (Math.sin(now*0.006 + s.phase)+1)*0.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y + bob, s.r + pulse*2, 0, Math.PI*2);
      ctx.fillStyle = "rgba(55,245,197,0.25)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(181,92,255,0.55)";
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(s.x, s.y + bob, 2.5, 0, Math.PI*2);
      ctx.fillStyle = "rgba(231,238,247,0.75)";
      ctx.fill();
    }

    // player
    ctx.save();
    ctx.translate(player.x, player.y);

    // shadow
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(0, 11, 14, 6, 0, 0, Math.PI*2);
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fill();

    // body
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(0,0, player.r+5, 0, Math.PI*2);
    ctx.fillStyle = "rgba(16,24,37,0.85)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(55,245,197,0.65)";
    ctx.stroke();

    // visor
    ctx.beginPath();
    ctx.roundRect(-9,-6,18,10,5);
    ctx.fillStyle = "rgba(181,92,255,0.22)";
    ctx.fill();
    ctx.strokeStyle = "rgba(231,238,247,0.35)";
    ctx.stroke();

    // core
    ctx.beginPath();
    ctx.arc(0,1, 2.5, 0, Math.PI*2);
    ctx.fillStyle = "rgba(55,245,197,0.95)";
    ctx.fill();
    ctx.restore();

    // hud overlay
    const t = (now - startedAt)/1000;
    uiSpore.textContent = String(collected);
    uiTime.textContent = done ? t.toFixed(1) : t.toFixed(1);

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(16,24,37,0.55)";
    ctx.strokeStyle = "rgba(55,245,197,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(14, 14, 280, 44, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(231,238,247,0.9)";
    ctx.font = "14px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText(`SPORES ${collected}/${goalCount}`, 28, 40);
    ctx.fillStyle = "rgba(184,198,217,0.85)";
    ctx.fillText(`TIME ${t.toFixed(1)}s`, 160, 40);

    if(done){
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0,0,W,H);

      ctx.fillStyle = "rgba(231,238,247,0.95)";
      ctx.font = "28px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText("Extraction réussie.", W/2-140, H/2-20);
      ctx.fillStyle = "rgba(55,245,197,0.95)";
      ctx.font = "16px ui-monospace, Menlo, Consolas, monospace";
      ctx.fillText("R pour relancer • Best sauvegardé", W/2-160, H/2+18);
    }
    ctx.restore();

    requestAnimationFrame(step);
  }

  // polyfill for roundRect on some browsers
  if(!CanvasRenderingContext2D.prototype.roundRect){
    CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){
      const rr = Math.min(r, w/2, h/2);
      this.beginPath();
      this.moveTo(x+rr,y);
      this.arcTo(x+w,y, x+w,y+h, rr);
      this.arcTo(x+w,y+h, x,y+h, rr);
      this.arcTo(x,y+h, x,y, rr);
      this.arcTo(x,y, x+w,y, rr);
      this.closePath();
      return this;
    };
  }

  requestAnimationFrame(step);
})();