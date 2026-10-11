# Iteration 04 research and reserve stewardship

Started 10 October 2026, approximately 09:56 UTC. This file covers primary-source checks, technical review and reserve disclosure for Iteration 04. It does not replace the canonical handoff. **Keep iterating; do not submit work.** No Qollab upload, public project/source/video, contest submission, website publication or source commit is authorized by this research step.

## Current research status

The reserve street-c/bus-c assets remain unchanged and undisclosed to the model-development agent. Their acquisition-time inspection and provenance are historical records, not a new model evaluation. A new [Iteration 04 lock](../model/iteration03-evaluation-assets/iteration04-steward-lock.json) fingerprints the reserved originals/derivatives and historical manifests without changing them. No model inference or pixel decoding is performed by the steward lock utility.

The trainer has supplied a v4 proposal and its predeclared protocol; the exact final experiment freeze is awaited. The critique below reviews those definitions rather than reporting candidate scores. Reserved locations/identities must not be supplied for feature design, fitting, validation, threshold selection or candidate selection. The last Iteration 03 private receipts succeeded and are recorded in root handoff; they do not constitute a contest submission.

## Official rubric, rechecked from primary pages

The official pages were fetched directly over HTTPS at approximately 09:58 UTC on 10 October 2026. The four criteria remain **Novelty & Creativity, Technical Execution, Impact Potential and Documentation Quality**; neither retrieved page supplies numerical weights. This is a quality reference, not a score prediction or authorization to submit. [Official judging page](https://qollab.xyz/programs/hackathon/how-it-works#judging).

The terms continue to accept an application context, technical extension, or original analytical/educational contribution beyond a standard reference tutorial. **Quantum Unlocked** remains our fit assessment because the interactive predicate/error lesson teaches interference and algorithm assumptions. The terms describe interactive teaching of difficult quantum ideas. They do not establish that our quiz improved learning. [Official terms and theme descriptions](https://qollab.xyz/programs/hackathon/terms).

| Criterion | Existing evidence useful in a local tour | Remaining quality gap |
| --- | --- | --- |
| Novelty & Creativity | User-built image challenge, two domains, constructed acceptance/target error lesson and coherent research appendices | State the original contribution as an inspectable learned predicate/error explanation, without claiming invention of Grover or generic quantum vision |
| Technical Execution | Trained models, same-feature classical baselines, cross-runtime checks, whole-scene probes, rejected v3 and freeze-before-identity disclosure | Improve object/background ranking and useful coverage; a clean empty oracle achieved through near-total abstention is insufficient |
| Impact Potential | A visitor can create a scene, inspect marks, manipulate a wrong oracle and answer a question | Obtain explicitly volunteered local feedback or a declared comprehension study before asserting a measured educational effect |
| Documentation Quality | Source/asset credits, nominal/inactive parameter audit, renderer/alpha rules, probability definitions and rejection evidence | Keep training, validation, inspected diagnostics and untouched identities distinct; record actual disclosure UTC before messaging, with no reconstructed timestamp |

## Primary scientific references and bounded claims

**Connected regions are candidate geometry, not object identity.** Connected-component labeling groups adjacent mask pixels according to a declared neighborhood. In two dimensions, four-way and eight-way connectivity treat diagonal contacts differently. Component properties can include pixel area, bounds, extent and moment-based elongation. These are useful classical descriptors, but the API supplies geometry rather than a schoolbus semantic label. The semantic distinction is our inference, not an object-recognition guarantee in the documentation. [scikit-image label and region properties](https://scikit-image.org/docs/stable/api/skimage.measure.html#skimage.measure.label).

OpenCV's component API returns labels, statistics and centroids and explicitly selects four- or eight-way connectivity. Its component pixel count differs conceptually from contour area: contour area uses a geometric formula and can differ from the number of raster pixels inside a drawn contour. A v4 implementation should say which quantity it actually measures rather than interchange the two. [OpenCV structural analysis and shape descriptors](https://docs.opencv.org/4.13.0/d3/dc0/group__imgproc__shape.html).

**The encoding receives what preprocessing retained.** Schuld and Killoran describe quantum input encoding as a feature map into a quantum Hilbert space and discuss variational classification there. This motivates a precise description of our hybrid path: RGB → classical engineered descriptors → circuit encoding → observable/readout score. It does not make discarded pixels available again or imply our four-qubit circuit is a quantum convolutional network. [Quantum machine learning in feature Hilbert spaces](https://arxiv.org/abs/1803.07128).

For this project, if two image patches map to exactly the same feature vector, every subsequent deterministic circuit/readout score is the same for both. That statement follows from the implemented function composition; it is not a claim that all non-identical vectors are separable. V3's absence of exact opposing-label collisions therefore did not guarantee practical ranking. Its failed scene frontier is project evidence in [PHOTO_V3.md](PHOTO_V3.md), not a theorem against every classifier on those features.

**Threshold selection changes decisions, not the underlying score ordering.** The scikit-learn guide distinguishes probability estimation from thresholded actions, recommends application-relevant metrics and validation separated from fitting, and notes that changing a threshold leaves the underlying ROC/precision-recall curves unchanged. Our proposed scene false-mark budget is a project-specific choice; the guide does not prescribe that particular budget. [Decision-threshold tuning](https://scikit-learn.org/stable/modules/classification_threshold.html).

**Grover query counts do not price the whole image pipeline.** Grover's original search improves the number of search operations for an unstructured lookup model. The current browser demos first classify all N regions classically, store their marked set and then simulate amplification. Since that preprocessing already identifies the accepted set, the demo establishes conditioned algorithm behavior rather than a faster end-to-end image search. The latter conclusion is an inference from our implementation, not an additional theorem in the original paper. [Grover's original paper](https://arxiv.org/abs/quant-ph/9605043).

Amplitude amplification generalizes the search to a measurement-free preparation A and its inverse, with iterations scaling as 1/√a for initial good-event probability a. Each repeated use of A, A† and the predicate still has a cost. Our coherent appendices implement these operations for tiny saved-feature fixtures; the browser's classical sigmoid/threshold table is a different oracle path. [Brassard, Høyer, Mosca and Tapp](https://arxiv.org/abs/quant-ph/0005055).

Aaronson's discussion of HHL-style machine learning emphasizes input-state preparation, output access and suitable classical comparisons. Its concrete HHL assumptions are not a proof about this Grover demo. Its relevance here is a methodological analogy: disclose data access and construction work before claiming a runtime advantage. We have no end-to-end advantage claim. [Quantum Machine Learning Algorithms: Read the Fine Print](https://www.scottaaronson.com/papers/qml.pdf).

## Proposed v4 and technical critique before freeze

The trainer proposes **localized warm-row band anchors**, not full connected-component labeling. Within warm rows, close gaps of at most two pixels and require width at least eight; candidate bottom edges occur where next-row warm occupancy is below 75%. Keep at most 24 anchors, ordered by width then location. Fixed pixel offsets calibrated for roughly 52-pixel target width examine upper dark/window evidence, warm body/local median, a nearby stripe and lower wheel evidence. A fixed geometric quality function selects one coherent eight-feature vector: visible width, body fill, window dark fraction/runs/spacing, lower dark runs, stripe and window/body luminance contrast. [photo-v4-protocol.json](../model/photo-v4-protocol.json) and [photo_features_v4.py](../model/photo_features_v4.py) define exact semantics.

Local evidence is a plausible response to v3's warm façades/signs contaminating one global box. It still needs validation. The fixed anchor-quality selector is itself a **classical recognition prior**, shared by the QNN and logistic model. Target alpha, known placement, photograph identity, manual bus boxes and labels must never select an inference anchor. Do not mix featurewise maxima from different anchors into a fictitious object descriptor.

Before fitting, freeze the warm mask, row gap-closing, next-row occupancy definition, candidate cap/ranking, tie-breaking, quality coefficients, normalization, clipping and no-anchor representation. The width-first cap can discard narrow/partial foreground behind broad warm façades; nominal 52-pixel geometry can fail under scale or perspective changes. Small intensity/resize changes can alter row runs or join foreground with similar background pixels. Thin window bands/wheels may disappear at thumbnail scale. These are project-specific failure hypotheses, not guaranteed effects or a verified fix. The generic connected-region sources explain related geometry concepts; they do not establish that this custom anchor algorithm is segmentation or a validated detector.

Useful training/validation probes include a bus band touching a warm façade, disconnected warm fragments, non-bus horizontal signs, partial foreground across a tile boundary, near-floor intensity and resize/illumination perturbations. Record proposed and retained anchor counts, including whether the cap excludes target-like fragments. Compare matched QNN/logistic scores on exactly the same selected descriptors. Improvement from classical candidate selection cannot automatically be attributed to the quantum circuit. The proposed training identities remain the original bus cutout plus Covington/Sauk; inspected a/b identities are not being repurposed for fitting.

Keep **scene complete-hit rate, false-mark contamination, absence behavior and coverage** alongside patch metrics. Examine the training/validation threshold frontier before opening any reserve. If every acceptable operating point abstains on most targets, report rejection; selecting a lower threshold from fresh photographs would contaminate the evaluation. Repeated placement probes are not independent foreground/background identities.

The current ansatz has 40 nominal fitted slots, with four final RZ slots inactive for Z-product readouts after the CNOT permutation. V4 fixes those four angles at zero, yielding **40 exported slots /36 optimized slots**. That is consistent with the established invariant, without changing the descriptor bottleneck. The remaining 36 prediction-influencing slots are not an independence/dimension claim. Preserve this language when comparing with the nine-parameter logistic baseline. See [parameter audit](../../waldo-search-lab/model/hybrid-parameter-audit.json).

Read-only source/protocol review found no visible target-metadata input to the extractor. Edge clipping and absent window/wheel evidence return finite descriptors; ties within 1e-12 keep the first deterministic anchor. The declared training/validation scene rule remains zero empty false marks and at most 1% false-mark target scenes. Promotion additionally requires at least 90% complete validation scenes, ordinary default acceptance and at least 80% complete original-background random regression per grid; candidates remain unpromoted pending root review.

Two precise review notes were sent to the trainer before reserve release. `NOMINAL_SCALE=52` is not used in the current feature calculation, so the fixed offsets should not be described as adaptive scale normalization. `return_diagnostics` currently reports retained post-cap candidates, not the number discarded by the cap. Extra diagnostic instrumentation is useful only if it respects the source/protocol freeze; it must not create post-evaluation feature tuning. Identical-pixel JS/Python checks should cover top/bottom anchors, absent lower evidence and deterministic quality ties.

## Concise local tour and learning objectives

This is a local walkthrough suggestion, not an uploaded or submitted video plan.

| Step | Show | A visitor should be able to explain |
| --- | --- | --- |
| Create | Place the bus or explorer and search | The classifier sees image pixels; placement labels are only an independent check |
| Trace | Features, accepted regions and one sampled result | Classical preprocessing, learned classification and amplification are separate operations |
| Challenge | Boundary failure or unfamiliar street | A missed/contaminated predicate limits the answer even with correct quantum mathematics |
| Construct | One target plus three false marks, then no target | 100% accepted probability can mean 25% or 0% true-target probability |
| Compare | Named same-feature baselines and probability fields | Patch accuracy, clean scene coverage, exact target mass and a sampled outcome answer different questions |
| Scope | One sentence about data/oracle cost and identity reuse | Conditional query advantage is not demonstrated browser speedup or general photographic/person recognition |

A useful evidence gap remains a visitor's explanation in their own words. A quiz click without a declared study or recorded feedback supports interaction, not a measured learning claim. Keep the tour focused on a small number of meaningful outcomes rather than listing every research appendix.

## Reserve release procedure

`prepare_iteration04_release.py` writes new Iteration 04 records only. Historical acquisition, primary-release and freeze entries remain unchanged. Its initial lock checks reserved file hashes without decoding pixels. After the model agent reports the exact v4 freeze, the steward must inspect its scope and verify its declared hash plus every frozen file, including feature code, weights, thresholds, renderer and protocol.

Only then create `iteration04-reserve-release.json`, containing the c pair's source/license/geometry metadata and the verified freeze. Record **actual UTC immediately before the disclosure message**, labelled as the recorded disclosure preparation time rather than a platform message-send timestamp. Do not regenerate that record after the audit or invent chronology. The utility refuses to replace a recorded release.

The c pair is a small additional identity diagnostic, not a broad test population. If either result informs subsequent features, model selection or thresholds, that identity becomes inspected development evidence and a further redesign needs new untouched evaluation assets.

**Release status: locked, exact v4 freeze not yet received.** No reserved feature vectors or scores are computed by this research step.
