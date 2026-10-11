// Tests for the TypeScript engine adapter (src/qnn.ts), which the UI drives.
// Node runs the .ts file directly (type stripping), so no build is needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as nn from '../src/qnn.ts';
import * as wandaQnn from '../../waldo-search-lab/dist/qnn.js';

const WANDA_MODEL = JSON.parse(readFileSync(new URL('../../waldo-search-lab/dist/model/wanda-qnn.json', import.meta.url)));
const FEATURES = WANDA_MODEL.featureNames;
const spec = (over = {}) => ({ featureIds: FEATURES, qubits: 4, layers: 4, entangler: 'cnot', reupload: true, readout: 'project', shots: 0, ...over });
const gates = net => net.slice(1, -1).flat();
let seed = 11;
const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

test('network shape and links mirror the demos\' circuit', () => {
  const net = nn.buildNetwork(spec());
  assert.deepEqual(net.map(l => l.length), [8, 4, 4, 4, 4, 1]);
  const links = gates(net).flatMap(n => n.inputLinks);
  const encodes = links.filter(l => l.kind === 'encode');
  assert.equal(encodes.length, 8 * 4); // every feature, re-uploaded in every layer
  assert.ok(encodes.every(l => l.fixed && l.dest.index === l.source.index % 4 && l.axis === (l.source.index < 4 ? 'ry' : 'rz')));
  const cnots = links.filter(l => l.kind === 'entangle');
  assert.equal(cnots.length, 4 * 4);
  assert.ok(cnots.every(l => l.fixed && l.gate === 'cnot'));
  assert.equal(nn.getReadout(net).labels.join(' '), 'Z0 Z1 Z2 Z3 Z0Z1 Z2Z3 Z0Z1Z2Z3');
  const once = nn.buildNetwork(spec({ reupload: false }));
  assert.equal(gates(once).flatMap(n => n.inputLinks).filter(l => l.kind === 'encode').length, 8);
});

test('the demos\' trained weights give exactly the demos\' scores', () => {
  for (const [lab, file] of [[wandaQnn, '../../waldo-search-lab/dist/model/wanda-qnn.json']]) {
    const model = JSON.parse(readFileSync(new URL(file, import.meta.url)));
    const net = nn.buildNetwork(spec({ featureIds: model.featureNames, layers: model.layers }));
    nn.loadWeights(net, model);
    for (let n = 0; n < 100; n++) {
      const f = Array.from({ length: 8 }, rng);
      assert.ok(Math.abs(nn.forwardProp(net, f) - lab.predict(f, model)) < 1e-12, model.name);
    }
  }
  const wrong = nn.buildNetwork(spec({ readout: 'z0' }));
  assert.throws(() => nn.loadWeights(wrong, WANDA_MODEL));
});

test('dead gates: last-layer RZ with the demos\' readout; q0 too with <Z0> only', () => {
  const net = nn.buildNetwork(spec());
  const rz = gates(net).filter(n => n.rzDead);
  assert.deepEqual(rz.map(n => `q${n.index}L${n.layer}`), ['q0L4', 'q1L4', 'q2L4', 'q3L4']);
  assert.ok(gates(net).every(n => !n.ryDead && !n.dead));
  const f = Array.from({ length: 8 }, rng);
  const base = nn.forwardProp(net, f);
  rz.forEach(n => { n.phase += 1.3; });
  assert.ok(Math.abs(nn.forwardProp(net, f) - base) < 1e-12, 'a dead RZ changed the score');
  const pure = nn.buildNetwork(spec({ readout: 'z0', layers: 2 }));
  assert.deepEqual(gates(pure).filter(n => n.dead).map(n => `q${n.index}L${n.layer}`), ['q0L2']);
});

