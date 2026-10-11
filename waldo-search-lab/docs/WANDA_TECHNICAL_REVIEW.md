# Wanda under-the-hood technical review

Reviewed October 11, 2026. This is a source/math review of the planned linked
lesson and current markup, not completed browser validation of the new Wanda
training domain. `underhood.js` was still being implemented at this review.
No app, page, classifier, checkpoint, threshold or audit was edited.

The linked image → features → four-qubit circuit → classical predicate → Grover
story is scientifically sound when the distinctions below remain visible.
The trace core is implemented and tested; the five-background Wanda fit and its
release checks remain separate work. Earlier striped-person results, including
223/250 clean-front test scenes, are historical evidence for different artwork
and three backgrounds. They are not Wanda accuracy.

## What was checked

- Read `outputs/WANDA_ITERATION_BRIEF.md`, the new page's pixel/QNN/Grover
  sections, `model/current-qnn/README.md`, `dist/qnn.js`, `dist/quantum.js`, and
  `docs/QNN_TRACE.md`.
- The trace follows production's repeated `RY/RZ` input encoding, trained
  `RY/RZ` gates, and ordered `0→1→2→3→0` CNOT ring. Nine tests passed, including
  all seven readouts and scores on 16 untouched historical held-out fixtures.
  Readout/score differences from saved NumPy are at most `1.22e-15`/`4.44e-16`.
- The trace uses full complex amplitudes and genuine partial traces. Bell
  fixtures have zero local Bloch lengths, purity one half, and joint `ZZ=1`;
  rotation tests establish the positive-Y convention and exact normalized
  intermediate states. CNOT tests verify complex amplitude permutations and
  exact endpoints, with no fictitious fractional gate path.
- Production Grover applies phase flips then reflection about the post-oracle
  mean. Its curve reports accepted-set mass, not image-ground-truth success.
  Empty-oracle abstention is an application policy; its underlying uniform
  state still has mathematical Born probabilities.
- Verified the primary-source links below online. These sources support the
  mathematical concepts; local parity tests establish this implementation.

## Concise source links for the lesson

