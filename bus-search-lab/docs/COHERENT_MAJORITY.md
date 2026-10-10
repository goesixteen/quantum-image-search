# Coherent majority of three learned output events

This local research prototype uses three copies of the frozen circuit-native
QNN to construct a sharper learned acceptance event, then performs actual
amplitude amplification on a **14-qubit statevector**. It improves bus purity
for the four fixed synthetic exemplars while increasing circuit work. It
changes neither the trained parameters nor the deployed CAPTCHA interfaces.

| First-peak result, one amplification round | One copy, 6 qubits | Three-copy majority, 14 qubits |
| --- | ---: | ---: |
| Good-event probability | 85.673% | **91.518%** |
| Bus address probability conditional on good | 63.007% | **72.595%** |
| Joint bus-and-good probability | 53.980% | **66.438%** |
| Bus address marginal probability | 54.376% | **66.482%** |
| Logical primitives per preparation A | 178 | 530 |
| Preparation primitives including A/A† at this peak | 534 | 1,590 |

These are exact ideal simulated probabilities, not measured hardware outcomes
or population accuracy estimates. The first peak uses one round for both
predicates; it is not a claim that no later round can attain a higher value.

## Frozen model and fixed exemplars

The input is [`model/coherent-classifier.json`](../model/coherent-classifier.json),
the raw-output model described in [COHERENT_LEARNING.md](COHERENT_LEARNING.md).
Its four-qubit circuit has four feature-reuploading layers and 32 frozen angle
slots, of which 28 affect this output probability. All three copies use the
same angles. No fitting or new checkpoint selection occurs.

Features come from `train_coherent_classifier.fixed_exemplars`: the yellow
truck, blue car, striped yellow sign, and yellow schoolbus specified before
that model's training. The eight pixel features and names are saved with the
report. Semantic labels enter only after evolution to evaluate bus probability;
they do not control feature encoding, preparation, the event reflection, or
iteration selection. This experiment is confined to these four synthetic
patches and does not establish photographic recognition.

| Address | Fixed patch | One-copy output event pᵢ | Majority event qᵢ |
| ---: | --- | ---: | ---: |
| 0 | Yellow truck | 0.352572 | 0.285267 |
| 1 | Blue car | 0.012531 | 0.000467 |
| 2 | Striped yellow sign | 0.181115 | 0.086526 |
| 3 | Yellow schoolbus | 0.930333 | 0.986116 |

`pᵢ` is the Born probability of the QNN's output wire 3 being 1, not a calibrated
posterior or classical sigmoid score.

## Actual unitary preparation and reflection

Two address wires are initialized uniformly. Each address conditionally
encodes the same feature row into three independent four-qubit registers.
The prepared state is

```text
|Ψ₃⟩ = ½ Σᵢ |i⟩ [Uθ(fᵢ)|0000⟩]⊗3
```

The independence is conditional on the address. Preparing three circuits from
the same classical feature table and known angles does not clone an unknown
quantum state. All four address branches share those circuit parameters.
Feature extraction and construction of this small address-controlled angle
table remain classical preprocessing; no scalable image-memory loading scheme
is supplied.

Payload wires 0–3, 4–7, and 8–11 hold the three copies, and wires 12–13 hold the address.
The good event is at least two of output wires 3, 7, and 11 being 1. It has an exact
ancilla-free phase reflection:

```text
S_majority = CZ(3,7) CZ(3,11) CZ(7,11)
majority(a,b,c) = (a AND b) XOR (a AND c) XOR (b AND c)
```

Two 1 bits trigger one pair phase; three 1 bits trigger three pair phases. Both
cases acquire a minus sign. The implementation executes those three CZ phase
operations; an independently calculated majority mask is retained solely for
probability diagnostics and equivalence checks. No output bit is measured
while computing the predicate.

`S₀` negates only the full 14-qubit all-zero state. Each amplification round
applies the genuine gate-list inverse:

```text
Q = −A S₀ A† S_majority
```

