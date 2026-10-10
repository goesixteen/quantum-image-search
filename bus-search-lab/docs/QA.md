# Browser and model verification

Verified October 10, 2026. Numerical classifier benchmarks, oracle quality, ideal marked-set probability, and sampled localization are separate measurements.

## Real street interaction

- The default scene loads a photographed schoolbus cutout over a real street photograph with a 4 × 4 grid. The action stays disabled until both the scene and photo-specific model are ready.
- A default search accepted one region and sampled a region overlapping the bus. Three ideal Grover rounds give 96.13% marked-set probability for one marked region among 16.
- Removing the bus produced zero accepted regions on both 4 × 4 and 8 × 8 grids. The app reported the empty oracle and did not force a highest-score answer.
- Free placement across a 4 × 4 boundary produced two accepted overlapping regions. Two rounds gave 94.53% marked-set probability; the observed sample overlapped the placed bus, with a QNN score of 0.969.
- Scene changes clear the preceding trace. Repeated measurement, grid selection, illustrated mode, drag placement, and keyboard movement were exercised.
- At a 390-pixel viewport the document width was 375 pixels, with no horizontal overflow. Desktop layout and the probability curve were visually inspected.

See `bus-demo.jpg` for a real browser capture of the default photograph search and simulated measurement (one accepted region, QNN score 0.997, 96.13% ideal marked-set probability). The image was captured from the local preview of the deployed static source.

## Rendering mismatch found and corrected

The first browser photo implementation resized the full JPEG to the 512 × 512 inference canvas. Its antialiasing differed from the training raster and produced three false positives on an empty 8 × 8 street. The accepted solution exports the exact normalized training background as `assets/street-captcha.png` and draws it at 1:1 pixels. Both empty-scene checks then yielded zero marks. The source crop and photo licenses remain documented in ASSETS.md.

## Model and circuit checks

The synthetic model passes Python/JavaScript parity within 1e-15; photo fixtures have zero feature difference and maximum probability error below 4e-17. Thirteen Node checks cover Grover behavior and pixel-to-predicate composition. Independent PennyLane verification checks 32 QNN inputs and six Grover cases within 3e-16. The Qiskit companion passes six local tests, including one backend job per run. Actual Qollab-hosted execution remains unverified.

The photo model's held-out patch accuracy is 98.45% on 2,000 controlled composite patches. A separate offline placement audit hits 384/384 at 4 × 4 and 383/384 at 8 × 8. These use the same bus cutout and street context; they are not independent photographs or unseen-bus tests.

## Reproduce

Run `node serve.mjs` from this project and open `http://127.0.0.1:4173`. Exercise the default scene, remove the bus, switch grids, and try a boundary placement. Run `npm test` for the numerical checks. Model cards and scripts describe their separate evaluations. The simulation is probabilistic: one observed successful sample is not a deterministic guarantee.
