# QNN Playground: development log

This log records how the QNN Playground was built: what we tried, what was rejected and why, and what the experiments showed. Read it before changing the design. For how to run the playground and the current feature list, see [README.md](README.md).

Work happened on 2026-10-10 and 2026-10-11: three iterations driven by feedback, a self-review, a trim, an external review, critique-and-fix rounds, an overhaul aligning the playground with the project's image search, a beginner-friendliness pass, and a second external review.

## Goal

Build something as close as possible to the [TensorFlow Neural Network Playground](https://playground.tensorflow.org), but for quantum neural networks. It should stay in this folder as a test bed until it is merged into the main demos. Earlier QNN playgrounds exist, but their UIs drift from the original.

## Iteration 0: fork the real playground instead of imitating it

**Decision:** fork the upstream source rather than rebuild its UI.

- The upstream is Apache-2.0, about 3,800 lines of TypeScript and d3 v3, at commit `02469bd` (June 2022).
- Its UI reaches the network only through `src/nn.ts`: `buildNetwork`, `forwardProp`, `backProp`, `updateWeights`, `forEachNode`, `getOutputNode`, plus `Node.bias` and `Link.weight`.
- So we copied upstream verbatim and replaced the engine. Layout, CSS, heatmaps, loss chart, datasets and URL-hash state stay pixel-identical by construction.

**Supporting changes:**

- **Build:** upstream's 2016 toolchain (browserify, tsify, TypeScript 2.9, concat) was replaced by one esbuild script, [scripts/build.mjs](scripts/build.mjs). It produces the same `dist/` layout (`bundle.js`, `bundle.css`, `lib.js`, `index.html`).
- **Server:** [serve.mjs](serve.mjs) follows the pattern of the repo's other labs, on port 4175.
- **Analytics:** upstream's Google Analytics calls and `analytics.js` were removed.
- **Licensing:** [NOTICE](NOTICE) lists which upstream files are unchanged, modified or new. Apache-2.0 requires each modified file to say it was changed, and each one does.
- **Tooling:** Node.js wasn't installed. At first we verified the math with macOS's built-in JavaScript engine (`jsc`). Node was then installed with Homebrew (`brew install node`, v26) so the page could run.

## Iteration 1: quantum engine behind the neural-net picture (rejected)

The first engine (`src/qnn.ts` plus `src/quantum/`) kept the neural-network picture and mapped each element onto a circuit:

| On screen | Meaning in v1 |
|---|---|
| Hidden node | a qubit; its output is ⟨Z⟩ after that layer |
| Input → layer-1 links | encoding: qubit *q* gets `RY(b + Σ w·x)` |
| Layer → layer links | `CRY(w)` from qubit *p* to *q*; the self link is `RY(w)` |
| Node bias | `RX(b)` |
| Output node | classical `tanh(Σ w_q⟨Z_q⟩ + b)` |
| Activation dropdown | "Entangler": CRY all-to-all, or none |

Gradients were exact (adjoint method) and checked against finite differences. With TF's defaults (`[4,2]`, lr 0.03) it reached 100% training accuracy on circle and XOR.

**Feedback:** "This doesn't seem to be quantum at all. Just because you changed the words doesn't make it quantum."

**Why the criticism was fair:**

- The screen still showed a neural network. Nothing showed qubits, gates, measurement or entanglement.
- Each layer-1 qubit's ⟨Z⟩ was exactly `cos(w·x + b)`, which is just a classical cosine neuron.
- Without entanglement the qubits never interacted.
- The output was a classical tanh neuron with trainable weights doing much of the work.
- There was no measurement: exact expectations, no shot noise.

**Lesson:** a real statevector simulator hidden behind a neural-net picture reads as relabeling. The quantum parts must be load-bearing *and* visible on screen. This is saved as a project memory.

## Iteration 2: a real circuit, pure quantum readout, shots

The model and the drawing were rebuilt.

**The ansatz** ([src/quantum/ansatz.js](src/quantum/ansatz.js)) is a standard layered, hardware-efficient design:

- **Register:** n qubits (1–6) start in |0⟩. Every layer has the same width, since a circuit doesn't change qubit count between layers.
- **Rotations:** in each layer, every qubit gets `RY(b + Σ_i w_i·x_i)` then a trainable `RZ(φ)`.
- **Data re-uploading:** inputs are encoded in every layer by default, or only the first if you turn it off (Pérez-Salinas et al. 2020).
- **Entangler:** after each layer comes a ring `q → q+1 (mod n)` of CNOT (default), CZ, or trainable CRY gates, or no entangling gates.
- **Readout:** the prediction is the measured ⟨Z₀⟩ of qubit 0, in [−1, 1]. There is no classical neuron. Regression targets are already in about [−1, 1], so this works for regression too.

**Measurement and gradients** ([src/quantum/circuit.js](src/quantum/circuit.js)):

- A "Measurement shots" control (∞ / 1000 / 100 / 10) makes every displayed value and loss a sampled estimate. It uses exact binomial sampling up to 50 shots and a normal approximation above that.
- With finite shots, training uses the **parameter-shift rule**, the method real hardware uses. CRY gates need the 4-term rule.
- With ∞ shots, training uses the **adjoint method**, which is exact but only possible in a simulator. The UI says which method is active.

**Drawing:** the middle panel became a circuit in TF Playground's style:

- qubit wires labelled |0⟩, with gate boxes that keep their ⟨Z⟩ heatmaps
- CNOT drawn as a control dot and ⊕; CZ as two dots; CRY as a colored box with an angle you can edit
- a meter on q₀ feeding the output plot
- the "+ / −" over any column changes the whole register

The top-bar slots for Regularization and Regularization rate became Shots and Data re-uploading. L1/L2 on periodic angles adds little, though the code path remains. The explanatory article was rewritten for QNNs.

**Choosing defaults.** An offline sweep: 250 points, 300 epochs, SGD batch 10, exact adjoint gradients, training accuracy.

| config (4 qubits) | circle | XOR | gauss | spiral |
|---|---|---|---|---|
| 2 layers, CNOT, encode first layer only, lr 0.03 | 0.95 | 0.88 | 1.00 | 0.61 |
| **2 layers, CNOT, re-upload, lr 0.03 (default)** | **1.00** | **0.97** | **1.00** | **0.84** |
| 2 layers, CNOT, re-upload, lr 0.1 | 0.96 | 1.00 | 1.00 | 0.58 |
| 2 layers, **no entangler**, re-upload, lr 0.1 | 0.94 | 0.82 | 1.00 | 0.50 |
| 3 layers, CRY ring, re-upload, lr 0.1 | 1.00 | 0.99 | 1.00 | 0.99 |

What the sweep shows:

- Re-uploading helps a lot.
- Removing the entangler hurts every dataset, because only q₀ is measured and nothing carries the other qubits' information to it. That makes a good classroom demonstration.
- A 4-qubit, 3-layer CRY circuit solves the spiral.

**Feedback:** "Looking better, but not blatantly quantum enough."

## Iteration 3: make the quantum state visible

We offered four options. The user chose three of them: always-on Bloch spheres, a statevector panel, and an entanglement map. The fourth, textbook gate notation such as `RY(0.4 + 1.2x₁)` boxes drawn on the wire, was not chosen.

All three follow a **probe point**, a ⊕ you drag on the output plot. Upstream's TF plot shows the model over the whole input plane, but a quantum state belongs to one input. So we added the probe point. The views use the exact state (no shot noise), except the measurement histogram.

- **Bloch spheres:** one under every gate box, with an entanglement-entropy meter (0–1 bit). The arrow shrinks as the qubit's reduced state becomes mixed, meaning entangled.
- **Entanglement map:** purple arcs between every qubit pair, with thickness showing quantum mutual information I(A:B) = S(A) + S(B) − S(AB), from 0 to 2 bits. *(Correction, iteration 7: mutual information measures all correlation, not entanglement. Arcs are now solid only for pairs that are actually entangled.)* There is one set after each gate column and one for the final state before measurement. Single-qubit gates can't change entanglement, so placing the arcs next to a column is exact.
- **Statevector panel:**
  - All 2ⁿ amplitudes as bars, colored by phase, with a phase wheel as the legend.
  - A measure-all-qubits histogram: Born probabilities, or a fresh N-shot sample every frame. Bars are colored by q₀'s value to show ⟨Z₀⟩ = P(q₀=0) − P(q₀=1).
  - Hovering a gate box shows the state at that layer.

Supporting math added to `circuit.js`:

- Bloch vectors.
- Two-qubit reduced density matrices.
- Hermitian eigenvalues, via a real 2d×2d embedding and Jacobi rotations.
- Von Neumann entropy.
- Mutual information.
- Measure-all sampling.

Layout fixes made along the way:

- **Overlaps:** the readout text covered the plot, and the callouts overlapped the labels.
- **Spacing:** qubit rows were made taller (82 px) to fit the spheres.
- **Last layer:** its ring was squeezed into a quarter of the space. Upstream's padded column spacing was replaced with equal-width layer segments.

## Iteration 4: self-review and fixes

Asked to critique the work, we measured first: the type check, edge-case configurations in the browser, and per-epoch timings. The review rests on those numbers. Findings and fixes, in order of impact:

| # | Finding | Evidence | Fix |
|---|---|---|---|
| 1 | Large circuits froze the page. Each epoch ran synchronously in one frame, and the heatmaps always ran 10,000 circuits. | 6 qubits × 6 layers with CRY: 225 ms per epoch exact, **1,447 ms** at 100 shots | Training is time-sliced: an epoch can span frames, at 25 ms of work per frame. Heatmap grids adapt: each redraw times itself and evaluates every 2nd or 4th point when needed (40 ms budget while training, 150 ms when paused). The longest frame is now **50 ms** in the same configuration. |
| 2 | Features were fed raw into periodic rotation angles, so x², x₁x₂ (up to 36) wrapped around many times. | All 7 features: circle 76%, XOR 61%, spiral 75% (offline sweep, 300 epochs) | Every feature is rescaled to x₁'s range [−6, 6]. Default inputs are unchanged. All 7 features now reach 96 / 92 / 93%. A [−π, π] scale was better for 7 features (100 / 100 / 96%) but dropped the 2-feature spiral from 85% to 49%, so we chose [−6, 6]. |
| 3 | Statevector colors showed the absolute phase, which is physically meaningless (global phase). | By inspection | The state is rotated so the largest amplitude is real and positive. The colors now show relative phase, as the labels say. |
| 4 | With shots, thumbnails averaged 10×10 = 100 samples per pixel, as if run with 100× the shots. | By inspection | With finite shots the thumbnails subsample instead of averaging, so they show the same noise as the main plot. |
| 5 | With no entangler, qubits 1…n−1 looked active but can never affect the measured qubit. The earlier "XOR needs entanglement" framing was also too strong. The real reason is that the model collapses to a single-qubit classifier on q₀. | By construction | Those qubits are drawn faded, and the readout note explains why. |
| 6 | Engineering debt: | | |
| 6a | The type check had never run. | 2 errors in `src/qnn.ts` | Fixed. `npm run typecheck` is clean. |
| 6b | The browser test lived only in a temporary folder. | | Now in the repo as `scripts/smoke.mjs` / `npm run smoke`. |
| 6c | About 250 lines of quantum-view code sat inside upstream's `playground.ts`. | | Moved to `src/quantumViews.ts`. |
| 6d | The probe could not be dragged on touch screens. | | Pointer events, so mouse, pen and touch all work. |
| 6e | `favicon.png` returned a 404. | | Added. |

The smoke test caught its own bug: changing only the URL `#hash` doesn't reload the page. The first run therefore re-tested the default page and falsely reported the 6×6 case as responsive. It now reloads via `about:blank`.

Checked and found fine: regression with a pure ⟨Z₀⟩ readout trains well (reg-gauss and reg-plane, loss about 0.001). A 1-qubit, 1-layer circuit runs and shows the expected single cosine stripe pattern.

## Iteration 5: trim to what the project needs

We asked which features earn their place, given that this playground should eventually explain the image-search demos. Those demos use a 4-qubit circuit: fixed `π·f` re-uploading of 8 image features, trainable RY/RZ, a CNOT ring, and a classical sigmoid over 7 Z-observables (`waldo-search-lab/dist/qnn.js`). They only classify. A full backup of the folder was taken before deleting anything, since nothing was committed yet.

| Removed | Why |
|---|---|
| Zero initialization (`initZero` URL setting) | Measured: with all angles 0 the output is exactly 1 and every gradient is exactly 0, so training never starts. |
| Tutorial loader (`tutorial`) | It fetched `tutorials/*.html`, which don't exist in this folder. |
| `collectStats` | Parsed from the URL, never used (not even upstream). |
| L1/L2 regularization plumbing | The UI was already gone. Penalizing periodic angles toward 0 has no clear meaning. This removed the "dead link" logic, and `src/nn.ts` with it: `qnn.ts` now defines its own square loss. |
| Entanglement-entropy meter | Redundant: for a pure global state it is a function of the Bloch arrow's length, S = H((1+\|r\|)/2). The value stays in the sphere's tooltip. |
| Arcs after layer 1 | Always empty, since only single-qubit gates come before them. Removing them also frees that layout space. |
| Regression problem type and its 2 datasets | The project only classifies. reg-plane targets also exceed ⟨Z₀⟩'s range. This is the one cut that costs fidelity to TF. `dataset.ts` stays unchanged upstream, with its regression generators unused. |
| CZ entangler | Not in the project, and it teaches nothing beyond CNOT. CNOT (the project's gate), CRY (the only option that solves the spiral) and None (the contrast case) remain. |

All checks still pass afterwards: `npm test` 8/8, `npm run typecheck` clean, and `npm run smoke` 13/13. The smoke test gained checks that the meter and regression controls are gone.

**Not done; recommended next:** the playground has drifted from the project's real model. The project uses a classical multi-observable readout and fixed `π·f` encoding. The playground uses a pure ⟨Z₀⟩ readout and trainable encoding weights. A "project model" preset reproducing the exact demo circuit would be the most useful addition for merging.

## Iteration 6: acting on an external review

A second Claude session reviewed the playground in headless Chrome. We verified its main claims before acting, then fixed them in the order it suggested.

**1. Gates that can never affect the output were drawn as if they worked.** Verified with the simulator: in the default circuit, **7 of 32 parameters always have zero gradient**. They are q₀'s whole last-layer gate and every last-layer RZ. After the final CNOT ring, measuring Z₀ is equivalent to measuring Z₁Z₂Z₃, and RZ commutes with Z. Other sizes: 2q×2L has 5/16 dead, 3q×3L 6/36, the CRY ring 0, and no entangler 25/32. That last case is more than the old "fade qubits 1+" special case covered.

- **Fix:** a general detector, `deadParameters()` in `circuit.js`. It runs once per circuit build and finds parameters whose gradient is exactly zero at random points.
- **Effect:** dead gates are faded, their hover card explains why and refuses edits, and the "none" special case is gone. A unit test pins the counts above.
- **Rejected alternative:** dropping the final ring. With a single measured qubit, every fixed layout leaves some gates dead (for example, every non-q₀ last rotation if the ring is dropped), so detecting dead gates is the general fix.

**2. Layout:**
- The header is one line (about 65 px instead of 220).
- The readout note and statevector panel now sit right under the plot, starting at y≈729 instead of y≈938 for the panel.
- The probe is a crosshair with an open center (not ⊕, the CNOT symbol).
- The callouts moved clear of the circuit, and the clipped "q0" label moved below the meter.
- Re-uploading is drawn as small `x→` tags instead of a curve from every feature to every later gate (about 72 curves at 6×6).
- CRY boxes shrink to unlabeled squares when crowded.
- An on-screen legend explains the spheres, arcs and faded gates.
- Bloch spheres are bigger (radius 15), with 0/1 pole marks and the arrow kept inside the sphere.
- A probe dot on every gate thumbnail links each box to its sphere.
- Initial encoding weights are scaled by √(2/#inputs). The reviewer's untested guess was right: with all 7 features, accuracy went from 96 / 92 / 93% to 100 / 100 / 96%, and the starting picture is no longer noise.

**3. Interaction:**
- Clicking a gate box now edits it. The handler sat on the SVG, under the HTML canvases.
- The card shows and edits the RY offset, the RZ φ (previously invisible) and the gate's encoding weights.
- There is a single qubit-count control; other columns show "layer k".
- The Entangler menu is disabled at 1 qubit.
- The probe moves with the arrow keys, and the plot is focusable with an ARIA label.

**4. Colors:**
- Angles now use a −π…π color scale. The ±1 scale saturated at 1 rad. Encoding lines are colored by their largest angle contribution, w × 6.
- The rainbow phase colors were replaced by neutral bars with a phase dial per amplitude. This frees orange and blue for their page-wide meanings and works for colour-blind viewers.
- The basis-state ordering (q₀ rightmost) is stated on screen.
- The histogram legend names blue and orange.

**5. Text:**
- The article was rewritten to match the UI: probe, spheres, arcs, statevector, histogram, faded gates, and how it relates to the project's demos.
- Upstream's swapped color statement was fixed: blue is +1.
- Attribution: meta tags no longer claim to be TF Playground, the GitHub corner is labelled as the upstream source, and the footer and credits say "fork of TF Playground by Smilkov & Carter (Apache-2.0)", with feedback directed to this team.
- Train/test accuracy is now shown next to the losses.

**Smoke test** grew to 19 checks, including:
- dead-gate counts (1 faded gate by default, 6 with no entangler, 0 with CRY)
- click-to-edit on a gate box
- accuracy shown
- statevector panel above the legend
- arrow keys move the probe

**Not done (deliberately or not yet):**
- The page keeps upstream's fixed `viewport width=1024`, so mobile isn't supported.
- Gate boxes aren't reachable with Tab.
- Up to 15 arcs still share about 40 px at 6 qubits.
- The CNOT "ring" with 2 qubits is a single gate; it's still labelled "ring".

## Iteration 7: critique-and-fix rounds

Each round began by looking for problems in the evidence: screenshots of interactions not yet checked, timings, and checks of the physics claims against textbook cases.

**Round 1: engineering and usability gaps**
- **The engine adapter had no unit tests.** `src/qnn.ts` was only covered indirectly. Node 26 runs TypeScript directly, so `tests/qnn.test.mjs` now tests it with no build step. It checks:
  - the network shape and links match the circuit
  - dead gates really can't change the output, even when their angles are edited
  - training through the public API lowers the loss
  - fixed CNOTs are never trained
  - shots give sampled k/N values
  - the probe state is unentangled before the first ring, and its final ⟨Z₀⟩ equals the prediction
- **Loss and accuracy were computed in separate passes** over the data. They now share one pass (`evaluate()`).
- **Gate boxes weren't keyboard-reachable.** They are now Tab stops with ARIA labels. Focus shows the card, and Enter edits.
- **"CNOT ring" with 2 qubits is a single gate.** The labels now adapt to the qubit count.
- **At 5 or more qubits, arcs under 0.15 bits are hidden** so the strong ones stay readable. Every value is still in the tooltips.
- **The probe position is saved in the URL** (`probeX`, `probeY`), so a shared link shows the same state. Drags use `history.replaceState`, because upstream's `location.hash =` would add a back-button entry for every pointer move. A smoke check guards against this.

**Round 2: a physics claim that was wrong.** The legend said the purple arcs showed "entanglement between qubit pairs". They show quantum mutual information, which counts classical correlation too. Counterexample: in a 3-qubit GHZ state every pair has I = 1 bit, but each pair's reduced state ½(|00⟩⟨00| + |11⟩⟨11|) is separable.

- **Fix:** compute each pair's **negativity**, the sum of the |negative eigenvalues| of the partial transpose. For two qubits it is > 0 exactly when the pair is entangled (Peres–Horodecki), and it reuses the existing Hermitian eigen-solver. Arcs keep their mutual-information thickness but are **solid only for entangled pairs** and dashed otherwise. Tooltips show both numbers.
- **Unit tests:** Bell pair 0.5, GHZ pairs 0, product state 0, and the analytic sin(t)/2 for cos(t/2)|00⟩ + sin(t/2)|11⟩.
- **Scale of the error:** in the trained default circuit, 7 of the 12 visible arcs turned out to be correlated but not entangled. More than half the arcs had been mislabeled.

**Checks after both rounds:** 14 unit tests (9 simulator + 5 adapter), a clean type check, and 24 browser checks.

## Iteration 8: overhaul to the project's quantum image search (2026-10-11)

**Request:** "given that the rest of the project is a QNN powered image search, do an overhaul and align the visualization to that."

**What the project does** (read from `bus-search-lab` and `waldo-search-lab`):
1. **Regions:** a 512×512 scene is cut into a grid of regions.
2. **Features:** each region's patch (64 px for the bus, 128 px for the crowd) gives 8 engineered pixel features.
3. **Classifier:** a 4-qubit, 4-layer circuit. Features enter as `RY(πf_q) RZ(πf_{q+4})`, re-uploaded every layer, followed by trainable RY/RZ and a CNOT ring. It measures 7 Z-string averages, and a classical sigmoid turns them into a score.
4. **Oracle:** the threshold's marked regions become a phase oracle.
5. **Search:** Grover amplification over the regions, then a sampled measurement. Ground truth is checked only after measuring.

**Design: TF Playground's input plane becomes the image.** Each region is a "point", and the dataset becomes a scene plus its labelled training patches. Feature and gate boxes map their value over the scene's regions instead of over (x₁, x₂). The output heatmap becomes the scene with region scores and threshold marks. A Grover panel is added, since that is the project's final step.

**Alignment by reuse, not imitation:**
- `scenes.ts` imports the demos' `extractFeatures`.
- `search.ts` imports their `quantum.js`.
- `scripts/build.mjs` copies their artwork and `model.json` files into `dist/project/`.
- The circuit builder now produces the demos' exact circuit. The simulator gained fixed (non-trainable) π-scaled encoding terms, Z-string observables measured on all qubits, multi-observable adjoint and parameter-shift gradients, and observables sampled from shared shots.
- The adapter gained a classical readout layer trained with binary cross-entropy, as the demos do, and `loadWeights()` for the demos' `theta`/`readout`/`bias`. Their theta order (per layer and qubit: RY then RZ) already matched the circuit's parameter order.

**Verification:**
- **Observable parity:** the circuit's 7 observables equal the demos' `quantumReadout()` to 1e-12 for both trained models.
- **Score parity:** scores with loaded weights equal their `predict()` to about 2e-15.
- **Dead parameters:** the detector, with no special-casing, finds exactly theta slots 25, 27, 29, 31, the four the demos' hand-written `hybrid-parameter-audit.json` lists.
- **Browser** (24 smoke checks):
  - Demo weights mark the bus (region 27) and the explorer, and a search finds them (99.7% and 96.1% true-target probability).
  - Training from scratch on browser patches reaches 100% / 97% in 15 s and marks the bus but not the yellow trucks.
  - Pure ⟨Z₀⟩ readout fades q₀'s last gate.
  - 6 layers × CRY × 100 shots stays at about 33 ms per frame.

**Decisions:**
- **The hybrid readout is now the default.** In iteration 2 the readout was made purely quantum, but the project's model really has a classical sigmoid. Aligning with the project means showing that honestly: a readout panel labels the classical step, and pure ⟨Z₀⟩ stays as an option.
- **The register is fixed at 4 qubits**, since 8 features map onto 4 qubits × 2 angles. The qubit +/− control is gone, and layers stay adjustable.
- **Training patches are generated in the browser**, following each `train.py` recipe with the same sprites and decoys. They approximate the demos' datasets but are not identical, which the page states.
- **Only the illustrated bus domain is included.** The street-photo model's CC-licensed photos are left out.

**Removed:** the 2-D toy datasets, the X₁/X₂-style feature functions and feature scaling, the input-plane output heatmap, adaptive heatmap striding (a scene has only 16 or 64 regions, so it's cheap), "show test data", and per-layer qubit control. A backup of the pre-overhaul folder was taken.

## Iteration 9: can a beginner follow it? (2026-10-11)

**Question asked:** "Would someone with little experience with QNN be able to follow along?" Before the changes the honest answer was **no**.

**How it was measured** (correction from iteration 10: the scores below came from AI agents role-playing beginners. They were never user research and should not be quoted as results):
1. **Page metrics:** visible controls, words, and occurrences of jargon (⟨Z⟩, RY/RZ, Z-strings, adjoint, oracle, |ψ⟩, …) on the default page.
2. **Simulated novice reviews:** a fresh AI agent each round, role-playing an adult with high-school math and no quantum background. Each saw only screenshots, answered fixed comprehension questions, and gave a 0–10 score. A new agent per round avoids carry-over.

These are proxies, not real users. Testing with 2–3 real newcomers is the next step.

| | Controls | Words | Jargon | Novice score |
|---|---|---|---|---|
| Before (expert UI, untrained on load) | 21 | 515 | 65 | **3/10** |
| Guided view, round 1 | 14 | 416 | 26* | 4/10 |
| Round 2 | — | — | — | 5/10 |
| Round 3 | — | — | — | **6/10** |

\* Most of the remaining 26 were inside hover tooltips. Those tags were then hidden in guided view.

**What the reviews exposed:**
- **The page opened on an untrained circuit.** Random scores marked almost every square, and Grover reported "98.4% vs 98.4%": correct, and meaningless to a newcomer.
- **There was no path through the page,** and the pipeline story sat below the fold.
- **The black "probe" frame was read as "the bus is here".**
- **Yellow trucks looked like "several buses"** while only one square was marked, which read as a contradiction.
- **Three competing buttons** (Play, Search, Run the search).
- **Formulas opened the article.**

**What changed:**
- **A guided view is the default.** "Show all details" restores the expert view, and the setting is saved in the URL (`mode=`).
- **First visits open with the demo's trained circuit loaded.** The intro says so, and points to step 4.
- **A 4-step strip:** pick a picture → score every square → mark the likely squares → search. Each step has one plain sentence, one action, a tick when done and a "next" highlight. Step 1 names the decoys. Step 2 offers "Use the trained circuit" or "Train it myself". Steps 3–4 state the marked count and the chance versus guessing.
- **Plain language everywhere in guided view.** A few tooltip-defined terms remain (qubit, entanglement, threshold, Grover's search). "Epoch" became "Training rounds", accuracy is shown as a single test number, and the threshold label became "Score needed to be marked".
- **Hidden in guided view:** entangler, shots, re-uploading, readout, learning rate, data sliders, the loss chart, Bloch dials, correlation arcs, the readout and statevector panels, the Grover rounds slider, layer +/−, grid size, remove target, and the −1…1 color legend. All of these remain under "Show all details".
- **A key beside the picture**, plus a live "Square 27 scores 0.98: marked…" line. Unmarked squares are dimmed and marks drawn thicker in guided view. A big ✓/✗ banner shows the search result.
- **An icon key for the circuit,** with a one-line "In short" takeaway. The article now opens with an "In Plain Words" section, and the technical text is under "The Technical Version". *(Later replaced, at the user's request, by one short paragraph, "What Is This?", followed by "How It Works".)*
- **A "◀ train it yourself" caption** on the Play button.

**Left for a decision:** the last reviewer still found the circuit "mostly decoration" and suggested collapsing it to "8 clues → [quantum circuit] → score" by default. That would conflict with two earlier user goals: TF Playground fidelity, and quantum parts that are blatantly visible. So it was not done unilaterally.

**Checks:** 16 unit tests, a clean type check, and the smoke test, now with 31 checks. The new ones cover the guided view: 4 steps, first visit pre-trained, advanced panels hidden, the guide's search finds the bus with all steps ticked, and "Show all details" restores the expert view.

## Iteration 10: a second external review: the quantum story (2026-10-11)

A second Claude review found the engineering solid and the simulator math correct, but the *claims* weak. It also found real bugs. Every point was checked before acting.

**Claims that were wrong or overstated:**
1. **"Grover instead of checking squares one by one"** (guided view). This was false here: the list oracle is built by scoring every region classically first, and then the answer is known. It was the kind of quantum relabelling the project rules out. **Fixed:** every Grover description now says the squares were already scored, so this shows how the search behaves, not a speed-up. The article and README add that reading the list directly would be 100%.
2. **No evidence that the quantum part matters.** **Added:**
   - A live classical baseline: logistic regression, 9 parameters, on the same patches, shown next to the accuracy and in step 2.
   - A **Compare** run: entangled vs unentangled circuits, the same patches and epochs, against the baseline. Measured on the crowd scene: CNOT ring 94%, no entanglement 93%, logistic 100%. The page states the conclusion: entanglement is not what makes this task work.
3. **Accuracy said little about generalization.** Accuracy is now labelled in-distribution (same generator and artwork). **Random spot** places the target off-grid, possibly across borders; the default is the easiest case.
4. **Simulated reviews presented as results** in the README. Removed there. The iteration-9 entry now says they were AI role-play, not user research.

**The substantive fix: a coherent oracle** (`src/quantum/coherent.js`, explorer view, quantum-only readout):
- **What it does:** amplitude amplification on index ⊗ classifier registers. Each round runs the classifier on all regions in superposition (index-controlled), flips the phase where qubit 0 reads 0, uncomputes the classifier, and reflects about |s⟩|0⟩.
- **Tests:**
  - It reproduces the demos' `simulateGrover` exactly (1e-12) for a confident classifier.
  - It degrades monotonically as confidence drops.
  - It conserves probability.
- **In the browser:** a quantum-only classifier with 93% thresholded accuracy accepted 47% of the start state, so coherent Grover raised the target square only from 6.3% to 8%.
- **Lesson:** a classifier that works with a threshold is not automatically a usable quantum oracle. The hybrid readout cannot be used coherently at all (a classical sigmoid), and the panel says why.

**Bugs fixed:**
- **Rounds slider during a search:** `run()` re-read `this.rounds` after the animation. A larger value crashed on `history[rounds]`; a smaller one measured a different distribution. **Fixed:** each run now fixes its own rounds, marks and history up front, and slider moves, `clear()` and scene changes cancel it. Smoke-tested.
- **"Load demo weights" ignored shots,** making "these scores match the site" false with 100 shots set. **Fixed:** loading weights now switches to exact values.
- **Scene-switch race:** if the scene changed while `model.json` was downloading, the other scene's weights loaded silently. Both models have the same shape, so the old check passed, and it also couldn't tell first-layer-only re-uploading apart. **Fixed:** the load aborts if the scene changed, and `loadWeights` now also checks feature names, layers, entangler and re-uploading. Unit-tested.
- **Training loop:** a partial last batch leaked into the next epoch, and the data was never reshuffled. **Fixed:** the batch is flushed at the end of each epoch, and the order is reshuffled (seeded) every epoch.
- **URL values weren't validated:** `batchSize=0` made `epochPos % 0` NaN, and training silently stopped. **Fixed:** all numeric state is clamped. Smoke-tested with `batchSize=0&learningRate=abc&threshold=5`.
- **Bloch spheres and arcs** are captured before each layer's ring, so layer 1 is never entangled. **Labelled** in the explorer legend. Moving the capture point was considered, but it would no longer line up with where the spheres are drawn.

**Checks:** 21 unit tests (5 new: coherent = Grover, coherent degrades, logistic baseline, classifier block round-trip, weight-load guards), a clean type check, and the smoke test with new checks for every fix above.

## Iteration 11: consolidated layout for embedding (2026-10-11)

**Request:** break further from the TF template. This will be one piece of a larger website, so no narrow block of text stretching down the page.

**Changes:**
- **Removed** upstream's page-level parts: the hero header, the GitHub corner, the scroll-down button, the long single-column article and the footer.
- **About strip:** the article became one full-width row of four short cards (How it works, Reading the picture, Honest scorecard, Credits). The classroom "hide controls" option moved into a collapsed `<details>` in the Credits card, and the Apache attribution lives there too.
- **Panels row:** the search, readout, classifier-state and comparison panels moved out of the narrow output column into a full-width row of cards under the circuit. The guided view shows only the search card.
- **Tightening:** the guide copy is down to one or two lines per step; the top bar is slimmer; "Show all details" sits once, at the end of the bar; the metrics block grows to fit four lines.

**Page height** (1400 px-wide viewport): guided 1,792 → 1,401 px; details view 2,117 → 1,496 px.

## Iteration 12: sticky top bar; layer and qubit controls restored (2026-10-11)

- **The top bar is sticky**, so the run controls and settings stay in view while scrolling.
- **The layer + / − buttons show in the guided view too.** They had been hidden there in iteration 9.
- **The qubit + / − control is back** (removed in the overhaul), above layer 1. It changes every layer at once and ranges from 4 to 6 qubits:
  - 4 is the minimum, because 8 features need 2 angles per qubit.
  - 6 is the maximum, to keep it fast.
  - With 5 or 6 qubits, the hybrid readout measures one ⟨Zq⟩ per qubit. The demos' 7 Z-strings are defined only on 4 qubits.
  - Loading the demo weights switches back to 4 qubits, and `loadWeights` refuses a different qubit count.
- **Fixed a startup crash** when a URL's inspected square was outside the grid (for example, an 8 × 8 square number on the 4 × 4 crowd scene).
- A smoke check covers each of these.

## Iteration 13: the guided view always shows training (2026-10-11)

- **The pretrained choice is gone from the guided view.** There is no "Use the trained circuit" button, and first visits no longer pre-load the demos' weights.
- **The circuit trains from scratch while you watch** on arrival, and again after any change (scene, layers, qubits, "Train again").
- **The run is sped up and fixed-length:** 120 rounds paced over about 4 s, with a progress bar in step 2, and then it stops.
  - Measured in the browser: test accuracy reaches 93–97% (bus) and 99% (crowd) within about 1 s at 60 rounds/s.
  - So the pacing exists to make training visible, not to save time.
  - In that measurement the bus test loss bottomed out at about 120–150 rounds and then crept back up, which is why the run stops at 120 rather than training on.
- **Pausing or stepping ends the run;** play then trains on freely.
- **The expert view still has "Load demo weights".** It is the proof that the scores match the demo sites.

## Iteration 14: consolidated with the demo sites (2026-10-11)

The playground was developed apart from the rest of the repository, and its second scene had fallen behind. An audit against the two sites found:

- **The circuit already matched** both sites (same encoding, CNOT ring, 7 observables, sigmoid readout), and the bus scene used the bus site's features, artwork and weights (`model.json` is byte-identical to the site's `model-synthetic.json`).
- **The "crowd explorer" scene was the retired pipeline.** It used the old OpenMoji explorer and crowd image, 128 px tile patches on a 4 × 4 grid, the legacy patch features of `waldo-search-lab/dist/qnn.js` and the legacy `model.json`. The Where's Wanda site's default detector is different: the five catalog backgrounds and `wanda.png`, Wanda-sized windows with eight window descriptors including her supplied height (`wanda-localizer.js`), 4096 window centres reduced to a 64 × 64 address grid by best score, a frozen 0.9056 threshold plus non-maximum suppression, point-tolerance ground truth, and `wanda-qnn.json` trained with weighted cross-entropy and a pairwise margin.
- **Smaller drifts:** the bus ground truth used a 20%-overlap rule (the site uses the sprite's alpha), the default thresholds were 0.5 (the sites use their models' 0.28 and 0.9056), and the default targets were not the sites'.

Changes, so that the playground now follows the sites:

- **The crowd scene is replaced by Where's Wanda,** built from the site's own modules: its catalog, compositor (`scene-editor.js`), window features, scan geometry, suppression and point rule (`src/scan.ts` repeats `scanQNN()` around the playground's own trainable circuit). Background and Wanda's height (40–64 px) are selectable, as on the site; the address grid runs 4 × 4 … 64 × 64 with 64 × 64 (12 Grover qubits) by default. Old `scene=crowd` links open it.
- **Live training follows the site's recipe:** composites at random spots and heights, windows on and near the 8 px lattice, six nearby windows 8–32 px away, recoloured decoys on every third composite, and harder background windows picked by a logistic teacher. The protocol's cross-entropy weights (0.5 / 0.25 / 0.25) become example counts, and its pairwise margin term is added to `qnn.ts` (`backProp` now takes an extra logit gradient; the logistic baseline takes the same pairs).
- **Bus ground truth is the site's `regionsFromAlpha`;** defaults (grid, target square, threshold) come from each site; thresholds show four decimals so 0.9056 is not rounded.
- **Fine grids draw differently:** faint grid lines, marks as rings round the best window, the measured address's point rather than a box.
- **Tests:** a scene-level parity test runs the site's `scanQNN()` and the playground's scan on one of the site's own 512 × 512 corpus composites (decoded by a small PNG reader in `tests/png.mjs`) and requires the same scores, best points and marks on several grids and thresholds, including suppression; plus the pairwise gradient, the logit-term backpropagation and the inactive slots. `npm test`: 28 pass. `npm run smoke`: all checks pass, including the site weights marking only Wanda's address 2420 on Festival, Beach and Park, a 4096-address search finding her, from-scratch training reaching 96–97% held-out window accuracy, and frames under 100 ms while training re-scores 4096 windows.

Measured in an offline check before wiring the UI: the playground's trainer on 60 positives from the site's own saved training vectors, 120 rounds, gave 98.9% accuracy, 98% precision and 84% recall at the site's threshold on the site's 6,467 validation windows. That is window accuracy, not the site's scene-level evaluation.

## Iteration 15: review fixes, then Where's Wanda only (2026-10-11)

From the user's review of the consolidated playground:

- **Wanda's pixels now match the site exactly.** An end-to-end check drove the site's own Play flow (a real touch drag of Wanda to (420, 300) on Festival, then Find) and captured the image it analyses. The playground's image differed in 695 pixels, all inside Wanda's 15 × 52 box: its sprite canvas used `willReadFrequently`, which in Chrome resizes on the CPU, while the site's uses a plain context. With the site's canvas settings the two images are byte-identical, and the scores (0.978670), the single mark (2420) and the 50 Grover rounds agree.
- **A clearer marker** on 64 × 64 grids: a ring the size of Wanda with a white halo and ticks, and a "✓ Wanda" / "✗ not here" tag on the measured address.
- **Adding qubits no longer weakens the readout.** On 5 or 6 qubits the hybrid readout used to fall back to single-qubit ⟨Z⟩ only, dropping the correlations; on the site's validation windows a fifth qubit cut recall from about 83% to 78%. It now keeps the site's pattern on any register (singles, neighbouring pairs, full parity; exactly the site's 7 on 4 qubits), and 5–6 qubits recover to 80–89%.
- **Training stays responsive with bigger circuits:** the 4096-window scene is re-scored at most four times a second while training (about 25 ms per refresh at 4 qubits, 120 ms at 6 × 6), and fully on pause.
- **Switching a feature on or off** now starts a fresh circuit (retrained in the guided view), recomputes the baseline on the same active features and clears an old search; before, it kept weights trained with the other inputs and compared against a baseline that still used all 8.
- **Deep or wide circuits keep their spacing.** Each layer keeps a minimum width; a circuit that no longer fits between the columns scrolls sideways in its own box, which holds the qubit control and layer labels too. The default 4 × 4 layout is unchanged.
- **Circuit size is a details-view setting.** The guided view hides the qubit and layer buttons and always uses the site's 4 × 4 circuit.
- **The school-bus CAPTCHA is removed** to focus on Where's Wanda. The Data column now picks among the site's five worlds; the Grover simulator is the Wanda site's copy of `quantum.js`; the bus model, art and parity tests are gone (the bus demo in `bus-search-lab/` is unchanged). Old `scene=bus` and `scene=crowd` links open Where's Wanda.
- Also fixed: the training-example thumbnails were cropped with the wrong offset and showed empty space.

`npm test`: 29 pass. `npm run smoke`: all checks pass.

## Verification

- **Unit tests:** `npm test` (28 tests since iteration 14; see also [tests/qnn.test.mjs](tests/qnn.test.mjs) and [tests/scan.test.mjs](tests/scan.test.mjs)). The original 8 in [tests/quantum.test.mjs](tests/quantum.test.mjs):
  - gate values and controlled gates
  - normalization for every entangler
  - adjoint *and* parameter-shift gradients vs finite differences, for every entangler, with and without re-uploading
  - shot sampling is unbiased with binomial spread
  - Bloch length 1 for product states, 0 for a Bell pair
  - mutual information 0 for a product state, 2 for a Bell pair, 1 for each GHZ pair
  - complex Hermitian eigenvalues
  - measure-all sampling matches the Born probabilities
- **In-browser checks:** `npm run smoke` (added in iteration 4) serves `dist/`, drives headless Chrome over the DevTools protocol, and checks:
  - no page errors
  - Bloch, amplitude and arc element counts
  - loss falls during training
  - longest frame stays under 250 ms (default) and 400 ms (6×6, 100 shots)
  - unreachable qubits are faded with no entangler

  All 24 checks pass. Earlier manual runs also checked:
  - Training works: the default circle run reached loss about 0.07 after about 330 epochs in 8 s. A 4×3 CRY circuit learned the spiral (test loss 0.083). A 6×3 CRY circuit learned XOR.
  - Switching shots mid-run, the probe drag, gate-box hover and URL-hash settings all work.
- **Speed:**
  - About 40 epochs/s at 4 qubits × 2 layers in exact mode.
  - About 20 epochs/s at 100 shots, since parameter-shift needs about 2 circuit runs per parameter.
  - About 9 epochs/s at 6 qubits × 3 layers with CRY.
  - At the 6 × 6 maximum the page stays responsive (frames ≤ 50 ms) since iteration 4. Training is slow there (about 1 epoch per 1.5 s at 100 shots), because parameter shift needs about 2 circuit runs per parameter, as it would on hardware.
  - A full 100×100 heatmap takes about 9 ms at `[4,2]` and about 1 s at 8 qubits × 6 layers. That is why the width is capped at 6 qubits.

## Known gaps and next steps

- Narrow and mobile layouts are unchecked, apart from the probe now accepting touch.
- 6 qubits × 6 layers is responsive but crowded, and slow to train.
- Re-uploading links to later layers are drawn faintly and cross the wires, which looks busy.
- The weights callout can overlap the feature links.
- Under shots, the per-node heatmaps assume each node is measured in its own circuit run. That is how you would do it on hardware, but it is not stated in the UI.
- Everything is classically simulated. Possible next steps:
  - A Web Worker for training and heatmaps (time-slicing covers responsiveness for now).
  - Export to OpenQASM/Qiskit, to run on hardware via the repo's Qiskit companion in `bus-search-lab/qollab`.
  - A depolarizing-noise option.
  - Textbook gate labels, the option not chosen in iteration 3.
  - A tutorial for the classroom demos (exact vs shots; what removing the entangler does).
- Integration: `src/quantum/circuit.js` uses the same qubit ordering as `bus-search-lab/dist/qnn.js` and could be shared.

## Rejected alternatives, briefly

- **Rebuilding the TF UI by hand.** The prior QNN playgrounds that did this drift from the original. Forking guarantees fidelity.
- **Per-layer qubit counts.** A circuit keeps one register, so the qubit "+ / −" changes all layers at once.
- **A classical output neuron.** It trained well, but it made the model a hybrid with a classical neuron doing much of the work (iteration 1).
- **Bloch spheres only on hover.** Not visible enough (iteration 2). They're now always on, tied to the probe.
- **Exact gradients with shots.** The adjoint method reads the statevector, which hardware can't do. With shots, training uses parameter shift so the demo stays honest.
