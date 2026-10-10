# Bus Search Lab: demo and project pitch

Working pitch, October 10, 2026. Use measured metrics from the current model artifact, not placeholder accuracy claims. The intended event is Qollab × IonQ. The verified rubric and submission gaps are mapped in [RUBRIC.md](RUBRIC.md); this document is our proposed narrative.

The user now requests **continued iteration without submission**. This is a local narrative draft; public project/source/video publication and Qollab uploads are withheld.

## One sentence

**Place a schoolbus in a captcha, let a trained quantum circuit identify candidate regions, and watch Grover's algorithm turn their phase marks into measurable probability.**

## The story

Most quantum-search demos start with an oracle that already knows the answer. This project makes the construction of that oracle visible. A learned classifier examines the image regions, and the viewer sees both its useful predictions and its mistakes. Grover then amplifies the model's accepted regions, with the math and actual simulated state displayed beside the image.

The deliverable brings together an image experiment, genuine trainable quantum-circuit parameters, a working search simulation, and an explanation that stays accurate about the current cost of each part. The user can move the bus and repeat the experiment immediately.

## Suggested two-minute walkthrough

1. **0:00–0:20 — Set the challenge.** Drag a bus onto the captcha. Move it after the first run to establish that the input is interactive. State the grid size and what counts as a correct region.
2. **0:20–0:45 — Reveal the learned predicate.** Show the candidate confidence heatmap, threshold, and selected regions. Explain the feature encoder, small trainable circuit, and saved weights in one sentence. State the training data domain and display held-out metrics if available.
3. **0:45–1:15 — Make interference visible.** Begin with uniform amplitudes. Step through an oracle phase flip and diffusion. Show that phase alone leaves probabilities unchanged, then show mass collecting in the marked set. Sample a measurement and map its bitstring back to a region.
4. **1:15–1:35 — Run a counterexample.** Increase the threshold until nothing is marked, or add a yellow distractor. Explain that a missed bus or a false-positive oracle is a model failure that amplification cannot repair.
5. **1:35–2:00 — State the contribution precisely.** Show training reproducibility, the same-feature classical benchmark, quantum correctness checks, and the cost ledger. Mention the separate coherent appendix, which amplifies a raw QNN-bit event on a tiny grid while leaving relative address discrimination unchanged.

Prefer a short successful run and one illuminating failure to many repetitive successful scenes.

## Recommended words on the site

Main label: **Trained QNN + Grover simulation**

Pipeline caption: **Image regions → classical features → quantum classifier scores → compiled phase oracle → Grover simulation → measured region**

Result labels:

- **QNN score**: classifier output for this region.
- **Marked regions**: regions whose score meets the current threshold.
- **Oracle build evaluations**: region predictions computed before the search simulation.
- **Grover iterations**: simulated oracle-and-diffusion steps.
- **Marked-set probability**: total probability of measuring any region accepted by the model.
- **Measured region**: a sample from the final simulated quantum distribution.
- **Ground-truth overlap**: the separate check against the bus position known by the renderer.

Plain explanation: “The classifier learns which regions look like our training examples. The oracle flips those regions' phases. Grover's diffusion step uses interference to amplify them. A measurement returns one region, so a false positive can be returned too.”

Cost explanation: “Grover reduces the number of ideal coherent oracle queries needed for unstructured search. This browser first evaluates all regions to construct the oracle and then simulates the quantum state, so the demo does not show a faster image detector.”

The science and citations are documented in [RESEARCH.md](RESEARCH.md).

## Claims to keep precise

| Say | Evidence needed |
| --- | --- |
| “The QNN has trained gate parameters.” | Saved weights, training script, circuit definition, seed, and loss history |
| “The detector reads the rendered image.” | Pixel/feature inference path that has no access to placement metadata |
| “Grover amplitude amplification is simulated.” | Statevector updates, norm checks, and agreement with the analytic success curve |
| “The model generalizes within this synthetic test set.” | Held-out examples and a split that avoids identical asset/scene leakage |
| “The ideal search uses about the square root of the candidate count in oracle queries for one marked region.” | Explicit black-box assumption, iteration formula, and separate oracle construction cost |
| “Photographic schoolbus localization works.” | A licensed photographic dataset, a frozen test protocol, and measured results on unseen photographs |

Do not equate theoretical marked-set probability with measured model accuracy. Do not use the placement coordinates to build an oracle in a mode presented as learned detection. If an ideal ground-truth-oracle teaching mode is offered, label it clearly and keep its metrics separate.

## What makes the project compelling

These are proposed strengths to prove through the artifact:

- A visually immediate experiment that a viewer can manipulate without setup.
- Trainable quantum gates rather than a fixed circuit with an arbitrary “QNN” label.
- The oracle shown as a consequential engineering choice, including no-bus and distractor failures.
- Step-by-step phase and probability displays linked to the exact equations.
- Reproducible weights, deterministic scenes, exported experiment results, and a runnable local package.
- A same-feature classical baseline that makes the scientific comparison meaningful.

## Questions a reviewer may ask

**Where is the quantum part?** In the variational circuit that produces classifier measurements and in the Grover unitary evolution. Both are simulated on a classical machine in this deliverable.

**Why run Grover if you already scored every region?** It is an inspectable demonstration of learned-oracle construction and quantum amplitude amplification. The compiled-oracle pipeline is not a practical acceleration; it exposes the assumptions a coherent version would need.

**Is this a coherent QNN oracle?** The interactive version classically evaluates the QNN and compiles a phase oracle. The implemented six-qubit appendix coherently amplifies a raw QNN-bit event using controlled data encoding and the inverse circuit. That event is separate from the trained sigmoid/threshold decision, and its loading cost is explicit.

**Does it recognize real schoolbuses?** Only claim the domain evaluated in the current metrics. Synthetic graphics and arbitrary photographs are different tasks.

**Does the QNN beat a classical model?** Synthetic test accuracy is QNN 96.95% versus logistic 95.10%. On matched photo patches, logistic reaches 99.25% versus QNN 98.45%; on crowd patches, logistic reaches 99.67% versus QNN 99.0%. The 40-parameter QNN and nine-parameter baseline differ in family and fitting procedure. This is educational comparative evidence, not quantum superiority or speedup. See [BASELINE.md](BASELINE.md), [PHOTO_BASELINE.md](PHOTO_BASELINE.md), and the [crowd baseline](../../waldo-search-lab/docs/BASELINE.md).

**Can users place the bus anywhere?** Continuous placement is supported only if the current interface and candidate extraction actually handle it. Define what happens at boundaries and use an overlap-based ground-truth rule. Do not claim exact pixel segmentation from a coarse grid.

**What if multiple regions pass the threshold?** The search amplifies the whole marked set and samples among it. It does not automatically choose the highest original QNN score.

**What improves the project next?** Broader independent-image evaluation, an illumination-aware feature representation that retains dusk-bus evidence, expanded scene/absence tests, and a clear comparison of the two working demos. The Qiskit companion is locally verified. Public platform/project/video actions and submission are withheld under the user's instruction.

## Event and theme

For [Qollab × IonQ](https://qollab.xyz/programs/hackathon/terms), the recommended fit is **Quantum Unlocked**: use the draggable image challenge to make phase oracles, interference, and cost assumptions understandable. The browser site supports the entry; a public runnable Qiskit/Qollab project and 2–3 minute video are required. Submission closes Sunday, October 11 at 7:00 PM Eastern. See [RUBRIC.md](RUBRIC.md) for the verified requirements and honest readiness assessment.
