# Frozen Wanda QNN

The complete protocol, results, limits and ordered reproduction commands are in [WANDA_QNN.md](../../docs/WANDA_QNN.md). Artwork provenance is in [WANDA_ART.md](../../docs/WANDA_ART.md).

The exact trained checkpoint is `wanda-qnn.json`, also served as `dist/model/wanda-qnn.json`. Its SHA-256 is `d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88`. Parameters and threshold stayed frozen before the reserved test: 298/300 complete QNN searches, one incorrect point, one abstention and zero detections in 25 empty scenes. The same-feature logistic model completes 299/300. These are held-out centers on one generated Wanda and five known generated backgrounds at discrete heights 40/46/52/58/64 pixels. No unseen-identity or quantum advantage claim is supported.

`metadata-erratum.json` explicitly corrects the checkpoint's inherited `trainingDomain` prose. The frozen checkpoint and trainer remain verbatim; final `wanda-qnn-metrics.json` uses the corrected scope and links this erratum. This description error has no inference effect.

From the project directory, verify the archived model and sources without training or modifying evidence:

```text
python model/wanda-qnn/verify-frozen.py
node --test tests/wanda-qnn.test.mjs tests/wanda-trace-parity.test.mjs
```

The package includes the reproducible native generator/trainer/protocol, compact window vectors and labels, checkpoint selection/frontiers, full scene results, defaults, pixel/circuit parity, trained-angle controls and manifests. Large full-lattice feature binaries can be regenerated using the documented commands. Begin a fresh replay in an empty output directory, render full validation before fitting, and freeze default/parity-checked weights before opening the reserved test.

`renderer-parity.json` is an additional engineering check after the reserved evaluation. It pins the raw hashes of the actual `app.js` canonical recipe and `scene-editor.js` compositor. With Wanda's high-quality background staging and `targetSmoothing:false` for the already resized sprite, all 325 native compositions match the frozen corpus byte for byte: 340,787,200 RGBA channels, zero differences. Both failure cases' complete 4,096-window feature lattices also match exactly. Maximum score difference is 1.33e-15. This confirms the original results under the canonical native renderer; it is not a fresh statistical evaluation or a browser rasterization identity claim. Browser QA remains separate. The seven frozen training source files do not include `scene-editor.js`; no frozen source or evidence was edited for this renderer correction.

The validated read-only audit can be replayed after regenerating full test fields in an output directory:

```text
node model/wanda-qnn/renderer-parity-audit.mjs --project-dir . --data-dir work/replay-wanda --report work/replay-wanda/renderer-parity.json
```

`--data-dir` must point to the completed replay output containing the model, scene manifest, held-out result table and regenerated `test-scene-features.f64` (85.20 MB). That large binary is intentionally not packaged. The ordered replay in `WANDA_QNN.md`, including `full-test`, reconstructs it. The default project path resolves relative to the audit script, so it also works from the ordinary project root without `--project-dir`.
