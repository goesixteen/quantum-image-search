# Where’s Wanda — completed first iteration

Completed 2026-10-11T05:08:29.176094+00:00. [Open Where’s Wanda](https://quantum-crowd-search.syrupyspool2.chatgpt.site). The existing owner-private website now contains the two requested experiences. Nothing has been submitted to the hackathon or made public.

The game contains a small female character in a red-and-white sweater, five busy original crowd illustrations, actual drag/drop and click placement, shuffle/remove/reset, and the animated heat overlay. The separate “Look under the hood” section connects a selected image window to eight classical descriptors, the actual trained four-qubit circuit, reduced Bloch states, complex joint amplitudes, learned readout, and Grover’s phase flip and reflection. Click a mini-scene window, inspect its highest score, play or scrub the 80 gates, and step through the Grover reflections.

## Model, evidence and practical scope

The newly trained Wanda QNN completed **298/300 reserved target scenes**, with **0/25 empty-scene detections**. Its matched logistic baseline completed 299/300. Both complete all 60 reserved 52px cases. One QNN point misses the fixed tolerance by about 0.07px; another scene abstains. These outcomes remain failures. Weights, threshold, test criteria and reserved results were not changed after test evaluation.

This is a simulated trained quantum classifier on engineered pixel descriptors, followed by a classical threshold/peak predicate and simulated Grover address search. Inference receives the final RGB scene, supplied target size and saved parameters; no inserted position, target template or clean background is supplied. Training and testing share this PNG and these five backgrounds, with disjoint placement partitions and supplied 40/46/52/58/64px heights. It is a known-art placement demonstration, not evidence of identifying arbitrary people, discovering an unknown size, surviving occlusion or achieving an end-to-end quantum speedup. The classical baseline is slightly stronger here.

- Frozen model SHA-256: `d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88`
- Pretest usable freeze SHA-256: `4b4f5b3a9385765926ade5cfad9eca05f1046eeb3dac7abce1f13bbdb9312a48`
- Threshold: 0.9056472752971427; seed 2026101105; step 1000.
- An inherited descriptive trainingDomain string is corrected explicitly by a sidecar erratum. Frozen model bytes and inference remain unchanged.
- 92 Node tests pass. Read-only verifier checks 11 frozen files, 7 source contracts and 12 pixel fixtures. Actual-state visualization parity covers 28 fixed cases/15 RGB fixtures/4,508 gate frames.
- Local browser checks cover all five positive/empty scenes, native tray drag, sizes 40/64, 16×16 addressing, circuit playback, comparator switching, keyboard cancellation and mobile 375px document/scroll width at 390×844 viewport.
- Background staging and target copying were aligned with the pretest corpus before publication. The actual native production compositor matches all 325 reserved frames byte for byte, including both full failure-case lattices. Frozen evidence was not rewritten; this is separate engineering parity, not a new holdout or Chromium byte-identity claim. [Renderer audit](waldo-search-lab/model/wanda-qnn/renderer-parity.json).

[Architecture, protocol, failures and controls](waldo-search-lab/docs/WANDA_QNN.md), [portable model package](waldo-search-lab/model/wanda-qnn/README.md), [trace mathematics and parity](waldo-search-lab/docs/QNN_TRACE.md), [browser QA](waldo-search-lab/docs/WANDA_BROWSER_QA.md), [implementation log](waldo-search-lab/docs/WANDA_WORKLOG.md).

## Artwork and reproducibility

The built-in image-generation tool created the five original crowd illustrations and transparent female sprite. They are stored under `waldo-search-lab/dist/assets/wanda/`: `wanda.png`, `festival.png`, `beach.png`, `market.png`, `park.png`, `fairground.png`, plus native 512px scene derivatives. Original files remain unchanged. [Exact prompts, generation sequence, hashes and alpha/normalization records](waldo-search-lab/docs/WANDA_ART.md) are included so future iterations can reproduce their provenance. The corpus uses the final art rather than relabelling the earlier OpenMoji model.

[Both-project source ZIP](quantum-image-search-deliverables.zip) contains static websites, training scripts, frozen vectors/checkpoints, matched baselines, old-domain evidence, licenses, actual-state parity and proof screenshots. Run `node serve.mjs` in `waldo-search-lab` for port 4174 or `bus-search-lab` for 4173. No website backend or quantum hardware is needed. Regeneration dependencies are documented in the model README.

## Exact private hosting

Crowd project: `appgprj_6ac9ed0456008191aafac54f8d5af4d1`. Source commit: `5a339e2ff0348701e2572d1c796cedd0ec541571`. Saved version: `appgprj_6ac9ed0456008191aafac54f8d5af4d1~appgver_3ca447cfc82c8191a8fb9e047a170d3e`. Deployment: `appgdep_6acb19743c2481918564fe48c63919e7`. Terminal status: **succeeded**. [Publication receipt](publication-receipt.json) preserves the unchanged bus receipt and prior crowd revision. The existing [schoolbus website](https://bus-search-quantum-lab.syrupyspool2.chatgpt.site) stays at its prior deployment. No new Site identity or audience change occurs.

![Hosted Wanda game](hosted-wanda-proof.png)

![Actual trained-circuit visualization](wanda-circuit-proof.png)

[Mobile proof](wanda-mobile-proof.png).

## Next iteration

Keep the user-facing game compact. Improve the explanation through a guided selected-window narrative and novice usability review; port the Wanda frozen circuit into the Qiskit companion, since the retained companion currently validates the older model. For stronger research evidence, establish a new prospective protocol using background identities absent from training and evaluate a frozen new reserve once. Keep previous failures/results intact. Foreground layering remains secondary until requested. Internal planning weights are 30% fun/usability, 35% engaging explanation, 25% rigor, 10% reproducibility; they are assumptions, not an official rubric. Continue the saved hourly iteration without creating another automation. Do not submit any work.
