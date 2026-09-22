/* WebGL scene and projected HTML hit areas. Gameplay stays in game.js.
 * Procedural meshes only; no network dependency or external assets. */
(() => {
  'use strict';
  const query = new URLSearchParams(location.search);
  if (query.get('view') !== '3d') return;
  const link = document.getElementById('view-switch');
  query.delete('view');
  link.href = `?${query}`;
  link.textContent = 'REVENIR À LA VERSION 2D';
  const note = document.createElement('p');
  note.className = 'view3d-note';
  note.setAttribute('role', 'status');
  link.after(note);
  const canvas = document.createElement('canvas');
  canvas.className = 'dq-world';
  canvas.setAttribute('aria-hidden', 'true');
  const arena = document.getElementById('arena');
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
  let frame = 0;
  let stopped = false;
  function fallback() {
    stopped = true;
    cancelAnimationFrame(frame);
    document.body.classList.remove('view3d');
    document.querySelectorAll('#grid .port').forEach(el => {
      for (const prop of ['left', 'top', 'width', 'height']) el.style.removeProperty(prop);
    });
    canvas.remove();
    note.textContent = 'La 3D est indisponible sur cet appareil. Le plateau 2D reste jouable.';
  }
  if (!gl) { fallback(); return; }
  const resources = [];
  try {
    function shader(type, source) {
      const value = gl.createShader(type);
      gl.shaderSource(value, source);
      gl.compileShader(value);
      if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(value));
      resources.push(value);
      return value;
    }
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, `
      attribute vec3 position;
      attribute vec3 color;
      varying vec3 tint;
      uniform float aspect;
      void main() {
        float y = position.y * .8 - position.z * .6;
        float depth = 12.0 - position.y * .6 - position.z * .8;
        gl_Position = vec4(position.x * 1.85, y * 1.85 * aspect, depth * 1.002 - .2002, depth);
        tint = color;
      }`));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec3 tint;
      void main() { gl_FragColor = vec4(tint, 1.0); }`));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    resources.forEach(value => gl.deleteShader(value));
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (const [name, offset] of [['position', 0], ['color', 12]]) {
      const loc = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 24, offset);
    }
    const aspectLoc = gl.getUniformLocation(program, 'aspect');
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(.018, .034, .055, 1);
    arena.prepend(canvas);
    document.body.classList.add('view3d');
    document.title = 'Drone Quota 3D';
    document.querySelector('#scr-menu .serial').textContent = 'TERMINAL 3D · MOD. DQ-12 / VOLUME';
    note.textContent = 'Plateau 3D · mêmes règles et progression partagée. Clique ou touche les drones pour les enchaîner.';
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fallback(); });

    const colors = {
      drone: [.15, .78, .88], scout: [.22, .95, .59], core: [1, .69, .16],
      coolant: [.23, .58, 1], overclock: [.76, .35, 1],
      blinde: [.5, .68, .8], sentinelle: [1, .24, .36],
    };
    const faces = [
      [0, 1, 2, 3, .55], [5, 4, 7, 6, 1], [4, 0, 3, 7, .72],
      [1, 5, 6, 2, .84], [3, 2, 6, 7, 1.15], [4, 5, 1, 0, .4],
    ];
    const data = new Float32Array(180000);
    let used = 0;
    function box(x, y, z, sx, sy, sz, color, angle = 0) {
      const cs = Math.cos(angle), sn = Math.sin(angle);
      const points = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
      for (const face of faces) {
        for (const index of [face[0], face[1], face[2], face[0], face[2], face[3]]) {
          const p = points[index], dx = p[0] * sx / 2, dz = p[2] * sz / 2;
          data[used++] = x + dx * cs - dz * sn;
          data[used++] = y + p[1] * sy / 2;
          data[used++] = z + dx * sn + dz * cs;
          for (const c of color) data[used++] = c * face[4];
        }
      }
    }
    let width = 1, height = 1;
    function project(x, y, z) {
      const depth = 12 - y * .6 - z * .8;
      return [width / 2 + x * 1.85 / depth * width / 2,
        height / 2 - (y * .8 - z * .6) * 1.85 / depth * width / 2];
    }
    const rises = new WeakMap();
    let previous = 0;
    function render(now) {
      if (stopped) return;
      frame = requestAnimationFrame(render);
      if (document.hidden || !document.getElementById('scr-round').classList.contains('active')) return;
      const dt = Math.min((now - previous) / 1000, .05);
      previous = now;
      width = arena.clientWidth; height = arena.clientHeight;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      gl.uniform1f(aspectLoc, width / height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      used = 0;
      const reduced = document.body.classList.contains('reduce-effects') || matchMedia('(prefers-reduced-motion: reduce)').matches;
      const metal = [.075, .13, .19], edge = [.15, .29, .36];
      box(0, -.42, 0, 8.9, .6, 7.3, metal);
      box(0, -.07, -3.6, 8.9, .18, .16, edge);
      box(0, -.07, 3.6, 8.9, .18, .16, edge);
      for (const x of [-4.35, 4.35]) {
        box(x, .02, 0, .15, .32, 7.3, edge);
        box(x, .2, 0, .055, .025, 6.6, [.15, .8, .9]);
      }
      const ports = window.DQView.ports();
      for (const port of ports) {
        const x = (port.index % 4 - 1.5) * 2.05, z = (Math.floor(port.index / 4) - 1) * 2.25;
        const color = colors[port.type] || edge;
        box(x, -.035, z, 1.7, .16, 1.75, edge);
        box(x, .06, z, 1.43, .06, 1.48, [.018, .029, .045]);
        box(x, .11, z + .78, 1.45, .04, .055, color);
        let rise = rises.get(port.el) || 0;
        rise += ((port.type ? 1 : 0) - rise) * (reduced ? 1 : Math.min(1, dt * 22));
        rises.set(port.el, rise);
        if (port.type) {
          const stunned = port.el.classList.contains('stunned');
          const bob = reduced || stunned ? 0 : Math.sin(now * .004 + port.index) * .055;
          const y = .14 + rise * .48 + bob;
          const turn = reduced || stunned ? 0 : Math.sin(now * .002 + port.index) * .13;
          const body = stunned ? [1, .67, .3] : color;
          // Different silhouettes make the seven target families readable.
          if (port.type === 'coolant' || port.type === 'overclock' || port.type === 'core') {
            box(x, y, z, .63, .8, .63, body, turn + Math.PI / 4);
            box(x, y + .47, z, .22, .14, .22, [1, 1, .85]);
            box(x, y, z + .46, .15, .46, .06, [1, 1, .9]);
            if (port.type === 'coolant') box(x, y, z + .47, .42, .13, .07, [1, 1, .9]);
          } else {
            box(x, y, z, port.type === 'blinde' ? 1.03 : .83, .65, .65, body, turn);
            box(x, y + .06, z + .35, .64, .24, .07, [.025, .06, .09]);
            for (const dx of [-.2, .2]) box(x + dx, y + .075, z + .4, .13, .1, .04, [1, .95, .65]);
            box(x, y + .47, z, .045, .3, .045, edge);
            box(x, y + .64, z, .12, .09, .12, body);
            for (const side of [-1, 1]) {
              box(x + side * .61, y - .12, z, .28, .2, .35, metal);
              box(x + side * .61, y - .25, z, .14, .06, .2, color);
              if (port.type === 'scout') box(x + side * .57, y + .05, z, .53, .07, .55, color, side * .2);
              if (port.type === 'sentinelle') box(x + side * .57, y + .18, z + .18, .1, .9, .12, [1, .65, .7], side * .4);
            }
            if (port.shield) box(x, y - .04, z + .5, .78, .44, .12, [.27, .54, .79]);
          }
          for (let n = 0; n < port.chain; n++) box(x - .48 + n * .2, .18, z + .6, .12, .07, .12, [1, .73, .24]);
        }
        // Use the same camera equation for visible meshes and real buttons.
        // Stable hit boxes include both the head and the socket, even mid-rise.
        const left = project(x - .84, .5, z)[0], right = project(x + .84, .5, z)[0];
        const top = project(x, 1.4, z - .2)[1], bottom = project(x, 0, z + .8)[1];
        Object.assign(port.el.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px` });
      }
      for (const [side, id] of [[-1, 'flank-left'], [1, 'flank-right']]) {
        const flank = document.getElementById(id);
        if (!flank.classList.contains('armed')) continue;
        for (let n = 0; n < 3; n++) {
          const z = (n - 1) * 2.25;
          box(side * 4.12, .4, z, .4, .65, .6, [.43, .25, .65]);
          box(side * 3.9, .62, z, .6, .15, .18, [.74, .48, 1]);
        }
      }
      gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, used), gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, used / 6);
    }
    frame = requestAnimationFrame(render);
    window.addEventListener('pagehide', () => {
      stopped = true; cancelAnimationFrame(frame);
      gl.deleteBuffer(buffer); gl.deleteProgram(program);
    });
    window.addEventListener('pageshow', event => {
      if (event.persisted) location.reload();
    });
  } catch (error) {
    console.warn('Drone Quota 3D:', error);
    fallback();
  }
})();
