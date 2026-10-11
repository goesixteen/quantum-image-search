# Fine center-point search with a pixel template oracle

The new local module `dist/search-core.js` accepts a composited RGBA scene and a
known target PNG rasterized at its displayed size. It searches possible **target
center points** on 16×16, 32×32, or 64×64 address grids. On a 512×512 canvas these
produce 32px, 16px, or 8px cells and 8, 10, or 12 address qubits. The target size
stays fixed when the search grid changes. A 64×96 explorer can therefore span many
8px search cells while one candidate represents its center.

This is a classical pixel template matcher that constructs the Boolean predicate
for the existing simulated Grover circuit. It is **not** a newly trained QNN, an
identity detector, or a claimed quantum speedup. The frozen original-art QNN
remains a separate 4×4/8×8 experiment with its existing limitations and checkpoint.

## API and input boundary

```js
import {
  prepareTemplate, matchTemplate,
  gridSpec, candidatePoint, pointCandidate, pointDistance,
} from './search-core.js';

// Rasterize the target PNG on a transparent canvas at its fixed display size.
const template = prepareTemplate(targetImageData, {
  sampleCount: 192,
  minAlpha: 160,
});

const result = matchTemplate(finalSceneImageData, template, {
  grid: 64,
  backgroundImageData: cleanBackgroundImageData, // optional visual reference
  threshold: .45,
  colorTolerance: 75,
  minContrast: 18,
  minimumVisibleFraction: .30,
  minimumInformativeFraction: .20,
});

// Build Grover's phase oracle from result.marks. Never substitute an argmax
// when this array is empty. The simulated search then has no marked output.
// The returned point for a sampled address is:
const point = result.candidates[sampledIndex];
// point.bestX, point.bestY are its pixel-refined center estimate.
```

The matcher accepts no target placement, target-present flag, occlusion mask,
renderer layer coordinates, or ground-truth alpha canvas. Target RGB/alpha is
permitted because it describes the known template. The optional clean-background
image is a visual reference supplied by the user or selected scene, with the same
dimensions and rasterization as the final scene. It contains no location labels.

Background-reference mode fits this compositing playground: the clean scene is
known before the target and foreground layers are drawn. An ordinary photograph
without that clean scene uses the weaker scene-only mode. The two modes should be
named explicitly in the interface. A changed, misaligned, or differently resized
background invalidates the visual-reference assumption.

The return value contains:

- `scores`: unsuppressed pixel-template scores for every address, each in [0,1].
- `marks`: threshold-qualified local matches after explicit nearby-peak suppression.
- `candidates`: address center, refined center, score, matched fraction, informative
  fraction, and in-bounds fraction for each address.
- `diagnostics`: exact score-call/sample-comparison counts and counts before/after
  suppression. An optional `maxRefinements` controls the bounded refinement work.
- `templateSize` and `localizationTolerance`: geometry metadata for independent
  evaluation and display, without any true location.

`gridSpec`, `candidatePoint`, and `pointCandidate` use row-major addresses.
`candidatePoint` returns the address cell's geometric center; the refined center
may differ. Grid values must be powers of two from 2 to 64, and the target needs at
least 16 pixels with alpha at or above the configured threshold.

## How scoring and occlusion work

The template uses up to 192 deterministic, spatially distributed opaque samples.
A fixed hash of the template pixel index chooses samples; it does not depend on
scene contents or placement. Coarse 64-bin RGB color groups receive weights
proportional to the inverse square root of their sample counts, reducing the
dominance of a large uniform color area. Fully transparent target pixels do not
become foreground evidence.

For one candidate sample, let `T` be template RGB, `a` its alpha, `B` the clean
background RGB, and `C` the final scene RGB. With a background reference the
expected composited color is `E = aT + (1−a)B`. RGB distance is the root mean square
of the three channel differences, in the 0–255 channel scale.

Samples with `distance(E,B) < 18` are uninformative: the target barely changes that
background pixel. For the remaining samples, define:

```text
d     = distance(C,E)
gain  = clamp((distance(C,B) − d) / distance(E,B), 0, 1)
q     = max(0, 1 − d/75)² × gain
score = weighted mean of q across informative samples
```

