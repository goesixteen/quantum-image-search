# Hourly run log

## Crowd iteration 19 — October 11, 2026

Private source `002574d248d81237e542b0c954185213eda9208a`, deployment `appgdep_6acbd4091a308191aa1ede8ca65c2675`,
version `appgprj_6ac9ed0456008191aafac54f8d5af4d1~appgver_5daa63b3a8bc819181549750493a7a87`:
terminal succeeded on the original owner-private crowd Site. The welcome
greeting is a speech bubble; a UI-only raised-hand sprite shrinks for 190ms,
hangs at the pointer and trails movement with a damped swing. Captured pointer
events own the mouse/touch/pen gesture. Early release completes pickup before
placing its rendered body center; outside release cancels, and dragging a
placed target off-map restores the portrait. The placed message is plain text
without bubble fill, outline, shadow or tail. The empty start, five-row picker,
right-hand Find and three-stage lesson remain.

147 Node tests and read-only frozen verification pass. Actual local mouse
shrinking/rotation, searches at (284,260) and (300,228), keyboard/off-map
removal, reduced animation and 320/390px no-overflow checks are documented.
Actual hosted pickup shrank from 240.3px to 81.95px with changing rotation, hidden
source and cleared ghost after early release; placed message is undecorated.
The first arbitrary hosted placement abstained (No match found), retained
without tuning. After reset, hosted keyboard placement was found at (420,300);
dragging that target off-map restored the portrait and greeting bubble. The
warning/error console was empty; empty welcome was restored for review. Read
the current
external handoff, publication receipt, iteration 19 source QA and hanging-asset
provenance. Retained animation/tool failures remain in QA. Physical touch/pen,
multi-touch, OS reduced-motion preference and novice learning remain untested.

The new pose never enters inference. The standing PNG, five scene assets,
frozen model/threshold, reserved results and known Park/rendering failures are
unchanged. No retraining, reserve rerun or new accuracy claim. Schoolbus and
both owner-private Site identities remain unchanged. No contest or public
source/video/Qollab publication. Ongoing private GitHub development sync is
authorized; its receipt identifies the actual pushed commit separately.

Next: improve the next observed gesture/usability gap, exercise physical touch
when available and privately time a spoken intro. Preserve the same technical
stages and frozen evidence. Zero agent resets consumed; one remains at the
latest observation for the user. Read the resource ledger; the earlier account
change had an unknown actor/cause. No agent reset or billing change occurred.


## Latest steering — October 10, ~04:17 ET

The user explicitly said: “dont submit any of the work” and “just keep iterating improvements.” No contest submission was made. Subsequent work continues on UX, training/evaluation, and fair comparisons. Submission and public submission-material publication are withheld for the user. Both existing Sites stay owner-private.

Latest resumed steering after the usage interruption prioritizes **finer crowd-search cells, signed-amplitude/probability maps, multiple backgrounds and target images, foreground occlusion and drag/drop**. Prefer existing open-source artwork over AI imagery where practical and use a red/white striped standing figure. The resumed default is classical known-template matching with a declared clean-background reference; the trained original-art QNN remains a separate preserved mode.

## Run 01 — October 10, 2026, started approximately 03:15 ET

### User steering incorporated

1. Use a real schoolbus PNG over a real street photograph.
2. Repeatedly inspect streamlined interaction and the actual official judging rubric.
3. Center the main site on solving the image CAPTCHA-style challenge.
4. Produce a separate Waldo-style finder so the user can compare both deliverables.
5. Make sustained progress and preserve durable notes for hourly continuation.

### Bus website and illustrated-domain model

- Built Quantum CAPTCHA as a static interactive website with drag/click placement, uploads, 4 × 4 and 8 × 8 grids, heatmap, target absence, threshold/iteration controls, exact amplification curve, repeat sampling, scores, math, and evidence.
- Froze a four-qubit, four-layer QNN with 40 parameters and threshold 0.28. Held-out 2,000 synthetic patches: **96.95% accuracy**; same-feature logistic baseline: **95.10%**. Dense boundary audit: **3,993/4,096** predicate hits (97.49%), retaining 103 misses.
- Implemented Grover and 13 Node checks. Python/JS parity is within 1e-15. Independent PennyLane 0.45.1 comparison of 32 QNN vectors and six Grover cases agrees within 3e-16.
- First illustrated browser search: one mark among 64 regions, six rounds, about 99.66% marked-set probability, and a bus-overlapping sample. Repeat measurement worked. Empty illustrated scene produced no marks and no forced answer.

### Real-photo model and rendering correction

- Downloaded attributed, licensed real bus/street photographs. Built-in ImageGen extracted the transparent photo-based bus derivative; its returned PNG was kept intact. Source licenses and AI editing provenance are documented.
- Preserved the synthetic model and trained a separate photo checkpoint using a tighter yellow-hue feature prior, hard empty-tile negatives, and threshold 0.61. Failed/intermediate models are retained outside the production selection.
- Final photo evaluation: **98.45% accuracy**, **98.60% recall**, **98.45% F1** on 2,000 held-out composite patches; stress accuracy **95.42%** on 1,200. All splits reuse one bus and one street asset; only placement/augmentation seeds are held out, with some exact negative rasters shared.
- Full-scene audit: **384/384** correct-mark hits on 4 × 4 and **383/384** on 8 × 8; no false tile marks and zero empty-scene marks. One 8 × 8 miss remains documented.
- Browser JPEG downsampling caused **three empty 8 × 8 false positives**. Exporting the exact training-normalized **512 × 512 street PNG** and drawing it 1:1 resolved them. Final browser empty checks passed both grids. A free position crossing a 4 × 4 boundary produced two overlapping marks and a correct sample.
- Photo feature parity is exact; prediction parity is within 3.82 × 10⁻¹⁷ and derivative/parameter-shift agreement within 6.46 × 10⁻¹⁶. A 390-pixel browser viewport had a 375-pixel document width and no horizontal overflow.

### Separate crowd website

