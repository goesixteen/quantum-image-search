# Foreground layers and visible-target truth

The scene editor can place a target PNG behind named people and objects in a background. Each foreground layer is a transparent PNG-equivalent copy of the original background pixels through a manually drawn mask. Rendering the base, target, and enabled foreground copies in order makes the target disappear behind those source objects. This module does not import the classifier or Grover implementation.

## Files and coordinate contract

- `dist/scene-editor.js`: pure Canvas composition, mask history, PNG cutout cache, visibility evaluation.
- `dist/foreground-presets.json`: serializable vector outlines, layer names, numeric depth, and source crop geometry.
- `tests/scene-editor.test.mjs`: real raster Canvas and PNG decode verification.

All preset points and target rectangles use **512 × 512 scene pixels**, independently of the displayed CSS size. `renderBackground` uses a centered square cover crop, retaining the original aspect ratio. For the approved classic assets:

| Background ID | Source raster | Square source crop, before resizing | Foreground presets |
|---|---:|---|---|
| `bruegel` | 3840 × 2769 | x = 535.5, y = 0, width = height = 2769 | Large barrel; foreground hoop player in red trousers; wooden game block |
| `seurat` | 843 × 565 | x = 139, y = 0, width = height = 565 | Standing woman with red parasol; seated woman with blue parasol; foreground black dog |
| `legacy` | Existing normalized crowd | Already normalized to the scene | Fountain front; blue café umbrella; foreground flower bed |

The first two presets were drawn by inspecting the original paintings, transforming the points into the declared cover-crop coordinates, and viewing composed mask overlays. They are approximate manual outlines, not learned segmentation. Thin hoops, fine hair, individual dog toes, and some silhouette details are omitted. The barrel mask erases the two nearby players from its own outline; the separate player remains available as a named layer. No original raster was altered to produce these masks. Source and license metadata for the paintings live in `dist/assets/open-art/provenance.json`.

The source objects also remain in the flat base painting. Disabling a foreground layer changes whether its pixels are restored **above the target**; it does not remove that object from the base. This is a registered occlusion template, without an inpainted background behind each object.

## Integration

```js
import {
  renderBackground, createForegroundLayers, compositeLayeredScene,
  targetRectFromCenter, visibleTargetRegions, serializeForegroundLayers,
} from './scene-editor.js';

const base = renderBackground(loadedBackgroundImage);
const definitions = presets.backgrounds.bruegel.layers;
// Cache these until the background or mask definitions change.
const layers = createForegroundLayers(base, definitions);

const frame = compositeLayeredScene({
  backgroundCanvas: base,
  target: loadedTargetPNG,
  targetRect: targetRectFromCenter(280, 350, 32, 52),
  foregroundLayers: layers,
  targetZIndex: 0, // All default foreground layers have larger depth.
});

// Inference receives final scene pixels through its own API.
const scenePixels = frame.canvas.getContext('2d').getImageData(0, 0, 512, 512);
// Evaluation only: never pass this set or the masks into the QNN/oracle.
const visibleTruthCells = visibleTargetRegions(frame.visibleTarget, 64);
const savedDefinitions = serializeForegroundLayers(layers);
```

`createForegroundLayers` returns each definition with cached `maskCanvas`, scene-sized `foregroundCanvas` (also named `canvas`), `pngDataURL`, `maskDataURL`, and its alpha `bounds`. `pngDataURL` is a genuine transparent `image/png`, registered at `{x:0,y:0}`. It also returns tightly cropped `cutoutCanvas`, `cutoutPNGDataURL`, and `cutoutPosition` for downloadable individual objects or previews. An empty mask produces null tight-cutout fields. Passing `{includeDataURLs:false}` avoids PNG encoding when only Canvas objects are needed.

