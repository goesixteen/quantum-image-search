# Automatic depth from each PNG object's bottom anchor

The user-selected convention is **lower feet are in front; higher feet are
behind**. Automatic mode applies this separately to every enabled foreground
cutout and the moving target, using scene-pixel coordinates. It is an explicit
2D compositing rule, not a reconstruction of real 3D depth or automatic semantic
segmentation of the background. The current named object cutouts come from the
native vector-mask extraction pipeline and preserve the original scene pixels.

## Renderer contract

```js
const frame = compositeLayeredScene({
  backgroundCanvas,
  target: targetRaster,       // immutable displayed-size PNG raster
  targetRect,                // x/y/width/height in scene pixels; may be fractional
  foregroundLayers,
  targetDepthMode: 'auto',    // default remains 'manual' for compatibility
  depthConvention: 'front-when-lower',
  depthTieBreak: 'foreground-front',
  depthAlphaThreshold: 32,
  // targetDepthAnchorY: 400, // optional explicit scene-space target foot override
});

frame.targetDepthAnchorY;    // resolved target foot, or null for no/empty target
frame.depthOrder;           // back-to-front IDs, including '$target'
frame.layerDepths;           // enabled layers in rendering order:
// [{id, depthAnchorY, aboveTarget, anchorSource}]
// aboveTarget=true means drawn AFTER/in FRONT of the target.
```

An object’s default anchor is the bottom edge of its source PNG silhouette above
the alpha threshold: if the final qualifying source row is `y`, the source
anchor is `y+1`. Transparent padding is excluded. The target source anchor is
transformed continuously into the rendered rectangle:

```text
targetDepthAnchorY = targetRect.y
                  + sourceAnchorY / sourceHeight × targetRect.height
```

This is a canonical source-silhouette anchor. Fractional placement and scaling
remain continuous; raster antialiasing can place small amounts of rendered alpha
in an adjacent pixel row. It does not repeatedly round the feet while dragging.
The interface may round top-left target positions for template-raster matching;
that choice is separate from the renderer’s support for fractional rectangles.

Foreground cutouts are already registered in scene-sized canvases, so their PNG
silhouette bottom is already a scene coordinate. A layer may provide a finite
`depthAnchorY` override, for example to use an associated person’s ground-contact
point instead of a parasol’s silhouette bottom. This override survives
`serializeForegroundLayers` and `createForegroundLayers` without changing the
cutout PNG pixels. It is a compositing setting, never a detector input.

The integrated 12-object Original Festival exports use overrides computed from
`getDepthAnchor(foregroundCanvas).y`, together with registered tight PNG and mask
PNG assets. They are cached canonical alpha>32 bottoms, rather than the proposal's
illustrative author anchors. Loading those PNGs into registered scene canvases
preserves the same depth contract.

Automatic mode sorts increasing anchor Y back to front. Numeric `zIndex` fields
remain in definitions for manual compatibility but do not rank objects in auto
mode. Equal-depth foreground objects retain their input order. The default target
tie draws foreground in front, preserving the prior manual equal-z convention
and giving a deterministic result when feet share a row. Callers may select
`depthTieBreak:'target-front'` explicitly. The reusable renderer also supports
`depthConvention:'front-when-higher'`; the site should use the user-requested
`front-when-lower` convention.

Disabled layers are excluded from `depthOrder` and `layerDepths`. Empty-alpha
sources have null anchors and cannot occlude the target in auto mode. With an
absent target, `targetDepthAnchorY` is null and every returned `aboveTarget` flag
is false. `$target` remains an ordering marker, not a visible object or inferred
location.

## Pixel composition, caching, and isolation

The cutouts are still actual transparent PNG-equivalent canvases made by
`createForegroundLayers`: background pixels are retained only inside each native
paint/erase mask, and cropped PNG downloads preserve their registered offsets.
The auto-depth anchor is read from actual cutout PNG alpha rather than the helper
mask’s rectangular extent. The occlusion union in automatic mode also uses actual
PNG alpha for objects that render in front. The visible-target evaluation alpha
is the target alpha multiplied by one minus that occlusion union.

`getDepthAnchor(source,{alphaThreshold:32,canvasFactory,useCache:true})` returns
frozen local bounds, bottom anchor, source size, and an empty flag. A WeakMap caches
bounds by source object, dimensions, image source, and alpha threshold. Immutable
cutout/target rasters therefore require one alpha read, rather than another full
512×512 alpha read per object on every drag event.

Call `invalidateDepthAnchor(source)` after repainting an existing source canvas
or modifying an existing ImageData buffer. `invalidateDepthAnchor()` clears all
entries. `cacheDepthAnchors:false` on the compositor bypasses the cache for mutable
sources, at the cost of repeated reads. New source canvas objects need no explicit
invalidation. The cache does not retain full RGBA buffers.

The compositor has no classifier, template-matcher, or Grover imports. Depth
settings and target position determine the rendered image, as they must for an
interactive editor. The inference boundary remains final RGBA pixels plus its
declared image/template inputs. `targetDepthAnchorY`, layer anchors, render order,
occlusion alpha, and target placement must never be passed to the detector as
search hints. They are rendering or independent evaluation metadata.

## Compatibility and validation

Omitting `targetDepthMode` retains the existing manual API: ascending numeric
z-index, target behind foreground at equal z, and the previous mask-based
occlusion calculation. Manual mode returns null automatic anchors. The historical
`model/layered-integration-audit.json` is a frozen **manual-depth** experiment
against its pinned renderer/assets, including its reported misses. Its figures
must not be relabeled as automatic-depth accuracy or as results for newly added
scenes. The old 14 renderer tests continue to pass.

Run the real-raster checks with:

```text
node --test tests/scene-editor.test.mjs
```

The suite uses `@napi-rs/canvas` and currently passes 24 tests with no skips. New
checks cover transparent padding and strict alpha thresholds; cached bounds and
invalidation; above/below/tie behavior; independent per-object sorting despite
reversed manual z values; override serialization; inverse convention; fractional
rectangle projection and scaling; actual PNG alpha versus an oversized helper
mask; and the **Original Festival first** using its real crowd bitmap and polygon
presets. For every original cutout, a decoded transparent PNG produces the same
anchor, a target with higher feet is covered by the original pixels, and lower
feet expose the target. An absent target reconstructs the original background
byte-for-byte. These native checks precede applying additional backgrounds;
browser rendering should be verified separately.
## Current band/field follow-up — October 10, 2026

This document's earlier per-object depth architecture is historical. The current picker uses Original Festival, Magic Arena and Coronation Queue. Its44 curated object PNGs are grouped into27whole-object depth bands (24/15 Festival,10/6 Arena,10/6 Queue), using16px foot-level bins and maximum-member bottom anchors. See BUSY_SCENES_AND_BANDS.md and model/depth-band-audit.json for current construction/evidence. Earlier169-probe figures do not evaluate these bands or the expanded24-object Festival.
