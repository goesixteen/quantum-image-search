# Actual QNN circuit trace

`dist/qnn-trace.js` adds inspection of the actual four-qubit circuit in
`dist/qnn.js`. It does not alter the classifier, features, model weights, oracle
threshold, accepted addresses, Grover trace, or measurement. Production
`qnn.js` remains SHA256
`c881e6a815c7e5e1b4013a241d7b36ff78f3c21ac49ef0f47f2f8005979e972e`.
This module is ready for the linked under-the-hood lesson. The new Wanda
checkpoint's trace parity is recorded below; numerical fidelity is separate
from its image-localization and browser evaluation.

## API

```js
import {traceQNN, getQNNFrame} from './qnn-trace.js';
const trace = traceQNN(selectedWindowFeatures, savedModel);
const frame = getQNNFrame(trace, 3, 0.5);
// frame.state: {re: Float64Array(16), im: Float64Array(16)}
// frame.qubits[q]: {reducedDensity, bloch:{x,y,z}, length, purity}
// frame.probabilities: exact sixteen-state Born probabilities
// frame.basis: bitstring, real, imaginary, probability, phase per basis state
// frame.expectations: the production seven Z-product observables
// frame.correlations: all six pair ZZ expectations and connected covariances
// trace.score: production sigmoid detector score at circuit completion
```

`traceQNN(features, modelOrTheta)` accepts eight finite features and either a
model with `theta`, seven `readout` weights, and a finite `bias`, or the circuit
angle vector alone. Angle vectors may have any positive length divisible by
eight. The circuit always has four qubits; its layer count is `theta.length/8`.
Optional model `qubits`/`layers` metadata must agree. Theta-only traces return
`logit:null` and `score:null`. Model feature extraction stays upstream.

It returns `gates`, `states`, `initialState`, `finalState`, `final`,
`expectations`, `logit`, `score`, `features`, `theta`, `qubits`, and `layers`.
There are 20 gate steps per layer and one more state snapshot than gate steps.
`states[k]` is the full complex state before gate `k`; `states[gates.length]`
is the completed state. Treat returned buffers as read-only.

`getQNNFrame(trace, gateIndex, progress=0)` accepts a gate index from zero through
`gates.length` and progress within `[0,1]`. An index equal to `gates.length`
selects the completed circuit. The returned state summary adds `gate`,
`gateIndex`, `gateProgress`, `effectiveProgress`, `completedGates`, and
`interpolation`. Rotation frames apply the actual angle multiplied by progress
to the full pre-gate state. CNOT frames have `interpolation:'endpoint-only'`:
progress below one holds the exact before state, and progress one returns the
exact after state. Animate its circuit connection while explaining the state
change; do not present intermediate local rotations as CNOT physics.

Other exports are `buildQNNGates(features, theta)`, `zeroQNNState()`,
`applyQNNGate(state, gate, progress=1)`, `summarizeQNNState(state)`, and
`QNN_OBSERVABLES`. Helpers copy the state and reject nonfinite or unnormalized
inputs rather than silently renormalizing them. Gate records identify `kind`,
`layer`, `phase`, `qubit` or `control`/`target`, the angle, and the input feature
or trained parameter index where applicable.

## Exact circuit and readout

Each layer performs the production sequence:

1. For each wire `q=0..3`, apply `RY(π features[q])` then
   `RZ(π features[q+4])`.
2. For each wire, apply its next trained `RY(theta[p])` then `RZ(theta[p+1])`.
3. Apply the ordered ring `CX(0,1)`, `CX(1,2)`, `CX(2,3)`, `CX(3,0)`.

Features are encoded again in every layer. Basis indices use qubit zero as
the least-significant bit; displayed bitstrings read `q3 q2 q1 q0`. The seven
expectations are `Z0`, `Z1`, `Z2`, `Z3`, `Z0Z1`, `Z2Z3`, `Z0Z1Z2Z3`.
The completed detector logit is their trained affine combination; the sigmoid
uses the same logit clamp `[-40,40]` as production. This is a detector score,
not a calibrated identity probability. Intermediate-state expectations are
inspectable observables; the learned decision is defined after the full circuit.

## What a sphere means

