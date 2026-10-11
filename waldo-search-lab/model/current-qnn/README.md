# Current striped-target variational classifier

This is a simulated four-qubit classifier for the supplied OpenMoji striped-person artwork over the three built-in scenes: Original Festival, Magic Arena, and Qualicity Queue. The selected target width and height are supplied. It does not estimate unknown scale or support arbitrary uploaded target identities.

Inference receives only the final opaque scene RGB, a candidate center on a fixed 64 by 64 lattice, and the selected size. It receives no clean background, reference target pixels, placement, visible-target alpha, foreground masks, or template score. The saved circuit's sigmoid score alone defines acceptance, followed by deterministic nonmaximum suppression. The foreground masks and target coordinates are used to construct and grade training/evaluation scenes.

## Classical representation and quantum model

V3 uses eight continuous descriptors. They include red/white stripe Fourier magnitude, phase agreement across the shirt, color balance, yellow head with dark outline, separated blue legs, palette centroid alignment in fixed pixel units, and supplied height. The fixed art palette, stripe period of `40/580 * height`, and nominal body geometry are explicit classical priors for this artwork. They are substantial recognition work and are not learned by the circuit. The model should be described as a variational classifier on engineered features, not universal quantum image recognition.

Each of four layers applies `RY(pi*x[q])`, then `RZ(pi*x[q+4])` to each wire, learned `RY` and `RZ` angles to each wire, and CNOTs `0→1→2→3→0`. The readout is a learned affine combination of `Z0,Z1,Z2,Z3,Z0Z1,Z2Z3,Z0Z1Z2Z3`, followed by sigmoid. The export contains 32 angle slots, seven readout weights, and a bias: 40 slots total. The final four RZ slots are invariant for this diagonal readout and are fixed to zero, leaving 36 optimized slots, including 28 quantum angles. These are slot counts, not a claim of independent dimensions.

Training differentiates the exact complex statevector and applies the classical chain rule through the readout and loss. It does not shift the entire nonlinear loss as a parameter-shift approximation. The combined gradient and the matching classical ranking objective are checked numerically by `verify-training-objective.py`.

## Data and selection

The final data revision uses 600 training, 150 validation, and 250 reserved test target composites, with separate seeds and disjoint target-center partitions. Heights are integers from 24 through 112. Targets are always above foreground objects, matching the user's revised main-demo scope. Two centered windows and six nearby off-center windows are generated per target, plus decoys. Remaining in-frame target alpha mass is 100%; frame clipping is reported separately because source pixels outside the scene are absent from the visibility denominator. The earlier mixed-occlusion corpus and its failures remain preserved.

The 56,264-row training corpus contains 1,200 positives and 55,064 negatives. It includes 51,264 background windows covering all 89 heights on the three known background identities. Their frozen coordinates came from training-only V2 mining: 64 hard windows and 128 random windows per scene/height. `background-selection.json` and its 410 KB binary list replay these choices without a large packaged feature matrix. Those known background pixels also appear beneath evaluation targets. The center split is not an unseen-background split.

The reserved target placements have distinct center partitions. Empty scene/size checks reuse the same known background pixels: the four test absence heights are a subset of the seven validation absence heights. The 12 test absence calls therefore check the frozen pipeline again; they are not 12 independent photographic negative identities.

Both QNN and logistic regression use identical vectors, labels, source weights, and 7,200 ranking pairs. BCE assigns total weights 0.5 to positives, 0.25 to neighbors/decoys, and 0.25 to backgrounds. The additional pair term is `0.25 * mean(softplus(1 - positive_logit + negative_logit))`, pairing each of two positive windows with six nearby windows from the same training composite.

Three declared initialization seeds run for 1,000 Adam updates each. The six checkpoints at steps 500 and 1,000 are selected by complete validation-scene hits under the unchanged safety constraint: no accepted points in 21 absent scenes and false points in at most one of 150 target scenes. A complete scene requires at least one accepted point within 6.657 pixels of the true raster center and no incorrect accepted points. Every target scene remains in the denominator, including abstentions. Ties use lower source-weighted validation BCE, smaller seed, and earlier step. Logistic L2 candidates `0,1e-5,0.001,0.01` use the same scene selection rule. Stable thresholds are midpoints at least `1e-12` from decision-changing score boundaries; exact nextafter development frontiers remain archived. Search budgets and model sizes differ; neither this comparison nor angle ablations establishes quantum advantage.

