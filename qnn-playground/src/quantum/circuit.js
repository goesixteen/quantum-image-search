/**
 * Statevector simulator for the QNN playground: gates, measurement, gradients.
 * Plain ES module with no dependencies so it runs in the browser bundle, in
 * `node --test`, and in any bare JS engine. Qubit 0 is the least significant
 * basis bit, matching ../../../bus-search-lab/dist/qnn.js.
 *
 * A circuit is an ordered op list on `nQubits` qubits, starting from |0...0>:
 *   {type: 'rx'|'ry'|'rz', target, control, terms}  rotation; angle = sum over
 *       terms of coef * scale * (input >= 0 ? x[input] : 1), where coef is
 *       params[param] (trainable) or 1 when param is -1 (fixed encoding)
 *   {type: 'x'|'z', target, control}                 fixed Pauli (CNOT / CZ when controlled)
 *   {type: 'snapshot'}                               records <Z_q> of every qubit
 * `control` is -1 for an uncontrolled gate. At the end every qubit is
 * measured and `circuit.observables` lists Z-strings as bitmasks (e.g. 0b0011 is
 * Z0 Z1); their expectations are the circuit's outputs. A classical readout of
 * those expectations (if any) lives outside this module.
 */

/** @typedef {{param: number, input: number, scale?: number}} Term */
/** @typedef {{type: 'rx'|'ry'|'rz', target: number, control: number, terms: Term[]} |
 *            {type: 'x'|'z', target: number, control: number} | {type: 'snapshot'}} Op */
/** @typedef {{nQubits: number, nParams: number, ops: Op[], observables: number[]}} Circuit */

const BINOMIAL_EXACT_MAX = 50;
const ROTATIONS = new Set(['rx', 'ry', 'rz']);
const FIXED = new Set(['x', 'z']);

export function validateCircuit(circuit) {
  const { nQubits, nParams, ops, observables } = circuit;
  if (!Number.isInteger(nQubits) || nQubits < 1 || nQubits > 12) throw new RangeError('nQubits must be 1..12.');
  if (!observables?.length || observables.some(m => !Number.isInteger(m) || m < 1 || m >= (1 << nQubits))) throw new RangeError('Bad observables.');
  for (const op of ops) {
    if (op.type === 'snapshot') continue;
    if (!ROTATIONS.has(op.type) && !FIXED.has(op.type)) throw new TypeError(`Unsupported gate ${op.type}.`);
    if (op.target < 0 || op.target >= nQubits || op.control >= nQubits || op.control === op.target) throw new RangeError('Bad qubit index.');
    for (const t of op.terms || []) {
      if (!Number.isInteger(t.param) || t.param < -1 || t.param >= nParams) throw new RangeError(`Bad param index ${t.param}.`);
    }
  }
  return circuit;
}

/** Factor multiplying params[t.param] in the angle (the whole term if fixed). */
const termFactor = (t, x) => (t.scale ?? 1) * (t.input >= 0 ? x[t.input] : 1);
const angleOf = (op, params, x) => {
  let a = 0;
  for (const t of op.terms) a += (t.param >= 0 ? params[t.param] : 1) * termFactor(t, x);
  return a;
};
const trainable = op => op.terms !== undefined && op.terms.some(t => t.param >= 0);

/** Parity sign (+1/-1) of basis state i under the Z-string `mask`. */
const paritySign = (i, mask) => {
  let v = i & mask, odd = 0;
  while (v) { odd ^= 1; v &= v - 1; }
  return odd ? -1 : 1;
};

/** Expectations of Z-string observables (bitmasks) for a state. */
export function expectObservables(re, im, masks) {
  const out = new Float64Array(masks.length);
  for (let i = 0; i < re.length; i++) {
    const p = re[i] * re[i] + im[i] * im[i];
    for (let k = 0; k < masks.length; k++) out[k] += p * paritySign(i, masks[k]);
  }
  return out;
}

/**
 * 2x2 complex matrix as [m00r, m00i, m01r, m01i, m10r, m10i, m11r, m11i].
 * `derivative` returns dU/dtheta instead of U (rotations only).
 */
