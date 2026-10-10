# Coherent QNN amplitude amplification: runnable tiny-grid appendix

`model/coherent_prototype.py` implements a six-qubit statevector experiment with
two address qubits and the actual four-qubit learned variational circuit. The
feature encodings are controlled by the address. The circuit makes no
intermediate measurements and its inverse is implemented by reversing the gate
sequence and negating rotation angles.

In the saved four-layer experiment, amplification raises the probability of the
raw QNN bit-3 event `|1>` from **27.1477% to 99.4623% after one iteration**. This is
an event-yield result. The event is not the model's trained sigmoid/threshold
classification rule, and the experiment is not a schoolbus-detection benchmark.

The executable, machine-readable evidence, and focused tests are:

- `model/coherent_prototype.py`
- `model/coherent-results.json`
- `tests/test_coherent.py`

The current browser interface continues to use the documented classically
constructed learned oracle. This appendix supplies a separate coherent circuit
that can be extended in a later work step.

## Preparation and reflections

For each of four feature vectors `x_i`, let `U_theta(x_i)` be the QNN unitary.
The experiment prepares

```text
B = sum_i |i><i| tensor U_theta(x_i)
A = B (H tensor H tensor I_qnn)
|psi> = A |000000> = (1/2) sum_i |i> U_theta(x_i) |0000>
```

The 8 features, angle conventions, learned `Ry`/`Rz` parameters, and CNOT ring
match `dist/qnn.js` and `model/train.py`. Each QNN layer repeats feature encoding,
learned rotations, then the ring `0->1, 1->2, 2->3, 3->0`. Each feature rotation
is applied only when both address bits match its candidate. Learned rotations and
QNN-register CNOTs apply to all address branches.

The default good subspace is the set of basis states with QNN qubit 3 equal to 1.
`S_good` is a `Z` phase reflection on that bit. `S_0` negates only the full
six-qubit zero state. The amplification step is

```text
Q = -A S_0 A† S_good
Q |state>:
  1. Apply S_good.
  2. Apply the inverse preparation A†.
  3. Apply the full-register zero-state reflection S_0.
  4. Apply preparation A.
  5. Negate the overall state (a physically irrelevant global phase).
```

The inverse exists because preparation contains only unitary gates. It reverses
the entire circuit, including address Hadamards, feature reuploading, learned
rotations, and entanglers. No measured score, thresholded truth table, or known bus
position is an input to `Q`.

