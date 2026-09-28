export async function loadGames(){
  try{
    const res=await fetch('./games/manifest.json',{cache:'no-store'});
    if(res.ok){
      const d=await res.json();
      if(Array.isArray(d)) return d;
      if(d && Array.isArray(d.games)) return d.games;
    }
  }catch(e){}
  return [];
}
