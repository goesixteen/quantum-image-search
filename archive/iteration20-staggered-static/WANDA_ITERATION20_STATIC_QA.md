# Iteration 20 — static pedestrian theme QA

Current private source: `e40f28f25ca3876c06bf325ddf72a315cfc47e6c`. The website keeps
**Quantum Vision: Where's Wanda?** and **Can you find Wanda using quantum crowd
search?** It uses static red, yellow and blue pictogram pedestrians around
important interface areas. The rejected walking cutouts are not restored.

All 147 Node engineering tests were actually rerun after the final static theme was added and passed. The read-only frozen verifier was actually rerun on the final static increment and passed: 11 files, 7 source contracts and 12 pixel fixtures. The model SHA256 is unchanged. These are engineering/integrity checks, not a new recognition benchmark.
Final pedestrian module syntax and Git whitespace checks pass. All three 1145×1374 RGBA PNGs have transparent and opaque alpha, and deployed copies match saved outputs exactly.

- Nine static groups contain 38 red/yellow/blue figures, with stable mixed left/right reflections, smaller raised back tiers, and safe corner/side placements. Main heading has seven uneven perches and two desktop flanks; its Y positions span 0 to 128px. Find has upper perches at -34/-43px and lower corners at 31/34px. CSS animation none and transition 0s; old walking modules absent.
- Actual 390/320px viewports: document scroll widths 375/305px, five scene choices share one row and titles remain readable. At 320px no figure extends beyond the viewport; mobile main crowd uses uneven upper tiers.
- Actual keyboard placement followed by the decorated Find click returned Found Wanda / Measured point420,300.
- Switching to Grover updated the stage title without removing its decoration or changing its saved round50; labels stay clear.
- Exact heading/subheading, nine static groups and 38 figures verified. Main crowd has four left-facing/five right-facing PNGs, uneven upper positions and two flanks at y89/129px; Find has upper perches -34/-43px and corners31/34px. All three colors present, no old walking groups, animation none/transition0s.
- Actual decorated Find returned Found Wanda / Measured point420,300 after keyboard default placement.
- Image→Grover tab title updated and retained saved state; actual screenshots show labels and pastel clusters clearly.
- Hosted warning/error console was empty; Start over and Play restored the empty Festival welcome.

All three output assets have PNG signatures and match their metadata and website
copies byte-for-byte:

- `pastel-red-pedestrian.png`: SHA256 `dec0a388b558239df7d5108e9bc83098add8f462f1253551062ad9150094fad8`; identical website copy `waldo-search-lab/dist/assets/ui-pedestrians/pedestrian-red.png`.
- `pastel-yellow-pedestrian.png`: SHA256 `3e65880860e3be5405f052692fca430890b510e98a7307def16fb96512ab6f51`; identical website copy `waldo-search-lab/dist/assets/ui-pedestrians/pedestrian-yellow.png`.
- `pastel-blue-pedestrian.png`: SHA256 `acf54ce0bf379ab7084b013772575f7dd68804b989a8d93399a22157fd75e977`; identical website copy `waldo-search-lab/dist/assets/ui-pedestrians/pedestrian-blue.png`.

These decorations remain outside the image searched. No new recognition
benchmark, training run or quantum runtime advantage is claimed. The frozen
model SHA256 is `d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88`. The independently merged 29-file playground is
preserved as source, without a build/runtime/scientific validation claim.
Prior recognition failures and exact iteration 19 receipts remain preserved.
