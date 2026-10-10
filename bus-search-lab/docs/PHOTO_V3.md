# Illumination-aware photo experiment: preserved evidence, failed usability gate

Iteration 03, October 10, 2026. **The v3 candidates are not promoted.** The existing `yellow-hue-v2` production model, threshold 0.61, and interactive demo remain unchanged. V3 preserves dim/orange image evidence better, but its classifiers cannot reliably separate buses from street structure at a useful whole-CAPTCHA operating point.

## What changed and why

The earlier independently photographed bus thumbnail yielded eight zero features. Circuit depth and Grover amplification cannot recover a visual distinction after preprocessing maps the bus to the same vector as an empty patch. V3 addresses that representation failure with a separate eight-dimensional extractor, `photo-relative-v3`, keeping the same circuit input size.

Sources: [Python extractor](../model/photo_features_v3.py), [JavaScript extractor](../model/photo_features_v3.mjs), [renderer](../model/photo_v3_data.py), and [matched trainer](../model/train_photo_v3.py). They reside under `model/`; no production browser module was replaced.

The warm-color predicate uses saturation and channel ratios rather than v2's bright absolute red/green floors: maximum channel >32, saturation ≥0.24, red ≥0.90×green, red >blue, green >blue, and `0.25 ≤ (green−blue)/(red−blue) ≤1.10`. This deliberately admits orange/yellow surfaces. A low intensity floor still rejects very dark chromatic noise. The dark threshold is **0.64×the median luminance of all warm pixels in the patch**, so windows/wheels are measured against the apparent warm-surface brightness rather than an absolute 105-luminance cutoff. Warm background pixels can influence that median; it is not a segmented bus-body estimate.

The eight outputs, clipped to [0,1], are warm-pixel coverage, warm bounding-box aspect, relative-dark window runs, relative-dark window fraction, window spacing regularity, relative-dark wheel runs, lower warm fill, and relative-dark lower fraction. The shape geometry is still engineered. A broad warm mask can merge a bus with façades or signs; the extractor is neither segmentation nor a learned vision backbone.

Python API: `extract_photo_features_v3(image) → eight floats`. JavaScript API: `extractPhotoFeaturesV3(imageData) → eight floats`. Both see RGB pixels only; alpha, target coordinates, source filenames, and manual boxes never enter the classifier. The existing four-qubit `predict(features, model)` implementation can consume v3 features; the corresponding checkpoint's feature version must be respected. The experimental logistic helper is `predictLogisticV3(features, model)`.

## Predeclared data and selection protocol

[photo-v3-protocol.json](../model/photo-v3-protocol.json) was saved **before fitting or fresh asset disclosure**. Fitting and selection use the existing SupportPDX bus cutout on **Covington and Sauk Centre only**. The inspected Emeryville/Oines photographs are excluded, as are all newly reserved photograph identities. The scene renderer and all source/model hashes were frozen at **09:14:56 UTC** before fresh locations were requested; see [photo-v3-freeze.json](../model/photo-v3-freeze.json).

| Patch split | Count | Seed | Role |
| --- | ---: | ---: | --- |
| Training | 4,800 | 2026101030 | Fit weights and logistic standardization |
| Validation | 1,200 | 2026101031 | Select checkpoint/regularization, then scene-constrained threshold |
| Test | 2,000 | 2026101232 | Evaluate final candidates after selection |
| Stress | 1,200 | 2026101233 | Evaluate final candidates under stronger perturbations |

Labels are balanced. Samples mix 512- and 256-pixel background rasters, fully visible and partially cropped bus cutouts, and exact empty CAPTCHA tile negatives (35% of negatives). Whole-patch gain is sampled from 0.60–1.25, gamma 0.85–1.20, and per-channel balance 0.90–1.10. Stress extends these ranges to 0.40–1.35, 0.75–1.30, and 0.85–1.15, plus RGB noise with sigma 2. These are controlled perturbations of **one foreground and two background identities**, not a broad photographic training set.

