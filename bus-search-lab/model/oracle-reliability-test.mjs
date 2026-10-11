/** Independent direct binomial sums and actual statevector references. */
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { binomialPMF, groverCountsOutcome, computeOracleReliability, groverFirstPeak } from './oracle_reliability.js';
import { simulateGrover, recommendIterations } from '../dist/quantum.js';

function choose(n, k) {
  let result = 1;
  for (let j = 1; j <= k; j++) result *= (n - j + 1) / j;
  return result;
}
const directBinomial = (n, p) => Array.from({ length: n + 1 }, (_, k) => choose(n, k) * p ** k * (1 - p) ** (n - k));
const close = (actual, expected, label, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} vs ${expected}`);
let pmfError = 0, statevectorCaseError = 0, expectationError = 0, cases = 0, oracleCases = 0;
for (const n of [0, 1, 4, 16, 64]) for (const p of [0, 1e-6, .01, .2, .5, .99, 1]) {
  const actual = binomialPMF(n, p), expected = directBinomial(n, p);
  actual.forEach((v, i) => { pmfError = Math.max(pmfError, Math.abs(v - expected[i])); close(v, expected[i], `binomial n${n} k${i}`); });
  close(actual.reduce((a, b) => a + b, 0), 1, 'PMF sum');
  close(actual.reduce((total, p, k) => total + k * p, 0), n * p, 'PMF mean');
}
for (const p of [1e-12, .01, .5, 1 - 1e-12]) {
  const pmf = binomialPMF(1024, p);
  close(pmf.reduce((a, b) => a + b, 0), 1, 'large PMF sum');
  close(pmf.reduce((a, b, k) => a + b * k, 0), 1024 * p, 'large PMF mean', 1e-10);
}
const parameters = [
  { N: 16, trueCount: 1, recall: .9, falsePositiveRate: .01 },
  { N: 64, trueCount: 1, recall: .9, falsePositiveRate: .01 },
  { N: 64, trueCount: 4, recall: .85, falsePositiveRate: .02 },
  { N: 16, trueCount: 8, recall: .5, falsePositiveRate: .3 },
  { N: 64, trueCount: 0, recall: .5, falsePositiveRate: .2 },
  { N: 16, trueCount: 16, recall: .3, falsePositiveRate: .77 },
  { N: 16, trueCount: 1, recall: 0, falsePositiveRate: .01 },
  { N: 16, trueCount: 1, recall: 1, falsePositiveRate: 1 },
  { N: 64, trueCount: 1, recall: 1, falsePositiveRate: 0 },
  { N: 16, trueCount: 4, recall: 0, falsePositiveRate: 0 },
  { N: 1, trueCount: 1, recall: .3, falsePositiveRate: .2 },
  { N: 1, trueCount: 0, recall: .8, falsePositiveRate: .2 },
];
for (const p of parameters) {
  const { N, trueCount: t, recall: r, falsePositiveRate: f } = p;
  const actual = computeOracleReliability(p);
  const wa = directBinomial(t, r), wb = directBinomial(N - t, f);
  let expectedTrue = 0, expectedPredicate = 0, expectedIterations = 0, weightSum = 0;
  for (let A = 0; A <= t; A++) for (let B = 0; B <= N - t; B++) {
    const marks = [...Array.from({ length: A }, (_, i) => i), ...Array.from({ length: B }, (_, i) => t + i)];
    const run = simulateGrover(N, marks);
    const frame = run.history.at(-1);
    const trueMass = marks.length ? frame.probabilities.slice(0, t).reduce((a, b) => a + b, 0) : 0;
    const formula = groverCountsOutcome(N, t, A, B);
    close(formula.iterations, recommendIterations(N, A + B), 'first peak');
    close(formula.trueTargetMass, trueMass, 'actual statevector target mass');
    statevectorCaseError = Math.max(statevectorCaseError, Math.abs(formula.trueTargetMass - trueMass));
    const weight = wa[A] * wb[B];
    weightSum += weight;
    expectedTrue += weight * trueMass;
    expectedPredicate += weight * frame.successProbability;
    expectedIterations += weight * run.iterations;
    oracleCases += 1;
  }
  close(weightSum, 1, 'joint direct binomial sum');
  close(actual.expectedTrueTargetMass, expectedTrue, 'exact expectation vs statevector mixture');
  close(actual.expectedPredicateMass, expectedPredicate, 'predicate expectation');
  close(actual.expectedGroverIterations, expectedIterations, 'round expectation');
  close(actual.emptyOracleProbability, (1 - r) ** t * (1 - f) ** (N - t), 'empty oracle closed form');
  close(actual.anyTrueMarkProbability, 1 - (1 - r) ** t, 'true mark closed form');
  close(actual.anyFalseMarkProbability, 1 - (1 - f) ** (N - t), 'false mark closed form');
  close(actual.cleanHitProbability, (1 - (1 - r) ** t) * (1 - f) ** (N - t), 'clean hit closed form');
  expectationError = Math.max(expectationError, Math.abs(actual.expectedTrueTargetMass - expectedTrue));
  cases += 1;
}
// One-true-region uniformly accepted classical choice has a closed-form mean.
for (const N of [16, 64]) for (const f of [0, .001, .01, .1, 1]) {
  const r = .9, result = computeOracleReliability({ N, trueCount: 1, recall: r, falsePositiveRate: f });
  const expected = f === 0 ? r : r * (-Math.expm1(N * Math.log1p(-f))) / (N * f);
  close(result.expectedUniformAcceptedReference, expected, 'uniform accepted closed form');
}
assert.equal(computeOracleReliability({ N: 16, trueCount: 2, recall: 0, falsePositiveRate: 0 }).expectedTrueTargetMassGivenRun, null);
assert.equal(computeOracleReliability({ N: 16, trueCount: 0 }).expectedTrueTargetMass, 0);
for (const N of [1, 16, 64]) for (const r of [0, .3, 1]) {
  close(computeOracleReliability({ N, trueCount: N, recall: r, falsePositiveRate: .77 }).expectedTrueTargetMass,
    1 - (1 - r) ** N, 'all-true regions: any nonempty search must locate a true region');
  const all = computeOracleReliability({ N, trueCount: N, recall: 1, falsePositiveRate: 1 });
  close(all.expectedTrueTargetMass, 1, 'all-true/full-oracle target');
  close(all.expectedGroverIterations, 0, 'full-oracle zero rounds');
}
for (const N of [16, 64]) for (const t of [0, 1, 4, N]) {
  const full = computeOracleReliability({ N, trueCount: t, recall: 1, falsePositiveRate: 1 });
  close(full.expectedTrueTargetMass, t / N, 'full marked set uniform true mass');
  close(full.expectedPredicateMass, 1, 'full marked set accepted probability');
}
assert.throws(() => computeOracleReliability({ N: 3 }), RangeError);
assert.throws(() => computeOracleReliability({ trueCount: .5 }), RangeError);
assert.throws(() => computeOracleReliability({ recall: NaN }), RangeError);
assert.throws(() => computeOracleReliability({ falsePositiveRate: 1.1 }), RangeError);
assert.throws(() => groverFirstPeak(16, 17), RangeError);
const hash = path => createHash('sha256').update(readFileSync(new URL(path, import.meta.url))).digest('hex');
const report = { verification: 'PASS', directBinomialConfigurations: 35, largePMFConfigurations: 4,
  weightedStatevectorEnsembles: cases, actualStatevectorOracles: oracleCases,
  allTrueAndFullOracleClosedFormChecks: 17,
  maximumDirectPMFError: pmfError, maximumScenarioStatevectorError: statevectorCaseError, maximumExpectedTrueMassError: expectationError,
  sourceSha256: { module: hash('./oracle_reliability.js'), test: hash('./oracle-reliability-test.mjs'), quantum: hash('../dist/quantum.js') },
  coverage: 'Exact direct binomial weights; actual oracle/diffuser statevectors; empty/no-output, absent/all-true/full-marked cases; known-M round selection; nonempty-conditioned expectation; validation rejects invalid probabilities.' };
writeFileSync(new URL('./oracle-reliability-verification.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
