# Where’s Wanda — quick start

Use the [owner-private website](https://quantum-crowd-search.syrupyspool2.chatgpt.site)
for the current review version. No contest submission has been made. The
[publication receipt](history/publication-receipt.json) identifies its exact source and
deployment; [the handoff](WANDA_HANDOFF.md) identifies the latest completed checks.

## Run the downloaded source

Extract `quantum-image-search-deliverables.zip` into a folder you control. Open a
terminal in its `waldo-search-lab` folder. With modern Node.js installed, run:

```text
node serve.mjs
```

Open the printed local URL, normally `http://127.0.0.1:4174/`. Keep that terminal
running. Ctrl+C stops this preview. The static game needs no package installation,
API key, hosted account, Python or quantum hardware. Its scene images and trained
model are included. Optional source links can require internet access.

If port 4174 is already occupied, reuse the existing preview or choose another:

```text
node serve.mjs --port 4178
```

Alternatively, `node serve.mjs --port 0` selects a free local port; open the exact
URL printed by the server. The server binds only to this computer's loopback
interface. Starting this local preview does not publish or submit the project.

## Try the two experiences

Choose one of five worlds, then drag Wanda or tap to place her. Arrow keys move
her; Enter searches. The map initially has no Wanda: drag the large portrait
from its welcome box into the scene. The portrait disappears and the scene uses
the usual 52px sprite. Activate the portrait and then tap/click the map for an
alternative; keyboard users can activate it, then use arrow keys or Enter.
Find Wanda becomes Stop search while it is working. Stop search or Escape stops
that run and keeps the scene ready for another attempt. Start over restores
Festival and the trained detector, with Wanda waiting in her box. Remove Wanda
returns her to the box. The five map choices appear above the scene in one row.

Look under the hood now contains the QNN playground directly in the page:

1. Pick a world and watch its four-qubit circuit train for 120 rounds. Use
   Train again to continue; Run the search animates Grover amplification.
2. Choose Show all details to inspect feature inputs, circuit gates, readout,
   state amplitudes and search controls. Click a region to inspect its state.
3. Load demo weights restores the exact frozen Wanda parameters and threshold.
   This is useful when a short live-training run accepts no addresses.

The playground uses the game's image pipeline with its own scene and training
settings. Its generated-window check is illustrative and can overlap training
pairs; it is not new held-out accuracy. All qubits are simulated. The compiled
Grover oracle receives already-scored locations, so this is an explanation of
amplification rather than an end-to-end speed-up. The game's soft field remains
a display, not a map of semantic person probabilities. Rebuilding the embed is
documented in [the integration guide](../waldo-search-lab/playground-integration/README.md).

## Engineering checks and model reproduction

The live page needs no dependencies, but the complete engineering suite uses a
pinned native Canvas development dependency. In `waldo-search-lab`, follow the
dependency installation and test commands in its [README](../waldo-search-lab/README.md).
Read the current QA for the actual test count rather than a historical count.

Read-only Python model verification has separate numerical/image dependencies
documented in [the frozen model package](../waldo-search-lab/model/wanda-qnn/README.md).
Training is optional and is not needed to use the website. Preserve the frozen
checkpoint and declared protocols; do not relabel an opened test as new evidence.

The historical 298/300 native Wanda result applies to the original five unseeded
backgrounds, the known PNG, supplied heights and fully visible placements. The
curated Park artwork has known 40px/46px false acceptances. This browser simulation
does not establish arbitrary-person recognition, hardware execution or an
end-to-end quantum speedup.

The separate [schoolbus site](https://bus-search-quantum-lab.syrupyspool2.chatgpt.site)
and its source folder remain included. Both hosted Site identities and private
audiences are preserved. Do not submit or publish public contest materials.
