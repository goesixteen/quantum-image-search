/**
 * Builds the image-search classifier circuit used by the bus and crowd demos
 * (../../../bus-search-lab/dist/qnn.js, ../../../waldo-search-lab/dist/qnn.js).
 *
 * 8 pixel features f_0..f_7 in [0, 1] drive 4 qubits. For each layer
 * l = 1..L (inputs re-uploaded every layer, or only in layer 1):
 *     RY(pi * f_q) RZ(pi * f_{q+4})    fixed angle encoding on qubit q
 *     RY(theta_lq) RZ(phi_lq)          trainable rotations
 * then one entangling ring q -> q+1 (mod n): CNOT (as in the demos),
 * trainable CRY, or nothing. Every qubit is measured at the end.
 *
 * Readout observables (Z-strings as bitmasks):
 *   'project': Z0, Z1, Z2, Z3, Z0Z1, Z2Z3, Z0Z1Z2Z3 - the demos' seven, which a
 *              classical sigmoid combines into a score (see ../qnn.ts)
 *   'z0':      Z0 only - a purely quantum score (1 + <Z0>) / 2
 *
 * Network layers keep TF Playground's indexing: 0 = features, 1..L = gate
 * columns (one node per qubit), L + 1 = the readout node.
 */
import { validateCircuit } from './circuit.js';

export const ENTANGLERS = ['cnot', 'cry', 'none'];
export const READOUTS = ['project', 'z0'];
/** The demos' observables, in the order of their `readout` weights. */
export const PROJECT_OBSERVABLES = [0b0001, 0b0010, 0b0100, 0b1000, 0b0011, 0b1100, 0b1111];

/** Ordered (control, target) pairs of the entangling ring on n qubits. */
export function ringPairs(n) {
  if (n < 2) return [];
  if (n === 2) return [[0, 1]];
  return Array.from({ length: n }, (_, q) => [q, (q + 1) % n]);
}

/** Which qubit and axis a feature is encoded on: f_i -> qubit i % n. */
export function encodingOf(feature, qubits) {
  return { qubit: feature % qubits, axis: feature < qubits ? 'ry' : 'rz' };
}

/**
 * @param {{numFeatures: number, qubits: number, layers: number,
 *          entangler: 'cnot'|'cry'|'none', reupload: boolean,
 *          readout: 'project'|'z0'}} spec
 * @returns {{circuit, params: Array<
 *     {kind: 'ry'|'rz', layer: number, node: number} |
 *     {kind: 'entangle', layer: number, from: number, to: number}>,
 *   encodings: Array<{layer: number, feature: number, qubit: number, axis: 'ry'|'rz'}>,
 *   fixedLinks: Array<{layer: number, from: number, to: number, gate: 'x'}>}}
 *   `params[i]` says what circuit parameter i is in the network picture.
 */
export function compileNetwork({ numFeatures, qubits, layers, entangler, reupload, readout = 'project' }) {
  if (!Number.isInteger(qubits) || qubits < 1) throw new RangeError('Need >= 1 qubit.');
  if (!Number.isInteger(layers) || layers < 1) throw new RangeError('Need >= 1 layer.');
  if (numFeatures > 2 * qubits) throw new RangeError('At most two features per qubit.');
  if (!ENTANGLERS.includes(entangler)) throw new RangeError(`Unknown entangler ${entangler}.`);
  if (!READOUTS.includes(readout)) throw new RangeError(`Unknown readout ${readout}.`);
  const params = [], encodings = [], fixedLinks = [], ops = [];
  const add = p => params.push(p) - 1;

  for (let l = 1; l <= layers; l++) {
    const encode = l === 1 || reupload;
    for (let q = 0; q < qubits; q++) {
      if (encode) {
        for (const axis of ['ry', 'rz']) {
          const feature = axis === 'ry' ? q : q + qubits;
          if (feature >= numFeatures) continue;
          ops.push({ type: axis, target: q, control: -1, terms: [{ param: -1, input: feature, scale: Math.PI }] });
          encodings.push({ layer: l, feature, qubit: q, axis });
        }
      }
      ops.push({ type: 'ry', target: q, control: -1, terms: [{ param: add({ kind: 'ry', layer: l, node: q }), input: -1 }] });
      ops.push({ type: 'rz', target: q, control: -1, terms: [{ param: add({ kind: 'rz', layer: l, node: q }), input: -1 }] });
    }
    ops.push({ type: 'snapshot' });
    for (const [c, t] of entangler === 'none' ? [] : ringPairs(qubits)) {
      if (entangler === 'cry') {
        ops.push({ type: 'ry', target: t, control: c, terms: [{ param: add({ kind: 'entangle', layer: l, from: c, to: t }), input: -1 }] });
      } else {
        ops.push({ type: 'x', target: t, control: c });
        fixedLinks.push({ layer: l, from: c, to: t, gate: 'x' });
      }
    }
  }
  const observables = readout === 'project' && qubits === 4 ? PROJECT_OBSERVABLES :
    readout === 'project' ? Array.from({ length: qubits }, (_, q) => 1 << q) : [0b1];
  const circuit = { nQubits: qubits, nParams: params.length, ops, observables };
  return { circuit: validateCircuit(circuit), params, encodings, fixedLinks };
}
