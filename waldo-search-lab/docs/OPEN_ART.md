# Open artwork for the crowd editor

The resumed editor now has two public-domain paintings and an attributed open-source standing figure. They support the user's preference for existing open artwork. These assets do not extend the trained QNN's validation domain; the new default detector is separately labelled known-template matching. No contest submission or publication was performed during acquisition.

## Backgrounds: downloaded raster bytes preserved

| Local asset | Dimensions | Download size | Source and status |
| --- | --- | ---: | --- |
| [`bruegel-childrens-games.jpg`](../dist/assets/open-art/bruegel-childrens-games.jpg) | 3840×2769 | 2,966,195 bytes | Pieter Bruegel the Elder, **Children's Games**, 1560; Kunsthistorisches Museum, Vienna, GG_1017. Commons records the faithful reproduction as PD-Art / Public Domain Mark 1.0. |
| [`seurat-grande-jatte.jpg`](../dist/assets/open-art/seurat-grande-jatte.jpg) | 843×565 | 197,727 bytes | Georges Seurat, **A Sunday on La Grande Jatte — 1884**, 1884–86, border added 1888–89; Art Institute of Chicago, Helen Birch Bartlett Memorial Collection, 1926.224. The museum API declares `is_public_domain:true`. |

Bruegel's source page credits [Inside Bruegel](http://insidebruegel.net/) for the image and identifies the collection, artist and work. The acquired file is the **observed Commons 3840px thumbnail**, rather than its 243MB master. [Commons source and licensing record](https://commons.wikimedia.org/wiki/File:Children's_Games_(Bruegel).jpg), [Public Domain Mark](https://creativecommons.org/publicdomain/mark/1.0/). Source revision at acquisition: `1123276037`.

The Seurat file is the **exact 843px IIIF image URL shown in the museum's API documentation**, served by the museum. Credit: **Digital image courtesy of the Art Institute of Chicago**. The API's public-domain artwork flag is the basis of the status recorded here; its metadata CC0 policy is a separate statement and is not used to relabel the image. [Artwork record](https://www.artic.edu/artworks/27992/a-sunday-on-la-grande-jatte-1884), [primary API record](https://api.artic.edu/api/v1/artworks/27992), [API documentation](https://api.artic.edu/docs/), [IIIF manifest](https://api.artic.edu/api/v1/artworks/27992/manifest.json).

Exact observed download URLs:

- [Bruegel 3840px thumbnail](https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/Children%27s_Games_%28Bruegel%29.jpg/3840px-Children%27s_Games_%28Bruegel%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail)
- [Seurat 843px museum image](https://www.artic.edu/iiif/2/2d484387-2509-5e8e-2c43-22f9981972eb/full/843,/0/default.jpg)

Neither downloaded JPEG was locally cropped, recolored, resized or re-encoded. The application can render a cover crop onto its 512px canvas; that display operation is separate from these preserved source files. Each file is below the requested 10MB limit.

## Standing figure: native SVG derivative

[`openmoji-standing-source.svg`](../dist/assets/open-art/openmoji-standing-source.svg) preserves the downloaded OpenMoji **person standing**, Unicode `1F9CD`. Its credited designer is **Laura Dworatschek**, dated 2019-05-06 in the project's official metadata. The source SVG is 1567 bytes; the observed Git blob identity is `0ae925c25a26930b317eaa564c5f865b34f5fdad`. [Original SVG source](https://github.com/hfg-gmuend/openmoji/blob/master/color/svg/1F9CD.svg), [official metadata](https://github.com/hfg-gmuend/openmoji/blob/master/data/openmoji.json).

[`openmoji-striped-standing.svg`](../dist/assets/open-art/openmoji-striped-standing.svg) is a native SVG edit: red/white horizontal bands on a derived torso region, blue trousers and a portrait `viewBox="24 6 23 60"`, with explicit 230×600 intrinsic dimensions. The original has one filled body silhouette, not a separate shirt path. The clothing is clipped to that original silhouette; head and linework remain. Its natural width/height ratio is **23/60**. No generative image tool or raster editing was used for this figure.

The initial native renderer did not reproduce the SVG pattern fill. Root corrected the vector clothing to a white torso base plus five explicit red rectangles under the same body clip, then rerendered and visually verified the striped PNG. The current source/rendition hashes in `provenance.json` identify this correction; do not reuse the earlier derivative checksum or yellow-shirt rendition as final evidence.

The original and this derivative artwork are **CC BY-SA 4.0**. Retain a visible credit, source link, modification notice and license link when the figure is displayed or supplied for reuse. The SVG itself includes that credit and edit notice in its accessible description. [Official OpenMoji license](https://github.com/hfg-gmuend/openmoji/blob/master/LICENSE.txt), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

Root additionally rendered the native SVG to [`openmoji-striped-standing.png`](../dist/assets/open-art/openmoji-striped-standing.png), a **230×600 transparent PNG**, using native vector canvas rendering. The catalog uses this PNG rendition for a stable image input. It shares the source/derivative **CC BY-SA 4.0** attribution and modification notice. This was a vector rendition, with no AI generation or subsequent raster edits; root added the rendition's SHA-256 and derivation to `provenance.json`. The source SVGs remain intact. Actual detector checks must use the new rendition rather than assume SVG/browser rasterizers are identical.

Suggested display credit: **Standing person by Laura Dworatschek / OpenMoji, modified with striped shirt and blue trousers. CC BY-SA 4.0.** This is a generic open-source figure; it is not the published Waldo character or an identity-recognition model. Keep this artwork's license distinct from the application code's MIT license.

## Integrity and provenance

[`download-records.json`](../dist/assets/open-art/download-records.json) records exact observed/resolved URLs and actual acquisition times. [`provenance.json`](../dist/assets/open-art/provenance.json) adds source/credit/license metadata and derivative validation. SHA-256:

| Asset | SHA-256 |
| --- | --- |
| Bruegel JPEG | `5b9a695aaa88b4a0ebebbbb1598247a773e58ae9f9275c56eeb8304d978dec67` |
| Seurat JPEG | `90197c037e6041fcae1c35606b921b5b626d868c2ff21cd653edb640b3f6e2dd` |
| Original OpenMoji SVG | `5de868175fd349d4e65af04ddae3bf5eb95f221b79294fa06b397dcc51172b0e` |

SVG XML validation checks local clip references, absence of external resources, scripts or event handlers, and a matching clip silhouette. Browser rasterization and detector outcomes must use the final explicit-stripe PNG and require independent UI/audit checks. No reserved evaluation identity or pixel was inspected for this asset task.
