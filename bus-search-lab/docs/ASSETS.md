# Photographic asset manifest

Verified and downloaded October 10, 2026. These source assets are real photographs, not generated scenes. The source JPEG filenames below refer to original, unedited downloads. The transparent PNG is an edited derivative, listed separately.

## Schoolbus source

- Local file: [real-schoolbus-source.jpg](../dist/assets/real-schoolbus-source.jpg).
- Title: *Blue Bird A3FE school bus Tacoma*.
- Photographer: **SupportPDX**.
- Photograph date: September 4, 2015.
- Original dimensions: 3,264 by 2,448 pixels; downloaded size 3,133,006 bytes.
- [Wikimedia Commons description, provenance, and license](https://commons.wikimedia.org/wiki/File:Blue_Bird_A3FE_school_bus_Tacoma.jpg).
- [Photographer's Flickr source](https://www.flickr.com/photos/rocketboom/21179058886/).
- [Direct original JPEG](https://upload.wikimedia.org/wikipedia/commons/b/ba/Blue_Bird_A3FE_school_bus_Tacoma.jpg).
- License: [Creative Commons Attribution 2.0 Generic](https://creativecommons.org/licenses/by/2.0/).

The image shows a yellow Blue Bird schoolbus from a clear side/front angle, with the entire bus visible and separable from the road and trees. It is suitable for an isolated draggable cutout. The downloaded original includes the surrounding scene and has no alpha channel. The photo's Commons page records a Flickr license review confirming CC BY 2.0.

Suggested displayed credit after extraction: **Schoolbus photo: SupportPDX, CC BY 2.0. Background removed and image cropped/resized for this demo.** Link the photographer/source page and license. If an AI tool assists the cutout, describe that background-removal edit rather than presenting it as an unedited photograph or a newly photographed asset.

## Street background

- Local file: [street-photo.jpg](../dist/assets/street-photo.jpg).
- Title: *Covington, Va - Main Street*.
- Photographer: **Jarek Tuszyński** (Wikimedia user Jarekt).
- Photograph date: August 1, 2012.
- Original dimensions: 3,230 by 2,194 pixels; downloaded size 3,025,118 bytes.
- [Wikimedia Commons description and license](https://commons.wikimedia.org/wiki/File:Covington,_Va_-_Main_Street.jpg).
- [Direct original JPEG](https://upload.wikimedia.org/wikipedia/commons/6/6c/Covington%2C_Va_-_Main_Street.jpg).
- License: [Creative Commons Attribution-ShareAlike 3.0 Unported](https://creativecommons.org/licenses/by-sa/3.0/).

This is a real daytime town street with buildings, parked cars, and a visible roadway. It was visually inspected after download. The original downloaded file is unmodified; the interface may crop or scale it to the captcha viewport.

The reproducible [street-captcha.png](../dist/assets/street-captcha.png) derivative is a 512 by 512 center-cover crop/resize made with Pillow LANCZOS. Its source rectangle is (518, 0, 2,194, 2,194) within the original JPEG. No scene generation or content editing was used. The browser and photo-model generator load this exact raster so that background normalization is identical. Keep the street photographer credit and CC BY-SA 3.0 on this derivative too.

Suggested displayed credit: **Street photo: Jarek Tuszyński, CC BY-SA 3.0; cropped/scaled for this demo.** Preserve the attribution, source and license links, and identify changes. Distribute adapted street imagery under CC BY-SA 3.0 or a compatible license. Keep third-party media licensing distinct from the project's MIT code/documentation license; do not claim these original photographs are MIT-licensed.

## Model evaluation boundary

Training and testing randomized placements of this one bus cutout on this one street photo measures **same-asset compositing performance**. New placement seeds do not create unseen bus appearances or unseen backgrounds. A later claim about general photographic schoolbus localization needs independent asset identities and a broader held-out image set.

The detector should receive only the composited pixels. Placement coordinates and the cutout alpha mask are ground truth for evaluation and must not enter the learned-oracle path.

## Extraction status

The finished [real-schoolbus.png](../dist/assets/real-schoolbus.png) is a 1,942 by 809 RGBA PNG. Its alpha channel ranges from 0 to 255, and it was visually checked as an isolated transparent bus cutout. It is an edited derivative of the SupportPDX source photo, made with the built-in ImageGen background-extraction tool. The returned PNG was copied intact, with no later pixel editing or alpha cropping. The exact prompt is recorded in [IMAGE_EDIT.md](IMAGE_EDIT.md).

Surrounding scenery was removed and the output framing changed. AI extraction can alter details, so treat the result as a photo-derived edited asset, not an unmodified photograph or an assertion of pixel-perfect masking. The source JPEG remains the provenance reference. The displayed credit should name the photographer, source, CC BY 2.0, and these changes.
