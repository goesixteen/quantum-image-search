import { extractFeatures, predict } from './qnn.js';
import { simulateGrover, recommendIterations, sample, bitstring } from './quantum.js';

const $ = (id) => document.getElementById(id);
const canvas = $('scene'), context = canvas.getContext('2d');
const pixels = document.createElement('canvas'); pixels.width = pixels.height = 512;
const pixelContext = pixels.getContext('2d', { willReadFrequently: true });
const patch = document.createElement('canvas'); patch.width = patch.height = 128;
const patchContext = patch.getContext('2d', { willReadFrequently: true });
const truthCanvas = document.createElement('canvas'); truthCanvas.width = truthCanvas.height = 512;
const truthContext = truthCanvas.getContext('2d', { willReadFrequently: true });
const state = { grid: 4, snap: true, heatmap: false, present: true, x: 0, y: 0, width: 45, height: 96, threshold: .5, scores: null, marks: [], trace: null, iteration: 0, measurement: null, truth: null, model: null, crowd: null, explorer: null, ready: false, busy: false };
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const percent = (n) => `${(n * 100).toFixed(1)}%`;
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

function loadImage(source) {
  return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error(`Could not load ${source}`)); img.src = source; });
}

function setStatus(title, description) {
  $('result-title').textContent = title; $('status').textContent = description;
  $('scene-status').textContent = title + ' ' + description;
}

function dimensions() {
  state.height = (512 / state.grid) * .75;
  state.width = state.height * state.explorer.naturalWidth / state.explorer.naturalHeight;
}

function placeInTile(column, row) {
  const cell = 512 / state.grid;
  state.x = column * cell + (cell - state.width) / 2;
  state.y = row * cell + (cell - state.height) / 2;
  state.x = clamp(state.x, 0, 512 - state.width); state.y = clamp(state.y, 0, 512 - state.height);
}

function snapToTile() {
  const cell = 512 / state.grid;
  placeInTile(clamp(Math.floor((state.x + state.width / 2) / cell), 0, state.grid - 1), clamp(Math.floor((state.y + state.height / 2) / cell), 0, state.grid - 1));
}

function renderPixels() {
  pixelContext.clearRect(0, 0, 512, 512);
  if (!state.crowd) return;
  const image = state.crowd, factor = Math.max(512 / image.naturalWidth, 512 / image.naturalHeight);
  const w = image.naturalWidth * factor, h = image.naturalHeight * factor;
  pixelContext.drawImage(image, (512 - w) / 2, (512 - h) / 2, w, h);
  if (state.present && state.explorer) pixelContext.drawImage(state.explorer, state.x, state.y, state.width, state.height);
}

function draw() {
  renderPixels(); context.clearRect(0, 0, 512, 512); context.drawImage(pixels, 0, 0);
  const cell = 512 / state.grid;
  if (state.heatmap && state.scores) state.scores.forEach((score, index) => {
    const x = (index % state.grid) * cell, y = Math.floor(index / state.grid) * cell;
    context.fillStyle = `rgba(228,90,40,${.04 + score * .31})`; context.fillRect(x, y, cell, cell);
    context.fillStyle = score >= state.threshold ? '#e45a28' : '#18243a'; context.fillRect(x + 5, y + 5, 39, 17);
    context.fillStyle = '#fff'; context.font = '10px monospace'; context.fillText(`${Math.round(score * 100)}%`, x + 10, y + 17);
  });
  context.lineWidth = 1; context.strokeStyle = 'rgba(255,250,240,.78)';
  for (let i = 1; i < state.grid; i++) { context.beginPath(); context.moveTo(i * cell, 0); context.lineTo(i * cell, 512); context.moveTo(0, i * cell); context.lineTo(512, i * cell); context.stroke(); }
  if (state.trace) {
    context.setLineDash([5, 3]); context.strokeStyle = '#e45a28'; context.lineWidth = 2;
    state.marks.forEach((index) => context.strokeRect((index % state.grid) * cell + 4, Math.floor(index / state.grid) * cell + 4, cell - 8, cell - 8)); context.setLineDash([]);
  }
  if (state.measurement != null) {
    const index = state.measurement, x = (index % state.grid) * cell, y = Math.floor(index / state.grid) * cell;
    context.strokeStyle = state.truth?.has(index) ? '#2447c8' : '#e45a28'; context.lineWidth = 5; context.strokeRect(x + 3, y + 3, cell - 6, cell - 6);
    context.fillStyle = context.strokeStyle; context.fillRect(x + 5, y + cell - 24, Math.min(cell - 10, 84), 19);
    context.fillStyle = '#fff'; context.font = 'bold 10px Arial'; context.fillText('MEASURED', x + 11, y + cell - 11);
  }
}

