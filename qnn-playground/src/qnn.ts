/* Quantum engine for the image-search playground (replaces upstream's nn.ts).

The model is the demos' patch classifier (see quantum/ansatz.js):
  layer 0        the 8 pixel features of an image patch
  layers 1..L    one Node per qubit: fixed RY(pi f) RZ(pi f') encoding, then
                 trainable RY(theta) RZ(phi); Node.output = <Z> of that qubit
  layer L + 1    the readout Node; output = the patch score in [0, 1]
Links are fixed encodings (feature -> gate) or entangling gates. The readout
is either the demos' hybrid one - a classical sigmoid over 7 measured
Z-string expectations - or a purely quantum (1 + <Z0>) / 2.
==============================================================================*/

import {forward, adjointGradient, parameterShiftGradient, sampleZ,
    sampleObservables, entanglement, probabilities, sampleCounts,
    deadParameters, applyCircuit} from "./quantum/circuit.js";
import {compileNetwork, ENTANGLERS, READOUTS} from "./quantum/ansatz.js";

export {ENTANGLERS, READOUTS, probabilities, sampleCounts};

export type Entangler = "cnot" | "cry" | "none";
export type Readout = "project" | "z0";

export const MAX_LAYERS = 6;
/** Qubit range: 8 features need 4 (two angles each); 6 keeps it fast. */
export const MIN_QUBITS = 4;
export const MAX_QUBITS = 6;
/** Binary cross-entropy is clipped here so a confident miss stays finite. */
const EPS = 1e-6;

/** Patch label: 1 = contains the target, 0 = does not. */
export function bce(score: number, label: number): number {
  let s = Math.min(1 - EPS, Math.max(EPS, score));
  return -(label * Math.log(s) + (1 - label) * Math.log(1 - s));
}

/** Inverse sigmoid of a score, clipped like bce. */
export function logit(score: number): number {
  let s = Math.min(1 - EPS, Math.max(EPS, score));
  return Math.log(s / (1 - s));
}

/**
 * Weights of one backProp call. Plain cross-entropy is {bce: 1}; a pairwise
 * ranking step passes {bce: 0, dLogit} (see pairGradient).
 */
export interface LossTerms {
  bce?: number;
  dLogit?: number;
}

/**
 * The Wanda site's pairwise margin term (waldo-search-lab/model/wanda-qnn
 * protocol.json: pairMargin 1): weight * softplus(margin - z_pos + z_neg)
 * over a target window and a nearby non-target window from the same
 * composite, z being the logit. Returns dE/dz for each. The site's pair
 * weight, 0.25, is realised by the dataset (one pair per four cross-entropy
 * examples; scenes.ts), so each pair here has weight 1.
 */
export function pairGradient(scorePos: number, scoreNeg: number,
    weight = 1, margin = 1): {pos: number, neg: number} {
  let g = weight / (1 + Math.exp(-(margin - logit(scorePos) +
      logit(scoreNeg))));
  return {pos: -g, neg: g};
}

export class Node {
  id: string;
  /** 0 = feature, 1..L = gate column, L + 1 = readout. */
  layer: number;
  /** Qubit index (or feature index on layer 0). */
  index: number;
  inputLinks: Link[] = [];
  outputs: Link[] = [];
  /** Trainable RY angle theta. Drawn as the small square, like TF's bias. */
  bias = 0;
  /** Trainable RZ angle phi applied after it. */
  phase = 0;
  /** <Z> of this qubit after its gate (or the score, for the readout node). */
  output: number;
  /** This gate's RY / RZ can never change any measured observable. */
  ryDead = false;
  rzDead = false;
  accInputDer = 0;
  accPhaseDer = 0;
  numAccumulatedDers = 0;

  get dead(): boolean {
    return this.layer > 0 && this.ryDead && this.rzDead;
  }

  constructor(id: string, layer: number, index: number) {
    this.id = id;
    this.layer = layer;
    this.index = index;
    if (layer > 0) {
      this.bias = (Math.random() - 0.5) * Math.PI;
      this.phase = (Math.random() - 0.5) * Math.PI;
    }
  }
}

