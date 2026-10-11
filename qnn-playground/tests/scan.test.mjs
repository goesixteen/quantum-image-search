// The Wanda scene against the Where's Wanda site itself: the playground's
// scan (scores from the playground circuit, then src/scan.ts) must give the
// site's scanQNN() scores, best points and marks on the site's own corpus
// composite, and its training terms must be the site's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as nn from '../src/qnn.ts';
import { windowCenters, windowsByAddress, suppress, nmsRadius, truthByPoint, POINT_TOLERANCE, ADDRESS_GRIDS } from '../src/scan.ts';
import { extractWindowFeatures, scanQNN } from '../../waldo-search-lab/dist/wanda-localizer.js';
import { readPNG } from './png.mjs';

const W = '../../waldo-search-lab/';
const json = f => JSON.parse(readFileSync(new URL(W + f, import.meta.url)));
const model = json('dist/model/wanda-qnn.json');
const protocol = json('model/wanda-qnn/protocol.json');
const record = json('model/wanda-qnn/test-dataset.json').records[0]; // test-0
const image = readPNG(new URL(W + 'model/wanda-qnn/fixtures/test-0.png', import.meta.url));
const shape = { targetWidth: record.width, targetHeight: record.height };
const wandaNet = () => {
  const net = nn.buildNetwork({ featureIds: model.featureNames, qubits: model.qubits, layers: model.layers, entangler: 'cnot', reupload: true, readout: 'project', shots: 0 });
  nn.loadWeights(net, model);
  return net;
};

/** The playground's path: every window through its circuit, best per address, NMS. */
function playgroundScan(net, grid, threshold) {
  const centers = windowCenters();
  const window = centers.map(c => nn.forwardProp(net, extractWindowFeatures(image, c.x, c.y, shape)));
  const scores = [], points = [];
  for (const ws of windowsByAddress(grid)) {
    let best = ws[0];
    for (const i of ws) if (window[i] > window[best]) best = i;
    scores.push(window[best]);
    points.push(centers[best]);
  }
  return { scores, points, marks: suppress(scores, points, threshold, nmsRadius(shape.targetWidth)) };
}

test('constants are the site\'s: lattice, grids, tolerance, NMS radius', () => {
  assert.equal(windowCenters().length, 4096);
  assert.deepEqual(windowCenters()[0], { x: 4, y: 4 });
  assert.deepEqual(windowCenters()[4095], { x: 508, y: 508 });
  assert.deepEqual(ADDRESS_GRIDS, [4, 8, 16, 32, 64]);
  assert.ok(Math.abs(POINT_TOLERANCE - protocol.correctPointTolerancePx) < 1e-3);
  assert.equal(nmsRadius(15), 12);
  assert.ok(Math.abs(nmsRadius(40) - 14) < 1e-12);
  assert.ok(windowsByAddress(64).every(ws => ws.length === 1));
  assert.ok(windowsByAddress(8).every(ws => ws.length === 64));
});

test('site weights: scores, best points and marks equal scanQNN on a corpus composite', async () => {
  const net = wandaNet();
  for (const [grid, threshold] of [[64, model.threshold], [8, model.threshold], [64, 0.05], [32, 0.2]]) {
    const site = await scanQNN(image, model, { grid, threshold, batchSize: 4096, ...shape });
    const ours = playgroundScan(net, grid, threshold);
    ours.scores.forEach((s, i) => assert.ok(Math.abs(s - site.scores[i]) < 1e-12, `grid ${grid} address ${i}`));
    ours.points.forEach((p, i) => assert.deepEqual([p.x, p.y], [site.candidates[i].bestX, site.candidates[i].bestY]));
    assert.deepEqual(ours.marks, site.marks, `grid ${grid}, threshold ${threshold}`);
    if (threshold < .5) assert.ok(site.diagnostics.suppressedCount > 0, 'this case should exercise NMS');
  }
});

test('site weights find Wanda in the corpus composite, by the site\'s point rule', () => {
  const ours = playgroundScan(wandaNet(), 64, model.threshold);
  const truth = truthByPoint(ours.points, { x: record.center[0], y: record.center[1] });
  assert.ok(ours.marks.length > 0 && ours.marks.every(m => truth.has(m)), JSON.stringify(ours.marks));
  assert.equal(truthByPoint(ours.points, null).size, 0);
});

test('the site\'s inactive slots are the playground\'s dead parameters', () => {
  assert.deepEqual(model.frozenInactiveSlots, protocol.optimization.inactiveRZSlots);
  const net = wandaNet();
  const dead = net.slice(1, -1).flat().filter(n => n.rzDead).map(n => `q${n.index}L${n.layer}`);
  assert.deepEqual(dead, ['q0L4', 'q1L4', 'q2L4', 'q3L4']);
  assert.ok(model.frozenInactiveSlots.every(i => model.theta[i] === 0));
});

test('pairwise margin term: protocol margin, gradient of softplus on the logits', () => {
  assert.equal(protocol.objective.pairMargin, 1);
  const softplus = z => Math.log1p(Math.exp(z));
  const sig = z => 1 / (1 + Math.exp(-z));
  for (const [zp, zn] of [[2, -1], [-0.5, 0.3], [0, 0]]) {
    const g = nn.pairGradient(sig(zp), sig(zn));
    const h = 1e-6, loss = (a, b) => softplus(1 - a + b);
    assert.ok(Math.abs(g.pos - (loss(zp + h, zn) - loss(zp - h, zn)) / (2 * h)) < 1e-6);
    assert.ok(Math.abs(g.neg - (loss(zp, zn + h) - loss(zp, zn - h)) / (2 * h)) < 1e-6);
  }
});

test('backProp with a logit term is the gradient of that term (both readouts)', () => {
  for (const readout of ['project', 'z0']) {
    const net = nn.buildNetwork({ featureIds: model.featureNames, qubits: 4, layers: 2, entangler: 'cnot', reupload: true, readout, shots: 0 });
    const f = [.2, .7, .1, .9, .4, .3, .8, .5], node = net[1][2];
    const z = () => nn.logit(nn.forwardProp(net, f));
    nn.forwardProp(net, f);
    nn.backProp(net, 0, { bce: 0, dLogit: 1 });
    const h = 1e-5, b = node.bias;
    node.bias = b + h; const up = z(); node.bias = b - h; const down = z(); node.bias = b;
    assert.ok(Math.abs(node.accInputDer - (up - down) / (2 * h)) < 1e-6, readout);
  }
});

test('the matched logistic baseline uses the ranking pairs too', () => {
  // Both examples are positives, so cross-entropy alone cannot rank them;
  // the pair says [1, 0] should outscore [0, 1].
  const xs = [[1, 0], [0, 1]], ys = [1, 1];
  const plain = nn.trainLogistic(xs, ys, 200, 1);
  const ranked = nn.trainLogistic(xs, ys, 200, 1, [[[1, 0], [0, 1]]]);
  assert.ok(Math.abs(plain([1, 0]) - plain([0, 1])) < 1e-12);
  assert.ok(nn.logit(ranked([1, 0])) - nn.logit(ranked([0, 1])) > 1);
});