The QNN has four qubits, four layers, 32 circuit angles, seven readout weights, and one bias: **40 nominal fitted slots**. Each layer applies feature RY/RZ rotations, trainable RY/RZ on each wire, and a CNOT cycle `0→1→2→3→0`. Seven computational-basis observables feed a classical sigmoid. Four final RZ phases do not influence these readouts. Three seeded random starts run 2,200 Adam steps each; minimum validation patch BCE selects the checkpoint. Exact simulator derivative propagation trains the circuit, with the classical sigmoid/BCE chain rule applied afterward.

The matched logistic model has **nine fitted parameters** on the exact same eight features and examples. It uses training-only standardization, Newton optimization with line search, and six regularization candidates (10⁻⁶ through 10⁻¹); minimum validation BCE selects regularization. Equivalent raw-feature coefficients are exported. Different model capacities and optimizers prevent a causal quantum-advantage interpretation.

Both thresholds use the same declared scene rule, on **512 target validation scenes**: 128 placements ×2 backgrounds ×2 grids, seed 2026101080. **144 empty validation scenes** cover 36 declared gain/gamma/channel-balance variants ×2 backgrounds ×2 grids. The budget requires zero marked tiles across all empty scenes and at most 1% of target scenes with any false tile mark. Thresholds 0.100–0.995, step 0.005, are examined. Among feasible thresholds, selection maximizes complete-scene rate, then validation patch F1, then prefers a lower threshold. If none passes, the candidate is explicitly marked infeasible.

**Complete scene means at least one true accepted tile and zero false accepted tiles.** All 512 target scenes stay in the denominator; abstention is a failure. It does not require accepting every tiny foreground fragment. Ground truth is any inserted alpha >32 pixel in a tile, used only after RGB inference. High-threshold feasibility alone is not usefulness.

## Final matched candidate results

Full report and training history: [photo-v3-metrics.json](../model/photo-v3-metrics.json). Frozen checkpoints: [QNN](../model/photo-v3-qnn-candidate.json) and [logistic](../model/photo-v3-logistic-candidate.json), both `readyForDemo:false`.

| Measure | QNN candidate | Logistic candidate |
| --- | ---: | ---: |
| Scene-selected threshold | 0.95 | 0.94 |
| Empty false scenes, validation | 0/144 | 0/144 |
| Target scenes with a false mark | 2/512 | 4/512 |
| Complete target validation scenes | **76/512 (14.8438%)** | **4/512 (0.7813%)** |
| Nonempty foreground oracles | 78/512 (15.2344%) | 8/512 (1.5625%) |
| Empty foreground oracles | **434/512** | **504/512** |
| Complete scene conditional on nonempty oracle | 76/78 (97.4359%) | 4/8 (50%) |
| Test patch accuracy | 58.8% | 52.0% |
| Test patch precision | 100% | 97.6190% |
| Test patch recall | **17.6%** | **4.1%** |
| Test patch F1 | 29.9320% | 7.8695% |
| Test AUROC | 0.862403 | 0.851390 |

The high conditional precision is accompanied by very low coverage. A classifier that rarely emits a region is not a functional CAPTCHA solver. These thresholds and models remain unchanged after all evaluation results.

The declared validation suite was replayed read-only for exact quantum probability accounting in [photo-v3-gate-audit.json](../model/photo-v3-gate-audit.json), generated by [photo_v3_gate_audit.py](../model/photo_v3_gate_audit.py). Across all 512 target scenes, mean accepted-predicate probability after the browser's first-peak rule is **14.8931% QNN /1.5434% logistic**. Mean effective alpha-target probability is **14.5346% /0.7654%**, treating an empty oracle as no search output. If one instead mathematically samples the unmodified uniform zero-round state in empty-oracle cases, mean target mass becomes **21.6177% /8.9075%**; that is not the app's abstaining behavior. These are exact ideal-statevector probabilities, not sampled success or detector accuracy.

## Validation-only frontier and representation analysis

Root requested an analysis **before fresh evaluation**, without further fitting or model selection. Source: [analyze_photo_v3.py](../model/analyze_photo_v3.py); results: [photo-v3-analysis.json](../model/photo-v3-analysis.json). Regenerated train/validation feature and label hashes match the trainer exactly.

