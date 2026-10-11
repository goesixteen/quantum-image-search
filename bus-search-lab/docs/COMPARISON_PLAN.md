# Two-site comparison: schoolbus search and original crowd search

Updated October 10, 2026, after resumed crowd-editor steering. The bus site supports a real-photo-derived schoolbus cutout on a real street photo. Search Atlas now has a **local layered editor**, public-domain scenes and an attributed open figure, with **classical known-template center matching** as its default. The original illustrated QNN experiment remains separate. Iteration 03's private updates succeeded; the resumed source's full browser QA/private update remains pending root's final receipt.

Both review sites are owner-private. The current human instruction is to **keep improving without submitting work**; external Qollab uploads and public submission-material publication are withheld. Matched photo/crowd classical baselines and independently photographed bus failures are now available, so comparison should focus on oracle quality and educational clarity rather than implied QNN superiority.

## Resumed comparison: three declared experiments

| Experiment | Detector/reference | Candidate and truth |
| --- | --- | --- |
| Schoolbus QNN | Trained engineered-feature circuit on controlled photo/illustrated domains | 4×4/8×8 image regions; independently evaluated alpha>32 overlap |
| Original crowd QNN | Unchanged trained stripe-feature circuit; original character and crowd only | 4×4/8×8 regions; same-art evidence and alpha>32 overlap |
| Layered crowd template mode | Classical known-size target template plus final RGB and clean-background reference; Bruegel/Seurat/open figure/uploads | 16×16/32×32/64×64 center addresses; pixel-refined point error with declared tolerance and separate visible alpha mass |

The new editor's maps distinguish template agreement, signed simulated amplitude and Born probability. Foreground cutout masks determine rendering/independent visibility evaluation, not oracle location. The matcher thresholds and suppresses local peaks; it does not force an argmax answer. Its 26 Node tests include original-template integer successes and fractional misses, which do not establish new-art/browser performance. [SCENE_EDITOR.md](../../waldo-search-lab/docs/SCENE_EDITOR.md), [open-art provenance](../../waldo-search-lab/docs/OPEN_ART.md), [draft handoff](../../docs/history/LAYERED_SEARCH_HANDOFF.md).

The earlier original-art directions below describe the preserved QNN experiment. They no longer describe the crowd default. New backgrounds, reference targets and occlusion are implemented controls; their broader performance still requires the actual browser/declared audit. Keep MIT code separate from CC BY-SA OpenMoji assets and public-domain painting credits.

## Distinct learning stories

| Bus Search Lab | Search Atlas |
| --- | --- |
| Drag a real-photo-derived schoolbus cutout onto a real street photo. | Find an original fictional character in an original illustrated crowd. |
| Learn how a trained region classifier constructs an oracle from image pixels. | Learn how target definition, distractors, and candidate granularity change the search problem. |
| Manipulate placement, tile boundaries, and classifier threshold. | Manipulate placement, grid granularity, target absence, and classifier threshold. |
| Show patch predictions, oracle errors, interference, and a measured region. | Show which visible target cues the predicate accepts, how ambiguity changes the marked set, and what one measurement can return. |
| Evaluate narrowly labelled same-asset photographic compositing. | Evaluate held-out placements using one original character and one original crowd illustration. New scenes and character variants remain future work. |

Both sites share a tested Grover implementation and mathematical definitions while remaining independent, clearly named demonstrations. The crowd detector has its own model/features; it does not reuse the bus classifier. Its four-qubit, four-layer circuit has **40 nominal fitted slots** and a validation-selected threshold of 0.22. Four final RZ slots are prediction-insensitive; the **36 remaining prediction-influencing slots** do not imply independence or a 36-dimensional model family. The actual entangling ring is `0→1→2→3→0`. See [parameter audit](../../waldo-search-lab/model/hybrid-parameter-audit.json).

