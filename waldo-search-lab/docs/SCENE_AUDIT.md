# Expanded crowd scene audit, iteration 03

The frozen QNN finds a true region in **356/ 384 nominal 4×4 scenes** and
**345/ 384 nominal 8×8 scenes** in this expanded controlled audit. The matched
logistic classifier finds 384/ 384 and 365/ 384. Both have zero false marks in the
nominal suite. The larger audit preserves misses that were easy to overlook
in the earlier 20-scene sample; brightness and scale stress reveal additional
limits shared by these engineered pixel features.

This is **Pillow-rendered evaluation of the same original character and crowd
assets**, with frozen model weights and validation thresholds. It does not
measure recognition of unseen people, crowds, or photographs. Native browser
confirmation is reported separately for two named fixtures below.

## Classifier outcomes

Each table row has 384 predefined target-present probes. Nominal 8×8 contains
369 unique rendering configurations;15 corner probes repeat. The other three
suite/grid combinations each have 384 unique configurations. A hit means at least one marked
region contains an inserted pixel with alpha >32. A false-mark scene has at
least one accepted region outside that annotation. A clean hit means at least
one true marked region and zero false marked regions; it does not require
accepting every overlapping region. Empty-oracle abstentions are misses.

| Suite/grid | Model | Target hits | Any false marks | Clean hits | Misses | Empty oracles |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Nominal 4×4 | QNN | 356 / 384 | 0 | 356 | 28 | 28 |
| Nominal 4×4 | Logistic | 384 / 384 | 0 | 384 | 0 | 0 |
| Nominal 8×8 | QNN | 345 / 384 | 0 | 345 | 39 | 39 |
| Nominal 8×8 | Logistic | 365 / 384 | 0 | 365 | 19 | 19 |
| Stress 4×4 | QNN | 319 / 384 | 0 | 319 | 65 | 65 |
| Stress 4×4 | Logistic | 380 / 384 | 0 | 380 | 4 | 4 |
| Stress 8×8 | QNN | 176 / 384 | 48 | 132 | 208 | 204 |
| Stress 8×8 | Logistic | 189 / 384 | 0 | 189 | 195 | 195 |

QNN and logistic use the same RGB feature matrices in every pair. The QNN's
threshold stays approximately 0.22 and logistic approximately 0.15, selected by
their earlier validation protocol. No audit result changes those thresholds,
weights, asset bytes, or feature definitions. The different parameter counts
and optimizer histories do not make this an equal-capacity or equal-budget
comparison; [BASELINE.md](BASELINE.md) describes the matched experiment.

## Probability and actual seeded samples

Accepted-set mass is the ideal probability of measuring any classifier-marked
region. True-target mass is the ideal probability of measuring an alpha 32
target region, including any remaining probability on unmarked target regions.
Empty oracles produce no output and contribute zero effective target success,
matching the websites. The theoretical uniform distribution at zero rounds
is retained separately in the detailed report.

| Suite/grid | Model | Mean accepted-set mass | Mean effective true-target mass | One seeded sample per scene | 64 seeded samples per scene |
| --- | --- | ---: | ---: | ---: | ---: |
| Nominal 4×4 | QNN | 88.995% | **89.253%** | 342 / 384 | 21,964 / 24,576 |
| Nominal 4×4 | Logistic | 95.932% | **96.217%** | 370 / 384 | 23,673 / 24,576 |
| Nominal 8×8 | QNN | 89.539% | **89.544%** | 344 / 384 | 22,000 / 24,576 |
| Nominal 8×8 | Logistic | 94.729% | **94.734%** | 364 / 384 | 23,276 / 24,576 |
| Stress 4×4 | QNN | 79.765% | **80.000%** | 308 / 384 | 19,690 / 24,576 |
| Stress 4×4 | Logistic | 94.968% | **95.234%** | 366 / 384 | 23,456 / 24,576 |
| Stress 8×8 | QNN | 46.751% | **40.121%** | 148 / 384 | 9,815 / 24,576 |
| Stress 8×8 | Logistic | 49.053% | **49.055%** | 187 / 384 | 12,058 / 24,576 |

