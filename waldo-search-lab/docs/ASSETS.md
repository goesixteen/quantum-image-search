# Original crowd-search artwork

Created October 10, 2026 with the built-in ImageGen tool for this project. These are original generated illustrations, not photographs and not scans or reproductions of published Waldo/Wally puzzle pages.

- [crowd.png](../dist/assets/crowd.png): a square, densely populated illustrated town festival, with approximately 100 varied figures, suitable for an interactive hidden-character experiment.
- [character.png](../dist/assets/character.png): a separate original striped explorer on a transparent background, 1,024 by 1,536 RGBA pixels, with natural aspect ratio 2:3.
- [crowd-captcha.png](../dist/assets/crowd-captcha.png): the deterministic 512 by 512 normalization of the crowd illustration used by the model and browser, made with Pillow LANCZOS. It is a resampling derivative, not a newly generated scene.

The built-in ImageGen tool was used for both assets. The original tool-call prompt text was not copied into the source archive; the following condensed generation specifications preserve the intended design and are not verbatim transcripts.

**Character specification:** Create an original full-body illustrated explorer for a hidden-character game: red-and-white horizontally striped shirt, blue trousers, round glasses, and a red-and-white knit hat. One upright character, readable at small scale, transparent background, no scene or additional objects, consistent warm illustration style. Keep the image as a separate RGBA character asset.

**Crowd specification:** Create an original square illustrated town-festival scene with approximately 100 varied small figures, busy streets and market activity, rich visual details, warm ink-and-color illustration, and enough crowd complexity for a hidden-character experiment. Do not reproduce a published Waldo/Wally puzzle page. The distinct target is composited separately by the application.

The interface draws the full transparent character at 75% of one grid cell's height, preserving its natural aspect ratio. Every candidate crop is resampled to 128 by 128 for feature extraction. New placement seeds share these same artwork assets; measured performance must be described as controlled same-asset compositing unless independent artwork variants are held out.

Original application code and documentation are released under MIT. Preserve this provenance record when distributing the supplied project assets.
