# Iteration 22 — inline QNN Playground QA

Source `ca6290523fb8d1c07b00e0491e42c2c037a3eb36`; deployment `appgdep_6acbfa0430248191809d2cfba2c4087d`, succeeded.
The entire old under-the-hood section has been replaced by the latest QNN Playground, inline on the same page. Its interface is red/light, with #d24e45 matching Find Wanda, a white/red striped transition and readable light panels. Current use follows the inline playground; the removed old teaching interface is preserved only as historical evidence.

Entire former under-the-hood interface replaced inline by the latest Git QNN playground, with red accents and light panels; accepted picture-puzzle top styling and compact 4/3/3 clip-art groups preserved.

Root reports 147 passing Wanda engineering tests, 29 passing QNN Playground tests and passing TypeScript checks. Read-only frozen verification passed for 11 files, 7 source contracts and 12 pixel fixtures. The 147-test suite is retained game/integrity coverage; it does not establish complete coverage of the new playground UI. Actual new-interface coverage is limited to the supplied local and hosted observations below. These checks are not a new recognition benchmark.
static_checks: 101 direct game bindings present; no duplicate light-DOM IDs, no old explainer markup, no iframes; only app.js/qnn-playground.js/clipart-cast.js loaded.
build: Rebuilt the inline assets from the 32 original source files using pinned official dependencies; integration syntax and static checks passed.

Actual final observations, supplied by root:

- Inline playground reaches ready and trains for 120 rounds; five worlds visible.
- Actual guided Grover measurement found address 2420 after 50 rounds; saved checkpoint loaded with score 0.988 and threshold 0.9056472752971427.
- Advanced settings changed to no entanglement, quantum-only readout and first-layer encoding; guided mode restored CNOT, hybrid readout, every-layer encoding and exact shots.
- Phone viewport 390x844: document scrollWidth383, bounded two-column guide cards, in-flow circuit before output and responsive plot viewBoxes. Park scene selection and Run the search control work.
- Original game after integration: Found Wanda at measured point420,300; removing Wanda returns no match.
- Published source ca6290523fb8d1c07b00e0491e42c2c037a3eb36; native deployment succeeded, existing owner-private custom audience1/0/0 preserved.
- Hosted page has inline mount and no old explainer/iframe; playground ready after 120 rounds; Find and lower chapter both RGB210,78,69.
- Saved demo weights load on the hosted page; one accepted address; search finishes at region2420 with marked probability100.0% after50 rounds.

Fresh hosted proofs: [wanda22-hosted-playground](../screenshots/wanda22-hosted-playground.jpg), [wanda22-hosted-top](../screenshots/wanda22-hosted-top.jpg), [wanda22-hosted-overview](../screenshots/wanda22-hosted-overview.jpg).

Original playground source: `d7a6a02ea8b34e50842820a5d0fa42208f04ec94`, subtree `e9082497a54f7fb6ca3a8a3d735a45cf52e62a19`, 32 files in `qnn-playground`, preserved separately from the inline red/light adaptation. Apache LICENSE and NOTICE remain. See [QNN Playground source documentation](../../qnn-playground/README.md).
The helper hashes the original 32 files for this receipt and verifies that the
ten retained top-game PNGs keep their iteration-21 hashes and match website
copies byte-for-byte. It does not execute tests or independently recreate Git
publication checks. Original cast generation/provenance remains in the exact
retained asset records. Old standalone sign-pictogram downloads remain historical.

Scientific scope and known source limitations:

- Live window evaluation is illustrative: labelled windows and ranking pairs are generated together and then split as individual entries. Evaluation windows or related same-composite examples may overlap training pairs; background mining also occurs before that split. Do not present this as independent held-out recognition accuracy.
- The playground renders and trains on its own scene/placement. It is an independent experiment and does not explain the exact top game's current image/search unless an explicit bridge is implemented and verified.
- The default list oracle scores windows classically before amplification, so it demonstrates Grover behavior without an end-to-end speedup. Coherent mode simulates a different quantum-only readout and still uses classically prepared/selected window features; efficient coherent input loading is not implemented.
- Live logistic/CNOT/no-entangler comparisons are illustrative and use different thresholds/optimization schedules; they are not a controlled performance benchmark or evidence of quantum advantage.
- Random live-training initializations can yield no accepted addresses after120 rounds. The saved demo checkpoint remains available via Show all details→Load demo weights. The frozen game's inference is independent and unchanged.

The frozen standing Wanda detector, scene artwork, threshold and recognition pipeline remain unchanged. Historical native QNN 298/300 versus logistic 299/300 applies to the known Wanda PNG, supplied sizes, fully visible targets and five original unseeded background identities. The browser diagnostic's 15/15 target cases versus native 13/15 retains its separate original scope. Park's 40px/46px false acceptances, browser/native differences and iteration 19's arbitrary-drop abstention remain recorded failures. Live playground training does not refit or replace that frozen model and does not rerun its reserved evaluation.
Frozen model SHA256: `d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88`. No new reserved evaluation, recognition
accuracy or quantum runtime advantage is claimed by this integration.

Actual failures and corrections supplied for this iteration:

- First embedded startup failed because D3 read an undefined this.navigator; rebuilt its UMD with window context while retaining scoped document.
- Removed duplicate training caption that overlapped the epoch counter.
- Phone guide retained upstream display:flex and clipped its fourth card; changed to bounded grid, fixed plot/control width and verified scrollWidth383 at390.
- First live refresh immediately after publication still displayed the prior deployment; a subsequent explicit reload showed the new exact interface.
- A fresh hosted live-training run at seed0.03401 produced89% illustrative check and zero accepted addresses. This is retained as a live-training failure; loading the frozen demo checkpoint accepted Wanda and completed search.

Original iteration-21 QA remains in `archive/iteration21-styling`. Its old lesson checks describe
that original interface and do not count as coverage of the new playground.
The local private Git receipt is `GITHUB_SYNC_RECEIPT.json` (excluded from Git). The tracked [Git export manifest](GITHUB_EXPORT_MANIFEST.json) records export scope. A website publication and a private Git synchronization have separate histories.