For wire `q`, summing over the other three wires gives its reduced density
matrix `ρq`. For matching amplitudes `a0,a1`:

```text
ρ00 = Σ |a0|²,  ρ11 = Σ |a1|²,  ρ01 = Σ a0 conjugate(a1)
b = (2 Re ρ01, -2 Im ρ01, ρ00 - ρ11)
purity = Tr(ρ²) = (1 + |b|²)/2
```

A pure local state lies on the sphere. A qubit entangled with the other wires
can lie inside it even though the complete simulated state is pure. For
`(|00⟩+|11⟩)/√2` on wires zero and one, both local vectors have length zero
and purity one half, while their `ZZ` correlation is one. The four spheres
therefore cannot represent the complete joint state. Include the basis
probabilities and complex amplitudes/phases, with a compact correlation view.
Pair covariance alone is not an entanglement witness: classical correlations
can produce the same local spheres and `ZZ` values.

The classifier uses four qubits. Grover's 64×64 location register separately
uses twelve; this tracing module does not combine them into a coherent
image-classification-and-search circuit. Classical readout, threshold and
peak suppression still compile the learned oracle.

## Verification

Run from the project directory:

```sh
node --test tests/qnn-trace.test.mjs
```

All nine tests pass. They compare actual trained scores and all seven readouts
on the first 16 fixed-order held-out pixel-derived fixtures against their
independent saved NumPy results. Additional checks cover production parity
for one through five layers, repeated encoding/gate labels, Bell partial
traces, the sign of the Y coordinate, analytic fractional rotations, invariant
local purities under local gates, exact complex CNOT permutations/endpoints,
physical reduced states throughout 80 gates, and malformed inputs. This is
circuit and visualization validation, not a new image-localization benchmark.

## Frozen Wanda model verification

After the new-domain checkpoint freeze, added
`tests/wanda-trace-parity.test.mjs`; all three tests pass. They load the actual
served Wanda weights, `wanda-window-v1`, with exact model SHA256
`d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88`.
The original classifier, tracing core, and historical model/fixtures were not
changed to obtain these results.

The new fixture coverage is 12 genuine PNG geometry examples declared before
fitting and the first 16 reserved test rows in existing dataset order, with no
score-based selection. The held-out trace fixture is
`model/wanda-qnn/held-out-trace-fixtures.json`, SHA256
`a6da338c53bea727b3c7e39f4f24aa81c618e554e8029a05035e3a5997db49ea`.
The geometry fixture is `model/wanda-qnn/pixel-parity-fixtures.json`, SHA256
`bf740c7c6613f6d412130ef3f273b33d5c40ab4dba439d211fea1200e7077f2f`.
Geometry files provide PNG checksums; held-out source PNGs are also decoded
and their recovered vectors checked, without inventing absent per-file hashes.
Labels and true placement are not inputs to the trace.

| Numerical check | Result |
| --- | ---: |
| Fixed feature rows | 28 |
| Distinct decoded source PNG files | 15 |
| Final RGB → features versus saved native vectors | 0 maximum difference |
| Seven traced expectations versus saved NumPy | 6.38 × 10⁻¹⁶ maximum difference |
| Traced sigmoid score versus saved NumPy | 7.63 × 10⁻¹⁷ maximum difference |
| Endpoint/fractional-angle frames inspected | 4,508 |
| State norm / reduced-purity identity error | ≤2.11 × 10⁻¹⁵ |
| Minimum local purity in these examples | 0.500455 |

Every inspected reduced matrix has unit trace, Hermitian off-diagonal entries,
a nonnegative determinant within numerical tolerance, Bloch length at most
one, and purity within `[1/2,1]`. Mixed local states retain their actual short
vectors. Production `quantumReadout`/`predict` also agree. These tests establish
the linked RGB → feature → circuit → readout lesson on the new model; they
do not measure detection rate, validate unseen art, or establish quantum
advantage. The complete localization and browser protocols remain separate.

```sh
node --test tests/wanda-trace-parity.test.mjs
```

PNG decoding requires `@napi-rs/canvas`; the test first uses a normal local
installation and otherwise the bundled Codex dependency path. The numerical
trace core itself remains a browser ES module with no package dependency.
