# Iteration 19 — Wanda speaks, shrinks and swings

The welcome greeting is a speech bubble pointing toward Wanda's portrait.
When Wanda is placed, “I'm in the scene!” is plain text: the bubble outline,
fill, shadow and tail disappear while its reserved height preserves the menu.
Pickup uses captured pointer events for mouse, touch and pen. The portrait
hides while a presentation-only raised-hand sprite shrinks from its portrait
position toward the pointer over 190ms. After pickup, its hand remains at the
pointer while a damped angular spring makes the body trail horizontal movement
and swing back at rest. Reduced animation skips the shrink/swing. Release inside
the map inserts the existing standing target at the preview body's center;
release outside cancels. Dragging a placed target off the map removes it and
restores the welcome portrait. Remove and Start over remain available.

The new pose is interface artwork, not a classifier input or new target domain.
See [the exact asset prompt/provenance](WANDA_HANGING_ASSET.md). The standing
PNG, scene assets, model, threshold, scanner and quantum mathematics are frozen.
The technical section's HTML remains unchanged.

## Actual engineering and local observations

- All 147 existing Node engineering tests pass after the completed integration.
  JavaScript syntax and Git diff whitespace checks pass.
- Read-only frozen verifier passes 11 files, seven source contracts and 12
  pixel fixtures, preserving model SHA256
  `d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88`.
- Separate scratch numerical checks exercise both motion directions and settling:
  moving angle ±0.338839rad, overshoot ±0.430928rad, final angle zero;
  1,500 irregular/reversed samples remain finite/bounded. Reduced motion resets
  angular velocity; extreme finite inputs remain finite. These are animation
  engineering checks, not new classifier evidence.
- Actual mouse pickup showed hidden source opacity zero, raised-hand image,
  shrink heights 239.8→208.4→157.7→103.8px during a quick gesture, and changing
  rotation matrices. Drop cleared the preview and hid the welcome portrait.
- Actual first dropped Festival target was found at measured (284,260).
  Keyboard placement still works; actual canvas dragging from (420,300) past
  the right edge returned Wanda to the welcome box.
- A later pointer pickup/search found (300,228). Actual390px and320px
  viewports have no horizontal overflow; all five map choices stay in one row.
  The mobile speech-bubble tail points right to the portrait. A390px proof
  was saved and the viewport restored.
- Actual reduced-animation mouse gesture used constant70.76px height and
  constant static orientation; outside-map release restored the portrait and
  cleared the preview. The checkbox was restored afterward.

## Retained development failures

Independent review caught a quick-release mismatch between the interpolated
preview and final drop geometry. The owned RAF now finishes the190ms pickup
before committing from its actual rendered body center. Subsequent events from
the same mouse pointer cannot change the released coordinates. The same review
confirmed cancellation/RAF ownership, reduced motion, keyboard and upload paths.
One combined bookkeeping patch had a stale documentation context and was
rejected; reapplied with correct context before publication.

An initial native HTML drag integration exposed stale portrait painting while
the new shrinking sprite was visible. Switched to captured pointer events for
mouse as well as touch/pen; actual follow-up screenshot showed the source box
empty while the hanging sprite moved. A cancellation probe accidentally ended
inside the map and therefore placed Wanda; it was not counted as cancellation.
One screenshot threshold missed the very short initial swing. Later real input
observations captured shrinking and rotation directly. Early read commands
used nonexistent catalog/script paths or a repeated workspace prefix; corrected
the reads without altering model/evidence. Physical touch/pen, multi-touch,
OS reduced-motion preference and unfamiliar-user testing remain untested.

Responsive, final hosted checks, exact source/deployment and remaining actions
are recorded in the user-facing handoff and publication receipt after release.
No retraining, reserved-test rerun or new accuracy claim. Park40/46px curation
false acceptances and all historical rendering differences remain retained.
Schoolbus and both owner-private Site identities are preserved. No contest
submission, public source/video/Qollab publication or agent usage reset.