Crowd held-out same-asset patch accuracy is **99.0% on 600 examples**. Expanded nominal QNN hits are **356/384 at 4 × 4** and **345/384 at 8 × 8**, with zero nominal false marks. The nominal 8 × 8 suite contains **369 unique geometry configurations**; 15 repeated corner probes retain the predefined weighting. Deduplicated QNN hits are **330/369**. Separate 8 × 8 scale/brightness stress has **132/384 clean QNN hits** versus matched logistic **189/384**. These are Pillow-rendered probes of the same art identities, not distinct independent scenes or directly comparable outcomes to the bus patch test.

The locally verified crowd UI and documented browser checks are in `outputs/waldo-search-lab/`. The new Boundary challenge reproduces known-present empty oracles on both grids; reset restores the default. Inline mobile feedback makes those failures visible. Native browser confirmation covers the named fixtures, not all aggregate Pillow rates. Both sites now share a **constructed oracle lesson** and local quiz, separate from image-model predictions. A supplied one-target/four-mark case has 100% accepted-set mass but only 25% target mass; a target-absent case can have 100% accepted-set mass and 0% target mass. See [ORACLE_LESSON.md](ORACLE_LESSON.md).

## Original art direction

The implemented target is an original illustrated explorer with horizontal red-and-white bands and blue trousers, placed in an original town-festival crowd. The art was generated for this project. It is not a reproduction of a published Waldo page. The trained features examine alternating bands and supporting color cues, rather than accepting every red object in the crowd.

Maintain the asset manifest as scenes and character variants are added. Avoid reproducing published Waldo/Wally pages or tracing their figures. Search Atlas has its own title and visual presentation; future variants should strengthen its independent character identity and provide more demanding distractors.

The current generated artwork is composited with exact renderer ground truth and reproducible placement seeds. Coordinates/masks belong only to evaluation; the inference path receives rendered pixels/features. Later original artwork can broaden foreground/background identities. It needs independent fitting/validation/evaluation design before a new-appearance recognition claim.

## Implemented crowd interaction and later cases

1. Show the target character card and one full crowd scene with a clear **Find the explorer** action.
2. Let the user choose snapped/free placement, grid size, random movement, target absence, Boundary challenge or reset. Threshold/iteration controls are in the experiment panel.
3. On search, calculate image-region features and target scores without consulting target placement. Reveal the accepted regions and the number of marked candidates.
4. Step through oracle phase marking and diffusion, then show a sampled region and its separately evaluated overlap with ground truth.
5. Follow the image search with the separate constructed-oracle lesson. It explains false positives, missed targets and absence without pretending those supplied regions came from the classifier. New lookalike identities, multiple inserted targets and occlusion are future experiments, not current validated modes.

A trained QNN mode requires learned gate parameters, loss history, a frozen validation threshold, held-out evaluation and a same-feature classical baseline. Both implemented models have that evidence. The constructed teaching mode uses deliberately supplied target/accepted regions and is labelled separately; do not describe it as learned detection.

## What side-by-side comparison should reveal

The shared mathematical search cost depends on candidate count \(N\) and marked count \(M\), not on whether the target is a vehicle or a character. Recognition quality, feature extraction, and oracle construction are domain-dependent. A bus classifier and crowd classifier can create very different marked sets for equally sized grids.

The implemented comparison page links both sites and reports domains, architecture, patch datasets, matched baselines, oracle construction and independent ground-truth scope. Continue assessing these parallel fields:

- Input domain and candidate-region definition.
- Detector type, trained parameter count, and data domain.
- Number of candidate predictions needed to construct the oracle.
- Number of accepted candidates and true-target overlap rule.
- Grover iterations and exact marked-set probability.
- True-target probability mass, plus one sampled result.
- Measured preprocessing/inference/simulation time, separated from ideal query count.
- Known failures and the test protocol that produced the reported metrics.

Avoid comparing aggregate accuracies without naming their datasets and metrics. A same-asset street-placement rate and a crowd-patch classifier accuracy are different outcomes. Both now have scene-level reports with common alpha semantics, but their placement mixtures and identities differ. Those reports can explain failure mechanisms; they do not rank the interfaces or estimate a shared natural placement population. Measured runtime decomposition remains a future comparison if it helps teaching.