export type LinkKind = "encode" | "entangle";

export class Link {
  id: string;
  source: Node;
  dest: Node;
  kind: LinkKind;
  /** Encode links: which gate the feature drives. */
  axis: "ry" | "rz" = null;
  /** Entangle links: the two-qubit gate. */
  gate: "cry" | "cnot" = null;
  /** Encodings (angle = pi * feature) and CNOTs have no trainable angle. */
  fixed = false;
  /** CRY angle, or the encoding scale (pi) for display. */
  weight = (Math.random() - 0.5) * Math.PI;
  dead = false;
  errorDer = 0;
  accErrorDer = 0;
  numAccumulatedDers = 0;

  constructor(source: Node, dest: Node, kind: LinkKind) {
    this.id = source.id + "-" + dest.id;
    this.source = source;
    this.dest = dest;
    this.kind = kind;
  }
}

/** The classical part of the hybrid readout: score = sigmoid(b + w . <O>). */
export class ReadoutLayer {
  kind: Readout;
  /** Names of the measured observables, e.g. "Z0Z1". */
  labels: string[];
  weights: number[];
  bias = 0;
  /** Expectations at the last forward pass (sampled if shots > 0). */
  values: number[];
  accW: number[];
  accB = 0;
  n = 0;

  constructor(kind: Readout, masks: number[]) {
    this.kind = kind;
    this.labels = masks.map(m => {
      let name = "";
      for (let q = 0; q < 8; q++) {
        if (m & (1 << q)) {
          name += `Z${q}`;
        }
      }
      return name;
    });
    this.weights = masks.map(() => kind === "project" ?
        (Math.random() - 0.5) : 0);
    this.values = masks.map(() => 0);
    this.accW = masks.map(() => 0);
  }

  /** Patch score in [0, 1] from the measured expectations. */
  score(obs: ArrayLike<number>): number {
    if (this.kind === "z0") {
      return (1 + obs[0]) / 2;
    }
    let logit = this.bias;
    this.weights.forEach((w, k) => { logit += w * obs[k]; });
    return 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, logit))));
  }

  /**
   * dE/d(logit) at this sample: `terms.bce` times binary cross-entropy's
   * (score - label), plus `terms.dLogit`, an extra gradient on the logit
   * (the Wanda site's pairwise ranking term; see pairGradient).
   */
  dEdLogit(obs: ArrayLike<number>, label: number, terms: LossTerms = {}):
      number {
    return (terms.bce ?? 1) * (this.score(obs) - label) + (terms.dLogit ?? 0);
  }

  /** dE/d<O_k> (cross-entropy, plus any extra logit term) at this sample. */
  dEdObs(obs: ArrayLike<number>, label: number, terms: LossTerms = {}):
      number[] {
    let g = this.dEdLogit(obs, label, terms);
    if (this.kind === "z0") {
      // score = (1 + <Z0>) / 2 and logit = log(s / (1 - s)).
      let c = Math.min(1 - EPS, Math.max(EPS, this.score(obs)));
      return [g / (2 * c * (1 - c))];
    }
    return this.weights.map(w => g * w);
  }

  accumulate(obs: ArrayLike<number>, label: number, terms: LossTerms = {}) {
    if (this.kind !== "project") {
      return;
    }
    let delta = this.dEdLogit(obs, label, terms);
    this.weights.forEach((_, k) => { this.accW[k] += delta * obs[k]; });
    this.accB += delta;
    this.n++;
  }

  update(learningRate: number) {
    if (this.n === 0) {
      return;
    }
    this.weights = this.weights.map((w, k) =>
        w - learningRate * this.accW[k] / this.n);
    this.bias -= learningRate * this.accB / this.n;
    this.accW = this.accW.map(() => 0);
    this.accB = 0;
    this.n = 0;
  }
}

type Owner = {node: Node, field: "bias" | "phase"} | {link: Link};

interface Compiled {
  spec: NetworkSpec;
  circuit: any;
  owners: Owner[];
  params: Float64Array;
  readout: ReadoutLayer;
  shots: number;
  lastInputs: number[];
}
const compiled = new WeakMap<Node[][], Compiled>();

