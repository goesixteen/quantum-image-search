import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  forward, adjointGradient, parameterShiftGradient, blochVectors, sampleZ,
  entanglement, hermitianEigenvalues, sampleCounts, sampleObservables, deadParameters,
} from '../src/quantum/circuit.js';
import { compileNetwork, ENTANGLERS, PROJECT_OBSERVABLES } from '../src/quantum/ansatz.js';
import * as busQnn from '../../bus-search-lab/dist/qnn.js';
import * as crowdQnn from '../../waldo-search-lab/dist/qnn.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const rot = (type, target, param, control = -1) => ({ type, target, control, terms: [{ param, input: -1 }] });
const circ = (nQubits, nParams, ops, observables = [1]) => ({ nQubits, nParams, ops, observables });
const z0 = (c, p, x = []) => forward(c, p, x).observables[0];
let seed = 3;
const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

test('single-qubit rotations give the textbook <Z>', () => {
  for (const theta of [0, 0.3, 1.7, Math.PI, -2.2]) {
    for (const type of ['rx', 'ry']) close(z0(circ(1, 1, [rot(type, 0, 0)]), [theta]), Math.cos(theta));
  }
});

test('controlled gates only act when the control is |1>; Z-strings are parities', () => {
  const c = circ(2, 2, [rot('ry', 0, 1), rot('ry', 1, 0, 0)], [0b10]);
  close(z0(c, [1.1, 0]), 1);
  close(z0(c, [1.1, Math.PI]), Math.cos(1.1));
  const bell = forward(circ(2, 1, [rot('ry', 0, 0), { type: 'x', target: 1, control: 0 }], [0b01, 0b10, 0b11]), [Math.PI / 2], []);
  close(bell.observables[0], 0); close(bell.observables[1], 0); close(bell.observables[2], 1); // <Z0 Z1> = 1
});

test('fixed encoding terms: angle = scale * feature, no parameter', () => {
  const c = circ(1, 0, [{ type: 'ry', target: 0, control: -1, terms: [{ param: -1, input: 0, scale: Math.PI }] }]);
  close(z0(c, [], [0.3]), Math.cos(Math.PI * 0.3));
});

test('parity: same 7 observables as the demos for their trained weights', () => {
  for (const [name, lab, file] of [['bus', busQnn, '../../bus-search-lab/dist/model/model.json'], ['crowd', crowdQnn, '../../waldo-search-lab/dist/model/model.json']]) {
    const model = JSON.parse(readFileSync(new URL(file, import.meta.url)));
    const { circuit } = compileNetwork({ numFeatures: 8, qubits: 4, layers: model.layers, entangler: 'cnot', reupload: true, readout: 'project' });
    assert.equal(circuit.nParams, model.theta.length, name);
    for (let n = 0; n < 25; n++) {
      const f = Array.from({ length: 8 }, rng);
      const ours = forward(circuit, model.theta, f).observables;
      const theirs = lab.quantumReadout(f, model.theta);
      theirs.forEach((v, k) => close(ours[k], v, 1e-12));
    }
  }
});

test('Bloch vectors: length 1 for a product state, 0 for a Bell pair', () => {
  const product = forward(circ(2, 2, [rot('ry', 0, 0), rot('rx', 1, 1)]), [0.7, 1.9], []);
  for (const v of blochVectors(product.re, product.im, 2)) close(Math.hypot(...v), 1);
  const bell = forward(circ(2, 1, [rot('ry', 0, 0), { type: 'x', target: 1, control: 0 }]), [Math.PI / 2], []);
  for (const v of blochVectors(bell.re, bell.im, 2)) close(Math.hypot(...v), 0);
});

