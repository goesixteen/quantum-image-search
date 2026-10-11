# Quantum Vision: Where's Wanda? — Quantum Unlocked

The heading asks “Can you find Wanda using quantum crowd search?” Ten original
clip-art people stand in compact groups on the top-right edges of the map frame,
Wanda’s card and Find Wanda. The lower quantum chapter uses Find Wanda’s red
with a white/red striped transition and light readable diagram panels.
The top game tries a picture-puzzle-book style: warm paper texture, illustrated
scene cards, a stronger painted map frame and gently shaded menu controls.

The welcome and drag-and-drop game remain. The previous under-the-hood interface
has been replaced wholesale by the latest Git QNN playground, embedded directly
in the red chapter with light panels. [The decorative artwork and prompt provenance](dist/assets/ui-clipart/provenance.json)
are separate from the searched canvas and frozen detector. The rejected pictogram
crowds, entry animations and scattered placements remain archived outside the app.

The game opens with an empty Festival scene. Five map thumbnails sit in one row
above it, and a large Wanda waits in the welcome card on the right. Drag her
into the map to place the same 52px sprite; the portrait leaves the box. Dropping
outside the map restores it. You can also activate Wanda, then click/tap the map
or use arrow keys or Enter. Find Wanda stays in the right menu. Remove Wanda
returns her to the box; Start over resets Festival to this empty welcome state.
Changing worlds preserves an existing placement. The QNN and Grover are unchanged.

