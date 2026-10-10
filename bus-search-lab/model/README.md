# BusPatch-QNN-v1

This page documents the preserved **illustrated / synthetic** checkpoint. The real street-photo scene uses a separate trained checkpoint described in [PHOTO_MODEL.md](PHOTO_MODEL.md). Both use the same four-qubit circuit architecture, with distinct color predicates and weights.

This is a genuinely trained, simulated four-qubit quantum neural network for **synthetic schoolbus patches**. It supplies the image-dependent predicate for the separate Grover simulator. It is an engineered-feature hybrid classifier: eight deterministic pixel features enter a variational quantum circuit, followed by a learned classical sigmoid readout. It is not an end-to-end photographic object detector.

## Reproduce and verify

Python 3 with the two packages in `requirements.txt` is sufficient. No GPU, quantum service, SciPy, PyTorch, or network download is needed to execute the included experiment.

```sh
python -m pip install -r model/requirements.txt
python model/train.py --steps 1800 --layers 4 --restarts 3
python model/verify.py
node model/parity-test.mjs
```

Run these commands from the project root. The training command recreates the four PNG sprites, model JSON, final metrics, train histories, parity fixtures, and held-out montages. Retraining uses the same deterministic seeds and chooses the checkpoint with the lowest validation BCE across three initializations; hardware/library differences can change floating point values slightly. The browser consumes `dist/model/model.json` and `dist/qnn.js` directly.

## Pixel features and browser contract

```js
import { extractFeatures, predict, quantumReadout } from './qnn.js';
const model = await (await fetch('./model/model.json')).json();
const features = extractFeatures(canvasContext.getImageData(0, 0, 64, 64));
const score = predict(features, model);
const isMarked = score >= model.threshold;
```

The patch must first be composited over the scene background, then resized to 64×64 if necessary. RGBA alpha is not a classifier input. `extractFeatures` returns eight numbers in [0,1]; `predict` returns the sigmoid classifier score. No sprite position, tile number, target label, alpha ground truth, or other scene metadata enters inference. The score is meaningful in the synthetic training domain; it is not a calibrated probability for photographs or arbitrary uploads.

Yellow pixels satisfy `r > 125`, `g > 82`, `b < 150`, `r > 1.35b`, `g > 1.20b`, and `r < 1.9g`. Dark pixels have Rec.709 luminance below 105. Rows/columns with at least two yellow pixels define a bounding box; fewer than eight yellow pixels returns the zero feature vector. Exact region rounding and clipping are shared by the Python and JavaScript implementations.

| Feature | Definition before clipping to [0,1] |
|---|---|
| yellow_coverage | Yellow pixel count / (patch area × 0.22) |
| yellow_aspect | Yellow bounding-box width / height / 3 |
| window_runs | Number of contiguous dark-column runs in the upper interior / 6 |
| window_darkness | Mean dark occupancy of the upper interior / 0.65 |
| window_spacing | `max(0, 1 − std(gaps)/max(1, mean(gaps)))`, with at least three window runs |
| wheel_runs | Number of contiguous dark-column runs below the body / 3 |
| body_fill | Mean yellow occupancy of a band near 77% of body height |
| lower_darkness | Mean dark occupancy below the body / 0.55 |

The upper interior excludes approximately 8% of width on each side and spans 13% to 58% of yellow-body height. A column is active when more than 48% of its upper-interior pixels are dark. The wheel region begins one pixel above the yellow box bottom and extends another 36% of body height, clipped to the image; its column threshold is 40%. The feature extractor contains strong vehicle-color and shape priors, which is why a classical baseline on the same features is included separately.

## Trained circuit

Four qubits start in |0000⟩. Qubit 0 is the least significant bit of a statevector basis index. Every one of four layers applies:

1. For qubits q=0…3, angle encoding `RY(π × f[q])`, then `RZ(π × f[q+4])`.
2. For qubits q=0…3, trainable `RY(θ[layer,q,0])`, then `RZ(θ[layer,q,1])`.
3. CNOT 0→1, then 1→2, then 2→3, then 3→0.

The features are reuploaded each layer. The seven readouts are ⟨Z0⟩, ⟨Z1⟩, ⟨Z2⟩, ⟨Z3⟩, ⟨Z0Z1⟩, ⟨Z2Z3⟩, and ⟨Z0Z1Z2Z3⟩. The output is `sigmoid(bias + Σ weight[k] × expectation[k])`. There are **40 trained scalar parameters: 32 circuit angles, seven readout weights, and one bias**.

