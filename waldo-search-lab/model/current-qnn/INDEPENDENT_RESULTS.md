# Independent current-QNN scene audit

The unchanged frozen protocol finished at `2026-10-11T02:25:48.847Z`;
clock-tool confirmation was `2026-10-11 02:25:50 UTC`. No fitting or threshold
selection followed these results. The report is `model/current-qnn-audit.json`,
also copied byte-identically to `dist/model/current-qnn-audit.json`.

| Probe group | Total | Observable (>1% alpha mass) | Accepted-point hits | Observable misses | Out-of-tolerance points / scenes | Abstentions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Clean placements | 300 | 300 | 232 | 68 | 7 / 6 | 62 |
| Historical band crossings | 540 | 498 | 203 | 295 | 5 / 5 | 332 |
| Combined weighted probes | 840 | 798 | 435 | 363 | 12 / 11 | 394 |
| Separate absent-target checks | 12 | 0 | — | — | 0 / 0 | 12 |

Every hit in this run was also a clean hit: none of those scenes had an extra
wrong accepted point. All twelve out-of-tolerance points were near the target
center, at approximately 6.95–9px error, rather than distant distractors. They
remain failures under the predeclared 6.657px tolerance. Thirteen clipped probes
were retained: six hits and seven abstentions. All 76 targets with 1–20% visible
alpha mass were missed; the 42 probes at or below 1% abstained without marks.

| Rendered height | Clean hits / 75 | Clean misses | Clean wrong points / scenes | Band-stress hits / observable |
| --- | ---: | ---: | ---: | ---: |
| 24px | 36 / 75 | 39 | 0 / 0 | 29 / 117 |
| 52px | 70 / 75 | 5 | 5 / 4 | 62 / 122 |
| 80px | 69 / 75 | 6 | 1 / 1 | 63 / 126 |
| 112px | 57 / 75 | 18 | 1 / 1 | 49 / 133 |

Clean counts by artwork were Original Festival 74/100, Magic Arena 81/100 and
Coronation Queue 77/100. The mixed audit weights Festival more heavily because
it has 15 bands rather than six: its complete count is 400 probes versus 220
for each other scene. These deterministic nearby configurations are not
independent samples from a population.

The final model fits always-front targets. The band-crossing group includes
fully visible cases and occlusion stress. Its partially occluded targets are
outside that fitting scope, even when at least 20% remains visible. The three
separately frozen *auto-banded* historical default checks
found Festival and Arena; Queue, with about 4.27% visible alpha mass, abstained.
They are not the primary UI's later always-front defaults. Separate browser QA
and the trainer's front-only regressions establish those defaults; this report
does not certify hosted deployment or browser rendering.

The trainer's reserved clean-front test is distinct: it uses its declared
held-out coordinate partition and native high-quality resizing, with QNN
223/250 clean hits versus logistic 221/250. This audit preserves native-default
resizing and includes known default coordinates plus all coordinate classes;
only 167/840 geometries fall in the trainer's test-coordinate class. The
difference between these reports does not isolate the effect of rasterization,
height selection, positions or stress. No claim of general person recognition,
unseen artwork generalization or quantum advantage follows from either report.

Acceptance was independently reconstructed from learned scores, inclusive
thresholding and deterministic NMS. The invalid-image and invalid-geometry
guards passed; adding misleading placement/alpha/template/background options
left scores and marks unchanged. A separate source review confirmed that custom
targets explicitly select the labelled template comparison and that sampling
uses exact trace probabilities, never smoothed display values. One seeded Born
sample per probe produced 435 hits, 11 sampled wrong points and 394 abstentions.
Mean exact true-point output mass over all 840 probes was 51.7829%, including
unmarked true addresses and the no-output empty-oracle policy.

The model remained SHA256
`9c5a25af8a37eb8482f09e49631418e63c05c47d0317fd0a2a5ead9b6c63465a`.
The report SHA256 is
`7585ffce07d79540f849932c6b5bc9cb616c5ae44c33723b80aebda520d19808`.
V3 localizer, the old illustrated checkpoint and the shared QNN runtime hashes
were also unchanged after the full run. Protocol hash, original freeze and
pre-score interface/portability/scope locks are preserved in `audit-protocol/`.

From the delivered project directory, install `@napi-rs/canvas@0.1.100` and run:

```text
node --test tests/current-qnn-audit.test.mjs
node model/audit-current-qnn.mjs --verify-protocol --protocol-dir model/current-qnn/audit-protocol
node model/audit-current-qnn.mjs --evaluate --model model/current-qnn/frozen-current-qnn.json --protocol-dir model/current-qnn/audit-protocol --output work/current-qnn-audit-replay.json
```

Runtime durations/timestamps will differ; fixed inputs, seeds, model and grading
reproduce the outcomes on the recorded rasterizer. No contest or public
project/video/source submission or publication is authorized or performed;
owner-private review Site updates remain authorized.
