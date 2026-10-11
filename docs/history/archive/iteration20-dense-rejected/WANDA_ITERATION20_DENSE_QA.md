# Iteration 20 — dense pedestrian entry-motion QA

Current private source: `66f66be39e50df251ffb7345486b9b006c7b25e4`. The website keeps
**Quantum Vision: Where's Wanda?** and **Can you find Wanda using quantum crowd
search?** The latest requested behavior is dense overlapping pictogram groups
at points of interest, dispersing on viewport entry with linear timing at
constant 28 CSS px/s and settling at text-safe edges/corners. This explicitly
supersedes the earlier static-only direction and retains the same three PNGs.
Actual observations below are copied from the final metadata.

All 147 Node engineering tests were actually rerun on the final dense pedestrian revision and passed. The read-only frozen verifier was actually rerun on that revision and passed: 11 files, 7 source contracts and 12 pixel fixtures. The model SHA256 is unchanged. These are engineering/integrity checks, not a new recognition benchmark.
Final module syntax and Git whitespace checks passed (ordinary CRLF conversion notices only). The three unchanged 1145×1374 RGBA PNGs retain transparent/opaque alpha and exact website/output byte identity.

- Source uses a seeded compact ellipse, stable varied size/depth/facing, and WAAPI straight translations with easing linear. Every duration is the unrounded Euclidean route distance divided by28 CSS px/s; durations are not clamped. Short button routes can finish below3s and long desktop flanks exceed7s.
- Three actual rendered desktop samples across189ms showed six different people advancing along their routes at approximately27.8px/s overall, consistent with28px/s and frame sampling. The samples are a short visual-motion check, not a long-duration performance benchmark.
- Viewport entry starts at15% visibility; a full exit parks and enables replay. Actual navigation away/back changed the main heading from parked to spreading. Resize and the site's Reduce animations checkbox park the groups.
- Source review found coherent OS reduced-motion, background-first entry and bfcache cleanup. OS preference toggling, background restoration and actual bfcache navigation were not independently exercised.
- Nine decorative groups allocate190 desktop figures: main48, underhood36, stage16, Find18, other controls14–16. Hidden stage controls remain hidden; these are not190 simultaneous onscreen people. Initial main crowd visibly overlapped, then spread to clear upper perches and a right flank.
- Actual390/320 CSS-pixel viewports retain one row of five map thumbnails. Document scroll widths375/305px during ordinary preview; at320 no active visible figure exceeded the viewport. Resize parks motion. Actual390×844 JPEG proof is wanda-pedestrians-dense-phone-proof.jpg.
- The site's Reduce animations checkbox parked all nine groups immediately. Unchecking, fully exiting and returning to Play restarted the main crowd.
- After the complete two-Enter keyboard placement, clicking the decorated Find control returned Found Wanda / Measured point420,300. Switching to the Grover tab updated the stage title to Signs prepare interference. and preserved the decoration.
- Local warning/error console was empty. The existing preview server was reused and left running.
- Exact published source66f66be39e50df251ffb7345486b9b006c7b25e4 deployed successfully to the original owner-private Site. Actual DOM shows main48/underhood36/stage16/Find18 and speed28, with the main crowd spreading on load.
- Saved loaded replay-entry and dispersed-layout JPEGs are actual hosted renders. A full-page clipped screenshot temporarily resizes layout and parks the animation, so the initial-motion proof uses an ordinary viewport capture.
- Actual published decorated Find returned Found Wanda / Measured point420,300 after complete keyboard placement.
- Actual navigation to Look under the hood showed its36-person crowd spreading; selecting Grover updated the stage title. Reduce animations produced zero spreading groups. Returning to Play replayed the main crowd.
- Hosted warning/error console was empty. Start over and Play restored the empty Festival welcome; the hosted tab remains available as the deliverable.

Final hosted proofs: [wanda-pedestrians-dense-entry-hosted-proof](wanda-pedestrians-dense-entry-hosted-proof.jpg), [wanda-pedestrians-dense-dispersed-hosted-proof](wanda-pedestrians-dense-dispersed-hosted-proof.jpg), [wanda-pedestrians-dense-found-hosted-proof](wanda-pedestrians-dense-found-hosted-proof.jpg), [wanda-pedestrians-dense-underhood-hosted-proof](wanda-pedestrians-dense-underhood-hosted-proof.jpg).

