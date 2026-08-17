import { BioSFX } from "./shared/sfx.js";
import { AudioBus } from "./shared/audio.js";
import { Progress } from "./shared/progress.js";
(()=>{
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  const uiFrag = document.getElementById("frag");
  const uiHp = document.getElementById("hp");
  const uiDash = document.getElementById("dash");
  const uiScore = document.getElementById("score");
  const uiBest = document.getElementById("best");
  const uiLast = document.getElementById("last");

  const btnRestart = document.getElementById("btnRestart");
  const btnPause = document.getElementById("btnPause");

  const KEY = "bzh_sniky_beta_v1";
  const W = canvas.width, H = canvas.height;

  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp = (a,b,t)=>a+(b-a)*t;
  const dist2 = (ax,ay,bx,by)=>{const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy;};
  const rand = (a,b)=>a+Math.random()*(b-a);

  // Polyfill roundRect if needed
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

  const input = {left:false,right:false,up:false,down:false,dash:false};
  let paused = false;

  function setPaused(v){
    paused = v;
    btnPause.textContent = paused ? "Reprendre (P)" : "Pause (P)";
  }

  window.addEventListener("keydown",(e)=>{
    const k = e.key;
    if(["ArrowLeft","a","A"].includes(k)) input.left=true;
    if(["ArrowRight","d","D"].includes(k)) input.right=true;
    if(["ArrowUp","w","W"].includes(k)) input.up=true;
    if(["ArrowDown","s","S"].includes(k)) input.down=true;
    if(k === "Shift") input.dash=true;
    if(k === "p" || k === "P") setPaused(!paused);
    if(k === "r" || k === "R") restart();
  }, {passive:true});
  window.addEventListener("keyup",(e)=>{
    const k = e.key;
    if(["ArrowLeft","a","A"].includes(k)) input.left=false;
    if(["ArrowRight","d","D"].includes(k)) input.right=false;
    if(["ArrowUp","w","W"].includes(k)) input.up=false;
    if(["ArrowDown","s","S"].includes(k)) input.down=false;
    if(k === "Shift") input.dash=false;
  }, {passive:true});

  btnRestart.addEventListener("click", restart);
  btnPause.addEventListener("click", ()=> setPaused(!paused));

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  }
  function save(s){
    try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch{}
  }

  const store = load();
  let bestScore = Number.isFinite(store.bestScore) ? store.bestScore : null;
  const fmt = (v)=> v==null ? "—" : String(v);
  uiBest.textContent = fmt(bestScore);

  // Level layout (organic walls) as rectangles (x,y,w,h)
  const walls = [
    {x: 170, y: 120, w: 120, h: 40},
    {x: 350, y: 90,  w: 70,  h: 170},
    {x: 530, y: 140, w: 150, h: 40},
    {x: 660, y: 250, w: 60,  h: 180},
    {x: 240, y: 310, w: 180, h: 55},
    {x: 80,  y: 220, w: 70,  h: 170},
    {x: 420, y: 410, w: 150, h: 50},
  ];

  function circleRectCollide(cx,cy,cr, r){
    const x = clamp(cx, r.x, r.x+r.w);
    const y = clamp(cy, r.y, r.y+r.h);
    return dist2(cx,cy,x,y) < cr*cr;
  }

  function resolveWalls(p){
    for(const r of walls){
      if(!circleRectCollide(p.x,p.y,p.r, r)) continue;
      // push out along smallest penetration axis (approx)
      const nearestX = clamp(p.x, r.x, r.x+r.w);
      const nearestY = clamp(p.y, r.y, r.y+r.h);
      let dx = p.x - nearestX;
      let dy = p.y - nearestY;
      const d = Math.hypot(dx,dy) || 0.0001;
      const push = (p.r - d) + 0.4;
      dx /= d; dy /= d;
      p.x += dx*push;
      p.y += dy*push;
    }
    p.x = clamp(p.x, 18, W-18);
    p.y = clamp(p.y, 18, H-18);
  }

  // Simple ray occlusion: sample along ray against walls (coarse but ok for beta)
  function rayBlocked(ax,ay,bx,by){
    const steps = 18;
    for(let i=1;i<=steps;i++){
      const t = i/steps;
      const x = lerp(ax,bx,t);
      const y = lerp(ay,by,t);
      for(const r of walls){
        if(x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h) return true;
      }
    }
    return false;
  }

  // Entities
  const player = {
    x: 90, y: 450, r: 10,
    speed: 220,
    hp: 3,
    invuln: 0,
    dashCd: 0,
    dashTime: 0,
    facing: {x:0, y:-1},
  };

  const goalCount = 9;
  let frags = [];

  function genFrags(){
    frags = [];
    const tries = 4000;
    while(frags.length < goalCount && frags.length < tries){
      const x = rand(60, W-60);
      const y = rand(60, H-90);
      const f = {x,y,r:10, phase: rand(0,Math.PI*2), dead:false};
      let ok = true;
      for(const w of walls){
        if(x>=w.x-18 && x<=w.x+w.w+18 && y>=w.y-18 && y<=w.y+w.h+18) { ok=false; break; }
      }
      if(ok) frags.push(f);
    }
  }

  // Drones with patrol paths
  const drones = [
    {x: 220, y: 190, r: 10, speed: 90, a: 0, fov: Math.PI*0.65, range: 240, wp: [{x:220,y:190},{x:520,y:190},{x:520,y:300},{x:220,y:300}], i:0},
    {x: 780, y: 120, r: 10, speed: 110, a: Math.PI/2, fov: Math.PI*0.55, range: 220, wp: [{x:780,y:120},{x:820,y:420},{x:700,y:420},{x:700,y:160}], i:0},
    {x: 120, y: 120, r: 10, speed: 80, a: 0, fov: Math.PI*0.75, range: 200, wp: [{x:120,y:120},{x:140,y:420},{x:160,y:140}], i:0},
  ];

  let collected = 0;
  let startedAt = performance.now();
  let done = false;
  let lastRunScore = null;

  function restart(){
    setPaused(false);
    player.x = 90; player.y = 450;
    player.hp = 3;
    player.invuln = 0;
    player.dashCd = 0;
    player.dashTime = 0;
    player.facing.x = 0; player.facing.y = -1;

    for(const d of drones){ d.i = 0; d.x = d.wp[0].x; d.y = d.wp[0].y; }

    collected = 0;
    done = false;
    startedAt = performance.now();
    genFrags();
    uiLast.textContent = "—";
  }

  restart();

  function computeScore(now){
    const t = (now-startedAt)/1000;
    const timeBonus = Math.max(0, Math.floor(800 - t*12));
    const hpBonus = player.hp * 140;
    return collected*180 + timeBonus + hpBonus;
  }

  let last = performance.now();
  function step(now){
    const dt = Math.min(0.033, (now-last)/1000);
    last = now;

    if(!paused){
      // Update player
      if(player.invuln > 0) player.invuln = Math.max(0, player.invuln - dt);
      if(player.dashCd > 0) player.dashCd = Math.max(0, player.dashCd - dt);
      if(player.dashTime > 0) player.dashTime = Math.max(0, player.dashTime - dt);

      let vx = (input.right?1:0) - (input.left?1:0);
      let vy = (input.down?1:0) - (input.up?1:0);
      const mag = Math.hypot(vx,vy);

      if(mag > 0.01){
        vx /= mag; vy /= mag;
        player.facing.x = vx; player.facing.y = vy;
      }else{
        vx = 0; vy = 0;
      }

      const wantDash = input.dash && player.dashCd <= 0 && mag > 0.01 && player.dashTime <= 0;
      if(wantDash){
        player.dashTime = 0.10;  // active burst
        player.dashCd = 0.90;    // cooldown
      }

      const speed = player.dashTime > 0 ? 520 : player.speed;
      player.x += vx*speed*dt;
      player.y += vy*speed*dt;
      resolveWalls(player);

      // Collect frags
      for(const f of frags){
        if(f.dead) continue;
        if(dist2(player.x,player.y,f.x,f.y) < (player.r+f.r)*(player.r+f.r)){
          f.dead = true;
          collected++;
          if(collected >= goalCount) done = true;
        }
      }

      // Update drones
      for(const d of drones){
        const target = d.wp[d.i];
        const dx = target.x - d.x;
        const dy = target.y - d.y;
        const dd = Math.hypot(dx,dy);
        if(dd < 6){
          d.i = (d.i + 1) % d.wp.length;
        }else{
          const nx = dx/dd, ny = dy/dd;
          d.x += nx*d.speed*dt;
          d.y += ny*d.speed*dt;
          // face movement
          d.a = Math.atan2(ny,nx);
        }

        // Detection
        if(!done && player.invuln <= 0){
          const px = player.x - d.x;
          const py = player.y - d.y;
          const pd = Math.hypot(px,py);
          if(pd < d.range){
            const pa = Math.atan2(py,px);
            let da = pa - d.a;
            while(da > Math.PI) da -= Math.PI*2;
            while(da < -Math.PI) da += Math.PI*2;
            const inCone = Math.abs(da) < d.fov*0.5;
            if(inCone && !rayBlocked(d.x,d.y, player.x, player.y)){
              // Hit
              player.hp -= 1;
              player.invuln = 1.1;
              // knockback / reset
              player.x = 90; player.y = 450;
              if(player.hp <= 0){
                done = true; // end as failure
              }
            }
          }
        }
      }
    }

    // Render
    ctx.clearRect(0,0,W,H);

    // bio grid background
    ctx.save();
    ctx.globalAlpha = 0.12;
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
      ctx.strokeStyle = "rgba(55,245,197,0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();

    // walls (organic slabs)
    for(const r of walls){
      ctx.save();
      ctx.fillStyle = "rgba(16,24,37,0.68)";
      ctx.strokeStyle = "rgba(195,138,61,0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(r.x,r.y,r.w,r.h, 18);
      ctx.fill();
      ctx.stroke();

      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "rgba(55,245,197,0.35)";
      ctx.beginPath();
      ctx.moveTo(r.x+12, r.y+r.h*0.35);
      ctx.bezierCurveTo(r.x+r.w*0.35, r.y+4, r.x+r.w*0.65, r.y+r.h-4, r.x+r.w-12, r.y+r.h*0.65);
      ctx.stroke();
      ctx.restore();
    }

    // frags
    for(const f of frags){
      if(f.dead) continue;
      const bob = Math.sin(last*0.004 + f.phase)*3;
      const pulse = (Math.sin(last*0.006 + f.phase)+1)*0.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y + bob, f.r + pulse*2, 0, Math.PI*2);
      ctx.fillStyle = "rgba(55,245,197,0.22)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(181,92,255,0.55)";
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(f.x, f.y + bob, 2.4, 0, Math.PI*2);
      ctx.fillStyle = "rgba(231,238,247,0.78)";
      ctx.fill();
    }

    // drones + cones
    for(const d of drones){
      // cone
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.moveTo(d.x,d.y);
      const a0 = d.a - d.fov*0.5;
      const a1 = d.a + d.fov*0.5;
      ctx.arc(d.x,d.y, d.range, a0, a1);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,77,109,0.85)";
      ctx.fill();
      ctx.restore();

      // body
      ctx.save();
      ctx.translate(d.x,d.y);
      ctx.rotate(d.a);

      ctx.beginPath();
      ctx.arc(0,0,d.r+4, 0, Math.PI*2);
      ctx.fillStyle = "rgba(16,24,37,0.88)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,77,109,0.55)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // eye
      ctx.beginPath();
      ctx.roundRect(2,-5, 12, 10, 5);
      ctx.fillStyle = "rgba(255,77,109,0.18)";
      ctx.fill();
      ctx.strokeStyle = "rgba(231,238,247,0.28)";
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(10,0,2.6,0,Math.PI*2);
      ctx.fillStyle = "rgba(255,77,109,0.95)";
      ctx.fill();

      ctx.restore();
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
    ctx.strokeStyle = player.invuln>0 ? "rgba(255,77,109,0.75)" : "rgba(55,245,197,0.65)";
    ctx.stroke();

    // visor (face direction)
    const fa = Math.atan2(player.facing.y, player.facing.x);
    ctx.rotate(fa);
    ctx.beginPath();
    ctx.roundRect(0,-6, 18, 10, 5);
    ctx.fillStyle = "rgba(181,92,255,0.20)";
    ctx.fill();
    ctx.strokeStyle = "rgba(231,238,247,0.33)";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(14,0, 2.2, 0, Math.PI*2);
    ctx.fillStyle = "rgba(55,245,197,0.95)";
    ctx.fill();

    ctx.restore();

    // Overlay HUD
    const t = (performance.now() - startedAt)/1000;
    const score = computeScore(performance.now());
    uiFrag.textContent = String(collected);
    uiHp.textContent = String(player.hp);
    uiScore.textContent = String(score);
    uiDash.textContent = (player.dashCd <= 0) ? "OK" : `${player.dashCd.toFixed(1)}s`;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(16,24,37,0.55)";
    ctx.strokeStyle = "rgba(55,245,197,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(14, 14, 420, 44, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(231,238,247,0.9)";
    ctx.font = "14px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText(`FRAG ${collected}/${goalCount}`, 28, 40);
    ctx.fillStyle = "rgba(184,198,217,0.85)";
    ctx.fillText(`HP ${player.hp}`, 150, 40);
    ctx.fillText(`TIME ${t.toFixed(1)}s`, 210, 40);
    ctx.fillStyle = "rgba(55,245,197,0.95)";
    ctx.fillText(`SCORE ${score}`, 320, 40);
    ctx.restore();

    // End screens
    if(done){
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0,0,W,H);

      const success = collected >= goalCount && player.hp > 0;
      const finalScore = success ? computeScore(performance.now()) : Math.floor(score*0.35);

      ctx.fillStyle = "rgba(231,238,247,0.95)";
      ctx.font = "28px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(success ? "Extraction réussie." : "Capture : protocole interrompu.", W/2 - (success?150:220), H/2 - 26);

      ctx.fillStyle = success ? "rgba(55,245,197,0.95)" : "rgba(255,77,109,0.95)";
      ctx.font = "16px ui-monospace, Menlo, Consolas, monospace";
      ctx.fillText(`Score: ${finalScore}   •   R pour relancer`, W/2 - 170, H/2 + 12);

      // persist best
      if(success){
        lastRunScore = finalScore;
        uiLast.textContent = String(finalScore);
        if(bestScore == null || finalScore > bestScore){
          bestScore = finalScore;
          store.bestScore = bestScore;
          save(store);
          uiBest.textContent = String(bestScore);
        }
      }else{
        uiLast.textContent = "FAIL";
      }

      if(paused) setPaused(false);
      ctx.restore();
    }

    if(paused){
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = "rgba(231,238,247,0.95)";
      ctx.font = "24px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText("Pause", W/2 - 34, H/2 - 10);
      ctx.fillStyle = "rgba(184,198,217,0.9)";
      ctx.font = "14px ui-monospace, Menlo, Consolas, monospace";
      ctx.fillText("P pour reprendre", W/2 - 70, H/2 + 18);
      ctx.restore();
    }

    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
})();

// --- BioArcade hooks (auto-detected) ---
(function(){
  // If the game dispatches custom events, wire them.
  window.addEventListener("sniky:pickup", ()=>BioSFX.play("pickup"));
  window.addEventListener("sniky:alert", ()=>BioSFX.play("alert"));
  window.addEventListener("sniky:blip", ()=>BioSFX.play("blip"));
  window.addEventListener("sniky:success", ()=>{
    BioSFX.play("success");
    Progress.unlock("Sniky_BETA_CLEARED");
  });
})();