`A†` reverses the entire primitive sequence and negates every rotation angle.
The simulator applies gates to vectors, never to a dense 14-qubit unitary
matrix. A complex128 vector is 256KiB, versus 1KiB for the six-qubit case;
scratch vectors and index caches are additional.

## Why the predicate changes purity

Conditional independence of the three output events gives

```text
qᵢ = 3pᵢ²(1−pᵢ) + pᵢ³ = 3pᵢ² − 2pᵢ³
a₃ = ¼ Σᵢ qᵢ = 0.339593946349
P_good(k) = sin²((2k+1) asin(sqrt(a₃)))
P(address=i | good) = qᵢ / Σⱼ qⱼ
```

The majority predicate increases conditional bus purity from 63.01% to 72.60%
**before amplification**. Amplification then preserves each predicate's
conditional address proportions at every round. It increases the total good
event probability without ranking bus addresses inside that good subspace.
The single-copy event starts at 36.91%; majority starts at 33.96%. Both address
marginals initially remain uniform at 25% per exemplar.

The useful effect is specific to this classifier's probabilities. Since
`q−p = p(1−p)(2p−1)`, majority decreases events below 0.5 and increases events
above 0.5. It preserves the 0.5 diagnostic classification boundary exactly.
A systematic false positive above 0.5 becomes more confidently accepted; a
false negative below 0.5 becomes less likely to trigger. Majority does not fix
those classification errors. Amplification likewise retains residual truck
and sign acceptance inside the good subspace.

Iteration selection uses exact simulator event probabilities and the same
integer first-peak rule as the earlier prototype. Obtaining/estimating an
unknown initial probability on a device would add work; this sample does not
measure that overhead or establish a computational advantage.

## Resource accounting

Uniform address initialization uses two H gates once. Repeating the remaining
176 preparation primitives three times gives `2 + 3×176 = 530`. At the selected
round, two A applications and one A† application give 1,590 preparation
primitives, plus three CZ gates for the good reflection and the all-zero
reflection. One-copy uses 534 preparation primitives, one output Z phase, and
its zero reflection.

Counts treat each address-controlled rotation as one logical primitive.
Their physical decomposition, connectivity, and full-register zero-reflection
decomposition are additional. Fourteen wires describe this ideal algorithm;
a chosen hardware decomposition may require ancillary wires. Shared 32 fitted
angle slots are executed three times, rather than becoming 96 separately
trained parameters. These resource increases accompany the observed purity
gain; no runtime or hardware advantage is claimed.

## Verification and reproduction

The implementation is [`model/coherent_majority.py`](../model/coherent_majority.py),
and the frozen output is
[`model/coherent-majority-results.json`](../model/coherent-majority-results.json).
Python, NumPy, and Pillow suffice. From `bus-search-lab`:

```powershell
python model/coherent_majority.py
python model/coherent_majority.py --verify-only
python -m unittest discover -s tests -p test_coherent_majority.py -v
```

The first command writes only this prototype's report. `--verify-only` performs
the full calculation and consistency checks without writing artifacts.

Embedded checks compare actual per-address majority event probabilities with
the polynomial, recover |0⟩ with A†A, verify inverse recovery on three seeded
arbitrary vectors, compare Q with the independent rank-one reflection
`(2|Ψ⟩⟨Ψ|−I)S_good`, check the actual three-CZ phases against the majority mask,
and check normalization, analytic curves, and conditional address invariance
through rounds 0–6. The largest embedded error is 3.77e-14, in conditional
normalization near a small good-event probability.

The [five independent tests](../tests/test_coherent_majority.py) also construct
the complete three-copy preparation by tensoring branches from the established
six-qubit implementation. They cover the frozen model and separate random
features/angles, every basis state's output truth-table phase, arbitrary-vector
reflection, independently enumerated outcomes, and good/bad address trajectories.
All five pass. Model and source hashes in the report support continuation
without altering earlier frozen outputs. This remains a local research
appendix; no submission or public publishing is performed.
