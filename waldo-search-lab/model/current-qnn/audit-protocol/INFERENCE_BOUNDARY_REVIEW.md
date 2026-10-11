# Independent source review

A second reviewer inspected only `dist/app.js`, `index.html`,
`qnn-localizer.js`, `qnn.js` and `quantum.js`. No checkpoint, metric, dataset,
image asset, audit outcome or candidate training file was read or changed.

The default `search()` call supplies final rendered RGBA, declared target
width/height, saved model and scan controls to `scanQNN`. The extractor reads
RGB samples; renderer coordinates, visible alpha, foreground metadata, clean
background and template outputs do not select accepted locations. Each of the
4,096 windows calls `predict()` and its actual four-qubit `quantumReadout()`
simulation. The seven-observable sigmoid score enters inclusive thresholding
and deterministic greedy NMS with distance at most `max(12, .35 × width)`.
Coarser address grids retain the highest-scoring fine scan point per address.

Measurement samples stored exact trace probabilities. Gaussian field smoothing
and interpolated playback frames are display-only. Source-isolated synthetic
checks using arbitrary parameters confirmed alpha invariance, threshold/NMS
semantics and the Grover curve to about `1.6e-15`; these are software checks,
not trained performance results.

Uploaded custom targets explicitly switch to the labelled template comparison
and disable the striped-target QNN. Same-art training, known size, classical
preprocessing, browser simulation and no established end-to-end quantum
advantage are disclosed. The remaining documentation recommendation is to
distinguish the frozen 300 clean / 540 band-crossing audit from the primary
interactive's later always-front default. Root owns that final HTML summary.

This review establishes the inspected data flow, not the eventual checkpoint's
recognition accuracy or hosted/browser execution. Final model hashes, full
independent results and browser evidence remain required.
