# Independent photograph evaluation and isolated negative-mix experiment

October 10, 2026. The live photo checkpoint is unchanged. This audit tests a different street photograph and an independently photographed bus; it does not replace the earlier **98.45%** held-out patch accuracy, which concerned one supplied bus cutout on one supplied street identity.

## Frozen audit protocol

Source: [unseen_audit.py](../model/unseen_audit.py). Detailed scores and all 384 placements per grid: [unseen-audit.json](../model/unseen-audit.json). Asset roles, hashes, licenses, crop coordinates, and manual annotations are recorded in [provenance.json](../model/evaluation-assets/provenance.json).

The frozen `dist/model/model-photo.json` uses four qubits, four layers, the unchanged eight pixel-derived `yellow-hue-v2` features, and threshold **0.61**. Its SHA-256 is `a2466f8f29da4dccd7f2834c019d3fe291796cb204839e9f9a2e4c77265ae069`. No filename, object position, placement coordinates, alpha mask, or manual bounding box enters its predictor. Ground truth is used only after inference to evaluate the result.

The evaluation street is Payton Chung's [Bay Street, Emeryville photograph](https://commons.wikimedia.org/wiki/File:Main_Street_(1766449963).jpg), CC BY 2.0, photographed in 2007. Manual inspection found no visible bus. The 1929×1423 original was cropped at `(253,0)` to a 1423×1423 square and resized to an exact 512×512 RGB PNG using Pillow LANCZOS. Its normalized SHA-256 is `1ed94ab43560cf8287da67137b496897ad4148fea5d5fce7122834e1b6e21e47`.

The audit first scores the empty scene, then composites the existing SupportPDX bus cutout at 384 seeded positions for each grid. Placement seed is **918273**. The cutout is resized using the same geometric rule as the UI: width `round(cell_size × 0.82)`, natural aspect ratio, capped at 0.84 cell heights. The sprite raster is 105×44 for 4×4 and 52×22 for 8×8. Positions keep the entire sprite rectangle within the canvas but may cross grid boundaries. A 4×4 cell is 128×128 and is resized to 64×64 with Pillow LANCZOS; an 8×8 cell is already 64×64.

The primary current ground truth is **at least one target alpha >32 pixel in the tile**. Two older criteria are retained separately: any alpha >20 pixel, and sprite-rectangle overlap exceeding 10% of tile area. Alpha thresholds label ground truth only; the model sees composited RGB pixels. A “complete scene” requires at least one correctly marked target tile and no marks on any non-target tile. It does not require marking every tiny bus fragment. This definition prevents persistent background false positives from being hidden by a high any-overlap hit rate.

## Frozen model results on the independent street

| Pillow audit metric | 4×4 | 8×8 |
| --- | ---: | ---: |
| Empty-scene false marks | 5 of 16 | 11 of 64 |
| Any alpha >32 target tile hit | 375/384 (97.6563%) | 383/384 (99.7396%) |
| No false tile marks | 0/384 | 0/384 |
| Complete scene | **0/384** | **0/384** |
| Hit on target tile that was not already marked in empty scene | 306/384 (79.6875%) | 348/384 (90.6250%) |
| Former rectangle-overlap hit | 359/384 (93.4896%) | 364/384 (94.7917%) |

The alpha >20 and alpha >32 summaries coincide in this sample. The former rectangle criterion gives different hit counts; historical reports have not been rewritten. Empty-scene marked tile indices are `[1,9,10,13,15]` for 4×4 and `[2,9,17,26,37,43,45,54,57,58,62]` for 8×8. Inspect [4×4 scores](../model/unseen-empty-grid4.png) and [8×8 scores](../model/unseen-empty-grid8.png).

This is a meaningful domain failure. The bus often contributes a mark, but the classifier also recognizes façades, vehicles, signs, or other background structure as bus-like. Grover amplification follows the classifier's predicate, so it can amplify those errors. An empty scene can have a high predicate success probability and zero true-target probability.

The local browser uses Canvas resampling. Root's browser check of the same empty 512-pixel PNG produced four marks at 4×4, compared with five in this Pillow audit: 128→64 resampling is not pixel-identical across these implementations. Native 8×8 avoids patch downsampling, although bus sprite resampling can still differ for composited cases. Offline counts are explicitly scoped to the saved Pillow raster protocol, rather than asserted to be identical to browser counts.