test('states stay normalized for every entangler', () => {
  for (const entangler of ENTANGLERS) {
    const { circuit } = compileNetwork({ numFeatures: 8, qubits: 4, layers: 3, entangler, reupload: true });
    const params = Array.from({ length: circuit.nParams }, (_, i) => Math.sin(7 * i + 1));
    const { re, im } = forward(circuit, params, Array.from({ length: 8 }, rng));
    close(re.reduce((s, v, i) => s + v * v + im[i] * im[i], 0), 1, 1e-12);
  }
});

test('adjoint and parameter-shift gradients match finite differences', () => {
  for (const entangler of ENTANGLERS) for (const reupload of [false, true]) for (const readout of ['project', 'z0']) {
    const { circuit } = compileNetwork({ numFeatures: 8, qubits: 4, layers: 2, entangler, reupload, readout });
    const params = Array.from({ length: circuit.nParams }, (_, i) => Math.cos(3.7 * i) * 0.8);
    const x = Array.from({ length: 8 }, rng);
    const c = circuit.observables.map((_, k) => Math.sin(k + 1)); // E = sum_k c_k <O_k>
    const loss = p => forward(circuit, p, x).observables.reduce((s, v, k) => s + c[k] * v, 0);
    const adj = adjointGradient(circuit, params, x, c).grad;
    const ps = parameterShiftGradient(circuit, params, x, () => c, 0).grad;
    const h = 1e-6;
    for (let i = 0; i < params.length; i++) {
      const up = params.slice(), dn = params.slice();
      up[i] += h; dn[i] -= h;
      const fd = (loss(up) - loss(dn)) / (2 * h);
      close(adj[i], fd, 1e-6);
      close(ps[i], fd, 1e-6);
    }
  }
});

test('shot sampling is unbiased; all observables come from the same shots', () => {
  for (const shots of [10, 1000]) {
    const draws = Array.from({ length: 4000 }, () => sampleZ(0.4, shots, rng));
    const mean = draws.reduce((a, b) => a + b) / draws.length;
    close(mean, 0.4, 0.02);
  }
  assert.equal(sampleZ(0.4, 0), 0.4);
  const bell = forward(circ(2, 1, [rot('ry', 0, 0), { type: 'x', target: 1, control: 0 }]), [Math.PI / 2], []);
  const est = sampleObservables(bell.re, bell.im, [0b01, 0b11], 50, rng);
  close(est[1], 1); // perfectly correlated in every shot, not just on average
  const counts = sampleCounts([0.5, 0, 0.25, 0.25], 20000, rng);
  close(counts[0] / 20000, 0.5, 0.02); assert.equal(counts[1], 0);
});

test('entanglement: mutual information and negativity on textbook states', () => {
  const product = forward(circ(2, 2, [rot('ry', 0, 0), rot('rx', 1, 1)]), [0.7, 1.9], []);
  const e0 = entanglement(product.re, product.im, 2);
  close(e0.single[0], 0, 1e-6); close(e0.pairs[0].mutualInfo, 0, 1e-6); close(e0.pairs[0].negativity, 0, 1e-9);
  const bell = forward(circ(2, 1, [rot('ry', 0, 0), { type: 'x', target: 1, control: 0 }]), [Math.PI / 2], []);
  const e1 = entanglement(bell.re, bell.im, 2);
  close(e1.single[0], 1, 1e-6); close(e1.pairs[0].mutualInfo, 2, 1e-6); close(e1.pairs[0].negativity, 0.5, 1e-9);
  const ghz = forward(circ(3, 1, [rot('ry', 0, 0), { type: 'x', target: 1, control: 0 }, { type: 'x', target: 2, control: 1 }]), [Math.PI / 2], []);
  for (const p of entanglement(ghz.re, ghz.im, 3).pairs) { close(p.mutualInfo, 1, 1e-6); close(p.negativity, 0, 1e-9); }
  const partial = forward(circ(2, 1, [rot('ry', 0, 0), { type: 'x', target: 1, control: 0 }]), [0.8], []);
  close(entanglement(partial.re, partial.im, 2).pairs[0].negativity, Math.sin(0.8) / 2, 1e-9);
  const ev = hermitianEigenvalues([2, 0, 0, 2], [0, 1, -1, 0], 2);
  close(ev[0], 1, 1e-9); close(ev[1], 3, 1e-9);
});