## Common evaluation protocol

Freeze model/predicate, threshold, candidate extraction, and ground-truth definition independently for each site. Use scene families that exercise the same conceptual cases:

| Family | Comparable question |
| --- | --- |
| One target, normal visibility | Does the detector mark at least one correct region? |
| Target across region boundaries | How much visible evidence is required? |
| Lookalike distractors | How much amplified probability reaches a false positive? |
| No target | Does the model abstain instead of silently forcing a marked region? |
| Multiple targets | Does the measurement find any genuine target? |
| Partial occlusion or changed scale | Does the frozen detector remain useful under the stated transformations? |

Save per-family candidate precision/recall, no-target false-alarm rate, predicate hit rate, exact ground-truth probability mass after Grover, and sampled success with a declared shot count. Both QNN region modes use **any inserted alpha>32 pixel in a tile**; the fine template mode uses declared center error/tolerance and separate visibility conventions. Older bounding-box/alpha rules remain labelled. Keep oracle success, classifier accuracy and true-target localization separate. Test blind inference for placement-metadata leakage in every pipeline.

For new crowd development, split by scene/placement seeds and additionally reserve character/background identities before claiming recognition of new appearances. Rendering can encode a label through backgrounds or artifacts; include hard negatives and inspect failures. Use identical feature matrices and splits for the matched classical model. The completed same-asset audit is now inspected development evidence, not an untouched future test.

The photo-relative-v3 experiment already froze features, weights, thresholds, renderer and protocol before a/b identities were disclosed. It has zero fresh empty false marks but only **61/512 QNN /3/512 logistic** complete target scenes and rejects both independent known-ROI bus probes. It was not promoted. Its failure motivates **v4 local representation/ranking and foreground variation**, rather than reporting cleaner abstention as successful localization. Keep the c-labelled photo pair steward-only until a new complete freeze; never select a threshold from those reserved results. [PHOTO_V3.md](PHOTO_V3.md) records details.

## Modest wording about person search

Suggested wording: **“This illustrated example explores how a visual target predicate could be connected to quantum search. It recognizes a fictional character within the tested scene family.”**

If discussing future applications: **“A similar pipeline might be studied for locating a described visual pattern in a large image, if a reliable recognition oracle and efficient coherent data access were available.”** That is a research possibility, not a demonstrated capability or speedup.

The project does not currently identify real people, infer identity from photographs, or establish real-world missing-person search performance. Illustrations are a controlled learning task; successful artificial scenes do not validate real-camera scenes or operational use. Keep the educational purpose and measured scope prominent.

## Next comparison work

1. Finish the resumed layered editor's actual browser/new-art checks and confirm its private update only from the new external receipt; preserve both Site identities and access. Iteration 03's earlier update already succeeded.
2. Use the implemented comparison/lesson/Boundary challenge to collect explicit voluntary local feedback about oracle confidence versus target probability. The quiz alone does not prove a learning effect or determine which interface is better.
3. Preserve the matched [photo](PHOTO_BASELINE.md) and [crowd](../../waldo-search-lab/docs/BASELINE.md) evidence. Photo-v4's interrupted candidates also fail coverage and remain unpromoted. Compare future trained candidates on identical features/splits with scene constraints; keep them separate from the classical template matcher.
4. Prioritize a frozen fine-mode scene/target/scale/occlusion/absence audit and report point errors, false peaks, abstention and true-target mass. Then improve representation or registration from declared development evidence. Keep photo c closed until a later full freeze; inspected identities/suites stay diagnostic.
5. Keep the [demo storyboard](DEMO_STORYBOARD.md) and Qiskit material local. No public project/source/video or contest submission under the current human instruction.

The second site should strengthen the original contribution: it makes the distinction between **recognition** and **amplitude amplification** easier to see across two different kinds of image search. A larger scene alone is not evidence of practical quantum acceleration.
