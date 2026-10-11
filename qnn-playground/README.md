# QNN Playground: quantum image search

The project's quantum image search, laid out like the [TensorFlow Neural Network Playground](https://playground.tensorflow.org).

1. **Regions:** a scene (the school-bus CAPTCHA, or the striped explorer in a crowd) is cut into regions.
2. **Classifier:** a 4-qubit quantum neural network scores each region's patch.
3. **Oracle:** the regions it accepts become a Grover oracle.
4. **Search:** amplitude amplification boosts those regions, and a measurement picks one.

Train the classifier live, or load the exact weights the demo sites use.

For the history of this folder (what was tried, rejected, measured and verified), see [DEVLOG.md](DEVLOG.md).

## Two views

- **Guided (default).** A 4-step path (pick a picture → score every square → mark the likely squares → search), written in plain language. There is no pretrained shortcut: on arrival, and after any change to the circuit, it trains from scratch while you watch. The run is 120 rounds paced over about 4 s, with a progress bar, and then stops by itself. Advanced controls and panels are hidden.
- **All details** (the "Show all details" button, or `mode=explorer` in the URL). Every control and quantum view: entangler, shots, readout, Bloch spheres, correlation arcs, the readout and statevector panels, and the Grover rounds.

The guided view was shaped by AI-simulated beginner reviews (DEVLOG iteration 9). Those are not user research, and it has not been tested with real newcomers yet.

## The same pipeline as the demos

The playground reuses the bus and crowd demos' own parts, so it can't drift from them:

| Part | Source |
|---|---|
| Artwork | `bus-search-lab/dist/assets`, `waldo-search-lab/dist/assets` (original synthetic art), copied into `dist/project/` at build time |
| Pixel features | the demos' `extractFeatures`, imported directly from their `dist/qnn.js` |
| Circuit | the demos' circuit: 8 features → `RY(π f_q) RZ(π f_{q+4})` on qubit q, re-uploaded every layer; trainable RY/RZ; CNOT ring `0→1→2→3→0`; 4 layers; all qubits measured; 7 Z-string averages → classical sigmoid |
| Trained weights | the demos' `model.json`, via **Load demo weights** |
| Grover search | the demos' `bus-search-lab/dist/quantum.js` |

Tests check the alignment:
- **Observables:** the playground's circuit reproduces the demos' `quantumReadout()` to 1e-12.
- **Scores:** with the demos' weights, its scores match their `predict()` to about 1e-15, for both the bus and crowd models.
- **Dead parameters:** the detector independently finds the same four prediction-insensitive slots (25, 27, 29, 31) that the demos' parameter audit lists.

## Run it

Requires Node.js 18+. This folder sits next to `bus-search-lab/` and `waldo-search-lab/` and needs both.

```sh
cd qnn-playground
npm install
npm run dev        # builds, watches, serves http://127.0.0.1:4175
npm test           # 21 unit tests: simulator, parity with the demos, coherent oracle, adapter
npm run typecheck  # TypeScript check
npm run smoke      # after a build: headless-Chrome end-to-end checks
```

## How TF Playground's picture maps onto image search

