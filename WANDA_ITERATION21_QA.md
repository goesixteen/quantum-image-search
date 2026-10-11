# Iteration 21 — static clip-art people QA

Current private source: `e99fb70e961358738b87187c73c73509e0470514`. Deployment: `appgdep_6acbf467c7ec8191bfc99e63659537f0`,
succeeded. The user rejected the earlier people theme and asked to revert it,
then requested ten distinct clip-art people. The latest correction asks for fewer
people, only in clusters of two to four on top-right object edges. The final
layout has ten people total, each distinct generated person appearing once:
map frame four, Wanda card three and Find button three. No people decorate the
heading/world picker or scatter on the sides/bottom. The final people layout is
static and limited to those top-game objects. The lower
under-the-hood half has the same red background as Find Wanda, a white/red
striped transition and light readable diagram cards, with no decorative people. The old sign
pictograms and walking/viewport-entry dispersal are removed. The requested
heading/subheading, five-scene welcome, hanging Wanda pickup and connected
three-stage lesson remain. Requested behavior is recorded separately from the
actual browser observations below.

Final tested top-half style: Ten original clip-art people, one each, stand in three compact groups (4/3/3) on the top-right edges of the map frame, Wanda card and Find Wanda. The top-half style test uses warm paper texture, illustrated scene cards, a stronger painted map frame and gentle menu shadows. Find and the full lower chapter share #d24e45, with a white/red striped transition and light diagram panels. This is the completed styling increment before the newly requested inline QNN playground replacement.


All 147 Node engineering tests were actually rerun after replacing the rejected people theme with the final static clip-art layout and passed. The read-only frozen verifier was actually rerun on the final replacement and passed: 11 files, 7 source contracts and 12 pixel fixtures. The model SHA256 is unchanged. These are engineering and integrity checks, not a new recognition benchmark.
node --check dist/clipart-cast.js and git diff --check passed; ten PNG hashes distinct, RGBA alpha extrema0–254 and >978000 fully transparent pixels each. PNG bytes/alpha preserved. No old sign modules/assets deployed.

Actual final observations supplied by root:

- Desktop actual1378x871: paper texture/cards/frame/menu style visible; ten loaded assets; three clear4/3/3 edge clusters; no underhood figures.
- Phone actual390x844: scrollWidth383; five scene cards share the same top coordinate; all ten figures loaded and clusters report clear; Find and lower region both rgb(210,78,69).
- Before the final CSS-only polish, keyboard pickup plus scene Enter and Find measured420,300. Decorative elements pointer-events:none and feet alignment equals their group edge.
- Published e99fb70 privately; desktop and phone styling verified after assets loaded. The five scene choices, empty welcome and ten4/3/3 clusters remain.
- Find and underhood both rgb(210,78,69); stripe uses exact white and that red; light outer diagram panels and cream heading remain readable.
- Phone actual390x844: scrollWidth383 and ten loaded figures, all three groups clear.
- The preceding3e9c34 private cluster/red increment measured420,300 with98.82% QNN score; Next gate changed0/80 to1/80 and q0 Bloch to(0.801,0,0.599). Both Grover and Measurement stage tabs changed correctly.
- Final e99fb70 styled publication: keyboard pickup, scene Enter and Find produced Found Wanda at measured420,300, QNN score98.82%, threshold90.56%.

Fresh hosted proofs: [wanda21-hosted-top-style](wanda21-hosted-top-style.jpg), [wanda21-hosted-underhood-red](wanda21-hosted-underhood-red.jpg), [wanda21-hosted-mobile-style](wanda21-hosted-mobile-style.jpg).

Ten distinct new clip-art PNGs have their supplied hashes and match their
website copies byte-for-byte. Their configured copies are recorded here:

- `wanda-clipart/person-01.png`: SHA256 `16732ab8255544eefd11be2be80183e6aa94442cf7b70fc6de00a66e855f78c1`; one static instance; identical website asset `waldo-search-lab/dist/assets/ui-clipart/person-01.png`.
- `wanda-clipart/person-02.png`: SHA256 `f9fcd3b9efd75668cbf9e9d120a16172725c6fdfb356ad61ab341066504787e8`; one static instance; identical website asset `waldo-search-lab/dist/assets/ui-clipart/person-02.png`.
- `wanda-clipart/person-03.png`: SHA256 `52b58f361f206c347e6b6cf0565beb7fe3d332b5cdfff597c03bb1b2fa58c8f9`; one static instance; identical website asset `waldo-search-lab/dist/assets/ui-clipart/person-03.png`.
- `wanda-clipart/person-04.png`: SHA256 `4b3be5757c919c801a24f37d62a9e93dbd896bf75a3fbadbeddcb98e6f9eac87`; one static instance; identical website asset `waldo-search-lab/dist/assets/ui-clipart/person-04.png`.
- `wanda-clipart/person-05.png`: SHA256 `12eddeee215031a3df063ff822447382fe0852a5b7163c2f3150884a22569f2f`; one static instance; identical website asset `waldo-search-lab/dist/assets/ui-clipart/person-05.png`.
- `wanda-clipart/person-06.png`: SHA256 `99a4cec07763eb4473c547dd875e7bb2d4cd6bb5ddaa55557aefece9a45bbebe`; one static instance; identical website asset `waldo-search-lab/dist/assets/ui-clipart/person-06.png`.
- `wanda-clipart/person-07.png`: SHA256 `4f644626a6cddd555e7f57216dbdc35cef0775eb5a69959af6ea5fe46e7fac65`; one static instance; identical website asset `waldo-search-lab/dist/assets/ui-clipart/person-07.png`.
- `wanda-clipart/person-08.png`: SHA256 `6e15653643c6b52e7ffe26c8d0930c12a5d5edef4fb177939721390f129d7fe5`; one static instance; identical website asset `waldo-search-lab/dist/assets/ui-clipart/person-08.png`.
- `wanda-clipart/person-09.png`: SHA256 `508af001c3daff7e84e4e4368021df73517126694a910d98b6902f6efc756d31`; one static instance; identical website asset `waldo-search-lab/dist/assets/ui-clipart/person-09.png`.
- `wanda-clipart/person-10.png`: SHA256 `a853ed4ab426d20fac1e61923fb6d66f6f33bf60ff2b1aeb0ae1842b477968ec`; one static instance; identical website asset `waldo-search-lab/dist/assets/ui-clipart/person-10.png`.

