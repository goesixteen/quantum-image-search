# Quantum CAPTCHA

Hide a bus in an image challenge. A trained four-qubit variational classifier recognizes image patches; Grover's algorithm amplifies the model's marked regions and samples a candidate location. The site centers on the interactive CAPTCHA, with the math and evaluation available afterward.

This is the first of two requested deliverables. The second, [Find the Explorer / Search Atlas](../waldo-search-lab/README.md), uses an original crowd-search scene and its own trained detector. Both websites have been built, tested, and deployed so the user can compare their narratives and interactions.

Open the owner-private [Quantum CAPTCHA](https://bus-search-quantum-lab.syrupyspool2.chatgpt.site) and [Search Atlas](https://quantum-crowd-search.syrupyspool2.chatgpt.site) sites. The new local [two-demo comparison](dist/compare.html) and shared constructed-oracle lesson distinguish accepted-set confidence from true-target probability. The final private update awaits its external receipt in root QA. Public Qollab/video materials remain withheld.

**Current instruction: keep iterating; do not submit any work.** Qollab uploads, public source/video publication, and contest submission are withheld. SDK experiments and project/video drafts stay local unless the user later explicitly authorizes external actions. Existing review sites remain private.

## Run the website

No package installation or build is required. From this folder:

```powershell
node serve.mjs
```

Open http://127.0.0.1:4173 . Use an HTTP server; directly opening index.html as a file cannot load the module/model assets reliably.

1. Choose the street photograph or illustrated challenge.
2. Drag the bus into the scene, or click a location. Arrow keys also move it.
3. Press **Solve CAPTCHA**.
4. Inspect the selected region, scores, probability bars, and amplification curve.
5. Change the threshold or Grover rounds to explore false positives and overshoot. Remove the bus to test empty-scene behavior.

Uploads stay in the browser. The included street mode is a photo-composite demonstration, not a benchmark on arbitrary uploaded photographs or unseen buses.

## What is trained and what is simulated

Eight engineered pixel features enter a four-qubit angle-encoded circuit. Four layers of learned RY/RZ rotations and the CNOT ring `0→1→2→3→0` produce seven Z-product expectations. A learned classical sigmoid readout produces a score. The model has **40 nominal fitted slots**: 32 angles, seven readout weights and a bias. Four final RZ slots (25, 27, 29, 31) cannot change these probability-based readouts; **36 remaining slots influence predictions**, without an independence or function-dimension claim. See the read-only [parameter audit](../waldo-search-lab/model/hybrid-parameter-audit.json).

Each image region is evaluated classically with a statevector simulator. Scores are thresholded to compile a phase oracle. The Grover register starts in uniform superposition, then repeats the phase oracle and diffusion. The final region is sampled using Born probabilities. Placement coordinates are used only for rendering and post-measurement ground-truth evaluation, never classifier inference or oracle construction.

This measures a learned predicate and conditioned amplitude amplification. It does not claim a coherent QNN threshold oracle, faster end-to-end vision, or generic people identification. Read [the research notebook](docs/RESEARCH.md) and [simulator explanation](docs/SIMULATOR.md).

## Evidence and reproducibility

The illustrated-domain model has 96.95% held-out accuracy over 2,000 synthetic patches; the same-feature logistic baseline has 95.10%. The dense 4,096-placement audit marks a bus-overlapping region in 97.49% of placements, with misses retained. Patch accuracy, scene hit rate, and sampled localization success are distinct quantities.

The separate street-photo model has **98.45% accuracy** and **98.60% recall** on 2,000 held-out composite patches. The scene audit records 384/384 predicate hits on 4 × 4 and 383/384 on 8 × 8, with no false tile marks and no empty-scene marks. It specializes to one supplied bus cutout and one street photograph; background identity and some negative rasters are shared across splits. See the [photo model card](model/PHOTO_MODEL.md). The browser draws the exact training-normalized street PNG, which resolved observed downsampling false positives.

Matched logistic baselines now reach **99.25%** photo accuracy versus QNN **98.45%**, and **99.67%** crowd accuracy versus QNN **99.0%**; see [PHOTO_BASELINE.md](docs/PHOTO_BASELINE.md) and the [crowd baseline](../waldo-search-lab/docs/BASELINE.md). Independent-photograph testing exposes persistent background false positives and an all-zero feature vector for a dusk bus thumbnail. The optional Emeryville stress preset makes this failure visible with unchanged weights. [UNSEEN_EVALUATION.md](docs/UNSEEN_EVALUATION.md) separates those diagnostics from same-asset patch accuracy; the experimental negative-mix candidate was not promoted.

Iteration 03's separate **photo-relative-v3** experiment preserves more dim/orange evidence but fails usable scene coverage. It was frozen before fresh a/b photos were disclosed; both candidates have zero fresh empty false marks but only **61/512 QNN /3/512 logistic** complete target scenes, and both independent known-ROI bus probes are rejected. Neither candidate was promoted. Read [PHOTO_V3.md](docs/PHOTO_V3.md) and [asset/protocol provenance](docs/ITERATION_03_ASSETS.md). The c-labelled reserve pair remains steward-only until a later experiment freeze.

```powershell
node --test tests/*.test.mjs
node model/parity-test.mjs
python model/train.py --steps 1800 --layers 4 --restarts 3
python model/verify.py
python model/classical_baseline.py
```

See `model/train.py --help` before retraining; retraining intentionally replaces model artifacts. Requirements are in `model/requirements.txt`. Training only needs NumPy and Pillow. The optional independent framework check uses PennyLane 0.45.1:

```powershell
python model/pennylane_verify.py
```

There are **20 Node checks** for Grover mathematics, sampling, features, learned-oracle inference, independent alpha evaluation and three constructed-lesson golden cases. Independent PennyLane results match the custom QNN/Grover simulations within 3e-16. The coherent appendix has six checks and amplifies a raw circuit bit event, distinct from the main trained sigmoid. The shared [constructed lesson](docs/ORACLE_LESSON.md) and local quiz are teaching cases, not detector predictions or a measured learning-effect study.

## Locally verified Qiskit companion

The Qollab × IonQ event requires a runnable Qiskit project, MIT code, a project explanation, and a public 2–3 minute video. A frontend alone is insufficient.

The local `qollab/` package contains the exact top-level files a future authorized platform run would need. Its typed `main()` uses Qollab's injected backend and makes one backend job per run. It is locally tested with Qiskit 2.5.2 and supplied-backend emulation. **Live platform uploads/execution and publication are withheld under the current instruction.** See [QOLLAB.md](docs/QOLLAB.md) and [RUBRIC.md](docs/RUBRIC.md).

## Continue the hourly work

Read [PROJECT_STATE.md](docs/PROJECT_STATE.md) first, then [RUN_LOG.md](docs/RUN_LOG.md). Preserve both private Site identities. Next is **v4 local representation/ranking and foreground variation**, with matched models and scene-constrained validation. Keep c assets reserved until feature/model/threshold/renderer/protocol freeze; inspected a/b assets are diagnostic. The expanded crowd audit and comparison page are complete at their declared scope. Keep drafts/SDK preparation local and external submissions withheld. Restart preview servers only when development requires them.

Code is MIT licensed. Third-party photographs retain the licenses recorded in [ASSETS.md](docs/ASSETS.md); the bus extraction prompt/provenance is in [IMAGE_EDIT.md](docs/IMAGE_EDIT.md).
