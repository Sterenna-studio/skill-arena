// Run with the arcade server on :4173 and a disposable Chrome CDP profile on :9333.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const tabs = await fetch('http://127.0.0.1:9333/json/list').then(r => r.json());
const ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
let id = 0;
const pending = new Map(), errors = [];
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  if (pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
  }
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function clickPort(index) {
  const point = await evaluate(`(() => { const r = document.querySelector('[data-port-index="${index}"]').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}
try {
  await mkdir('node_modules/.cache/dq3d-validation', { recursive: true });
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/arena/games/drone-quota/?view=3d&essais' });
  await sleep(1200);
  await evaluate(`DQPrefs.set({tutorialSeen:true,audioEnabled:false}); __droneQuota.newRun(); __droneQuota.startRound();`);
  await sleep(3800);
  assert.equal(await evaluate(`document.body.classList.contains('view3d')`), true);
  await evaluate(`__droneQuota.forceSpawn(5,'drone')`);
  await sleep(100);
  const before = await evaluate('__droneQuota.run.bank');
  await clickPort(5);
  assert.ok(await evaluate('__droneQuota.run.bank') > before, 'Projected mouse hit must score');
  await evaluate(`__droneQuota.forceSpawn(6,'blinde')`);
  await sleep(50);
  const shield = await evaluate('__droneQuota.ports[6].shieldLeft');
  await clickPort(6);
  assert.equal(await evaluate('__droneQuota.ports[6].shieldLeft'), shield - 1);
  await evaluate(`__droneQuota.forceSpawn(4,'sentinelle')`);
  await sleep(50);
  await clickPort(4);
  assert.equal(await evaluate('!!__droneQuota.round.qte'), true, 'Sentinel starts duel');
  await evaluate('__droneQuota.resolveQteNow(true)');
  await sleep(1000);
  for (const width of [1100, 375]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width === 375 });
    await evaluate(`__droneQuota.TARGETS.forEach((t,i) => __droneQuota.forceSpawn(i,t.id))`);
    await sleep(250);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `No overflow at ${width}`);
    const hits = await evaluate(`Array.from(document.querySelectorAll('#grid .port'), el => {
      const r = el.getBoundingClientRect();
      return { size:r.width >= 44 && r.height >= 44, hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.port') === el };
    })`);
    assert.ok(hits.every(p => p.size && p.hit), `All 12 projected ports clickable at ${width}: ${JSON.stringify(hits)}`);
    const screenshot = await send('Page.captureScreenshot');
    await writeFile(`node_modules/.cache/dq3d-validation/drone-quota-3d-${width}.png`, Buffer.from(screenshot.data, 'base64'));
  }
  await evaluate(`document.querySelector('.dq-world').getContext('webgl').getExtension('WEBGL_lose_context').loseContext()`);
  await sleep(150);
  assert.equal(await evaluate(`document.body.classList.contains('view3d')`), false, 'Context loss restores 2D');
  assert.equal(await evaluate(`document.querySelector('#grid .port').style.left`), '');
  assert.deepEqual(errors, []);
  console.log('PASS: projected clicks, shield, duel, 12 hit areas at 1100/375px, no overflow, context-loss fallback, no JS exceptions.');
} finally { ws.close(); }
