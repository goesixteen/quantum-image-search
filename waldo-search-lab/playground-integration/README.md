# Same-page QNN playground integration

The lower section mounts the team's current `qnn-playground` directly in the page, in an open Shadow DOM. It uses the same Wanda catalog, artwork, compositor, feature scan and frozen checkpoint, while its live-training experiment maintains its own scene and circuit settings.

Original `../qnn-playground` source is retained unchanged. The integration only adapts DOM isolation, local seeded randomness, URL state (`?qnn=` preserves navigation anchors), existing asset paths, responsive circuit width, icons and startup notification. It does not change the circuit, training objective, classifier threshold or Grover mathematics. All qubits are classically simulated.

Install the playground's listed dependencies, then run from this app folder:

```sh
node playground-integration/build.mjs
```

For a separate dependency installation, use `--deps-root /absolute/path/to/node_modules`. The build generates `dist/qnn-playground.js` and `dist/assets/qnn-playground/`. It needs the sibling `qnn-playground` folder, which is included in the private project export.

The playground starts when its section approaches the viewport. CSS and selectors stay inside its Shadow DOM, and seeded training randomness never replaces the game page's `Math.random`. Native controls use Material Design Lite's CSS without its global page-upgrade runtime. Small screens stack the data/circuit/output panels and preserve a horizontally scrollable circuit.

The compact toolbar keeps the play/reset/step controls separate from the training-round count and hides a redundant training caption. Guided cards use a bounded two-column grid on phones (one column below 360 px); the circuit remains in normal document flow. Readout, state and search SVGs carry responsive view boxes so every plotted value stays inside its panel without changing the values or chart coordinates.

The live generated-window score is an illustrative check. The original recipe splits individual rows while keeping ranking pairs, so pair information can overlap across training and test rows. It is not an independent reserved benchmark. The embedded labels and scorecard state this limitation; the frozen Wanda checkpoint and reserved evidence remain unchanged. The hybrid classical readout is not implemented as a coherent oracle in this playground; the coherent experiment uses the quantum-only readout.

Returning from details to the guided view restores the site's 4-qubit, 4-layer CNOT circuit, hybrid readout, every-layer data encoding, all input features and exact measurement settings, then retrains if needed. This prevents hidden advanced settings from contradicting the guided description. Oracle scaling is described as the ideal `√(N/M)` query count, conditional on efficient coherent predicate/input access. The playground first scans all windows and selects representative features classically, including for the coherent experiment, so it does not establish an end-to-end speedup.

License: the team's code is MIT; files adapted from the TensorFlow Playground remain Apache-2.0 (both texts in the bundled `LICENSE.txt`), with the upstream and team credits retained in the embedded Credits card and bundled `LICENSE.txt` / `NOTICE.txt`. Runtime dependency notices are retained in deterministic `THIRD_PARTY_LICENSES.txt` (D3, Material Design Lite CSS and seedrandom ARC4).
