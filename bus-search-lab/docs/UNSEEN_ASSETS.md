# Independent photographs for transfer evaluation

Acquired and visually inspected October 10, 2026. The user's latest instruction is to **keep improving the project without submitting it**. This work only adds evaluation/training assets and provenance. It changes no existing UI, model, feature extractor, threshold, or deployed site, and performs no submission/publication action.

The original demo specializes to one SupportPDX bus photograph-derived cutout and one Covington street photograph. The new evaluation files introduce a different photographer, vehicle appearance, street location, architecture, and lighting. One new street and one new bus still form a small exploratory transfer check, not a representative real-world recognition benchmark.

## Inventory and split roles

Paths are relative to the bus project root. The machine-readable [provenance manifest](../model/evaluation-assets/provenance.json) records exact source URLs, dimensions, byte counts, SHA-256/SHA-1 checksums, roles, crop parameters, and annotations.

| Role | Original photograph | Normalized derivative / evidence | License |
| --- | --- | --- | --- |
| **Held-out evaluation street** | [emeryville-bay-street-original.jpg](../dist/assets/unseen/emeryville-bay-street-original.jpg) | [emeryville-bay-street-512.png](../model/evaluation-assets/emeryville-bay-street-512.png) | Payton Chung, CC BY 2.0 |
| **Held-out evaluation bus** | [daniel-oines-blue-bird-vision-original.jpg](../model/evaluation-assets/daniel-oines-blue-bird-vision-original.jpg) | [Manual bbox overlay](../model/evaluation-assets/daniel-oines-bbox-proof.svg); no background removal or bus crop saved | Daniel Oines, CC BY 2.0 |
| **Separate optional training street** | [sauk-centre-street-original.jpg](../model/training-assets/sauk-centre-street-original.jpg) | [sauk-centre-street-512.png](../model/training-assets/sauk-centre-street-512.png) | McGhiever, CC BY-SA 4.0 |

Emeryville and the Daniel Oines bus are reserved for evaluation. They must not supply fitting data, a new threshold, feature tuning, or model selection. The Sauk Centre image is available for separately labelled training experiments requested by the trainer; it is excluded from the held-out street check. If later iterations are guided by the evaluation failures, describe those iterations as exploratory and acquire fresh asset identities for a new final test.

## Evaluation street: Bay Street, Emeryville, California

