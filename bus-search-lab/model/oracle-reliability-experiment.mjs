/** Generate exact hypothetical error-propagation results; no trained files read. */
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { computeOracleReliability } from './oracle_reliability.js';

const hash = path => createHash('sha256').update(readFileSync(new URL(path, import.meta.url))).digest('hex');
const rates = [0, .001, .005, .01, .02, .05, .10];
const curves = [16, 64].flatMap(N => rates.map(falsePositiveRate => computeOracleReliability({ N, trueCount: 1, recall: .9, falsePositiveRate })));
const examples = [
  { N: 16, trueCount: 1, recall: 1, falsePositiveRate: 0 },
  { N: 64, trueCount: 1, recall: 1, falsePositiveRate: 0 },
  { N: 64, trueCount: 4, recall: .9, falsePositiveRate: .01 },
  { N: 64, trueCount: 0, recall: .9, falsePositiveRate: .01 },
  { N: 16, trueCount: 1, recall: 0, falsePositiveRate: .01 },
  { N: 16, trueCount: 1, recall: 1, falsePositiveRate: 1 },
].map(parameters => computeOracleReliability(parameters));
const report = { version: 1, scope: 'Exact finite expectation under a constructed independent oracle-error model; not empirical QNN performance.',
  sourceSha256: { module: hash('./oracle_reliability.js'), experiment: hash('./oracle-reliability-experiment.mjs') },
  policy: 'Actual M is known per constructed predicate; use the project first-peak Grover rule. Empty oracle returns no output.',
  curves, examples };
writeFileSync(new URL('./oracle-reliability-results.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(curves.filter(x => x.parameters.falsePositiveRate === .01).map(x => ({ N: x.parameters.N,
  trueTargetMass: x.expectedTrueTargetMass, acceptedSetMass: x.expectedPredicateMass, anyFalseMarkProbability: x.anyFalseMarkProbability,
  emptyProbability: x.emptyOracleProbability, cleanHitProbability: x.cleanHitProbability,
  classicalUniformAcceptedReference: x.expectedUniformAcceptedReference, expectedSearchOracleCalls: x.expectedGroverIterations })), null, 2));
