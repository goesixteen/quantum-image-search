# Research notebook: a learned oracle for schoolbus search

Research checked: October 10, 2026, America/New_York. This is an implementation decision record, not a claim that the proposed experiments have already passed. Read the training metrics and project progress log for measured results.

Current human steering is **no submissions; keep improving**. SDK work and local drafts may continue, but platform uploads and public submission-material publication are withheld. Current iteration evidence is recorded in [PROJECT_STATE.md](PROJECT_STATE.md), [UNSEEN_EVALUATION.md](UNSEEN_EVALUATION.md), and the [photo](PHOTO_BASELINE.md)/[crowd](../../waldo-search-lab/docs/BASELINE.md) baselines. Their classical results and independent-photo failures are part of the claim, not exceptions to hide.

The [coherent-majority appendix](COHERENT_MAJORITY.md) now studies a three-copy quantum acceptance predicate using the independently trained raw-output model. Its improved conditional address quality comes from changing that predicate, while amplitude amplification preserves its internal accepted-address distribution. The 14-qubit construction and increased preparation work are explicitly recorded; it is not the browser's classical sigmoid oracle or a new visual-recognition result.

## The defensible project claim

**A trained variational quantum classifier scores image regions. Its predictions define a phase oracle. A browser statevector simulator then demonstrates Grover amplitude amplification and samples a predicted bus region.**

For the first deliverable, the image preprocessing, QNN inference over candidate regions, and construction of the marked set happen on a classical computer. The oracle is compiled from that marked set. The Grover stage is a simulation of the quantum algorithm. This supports an interactive, reproducible educational experiment; it does not establish a practical quantum advantage for computer vision.

The three components must remain distinguishable:

| Component | What it establishes | What it does not establish |
| --- | --- | --- |
| Trained QNN | Learnable quantum circuit parameters can classify features in the demonstrated data distribution | General schoolbus detection or superiority to a classical classifier |
| Grover statevector simulation | Correct interference, amplitudes, and sampling for a specified phase oracle | A faster classical image-processing system |
| Interactive placement demo | The inference pipeline responds to newly rendered pixels | Independence from the synthetic asset style or generalization to photographs |

The detector must see pixels/features, never the placement coordinates. The scene renderer may retain coordinates only for ground-truth evaluation. A model confidence score is not the same as an empirically calibrated probability that a patch contains a bus.

## First implementation snapshot

The preserved synthetic model for the first work step is `BusPatch-QNN-v1`. The factual details below were checked against [the training code](../model/train.py), [the synthetic checkpoint](../dist/model/model-synthetic.json), [the preserved synthetic metrics](../model/metrics-synthetic.json), and [the independent verification report](../model/verification.json). This snapshot describes the October 10 synthetic experiment after crop-policy diagnostics and validation-only final model selection. A later photographic-composite candidate is a separate model/domain and does not replace these results.

- **Input:** eight engineered visual features from 64 by 64 image patches: yellow coverage, yellow aspect, window runs, window darkness, window spacing, wheel runs, body fill, and lower darkness.
- **Circuit:** four qubits, initially all zero, with four repetitions. Each repetition applies RY(\(\pi x_q\)) and RZ(\(\pi x_{q+4}\)) for every qubit, then independently trained RY/RZ gates on every qubit, then CNOTs in order 0→1, 1→2, 2→3, 3→0.
- **Readout:** seven expectations \(Z_0,Z_1,Z_2,Z_3,Z_0Z_1,Z_2Z_3,Z_0Z_1Z_2Z_3\), followed by a trained linear combination and sigmoid.
- **Trainable parameters:** 32 quantum gate angles plus seven classical readout weights and one bias, for 40 total. The model is a hybrid QNN, with no direct classical-feature bypass in the sigmoid readout.
- **Training:** three restarts of 1,800 mini-batch updates each, with batch size 128, seeded synthetic vehicle patches, and analytic propagation of statevector derivatives through the gates. The classical sigmoid/cross-entropy chain rule updates both gate angles and readout weights. Checkpoint selection uses validation BCE; the selected checkpoint is restart 0, step 1,100. The decision threshold 0.28 is selected by validation F1.

