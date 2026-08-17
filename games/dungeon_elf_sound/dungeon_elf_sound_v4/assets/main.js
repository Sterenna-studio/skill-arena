import { setupCanvas } from './canvas.js';
import { cacheDom, refreshHud, renderSpellbook, bindSpellSelection, showVillage } from './ui.js';
import { bindControls } from './controls.js';
import { selectSpell } from './battle.js';

function boot() {
  cacheDom();
  refreshHud();
  renderSpellbook();
  bindSpellSelection(selectSpell);
  showVillage();
  bindControls();
  setupCanvas();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
