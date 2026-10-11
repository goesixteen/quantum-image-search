# Wanda browser/native rendering diagnostic

The captured Chromium source passed all **15/15 declared target probes** and all **5/5 absent-target probes** at the former default center `(276,348)`. Native canvas passed 13/15 target probes and all five absences. Native abstained on Beach and Fairground at height 40; Chromium returned the correct point in both. This is a fixed known-scene engineering check, separate from the unchanged **298/300 native-rendered reserved scene benchmark**.

| Check | Native canvas | Chromium capture |
| --- | ---: | ---: |
| Complete target scenes | 13/15 | 15/15 |
| Incorrect target-point scenes | 0/15 | 0/15 |
| Target abstentions | 2/15 | 0/15 |
| False detections in absent scenes | 0/5 | 0/5 |
| Height 52 defaults | 5/5 | 5/5 |

The accepted sets matched in 18/20 cases. No frame was byte-identical. The maximum eight-feature difference was 0.14246 and the maximum full-field sigmoid-score difference was 0.69466. There were four pre-suppression threshold crossings; two changed the final accepted set. Native JavaScript and independent NumPy scoring on identical native pixels agreed within 6.22×10⁻¹⁵, so these rendering differences do not indicate a circuit implementation mismatch.

## Scope and rendering evidence

The protocol covers the same five generated worlds, Wanda at one predeclared requested center `(276,348)`, heights 40/52/64, always in front, and grid 64. Five additional absences use supplied height 52. The default was changed to `(420,300)` after capture at the user's request; this audit does not claim to verify that new default. Historical case IDs containing `default` retain their meaning at capture time. The model SHA is `d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88`; threshold stays `0.9056472752971427`. No weights, features, threshold, or reserved-test results changed. The model's inherited domain-label mistake remains documented in [the original metadata erratum](../wanda-qnn/metadata-erratum.json); its bytes are preserved here exactly.

The parent captured the visible **Save analyzed image ↓** link (`#trace-export`) at `http://127.0.0.1:4174/`, with recorded scene/size/presence controls. That link serializes the raw inference ImageData before selection borders. The visible main `#scene` canvas contains display overlays and was not used as the detector input. Geometry is the declared renderer contract, explicitly distinguished from DOM-observed settings.

Native references use high-quality 512-pixel background staging, the alpha>16 trim `[285,21,725,1514]`, high target resizing, and integer placement with `targetSmoothing:false`. Widths are 12/15/19 pixels; actual centers are `(276,348)` at 40 and `(276.5,348)` at 52/64. Both detectors scan all 4,096 final-RGB windows with the supplied size and frozen learned circuit. Neither truth coordinates nor source masks enter inference. A complete hit requires a retained point within 6.657 pixels and no incorrect retained point; absence requires zero retained points.

Every captured Chromium pixel outside the target rectangle exactly matches the normalized background PNG. Native high-quality 1:1 staging changes those values. Target antialiasing also differs; the overall maximum RGB-channel difference is 206. These observations support a backend caveat rather than an urgent remedy: all declared browser outcomes pass, but score landscapes and two predicates differ. They do not establish browser accuracy for all 300 reserved scenes, new backgrounds, arbitrary characters, occlusion, or other browsers. The exact interpolation algorithm is not standardized by Canvas. [HTML Standard: drawing images](https://html.spec.whatwg.org/multipage/canvas.html#drawing-images-to-the-canvas).

The median native reference scan took 1.014 seconds; the independent two-backend Python comparison took 39.975 seconds for 20 cases (median 1.992 seconds per case). These workstation timings do not measure live Chromium inference or quantum hardware performance.

## Files and verification

- `metrics.json`: compact native/browser counts and mismatch bounds.
- `report.json`: all 20 paired measurements, captured-control provenance, source hashes, per-case scores/accepted points, and timings.
- `protocol.json`, `fixture-manifest.json`, `source-contracts.json`: declared inputs, source/reference identities, and rendering contract.
- `browser/`: exact 20 captured PNG files plus the capture metadata. `expected/`: exact 20 native reference PNGs.
- `frozen-wanda-qnn.json`: byte-exact historical model copy; the original production checkpoint is unchanged.
- `capture-transfer-note.json`: initial truncated transfer was rejected before scoring; full data-URL chunks were recaptured and all final PNGs decoded. No truncated-image workaround was enabled.
- `native-roundtrip-self-test.json`: 20 native PNG roundtrips, explicitly not browser evidence.
- `post-capture-ui-note.json`: capture app hash stays `87d5a766…`; later UI-only changes are recorded separately and are not represented as newly captured pixels.
- `portable-replay-verification.json`: replay from the project root reproduced all 20 native PNG/full-score hashes and all paired feature/score/decision measurements.
- `audit-manifest.json`: SHA-256 for the package files. Full-lattice binary score fields remain regenerable work data.

From this project root, run the read-only package verifier (NumPy/Pillow required):

```powershell
python model/wanda-browser-audit/verify-package.py
```

To reproduce the paired calculation, use a separate working directory. Node 24+ with `@napi-rs/canvas` 0.1.100 and Python with NumPy/Pillow are required. The scripts resolve this project relative to their location, or accept `--project-dir`. Set `QNN_CANVAS_MODULE` if the native module is outside Node's search path.

```powershell
node model/wanda-browser-audit/native-fixtures.mjs --output work/wanda-browser-replay
Copy-Item -Path model/wanda-browser-audit/browser/* -Destination work/wanda-browser-replay/browser -Force
Copy-Item -LiteralPath model/wanda-browser-audit/protocol.json -Destination work/wanda-browser-replay/protocol.json
python model/wanda-browser-audit/compare.py --fixtures work/wanda-browser-replay --output work/wanda-browser-replay/new-report.json
```

The first command recreates native PNGs and 4,096 scores per case. The second copies the retained actual Chromium captures; it does not acquire a new browser sample. The final command checks decoded RGB, all 65,536 feature values and 8,192 scores per paired case, threshold crossings and stable NMS. Run artifacts stay in `work/`; the packaged report remains unchanged. New browser captures require the same visible-control protocol and must be recorded as a new diagnostic run.
