/**
 * Coherent amplitude amplification: Grover's search where the check runs
 * inside the quantum computer, instead of on a list of scores computed
 * beforehand.
 *
 * Joint register: an index register over N regions (log2 N qubits) and the
 * classifier's D = 2^m ancilla amplitudes. State layout: amp[i * D + a].
 *   start   |s>|0>: uniform over regions, classifier qubits in |0...0>
 *   oracle  for each region i (controlled on the index, so all at once):
 *           run the classifier C_i on the ancilla, flip the sign of the
 *           ancilla states that `accept` (e.g. classifier qubit 0 reads 0),
 *           then run C_i backwards to uncompute it
 *   diffuse reflect about the start state: psi -> 2|s,0><s,0|psi> - psi
 * With a classifier that answers deterministically this is exactly Grover's
 * algorithm. With an uncertain one, amplitude leaks into the classifier
 * register (the "garbage" is not uncomputed perfectly) and the search
 * degrades - the honest cost of a noisy quantum check.
 */

/**
 * @param {{N: number, D: number, rounds: number,
 *   applyBlock: (i: number, re: Float64Array, im: Float64Array,
 *                inverse: boolean) => void,
 *   accept: (a: number) => boolean}} spec
 * @returns {{history: {iteration: number, probabilities: Float64Array}[]}}
 *   probabilities[i] = chance that measuring the index register gives i.
 */
export function coherentAmplification({ N, D, rounds, applyBlock, accept }) {
  const re = new Float64Array(N * D), im = new Float64Array(N * D);
  const s = 1 / Math.sqrt(N);
  for (let i = 0; i < N; i++) re[i * D] = s;
  const bRe = new Float64Array(D), bIm = new Float64Array(D);
  const snapshot = iteration => {
    const p = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      for (let a = 0; a < D; a++) p[i] += re[i * D + a] ** 2 + im[i * D + a] ** 2;
    }
    return { iteration, probabilities: p };
  };
  const history = [snapshot(0)];
  for (let k = 1; k <= rounds; k++) {
    // Oracle, block by block (the index register only acts as a control).
    for (let i = 0; i < N; i++) {
      bRe.set(re.subarray(i * D, i * D + D));
      bIm.set(im.subarray(i * D, i * D + D));
      applyBlock(i, bRe, bIm, false);
      for (let a = 0; a < D; a++) if (accept(a)) { bRe[a] = -bRe[a]; bIm[a] = -bIm[a]; }
      applyBlock(i, bRe, bIm, true);
      re.set(bRe, i * D);
      im.set(bIm, i * D);
    }
    // Diffusion: reflect about |s>|0>.
    let oRe = 0, oIm = 0;
    for (let i = 0; i < N; i++) { oRe += s * re[i * D]; oIm += s * im[i * D]; }
    for (let j = 0; j < re.length; j++) { re[j] = -re[j]; im[j] = -im[j]; }
    for (let i = 0; i < N; i++) { re[i * D] += 2 * s * oRe; im[i * D] += 2 * s * oIm; }
    history.push(snapshot(k));
  }
  return { history };
}

/**
 * Rounds that maximise success when a fraction `a` of the start state is
 * accepted (the standard amplitude-amplification estimate).
 */
export function recommendedRounds(a) {
  if (!(a > 0) || a >= 1) return 0;
  return Math.max(0, Math.round(Math.PI / (4 * Math.asin(Math.sqrt(a))) - 0.5));
}
