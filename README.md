# Quantum Image Search

Private QHack development workspace with two interactive demos, **Where’s
Wanda** and the **schoolbus CAPTCHA**, and the **QNN Playground**, which opens
up Where’s Wanda’s quantum pipeline. All run locally using included artwork,
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

```text
cd qnn-playground
npm install
npm run dev
```

Open http://127.0.0.1:4175/ for the QNN Playground. It needs a one-time
`npm install` (build tools only) and reads the Where’s Wanda folder.

## Current version

Where’s Wanda starts with an empty scene, five map thumbnails above it and a
large welcome portrait on the right. Dragging shows a small cursor-following
Wanda; dropping places her at the normal scene size. Find, Remove and Start
over complete the loop. The soft overlay and connected **Image + QNN → Grover
interference → Measurement** explanation remain.

Privately published application code is iteration 18, source
`17bd16281b095f3ab664f9e0c1396dfa3ee0a028` in the separate Sites source repository.
All 147 engineering tests and frozen verification pass. Actual hosted native
dragging showed the corrected cursor preview; Find returned (420,300), and
reset restored the portrait and five choices. The initial invisible-preview
failure is retained in the source QA. No model, threshold, artwork or quantum
math changed. The schoolbus deployment remains separate and unchanged.

- [Current handoff](WANDA_HANDOFF.md) and [iteration 18 source QA](waldo-search-lab/docs/WANDA_ITERATION18_QA.md)
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

## QNN Playground

[`qnn-playground/`](qnn-playground/README.md) lays Where’s Wanda’s pipeline out
like the TensorFlow Neural Network Playground: window features → the 4-qubit,
4-layer circuit → readout → marked addresses → Grover search. It is built from
the Wanda site’s own artwork, scene catalog, compositor, feature extractor,
scan, threshold, ground-truth rule and Grover simulator. Visitors can train the
circuit live with the site’s recipe and objective, or load its exact weights.
Its tests check that, with those weights, its scores match the site’s to about
1e-15 and its scan gives the site’s `scanQNN()` scores and marks. It changes
nothing in either demo. [Development log](qnn-playground/DEVLOG.md).

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