Emeryville was held out from the original model and the new candidate's fitting, validation, and threshold selection. It has now been inspected and exposed as a diagnostic stress fixture. It is no longer a pristine blind benchmark for future development. Future feature/model choices need newly reserved photograph identities before claiming independent generalization.

## Independently photographed bus probe

Daniel Oines's [Blue Bird Vision side view](https://commons.wikimedia.org/wiki/File:Blue_Bird_Vision_sideview.jpg), CC BY 2.0, is a different photographer, vehicle, angle, and lighting condition. The untouched JPEG is 4288×2416. A loose manual evaluation box is `(50,650,4260,2200)`, right/bottom exclusive, including mirrors and wheels. The box is **not a segmentation mask** and contains background pixels; marks within it do not prove bus-pixel localization. Annotation evidence: [bbox overlay](../model/evaluation-assets/daniel-oines-bbox-proof.svg).

After center-cover normalization to 512×512, the frozen classifier marks `[8,12,13,14]` at 4×4 and `[26,27,40,41,48,50,52]` at 8×8. Each grid has some marks intersecting the coarse box and none definitively outside it. Coarse box tile mark coverage is 4/12 and 7/48 respectively; these are annotation-coverage diagnostics, not segmentation recall or CAPTCHA success rates.

A separate **known-ROI recognition probe** crops the supplied box, resizes it to 52×19, and letterboxes it on a 64×64 neutral patch. This is an opaque rectangular crop, not a new foreground segmentation. The frozen model score is **0.00629349**, below threshold. All eight extracted features are zero for this thumbnail. The current strict yellow-hue mask does not survive this photograph's orange/dusk appearance and small scale. This failure cannot be repaired by Grover amplification: the feature extractor discarded the useful image evidence before circuit inference.

## Candidate experiment and selection boundary

A separate candidate is trained on **Covington + Sauk Centre only**. Sauk Centre is McGhiever's [Original Main Street photograph](https://commons.wikimedia.org/wiki/File:Original_Main_Street_HD.jpg), CC BY-SA 4.0, normalized independently to 512×512. Its yellow traffic signs and crossing markers supply a different negative background. Emeryville and the Daniel Oines bus are never loaded by the training program.

The experiment preserves the existing feature extractor and architecture. It starts one run from the frozen photo checkpoint and one run from a seeded random initialization, each with 1,800 Adam steps. Training uses 3,200 balanced patches (seed 731091), validation 800 (731092), final placement-held-out test 2,000 (731293), and noisy/cropped stress test 1,200 (731294). These splits share the two background identities and the same single bus cutout; they test placements and augmentations, not unseen photo identities. As before, 35% of negative examples use exact empty CAPTCHA tiles. Minimum validation BCE selects weights, and validation F1 selects the threshold. The final test and stress sets are evaluated after selection.

The selected candidate is restart 0, step 500, validation BCE **0.21172083**, threshold **0.40**. Its separate checkpoint is [negative-mix-candidate.json](../model/negative-mix-candidate.json), SHA-256 `b68bf08476b3b3b3116069b9f2d9b744c0b2b59179e17613ea8ef94c13a5dbca`, with `readyForDemo:false`. Training and full selection history: [negative-mix-metrics.json](../model/negative-mix-metrics.json). Production weights remain frozen.

The following comparison uses **the same new two-background examples** for both checkpoints. It does not compare the candidate's broader test set with the original one-background 98.45% result.

| Two-background split | Frozen checkpoint accuracy | Candidate accuracy | Frozen F1 | Candidate F1 |
| --- | ---: | ---: | ---: | ---: |
| Validation, 800 patches | 89.2500% | 91.6250% | 90.0000% | 91.8984% |
| Test, 2,000 patches | 88.0000% | 90.8500% | 89.0110% | 91.2649% |
| Stress, 1,200 patches | 85.6667% | 86.0000% | 87.1064% | 86.9565% |

Candidate test precision is **87.3059%** and recall **95.6000%**. The extra negative background improves ordinary mixed-domain accuracy, while stress F1 is slightly lower. The F1-selected threshold preserves high recall and still permits many background false marks, which is costly when all tiles form one CAPTCHA.

After freezing the candidate, the independently sourced Emeryville scene was scored once with the unchanged audit. See [unseen-audit-candidate.json](../model/unseen-audit-candidate.json) and the [candidate 4×4](../model/unseen-candidate-empty-grid4.png) / [candidate 8×8](../model/unseen-candidate-empty-grid8.png) overlays.

