import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, mkdtemp, access, writeFile } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = join(root, '.artifacts');
await mkdir(artifacts, { recursive: true });
const candidates = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean);
let executable;
for (const candidate of candidates) {
  try { await access(candidate); executable = candidate; break; } catch {}
}
assert.ok(executable, 'Chrome requis : renseigner CHROME_PATH');
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const relative = path.replace(/^\/arena\/games\/core-defense\//, '') || 'index.html';
  const file = resolve(root, 'public/games/core-defense', relative);
  if (!path.startsWith('/arena/games/core-defense/') || !file.startsWith(resolve(root, 'public/games/core-defense') + '/'.replace('/', process.platform === 'win32' ? '\\' : '/'))) {
    res.writeHead(404).end(); return;
  }
  try {
    const data = await readFile(file);
    res.setHeader('Content-Type', ({'.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json'}[extname(file)] || 'text/html; charset=utf-8'));
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(join(artifacts, 'chrome-'));
const child = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
{ windowsHide: true, stdio: 'ignore' });
let childError;
child.on('error', error => { childError = error; });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (childError) throw childError;
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await pause(100); }
  }
  assert.ok(port, 'Chrome CDP indisponible');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await once(socket, 'open');
  let id = 0;
  const pending = new Map();
  const exceptions = [];
  const failedResponses = [];
  let loads = 0;
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400 && !message.params.response.url.endsWith('/favicon.ico')) failedResponses.push(message.params.response.url);
    if (message.method === 'Page.loadEventFired') loads++;
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
    const handler = pending.get(message.id);
    if (handler) { pending.delete(message.id); clearTimeout(handler.timer);
      message.error ? handler.reject(new Error(JSON.stringify(message.error))) : handler.resolve(message.result); }
  });
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const requestId = ++id;
      const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
      pending.set(requestId, { resolve, reject, timer });
      socket.send(JSON.stringify({ id: requestId, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function waitFor(expression) {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(expression)) return;
      await pause(50);
    }
    throw new Error(`Condition non remplie: ${expression}`);
  }
  async function reload() {
    const previous = loads;
    await send('Page.reload');
    for (let attempt = 0; loads === previous && attempt < 100; attempt++) await pause(50);
    assert.ok(loads > previous, 'Rechargement termine');
  }
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['https://*'] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${origin}/arena/games/core-defense/` });
  await waitFor('typeof game !== "undefined" && game.lastTime > 0');
  assert.equal(await evaluate('document.title'), 'Core Defense');
  assert.equal(await evaluate('document.querySelector(".arena-link").getAttribute("href")'), '/arena/');
  const click = id => evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);
  await click('muteBtn');
  assert.equal(await evaluate('localStorage.getItem("corebots_muted")'), '1');
  await evaluate('document.querySelector("[data-module=drone]").click()');
  await click('menuStartBtn');
  assert.equal(await evaluate('game.mode'), 'playing');
  assert.equal(await evaluate('game.player.companionDrones'), 1);
  await waitFor('game.enemies.length > 0 && game.player.state !== "spawning"');
  const before = await evaluate('({x:game.player.x,y:game.player.y})');
  await send('Input.dispatchKeyEvent', {type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  await pause(250);
  await send('Input.dispatchKeyEvent', {type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  assert.ok(await evaluate(`game.player.x !== ${before.x} || game.player.y !== ${before.y}`), 'Deplacement clavier');
  await send('Input.dispatchKeyEvent', {type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await pause(80);
  assert.ok(await evaluate('game.player.attackCd > 0'), 'Attaque clavier declenchee');
  await send('Input.dispatchKeyEvent', {type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await click('pauseBtn');
  assert.equal(await evaluate('game.mode'), 'paused');
  await click('resumeBtn');
  assert.equal(await evaluate('game.mode'), 'playing');
  // Exercise the existing transition functions with a controlled fixture.
  await evaluate('openUpgradeChoice()');
  assert.equal(await evaluate('document.querySelectorAll("#upgradeButtons button").length'), 3);
  await evaluate('document.querySelector("#upgradeButtons button").click()');
  assert.equal(await evaluate('game.waveIndex'), 1);
  await evaluate('game.score=123;endRun(false,"Test")');
  assert.equal(await evaluate('localStorage.getItem("corebots_best_score")'), '123');
  await click('replayBtn');
  assert.equal(await evaluate('game.mode'), 'playing');
  await click('pauseBtn');
  const desktop = await send('Page.captureScreenshot', {format:'png'});
  await writeFile(join(artifacts,'core-defense-desktop.png'),Buffer.from(desktop.data,'base64'));
  await reload();
  await waitFor('typeof game !== "undefined" && game.lastTime > 0');
  assert.equal(await evaluate('game.bestScore'), 123);
  assert.equal(await evaluate('game.muted'), true);
  assert.deepEqual(failedResponses, []);
  assert.deepEqual(exceptions, []);
  console.log('PASS: assets, menu, starter module, keyboard movement/attack, pause/resume, upgrade/replay fixtures, local persistence, no JS exceptions or missing assets.');
} finally {
  socket?.close();
  child.kill();
  server.closeAllConnections();
  server.close();
}