| Split | Patches | Accuracy | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Training | 3,200 | 97.5313% | 97.3832% | 97.6875% | 97.5351% |
| Validation | 800 | 98.3750% | 98.2544% | 98.5000% | 98.3770% |
| Held-out synthetic test | 2,000 | 96.9500% | 96.3475% | 97.6000% | 96.9697% |
| Synthetic stress test | 1,200 | 96.1667% | 96.9492% | 95.3333% | 96.1345% |

Seeds are 20261010 for training, 20261011 for validation, 20261112 for the held-out test, and 20261113 for stress. The last two were reserved after exploratory crop-policy diagnostics. This is a **patch classification** benchmark using synthetic vehicle renderings; it is not a photograph-recognition benchmark or a full-captcha localization accuracy figure.

The verification script compares all 32 gate-angle derivatives against parameter-shift across nine random feature vectors and seven observables. Its maximum absolute error is approximately \(6.66\times10^{-16}\). JavaScript/Python classifier output parity is also approximately \(6.66\times10^{-16}\). This independently checks the derivative rule and cross-runtime port, although a standard-library circuit cross-check is still outstanding.

A separate local layout audit uses a 52 by 32 bus sprite on a 128 by 128 neutral scene with four 64 by 64 candidate tiles. The learned predicate marks an overlapping tile at all 110 selected coarse placements. A denser audit of all 4,096 integer tile-phase placements yields 97.4854% any-overlap hits, with 103 missed placements recorded in the report. All marked tiles in this audit overlap the bus. This establishes a remaining boundary-placement limitation; it does not include no-bus scenes, broad distractor testing, or sampled Grover success. The full proposed benchmark below remains useful.

The [same-feature logistic baseline](BASELINE.md) uses the identical frozen generator and final split seeds, with regularization and threshold selected only on validation. On the 2,000-patch held-out test it reaches 95.10% accuracy and 95.0304% F1, compared with the QNN's 96.95% and 96.9697%. The baseline has nine fitted prediction parameters versus the QNN's 40. This is a comparison of these two model families within a synthetic task, not evidence that quantum hardware is needed or that the QNN exceeds stronger classical nonlinear models.

## Why a QNN is a legitimate model here

