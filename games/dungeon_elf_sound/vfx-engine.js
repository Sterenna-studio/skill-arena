(function(){
'use strict';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const TAU=Math.PI*2;
const DEFAULT_SETTINGS={
  emissionRate:1,
  maxActive:900,
  maxPool:1000,
  gravity:210,
  glow:1,
  quality:1,
};

class RateEmitter{
  constructor(rate=30){this.rate=rate;this.accumulator=0;}
  tick(dt,rate=this.rate,scale=1){
    this.accumulator+=Math.max(0,rate)*Math.max(0,scale)*dt;
    const count=Math.min(160,Math.floor(this.accumulator));
    this.accumulator-=count;
    return count;
  }
  reset(){this.accumulator=0;}
}

class CanvasVFXEngine{
  constructor(settings={}){
    this.settings=Object.assign({},DEFAULT_SETTINGS,settings);
    this.pool=[];
    this.seed=1;
  }

  clear(arr){
    if(!arr)return;
    while(arr.length)this._release(arr.pop());
  }

  _release(p){
    if(p&&this.pool.length<this.settings.maxPool)this.pool.push(p);
  }

  _alloc(){return this.pool.pop()||{};}

  _spawn(arr,type,o={}){
    if(!arr)return null;
    while(arr.length>=this.settings.maxActive)this._release(arr.shift());
    const p=this._alloc();
    p.type=type;
    p.x=o.x||0;p.y=o.y||0;
    p.x2=o.x2||0;p.y2=o.y2||0;
    p.vx=o.vx||0;p.vy=o.vy||0;
    p.gravity=o.gravity===undefined?0:o.gravity;
    p.drag=o.drag===undefined?0:o.drag;
    p.age=-(o.delay||0);p.life=Math.max(.01,o.life||1);
    p.size=o.size===undefined?4:o.size;
    p.size2=o.size2===undefined?p.size:o.size2;
    p.sizeVel=o.sizeVel||0;
    p.r=o.r||0;p.rg=o.rg||0;
    p.color=o.color||'#fff';p.color2=o.color2||p.color;
    p.alpha=o.alpha===undefined?1:o.alpha;
    p.spin=o.spin||0;p.rotation=o.rotation||0;
    p.seed=o.seed===undefined?this.seed++:o.seed;
    p.width=o.width||2;p.length=o.length||12;
    p.shape=o.shape||'';p.txt=o.txt||'';
    p.fadeIn=o.fadeIn===undefined?.06:o.fadeIn;
    p.fadeOut=o.fadeOut===undefined?.45:o.fadeOut;
    p.additive=o.additive!==false;
    p.emitter=o.emitter||'';p.rate=o.rate||0;p.emitAcc=0;
    p.meta=o.meta||null;
    arr.push(p);
    return p;
  }

  _rand(seed){
    const x=Math.sin(seed*12.9898+78.233)*43758.5453;
    return x-Math.floor(x);
  }

  _alpha(p){
    if(p.age<0)return 0;
    const t=clamp(p.age/p.life,0,1);
    const fi=Math.max(.0001,p.fadeIn),fo=Math.max(.0001,p.fadeOut);
    const aIn=clamp(t/fi,0,1);
    const aOut=clamp((1-t)/fo,0,1);
    return p.alpha*Math.min(aIn,aOut);
  }

  update(arr,dt){
    if(!arr||!arr.length)return;
    dt=clamp(dt,0,.05);
    const initial=arr.length;
    for(let i=0;i<initial;i++){
      const p=arr[i];if(!p)continue;
      p.age+=dt;
      if(p.age<0)continue;
      if(p.emitter)this._updateEmitter(p,arr,dt);
      if(p.type!=='emitter'){
        p.x+=p.vx*dt;p.y+=p.vy*dt;
        if(p.gravity)p.vy+=p.gravity*dt;
        if(p.drag){const d=Math.exp(-p.drag*dt);p.vx*=d;p.vy*=d;}
        if(p.sizeVel)p.size=Math.max(0,p.size+p.sizeVel*dt);
        if(p.rg)p.r+=p.rg*dt;
        if(p.spin)p.rotation+=p.spin*dt;
      }
    }
    for(let i=arr.length-1;i>=0;i--){
      const p=arr[i];
      if(!p||p.age>=p.life){arr.splice(i,1);this._release(p);}
    }
  }

  _emitCount(p,dt){
    p.emitAcc+=p.rate*this.settings.emissionRate*this.settings.quality*dt;
    const count=Math.min(120,Math.floor(p.emitAcc));
    p.emitAcc-=count;
    return count;
  }

  _updateEmitter(p,arr,dt){
    const n=this._emitCount(p,dt);if(!n)return;
    if(p.emitter==='vortex'){
      for(let i=0;i<n;i++){
        const a=Math.random()*TAU,r=24+Math.random()*58;
        const tangent=a+Math.PI/2;
        this._spawn(arr,'mote',{x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.55,
          vx:Math.cos(tangent)*(70+Math.random()*70),vy:Math.sin(tangent)*(38+Math.random()*42)-10,
          drag:1.1,life:.55+Math.random()*.45,size:1.5+Math.random()*3,color:p.color,color2:'#ffffff'});
      }
    }else if(p.emitter==='embers'){
      for(let i=0;i<n;i++){
        const a=Math.random()*TAU,s=35+Math.random()*95;
        this._spawn(arr,'spark',{x:p.x+(Math.random()-.5)*22,y:p.y+(Math.random()-.5)*16,
          vx:Math.cos(a)*s,vy:Math.sin(a)*s-40,gravity:-28,drag:1.4,life:.45+Math.random()*.45,
          size:2+Math.random()*3,length:8+Math.random()*10,color:p.color,color2:'#ffe6a0'});
      }
    }else if(p.emitter==='heal'){
      for(let i=0;i<n;i++){
        const a=Math.random()*TAU,r=18+Math.random()*38;
        this._spawn(arr,'mote',{x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.6,
          vx:(Math.random()-.5)*12,vy:-45-Math.random()*45,drag:1.3,life:.7+Math.random()*.5,
          size:2+Math.random()*3,color:p.color,color2:'#ffffff'});
      }
    }
  }

  burst(arr,{x,y,color='#fff',color2='#fff',count=24,speed=240,size=4,life=.75,gravity=90,shape='spark'}){
    count=Math.round(count*this.settings.quality);
    for(let i=0;i<count;i++){
      const a=Math.random()*TAU,s=speed*(.45+Math.random()*.75);
      this._spawn(arr,shape,{x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,gravity,drag:.45,
        life:life*(.7+Math.random()*.5),size:size*(.65+Math.random()*.8),length:8+Math.random()*16,
        spin:(Math.random()-.5)*8,color:Math.random()<.72?color:color2,color2});
    }
  }

  ring(arr,o){return this._spawn(arr,'ring',Object.assign({life:.65,r:8,rg:95,width:2},o));}
  glow(arr,o){return this._spawn(arr,'glow',Object.assign({life:.45,size:60},o));}
  glyph(arr,o){return this._spawn(arr,'glyph',Object.assign({life:.85,size:48,width:2},o));}
  bolt(arr,o){return this._spawn(arr,'bolt',Object.assign({life:.32,width:3},o));}
  text(arr,o){return this._spawn(arr,'txt',Object.assign({life:1.15,size:18,vy:-38,drag:2.2},o));}

  hit(arr,{x,y,color='#fff',accent='#fff'}){
    this.glow(arr,{x,y,color,size:24,life:.22,alpha:.65});
    this.burst(arr,{x,y,color,color2:accent,count:10,speed:160,size:2.5,life:.42,gravity:120});
  }

  dot(arr,{x,y,color='#fff',dmg=0}){
    this.burst(arr,{x:x+(Math.random()-.5)*8,y:y+(Math.random()-.5)*6,color,color2:'#ffffff',count:5,speed:70,size:2.2,life:.5,gravity:-35,shape:'mote'});
    if(dmg>0)this.text(arr,{x,y:y-26,color,txt:`-${dmg}`,size:13,life:.9});
  }

  cast(arr,{id='circle',source,target,color='#fff',dmg=0,superCharged=false}){
    const sx=source.x,sy=source.y,tx=target.x,ty=target.y;
    const power=superCharged?1.22:1;
    switch(id){
      case 'circle':{
        this.glow(arr,{x:tx,y:ty,color,size:88*power,life:.48,alpha:.78});
        [0,.08,.16].forEach((d,i)=>this.ring(arr,{x:tx,y:ty,color,delay:d,r:10+i*5,rg:150-i*16,life:.62+i*.08,width:2.5-i*.35}));
        this.burst(arr,{x:tx,y:ty,color,color2:'#ffe29a',count:34,speed:250,size:4.2,life:.75,gravity:110});
        this._spawn(arr,'emitter',{x:tx,y:ty,color,life:.55,emitter:'embers',rate:62});
        break;
      }
      case 'square':{
        this.glow(arr,{x:sx,y:sy,color,size:72,life:.8,alpha:.42});
        this.glyph(arr,{x:sx,y:sy,color,shape:'square',size:56,life:1.0,width:3,spin:1.2});
        this.glyph(arr,{x:sx,y:sy,color:'#ffffff',shape:'square',size:40,life:.78,width:1.4,spin:-1.6,delay:.08});
        for(let i=0;i<12;i++){
          const a=i/12*TAU,r=46;
          this._spawn(arr,'shard',{x:sx+Math.cos(a)*r,y:sy+Math.sin(a)*r*.55,
            vx:Math.cos(a)*35,vy:Math.sin(a)*18-18,gravity:-8,drag:1.4,life:.9,size:5+Math.random()*4,
            spin:(Math.random()-.5)*8,color,color2:'#ffffff'});
        }
        break;
      }
      case 'triangle':{
        this.bolt(arr,{x:sx,y:sy,x2:tx,y2:ty,color,color2:'#ffffff',life:.38,width:4});
        this.bolt(arr,{x:sx,y:sy,x2:tx,y2:ty,color:'#ffffff',life:.2,width:1.5,delay:.03,seed:this.seed+31});
        this.glyph(arr,{x:tx,y:ty,color,shape:'triangle',size:42,life:.5,width:2.5,spin:2.2});
        this.glow(arr,{x:tx,y:ty,color,size:52,life:.34,alpha:.8});
        this.burst(arr,{x:tx,y:ty,color,color2:'#ffffff',count:20,speed:220,size:2.6,life:.5,gravity:150});
        break;
      }
      case 'v':{
        for(let i=0;i<3;i++)this.bolt(arr,{x:tx+(i-1)*18,y:ty-190-Math.random()*50,x2:tx+(i-1)*7,y2:ty,color,color2:'#fff',delay:i*.045,life:.28,width:5-i});
        this.glow(arr,{x:tx,y:ty,color,size:76,life:.5,alpha:.7,delay:.08});
        [0,.08].forEach((d,i)=>this.ring(arr,{x:tx,y:ty,color,delay:.08+d,r:8,rg:180-i*40,life:.58,width:3-i}));
        this.burst(arr,{x:tx,y:ty,color,color2:'#d7b38b',count:28,speed:270,size:5,life:.78,gravity:270,shape:'shard'});
        break;
      }
      case 'zigzag':{
        for(let i=0;i<5;i++){
          const ox=(Math.random()-.5)*110,oy=(Math.random()-.5)*55;
          this.bolt(arr,{x:sx,y:sy,x2:tx+ox,y2:ty+oy,color,color2:'#ffffff',delay:i*.075,life:.28,width:2.5+Math.random()*2});
          this.ring(arr,{x:tx+ox,y:ty+oy,color,delay:i*.075,r:4,rg:80,life:.38,width:1.5});
        }
        this.glow(arr,{x:tx,y:ty,color,size:82,life:.7,alpha:.42});
        this.burst(arr,{x:tx,y:ty,color,color2:'#20153f',count:24,speed:170,size:3.4,life:.7,gravity:-25,shape:'mote'});
        break;
      }
      case 'spiral':{
        this._spawn(arr,'spiral',{x:tx,y:ty,color,color2:'#ffffff',life:1.05,size:72,width:3,spin:5.2});
        this.ring(arr,{x:tx,y:ty,color,r:18,rg:80,life:.8,width:2});
        this.glow(arr,{x:tx,y:ty,color,size:92,life:.9,alpha:.45});
        this._spawn(arr,'emitter',{x:tx,y:ty,color,life:.9,emitter:'vortex',rate:78});
        break;
      }
      case 'cross':{
        this.glow(arr,{x:sx,y:sy,color,size:82,life:1.0,alpha:.55});
        this.glyph(arr,{x:sx,y:sy,color,shape:'cross',size:52,life:1.0,width:4});
        [0,.12,.24].forEach((d,i)=>this.ring(arr,{x:sx,y:sy,color,delay:d,r:14,rg:85-i*9,life:.8,width:2}));
        this._spawn(arr,'emitter',{x:sx,y:sy,color,life:1.0,emitter:'heal',rate:48});
        break;
      }
      case 'star':{
        this.bolt(arr,{x:sx,y:sy,x2:tx,y2:ty,color:'#fff7c2',color2:color,life:.28,width:5});
        this._spawn(arr,'star',{x:tx,y:ty,color,color2:'#ffffff',life:.75,size:48,spin:2.4});
        this.glow(arr,{x:tx,y:ty,color,size:110,life:.55,alpha:.88});
        [0,.06,.12].forEach((d,i)=>this.ring(arr,{x:tx,y:ty,color:i===1?'#ffffff':color,delay:d,r:8+i*7,rg:185-i*25,life:.62,width:2.5-i*.4}));
        this.burst(arr,{x:tx,y:ty,color,color2:'#ffffff',count:44,speed:320,size:3.4,life:.78,gravity:40});
        break;
      }
      default:this.burst(arr,{x:tx,y:ty,color,color2:'#ffffff'});
    }
    if(dmg>0)this.text(arr,{x:tx,y:ty-24,color,txt:`-${dmg}`,size:22,life:1.3});
    else if(dmg<0)this.text(arr,{x:sx,y:sy-34,color,txt:`+${Math.abs(dmg)}`,size:20,life:1.25});
  }

  draw(ctx,arr){
    if(!ctx||!arr)return;
    for(const p of arr){
      if(!p||p.age<0||p.type==='emitter')continue;
      const a=this._alpha(p);if(a<=0)continue;
      ctx.save();
      ctx.globalAlpha=a;
      if(p.additive)ctx.globalCompositeOperation='lighter';
      switch(p.type){
        case 'spark':this._drawSpark(ctx,p,a);break;
        case 'mote':this._drawMote(ctx,p,a);break;
        case 'ring':this._drawRing(ctx,p,a);break;
        case 'txt':this._drawText(ctx,p,a);break;
        case 'glow':this._drawGlow(ctx,p,a);break;
        case 'shard':this._drawShard(ctx,p,a);break;
        case 'glyph':this._drawGlyph(ctx,p,a);break;
        case 'bolt':this._drawBolt(ctx,p,a);break;
        case 'spiral':this._drawSpiral(ctx,p,a);break;
        case 'star':this._drawStar(ctx,p,a);break;
      }
      ctx.restore();
    }
  }

  _drawSpark(ctx,p){
    const sp=Math.hypot(p.vx,p.vy)||1,ux=p.vx/sp,uy=p.vy/sp;
    const len=p.length*(.5+clamp(sp/260,0,1));
    ctx.lineCap='round';ctx.shadowBlur=10*this.settings.glow;ctx.shadowColor=p.color;
    ctx.strokeStyle=p.color;ctx.lineWidth=Math.max(1,p.size*.7);
    ctx.beginPath();ctx.moveTo(p.x-ux*len,p.y-uy*len);ctx.lineTo(p.x,p.y);ctx.stroke();
    ctx.strokeStyle=p.color2;ctx.lineWidth=Math.max(.7,p.size*.22);ctx.stroke();
  }

  _drawMote(ctx,p){
    const r=Math.max(.5,p.size),g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*3);
    g.addColorStop(0,p.color2);g.addColorStop(.25,p.color);g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r*3,0,TAU);ctx.fill();
  }

  _drawRing(ctx,p){
    ctx.strokeStyle=p.color;ctx.lineWidth=p.width;ctx.shadowBlur=12*this.settings.glow;ctx.shadowColor=p.color;
    ctx.beginPath();ctx.arc(p.x,p.y,Math.max(0,p.r),0,TAU);ctx.stroke();
  }

  _drawText(ctx,p){
    ctx.globalCompositeOperation='source-over';ctx.font=`bold ${Math.max(8,p.size)}px monospace`;ctx.fillStyle=p.color;ctx.textAlign='center';
    ctx.shadowBlur=12;ctx.shadowColor=p.color;ctx.fillText(p.txt,p.x,p.y);
  }

  _drawGlow(ctx,p){
    const t=clamp(p.age/p.life,0,1),r=p.size*(.55+t*.45);
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
    g.addColorStop(0,p.color+'cc');g.addColorStop(.25,p.color+'55');g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.fill();
  }

  _drawShard(ctx,p){
    ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.fillStyle=p.color;ctx.shadowBlur=8;ctx.shadowColor=p.color2;
    const s=Math.max(1,p.size);ctx.beginPath();ctx.moveTo(0,-s*1.5);ctx.lineTo(s*.65,0);ctx.lineTo(0,s*1.5);ctx.lineTo(-s*.65,0);ctx.closePath();ctx.fill();
    ctx.strokeStyle=p.color2;ctx.lineWidth=.7;ctx.stroke();
  }

  _drawGlyph(ctx,p){
    const t=clamp(p.age/p.life,0,1),s=p.size*(.72+.28*Math.sin(Math.min(1,t)*Math.PI/2));
    ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.strokeStyle=p.color;ctx.lineWidth=p.width;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowBlur=15;ctx.shadowColor=p.color;
    ctx.beginPath();
    if(p.shape==='square')ctx.rect(-s/2,-s/2,s,s);
    else if(p.shape==='triangle'){ctx.moveTo(0,-s*.58);ctx.lineTo(s*.55,s*.45);ctx.lineTo(-s*.55,s*.45);ctx.closePath();}
    else if(p.shape==='cross'){ctx.moveTo(-s*.48,0);ctx.lineTo(s*.48,0);ctx.moveTo(0,-s*.48);ctx.lineTo(0,s*.48);}
    else {ctx.arc(0,0,s*.5,0,TAU);}
    ctx.stroke();
  }

  _drawBolt(ctx,p){
    const dx=p.x2-p.x,dy=p.y2-p.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
    const segs=10;
    const draw=(width,color,offsetSeed)=>{
      ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowBlur=width*3;ctx.shadowColor=p.color;
      ctx.beginPath();ctx.moveTo(p.x,p.y);
      for(let i=1;i<segs;i++){
        const t=i/segs,env=Math.sin(t*Math.PI),j=(this._rand(p.seed+i*17+offsetSeed)-.5)*22*env;
        ctx.lineTo(p.x+dx*t+nx*j,p.y+dy*t+ny*j);
      }
      ctx.lineTo(p.x2,p.y2);ctx.stroke();
    };
    draw(p.width*2.2,p.color,0);draw(Math.max(.8,p.width*.55),p.color2,19);
  }

  _drawSpiral(ctx,p){
    const t=clamp(p.age/p.life,0,1),turns=2.8+t*1.2,maxR=p.size*(.65+.35*t);
    ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.strokeStyle=p.color;ctx.lineWidth=p.width;ctx.lineCap='round';ctx.shadowBlur=14;ctx.shadowColor=p.color;
    ctx.beginPath();
    for(let i=0;i<=54;i++){
      const u=i/54,a=u*TAU*turns,r=4+u*maxR;
      const x=Math.cos(a)*r,y=Math.sin(a)*r*.55;
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();
    ctx.strokeStyle=p.color2;ctx.lineWidth=Math.max(.6,p.width*.28);ctx.stroke();
  }

  _drawStar(ctx,p){
    const t=clamp(p.age/p.life,0,1),s=p.size*(.7+.3*Math.sin(t*Math.PI));
    ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.fillStyle=p.color;ctx.strokeStyle=p.color2;ctx.lineWidth=1.5;ctx.shadowBlur=20;ctx.shadowColor=p.color;
    ctx.beginPath();
    for(let i=0;i<10;i++){
      const a=-Math.PI/2+i*Math.PI/5,r=i%2===0?s:s*.38;
      const x=Math.cos(a)*r,y=Math.sin(a)*r;
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.closePath();ctx.fill();ctx.stroke();
  }
}

window.RateEmitter=RateEmitter;
window.CanvasVFXEngine=CanvasVFXEngine;
window.DUNGEON_VFX_SETTINGS=DEFAULT_SETTINGS;
})();
