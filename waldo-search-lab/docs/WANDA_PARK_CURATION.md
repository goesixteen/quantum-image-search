# Wanda Park: display diagnosis and lookalike curation

The Park heatmap exaggerated rejected background evidence. Correcting the
display makes its colors more faithful to the learned scores; it does not
improve the classifier. A separate experiment is now choosing a realistically
placed, Wanda-based lookalike for the demonstration using model feedback.
That artwork curation is development work, not a held-out recognition test.

## What the original Park diagnostic shows

The fixed Chromium capture contains no inserted Wanda. The frozen classifier's
highest raw score is **0.3745536875 at (220, 332)**, over mostly flower/foliage
pixels. It is below the unchanged acceptance threshold
**0.9056472753**. The entire captured scene has **zero accepted addresses**.
The raw maximum near the right edge, at (492, 308), is only **0.1643896686**.

The old display averaged neighboring scores with a normalized Gaussian kernel
of width 2.25 address cells. This promoted a broad cluster at the image corner
above the narrower raw peak. A power of 0.35 then brightened weak values, and
exposure 1.8 pushed the palette further toward warm colors:

| Original absent-Park display quantity | Value |
| --- | --- |
| Averaged field maximum, at display coordinate (2, 2) | 0.0696195607 |
| After `value ** 0.35` | 0.3935101579 |
| Palette position after exposure 1.8 | 0.7083182842 |
| Rendered palette color | Orange, RGB (248, 151, 69) |

The **6.9619% averaged value became a 70.8318% palette position**. Neither
number is the probability that a person is present. The average can change
the location of the maximum; the power and exposure brighten that result.
The old palette's perceived luminance is also not a numerical score scale.

The descriptors summarize colors, stripe rhythm, head/clothing geometry,
alignment and supplied size. Their names do not make them semantic person
features. For example, a manually inspected white-top/blue-trouser person
scored 0.0038918035 in one window; the maximum across its declared twelve-window
neighborhood was 0.0278558686. These inspection coordinates are not a human
detection benchmark. Feature values are descriptive measurements, not causal
attributions: the trained circuit mixes all eight before its learned readout.

The same recorded Park fixture with Wanda inserted has a raw accepted peak of
0.9914987577 at (276, 348). The heatmap's old visual ranking therefore did not
faithfully communicate the classifier's raw ranking.

## Display correction

The current Wanda score view uses a max-normalized Gaussian envelope:

`F(x) = max_i[score_i * G(x - x_i)] / max_i[G(x - x_i)]`.

It preserves constant inputs and the global score bound. A broad weak region
cannot average away a narrow strong peak. The default uses **score power 1**
and **exposure 1**, with an optional weak-clue boost clearly identified as a
display choice. The reproduced absent-Park maximum is now 0.3745536875 near
display coordinate (218, 330), with palette RGB (63, 192, 173). The rejected
right-edge maximum remains visible at 0.1643896686, RGB (26, 122, 153).

The default amplification display reaches **100% Born-probability view** at
the final useful peak, instead of retaining the previous approximately 47%
detector-evidence contribution. These probability halos remain a smoothed,
tone-mapped display. Exact address probabilities and statevector sampling are
separate. Halo width is not localization uncertainty, and Grover does not move
probability between neighboring image cells.

This correction changes no weights, features, threshold, accepted address,
Grover state or measurement rule. Rejected scores remain available in the score
view. False accepted addresses would still receive amplification. In an empty
oracle the app retains the candidate display and abstains; no location is
sampled and no successful amplification is claimed.

The diagnostic and reproduction files are retained in
`work/wanda-park-field-audit/`: `diagnosis.json`, `before-after.json`, the saved
display sources and supporting data. The before/after overlay is a scientific
reproduction over the exact captured image, not a new browser screenshot.

## Wanda-based lookalike artwork

The requested lookalike is a fictional illustrated Park visitor derived from
the supplied Wanda artwork, placed through the scene renderer. Two generated
variants are preserved as exact PNG assets:

| Asset | Current curation status |
| --- | --- |
| `dist/assets/wanda/lookalikes/coral-denim-v1.png` | Retained failed candidate: overaccepted at some supplied detector sizes |
| `dist/assets/wanda/lookalikes/burgundy-plum-v2.png` | Under assessment; final placement and acceptance are pending |

The coral record retains **80 native-rendered probes**, including initial
placements, small phase changes and checks across all five supported detector
heights. Twenty-six probes produced a nonempty accepted set. All six shortlisted
placements failed the requirement to remain unaccepted across heights 40, 46,
52, 58 and 64. This preserves the failure rather than selecting only its safe
52px examples. The records remain in `work/wanda-park-decoy-probe/`, including
`protocol.json`, `probe-results.json` and rendered candidates.

