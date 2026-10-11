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

The heading is **Quantum Vision: Where's Wanda?** and the subheading is
**Can you find Wanda using quantum crowd search?** Dense overlapping red,
yellow and blue pictogram crowds disperse on viewport entry at a constant
28 CSS px/s with linear timing, settling at text-safe edges and corners.
The existing five-map welcome, hanging Wanda pickup and connected three-stage
quantum explanation remain.

Private iteration 20 source: `66f66be39e50df251ffb7345486b9b006c7b25e4`. All 147 Node engineering tests were actually rerun on the final dense pedestrian revision and passed. The read-only frozen verifier was actually rerun on that revision and passed: 11 files, 7 source contracts and 12 pixel fixtures. The model SHA256 is unchanged. These are engineering/integrity checks, not a new recognition benchmark.
Detailed actual final browser/motion observations are in the current QA record.
The decorations do not enter inference, and prior recognition failures remain
documented. The preceding staggered static revision is historical.

- [Current handoff](WANDA_HANDOFF.md), [dense-crowd QA](WANDA_ITERATION20_DENSE_QA.md) and [exact private receipt](publication-receipt.json)
- Standalone artwork: [Red PNG](pastel-red-pedestrian.png), [Yellow PNG](pastel-yellow-pedestrian.png), [Blue PNG](pastel-blue-pedestrian.png)
- [Quick start](WANDA_QUICKSTART.md), [deliverables](DELIVERABLES.md) and [tracked Git export manifest](GITHUB_EXPORT_MANIFEST.json)
- Local private Git receipt: `GITHUB_SYNC_RECEIPT.json` (excluded from Git)
- [Preserved QNN playground](qnn-playground/README.md), merged independently in PR #1; source only, without installation/build/runtime/scientific validation in this iteration

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
