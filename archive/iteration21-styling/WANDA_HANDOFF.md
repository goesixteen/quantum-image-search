# Quantum Vision: Where's Wanda? — iteration 21

[Open the owner-private website](https://quantum-crowd-search.syrupyspool2.chatgpt.site). The rejected people theme has
been reverted and replaced with the user's revised style: **ten people total**,
one of each distinct generated clip-art person, in small static clusters only
on **top-right object edges**: **four on the map frame, three on the Wanda card
and three on the Find button**. There are no people on the heading/world picker
or scattered on the sides/bottom. The website itself has the
Where's Wanda game feel. The lower under-the-hood half uses the same red as
the Find Wanda button, with a white/red striped transition and light readable
diagram cards. No decorative people appear under the hood.
The old sign pictograms and walking/viewport-entry dispersal are removed.
The heading remains **Quantum Vision: Where's Wanda?** and the
subheading remains **Can you find Wanda using quantum crowd search?**
The empty welcome, five map choices, hanging Wanda pickup and connected
Image + QNN → Grover → Measurement lesson remain.

Final tested top-half style: Ten original clip-art people, one each, stand in three compact groups (4/3/3) on the top-right edges of the map frame, Wanda card and Find Wanda. The top-half style test uses warm paper texture, illustrated scene cards, a stronger painted map frame and gentle menu shadows. Find and the full lower chapter share #d24e45, with a white/red striped transition and light diagram panels. This is the completed styling increment before the newly requested inline QNN playground replacement.


The three previously requested PNG downloads are retained separately as
historical artwork: [Red PNG](pastel-red-pedestrian.png), [Yellow PNG](pastel-yellow-pedestrian.png), [Blue PNG](pastel-blue-pedestrian.png). They are absent from the live UI and inference.
Their previous integration/provenance is recorded in
`archive/iteration20-dense-rejected/publication-receipt.json`.

Current private source: `e99fb70e961358738b87187c73c73509e0470514`. Version: `appgprj_6ac9ed0456008191aafac54f8d5af4d1~appgver_97a24335d3348191b0e391e92889c6fd`.
Deployment: `appgdep_6acbf467c7ec8191bfc99e63659537f0`, succeeded. The schoolbus deployment and both
original owner-private Site identities remain. Rejected dense source
`66f66be39e50df251ffb7345486b9b006c7b25e4` and its exact records/proofs are historical in `archive/iteration20-dense-rejected`.
Earlier rejected photo-cutout and sign-pictogram revisions remain in their
original archives. Preserve the latest static clip-art clusters on top-right
object edges in the top game; do not restore the rejected pictograms or motion.

All 147 Node engineering tests were actually rerun after replacing the rejected people theme with the final static clip-art layout and passed. The read-only frozen verifier was actually rerun on the final replacement and passed: 11 files, 7 source contracts and 12 pixel fixtures. The model SHA256 is unchanged. These are engineering and integrity checks, not a new recognition benchmark.
node --check dist/clipart-cast.js and git diff --check passed; ten PNG hashes distinct, RGBA alpha extrema0–254 and >978000 fully transparent pixels each. PNG bytes/alpha preserved. No old sign modules/assets deployed.

The following are the supplied actual final browser observations:

- Desktop actual1378x871: paper texture/cards/frame/menu style visible; ten loaded assets; three clear4/3/3 edge clusters; no underhood figures.
- Phone actual390x844: scrollWidth383; five scene cards share the same top coordinate; all ten figures loaded and clusters report clear; Find and lower region both rgb(210,78,69).
- Before the final CSS-only polish, keyboard pickup plus scene Enter and Find measured420,300. Decorative elements pointer-events:none and feet alignment equals their group edge.
- Published e99fb70 privately; desktop and phone styling verified after assets loaded. The five scene choices, empty welcome and ten4/3/3 clusters remain.
- Find and underhood both rgb(210,78,69); stripe uses exact white and that red; light outer diagram panels and cream heading remain readable.
- Phone actual390x844: scrollWidth383 and ten loaded figures, all three groups clear.
- The preceding3e9c34 private cluster/red increment measured420,300 with98.82% QNN score; Next gate changed0/80 to1/80 and q0 Bloch to(0.801,0,0.599). Both Grover and Measurement stage tabs changed correctly.
- Final e99fb70 styled publication: keyboard pickup, scene Enter and Find produced Found Wanda at measured420,300, QNN score98.82%, threshold90.56%.

See [current QA](WANDA_ITERATION21_QA.md), [the exact publication receipt](publication-receipt.json)
and fresh hosted proofs: [wanda21-hosted-top-style](wanda21-hosted-top-style.jpg), [wanda21-hosted-underhood-red](wanda21-hosted-underhood-red.jpg), [wanda21-hosted-mobile-style](wanda21-hosted-mobile-style.jpg).

The independent PR #1 merge at `032615659c5967df8f025b63bdd610954d21b3ea` and
its 29 `qnn-playground` source files remain preserved. This rollback does not
claim that project's installation, build, runtime or scientific validation.
The local private Git receipt is `GITHUB_SYNC_RECEIPT.json` (excluded from Git). The tracked [Git export manifest](GITHUB_EXPORT_MANIFEST.json) records the export scope. Website source and private Git commits have separate histories.

Historical 298/300 QNN versus 299/300 classical results retain their original known-target, supplied-size, unseeded native-renderer scope. The browser diagnostic's 15/15 target cases and native 13/15 target cases retain their original separate scope. Park's 40px/46px false acceptances, renderer differences and iteration 19's arbitrary-drop abstention remain recorded failures. No retraining or reserved evaluation occurred.

Read this handoff, WANDA_ITERATION_BRIEF.md and the exact receipt before
continuing. Preserve the static top-game clip-art placement, existing Wanda
interaction, red lower three-stage explanation without decorative people, optional scientific details
and frozen evidence.
Zero agent usage resets were consumed; preserve the remaining reset for the
user. Nothing has been submitted or published as public contest material.