Training minimizes binary cross entropy with Adam, mini-batches of 128, learning rate declining from 0.028 toward 0.0126, and a small 0.0004 gradient penalty on readout weights. Gradients propagate analytically through the complex statevector and the classical readout. This is a simulator method, not a quantum-device execution. Independently applying the two-shift ±π/2 rule to the circuit expectations agrees with the analytic derivatives within 6.67×10⁻¹⁶ on nine random feature inputs and every trained angle. The nonlinear BCE loss itself is not parameter-shifted.

The best exported checkpoint is restart 0 at step 1100 of an 1800-step run. Three restarts were examined using validation BCE. The classification threshold, **0.28**, maximizes F1 on the validation set. The threshold can be changed in the site to examine false-positive/false-negative tradeoffs; that does not retrain the model.

## Data and final metrics

`train.py` procedurally renders a yellow bus with repeated dark windows and two wheels, on randomized light neutral backgrounds with lines/outline rectangles. Buses vary in color, size, and placement; 48% of positives use cropped placements, including half-width/half-height fragments near grid boundaries. Negatives include cars, vans, trucks, yellow rectangles, striped yellow signs, geometric clutter, and empty scenes. A majority of negative vehicle examples are yellow, preventing a pure “yellow means bus” rule from solving the task. The stress generator varies sizes further, shifts objects, and adds sensor noise.

| Split | Count | Seed | Accuracy | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| Train | 3,200 | 20261010 | 97.53% | 97.38% | 97.69% | 97.54% |
| Validation | 800 | 20261011 | 98.38% | 98.25% | 98.50% | 98.38% |
| Test | 2,000 | 20261112 | **96.95%** | 96.35% | 97.60% | 96.97% |
| Stress test | 1,200 | 20261113 | **96.17%** | 96.95% | 95.33% | 96.13% |

Both test sets are balanced 50/50 by class. They use fresh seeds reserved after exploratory generator/crop-policy work. Checkpoint and threshold selection use validation data. Test AUROC is 0.993995; stress AUROC is 0.986706. Machine-readable metrics and history are in `metrics.json`; identical split summaries and seeds are exported in the browser model. The classical same-feature logistic baseline has 95.10% test accuracy; its own reproducible code and results are in `classical_baseline.py`, `baseline_metrics.json`, and `../docs/BASELINE.md`. A higher score in this small synthetic experiment is not evidence of quantum computational advantage.

## Placement audit and limits

`verify.py` places the 52×32 sprite at every one of 4,096 integer x/y phases in a local 2×2 tile raster, using the site's neutral background and light outlines. This represents interior translations within an 8×8 grid, while excluding the outer canvas boundary, distractors, fractional browser rasterization, and Grover measurement randomness.

At the default threshold, **3,993/4,096 placements (97.49%) mark at least one tile that overlaps the bus**. No tile without any bus pixels is marked in this particular audit. A coarser 110-position regression set has 100% overlap hits. These are scene-predicate diagnostics and should not be confused with patch test accuracy or a guarantee of successful quantum sampling. `verification.json` lists the 103 dense-audit misses; `boundary-audit.png` shows them in red.

The remaining misses mostly involve heavily divided fragments whose windows and wheels fall in different patches. Uploaded photographs, unusual bus colors, texture-rich scenes, tiny fragments, occlusion by other objects, and alpha-free sprite backgrounds are outside the demonstrated domain. A meaningful next stage is a real schoolbus crop dataset with image-level splits and false-positive analysis, plus a carefully documented overlapping-window scan. Synthetic accuracy alone cannot establish real-world bus recognition.

## Artifacts

- `../dist/model/model-synthetic.json` (also retained as `model.json`): trained synthetic weights, threshold, circuit configuration, seeds, and final split results.
- `../dist/qnn.js`: package-free browser pixel features and exact statevector inference.
- `../dist/assets/bus.png`: 104×64 transparent retina sprite, drawn at approximately 52×32 in the default demo. `car.png`, `van.png`, and `truck.png` are negative vehicle assets.
- `test-montage.png`, `stress-montage.png`: first 72 examples of each final test set with model scores.
- `parity-fixtures.json` and `parity-test.mjs`: Python/JavaScript cross-runtime pixel-feature and probability check. Twelve fixtures have exact feature equality and score error below 6.67×10⁻¹⁶.
- `verify.py`, `verification.json`, `boundary-audit.png`: independent derivative check and explicit placement diagnostics.
