# Find the Explorer — Quantum Search Atlas

A separate interactive crowd-search demo, built for comparison with Bus Search Lab. Move an original illustrated explorer into an original crowd scene, score the rendered image regions with a trained QNN, compile the accepted scores into a phase oracle, simulate Grover amplification, and sample a region.

The interface supports 4 by 4 and 8 by 8 grids, tile-centered placement or free dragging, random moves, target removal, heatmap, threshold changes, iteration inspection and repeated measurements. Boundary challenge and reset expose reproducible misses; inline mobile feedback keeps the outcome near the controls. The canvas supports arrow keys and Enter. Ground-truth alpha overlap is evaluated after measurement, independently of the pixel-only classifier path.

Both websites are deployed with owner-private access: [Search Atlas](https://quantum-crowd-search.syrupyspool2.chatgpt.site) and the companion [Quantum CAPTCHA](https://bus-search-quantum-lab.syrupyspool2.chatgpt.site). Preserve this project's Sites ID `appgprj_6ac9ed0456008191aafac54f8d5af4d1` when updating it.

The final Iteration 03 private update awaits its external receipt in root QA. The bus project's local [comparison page](../bus-search-lab/dist/compare.html) links both demos. Both now share a constructed accepted-vs-true-target oracle lesson and quiz; its supplied teaching regions are separate from image-model predictions.

## Run

With Node available:

```powershell
node serve.mjs
```

Open `http://127.0.0.1:4174`. The website is buildless: static HTML, CSS, browser ES modules, model JSON, and artwork in `dist/`. No API keys, backend, npm dependencies, or quantum hardware are required.

## Science and scope

The QNN model is specific to this character/crowd compositing task. Scores are calculated from image pixels; known placement is used only for renderer ground truth. Grover amplifies the QNN's accepted regions, including any false positives, and cannot recover a missed target.

All regions are evaluated classically to construct the oracle, and quantum state evolution is also simulated classically. Ideal oracle-query complexity is separate from measured browser work. This project demonstrates no end-to-end quantum vision speedup or general real-person identity recognition.

The bus and crowd sites should be compared using labelled domains, identical metric definitions, oracle build evaluations, marked-set probability, and true-target probability. The separate [comparison plan](../bus-search-lab/docs/COMPARISON_PLAN.md) describes the intended educational comparison.

The four-qubit, four-layer model has **40 nominal fitted slots**, with a CNOT ring `0→1→2→3→0` and threshold 0.22. Four final learned RZ slots (25, 27, 29, 31) are prediction-insensitive; the **36 remaining prediction-influencing slots** imply neither independence nor a 36-dimensional family. See [hybrid-parameter-audit.json](model/hybrid-parameter-audit.json). Existing weights are unchanged.

Held-out same-asset patch accuracy is **99.0% on 600 examples**. Expanded nominal QNN true-mark hits are **356/384 at 4 by 4** and **345/384 at 8 by 8**, with zero nominal false marks. The latter contains **369 unique geometry configurations** and 15 repeated corner probes; its predefined weighting is disclosed, with deduplicated hits **330/369**. Separate 8 by 8 scale/brightness stress has **132/384 clean QNN hits** versus logistic **189/384**. These are Pillow same-art probes, not independent scenes or sampled quantum successes. Brightened empty crowd can produce a false mark. [SCENE_AUDIT.md](docs/SCENE_AUDIT.md) preserves counts/protocol; two boundary failures were confirmed separately in the browser. Earlier [model card](model/MODEL_CARD.md) and [QA](docs/QA.md) retain the smaller sample's results. No new-art/person recognition is established.

The completed nine-parameter same-feature logistic baseline reaches **99.67%** on the identical test split and 20/20 true-mark hits on both paired scene grids. This controlled comparison shows no QNN accuracy advantage and no end-to-end speed advantage. See [BASELINE.md](docs/BASELINE.md). Current UI ground truth for both sites is any inserted alpha >32 pixel; historical audit definitions remain separately labelled.

The companion bus photo-relative-v3 experiment was frozen before fresh photographic fixtures and rejected for severe misses despite zero fresh empty false marks. The next shared model priority is v4 representation/foreground variation with scene-level constrained validation. Reserve c-labelled photo assets remain steward-only until a later complete freeze; evaluated identities cannot become fresh holdouts again.

## Artwork and code

Original code/documentation are MIT-licensed. See [ASSETS.md](docs/ASSETS.md) for original generated artwork provenance. Third-party quantum-science references are credited on the site; Grover's algorithm is not claimed as a new algorithm.

The shared [canonical project state](../bus-search-lab/docs/PROJECT_STATE.md) tracks both private deployments and current improvements. The user instructed continued iteration **without submitting work**. Qollab uploads and public submission-material publication are withheld; SDK preparation and drafts remain local. Preview servers can be stopped after handoff; restart `node serve.mjs` for later development.