For the spheres, explain that tracing out other wires can leave a mixed local
state. [PennyLane reduced density matrices](https://docs.pennylane.ai/en/stable/code/api/pennylane.density_matrix.html)
documents that operation. The Bloch representation and allowed vector lengths
are explained in [PennyLane's state-preparation tutorial](https://pennylane.ai/demos/tutorial_state_preparation/).

Fractional-angle frames use the actual standard rotation matrices, with angle
multiplied by progress. The signs and half angles agree with
[PennyLane RY](https://docs.pennylane.ai/en/stable/code/api/pennylane.RY.html) and
[PennyLane RZ](https://docs.pennylane.ai/en/stable/code/api/pennylane.RZ.html).

The trained component is a variational classifier on engineered inputs, with
classical readout. [PennyLane's variational-classifier tutorial](https://pennylane.ai/demos/tutorial_variational_classifier)
provides an approachable supervised-learning example. It does not establish
any advantage or generalization for this project's image task.

For interference, [PennyLane's amplitude-amplification lesson](https://pennylane.ai/demos/tutorial_intro_amplitude_amplification)
explains the two-reflection geometry and overshooting. Link
[Grover's original paper](https://arxiv.org/abs/quant-ph/9605043) for the search
algorithm and ideal query scaling. A query bound assumes an available oracle;
it is not this browser demo's end-to-end image-processing speed.

## Implementation and wording pitfalls

**Keep one run linked.** The selected crop, eight features, trace score,
threshold, suppressed peaks, accepted addresses, and Grover states must use
the same final RGB snapshot and active model. Candidate centers are scan
coordinates, not leaked target coordinates. At coarse address grids the
learned address score is a maximum over fine windows: inspect its associated
`bestX/bestY` window rather than substituting the coarse cell center. Selecting
the highest score for inspection is legitimate; it must not repair the oracle
or replace the sampled answer. Explain a trace selected in legacy/template or
unsupported-art mode explicitly rather than presenting it as the active Wanda
detector. A changed image invalidates the previous trace/run.

**The features already contain domain knowledge.** Colors, stripe spacing,
head/body/leg geometry and supplied size are classical appearance priors.
Feature bars should disclose those priors. The circuit learns a decision from
descriptors; it does not learn directly from raw image pixels or infer unknown
scale. Show input and learned angles as distinct gate groups, and show the
repeated input encoding at every layer. Keep the output labelled detector
score, not calibrated identity probability. Final scores need the complete
circuit's expectations, saved affine readout and sigmoid.

**A sphere describes a reduced state.** Do not stretch a mixed Bloch vector to
the surface or draw four independent neuron states. Entangling gates can
entangle their inputs; a CNOT does not entangle every possible input. In this
pure full-state simulator, an interior local Bloch vector reflects entanglement
with the remaining wires; noisy hardware could have other causes of local
mixedness. A linking pulse is an illustration of the CNOT event, not a continuous
local physical trajectory. Labels should follow the actual trace gate count.

**Probability bars are not the whole joint state.** Label the 16-bar view
joint basis probabilities. They omit relative phases, and four spheres plus
`ZZ` covariances do not completely specify an arbitrary entangled state.
Amplitude/phase hover values are available from `frame.basis` if desired.
Pair covariance `⟨ZaZb⟩−⟨Za⟩⟨Zb⟩` is a correlation, not an entanglement witness.

**The registers and oracle are distinct.** The classifier has four qubits;
the 64×64 location register has twelve. Every fine window is scored with a
classical circuit simulation before threshold and duplicate suppression
compile marks. The lesson does not implement a coherent sigmoid/threshold
oracle acting on image addresses, quantum image memory, or a demonstrated
end-to-end speedup. The known marked count selects first-peak rounds here.

**Keep signs through the Grover lesson.** A phase flip leaves squared
amplitudes unchanged. Reflection uses the mean after that flip. Uniform Grover
keeps equal amplitudes within the accepted group and within the rejected
group, rather than carrying learned score ranking forward. For a two-dimensional
plot with horizontal rejected axis and vertical accepted axis, use

```text
B = Σ(rejected amplitudes) / √(N−M)
G = Σ(accepted amplitudes) / √M
θ = asin √(M/N)
(B,G) after r rounds = (cos[(2r+1)θ], sin[(2r+1)θ])
P(accepted) = G²
```

These are signed collective amplitudes, not mean cell values or probabilities.
Retain signs beyond the first peak. Handle `M=0` and `M=N` separately because
one normalized group vector is undefined. An empty oracle requests no answer;
an all-accepted oracle provides no localization information. False accepted
points are amplified too. Exact values/samples must come from the statevector,
while the soft field remains a clearly labelled score/smoothing display.

**Preserve model evidence and parameter meaning.** If the new architecture
remains four layers, it exports 32 angle slots and eight classical readout slots.
The four final RZ slots are prediction-inactive for this diagonal readout;
freezing them leaves 28 optimized quantum angles plus eight classical slots.
That is not proof of 36 independent dimensions. Their phases can still change
the traced state even though the final detector readout is unchanged.

## When Wanda weights arrive

Reuse `traceQNN` on fixed-order genuine new-domain feature fixtures and the
exact frozen new checkpoint. Compare all seven expectations and final scores
with production `quantumReadout`/`predict` and independent stored NumPy/Qiskit
results. Record source/model/feature hashes and the new fixture domain; do not
modify or relabel the old 16-row test fixture. Trace parity proves visualization
fidelity, not image accuracy. Browser default, target-free, held-out placement
and independent-background evaluations still need their own denominators and
failure records. No threshold tuning follows the reserved test.

## Planning assumptions

The brief's 30% playful usability, 35% approachable explanation, 25% technical
execution, and 10% reproducibility are internal planning weights. They are not
an official judging rubric or predicted score. The visual lesson can be reviewed
for correctness and usability now; measured educational benefit requires an
actual study and is not established by a voluntary quiz.

## Implementation review addendum

After the initial design review, read the newly written `dist/underhood.js` and
the `wanda-scene`/`wanda-grover` dispatches in `dist/app.js`. Root was still
editing these files, so the following records the reviewed implementation and
recommendations, not a claim of final browser QA or unresolved release defects.

The implemented collective coordinates correctly sum signed amplitudes and
divide by the square root of the corresponding group's size. Oracle and
diffusion use the production pure functions; accepted probability is the sum
of amplitude squares, and the displayed reflection mean is taken after the
phase flip. The canvas's inverted vertical coordinate preserves the signed
marked-axis orientation. Empty/full predicates avoid division by zero and
explain their lack of recognition/localization information.

The gate slider uses actual stored endpoint states. During a CNOT, fractional
display frames hold its before state; moving to the next gate gives its exact
after state. Rotation trails use actual fractional-angle full-state traces.
The spheres keep reduced-vector lengths rather than forcing unit radius.
Joint-state hover exposes complex amplitudes, phase and exact probability.
The revised markup explicitly says probability bars omit phase and connected
ZZ values are not entanglement witnesses.

Candidate selection uses the same final RGB/extractor/model inputs. The
highest-score inspection button uses returned `bestX/bestY` coordinates when
available and does not change accepted addresses or the measured result.
No target position, presence flag, mask, clean background or template score
enters this QNN trace path.

Four recommendations were sent to root:

1. `publishSceneTrace()` returned silently outside current-QNN mode. That left
   the previous scene/trace visible after switching to legacy/template modes
   or uploading a target. Dispatch explicit invalidation or visibly label the
   previous trained snapshot; disable its highest-score inspector until a
   supported linked run is available.
2. Circuit playback used a Boolean but did not cancel its queued animation
   frame. Pause followed by restart before that callback executes can leave
   two callback chains drawing repeatedly. Cancel the stored frame request or
   guard each chain with a playback generation token.
3. The six displayed connected pair correlations were not the seven production
   readout features. Display actual `Z0..Z3`, `Z0Z1`, `Z2Z3`, `Z0Z1Z2Z3`
   expectations and the saved weighted sum/bias, at least at completion.
   Distinguish current-gate observables from the completed detector readout.
4. `updateQuantum()` emitted an empty marked set even before detector inference.
   The lesson then described an empty learned predicate, conflating an oracle
   not yet built with actual detector abstention. Include an `oracleBuilt`
   indicator or clear the live example until a scored run exists. Genuine
   empty-oracle searches retain their trace and should keep the abstention
   explanation.

As a visual clarity improvement, fit the selected `W×H` crop within its canvas
instead of stretching it to `120×160`; stretching changes apparent stripe/body
geometry even though numerical inference remains correct. These findings
were source-inspection results. No UI-mirroring tests or browser-result claims
were added; the nine independent quantum-trace tests remain the numeric checks.