function matrix(type, theta, derivative) {
  if (type === 'x') return [0, 0, 1, 0, 1, 0, 0, 0];
  if (type === 'z') return [1, 0, 0, 0, 0, 0, -1, 0];
  const c = Math.cos(theta / 2), s = Math.sin(theta / 2);
  if (!derivative) {
    if (type === 'ry') return [c, 0, -s, 0, s, 0, c, 0];
    if (type === 'rx') return [c, 0, 0, -s, 0, -s, c, 0];
    return [c, -s, 0, 0, 0, 0, c, s]; // rz = diag(e^{-i t/2}, e^{i t/2})
  }
  const dc = -s / 2, ds = c / 2;
  if (type === 'ry') return [dc, 0, -ds, 0, ds, 0, dc, 0];
  if (type === 'rx') return [dc, 0, 0, -ds, 0, -ds, dc, 0];
  return [dc, -ds, 0, 0, 0, 0, dc, ds];
}

/** Conjugate transpose, used to step the adjoint pass backwards. */
const dagger = m => [m[0], -m[1], m[4], -m[5], m[2], -m[3], m[6], -m[7]];

/**
 * Applies m to `target` on the subspace where `control` is 1 (or everywhere).
 * With `zeroOutside`, amplitudes with control = 0 are cleared: that is how the
 * derivative of a controlled rotation acts (it is zero on that subspace).
 */
function apply(re, im, target, control, m, zeroOutside = false) {
  const tbit = 1 << target, cbit = control >= 0 ? 1 << control : 0;
  for (let a = 0; a < re.length; a++) {
    if (a & tbit) continue;
    const b = a | tbit;
    if (cbit && !(a & cbit)) {
      if (zeroOutside) { re[a] = im[a] = re[b] = im[b] = 0; }
      continue;
    }
    const ar = re[a], ai = im[a], br = re[b], bi = im[b];
    re[a] = m[0] * ar - m[1] * ai + m[2] * br - m[3] * bi;
    im[a] = m[0] * ai + m[1] * ar + m[2] * bi + m[3] * br;
    re[b] = m[4] * ar - m[5] * ai + m[6] * br - m[7] * bi;
    im[b] = m[4] * ai + m[5] * ar + m[6] * bi + m[7] * br;
  }
}

/** <Z_q> for every qubit. */
export function expectZ(re, im, nQubits) {
  const z = new Float64Array(nQubits);
  for (let i = 0; i < re.length; i++) {
    const p = re[i] * re[i] + im[i] * im[i];
    for (let q = 0; q < nQubits; q++) z[q] += (i >> q) & 1 ? -p : p;
  }
  return z;
}

/**
 * Bloch vector (<X>, <Y>, <Z>) of each qubit's reduced state. Its length is 1
 * for a qubit that is unentangled with the rest and shrinks toward 0 as the
 * qubit becomes entangled.
 */
export function blochVectors(re, im, nQubits) {
  const out = [];
  for (let q = 0; q < nQubits; q++) {
    const bit = 1 << q;
    let r01 = 0, i01 = 0, p0 = 0, p1 = 0; // rho_01 = sum psi_a conj(psi_b)
    for (let a = 0; a < re.length; a++) {
      if (a & bit) continue;
      const b = a | bit;
      r01 += re[a] * re[b] + im[a] * im[b];
      i01 += im[a] * re[b] - re[a] * im[b];
      p0 += re[a] * re[a] + im[a] * im[a];
      p1 += re[b] * re[b] + im[b] * im[b];
    }
    out.push([2 * r01, -2 * i01, p0 - p1]);
  }
  return out;
}

/**
 * Estimates <Z> from `shots` simulated measurements of a qubit whose exact
 * expectation is `z`; shots <= 0 means infinitely many (returns z exactly).
 */
export function sampleZ(z, shots, rng = Math.random) {
  if (!(shots > 0)) return z;
  const p = (1 + z) / 2;
  let ones = 0;
  if (shots <= BINOMIAL_EXACT_MAX) {
    for (let s = 0; s < shots; s++) if (rng() < p) ones++;
  } else {
    // Normal approximation to the binomial; accurate at these shot counts.
    const u = Math.max(rng(), 1e-12), v = rng();
    const gauss = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    ones = Math.round(shots * p + gauss * Math.sqrt(shots * p * (1 - p)));
    ones = Math.max(0, Math.min(shots, ones));
  }
  return 2 * ones / shots - 1;
}

