# Busy artwork, transparent objects, and depth bands

The current scene picker contains **Original Festival**, **Magic Arena**, and
**Coronation Queue**. Bruegel and Seurat have been removed from the picker; their
files, masks, and historical benchmark remain available for reproducibility.
Original Festival and its original explorer remain explicitly labelled
AI-generated assets because the frozen QNN benchmark depends on that pair. The
two replacement crowd backgrounds are existing human-created artwork, with no
AI generation, background synthesis, retraining, or invented characters added.

## Artwork and attribution

Both new backgrounds are by **David Revoy / Pepper&Carrot**, licensed **CC BY
4.0**. Pepper&Carrot's [official licensing page](https://www.peppercarrot.com/en/about/index.html)
states the artwork license. Credit the author, link the source and
[license](https://creativecommons.org/licenses/by/4.0/), and identify the display
crop and foreground extraction as adaptations.

| Picker scene | Official source | Original file | Source rectangle displayed at 512×512 |
|---|---|---|---|
| Magic Arena | [Episode 21, The Magic Contest, page 3](https://www.peppercarrot.com/en/webcomic-sources/ep21_The-Magic-Contest.html) | `assets/busy-art/magic-arena-source.jpg`,2481×3503 | x 349, y 103, width 1786, height 1786 |
| Coronation Queue | [Episode 27, Coriander's Invention, page 6](https://www.peppercarrot.com/en/webcomic-sources/ep27_Coriander-s-Invention.html) | `assets/busy-art/qualicity-queue-source.jpg`,2481×3503 | x406.5,y1731,width1671,height 1671 |

The original artwork-only JPEG downloads are preserved unchanged. Native canvas
cropping and scaling produced `magic-arena.png` and `qualicity-queue.png`.
`dist/scene-catalog.json` declares their source rectangles, and
`dist/assets/busy-art/provenance.json` records the observed download URLs,
dimensions, hashes, attribution, and modifications. The direct licensed originals
are [Magic Arena page 3](https://www.peppercarrot.com/0_sources/ep21_The-Magic-Contest/hi-res/gfx-only/gfx_Pepper-and-Carrot_by-David-Revoy_E21P03.jpg)
and [Coronation Queue page 6](https://www.peppercarrot.com/0_sources/ep27_Coriander-s-Invention/hi-res/gfx-only/gfx_Pepper-and-Carrot_by-David-Revoy_E27P06.jpg).

Suggested visible credit: “Artwork by David Revoy / Pepper&Carrot, CC BY 4.0.
Display crop and source-pixel foreground extraction from Episode 21 page 3”
(or Episode 27 page 6). The separate striped OpenMoji target retains its own
CC BY-SA 4.0 attribution and adaptation provenance in `docs/OPEN_ART.md`.

## Whole-object transparent rows

Current definitions in `foreground-presets.json` and `depth-band-presets.json`
contain the following authored objects and generated bands:

| Scene | Curated objects | Nonempty 16 px bands | Zero-based levels |
|---|---:|---:|---|
| Original Festival |24|15|6,7,9,11,15,16,17,21,22,23,24,25,26,28,29|
| Magic Arena |10|6|20,21,22,25,28,31|
| Coronation Queue |10|6|17,18,19,24,27,31|

These are **curated visible silhouettes**, not a segmentation of every person,
prop, or ground surface. Their polygon outlines are approximate; fine hair,
hands, antialiasing, and baked overlaps can retain neighboring pixels. Hidden
anatomy is not reconstructed. A figure cut off by the image edge has a clipped
silhouette bottom, which need not be its real feet.

`createDepthBands()` in `dist/depth-bands.js` reads each registered cutout PNG.
If the last source row with alpha strictly greater than 32 is y, its bottom anchor
is y+1. With band height 16:

```text
level = floor((bottomAnchor −1)/16)
bandAnchor = maximum member bottomAnchor
```

Each band retains its **complete objects at their original scene positions**.
It does not cut the artwork into rectangular horizontal strips. The full-scene
band PNGs and the `objects-only.png` atlas are transparent outside the known
silhouettes: the full floor/background is not copied into this derived atlas.
This is mask-based extraction, not automatic ground removal, and approximate
masks can still include small neighboring ground pixels.

The selected composition convention draws lower bottoms in front of higher
bottoms. At equal depth, foreground is in front of the target. Grouping uses the
maximum member bottom, so an object's transition can move 0–15 px from its
individual anchor. This coarsens the existing 2D convention; it does not estimate
physical 3D depth. Soft alpha is preserved by source-over composition. Faint edge
pixels below the anchor threshold remain visible in valid cutouts.

## Detection and the smooth field

Inference receives the **final composite RGBA**, the supplied target template at
its known size, and the declared clean-background RGBA reference. Placement,
object bottoms, depth order, foreground masks, and ground truth are rendering or
evaluation metadata, never detector hints. This template mode is separate from
the frozen four-qubit QNN, whose evidence covers its original artwork pair.

`search-core.js` exposes per-address scores and candidate `registrationScore`
values. The latter is a pixel-registration quality measure used in candidate
selection, not a calibrated probability that the target exists. Acceptance also
applies visibility checks, a threshold, and nearby-peak suppression.

`search-field.js` creates a **display-only** field using locally normalized
Gaussian interpolation, a fixed tone scale, and optional crossfades between
detector evidence and recorded Born-probability snapshots. These raster samples
and colors are not a statevector or a measurement distribution. Interpolated
snapshot frames are presentation transitions, not fractional circuit gates.
The exact `quantum.js` snapshots remain the inputs to measurement, cell
inspection, and probability statistics. Standard Grover amplification here
changes the marked and unmarked groups; it does not spread a peak through
neighboring spatial states. The fixed smoothing kernel must not be described as
quantum spatial convergence.

## Verification status

The counts and band levels above were checked against the current catalog and
presets. Native unit checks are in `tests/depth-bands.test.mjs`; the regeneration
entry point is `model/build-depth-bands.mjs`. Larger new-scene audits, smooth-field
UI integration, browser QA, and any later private deployment need their own
completed reports. Historical painting/manual-depth scores are not evidence for
these scenes or bands. This document records no contest upload, public source
release, or submission; the user's no-submission constraint remains active.

## Completed band and visual-field checks — October 10, 2026

The current decoded PNG audit tests205 in-bounds placements at height52/grid64/threshold.45, after2rejections.194are above the1%remaining-alpha-mass convention;117accepted-point hits,77visible misses,11less-visible abstentions,0incorrect accepted points. All3empty stacks reconstruct byte-exact base RGBA and return0marks. All27decoded bands match rebuilt whole-object sourceRGBA exactly. Report: model/depth-band-audit.json; portable reproduction: model/audit-depth-bands.mjs. Earlier painting/manual and twelve-object/per-object suites remain separate historical protocols.

The animated field uses a second raw no-background/refine:false template pass on the opaque final composite. Its marks are discarded; its4096extra center tests are disclosed. Template raw registration scores supply display evidence; QNN mode uses saved QNNscores. Known-size/clean-background oracle semantics remain unchanged. Fixed Gaussian interpolation, color exposure (default1.8), evidence/amplification crossfade (defaulttransition.52, smoothstep blend) and between-round probability tweening are display only. The default peaks have sigma2.25cells on a128×128display raster. Field controls do not change exact statevector arrays, accepted addresses, measurement or result grading. There is no per-frame max stretching. Default cinematic time is1.2s evidence reveal plus50×140ms=8.2s amplification; coarse grids use a minimum5s amplification window. Slower and instant/reduced-motion modes remain available.

Root browser/hosting results are recorded in BUSY_BANDS_BROWSER_QA.md and the external publication-receipt.json when complete; read that receipt for exact live revision rather than assuming local source is already hosted. No contest submission/public release was performed.
