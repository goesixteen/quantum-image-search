# Search Atlas browser verification

Verified October 10, 2026, against the local site at `http://127.0.0.1:4174`. This is a record of real browser checks, separate from the model trainer's numerical audits. Deployment and live-site checks belong to the publishing step.

## Render and inference contract

The inference canvas is 512 × 512 pixels. It uses `assets/crowd-captcha.png`, the same normalized background as training, without a browser-side background resize. The original transparent character is drawn at height 75% of one grid cell and its natural 2:3 width/height ratio: 64 × 96 pixels on the 4 × 4 grid and 32 × 48 on the 8 × 8 grid. Candidate tiles are resampled to 128 × 128 before feature extraction. The screen can scale the visible canvas without changing these inference dimensions.

Only composited image pixels enter feature extraction and the trained QNN. Character coordinates and an alpha-mask overlap calculation are used independently after measurement to evaluate the selected tile. The application never forces the highest-scoring region into an otherwise empty oracle.

## Observed checks

| Browser action | Observed result |
| --- | --- |
| Initial 4 × 4 placement, Find the explorer | One accepted region; three Grover iterations; approximately 96.1% accepted-set and true-target probability; sampled region overlapped the explorer. |
| Remove explorer, 4 × 4 search | Zero accepted regions; no requested measurement. |
| Empty scene, 8 × 8 search | Zero accepted regions; no requested measurement. |
| Restore explorer, 8 × 8 search | One accepted region; six iterations; approximately 99.7% true-target probability; sampled region overlapped the explorer. |
| Random 4 × 4 placement | One accepted region and a correct sampled tile. |
| Free placement, keyboard move of four pixels, search | Scene reset correctly; fresh inference and a correct sampled tile. |
| Random 8 × 8 placement | One observed missed placement produced zero accepted regions. The UI reported the empty oracle honestly. |
| 390 × 844 mobile viewport | Main action, crowd, and scene controls fit; no horizontal document overflow. Viewport override was reset after the check. |
| Browser error log | No error entries during these checks. |

These checks exercise loading, rendering, two candidate counts, absence, placement changes, actual inference, Grover simulation, and measurement. They do not establish exhaustive browser compatibility or a placement-independent recognition rate. The random 8 × 8 miss remains a known limitation; the trainer's separate 20-scene audit likewise recorded 19/20 hits on that grid.

## Model evidence and scope

The saved model contains a four-qubit, four-layer QNN with 40 trainable parameters and a frozen validation threshold of 0.22. The held-out patch set has 600 examples and 99.0% accuracy. The trainer reports 20/20 full-scene hits on a 4 × 4 grid and 19/20 on an 8 × 8 grid, with zero accepted regions on the empty crowd for both grids. See `model/model.json` and the model documentation for the exact protocol.

Those results use placements of one original character on one original crowd illustration. They do not demonstrate recognition of unseen characters, arbitrary people, photographs, or new crowds. Patch accuracy, full-scene oracle hit rate, ideal accepted-set probability, and actual sampled localization are distinct measurements.

## Reproduce

From this project directory, run `node serve.mjs` and open `http://127.0.0.1:4174`. The server has no runtime package dependencies. Syntax was checked with `node --check dist/app.js`. Use the empty-scene, random-placement, grid, and free-placement controls to exercise the cases above.

The model evaluates all 16 or 64 candidate patches on a classical processor before compiling the Grover oracle. Displayed oracle steps are ideal search-query counts; the measured inference and trace runtime includes classical work. This browser demo establishes no end-to-end quantum acceleration.
