# Iteration 03 handoff — October 10, 2026

Started 09:00 UTC (05:00 ET). Both existing owner-private updates succeeded at approximately 09:35 UTC after more than 35 minutes of work. **No hackathon entry, public project, repository, or video has been submitted/published.** The human's no-submission direction remains active.

## Visible improvements

Both websites now include a separate constructed-oracle lesson. Three wrong accepted regions alongside one true target produce 100% accepted-set probability and only 25% true-target probability; removing the target leaves 0%. Controls cover 16/64 regions, missed targets and over-rotation, with a local comprehension check. The lesson reuses the actual Grover simulator and does not alter image inference.

The bus site has a dedicated [two-demo comparison page](https://bus-search-quantum-lab.syrupyspool 2.chatgpt.site/compare.html). It links both experiences and separates presentation judgments from their different datasets. The crowd finder has a Boundary challenge, Reset demo, direct mobile status feedback and downloadable whole-scene evidence. Missing bus evaluation-download files are fixed.

Circuit labels now distinguish 40 stored fitted slots from 36 remaining prediction-influencing slots;4 final RZ phases leave the present Z-product readouts unchanged. No model checkpoint was changed.

## Research outcome and next step

The illumination-relative v 3 extractor removes the earlier all-zero collapse on 3,000 positive train/validation patches, but neither matched candidate has a useful whole-scene operating point. Validation clean-hit rates are 76/512 QNN and 4/512 logistic. Frozen fresh-street tests give 61/512 and 3/512, with no false marks but extensive abstention. Both fresh bus ROI probes are rejected. Candidates remain **readyForDemo:false**. The primary assets are now diagnostics; the reserve street/bus pair remains unopened for a later freeze.

The frozen crowd model achieves 356/384 nominal 4×4 and 345/384 nominal 8×8 clean hits. Scale/brightness stress lowers 8×8 to 132/384, versus 189/384 logistic. Nominal 8×8 has 369 unique configurations in 384 predefined weighted probes; a deduplicated sensitivity gives 330/369 QNN and 350/369 logistic. These are controlled Pillow composites of the original art, not independent people/photos. Browser boundary failures are separately verified.

Next run should read `bus-search-lab/docs/PROJECT_STATE.md` first, then PHOTO_V 3.md and the crowd SCENE_AUDIT.md. Improve the foreground/shape representation and model ranking using training/validation identities, with complete-scene coverage and false-mark budgets. Freeze all model/threshold/protocol choices before opening reserve images. Keep the educational lesson and comparison page; do not equate accepted-set confidence with target accuracy.

## Verification and files

Twenty Node tests pass, six dedicated scene-audit tests pass, and shared modules are byte-identical. Sixteen v 3 extractor fixtures and 24 hard crowd patches pass Python/JavaScript parity. Static HTML/module references and responsive browser checks pass. Detailed observed behavior and limitations are in [iteration QA](../../bus-search-lab/docs/ITERATION_03_QA.md).

- [Oracle lesson](../../bus-search-lab/docs/ORACLE_LESSON.md)
- [Photo model experiment](bus-search-lab/docs/PHOTO_V 3.md)
- [Crowd audit](../../waldo-search-lab/docs/SCENE_AUDIT.md)
- [Photograph provenance and release protocol](../../bus-search-lab/docs/ITERATION_03_ASSETS.md)
- [Rubric cross-check](../../bus-search-lab/docs/RUBRIC.md)
- [Local 2:30 video storyboard](../../bus-search-lab/docs/DEMO_STORYBOARD.md)
- [Complete source/model/asset archive](quantum-image-search-deliverables.zip)

Hosted previews require owner sign-in. Local browser interactions are verified; authenticated hosted interactions remain unverified. The final publication receipt is the authoritative deployment record.

## Confirmed private updates

| Site | Source SHA | Terminal deployment |
| --- | --- | --- |
| Bus | `2f616c21b832d8164b06c60a7ffc66499c20290f` | `appgdep_6aca06d97cf4819191d7cd98c5a80355` · succeeded |
| Crowd | `2a4846d5582ff2423d5f38d7223c6a478cb23cc3` | `appgdep_6aca06e69354819195cd5c4266a6205a` · succeeded |

The archive for each update was validated from its exact pushed source commit. Source documents' pending-final-update note is resolved by this handoff and [the external receipt](publication-receipt.json). Both audiences remain owner-private. Temporary preview servers are stopped after the final checks; use `node serve.mjs` in either extracted project to resume locally.
