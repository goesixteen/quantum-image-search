# Iteration16 — inspect one actual QNN layer

Started2026-10-11T10:50:50Z from private source
`a5b285dc484a6db9a35d806c21de36caa652bd93`. The same five-world game and
Image + QNN → Grover → Measurement experience remain. No training, threshold
changes, artwork changes or new recognition evaluation occurred.

## Change and purpose

The existing Play button now stops at the current layer's actual last gate,
derived from trace metadata. This frozen model stops at20/40/60/80. Continue
explicitly to the next layer; gate80 disables playback until Restart or a manual
earlier position. There is no automatic rewind. Pause keeps the current position.
Tab/visibility, window/image, readiness and manual changes invalidate stale RAF
callbacks; an old callback cannot cancel a newer owned animation.

At an exact boundary the presentation requests the previous final gate at
progress1, showing its completed CNOT and actual saved complex state. The next
layer starts from that same state. Fractional rotation frames remain unitary;
CNOT has exact before/after endpoints. Reduced motion keeps one gate per click.
All80 gates remain accessible through slider, stepping and optional milestones.

Training fixed the learned angles before the demo; this animation is inference
for the selected window. The displayed score always uses the complete four-layer
readout, even when an earlier layer is being inspected. Reduced Bloch states
come from the full joint state, and connected ZZ correlations are still labelled
as insufficient to witness entanglement. The classifier and location registers
remain separate; circuit inspection does not rescan or change Grover's state.

This addresses the engaging Quantum Unlocked explanation priority: an80-second
continuous sequence at Explore speed is now four inspectable20-second layers.
It adds no panels or controls and does not claim measured learning gains. The
30/35/25/10 provisional allocation remains an internal planning assumption.

## Actual checks before private publication

- All147 Node tests pass, including seven new playback regressions. They derive
  uneven synthetic layer bounds, compare every frozen-model boundary with its
  exact saved state, check fractional rotations/CNOT endpoints, and exercise
  shipped strict-mode RAF ownership under stale callbacks.
- Static checks:200 crowd IDs/33 references;73 bus IDs/13 references; shared
  quantum modules identical. Read-only freeze verifier passes11 files,7 source
  contracts and12 pixel fixtures with the original model SHA and threshold.
- Read-only independent science review confirms the boundary-state identity,
  full-circuit score scope, inference wording and physical reduced-state display.
- Actual local Fast playback reaches gate20 exactly and stops. The map labels
  layer1 and the caption states final CNOT q3→q0 applied. Bloch lengths are
  0.571/0.202/0.374/0.188; purities0.663/0.520/0.570/0.518. The completed
  score remains98.82%; Grover retains saved round0 and mass0.024414063%.
- Starting layer2 then changing tabs pauses at actual position21.28. Resume
  continues from that same position rather than restarting.
- Actual desktop explicit continuation stops exactly at40,60 and80. Gate80
  disables Play with Circuit complete, without rewind. The full4096-probability
  UI export still has norm1, uniform amplitudes1/64 and probabilities1/4096,
  saved round0, and no sample. One reduced-motion click from0 reaches1.
- Actual320px phone reduced stepping reaches20 with the correct CNOT after-state;
  document width305px has no horizontal overflow. End reaches80 and disables
  Play; Previous gate then Advance one gate returns to80. At390px a scene change
  from Festival to Market cancels playback and resets its new window to gate0.
- Market stays at gate0 after the old animation interval. Keyboard selection of
  window428,300 cancels the prior window's playback and resets its circuit to0.
  Both local console error/warning logs are empty; viewport is restored.

Final desktop/phone checks, exact private source/deployment/audience, screenshots
and full outcome exports are recorded in the external iteration16 release QA.

## Attempts and limits

The strict-mode integration test caught an undeclared result variable in an
early RAF edit; it was corrected before browser QA/publication. This was an
implementation failure, retained alongside the successful final checks.

This is engineering/heuristic UX QA, not a novice study or new held-out accuracy.
The frozen298/300 native result, matched baseline299/300, historical original
target223/250, Park40/46 false acceptances and browser/native differences retain
their original scopes. No arbitrary-person, unknown-size, occlusion, hardware
execution or end-to-end quantum speedup claim. Physical OS motion preference
and multi-touch are not directly tested. Prior portable checks use copied exact
installed Windows packages; npm installation and cross-platform behavior remain
untested. No contest/public source/video/Qollab submission or usage reset.

Next: improve the next observed comprehension or interaction gap in this same
compact flow; obtain voluntary novice feedback if available. Keep model studies
prospective and freeze protocols before reserved testing.