V3 produces **zero all-zero positive vectors among 2,400 training positives and 600 validation positives**. There are no exactly identical feature vectors with opposing labels across the combined 6,000 examples. Negative all-zero counts are 923/2,400 in training and 248/600 in validation. Among 600 validation positives, nearest training-negative feature distance has minimum 0.01638 and median 0.34512; none is within 0.01 in L2 distance. These finite-sample observations do not prove sufficient visual information, separability, or general recognition. In particular, absence of exact collisions is not an accuracy guarantee.

The threshold sweep separates patch quality from full-scene quality:

| Validation operating point | Threshold | Target hit | Complete scene | False-mark target scenes | False empty scenes |
| --- | ---: | ---: | ---: | ---: | ---: |
| QNN maximum patch F1 (79.3970%) | 0.360 | 499/512 | 4/512 | 508/512 | 142/144 |
| QNN maximum complete-scene count, no budget | 0.850 | 171/512 | **124/512 (24.2188%)** | 147/512 | 42/144 |
| QNN selected budget-feasible point | 0.950 | 76/512 | 76/512 | 2/512 | 0/144 |
| Logistic maximum patch F1 (79.5918%) | 0.225 | 508/512 | 5/512 | 507/512 | 144/144 |
| Logistic maximum complete-scene count, no budget | 0.850 | 173/512 | **118/512 (23.0469%)** | 187/512 | 63/144 |
| Logistic selected budget-feasible point | 0.940 | 4/512 | 4/512 | 4/512 | 0/144 |

The strict budget costs recall, but relaxing it still produces poor complete-scene performance: the best examined point is only 24.22% for QNN and 23.05% for logistic. This is **not solely a threshold-budget problem**, and it is no longer a demonstrated literal all-zero collapse on the training bus. The current feature/model combinations rank too much background structure like foreground; global warm-region geometry can discard localization/shape distinctions even when its vector is nonzero. No usable operating point was found under the declared search. The report does not establish an information-theoretic impossibility or rule out a stronger model on these features.

## Same-asset regression and inspected diagnostics

These later audits use fixed gain/gamma/balance (the actual normalized photographs), 128 seed-2026101130 placements per background/grid, and identical-pixel Pillow rendering. They are different from the illuminated validation suite; neither suite changes the selected candidates. Reports: [training-domain regression](../model/photo-v3-regression-audit.json) and [previously inspected diagnostics](../model/photo-v3-diagnostic-audit.json).

| Source/grid | QNN complete of 128 | Logistic complete of 128 |
| --- | ---: | ---: |
| Covington 4×4 | 19 | 1 |
| Covington 8×8 | 20 | 1 |
| Sauk Centre 4×4 | 19 | 1 |
| Sauk Centre 8×8 | 17 | 0 |
| Inspected Emeryville 4×4 | 14 | 5 |
| Inspected Emeryville 8×8 | 15 | 4 |

All listed empty scenes have zero marks for both v3 candidates. Zero false marks result largely from abstention: mean effective true-target probability after the ideal Grover first peak is only 10.54%/11.68% for QNN on Emeryville 4×4/8×8 and 3.76%/3.11% for logistic. The empty-oracle convention returns no search output; its effective success contribution is zero. Exact predicate mass, theoretical uniform zero-round mass, and this effective target mass remain separate in the reports.

Supplemental Covington default/boundary probes are also in `photo-v3-gate-audit.json`. Both models reject the rounded UI-like default center at 4×4 and 8×8. Both reject the vertical, horizontal, and four-way boundary probes. Across six fixed probes per grid, QNN finds **1/6 at 4×4 and 2/6 at 8×8**; logistic finds **0/6** on both. Empty default scenes remain unmarked. These probes are post-freeze training-domain diagnostics, not a new selection suite or actual browser-pixel verification. They confirm the promotion gate fails before considering any new source identity.

The inspected Daniel Oines bus known-ROI thumbnail now has nonzero v3 features. Scores rise to **0.506052 QNN /0.600574 logistic**, but both reject it at their frozen 0.95/0.94 thresholds. Its coarse bbox is not segmentation, and scores inside that box do not prove bus-pixel localization. The representation change retained evidence but did not produce a usable learned oracle. Emeryville/Oines remain inspected diagnostic fixtures, not fresh holdouts.

