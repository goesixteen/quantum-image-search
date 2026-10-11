# Wanda's separate learned location oracle

This experiment trained a new four-qubit variational classifier for the new Wanda PNG and five newly generated crowd scenes. Its frozen checkpoint completed 298 of 300 native-rendered reserved scene searches, including every one of the 60 searches at the demo's 52-pixel height. The earlier OpenMoji checkpoint and its results are preserved separately; none of those earlier results describes Wanda.

| Reserved same-art evaluation | Trained QNN | Same-feature logistic |
|---|---:|---:|
| Complete scene searches | 298/300 (99.33%) | 299/300 (99.67%) |
| Scenes with an incorrect accepted point | 1/300 | 0/300 |
| Target scenes returning no point | 1/300 | 1/300 |
| Empty scenes with a detection | 0/25 | 0/25 |
| Complete searches at 52-pixel height | 60/60 | 60/60 |
| Window precision, 7,300 test windows | 99.83% | 99.33% |
| Window recall | 97.33% | 98.17% |

Both models completed all 200 validation target scenes and produced zero detections in 25 validation absence scenes. The predeclared four-checkpoint search selected initialization seed 2026101105 at step 1,000. The frozen QNN threshold is 0.9056472752971427, with a 0.0259327 margin to decision-changing validation critical scores. Five native 52-pixel defaults at requested center `(276,348)` and five matching absence cases pass. These are known-scene regressions, separate from the reserved random-center test. The same fixed backgrounds recur across splits, including absence scans; empty-scene results are not generalization to unseen background identities.

The two QNN failures are retained verbatim in `model/wanda-qnn/held-out-test-results.json`. Market `test-22`, 64 pixels tall, returns `(324,116)` for target center `(319.5,111)`: its 6.7268-pixel error is just beyond the predeclared 6.657-pixel tolerance. That tolerance was not changed. Fairground `test-204`, 40 pixels tall at `(16,423)`, returns no point. No parameter, threshold or grading change followed either result.

The frozen model has SHA-256 `d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88`. One descriptive `trainingDomain` field accidentally inherited the old OpenMoji experiment's text because a Unicode dash prevented the intended string replacement. Its exact incorrect value, correct Wanda scope, actual asset/data hashes and lack of inference effect are documented in `model/wanda-qnn/metadata-erratum.json`; a served copy is `dist/model/wanda-qnn-metadata-erratum.json`. Frozen checkpoint/trainer bytes remain unchanged. The final metrics file uses the corrected scope and links the erratum. The model name, feature contract, actual training corpus, weights and results belong to Wanda; the old description is not evidence that old data were used.

The inference function accepts the final opaque scene RGB, a candidate window center, the supplied target width/height, and saved learned weights. It never receives target template pixels, a clean background, alpha masks, the true target center or a target-present flag. Classical feature extraction deliberately uses artwork-informed color, stripe and shape priors. The learned variational circuit supplies every acceptance score, followed by a saved threshold and nonmaximum suppression; there is no template fallback or forced argmax acceptance.

`dist/wanda-localizer.js` exports `extractWindowFeatures(imageData,cx,cy,{targetWidth,targetHeight})`, `FEATURE_VERSION`, `FEATURE_NAMES`, `FEATURE_PRIORS`, and async `scanQNN(imageData,model,options)`. The feature version is `wanda-window-v1`. The scanner evaluates all 4,096 centers `(4+8*column,4+8*row)`, then aggregates maximum learned scores into the requested Grover grid. It returns scores, candidates with their actual best point, marks, optional full-lattice scores, geometry and diagnostics. A selected image region's features can be recomputed from the same scene pixels for the circuit lesson.

The eight inputs are sweater stripe Fourier magnitude, stripe agreement across left/right columns, red/white balance, warm face with surrounding brown hair, blue trouser shape, horizontal body alignment, vertical body alignment and supplied height. The calibrated sweater period is 0.0597 times target height. RGB palette centers are red `(215,21,30)`, off-white `(249,244,242)`, blue `(35,101,180)`, warm skin `(250,180,100)` and brown hair `(60,29,11)`. These are transparent classical design choices, not learned image representations or claims that a quantum computer reads raw images. The geometry samples 28 columns and 64 rows, using nearest floor coordinates within a padded known-size window. Its localized color centroids and head/body shape weights reduce contamination from neighboring crowd colors. Alignment uses a fixed six-pixel Gaussian scale, because grading concerns an actual point on an eight-pixel scan lattice.

