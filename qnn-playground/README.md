# QNN Playground: quantum image search

The project's quantum image search, laid out like the [TensorFlow Neural Network Playground](https://playground.tensorflow.org).

1. **Regions:** a Where's Wanda scene is cut into Grover addresses.
2. **Classifier:** a 4-qubit quantum neural network scores every Wanda-sized window; each address keeps its best.
3. **Oracle:** the regions it accepts, after the site's suppression of nearby duplicates, become a Grover oracle.
4. **Search:** amplitude amplification boosts those regions, and a measurement picks one.

Train the classifier live, or load the exact weights and threshold the Where's Wanda site uses.

It sits next to the Where's Wanda site in [`waldo-search-lab/`](../waldo-search-lab) and has no pipeline of its own: everything below the user interface is imported from, or tested against, that site. (An earlier version also had the school-bus CAPTCHA of `bus-search-lab/`; it was removed to focus on Where's Wanda. The bus demo itself is unchanged.)

For the history of this folder (what was tried, rejected, measured and verified), see [DEVLOG.md](DEVLOG.md).

## Two views

- **Guided (default).** A 4-step path (pick a world → score every square → mark the likely squares → search), written in plain language. There is no pretrained shortcut: on arrival, and after any change to the circuit, it trains from scratch while you watch. The run is 120 rounds paced over about 4 s, with a progress bar and the windows being learned from right now (cut from the five worlds, labelled ✓ Wanda / ✗ not, with the circuit's current score), and then stops by itself. The search animates every Grover round on the picture (the chance drains from the other squares onto the marked ones) before measuring, and the result states where the quantum advantage lies: about √N checks instead of N when the check runs on a quantum computer, not achieved here because every square is scored first. Advanced controls and panels are hidden, including the qubit and layer buttons: the guided view always uses the site's 4-qubit, 4-layer circuit, and returns to it when you leave the details view.
- **All details** (the "Show all details" button, or `mode=explorer` in the URL). Every control and quantum view: qubits (4–6) and layers (1–6), entangler, shots, readout, Bloch spheres, correlation arcs, the readout and statevector panels, and the Grover rounds.

The guided view was shaped by AI-simulated beginner reviews (DEVLOG iteration 9). Those are not user research, and it has not been tested with real newcomers yet.

## The same pipeline as the Where's Wanda site

The playground reuses the site's own parts (`waldo-search-lab`), so it can't drift from it. The circuit: 8 features → `RY(π f_q) RZ(π f_{q+4})` on qubit q, re-uploaded every layer; trainable RY/RZ; CNOT ring `0→1→2→3→0`; 4 layers; all qubits measured; 7 Z-string averages → classical sigmoid.

| Part | From the site |
|---|---|
| Artwork | the five built-in worlds and `wanda.png` listed in `dist/scene-catalog.json` (Park as the site shows it, with its curated lookalike) |
| Scene rendering | the site's own compositor, `dist/scene-editor.js`, with its canvas settings, so the pixels match byte for byte |
| Features | `extractWindowFeatures` (`dist/wanda-localizer.js`) of Wanda-sized windows, including her supplied height (40–64 px; 52 by default) |
| Regions | 4096 window centres every 8 px; each Grover address keeps its best window. Addresses 4 × 4 … 64 × 64 (default 64 × 64 = 12 qubits, as the site) |
| Marks | score ≥ threshold, then the site's non-maximum suppression (radius max(12, 0.35 × width)) |
| Ground truth (after measuring) | the address's best window within the site's 6.66 px point tolerance of Wanda's centre |
| Default target, threshold | (420, 300) on Festival; the frozen 0.9056 |
| Trained weights | `dist/model/wanda-qnn.json` |
| Training recipe (live) | `model/wanda-qnn/build-corpus.mjs` and `protocol.json`: targets on and near the scan lattice, nearby windows 8–32 px away, recoloured decoys, harder background windows; cross-entropy weighted 0.5 / 0.25 / 0.25 plus the pairwise margin term |
| Grover search | `dist/quantum.js` |

The site's assets, catalog and weights are copied into `dist/project/` at build time.

Tests check the alignment (`tests/`):
- **Observables:** the playground's circuit reproduces the site's `quantumReadout()` to 1e-12.
- **Scores:** with the site's weights, its scores match its `predict()` to about 1e-15.
- **The Wanda scan:** on one of the site's own 512 × 512 corpus composites, the playground's scan (its circuit, then `src/scan.ts`) gives `scanQNN()`'s address scores (to 1e-12), best points and marks, on several grids and thresholds including ones where suppression removes marks; with the site's weights the marks hit Wanda by the site's point rule.
- **Training terms:** the pairwise term is the gradient of the protocol's softplus margin; the matched logistic baseline uses the same pairs.
- **Dead parameters:** the detector independently finds the same four prediction-insensitive slots (25, 27, 29, 31) that the Wanda model freezes at zero.

## Run it

Requires Node.js 22.6+ for the tests (they run TypeScript directly); 18+ for building. This folder sits next to `waldo-search-lab/` and needs it.

```sh
cd qnn-playground
npm install
npm run dev        # builds, watches, serves http://127.0.0.1:4175
npm test           # 29 unit tests: simulator, parity with the site (incl. its scan), coherent oracle, adapter
npm run typecheck  # TypeScript check
npm run smoke      # after a build: headless-Chrome end-to-end checks
```

## How TF Playground's picture maps onto image search

| TF Playground | Here |
|---|---|
| Dataset (circle, XOR, …) | **World**: one of the site's five Where's Wanda backgrounds (64×64 addresses; Wanda's height selectable), plus a strip of labelled training windows made in the browser |
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

Training uses the site's objective: binary cross-entropy plus the pairwise margin term over (target, nearby) window pairs. Accuracy is measured at the threshold, which starts at the site model's own.

## What it shows and what it doesn't

**The honest scorecard** (measured in the browser; details in DEVLOG iteration 10):
- **The quantum circuit is not better than a classical model here.** On the same examples, logistic regression on the same 8 features (the site's 9-parameter baseline, trained live and shown next to the accuracy) matches or beats it, as on the site, whose matched logistic model completed 299/300 reserved searches against the QNN's 298/300.
- **Accuracy is in-distribution.** Test examples come from the same generator, artwork and backgrounds as the training examples. By default Wanda stands at the site's default spot; **Random spot** puts the target anywhere.
- **The default Grover step adds nothing.** With the **list oracle** (the demos' design), every region is scored classically first. Once the marked list exists the answer is already known, so amplification can only add a chance of landing elsewhere. The page says so.
- **The coherent oracle** (explorer view, quantum-only readout) is the version that could matter. The classifier runs *inside* the search, on a superposition of all region indices: classifier, then phase flip where qubit 0 reads 0, then uncompute, then reflect. With a confident classifier it is exactly Grover (tested against the demos' simulator). With an unsure one it degrades. In one run on the since-retired crowd scene (DEVLOG iteration 10), a classifier that was 93% accurate with a threshold still said "target" for 47% of the start state, so the coherent search only lifted the true square from 6.3% to 8%.
- **A classical step remains.** The demos' readout is a classical sigmoid over 7 measured averages; the playground draws it as such.
- **Four of the demo circuit's 32 angles do nothing:** the last-layer RZ gates, as the demos' own audit says. They are flagged.
- **Everything is classically simulated.** Live training follows the site's recipe but is not its exact dataset: about 300 examples, not the Wanda site's 11,467 windows, and a random third-hardest background mining step instead of its logistic-teacher mining. The site's frozen evaluations (for example its 298/300 reserved scenes) are its own, not the playground's. The site's uploads, foreground depth bands and older OpenMoji-explorer model are not included.

## Status

The guided 120-round run reaches about 96–99% held-out window accuracy (headless-Chrome runs) and marks a handful of the 4096 addresses at the site's threshold. With the site's weights, the scores and marks match the site: Wanda's address (420, 300) is the only mark on Festival, Beach and Park, and a 4096-address search finds her. An end-to-end check of the site's own Play flow (drag Wanda to (420, 300), Find) gave the same image bytes, scores, mark and 50 Grover rounds as the playground. The browser checks also cover responsiveness (training Wanda re-scores 4096 windows per frame; longest frame under 100 ms), 6 layers × CRY × 100 shots, keyboard probing, gate editing, dead-gate fading and URL state. Old links to the retired bus and crowd scenes open Where's Wanda.

Open items:
- narrow screens are unchecked
- the street-photo scene isn't included
- uploading your own images isn't supported, though the demos allow it
- the coherent oracle on 64 × 64 Wanda addresses is slow (4096 classifier blocks per round); use a coarser grid

## Layout

```
index.html, styles.css     upstream page + CSS (edited; see NOTICE)
src/playground.ts          UI: scene, features, circuit drawing, training loop
src/state.ts               URL state (scene, grid, target, probe, threshold, background, height, …)
src/scenes.ts              the Where's Wanda scene: the site's rendering, features, training recipe and ground truth
src/scan.ts                the Wanda site's window scan without the circuit: lattice, best-per-address, NMS, point truth
src/search.ts              Grover search panel: list oracle (the demos' quantum.js) or coherent
                           (panels render as a row of cards under the circuit; see #panels)
src/quantum/coherent.js    coherent amplitude amplification (classifier inside the oracle)
src/qnn.ts                 engine adapter: the site's circuit as nodes/links, readout, shots, pairwise term
src/quantumViews.ts        Bloch spheres, correlation arcs, readout panel, statevector
src/quantum/circuit.js     statevector simulator, measurement, adjoint + parameter-shift gradients
src/quantum/ansatz.js      the demos' circuit (encoding, trainable rotations, ring, observables)
src/heatmap.ts, linechart.ts, dataset.ts   upstream, unchanged
tests/                     node --test suites (incl. parity with the demos)
scripts/build.mjs          esbuild build + copies the site's worlds, Wanda, catalog and model into dist/project/
scripts/smoke.mjs          headless-Chrome end-to-end test
serve.mjs                  static server for dist/ on :4175
```

## License

The team's code (the quantum engine, scenes, search, scripts and tests) is MIT. Files adapted from the [TensorFlow Neural Network Playground](https://github.com/tensorflow/playground) remain Apache-2.0 under Google's copyright and are marked as modified. [LICENSE](LICENSE) contains both texts, and [NOTICE](NOTICE) lists which file is which.
