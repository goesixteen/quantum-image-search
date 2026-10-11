/**
 * Exact finite expectation for a CONSTRUCTED independent detector-error model.
 * No empirical model calibration, score ranking, hardware timing or network I/O.
 * Pure browser module: safe to copy into dist without changing import paths.
 */

function integer(value, name, low, high) {
  if (!Number.isSafeInteger(value) || value < low || value > high) throw new RangeError(`${name} must be an integer in ${low}..${high}.`);
}

function probability(value, name) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${name} must be a finite probability in [0,1].`);
}

function size(N) {
  integer(N, 'N', 1, 1024);
  if (!Number.isInteger(Math.log2(N))) throw new RangeError('N must be a power of two.');
}

function sum(values) {
  let total = 0, correction = 0;
  for (const value of values) {
    const y = value - correction, next = total + y;
    correction = (next - total) - y;
    total = next;
  }
  return total;
}

/** Stable binomial PMF by recurrence outward from its mode. */
export function binomialPMF(n, p) {
  integer(n, 'n', 0, 1024);
  probability(p, 'p');
  const weights = Array(n + 1).fill(0);
  if (p === 0 || p === 1) { weights[p === 0 ? 0 : n] = 1; return weights; }
  const mode = Math.min(n, Math.floor((n + 1) * p));
  weights[mode] = 1;
  for (let k = mode; k < n; k++) weights[k + 1] = weights[k] * (n - k) / (k + 1) * p / (1 - p);
  for (let k = mode; k > 0; k--) weights[k - 1] = weights[k] * k / (n - k + 1) * (1 - p) / p;
  const normalizer = sum(weights);
  return weights.map(weight => weight / normalizer);
}

/** Same integer first-peak rule as the project's actual quantum.js simulator. */
export function groverFirstPeak(N, M) {
  size(N); integer(M, 'M', 0, N);
  if (M === 0 || M === N) return { iterations: 0, predicateMass: M / N };
  const theta = Math.asin(Math.sqrt(M / N));
  const ideal = Math.PI / (4 * theta) - .5;
  const lower = Math.max(0, Math.floor(ideal)), upper = Math.ceil(ideal);
  const mass = k => Math.sin((2 * k + 1) * theta) ** 2;
  const iterations = mass(upper) > mass(lower) + 1e-14 ? upper : lower;
  return { iterations, predicateMass: mass(iterations) };
}

function outcome(N, t, A, B, peak) {
  const M = A + B;
  if (M === 0) return { markedCount: 0, iterations: 0, predicateMass: 0, trueTargetMass: 0,
    markedTrueMass: 0, unmarkedTrueMass: 0, uniformAcceptedReference: 0, theoreticalUniformEmptyTrueMass: t / N };
  const markedTrueMass = A / M * peak.predicateMass;
  const unmarkedTrueMass = M === N ? 0 : (t - A) / (N - M) * (1 - peak.predicateMass);
  return { markedCount: M, iterations: peak.iterations, predicateMass: peak.predicateMass,
    trueTargetMass: markedTrueMass + unmarkedTrueMass, markedTrueMass, unmarkedTrueMass,
    uniformAcceptedReference: A / M, theoreticalUniformEmptyTrueMass: null };
}

export function groverCountsOutcome(N, trueCount, trueAccepted, falseAccepted) {
  size(N); integer(trueCount, 'trueCount', 0, N);
  integer(trueAccepted, 'trueAccepted', 0, trueCount);
  integer(falseAccepted, 'falseAccepted', 0, N - trueCount);
  return outcome(N, trueCount, trueAccepted, falseAccepted, groverFirstPeak(N, trueAccepted + falseAccepted));
}

/**
 * A~Bin(trueCount,recall), B~Bin(N-trueCount,falsePositiveRate), independently.
 * Exact sum over their finite count distribution; selected rounds know actual M.
 * Returns probability means, oracle events, known-M mixture and query accounting.
 */
export function computeOracleReliability({ N = 64, trueCount = 1, recall = .9, falsePositiveRate = .01 } = {}) {
  size(N); integer(trueCount, 'trueCount', 0, N);
  probability(recall, 'recall'); probability(falsePositiveRate, 'falsePositiveRate');
  const t = trueCount;
  const trueWeights = binomialPMF(t, recall), falseWeights = binomialPMF(N - t, falsePositiveRate);
  const peaks = Array.from({ length: N + 1 }, (_, m) => groverFirstPeak(N, m));
  const names = ['weight', 'trueTargetMass', 'predicateMass', 'markedTrueMass', 'unmarkedTrueMass',
    'uniformAccepted', 'iterations', 'markedCount', 'trueAccepted', 'falseAccepted', 'empty', 'trueHit', 'falseHit', 'cleanHit'];
  const totals = Object.fromEntries(names.map(name => [name, { value: 0, correction: 0 }]));
  const add = (name, value) => { const a = totals[name], y = value - a.correction, next = a.value + y;
    a.correction = (next - a.value) - y; a.value = next; };
  const mixtures = Array.from({ length: N + 1 }, (_, markedCount) => ({ markedCount, probability: 0,
    iterations: peaks[markedCount].iterations, predicateMass: peaks[markedCount].predicateMass,
    trueMassContribution: 0, trueAcceptedContribution: 0 }));
  for (let A = 0; A <= t; A++) for (let B = 0; B <= N - t; B++) {
    const weight = trueWeights[A] * falseWeights[B];
    if (weight === 0) continue;
    const M = A + B, result = outcome(N, t, A, B, peaks[M]);
    add('weight', weight); add('trueTargetMass', weight * result.trueTargetMass);
    add('predicateMass', weight * result.predicateMass);
    add('markedTrueMass', weight * result.markedTrueMass); add('unmarkedTrueMass', weight * result.unmarkedTrueMass);
    add('uniformAccepted', weight * result.uniformAcceptedReference);
    add('iterations', weight * result.iterations); add('markedCount', weight * M);
    add('trueAccepted', weight * A); add('falseAccepted', weight * B);
    add('empty', weight * Number(M === 0)); add('trueHit', weight * Number(A > 0));
    add('falseHit', weight * Number(B > 0)); add('cleanHit', weight * Number(A > 0 && B === 0));
    mixtures[M].probability += weight;
    mixtures[M].trueMassContribution += weight * result.trueTargetMass;
    mixtures[M].trueAcceptedContribution += weight * A;
  }
  const value = name => totals[name].value;
  const coverage = 1 - value('empty');
  const expectedMarked = t * recall + (N - t) * falsePositiveRate;
  const verification = { jointWeightSum: value('weight'),
    expectedMarkedCountError: Math.abs(value('markedCount') - expectedMarked),
    trueMassDecompositionError: Math.abs(value('trueTargetMass') - value('markedTrueMass') - value('unmarkedTrueMass')) };
  if (Math.abs(verification.jointWeightSum - 1) > 1e-11 || verification.expectedMarkedCountError > 1e-10 || verification.trueMassDecompositionError > 1e-11) {
    throw new Error('Probability accounting failed numerical verification.');
  }
  return {
    parameters: { N, trueCount: t, recall, falsePositiveRate },
    assumption: 'Constructed independent, exchangeable Bernoulli detector errors. Hypothetical rates; no calibration to a trained model or actual images.',
    emptyOraclePolicy: 'No output, effective true-target probability zero. A theoretical uniform zero-round state would have true mass trueCount/N.',
    expectedTrueTargetMass: value('trueTargetMass'), expectedPredicateMass: value('predicateMass'),
    expectedMarkedTrueMass: value('markedTrueMass'), expectedUnmarkedTrueMass: value('unmarkedTrueMass'),
    searchRunsProbability: coverage, emptyOracleProbability: value('empty'),
    anyTrueMarkProbability: value('trueHit'), anyFalseMarkProbability: value('falseHit'), cleanHitProbability: value('cleanHit'),
    missedTruePredicateProbability: 1 - value('trueHit'),
    expectedTrueTargetMassGivenRun: coverage > 0 ? value('trueTargetMass') / coverage : null,
    expectedUniformAcceptedReference: value('uniformAccepted'),
    expectedUniformAcceptedReferenceGivenRun: coverage > 0 ? value('uniformAccepted') / coverage : null,
    expectedRegionClassificationAccuracy: (t * recall + (N - t) * (1 - falsePositiveRate)) / N,
    uniformRegionPriorTrueMass: t / N, expectedUniformRegionReferenceWithSameCoverage: coverage * t / N,
    expectedTrueAcceptedCount: value('trueAccepted'), expectedFalseAcceptedCount: value('falseAccepted'), expectedMarkedCount: value('markedCount'),
    expectedGroverIterations: value('iterations'),
    byMarkedCount: mixtures.map(row => ({ ...row,
      expectedTrueMassGivenMarkedCount: row.probability > 0 ? row.trueMassContribution / row.probability : null,
      expectedTrueAcceptedCountGivenMarkedCount: row.probability > 0 ? row.trueAcceptedContribution / row.probability : null })),
    resources: { addressQubits: Math.log2(N), classicalDetectorEvaluationsForCompiledOracle: N,
      expectedSearchOracleCalls: value('iterations'), expectedDiffusionApplications: value('iterations'),
      actualMarkedCountKnownForIterationChoice: true,
      accounting: 'Counts one compiled predicate and one ideal search. Loading/scoring N regions is classical work in the current UI. Phase-oracle construction, physical gate decomposition, and wall time are not estimated.' },
    scoreRanking: 'Ignored: only binary marks enter this model. It cannot predict argmax success or compare score ranking without a separate score distribution.',
    verification,
  };
}