// Only composited pixels and the saved model enter the detector. Renderer position
// and alpha data never enter features, predictions, marks, or Grover evolution.
function infer() {
  renderPixels(); const cell = 512 / state.grid, scores = [];
  patchContext.imageSmoothingEnabled = true; patchContext.imageSmoothingQuality = 'high';
  for (let row = 0; row < state.grid; row++) for (let column = 0; column < state.grid; column++) {
    patchContext.clearRect(0, 0, 128, 128);
    patchContext.drawImage(pixels, column * cell, row * cell, cell, cell, 0, 0, 128, 128);
    const score = predict(extractFeatures(patchContext.getImageData(0, 0, 128, 128)), state.model);
    if (!Number.isFinite(score) || score < 0 || score > 1) throw new Error('The classifier returned an invalid score.');
    scores.push(score);
  }
  return scores;
}

// Called only after sampling a quantum-style measurement, for independent scoring.
function evaluateGroundTruth() {
  const targets = new Set();
  if (!state.present) return targets;
  truthContext.clearRect(0, 0, 512, 512); truthContext.drawImage(state.explorer, state.x, state.y, state.width, state.height);
  const alpha = truthContext.getImageData(0, 0, 512, 512).data, cell = 512 / state.grid;
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) if (alpha[(y * 512 + x) * 4 + 3] > 32) targets.add(Math.floor(y / cell) * state.grid + Math.floor(x / cell));
  return targets;
}

function updateBars() {
  const N = state.grid ** 2, frame = state.trace?.history[state.iteration];
  const probabilities = frame?.probabilities || Array(N).fill(1 / N), maximum = Math.max(...probabilities, 1 / N);
  const bars = $('bars'); bars.replaceChildren(); bars.style.gridTemplateColumns = `repeat(${N}, minmax(0, 1fr))`;
  const plotHeight = Math.max(40, bars.clientHeight - 35);
  const descriptions = [];
  probabilities.forEach((probability, index) => {
    const bar = document.createElement('div'); bar.className = `probability-bar${state.marks.includes(index) ? ' marked' : ''}${index === state.measurement ? ' measured' : ''}`;
    bar.title = `Region ${index + 1}: ${percent(probability)}`;
    const fill = document.createElement('div'); fill.className = 'bar-fill'; fill.style.height = `${Math.max(1.8, probability / maximum * plotHeight)}px`;
    const label = document.createElement('span'); label.className = 'bar-label'; label.textContent = N <= 16 || index % 4 === 0 ? index + 1 : '';
    if (N <= 16 && probability > .08) { const value = document.createElement('span'); value.className = 'bar-number'; value.style.bottom = `${probability / maximum * plotHeight + 17}px`; value.textContent = percent(probability); bar.append(value); }
    bar.append(fill, label); bars.append(bar); descriptions.push(`region ${index + 1} ${percent(probability)}`);
  });
  bars.setAttribute('aria-label', `Simulated probabilities at iteration ${state.iteration}: ${descriptions.join(', ')}`);
  $('state-label').textContent = frame ? `Iteration ${state.iteration} · ${N} candidate regions` : 'Uniform state · before the oracle';
  if (frame) {
    $('iteration-count').textContent = state.iteration;
    $('success-probability').textContent = percent(frame.successProbability);
  }
}