- Built **Find the Explorer / Search Atlas** with original generated crowd/explorer art and its own trained pixel-feature QNN. The polished independent UI includes snapped/free placement, random moves, removal, both grids, heatmap, threshold adjustment, iteration inspection, repeated measurement, keyboard controls, math, and evidence.
- Its four-qubit, four-layer, 40-parameter model uses threshold 0.22. Train/validation/test contain 1,600/400/600 examples; held-out same-asset patch accuracy is **99.0%**, recall **99.33%**, F1 **99.00%**.
- Small full-scene audits: **20/20** hits on 4 × 4 and **19/20** on 8 × 8; empty crowd rejected on both. Ten Python/JS fixtures have exact feature parity and prediction error below 1.83 × 10⁻¹⁷.
- Browser checks passed default 4 × 4, restored 8 × 8, absence on both grids, random 4 × 4, free-placement keyboard movement, and 390 × 844 mobile rendering without overflow. Browser error logs were empty. **One random 8 × 8 placement missed** and honestly displayed an empty oracle.
- Both model and browser use the exact 512 × 512 normalized crowd, original aspect ratio, and 128 × 128 candidate preprocessing. UI ground truth uses alpha overlap after measurement; the offline audit's coverage rule differs and must be aligned for a shared numerical comparison. See crowd `docs/QA.md`.

### Quantum companion and research appendices

- Built the six-qubit coherent preparation/inverse/reflection experiment and six focused checks. Raw-event probability rises from 27.15% to 99.46%; conditional address discrimination stays invariant. It is not the main sigmoid/threshold oracle or detection accuracy.
- A separate newly trained raw-event classifier reports **92.25% accuracy** on 2,000 held-out synthetic patches at threshold 0.5, AUROC 0.981333, and no sigmoid/readout/bias. It has 32 circuit angle slots, of which four final RZ phases are output-insensitive. Actual coherent preparation/inverse raises global good-event probability **36.91% → 85.67%** and joint bus/good probability **23.26% → 53.98%**, while conditional bus share remains **63.01%**. Artifacts and `docs/COHERENT_LEARNING.md` document this independent appendix; it is not a live UI model.
- Built the self-contained Qiskit/Qollab companion with saved model/features and six Qiskit 2.5.2 checks. It supports injected backend and automatic `main()` behavior and submits exactly one circuit/backend job. **Live Qollab execution remains unverified.**

### Event, documentation, and provenance

- Recovered the actual **Qollab × IonQ** event from prior chats and verified official terms, judging, and runtime docs. Quantum Unlocked is the recommended theme. Four criteria have no stated numerical weights. Public Qiskit project/video, MIT licensing, explanation, support attribution, and disclosures are required.
- Produced research, classical baseline, pitch, rubric mapping, Qollab instructions, coherent appendix, media provenance, comparison plan, browser QA, and the canonical state handoff.
- Original implementation, training, interfaces, generated assets, tests, and docs were developed in this run with AI assistance. Prior-chat research informed framing. Papers, framework APIs, and real-photo authors/licenses are credited separately.

### Confirmed hosting and handoff

- **Bus deployed, owner-private:** https://bus-search-quantum-lab.syrupyspool2.chatgpt.site ; preserve project `appgprj_6ac9e65f76c48191b8d53784212b5f4c`.
- **Crowd deployed, owner-private:** https://quantum-crowd-search.syrupyspool2.chatgpt.site ; preserve project `appgprj_6ac9ed0456008191aafac54f8d5af4d1`. Successful deployment `appgdep_6ac9f27d429081918a247f1e7ba6ddab`, source commit `89071afadc1b48db29627f0bb3980c704190d53c`.
- Windows publishing used the official Sites validator and an archive of exact pushed Git HEAD because the standard static packager required unavailable Bash. Proof screenshots and any subsequent documentation publication are recorded by the publishing workflow.
- Stop temporary local preview servers after handoff. Future local work starts `node serve.mjs` again; no lingering session is required for either hosted site.
- Private Sites access does not satisfy public Qollab/video requirements. Live Qollab Run, public source accessibility, final public project/video, account/team eligibility, and actual captain submission remain unverified.

### Next hourly step

This earlier end-of-run plan is superseded by the user's no-submission instruction and Iterations 02–03 below. Retain both private demos, improve their usability/evaluation, and keep SDK/project/video preparation local. Do not upload to Qollab, publish submission materials, or submit an entry automatically.

Keep actual completions and failures explicit. Same-asset patch accuracy does not prove general recognition; marked-set probability is not target accuracy; ideal query counts are not an end-to-end runtime speedup.

## Iteration 02 — October 10, 2026: usability, matched baselines, and independent-photo failures

### Authorization and deployment scope

The user said **“dont submit any of the work”** and **“just keep iterating improvements.”** This iteration made no Qollab uploads, public source/video publication, or contest submission. Local development, tests, research, asset acquisition, and evidence continue. Both existing Sites remain owner-private with their original IDs and URLs. A private update of the verified local changes is pending separately; it is not recorded here as succeeded.

### UX and honest evaluation

- Moved the mobile Solve CAPTCHA action and immediate feedback below the bus canvas; Enter on the canvas starts the search. Latest 390-pixel mobile QA has no horizontal overflow.
- Standardized current bus/crowd UI ground truth to **any inserted alpha >32 foreground pixel in a tile**. Alpha remains independent evaluation metadata and never enters the learned predicate. Added a true-target probability field alongside marked-set probability.
- Added an optional independently photographed Emeryville stress preset, retaining production model weights/threshold/features. Street credits switch with the preset. Default Covington empty 4 × 4 and 8 × 8 scenes still produce zero marks.
- Actual empty Emeryville browser checks found **four false marks on 4 × 4** and **eleven on 8 × 8**. With four marked regions among sixteen, one Grover round gives **100% accepted-set probability and 0% true-target probability**. The interface exposes this as oracle failure, not successful localization. Pillow gives five 4 × 4 false marks because patch resampling differs; 8 × 8 matches.
- **Seventeen Node tests passed**, including the alpha-mask evaluator. Same-input-pixel numerical parity does not imply identical Canvas/Pillow resized pixels.