## Verification and illumination limits

Sixteen identical-pixel fixtures verify Python/JavaScript features and both model predictions: maximum feature difference **2.22×10⁻¹⁶**, QNN probability difference **4.44×10⁻¹⁶**, logistic difference **2.22×10⁻¹⁶**. See [parity verification](../model/photo-v3-parity-verification.json), [Node verifier](../model/verify_photo_v3.mjs), and [fixtures](../model/photo-v3-parity-fixtures.json).

The [Python verifier](../model/verify_photo_v3.py) passes three checks: frozen fixture feature regeneration, frozen QNN prediction regeneration, and exact uniform-gain feature invariance on a controlled non-clipped floating-RGB warm body/window/wheel shape safely above the intensity floor. Its maximum differences are zero. This is a deliberately limited mathematical check. Quantization, gamma, white balance, clipping, noise, and very dark pixels can change features.

A separate real-training-cutout probe applies gains 1.0, 0.8, 0.6, and 0.4. At gain 0.4, v2 returns eight zero features; v3 retains eight nonzero features. This demonstrates a concrete representation improvement on the seen foreground, not broad photographic illumination invariance. See [verification report](../model/photo-v3-verification.json). Logistic analytic-gradient/finite-difference and raw/standardized prediction checks are also saved in the trainer's metrics.

## Fresh-identity evaluation

The asset research agent withheld file paths, identities, pixels, and recognition results until receiving the exact **09:14:56 UTC** freeze manifest and verifying every frozen file hash. The initial a/b disclosure message occurred after this freeze and before the audit command at approximately **09:19 UTC**. Its exact message timestamp is unavailable; the later sanitized-record creation timestamp is separately labeled in provenance. Source files, checksums, manual boxes, licenses, and this ordering are in the sanitized [primary-release.json](../model/iteration03-evaluation-assets/primary-release.json) and [ITERATION_03_ASSETS.md](ITERATION_03_ASSETS.md). The c-labelled reserve pair remained unopened by the model agent and unscored.

The four primary source identities are:

- John Phelan's [South Lancaster street](https://commons.wikimedia.org/wiki/File:Main_Street,_South_Lancaster_MA.jpg), CC BY 3.0.
- Warren LeMay's [Buffalo street](https://commons.wikimedia.org/wiki/File:Main_Street,_Buffalo,_NY_-_52685131767.jpg), CC BY-SA 2.0.
- Ben Schumin's [Thomas Built MVP ER bus](https://commons.wikimedia.org/wiki/File:Left_side_of_Thomas_Built_MVP_ER_school_bus_(13182497535).jpg), CC BY-SA 2.0.
- Ariana Rose Taylor-Stanley's [Thomas WestcoastER bus](https://commons.wikimedia.org/wiki/File:TBBWestcoastER.jpg), CC BY 2.0.

Each street is a fixed normalized 512×512 RGB PNG. Buffalo's PNG retains ICC metadata, but the frozen Pillow protocol consumes numeric RGB without a color-profile transform. These counts therefore do not claim identical Canvas/browser pixels. The steward's manual street inspection found no visible schoolbus; this is not an exhaustive external annotation certification.

Fresh results: [photo-v3-fresh-audit.json](../model/photo-v3-fresh-audit.json). Each row has **128 controlled placements of the same training bus cutout**, seed 2026101130. No new street was fitted, validated, or used to change a threshold.

| Fresh street/grid | QNN complete of 128 | Logistic complete of 128 | QNN effective target mass | Logistic effective target mass |
| --- | ---: | ---: | ---: | ---: |
| South Lancaster 4×4 | 18 (14.0625%) | 1 (0.7813%) | 13.5424% | 0.7510% |
| South Lancaster 8×8 | 28 (21.8750%) | 1 (0.7813%) | 21.8012% | 0.7786% |
| Buffalo 4×4 | 7 (5.4688%) | 1 (0.7813%) | 5.2673% | 0.7510% |
| Buffalo 8×8 | 8 (6.2500%) | 0 | 6.2289% | 0% |