test('training (cross-entropy) through the adapter lowers the loss', () => {
  // A learnable rule on feature vectors: target iff features 0 and 2 are high.
  const data = Array.from({ length: 160 }, (_, i) => {
    const label = i % 2;
    const f = Array.from({ length: 8 }, () => rng() * 0.4);
    if (label) { f[0] = 0.6 + rng() * 0.4; f[2] = 0.6 + rng() * 0.4; }
    return { f, label };
  });
  const net = nn.buildNetwork(spec({ layers: 2 }));
  const loss = () => data.reduce((s, d) => s + nn.bce(nn.forwardProp(net, d.f), d.label), 0) / data.length;
  const before = loss();
  for (let epoch = 0; epoch < 40; epoch++) {
    data.forEach((d, i) => {
      nn.forwardProp(net, d.f);
      nn.backProp(net, d.label);
      if ((i + 1) % 10 === 0) nn.updateWeights(net, 0.3);
    });
  }
  const after = loss();
  assert.ok(after < before * 0.5, `loss ${before} -> ${after}`);
  const fixed = gates(net).flatMap(n => n.inputLinks).filter(l => l.fixed);
  assert.ok(fixed.every(l => l.weight === Math.PI), 'fixed encodings/CNOTs were trained');
});

test('shots make scores sampled estimates; exact mode is deterministic', () => {
  const net = nn.buildNetwork(spec());
  const f = Array.from({ length: 8 }, rng);
  assert.equal(nn.forwardProp(net, f), nn.forwardProp(net, f));
  nn.setShots(net, 10);
  assert.ok(new Set(Array.from({ length: 30 }, () => nn.forwardProp(net, f))).size > 1);
  const pure = nn.buildNetwork(spec({ readout: 'z0', shots: 10 }));
  for (let k = 0; k < 20; k++) {
    const s = nn.forwardProp(pure, f); // (1 + <Z0>) / 2 from 10 shots = k / 10
    assert.ok(Math.abs(s * 10 - Math.round(s * 10)) < 1e-9, String(s));
  }
});

test('probe state matches the forward pass', () => {
  const net = nn.buildNetwork(spec());
  const f = Array.from({ length: 8 }, rng);
  const view = nn.probe(net, f);
  assert.equal(view.layers.length, 4);
  assert.equal(view.final.pairs.length, 6);
  assert.ok(Math.abs(view.score - nn.forwardProp(net, f)) < 1e-12);
  assert.deepEqual(view.observables.map(v => +v.toFixed(12)), nn.getReadout(net).values.map(v => +v.toFixed(12)));
});

test('classical baseline (logistic regression) learns a separable rule', () => {
  const xs = Array.from({ length: 200 }, () => Array.from({ length: 8 }, rng));
  const ys = xs.map(x => (x[1] + x[5] > 1 ? 1 : 0));
  const score = nn.trainLogistic(xs, ys);
  const acc = xs.filter((x, i) => (score(x) >= 0.5 ? 1 : 0) === ys[i]).length / xs.length;
  assert.ok(acc > 0.9, `logistic accuracy ${acc}`);
});

test('classifier block (coherent oracle) only with the quantum-only readout', () => {
  assert.equal(nn.classifierBlock(nn.buildNetwork(spec())), null);
  const net = nn.buildNetwork(spec({ readout: 'z0', layers: 2 }));
  const block = nn.classifierBlock(net);
  const f = Array.from({ length: 8 }, rng);
  const re = new Float64Array(16), im = new Float64Array(16);
  re[0] = 1;
  block.apply(f, re, im, false);
  let p0 = 0; // P(qubit 0 reads 0) after running the block = acceptance
  for (let a = 0; a < 16; a += 2) p0 += re[a] ** 2 + im[a] ** 2;
  assert.ok(Math.abs(p0 - block.acceptance(f)) < 1e-12);
  assert.ok(Math.abs(block.acceptance(f) - nn.forwardProp(net, f)) < 1e-12);
  block.apply(f, re, im, true); // uncompute returns to |0000>
  assert.ok(Math.abs(re[0] ** 2 + im[0] ** 2 - 1) < 1e-12);
});

test('demo weights are refused by other features or a look-alike circuit', () => {
  const wanda = WANDA_MODEL;
  assert.throws(() => nn.loadWeights(nn.buildNetwork(spec({ featureIds: FEATURES.map(f => f + '_other') })), wanda));
  assert.throws(() => nn.loadWeights(nn.buildNetwork(spec({ reupload: false })), wanda));
  assert.throws(() => nn.loadWeights(nn.buildNetwork(spec({ entangler: 'cry' })), wanda));
  assert.throws(() => nn.loadWeights(nn.buildNetwork(spec({ qubits: 5 })), wanda));
  nn.loadWeights(nn.buildNetwork(spec()), wanda); // the right circuit accepts them
});
