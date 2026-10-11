# Independent current-QNN audit

Protocol frozen at 2026-10-11T01:07:47.948Z before reading candidate model bytes
or scores. The host timestamp was subsequently confirmed consistent with the
UTC clock tool. The immutable protocol SHA256 is
`4a113cef7f0dcd84f61845dae60703db5952e0355d95bf7256d79fb58fb6eb90`.

The implementation is `outputs/waldo-search-lab/model/audit-current-qnn.mjs`.
Six independent grading/statevector/NMS/sampling/portability tests are in
`tests/current-qnn-audit.test.mjs`. The source-only interface addendum records
inclusive NMS radius and threshold equality semantics, clarified from the stable
localizer before any trained-model read. The original protocol and freeze
records were not replaced.

There are 840 distinct predefined geometry configurations: 400 Original Festival,
220 Magic Arena, and 220 Coronation Queue. Each target height (24, 52, 80, 112) has 210
probes. The 300 clean cases comprise 12 default-coordinate cases and 288 seeded
cases. The 540 depth-crossing cases cover every current band at five fixed
bottom-anchor offsets. Thirteen placements are edge-clipped and retained.
Twelve absent-target calls and three banded default checks are reported
separately. Unequal per-scene counts reflect the numbers of existing bands;
the report includes scene/size/kind tables rather than implying equal scene
weighting or population accuracy.

Subsequent user steering prioritizes fully visible targets and makes the app's
primary default always-front. The 300 clean cases remain separate from the 540
band-crossing stress cases. The three frozen auto-banded checks preserve the
earlier default coordinates and depth policy; they are historical regression
checks, not assertions about the new always-front UI defaults. Separate browser
and trainer regression records must establish the new default behavior.

The fixed 64×64 scan grid has an 8px spacing and a 6.657px point tolerance. The
displayed PNG is trimmed at alpha>16 and resized using native Canvas default
smoothing, as frozen in the original audit. Before V3 fitting, the app was
changed to request browser Canvas high smoothing. This audit retains its
original rasterization policy; native and browser results require separate
replay and may differ. Model inference receives only final composite RGBA, the
frozen model, declared rendered width/height, and grid. Renderer coordinates,
visibility, target pixels, clean background, and template results are not passed
to the learned scanner. Acceptance is independently reconstructed from learned
scores using threshold and stable NMS, without a fallback.

Grading happens after inference. Alpha-mass visibility is measured against the
clipped rendered target canvas, matching the app. Observable means strictly
greater than 1%; separate 1–20% and at least 20% strata preserve misses outside the
original training positive-visibility criterion. The final usable model was
fitted to always-front targets, so partial occlusion is outside its final fitting
scope even when at least 20% remains visible; these bins do not imply in-domain
partial-target accuracy. A hit requires an accepted point within
tolerance; a clean hit also requires no false marks. Every accepted point is
false if the target is not observable. Empty accepted sets abstain. Exact
first-peak marked/unmarked probabilities include unmarked true addresses; an
empty oracle requests no measurement. One reproducible Born sample is secondary
to scene coverage and false marks.

Run from `outputs/waldo-search-lab`:

```text
node --test tests/current-qnn-audit.test.mjs
node model/audit-current-qnn.mjs --verify-protocol
node model/audit-current-qnn.mjs --evaluate --model ABS_FROZEN_MODEL --output ABS_REPORT
```

For a delivered source ZIP, the frozen records are copied to
`model/current-qnn/audit-protocol`. Add
`--protocol-dir model/current-qnn/audit-protocol` to verification/evaluation.
The directory override changes only the record location. Original protocol and
freeze bytes stay unchanged. Outside the bundled runtime, install
`@napi-rs/canvas` in the project; the harness first resolves the ordinary local
Node package and uses the Codex runtime only as a fallback. The recorded native
run uses Node `v24.19.0` on Windows x64 and `@napi-rs/canvas@0.1.100`; install
that Canvas version for the closest software replay:

```text
npm install --no-save @napi-rs/canvas@0.1.100
```

No fitting, threshold selection, or candidate promotion uses this audit.
The report scope addendum clarifies that the predefined engineering probes are
not restricted to the training protocol's held-out coordinate partition. Known
defaults are regression checks; some audited positions may coincide with
training-coordinate classes. The immutable protocol's original wording is
retained separately rather than rewritten.
V1 and V2/V2b candidates were rejected using training/validation evidence only.
No independent audit model scores have been read. The V3 interface lock pins
the revised feature sources before its candidate weights are read; the audit
geometries, seeds and grading criteria remain unchanged.

The usable clean-front model was frozen at SHA256
`9c5a25af8a37eb8482f09e49631418e63c05c47d0317fd0a2a5ead9b6c63465a`
and its acceptance threshold is `0.967190378886187`. All 14 candidate and source
manifest hashes were verified before independent scoring; the model lock uses
clock-tool UTC `2026-10-11T02:11:06Z`. The exact bytes are preserved at
`model/current-qnn/frozen-current-qnn.json` for portable replay:

```text
node model/audit-current-qnn.mjs --evaluate --model model/current-qnn/frozen-current-qnn.json --protocol-dir model/current-qnn/audit-protocol --output work/current-qnn-audit-replay.json
```

Evaluation status is **complete without retuning**. The source report is
`model/current-qnn-audit.json`, with a byte-identical served copy at
`dist/model/current-qnn-audit.json`. The final grouped results and interpretation
are in `model/current-qnn/INDEPENDENT_RESULTS.md`: clean 232/300, historical band
stress 203/498 observable targets, absent checks 12/12 abstentions. The combined
840 probes preserve all misses and twelve out-of-tolerance points in eleven
scenes. The run ended at host UTC `2026-10-11T02:25:48.847Z`, confirmed by the
clock tool at `02:25:50 UTC`. Model, V3 source and both legacy hashes remained
unchanged. These
are deterministic placements of the same artwork identities, not a blind
identity test or evidence of general person recognition. Native Canvas evidence
needs browser replay. Unsupported uploaded targets require the explicit
comparison-mode notice; unknown-background performance is out of domain. No
contest or public project/video/source submission or publication is authorized
or performed; owner-private review Site updates remain authorized.