Circuit-centric quantum classifiers learn parameters of single- and two-qubit gates and use measured circuit outputs for supervised prediction. They are trained through a hybrid quantum/classical loop. This establishes a concrete model family for our classifier, although it provides no guarantee about this bus task. [Schuld et al., *Circuit-centric quantum classifiers*](https://arxiv.org/abs/1804.00633).

Let a deterministic classical feature extractor turn region pixels into a small vector \(x_j\). Define

\[
|\psi_j(\boldsymbol\vartheta)\rangle
=V(\boldsymbol\vartheta)E(x_j)|0^q\rangle,
\qquad
z_j=\langle\psi_j|Z_0|\psi_j\rangle.
\]

A simple readout is \(p_j=(1-z_j)/2\), the circuit probability of measuring output qubit 0 as 1. Alternatively, a trainable classical readout may use several expectations: \(p_j=\sigma(b+\sum_k w_k z_{jk})\). The latter is a hybrid QNN with a classical output layer; its sigmoid output is a classifier score, not a directly measured quantum event probability.

Angle embedding uses features as RX, RY, or RZ angles, with no more features than qubits in a single embedding block. For example, \(E(x)=\bigotimes_k R_Y(\pi x_k)\) for appropriately scaled features. Extra features can be handled with additional encoding blocks; record the exact convention in the model artifact. [PennyLane AngleEmbedding documentation](https://docs.pennylane.ai/en/stable/code/api/pennylane.AngleEmbedding.html).

Use a shallow, documented ansatz consisting of trainable rotations and entangling CNOTs. PennyLane's `StronglyEntanglingLayers` is one established example, with three parameters per wire per layer; a smaller custom RY/RZ/CNOT ansatz is also valid if explicitly described. [PennyLane StronglyEntanglingLayers documentation](https://docs.pennylane.ai/en/stable/code/api/pennylane.StronglyEntanglingLayers.html).

For labels \(y\in\{0,1\}\), binary cross-entropy is

\[
\mathcal L=-\frac1B\sum_{i=1}^B
\left[y_i\log p_i+(1-y_i)\log(1-p_i)\right].
\]

Train on generated bus and non-bus patches, choose model/threshold using a separate validation set, and evaluate a held-out test set once choices are fixed. Save random seeds, feature definitions, the circuit, learned weights, loss history, class balance, and test results. An honest first result is narrow: classification of the chosen synthetic rendering family.

### Gradient correctness

For a gate parameter appearing once in \(R_P(\vartheta)=\exp(-i\vartheta P/2)\), where \(P\) is a Pauli operator, an expectation obeys

\[
\frac{\partial z}{\partial\vartheta_k}
=\frac{z(\boldsymbol\vartheta+\frac\pi2e_k)
-z(\boldsymbol\vartheta-\frac\pi2e_k)}{2}.
\]

The familiar two-circuit rule is a special case of analytic quantum-gradient methods; other generators or repeated occurrences can require other rules or a sum over gate occurrences. [Schuld et al., *Evaluating analytic gradients on quantum hardware*](https://arxiv.org/abs/1811.11184), [PennyLane parameter-shift documentation](https://docs.pennylane.ai/en/stable/code/api/pennylane.gradients.param_shift.html).

**Shift the expectation or raw circuit probability, then use the classical chain rule through the loss.** Applying the same two shifts directly to a nonlinear cross-entropy loss generally gives the wrong gradient. For the simple \(p=(1-z)/2\) readout,

\[
\frac{\partial\mathcal L}{\partial\vartheta_k}
=\frac{p-y}{p(1-p)}\left(-\frac12\right)
\frac{\partial z}{\partial\vartheta_k}.
\]

In code, stabilize the probability near 0 and 1 and verify a few analytic derivatives against central finite differences. With \(P\) independently shifted parameters and batch size \(B\), the straightforward rule needs approximately \(2PB\) shifted circuit evaluations per update, plus forward evaluations. Report this training work separately from the later Grover query count.

Simulator backpropagation and adjoint differentiation can make training faster, but they are simulator-specific training methods. PennyLane distinguishes these from hardware-compatible circuit gradient estimators. If one is used, name it accurately. [PennyLane gradients and training documentation](https://docs.pennylane.ai/en/stable/introduction/interfaces.html).

## Turning predictions into a Grover problem

Let \(N=2^n\) candidate regions be indexed by \(j\). A 4 by 4 grid has 16 candidates and uses 4 address qubits; an 8 by 8 grid has 64 candidates and uses 6 address qubits. These address qubits are distinct from the classifier's \(q\) qubits: the first implementation executes two simulations sequentially, not one joint \(n+q\)-qubit circuit.

Define a fixed predicate for a chosen image and frozen model:

\[
f(j)=\mathbf1[p_j\ge\tau],
\qquad M=\sum_j f(j).
\]

Do not silently use an argmax fallback when \(M=0\). That would force a supposed success even when the classifier rejects every region. Show the empty-oracle result and let the user inspect or change the threshold. Likewise, report multiple candidates if \(M>1\). Grover does not rank the marked regions by their original classifier scores.

The phase oracle and initial address state are

\[
O_f|j\rangle=(-1)^{f(j)}|j\rangle,
\qquad
|s\rangle=\frac1{\sqrt N}\sum_{j=0}^{N-1}|j\rangle.
\]

The diffusion operator is \(D=2|s\rangle\langle s|-I\); one Grover iteration is \(G=DO_f\). The sign flip changes phase, not immediate measurement probability. Diffusion converts those phase differences into constructive and destructive interference. This is the mechanism underlying Grover's unstructured search algorithm. [Grover, *A fast quantum mechanical algorithm for database search*](https://arxiv.org/abs/quant-ph/9605043).

In a real-valued statevector implementation, the exact operations are particularly small:

```text
amplitudes[j] = 1 / sqrt(N)
repeat r times:
    amplitudes[j] *= (-1) ** f(j)  for every candidate j
    mean = sum(amplitudes) / N
    amplitudes[j] = 2 * mean - amplitudes[j]  for every candidate j
probabilities[j] = amplitudes[j] ** 2
sample one candidate from probabilities
```

This is a classical calculation of the quantum state evolution, so its loop still touches all \(N\) amplitudes each iteration. A sampled candidate is one quantum-style measurement; an argmax of all simulator probabilities is a different, classical inspection. The interface should identify which is displayed.

### Exact success curve and iteration choice

For \(0<M<N\), define normalized uniform states over the good and bad sets. With \(\theta=\arcsin\sqrt{M/N}\),

\[
G^r|s\rangle
=\sin((2r+1)\theta)|\mathrm{good}\rangle
+\cos((2r+1)\theta)|\mathrm{bad}\rangle,
\quad
P_{\mathrm{marked}}(r)=\sin^2((2r+1)\theta).
\]

The two reflections rotate the state by \(2\theta\). The first maximum occurs near \(r=\pi/(4\theta)-1/2\); the usual integer choice is \(r=\lfloor\pi/(4\theta)\rfloor\), with tied neighboring choices equivalent for the first peak. Continuing beyond that peak can reduce success. [IBM Quantum, Grover analysis](https://quantum.cloud.ibm.com/learning/en/courses/fundamentals-of-quantum-algorithms/grover-algorithm/analysis), [IBM Quantum Grover tutorial](https://quantum.cloud.ibm.com/docs/en/tutorials/grovers-algorithm).

Values below are calculated from the equation, not empirical model accuracy:

| Candidates \(N\) | Marked \(M\) | Iterations \(r\) | Ideal marked-set probability |
| ---: | ---: | ---: | ---: |
| 16 | 1 | 3 | 96.1319% |
| 64 | 1 | 6 | 99.6586% |
| 256 | 1 | 12 | 99.9947% |

Handle \(M=0\) explicitly: there are no accepted candidates to amplify. Handle \(M=N\) explicitly: every region already satisfies the predicate, so searching cannot discriminate among them. For candidate counts that are not powers of two, either prepare a uniform state over valid indices or pad to \(2^n\), make padded states unmarked, and use the padded dimension in the formula. Do not silently use the original region count with a padded uniform state.

## Classification error and localization error are different

Let \(T\) be the ground-truth bus-region set and \(S=\{j:f(j)=1\}\) be the QNN marked set. A perfect Grover stage searches \(S\), including every false positive in \(S\). In the uniform initial-state construction, each member of \(S\) has equal final probability regardless of its QNN score.

For \(0<M<N\), the actual probability of measuring a ground-truth region is

\[
P_T(r)
=\frac{|T\cap S|}{M}\sin^2((2r+1)\theta)
+\frac{|T\setminus S|}{N-M}\cos^2((2r+1)\theta).
\]

This is a direct application of the preceding uniform-within-subspaces state formula. It makes the error propagation visible: false positives divide amplified mass, while false negatives remain in the suppressed set. No quantum search fixes a bad oracle.

For a freely placed bus crossing several tiles, define ground truth before evaluating. A sensible first task is **find a candidate region overlapping the bus**, not exact pixel segmentation. Options include a tile containing the bus center, or tiles with a declared minimum bus coverage. These yield different \(T\) and must not be mixed. An image upload also needs a clearly stated domain: inserting a supplied cutout into the synthetic captcha differs from recognizing a schoolbus in any uploaded photograph.

## The speedup claim and its cost boundary

The mathematical oracle-query scaling is \(O(\sqrt{N/M})\) to find a marked element, compared with \(O(N/M)\) repeated uniform classical checks under the corresponding black-box model. For one marked element, this becomes the familiar quadratic query improvement. More general amplitude amplification assumes a coherent preparation algorithm and its inverse, without intervening measurements. [Brassard et al., *Quantum Amplitude Amplification and Estimation*](https://arxiv.org/abs/quant-ph/0005055).

**In this demo, all candidate predictions have already been evaluated to compile the oracle. That scan reveals the accepted regions before Grover runs.** Therefore the simulation cannot be sold as a necessary or faster way to recover a location from that same compiled table. Its value is that it exposes how a learned predicate and quantum search relate, and where implementation costs sit.

Keep a cost ledger with separate fields:

1. Image rendering and preprocessing.
2. Classical feature extraction for all candidates.
3. QNN simulator inference count and wall-clock time.
4. Marked-set construction and any circuit compilation.
5. Grover iterations/theoretical oracle queries.
6. Statevector simulation wall-clock time and measurement shots.
7. Training time and evaluations, reported separately from inference.

Never label the Grover iteration count alone “total computations” or “measured speedup.” A simulator stores \(2^n\) amplitudes, and the direct algorithm above performs \(O(r2^n)\) classical work. Likewise, circuit depth and oracle construction cost must accompany any eventual hardware demonstration; small qubit counts do not imply cheap gates.

Loading classical information is a substantive resource. A qRAM architecture addresses memory cells coherently; it is not provided automatically by encoding the address in qubits. [Giovannetti, Lloyd, and Maccone, *Quantum random access memory*](https://arxiv.org/abs/0708.1879). General state-transformation circuits can require numbers of elementary gates proportional to \(2^q\); a short amplitude vector in code does not prove inexpensive hardware preparation. [Möttönen et al., *Transformation of quantum states using uniformly controlled rotations*](https://arxiv.org/abs/quant-ph/0407010).

## The implemented coherent appendix and its remaining gap

An implemented tiny-grid appendix now demonstrates coherent amplification of a raw QNN register-bit event. It is separate from the interactive site's classically compiled sigmoid/threshold oracle. The rest of this section distinguishes that experiment from a coherent implementation of the trained classifier's final decision.

For a deterministic predicate, a valid coherent oracle must reversibly access region data, compute the decision into an ancilla, apply phase kickback, and uncompute work registers. Measuring the QNN for each branch inside Grover destroys the required coherence. A threshold of an expectation value is not automatically a unitary gate; it entails an explicit coherent estimation/decision construction and approximation analysis.

A smaller, well-defined alternative is amplitude amplification of the QNN's **output event**, without an expectation threshold. If the classifier has a genuine output qubit with \(p_j=P(\text{output}=1\mid j)\), form

\[
A|0\rangle=\frac1{\sqrt N}\sum_j |j\rangle U(x_j,\boldsymbol\vartheta)|0^q\rangle.
\]

Reflect on output qubit 1, and reflect about \(A|0\rangle\) using \(A\) and \(A^\dagger\). The initial good-event probability is \(a=N^{-1}\sum_jp_j\), and amplification increases it. Conditional on the good event, addresses have distribution \(p_j/\sum_kp_k\). This derivation follows the amplitude-amplification framework; it does **not** turn scores into a noiseless threshold oracle or eliminate false positives. If a sigmoid classical readout is used, it would need its own coherent implementation rather than being treated as that output-qubit event.

The appendix uses controlled feature rotations to explicitly multiplex four candidates, with two address qubits and four QNN qubits. It applies the actual unmeasured four-layer trained feature circuit, a flag reflection, the inverse gate list, and the preparation-state reflection. The chosen raw event is **QNN qubit 3 measured as 1**, which differs from the trained weighted-observable sigmoid predicate.

In its saved example, one amplification step raises the raw-event probability from approximately 27.1477% to 99.4623%. Conditional on observing that event, the probability of address 2 remains approximately 51.3986% before and after amplification. Thus the event becomes easier to obtain, while relative discrimination among accepted addresses does not improve. Six tests check inverse/unitarity, exact dense reflection equivalence, the analytic curve, norm preservation, and this conditional-address invariance, with recorded errors below approximately \(4.3\times10^{-15}\).

Preparation uses 178 abstract primitive operations, including 128 address-controlled feature rotations. These controlled operations still need a hardware decomposition; they are not 178 native device gates. Explicit loading cost grows with the candidate count in this construction. No qRAM or practical vision speedup is assumed. See [coherent_prototype.py](../model/coherent_prototype.py), [coherent-results.json](../model/coherent-results.json), and [COHERENT_PROTOTYPE.md](COHERENT_PROTOTYPE.md).

## Verified event context

The user's intended event is Qollab × IonQ, October 9–11, 2026. Its official terms require Qiskit and a public runnable Qollab project under MIT by Sunday, October 11 at 7:00 PM Eastern, together with a public 2–3 minute demo video. The published judging traits are Novelty & Creativity, Technical Execution, Impact Potential, and Documentation Quality; no numerical weights were found. This supersedes the earlier investigation of PennyLane QHack, a different event. [Official Qollab terms](https://qollab.xyz/programs/hackathon/terms), [official judging/FAQ](https://qollab.xyz/programs/hackathon/how-it-works#judging).

Quantum Unlocked is our recommended theme fit for this educational application. A Qiskit/Qollab core is now implemented in [qollab/main.py](../qollab/main.py), with packaged model/scene fixtures and a typed `main` entry point. Six local Qiskit tests pass, including injected-backend automatic-main emulation. A live Qollab run/publication is still unverified. See [QOLLAB.md](QOLLAB.md) for runtime/source details and [RUBRIC.md](RUBRIC.md) for requirement-to-evidence mapping and gaps. Registration, team eligibility, and successful submission remain unverified.

## Next research and validation priorities

1. Develop a new versioned illumination-aware photo feature extractor on training/validation identities. The independent dusk bus ROI maps to eight zero features, so additional circuit depth cannot recover its discarded evidence. Preserve the production v2 model and acquire fresh test identities.
2. Use the completed synthetic/photo/crowd logistic baselines when assessing new features, preserving exact matched splits. Logistic photo/crowd accuracy exceeds the respective QNN in these controlled tasks. A nonlinear baseline may later be useful, but it is not a substitute for fixing missing input information.
3. Separate random seeds and rendered scene families between training and held-out tests. Add hard negatives: yellow cars, buildings, signs, and bus-like rectangles.
4. Evaluate localization across continuous positions, scale, rotation, tile boundaries, multiple buses, and absence of a bus. Show misses rather than changing the oracle using known placement.
5. Validate Grover state normalization, marked-set probability, zero/all-marked cases, and overshooting against the closed-form formula.
6. Add finite-shot QNN scoring and make threshold instability visible; freeze the compiled oracle for each Grover experiment.
7. Extend the completed coherent raw-output-event appendix, keeping its event-yield gains separate from classification quality; investigate an explicitly coherent final classifier decision only with its loading and estimation costs accounted for.
8. Continue local Qiskit checks and locally prepared explanation/video drafts if useful. Live Qollab uploads and public project/video publication are deferred under the user's no-submission instruction.

## A concrete benchmark for the next work step

This is a proposed protocol; do not display its counts as completed experiments until the test harness exists and has run.

Freeze the trained weights, feature code, threshold, and candidate extraction before the final test. Use the same features and train/validation/test division for a logistic-regression baseline. Because engineered features may already encode strong visual priors such as yellow coverage, a same-feature baseline is essential: otherwise a good result may come from the features rather than the quantum ansatz.

Start with a deterministic test matrix of at least 300 scenes:

| Scene family | Suggested count | What it tests |
| --- | ---: | --- |
| One bus, random continuous placement and supported scale | 100 | Normal localization |
| One bus near candidate boundaries and corners | 50 | Partial visibility and region definition |
| One bus plus yellow or bus-shaped hard negatives | 50 | False-positive robustness |
| No bus, including yellow distractors | 50 | Whether the classifier abstains |
| Two buses at distinct locations | 50 | Multiple marked regions and sampling |

Keep a manifest with scene seed, family, source asset identity, ground-truth boxes/masks, and supported transformation values. Place source assets in different train/test partitions when testing recognition of unseen appearances. A split consisting of different random scenes with the same bus sprite tests location robustness for that sprite; describe it exactly that way.

For each scene save the score vector, marked vector, \(M\), iteration count, final probabilities, simulated runtime, and one seeded sample. Compute classifier precision/recall/F1, no-bus false-alarm rate, and the probability mass assigned to the declared ground-truth region set. The latter is exact from the simulated probabilities and can be checked against the formula above. Run many measurement samples only when demonstrating shot variability or estimating sampled success; record the shot count and report statistical uncertainty.

Define a region match before the benchmark. If the task is “find a tile containing the bus center,” use that exact rule. If the task is “find a crop that contains a recognizable part of the bus,” specify a minimum bus-mask coverage fraction. Coarse-region localization and bounding-box IoU are different metrics. Changing the criterion after looking at errors invalidates the original test claim.

Record results by scene family as well as overall in local evaluation reports. A high average can conceal failure on boundary placement, absence, or distractors. Export representative misses together with successful scenes so a reviewer can reproduce both.

### Moving toward photographs

Open Images is a possible source for an initial photographic-data audit because it provides object boxes and explicit train/validation/test splits. Its annotations are licensed under CC BY 4.0, while images are listed as CC BY 2.0; the maintainers expressly ask users to verify individual image licenses. Check class metadata and actual examples before assuming a “bus” label establishes the narrower “schoolbus” task. Do not import a large dataset during the first browser prototype. A small, reviewed asset manifest is the next useful step. [Official Open Images V7 description and licensing](https://storage.googleapis.com/openimages/web/factsfigures_v7.html), [official downloads](https://storage.googleapis.com/openimages/web/download_v7.html).

An initial photographic test can use a curated set of schoolbus cutouts pasted into unseen backgrounds, with asset identities held out. This evaluates cutout localization under controlled compositing. A later test of unmodified photographs is a separate experiment and needs true image-level/region-level annotations and more varied visual features.