For initial event probability `a`, define `theta=asin(sqrt(a))`. After `k`
iterations, the event probability is `sin^2((2k+1)theta)`. This is the standard
amplitude-amplification construction for a general measurement-free preparation,
as developed in [Brassard, Hoyer, Mosca, Tapp (2000), section 2 and equation
8](https://arxiv.org/abs/quant-ph/0005055).

## Saved numerical result

The recorded model has four QNN layers. The JSON report stores the model and
fixture SHA-256 hashes; rerunning after retraining creates a new result rather
than pretending the following numbers are universal. Default candidates are
feature rows `0,2,1,4` from the trainer's fixed parity fixtures. This subset and
output-bit choice are illustrative, not a held-out accuracy evaluation.

| Completed iterations | Raw good-event probability |
| ---: | ---: |
| 0 | 0.2714769699 |
| 1 | 0.9946233807 |
| 2 | 0.1525659585 |
| 3 | 0.4099411827 |
| 4 | 0.9523017320 |
| 5 | 0.0633825792 |
| 6 | 0.5561111338 |

The JSON report supplies the complete precision values, norm, analytic curve,
address marginals, joint address/event probabilities, and conditional address
probabilities at every step. The first peak is at one iteration. Two iterations
already overshoot severely.

## Event yield and localization discrimination are different

Let `p_i` be the probability that `U_theta(x_i)|0000>` produces the selected raw
bit event. Uniform addresses give `a=(sum_i p_i)/4`. Decomposing the prepared state
into normalized good and bad projections shows that amplification rotates their
total weights while preserving their internal vectors. Consequently,

```text
P(address=i | good event) = p_i / sum_j p_j
```

is invariant under every amplification iteration where the good event has
nonzero probability. For completeness, the unconditional address marginal is

```text
P_k(address=i) = (p_i / (4a)) * sin^2((2k+1)theta)
              + ((1-p_i) / (4(1-a))) * cos^2((2k+1)theta)
```

when `0<a<1`. This is an immediate consequence of the two orthogonal event
subspaces in the prepared state; it is also verified numerically by the script.

For the candidate at address 2, the saved raw event probability is about 0.5581.
Its share among all accepted event outcomes is **51.3986% both before and after
amplification**. At the one-iteration peak the probability of jointly observing
address 2 and the event is about 51.1222%, even though observing the event itself
is 99.4623% likely. Calling 99.4623% “bus localization accuracy” would therefore
be wrong.

Amplification can make obtaining an accepted event more likely. It cannot make
the existing event discriminate among candidates more precisely. That requires
improving the QNN preparation or the acceptance definition.

## Why this is not the trained classifier oracle

The exported classifier uses seven expectation values from the quantum circuit,
a learned classical weighted sum, and a sigmoid. Its user-facing score is

```text
score_i = sigmoid(bias + sum_j readout_j * <O_j>_i)
```

The current main UI then compares that score against a learned threshold. The
raw probability of qubit 3 being 1 equals `(1-<Z3>)/2`, which is a different
function. The circuit parameters were optimized together with the weighted
classical readout; a particular raw bit was not trained to be an acceptance flag.

The prototype prints both quantities as diagnostics. Those diagnostics are
calculated only for analysis and never fed to the amplification operator. This
avoids silently substituting the classical sigmoid score for a coherent output
event.

A direct next experiment is to train the QNN with the Bernoulli output probability
`P(q3=1)` as the classifier score and cross-entropy target. Then the selected event
would be the quantity actually optimized by training. Address-controlled feature
encoding, inverse preparation, and the existing reflections could be reused.
Evaluation would still need to report event yield, conditional precision, and
ground-truth localization separately. An exact coherent threshold of an
expectation value requires a further decision procedure; it is not supplied by
this appendix.

## Resources and physical implementation limits

For four QNN layers, one `A` contains:

| Undecomposed primitive | Count |
| --- | ---: |
| Address Hadamards | 2 |
| Two-address-bit-controlled feature `Ry` | 64 |
| Two-address-bit-controlled feature `Rz` | 64 |
| Learned `Ry` | 16 |
| Learned `Rz` | 16 |
| QNN CNOTs | 16 |
| **Total** | **178** |

For `L` layers the total is `2+44L`. After `k` amplification iterations there are
`k+1` applications of `A`, `k` applications of `A†`, and `k` applications each of
the good and full-zero reflections. Thus the saved one-iteration result uses two
preparations and one inverse, not one QNN evaluation.

These counts treat address-controlled rotations and the full-register reflection
as high-level operations. Physical hardware requires decomposing them into the
device's gate set and choosing connectivity, ancillas, and a noise model. The
prototype does not estimate that cost or execute hardware.

All four classical feature vectors are compiled into the gate angles. Expanding
this multiplexed construction to `N` patches creates feature-controlled gates
proportional to `N` for each QNN layer. Feature extraction and compilation already
use the image data. Six simulated qubits and an amplitude-amplification curve do
not establish an end-to-end quantum speedup for images.

The suggested first-peak iteration uses the exact initial probability obtained
from the classical simulator. A hardware implementation would need a promise,
estimation method, or unknown-success-probability search schedule to choose its
iteration count. The appendix does not implement amplitude estimation.

## Run and validate

With Python and NumPy available, run from the project directory:

```powershell
python model/coherent_prototype.py --output-qubit 3 --iterations 6
python -m unittest discover -s tests -p test_coherent.py -v
```

Options include `--model`, `--features` (a JSON 4-by-8 array), `--fixtures`,
`--fixture-indices`, `--output-qubit`, `--iterations`, and `--output`. The model
must use four QNN qubits with eight learned angles per layer; its layer count is
read from the export. Features must be finite values in `[0,1]`.

The script performs seven consistency checks and fails if any exceeds `1e-10`:
the implemented inverse versus `A`'s conjugate transpose, full 64-by-64 unitarity,
recovery of the initial zero state, the actual amplification operator versus an
independent dense reflection, the analytic event curve, normalization, and
conditional address invariance. The saved maximum error is below `4.3e-15`.

Six focused tests additionally check a controlled rotation's address selection,
inverse recovery of an arbitrary complex vector, parity with the exported
trainer's sigmoid fixtures, uniform prepared address marginals, zero/full/quarter
toy event probabilities, and explicit input-validation failures.

Validated in work step 1 on 2026-10-10: **6 passed, 0 failed**.
