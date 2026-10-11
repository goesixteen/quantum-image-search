# Layered editor browser verification

Verified October 10, 2026, approximately 18:00–18:18 UTC, through the Codex in-app browser against the retained local source on port 4174. This is separate from Native Canvas audit data. Hosted authenticated interactions are not implied by these local checks.

## Actual browser observations

- Final openly licensed red/white PNG: browser thumbnail visually checked; default 52px target and 64×64 grid localized with one accepted address and zero refined-center error.
- Both public-domain painting selectors load registered foreground PNG layers with named individual toggles.
- Seurat foreground: a fully hidden placement produced zero accepted addresses. Putting the same target in front gave one address and 100% visible alpha mass. A keyboard-adjusted partial placement at approximately (274,290), with 60% visible alpha mass, localized with zero refined-center error.
- Earlier drag fixture: 69% visible target localized; disabling its foreground person restored 100% visibility. Final PNG was subsequently independently verified on the 60%-visible fixture.
- Grover: 4,096 addresses / 12 search qubits; round 0 had 0.02% accepted mass, round 50 had 99.99%, and round 103 had 0.86%. Replay restored the first peak. A real sample at round 103 missed by 129.7px, illustrating overshoot. Signed amplitudes and Born probabilities are distinct map choices.
- Scrubbing clears the previous sample/grade; moving, resizing, choosing assets, toggling layers and changing oracle settings invalidate old inference.
- Canvas pointer dragging and arrow/Shift-arrow placement worked. All rendered top-left coordinates are rounded to integer canvas pixels, and the identical fixed-size target raster supplies inference.
- Local PNG and JPEG file chooser flows worked. Uploaded target/background options remain selectable after changing to a preset and back, and the combined uploaded scene localized correctly. No image upload endpoint is used.
- Original-art QNN mode remained accessible; its nominal 4×4 placement produced one accepted tile and a correct sampled tile. It starts snapped inside a tile and in front of foreground layers; its frozen metrics do not cover occlusion or the new matcher.
- Phone viewport override 390×844 produced 375px CSS document/client width and 329px image width, with no horizontal overflow. Search localized the default PNG. The viewport override was reset.
- Fixed initialization and cross-selector loading races; early editor controls remain disabled until source images are ready. Updated graph axis labels, nearby status, credit links and the jump to amplitude convergence.

The in-app browser did not report the data-URL image export through its download-event API (timeout). The export handler renders the final composite into a PNG, while layer PNG encoding and reconstruction are covered by real-raster tests; a user-browser download smoke check remains useful. Native tray HTML drag/drop and custom brush painting are implemented but have not been separately exercised in this browser run.

## Evidence and limits

The final 26 Node tests pass. The separate [2,064-probe audit](../model/layered-integration-audit.json) reports misses as well as hits and retains every denominator. Manual foreground outlines approximate the original objects. Entirely hidden targets have no visual evidence; heavy occlusion can also abstain. Arbitrary photo identities, scale invariance and generic person recognition are not demonstrated. The fine matcher uses a clean background reference and known template size; no end-to-end quantum advantage is claimed.

Screenshots are saved in the outer outputs directory: `layered-editor-proof.png`, `grover-heatmap-proof.png`, and `layered-mobile-proof.png`. They show representative local source states, not authenticated hosted acceptance.

Production checkpoints remain unchanged. No contest submission or public sharing was performed.
