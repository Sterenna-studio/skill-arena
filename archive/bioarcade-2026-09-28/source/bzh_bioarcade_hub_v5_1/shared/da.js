const LS_KEY = "bioarcade_da_v1";
export const DAS = [
  { id:"SYNTHWAVE", name:"OutRun / Synthwave", desc:"Neon grid, sunset vibes, smooth CRT." },
  { id:"NEOGEO", name:"NeoGeo / 90s Arcade", desc:"High contrast, brutal menus, pixel punch." },
  { id:"BIOPUNK", name:"Metal / Cyber-Biopunk", desc:"Living tech, dark metal, organic glow." },
];
export function getCurrentDA(){
  try{ const raw=localStorage.getItem(LS_KEY); if(!raw) return "SYNTHWAVE";
    const o=JSON.parse(raw); if(o&&typeof o.id==="string") return o.id;
  }catch(e){}
  return "SYNTHWAVE";
}
export function setCurrentDA(id){
  try{ localStorage.setItem(LS_KEY, JSON.stringify({id})); }catch(e){}
  applyDA(id);
  window.dispatchEvent(new CustomEvent("bio:da",{detail:{id}}));
}
export function applyDA(id=getCurrentDA()){
  document.documentElement.dataset.da = id;
}
