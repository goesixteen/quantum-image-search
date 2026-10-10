import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createUniformState, oracle, diffuse, probabilities,
  recommendIterations, simulateGrover, sample, bitstring,
} from '../dist/quantum.js';

const close = (actual, expected, label = '') => {
  assert.ok(Math.abs(actual - expected) < 1e-11, `${label}: ${actual} != ${expected}`);
};
const norm = state => state.reduce((sum, amplitude) => sum + amplitude ** 2, 0);

test('oracle flips phase without changing probabilities or mutating inputs', () => {
  const input = createUniformState(16);
  const result = oracle(input, [3, 3, 8]);
  close(input[3], 0.25);
  close(result[3], -0.25);
  close(result[8], -0.25);
  assert.deepEqual(probabilities(result), probabilities(input));
  assert.deepEqual(oracle(result, [3, 8]), input);
});

test('diffuser independently matches matrix 2/N - Kronecker delta', () => {
  const input = [0.5, -0.5, 0.5, -0.5];
  const expected = input.map((_, i) => input.reduce(
    (sum, amplitude, j) => sum + (2 / input.length - Number(i === j)) * amplitude, 0,
  ));
  const result = diffuse(input);
  result.forEach((value, index) => close(value, expected[index]));
  close(norm(result), norm(input));
  assert.deepEqual(diffuse(result), input);
});

test('one of four marked states is certain after one oracle and diffuser', () => {
  const run = simulateGrover(4, [2], 1);
  assert.deepEqual(run.history[1].amplitudes, [0, 0, 1, 0]);
  close(run.history[1].successProbability, 1);
});

test('full trajectories agree with analytic marked and unmarked amplitudes', () => {
  for (const N of [16, 64]) {
    for (const M of [1, 2, 4, N / 2, N - 1]) {
      // Nonconsecutive locations check indexing as well as total success.
      const marks = Array.from({ length: M }, (_, i) => (3 + i * 5) % N);
      const markedSet = new Set(marks);
      const theta = Math.asin(Math.sqrt(M / N));
      const run = simulateGrover(N, marks, 2 * recommendIterations(N, M) + 8);
      for (const frame of run.history) {
        const angle = (2 * frame.iteration + 1) * theta;
        close(norm(frame.amplitudes), 1, `norm N=${N}, M=${M}, k=${frame.iteration}`);
        close(frame.successProbability, Math.sin(angle) ** 2, 'success formula');
        frame.amplitudes.forEach((amplitude, index) => {
          const expected = markedSet.has(index)
            ? Math.sin(angle) / Math.sqrt(M)
            : Math.cos(angle) / Math.sqrt(N - M);
          close(amplitude, expected, `amplitude ${index}`);
          close(frame.probabilities[index], expected ** 2, `probability ${index}`);
        });
      }
    }
  }
});

test('recommendation chooses first peak and extra iterations can undo success', () => {
  assert.equal(recommendIterations(16, 1), 3);
  assert.equal(recommendIterations(64, 1), 6);
  assert.equal(recommendIterations(16, 2), 2);
  assert.equal(recommendIterations(64, 2), 4);
  assert.equal(recommendIterations(16, 8), 0); // Equal success; fewer calls.
  const run = simulateGrover(16, [7], 6);
  close(run.history[3].successProbability, 0.9613189697265625);
  assert.ok(run.history[6].successProbability < 0.03);
  for (const N of [2, 4, 16, 64, 256]) {
    for (let M = 1; M <= N; M += 1) {
      const k = recommendIterations(N, M);
      const theta = Math.asin(Math.sqrt(M / N));
      const p = step => Math.sin((2 * step + 1) * theta) ** 2;
      if (k > 0) assert.ok(p(k) >= p(k - 1) - 1e-12);
      assert.ok(p(k) >= p(k + 1) - 1e-12);
    }
  }
});