function syncParams(c: Compiled) {
  for (let i = 0; i < c.owners.length; i++) {
    let o = c.owners[i];
    c.params[i] = "link" in o ? o.link.weight : o.node[o.field];
  }
}

export interface NetworkSpec {
  featureIds: string[];
  qubits: number;
  layers: number;
  entangler: Entangler;
  reupload: boolean;
  readout: Readout;
  shots: number;
}

export function buildNetwork(spec: NetworkSpec): Node[][] {
  let {circuit, params, encodings, fixedLinks} = compileNetwork({
    numFeatures: spec.featureIds.length,
    qubits: spec.qubits,
    layers: spec.layers,
    entangler: spec.entangler,
    reupload: spec.reupload,
    readout: spec.readout,
  });
  let network: Node[][] = [spec.featureIds.map((id, i) => new Node(id, 0, i))];
  let id = 1;
  for (let l = 1; l <= spec.layers; l++) {
    let layer: Node[] = [];
    for (let q = 0; q < spec.qubits; q++) {
      layer.push(new Node(`g${id++}`, l, q));
    }
    network.push(layer);
  }
  network.push([new Node("readout", spec.layers + 1, 0)]);

  let connect = (source: Node, dest: Node, kind: LinkKind) => {
    let link = new Link(source, dest, kind);
    source.outputs.push(link);
    dest.inputLinks.push(link);
    return link;
  };
  encodings.forEach(e => {
    let link = connect(network[0][e.feature], network[e.layer][e.qubit],
        "encode");
    link.axis = e.axis;
    link.fixed = true;
    link.weight = Math.PI;
  });
  let owners: Owner[] = params.map(p => {
    if (p.kind === "ry" || p.kind === "rz") {
      return {node: network[p.layer][p.node],
          field: p.kind === "ry" ? "bias" : "phase"};
    }
    let e = p as {kind: "entangle", layer: number, from: number, to: number};
    let link = connect(network[e.layer][e.from], network[e.layer][e.to],
        "entangle");
    link.gate = "cry";
    return {link};
  });
  fixedLinks.forEach(f => {
    let link = connect(network[f.layer][f.from], network[f.layer][f.to],
        "entangle");
    link.gate = "cnot";
    link.fixed = true;
    link.weight = Math.PI;
  });
  // Mark gates that can never change a measured observable, so the UI can
  // say so (with the demos' readout: the four last-layer RZ angles).
  let dead = deadParameters(circuit, spec.featureIds.length);
  owners.forEach((o, i) => {
    if (!dead[i]) {
      return;
    }
    if ("link" in o) {
      o.link.dead = true;
    } else if (o.field === "bias") {
      o.node.ryDead = true;
    } else {
      o.node.rzDead = true;
    }
  });
  compiled.set(network, {spec, circuit, owners, shots: spec.shots,
      params: new Float64Array(params.length),
      readout: new ReadoutLayer(spec.readout, circuit.observables),
      lastInputs: null});
  return network;
}

export function getReadout(network: Node[][]): ReadoutLayer {
  return compiled.get(network).readout;
}

/** Measurement shots per estimate; 0 = exact expectation values. */
export function setShots(network: Node[][], shots: number) {
  compiled.get(network).shots = shots;
}

/**
 * Scores one patch (features in [0, 1]) and stores each qubit's <Z> on its
 * Node. With finite shots every value is a sampled estimate, and all
 * observables of one run come from the same simulated shots.
 */
export function forwardProp(network: Node[][], features: number[]): number {
  let c = compiled.get(network);
  syncParams(c);
  let result = forward(c.circuit, c.params, features);
  network[0].forEach((node, i) => node.output = features[i]);
  for (let l = 1; l < network.length - 1; l++) {
    let z = result.snapshots[l - 1];
    network[l].forEach((node, q) => node.output = sampleZ(z[q], c.shots));
  }
  let obs = c.shots > 0 ? sampleObservables(result.re, result.im,
      c.circuit.observables, c.shots) : result.observables;
  c.readout.values = Array.from(obs);
  let score = c.readout.score(obs);
  getOutputNode(network).output = score;
  c.lastInputs = features;
  return score;
}

