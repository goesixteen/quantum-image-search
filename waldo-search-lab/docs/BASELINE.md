# Matched stripe-finder classical baseline

A nine-parameter logistic classifier reaches **99.667% held-out patch
accuracy**, compared with **99.000%** for the frozen 40-parameter StripePatch
QNN. Both receive exactly the same eight pixel features and generated examples.
The measured comparison supports this controlled demo and provides no observed
QNN accuracy advantage.

| Evaluation | Examples | Logistic accuracy | QNN accuracy | Logistic TP / FP / FN / TN | QNN TP / FP / FN / TN |
| --- | ---: | ---: | ---: | --- | --- |
| Train | 1,600 | 100% | 99.875% | 800 / 0 / 0 / 800 | 800 / 2 / 0 / 798 |
| Validation | 400 | 100% | 100% | 200 / 0 / 0 / 200 | 200 / 0 / 0 / 200 |
| Held-out test | 600 | **99.667%** | 99.000% | 298 / 0 / 2 / 300 | 298 / 4 / 2 / 296 |

Test logistic precision is 100%, recall 99.333%, F1 99.666%, and AUROC 0.9999.
Its two false negatives and the QNN's four false positives/two false negatives
remain in [`model/baseline_metrics.json`](../model/baseline_metrics.json).

## Fixed experiment

[`model/classical_baseline.py`](../model/classical_baseline.py) imports the
trained experiment's actual `dataset` and `extract_features` functions. Counts
and seeds exactly match the QNN: 1,600 train examples at 202610103; 400 validation
at 202610104; 600 held-out test at 202610205. Every split uses the same generated
striped-explorer cutout and the same illustrated crowd; only sampled positions,
scales, raster augmentations, and negative decoys vary. Blue-striped and
solid-red decoys are included, as are red-clothed figures already in the crowd.

The eight features describe red coverage, stripe bands, white gaps, stripe
regularity, stripe coherence, blue below, stripe area, and stripe aspect. They
come from composited pixels. Position, alpha, target identity, and overlap
annotations are not model inputs. This detects a clothing pattern in a small
controlled asset domain; it is neither face recognition nor real-world people
search.

The baseline has eight logistic weights and one bias. Training-only means/stds
standardize features; a Newton solver with line search fits full-batch logistic
cross-entropy with an unpenalized bias. Validation BCE alone selects L2 from
six values `1e-6` through `1e-1`; the chosen value is `1e-6`. Validation F1 alone
selects a threshold on the QNN's ascending 0.15–0.85 grid. The first maximum is
**0.15**, the grid's lower bound; the QNN uses approximately **0.22**. Perfect
validation classification can allow several thresholds to tie. No held-out
test or scene audit chooses the threshold.

The QNN's 32 circuit angles, seven classical readout weights, and bias total
40 fitted parameters. Parameter counts **9 versus 40** do not match function
capacity, optimizer, or validation-search budget. No accuracy difference here
isolates a quantum cause or establishes a speed advantage.

## Paired scene check

Both models score the same 512×512 normalized crowd raster, full PNG cutout,
0.75-cell character height, 2:3 width/height ratio, and 128×128 feature patches.
The original seed 202610207 produces 20 free placements per grid, with the same
random stream continued from 4×4 to 8×8.

| Grid | Logistic scenes with a true mark | QNN scenes with a true mark | Scenes without false marks, both | Empty crowd false marks, both |
| --- | ---: | ---: | ---: | ---: |
| 4×4 | 20 / 20 | 20 / 20 | 20 / 20 | 0 |
| 8×8 | 20 / 20 | 19 / 20 | 20 / 20 | 0 |

The primary current UI annotation is any alpha >32 foreground pixel in a tile.
The historical trainer annotation requires at least 20% of the character's
bounding-box area in a tile; it is recorded separately. Both definitions yield
the same hit counts on these samples. Ground truth is evaluation-only. The
20-scene samples are small and use the same foreground/background identities;
they establish neither broad generalization nor sampled Grover success.
One genuine 8×8 QNN miss is preserved.

## Verification and reproduction

The script checks normalized crowd pixels against the trainer's original
Pillow-Lanczos normalization, checks asset hashes, and regenerates the QNN's
confusion matrices and BCE for all three splits. It also reproduces the original
QNN bounding-box scene audit before adding alpha annotations. SHA-256 hashes
of examples/labels, sources, model, and assets are saved. These aggregate
metric checks do not claim every regenerated probability is identical.

Independent finite differences verify the logistic gradient to 1.42e-11.
Absorbing normalization into raw coefficients changes held-out probabilities
by at most 1.80e-15. The fitted coefficients are portable to another pixel-only
scorer without access to placement data.

From `waldo-search-lab`, using Python with NumPy and Pillow:

```powershell
python model/classical_baseline.py
```

This writes the report; it changes no QNN checkpoints, feature definitions,
assets, or interactive UI files. The classifier comparison measures predicate
quality. Grover then amplifies whichever predicate is supplied; its oracle-query
bound does not establish faster end-to-end visual inference in this simulator.
