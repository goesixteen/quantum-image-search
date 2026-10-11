# Compact Wanda explainer: implementation plan

Replace the long under-the-hood sequence with **one interactive, three-tab
explainer**: **Image + QNN / Grover interference / Measurement**. Use one shared
visual viewport, one short explanation and one control row. Each tab inspects
the same live image and saved run. Keep the main game as the place to hide and
find Wanda; do not repeat its heatmap or false-positive exercise below it.

Iteration 12 implements this plan. See WANDA_ITERATION12_QA.md for actual
local checks and the external publication receipt for private deployment proof.
The earlier six-step guide is preserved in archive/WANDA_LESSON_ITERATION10.md.

## Minimum user flow

1. Open “Look under the hood.” Tab 1 shows the actual selected crop and circuit.
   If no scan exists, its primary action is **Read this image**, which builds
   the oracle without sampling. “Inspect highest score” uses learned scores,
   never the inserted position, to select a useful example.
2. Switch to Tab 2. **Phase flip → Reflect → Next round** reveals how signs
   become different probabilities. A compact round control offers the first
   peak and overshoot; there is no second search task to complete.
3. Switch to Tab 3. See exact outcome probabilities, then **Sample this state**.
   Report the sampled address and independent point evaluation afterward.
   Sampling again keeps every outcome, including an unmarked or wrong result.

Tab changes preserve the selected window, circuit progress and Grover round.
They must not silently rescan, jump to the peak, reset to round zero or sample.
Editing the main scene invalidates the old run and returns to Tab 1.

## Merge the existing interface

| Current nodes | Compact destination |
| --- | --- |
| `#guided-lesson`, six `[data-lesson]` buttons, `.pipeline-nav` | One three-tab header; replace the six-step pagination and scroll-to-card action |
| `#pixel-stage`, `#qnn-stage` | Tab 1: `#trace-crop`, compact `#trace-features`, actual `#bloch-spheres` and circuit controls in the shared viewport |
| `#predicate-stage` | Tab 1 footer: selected score, cell-max representative, threshold/NMS decision and `f(j)`; move full `#oracle-map` into optional details |
| `#grover-stage` | Tab 2: `#grover-operation` with `#grover-plane` as a small inset; keep the same fixed amplitude scale for before/phase/diffusion |
| `.run-inspector`, `#lesson-sample`, `#lesson-measurement` | Tab 3: exact Born-probability bars and the existing sample/result controls |
| `#probability-map` and its display tuning | Fold into advanced inspection; do not show another default heatmap beneath the main game |
| `#science`, constructed oracle lesson, `.lesson-check` | Fold mathematical/reference material into details; remove repeated exercise from the default path |
| `#wanda-evidence`, `#wanda-park-curation`, `#wanda-multiple`, `.history` | One optional “Evidence, experiments & limitations” disclosure |

Move existing nodes rather than cloning them. Keep bound IDs present until the
corresponding listeners/renderers are deliberately updated: `underhood.js`
currently accesses these elements directly. Pause circuit playback when its
tab is hidden; redraw on reveal. Do not remove the only visible result
evaluation or the only notice distinguishing native benchmarks from browser
and curated-art probes.

## Reuse the actual run API

`app.js` already publishes:

- **`wanda-scene`**: final composite pixels, saved model, actual feature
  extractor, supplied target dimensions, threshold, selected grid, per-address
  scores/candidates, marks and diagnostics. Use `selectedWindow()` and
  `traceQNN()` / `getQNNFrame()` for the real classifier state.
- **`wanda-grover`**: exact amplitudes, marks, round, saved maximum/peak,
  busy flag and current measurement/point. Use `groverDrawing()` and the saved
  round inspector, not a parallel teaching simulation.
- **`wanda-lesson-request`**: `{action:'build'}` builds without measuring;
  `{action:'round',round}` selects a saved exact round;
  `{action:'measure'}` uses the main measurement/evaluation path.

Replace the six-step `chooseLessonStep()` navigation with a tab selector that
only changes presentation. Continue using `inspectPredicate()` from
`lesson-model.js`: a clicked fine window can differ from its cell's maximum,
and threshold passage can still be removed by peak suppression. Show the
four-qubit classifier and the separate location register once, beside that
bridge. A classical bitset connects them; this is not a coherent QNN-to-Grover
quantum circuit.

Keep three quantum ideas visible without opening details: **encoding turns
descriptors into rotation angles; a phase flip alone leaves |a|² unchanged;
two reflections alter measurement odds**. Four Bloch spheres remain physical
reduced states of one sixteen-amplitude joint state. Preserve CNOT endpoint
behavior, the final expectation/readout calculation, and keyboard gate
stepping. Scores remain uncalibrated detector outputs. Exact sampling uses
`quantum.js` probabilities; display colors never select an outcome.

## Browser acceptance checks

- Desktop and 390px mobile: one active panel, no overflow, readable crop,
  spheres/axis labels and a visible primary control; no jumps to distant cards.
- Keyboard tabs: tablist semantics, selected state, Left/Right/Home/End and
  focusable panels. Hidden controls must leave the focus order. Retain canvas
  keyboard inspection and reduced-motion single-gate stepping.
- Find first, then open the explainer; build first, then sample; change world,
  size or threshold while inspecting. Confirm stale measurements clear and
  controls become ready after loading. Repeated tab changes preserve the run.
- Below-threshold and suppressed windows, coarse-cell representatives, empty
  oracle and multiple accepted addresses. No accepted set must abstain; no
  truth-based window choice, fallback detector or forced answer is introduced.
- Phase flip keeps probabilities unchanged; reflection previews the next
  round; overshoot can reduce accepted mass. Tab 3 matches exact statevector
  probabilities and every sampled outcome remains visible.
- Comparison mode and uploaded artwork: clearly state when Wanda's circuit
  trace is unavailable or the background is outside its trained domain.
- Frozen model/features and existing evidence remain unchanged. Any new browser
  results are regression checks, not replacements for the original benchmark.

## Overnight handoff and resource cap

Implement the layout consolidation first, then verify these state transitions
before adding polish. Preserve a short progress record and unfinished checks
for the next hourly run. The overnight resource cap is **at most one usage-limit
reset**, as recorded by the coordinating task. When that cap is reached,
checkpoint the work and leave remaining verification explicitly pending.

No contest or public project/video/source submission or publication is
authorized. Existing owner-private review Site updates remain authorized;
their success must be recorded only after an actual deployment receipt.