[Open the owner-private Wanda site](https://quantum-crowd-search.syrupyspool2.chatgpt.site). Hide a small female red-and-white-striped PNG in one of five original crowded scenes, then watch a genuinely trained, simulated QNN build the predicate for Grover amplitude amplification. Below the game, the inline playground lets you train a circuit, inspect its gates and readout, load the frozen demo weights and run Grover search. It uses the same image pipeline but its own scene and training settings; it is not a replay of the top game's current placement. All qubits are simulated.

The frozen **Wanda** classifier completes **298/300 native-rendered reserved target scenes**, with **0/25 false detections on empty scenes**. Its matched same-feature logistic baseline completes **299/300**. All 60 default-height 52px reserved cases pass. These are disjoint placements of the same known PNG on five known backgrounds, at supplied heights 40/46/52/58/64px, fully visible and inside the frame. They do not establish unseen-person recognition, unknown-size detection, occlusion robustness or quantum advantage.

A separate Chromium engineering audit passes 15/15 known-center target probes across five scenes at supplied heights40/52/64px and all5 empty controls. Native passes13/15 of these target probes. Rendering changes scores; this small diagnostic is separate from the reserved test and does not establish browser-wide accuracy. The model stays frozen.

Start locally with `node serve.mjs`, then open `http://127.0.0.1:4174/`. If that port is occupied, run `node serve.mjs --port 4178`, or use `--port 0` and open the free port printed by the server. Keep the terminal running; Ctrl+C stops your preview. The website is static and needs no dependency installation, inference service, API key or quantum hardware. It uses modern Node.js and a canvas-capable browser. Numerical regeneration uses the separately documented model dependencies.

Run `node --test tests/*.test.mjs` for the retained engineering suite; the latest exact count and current browser checks are in the iteration QA and external handoff. Some tests cover historical lesson modules that are no longer displayed. The new playground has its own 29-test suite in the sibling source folder. See [inline integration and reproducible build instructions](playground-integration/README.md) and [the playground source documentation](../qnn-playground/README.md).

The playground's generated-window score is illustrative: ranking pairs overlap its window check and share a composited image. It is not additional reserved accuracy. The classical comparison uses different settings and is not a controlled benchmark. Its compiled Grover oracle receives already-scored locations, so the visualization does not demonstrate an end-to-end speed-up. These live experiments do not modify the top game's frozen checkpoint.

For the complete suite on a normal machine, install Node.js with npm, then run
`npm install` and `node --test tests/*.test.mjs` from this folder. This installs
the pinned `@napi-rs/canvas` version `0.1.100` development dependency. The tests
prefer that local package; a Codex runtime fallback supports the development
workspace. Read-only Python verification separately needs NumPy and Pillow.

- [Historical lesson semantics](docs/WANDA_LESSON.md), [historical presentation checks](docs/WANDA_ITERATION16_QA.md)
- [Independent current Wanda Qiskit companion](qollab-wanda/README.md)
- [Paired browser/native rendering audit](model/wanda-browser-audit/README.md)
- [Wanda architecture, protocol, results and failures](docs/WANDA_QNN.md)
- [Portable training and read-only freeze verifier](model/wanda-qnn/README.md)
- [Actual-state trace and independent parity evidence](docs/QNN_TRACE.md)
- [Browser checks](docs/WANDA_BROWSER_QA.md), [work log](docs/WANDA_WORKLOG.md)
- [Artwork, exact generation prompts and provenance](docs/WANDA_ART.md)
- [Latest external handoff](../docs/WANDA_HANDOFF.md), [private publication receipt](../docs/history/publication-receipt.json)

The checkpoint’s inherited descriptive `trainingDomain` string is corrected by an explicit [metadata erratum](model/wanda-qnn/metadata-erratum.json). Frozen checkpoint bytes, fitted weights, inference and test results remain unchanged. Read the corrected Wanda model card rather than the inherited description.

The separate [schoolbus CAPTCHA site](https://bus-search-quantum-lab.syrupyspool2.chatgpt.site) retains its previous private deployment. Both Sites identities and owner-private audiences are preserved. Nothing has been submitted to the contest.

## Historical crowd implementation — retained evidence

The following sections describe the previous three-scene striped-person experiment, its optional depth bands and its earlier model. Its artwork, frozen checkpoints and results are retained for comparison; those results are not Wanda results. The current interactive picker has Festival, Beach, Market, Park and Fairground, with the Wanda checkpoint above.

# Find the Explorer — Quantum Search Atlas

Drag a red-and-white striped PNG into one of three busy scenes and watch a trained quantum neural network supply the accepted locations for simulated Grover amplification. The target starts fully visible; existing silhouette bands remain optional. This separate crowd experiment accompanies the schoolbus CAPTCHA demo. No work has been submitted to the contest.

The picker contains **Original Festival**, **Magic Arena**, and **Coronation Queue**. The two new scenes are cropped David Revoy / Pepper&Carrot panels, licensed CC BY 4.0. Original JPEGs and crop coordinates are preserved. Bruegel and Seurat are removed from the picker and retained for earlier benchmarks. The striped OpenMoji adaptation retains CC BY-SA 4.0. Original Festival remains the existing generated benchmark artwork.

Existing private review: [Search Atlas](https://quantum-crowd-search.syrupyspool2.chatgpt.site). Companion: [Quantum CAPTCHA](https://bus-search-quantum-lab.syrupyspool2.chatgpt.site). Exact deployed source/status and proof are in [publication-receipt.json](../docs/history/publication-receipt.json); local changes are not evidence of a hosted update. Preserve crowd Sites ID `appgprj_6ac9ed0456008191aafac54f8d5af4d1` and its owner-private audience.

## Run and reproduce

```powershell
node serve.mjs
node --test tests/*.test.mjs
node model/build-depth-bands.mjs legacy
node model/build-depth-bands.mjs magic-arena
node model/build-depth-bands.mjs qualicity-queue
node model/audit-depth-bands.mjs legacy magic-arena qualicity-queue
python model/package-depth-bands.py
```

The new trained model has its own [portable corpus/training commands and model card](model/current-qnn/README.md). The [Qiskit companion](qollab/README.md) reproduces the saved circuit and a compact held-out feature table locally. No platform upload is required to inspect either package.

Open `http://127.0.0.1:4174`. The website is static HTML/CSS/ES modules, artwork and frozen model JSON in `dist/`. No backend, API keys or quantum hardware are required. The website has no npm dependencies; native builders/tests need `@napi-rs/canvas` or the available Codex bundled runtime. ZIP packaging uses standard Python. See the audit script for optional output paths.

## Whole-object depth bands

Festival was implemented and tested first: **24 curated cutouts in 15 bands**. Arena and Queue each have **10 objects in 6 bands**. Each has a transparent `objects-only.png` with no ground outside retained silhouettes, registered object PNGs, full-512px band/mask PNGs, hashes, membership and a downloadable pack.

Objects are grouped by `floor((alphaBottom - 1) / 16)`. Their complete silhouettes remain intact even outside the nominal horizontal level. A band's anchor is its maximum member bottom at alpha >32. Lower target feet draw in front; equal or higher feet draw behind. Grouping can move an individual transition by up to 15px. These are approximate authored masks of selected objects, not complete automatic segmentation or 3D geometry. The original background supplies the ground when reassembled. [Source/license/band contract](docs/BUSY_SCENES_AND_BANDS.md).

## Soft field and exact quantum state

In the default QNN mode, the display begins with the actual learned window scores across the opaque final scene, then blends them with a Gaussian display of simulated Born probabilities. Default playback takes about eight seconds after recognition on 4,096 addresses; slower, instant and reduced-motion paths are available. Peak softness, amplification emphasis and color exposure are display controls only. The separately selected template comparator retains its raw resemblance display pass, without using that pass to build the oracle.

Classifier scores and resemblance are not calibrated identity probabilities. Smoothing and transitions between stored rounds are presentation interpolation. Grover treats accepted addresses equally and does not spread toward neighbors. Exact signed amplitudes, unsmoothed Born probabilities, the convergence curve, integer-round inspector and measurement remain available. Sampling never uses the soft field. [Implementation](dist/search-field.js) and [tests](tests/search-field.test.mjs).

## Detector and evidence

The default fine finder uses a **trained four-qubit, four-layer QNN** on 4,096 image windows. Seven pixel-derived color/stripe/centering features and the supplied target height enter its saved variational circuit; seven expectations feed a learned sigmoid readout. Both quantum rotations and readout are trained. It receives final scene pixels and the selected size, with no target PNG pixels, clean background, inserted coordinates, presence or visibility truth. Threshold and local suppression alone define accepted locations; there is no template fallback. [Architecture and evaluation protocol](docs/CURRENT_QNN.md), [browser inference](dist/qnn-localizer.js).

The supported domain is this striped artwork, the three built-in scenes and the editor's supplied sizes. Training with sizes is separate from estimating an unknown size or recognizing arbitrary people. Imported backgrounds are outside the trained domain. Imported target PNGs visibly select the classical template comparator, which uses the supplied PNG and a declared clean-background reference. Empty oracles abstain; Grover amplifies the accepted predicate, including errors. Circuit scoring and Grover state evolution are classical simulations; no end-to-end quantum vision speedup is established.

The primary released model is fitted on fully visible targets. Its reserved test uses disjoint target-center partitions on the same known artwork. The separate predeclared engineering audit covers300 clean placements,540 historical band crossings,12 empty scene/size calls and three earlier layered defaults. Its geometry includes training-coordinate classes and is not a strict840-case training holdout. Training-window accuracy, accepted-point localization, false points, visibility strata and exact sampled probability are distinct quantities. Read the model metrics and completed audit for actual results.

Reserved test: **223/250 complete QNN detections (89.2%)**,25 abstentions and2 out-of-tolerance points; matched logistic221/250,29 abstentions and0 false points. Both reject all12 known-background absence calls. QNN test-window positive recall81.8% and accepted precision99.27%; these are same-art, supplied-size results. Weights/threshold were frozen before this test and remain unchanged. [Metrics](model/current-qnn/current-qnn-metrics.json).

Historical template decoded-band audit: **205 in-bounds probes**, after two rejected placements; 194 above the 1% alpha-mass visibility convention; **117 accepted-point hits, 77 visible misses**, 11 less-visible abstentions and zero incorrect accepted points. All three empty stacks reproduce their base exactly and accept no point. All 27 stored bands exactly match rebuilt source-member RGBA. These are same-asset engineering probes at height52/threshold.45/grid64 for the classical comparator, not new-QNN accuracy or estimates of sampled success. [Report](model/depth-band-audit.json) and [audit](model/audit-depth-bands.mjs).

Earlier scopes remain historical: 169 probes use the prior per-object architecture and twelve Festival objects; 2,064 painting probes use the archived picker/manual depth. Their rates are not a direct improvement comparison with new bands. [Earlier evidence](docs/FINE_SEARCH.md).

The frozen four-qubit QNN is available with Original Festival and the original explorer only. It has 40 fitted slots, including four prediction-insensitive final RZ slots; 36 remaining slots do not imply independence. Same-art patch accuracy is99% on600 held-out examples; the matched nine-parameter logistic baseline is99.67%. Neither benchmark validates new scenes, uploads or person identity recognition. Production weights are unchanged. [Model card](model/MODEL_CARD.md), [baseline](docs/BASELINE.md), [parameter audit](model/hybrid-parameter-audit.json).

## Continued work

Code/docs are MIT; artwork retains separate licenses/attribution. Uploaded images stay in the browser. The user requested continued iteration **without submission**. Contest uploads, public source/video and submission materials remain withheld. [Canonical state](../bus-search-lab/docs/PROJECT_STATE.md), [handoff](../docs/history/LAYERED_SEARCH_HANDOFF.md), [rubric](../bus-search-lab/docs/RUBRIC.md).