## Native rendering and browser contract

The native corpus uses `@napi-rs/canvas` with high-quality PNG resizing and registered foreground depth-band copies, with the target above every foreground layer for the final clean-front revision. Before V3 fitting, the browser editor was changed to request high-quality smoothing too. Native and browser rasterizers can still differ, so browser regression checks remain separate. The previously frozen independent audit retains native default smoothing and mixed occlusion; it was not altered to improve results.

The 24-pixel target has a stripe period around 1.66 pixels, near or beyond raster Nyquist. Heavy occlusion and clipping can also remove identity and centering evidence. Results must retain these failures and distinguish supported same-art window classification from complete-scene localization.

## Frozen clean-front result

The selected seed is `202610109`, checkpoint 500, with threshold `0.967190378886187`. It finds 137 of 150 complete validation scenes (91.33%), versus 132 of 150 (88.00%) for the matched logistic baseline. The QNN has 12 empty target oracles and one target scene containing a false point; logistic has 18 empty target oracles and no false-point target scenes. Both reject all 21 declared absent scenes. This is validation selection performance.

The reserved clean-front test was scored only after the exact checkpoint and threshold freeze. It contains 250 target scenes with disjoint center partitions and 11,912 labelled windows. QNN complete scene hits are 223/250 (89.20%), with 25 abstentions and two false-point target scenes (0.80%). Logistic gets 221/250 (88.40%), with 29 abstentions and zero false-point target scenes. Both have zero marks in 12 repeated known-background empty scene/size checks. Of the 233 targets whose raster bounds stay inside the frame, QNN gets 212 complete hits (90.99%); of 17 clipped cases, it gets 11 (64.71%).

QNN test window precision is 99.272%, recall 81.80%, F1 89.693%; logistic precision is 99.277%, recall 82.40%, F1 90.055%. Raw window accuracy is 99.211%/99.236%, respectively, but those values include 11,412 negatives versus 500 positives and should not be presented as complete-scene accuracy. The two-scene difference does not establish a quantum advantage or broad generalization. No parameter, feature, threshold, or selection rule was changed after seeing these results.

The two counted false points are close but outside the fixed tolerance: Arena height31 predicts `(340,332)` for true center `(343.5,338.5)`, error 7.382 pixels; Arena height61 predicts `(364,460)` for `(362.5,466.5)`, error 6.671 pixels. The latter still fails the unchanged 6.657-pixel criterion; it is not relabeled to improve the metric.

All three native, fully visible 52-pixel defaults at `(280,350)` pass: Festival score `0.983639`, Arena `0.976624`, Queue `0.984925`. Each yields one correct learned point 4.47 pixels from the target center and no false points. All three corresponding absent scenes produce no marks. These known-center regressions are not generalization accuracy.

The stable selected threshold is `4.52e-4` from its nearest decision-changing validation score and `6.25e-5` from any raw validation score. On 16 actual saved validation PNG windows, Python/native-JavaScript features agree within `9.44e-16`; trained quantum readouts agree within `1.83e-15` and probabilities within `3.33e-16`. First 16 reserved test rows are also checked in fixed order, without selecting examples by prediction.

Optimized quantum angles changed by a mean absolute `0.66375` radians. Replacing them with zero while retaining the learned readout changes validation predictions by mean `0.07823`, maximum `0.97766`; restoring their initial values changes predictions by mean `0.10558`, maximum `0.98618`. The trained model's balanced validation BCE is `0.05311`, versus `0.11101` for a readout refitted on frozen initial circuit angles. These participation checks establish that trained angles affect the result; they do not establish a quantum advantage. The readout-only control is selected by BCE and its 0.5-threshold metrics are not the same scene operating point as the production candidate.