| Emeryville Pillow audit metric | Frozen 4×4 | Candidate 4×4 | Frozen 8×8 | Candidate 8×8 |
| --- | ---: | ---: | ---: | ---: |
| Empty-scene false marks | 5 | 3 | 11 | 10 |
| Alpha >32 target hit, of 384 | 375 | 368 | 383 | 377 |
| Complete scenes, of 384 | **0** | **0** | **0** | **0** |
| New correct mark hit, of 384 | 306 | 342 | 348 | 348 |

The reduced empty false-mark count is not a successful CAPTCHA improvement: complete-scene correctness stays zero, and target hit counts fall. The independent bus ROI is again all-zero features, with candidate probability **0.00515265**. Its full-photo coarse-box mark coverage is 4/12 at 4×4 and 8/48 at 8×8; those marks still cannot establish bus segmentation. No threshold, feature rule, or second training run was selected using either evaluation asset.

A separate paired regression uses the same 384 seed-918273 placements **per background and grid** for both checkpoints. It applies the current alpha >32 rule and is saved in [negative-mix-regression.json](../model/negative-mix-regression.json); executable source: [compare_negative_mix.py](../model/compare_negative_mix.py).

| Training-domain scene | Empty marks, frozen → candidate | Complete scenes, frozen → candidate |
| --- | ---: | ---: |
| Covington 4×4 | 0 → 0 | 382/384 → 378/384 |
| Covington 8×8 | 0 → 0 | 384/384 → 384/384 |
| Sauk Centre 4×4 | 8 → 1 | 0/384 → 45/384 |
| Sauk Centre 8×8 | 23 → 16 | 0/384 → 0/384 |

This regression uses a new placement seed and the current alpha ground truth, so it supplements rather than silently replaces the earlier Covington audit. The candidate learns useful background distinctions but remains unreliable even on one background used for fitting. It is retained as a research artifact, **not promoted into the interactive demo**.

Browser/Python feature and prediction parity was checked on 12 candidate RGB fixtures: maximum feature error **0**, maximum probability difference **4.44×10⁻¹⁶**. This confirms circuit/feature implementation parity for identical input pixels; it does not assert Canvas and Pillow generate identical resized pixels.

## Reproduction

Requires Python, NumPy, and Pillow, with supplied assets already present. No GPU, hardware quantum backend, SciPy, network access, or downloads are required by these commands. Run from the project root `outputs/bus-search-lab`.

```powershell
python model/unseen_audit.py

python model/train_photo.py --bus dist/assets/real-schoolbus.png `
  --background dist/assets/street-captcha.png `
  --background model/training-assets/sauk-centre-street-512.png `
  --features hue --steps 1800 --restarts 2 `
  --init-model dist/model/model-photo.json `
  --output-prefix negative-mix --audit-alpha-threshold 32

python model/unseen_audit.py --model model/negative-mix-candidate.json `
  --output model/unseen-audit-candidate.json --image-prefix unseen-candidate

node model/parity-test.mjs model/negative-mix-candidate.json model/negative-mix-parity-fixtures.json

python model/compare_negative_mix.py
```

The audit asserts that checkpoint bytes remain unchanged. The training script writes only candidate-prefixed experiment artifacts when `--output-prefix negative-mix` is supplied; it never writes `dist/model/model-photo.json`. Re-running commands rewrites those experimental outputs and preserves the production checkpoint.

On this machine the bundled Python executable is `C:/Users/henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`; the plain `python` alias may invoke the Windows install prompt. The bundled Node executable is `C:/Users/henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`.

The next feature priority is a **brightness-aware photo extractor**. The independent bus ROI maps to the same all-zero feature vector as many empty patches. No extra circuit layer or additional background training can recover information already discarded by this preprocessing. A future v3 should examine illumination-normalized color and shape evidence on training/validation identities, preserve a versioned extractor, and pass identical-pixel Python/JavaScript parity before any candidate evaluation. No v3 feature implementation or new training is included in this run.

Only one independent street and one independent bus photograph are audited. Repeated placements do not turn those two source identities into hundreds of independent photographs. The next scientific improvement should reserve several new street and schoolbus identities, annotate target pixels more precisely where possible, and evaluate background/foreground identity splits before any model promotion. Selection should also include complete-scene validation or a declared false-mark budget: balanced patch F1 does not reflect the cost of one false positive among 64 CAPTCHA tiles. Broader color/shape features need to be developed and selected on training/validation identities, then tested on newly reserved assets rather than reusing these inspected photographs as a blind test.
