# One Wanda versus two

This is a predefined, controlled same-art demonstration, not reserved-test accuracy. The frozen Wanda QNN receives only final RGB pixels, the supplied15×52px target size, and its unchanged weights. Each scene uses Festival with fully visible copies. The requested centers420/300 and276/348 render at420.5/300 and276.5/348 because the15px sprite uses integer top-left placement.

| Scene | Accepted points | First peak | Exact accepted / true-target mass | 10,000 seeded draws |
|---|---|---:|---:|---|
| One copy | (420,300), score0.9786143 | 50 | 0.999945346109 | 10,000 at first copy |
| Two copies | (420,300), score0.9786143; (276,348), score0.9866748 | 35 | 0.999996847777 | 4,987 first / 5,013 second |

The threshold stays0.9056472752971427. In this scene the detector actually returns one and two marks; those counts were not assumed or forced. The two accepted copies receive equal Grover mass,0.499998423888 each, despite their different QNN scores. The oracle retains only the yes/no decision, not their score ranking.

Every sampled address is saved in order. No unmarked outcome happened in these10,000 paired draws with seed2026101107. Their exact probabilities are nevertheless0.000054653891 and0.000003152223 for the one- and two-copy scenes. No outcome was discarded, resampled, forced, or conditioned on acceptance.

The independently graded point tolerance is6.65685424949px. Both accepted points are0.5px from a rendered center. Coordinates are consulted only after scoring, for grading; they are absent from scanner inputs.

Run from the project root:

```sh
node model/wanda-two-target-experiment/run.mjs
python model/wanda-two-target-experiment/plot.py
```

The renderer requires `@napi-rs/canvas`; the plot requires Matplotlib. The script uses the installed Codex Canvas bundle as a fallback. It retains the exact production scanner, QNN, compositor and Grover modules and asserts the original checkpoint SHA256.

`report.json` contains accepted points, scores, diagnostics, exact per-round masses, grading and sample counts. The raw one/two scene PNGs are unannotated scorer inputs. `*-scan.json.gz` retains all4096 scores and candidates, including rejected windows. `*-grover-history.json.gz` retains every exact amplitude and probability snapshot through the saved maximum. `*-sampled-addresses.json` retains every measurement, including any unmarked/errors. The sampling seed is reset for each case so the uniform draws are paired. Full-history norms and the analytic formula are checked to1e-11; compressed files are decoded and checked for exact numeric roundtrip.

The native backend explicitly stages the normalized Festival PNG with high-quality512px drawing, trims the source at alpha>16 bounds285/21/725/1514, resizes the target once at high quality, and copies the resulting sprite with smoothing disabled. The two-copy composite calls the production compositor twice, each time with the new copy fully in front and no foreground layers. This matches the current native-high staging contract, but native and Chromium high-quality1:1 rendering can differ. The separate `work/wanda-two-target-browser-background.png` contains only the second copy and is provided for an actual browser check with the main inserted copy at420/300. The native report does not claim that browser verification.

## Actual browser export

`browser-two-scene.png` is the separately exported opaque Chromium inference image, SHA256 `24c6b496c34847da273a5170654ca360271c08d47cfaa8bb44ff7400d0a80b3f`. `browser-audit.mjs` sends those final RGB pixels, known15×52size and the frozen model through the unchanged production scanner. It obtains the same two accepted addresses2420/2786, with actual scores0.9883096231965375 and0.986674837069946. Thus the exact first-peak Grover distribution and paired seeded samples match the native two-copy case, despite the primary-copy score difference.

`browser-report.json` records this separate check; `browser-two-scan.json.gz`, `browser-two-grover-history.json.gz`, and `browser-two-sampled-addresses.json` preserve its full scores, exact state history and every sample. To reproduce from the delivered retained browser image:

```sh
node model/wanda-two-target-experiment/browser-audit.mjs model/wanda-two-target-experiment/browser-two-scene.png
```

The normal website grader knows only the first inserted copy. The second copy is embedded in uploaded background RGB; sampling it may be labelled a miss by that single-insert grader. The experiment's independent grader knows both rendered centers and consults them only after inference. Both accepted points are0.5px from their respective centers, with no other accepted point. This extra engineering check is not a fresh statistical holdout and does not extend the model's recognition scope.

The standalone scene illustration and convergence PNG live in the top-level `outputs` folder. The convergence lines show the exact analytic formula; dots reproduce saved statevector rounds. Analytic two-copy lines beyond its saved73-round trace are formula evaluations, not additional stored snapshots. The known-M first-peak choice follows the already compiled accepted set. Classical4096-window recognition and oracle construction are included in the pipeline; this experiment establishes no end-to-end quantum advantage or general-person recognition.
