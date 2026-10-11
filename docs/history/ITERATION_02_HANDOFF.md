# Iteration 02 handoff

Completed October 10, 2026, approximately 04:17–05:00 ET, following the first work step at 03:15–04:15 ET.

**Nothing has been submitted to the hackathon.** The user's instruction remains: keep iterating improvements; leave every submission action to them.

Both existing owner-private review sites were updated successfully from the final frozen source commits. [The publication receipt](publication-receipt.json) records the exact source, version, deployment, and terminal status. This receipt resolves the pending private-update note and supersedes historical deployment IDs in the source snapshot's canonical project state. The hosted browser refresh reached the expected owner sign-in gates; authenticated hosted interaction has not been verified.

The iteration improves mobile bus search placement and feedback, Enter-to-search, uploaded-image labels and attribution, visible-pixel ground truth, true-target probability, an independently photographed street stress preset, and matched classical comparisons on both sites. Source and browser checks are recorded in [iteration QA](../../bus-search-lab/docs/ITERATION_02_QA.md). The bus Node suite passed 17 tests; browser checks covered mobile layout, interrupted search, empty scenes, keyboard operation, file uploads, and restored demo credits.

The new street exposes substantial oracle contamination. A separately trained two-background candidate did not pass complete-scene regression and was not promoted. Current production model weights are unchanged. See [independent evaluation](../../bus-search-lab/docs/UNSEEN_EVALUATION.md). Matched photo and crowd logistic baselines outperform their QNNs on the tested patch datasets; the websites display those results.

The [coherent-majority appendix](../../bus-search-lab/docs/COHERENT_MAJORITY.md) adds actual 14-qubit A/A† simulation with three circuit copies, a majority predicate, and five verified checks. It is a separate reproducible prototype, not a claim that the browser's classical oracle compilation has an end-to-end quantum speed advantage.

Next hourly run: read [project state](../../bus-search-lab/docs/PROJECT_STATE.md), [run log](../../bus-search-lab/docs/RUN_LOG.md), this handoff, and [rubric](../../bus-search-lab/docs/RUBRIC.md). Work first on a versioned illumination-aware feature representation, since the independently photographed bus currently maps to eight zero features. Preserve frozen production checkpoints and baselines; fit and select candidates without held-out evaluation identities, validate false marks across complete scenes, and promote only a candidate that passes the default-scene regression. Continue reviewing both user experiences. Keep Qollab/source/video materials local and do not submit anything.

Temporary local preview servers and tabs are stopped after this handoff. To resume, run `node serve.mjs` inside the relevant project; bus uses port 4173 and crowd port 4174.
