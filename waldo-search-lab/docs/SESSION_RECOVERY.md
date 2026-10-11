# Recovery after the Iteration 04 usage interruption

Read-only recovery checked 10 October 2026 at approximately **17:42–17:45 UTC**. The earlier Iteration 04 work began at 09:56 UTC and was interrupted by the reported usage limit. This note identifies durable files and incomplete work; it does not treat a saved file as a verified deployment.

The latest user direction prioritizes the crowd editor: finer location cells, an amplitude/probability map, multiple backgrounds and target PNGs, and draggable foreground people/objects that can occlude the target. **Do not submit any work** remains active. No Qollab upload, public source/video/entry, source commit or website publication was performed by this recovery review.

## Last confirmed hosted state

The authoritative [publication receipt](../../docs/history/publication-receipt.json) was recorded at **2026-10-10 09:36:31 UTC**, Iteration 03. Both terminal statuses are **succeeded**, audience **owner-private**. These are earlier successful updates, not evidence that interrupted Iteration 04 or the new editor is hosted.

| Site | Preserved Sites project ID | Last confirmed deployment | Confirmed source |
| --- | --- | --- | --- |
| Bus CAPTCHA | `appgprj_6ac9e65f76c48191b8d53784212b5f4c` | `appgdep_6aca06d97cf4819191d7cd98c5a80355` | `2f616c21b832d8164b06c60a7ffc66499c20290f` |
| Crowd / Search Atlas | `appgprj_6ac9ed0456008191aafac54f8d5af4d1` | `appgdep_6aca06e69354819195cd5c4266a6205a` | `2a4846d5582ff2423d5f38d7223c6a478cb23cc3` |

Owner-private hosted URLs: [Bus CAPTCHA](https://bus-search-quantum-lab.syrupyspool2.chatgpt.site) and [Search Atlas](https://quantum-crowd-search.syrupyspool2.chatgpt.site). Hosted sign-in gates are expected; authenticated hosted interactions were not verified by this recovery task. [Iteration 03 QA](../../bus-search-lab/docs/ITERATION_03_QA.md) records local browser checks. The receipt resolves earlier source documents' pending-update wording.

All three production model hashes were checked against the Iteration 03 audit and remain unchanged: illustrated bus, photo bus and crowd. Preserve those saved checkpoints and their feature versions. New editor defaults must not silently relabel classical template matching as a newly trained QNN.

## Interrupted photo-v4 artifacts

Saved under `bus-search-lab/model/`: `photo_features_v4.py/.mjs`, `photo_v4_data.py`, `train_photo_v4.py`, `photo-v4-protocol.json`, QNN/logistic candidate JSONs, metrics, montages and parity fixtures. These are separate experimental artifacts.

The saved metrics show:

| Candidate | Selected threshold | Validation false-mark budget | Complete validation target probes | Test recall |
| --- | ---: | --- | ---: | ---: |
| QNN | 0.995 | Infeasible: 1/144 empty false scenes | 7/512 | 0.4% |
| Logistic | 0.99 | Feasible empty/false-mark budget | 17/512 | 7.0% |

Both fail useful coverage. No production promotion is supported. At recovery time **`photo-v4-freeze.json`, `PHOTO_V4.md` and `photo-v4-parity-verification.json` were absent**. Fixture presence alone does not establish completed cross-runtime verification. These observations are an inventory of saved evidence, not a completed fresh-identity experiment.

Reserve street-c/bus-c remains unopened and undisclosed to model development. No Iteration 04 reserve disclosure file was found. This recovery did not inspect reserve pixels or identities. Any later reserve audit requires a new root assignment and exact feature/model/threshold/renderer/protocol freeze verification before disclosure. Do not open reserves to finish a failed candidate or select a better threshold from their results.

## Interrupted oracle-reliability and tour work

The mathematical reliability module, experiment, results, tests and verification report survive under `bus-search-lab/model/`. The report records **889 actual statevector oracles across 12 weighted ensembles**, 35 direct binomial configurations and edge cases, with maximum expected-target discrepancy below 7.8e-16. These are exact hypothetical independent-error ensembles, not empirical QNN calibration or measured browser performance.

An independent enumeration performed before interruption reproduced the default one-target /90% recall /1% false-positive-rate results: mean accepted mass **87.6661% /94.3883%** and effective true-target mass **80.2299% /66.5114%** for 16/64 candidates. Empty-oracle cases contribute no output. The rates are assumed fixed; changing actual grid pixels can change real detector quality.

The local bus `reliability.html`, `reliability.js` and `reliability.css` survive. At recovery time **served `dist/oracle-reliability.js` and `dist/model/oracle-reliability-results.json` were missing**. The page imports/downloads those paths, so it was incomplete despite the verified model-side mathematics. `docs/ERROR_PROPAGATION.md` was also absent. Root was informed; subsequent fixes and browser checks must be recorded separately.

**Subsequent local repair is complete.** The exact canonical module/results bytes were copied to those served paths and [ERROR_PROPAGATION.md](../../bus-search-lab/docs/ERROR_PROPAGATION.md) was written. The training agent reports the 889-oracle verification passed, all 20 frozen served scenarios matched exactly, and a local headless Edge check of normal/perfect/absent presets had no page errors; both resources returned HTTP200 with matching hashes. This is local integration evidence, not a new hosted receipt. No production model, v4 artifact or reserve was changed.

Both apps contain quick-tour HTML, CSS, module imports and mounts for restore → search → honest failure. Their saved source survived, but a final Iteration 04 browser pass, source package and terminal deployment receipt were not found in the recovery evidence. Recheck actual controls rather than infer completion from imports.

## Resumed priority and handoff rules

The resumed crowd editor is in progress. Its implemented local default is **classical known-template localization with finer candidate centers**, while the existing four-qubit trained QNN remains a separately labelled 4×4/8×8 region experiment. Following the user's open-art preference, two public-domain paintings and an attributed striped OpenMoji SVG have been acquired under `dist/assets/open-art/`; their source JPEG bytes are unchanged. Named/background-derived foreground PNG layers and uploads are implemented in local source. Read [OPEN_ART.md](OPEN_ART.md) for licensing/provenance and [SCENE_EDITOR.md](SCENE_EDITOR.md) for the scientific contract, source review and limited matcher test outcomes. New browser and hosted results still require their own receipts.

For the next handoff:

1. Record the actual new file inventory, detector mode, grid/address definition and asset provenance. Keep placement/occlusion truth out of inference.
2. Verify local uploads stay in the browser, target absence, partial/full occlusion, quantized point accuracy, map semantics, keyboard/mobile controls and existing QNN regressions.
3. Distinguish matcher score, signed quantum amplitude, Born probability and a sampled result. Preserve no-output empty oracles.
4. Preserve the now-restored reliability dependencies and their exact source hashes if the page is retained; distinguish completed local verification from new hosting evidence.
5. Record a new owner-private deployment only from its terminal receipt, preserving both project identities. Keep submission/public materials withheld. Stop temporary preview servers after handoff and restart `node serve.mjs` for future local work.

The initial recovery inspection changed only this note and `SCENE_EDITOR.md`. The later separately authorized open-art task added `OPEN_ART.md`, downloaded source assets, the native SVG derivative and acquisition/provenance records. No canonical state, UI, model, reserved/historical evaluation metadata or deployment file was edited by this subagent. No reserved evaluation asset was opened.
