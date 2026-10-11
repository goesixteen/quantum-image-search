# Oracle reliability and error propagation

The Oracle Reliability Lab explains how detector misses and false positives change ideal Grover search. Its controls define a **hypothetical, independent region-error model**. They are not calibrated to the saved QNN, image scores, buses, or a real CAPTCHA system. The result is an exact finite expectation under the stated assumptions, rather than a Monte Carlo estimate or a hardware measurement.

## Model and policy

For N candidate regions, t true target regions, recall r, and false-positive rate f, accepted true and false counts are independently distributed:

\[
A\sim\operatorname{Binomial}(t,r),\qquad
B\sim\operatorname{Binomial}(N-t,f),\qquad M=A+B.
\]

All true regions share r and all negative regions share f. Every region decision is independent. Real errors can correlate across adjacent tiles, source objects, lighting, or repeated background structures. Changing the real grid also changes its patch geometry; holding r and f fixed while changing N is a teaching experiment, not a prediction for that grid change.

For each count pair with 0 < M < N, define θ = arcsin√(M/N). The implementation compares the two integer rounds around π/(4θ) − 1/2, choosing the larger accepted-set probability at the first peak; ties within 1e−14 use the lower round count. The ideal accepted-set probability is

\[
P_G=\sin^2((2k+1)\theta).
\]

The actual number of accepted regions M is known for this round choice. This is consistent with the demos, where all candidate scores are computed before compiling the fixed predicate. It is not an algorithm for unknown M.

For a nonempty predicate, total true-target probability includes both accepted and rejected true regions:

\[
P(\text{true}\mid A,B)
=\frac{A}{M}P_G+
\frac{t-A}{N-M}(1-P_G).
\]

The second term is residual Born probability on true regions missed by the detector. It does not mean the detector's rejected region has become marked. Omitting that term would undercount semantic target probability when the accepted set is nonempty.

An empty predicate, M = 0, returns no output and contributes **zero effective target probability** to the unconditional average. Its theoretical zero-round uniform state has target mass t/N, which is reported separately and is not sampled by this policy. A full predicate, M = N, uses zero rounds and has target probability t/N. Absent-target examples, t = 0, have target probability zero regardless of accepted-set probability.

The module sums every count pair with weight P(A)P(B), including empty predicates. A mode-centered recurrence produces stable binomial probabilities; compensated sums check total weight, expected accepted count, and target-mass decomposition. It does not replace the distribution with one average M. It also records probability conditioned on a nonempty search; those values must not be confused with unconditional success including abstentions.

## What the checked examples show

The frozen report contains 14 curve configurations: N in {16,64}, t = 1, r = 0.9, and f in {0,0.001,0.005,0.01,0.02,0.05,0.10}. Six additional examples cover perfect predicates, multiple true regions, absence, zero recall, and accepting all regions.

For one true region, 90% recall, and a 1% per-negative false-positive rate:

| Quantity, unconditional across constructed predicates | 16 regions | 64 regions |
|---|---:|---:|
| True-target probability after ideal search | 80.23% | 66.51% |
| Accepted-set probability after ideal search | 87.67% | 94.39% |
| Chance of at least one false mark | 13.99% | 46.91% |
| Chance of a correct mark and no false mark | 77.41% | 47.78% |
| Empty predicate, no output | 8.60% | 5.31% |
| Uniformly choose an accepted region, classical reference | 83.56% | 66.71% |
| Mean ideal search rounds | 2.61 | 4.69 |
| Classical detector calls to compile each predicate | 16 | 64 |

The probability of any false mark is 1 − (1−f)^(N−t). More candidate regions give this hypothetical fixed-quality detector more opportunities to accept a wrong region. The accepted set can receive more amplified probability while actual target probability falls. This distinguishes recognition quality from Grover's successful amplification of the supplied predicate.

The uniform-accepted reference uses A/M on nonempty predicates and zero on empty predicates. In these two configurations it slightly exceeds the selected Grover target probability. Integer first-peak selection optimizes accepted-set probability, not semantic target probability. The reference requires the already compiled predicate too; no practical quantum advantage follows from this comparison. Binary marks contain no score-ranking distribution, so the experiment cannot predict score-argmax accuracy.