Asset hashes at this documentation snapshot:

- Coral: `ee6a0c0c4b8bdd9913279692c205d6ca8081fbcb53b2d938c6cde885784c64c0`.
- Burgundy/plum: `346f8d943c649a514eba18b58a3937fa24654de11e4671195e9cff8de90097a8`.

Choosing appearance, scale or placement after inspecting scores makes this
**model-guided demo artwork curation**. It cannot establish general person
recognition, closest-person similarity, independent accuracy or an improvement
to the trained model. Placement metadata belongs to rendering and evaluation;
the learned oracle still receives only final image pixels, supplied target size
and its saved model. No training or threshold adjustment is part of this work.

The frozen model remains
`d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88`.
The original **298/300 native reserved complete-scene result** evaluates the
original five backgrounds and Wanda placements. It does not evaluate a newly
curated Park or either lookalike. Its original benchmark and the separate
browser-rendering diagnostic must remain intact; see [WANDA_QNN.md](WANDA_QNN.md).
The new visitor's generated-art provenance is separate from open-art credits;
no open-source or public-domain license is asserted for these PNGs.

## Verified Park pilot — 2026-10-11T06:37:21.820917+00:00

Selected the coral/denim variant, planted at requested(169,400), height50px, registered rectangle(162,375,15,50), actualcenter(169.5,400). It uses the actual WandaPNG as its edit reference. All three generated originals and exact prompts are preserved in `dist/assets/wanda/lookalikes/provenance.json`. The burgundy/plum variant was safe but too weak: default local score0.02008. Brick/cream had one useful default52px score0.41258, but a46px false acceptance. These are failed curation attempts retained alongside the coral probes.

All113 native curation scans, one nativepositive and11 actual-browser score checks are in `model/wanda-park-curation/`. Full113-row native replay reproduced marks/top8/local winners/features exactly;45 archivedPNG checks passed. The source model, threshold and original Park were never changed. Downloadable summary: `dist/model/wanda-park-curation.json`.

The native coral50px art produces0.7020770671 at default supplied52px. Direct browser cutout resampling initially reduced this to0.1277221, leaving foliage0.3745537 strongest. That failure is retained. The shipped version uses a separately saved native512px scene derivative, `park-coral-v1-512.png`, SHA586ca63a9e04fc4bc96253deca174dca31f009230390ce7c42d25f7bc9f79a08. Actual Chromium pixels of that scene are decodedRGBA-identical to the native finalist. The browser's strongest point is now the planted lookalike at(172,396),70.21%; the empty-Wanda oracle accepts zero addresses.

This is conditional on the default supplied52px. Frozen native/actual-browser scores at supplied40/46/52/58/64px have global maxima0.9998093/0.9998964/0.7020771/0.1836431/0.2316352. The40px and46px searches falsely accept the lookalike. No all-size-safe decoy or identity recognition is claimed. This is model-guided art selection for a visual explanation; it cannot increase the original benchmark.

With real Wanda restored at(420,300),52px, the actual browser accepts only2420, measures420300 at round50, and grades centererror0.5px, fullyvisible100%. Independent final-RGB replay scores Wanda0.9933728170 and the bystander0.7020770671, with zero false marks. The ordinary draggable Wanda still exhibits documented backend resize differences:625changedpixels, all inside its rectangle, versus nativepositive. Static artwork preserves decoy pixels only.

The catalog retains exactlyfive choices and original source paths. `curatedArtwork` metadata is used only to render; scanQNN still receives final sceneRGB, suppliedwidth/height and frozenmodel. Alpha trimming/resizing/composition is normal renderer processing, not a manual score or oracle edit. Pre-rendered art is loaded512-to512 to preserve these pixels. Inference receives no base image, sprite pixels, masks, presence or renderingcoordinates.

Default heat uses the peak-preserving score envelope, power1, exposure1 and final Born mix1. Honest UI descriptor labels describe stripe/palette/moments. 114Node tests and the frozen verifier pass. Local proof and actual private publication details are recorded in the root handoff/receipt after terminal deployment; source QA is in WANDA_ITERATION11_QA.md.

Latest human steering prioritizes a single2–3stage explanatory interactive next, with no repeatedheatmap/mainfalse-positiveexercise. See WANDA_COMPACT_EXPLAINER_PLAN.md. The hourly overnight automation is active; maximumone usage-limitreset, zero used andone to preserve for personal use. No contest/public submission or publication has been performed.
