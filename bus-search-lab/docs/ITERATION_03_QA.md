# Iteration 03 verification — October 10, 2026

This run began at 09:00 UTC (05:00 ET). The human instruction remains **do not submit any work; keep iterating improvements**. Existing owner-private sites are updated without expanding their audience. Final deployment metadata is recorded outside the source repositories in `outputs/publication-receipt.json` and `outputs/ITERATION_03_HANDOFF.md`.

## Website behavior checked in the actual browser

- The main photo CAPTCHA still uses the frozen photo checkpoint and threshold 0.61. The default placement compiled one accepted region, selected three rounds and displayed 96.13% exact true-target probability. The observed sample selected region 13 and overlapped the bus. Sampling remains probabilistic.
- The crowd's new **Boundary challenge** positions were tested at both grids: 4×4 center `[352,347]`, sprite 64×96; 8×8 center `[418,104]`, sprite 32×48. Each compiled zero accepted regions and abstained. These are separately observed browser fixtures, not a claim of browser parity for the entire Pillow audit.
- **Reset demo** restores a present explorer, default threshold, 4×4 grid and snapped placement. The next search compiled region 11 only, used three rounds and displayed 96.1% accepted and true-target probability. The observed sample hit region 11.
- Mobile crowd feedback appears directly under the image with a link to the probability map. There is only one live status announcer; the additional visible feedback is plain text.
- Constructed oracle lesson, shared by both websites: correct 16-region oracle gives 96.13%; one true target plus three false positives gives **100% accepted /25% true-target**; no target with four accepted regions gives **100% /0%**. A 64-region correct oracle selects six rounds and gives **99.66%**; deselecting target acceptance with zero false marks shows **No output**, zero rounds and explicit abstention.
- Both local comprehension answers were exercised. Feedback distinguishes predicate confidence from correctness. No claim of measured learning improvement or telemetry is made.
- The bus comparison page loads all four supplied preview images and links the two independent sites. It scopes the datasets separately and discloses the crowd's repeated geometry weighting.
- Both sites and the comparison page were checked at a 390×844 viewport; document width was 375 pixels with no horizontal overflow. Desktop lesson was checked in both dark bus and light crowd styling.
- Browser error logs were empty on the checked preview tabs. The final crowd audit and parameter-disclosure sections were reloaded and inspected.

## Code and artifact checks

All **20 Node tests pass**: Grover evolution/measurement, independent pixel-model fixtures, alpha-only evaluation, and three constructed-oracle golden cases. Both changed app modules and lesson modules pass Node syntax checks. The existing quantum register implementation is reused byte for byte by both sites, as are the new lesson module and stylesheet.

Static reference validation passes **40 bus and 21 crowd** local HTML references/module imports, including anchors. This found previously missing bus evaluation downloads. Matching `metrics-synthetic.json` and `metrics-photo.json` reports were added to the served model directory; the photo download's test accuracy 0.9845 and n=2,000 match the active checkpoint. No weights were modified.

The expanded crowd audit has 24 identical-pixel Python/JavaScript hard-patch comparisons. Feature discrepancy is at most 4.44×10⁻¹⁶ and prediction discrepancy at most 8.88×10⁻¹⁶. This verifies inference on identical rasters, not native browser/Pillow resampling equivalence. Six dedicated audit tests pass; verify-only replay reconstructs eight records including exact seeded samples and source hashes. The nominal 8×8 audit has 369 unique geometry configurations among 384 predefined probes; removing the 15 repeated corner configurations gives 330/369 clean hits for QNN and 350/369 logistic. The declared weighted results are retained and disclosed. Read [SCENE_AUDIT.md](../../waldo-search-lab/docs/SCENE_AUDIT.md) for protocol, seeded samples, weighting and failure examples.

The hybrid parameter audit checks three existing models with 128 seeded random-feature probes. Four final RZ slots (indices 25,27,29,31) have prediction derivatives ≤1.95×10⁻¹⁶; simultaneous phase perturbations change predictions by ≤1.23×10⁻¹⁵. Final CNOT permutations preserve basis probabilities and all readouts are Z-products. Labels now say **40 fitted slots**, with four inactive and 36 remaining prediction-influencing slots; independence or identifiability is not established. Checkpoints remain unchanged.

## Photo experiment gate

[PHOTO_V3.md](PHOTO_V3.md) records the illumination-relative extractor, matched training, validation selection, freeze and evaluation. Six asset originals/derivatives and all 21 frozen experiment files passed integrity checks. Sixteen Python/JavaScript extractor fixtures differ by at most 4.44×10⁻¹⁶.

The candidates remain **readyForDemo:false**. At their constrained validation thresholds, complete-scene rates are 76/512 QNN and 4/512 logistic. Fresh primary street audits yield 61/512 and 3/512 complete scenes, with no false marks but extensive abstention; both independently photographed bus ROI probes are rejected. No model, feature or threshold revision followed disclosure. A separate street/bus reserve pair stays unopened for later frozen evaluation.

Official judging criteria were rechecked directly: novelty/creativity, technical execution, impact potential and documentation quality; no published numeric weights. The constructed-oracle lesson, honest baselines and failure analysis strengthen the local educational story. Live platform execution, public entry and video remain unperformed and are not authorized by this run.