### Matched classical comparisons completed

- The photo nine-parameter logistic baseline uses the same eight features, exact splits, and validation-only fitting/selection as the frozen QNN reference: **99.25% versus 98.45%** held-out accuracy; **97.08% versus 95.42%** stress accuracy. It has zero false marks on the included empty street and 384/384 target-mark hits on both paired scene grids. See [PHOTO_BASELINE.md](PHOTO_BASELINE.md).
- The crowd matched logistic baseline reaches **99.67% versus 99.0%** held-out accuracy. It has zero empty crowd marks and 20/20 target-mark scene hits on both grids; the QNN retains its 19/20 8 × 8 result. See the [crowd baseline](../../waldo-search-lab/docs/BASELINE.md).
- These examples have no observed QNN accuracy advantage on photo/crowd tasks. Families, optimizer/search budgets, and nominal parameter counts differ; neither benchmark proves a quantum runtime or capacity advantage.

### Independent assets, frozen audit, and rejected training experiment

- Acquired Payton Chung's independent Emeryville street and Daniel Oines's independent Blue Bird Vision photo, both CC BY 2.0, plus a separate McGhiever Sauk Centre street under CC BY-SA 4.0 for training. Sources, hashes, normalization, roles, and approximate bus bbox are in [UNSEEN_ASSETS.md](UNSEEN_ASSETS.md).
- Production photo model SHA-256 remains **`a2466f8f29da4dccd7f2834c019d3fe291796cb204839e9f9a2e4c77265ae069`**. Frozen Emeryville Pillow empty marks are **5/16** and **11/64**. Across 384 placements per grid, target-mark hits are 375 and 383, but **complete-scene success is 0/384 on both grids** because false marks persist.
- A separate Covington+Sauk candidate uses no evaluation assets in fitting/validation/selection. It improves matched mixed-background accuracy **88.00% → 90.85%**, stress **85.67% → 86.00%**. Emeryville empty false marks decrease **5→3** and **11→10**, but complete scenes remain zero, target-mark hit counts decrease, and default-scene regression does not justify promotion. It is retained as `negative-mix-candidate.json`, **`readyForDemo:false`**; production is unchanged.
- The independently photographed bus's known-ROI thumbnail yields **eight all-zero features**, frozen score **0.00629349**, candidate score **0.00515265**. Both reject it. The strict color/shape preprocessing discarded evidence; extra QNN depth or Grover cannot recover a distinction absent from the encoded features.
- On the same unseen street the frozen photo logistic model has fewer false marks (**0/16**, **1/64**) but still fails some 8 × 8 scenes. This is one independent identity check, not general photographic recognition. [UNSEEN_EVALUATION.md](UNSEEN_EVALUATION.md) and [PHOTO_BASELINE.md](PHOTO_BASELINE.md) report complete scenes and true-target mass separately.
- These independent assets are now inspected **diagnostic fixtures**, not untouched future tests. Reserve new photo identities before evaluating a redesign. Repeated placements are not independent photographs.

### Coherent research status

The separate three-copy, **14-qubit coherent-majority appendix is implemented and locally verified**. It uses the frozen raw-output model and four synthetic examples, with an actual three-CZ majority phase reflection and no intermediate measurement/threshold. The majority predicate `q=3p²−2p³` changes acceptance quality: compared with the single-copy first peak, good-event probability is **85.67% → 91.52%**, conditional bus share **63.01% → 72.60%**, and joint bus/good probability **53.98% → 66.44%**. Amplitude amplification itself still preserves each predicate's internal address weights and can amplify systematic wrong-side errors.

Resources rise **6→14 qubits**, **178→530** abstract preparation primitives, and **534→1,590** first-peak preparation operations before hardware decomposition. Five independent tests and verify-only passed; maximum recorded error is **3.77 × 10⁻¹⁴**. [COHERENT_MAJORITY.md](COHERENT_MAJORITY.md), `model/coherent_majority.py`, `model/coherent-majority-results.json`, and `tests/test_coherent_majority.py` contain the evidence. The live UI/model is unchanged. This fixture-level research result is not broad recognition, a coherent sigmoid-threshold oracle, or a speedup claim.

### Next iteration

This historical plan was carried out or superseded by Iteration 03 below: a versioned illumination-aware extractor, locked fresh-identity evaluation and expanded crowd audit. Both photo candidates were rejected; production was preserved. External submissions/public materials remain withheld; SDK and draft preparation stay local unless the user later explicitly authorizes otherwise.

## Iteration 03 — October 10, 2026: oracle teaching, expanded scene evidence and rejected photo v3

### Authorization and review-site scope

Continued the user's **no-submission / keep-iterating** instruction. No Qollab upload, public project/source/video publication or contest submission was performed. Both owner-private Site identities and production checkpoints were preserved. The final private deployment update is pending its external receipt; root QA/handoff records that outcome, not this local completion log. Do not infer the new hosted source from an earlier deployment receipt.

### Constructed lesson and two-demo comparison

- Added the shared **Confident search. Wrong answer?** lesson: a constructed accepted set, target/absence controls, false-positive count, grid/round controls and a local comprehension quiz. This lesson supplies teaching cases independently of the image classifiers.
- Three golden-case checks establish one target plus three false positives at N=16 gives **100% accepted mass /25% target mass**, four false positives with no target give **100% /0%**, and missed/empty targets follow the declared residual-probability/abstention rules. The bus Node suite now has **20 passing tests**.
- Added `dist/compare.html` on the bus site, linking both independent demos and showing named feature/data domains, matched baselines and scientific boundaries. Different datasets are explicitly unsuitable for ranking the websites by aggregate accuracy.
- Added crowd **Boundary challenge**, reset and inline mobile feedback. Two named known-present boundary fixtures were replayed in the browser and produced empty oracles at the unchanged threshold on both grids. Full browser results and final hosted receipts belong in root QA.
- Prepared [ORACLE_LESSON.md](ORACLE_LESSON.md) and a [local-only demo storyboard](DEMO_STORYBOARD.md). The quiz records no telemetry and establishes no measured educational effect by itself. Nothing was submitted or recorded/published as a public video.

