# Quantum Image Search

Private QHack development workspace with two interactive demos: **Where’s
Wanda** and the **schoolbus CAPTCHA**. Both run locally using included artwork,
trained models and classical statevector simulators. Nothing has been submitted
to the hackathon.

## Hackathon submission (Qollab)

The Qollab project is [waldo-search-lab/qollab-wanda/](waldo-search-lab/qollab-wanda).
It is a Qiskit program: a trained 4-qubit quantum neural network marks
candidate windows, and a Grover circuit searches them with a single measured
job, so it runs on Qollab's local simulators and on IonQ's simulator. Its
[README](waldo-search-lab/qollab-wanda/README.md) is the project-page
write-up. It covers the problem, how to run, replicate and extend the project,
the disclosure of outside code, and licensing. The interactive website below
is the companion demo. Its accessibility notes are in
[waldo-search-lab/docs/ACCESSIBILITY.md](waldo-search-lab/docs/ACCESSIBILITY.md).

Licensing: [MIT](LICENSE) for all project code. The only exception is the
upstream TensorFlow Playground files inside `qnn-playground/`, which stay
Apache-2.0 (see [qnn-playground/LICENSE](qnn-playground/LICENSE)).

## Repository layout

| Path | What it is |
|---|---|
| [waldo-search-lab/](waldo-search-lab/) | Where's Wanda website (`dist/`), models and training (`model/`), tests and docs |
| [waldo-search-lab/qollab-wanda/](waldo-search-lab/qollab-wanda/) | **Qollab submission:** the Qiskit program and its project-page README |
| [qnn-playground/](qnn-playground/) | QNN Playground source (a TensorFlow Playground fork), embedded in the Wanda site |
| [bus-search-lab/](bus-search-lab/) | Earlier school-bus CAPTCHA demo |
| [wanda-clipart/](wanda-clipart/) | Decorative clip-art figures used by the Wanda site |
| [docs/](docs/) | Quick start, demo rehearsal and current handoff |
| [docs/screenshots/](docs/screenshots/) | Proof screenshots and preview images |
| [docs/history/](docs/history/) | Iteration handoffs, QA reports, publication receipts, exports and `archive/` |

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
server. See [Wanda’s quick start](docs/WANDA_QUICKSTART.md) for alternate ports,
keyboard controls, optional engineering checks and reproduction instructions.

## Current version

Iteration 22 replaces the entire old under-the-hood section with the latest
QNN Playground inline on the same page, styled red/light. Entire former under-the-hood interface replaced inline by the latest Git QNN playground, with red accents and light panels; accepted picture-puzzle top styling and compact 4/3/3 clip-art groups preserved.

The accepted top styling remains: warm paper texture, illustrated scene cards, painted map frame and soft menu shadows. Ten original clip-art people appear once each in static top-right edge clusters: map frame four, Wanda card three and Find button three. No people decorate the heading, world picker, sides, bottom or technical section. The five-scene empty welcome, speech bubble and hanging Wanda pickup remain.
The requested heading **QuantumVision: Where's Wanda?** and subheading
**Can you find Wanda using quantum crowd search?** remain.

Private source `ca6290523fb8d1c07b00e0491e42c2c037a3eb36`; deployment `appgdep_6acbfa0430248191809d2cfba2c4087d`, succeeded.
Root reports 147 passing Wanda engineering tests, 29 passing QNN Playground tests and passing TypeScript checks. Read-only frozen verification passed for 11 files, 7 source contracts and 12 pixel fixtures. The 147-test suite is retained game/integrity coverage; it does not establish complete coverage of the new playground UI. Actual new-interface coverage is limited to the supplied local and hosted observations below. These checks are not a new recognition benchmark.

- [Current handoff](docs/WANDA_HANDOFF.md), [current QA](docs/history/WANDA_ITERATION22_QA.md) and [exact private receipt](docs/history/publication-receipt.json)
- [Wanda quick start](docs/WANDA_QUICKSTART.md), [deliverables](docs/history/DELIVERABLES.md) and [tracked Git export manifest](docs/history/GITHUB_EXPORT_MANIFEST.json)
- Local private Git receipt: `GITHUB_SYNC_RECEIPT.json` (excluded from Git)

## QNN Playground

Use **Look under the hood** on the Wanda page to reach the inline playground.
Pick a world, watch or restart its live training, inspect scores/marks, then run
the search. **Show all details** exposes the circuit, readout and search settings.
The playground creates its own scene experiment; it is independent of the top
game's current placement/search. Live accuracy may contain overlapping training
and evaluation windows/pairs and is an illustrative check, not a new benchmark.
Everything runs in a classical simulator; the default compiled oracle supplies
no end-to-end quantum speedup.

The original latest 32-file source is preserved in
[qnn-playground/README.md](qnn-playground/README.md), with its LICENSE/NOTICE (team code MIT, upstream files Apache-2.0).
Its Git source is `d7a6a02ea8b34e50842820a5d0fa42208f04ec94`, subtree `e9082497a54f7fb6ca3a8a3d735a45cf52e62a19`. The website uses
a separate red/light adaptation. The removed old underhood interface is historical.

The frozen standing Wanda detector, scene artwork, threshold and recognition pipeline remain unchanged. Historical native QNN 298/300 versus logistic 299/300 applies to the known Wanda PNG, supplied sizes, fully visible targets and five original unseeded background identities. The browser diagnostic's 15/15 target cases versus native 13/15 retains its separate original scope. Park's 40px/46px false acceptances, browser/native differences and iteration 19's arbitrary-drop abstention remain recorded failures. Live playground training does not refit or replace that frozen model and does not rerun its reserved evaluation.

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
