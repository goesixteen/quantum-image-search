# Quantum Image Search

Private QHack development workspace with two interactive demos: **Where’s
Wanda** and the **schoolbus CAPTCHA**. Both run locally using included artwork,
trained models and classical statevector simulators. Nothing has been submitted
to the hackathon.

## Run the demos

Install a modern Node.js version. From this repository, use separate terminals:

```text
cd waldo-search-lab
node serve.mjs
```

Open the printed URL, normally http://127.0.0.1:4174/ for Where’s Wanda.

```text
cd bus-search-lab
node serve.mjs
```

Open http://127.0.0.1:4173/ for the schoolbus demo. The static demos need no
package installation, API key, Python or quantum hardware. Ctrl+C stops a
server. See [Wanda’s quick start](WANDA_QUICKSTART.md) for alternate ports,
keyboard controls, optional engineering checks and reproduction instructions.

## Current version

Where’s Wanda starts empty, with five map thumbnails above the scene and a
large portrait on the right. A speech bubble says “Hi, I’m Wanda!” Pick her
up: she shrinks out of the box, hangs from the pointer by a raised hand, and
swings behind mouse motion. Drop inside to place the original standing Wanda;
drop outside to cancel. Dragging a placed target off-map returns her to the
box. The placed message becomes plain text without the bubble outline.
Find, Remove and Start over complete the loop. The soft overlay and
connected **Image + QNN → Grover interference → Measurement** lesson remain.

Privately published application code is iteration 19, source
`002574d248d81237e542b0c954185213eda9208a` in the separate Sites source repository.
All 147 engineering tests and frozen verification pass. Actual local mouse,
keyboard, reduced animation and 320/390px responsive checks are documented.
Hosted pickup showed shrinking and rotation; its first arbitrary placement
abstained, with the failure retained. A separate hosted keyboard default was
found at (420,300), dragging off-map restored the welcome, and the console was
empty. The hanging pose is UI-only;
the trained standing PNG, model, threshold, scenes and quantum math are
unchanged. The schoolbus deployment remains separate and unchanged.

- [Current handoff](WANDA_HANDOFF.md) and [iteration 19 source QA](waldo-search-lab/docs/WANDA_ITERATION19_QA.md)
- [Hanging-pose provenance](waldo-search-lab/docs/WANDA_HANGING_ASSET.md)
- [Private rehearsal script](WANDA_DEMO_REHEARSAL.md), [historical rehearsal](WANDA_ITERATION17_HANDOFF.md) and [deliverables overview](DELIVERABLES.md)
- [Exact private deployment receipt](publication-receipt.json)
- [Crowd project](waldo-search-lab/README.md) and [schoolbus project](bus-search-lab/README.md)
- [Quantum explanation and scope](waldo-search-lab/docs/WANDA_LESSON.md)
- [Frozen Wanda model and evidence](waldo-search-lab/model/wanda-qnn/README.md)
- [Wanda artwork provenance](waldo-search-lab/docs/ASSETS.md) and [schoolbus assets](bus-search-lab/docs/ASSETS.md)

The default Wanda detector is a genuinely trained, simulated four-qubit QNN.
Classical image descriptors and supplied scale enter its saved circuit and
readout. Classical thresholding compiles accepted addresses for a separate
12-qubit Grover location register. The soft heat field is a display; the lesson
shows exact signed amplitudes and probabilities separately.

The historical native 298/300 recognition result concerns the known Wanda PNG,
five original unseeded backgrounds, supplied scales and fully visible targets.
The matched classical baseline scored 299/300. Retained failures, browser/native
differences and the later curated Park lookalike have their own documented
scope. No arbitrary-person recognition or end-to-end quantum runtime advantage
is established.

## Repository contents

The `dist/` folders contain the runnable application source and must be kept.
Training scripts, saved models, tests, provenance, historical failure evidence,
Qiskit companions, handoffs and screenshots are included. The redundant local
`quantum-image-search-deliverables.zip` is not tracked in GitHub; clone this
repository instead. Older documentation may refer to that local ZIP.
Application layer-download ZIPs and compressed experiment evidence remain
included. Git internals, dependency folders, caches and credentials are excluded.
Existing `.openai/hosting.json` files contain only the original Site identities
and static-directory settings; they are not needed for local preview. Hosting
and repository commits use separate histories.

This repository remains private. A repository update is not a contest submission
or a change to either website’s audience. Asset licenses and original-code
licenses are documented within each project.