### Expanded frozen crowd audit

- Evaluated **384 predefined nominal and 384 stress probes per grid**, using the same original character/crowd, frozen weights/thresholds, Pillow rendering and evaluation-only alpha >32. Nominal QNN true-mark hits are **356/384 at 4 × 4** and **345/384 at 8 × 8**; logistic is **384/384 and 365/384**. Both have zero nominal false marks. Nominal 8 × 8 contains **369 unique geometry configurations**, with 15 repeated corner probes retained as the declared weighting. Deduplicated sensitivity is **330/369 QNN /350/369 logistic**; none of these counts implies independent scene identities.
- Under separate 8 × 8 scale/brightness stress, QNN has **132/384 clean hits** versus logistic **189/384**. A clean hit means a true accepted tile with no false accepted tile. It is not a measurement-success count. Brightened 8 × 8 crowd reveals a QNN background false mark despite high accepted-set probability.
- Reports distinguish exact target mass from accepted-set mass, one seeded sample and 64 repeat samples; empty oracles contribute no output. Six focused tests, eight-record uncached/seeded/source replay and 24 hard RGBA-patch JS parity checks pass (error below 9e-16). Native browser confirmation covers the two named boundary fixtures, not every aggregate Pillow result.
- [SCENE_AUDIT.md](../../waldo-search-lab/docs/SCENE_AUDIT.md) preserves protocol, denominators, failures and the matched logistic comparison. These samples reuse the same art identities and do not establish new-person recognition. The completed audit becomes inspected development evidence for future redesigns.

### Illumination-aware photo v3 and failed usability gate

- Built a separate `photo-relative-v3` eight-feature representation, matched four-qubit QNN and nine-parameter logistic candidate, using only the original cutout on **Covington + Sauk Centre** for fitting/validation. Production browser features and saved checkpoints are unchanged.
- Relative warm-color/dark-shape features retain evidence under controlled dimming and eliminate the demonstrated literal all-zero positive collapse in audited training/validation examples. This does not prove separability or illumination invariance under clipping, gamma, noise or unknown photographs.
- Predeclared scene validation requires zero false marks across **144 empty scenes** and false-mark contamination in at most 1% of **512 target scenes**. Thresholds **0.95 QNN /0.94 logistic** satisfy that budget but complete only **76/512 /4/512** target validation scenes; test recall is **17.6% /4.1%**. Unconstrained validation frontier peaks are only **24.22% /23.05%** complete scenes. No useful operating point was found.
- Exact-feature collision/frontier analysis was performed on training/validation data before fresh disclosure. Absence of exact opposite-label collisions is not a guarantee of practical ranking. Post-freeze default/boundary regression rejects the ordinary default placement; neither candidate is promoted. Both remain **`readyForDemo:false`**.
- Python/JavaScript identical-pixel feature/prediction parity passes. [PHOTO_V3.md](PHOTO_V3.md) and the separate candidate/metrics/audit artifacts document this completed rejected experiment.

### Locked primary identities and reserved later holdback

- Acquired **two new streets and two new bus photos**, with real-photo licenses, authors, download URLs, original hashes, normalized rasters and loose native boxes. A further street/bus pair remains steward-only and unscored.
- Verified the **09:14:56 UTC** feature/model/threshold/renderer/protocol freeze and all **21 frozen file hashes** before disclosing the primary a/b identities. Initial message disclosure preceded the trainer's approximately 09:19 audit command; exact message seconds were unavailable. The sanitized inventory's 09:20:14 timestamp is explicitly its record-creation time, not an invented disclosure timestamp.
- Frozen fresh South Lancaster/Buffalo evaluation has zero empty false marks on both grids, but just **61/512 QNN** and **3/512 logistic** complete target scenes. QNN has **451/512 empty foreground oracles**, logistic **509/512**. Two fresh known-ROI bus thumbnails have nonzero features; both models reject both at the frozen thresholds. Loose boxes/crops are recognition probes, not segmentation or whole-photo localization proof.
- [ITERATION_03_ASSETS.md](ITERATION_03_ASSETS.md), sanitized `primary-release.json` and frozen fresh report preserve provenance and scope. Asset integrity verifies six originals, exact derived RGB/crop geometry and all frozen experiment files. The primary four are now diagnostic fixtures; they must not be described as fresh future holdouts again. The c pair stays excluded from model-team inspection and selection until a later complete freeze.

### Architecture honesty and rubric check

- Read-only audit of all three live hybrid QNNs confirms **40 nominal fitted slots**, comprising 32 angles, seven readout weights and a bias. **Final RZ slots 25, 27, 29 and 31 are prediction-insensitive**: they change basis phases, the final actual CNOT ring `0→1→2→3→0` permutes basis amplitudes, and Z-product readouts depend only on probabilities.
- **36 remaining slots influence predictions in the audited circuit**; no independence, identifiability or 36-dimensional function-family claim follows. No checkpoint was modified. See [hybrid-parameter-audit.json](../../waldo-search-lab/model/hybrid-parameter-audit.json).
- Rechecked current official Qollab pages: the same four criteria remain, with no published numerical weights. The constructed error lesson, matched benchmarks, rejected-candidate transparency and reproducible identity lock strengthen the educational/analytical story. No judging score or educational outcome is claimed.
- Root final local checks passed **20 Node tests**, **61 scoped static references/imports**, both 390-pixel mobile views with 375-pixel documents and no overflow, the 64-region one-target lesson at approximately 99.66% after six rounds, and empty-lesson no-output behavior at zero rounds. Detailed proof belongs in [ITERATION_03_QA.md](ITERATION_03_QA.md); deployment remains pending its receipt here.

### Next hourly priority