/**
 * Accumulates gradients of the cross-entropy for the last forwardProp'd
 * patch. Exact mode uses the adjoint method (simulator only); with shots it
 * uses the parameter-shift rule on sampled measurements, as hardware would.
 */
export function backProp(network: Node[][], label: number,
    terms: LossTerms = {}): void {
  let c = compiled.get(network);
  let x = c.lastInputs;
  let grad: Float64Array;
  let obsUsed: ArrayLike<number>;
  if (c.shots > 0) {
    grad = parameterShiftGradient(c.circuit, c.params, x, (obs: number[]) => {
      obsUsed = obs;
      return c.readout.dEdObs(obs, label, terms);
    }, c.shots).grad;
  } else {
    obsUsed = forward(c.circuit, c.params, x).observables;
    grad = adjointGradient(c.circuit, c.params, x,
        c.readout.dEdObs(obsUsed, label, terms)).grad;
  }
  c.readout.accumulate(obsUsed, label, terms);
  let touched = new Set<Node>();
  c.owners.forEach((o, i) => {
    if ("link" in o) {
      o.link.errorDer = grad[i];
      o.link.accErrorDer += grad[i];
      o.link.numAccumulatedDers++;
    } else {
      if (o.field === "bias") {
        o.node.accInputDer += grad[i];
      } else {
        o.node.accPhaseDer += grad[i];
      }
      touched.add(o.node);
    }
  });
  touched.forEach(node => node.numAccumulatedDers++);
}

/** Plain SGD on every trainable angle and on the classical readout. */
export function updateWeights(network: Node[][], learningRate: number) {
  for (let layerIdx = 1; layerIdx < network.length; layerIdx++) {
    for (let node of network[layerIdx]) {
      if (node.numAccumulatedDers > 0) {
        node.bias -= learningRate * node.accInputDer / node.numAccumulatedDers;
        node.phase -= learningRate * node.accPhaseDer / node.numAccumulatedDers;
        node.accInputDer = 0;
        node.accPhaseDer = 0;
        node.numAccumulatedDers = 0;
      }
      for (let link of node.inputLinks) {
        if (link.fixed || link.numAccumulatedDers === 0) {
          continue;
        }
        link.weight -= (learningRate / link.numAccumulatedDers) *
            link.accErrorDer;
        link.accErrorDer = 0;
        link.numAccumulatedDers = 0;
      }
    }
  }
  compiled.get(network).readout.update(learningRate);
}

/** Trained weights in the demos' model.json format. */
export interface ProjectModel {
  name?: string;
  featureNames?: string[];
  layers: number;
  qubits: number;
  theta: number[];
  readout: number[];
  bias: number;
  threshold: number;
}

/**
 * Loads a demo's trained weights. The network must be the demos' circuit:
 * same layers and qubits, CNOT ring, re-uploading and the 7-observable
 * readout (the caller configures that first). Their theta order is, per
 * layer and qubit, RY then RZ - the same as this circuit's parameters.
 */
export function loadWeights(network: Node[][], model: ProjectModel) {
  let c = compiled.get(network), sp = c.spec;
  // Same parameter count is not enough: first-layer-only encoding, another
  // entangler or the other scene's features would all pass that.
  let sameFeatures = !model.featureNames ||
      model.featureNames.join() === sp.featureIds.join();
  if (c.owners.length !== model.theta.length || sp.layers !== model.layers || sp.qubits !== model.qubits ||
      sp.entangler !== "cnot" || !sp.reupload || !sameFeatures ||
      c.readout.kind !== "project" ||
      c.readout.weights.length !== model.readout.length) {
    throw new Error(`The network is not the circuit of ${model.name ??
        "this model"}.`);
  }
  c.owners.forEach((o, i) => {
    if ("link" in o) {
      o.link.weight = model.theta[i];
    } else {
      o.node[o.field] = model.theta[i];
    }
  });
  c.readout.weights = model.readout.slice();
  c.readout.bias = model.bias;
}

