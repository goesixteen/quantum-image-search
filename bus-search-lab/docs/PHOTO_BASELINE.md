# Matched photo-composite classical baseline

The nine-parameter logistic classifier has higher observed patch accuracy than
the frozen 40-parameter photo QNN on this controlled experiment. Both receive
the same eight pixel features and the same examples. The result supports an
honest educational comparison; it does not demonstrate a QNN accuracy or
runtime advantage.

| Evaluation | Examples | Logistic accuracy | QNN accuracy | Logistic TP / FP / FN / TN | QNN TP / FP / FN / TN |
| --- | ---: | ---: | ---: | --- | --- |
| Train | 3,200 | 98.969% | 98.656% | 1572 / 5 / 28 / 1595 | 1585 / 28 / 15 / 1572 |
| Validation | 800 | 99.625% | 99.000% | 398 / 1 / 2 / 399 | 398 / 6 / 2 / 394 |
| Held-out test | 2,000 | **99.250%** | 98.450% | 988 / 3 / 12 / 997 | 986 / 17 / 14 / 983 |
| Held-out stress | 1,200 | **97.083%** | 95.417% | 571 / 6 / 29 / 594 | 578 / 33 / 22 / 567 |

Test logistic precision is 99.697%, recall 98.800%, F1 99.247%, and AUROC
0.999806. Full metrics and frozen raw coefficients are in
[`model/photo_baseline_metrics.json`](../model/photo_baseline_metrics.json).

## Comparison protocol

[`model/classical_baseline_photo.py`](../model/classical_baseline_photo.py)
imports the actual `train_photo.photo_dataset`, `load_assets`, and
`photo_features.extract_photo_features` functions. It regenerates balanced
train/validation/test/stress partitions at seeds 731091, 731092, 731293, and
731294, with exactly the QNN's counts. Examples use the same transparent real
schoolbus cutout, the same street photograph, placement distributions, crop
rules, multiscale rasterization, and stress augmentation.

The eight inputs are yellow coverage, yellow aspect, window runs, window
darkness, window spacing, wheel runs, body fill, and lower darkness. Position,
insertion labels, target overlap, and alpha masks are absent from classifier
inputs. Labels supervise training and evaluate outputs.

Training-only means and standard deviations normalize the inputs. Full-batch
Newton optimization with line search fits an eight-weight sigmoid plus one
bias. L2 regularizes weights, leaving the bias unpenalized. Six L2 values from
`1e-6` to `1e-1` are compared using **validation BCE only**; the selected value
is `1e-5`. The ascending 0.15–0.85 threshold grid maximizes validation F1, with
the first maximum selected, matching the QNN's threshold convention. The
baseline threshold is approximately **0.82**; the frozen QNN threshold is
approximately **0.61**. Test, stress, and scene audits select no parameters.

Training normalization is absorbed algebraically into the saved raw weights
and bias. The maximum raw-versus-normalized probability difference is
1.17e-15; an independent finite-difference loss-gradient check has error
1.42e-11. Regenerated QNN confusion matrices and BCE match its stored split
evaluations. Feature/label arrays, source files, original assets, and the QNN
checkpoint have SHA-256 provenance in the report. Aggregate BCE/confusion
agreement is a reproducibility check, not a per-example prediction-identity
claim.

The QNN has 32 circuit angles, seven readout weights, and one bias. The logistic
model has eight weights and one bias. **9 versus 40 counts nominal fitted
parameters; it does not imply equal function capacity or equal tuning budgets.**
The QNN and logistic optimizer/checkpoint selection procedures differ.

## Paired CAPTCHA placements

The saved street raster is 512×512. For each grid, the audit uses 384 identical
new free placements at seed 731292, a bus width of 0.82 times the cell width,
the full cutout aspect ratio with the same height cap, and 64×64 feature patches.
Both classifiers score the same rendered pixels.

| Grid | Logistic scenes with a true mark | QNN scenes with a true mark | Scenes without false marks, both models | Empty street false marks, both |
| --- | ---: | ---: | ---: | ---: |
| 4×4 | 384 / 384 | 384 / 384 | 384 / 384 | 0 |
| 8×8 | 384 / 384 | 383 / 384 | 384 / 384 | 0 |

Primary UI truth is **any inserted foreground pixel with alpha >32 in a
region**. The old trainer's alpha >20 criterion is reported separately; both
give these same counts. Alpha is evaluated after predictions and never enters
the scorer. A scene with a true mark may still fail a sampled measurement, so
these are predicate audits, not Grover measurement success rates. The 8×8 QNN
miss at placement `[65,399]` is retained.