function resetSearch() {
  state.scores = null; state.marks = []; state.trace = null; state.measurement = null; state.truth = null; state.iteration = 0;
  $('mark-count').textContent = '—'; $('iteration-count').textContent = '—'; $('success-probability').textContent = '—'; $('measured-region').textContent = '—';
  $('iteration').value = '0'; $('iteration-value').textContent = '0'; $('iteration').disabled = true; $('measure').disabled = true;
  $('ground-truth').className = 'ground-truth'; $('ground-truth').textContent = 'Ground truth is checked only after a measurement.';
  $('truth-mass').textContent = 'Run the search to inspect a measurement.'; $('runtime').textContent = '—'; $('inference-count').textContent = '—';
  if (state.ready) setStatus('Ready when you are.', state.present ? 'The explorer moved. Find it again to build a fresh image-based oracle.' : 'The explorer is absent. Test whether the classifier rejects every region.');
  updateBars();
}

function measure() {
  if (!state.trace || !state.marks.length) return;
  const frame = state.trace.history[state.iteration]; state.measurement = sample(frame.probabilities); state.truth = evaluateGroundTruth();
  const correct = state.truth.has(state.measurement), bits = bitstring(state.measurement, Math.log2(state.grid ** 2));
  $('measured-region').textContent = `${state.measurement + 1} · ${bits}`;
  $('ground-truth').className = `ground-truth ${correct ? 'correct' : 'miss'}`;
  $('ground-truth').textContent = correct ? '✓ The measured tile overlaps the explorer.' : 'The measured tile does not overlap the explorer.';
  const targetMass = [...state.truth].reduce((sum, index) => sum + frame.probabilities[index], 0);
  $('truth-mass').textContent = `True-target probability: ${percent(targetMass)} · evaluated after measurement`;
  setStatus(correct ? 'Explorer located.' : state.present ? 'A region, but not the explorer.' : 'A false positive.', correct ? `Measurement selected region ${state.measurement + 1}. The image predicate accepted ${state.marks.length} of ${state.grid ** 2} regions.` : state.present ? 'Grover follows the learned oracle, including mistakes. Inspect the heatmap or adjust the threshold.' : 'The classifier accepted part of the crowd even though the inserted explorer is absent. Amplification cannot fix that predicate.');
  updateBars(); draw();
}

async function search() {
  if (!state.ready || state.busy) return;
  state.busy = true; $('find').disabled = true; setStatus('Reading the crowd…', 'Scoring candidate pixels with the saved quantum model.'); await nextFrame();
  try {
    const started = performance.now(); state.scores = infer();
    state.marks = state.scores.flatMap((score, index) => score >= state.threshold ? [index] : []);
    const N = state.grid ** 2, M = state.marks.length, recommended = recommendIterations(N, M);
    const maximum = M === 0 || M === N ? 0 : Math.max(7, recommended * 2 + 2);
    state.trace = simulateGrover(N, state.marks, maximum); state.iteration = recommended; state.measurement = null; state.truth = null;
    $('runtime').textContent = `${(performance.now() - started).toFixed(1)} ms`;
    $('inference-count').textContent = N;
    $('mark-count').textContent = `${M} / ${N}`;
    $('iteration').max = maximum; $('iteration').value = recommended; $('iteration-value').textContent = recommended; $('iteration').disabled = M === 0;
    $('measure').disabled = M === 0;
    if (M === 0) {
      setStatus('No accepted regions.', 'The model rejected every region at this threshold. There is no marked state to amplify; no measurement was requested.');
      $('measured-region').textContent = 'None'; $('ground-truth').className = 'ground-truth'; $('ground-truth').textContent = 'Try a different placement or inspect the QNN heatmap.';
      $('truth-mass').textContent = 'Empty oracle · no accepted candidate.'; updateBars(); draw();
    } else measure();
  } catch (error) { setStatus('The experiment needs attention.', error.message); console.error(error); }
  finally { state.busy = false; $('find').disabled = false; }
}

function refreshScene() { resetSearch(); if (state.heatmap && state.ready) state.scores = infer(); draw(); }