The definitions contain `{id,name,zIndex,enabled,paths}`. IDs must be unique. Enabled layers sort by ascending numeric `zIndex`, then their original list order. The target sorts before foreground at equal depth; equal-depth foreground therefore occludes it. Setting target depth above all layers puts it in front. Output, target, and occlusion destination canvases must be distinct from each other and all sources, so a redraw cannot clear a cached source by aliasing it. The module preserves caller transform, alpha, and composition state while drawing in scene coordinates.

JSON is the portable source of truth. PNG URLs and canvases are derived caches and are excluded from `serializeForegroundLayers`. Rebuild them from the same normalized base after restoring a saved scene. Background changes require new cutouts; cutouts from one background must not be reused on another.

## Paint, erase, and independent visibility

`normalizeMaskPaths` validates and copies ordered actions. Supported actions are a filled `polygon`, a filled `rect`, and a round-cap `stroke` with a radius. Each accepts `operation:'paint'|'erase'` and `opacity` in [0,1]. `rasterizeMaskPaths` replays actions; removing the last saved action and rerasterizing implements undo. Painting adds alpha by source-over; erasing removes alpha by destination-out. Canvas clips coordinates at the scene boundary and retains antialiasing. `compositeScene` is a convenience wrapper for a single custom painted mask.

For enabled foreground layers at or above the target depth, their union alpha is

\[
A_{\mathrm{occlusion}} = 1-\prod_j(1-A_j),\qquad
A_{\mathrm{visible}} = A_{\mathrm{target}}(1-A_{\mathrm{occlusion}}).
\]

`visibleTargetAlpha` applies this rule to the independently rendered target alpha, with alpha rounded to an 8-bit value. Visibility truth is a grid cell containing **any pixel with visible alpha strictly greater than 32**. Alpha 32 does not count; alpha 33 does. Fully hidden and absent targets both have an empty visible-truth set. Multiple translucent occluders combine by alpha union rather than adding alpha, avoiding excessive hiding at overlaps.

Coordinates and masks exist for scene construction and evaluation. They are not detector inputs. The QNN reads final patch pixels. The separate template-matching mode can use its declared target PNG and clean background reference; its search API is outside this module. Layer metadata does not disclose a target location to either inference path. Occlusion editing does not establish recognition accuracy under occlusion; that must be measured separately.

## Verification

Run from `outputs/waldo-search-lab`:

```powershell
node --test tests/scene-editor.test.mjs
```

This machine's bundled command is:

```powershell
& 'C:/Users/henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' --test tests/scene-editor.test.mjs
```

The tests require `@napi-rs/canvas`, including its native platform package. They first try a local installation, then `SCENE_EDITOR_CANVAS_MODULE`, then the bundled Codex runtime location. The browser needs no package dependency; it uses native Canvas. No Python, model training, network request, or generated raster asset is required by the test suite.

**14 tests passed, 0 skipped** after implementation. The suite checks centered cropping; independent expected source pixels; ordered painting, erasing, undo and clipping; validation; genuine PNG decoding and cropped registration; target depth and layer toggles; overlapping alpha; strict visibility truth; retained context state; source alias rejection; and both classic-art presets using their actual asset dimensions. A target at a fully masked point in every classic layer is hidden and its final pixel equals the original background. With an absent target, the compositor returns the base byte-for-byte, including antialiased or overlapping masks.

Raster tests use the Node native Canvas implementation. They do not prove identical antialiased edge pixels across every browser's renderer or resizing kernel. Preset geometry and the visibility formula remain the same; browser integration needs its own interaction checks. The exact target-absent reconstruction is deliberately a base-copy shortcut, avoiding unnecessary edge color round trips.

## Work record

On 2026-10-10, this task was redirected from the unfinished bus v4 experiment to the crowd editor. Bus fitting, old model exports, and undisclosed reserve assets remained untouched during this work. The occlusion module, named foreground definitions, real-raster tests, and this document were completed as a separate deliverable. This change does not imply that an unverified bus candidate was promoted.
