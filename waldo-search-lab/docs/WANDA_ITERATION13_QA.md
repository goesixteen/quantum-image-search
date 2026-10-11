# Iteration 13 — responsive quantum explanation

Started from published source `f5e429a94f885dc8afd1469079ca69f065c8cd56`.
The work improves the existing three-stage interactive rather than adding more
explanatory units. The game, five worlds, detector, threshold and sampling path
remain the same. Private publication and its exact source are recorded in the
external publication receipt after terminal deployment.

## Changes

- Canvas coordinates use CSS pixels and a high-DPI backing buffer capped at 2×.
  Circuit, Bloch, signed-amplitude and probability labels remain readable on a
  phone. Hidden panels redraw the same saved state on reveal and resize.
- Narrow circuit views show a labelled consecutive slice of the actual ordered
  layer. All 80 gates remain accessible. The optional joint-state view retains
  all 16 outcomes in four rows on narrow screens.
- The input-angle / learned-angle / CNOT legend and final full-circuit readout
  are visible. Seven pixel descriptors plus supplied size set eight input angles.
  The final score is explicitly separate from intermediate gate playback.
- Short action cues connect the three stages. Coming from Find Wanda keeps its
  saved round; Start at round 0 explicitly rewinds it. Reflection previews the
  next round, while Complete one round commits it. Sampling uses the saved round.
- Exact zero and subpixel signed bars are drawn at their actual height. No
  minimum-height marker exaggerates a small tail. Class-total probability bars
  use a fixed 0–100% scale; numerical labels retain the tiny unmarked mass.
- Optional exact-map accessibility text now identifies logarithmic color
  intensity and exact inspector values. No color transform changes amplitudes.
  A previously dangling keyboard-help reference now resolves to visible text.

## Checks actually performed

126 Node tests pass, including six new drawing tests. They cover bounded backing
resolution, every real gate in responsive slices, CNOT order, representative
addresses without renormalization, all 16 basis outcomes and zero/subpixel tails.
The existing trained trace checks cover 28 cases and 4,508 physical gate frames.
JavaScript syntax and static references pass: 197 unique crowd IDs / 33 local
references, 73 bus IDs / 13 references. Shared quantum modules remain identical.

Read-only frozen checks pass: 11 files, seven source contracts and 12 pixel
fixtures; model SHA `d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88`
and threshold `0.9056472752971427` are unchanged. Park verification retains 40
artifacts, 12 external guards, nine PNGs and 125 engineering checks. These are
engineering regressions, not new held-out recognition results.

Actual Chromium local checks:

- Desktop Find returned address 2420, point (420,300), peak round 50, center error
  0.5px, full visibility. Opening Grover kept round 50 and that sample. Start at
  round 0 reused the run and cleared its old sample.
- Read this image built round 0 without sampling. Accepted mass was 0.024414063%.
  Phase marking kept it unchanged; reflection previewed round 1 at 0.21958353%
  while the saved slider stayed 0. Complete one round saved round 1.
- Peak round 50 showed accepted mass 99.994535%, unmarked mass 0.0054653891%,
  and each unmarked probability 1.334649e-8. The full distribution remains
  available independently of the plotted representative addresses.
  The actual UI export contained all 4,096 probabilities, each exactly the square
  of its saved amplitude; sum/norm was 0.9999999999999403, with no renormalization.
- At 390px, the circuit displayed gates 1–6 of its actual 20-gate layer, with
  120px spheres. Measurement used a 305px-wide / 210px-high logical canvas.
  At 320px it used 235px width. Document widths were 375px / 305px respectively,
  with no horizontal overflow. At 768px, the circuit kept a labelled real slice.
- Resizing and tab changes preserved gate 80, saved round 50 and the measurement.
  Inspecting unmarked address 0 did not replace the sampled result. A reflection
  preview of round 51 gave 99.850737%, while measurement still described round 50.
- CNOT endpoint stepping from gate 16 to 17 changed the affected qubits' Bloch
  lengths from 1.000 to 0.292 and purities from 1.000 to 0.543. The two other
  qubits remained pure. The optional basis inspector reached |1111⟩ by keyboard
  in its complete four-row layout.
- Park at default 52px with Wanda removed accepted zero addresses, displayed the
  uniform mathematical state, and disabled sampling. No forced answer appeared.

## Attempts, repairs and interpretation

Independent review caught the inherited one-pixel minimum signed-bar height;
it was removed before publication. An initial slice test caught reference
addresses being crowded out; the helper now reserves spread-out references.
Static checking was first launched from the wrong directory and then passed
from the workspace root. Browser inspection initially targeted a nonexistent
text ID and an incorrect scene option; corrected these using current DOM state.
The phone override applied to the newest QA tab rather than the earlier desktop
tab; responsive observations above came from the verified phone tab.

This is an engineering and heuristic walkthrough audit, not a human learning
study or evidence of educational effectiveness. The display is a faithful
simulation, not hardware execution or an end-to-end quantum speedup. The
historical 298/300 native result belongs to the original five unseeded scenes;
the curated Park edit still has known 40px/46px false acceptances. Neither the
model nor threshold was retuned, and no reserved test was reopened.

Next: obtain voluntary first-time feedback on the three-stage flow when the user
returns; check first-load/download packaging and presentation finish. Preserve
the current math and evidence while improving comprehension. Foreground work
remains secondary. Do not submit or publish public contest materials.