The already fixed controls were also evaluated on reserved test windows without refitting: zero-angle and initial-angle mean prediction changes are `0.08573` and `0.11153`, respectively. Trained balanced test BCE is `0.04021`, versus `0.09502` for the previously fitted fixed-angle/readout-only control. Full values and maxima are in `heldout-angle-controls.json`; the main same-feature classical baseline remains the separately reported logistic model.

The old, previously inspected mixed-occlusion validation scenes are a secondary development diagnostic at the fixed new threshold: QNN 108/150 complete, including 65/70 fully visible, 18/19 at 90–100% visibility, 25/41 at 50–90%, and 0/20 at 20–50%. It has two false-point target scenes there, exceeding the primary selection budget. Optional foreground occlusion remains a limitation; these rescored scenes are not a fresh holdout. The fixed independent audit keeps the harder cases and original raster policy.

## Reproduce

Requirements: Python with NumPy 2.3.5 and Pillow 12.3.0 for pixel-fixture verification; Node.js with `@napi-rs/canvas` 0.1.100. No Torch, simulator SDK, GPU, network service, or hardware credentials are required for this trainer. The local Qiskit companion is a separate optional circuit check.

From the project directory, set a scratch output directory. The packaged scripts accept `--project-dir` and `--output`; the generator also accepts `--protocol` and `--selection-file`.

```sh
node model/current-qnn/build-corpus.mjs corpus --output work/current-replay
node model/current-qnn/build-corpus.mjs reencode-backgrounds --output work/current-replay --selection-file model/current-qnn/background-selection.json
node model/current-qnn/build-corpus.mjs full-validation --output work/current-replay
python model/current-qnn/verify-training-objective.py --output work/current-replay
python model/current-qnn/train_current_qnn.py fit --output work/current-replay
python model/current-qnn/verify-trained-pixels.py validation --output work/current-replay
node model/current-qnn/verify-trained-pixels.mjs --output work/current-replay
node model/current-qnn/default-regression.mjs --front --output work/current-replay
node model/current-qnn/default-regression.mjs --output work/current-replay
```

Only after the candidate and threshold are frozen, generate and score the reserved test:

```sh
node model/current-qnn/build-corpus.mjs full-test --output work/current-replay
python model/current-qnn/train_current_qnn.py test --output work/current-replay
python model/current-qnn/verify-trained-pixels.py --test --output work/current-replay
node model/current-qnn/verify-trained-pixels.mjs --test --output work/current-replay
python model/current-qnn/evaluate-angle-controls.py --output work/current-replay
```

The generator creates window binary arrays, scene feature arrays, hash manifests, and small native pixel fixtures. Training exports circuit/readout JSON, matched logistic JSON, checkpoint selection, threshold frontier, numerical verification, source pairs, feature collisions, and angle controls. Large scratch arrays remain outside the release. Compact rejected V1/V2/V2b checkpoints and validation failure records are retained so the development history is auditable.

The packaged generator has been executed from its delivered location. Its complete train, validation, and test window matrices and labels reproduce the original bytes exactly after replaying the compact negative-coordinate list; see `portable-replay-verification.json`. The saved model JSON is preserved unchanged, with separate test metrics rather than appending metadata to the frozen weight file.

## Rejected development attempts

V1's exact validation frontier provided zero complete hits under the safety budget. V2 found 10/150 clean target scenes; V2b's all-height negatives and three starts found 27/150. Their matched logistic baselines found 0, 42, and 49 clean scenes respectively. All are rejected for inadequate coverage; V2 and V2b also miss the known default Festival placement at their safe thresholds.

Mixed V3 improved to 94/150 complete scenes (57/70 fully visible), against 87/150 for matched logistic. Its stable threshold was `0.9930900033313339`, with no false marks in 21 absent scenes and one target scene containing a false point. It still abstained at two of the three fully visible defaults: Festival score `0.99054`, Arena `0.99327` accepted, Queue `0.99171`. It remains unpromoted. These are validation development and known-center regression results, not held-out test performance. The clean-front revision above keeps the same frozen V3 representation and objective, following the user's revised scope. Its weights and threshold were frozen before any reserved test or independent audit score.
