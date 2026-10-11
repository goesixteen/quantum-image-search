# Trained QNN for the current striped-person interactive

This step connects the fine location editor to a newly fitted quantum neural network. The old original-art model remains unchanged. The default detector scores the final flattened scene using a saved four-qubit variational circuit; the classical template matcher is an explicitly selected comparison.

The user subsequently deprioritized foreground/background occlusion. The editor now starts and resets with the striped target in front of objects. Existing automatic feet-based layering remains optional. Detector selection preserves the current scene depth when comparing the current QNN with the template mode. Reliable visible-target detection is the primary demo; existing mixed-visibility training and audit failures remain in their original denominators.

## Information boundary

The current QNN receives final scene RGB pixels, each candidate window's fixed scan coordinates, and the target width/height selected in the editor. Candidate coordinates define where to look; they are not the inserted target's coordinates. It receives no target PNG reference pixels, clean-background reference, target-present flag, renderer placement, foreground masks, truth alpha or template-matching scores.

The target scale is supplied. This is known-scale localization, not automatic scale estimation or arbitrary-person identification. The trained domain is the built-in striped OpenMoji derivative and the three built-in crowd scenes. Imported backgrounds are outside that domain. Imported target artwork explicitly selects the classical comparator, with a visible notice.

## Classical preparation and quantum classification

A deterministic 24×48 sampling grid describes a centered image window. Seven pixel-derived features measure red/white stripe Fourier magnitude, left/right stripe phase agreement, red/white balance, yellow head with black outline, blue leg lobes with a central gap, and horizontal/vertical palette-color centering in fixed pixel units. The eighth feature records the supplied target height. Feature values lie in [0,1]. Their Python and browser implementations share the current-qnn-window-v3 contract.

These are hand-engineered known-style priors calibrated from training artwork: continuous color memberships, a red-plus-white stripe period of40/580 times target height, and approximate head/leg layout. Inference does not read target-template pixels or a background reference. The QNN learns a decision from these descriptors; this is not unconstrained appearance learning or a general person-identification representation. At24px height the nominal stripe period is below two image pixels, so aliasing remains a real limit.

The model starts in |0000⟩. Each of four layers angle-encodes four features with Ry and four with Rz, then applies learned Ry/Rz rotations and a CNOT ring 0→1→2→3→0. Seven Pauli-Z expectations feed a trained sigmoid readout. Both quantum rotations and the readout are fitted on labelled image windows.

The checkpoint exports32quantum angles,7readout weights and1bias. Four final RZ phases are prediction-insensitive under these diagonal measurements and are fixed to0:28quantum angles plus8classical slots are optimized. This is a count of optimized slots, not a proof that all slots are independent or identifiable.

The browser evaluates the trained circuit for every window on a fixed64×64 scan lattice with8pxspacing. Selected coarser Grover grids aggregate the largest learned score in each address, retaining its best window center. This keeps the returned point resolution fixed while changing the number of Grover addresses.

## From learned scores to Grover

Threshold-passing QNN scores are sorted by score and stable address order. Pixel-distance suppression removes nearby duplicate peaks, with radius max(12px,0.35×targetWidth). No candidate is forced when no score passes. The resulting accepted address list is compiled into Grover's phase oracle.

Grover operates on a separate address register, starting with uniform amplitudes and alternating accepted-address phase flips with reflection around the mean. Sampling uses exact simulated Born probabilities. The returned point is the sampled address's associated fine scan center.

The soft heat field visualizes these learned scores and smoothed, log-scaled Born probabilities. Its color exposure, opacity, Gaussian width and crossfades never change the oracle, statevector or sampling. Recognition is completed through classical circuit simulation before Grover starts; no end-to-end quantum speedup is established.

## Training and evaluation records

Training, validation and test use disjoint target-center partitions with declared seeds and the same artwork identities. The released clean-front corpus uses fully visible targets, varying sizes24–112px, near-center negatives, empty windows and color/stripe decoys. Earlier rejected fits included registered whole-object bands and partially obscured targets; their results remain separate. Labels and visibility are used only for corpus construction and evaluation.