This historical plan was interrupted and is superseded by the resumed crowd priority below. Preserve the saved feature research and working checkpoints. Keep the c-labelled pair steward-only; platform uploads, public submission materials and entry remain withheld.

## Iteration 04 recovery and resumed layered crowd editor — October 10, approximately 17:42–18:00 UTC

### Recovery facts and authorization

- The earlier Iteration 04 began at 09:56 UTC and stopped at a reported usage limit. Read-only recovery inventoried saved evidence without opening reserved photo identities/pixels. The latest successful private update was actually **Iteration 03**, confirmed in `outputs/publication-receipt.json` at 09:36:31 UTC: bus `appgdep_6aca06d97cf4819191d7cd98c5a80355`, crowd `appgdep_6aca06e69354819195cd5c4266a6205a`. This resolves earlier log entries' pending wording.
- Saved photo-v4 metrics do not support promotion: QNN threshold 0.995 has 1/144 false empty validation scenes, 7/512 complete target probes and 0.4% test recall; logistic threshold 0.99 meets the false-mark budget but has 17/512 complete target probes and 7.0% test recall. Final exact freeze/model-card/parity-verification files were absent at recovery and this documentation check. Production models remain unchanged; c remains closed.
- Hypothetical reliability mathematics and 889 statevector checks survived, but served module/results files and the explanation document were initially absent. The subsequent local repair copied exact frozen bytes to both served paths and added [ERROR_PROPAGATION.md](ERROR_PROPAGATION.md). All20 served scenarios match; local headless Edge normal/perfect/absent checks had no page errors and both resources returned HTTP200 byte-identically. Hosting remains pending its new receipt. [SESSION_RECOVERY.md](../../waldo-search-lab/docs/SESSION_RECOVERY.md) records the initial gap and repair.
- User steering now prioritizes the crowd editor and existing open artwork. **No contest submission, Qollab upload or public submission materials** were produced; the root workflow may update existing owner-private review sites after QA. No reserved asset was disclosed or inspected for this work.

### Open artwork and licensing

- Acquired a Commons-hosted **3840×2769 Bruegel Children's Games JPEG** (2,966,195 bytes), marked PD-Art/Public Domain Mark, and a museum-hosted **843×565 Seurat La Grande Jatte JPEG** (197,727 bytes), declared public domain by the Art Institute's API. Exact observed image URLs, collection credits, download times and SHA-256 hashes are recorded. Both downloaded rasters remain unchanged.
- Preserved Laura Dworatschek's **OpenMoji person standing, 1F9CD** SVG and made a native SVG clothing adaptation: red/white stripes clipped to its original body silhouette, blue trousers and portrait intrinsic dimensions. It is **CC BY-SA 4.0**; retain source, modification and license links/attribution independently of MIT code. No AI raster generation/editing was used for the new figure.
- SVG validation confirms the body clip matches the original, local references only, and no scripts/external imagery/events. [OPEN_ART.md](../../waldo-search-lab/docs/OPEN_ART.md) and the new open-art acquisition/provenance files are the asset authority. Original generated festival/explorer art is retained for its frozen QNN benchmark.
- Root rendered the adapted SVG to a transparent 230×600 PNG. The first native render omitted its pattern fill, so root replaced the vector shirt fill with a white base and five explicit red rectangles under the same clip, rerendered and visually verified the stripes. Current provenance hashes identify the final SVG/PNG; any earlier yellow-shirt browser result is preliminary. No AI generation or subsequent raster edits were used.

### Local layered editor and fine search

- Implemented 512px layered scenes, named foreground PNG-equivalent cutouts derived from registered background pixels, target-behind/in-front stacking, custom paint/erase masks, target/background local uploads, drag/drop, keyboard movement/Enter, target-size control, fine grids, PNG/composite/layer-data downloads, reset and remove/random placement.
- Fine **16×16 /32×32 /64×64** mode searches target center-point addresses with **8/10/12 simulated address qubits**. Target display size is separate from grid pitch. The custom classical pixel matcher uses final RGB, the supplied known-size template and clean background RGB, without target coordinates/presence/occlusion truth. Retained threshold-qualified peaks undergo nearby suppression and construct the accepted set; an empty set abstains without forced argmax.
- Kept the saved four-qubit QNN separately available only for its original character/crowd pair at 4×4/8×8. Original patch metrics and expanded nominal/stress audit evidence describe that model, not the new template matcher or open artwork. All three trained checkpoints are preserved.
- Labelled detector scores, signed Grover amplitudes, Born probabilities, accepted-set mass and independently evaluated target mass separately. Fine truth uses refined-center error against the rendered rectangle anchor, with a displayed half-cell-diagonal plus1px tolerance; coarse QNN truth retains alpha>32 tile overlap.
- Remaining/full alpha mass is the UI visible-fraction measure; a>1% convention gates point evaluation. Occlusion comes from actual upper layers. Visibility annotation is independent evaluation data, never a matcher input. Fully hidden/absent cases cannot acquire a coordinate oracle from renderer metadata.
- Local-only file decoding uses object URLs/canvas pixels. Source review found static asset/model GETs and no file-content transmission; dynamic browser checks remain pending. Known clean-background access is an explicit assumption of this compositing experiment.

### Verification and remaining status

- Independently ran the crowd Node suite at approximately 18:00 UTC: **26/26 tests pass**, consisting of 14 layer/compositing checks and 12 matcher/search checks. Original-art matcher fixtures locate 24 integer placements per fine grid, zero false marked points and 0px refined-center error. Separate fractional resampling stress locates only **1/3**, preserving two threshold misses. Original-art partial/extensive occlusion fixtures retain a match at 29.801% covered pixels and abstain at 92.185% covered pixels; no general robustness claim follows.
- Read-only scientific review confirms pixel/truth separation, retained-peak predicate, known-background scope and empty-oracle behavior. The webpage predicate equation must refer to retained accepted peaks after suppression, rather than every threshold-passing score. Source size/parity and actual browser antialiasing can change outcomes; new assets need new checks.
- **Actual new-editor browser QA and owner-private deployment remain pending root's final evidence.** The previous Iteration 03 receipts remain the last confirmed hosted state. [LAYERED_SEARCH_HANDOFF.md](../../LAYERED_SEARCH_HANDOFF.md) is a draft for root to finalize; it must not imply the new editor is already hosted.