The gain term rejects an unchanged background: if `C=B`, every gain is zero.
Occluded or mismatched samples contribute little or zero rather than forcing a
perfect full-template match. With no background reference, `E=T` and `gain=1`;
near-opaque samples provide the evidence, with reduced protection against similar
colors already present in the scene.

Additional gates require at least 20% informative template weight, at least 30%
informative weight with `d≤75` and `gain≥.3`, and at least 65% in-bounds template
weight. These are explicit engineering tolerances, not learned or calibrated
probabilities. The score's meaning is **weighted visual agreement**, not the
probability that a real person has been recognized. A `.45` threshold allows some
partial matches; a missed or contaminated predicate remains possible.

The initial registration lattice has an 8px spacing on a 512px scene. Every
requested address collects only center hypotheses in its own cell. Up to 12
promising cells are refined over a 1px local lattice, followed by one 1px polishing
pass. The refinement ranking is computed from pixels; it does not alter the empty
oracle rule. The coarse search is approximate and bounded, so weak initial
evidence, fine repetitive patterns, large scale changes, or multiple strong
distractors can still cause misses.

Several nearby centers can describe the same partial visual match. After applying
the score threshold, nearby candidates are suppressed in descending score order
within `max(4px, .35×min(targetWidth,targetHeight))`. This is ordinary classical
postprocessing and is included in oracle construction cost. It can be disabled
with `suppressionRadius:0`. It does not select any candidate when all scores are
below threshold. It can also merge genuinely distinct objects that are closer
than the selected radius. Unsuppressed scores remain available for inspection;
they are not quantum amplitudes.

## Point accuracy and independent evaluation

Evaluate a sampled candidate after measurement using its refined point, rather
than claiming success merely because a small cell touches any part of a large
target. For this controlled experiment, declare the reference to be the center
of the PNG's rendered rectangle. The acceptance tolerance is:

```text
sqrt(cellWidth² + cellHeight²)/2 + 1 canvas pixel
```

For 512px scenes it is 23.627px, 12.314px, and 6.657px on the 16, 32, and 64 grids.
Report this tolerance next to point accuracy. Also inspect independently rendered
**visible** target alpha after foreground occlusion, using alpha>32. If no target
alpha remains visible, a center reference can still be mathematically defined,
but the scene offers no target evidence and it should not count as visible-target
localization. Visible alpha fraction and point accuracy answer separate questions;
the matcher receives neither quantity.

The tests use their known placement solely after scoring to evaluate distances.
Their occlusion percentages count target pixels with alpha>32, separately from
the sparse matcher sample weights. They are not matching thresholds.

## Reproducible validation

From the project directory, run:

```text
node --test tests/search-core.test.mjs
```

The test file contains its own RGBA compositing renderer and dependency-free PNG
decoder/premultiplied bilinear resizer. It exercises synthetic patterns plus the
unchanged original `crowd-captcha.png` and `character.png`. No trained weights or
renderer coordinates are passed into the matcher. The printed `PIXEL_AUDIT`,
`DENSE_AUDIT`, `OCCLUSION_AUDIT`, `FRACTIONAL_AUDIT`, and `FINE_GROVER_AUDIT` records
reproduce the fixture outcomes. All 12 tests pass, including an explicit assertion
that the measured fractional-placement miss remains an empty oracle. A separate
agent reran the suite and reviewed the data flow, formulas, and scope statements.

Current checks pass:

| Controlled check | Result |
|---|---|
| 24 seeded original-art placements/grid, seed 202610105 | 24/24 located on each of 16/32/64, zero false marked points; refined-center error 0px in these integer placements |
| Three additional fixed original-art placements on all three grids | 9/9 located with zero center error |
| Original clean crowd, background-reference mode | Zero accepted points on all three grids |
| Original clean crowd, scene-only mode, 64 grid | Zero accepted points; maximum score .1575 |
| Original explorer with 29.801% visible-alpha pixels covered | Accepted at its exact center; score .6926 |
| Original explorer with 92.185% visible-alpha pixels covered | Empty oracle |
| Two separated synthetic targets | Both retained after suppression |
| Solid-red foreground rectangle against the multicolor synthetic template | Empty oracle |
| Synthetic scene-only full target and empty scene | Target located, empty rejected |
| Three fractional-placement bilinear stress cases, 64 grid | 1/3 accepted; two empty oracles at unchanged `.45` threshold |
| Actual Grover trajectories at 256/1024/4096 states through overshoot | Signed-amplitude error at most 9.99×10⁻¹⁶ against the analytic rotation; Born probabilities and norm verified |