All four empty street/grid scenes have **zero marked tiles** for both models. Across 512 foreground scenes, QNN finds 61 complete scenes and has **451 empty oracles**; logistic finds 3 complete scenes and has **509 empty oracles**. No nonempty foreground oracle in this particular fresh placement sample has a false tile mark. Strong abstention explains both the clean result and the poor solve rate. The QNN emits a useful region more often than this matched linear model at their independently scene-selected thresholds; both fail practical usability. Capacity, optimization, and validation-selected operating points differ, so this is not a causal quantum-performance claim.

The two fresh bus sources are separately known-ROI recognition probes. Their loose original-pixel boxes are `(295,395,3760,1435)` for the MVP ER and `(0,470,2048,1055)` for the WestcoastER, right/bottom exclusive. Rectangular photographed backgrounds remain in those crops; no alpha segmentation or background removal was performed. Crops are resized to 52 pixels wide at natural aspect ratio (16 and 15 pixels high), then letterboxed to 64×64.

| Fresh bus ROI | QNN probability | Logistic probability | Accepted at frozen threshold? |
| --- | ---: | ---: | --- |
| Thomas Built MVP ER | 0.529949 | 0.779714 | Neither |
| Thomas WestcoastER | 0.809596 | 0.880356 | Neither |

Both ROIs have seven nonzero v3 features; neither is an all-zero collapse. They are still rejected by the final conservative models. Full-photo scores and coarse-box overlap diagnostics are saved separately in the audit; marks inside a loose rectangle are not proof of bus-pixel localization. Two fresh backgrounds and two fresh foreground photos do not establish population-level recognition, and repeated placements do not add independent photographic identities.

No fresh or inspected-diagnostic result changed the extractor, weights, thresholds, or model selection. Post-evaluation integrity verification confirms **all 21 frozen source/model/protocol/reference files remain byte-identical**: [photo-v3-post-evaluation-integrity.json](../model/photo-v3-post-evaluation-integrity.json).

## Reproduction and artifacts

Requires Python, NumPy, Pillow, and Node. No GPU, Torch, SciPy, quantum hardware, downloads, or external calls are required by the experiment. Run from `outputs/bus-search-lab`:

```powershell
python model/train_photo_v3.py
python model/analyze_photo_v3.py
python model/verify_photo_v3.py
node model/verify_photo_v3.mjs
python model/freeze_photo_v3.py
python model/photo_v3_gate_audit.py

python model/audit_photo_v3.py --street dist/assets/street-captcha.png `
  --street model/training-assets/sauk-centre-street-512.png `
  --role training-domain-regression --output model/photo-v3-regression-audit.json

python model/audit_photo_v3.py `
  --street model/iteration03-evaluation-assets/street-a-512.png `
  --street model/iteration03-evaluation-assets/street-b-512.png `
  --bus-photo model/iteration03-evaluation-assets/bus-a-source.jpg `
  --bus-bbox 295,395,3760,1435 `
  --bus-photo model/iteration03-evaluation-assets/bus-b-source.jpg `
  --bus-bbox 0,470,2048,1055 `
  --role fresh-held-out --output model/photo-v3-fresh-audit.json
```

The bundled Python is `C:/Users/henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`; Node is `C:/Users/henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`. The plain Windows `python` alias may invoke an installation prompt. The `work/quantum-venv` contains SciPy but no Torch; this experiment uses neither.

Fitting writes only the v3 candidate JSONs, metrics, test montages, and parity fixtures under `model/`. Analyses, freeze manifests, and audits also stay there. Re-running fitting rewrites those experimental artifacts and invalidates the historical freeze manifest; keep that distinction when reproducing an already evaluated candidate. Audits assert that candidate bytes are unchanged. **No production model or frontend file is written.**

The next substantive model step should improve local object/shape representation using reserved training identities—such as component/band geometry or a learned visual descriptor—then repeat matched comparisons and scene validation. Broader color acceptance alone does not solve recognition. New identities used in this run become inspected fixtures afterward, so a future redesign needs a new reserved test set. There is no submission, public publication, or source commit in this model work.
