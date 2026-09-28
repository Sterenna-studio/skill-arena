// shared/sfx.js
// Small helper to trigger standardized SFX events from any game/hub page.
//
// - Programmatic: BioSFX.play("pickup")
// - Declarative: add `data-sfx` to clickable/hoverable elements

export const BioSFX = {
  play(kind="blip"){
    window.dispatchEvent(new CustomEvent("bio:sfx", { detail: { kind }}));
  }
};

// Auto UI blips for elements that declare data-sfx
document.addEventListener("pointerenter", (ev) => {
  const el = ev.target?.closest?.("[data-sfx]");
  if(el) BioSFX.play(el.getAttribute("data-sfx") || "blip");
}, true);

document.addEventListener("click", (ev) => {
  const el = ev.target?.closest?.("[data-sfx-click]");
  if(el) BioSFX.play(el.getAttribute("data-sfx-click") || "blip");
}, true);
