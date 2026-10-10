# Iteration 02: actual browser verification

October 10, 2026, approximately 04:17–04:45 ET. All interactions here were local development checks. No hackathon submission or public submission-material publication was performed.

## Mobile action and feedback

At a 390 × 844 viewport, the bus action appears directly after the image, before uploads, settings, and credits. Its feedback appears immediately underneath, followed by an Inspect probabilities link. The original desktop action is hidden on this breakpoint, so there is one visible primary action. A successful default photo search marked one region with a QNN score of 0.997; its ideal marked-set and true-target probabilities were both 96.13%. The document was 375 pixels wide, with no horizontal overflow. See `../../bus-mobile-proof.jpg`.

The canvas now accepts Enter to search as well as arrow-key placement. Both primary controls share model readiness and running state. Changing/removing the target during an active search cancelled the stale trace: the final state was Ready to find the bus, primary action enabled, and measurement disabled. No late measurement was emitted. Browser error logs were empty.

Real file-chooser checks loaded the licensed Emeryville PNG as an uploaded background and the demo bus PNG as an uploaded bus. The selector then said Uploaded background, credits identified local uploads, the bus tray described the uploaded bus, and the AI-edit note was hidden for the unclassified upload. Use demo bus plus the Covington selector restored the demo thumbnail, original credits, and default scene description. Preset/mode changes clear file-input values so the same file can be selected again later. These files stay within the browser application; there is no image-upload API.

## Matching evaluation labels

The bus now uses the rendered target's alpha mask for post-measurement ground truth, matching the crowd UI: a candidate is a true-target tile when it contains at least one target pixel with alpha greater than 32. Transparent sprite padding no longer counts as target content. This evaluation never supplies classifier features, threshold marks, or Grover evolution. Four focused ground-truth checks bring the Node suite to 17 passing checks.

The bus display now separately reports true-target probability after measurement. Accepted-set probability can be high while localization probability is low, because classifier false positives are amplified along with correct marks.

## Independent street stress preset

The new Emeryville selector draws the exact documented 512px normalization of Payton Chung's CC BY 2.0 street photograph. The trained weights and threshold remain unchanged. The UI labels it an unseen stress test and changes its credit correctly. Switching to the illustrated mode hides the street setting and photo credits; returning to photo mode restores coherent settings.

| Actual browser scene | Marks | Ideal accepted-set probability | True-target probability |
| --- | ---: | ---: | ---: |
| Empty Covington, 4 × 4 | 0 | No measurement | No measurement |
| Empty Covington, 8 × 8 | 0 | No measurement | No measurement |
| Empty Emeryville, 4 × 4 | 4 | 100.00%, one round | 0.00% |
| Empty Emeryville, 8 × 8 | 11 | 91.91%, one round | 0.00% |

The browser reports the sampled marked tile as a detector false positive. Returning to Covington clears the trace and restores zero marks for the empty scene. The 4 × 4 Pillow audit has five Emeryville marks rather than four: 128→64 candidate resizing differs from the browser canvas resampler. The 8 × 8 patches require no resize and both runtimes found eleven marks. Neither count is silently substituted for the other.

## Comparison evidence

The bus table now follows the active model: photo QNN 98.45% accuracy / 98.60% recall versus matched logistic 99.25% / 98.80%; illustrated QNN 96.95% / 97.60% versus logistic 95.10% / 93.70%. Switching scenes changes labels, rows, and the downloadable report. The crowd table loads QNN 99.00% / 99.33% versus logistic 99.67% / 99.33% on its separate 600-patch test. Its 390px layout also has no horizontal overflow. These are classifier comparisons on matched controlled composites, not quantum runtime or generalization claims.

The model/audit documents retain failures and protocol differences. The default frozen model remains unchanged; the negative-mix candidate is not promoted. A brightness-aware versioned extractor and fresh identity split are the next scientific priorities.