function changeGrid(grid) {
  if (!state.ready) return;
  const centerX = state.x + state.width / 2, centerY = state.y + state.height / 2;
  state.grid = grid; dimensions(); state.x = clamp(centerX - state.width / 2, 0, 512 - state.width); state.y = clamp(centerY - state.height / 2, 0, 512 - state.height);
  if (state.snap) snapToTile();
  $('grid-four').classList.toggle('selected', grid === 4); $('grid-eight').classList.toggle('selected', grid === 8);
  $('grid-four').setAttribute('aria-pressed', grid === 4); $('grid-eight').setAttribute('aria-pressed', grid === 8);
  $('grid-summary').textContent = `${grid ** 2} regions · ${Math.log2(grid ** 2)} search qubits`; refreshScene();
}

function boundaryChallenge() {
  if (!state.ready || state.busy) return;
  state.present = true; state.snap = false; $('free-placement').checked = true;
  // Diagnostic placement from the locked dense audit. Coordinates only render
  // the scene; predictions and marks still receive composited pixels.
  [state.x, state.y] = state.grid === 4 ? [352, 347] : [418, 104];
  $('remove').textContent = 'Remove explorer'; refreshScene();
  setStatus('A boundary challenge.', 'The figure is split across tile edges. Search again or inspect the heatmap to see whether the frozen classifier accepts a fragment.');
}
function resetDemo() {
  if (!state.ready || state.busy) return;
  state.present = true; state.snap = true; state.heatmap = false;
  $('free-placement').checked = false; $('heatmap').checked = false; $('remove').textContent = 'Remove explorer';
  state.threshold = state.model.threshold; $('threshold').value = state.threshold; $('threshold-value').textContent = state.threshold.toFixed(2);
  changeGrid(4); placeInTile(2, 2); refreshScene();
  setStatus('Ready when you are.', 'The original 4 × 4 challenge is restored. Move the explorer or run the search.');
}

const pointer = { active: false, offsetX: 0, offsetY: 0 };
function pointerPosition(event) { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * 512 / rect.width, y: (event.clientY - rect.top) * 512 / rect.height }; }
canvas.addEventListener('pointerdown', (event) => {
  if (!state.ready || state.busy) return; event.preventDefault(); canvas.focus();
  const p = pointerPosition(event), hit = state.present && p.x >= state.x && p.x <= state.x + state.width && p.y >= state.y && p.y <= state.y + state.height;
  if (!hit) { state.present = true; state.x = clamp(p.x - state.width / 2, 0, 512 - state.width); state.y = clamp(p.y - state.height / 2, 0, 512 - state.height); }
  pointer.offsetX = hit ? p.x - state.x : state.width / 2; pointer.offsetY = hit ? p.y - state.y : state.height / 2; pointer.active = true;
  canvas.setPointerCapture(event.pointerId); canvas.classList.add('dragging'); $('remove').textContent = 'Remove explorer'; resetSearch(); draw();
});
canvas.addEventListener('pointermove', (event) => { if (!pointer.active) return; const p = pointerPosition(event); state.x = clamp(p.x - pointer.offsetX, 0, 512 - state.width); state.y = clamp(p.y - pointer.offsetY, 0, 512 - state.height); draw(); });
function endDrag() { if (!pointer.active) return; pointer.active = false; canvas.classList.remove('dragging'); if (state.snap) snapToTile(); if (state.heatmap) state.scores = infer(); draw(); }
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('keydown', (event) => {
  if (!state.ready || state.busy) return;
  if (event.key === 'Enter') { event.preventDefault(); search(); return; }
  const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
  if (!direction) return; event.preventDefault(); state.present = true; $('remove').textContent = 'Remove explorer';
  const step = state.snap ? 512 / state.grid : event.shiftKey ? 16 : 4;
  state.x = clamp(state.x + direction[0] * step, 0, 512 - state.width); state.y = clamp(state.y + direction[1] * step, 0, 512 - state.height); if (state.snap) snapToTile(); refreshScene();
});
$('find').addEventListener('click', search); $('measure').addEventListener('click', measure);
$('boundary-challenge').addEventListener('click', boundaryChallenge); $('reset-demo').addEventListener('click', resetDemo);
$('grid-four').addEventListener('click', () => changeGrid(4)); $('grid-eight').addEventListener('click', () => changeGrid(8));
$('move').addEventListener('click', () => { if (!state.ready) return; state.present = true; if (state.snap) placeInTile(Math.floor(Math.random() * state.grid), Math.floor(Math.random() * state.grid)); else { state.x = Math.random() * (512 - state.width); state.y = Math.random() * (512 - state.height); } $('remove').textContent = 'Remove explorer'; refreshScene(); });
$('remove').addEventListener('click', () => { if (!state.ready) return; state.present = !state.present; $('remove').textContent = state.present ? 'Remove explorer' : 'Restore explorer'; refreshScene(); });
$('free-placement').addEventListener('change', (event) => { state.snap = !event.target.checked; if (state.snap && state.ready) snapToTile(); if (state.ready) refreshScene(); });
$('heatmap').addEventListener('change', (event) => { state.heatmap = event.target.checked; if (state.ready && state.heatmap && !state.scores) state.scores = infer(); draw(); });
$('threshold').addEventListener('input', (event) => { state.threshold = Number(event.target.value); $('threshold-value').textContent = state.threshold.toFixed(2); if (state.ready) refreshScene(); });
$('iteration').addEventListener('input', (event) => {
  if (!state.trace) return; state.iteration = Number(event.target.value); state.measurement = null; state.truth = null;
  $('iteration-value').textContent = state.iteration; $('measured-region').textContent = 'Not measured'; $('ground-truth').className = 'ground-truth'; $('ground-truth').textContent = 'Measure this state to check its selected region.'; $('truth-mass').textContent = 'This state has not been measured.';
  setStatus('Inspecting interference.', `Iteration ${state.iteration} redistributes probability. Select “Measure this state” to sample it.`); updateBars(); draw();
});