Sample denominators include requested searches that return no measurement.
The report also records returned-measurement counts. Samples are simulated
Born draws, not hardware measurements. The first draw is the one-sample result
and is included among the 64 repeats. A deterministic hash of each fixture ID,
combined with measurement seed 202610304, seeds the PCG64 generator; paired
models use the same uniform draws. That pairing reduces incidental comparison
noise without changing either marginal distribution.

These sampled counts must not replace the exact probabilities. Expected hit
counts and their Poisson-binomial standard deviations are included for each
summary, because scene probabilities differ. For example, the nominal 4×4 QNN
expects 342.73 successful first samples and produces 342 in this seed.

The independent, previously cross-runtime-verified formula is copied unchanged
into `model/grover_audit.py`. For marked set S, target set T, `M=|S|`,
`theta=asin(sqrt(M/N))`, and the app's integer first-peak round k:

```text
P(S) = sin²((2k+1)theta)
P(T) = |T∩S|/M · P(S) + |T\S|/(N−M) · (1−P(S))
```

The empty/full marked-set cases are uniform at zero rounds. The distribution
is built from the predicate before alpha is read; samples are then drawn.
Only afterward is the alpha annotation evaluated to score hits and compute
true-target mass. No ground-truth coordinates or label enter scoring, marks,
iteration choice, or measurement probabilities.

## Placement protocol

Audit seed 202610303 controls geometry. The nominal scene is 512×512 and uses
the exact normalized `crowd-captcha.png`. Full character height is 0.75 times
cell height with its 2:3 aspect ratio:64×96 on 4×4 and 32×48 on 8×8. Integer-pixel
positions and Pillow LANCZOS sprite/ 128×128 feature-patch resampling are used.
The browser can use fractional positions and a different rasterizer.

| Nominal placement family | 4×4 count | 8×8 count | QNN hits, 4×4 /8×8 | Logistic hits, 4×4 /8×8 |
| --- | ---: | ---: | --- | --- |
| Every snapped tile center | 16 | 64 | 16 / 16;63 / 64 | 16 / 16;62 / 64 |
| Vertical boundaries | 64 | 64 | 61 / 64;50 / 64 | 64 / 64;61 / 64 |
| Horizontal boundaries | 64 | 64 | 55 / 64;55 / 64 | 64 / 64;62 / 64 |
| Boundary intersections | 64 | 64 | 57 / 64;58 / 64 | 64 / 64;57 / 64 |
| Uniform random free placements | 176 | 128 | 167 / 176;119 / 128 | 176 / 176;123 / 128 |

Boundary probes move the sprite's center across interior grid lines at seven
relative offsets:−0.45,−0.30,−0.15,0,0.15,0.30,0.45 of its width/height.
Positions are clamped to the canvas. Boundary-family names describe intended
center placement; alpha fragmentation is recorded independently, since the
cutout contains transparent margins. The aggregate mixture differs between
grid sizes because every snapped center is included. Model comparisons within
each row are paired; aggregate percentages are not estimates for a natural
distribution of user placements.

The 8×8 corner indexing cycles through 49 locations within its 64 declared cases.
The report preserves that original deterministic schedule and weights every
probe; it does not present 384 independent image identities. A separate
post-evaluation sensitivity analysis in
[`model/scene-audit-diagnostics.json`](../model/scene-audit-diagnostics.json)
retains the first case at each identical geometry/size/brightness combination.
Nominal 8×8 then has QNN 330/369 hits (89.43%) and logistic 350/369 (94.85%).
This analysis is descriptive and changes neither models nor the primary
denominators. Future probe protocols should sample unique boundary
configurations before results are inspected.

## Separate stress probes

Eight fixed variants each receive 48 placements per grid:24 random,12 vertical,
6 horizontal, and 6 corner probes. The same character/crowd identities are used.
Training foreground brightness was 0.90–1.08; these more extreme transformations
probe behavior outside that range. Whole-scene brightness also changes crowd
pixels, whereas foreground brightness changes only the inserted cutout. Alpha
is preserved by both operations.