| TF Playground | Here |
|---|---|
| Dataset (circle, XOR, …) | **Scene**: school-bus CAPTCHA (8×8 regions) or crowd explorer (4×4), plus a strip of labelled training patches made in the browser |
| Input features X₁, X₂, … | The demos' **8 pixel features**; each box maps the feature over the scene's regions. Click one to switch it off |
| Hidden layers | **Gate columns** on 4 qubit wires. Each box shows a qubit's ⟨Z⟩ for every region, with a Bloch sphere for the probe region below it |
| Weights | Fixed encoding lines (RY solid, RZ dashed) and the entangling ring (CNOT, trainable CRY, or none) |
| Output heatmap over the plane | **The scene**, with each region's score, the threshold's marks and the probe region. Click a region or use the arrow keys to probe it |
| (none) | **Grover search panel**: choose the oracle and rounds k, search, measure, then check ground truth after measurement. Two oracles are available (see below) |
| (none) | **Readout panel**: the 7 measured averages × weights → sigmoid → score (the hybrid model's classical step, shown explicitly) |

Top-bar settings:

| Setting | Options | Effect |
|---|---|---|
| Learning rate | | Step size for training |
| Entangler | CNOT ring (demos), CRY ring, none | The two-qubit gates after each layer |
| Measurement shots | ∞ / 1000 / 100 / 10 | ∞ means exact values and adjoint gradients. Finite shots mean sampled values and parameter-shift gradients, as on hardware |
| Data re-uploading | every layer (demos) / first layer only | Where the features are encoded |
| Readout | hybrid sigmoid (demos) / quantum-only ⟨Z₀⟩ | How the measurements become a score |

Training uses binary cross-entropy on the patches, as the demos do. Accuracy is measured at the scene threshold.

## What it shows and what it doesn't

**The honest scorecard** (measured in the browser; details in DEVLOG iteration 10):
- **The quantum circuit is not better than a classical model here.** On the same patches, logistic regression on the same 8 features (the demos' 9-parameter baseline, trained live and shown next to the accuracy) matches or beats it. In one crowd run, the entangled circuit scored 94%, an unentangled one 93% and logistic regression 100%. The explorer view's **Compare** button reruns this on the current data.
- **Accuracy is in-distribution.** Test patches come from the same generator and artwork as the training patches. By default the bus sits centred in a grid-aligned square at a fixed scale, the easiest search; **Random spot** puts the target anywhere, including across borders.
- **The default Grover step adds nothing.** With the **list oracle** (the demos' design), every region is scored classically first. Once the marked list exists the answer is already known, so amplification can only add a chance of landing elsewhere. The page says so.
- **The coherent oracle** (explorer view, quantum-only readout) is the version that could matter. The classifier runs *inside* the search, on a superposition of all region indices: classifier, then phase flip where qubit 0 reads 0, then uncompute, then reflect. With a confident classifier it is exactly Grover (tested against the demos' simulator). With an unsure one it degrades. In one crowd run, a classifier that was 93% accurate with a threshold still said "target" for 47% of the start state, so the coherent search only lifted the true square from 6.3% to 8%.
- **A classical step remains.** The demos' readout is a classical sigmoid over 7 measured averages; the playground draws it as such.
- **Four of the demo circuit's 32 angles do nothing:** the last-layer RZ gates, as the demos' own audit says. They are flagged.
- **Everything is classically simulated.** Training patches follow each demo's `train.py` recipe but are not its exact dataset. The street-photo domain is not included.

## Status

On the bus scene, training from scratch reaches about 95–97% test patch accuracy within about 100 rounds (under 2 s unpaced). The trained circuit marks the bus and not the yellow trucks, and Grover then finds it in a few rounds. With the demos' weights, the scores and marks match the sites: in both scenes the target's region is marked, and a search finds it. The browser checks also cover responsiveness at 6 layers × CRY × 100 shots, keyboard probing, gate editing, dead-gate fading and URL state.

Open items:
- narrow screens are unchecked
- the street-photo scene isn't included
- uploading your own images isn't supported, though the demos allow it

## Layout

```
index.html, styles.css     upstream page + CSS (edited; see NOTICE)
src/playground.ts          UI: scene, features, circuit drawing, training loop
src/state.ts               URL state (scene, grid, target, probe, threshold, …)
src/scenes.ts              the two scenes: rendering, training patches, region features
src/search.ts              Grover search panel: list oracle (the demos' quantum.js) or coherent
                           (panels render as a row of cards under the circuit; see #panels)
src/quantum/coherent.js    coherent amplitude amplification (classifier inside the oracle)
src/qnn.ts                 engine adapter: the demos' circuit as nodes/links, readout, shots
src/quantumViews.ts        Bloch spheres, correlation arcs, readout panel, statevector
src/quantum/circuit.js     statevector simulator, measurement, adjoint + parameter-shift gradients
src/quantum/ansatz.js      the demos' circuit (encoding, trainable rotations, ring, observables)
src/heatmap.ts, linechart.ts, dataset.ts   upstream, unchanged
tests/                     node --test suites (incl. parity with the demos)
scripts/build.mjs          esbuild build + copies the demos' assets and models into dist/project/
scripts/smoke.mjs          headless-Chrome end-to-end test
serve.mjs                  static server for dist/ on :4175
```
