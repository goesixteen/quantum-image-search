# BusPatch-QNN-photo-v1

The street-photo mode has its own trained four-qubit QNN. It classifies pixel patches containing the supplied **real schoolbus cutout**, composited over the supplied **real street photograph**. The transparent cutout is an AI-assisted extraction from an attributed real photograph; it is not the illustrated bus sprite. See `../docs/ASSETS.md` for the source photographs, licenses, creators, and extraction note.

The tested domain is this one foreground cutout and this one background photograph, with new placements and augmentations. Neither the bus identity nor the street-photo identity is held out. The result establishes a functional photo-based compositing demo, not general recognition of arbitrary schoolbus photographs.

## Browser contract

```js
import { extractPhotoFeatures, predict } from './qnn.js';
const model = await (await fetch('./model/model-photo.json')).json();
if (!model.readyForDemo) throw new Error('Photo checkpoint has not passed demo checks.');
const score = predict(extractPhotoFeatures(patchImageData), model);
const isMarked = score >= model.threshold;
```

`patchImageData` is a 64×64 opaque RGBA image extracted from the composited scene. For the 4×4 grid, each 128×128 canvas region is resized to 64×64. For the 8×8 grid, the region is already 64×64. The checkpoint declares `featureVersion` and `featureExtractor` as `yellow-hue-v2`; it must use `extractPhotoFeatures`. The illustrated checkpoint continues to use the unchanged `extractFeatures` function.

The same eight geometric features and the same circuit/readout definitions in `README.md` are used, with a tighter yellow predicate. In addition to the synthetic color conditions, a photo yellow pixel must satisfy `(g-b) > 0.47 × (r-b)` and `r >= 0.96 × g`. These approximate a yellow-hue band and reject many brown/red brick pixels. This is an explicit classical preprocessing prior. The class prediction still depends on 40 learned parameters in the simulated quantum circuit and readout.

The model never receives target coordinates, tile indices, alpha masks, or sprite identity metadata. Alpha masks are used only to composite training images and to determine overlap in evaluation. All inference consumes the actual composited pixels.

## Data, training, and results

The background is center-cover cropped to a 512×512 square. For the provided 3230×2194 street image, the square source crop is x=518, y=0, width=2194, height=2194. The exact training normalization is exported as `../dist/assets/street-captcha.png`, using Pillow LANCZOS and RGB values without a color-profile transform. Loading that PNG is pixel-for-pixel identical to the original trainer normalization; the browser draws it 1:1 instead of applying a different JPEG downsampling filter. The unedited JPEG remains the credited source photograph, and the model records the normalized asset's hash and crop provenance. Training mixes both 8×8 and 4×4 scene scales. The foreground width varies between 44 and 59 pixels in the normalized patch; half of positives use partial placements near region boundaries. The stress generator expands the size range, varies brightness, and adds sensor noise.

Negatives are street-only crops. Thirty-five percent of negatives are exact empty 4×4/8×8 captcha tiles, providing representative hard negatives for buildings and signs. **Background imagery, and some exact negative tile rasters, are reused across splits.** Only placement/augmentation random seeds are held out. This choice intentionally specializes the demo to its supplied scene and must remain explicit in any presentation.

Training uses the four-layer, 40-parameter architecture from the illustrated model, with two deterministic restarts: one initialized from the preserved synthetic model, one from random angles/readout weights. Each restart runs 1,800 Adam steps. The lowest validation BCE checkpoint is restart 0, step 1700. Threshold **0.61** maximizes validation F1.

| Split | Count | Seed | Accuracy | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| Train | 3,200 | 731091 | 98.66% | 98.26% | 99.06% | 98.66% |
| Validation | 800 | 731092 | 99.00% | 98.51% | 99.50% | 99.00% |
| Test | 2,000 | 731293 | **98.45%** | 98.31% | 98.60% | 98.45% |
| Stress test | 1,200 | 731294 | **95.42%** | 94.60% | 96.33% | 95.46% |

Test AUROC is 0.997248; stress AUROC is 0.979536. These are balanced patch classification metrics for the same asset set. They are distinct from scene localization, quantum measurement outcomes, and photographic generalization. The earlier wide-color-mask photo candidate marked eleven empty-photo tiles and was rejected; the narrower hue predicate and representative empty-tile negatives resolved that failure in the final audited raster.

## Full-scene checks

`audit_photo.py` composites the cutout at 384 independently seeded positions on the full 512×512 photo for each supported grid. It runs inference on every region and checks marks against actual foreground alpha overlap. These are local Pillow raster checks; the browser's fractional positioning and interpolation still need an end-to-end UI check.

| Grid | Audited placements with at least one correct overlapping mark | Placements without a false tile mark | Empty-photo marked tiles |
|---|---:|---:|---:|
| 4×4, 128→64 patches | **384 / 384** | 384 / 384 | 0 / 16 |
| 8×8, 64-pixel patches | **383 / 384** | 384 / 384 | 0 / 64 |

The default 4×4 photo scene is the stronger audited mode. The 8×8 miss is at bus top-left position (65,399). Its empty-photo maximum score is 0.603796, close to the 0.61 threshold; different browser rasterization can affect this small margin. The 4×4 empty-photo maximum score is 0.050227. Exact audit details are in `photo-placement-audit.json` and `photo-metrics.json`.

Python and JavaScript features agree exactly across twelve final photo fixtures, and their QNN scores agree within 3.82×10⁻¹⁷. Analytic statevector derivatives agree with independent parameter-shift expectation derivatives within 6.46×10⁻¹⁶. These checks validate numerical implementation, not real-world generalization or computational speedup.

## Reproduce and inspect

From the project root:

```sh
python model/train_photo.py --bus dist/assets/real-schoolbus.png --background dist/assets/street-captcha.png --steps 1800 --restarts 2 --features hue
node model/parity-test.mjs model/model-photo-candidate.json model/parity-fixtures-photo.json
python model/audit_photo.py --model model/model-photo-candidate.json
```

The trainer writes `model/model-photo-candidate.json` with `readyForDemo:false`; it does not replace the production checkpoint. The validated production file is `dist/model/model-photo.json` with `readyForDemo:true`. This keeps future experiments from accidentally replacing a working demonstration before their parity and scene checks pass.

`photo-metrics.json` and the equivalent `metrics-photo.json` contain split results, histories, source-asset SHA256 values, and both grid audits. `photo-test-montage.png` and `photo-stress_test-montage.png` show the first 72 final examples with scores. `model-photo-original-failed.json` and `metrics-photo-original-failed.json` retain the failed initial candidate for provenance. The synthetic checkpoint, its original feature extractor, and its metrics remain separately preserved.

The next scientifically stronger stage is multiple independently licensed bus cutouts and street photographs, with image identity splits, a same-photo-feature classical baseline, and realistic distractor vehicles. That would test whether the learned classifier recognizes buses beyond the one supplied asset.
