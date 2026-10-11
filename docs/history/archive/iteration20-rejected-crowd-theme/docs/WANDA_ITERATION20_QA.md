# Iteration 20 — crowd-themed interface

The main heading is **Quantum Vision: Where's Wanda?** and the subheading is
**Can you find Wanda using quantum crowd search?** Nine main headings/actions
have decorative people sampled from a pool of exactly ten existing transparent
PNG cutouts. They reuse the historical original Festival, with unchanged bytes;
they were not extracted from the current five scenes. Read
[cast provenance](CROWD_CAST_ASSETS.md).

People start together and walk to reserved perches above the labels when their
anchor enters view. Mouse hover and keyboard focus on a button move them another
17px outward at desktop sizes, subject to bounds. The animated walk uses clipped
upper/leg portions of one static PNG, not new pose frames. It ends after about
1.4 seconds, with no idle animation. Scroll re-entry restarts the entrance.
Reduced-motion preference or the existing Reduce animations control parks the
people without transitions. Page hiding cancels pending motion.

Overlays are inert, aria-hidden, pointer-events:none siblings of the existing
controls. They preserve accessible labels when the app changes textContent.
They remain outside the analyzed canvas and cannot feed classifier inference.

## Actual source and browser checks

- All 147 existing Node engineering tests were rerun and pass. Read-only frozen
  verification passes 11 files, seven source contracts and 12 pixel fixtures.
  Model SHA remains `d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88`.
  This UI iteration does not produce new recognition accuracy.
- JavaScript syntax and Git whitespace checks pass. All ten RGBA asset hashes,
  dimensions and alpha ranges match their original registrations; the copied
  bytes are identical. Source review checked finite cleanup, parent overlays
  and reserved label spacing, including app label mutations.
- Actual desktop scroll entry showed `is-walking`, alternating leg animation
  and intermediate translation matrices. Settled groups stopped walking.
  Find's parked x-translations were 28.51,97.98,178.39; mouse click/focus moved
  them to 11.51,114.98,195.39 while its label changed through Stop search and
  Find Wanda. The button remained operable, and an empty Festival returned
  **No match found**. The heading/circuit state remained connected to that run.
- Actual active 390px and 320px viewports showed no horizontal document overflow
  (scroll widths 375 and 305px) and five thumbnails with the same top coordinate.
  Main titles and subtitles remained readable. A 390px screenshot was saved.
- Checking Reduce animations actually gave all nine groups `is-still`, no
  walking class, transition duration 0s and animation name none. The setting
  was reset. OS preference handling was reviewed, not directly toggled.
- A separate actual keyboard placement and decorated Find click returned
  **Found Wanda / Measured point 420,300**. Switching through Grover and
  Measurement updated the stage title without deleting its people or changing
  its accessible heading. The saved accepted address remained 2420 at round50.

## Scientific preservation and limits

The existing standing Wanda PNG, five scene rasters, frozen QNN and threshold,
feature extraction, classical address bridge, exact Grover simulation and
technical HTML are unchanged. Decorative code is a new standalone module.
No training or reserved benchmark was run. Historical 298/300 QNN versus
299/300 logistic results retain their earlier unseeded/native domain scope;
known Park false accepts and browser/native differences remain documented.
Iteration19's arbitrary hosted drop abstention remains a recognition failure.

Physical touch/pen, multi-touch, unfamiliar-user comprehension and OS-level
motion settings were not directly tested. The cast PNGs are intentionally
small historical cutouts; CSS walking is an illustrative motion effect.
No public or contest submission, Qollab upload, billing change or usage reset.

## Retained tooling observations

A first responsive override applied to the active browser rather than a hidden
preview tab. Its 1280px width was observed and was not counted as phone QA;
an active preview was then created and actual 390/320px widths were checked.
The read-only browser facade does not implement document.getAnimations;
computed CSS classes/matrices were used instead. No application fix was needed.

Hosted publication, proof and post-release checks are recorded in the root
publication receipt and current handoff after deployment. This source record
describes pre-publication checks and does not invent hosted outcomes.
