# Wanda's hanging UI pose

Created October 11, 2026 with the built-in ImageGen tool in edit mode. The
reference/edit target was the existing generated `dist/assets/wanda/wanda.png`.
The new `dist/assets/wanda/wanda-hanging-ui.png` is a presentation-only sprite:
one hand raised above her head so the drag preview can hang from the pointer.
It is never passed to the classifier, training, scan or final scene compositor.
The standing target and frozen detector are unchanged.

Output: 1024×1536 RGBA; alpha range 0–254; all four corner alpha values zero.
SHA256: `60ee00a4cab49fe80cfd1b14e6aea96efe8b59df2165480c31e90bf7f9e42aa7`.
The generated PNG was copied intact; no raster edits or resampling were applied.
Runtime CSS applies display scaling and rotation only. The hand anchor is at
31.5% width, 1.9% height; a small static rotation balances the hanging silhouette.
The transparent fringe is part of the generated output. This is original
project artwork, not a scan of published Waldo art or an externally sourced
licensed image. The reference's prior provenance remains intact.

## Exact built-in prompt

Use case: precise-object-edit.
Edit target: the provided transparent Wanda PNG. Create one transparent UI drag sprite of the SAME friendly female clip-art character: same face, brown bob haircut, red-and-white horizontally striped sweater, blue jeans and dark shoes, same clean black-outline illustration style.
Pose change only: her right arm (on viewer's LEFT) extends straight UP above her head, with that hand gently curled as if being held from a computer mouse pointer. The raised hand is the topmost visible part of the entire character. One anatomically correct arm raised, other arm relaxed downward; full body dangling below the hand, both feet visible, no extra limbs, no object held, no mouse icon, no rope. Body roughly upright and comfortably suspended, cheerful expression. Keep full character entirely within canvas with a little transparent margin, simple crisp sprite shape, no glow/shadow/background/text. Intended for a small moving website preview. Preserve genuinely transparent alpha background.