Positive training examples require at least20%remaining target alpha mass and a candidate point within6.657px of the raster center. The independent editor audit retains all targets above1%visibility and reports the1–20%stratum separately. A miss at low visibility must not be removed from the report.

Checkpoint selection, classifier threshold and matched classical regularization use validation only. The clean-front revision predeclares six QNN checkpoints (three seeds, at500/1000updates) and four logistic regularization values. Selection maximizes complete validation scenes under zero false marks in21 empty validation calls and false points in at most1% of150 target scenes, followed by weighted window loss and stable tie-breaking. A local pairwise logit-ranking term complements source-weighted cross-entropy, with identical training pairs/objective for the matched baseline. Test and independent audit do not select parameters or thresholds. Window accuracy is not whole-scene localization accuracy.

The striped target's browser raster explicitly requests high-quality smoothing, as the native training generator does. Native and browser implementations can still rasterize differently. The frozen independent audit retains its original native-default resize policy; its results and actual browser replays have separate scopes.

The independent native audit predeclares840distinct target geometries,12empty scene/size calls and3separate default layered regressions. Counts are weighted400Festival/220Arena/220Queue because their band counts differ; each size contributes210probes. Thirteen clipped placements remain included. Visibility, false marks, misses, abstentions, exact true-point probability and seeded samples are separate outcomes.

Those840cases comprise300clean placements and540band crossings. Because the released fit uses fully visible targets, the band crossings are occlusion stress outside its final fitting scope; visibility strata do not make them an in-domain partial-target benchmark. The three automatic layered regressions retain the earlier editor defaults as stress checks; the new always-front defaults are replayed separately. The independently planned geometry includes known defaults and is not restricted to the trainer's test-coordinate partition. This is a predeclared engineering audit on known artwork, not840strict train-coordinate or unseen-identity holdouts.

Final threshold selection uses a predeclared numeric stability rule: select an interior feasible interval rather than a value only one floating-point step above a critical score, with at least1e-12distance from decision-changing scores when available. Exact nextafter frontiers remain recorded. This prevents ordinary NumPy/browser rounding differences from defining the operating point; it does not change runtime acceptance, which is learned score ≥ saved threshold.

This source document specifies the implemented architecture and frozen protocols. Actual final training, audit, browser and deployment results must be read from the saved metrics/report and publication receipt; an architecture description is not evidence that a candidate was successfully trained or deployed.

## Reserved test and circuit checks

After freezing weights and threshold, the clean-front reserved test contains250 target scenes and11,912 scored windows. The QNN completes223/250 scenes (89.2%), with25 abstentions and2 wrong-point scenes. The matched logistic baseline completes221/250 (88.4%), with29 abstentions and0 wrong-point scenes. Both reject all12 known-background absence calls; these reuse the same background pixels and are not twelve new scene identities. Test-window QNN precision is99.27%, positive recall81.8%, and accuracy99.21%. Window imbalance makes whole-scene coverage and positive recall more useful than accuracy alone.

The two wrong points are out-of-tolerance center errors in Arena:7.382px at height31 and6.671px at height61. The fixed tolerance remains6.657px. Both remain failures, including the second point's narrow miss. Inside-frame scenes complete212/233; clipped cases11/17. There is no threshold or weight adjustment from these results.

The28 optimized quantum-angle slots moved by mean absolute0.664radians. At the same frozen threshold and learned readout, trained angles recover234/300 positive validation windows; replacing them with zero or initial angles recovers0/300. A separately refitted readout with fixed initial angles has validation balanced loss0.111, compared with0.053 for the trained circuit. These establish quantum-circuit participation, not advantage over classical methods.

The actual saved model agrees with NumPy/browser predictions on16 pixel-derived validation rows to score error3.33e-16. The local Qiskit companion uses the exact same model and the first16 reserved test rows, with9 tests passing and score/readout/Grover errors below1.7e-15. Its mixed-scene row table is a compact circuit check, not a full image search or scene-accuracy benchmark. No live Qollab or hardware execution is claimed.

Portable generation replays all six train/validation/test feature and label files byte-for-byte. Reproduction commands, complete metrics, angle controls, freezes and rejected-candidate evidence are in [the current model package](../model/current-qnn/README.md); the independently frozen engineering audit and browser replay have separate reports.