The actual simulated circuit uses four qubits and four layers. Each layer applies `RY(pi*x[q])`, `RZ(pi*x[q+4])` to each qubit, learned `RY` and `RZ` rotations, then CNOTs `0→1`, `1→2`, `2→3`, `3→0`. Seven expectations, `Z0,Z1,Z2,Z3,Z0Z1,Z2Z3,Z0Z1Z2Z3`, feed a learned classical affine readout and sigmoid. The sigmoid value is a detector score; calibration as a real-world probability is not established. There are 32 exported quantum angle slots, seven readout coefficients and one bias: 40 exported slots. Four final-layer RZ angles do not affect these diagonal readouts and remain zero, so optimization updates 28 quantum slots plus eight classical slots, 36 slots total. This is a slot count, not a count of independent circuit dimensions. NumPy training differentiates the simulated amplitudes analytically, with the ordinary chain rule through sigmoid and the loss.

The predeclared first fit uses five known generated scene identities, one generated target identity and discrete target heights 40, 46, 52, 58 and 64 pixels. Training/validation/test target counts are 800/200/300 with separate seeds and disjoint center partitions. All targets are fully visible and inside the frame. At 52 pixels, the alpha>16 source trim produces a 15-pixel-wide figure. Source backgrounds are saved unchanged; normalized 512-pixel PNG derivatives are drawn one-to-one in training and the app. Native Canvas and browser Canvas still require a separate rendering check.

Source-group weighted binary cross entropy assigns total weights 0.5 to positives, 0.25 to nearby negatives/altered-art decoys and 0.25 to background negatives. A pairwise margin term uses the same positive/nearby-negative vectors from each training composite. The final training matrix has 11,467 rows: 1,600 positives and 9,867 negatives, with 9,600 ranking pairs. Training-only logistic scores mine hard known-background negatives across 2,868 train-role centers per scene/height. Each scene/height retains 64 highest-scoring and 128 additional random negatives. This overlaps known background pixels used in later evaluation and is reported openly. Four QNN checkpoints (two initialization seeds, steps 500 and 1,000) and four same-feature logistic L2 candidates use the same validation scene criterion. The matched logistic baseline uses exactly the same examples, weights and ranking pairs.

The quantum angles participate in the result: replacing trained angles by zeros while retaining the trained readout changes validation scores by a mean 0.08789 and maximum 0.98445, and drops recall from 97.25% to 2.25% at the frozen threshold. Replacing them by initial angles changes scores by mean 0.25497 and maximum 0.99792, giving 3% recall. A separate readout refitted on fixed initial quantum angles has validation balanced BCE 0.29924, versus 0.01435 for the trained circuit. Its half-threshold metrics are a control, not a scene-calibrated production comparator. These tests establish participation, not quantum advantage; the matched classical model performs slightly better in this narrow reserved evaluation.

Six localizer tests pass. Twelve source-art pixel fixtures independently recomputed in Python match JavaScript features to 3.11e-15, trained expectations to 4.84e-15 and scores to 5.55e-16. The analytic full-loss gradient matches finite differences to 2.15e-11. Seventeen actual composite rows in both training and test match the Python extractor to 5.00e-16. The independently owned `tests/wanda-trace-parity.test.mjs` also passes three tests on twelve pre-fit fixtures plus the first sixteen fixed-order reserved rows: 28 rows, 15 decoded RGB PNGs, and 4,508 physical gate/interpolation frames. Its numeric table is in `docs/QNN_TRACE.md` and referenced by `model/wanda-qnn/trace-verification-reference.json`. Circuit parity is distinct from whole-scene accuracy.

Threshold selection requires zero false detections in absence scenes and false points in no more than 1% of target validation scenes, then maximizes complete hits across every target scene. A complete hit means at least one correct point and no false points. Abstention remains a failure in that denominator. Thresholds lie inside decision intervals with a critical-score margin of at least 1e-12. Five 52-pixel default-scene regressions and five absence regressions run after selection. Only a model passing these gates and pixel/circuit parity may open the reserved test set. Frozen parameters and thresholds do not change after that test. Same-art held-out centers are not evidence of recognition on new target or background identities, photographs, arbitrary sizes or occlusion.