/**
 * Runs the circuit. `opts.shift = {op, delta}` adds delta to one gate's angle
 * (for the parameter-shift rule); `opts.captureStates` keeps a copy of the
 * statevector at each snapshot.
 */
export function forward(circuit, params, x, opts = {}) {
  const dim = 1 << circuit.nQubits;
  const re = new Float64Array(dim), im = new Float64Array(dim);
  re[0] = 1;
  const snapshots = [], states = [];
  const ops = circuit.ops;
  for (let k = 0; k < ops.length; k++) {
    const op = ops[k];
    if (op.type === 'snapshot') {
      snapshots.push(expectZ(re, im, circuit.nQubits));
      if (opts.captureStates) states.push([re.slice(), im.slice()]);
      continue;
    }
    let theta = op.terms ? angleOf(op, params, x) : 0;
    if (opts.shift && opts.shift.op === k) theta += opts.shift.delta;
    apply(re, im, op.target, op.control, matrix(op.type, theta, false));
  }
  const finalZ = expectZ(re, im, circuit.nQubits);
  return { re, im, snapshots, states, finalZ, observables: expectObservables(re, im, circuit.observables) };
}

/**
 * Applies the circuit's gates to a given state, in place (forward, or
 * backwards with every gate inverted). Used to run the classifier inside a
 * larger register - see coherent.js - and to uncompute it there.
 */
export function applyCircuit(circuit, params, x, re, im, inverse = false) {
  const ops = circuit.ops;
  for (let n = 0; n < ops.length; n++) {
    const op = ops[inverse ? ops.length - 1 - n : n];
    if (op.type === 'snapshot') continue;
    const m = matrix(op.type, op.terms ? angleOf(op, params, x) : 0, false);
    apply(re, im, op.target, op.control, inverse ? dagger(m) : m);
  }
}

/**
 * Exact gradient of a loss E(observables) by the adjoint method: one forward
 * pass and one backward sweep. Only possible in a simulator, since it reads
 * the statevector. `dEdObs[k]` is dE/d<O_k> for this sample.
 */
export function adjointGradient(circuit, params, x, dEdObs) {
  const fwd = forward(circuit, params, x);
  const grad = new Float64Array(circuit.nParams);
  const masks = circuit.observables;
  const phiRe = fwd.re, phiIm = fwd.im;
  const lamRe = new Float64Array(phiRe.length), lamIm = new Float64Array(phiIm.length);
  for (let i = 0; i < phiRe.length; i++) {
    let m = 0; // M = sum_k dE/d<O_k> O_k, diagonal in the computational basis
    for (let k = 0; k < masks.length; k++) m += dEdObs[k] * paritySign(i, masks[k]);
    lamRe[i] = m * phiRe[i]; lamIm[i] = m * phiIm[i];
  }
  const muRe = new Float64Array(phiRe.length), muIm = new Float64Array(phiIm.length);
  for (let k = circuit.ops.length - 1; k >= 0; k--) {
    const op = circuit.ops[k];
    if (op.type === 'snapshot') continue;
    const theta = op.terms ? angleOf(op, params, x) : 0;
    const inv = dagger(matrix(op.type, theta, false));
    apply(phiRe, phiIm, op.target, op.control, inv);
    if (trainable(op)) {
      muRe.set(phiRe); muIm.set(phiIm);
      apply(muRe, muIm, op.target, op.control, matrix(op.type, theta, true), true);
      let dTheta = 0;
      for (let i = 0; i < muRe.length; i++) dTheta += lamRe[i] * muRe[i] + lamIm[i] * muIm[i];
      dTheta *= 2;
      for (const t of op.terms) if (t.param >= 0) grad[t.param] += dTheta * termFactor(t, x);
    }
    apply(lamRe, lamIm, op.target, op.control, inv);
  }
  return { observables: fwd.observables, grad };
}

// Four-term shift rule for controlled rotations (generator eigenvalues 0, +-1/2).
const D_PLUS = (Math.SQRT2 + 1) / (4 * Math.SQRT2), D_MINUS = (Math.SQRT2 - 1) / (4 * Math.SQRT2);

/**
 * Simulated measurement of every qubit, `shots` times: estimates of the
 * Z-string observables from the same shots (as on hardware). shots <= 0 means
 * exact expectations.
 */