**Main Street (1766449963).jpg**, photographed by **Payton Chung** on **October 26, 2007**, shows Bay Street in Emeryville. Commons identifies its [CC BY 2.0 license and Flickr source](https://commons.wikimedia.org/wiki/File:Main_Street_(1766449963).jpg); its Flickr license was reviewed on June 21, 2016. Original photograph: 1,929 × 1,423 pixels, 521,741 bytes. [Original download](https://upload.wikimedia.org/wikipedia/commons/4/49/Main_Street_%281766449963%29.jpg), [photographer's Flickr page](https://www.flickr.com/photos/paytonc/1766449963/).

Manual inspection found red/ochre façades, a yellow leasing banner, parked cars, and pedestrians, with no visible bus. This is a genuinely different urban scene from Covington; a bus-free label is based on inspection rather than a source-provided exhaustive object annotation. No model scores were consulted when selecting it.

Ready-to-use credit: **“Main Street (Bay Street, Emeryville), Payton Chung, CC BY 2.0, via Wikimedia Commons. Evaluation version center-cropped and resized.”** Link the title to the source and [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). The original JPEG is unchanged; the normalized PNG is a geometric resampling derivative.

## Evaluation bus: independently photographed Blue Bird Vision

**Blue Bird Vision sideview.jpg**, photographed by **Daniel Oines** on **May 7, 2015**, is a large yellow/orange schoolbus viewed from its side and front in dusk lighting. Its photographer and vehicle appearance differ from the SupportPDX A3FE source. Commons records [CC BY 2.0 and a reviewed Flickr source](https://commons.wikimedia.org/wiki/File:Blue_Bird_Vision_sideview.jpg). Original: 4,288 × 2,416 pixels, 2,270,559 bytes. [Original download](https://upload.wikimedia.org/wikipedia/commons/7/70/Blue_Bird_Vision_sideview.jpg), [Flickr original](https://www.flickr.com/photos/dno1967b/16791123254/).

The original JPEG is untouched. Its SHA-1 exactly matches the Commons checksum: `31ddb28519971cb4aa528def207c703980a28ea3`. It has not been used to fit the production model, and no background extraction or synthetic compositing of this bus has been performed.

Ready-to-use credit: **“Blue Bird Vision sideview, Daniel Oines, CC BY 2.0, via Wikimedia Commons.”** Link to the photograph and [license](https://creativecommons.org/licenses/by/2.0/). Label the separate bbox overlay as an evaluation annotation.

### Manual bbox evidence

The approximate loose visible-object box in **original image pixels** is:

```text
XYXY = [50, 650, 4260, 2200]
XYWH = [50, 650, 4210, 1550]
origin = top-left; right and bottom endpoints are exclusive
```

The box includes the bus body, mirrors, and wheels; it also encloses some background. The [SVG evidence overlay](../model/evaluation-assets/daniel-oines-bbox-proof.svg) references the unchanged JPEG and draws these coordinates. This is a manual approximate bbox, **not a pixel segmentation mask**. Do not count every boxed pixel as a true bus pixel. A patch audit should state its overlap rule and distinguish certain bus interior regions from loose-box edges. Coordinates belong only to evaluation/annotation; they must never enter feature extraction or oracle construction.

Because the bus nearly spans the full photograph, a center-square crop can discard much of it. Preserve the complete original field when deciding a whole-image audit, document any resizing/letterboxing, and keep source-crop evaluation separate from the original composited-scene protocol.

## Auxiliary training street: Sauk Centre, Minnesota

**Original Main Street HD.jpg**, photographed by **McGhiever** on **October 2, 2015**, depicts the Original Main Street Historic District in Sauk Centre. Commons records the photographer's own work and [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Original_Main_Street_HD.jpg). Original: 1,595 × 1,177 pixels, 1,389,191 bytes. [Original download](https://upload.wikimedia.org/wikipedia/commons/5/5b/Original_Main_Street_HD.jpg). The downloaded SHA-1 matches Commons: `57375870957d76952849dc6bfed271badbf50169`.

The image has brick storefronts, a large yellow traffic-warning sign, yellow crossing markers, red vehicles, and a green foreground street sign. No visible bus was found during manual inspection. It was acquired separately so hard-negative experiments need not consume the evaluation street.

Ready-to-use credit: **“Original Main Street HD, McGhiever, CC BY-SA 4.0, via Wikimedia Commons. Training derivative center-cropped and resized.”** Link to the source and [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Preserve that license for distributed image derivatives; the project's MIT code license does not replace the photograph's license.

## Exact normalization

Both street PNGs were made with Pillow: decode JPEG, convert to RGB, take the centered square using integer floor offsets, then resize to 512 × 512 with LANCZOS. No scene generation, background removal, content retouching, sharpening, or color-profile transform was applied. No EXIF transpose was needed: the source orientations are absent or normal. Sauk Centre contains an ICC profile, which was recorded but not transformed; the numeric RGB contract matches the existing trainer's approach.

| Street | Source crop `(x, y, width, height)` | Normalized PNG SHA-256 |
| --- | --- | --- |
| Emeryville | `(253, 0, 1423, 1423)` | `1ed94ab43560cf8287da67137b496897ad4148fea5d5fce7122834e1b6e21e47` |
| Sauk Centre | `(209, 0, 1177, 1177)` | `57c9ec48db618c00d5443c7aec0147d87585d106c4506b17f006bebcaf4bd5ad` |

Equivalent preparation:

```python
from PIL import Image
with Image.open(source_path) as image:
    width, height = image.size
    side = min(width, height)
    x, y = (width - side) // 2, (height - side) // 2
    prepared = image.convert("RGB").crop((x, y, x + side, y + side))
    prepared.resize((512, 512), Image.Resampling.LANCZOS).save(destination_path)
```

## Intended first evaluation

Freeze the production model/feature code and their hashes before running the new assets. Keep its current threshold. First inspect all empty Emeryville tiles on each grid for false marks, then place the **existing** bus cutout at independently seeded positions on that normalized unseen background. This tests background transfer while holding the foreground asset constant. Audit the second bus photograph separately to test foreground/lighting transfer without an AI-derived cutout. Report each task and its preprocessing independently.

Record candidate false positives, any-overlap hit rate under a declared ground-truth rule, exact marked-set/true-target Grover probability, and any sampled localization separately. Negative results are useful evidence. Do not adapt to the held-out street and then report it as an untouched test. Keep production checkpoints and both live interfaces unchanged while these experiments run.