| Stress variant | Transform | QNN hits, 4×4 /8×8 | Logistic hits, 4×4 /8×8 |
| --- | --- | --- | --- |
| Small | Character scale 0.55 | 42 / 48;0 / 48 | 47 / 48;0 / 48 |
| Large | Character scale 1.40 | 46 / 48;46 / 48 | 48 / 48;45 / 48 |
| Foreground dark | Foreground brightness 0.72 | 46 / 48;0 / 48 | 48 / 48;0 / 48 |
| Foreground bright | Foreground brightness 1.22 | 46 / 48;45 / 48 | 48 / 48;48 / 48 |
| Small dark | Scale 0.60, foreground brightness 0.72 | 2 / 48;0 / 48 | 45 / 48;0 / 48 |
| Large bright | Scale 1.25, foreground brightness 1.22 | 45 / 48;41 / 48 | 48 / 48;48 / 48 |
| Scene dark | Whole RGB brightness 0.72 | 44 / 48;0 / 48 | 48 / 48;0 / 48 |
| Scene bright | Whole RGB brightness 1.22 | 48 / 48;44 / 48 | 48 / 48;48 / 48 |

All 48 QNN 8×8 scene-bright cases have a false mark and zero clean hits. In the
empty brightened crowd, tile 46 is accepted at score 0.221344, just above the
frozen threshold. On this variant, mean accepted-set mass is approximately
99.87%, while actual target mass is 46.84%. Grover amplifies that background
error along with the correct predicate marks. Logistic has no empty-crowd mark
in this probe.

Original, darkened, and brightened empty crowds are audited separately for both
grids. All yield zero false marks except the brightened 8×8 QNN case, which has
one. These are six exact empty rasters, not a population absence study.

The 8×8 small/dark failures occur in both classifiers and point to a feature
bottleneck. The extractor's absolute white/red intensity tests and loss of
thin stripe detail are plausible mechanisms; this is an interpretation of
pixel features and failures, not a proven causal ablation or a new trained fix.

## Browser-confirmed fixtures and practical next steps

Root replayed these placements in the actual browser at the frozen QNN
threshold, using the existing pixel inference path:

| Fixture | Native geometry | Pillow QNN result | Native browser result |
| --- | --- | --- | --- |
| `nominal-g 4-default-vertical_boundary-032` | Grid 4; x 352,y 347; width 64,height 96 | 0 / 16 marks | **0 / 16 marks, no measurement** |
| `nominal-g 8-default-vertical_boundary-006` | Grid 8; x 418,y 104; width 32,height 48 | 0 / 64 marks | **0 / 64 marks, no measurement** |

The empty-oracle branch requests no measurement and therefore invokes no
post-measurement browser ground-truth scoring. These checks confirm two
known-present rejection cases; they do not establish browser parity for all
Pillow scores, alpha sets, stress transforms, or aggregate rates. The local UI
now has a deterministic boundary challenge and reset action. No model fallback
or threshold retuning was introduced by this audit.

Useful UX choices supported by this evidence are preserving the default 4×4
demo, clearly naming free/boundary placement as a harder experiment, and
retaining a visible no-accepted-regions result when the predicate abstains.
Showing the heatmap can explain a rejected placement without claiming that
Grover identified the target. The accepted-set and true-target probabilities
should remain distinct, and ground truth should remain evaluation-only after
measurement. Future feature experiments can address brightness and stripe
resolution with new declared validation/holdout probes; this now-inspected
audit should be treated as development evidence rather than a fresh holdout.

## Artifacts and reproduce

