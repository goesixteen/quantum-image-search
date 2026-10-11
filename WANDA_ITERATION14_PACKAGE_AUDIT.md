# Iteration 14 — packaged quick-start dry-run

Recorded: 2026-10-11 08:59:53 UTC. Read-only verification of the existing iteration 13 ZIP, followed by root-authorized test dependency/package corrections and a separate updated-copy check. No training, model/evidence changes, browser interaction or publication.

## Package tested

- Archive: `outputs/quantum-image-search-deliverables.zip`, 197,317,594 bytes; SHA-256 `7814c2766eb00fbd428458330ee49abc80eb4f8d573befe559591c8cb81cb08c`.
- Fresh extraction: `work/iteration14/package-audit/extracted/`, 1,021 files; 256,673,523 uncompressed bytes. Extraction rejected paths outside that directory before proceeding.
- Receipt identifies crowd commit `d14bf6a99c8dfc1513d3290ed36e6c474e4ad896` and an owner-private succeeded deployment. All 241 tracked crowd `dist/` files are present and match that commit's content: 223 are byte-identical, 18 differ only by CRLF versus LF. This is not a claim that every archived byte is identical to Git.
- Current Wanda checkpoint retains SHA-256 `d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88`.
- No dedicated QUICKSTART file exists in this tested archive; instructions were read from both project READMEs and Wanda/Park package READMEs.

## Executed checks

Commands ran from the extracted project directories using the installed Node **24.19.0** and Python **3.12.14** runtimes. Python verifier dependencies NumPy/Pillow and native Canvas **0.1.100** were already available on this host.

| Extracted project / command | Result |
|---|---|
| Crowd: `node --test tests/*.test.mjs` | **126/126 pass**, zero failures/skips/cancellations; the quoted wildcard works with the tested Node version. |
| Bus: `node --test tests/*.test.mjs` | **20/20 pass**, zero failures/skips/cancellations. |
| Crowd: `python -B model/wanda-qnn/verify-frozen.py` | Pass: 11 frozen files, 7 frozen sources, 12 pixel fixtures; metadata erratum verified. Maximum feature/readout/score errors: `3.11e-15 / 4.84e-15 / 5.55e-16`. |
| Crowd: `node model/wanda-park-curation/verify.mjs` | Pass: 40 artifact hashes, 12 external guards, 9 complete 512px PNGs; 113 curation scans/125 field-check records retained. |
| Crowd: `node --check dist/app.js` | Pass. Equivalent to the package's `check` script. |
| Static HTML references and literal relative module imports | 97 checked; no missing local files. This bounded check does not execute browser-only paths. |

Both exact `node serve.mjs` defaults use occupied local ports (4174 crowd, 4173 bus). The crowd startup correctly reaches Node's server listener, then exits with `EADDRINUSE`; these are root's existing preview servers, which were left untouched. An audit-only wrapper patched `http.Server.prototype.listen` **in memory** to request port 0 and loaded each **unchanged** extracted server. All 17 requested pages/modules/model/art resources returned 200 with usable content types; missing and encoded parent-traversal probes returned 404. Both temporary servers were closed. The wrapper is `work/iteration14/package-audit/serve-probe.mjs`.

`npm run check` could not execute because npm is not on this shell's PATH. Direct `node --check` passed; npm is unnecessary for static startup. No build is needed or documented. This environment failure is separate from a project failure.

## Concrete corrections recommended

1. **Portable tests:** `tests/layer-assets.test.mjs` and `tests/depth-bands.test.mjs` require the Codex cache path directly, bypassing an ordinary local `@napi-rs/canvas` installation. The full suite passes here but is not yet portable to a standard machine. Prefer a local-package-first loader with explicit override and bundled fallback. Do not change frozen model/training sources.
2. **Usable startup:** support `node serve.mjs --port 0` or another explicit port; print the assigned URL and an actionable occupied-port message. Preserve default 4174. This avoids stopping a user's existing server.
3. **Quick-start clarity:** state Node prerequisite, static startup without API keys/build/install, optional native test dependency `@napi-rs/canvas@0.1.100`, and optional Python NumPy/Pillow verifier dependencies. Keep retraining commands separate from safe verification.
4. **Stale prose:** crowd README says 102 tests although the archive passes 126. Bus README still presents old paintings/layered-editor work and a pending private update as current crowd state. Current receipt and handoff are iteration 13; clearly label retained historical prose.

The independent archive-inventory reviewer found no credential-shaped values/files, `.git`, `node_modules`, virtualenvs or caches in the ZIP. This is a bounded scan, not a security guarantee. Site identity/receipt metadata are project references, not login credentials. No new reserved recognition benchmark was evaluated.

## Updated-copy follow-up

Root authorized changes only to the two test loaders and crowd `package.json`: both tests now try ordinary `@napi-rs/canvas` resolution before the existing Codex fallback, and the exact tested version **0.1.100** is declared as a development dependency. The affected ten tests pass. Root separately added the port-selectable server. No bus source was edited.

A separate copy, `work/iteration14/package-audit/updated-portable-crowd/`, contains these four updated source/config files and the otherwise unchanged extracted project. The installed exact Canvas package and Windows native package were copied into its ordinary `node_modules`; **npm installation itself was not executed** because npm is unavailable on this host. With `USERPROFILE` redirected for that child process to a nonexistent Codex home, Canvas resolves locally and **all 126 tests pass**. This verifies that no bundled homedir fallback is required by the full test suite when a local native dependency is available. The original extraction is preserved.

The updated `node serve.mjs --port 0` prints its real OS-assigned URL. `/`, `/app.js`, `/model/wanda-qnn.json` and `/assets/wanda/festival-512.png` return HTTP 200 with byte-identical files. The occupied default port now exits 1 with an actionable message; `-1`, `65536`, `abc` and missing port arguments each exit 1 with usage. The temporary server was stopped. The original occupied-port failure is retained above. Executable follow-up harness: `work/iteration14/package-audit/startup-check.mjs`; full local-dependency test output: `work/iteration14/package-audit/portable-test-output.txt`.

| Final source/config file | SHA-256 |
|---|---|
| `tests/layer-assets.test.mjs` | `225bc5420a7989d5cb93721ba9312ddd150596b2b19e8857f44e1c2fd773bac6` |
| `tests/depth-bands.test.mjs` | `93fafb51b18becff8dbe4ef21586dd036fb522c8696fdc706c160eb6ebd54f6f` |
| `package.json` | `737300aa404d45212f76ce607d10a4286b53a3f306f3ff6186e2497b456353d4` |
| Root-owned tested `serve.mjs` | `19b808d255e4903172a372742e124df54b7f6e00149302afb500b0b59317584c` |

Root owns the final README/quick-start prose and refreshed source ZIP. This audit refers to the initial ZIP hash above plus explicitly listed updated-copy files; it does not certify a later archive that has not been examined. No Qiskit execution, full corpus regeneration/retraining, native-versus-browser rerender accuracy, human learning study or hosted deployment was performed here. These checks establish package execution/integrity on this installed host, not new recognition accuracy.

The newly written local `outputs/WANDA_QUICKSTART.md` and current crowd README were read after the executable follow-up. They now distinguish dependency-free static startup from native engineering tests, document `--port 0`/alternate ports, the compact three-stage flow, safe read-only verification and frozen scope. The README no longer presents 102 as the current count and includes the pinned conventional npm installation instruction. These documentation fixes are ready for root's refreshed archive; the initial ZIP intentionally remains the tested historical snapshot.

No contest or public project/video/source submission or publication is authorized/performed; owner-private review Site updates remain authorized and root-owned.
