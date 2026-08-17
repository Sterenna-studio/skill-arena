import { setupCanvas } from './canvas.js';
import { cacheDom, refreshHud, showVillage } from './ui.js';
import { bindControls } from './controls.js';

function boot() {
  cacheDom();
  refreshHud();
  showVillage();
  bindControls();
  setupCanvas();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
