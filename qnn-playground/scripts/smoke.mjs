// End-to-end smoke test: serves dist/, drives headless Chrome over the
// DevTools protocol, and fails on page errors, missing quantum views, a loss
// that does not fall, or a frozen page. Run `npm run build` first.
// Chrome is found via CHROME_PATH or the usual install locations; if none is
// found the test is skipped (exit 0) so `npm run smoke` is safe anywhere.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4196, DEBUG_PORT = 9334;
const chromePath = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(p => p && existsSync(p));
if (!chromePath) { console.log('smoke: Chrome not found, skipping (set CHROME_PATH).'); process.exit(0); }
if (!existsSync(path.join(root, 'dist/bundle.js'))) { console.error('smoke: dist/ missing; run `npm run build`.'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const server = spawn(process.execPath, [path.join(root, 'serve.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const profile = await mkdtemp(path.join(os.tmpdir(), 'qnn-smoke-'));
const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`, '--window-size=1400,1100', 'about:blank'], { stdio: 'ignore' });

const failures = [], errors = [];
let ws, id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async expression => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result.exceptionDetails) throw new Error(`${expression}: ${r.result.exceptionDetails.text}`);
  return r.result.result.value;
};
const check = (ok, message) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`); if (!ok) failures.push(message); };

async function open(hash) {
  // A hash-only change does not reload the page, so go via about:blank.
  await send('Page.navigate', { url: 'about:blank' });
  await sleep(200);
  errors.length = 0;
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/#${hash}` });
  await sleep(2000);
}
const count = selector => evaluate(`document.querySelectorAll(${JSON.stringify(selector)}).length`);
const loss = () => evaluate(`+document.querySelector('#loss-train').textContent`);
/** Plays for `ms`, returning the longest gap between animation frames. */
const play = ms => evaluate(`new Promise(done => {
  let last = performance.now(), worst = 0, end = last + ${ms};
  document.querySelector('#play-pause-button').click();
  (function tick(now) {
    worst = Math.max(worst, now - last); last = now;
    if (now < end) requestAnimationFrame(tick);
    else { document.querySelector('#play-pause-button').click(); done(Math.round(worst)); }
  })(performance.now());
})`);

try {
  for (let i = 0; i < 50 && !ws; i++) {
    try {
      const page = (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json()).find(t => t.type === 'page' && t.url === 'about:blank');
      if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => { ws.onopen = r; }); }
    } catch {}
    if (!ws) await sleep(200);
  }
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(JSON.stringify(m.params.args));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(`${m.params.entry.text} ${m.params.entry.url || ''}`);
  };
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1100, deviceScaleFactor: 1, mobile: false });

  const text = sel => evaluate(`document.querySelector(${JSON.stringify(sel)})?.textContent ?? ''`);
  const waitFor = async (expr, ms = 8000) => {
    for (const end = Date.now() + ms; Date.now() < end; await sleep(150)) if (await evaluate(expr)) return true;
    return false;
  };
  const loadDemoWeights = async () => { await evaluate(`document.querySelector('#load-weights').click()`); await sleep(1500); };

  // First visit (empty URL): the guided view trains the circuit while you watch.
  await open('');
  const stepsDone = n => `document.querySelectorAll('#guide .guide-steps li.done').length === ${n}`;
  const trainedText = `/Trained for 120 rounds/.test(document.querySelectorAll('#guide .guide-steps li')[1].textContent)`;
  check(await waitFor(`document.querySelectorAll('#guide .guide-steps li').length === 4`), 'guided view shows the 4 steps');
  check(await evaluate(`/Training… round \\d+ of 120/.test(document.querySelector('#guide').textContent) && !!document.querySelector('#guide .train-bar') && !/Use the trained circuit/.test(document.body.textContent)`), 'first visit starts a training run (no pretrained shortcut)');
  check(await evaluate(`document.querySelectorAll('#guide #train-feed .feed-item canvas').length === 6 && document.querySelectorAll('#guide .feed-item.pos').length + document.querySelectorAll('#guide .feed-item.neg').length === 6`), 'while training, step 2 shows the labelled windows being learned');
  check(await waitFor(trainedText, 10000) && await evaluate(`!document.querySelector('#play-pause-button').classList.contains('playing') && +document.querySelector('#iter-number').textContent.replace(/,/g, '') === 120`), 'the run stops by itself after 120 rounds and ticks step 2');
  check(await evaluate(`getComputedStyle(document.querySelector('.ui-entangler')).display === 'none' && getComputedStyle(document.querySelector('#statevector')).display === 'none'`), 'advanced controls and panels are hidden in the guided view');
  check(await evaluate(`(() => { window.scrollTo(0, 800); const scrolled = scrollY, top = document.querySelector('#top-controls').getBoundingClientRect().top; window.scrollTo(0, 0); return scrolled > 100 && Math.abs(top) < 1; })()`), 'top bar stays pinned to the top when scrolling');
  const layers = () => evaluate(`document.querySelector('#num-layers').textContent`);
  const shown = sel => evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); return !!b && getComputedStyle(b).display !== 'none'; })()`);
  check(!(await shown('#add-layers')) && !(await shown('#remove-layers')) && !(await shown('#network .qubit-control button')), 'circuit size buttons are hidden in the guided view');
  await evaluate(`document.querySelector('#mode-toggle').click()`);
  check(await shown('#add-layers') && await shown('#network .qubit-control button'), 'circuit size buttons show in the details view');
  await evaluate(`document.querySelector('#add-layers').click()`);
  const added = await layers();
  await evaluate(`document.querySelector('#network .qubit-control button').click()`);
  const fiveQubits = await evaluate(`document.querySelector('#network .qubit-control').textContent.includes('5 qubits') && [...document.querySelectorAll('#network .ket')].some(t => t.textContent === 'q4') && /networkShape=5,5,5,5,5/.test(location.hash)`);
  check(added === '5' && fiveQubits, 'details view: layer and qubit + change the whole circuit');
  await evaluate(`document.querySelector('#mode-toggle').click()`);
  check(await layers() === '4' && /networkShape=4,4,4,4(&|$)/.test(await evaluate('location.hash')) && await evaluate(`/Training…/.test(document.querySelector('#guide').textContent)`), "back in the guided view: the sites' 4 x 4 circuit, retrained");
  await open('networkShape=6,6,6');
  check(await waitFor(`document.querySelectorAll('#network g.bloch').length === 16`), 'a guided link with another circuit size opens the 4 x 4 circuit');
  check(await waitFor(trainedText, 10000) && await waitFor(stepsDone(3)), 'the circuit trains to the end again after the change');
  await evaluate(`[...document.querySelectorAll('#guide .step-action')].find(b => /search/i.test(b.textContent)).click()`);
  // A from-scratch circuit can mark a lookalike too, and the search can land
  // there, so this checks that it measures; the site's weights must find her
  // (below).
  check(await waitFor(`/Searching… round \\d+ of \\d+/.test(document.querySelector('#search-banner').textContent)`, 3000), 'the search shows its rounds as they run');
  check(await waitFor(`/Found Wanda|does not hold Wanda/.test(document.querySelector('#search-banner').textContent)`, 15000), `the guide's search measures a square (${(await text('#search-banner')).slice(0, 60)})`);
  check(/Quantum advantage: Grover needs about √N checks instead of N/.test(await text('#search-banner')), 'the result states where the quantum advantage lies');
  check(await waitFor(`document.querySelectorAll('#guide .guide-steps li.done').length === 4`), 'all four steps ticked after searching');
  await evaluate(`document.querySelector('.play-caption').click()`);
  check(await waitFor(`+document.querySelector('#iter-number').textContent.replace(/,/g, '') > 20 && /Training/.test(document.querySelectorAll('#guide li')[1].textContent)`), '"Train it yourself" restarts and trains, with live progress in step 2');
  await evaluate(`document.querySelector('#play-pause-button').click()`);
  await evaluate(`document.querySelector('#mode-toggle').click()`);
  check(await evaluate(`getComputedStyle(document.querySelector('#statevector')).display !== 'none' && /mode=explorer/.test(location.hash)`), '"Show all details" reveals the expert view');
  check(errors.length === 0, `no page errors ${errors.join(' | ')}`);

  // Expert view: Where's Wanda, 64 x 64 addresses, the site's 4-qubit x
  // 4-layer circuit.
  await open('mode=explorer');
  check(await waitFor(`document.querySelectorAll('#network g.bloch').length === 16`), 'circuit drawn: a Bloch sphere under each of the 16 gates');
  check(await count('#network g.node.inactive, #network g.node.active') === 8, "the site's 8 window features");
  check(await count('#network .meter') === 4, 'hybrid readout measures all 4 qubits');
  check(await count('#readout-panel g.ro-row') === 7, 'readout panel lists the 7 observables');
  check(await count('#statevector g.amps rect') === 16, '16 amplitude bars for the 4-qubit classifier');
  check(await count('#search-panel svg.grover-bars rect') === 4096, 'Grover register spans the 4096 addresses (12 qubits), as on the site');
  check(await count('#world-list button.world') === 5 && /Festival/.test(await text('#world-list .world.selected')), "the site's five worlds, Festival selected");
  check(errors.length === 0, `no page errors ${errors.join(' | ')}`);

  // The site's own weights, scan, threshold and NMS mark only the address
  // at its default (420, 300), and the search finds her.
  await loadDemoWeights();
  const marks = await evaluate(`[...document.querySelectorAll('#search-panel svg.grover-bars rect')].flatMap((r, i) => r.classList.contains('marked') ? [i] : [])`);
  check(marks.length === 1 && marks[0] === 2420, `site weights mark Wanda's address 2420 only (marks ${marks.join(',')})`);
  check(await evaluate(`Math.abs(+document.querySelector('#threshold').value - 0.9056472752971427) < 1e-12`), "the site's frozen threshold (0.9056) is used exactly");
  check(/Demo weights loaded/.test(await text('#readout-info')), 'demo weights explained');
  await evaluate(`document.querySelector('#grover-run').click()`);
  check(await waitFor(`/Measured region/.test(document.querySelector('#search-panel .search-result').textContent)`, 10000), 'Grover search over 4096 addresses measures one');
  check(/found Wanda/.test(await text('#search-panel .search-result')), `the measurement finds Wanda (${(await text('#search-panel .search-result')).slice(0, 90)})`);
  for (const bg of ['wanda-beach', 'wanda-park']) {
    await evaluate(`document.querySelector('#world-list [data-background=${bg}]').click()`);
    await sleep(800);
    const m = await evaluate(`[...document.querySelectorAll('#search-panel svg.grover-bars rect')].flatMap((r, i) => r.classList.contains('marked') ? [i] : [])`);
    check(m.includes(2420) && new RegExp('background=' + bg).test(await evaluate('location.hash')), `${bg}: site weights still mark Wanda (marks ${m.join(',')})`);
  }
  check(errors.length === 0, `no page errors ${errors.join(' | ')}`);

  // Training from scratch (reset) learns the windows.
  await evaluate(`document.querySelector('#reset-button').click()`);
  const before = await loss();
  const worstDefault = await play(6000);
  const after = await loss();
  check(after < before * 0.5, `training lowers the loss (${before} -> ${after})`);
  const acc = await text('#accuracy');
  check(+acc.split('/')[1].replace('%', '') >= 80, `held-out window accuracy >= 80% (${acc})`);
  check(worstDefault < 250, `page stays responsive while training, rescoring 4096 windows (longest frame ${worstDefault} ms)`);

  // Interactions: probe by keyboard (saved in the URL), click-to-edit a gate.
  const moved = await evaluate(`(() => { const c = document.querySelector('#scene-canvas'); const before = document.querySelector('#statevector .sv-title').textContent; c.focus(); c.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true})); return before !== document.querySelector('#statevector .sv-title').textContent && /probe=2421/.test(location.hash); })()`);
  check(moved, 'arrow keys move the probe region, saved in the URL');
  const edit = await evaluate(`(() => {
    const gate = document.querySelector('#canvas-g16'); // q3 in layer 4 (ids g1..g16)
    gate.dispatchEvent(new MouseEvent('mouseenter'));
    const note = document.querySelector('#hovercard .gate').textContent;
    gate.click();
    const shown = [...document.querySelectorAll('#hovercard .field input')].filter(i => i.style.display !== 'none').length;
    return shown + '|' + note;
  })()`);
  check(edit.startsWith('2|'), `clicking a gate opens its RY and RZ angles for editing (${edit.slice(0, 2)})`);
  check(/RZ has no effect/.test(edit), "the last layer's dead RZ is explained (the site's model freezes it)");
  check(errors.length === 0, `no page errors ${errors.join(' | ')}`);

  // Review fixes: shots reset on loading weights, slider mid-search cancels
  // cleanly, URL values are validated, off-grid placement.
  await open('mode=explorer&shots=100');
  await waitFor(`document.querySelectorAll('#network g.bloch').length === 16`);
  await loadDemoWeights();
  check(await evaluate(`document.querySelector('#shots').value === '0'`), 'loading demo weights switches to exact values (scores really match the site)');
  await evaluate(`document.querySelector('#grover-run').click()`);
  await sleep(250);
  await evaluate(`(() => { const r = document.querySelector('#grover-rounds'); r.value = 11; r.dispatchEvent(new Event('input')); })()`);
  await sleep(2500);
  check(errors.length === 0 && (await text('#search-panel .search-result')) === '', 'moving the rounds slider mid-search cancels it cleanly (no crash, no stale result)');
  await open('mode=explorer&batchSize=0&learningRate=abc&threshold=5');
  await waitFor(`document.querySelectorAll('#network g.bloch').length === 16`);
  check(/batchSize=1/.test(await evaluate('location.hash')) && /threshold=0.99/.test(await evaluate('location.hash')), 'invalid URL values are clamped');
  const lb = await loss();
  await play(2500);
  check(await loss() < lb, 'training still works after bad URL values');
  await evaluate(`document.querySelector('#random-spot').click()`);
  check(/jitterX=-?0\.\d+|jitterY=-?0\.\d+/.test(await evaluate('location.hash')) || await evaluate(`/jitterX=0&jitterY=0/.test(location.hash)`), 'random spot places the target (possibly off-grid)');
  check(errors.length === 0, `no page errors ${errors.join(' | ')}`);

  // Saved URLs whose probe square is outside the grid must still start, and
  // old links to the retired bus and crowd scenes open Where's Wanda.
  for (const old of ['scene=crowd&grid=4&probe=27&target=50', 'scene=bus&grid=8&target=28']) {
    await open(old);
    check(await waitFor(`document.querySelectorAll('#network g.bloch').length === 16`) && !(await evaluate(`!!document.querySelector('.load-error')`)) && await count('#world-list button.world') === 5, `old link opens Where's Wanda (${old})`);
  }
  check(errors.length === 0, `no page errors ${errors.join(' | ')}`);

  // Coherent oracle and the "does it matter?" comparison (Wanda on an 8 x 8
  // address grid, quantum-only readout).
  await open('mode=explorer&readout=z0&grid=8&target=38&probe=38');
  await waitFor(`document.querySelectorAll('#search-panel svg.grover-bars rect').length === 64`);
  await evaluate(`(() => { const o = document.querySelector('#oracle-mode'); o.value = 'coherent'; o.dispatchEvent(new Event('change')); })()`);
  check(/classifier says "target"/.test(await text('#search-panel .search-stats')), 'coherent oracle runs the classifier inside the search');
  await evaluate(`document.querySelector('#grover-run').click()`);
  check(await waitFor(`/Measured region/.test(document.querySelector('#search-panel .search-result').textContent)`), 'coherent search measures a region');
  await open('mode=explorer');
  await waitFor(`document.querySelectorAll('#network g.bloch').length === 16`);
  await evaluate(`(() => { const o = document.querySelector('#oracle-mode'); o.value = 'coherent'; o.dispatchEvent(new Event('change')); })()`);
  check(/quantum-only readout/.test(await text('#search-panel .search-stats')), 'coherent oracle explains why it needs the quantum-only readout');
  check(errors.length === 0, `no page errors ${errors.join(' | ')}`);

  // Pure <Z0> readout: one meter, and q0's last gate is dead (faded).
  await open('mode=explorer&readout=z0&networkShape=4,4');
  check(await waitFor(`document.querySelectorAll('#network .meter').length === 1`), 'quantum-only readout measures qubit 0 only');
  check(await count('#network g.node.unreachable') === 1, "q0's last gate is faded (cannot reach <Z0>)");

  // Bigger circuits on Wanda (4096 windows per scene refresh) stay usable,
  // and keep correlation readouts.
  await open('mode=explorer&networkShape=6,6,6,6,6,6');
  await waitFor(`document.querySelectorAll('#network g.bloch').length === 36`, 15000);
  check(await count('#readout-panel g.ro-row') === 10, '6 qubits: readout keeps singles, pairs and parity (10 Z-strings)');
  const worst6 = await play(4000);
  check(worst6 < 250, `Wanda, 6 qubits x 6 layers: page stays responsive while training (longest frame ${worst6} ms)`);
  // Switching a feature off starts a fresh circuit and a matching baseline.
  const baseBefore = await text('#baseline');
  await evaluate(`document.querySelector('#network div.canvas.active').click()`);
  await sleep(500);
  check(/off=/.test(await evaluate('location.hash')) && await evaluate(`+document.querySelector('#iter-number').textContent.replace(/,/g, '') === 0`), 'switching a feature off resets the circuit');
  console.log(`     (baseline with all features ${baseBefore}, with one off ${await text('#baseline')})`);
  check(errors.length === 0, `no page errors ${errors.join(' | ')}`);

  // Guided: trained from scratch with the site's recipe.
  await open('');
  check(await waitFor(trainedText, 20000), 'Wanda: the guided run trains to the end');
  const wandaAcc = await text('#accuracy');
  check(+wandaAcc.replace('%', '') >= 85, `Wanda: held-out window accuracy >= 85% after 120 rounds (${wandaAcc})`);
  const wandaMarks = await evaluate(`document.querySelector('#guide').textContent.match(/marked: (\\d+) of 4096/)?.[1]`);
  console.log(`     (from-scratch marks at the site threshold: ${wandaMarks})`);
  check(errors.length === 0, `no page errors ${errors.join(' | ')}`);

  // The largest circuit with shot-based (parameter-shift) training.
  await open('mode=explorer&networkShape=4,4,4,4,4,4&entangler=cry&shots=100');
  await waitFor(`document.querySelectorAll('#network g.bloch').length === 24`);
  const worstBig = await play(4000);
  check(worstBig < 400, `6 layers, CRY, 100 shots stays responsive (longest frame ${worstBig} ms)`);
  check(errors.length === 0, `no page errors ${errors.join(' | ')}`);
} catch (e) {
  failures.push(String(e));
  console.error(e);
} finally {
  ws?.close();
  chrome.kill();
  server.kill();
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
console.log(failures.length ? `\nsmoke: ${failures.length} failure(s)` : '\nsmoke: all checks passed');
process.exit(failures.length ? 1 : 0);
