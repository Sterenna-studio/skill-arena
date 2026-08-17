import { Progress } from "./progress.js";
const LS_KEY="bioarcade_skin_v1";
const SKINS=[
 {id:"DEFAULT",name:"Default BioPunk",desc:"Baseline organic-tech look.",requires:null},
 {id:"GLYPH_VIOLET",name:"Glyph Violet",desc:"Runic HUD glow + violet pulses.",requires:"Sniky_BETA_CLEARED"},
 {id:"RUST_COPPER",name:"Rust Copper",desc:"Warm copper haze + brass lines.",requires:"TANKGAME_V1_CLEARED"},
];
export function getSkins(){return SKINS.slice();}
export function getCurrentSkin(){try{const r=localStorage.getItem(LS_KEY);if(!r)return"DEFAULT";const o=JSON.parse(r);if(o&&typeof o.id==="string")return o.id;}catch(e){}return"DEFAULT";}
export function setCurrentSkin(id){try{localStorage.setItem(LS_KEY,JSON.stringify({id}));}catch(e){}applySkinToDocument(id);window.dispatchEvent(new CustomEvent("bio:skin",{detail:{id}}));}
export function isSkinUnlocked(s){if(!s.requires)return true;return Progress.isUnlocked(s.requires);}
export function applySkinToDocument(id=getCurrentSkin()){
 const r=document.documentElement;r.dataset.skin=id;
 const vars={DEFAULT:{},GLYPH_VIOLET:{"--fxGlow":"0 0 18px rgba(180,120,255,.35), 0 0 40px rgba(120,80,255,.18)"},RUST_COPPER:{"--fxGlow":"0 0 18px rgba(210,150,90,.28), 0 0 40px rgba(160,110,60,.18)"}};
 r.style.removeProperty("--fxGlow");
 for(const [k,v] of Object.entries(vars[id]||{})) r.style.setProperty(k,v);
}
export function resetSkin(){setCurrentSkin("DEFAULT");}
