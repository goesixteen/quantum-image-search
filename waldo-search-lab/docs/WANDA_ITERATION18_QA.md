# Iteration 18 — Wanda’s welcome interface

The main game opens with no inserted Wanda. Five world thumbnails sit in one
row above the scene. A large portrait in the right-hand welcome box invites the
user to drag her into the image. A small drag image uses the existing scene
scale; dropping inside inserts the same 52px raster and hides the portrait.
Dropping outside restores the portrait. Remove returns Wanda to the box; Start
over restores empty Festival. Find remains in the right-hand game menu.

The desktop preview is an explicit, cursor-following image on the page; native
drag events and document dragover events update it. Its center follows the
pointer and its dimensions match the displayed scene sprite. The OS drag image
is transparent, avoiding a second large portrait. The preview never enters the
analyzed image until an actual map drop commits placement.

Keyboard users activate the portrait, then place with Enter or arrow keys;
click/tap placement also remains available. Touch/pen handlers use a captured
pointer, a small fixed preview and scene/target revision checks. Cancellation,
lost capture and changed assets cannot commit an obsolete placement. UI portrait
and preview artwork are not image-classifier inputs.

## Actual local checks

- Full 147-test Node engineering suite passed.
- JavaScript syntax and HTML nesting/unique-ID/selector-order/CSS-brace checks
  passed. The technical section’s HTML remained unchanged.
- Read-only frozen verification passed: 11 files, seven source contracts,
  12 pixel fixtures; model SHA256
  `d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88`.
- Fresh local page showed empty Festival, visible large portrait, five choices,
  and disabled Remove/Shuffle until Wanda was placed.
- Actual native desktop drag from portrait to Festival succeeded. The portrait
  disappeared, a scene-size Wanda appeared, and Find returned (420,300).
- Actual native drop outside the map left the scene empty and restored the
  portrait. Empty Festival Find accepted 0/4096 and returned No match found.
- Beach, Market, Park, Fairground and Festival selections changed their scene
  and selected thumbnail while preserving the empty welcome state.
- Enter on the portrait focused the map without inserting a target. Escape
  returned focus to the portrait. Activating it again and pressing Enter on
  the map inserted Wanda; the inspected score was 98.82% at (420,300).
- Remove and Start over restored the portrait. The portrait stage remains fixed
  and welcome copy reserves space, keeping Find in the same menu position.
- Actual 320px viewport: document width 305px, five choices on one row, no
  horizontal document overflow. The viewport setting applies asynchronously;
  early immediate reads reported desktop widths and were not phone tests.
- Actual 390px viewport: document width 375px; all five named choices fit one
  row. Keyboard placement hid the portrait and produced the expected 98.82%
  inspected score. Find’s document Y was 834.1667px before and after placement.
  Start over returned to the empty welcome state. A full-page phone proof was saved.
- An attempted Control+Home on the nonfocusable body was rejected by browser
  automation. No screenshot was produced by that failed call. Later proofs
  used the supported full-page screenshot API; no app repair was needed.
- Browser error/warning console was empty.

## Cursor-preview correction

The first private interface revision was source
`20ceda2fdadafab8c9c8fd6761963b539676a048`, deployment
`appgdep_6acbca29dbf08191af93b83aaef2b98b`. Drag placement passed, but the user
reported that Wanda did not appear around the cursor. The detached native drag
canvas was not a reliable visible preview. That failure is retained here.

The correction uses the explicit fixed image for native mouse dragging as well
as touch/pen. Actual local native-drag observation captured a visible, decoded
17×61px Wanda preview at the current display scale, followed by a successful
map drop, hidden portrait and cleared preview. A screenshot was saved while
the native drag was in progress. This tests displayed feedback separately from
the successful end-state placement.

## Retained scope and remaining checks

The model, threshold, scanner, compositing scale and Grover simulation are
unchanged. No training, reserved-test rerun, accuracy expansion or new art.
Historical 298/300 and baseline 299/300 results retain their original scope;
Park lookalike failures at 40/46px remain. Desktop native dragging and keyboard
placement were exercised. A physical touchscreen/pen gesture, multi-touch,
OS reduced-motion preference and unfamiliar-user study have not been tested.
Hosted checks and exact publication provenance are recorded separately after
private deployment. Schoolbus and both original Site identities are preserved;
no contest submission or public source/video/Qollab publication.