Git attributes preserve the hashed model, feature sources, audit protocols and fixtures without platform newline conversion. The legacy model/runtime working bytes and numerical parameters remain unchanged; their recorded Windows artifact bytes are now also preserved in the source snapshot for portable hash verification.

## Independently planned native engineering audit

The frozen audit completes840 targets plus12empty calls and3historical layered defaults. Its300 clean placements yield232 accepted-point hits and68misses:62abstentions and7wrong points in6scenes. Its540band crossings yield203hits among498observable targets,295observable misses,42targets at or below1%visibility,332abstentions and5wrong points in5scenes. No near-hidden point is accepted. All76targets with1–20%remaining alpha mass are missed. Occlusion is outside the released model's fully visible fitting scope.

Across all840target probes, there are435hits among798observable targets,12wrong points in11scenes and394abstentions. The12wrong points lie approximately6.95–9px from their target center rather than on distant distractors; the unchanged6.657px grader retains them as errors. All12empty calls abstain with zero marks. Exact true-point mass and seeded samples are recorded separately in the [full report](../model/current-qnn-audit.json).

This audit uses native-default resizing and four equally weighted sizes,24/52/80/112, while the reserved test uses native high-quality resizing and its declared random size distribution. The results cannot be treated as interchangeable accuracy estimates. Audit target coordinates include training-coordinate classes; it is an independently planned known-art engineering audit, not a strict fresh-coordinate or identity holdout. The weights, threshold, feature sources and original protocol were unchanged after scoring. Actual browser starting scenes pass separately at52px; its24px Festival miss is documented in [browser QA](CURRENT_QNN_BROWSER_QA.md).

## Retained training failures

The first feature contract summarized stripes without sufficiently precise centering or explicit scale. Under the validation false-point/absence budget, both its learned QNN and matched logistic classifier rejected every target scene. Exact critical-score checks confirmed the failure. The QNN's quantum angles changed its predictions, but this did not make the scene finder usable. V1 was rejected without promoting it or selecting from the independent audit.

The first fit of the centered V2 features also failed useful coverage: QNN10/150 complete validation target scenes,139 empty target oracles and1 false-point scene; logistic42/150 complete,108 empty and0 false-point scenes. Both rejected all21 empty validation calls. Before thresholding, background details won the QNN's largest score in64/150 target scenes. This motivated training-only hard-negative mining on each of the89 integer heights24–112, rather than reducing the false-point budget.

The all-height V2b revision retained those features and used three seeded starts with source-group weights: positives0.5, nearby/decoy negatives0.25, background negatives0.25. It still failed: QNN27/150 complete scenes with122 empty oracles and1 false-point scene; logistic49/150 with101 empty and0 false. Both rejected all21 empty calls. Festival's separately checked default was below the selected QNN threshold, so V2b was rejected without test or independent-audit evaluation.

Mixed-visibility V3 added the explicitly described palette, periodicity and morphology representation and six checkpoints at1000/2000updates. It reached94/150 complete validation scenes, with1 false-point scene and0/21 empty-call marks. Its fully visible Festival and Queue starting scenes still fell below threshold, so it was rejected without test or independent-audit evaluation.

The clean-front revision retains the frozen V3 representation and all-height negative coordinates, while generating fully visible foreground examples. Selected seed202610109 at500updates reaches137/150 complete validation scenes,12 abstentions and1 false-point scene. All21 validation empty calls reject. The matched logistic baseline reaches132/150. At the saved threshold0.967190378886187, each of the three separately checked fully visible native starting scenes returns one correct point within4.47px, and all three absent counterparts reject. These are validation/native results; final reserved test, independent audit and actual browser results have their own records.

The all-height background examples use the three already known scenes; overlap of those background identities with validation and test is explicit. Separate target-center partitions do not establish unseen-background generalization. No test or independent audit was read during fitting or threshold selection. The exact frozen checkpoint SHA256 is9c5a25af8a37eb8482f09e49631418e63c05c47d0317fd0a2a5ead9b6c63465a; reserved test results live in a separate metrics file so the model bytes remain unchanged.