These results concern the same known template identity and controlled compositing
protocol. They do not establish general recognition accuracy on arbitrary uploads,
other people, different pose/scale, or all distractors. The solid-red test concerns
that specific multicolor template; simple or uniform target PNGs may have many
indistinguishable matches. Browser image resizing, fractional drag coordinates,
and new built-in assets require separate checks against actual browser pixels.
In particular, the fractional `.25` and `.5` test placements miss at the frozen
threshold, with peak scores `.43845` and `.37728`; the `.75` placement succeeds
with `.48530` and `.354px` center error. Round the rendered **top-left x/y** to
canvas pixels and use the identical integer-size raster for both rendering and
template preparation to avoid that specific interpolation difference. Rounding
only the center can leave a half-pixel top-left when the rendered dimensions are
odd. This recommendation does not replace an actual browser check.

## Cost and the quantum visualization

With 192 samples and default refinement limits, the implementation performs at
most `(4096 + 12×88)×192 = 989,184` sparse RGB comparisons. Cell-boundary clipping
usually reduces this bound. The fixtures run in roughly tens of milliseconds per
search under local Node; that is a local observation, not a hardware or browser
timing guarantee. Preparing the template and reading/rasterizing images also cost
classical work. Increasing the sample or refinement settings increases this cost.

All candidate scores and the accepted set are computed classically before Grover
starts. The existing statevector simulator amplifies that set and samples its
Born probabilities. Increasing the address grid changes this simulation's state
count; it does not eliminate the template comparison work or confer an end-to-end
search advantage. A classical user could directly inspect the surviving peaks.

For an animated amplitude heatmap, use each simulator history frame's signed
`amplitudes[index]` and `probabilities[index]`. Their relation is
`probability=amplitude²` for this real-amplitude Grover circuit. Color intensity
may represent probability, while sign needs a separate visual cue or legend.
Label the pixel-template score heatmap independently. A high oracle score, an
accepted state, a large simulated amplitude, and a measured point are different
quantities; the visualization should name which one it displays.

## Actual painting and foreground integration audit

`model/layered-integration-audit.mjs` generates the separate
`model/layered-integration-audit.json` report without changing matcher defaults,
source artwork, UI files, or model checkpoints. It loads the **verified final
OpenMoji-derived PNG** from `scene-catalog.json`, then performs the site's alpha>16
trim and prepares integer-sized target rasters. The corresponding SVG is hashed
for provenance; this audit does not rerender SVG patterns or write image assets.

Run `node model/layered-integration-audit.mjs`. It uses `@napi-rs/canvas` 0.1.100,
either locally installed or available in the bundled Codex dependency runtime;
`CODEX_CANVAS_MODULE` can point to another installation. The report pins SHA-256
hashes for its script, matcher, shared scene renderer, presets, catalog, target
PNG/SVG, and painting JPEGs. It flags source changes during a run.

The 2,064 predefined probes are two paintings × four target heights
(24/52/80/112px) × three grids × 86 conditions. Each condition has 24 unoccluded
placements, the same 24 placements behind the enabled foreground layers, six
center/edge probes per each of three real foreground presets behind and in front
of those layers (18+18), one empty scene, and one constructed full-cover control.
The last control copies clean-background pixels over the entire target rectangle;
it is distinct from the real polygon presets. Configurations are paired across
grids and repeated configurations retain their predefined probe weighting.