The three retained standalone PNG downloads have their original signatures and
hashes. They are absent from the live UI and inference:

- `pastel-red-pedestrian.png`: unchanged SHA256 `dec0a388b558239df7d5108e9bc83098add8f462f1253551062ad9150094fad8`; standalone download only.
- `pastel-yellow-pedestrian.png`: unchanged SHA256 `3e65880860e3be5405f052692fca430890b510e98a7307def16fb96512ab6f51`; standalone download only.
- `pastel-blue-pedestrian.png`: unchanged SHA256 `acf54ce0bf379ab7084b013772575f7dd68804b989a8d93399a22157fd75e977`; standalone download only.

Interface presentation change only. The rejected pictogram groups and their motion are removed. Ten distinct clip-art people appear once each, in small static clusters on top-right object edges in the top game half: four on the map frame, three on the Wanda card and three on the Find button. There are no heading/world-picker, side or bottom scatter placements; the under-the-hood technical experience has no decorative people. Its lower background uses the same red as Find Wanda, with a white/red striped transition and light readable diagram cards. The requested heading/subheading, empty welcome, five scene images, hanging Wanda pickup and connected Image + QNN / Grover / Measurement lesson remain. The trained standing target, model, threshold, descriptors and quantum math are unchanged. The old three sign-pictogram PNGs remain standalone historical downloads and are absent from the live UI and inference. No training, reserved evaluation or new recognition accuracy was produced.
Frozen model SHA256: `d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88`.
Historical 298/300 QNN versus 299/300 classical results retain their original known-target, supplied-size, unseeded native-renderer scope. The browser diagnostic's 15/15 target cases and native 13/15 target cases retain their original separate scope. Park's 40px/46px false acceptances, renderer differences and iteration 19's arbitrary-drop abstention remain recorded failures. No retraining or reserved evaluation occurred.
Prior detailed scientific limits, frozen evidence and original failures remain
in their existing records. The independently merged playground remains preserved
without new installation/build/runtime/scientific validation claims.

Revision history and actual corrections:

- The user rejected the earlier people decorations, then requested ten new clip-art people. The latest correction asks for fewer people, in clusters of two to four only on top-right object edges. The final arrangement uses each of the ten distinct generated people once: map frame four, Wanda card three and Find button three. It supersedes the earlier two-or-three-copies request. Under-the-hood has no decorative people.
- The user's additional presentation request gives the lower under-the-hood half the same red as the Find Wanda button, a white/red striped transition and light readable diagram cards.
- The completed dense iteration-20 receipt, canonical documents and proofs were archived before updating current records. The final static clip-art request supersedes the rejected pictogram and walking/viewport-entry motion directions.
- The three requested standalone red/yellow/blue PNG downloads remain intact, with unchanged hashes; they are no longer integrated into the website.
- The local private Git receipt is excluded from Git. Current documents render GITHUB_SYNC_RECEIPT.json as a literal filename and link the tracked GITHUB_EXPORT_MANIFEST.json.
- Independent PR #1 and its 29 qnn-playground source files remain preserved. No installation, build, runtime or scientific validation of that project is claimed by this rollback.
- The first25-instance layout was visually verified but the user found it too scattered. Replaced it with ten unique people once each in three groups4/3/3.
- Draft top style changed Find red; retained original#d24e45 so lower background still matches.
- Cold hosted load initially has no images/disabled controls. Waited for enabled Find and verified ten loaded assets before saving proofs. A Ready when you are locator became Ready to search after load; verified current DOM instead.
- A Grover-tab browser action reported no node at location; inspected current DOM and successfully clicked the exact tab ID.
- A viewport request on local60 affected active hosted61 instead; created a temporary local phone tab, verified actual390x844 and reset/closed it. No phone claim is based on the1378px local read.
- Clean intermediate2ed43 and compact-cluster intermediate3e9c34 remain in Site history; latter receipt/proof is in archive/iteration21-before-top-polish.
- Fresh private Gitmain has teammate playground merge d7a6a02. Fast-forwarded clean isolated clone and imported exact32 source files for the next explicitly requested underhood replacement. No21 Git export is claimed yet.

The completed rejected dense revision's exact receipt, original QA, documents
and browser proofs are historical in `archive/iteration20-dense-rejected`. Earlier photo-cutout/static
archives are preserved. Historical successes are not rerun claims for this rollback.
The local private Git receipt is `GITHUB_SYNC_RECEIPT.json` (excluded from Git). The tracked [Git export manifest](GITHUB_EXPORT_MANIFEST.json) records the export scope. Website source and private Git commits have separate histories.