test('empty marks, full marks and one-state registers have explicit safe behavior', () => {
  const empty = simulateGrover(16, []);
  assert.equal(empty.iterations, 0);
  assert.equal(empty.theta, 0);
  assert.equal(empty.history[0].successProbability, 0);
  const extraEmpty = simulateGrover(16, [], 4);
  for (const frame of extraEmpty.history) {
    assert.deepEqual(frame.amplitudes, createUniformState(16));
  }
  const all = simulateGrover(16, Array.from({ length: 16 }, (_, i) => i), 3);
  assert.equal(recommendIterations(16, 16), 0);
  for (const frame of all.history) close(frame.successProbability, 1);
  assert.deepEqual(all.history[1].amplitudes, Array(16).fill(-0.25));
  assert.equal(simulateGrover(1, [0]).history[0].successProbability, 1);
  assert.equal(simulateGrover(1, []).history[0].successProbability, 0);
});

test('history snapshots are independent and duplicates describe one predicate', () => {
  const run = simulateGrover(16, [5, 5]);
  assert.equal(run.iterations, 3);
  close(run.history[0].successProbability, 1 / 16);
  assert.notEqual(run.history[0].amplitudes, run.history[1].amplitudes);
  const later = run.history[1].amplitudes.slice();
  run.history[0].amplitudes[0] = 99;
  assert.deepEqual(run.history[1].amplitudes, later);
  assert.equal(JSON.parse(JSON.stringify(run)).history.length, 4);
});

test('measurement follows CDF boundaries, normalizes drift, and is reproducible', () => {
  assert.equal(sample([0, 0.2, 0.3, 0.5, 0], () => 0), 1);
  assert.equal(sample([0, 0.2, 0.3, 0.5, 0], () => 0.2), 2);
  assert.equal(sample([0, 0.2, 0.3, 0.5, 0], () => 0.5), 3);
  assert.equal(sample([0, 0.2, 0.3, 0.5, 0], () => 1 - Number.EPSILON), 3);
  assert.equal(sample([0, 2, 3, 5, 0], () => 0.1), 1);
  const makeRng = seed => () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const distribution = simulateGrover(16, [7]).history.at(-1).probabilities;
  const rng = makeRng(2026);
  const results = Array.from({ length: 20000 }, () => sample(distribution, rng));
  const duplicate = makeRng(2026);
  assert.deepEqual(results, Array.from({ length: 20000 }, () => sample(distribution, duplicate)));
  const hitRate = results.filter(index => index === 7).length / results.length;
  assert.ok(Math.abs(hitRate - distribution[7]) < 0.01, `hit rate ${hitRate}`);
});

test('basis labels use big-endian binary and reject out-of-register indices', () => {
  assert.equal(bitstring(3, 4), '0011');
  assert.equal(bitstring(63, 6), '111111');
  assert.equal(bitstring(0, 0), '');
  assert.throws(() => bitstring(16, 4), RangeError);
  assert.throws(() => bitstring(-1, 4), RangeError);
  assert.throws(() => bitstring(0, 1.5), RangeError);
});

test('invalid states and invalid probabilistic inputs fail explicitly', () => {
  for (const N of [0, -2, 3, 4.5, NaN, Infinity]) {
    assert.throws(() => createUniformState(N), RangeError);
  }
  assert.throws(() => simulateGrover(16, [-1]), RangeError);
  assert.throws(() => simulateGrover(16, [16]), RangeError);
  assert.throws(() => simulateGrover(16, [1.5]), RangeError);
  assert.throws(() => simulateGrover(16, [1], -1), RangeError);
  assert.throws(() => simulateGrover(16, [1], 0.5), RangeError);
  assert.throws(() => recommendIterations(16, 17), RangeError);
  assert.throws(() => oracle([0, NaN], [0]), TypeError);
  assert.throws(() => diffuse([1, '0']), TypeError);
  assert.throws(() => probabilities([1e308, 0]), RangeError);
  assert.throws(() => sample([0, 0]), RangeError);
  assert.throws(() => sample([-0.1, 1.1]), RangeError);
  assert.throws(() => sample([0.5, NaN]), RangeError);
  assert.throws(() => sample([0.5, 0.5], () => 1), RangeError);
  assert.throws(() => sample([0.5, 0.5], () => -0.01), RangeError);
});
