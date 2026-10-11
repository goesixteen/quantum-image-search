# Wanda artwork pack

This pack contains exactly five original illustrated scene identities and one
transparent fictional woman sprite, generated with the built-in
`image_gen.imagegen` tool. It is a new game-art domain, separate from the
historical illustrated, OpenMoji and human-licensed backgrounds. No commercial
character or third-party artwork was supplied as a generation reference.

| Scene ID | Setting | Untouched generated original | 512px game/training derivative |
| --- | --- | --- | --- |
| `wanda-festival` | Town festival | `assets/wanda/festival.png` | `assets/wanda/festival-512.png` |
| `wanda-beach` | Beach and promenade | `assets/wanda/beach.png` | `assets/wanda/beach-512.png` |
| `wanda-market` | Outdoor market | `assets/wanda/market.png` | `assets/wanda/market-512.png` |
| `wanda-park` | City park | `assets/wanda/park.png` | `assets/wanda/park-512.png` |
| `wanda-fairground` | Fairground | `assets/wanda/fairground.png` | `assets/wanda/fairground-512.png` |

All five originals are square RGB PNGs, **1254×1254**. The prompts requested
1024-square images, but1254-square is the actual returned size. Final files were
copied byte-for-byte from the tool's saved outputs; originals were not cropped,
resized or painted afterward. The first drafts had too much perspective size
variation. One targeted imagegen correction per scene recomposed each as a
denser flat picture map with many more small figures. Those initial drafts were
the only image references supplied to the correction calls.

Each final scene was visually inspected for setting, crowd density, small
upright figures, distractor clothing and absence of the exact target outfit.
Adults are broadly comparable to a roughly40–60px figure on the512px scene;
the scale estimate is visual, not an annotated guarantee that every person has
identical height. Seated people, children and swimmers naturally differ in
visible height. Plain red/white tops, blue trousers, warm skin, brown hair and
blue/green-white stripe patterns create near-distractors. No exact female
red-white horizontal sweater/blue-trouser target was identified in the final
backgrounds; this is a manual visual check, not exhaustive person annotation.

The trainer's `model/wanda-qnn/normalize-backgrounds.mjs` creates the separately
named512px derivatives using `@napi-rs/canvas@0.1.100`, a full-square `drawImage`,
enabled smoothing and `imageSmoothingQuality='high'`. These are numeric resize
derivatives, not new AI compositions. Browser and training should use these
512px PNGs at1:1 so background downsampling does not introduce another renderer
domain difference. Original and derivative dimensions/hashes are recorded in
`assets/wanda/normalization.json`. There is no source crop rectangle.

## Target sprite

`assets/wanda/wanda.png` is the untouched1024×1536 RGBA tool output. Wanda is an
original fictional adult woman with a dark brown bob, warm tan/yellowish skin,
red-and-white horizontal sweater bands, blue trousers, dark shoes and arms
down in a front view. No hat, glasses, scarf, text or props are present.

The output has genuine transparent alpha: range0–254, with1,106,593 fully
transparent pixels. Alpha greater than16 bounds the main figure at
`[285,21,725,1514]`, or **440×1493**. Alpha greater than32 gives
`[285,22,725,1514]`. A soft low-alpha halo is part of the generated output and
was retained; the greater-than16 crop bounds exclude its outer extent. Do not
claim a hard binary alpha mask or that the source has been manually cleaned.

When the runtime trims by alpha>16, the aspect ratio is about0.2947. At a52px
rendered height, rounded width is **15px**. The intended new fitting range is
40–64px tall with52px default; actual runtime/trainer sizing must stay aligned.
The trainer measured the source-only full stripe period at about0.0597 of
figure height (about3.10px at52px). Source-only approximate color medians are
red `(215,21,30)`, white `(249,244,242)`, blue `(35,101,180)`, skin
`(250,180,100)` and brown `(60,29,11)`. These are observations for a declared
known-style feature representation, not inference-time template pixels.

## Provenance, prompts and scope

`assets/wanda/generation-prompts.json` preserves every exact prompt: target,
five first scenes and five scale corrections. `assets/wanda/provenance.json`
contains observed generated-output paths, per-file hashes/dimensions, visual
review notes and the final release time. The tool's model/version was not
exposed in its returned metadata, so this record makes no model/version claim.
Final backgrounds were released to root and trainer at clock-tool UTC
`2026-10-11T04:31:24Z`; the final target was shared earlier so its appearance
priors could be measured before the new extractor froze.

These are disclosed AI-generated game assets. This record does not assert
public-domain or Creative Commons status for generated output. Keep historical
human-licensed artwork and OpenMoji credit/license records intact and separate;
their licenses should not be attached to the new Wanda images.

Asset readiness does not establish model accuracy. The new QNN must be trained
and evaluated on final composite RGB with supplied size, with no clean
background, target PNG pixels, placement labels or template-result acceptance
gate at inference. Training reuse of these five backgrounds and this one sprite
supports controlled same-art placement experiments, not general person
recognition. No new foreground-mask or occlusion work is required for this pack.
App/catalog integration, trained-model evidence, browser QA and private Site
deployment are separate work owned by root/trainer. No contest or public
project/video/source submission or publication is authorized or performed;
owner-private review Site updates remain authorized.
