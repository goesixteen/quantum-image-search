# Iteration 03 photographic evaluation assets

Two fresh street photographs and two fresh schoolbus photographs were released for a frozen evaluation on 10 October 2026. A further street/bus pair remains reserved for a separate future freeze. These are independently photographed identities, distinct from Covington, Sauk Centre, Emeryville, SupportPDX and Daniel Oines. No evaluation image was used to fit weights, design features, select checkpoints or choose thresholds.

The user's instruction remains **do not submit any work; keep iterating improvements**. This acquisition and evaluation are local research. They authorize no contest upload, public source release, video upload or website publication.

## Locked experiment and access

The model-development agent reported its completed freeze at **2026-10-10T09:14:56.344050Z**. Before disclosure, the asset steward verified all **21** file hashes in [photo-v3-freeze.json](../model/photo-v3-freeze.json), including feature extractors, candidate models, thresholds, data renderer, audit sources and protocol. Candidate thresholds remain QNN **0.95** and logistic **0.94**; both candidates remain `readyForDemo:false`. The existing live photo model is unchanged.

The disclosure ordering and frozen-file hash snapshot are saved in [primary-release.json](../model/iteration03-evaluation-assets/primary-release.json). Initial message disclosure followed verified freeze and preceded the audit command that the trainer reports executing at 09:19 UTC. The exact first-message timestamp was not retained. The sanitized inventory was written at 09:20:14 UTC, after that command; its `recordWrittenAtUtc` is the record-creation time, not an invented earlier disclosure timestamp. The model-development team should use that four-asset inventory. The full [manifest.json](../model/iteration03-evaluation-assets/manifest.json), c-labelled assets and acquisition script contain reserved identity information and should remain unopened by that team until a separately recorded later freeze. This is an organizational embargo in a shared filesystem, not a technical access-control boundary. The asset steward inspected all photographs only to establish validity and annotate approximate boxes; that inspection is disclosed.

The final audit was declared before identity disclosure: two grid sizes, **128 seeded seen-cutout placements per street per grid**, seed **2026101130**, plus empty streets. Ground truth uses any inserted alpha greater than 32 in a tile and is evaluation-only. Independently photographed buses are evaluated separately through known-ROI thumbnails 52 pixels wide and a coarse-box full-photo diagnostic. These bus boxes are not segmentation masks. No result from this audit may alter these candidates or thresholds.

## Primary inventory and photo credits