export function sampleObservables(re, im, masks, shots, rng = Math.random) {
  if (!(shots > 0)) return expectObservables(re, im, masks);
  const counts = sampleCounts(probabilities(re, im), shots, rng);
  const out = new Float64Array(masks.length);
  counts.forEach((c, i) => { if (c) for (let k = 0; k < masks.length; k++) out[k] += c * paritySign(i, masks[k]); });
  return out.map(v => v / shots);
}

/**
 * Gradient by the parameter-shift rule: every trainable rotation is re-run at
 * shifted angles and the measured observables are differenced. This is how
 * gradients are obtained on real hardware, so each evaluation here is a
 * `shots`-sample estimate (exact if shots <= 0). `dEdObsAt(estimate)` gives
 * dE/d<O_k> from the unshifted (also sampled) estimate it returns.
 */
export function parameterShiftGradient(circuit, params, x, dEdObsAt, shots, rng = Math.random) {
  const measure = shift => {
    const f = forward(circuit, params, x, { shift });
    return sampleObservables(f.re, f.im, circuit.observables, shots, rng);
  };
  const observables = measure(null);
  const c = dEdObsAt(observables);
  const dot = (a, b) => a.reduce((sum, v, k) => sum + c[k] * (v - b[k]), 0);
  const grad = new Float64Array(circuit.nParams);
  circuit.ops.forEach((op, k) => {
    if (!trainable(op)) return;
    let dTheta;
    if (op.control < 0) {
      dTheta = dot(measure({ op: k, delta: Math.PI / 2 }), measure({ op: k, delta: -Math.PI / 2 })) / 2;
    } else {
      dTheta = D_PLUS * dot(measure({ op: k, delta: Math.PI / 2 }), measure({ op: k, delta: -Math.PI / 2 }))
        - D_MINUS * dot(measure({ op: k, delta: 3 * Math.PI / 2 }), measure({ op: k, delta: -3 * Math.PI / 2 }));
    }
    for (const t of op.terms) if (t.param >= 0) grad[t.param] += dTheta * termFactor(t, x);
  });
  return { observables, grad };
}

/** Born probabilities |psi_i|^2 of every basis state (qubit 0 = lowest bit). */
export function probabilities(re, im) {
  const p = new Float64Array(re.length);
  for (let i = 0; i < re.length; i++) p[i] = re[i] * re[i] + im[i] * im[i];
  return p;
}

/**
 * Simulates measuring every qubit `shots` times; returns counts per basis
 * state. Uses one uniform draw per shot against the cumulative distribution.
 */
export function sampleCounts(probs, shots, rng = Math.random) {
  const counts = new Float64Array(probs.length);
  const cdf = new Float64Array(probs.length);
  let acc = 0;
  for (let i = 0; i < probs.length; i++) cdf[i] = (acc += probs[i]);
  for (let s = 0; s < shots; s++) {
    const u = rng() * acc;
    let lo = 0, hi = probs.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < u) lo = mid + 1; else hi = mid; }
    counts[lo]++;
  }
  return counts;
}

/**
 * Eigenvalues of a d x d Hermitian matrix given as row-major re/im arrays.
 * Embeds it as the 2d x 2d real symmetric [[A, -B], [B, A]] (each eigenvalue
 * appears twice) and runs cyclic Jacobi rotations; d is tiny here (<= 4).
 */
export function hermitianEigenvalues(mRe, mIm, d) {
  const n = 2 * d, a = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) {
    const r = mRe[i * d + j], m = mIm[i * d + j];
    a[i][j] = r; a[i + d][j + d] = r; a[i][j + d] = -m; a[i + d][j] = m;
  }
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
    if (off < 1e-22) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(a[p][q]) < 1e-300) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) {
        const akp = a[k][p], akq = a[k][q];
        a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < n; k++) {
        const apk = a[p][k], aqk = a[q][k];
        a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk;
      }
    }
  }
  const eig = Array.from({ length: n }, (_, i) => a[i][i]).sort((x, y) => x - y);
  return Array.from({ length: d }, (_, i) => (eig[2 * i] + eig[2 * i + 1]) / 2);
}

/** Von Neumann entropy in bits from density-matrix eigenvalues. */
export function entropyBits(eigenvalues) {
  let s = 0;
  for (const l of eigenvalues) if (l > 1e-12) s -= l * Math.log2(l);
  return Math.max(0, s);
}

