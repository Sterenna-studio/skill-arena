// shared/progress.js
// Unlocks / achievements for BioArcade Hub
//
// Storage schema (localStorage key "bioarcade_progress_v1"):
// { unlocks: { [id]: { at: ISOString, meta?: any } } }

const LS_KEY = "bioarcade_progress_v1";

function _load(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return { unlocks: {} };
    const obj = JSON.parse(raw);
    if(!obj || typeof obj !== "object") return { unlocks: {} };
    if(!obj.unlocks || typeof obj.unlocks !== "object") obj.unlocks = {};
    return obj;
  }catch(e){
    return { unlocks: {} };
  }
}
function _save(state){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch(e){}
}

export const Progress = {
  get(){
    return _load();
  },
  isUnlocked(id){
    const s = _load();
    return !!s.unlocks[id];
  },
  unlock(id, meta=null){
    const s = _load();
    if(!s.unlocks[id]){
      s.unlocks[id] = { at: new Date().toISOString(), meta };
      _save(s);
      window.dispatchEvent(new CustomEvent("bioarcade:unlock", { detail: { id, data: s.unlocks[id] } }));
    }
  },
  reset(){
    _save({ unlocks: {} });
    window.dispatchEvent(new CustomEvent("bioarcade:unlock", { detail: { id: "__reset__" } }));
  }
};