Reproduction requires Python with NumPy and Pillow, Node, and `@napi-rs/canvas` (tested native version 0.1.100). Set `QNN_CANVAS_MODULE` to the installed package directory when ordinary Node package resolution cannot find it. Run from the project directory, using an empty output directory:

```text
node --test tests/wanda-qnn.test.mjs
node model/wanda-qnn/parity.mjs --output work/replay-wanda
python model/wanda-qnn/verify.py --output work/replay-wanda
node model/wanda-qnn/build-corpus.mjs corpus --output work/replay-wanda
python model/wanda-qnn/train.py mining-teacher --output work/replay-wanda
node model/wanda-qnn/build-corpus.mjs mine-backgrounds --output work/replay-wanda
node model/wanda-qnn/build-corpus.mjs full-validation --output work/replay-wanda
python model/wanda-qnn/train.py fit --output work/replay-wanda
node model/wanda-qnn/build-corpus.mjs default-regression --output work/replay-wanda
node model/wanda-qnn/parity.mjs --output work/replay-wanda
python model/wanda-qnn/verify.py --output work/replay-wanda
python model/wanda-qnn/release.py prepare --output work/replay-wanda
node model/wanda-qnn/build-corpus.mjs default-regression --output work/replay-wanda
node model/wanda-qnn/parity.mjs --output work/replay-wanda
python model/wanda-qnn/verify.py --output work/replay-wanda
python model/wanda-qnn/release.py freeze --output work/replay-wanda
```

The initial parity pass uses a fixed diagnostic circuit because no trained model exists yet. After fitting, parity uses the actual trained checkpoint. `prepare` changes readiness metadata only; the following regression/parity checks record the final model bytes before `freeze`. The generator records hashes of the feature code, protocol, source target and each original/normalized background in every dataset manifest. The trainer verifies those hashes before using the vectors. Complete validation rendering finishes before fitting/selection in this sequential replay, so no concurrent-render recovery is needed.

Only after the default/parity gates pass and the selected checkpoint, threshold and source contracts are frozen, run the reserved evaluation:

```text
node model/wanda-qnn/build-corpus.mjs test-corpus --output work/replay-wanda
node model/wanda-qnn/build-corpus.mjs full-test --output work/replay-wanda
python model/wanda-qnn/train.py test --output work/replay-wanda
python model/wanda-qnn/release.py report --output work/replay-wanda
python model/wanda-qnn/apply-metadata-erratum.py --output work/replay-wanda
```

The portable generator/trainer/protocol live in `model/wanda-qnn/`; the Python pixel feature contract is `model/wanda_features.py`. The model package includes compact window vectors/labels, dataset manifests, checkpoint comparison and complete threshold frontiers, default/parity reports, all scene results, ablations, erratum and fixed pixel fixtures. The 58.98 MB validation-field and 85.20 MB test-field binaries remain scratch artifacts and can be regenerated with the full-field commands. Their exact hashes are retained in the scene manifests. Final release weights and compact metrics are `dist/model/wanda-qnn.json` and `dist/model/wanda-qnn-metrics.json`, with reserved window and complete-scene results kept distinct. Generated art provenance is maintained alongside `assets/wanda/`.

For read-only frozen-model verification without training or rewriting evidence, run `python model/wanda-qnn/verify-frozen.py` and the localizer/trace test files. For exact future evidence reuse, compare `usable-candidate-freeze.json`, `release-evidence-manifest.json`, the model hash and the explicit metadata erratum. Training ended before the concurrent validation renderer; selection was resumed from the four exact saved checkpoints, with no repeat fit. `selection-recovery.json` and the emitted training history record that execution recovery.

## Iteration 10 cross-backend audit

The separate `model/wanda-browser-audit/` package compares actual Chromium raw scene exports with native composites at fifteen declared default-center target probes and five absences. Chromium completes15/15 targets and rejects5/5 absences; native completes13/15 targets and rejects5/5 absences. Every paired image differs; accepted sets agree18/20. The two native abstentions become correct browser hits. This diagnostic shows renderer sensitivity, not circuit disagreement on identical pixels. Native reserved298/300 is not a browser accuracy estimate. Frozen weights, threshold and original reserved protocol/results remain unchanged.
