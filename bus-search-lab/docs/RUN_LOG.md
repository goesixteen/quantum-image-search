# Hourly run log

## Latest steering — October 10, ~04:17 ET

The user explicitly said: “dont submit any of the work” and “just keep iterating improvements.” No contest submission was made. Subsequent work continues on UX, training/evaluation, and fair comparisons. Submission and public submission-material publication are withheld for the user. Both existing Sites stay owner-private.

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

Develop **v4 local object/shape representation and foreground variation** using designated training/validation identities, with matched classical/QNN comparisons and scene-level constrained validation. Analyze ranking and coverage as well as false-mark budget; brighter masks or more circuit depth are insufficient fixes on current evidence. Preserve both working demos and their checkpoints. Keep the c-labelled street/bus pair steward-only until a new feature/model/threshold/renderer/protocol freeze; never choose thresholds from its results. Improve the local comparison/lesson using explicit feedback without claiming measured learning. Platform uploads, public submission materials and entry remain withheld. Record the private update receipt only when root obtains it, then stop temporary servers after handoff.