async function initialize() {
  updateBars();
  try {
    const [crowd, explorer, response] = await Promise.all([loadImage('assets/crowd-captcha.png'), loadImage('assets/character.png'), fetch('model/model.json')]);
    if (!response.ok) throw new Error('The trained model could not be loaded.');
    state.model = await response.json(); state.crowd = crowd; state.explorer = explorer; state.threshold = state.model.threshold; dimensions(); placeInTile(2, 2); state.ready = true;
    $('threshold').value = state.threshold; $('threshold-value').textContent = state.threshold.toFixed(2);
    $('model-circuit').textContent = `${state.model.qubits} qubits · ${state.model.layers} layers`; $('model-parameters').textContent = state.model.parameterCount ?? (state.model.theta.length + state.model.readout.length + 1);
    const test = state.model.metrics?.test; $('test-accuracy').textContent = test ? percent(test.accuracy) : 'See model file'; $('test-count').textContent = test?.n?.toLocaleString() ?? 'See model file';
    $('find').disabled = false; $('loading').hidden = true; setStatus('Ready when you are.', 'Move the explorer or choose a random region. The classifier reads pixels from the complete crowd scene.'); draw();
    await loadBaseline();
  } catch (error) { $('loading').innerHTML = '<strong>The atlas could not load.</strong><span>Refresh to retry the artwork and model files.</span>'; setStatus('Assets need attention.', error.message); console.error(error); }
}
async function loadBaseline() {
  try {
    const response=await fetch('model/baseline_metrics.json');if(!response.ok)throw Error('Comparison unavailable');
    const baseline=await response.json(),table=$('baseline-table');table.replaceChildren();
    for(const [name,m] of [[`QNN · ${state.model.parameterCount} slots`,state.model.metrics.test],[`Logistic · ${baseline.parameter_count} parameters`,baseline.splits.test]]) {
      const row=document.createElement('tr');for(const value of [name,`${(100*m.accuracy).toFixed(2)}%`,`${(100*m.recall).toFixed(2)}%`]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}table.append(row);
    }
    $('baseline-note').textContent='Logistic scores higher on this test. Both models use the same seeded patches and eight pixel features, with validation-only tuning. Different model families and parameter counts do not establish quantum superiority.';
  } catch {
    const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=3;cell.textContent='Comparison report unavailable.';row.append(cell);$('baseline-table').replaceChildren(row);
  }
}
initialize();