### Next hourly action

Complete browser/open-art/editor checks and record the private receipt first. Then lock a structured scene/target/size/occlusion/absence audit with explicit center error, false peaks, abstention and true-target mass. Preserve fractional and heavy-occlusion failures; distinguish classical template matching from trained QNN research. Use [NEXT_STEPS.md](NEXT_STEPS.md) for the current sequence. Keep c closed, source/asset licenses explicit, and all submission/public materials withheld.


## Completed layered-editor step — 2026-10-10 18:20:10 UTC

The preceding resumed draft's browser/private-publication TODO is resolved for the crowd site:26 Node tests,2,064 native audit probes and final in-app-browser checks completed. Existing owner-private deployment **appgdep_6aca8173567481918885735d43c44972** succeeded from source **6938f0974fc6e8e0af0e701ee66f8ff114603152**. Read [the finalized handoff](../../LAYERED_SEARCH_HANDOFF.md) and [actual browser observations](../../waldo-search-lab/docs/LAYERED_BROWSER_QA.md). The bus hosted version is unchanged; repaired reliability dependencies are local and unpublished. Production models and reserve assets are unchanged. Retained previews remain running for this visible review. No hackathon submission or public sharing.

The next work is heavy-occlusion/registration robustness under a declared protocol and user-browser checks of tray drop, brush and data-URL downloads. Preserve435 visible misses in the frozen report rather than promote a guarantee.

## Iteration 06 — whole-object bands and soft field (October 10, ~19:30 UTC)

Built on the completed layered editor and the user's clarified lower-feet=in-front rule. Replaced the two painting picker entries with David Revoy's CC BY4.0 Magic Arena and Coronation Queue panels, preserving source JPEGs and declared crop coordinates. Original Festival retains the frozen QNN benchmark and was tested before the two new scenes.

Expanded Festival to 24 complete object PNGs; constructed transparent ground-free copies and full-object 16px foot-level bands (Festival15, Arena6, Queue6). Source pixels and full silhouettes remain registered; no straight line cuts through an object. Maximum member alpha>32 bottom controls stacking, with equal bottoms foreground-front. Masks are approximate selected objects, not complete segmentation. Independent native decoded-PNG audit preserves 205 in-bounds probes,117hits,77visible misses,11less-visible abstentions,0falsepoints; all3empty stacks and27band reconstructions pass. Previous per-object/painting protocols remain historical.

Added an actual raw pixel-resemblance scan for display, Gaussian gradients/contours, cinematic~8sstate playback, softness/emphasis/exposure controls, and separate exact maps/measurement. The extra4096raw center tests are disclosed; their marks are unused. Display interpolation does not imply quantum spatial diffusion. A review caught and fixed cancelled-frame races. No frozen classifier/oracle/quantum core parameters were tuned.

Validation:60Node tests pass. Festival default/musician-crossing, Arena, Queue abstention/visible placement, uploads, absent target, native tray drag, custom paint/clear, animation cancellation, original QNN4x4 and390pxviewport pass. Native ZIP (24object/15band/atlas) and layerJSON downloads passed. All174static references and7relative imports resolve. Published pushed SHA deb635994bb72097b7b508abc20a4b1fd23f5a94; private deployment appgdep_6aca912d26308191beb39805cbe4b61d succeeded at19:25:43UTC, saved version appgprj_6ac9ed0456008191aafac54f8d5af4d1~appgver_e2d25597238c8191a47ec716d6aa5475. Credential expired before the first helper attempt; it was renewed without any source mutation, then push/package succeeded. A fresh authenticated hosted tab verified the new picker/default band search/soft field and no errors; old-tab caching immediately after deployment was not treated as success proof. Hosted screenshot and exact receipt saved.

Rubric check: clearer educational contribution for Novelty & Creativity, actual layer/field execution and disclosed classical costs for Technical Execution, explicit bounds on Impact claims, and reproducible failure/provenance/audit records for Documentation Quality. No new judging weights or quantum/person-recognition advantage were invented. Existing private audiences preserved; schoolbus live revision unchanged. No Qollab/contest upload or public source/video/submission material release.

Continue from ../../LAYERED_SEARCH_HANDOFF.md and ../../publication-receipt.json. User instruction remains: keep iterating, do not submit work. Current preview processes are retained for review, not duplicated.

## Iteration 07 — stronger scene field opacity (2026-10-10T19:57:19.315Z)

Answered the shared-field question: matching Soft search field selectors use the same computed raster; their backgrounds, alpha and contours differ, and selectors are independent. Increased only the scene soft-field/raw-resemblance multiplier from0.58to0.90, keeping intensity-dependent alpha/transparent zeros and explanatory0.94. Initial candidates and final peak are clearer. Local round0/50 and default search, syntax and whitespace checks passed; no new tests mirroring a cosmetic constant. Prior60tests/native audits remain unchanged historical evidence.

Published exact pushed source ed3521866bc46bb68b579dbd35a383e073fc5007 through existing owner-private Site; deployment appgdep_6aca9831f3008191a6e7b27d6df51fdd succeeded. An older hosted tab initially retained prior alpha; fresh hosted tab verified the new candidate and final fields, default0pxerror/94%visibility/99.99%accepted mass and no console errors. Saved both hosted proofs, updated receipt/handoff/state/archive. This strengthens demo readability for Technical Execution and educational presentation while preserving scientific disclosure for Documentation Quality. No model, oracle, search state, artwork, bus deployment, audience or contest submission changed.


## Trained striped-person QNN default — 2026-10-11T02:33:48.222368+00:00

