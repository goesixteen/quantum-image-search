# Quantum image-search deliverables

**User instruction:** Do not submit any work. Keep iterating improvements. No hackathon entry has been filed; submission remains entirely with the user. Continue preparation and testing privately.

First work step completed October 10, 2026, approximately 03:15–04:15 ET. Both websites are built, trained, browser-tested locally, and deployed as owner-private Sites. ChatGPT sign-in is required for hosted review.

Iteration 02 continues the user's no-submission direction: improved mobile action/feedback and keyboard search, shared visible-pixel evaluation, a selectable unfamiliar street stress test, matched photo/crowd logistic comparisons, independent photographs and an unpromoted training experiment, and an actual 14-qubit coherent-majority appendix. See [iteration QA](bus-search-lab/docs/ITERATION_02_QA.md), [independent evaluation](bus-search-lab/docs/UNSEEN_EVALUATION.md), and [coherent majority](bus-search-lab/docs/COHERENT_MAJORITY.md).

Iteration 02 completed at approximately 05:00 ET. Iteration 03 adds the shared constructed-oracle lesson, two-demo comparison page, crowd boundary challenge/mobile feedback, dense scene audits, illumination-relative photo training and a frozen evaluation on fresh photographs. Read [the latest handoff](ITERATION_03_HANDOFF.md) and [publication receipt](publication-receipt.json) for final source/deployment status. The v3 photo candidates failed the usability gate and remain unpromoted.

- [Schoolbus CAPTCHA](https://bus-search-quantum-lab.syrupyspool2.chatgpt.site): drag the real bus cutout into the street photo, inspect QNN scores, and simulate Grover search.
- [Crowd explorer](https://quantum-crowd-search.syrupyspool2.chatgpt.site): independently trained Where's Waldo-style experiment using original crowd and target artwork.
- [Compare both stories](https://bus-search-quantum-lab.syrupyspool2.chatgpt.site/compare.html): side-by-side websites with separate evidence scopes.
- [Iteration 03 QA](bus-search-lab/docs/ITERATION_03_QA.md), [photo experiment](bus-search-lab/docs/PHOTO_V3.md), [crowd scene audit](waldo-search-lab/docs/SCENE_AUDIT.md), and [local video storyboard](bus-search-lab/docs/DEMO_STORYBOARD.md).
- [Full project state](bus-search-lab/docs/PROJECT_STATE.md): read first on the next hourly run.
- [Work log](bus-search-lab/docs/RUN_LOG.md): implementation, checks, and user steering.
- [Rubric](bus-search-lab/docs/RUBRIC.md): actual Qollab × IonQ judging and public submission gates.
- [Bus browser checks](bus-search-lab/docs/QA.md) and [crowd browser checks](waldo-search-lab/docs/QA.md).
- [Coherent learning appendix](bus-search-lab/docs/COHERENT_LEARNING.md): separately trained raw-event classifier and actual A/A† amplification, with reproducible checks.
- [Latest publication receipt](publication-receipt.json): exact source SHAs and terminal successful deployment IDs.

The ZIP contains both complete projects, model weights, trainers, evaluations, original/credited assets, documentation, browser screenshots, and the bus Qiskit companion. Extract it, run `node serve.mjs` inside either project, and open port 4173 for bus or 4174 for crowd. Temporary local preview processes were stopped after handoff.

The main classifiers score candidate image regions classically before compiling a Grover oracle. Headline held-out patch sets are controlled composites sharing the supplied asset identities; separate independent-photograph probes expose transfer failures. No general real-person recognition or end-to-end quantum speedup is established. Misses and false positives are documented rather than hidden.

No work has been submitted to the hackathon. Next priorities are stronger foreground/shape representation, scene-level model selection under a false-mark budget, a new protocol freeze before opening the reserve photographs, and a tighter educational presentation. Removing all-zero feature collapse did not make v3 usable. Keep SDK runs and submission-material preparation local, preserve both deliverables, and build on the saved evidence at each hourly run. The user controls submission.
