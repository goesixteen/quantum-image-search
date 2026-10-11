# Crowd scene editor: detector and evaluation contract

The resumed user request adds finer location cells, an amplitude/probability heatmap, multiple backgrounds and target PNGs, and foreground people/objects that the target can be dragged behind. The local source now implements this editor and its classical matcher; browser checks of new artwork and hosted deployment remain separate verification steps. Preserve the latest instruction: **keep improving, do not submit work**.

## Using the local editor

The default scene is Bruegel's public-domain painting with an attributed red/white OpenMoji figure. Drag the target token onto the scene, or drag its placed figure. Use arrow keys for small moves and Enter to search. Template mode keeps the target size separate from the 16×16, 32×32 and 64×64 location grids; 64×64 gives 4096 addresses and 8px cells on the 512px scene. The selected reference is matched at its current known display size.

Enable named foreground cutouts and choose **Behind foreground** to place the figure underneath them. The custom cutout brush paints or erases a mask over a person/object in the background; the application copies those background pixels into a transparent PNG layer. This is native canvas composition, without modifying the preserved source artwork files. Foreground PNG downloads and layer JSON export make this stack inspectable. **In front of foreground** changes the target's layer order.

Choose image, detector-score, signed-amplitude or Born-probability views explicitly. Search constructs the accepted peaks from pixels, animates phase marking and diffusion, then samples an address. The iteration slider allows overshoot; re-sampling displays another simulated outcome. Removed, too obscured or below-threshold targets can produce no accepted state.

The original character/crowd pair enables the separate frozen QNN mode at 4×4 or 8×8. Its patch accuracy belongs to that older experiment. Other artwork, target PNGs, scales or uploaded images do not automatically train or validate the QNN.

## Two distinct detector modes

**Fine template mode** compares the composited scene's RGB pixels with the selected reference PNG at declared candidate locations. It is classical known-exemplar matching. It is not a newly trained QNN, arbitrary person recognition, or a coherent quantum vision oracle. A template reference can be chosen by the user; its pixels and fixed alpha shape are legitimate detector inputs. Known target placement and scene-specific occlusion masks are not legitimate detector inputs.

**Frozen QNN mode** retains the existing four-qubit, four-layer classifier and its trained eight-feature extractor for the original character/crowd experiment at 4×4 and 8×8. Different targets/backgrounds/uploads extend beyond its validated same-art domain. Label exploratory failures rather than imply that merely loading an image retrained the model. Its 40 stored slots include four inactive final RZ slots and 36 remaining prediction-influencing slots; no independence or function-dimension claim follows.