**Latest completed step, 2026-10-11T02:33:48.222368+00:00:** the crowd default is now genuinely trained-QNN powered and privately deployed from `1448ac24789ffd2ac3e8ce899268fd8abd755a25`. This supersedes historical classical-default statements below. User relaxed occlusion work; target starts fully visible.4 qubit / 4 layer / 4,096 window inference uses final pixels+supplied size, with no template/background/truth gate. Reserved test223/250complete versus logistic221/250;25 QNN abstentions and2 wrong points retained. Separate native audit232/300 clean and203/540 historical stress hits;12 wrong points/11 scenes and all12 empty abstentions.74 Node/9Qiskit tests,parity/replay,desktop/mobile/uploads/drag/cancellation pass at documented scopes. The24 pxFestival browser miss remains. Both private identities preserved; bus live revision unchanged. No submission. Read [current handoff](../../CURRENT_QNN_HANDOFF.md), [model protocol/results](../../waldo-search-lab/docs/CURRENT_QNN.md), and [actual receipt](../../publication-receipt.json). Older dated sections are history.

RejectedV1,V2,V2b,mixedV3 before opening final test/audit; clean-front V3 selected on validation then frozen. Saved36optimized/40 exported slots. Retained all new misses and close point errors. Private Site deployment succeeded,actual hosted QNN proof saved,sourceZIP rebuilt. Contest/public publishing withheld.

## Future iteration direction — October 10, 2026 (America/New_York)

Saved the user's two-part Where’s Wanda brief: interactive-only female striped-character demo with five same-scale busy crowd backgrounds, followed by an approachable interactive image → QNN → Grover explanation. AI/open artwork is now acceptable. Recorded estimated planning weights (30/35/25/10), clearly not official. Independent technical plan review clarified reduced-state Bloch vectors, full-state entanglement/correlations, faithful rotations/CNOT transitions, separate classifier/location registers and display-only smoothing. New assets require new-domain training; prior 223/250 remains historical evidence. No new site/model/assets are claimed in this planning step. Preserve private review updates and no-submission instruction.


## Wanda first completed iteration

**Latest completed step — 2026-10-11T05:08:29.176094+00:00:** Where’s Wanda is implemented and privately deployed from `5a339e2ff0348701e2572d1c796cedd0ec541571`. Five new crowded scenes, a female striped PNG and compact play menu are separated from the image → trained QNN → Bloch/gate → Grover lesson. New-domain frozen test: 298/300 target scenes, 0/25 empty false detections, baseline 299/300; known art and supplied 40–64px sizes only. 92 Node tests, independent actual-state parity, frozen verification and real browser/mobile checks pass. Exact hosting/proof is in [WANDA_HANDOFF.md](../../WANDA_HANDOFF.md) and [publication-receipt.json](../../publication-receipt.json). The prior 223/250 experiment below is historical, not Wanda. Both owner-private identities and the bus live revision are preserved. Do not submit.


## Iteration 10 — 2026-10-11T05:56:31.231419+00:00

Completed guidedWanda lesson, rigorous predicate board and exact run controls; QiskitWanda companion10tests andNode102 pass. Fixed stale build-only measurement text and lesson readiness after loading. Preserved originalweights/threshold/native reserved failures. Paired20-case browser/native audit documents15/15vs13/15target hits,0/5emptyfalse,18/20predicateagreement and no pixelidentity. Initial truncatedPNG transfers were rejected and recaptured fully.

Human steering during work: explained Wanda-specific clue heat versuspersonness; addeddisplay-onlyfaintboost toggle; movedFestivaldefault to420300 andverifiedactualsample. Two-copy native/browserexperiment accepts2420/2786, peaks35instead50, eachprobability0.4999984238883132;10,000drawssplit4987/5013withalloutcomesretained. LatestrequestedabsentFestivalcheckreturns0/4096,no match,round0,samplingdisabled.

Private deploymentappgdep_6acb244d71b08191bf46732484430aed succeeded from65519a96792c5c162028de9047c8455e1b411555; exactreceipt/proofs/sourceZIP are external. Owner/custom1user0groups0externalvisitors confirmed. Bus unchanged; no contest/public submission. Next: novice clarity walkthrough and prospectively frozen renderer/generalization work. See WANDA_HANDOFF.


## Crowd iteration11 — 2026-10-11T06:48:08.132205+00:00

Private crowd commit`af83edd7fa01f026d3df1aa568a740a52495d63b`, deployment`appgdep_6acb2f2906688191babcf44c9b5b3fc1`, succeeded. Park52px curated bystander70.21%unmarked; realWanda420300found. Model/threshold and original298/300 reserve unchanged.114Node tests;125curation/regression checks retained with40/46falsematches and renderer failure. Bus deployment unchanged. Current WANDA_HANDOFF.md/receipt supersede earlier crowd status. Next: single2–3stage underhood, no duplicateheatmap/mainfalse-positiveexercise; optionalevidence. Overnight capone reset, zero used, preserveone; readresourceledger. No submission.


## Crowd iteration 12 — 2026-10-11T07:25:18.690451+00:00

Private source `f5e429a94f885dc8afd1469079ca69f065c8cd56`, deployment `appgdep_6acb38e5baa881919a77eec0bb38408a`, succeeded. Compact three-stage explainer is complete; 120 Node tests and frozen/curation checks pass. Current external handoff/receipt supersede prior crowd status. Bus deployment unchanged. Next: Polish the same three-stage experience with a novice walkthrough and clearer responsive circuit/probability labels. Keep advanced evidence optional. Plan any new rendering/generalization data prospectively before freezing and reserved testing; do not retune the opened Wanda checkpoint. Overnight reset maximum one, 0 used; preserve one. No submission.


## Crowd iteration 13 — 2026-10-11T08:18:24.188036+00:00

Private source `d14bf6a99c8dfc1513d3290ed36e6c474e4ad896`, deployment `appgdep_6acb4488c1688191b4163aa2c3d07dd4`, succeeded. Responsive charts and compact explanatory action cues;126 Node tests and independent frozen/curation checks pass. Current external handoff/receipt supersede prior crowd status. Bus deployment unchanged. Next: Polish keyboard/pointer, loading/cancellation and reduced-motion paths across all five worlds; dry-run the packaged quick-start. Seek voluntary first-time feedback when available, without claiming measured learning. Keep the same compact flow and frozen evidence. Overnight reset maximum one, 0 used; preserve one. No submission.