Resource accounting reports log₂N address qubits, N classical detector evaluations, and the expected number of ideal phase-oracle and diffusion calls. The QNN classifier's separate four-qubit circuit is not included in the address-register count. The report does not estimate image loading, coherent data preparation, reversible classifier/oracle construction, physical gate decomposition, noisy hardware, or wall-clock runtime.

## Frozen artifacts and restored browser dependencies

- `model/oracle_reliability.js`: canonical pure calculation module.
- `model/oracle-reliability-experiment.mjs`: deterministic report generator; reads no trained weights or images.
- `model/oracle-reliability-results.json`: frozen 20-scenario results.
- `model/oracle-reliability-test.mjs`: independent direct-binomial and statevector comparisons.
- `model/oracle-reliability-verification.json`: numeric verification and source hashes.
- `dist/oracle-reliability.js`: exact byte copy of the canonical module, under the path imported by `dist/reliability.js`.
- `dist/model/oracle-reliability-results.json`: exact byte copy of the canonical results, under the page's download link.
- `dist/reliability.html`, `dist/reliability.js`, and `dist/reliability.css`: existing interactive page and controls.

The interrupted integration left the two served copies missing. On 2026-10-10 they were restored without editing source, frontend controls, production weights, v4 artifacts, or reserved evaluation assets. Both source/destination pairs have these SHA-256 hashes:

```text
calculation module
3482c052829186d398525f293080810689fae633c0376138f371d7389fb12df5

results JSON
66582470f1ed98af6e126b84910a5d75ac2e6ab2a13c49977c1670a34da3f199
```

This recovery was verified locally and remains unpublished in this turn. It does not establish that a hosted deployment contains the recovered files.

## Reproduction and verification

From `outputs/bus-search-lab`, Node 18 or later is sufficient for the calculation and its tests; no Python, machine-learning package, image asset, or network call is required.

```powershell
node model/oracle-reliability-test.mjs
node --check dist/oracle-reliability.js
node --check dist/reliability.js
```

The test script rewrites its deterministic verification JSON and exits on a failed assertion. It checks 35 direct binomial configurations and four extreme/large PMFs, 12 weighted statevector ensembles comprising **889 actual oracle statevectors**, and 17 all-true/full-oracle closed-form checks, together with empty-output handling, invalid input rejection, and the classical uniform-accepted reference. The recovered run passed, with maximum errors:

| Comparison | Maximum absolute error |
|---|---:|
| Binomial recurrence vs direct formula | 1.89 × 10⁻¹⁵ |
| Count formula vs actual statevector target mass | 2.22 × 10⁻¹⁶ |
| Expected target mass vs weighted statevector ensemble | 7.77 × 10⁻¹⁶ |

To regenerate a report after deliberately changing the calculation, run `node model/oracle-reliability-experiment.mjs`. It writes `model/oracle-reliability-results.json`; it does not automatically synchronize browser copies. To restore the served files from unchanged canonical artifacts:

```powershell
Copy-Item -LiteralPath model/oracle_reliability.js -Destination dist/oracle-reliability.js
Copy-Item -LiteralPath model/oracle-reliability-results.json -Destination dist/model/oracle-reliability-results.json
```

During recovery, all 20 stored scenarios were recomputed through the restored served module and matched exactly, both served dependencies returned HTTP 200 with the canonical bytes, and a temporary local headless Edge session loaded `reliability.html` without page errors. The normal, perfect, and absent presets produced true-target values [80.23%,66.51%], [96.13%,99.66%], and [0.00%,0.00%], respectively. The temporary server and browser were closed after verification. For a manual repeat, start `node serve.mjs`, open `http://127.0.0.1:4173/reliability.html`, and check those presets and both download links.

These checks establish local calculation and dependency integrity under the declared model. They do not establish QNN calibration, arbitrary-image recognition, a coherent QNN threshold oracle, or quantum speedup.