OpenCV documents template matching as a sliding comparison between an image and a reference patch, producing a location-indexed score map; its object-detection API also defines masked comparisons. This supports the general mechanism, not performance claims for our custom matcher. Transparent reference weighting may ignore a PNG's irrelevant margins. It cannot use the rendered object's true position to select which candidates to score. [Official template-matching documentation](https://docs.opencv.org/4.13.0/df/dfb/group__imgproc__object.html), [official tutorial](https://docs.opencv.org/4.13.0/de/da9/tutorial_template_matching.html).

A reference matched to its own inserted PNG is a controlled same-exemplar test. Changes in scale, pose, resampling, occlusion and background may reduce similarity or create distractors; this is an implementation-specific hypothesis to evaluate, not a guarantee of robustness. A custom similarity score is not a calibrated probability of identity.

## Rendering, pixels and foreground occlusion

The scene renderer can know target/foreground coordinates to draw an image. The detector must receive the **final composited RGB image and declared reference/template inputs**, without the target's true location, target-layer mask, occluder position or visible-ground-truth metadata. Moving the target and a foreground layer should change inference through the pixels they produce.

A flat background photograph/illustration alone does not create foreground occlusion. The target appears behind a person or object only when an actual foreground layer is drawn over it, with the appropriate alpha and layer order. Independent evaluation can use those layers to quantify visible target contribution.

For source-over alpha compositing, an upper layer reduces the lower layer's contribution by one minus its alpha. With target alpha a(x,y) and overlying occluder alphas o_j(x,y), a proposed visible-contribution annotation is:

```text
v(x,y) = a(x,y) × product_j(1 − o_j(x,y))
```

This applies to the declared source-over layer stack and needs to match the renderer's interpolation/opacity settings. The formula is derived from the specified compositing operator; it is not a learned segmentation mask. For 8-bit alpha, the existing visible threshold can be expressed as `255v >32`. [W3C source-over compositing](https://www.w3.org/TR/compositing-1/#porterduffcompositingoperators_srcover).

Keep this visible annotation evaluation-only. It can be prepared alongside rendering, but its use to grade a location comes after scores/oracle/measurement have been computed. A fixed reference-template alpha mask has a different purpose from a placement-specific visible-target mask. Sharing the latter with the matcher would leak ground truth.

The current UI reports visible fraction as **remaining alpha mass / full rendered target alpha mass**, rather than the fraction of alpha>32 pixels. Its evaluable-presence gate is `visibleFraction > .01`. Coarse QNN truth regions separately require at least one remaining target pixel with alpha>32. These two thresholds are explicit evaluation conventions; the 1% cutoff does not prove that every smaller visible fragment is physically unobservable. The matcher never receives either convention or fraction. The independent matcher occlusion fixtures instead report the fraction of originally alpha>32 pixels covered; do not combine those percentages as the same measure.

A fully opaque occluder can hide all target pixels. In that case the final scene can be identical with or without the hidden target; RGB inference cannot prove its presence or location. Report the case as hidden/unobservable and expose any false positives or abstention. Do not force the known hidden coordinate into the oracle.

## Location cells and map semantics

Fine candidates should have a declared **reference anchor** such as the sprite rectangle center, candidate pitch, valid border policy and scale. QNN candidates instead denote image regions. Those address meanings require different evaluation; avoid labelling both as the same numerical benchmark.

The quantum search register has log2(N) address qubits for N candidate locations. It is distinct from the four classifier qubits. For a square power-of-two grid of g×g centers, N=g²: 16×16 has 256 locations/eight address qubits, 32×32 has 1024/ten, and 64×64 has 4096/twelve. These are implemented simulated search granularities, not a new trained classifier or faster pixel search.

The matcher uses a fixed 64×64 registration lattice and bounded pixel refinement within candidate cells. It can report a refined point inside the sampled address cell, so that point is not simply the cell's geometric center. Threshold-passing peaks undergo nearby-peak suppression; the final Boolean predicate refers to the **retained accepted set**, not every score that exceeds the threshold. No below-threshold argmax is substituted for an empty set. [Matcher contract and reproducible checks](FINE_SEARCH.md).

Keep three maps distinct:

- **Matcher/QNN score:** classical evidence before thresholding; it need not be a calibrated recognition probability.
- **Quantum amplitude a_i:** a signed/complex state coefficient; its magnitude or phase requires a clearly labelled visualization.
- **Born probability |a_i|²:** the chance of that measured address in the simulated state; this is a probability map, not a detector score or signed amplitude.

Thresholds construct the accepted set from scores. Grover amplifies that set, including errors; a true unaccepted candidate can retain residual probability if a nonempty oracle is sampled. An empty oracle returns no output. Computing every fine candidate's classical score and simulating a larger statevector still costs work; no end-to-end quantum speedup is demonstrated.

## Recommended truth metrics

For a quantized candidate-center matcher, evaluate against the renderer's declared **full-template reference anchor**, not an arbitrary visible pixel. The anchor may lie behind a foreground object even when the head or another recognizable fragment is visible. Requiring center intersection with visible foreground would incorrectly reject some geometrically correct estimates.

Report continuous center error `d=||predicted anchor−true anchor||` and a predeclared quantization tolerance. For square candidate pitch s and nearest-center quantization, an interior anchor's worst-case Euclidean quantization error is **s/√2**, or **s/2 on each axis**. The border/clamping policy can alter the bound and must be stated. For non-square pitches, the half-diagonal is `sqrt(sx²+sy²)/2`. This is a geometry calculation, not an empirical accuracy result or a reason to choose tolerance after observing misses.

Keep these outcomes separately:

| Measure | What it establishes |
| --- | --- |
| Point error /within declared tolerance | Localization of the declared template anchor at the stated candidate granularity |
| Visible-alpha fraction | How much target contribution survives the declared foreground stack |
| Any visible overlap for QNN regions | Whether a sampled/coarse accepted tile contains visible inserted target contribution |
| Accepted-set Born mass | Probability assigned to the thresholded predicate, including possible false positives |
| True-location Born mass | Probability on candidates satisfying the independently declared point/region truth metric |
| One sample and repeated samples | Simulated measurement outcomes, separate from exact probabilities |
| Absence/full-hidden false marks and no-output rate | Whether an unobservable/absent target still produces unsupported search answers |

Fully hidden cases should not inflate an observable-target accuracy denominator or be silently counted as ordinary absence. Report them as their own stratum, with ground-truth presence, visible fraction and output behavior. Partial occlusion bins, scale, background identity, target identity, continuous placements and nearest-grid offset are useful controlled audit strata. Declare them before evaluation. Repeated placements of one PNG are not independent target identities.

## Media, uploads and privacy scope

The new default uses public-domain Bruegel/Seurat scenes and a modified OpenMoji standing figure with CC BY-SA attribution, source/edit/license links. The original generated crowd/character remain a separate legacy experiment. Preserve [open artwork provenance](OPEN_ART.md) and the older generated-asset records. This is a generic person-shaped target, not a real-person identity detector or a reproduction of a published Waldo page. Multiple prepared images are known targets; loading another reference does not prove generic visual recognition.

The implemented upload path accepts PNG/JPEG/WebP files below 20MB and decodes them through `URL.createObjectURL` into browser image/canvas data. Read-only source inspection found only static asset/model GETs, no network operation transmitting file contents. Dynamic network verification remains a browser check. Static GET requests are separate from user image uploads. Target alpha margins are trimmed locally for matching; source files remain intact. Foreground transparency, scaling and layer order must remain visible to the user.

## Verification status

Read-only scientific inspection of `search-core.js`, `scene-editor.js` and `app.js` found the intended pixel/truth separation, explicit clean-background assumption, score/amplitude/probability labels, retained frozen QNN scope and empty-oracle abstention. An independent local run passed **12 matcher tests**: 72 integer placements of the original known PNG across the three fine grids were located with zero false marked points and 0px refined-center error. A separate three-case fractional rasterization stress fixture located only **1/3**, preserving two threshold misses. An original-art 29.801% covered-pixel fixture retained a match; a 92.185% covered fixture abstained. These are limited controlled fixtures, not a general occlusion guarantee.

Those matcher tests do not establish performance on the new public-domain paintings/OpenMoji figure, arbitrary uploads or actual browser resizing. Browser/UI, dynamic upload-network, mobile, multiple-scene and final hosted checks remain pending this documentation pass. The [session recovery note](SESSION_RECOVERY.md) identifies the last confirmed Iteration 03 deployment and interrupted artifacts. Root's later source/browser receipt should record exact new fixtures while keeping template mode and frozen QNN mode separate.