The actual `scene-editor.js` cover-crop, foreground cutout, paint/erase, layer
ordering, and compositing functions render the scenes with an injected native
Canvas factory. Only final RGB pixels, target RGB/alpha, and clean-background RGB
pixels enter matching. After scoring, the report computes independent target
visibility and center error. Exact Grover predicate and true-point masses include
the possible residual probability on unmarked correct points; empty oracles
contribute zero output mass. One seeded Born sample per probe is reported
separately from those exact masses.

These are **native Canvas integration results**, not a Chrome replay. PNG resizing,
painting cover-crops, mask antialiasing, and color handling can differ in the
browser. The site's observed default browser success remains a separate case.
The primary audit requires any final visible target pixel with alpha>32; it also
saves the remaining alpha-mass fraction. The current site's point evaluator uses
remaining alpha mass>1% as its observability gate. Those gates can disagree near
complete occlusion, so the audit must not be presented as exact UI-metric parity.
Neither gate affects the matcher scores or accepted states. No threshold is
selected or adjusted using this audit.

The completed run pins the final target PNG hash
`8f1b7234e857ba70c84366fe67a4753ce98b9a3b439eb785af810e88c6ff5c94` and reports no
source changes during execution. Each clean cell below contains 48 paired probes
(24 placements on each painting):

| Target height | 16×16 clean hits | 32×32 clean hits | 64×64 clean hits |
|---|---:|---:|---:|
| 24px | 44/48 | 44/48 | 48/48 |
| 52px | 35/48 | 35/48 | 48/48 |
| 80px | 40/48 | 40/48 | 48/48 |
| 112px | 37/48 | 48/48 | 40/48 |

At the default 52px target / 64×64 grid, 45/47 visible layered nominal probes
hit, all 36 foreground-in-front probes hit, and 13/34 visible real-foreground
behind probes hit. Heavy occlusion therefore remains a substantial limitation.
There were zero false marked points over all 2,064 predefined probes. All 24
empty probes, all 33 probes fully hidden by the real presets, and all 24
constructed full-cover probes had empty oracles. These counts are controlled
known-background observations, not an estimated general false-positive rate.

Overall, 1,548/1,983 alpha>32-visible probes had a clean accepted center (78.06%);
435 visible probes missed and remain in the report. The unconditional mean ideal
true-visible-point mass was 74.984%, including abstention, versus 74.984% predicate
mass at the displayed precision. The single seeded measurement stream returned
1,548 correct points and 516 no-output cases; those seeded outcomes are distinct
from expected probabilities. The 2,064 weighted probes contain 678 unique
configured scenes when address grid is excluded from the configuration key;
this does not claim 678 distinct RGB images or independent trials.

There are 15 observability-gate disagreements: each has a pixel above alpha 32
but less than 1% remaining alpha mass. All 15 abstain. Under the site's mass gate
the visible denominator would be 1,968 instead of 1,983, with the same 1,548 hits;
retain the declared denominator when quoting a rate.

Larger address grids are not guaranteed to improve this approximate matcher.
Each address retains one coarse registration winner and only a bounded number
of cells receive fine refinement. Repetitive features, cell aggregation, and
initial registration can yield misses even for an unoccluded target. For example,
`bruegel-h52-g16-clean-placement-00` has top-left (0,0), size 18×52, and a `.3516`
peak at (9,22), so it abstains; the paired 64-grid probe accepts the true center
(9,26). The 112px / 64-grid failures show that additional cells can also worsen
the bounded initialization. The audit records these failures without tuning or
promoting a new matcher.

This run observed about 117ms mean matcher time and at most 979,392 sparse RGB
comparisons per probe on the active local runtime. These are measurements from
this native Canvas experiment, separate from browser timing or asymptotic
quantum oracle-query counts. The verified browser default and partial-occlusion
examples should be presented alongside, rather than substituted for, these
broader native results.

A separate validation checked all 2,064 saved records against their accepted
points and per-group hit totals. The 41 distinct `(grid, marked count, correct
candidate count, true accepted count)` tuples were also reconstructed with the
actual `simulateGrover` statevector and equivalent marked/unmarked truth
cardinalities. Their true-point probability error was at most 1.55×10⁻¹⁵. This
checks the aggregate probability calculation; it does not replace the renderer
ground-truth protocol or claim a complete Chrome replay.
