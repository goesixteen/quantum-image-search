/**
 * Grover's algorithm on a real-valued statevector.
 * Browser ES module; no packages, network calls, or quantum hardware required.
 * The standard uniform-state / phase-oracle / diffuser circuit remains real.
 */

function validateSize(N) {
  if (!Number.isSafeInteger(N) || N < 1 || !Number.isInteger(Math.log2(N))) {
    throw new RangeError('N must be a positive power of two.');
  }
  // JavaScript arrays cannot represent this many elements, even before RAM limits.
  if (N > 0xffffffff) throw new RangeError('N exceeds JavaScript array limits.');
  return N;
}

function copyState(state) {
  if (!Array.isArray(state) && !ArrayBuffer.isView(state)) {
    throw new TypeError('State must be an array or typed array of real amplitudes.');
  }
  validateSize(state.length);
  const result = Array.from(state);
  if (!result.every(Number.isFinite)) {
    throw new TypeError('Every amplitude must be a finite real number.');
  }
  return result;
}

function uniqueMarks(N, markedIndices) {
  if (markedIndices == null || typeof markedIndices[Symbol.iterator] !== 'function') {
    throw new TypeError('Marked indices must be an iterable of integers.');
  }
  const marks = new Set(markedIndices);
  for (const index of marks) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= N) {
      throw new RangeError(`Marked index ${String(index)} is outside 0..${N - 1}.`);
    }
  }
  return marks;
}

/** |s> = N^-1/2 sum_i |i>. Returns a new ordinary Array. */
export function createUniformState(N) {
  validateSize(N);
  return Array(N).fill(1 / Math.sqrt(N));
}

/** Phase oracle O_f |i> = (-1)^f(i) |i>. Does not mutate state. */
export function oracle(state, markedIndices) {
  const result = copyState(state);
  const marks = uniqueMarks(result.length, markedIndices);
  for (const index of marks) result[index] *= -1;
  return result;
}

/** D = 2|s><s| - I; a_i becomes 2 * mean(a) - a_i. */
export function diffuse(state) {
  const result = copyState(state);
  // Compensated summation keeps cancellation error small after many rotations.
  let sum = 0;
  let correction = 0;
  for (const amplitude of result) {
    const term = amplitude - correction;
    const next = sum + term;
    correction = (next - sum) - term;
    sum = next;
  }
  const twiceMean = 2 * (sum / result.length);
  return result.map(amplitude => twiceMean - amplitude);
}

/** Born probabilities a_i^2. No renormalization or clipping hides norm errors. */
export function probabilities(state) {
  const result = copyState(state).map(amplitude => amplitude * amplitude);
  if (!result.every(Number.isFinite)) {
    throw new RangeError('Amplitude squares exceed the numeric range.');
  }
  return result;
}

/**
 * Choose the integer nearest the first amplification peak.
 * M is the known number of marked states; ties prefer fewer oracle calls.
 * Empty/full marked sets require zero amplification iterations.
 */
export function recommendIterations(N, M) {
  validateSize(N);
  if (!Number.isSafeInteger(M) || M < 0 || M > N) {
    throw new RangeError('M must be an integer between 0 and N.');
  }
  if (M === 0 || M === N) return 0;
  const theta = Math.asin(Math.sqrt(M / N));
  const ideal = Math.PI / (4 * theta) - 0.5;
  const lower = Math.max(0, Math.floor(ideal));
  const upper = Math.ceil(ideal);
  const p = k => Math.sin((2 * k + 1) * theta) ** 2;
  return p(upper) > p(lower) + 1e-14 ? upper : lower;
}

/**
 * Return every state after k completed oracle+diffuser iterations, including k=0.
 * Success is defined by the provided predicate (marks), not by image ground truth.
 * Snapshot arrays are independent, ordinary Arrays suitable for JSON and charts.
 */
export function simulateGrover(N, markedIndices, iterations) {
  validateSize(N);
  const marks = uniqueMarks(N, markedIndices);
  const M = marks.size;
  const steps = iterations === undefined ? recommendIterations(N, M) : iterations;
  if (!Number.isSafeInteger(steps) || steps < 0) {
    throw new RangeError('Iterations must be a nonnegative integer.');
  }
  const theta = Math.asin(Math.sqrt(M / N));
  let state = createUniformState(N);
  const history = [];
  for (let iteration = 0; iteration <= steps; iteration += 1) {
    const distribution = probabilities(state);
    let successProbability = 0;
    for (const index of marks) successProbability += distribution[index];
    history.push({
      iteration,
      amplitudes: state.slice(),
      probabilities: distribution,
      successProbability,
    });
    if (iteration < steps) state = diffuse(oracle(state, marks));
  }
  return { history, iterations: steps, theta };
}

/**
 * One computational-basis measurement. Nonnegative weights are normalized here
 * to tolerate floating-point norm drift. Supply an RNG for reproducible demos.
 */
export function sample(distribution, random = Math.random) {
  if (!Array.isArray(distribution) && !ArrayBuffer.isView(distribution)) {
    throw new TypeError('Probabilities must be an array or typed array.');
  }
  if (distribution.length === 0) throw new RangeError('Probabilities cannot be empty.');
  let total = 0;
  let lastPositive = -1;
  for (let index = 0; index < distribution.length; index += 1) {
    const weight = distribution[index];
    if (!Number.isFinite(weight) || weight < 0) {
      throw new RangeError('Probability weights must be finite and nonnegative.');
    }
    total += weight;
    if (weight > 0) lastPositive = index;
  }
  if (!(total > 0) || !Number.isFinite(total)) {
    throw new RangeError('Probability weights must have a finite, positive total.');
  }
  if (typeof random !== 'function') throw new TypeError('random must be a function.');
  const draw = random();
  if (!Number.isFinite(draw) || draw < 0 || draw >= 1) {
    throw new RangeError('The random function must return a number in [0, 1).');
  }
  const threshold = draw * total;
  let cumulative = 0;
  for (let index = 0; index < distribution.length; index += 1) {
    cumulative += distribution[index];
    if (threshold < cumulative) return index;
  }
  // Rounding at the final CDF boundary cannot select a zero-probability outcome.
  return lastPositive;
}

/** Big-endian displayed label for a basis state. The 0-qubit label is ''. */
export function bitstring(index, qubits) {
  if (!Number.isInteger(qubits) || qubits < 0 || qubits > 53) {
    throw new RangeError('Qubits must be an integer between 0 and 53.');
  }
  if (!Number.isSafeInteger(index) || index < 0 || index >= 2 ** qubits) {
    throw new RangeError('Index must fit inside the requested register.');
  }
  return qubits === 0 ? '' : index.toString(2).padStart(qubits, '0');
}