## Crowd iteration 14 — 2026-10-11T09:25:53.149557+00:00

Private source `f8090bd03045d350bdb6d2e9133c0e882887a3b8`, deployment `appgdep_6acb5549b6bc8191aea20694b9916792`, succeeded. Stop/Escape cancellation, reduced animation, actual image-error recovery and portable startup verified. 131 Node tests and independent frozen/curation checks pass; these are engineering checks, not new accuracy. Current external handoff, receipt, quick-start and package audit supersede prior crowd status. The iteration 13 QA remains preserved. Bus deployment, Wanda model/threshold and known Park failures are unchanged. Next: Review the compact walkthrough as a first-time visitor, then improve the most confusing copy or interaction without adding more teaching units. If actual novice feedback is available, document it separately from heuristic QA. Keep the frozen model/evidence and private publication constraint; predeclare any future domain or recognition study. Overnight reset maximum one, zero used; preserve one. No contest or public project, video, source or Qollab submission/publication. Owner-private review Site updates remain authorized.


## Crowd iteration 15 — 2026-10-11T10:21:14.708449+00:00

Private source `a5b285dc484a6db9a35d806c21de36caa652bd93`, deployment `appgdep_6acb626b9bb48191ac72b5fa1984de6a`, succeeded. Watch one round guides exact snapshots through oracle, reflection preview and one saved commit. Pause, reduced stepping and stale continuation cancellation are verified. 140 Node tests pass; these are engineering checks, not new accuracy. Current external handoff, receipt and quick-start supersede prior crowd status. The iteration 14 package audit remains prior portable proof; interaction 14 and responsive explainer 13 QA remain preserved. Bus deployment, Wanda model/threshold and known Park failures are unchanged. Next: Review the compact three-stage explanation for the next concrete usability gap; seek voluntary novice feedback when available. Preserve the frozen model and scope, and declare any future domain/model study before testing. Overnight reset maximum one, zero used; preserve one. No contest or public project, video, source or Qollab submission/publication. Owner-private review Site updates remain authorized.


## Crowd iteration 16 — 2026-10-11T11:11:22.254474+00:00

Private source `2f3f836e5d13df81f32abc040f101a2959c04ee0`, deployment `appgdep_6acb6db2fa84819194c044f570f6c8db`, succeeded. Play this layer pauses the actual QNN at gates 20/40/60/80 while retaining all 80-gate controls. Boundary captions, pause and one-gate reduced stepping are verified. 147 Node tests pass; these are engineering checks, not new accuracy. Current external handoff, receipt and quick-start supersede prior crowd status. The iteration 14 package audit remains prior portable proof; guided-round 15, interaction 14 and responsive explainer 13 QA remain preserved. Bus deployment, Wanda model/threshold and known Park failures are unchanged. Next: Keep the connected three-stage flow and seek the next observed usability or comprehension gap; request voluntary novice feedback when available. Preserve frozen evidence and predeclare any future model/domain study. Overnight reset maximum one, zero used; preserve one. No contest or public project, video, source or Qollab submission/publication. Owner-private review Site updates remain authorized.

## Local crowd continuation 17 — rehearsal documentation


Created WANDA_DEMO_REHEARSAL.md and WANDA_ITERATION17_HANDOFF.md. Actual
owner-private browser walkthrough found the default 52px Festival Wanda at
(420,300), paused QNN playback at 20/40/60/80 gates, and sampled address 2420
once after exact Grover phase/reflection playback. Center error was 0.5px;
target visibility was 100%. Tool-driven duration was 237.405 seconds, not a
verified two-minute human presentation. No broad tests were rerun for this
documentation-only continuation. Application source, model, threshold, artwork,
benchmark and deployment remain iteration 16, with its prior 147 passing tests.
No contest submission or agent usage reset occurred. Next: privately time a
spoken walkthrough and improve an observed comprehension gap while preserving
the same three stages and frozen evidence.


## Crowd iteration 18 — October 11, 2026

Private source `17bd16281b095f3ab664f9e0c1396dfa3ee0a028`, deployment `appgdep_6acbcbc430648191ac8d657a9523f362`,
version `appgprj_6ac9ed0456008191aafac54f8d5af4d1~appgver_d3687cf4d9e481918e246734744dd103`: terminal succeeded on the original owner-private crowd
Site. Empty Festival welcome, five thumbnails above the map and the large
right-hand portrait are implemented. The first native preview was invisible
for the user; the corrected explicit image actually follows the cursor during
hosted drag. Hosted Find returned (420,300), Start over restored the greeting,
portrait and five choices, and the error/warning console was empty. Local
outside-drop, empty-scene abstention, keyboard and actual 320/390px layout
checks passed. Physical touch/pen, multi-touch and novice learning are untested.

147 Node tests and read-only frozen verification (11 files, seven contracts,
12 fixtures) pass. The technical flow, model, threshold, scanner, artwork and
Grover math are unchanged; no training, reserved-test rerun or new accuracy
claim. Historical native 298/300, baseline 299/300, renderer differences and
Park 40/46px false accepts retain their scopes. Read the current external
WANDA_HANDOFF.md, publication receipt, quick-start and iteration 18 source QA.
The schoolbus deployment and both Site identities are preserved. No contest
submission or public source/video/Qollab publication. The user authorized
private GitHub development synchronization; consult its exact receipt.

Next: refine the published drag/place/find flow from observed usability,
exercise physical touch/pen when available and privately time the new welcome
intro. Preserve the same three-stage explanation and frozen evidence. Zero
agent resets consumed; one remains at the latest observation. Preserve it for
the user and read the resource ledger. The earlier two-to-one account change
had an unknown actor/cause; no agent reset, purchase or billing change occurred.