## Generalization boundary

All patch partitions and these placement audits reuse the same bus identity
and street photograph. They test new composites, crops, scales, and noise;
they do not estimate accuracy on a population of independent photographs.
The reserved independent Emeryville street is evaluated separately by
[`model/classical_baseline_photo_unseen.py`](../model/classical_baseline_photo_unseen.py)
with both models frozen before scoring. Its report records empty-scene false
marks, complete-scene rate, and ideal post-amplification target mass. Neither
the baseline threshold nor weights are adapted to that failure domain.

### Reserved Emeryville street results

The paired audit uses the exact saved 512×512 independently sourced Emeryville
photograph, the original seen cutout, 384 free placements per grid, and seed
918273. Both scorers call the same held-out renderer. Full scores, positions,
alpha annotations, and frozen hashes are preserved in
[`model/photo_baseline_unseen_audit.json`](../model/photo_baseline_unseen_audit.json).

| Grid/model | False marks on empty street | Scenes with a true mark | Clean scenes with a true mark | Mean ideal predicate mass | Mean actual target mass, empty oracle gives no output |
| --- | ---: | ---: | ---: | ---: | ---: |
| 4×4 logistic | 0 / 16 | 374 / 384 | 374 / 384 | 93.378% | **93.609%** |
| 4×4 QNN | 5 / 16 | 375 / 384 | 0 / 384 | 82.589% | **23.264%** |
| 8×8 logistic | 1 / 64 | 379 / 384 | 10 / 384 | 99.883% | **53.492%** |
| 8×8 QNN | 11 / 64 | 383 / 384 | 0 / 384 | 95.596% | **13.773%** |

A clean scene with a true mark means **at least one correct accepted region
and zero incorrect accepted regions**; it does not require accepting every
target-overlapping region. On 8×8 the logistic model's preexisting mark at tile
58 remains a real failure. Counting only correct marks that did not already
exist in the empty street gives logistic 374/384 for both grids, and QNN
306/384 and 348/384. High overlap hit rate alone can therefore be misleading.

These are **Pillow-rendered paired results**. The QNN's separately audited native
browser empty street produces four false marks at 4×4 and eleven at 8×8;
the 128→64 browser resampling differs from Pillow at 4×4. The matched logistic
audit does not claim browser verification on this independent street. Both
models were evaluated without fitting or threshold changes.

Ideal Grover probabilities use the app's exact first-peak iteration rule and
separate probability of an accepted predicate from probability of a genuinely
target-overlapping alpha region. For marked set S, true set T, `M=|S|`, and
`theta=asin(sqrt(M/N))`, the actual target probability after k rounds is:

```text
P(T) = |T∩S|/M · sin²((2k+1)theta)
     + |T\S|/(N−M) · cos²((2k+1)theta)
```

The empty/full marked-set edge cases have uniform distributions. Ten logistic
4×4 scenes have no marks: their theoretical zero-round uniform target mass is
reported separately, while the table treats them as no output, matching the
UI's empty-oracle behavior. These means are exact ideal measurement
probabilities across scenes, not empirical sampled outcomes.

[`model/amplification_audit.py`](../model/amplification_audit.py) implements
this decomposition. [`tests/amplification-parity.mjs`](../tests/amplification-parity.mjs)
compares it against the actual browser statevector across all 82 register/mark
count combinations for N=16 and64 and 48,874 possible truth intersections.
Iteration choices agree exactly; maximum target-mass difference is 3.56e-15.

The baseline performs better on this one unseen street but still contaminates
8×8 search. Neither classifier is established as a general photographic
schoolbus detector. The failures remain available for the next feature/model
experiment; they did not influence this baseline's frozen coefficients.

Grover amplifies accepted regions whether they are correct or incorrect.
The model here supplies a classically computed threshold predicate; compilation
requires scoring each patch. These metrics do not prove an end-to-end quantum
speedup, learned coherent threshold oracle, or photographic object detector.

## Reproduce

From `bus-search-lab`, using Python with NumPy and Pillow:

```powershell
python model/classical_baseline_photo.py
python model/classical_baseline_photo.py --audit-only
python model/classical_baseline_photo_unseen.py
```

The first command regenerates examples, checks the frozen QNN reference,
fits/validates the logistic model, and writes the report. `--audit-only` leaves
the coefficients and threshold fixed while refreshing paired scene audits;
it rejects changed reference-source hashes. The independent-street command
only evaluates saved models and writes a separate report. It never fits.
