(function(){
'use strict';

const dungeonVfx=new CanvasVFXEngine({
  maxActive:900,
  maxPool:1000,
  emissionRate:1,
  quality:1,
  glow:1,
});
window.dungeonVfx=dungeonVfx;

function casterPosition(){
  const center=arcCenter();
  return {x:center.cx,y:center.cy+arcRadius()*.05};
}

hitFx=function(x,y,c1,c2){
  dungeonVfx.hit(combat.particles,{x,y,color:c1,accent:c2});
};

spellFx=function(x,y,col,dmg,runeId='circle'){
  const source=casterPosition();
  const target=(runeId==='square'||dmg<0)?source:{x,y};
  dungeonVfx.cast(combat.particles,{
    id:runeId,
    source,
    target,
    color:col,
    dmg,
    superCharged:combat.superCharged,
  });
};

dotFx=function(x,y,col,dmg){
  dungeonVfx.dot(combat.particles,{x,y,color:col,dmg});
};

updParts=function(arr,dt){
  dungeonVfx.update(arr,dt);
};

drawParts=function(arr){
  dungeonVfx.draw(ctx,arr);
};

// Keep the gameplay rules untouched while routing every recognized rune through
// its own procedural preset. Healing and shield runes now get visual feedback too.
applyRuneResults=function(results){
  if(!results.length){
    SFX.runeFail();
    showRuneResults([{name:'Aucune rune',color:'#e74c3c',dmg:0}]);
    return;
  }
  const e=combat.curEnemy;
  results.forEach(rune=>{
    SFX.runeSound(rune.id);
    setTimeout(()=>playCastVoice(rune.id,customCastSounds[rune.id]),180);
    const mirror=sData().mod?.mirror?2:1;
    const dmg=rune.dmg<0?rune.dmg:Math.round(rune.dmg*player.power*mirror);

    if(dmg<0){
      player.hp=Math.min(maxHp(),player.hp+Math.abs(dmg));
      updateHUD();
      spellFx(0,0,rune.color,dmg,rune.id);
    }else if(e&&!e.dead){
      e.curHp=Math.max(0,e.curHp-dmg);
      spellFx(e.x,e.y,rune.color,dmg,rune.id);
      combat.shake={x:0,y:0,t:.4};
      combat.flash={col:rune.color,a:.4};
      combat.enemyHurt=.5;
      const dot=sData().mod?.dot;
      if(dot)applyStatus(dot);
    }

    if(!player.knownRunes.has(rune.id)){
      player.knownRunes.add(rune.id);
      SFX.levelUp();
      notify(`✦ Rune découverte : ${rune.name} !`,'#f1c40f');
    }
  });
  SFX.runeSuccess();
  showRuneResults(results);
  const e2=combat.curEnemy;
  if(e2&&e2.curHp<=0)killEnemy(e2);
};
})();
