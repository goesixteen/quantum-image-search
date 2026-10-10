# StripePatch-QNN-v1

This model learns a pixel-derived predicate for a generated explorer wearing
horizontal red/white stripes over a busy illustrated crowd. It uses clothing
color and stripe texture; it does not perform face identity recognition or
general real-world people search.

## Scope and data

The positive examples composite the same `character.png` asset over new sampled
crowd locations, at different scales and partial crop positions. Negative
examples include untouched crowd pixels, blue-striped decoys, and a generated
solid-red-shirt decoy. The original crowd already includes people wearing red
clothes, flowers, and other red details.

The train, validation, and test partitions have different random seeds and new
positions/scales. **All partitions reuse the same character and crowd assets.**
Thus test accuracy measures robustness to held-out composites of these assets,
not generalization to unseen people, unseen scenes, or photographs.

The model receives eight features extracted from the composited RGB image. It
does not receive placement coordinates, ground-truth overlap, sprite identity,
an alpha mask, or a known target cell as an inference input. Procedural insertion
labels are used only to train and evaluate the model.

Training uses 1,600 examples; validation uses 400; testing uses 600. Seeds and
original-asset SHA-256 hashes are saved in `metrics.json`. Threshold selection
maximizes validation F1 before the test partition is evaluated.

## Pixel features and quantum circuit

The feature extractor identifies horizontal runs of red pixels separated by
white gaps along overlapping vertical windows. It combines total red coverage,
band count, white-gap coverage, spacing regularity, stripe coherence, blue color
below the stripe chain, stripe area, and stripe aspect ratio. Features are
clipped to `[0,1]`.

The variational circuit uses four qubits and four data-reuploading layers. Each
layer angle-encodes eight features using `Ry` and `Rz`, applies eight learned
rotations, and then a four-CNOT ring. Seven Pauli-Z expectations feed a learned
classical sigmoid readout. There are 32 quantum angles, seven readout weights,
and one bias, for **40 trained parameters**.

NumPy exact statevectors supply analytic derivatives for Adam optimization. The
accepted checkpoint uses the best validation cross-entropy during 1,100 steps.
The saved threshold is approximately **0.22**.

## Held-out results

| Split | Examples | Accuracy | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Train | 1,600 | 99.875% | 99.751% | 100% | 99.875% |
| Validation | 400 | 100% | 100% | 100% | 100% |
| Test | 600 | 99.0% | 98.675% | 99.333% | 99.003% |

The test set has four false positives and two false negatives. These are
same-asset synthetic patch results. They are not face-recognition accuracy and
not a measurement of Grover localization probability.

## CAPTCHA audit

The audit renders the crowd at 512×512, uses a full-PNG character height of
`0.75 * cell size`, and extracts each tile into 128×128 pixels. It tests new
random free placements, including tile boundaries. A ground-truth tile must
cover at least 20% of the inserted character's bounding-box area; this definition
is used only after inference.

| Grid | Empty crowd positive tiles | Random placements with a true tile marked |
| --- | ---: | ---: |
| 4×4 | 0 / 16 | 20 / 20 |
| 8×8 | 0 / 64 | 19 / 20 |

An accepted mark is a learned stripe-pattern prediction. Grover can amplify a
false positive and cannot recover a true region omitted by the predicate. The
one missed 8×8 placement is preserved in the audit report rather than counted as
a successful detection.

## Rendering and reproducibility

`crowd-captcha.png` is an exact 512×512 Pillow-LANCZOS normalization of the original
crowd, intended to be drawn 1:1 in the browser. Training augments resize filters
with bilinear, bicubic, and Lanczos sampling to cover rendering differences in
small shirt stripes. Character geometry matches the full PNG's 2:3 aspect ratio.

The browser `dist/qnn.js` reproduces the Python feature extractor and inference.
Ten saved RGBA fixtures give maximum feature error **0** and maximum prediction
error **1.83×10^-17**. A dedicated bottom-cropped stripe case verifies that an
empty below-shirt region returns finite blue evidence.

An initial exploratory run exposed an empty-average NaN when a stripe chain
ended at the bottom edge. That run was rejected, the empty region was defined as
zero blue evidence, and feature finiteness was checked before fitting the
accepted model. The accepted metrics and export come from the corrected run.

From the project folder:

```powershell
python model/train.py --steps 1100 --layers 4
node model/parity-test.mjs
```

Python requires NumPy and Pillow. Browser inference requires no packages or
network service. Saved parameters are in `dist/model/model.json`, detailed
evaluation in `model/metrics.json`, and a held-out montage in
`model/test-montage.png`. The shared Grover module was copied unchanged from the
schoolbus project.