/** The full quantum state at one point of the circuit, for the probe patch. */
export interface StateView {
  re: Float64Array;
  im: Float64Array;
  /** Bloch vector [<X>, <Y>, <Z>] of each qubit. */
  bloch: number[][];
  /** Entanglement entropy of each qubit with the rest, in bits (0..1). */
  single: number[];
  /**
   * Per qubit pair: quantum mutual information in bits (0..2; all
   * correlation) and negativity (> 0 only if the pair is entangled).
   */
  pairs: {i: number, j: number, mutualInfo: number, negativity: number}[];
}

/**
 * Exact state of the register for one patch: after each gate column
 * (`layers[l - 1]`) and at the end, just before measurement (`final`), plus
 * the exact observables and score.
 */
export function probe(network: Node[][], features: number[]):
    {layers: StateView[], final: StateView, observables: number[],
     score: number} {
  let c = compiled.get(network);
  syncParams(c);
  let n = c.circuit.nQubits;
  let result = forward(c.circuit, c.params, features, {captureStates: true});
  let view = (re: Float64Array, im: Float64Array): StateView =>
      ({re, im, ...entanglement(re, im, n)});
  return {
    layers: result.states.map(([re, im]) => view(re, im)),
    final: view(result.re, result.im),
    observables: Array.from(result.observables),
    score: c.readout.score(result.observables),
  };
}

/**
 * The classifier as a block for coherent search (quantum/coherent.js): run
 * it on a patch's features inside a larger register, or run it backwards.
 * Only the quantum-only readout qualifies: its "target" answer is qubit 0
 * reading 0, which a quantum oracle can act on directly; the hybrid
 * readout's classical sigmoid cannot run inside a quantum computer.
 */
export function classifierBlock(network: Node[][]): {D: number,
    apply: (features: number[], re: Float64Array, im: Float64Array,
            inverse: boolean) => void,
    acceptance: (features: number[]) => number} | null {
  let c = compiled.get(network);
  if (c.readout.kind !== "z0") {
    return null;
  }
  syncParams(c);
  return {
    D: 1 << c.circuit.nQubits,
    apply: (features, re, im, inverse) =>
        applyCircuit(c.circuit, c.params, features, re, im, inverse),
    acceptance: features =>
        (1 + forward(c.circuit, c.params, features).observables[0]) / 2,
  };
}

/**
 * The demos' classical baseline: logistic regression on the same 8
 * features (9 parameters), trained by full-batch gradient descent on the
 * same patches. Optional ranking `pairs` add the same pairwise margin term
 * as the circuit's training (the Wanda site's matched logistic model uses
 * the same pairs). Returns a scorer.
 */
export function trainLogistic(xs: number[][], ys: number[],
    epochs = 600, lr = 1.5, pairs: number[][][] = []):
    (x: number[]) => number {
  let d = xs[0] ? xs[0].length : 0, w = new Array(d).fill(0), b = 0;
  let sig = (z: number) => 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, z))));
  let z = (x: number[]) => b + x.reduce((s, v, k) => s + v * w[k], 0);
  let n = Math.max(1, xs.length + pairs.length);
  for (let e = 0; e < epochs; e++) {
    let gw = new Array(d).fill(0), gb = 0;
    xs.forEach((x, i) => {
      let err = sig(z(x)) - ys[i];
      x.forEach((v, k) => { gw[k] += err * v; });
      gb += err;
    });
    pairs.forEach(([pos, neg]) => {
      let g = pairGradient(sig(z(pos)), sig(z(neg)));
      pos.forEach((v, k) => { gw[k] += g.pos * v + g.neg * neg[k]; });
    });
    w = w.map((v, k) => v - lr * gw[k] / n);
    b -= lr * gb / n;
  }
  return x => sig(z(x));
}

export function forEachNode(network: Node[][], ignoreInputs: boolean,
    accessor: (node: Node) => any) {
  for (let layerIdx = ignoreInputs ? 1 : 0;
      layerIdx < network.length;
      layerIdx++) {
    for (let node of network[layerIdx]) {
      accessor(node);
    }
  }
}

export function getOutputNode(network: Node[][]) {
  return network[network.length - 1][0];
}
