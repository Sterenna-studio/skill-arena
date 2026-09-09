/**
 * prefs.js — préférences locales et curseur de Drone Quota.
 *
 * Ce module ne connaît aucune règle de score. Il conserve les choix d'usage
 * et anime le viseur DOM optionnel, afin de laisser `game.js` concentré sur la
 * boucle et `fx.js` sur la couche sensorielle.
 */
window.DQPrefs = (() => {
  'use strict';

  const KEY = 'drone-quota:prefs:v1';
  const DEFAULTS = Object.freeze({
    cursorMode: 'weapon',
    aimResponsiveness: 7,
    audioEnabled: true,
    effectsEnabled: true,
    ambienceEnabled: true,
    masterVolume: 80,
    reducedEffects: false,
    tutorialSeen: false,
  });

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
  }

  function normalize(raw = {}) {
    return {
      cursorMode: raw.cursorMode === 'normal' ? 'normal' : 'weapon',
      aimResponsiveness: clampNumber(raw.aimResponsiveness, 1, 10, DEFAULTS.aimResponsiveness),
      audioEnabled: raw.audioEnabled !== false,
      effectsEnabled: raw.effectsEnabled !== false,
      ambienceEnabled: raw.ambienceEnabled !== false,
      masterVolume: clampNumber(raw.masterVolume, 0, 100, DEFAULTS.masterVolume),
      reducedEffects: raw.reducedEffects === true,
      tutorialSeen: raw.tutorialSeen === true,
    };
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw));
      // Respecte le bouton de sourdine historique au premier passage vers le
      // panneau complet, sans dupliquer ensuite cette source de vérité.
      return normalize({ ...DEFAULTS, audioEnabled: window.localStorage.getItem('drone-quota:mute:v1') !== '1' });
    } catch {
      return normalize(DEFAULTS);
    }
  }

  let state = load();
  const listeners = new Set();

  function persist() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch { /* navigation privée : les réglages restent valables pour l'onglet */ }
  }

  function get() {
    return { ...state };
  }

  function set(patch) {
    state = normalize({ ...state, ...patch });
    persist();
    listeners.forEach(listener => listener(get()));
    return get();
  }

  function reset() {
    // « Réglages par défaut » ne doit pas réarmer le tutoriel : celui-ci a son
    // propre bouton de rappel et ne fait pas partie des options audiovisuelles.
    state = normalize({ ...DEFAULTS, tutorialSeen: state.tutorialSeen });
    persist();
    listeners.forEach(listener => listener(get()));
    return get();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  let cursor = null;
  let cursorFrame = null;
  let cursorVisible = false;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let cursorPrimed = false;

  const finePointer = () => window.matchMedia?.('(pointer: fine)').matches !== false;

  function paintCursorMode() {
    const weapon = state.cursorMode === 'weapon' && finePointer();
    document.body.classList.toggle('cursor-weapon', weapon);
    if (!weapon) hideCursor();
  }

  function hideCursor() {
    cursorVisible = false;
    document.body.classList.remove('weapon-cursor-live');
    if (cursor) cursor.hidden = true;
  }

  function animateCursor() {
    cursorFrame = null;
    if (!cursor || !cursorVisible) return;
    const response = 0.11 + state.aimResponsiveness * 0.085;
    currentX += (targetX - currentX) * response;
    currentY += (targetY - currentY) * response;
    cursor.style.transform = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0)`;
    if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
      cursorFrame = requestAnimationFrame(animateCursor);
    }
  }

  function requestCursorFrame() {
    if (cursorFrame === null) cursorFrame = requestAnimationFrame(animateCursor);
  }

  function initCursor(cursorElement) {
    cursor = cursorElement;
    paintCursorMode();

    window.addEventListener('pointermove', event => {
      const target = event.target instanceof Element ? event.target : null;
      const overMachine = Boolean(target?.closest('#scr-round.active .cabinet'));
      const enabled = state.cursorMode === 'weapon' && finePointer() && overMachine;
      if (!enabled) {
        hideCursor();
        return;
      }

      targetX = event.clientX;
      targetY = event.clientY;
      if (!cursorPrimed) {
        currentX = targetX;
        currentY = targetY;
        cursorPrimed = true;
      }
      cursorVisible = true;
      cursor.hidden = false;
      document.body.classList.add('weapon-cursor-live');
      requestCursorFrame();
    }, { passive: true });

    window.addEventListener('pointerdown', event => {
      const target = event.target instanceof Element ? event.target : null;
      if (!cursorVisible || !target?.closest('#scr-round.active .cabinet')) return;
      cursor.classList.remove('firing');
      void cursor.offsetWidth;
      cursor.classList.add('firing');
      setTimeout(() => cursor?.classList.remove('firing'), 110);
    }, { passive: true });

    window.addEventListener('blur', hideCursor);
    document.addEventListener('mouseleave', hideCursor);
    subscribe(paintCursorMode);
  }

  return { DEFAULTS, get, set, reset, subscribe, initCursor, hideCursor };
})();
