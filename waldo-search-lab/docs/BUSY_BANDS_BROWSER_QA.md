# Busy scenes, whole-object bands and soft field — browser QA

October 10, 2026; Windows Codex in-app browser, local source at http://127.0.0.1:4174. These browser results supplement the native audit rather than establish equivalent renderer output on all devices.

- Original Festival was tested first:24objects/15bands. Default(280,350) produced one accepted address,50rounds,99.99% accepted mass,0pxpoint error and94%remaining alpha mass.
- Festival musician crossing: center(304,220),foot246,one overlapping band in front,76%visible,0pxerror; center(304,228),foot254,zero overlapping bands in front,100%visible,0pxerror. This verifies the clarified lower-feet=in-front rule in the actual editor.
- Arena:10objects/6bands; default(280,350),100%visible,0pxerror,one mark.
- Queue:10objects/6bands; default(280,350) abstains. Moving to(334,350) restores one accepted point,96%visible and0pxerror. No answer is forced for the obscured placement.
- Cinematic default playback visibly traversed exact rounds and a spatially smooth contour field, about8seconds at4096addresses. Exact-probability mode at round0 remained0.02%peak after all three display sliders changed to maxima. Smoothing, emphasis and exposure therefore did not alter displayed exact probabilities. Separate pure tests verify arrays and normalization.
- Search cancellation: moving the target during playback immediately restored Ready to search, cleared accepted count, and enabled Find. The cancelled animation did not restore its obsolete result.
- Local background upload with Arena PNG cleared preset bands, hid object-atlas link, and localized the target at0px. Local upload of the striped PNG also localized at0px; removing it then produced0/4096accepted addresses. Uploaded files were project fixtures, not personal images.
- The native PNG/band ZIP download succeeded. Its ZIP integrity passed with24individual object PNGs,15band PNGs and the objects-only atlas. Layer-data JSON download also succeeded: auto depth,15bands,512pxregistered source width and staticPNG references.
- At a390×844phone viewport, document width375px≤390px and the default search localized with0pxerror/94%visible. The field, legend and selector fit the viewport. Screenshot saved; temporary viewport reset and test tab closed. This is responsive desktop-browser QA, not a physical-device or touchscreen test.
- No browser console errors in the checked default-field run. Static review confirmed174asset/HTML references,7module imports and54band/mask PNGdimensions/hashes.

Proof files in the parent outputs directory: festival-depth-bands-preview.png, soft-field-preview.png, soft-field-mobile-preview.png. Updated hosted proof/status belongs in publication-receipt.json after private deployment. Native tray drag/drop and painted custom-cutout testing remain useful follow-up checks; file-chooser uploads, keyboard placement, pack and JSON exports were checked in this run.

Frozen current native protocol:205inbounds probes,194above1%alpha mass,117accepted-point hits,77visible misses,11less-visible abstentions,0falsepoints. All3empty stacks and27band reconstruction checks pass. These are controlled same-asset probes, not model identity accuracy, held-out real photographs or estimated sampled success. See model/depth-band-audit.json.

Final code checks:60/60Node tests and app.js syntax pass. QNN/search-core/quantum weights and oracle parameters remain unchanged. Default fine matching is classical known-size/clean-background reference matching. No external contest submission or public release was performed.

Additional final browser checks: nativeHTMLtray-to-scene drag placed the stripedPNG at the musician-front location (feet254), returning100%visibility/0pxerror. Custom paint created one foreground layer; Clear removed it. Original learned-QNN4×4 mode remained selectable with the original explorer and Festival and returned one accepted tile, correct sampled tile11,100%visibility. These replace the earlier follow-up wording for basic tray/paint checks. Multi-point silhouette artistry and actual touchscreen devices remain separate potential tests.

## Overlay visibility follow-up — October 10, 2026

Raised the scene soft-field/raw-resemblance opacity multiplier from 0.58 to 0.90. The existing intensity-dependent alpha and transparent zero values remain in place; the standalone panel remains at 0.94. Both selectors use the same field when set to Soft search field, but the selectors are independent. The explanatory panel also draws contours over a subdued background.

Local browser checks verified starting candidate regions at round 0 and the final peak at round 50 on Original Festival. The default search still returned one accepted address, 99.99% accepted mass, sampled point (280,350), 0px error and 94% visible alpha mass. App syntax and Git diff checks passed. This is an alpha-only display change; field values, detector, oracle, exact amplitudes/probabilities and sampling are unchanged. The prior 60-test and native-audit results above remain historical evidence for those unchanged modules, not new tests run for this cosmetic change.