/** Reduced density matrix of qubits i and j (4 x 4, basis |b_j b_i>). */
export function reducedDensity2(re, im, i, j) {
  const rRe = new Float64Array(16), rIm = new Float64Array(16);
  const bi = 1 << i, bj = 1 << j, mask = bi | bj;
  const local = a => ((a & bi) ? 1 : 0) | ((a & bj) ? 2 : 0);
  for (let a = 0; a < re.length; a++) {
    const rest = a & ~mask, la = local(a);
    for (let lb = 0; lb < 4; lb++) {
      const b = rest | ((lb & 1) ? bi : 0) | ((lb & 2) ? bj : 0);
      // rho[la][lb] += psi_a * conj(psi_b)
      rRe[la * 4 + lb] += re[a] * re[b] + im[a] * im[b];
      rIm[la * 4 + lb] += im[a] * re[b] - re[a] * im[b];
    }
  }
  return [rRe, rIm];
}

/**
 * Negativity of a two-qubit density matrix (4 x 4, row-major re/im): the sum
 * of |negative eigenvalues| of its partial transpose. For two qubits it is
 * > 0 exactly when the pair is entangled (Peres-Horodecki), so it separates
 * entanglement from mere classical correlation; max 0.5 (a Bell pair).
 */
export function negativity(rRe, rIm) {
  const tRe = new Float64Array(16), tIm = new Float64Array(16);
  // Index = b_i | (b_j << 1); transpose the j bits of row and column.
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
    const a2 = (a & 1) | (b & 2), b2 = (b & 1) | (a & 2);
    tRe[a2 * 4 + b2] = rRe[a * 4 + b];
    tIm[a2 * 4 + b2] = rIm[a * 4 + b];
  }
  let n = 0;
  for (const l of hermitianEigenvalues(tRe, tIm, 4)) if (l < 0) n -= l;
  return n < 1e-10 ? 0 : n;
}

/**
 * Entanglement structure of a pure state: each qubit's entanglement entropy
 * with the rest (bits, 0..1); for every pair, the quantum mutual information
 * I(i:j) = S(i) + S(j) - S(ij) (bits, 0..2), which counts all correlation,
 * and the negativity, which is > 0 only if the pair itself is entangled.
 * (GHZ pairs: I = 1 bit, negativity 0 - correlated but not pairwise entangled.)
 */
export function entanglement(re, im, nQubits) {
  const bloch = blochVectors(re, im, nQubits);
  const single = bloch.map(v => {
    const r = Math.min(1, Math.hypot(v[0], v[1], v[2]));
    return entropyBits([(1 + r) / 2, (1 - r) / 2]);
  });
  const pairs = [];
  for (let i = 0; i < nQubits; i++) for (let j = i + 1; j < nQubits; j++) {
    const [mRe, mIm] = reducedDensity2(re, im, i, j);
    const sij = entropyBits(hermitianEigenvalues(mRe, mIm, 4));
    pairs.push({ i, j, mutualInfo: Math.max(0, single[i] + single[j] - sij), negativity: negativity(mRe, mIm) });
  }
  return { bloch, single, pairs };
}

/**
 * Which parameters can never change any measured observable. Some gates are
 * structurally irrelevant: e.g. an RZ right before a Z-basis measurement, or
 * (with only Z0 read) q0's last rotation after a final CNOT ring. Detected
 * numerically: dead if every observable's gradient is 0 at several random
 * parameter/input points with random observable weights (a generic-point
 * test; structural zeros are exact, live ones are not).
 */
export function deadParameters(circuit, numInputs, samples = 8, rng = Math.random) {
  const maxGrad = new Float64Array(circuit.nParams);
  for (let s = 0; s < samples; s++) {
    const params = Array.from({ length: circuit.nParams }, () => (rng() - 0.5) * 2 * Math.PI);
    const x = Array.from({ length: numInputs }, () => rng());
    const c = circuit.observables.map(() => rng() + 0.5);
    adjointGradient(circuit, params, x, c).grad.forEach((g, i) => { maxGrad[i] = Math.max(maxGrad[i], Math.abs(g)); });
  }
  return Array.from(maxGrad, g => g < 1e-9);
}
