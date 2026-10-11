# Park pilot and heat-display verification — iteration11

Recorded 2026-10-11T06:36:13.405114+00:00. These are engineering/curation checks, not a new holdout or a retrained model.

- 114Node tests pass, zero failures/skips. Includes7 peak-envelope checks and5 actual-PNG compositor contracts.
- Read-only frozen verifier passes11files,7sources,12pixel fixtures. Frozen Wanda SHA remains `d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88`; threshold remains0.9056472752971427.
- App/underhood syntax and Git whitespace checks pass. Display-only envelope, linear power1, exposure1 and final Born mix1 do not change inference, accepted addresses or exact sampling.
- Exactly5 scene choices remain. Original Park and all original background paths remain unchanged. Curated artwork has a separately hashed512px derivative and full generation/edit provenance.
- Actual Chromium default52px, Park with only the bystander: highest window(172,396), score70.21%, zero accepted addresses, No match found. Actual raw exported PNG retained and independently rescored. It is decodedRGBA-identical to the native baked scene.
- Actual Chromium with Wanda restored at(420,300),52px: exactlyone accepted address2420, Grover first peak50, measured420300, centererror0.5px, fullyvisible100%. Independent final-RGB replay gives Wandascore0.9933728170, bystander0.7020770671, zero wrong marks.
- Native/browser smaller supplied40/46px falsely accept the bystander. Supplied58/64px abstain. The scene is a default52px demonstration, not all-size-safe identity recognition.
- Browser dynamic cutout resizing initially weakened the bystander to0.1277221 while native scored0.7020771. Final artwork is pre-rendered at512px, avoiding that extra resize. The ordinary draggable Wanda still has documented backend raster differences.
- All three source variants and all failed curation outcomes are preserved. The original298/300 native reserved accuracy and earlier20-case browser audit apply to unseeded original scenes only.
- No console errors were observed in the final local game test. One prototype upload/filechooser attempt timed out and reset the control session; it was not used as successful evidence. Final QA uses the normal built-in Park picker.

The original lime-tree/foliage issue involved both nonsemantic learned ranking and display exaggeration. A6.96% smoothedcorner intensity had mapped to70.83%palette intensity through power0.35/exposure1.8. Default linear peak-preserving display removes that exaggeration; the classifier remains an artwork-specific descriptor model.

Latest steering is recorded in WANDA_ITERATION_BRIEF.md and the active hourly heartbeat: consolidate underhood into one2–3stage interactive, avoid a duplicateheatmap/mainfalse-positiveexercise, continue overnight. Usage reset cap isone; zero consumed, two available observed. Detailed evidence stays optional. No contest/public submission has been made. Private deployment proof is recorded separately after terminal success.