All three output assets have PNG signatures and unchanged hashes, matching
their supplied metadata and website copies byte-for-byte:

- `pastel-red-pedestrian.png`: unchanged SHA256 `dec0a388b558239df7d5108e9bc83098add8f462f1253551062ad9150094fad8`; identical website copy `waldo-search-lab/dist/assets/ui-pedestrians/pedestrian-red.png`.
- `pastel-yellow-pedestrian.png`: unchanged SHA256 `3e65880860e3be5405f052692fca430890b510e98a7307def16fb96512ab6f51`; identical website copy `waldo-search-lab/dist/assets/ui-pedestrians/pedestrian-yellow.png`.
- `pastel-blue-pedestrian.png`: unchanged SHA256 `acf54ce0bf379ab7084b013772575f7dd68804b989a8d93399a22157fd75e977`; identical website copy `waldo-search-lab/dist/assets/ui-pedestrians/pedestrian-blue.png`.

These decorations remain outside the image searched. The trained standing PNG,
five scene images, features, threshold, model, circuit and Grover mathematics
remain frozen. No new recognition benchmark, training run, reserved evaluation
or quantum runtime advantage is claimed. Frozen model SHA256: `d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88`.
The independently merged 29-file playground remains source only, without an
installation/build/runtime/scientific validation claim. Existing scientific
limits and original failures remain in the exact prior records.

Actual failures, corrections and revision history:

- The rejected animated photo-cutout theme was removed by the title-only rollback. The latest explicit user request authorizes motion of the retained pictograms and supersedes the intervening static-only instruction.
- Initial static rows and the later staggered static revision are historical. The complete staggered-static records and proofs are preserved in archive/iteration20-staggered-static.
- The Git export README-link guard failed because GITHUB_SYNC_RECEIPT.json is local-only and excluded from Git. Generated records now render that local receipt as a literal filename and link the tracked GITHUB_EXPORT_MANIFEST.json.
- Remote main independently merged PR #1 at 032615659c5967df8f025b63bdd610954d21b3ea. Its 29 qnn-playground files are preserved as source; no installation, build, runtime or scientific validation of that project is claimed.
- First local search check armed the tray but omitted scene Enter; the unplaced/empty scene correctly returned No match. Correcting the interaction to two Enter presses returned Found at420,300. This was a QA interaction omission, not a recognition regression.
- An exact navigation locator incorrectly included the arrow in its accessible name; inspection showed the name Look under the hood, and the corrected locator succeeded. A later Found heading wait also used the wrong exact label; direct result observation confirmed completion.
- An early phone viewport screenshot was only98×211 despite actual390 CSS-pixel layout. Full-page clipped capture produced the actual390×844 JPEG proof; the original static phone proof was restored from its archive.
- Browser screenshot exports are JPEGs. New screenshot filenames were corrected to .jpg without raster editing.
- The first motion-agent patch format was rejected before mutation; the corrected module replacement succeeded. No application state was lost.

The preceding static increment's original repair observations and proofs remain
in `archive/iteration20-staggered-static` and its archived exact receipt.
The local private Git receipt is `GITHUB_SYNC_RECEIPT.json` (excluded from Git). The tracked [Git export manifest](GITHUB_EXPORT_MANIFEST.json) records the export scope; website source and private Git commits have separate histories.

## Transfer repair

The refreshed private-Git transfer whitespace audit rejected extra blank lines at EOF in the three newly appended bus project-state documents. Their trailing blank lines were removed before retry; the transfer validator records the actual retry result separately.

## Hosted entry proof repair

The first hosted entry screenshot caught Opening the scene editor before the decorative PNGs rendered. Its actual loading frame is retained in archive/iteration20-cold-loading-proof.jpg. The current entry proof was replaced with a loaded viewport re-entry capture showing48 figures partway through dispersal. Initial dense overlap was independently observed in the local preview; the current hosted capture shows the loaded replay in progress.
