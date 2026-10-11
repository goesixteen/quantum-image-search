# Credits for the included pixel fixtures

These PNGs are exact copies of the frozen native-rendered held-out scene fixtures,
not new images or edits made for this Qiskit companion. Their checksums are in
`trained-package-manifest.json`; their source/window metadata is in
`heldout-feature-fixture.json`.

- `fixtures/test-0.png` and `fixtures/test-0-blue-stripes.png` use the project's
  original Festival illustration, generated with the built-in ImageGen tool on
  October 10, 2026. See [original-art provenance](../docs/ASSETS.md).
- `fixtures/test-1.png` uses a display crop and 512px rendering of **Pepper&Carrot,
  Episode 21, page 3**, artwork by **David Revoy**, under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  [Official source page](https://www.peppercarrot.com/en/webcomic-sources/ep21_The-Magic-Contest.html).
  The original source JPEG is unchanged; the fixture adds the project target.
- Standing-person figures derive from **Laura Dworatschek / OpenMoji**, icon
  **1F9CD**, under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
  [Original SVG source](https://github.com/hfg-gmuend/openmoji/blob/master/color/svg/1F9CD.svg).
  The project adapted the torso to horizontal red/white stripes and the trousers
  to blue, rendered the SVG as PNG, trimmed transparent padding, resized and
  composited it. The blue-striped fixture is an additional color-change decoy.
  Preserve attribution, modification notices and the ShareAlike terms for these
  figure adaptations when redistributing them.

Original application code is MIT-licensed; the asset licenses above remain
separate. Full source-asset records are in the parent project's
`dist/assets/open-art/provenance.json` and `dist/assets/busy-art/provenance.json`.