test('dead parameters match the demos\' own audit', () => {
  // The demos' parameter audit: with the CNOT ring and Z-string readout, the
  // four last-layer RZ angles (theta slots 25, 27, 29, 31) cannot matter.
  const { circuit, params } = compileNetwork({ numFeatures: 8, qubits: 4, layers: 4, entangler: 'cnot', reupload: true, readout: 'project' });
  const dead = deadParameters(circuit, 8);
  assert.deepEqual(dead.flatMap((d, i) => d ? [i] : []), [25, 27, 29, 31]);
  assert.ok([25, 27, 29, 31].every(i => params[i].kind === 'rz' && params[i].layer === 4));
  // Reading only Z0 also kills q0's last RY (the final ring maps Z0 to Z1Z2Z3).
  const z0only = compileNetwork({ numFeatures: 8, qubits: 4, layers: 2, entangler: 'cnot', reupload: true, readout: 'z0' });
  const deadZ0 = deadParameters(z0only.circuit, 8);
  assert.ok(z0only.params.every((p, i) => deadZ0[i] === (p.layer === 2 && (p.kind === 'rz' || p.node === 0))));
  assert.equal(PROJECT_OBSERVABLES.length, 7);
});

test('coherent amplification: a confident classifier gives exactly Grover', async () => {
  const { coherentAmplification } = await import('../src/quantum/coherent.js');
  const { simulateGrover } = await import('../../bus-search-lab/dist/quantum.js');
  const { applyCircuit } = await import('../src/quantum/circuit.js');
  // 16 regions, a 1-qubit "classifier" that flips its qubit (rejects) for
  // unmarked regions and leaves |0> (accepts) for marked ones.
  const marked = new Set([3, 11]);
  const flip = circ(1, 0, [{ type: 'x', target: 0, control: -1 }]);
  const run = coherentAmplification({ N: 16, D: 2, rounds: 4, accept: a => (a & 1) === 0,
    applyBlock: (i, re, im, inv) => { if (!marked.has(i)) applyCircuit(flip, [], [], re, im, inv); } });
  const ideal = simulateGrover(16, [...marked], 4).history;
  for (let k = 0; k <= 4; k++) for (let i = 0; i < 16; i++) close(run.history[k].probabilities[i], ideal[k].probabilities[i], 1e-12);
});

test('coherent amplification: an uncertain classifier degrades the search', async () => {
  const { coherentAmplification } = await import('../src/quantum/coherent.js');
  const { applyCircuit } = await import('../src/quantum/circuit.js');
  // Region 5 is the target. The classifier accepts it with probability
  // cos^2(t/2); every other region with sin^2(t/2): confidence falls with t.
  const success = t => {
    const c = circ(1, 1, [rot('ry', 0, 0)]);
    const res = coherentAmplification({ N: 16, D: 2, rounds: 3, accept: a => (a & 1) === 0,
      applyBlock: (i, re, im, inv) => applyCircuit(c, [i === 5 ? t : Math.PI - t], [], re, im, inv) });
    return res.history[3].probabilities[5];
  };
  close(success(0), 0.9613, 1e-3);           // perfect classifier: Grover's 96%
  assert.ok(success(0.6) < success(0.3) && success(0.3) < success(0));
  for (let t of [0, 0.4, 1.2]) {             // probability is conserved
    const c = circ(1, 1, [rot('ry', 0, 0)]);
    const res = coherentAmplification({ N: 16, D: 2, rounds: 3, accept: a => (a & 1) === 0,
      applyBlock: (i, re, im, inv) => applyCircuit(c, [t * (i % 3)], [], re, im, inv) });
    close(res.history[3].probabilities.reduce((x, y) => x + y, 0), 1, 1e-12);
  }
});
