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
server. See [Wanda’s quick start](../../../WANDA_QUICKSTART.md) for alternate ports,
keyboard controls, optional engineering checks and reproduction instructions.

## Current version

The rejected people theme has been replaced with ten clip-art people total,
each of the ten distinct generated people appearing once in small static
clusters only on top-right object edges: map frame four, Wanda card three and
Find button three. No people appear on the heading/world picker or scatter
on the sides/bottom. The lower under-the-hood half has the same red background
as Find Wanda, a white/red striped transition and light readable diagram cards,
with no decorative people. Old sign pictograms,
walking and viewport-entry dispersal are removed.
The heading remains **Quantum Vision: Where's Wanda?** and the subheading
remains **Can you find Wanda using quantum crowd search?** The existing
five-map welcome, hanging Wanda pickup and connected three-stage quantum
explanation remain.

Final tested top-half style: Ten original clip-art people, one each, stand in three compact groups (4/3/3) on the top-right edges of the map frame, Wanda card and Find Wanda. The top-half style test uses warm paper texture, illustrated scene cards, a stronger painted map frame and gentle menu shadows. Find and the full lower chapter share #d24e45, with a white/red striped transition and light diagram panels. This is the completed styling increment before the newly requested inline QNN playground replacement.


Private iteration 21 source: `e99fb70e961358738b87187c73c73509e0470514`. All 147 Node engineering tests were actually rerun after replacing the rejected people theme with the final static clip-art layout and passed. The read-only frozen verifier was actually rerun on the final replacement and passed: 11 files, 7 source contracts and 12 pixel fixtures. The model SHA256 is unchanged. These are engineering and integrity checks, not a new recognition benchmark.
Actual final observations and fresh proofs are in the current QA record.
The old three sign-pictogram PNGs remain historical downloads and are absent
from the live UI and inference. Prior recognition failures remain documented.
Rejected dense records/proofs are historical in `archive/iteration20-dense-rejected`.

- [Current handoff](WANDA_HANDOFF.md), [current QA](WANDA_ITERATION21_QA.md) and [exact private receipt](publication-receipt.json)
- Retained standalone historical artwork: [Red PNG](../../../screenshots/pastel-red-pedestrian.png), [Yellow PNG](../../../screenshots/pastel-yellow-pedestrian.png), [Blue PNG](../../../screenshots/pastel-blue-pedestrian.png)
- [Quick start](../../../WANDA_QUICKSTART.md), [deliverables](DELIVERABLES.md) and [tracked Git export manifest](../../GITHUB_EXPORT_MANIFEST.json)
- Local private Git receipt: `GITHUB_SYNC_RECEIPT.json` (excluded from Git)
- [Preserved QNN playground](../../../../qnn-playground/README.md), independently merged in PR #1; no new installation/build/runtime/scientific validation claim

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