| ID | Photograph / photographer | Date | License | Original dimensions | Evaluation role |
| --- | --- | --- | --- | --- | --- |
| street-a | [Main Street, South Lancaster MA](https://commons.wikimedia.org/wiki/File:Main_Street,_South_Lancaster_MA.jpg), John Phelan | 2010-06-27 | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | 2272 × 1704 | Empty-background specificity and frozen original-cutout transfer |
| street-b | [Main Street, Buffalo, NY](https://commons.wikimedia.org/wiki/File:Main_Street,_Buffalo,_NY_-_52685131767.jpg), Warren LeMay (`w_lemay`) | 2022-07-31 | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | 3706 × 2779 | Empty-background specificity and frozen original-cutout transfer |
| bus-a | [Left side of Thomas Built MVP ER school bus](https://commons.wikimedia.org/wiki/File:Left_side_of_Thomas_Built_MVP_ER_school_bus_(13182497535).jpg), Ben Schumin | 2014-02-04 | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | 4128 × 2322 | Independent photographed-bus recognition probe |
| bus-b | [TBBWestcoastER](https://commons.wikimedia.org/wiki/File:TBBWestcoastER.jpg), Ariana Rose Taylor-Stanley | 2005-03-22 | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | 2048 × 1536 | Independent photographed-bus recognition probe |

Credits apply to the photographs and their derivatives; the code's MIT license does not replace them. Derivative notices should say **center-square crop and resize** for streets and **manual rectangular crop** for bus ROIs, link the applicable license, and retain each photographer's credit. Buffalo and Ben Schumin derivatives retain CC BY-SA 2.0. The exact Commons pages, original download URLs, source Flickr links where applicable and retrieved Commons revision IDs are recorded in the primary inventory. Source revision IDs: street-a `1136132950`, street-b `1166015548`, bus-a `1133158304`, bus-b `1199383972`.

Download originals:

- [South Lancaster original JPEG](https://upload.wikimedia.org/wikipedia/commons/2/2a/Main_Street%2C_South_Lancaster_MA.jpg).
- [Buffalo original JPEG](https://upload.wikimedia.org/wikipedia/commons/d/db/Main_Street%2C_Buffalo%2C_NY_-_52685131767.jpg); [photographer's Flickr source](https://www.flickr.com/photos/59081381@N03/52685131767/).
- [Ben Schumin original JPEG](https://upload.wikimedia.org/wikipedia/commons/7/79/Left_side_of_Thomas_Built_MVP_ER_school_bus_%2813182497535%29.jpg); [photographer's Flickr source](https://www.flickr.com/photos/schuminweb/13182497535/).
- [Ariana Rose Taylor-Stanley original JPEG](https://upload.wikimedia.org/wikipedia/commons/8/8d/TBBWestcoastER.jpg); [photographer's Flickr source](https://www.flickr.com/photos/20411245@N00/7195675/).

## Geometry and preparation

Original files are retained byte for byte. Streets were converted to numeric RGB, center-square cropped and resized to 512 × 512 with Pillow LANCZOS. No scene content was generated or edited. All primary images have absent or normal EXIF orientation, so the declared preparation performs no EXIF transpose. No color-profile transformation was applied. Buffalo's source and normalized PNG retain an ICC profile; numeric decoded RGB is the offline audit contract. Browser color management and resampling can produce different pixels and require an independently labelled browser replay.

| ID | Prepared file | Source crop | Interpretation |
| --- | --- | --- | --- |
| street-a | `street-a-512.png` | XYWH `[284, 0, 1704, 1704]` | Suburban road, yellow centerlines/crossing sign, trees and white building; no visible bus found by the steward |
| street-b | `street-b-512.png` | XYWH `[463, 0, 2779, 2779]` | Brick/cream/yellow storefronts, rail tracks and hazard stripes; no visible bus found by the steward |
| bus-a | `bus-a-roi.png` | XYXY `[295, 395, 3760, 1435]` | Loose full-side bus box, shaded/backlit against bright sky; Montgomery County unit 7804 |
| bus-b | `bus-b-roi.png` | XYXY `[0, 470, 2048, 1055]` | Loose side-view box with bright highlights, trees/background and an edge clipped in the original; Bainbridge Island unit 02 |

Bus coordinates refer to original frame-0 pixels with a top-left origin and exclusive right/bottom edges. The supplied ROIs are native-size crops, **3465 × 1040** and **2048 × 585** respectively. They retain photographed background and have no alpha mask, background removal or resizing. `bus-a-bbox.svg` and `bus-b-bbox.svg` overlay the coarse rectangles on the original JPEG for review. The frozen audit controls any subsequent thumbnail resize.

Successful recognition of a provided crop would establish a known-ROI probe, not whole-photo localization. Compositing the original trained bus onto a fresh street tests background transfer while retaining the target identity. It does not establish recognition of the independently photographed buses. With only two primary streets and two primary buses, the results are a small diagnostic, not a population-level estimate of general photographic detection.

## Immutable fingerprints

| ID | Original SHA-256 |
| --- | --- |
| street-a | `86965490ee36d6465a5d720f474215de563b8358c074fc43e97a64cb88a23be0` |
| street-b | `36a842be18e9921d737f6d698020140baca7c02e2aff340ddbb55e9fa43096f7` |
| bus-a | `9831b01bccdce5dd9dd59d05cc90560bb93c2775d0df73bac5097ba742cd790f` |
| bus-b | `6df339a3afa7ec7fcba10830cf8096be47b0c7a8fd6d854456471c901aec155a` |

The machine inventory also records file sizes, local SHA-1, prepared-file SHA-256 and decoded RGB pixel SHA-256. Two primary originals and both reserve originals additionally matched SHA-1 exposed by their Commons pages. Where no such source checksum was recorded, a local checksum is an integrity fingerprint rather than an independent authenticity check.

## Reserved later holdback

The asset steward obtained one additional street identity (`street-c`) and one additional bus identity (`bus-c`), each with a distinct photographer and source from the primary four. Their exact source, author, license, download URL, revision, bytes, hashes, visual validity notes and crop coordinates are held in the full manifest. These entries are intentionally omitted from the primary-release inventory. The reserve bus original is JPEG-compatible MPO containing two frames; coordinates and native crop refer to **frame 0**. Its retained ICC metadata has not been transformed. The steward's manual crop can include part of another schoolbus and is suitable only for a class-recognition probe, not instance-level localization.

Do not score, inspect or tune on either reserve identity during Iteration 03. A later experiment must record a new feature/model/threshold/protocol freeze before opening them. Once any primary result has been inspected, the primary four become diagnostic fixtures for later development and must not be described as fresh blind holdouts again.

## Reproduction and verification

Within `model/iteration03-evaluation-assets/`, `acquire.py` downloads missing originals and reproduces street normalization without importing any detector. It preserves existing originals and release status, but it contains reserve identity information and is steward-only until the later holdback release. `verify.py` checks every source hash, crop bounds, exact derivative RGB reconstruction, SVG source links/rectangle coordinates, and every frozen experiment hash. Neither script computes model features or predictions. The acquisition-time `modelScored:false` and `featureVectorsComputed:false` fields describe steward preparation; later audit results belong in the separate model audit report.

From the bus project root:

```powershell
python model/iteration03-evaluation-assets/verify.py
```

The completed integrity report is [integrity-verification.json](../model/iteration03-evaluation-assets/integrity-verification.json): **6 originals with exact derivative reproduction and 21 frozen experiment files verified**. `--release-primary` was used only after freeze verification to save the disclosure record. It does not authorize opening the reserve pair or changing any model.

The next local research step is to report frozen results with background-specific false marks, complete-scene rates, true-target probability and independent known-ROI scores. Diagnose failures after reporting; feature revisions need another freeze and a new untouched evaluation set.
