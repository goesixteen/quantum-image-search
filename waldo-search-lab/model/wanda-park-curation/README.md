# Curated Park lookalike pilot

This package records **model-guided artwork curation**, not training or independent model accuracy. The frozen Wanda model, feature code, threshold, original Park asset, and historical 298/300 native benchmark are unchanged.

The chosen coral sprite is drawn at requested center **(169,400), height50px**, then baked into a new opaque512px scene. Its actual center is(169.5,400). The app copies that derived scene1:1; the normal Wanda target remains draggable. At supplied detector height52px the actual Chromium scene has a moderate lookalike peak **.702077**, below threshold **.905647**, with zero accepted locations when Wanda is absent. With Wanda requested at(420,300), actual Chromium accepts only index2420 at(420,300), score **.993373**, center error.5px.

This is explicitly a **52px pilot**. The same absent scene falsely accepts the lookalike at supplied sizes40px and46px, with scores.999809 and.999896. At58px and64px it accepts nothing. These failures are retained, not corrected by changing weights or threshold. Scores are detector outputs, not calibrated identity probabilities.

The records contain113 native curation scans (coral80, burgundy14, brick19), one separate native positive regression, and11 actual-browser score checks (dynamic-rendered absence5, baked absence5, baked positive1): **125 full-field checks**. Repeated sizes can inspect the same rendered PNG, so this is not125 independent images. The18-row feature intervention experiment is separate, with37 interventions/684 score comparisons; its vectors may not describe realizable clothing and do not establish causal attribution.

Dynamic browser resizing produced a weaker coral52px peak.127722 compared with native.702077. The baked absence image has identical decodedRGBA to the native reference despite differing PNG encoding. The actual positive browser image differs from native only within the real Wanda rectangle; recognition passes on both backends. Burgundy/plum was safe but visually weak in the learned field; brick/cream retained scale-related false acceptances. All outcomes and protocols are retained in the three result files.

`summary.json` is also served as `dist/model/wanda-park-curation.json`. `browser/` holds the three full raw browser PNGs, including the failed dynamic rendering attempt. `native/` holds five absence PNGs plus the positive reference. The five absence PNGs intentionally contain identical pixels: supplied size changes the detector geometry, not the fixed-height artwork. `source-contracts/` archives exact model and compositor/feature/circuit sources. Original PNG sources are referenced by hashes in `external-source-hashes.json`.

Run these commands from the crowd project's root. Node18+ is sufficient for hash/PNG verification. Rendered replay requires `@napi-rs/canvas` **0.1.100**; install it locally or pass `--canvas-module /absolute/path/to/@napi-rs/canvas`. Counterfactual reproduction requires Python3, NumPy, and the project's `model/qnn_core.py`.

```sh
node model/wanda-park-curation/verify.mjs
node model/wanda-park-curation/replay-curation.mjs --output-dir ../../work/park-curation-replay
node model/wanda-park-curation/positive-regression.mjs --output-dir ../../work/park-positive-replay
node model/wanda-park-curation/replay-browser.mjs
node model/wanda-park-curation/replay-browser.mjs --report model/wanda-park-curation/browser/browser-coral-h50-absent-h52-scores.json
node model/wanda-park-curation/browser-positive-scan.mjs
python model/wanda-park-curation/counterfactual.py
```

The default project location is relative to this package, so these tools work after moving the complete project. `--project-dir` overrides it. Full113-row replay takes roughly two minutes and can generate~90MB of scratch PNGs; `--row lower-walkway-h50-scan52-final` runs one row. The replay compares frozen source hashes, integer placement/trim metadata, accepted marks, global/top-eight scores, local peak winners/scores/features, and45 originally saved PNG hashes. It does not claim comparison with an unrecorded complete4096-score archive. The archived full replay had zero score/feature error. Replays never fit, tune, replace weights, or rewrite this evidence package.

Browser PNGs came from the app's visible raw analyzed-image export. The source hash observed during packaging is labeled as such, rather than being asserted retrospectively for earlier captures. Original-background evidence and this curated artwork must remain separate in future reporting.