- [`model/scene_audit.py`](../model/scene_audit.py): deterministic paired scene audit and export.
- [`model/scene-audit-summary.json`](../model/scene-audit-summary.json): compact UI-ready counts and probabilities.
- [`model/scene-audit.json`](../model/scene-audit.json): all 1,536 target-present scenes, scores, marks, alpha counts, fixture IDs, samples, and provenance.
- [`model/scene-audit-fixtures.json`](../model/scene-audit-fixtures.json): illustrative failures with exact geometry and image hashes.
- [`model/scene-audit-failures.png`](../model/scene-audit-failures.png): labelled montage with target fragments.
- [`model/scene-audit-fixtures/`](../model/scene-audit-fixtures): original RGB fixture PNGs and separate evaluation alpha masks.
- [`model/test_scene_audit.py`](../model/test_scene_audit.py): six checks for pixel-cache parity, labels not changing predictions/samples, brightness-alpha invariance, frozen logistic scoring, and empty-oracle semantics.
- [`model/scene-audit-parity-results.json`](../model/scene-audit-parity-results.json): identical-pixel JavaScript/Python results for 24 hard fixture patches.
- [`model/scene-audit-diagnostics.json`](../model/scene-audit-diagnostics.json): repeated-geometry sensitivity and exact feature-matrix collision counts.
- [`model/hybrid-parameter-audit.json`](../model/hybrid-parameter-audit.json): read-only influence checks for the unchanged bus and crowd hybrid circuits.

The montage selects the first qualifying miss/disagreement and lowest nominal
target mass, then a failure per stress variant, with an explicit bright-crowd
contamination example. It illustrates failure mechanisms and does not replace
the full denominators. Green outlines indicate evaluation truth; orange
outlines indicate QNN marks. The enlarged tile is the largest target fragment.

From `waldo-search-lab`, with NumPy and Pillow installed:

```powershell
python model/scene_audit.py
python model/scene_audit.py --verify-only
python -m unittest discover -s model -p test_scene_audit.py -v
python model/scene_audit_diagnostics.py
python model/scene_audit_parity.py
node model/scene-audit-parity.mjs
```

The full run takes about 27 seconds in the supplied local environment. Pixel
features are cached by SHA-256 of actual RGB tile bytes and source tile width,
so unchanged crowd tiles avoid redundant extraction. Cache keys never use
position, alpha, labels, or target metadata. Eleven records were independently
checked against uncached full inference. `--verify-only` reconstructs eight
saved records, their seeded samples, feature/alpha data, empty rasters, and
frozen input/source hashes without writing outputs; it is a partial renderer
replay rather than rerendering every scene. All six tests pass.

The 24 hard patch fixtures also pass against the actual `dist/qnn.js` extractor
and predictor on identical supplied RGBA arrays: maximum feature error 4.44e-16
and probability error 8.89e-16. This checks classifier parity, not equivalence of
Pillow image assembly with the browser rasterizer. Those hard fixtures include
target fragments, top scores in missed scenes, and the brightened background
false mark.

A separate read-only check confirms that all three current hybrid models
(illustrated bus, photo bus, and crowd) have 40 nominal parameter slots,
including four final learned RZ slots that cannot affect the present
computational-basis predictions. Zero-based angle indices 25,27,29,31 alter
only phases before the final CNOT basis permutation; all seven observables are
Z-products. Across 128 seeded feature probes, prediction derivatives for these
slots are at most 1.95e-16 and large simultaneous phase perturbations change
predictions by at most 1.23e-15. Thirty-six remaining slots respond to the
current predictor; this is not a proof of their independence or a 36-dimensional
model family. `40 parameter slots` is a more precise interface label than
implying 40 independent prediction degrees of freedom.

`python model/hybrid_parameter_audit.py` reproduces this three-model check when
both `waldo-search-lab` and its sibling `bus-search-lab` directories are present.
The script intentionally references both projects; it is not a standalone bus
package entry point. The main scene audit, fixture parity, and diagnostics use
only files in the crowd project.

Asset/model/source hashes are frozen before evaluation and checked again
before writing. The exact saved logistic sigmoid implementation is used,
including its stable unclipped tails. Earlier QNN and baseline checkpoints,
feature definitions, and UI files are unchanged. No submission, source commit,
or website publishing occurs in this work step.
