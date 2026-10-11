# Interface crowd cast

The decorative headings and buttons reuse exactly ten standing people from the
project's historical **original Festival**. The set has the same warm illustrated
crowd character as the game. It is not a new extraction from the current five
Wanda backgrounds and does not change those backgrounds.

All ten source PNGs were viewed individually before selection. Seated figures,
cyclists, props, standalone masks and musicians carrying large instruments were
excluded. Natural poses, clothing and carried small bags are preserved. The
cutouts are original generated project artwork, created as part of the October
10, 2026 Festival. See [original-art provenance](ASSETS.md), the
[historical registration record](../dist/assets/layers/legacy/registrations.json)
and [source Festival](../dist/assets/crowd-captcha.png).

The existing cutouts were extracted using native vector silhouette masks in
`createForegroundLayers` in [scene-editor.js](../dist/scene-editor.js).
Their polygon paths and registrations remain in
[foreground-presets.json](../dist/foreground-presets.json). The retained project
work script `work/export-scene-cutouts.mjs` records the original native-canvas
export procedure. Source scene RGB was retained inside the silhouette, with
antialiased alpha at the boundary. The outlines are approximate handmade masks;
they are not semantic segmentation ground truth.

For this interface reuse, the ten files were copied **unchanged** into
[assets/ui-crowd](../dist/assets/ui-crowd/provenance.json). No raster editing,
recoloring, resizing, trimming or image generation was performed. Read-only
Pillow checks confirmed RGBA mode, transparent and opaque pixels, registered
dimensions and registered SHA-256 hashes; destination bytes equal source bytes.

| Cast ID | Native dimensions | Historical source file |
| --- | --- | --- |
| green-dress-woman | 25 × 46 | festival-green-dress-woman.png |
| pale-suit-man | 17 × 46 | festival-pale-suit-man.png |
| navy-coat-woman | 23 × 47 | festival-navy-coat-woman.png |
| yellow-dancer | 38 × 40 | festival-yellow-dancer.png |
| white-dress-child | 18 × 39 | festival-extra-white-dress-child.png |
| coral-dress-visitor | 17 × 44 | festival-extra-coral-dress-visitor.png |
| blue-skirt-visitor | 25 × 52 | festival-extra-blue-skirt-visitor.png |
| yellow-shirt-visitor | 36 × 51 | festival-extra-lower-yellow-visitor.png |
| blue-walker | 27 × 55 | festival-blue-walker.png |
| blue-shopper | 25 × 59 | festival-blue-shopper.png |

The exact hashes, byte counts, source paths, source scene positions and alpha
checks are in [provenance.json](../dist/assets/ui-crowd/provenance.json).
[crowd-cast.js](../dist/crowd-cast.js) exports `CROWD_CAST` for interface sampling,
with ten records containing ID, relative PNG path, dimensions, descriptive label
and a `.72` display hinge fraction. That fraction only helps a CSS walking
effect; it is not an anatomical measurement or model feature. CSS transforms and
clipping animate a static full-body cutout rather than claiming a new pose or
motion-capture sequence. Keep figure display close to the 40–64px range to suit
the native cutout resolution.

These figures live in decorative DOM elements outside the search canvas. They
do not enter classifier crops, feature extraction, trained rotations,
thresholds, accepted addresses, Grover amplitudes or measurements. The original
standing Wanda target and frozen evidence remain unchanged.

Original application code and documentation use the project's
[MIT license](../LICENSE). These images are original generated project artwork;
this record does not assert public-domain, Creative Commons or any external
third-party license. Preserve the original-art disclosure and provenance when
redistributing the project assets. They are not scans or reproductions of
published Waldo/Wally puzzle pages.
