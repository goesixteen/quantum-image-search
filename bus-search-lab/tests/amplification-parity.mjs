/**
 * Cross-runtime evaluation audit. Requires Python + NumPy, as the model does.
 * Run: QNN_PYTHON=/path/to/python node tests/amplification-parity.mjs
 * Uses every possible correct/false/unmarked truth-count combination for both
 * supported grids; compares the Python formula with actual browser states.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { recommendIterations, simulateGrover } from '../dist/quantum.js';

const python = process.env.QNN_PYTHON ?? 'python';
const modelDirectory = fileURLToPath(new URL('../model/', import.meta.url));
const script = `
import json, sys
sys.path.insert(0, sys.argv[1])
from amplification_audit import recommend_iterations, target_mass
rows = []
for n in [16, 64]:
    order = [(3 + i * 5) % n for i in range(n)]
    for m in range(n + 1):
        marks, unmarked = order[:m], order[m:]
        for correct in range(m + 1):
            for other in range(n - m + 1):
                truth = marks[:correct] + unmarked[:other]
                value = target_mass(n, marks, truth)
                rows.append([n, m, correct, other, recommend_iterations(n, m),
                             value['ideal_predicate_mass'], value['ideal_alpha32_target_mass'],
                             value['effective_target_mass_if_empty_oracle_means_no_output']])
print(json.dumps(rows, separators=(',', ':'), allow_nan=False))
`;
const result = spawnSync(python, ['-c', script, modelDirectory], {
  encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
});
if (result.error) throw result.error;
assert.equal(result.status, 0, result.stderr);
const rows = JSON.parse(result.stdout);
let maxPredicateError = 0;
let maxTargetError = 0;
let maximumCase;
let checked = 0;
const cache = new Map();
for (const [n, m, correct, other, expectedIterations, expectedPredicate, expectedTarget, expectedEffective] of rows) {
  const key = `${n}/${m}`;
  if (!cache.has(key)) {
    const order = Array.from({ length: n }, (_, i) => (3 + i * 5) % n);
    const marks = order.slice(0, m);
    const run = simulateGrover(n, marks);
    assert.equal(recommendIterations(n, m), expectedIterations, `recommendation ${key}`);
    assert.equal(run.iterations, expectedIterations, `default iteration ${key}`);
    cache.set(key, { order, frame: run.history.at(-1) });
  }
  const { order, frame } = cache.get(key);
  const truth = [...order.slice(0, correct), ...order.slice(m, m + other)];
  const target = truth.reduce((sum, index) => sum + frame.probabilities[index], 0);
  const predicateError = Math.abs(frame.successProbability - expectedPredicate);
  const targetError = Math.abs(target - expectedTarget);
  maxPredicateError = Math.max(maxPredicateError, predicateError);
  if (targetError > maxTargetError) {
    maxTargetError = targetError;
    maximumCase = { n, m, correct, other, expectedTarget, actualTarget: target };
  }
  assert.ok(predicateError < 1e-12, `predicate mass ${key}: ${predicateError}`);
  assert.ok(targetError < 1e-12, `actual target mass ${key}/${correct}/${other}: ${targetError}`);
  assert.ok(Math.abs(expectedEffective - (m === 0 ? 0 : target)) < 1e-12, `empty-oracle semantics ${key}`);
  checked += 1;
}
assert.equal(checked, 48874);
console.log(JSON.stringify({
  checkedTruthCombinations: checked, checkedRegisterAndMarkCounts: cache.size,
  maxPredicateError, maxTargetError, maximumCase,
  coverage: 'N=16/64, every M=0..N and every possible intersection cardinality; nonconsecutive addresses; empty/full/disjoint/partial/identical truth sets; empty-oracle no-output policy',
}, null, 2));
