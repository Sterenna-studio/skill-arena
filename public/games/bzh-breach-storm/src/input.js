export function initInput(canvas) {
  // Keyboard
  window.addEventListener('keydown', e => {
    window._keys = window._keys || {};
    window._keys[e.code] = true;
  });
  window.addEventListener('keyup', e => {
    window._keys = window._keys || {};
    window._keys[e.code] = false;
  });
  // Mouse
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    window._mouse = window._mouse || {};
    window._mouse.x = (e.clientX - r.left) * (640 / r.width);
    window._mouse.y = (e.clientY - r.top) * (640 / r.height);
  });
}

export function handleInput(state) {
  state.input.keys = window._keys || {};
  state.input.mouse = window._mouse || { x: 320, y: 320 };
}
