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

Where’s Wanda has five original crowd scenes, drag/place/find controls, a soft
heat overlay, and one connected **Image + QNN → Grover interference →
Measurement** explanation. Published application code is iteration 16,
source `2f3f836e5d13df81f32abc040f101a2959c04ee0` in the separate Sites source
repository. It has 147 passing engineering tests recorded in its QA. Iteration
17 adds local rehearsal documentation; it is not a new application deployment.
The schoolbus deployment is preserved separately.

- [Current handoff](WANDA_HANDOFF.md) and [latest local continuation](WANDA_ITERATION17_HANDOFF.md)
- [Private rehearsal script](WANDA_DEMO_REHEARSAL.md) and [deliverables overview](DELIVERABLES.md)
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
