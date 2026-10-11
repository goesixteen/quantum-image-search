# Iteration 15 — guided exact Grover round

Started 2026-10-11 09:54:02 UTC from published source
`f8090bd03045d350bdb6d2e9133c0e882887a3b8`. The existing five-world game and
three-stage explanation are retained. Model, threshold, features, recognition
pipeline, renderer and numerical quantum modules are unchanged. No training or
new reserved recognition evaluation occurred. Exact private release is recorded
externally after terminal success.

## Changes and scientific intent

Within Grover interference, Watch one round shows the current signed state,
oracle sign flip and exact reflection preview, then saves one completed round
through the existing game handler. Each snapshot is held for two seconds. It
stops after one round, without a rewind or measurement. Pause/resume and Restart
preview retain the current saved round. Reduced motion uses explicit step clicks.
Manual run controls, image/run identity changes and loading cancel stale timers.
Leaving the stage or hiding the page pauses playback. A guide-owned commit is
validated against the same scene, accepted set and next round.

The old intro incorrectly described reflection as completing a round, while its
button only previewed it. The intro and guide now distinguish preview from saved
state. Measurement always reads the saved round. The four step indicators are
inside the same stage; no additional lesson or duplicate heatmap was added.

This prioritizes the provisional 35% engaging-explanation allocation: show the
two reflections, their signs and their effect on odds without requiring separate
manual connections. The 30% fun allocation retains the five-world game; the 25%
rigor allocation requires exact state ownership/probabilities; the 10% finish
allocation updates source, quick-start and receipt. These are internal planning
assumptions, not official weights or measured educational scores.

## Actual checks

- Three bootstrap regressions exercise both module arrival orders and replay an
  already sampled exact 4,096-state run without reset, rescan or another shot.
- All **140 Node tests pass**, with six new guide regressions covering exact
  4,096-state phase invariance/diffusion, one commit, pause/hidden view, stale
  callbacks, reduced-motion timing, peak overshoot and empty/full/max guards.
  Syntax and diff checks pass. Static helper checks 200 crowd IDs / 33 references,
  73 bus IDs / 13 references; shared quantum modules are byte-identical.
- Read-only frozen verifier passes 11 files, seven source contracts and 12 pixel
  fixtures. Park verifier retains 40 artifacts, 12 external guards, nine complete
  PNGs and 125 full-field checks. No checkpoint/threshold/failure edits.
- Actual Chromium Read image builds round 0 with no sample. Oracle preview keeps
  accepted mass 0.024414063%. Reflection previews round 1 at 0.21958353%, while
  Measurement still explicitly shows saved round 0. Pause/resume preserves each
  preview; one completed sequence saves round 1 and stops without sampling.
- Full round-1 UI export contains 4,096 amplitudes/probabilities, norm **1**,
  accepted probability **0.0021958353463560343** and zero error against p=a².
- Final frozen guide source was reloaded before checking automatic completion.
  Restart preview keeps saved round 1; reduced motion explicitly advances oracle,
  reflection and commit to round 2. First peak stays at 50, then guided stepping
  saves 51 and reduces accepted mass 99.994535% → 99.850737%, without rewind.
- End on the round slider reaches 103 and disables guided playback with useful
  copy. A manual phase click cancels playback. Selecting Market during a new guide
  clears the run; after the old timer window, Market still has Not scanned and the
  guide disabled. Old callback cannot save a round into a new image.
- At 390×844, document width is 375px, guide width about 305px, step indicators
  about 136px wide in two columns. Explicit reflection preview and commit work.
  Empty Park52 has zero accepted addresses and disables the guide with abstention
  copy. At 320px and 768px, no horizontal document overflow; resizing preserves
  the reflection preview and saved round 0, also used by Measurement.
- No local browser errors/warnings observed. The normal viewport is restored.
Private hosted checks and screenshots are recorded in the external release QA.

## Attempts and limits

The first private hosted release exposed a cold-load ordering race: the game
finished initialization before the explainer attached its scene listener.
The image reader stayed disabled until Find republished the scene. This is a
real startup failure, retained here rather than treated as artwork loading.
The final increment adds an explicit readiness handshake and verifies both
module arrival orders; final deployment and fresh-load observations belong in
the external release receipt. The initial release is retained in the work log.

A first direct wait for all six seconds of playback hit the browser tool's
selector deadline; the next observation showed the expected complete round 1.
Stepwise waits avoid that inspection limit. A narrow-screen geometry read saw
zero-size controls while a new scene had returned to the Image tab; selecting
Grover exposed the actual controls. A guessed source-freeze filename was missing;
the actual read-only verifier then passed. No source/evidence changed from those
inspection attempts. Phone review caught an inherited 210px minimum button width;
the guide now uses a scoped 140px minimum to fit narrow controls.

Physical page visibility/OS preference, multi-touch and novice learning are not
directly measured. Hidden-stage behavior is exercised in the browser; timer and
visibility policy have isolated lifecycle tests. Prior package portability uses
copied exact installed Windows dependencies, with npm installation/cross-platform
execution still untested. Recognition scope and original Park40/46 lookalike
failures are unchanged. No arbitrary-person, unknown-size, occlusion, hardware or
end-to-end speedup claim.

Next: keep the compact flow, seek voluntary novice feedback when available, and
improve the actual confusing point rather than adding more teaching units. Freeze
any future model/domain study prospectively. No contest/public submission.
