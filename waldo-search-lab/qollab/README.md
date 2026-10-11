# Quantum Crowd Search — local Qiskit companion

This package stays local. No contest upload, platform run, public submission or
source/video publication is authorized here. Live Qollab and IonQ execution is
unverified.

The four-qubit circuit matches the browser QNN: four layers of `RY(pi*x[0:4])`
and `RZ(pi*x[4:8])`, trained `RY/RZ` rotations, and the ordered CNOT ring
0→1→2→3→0. Seven Z-product expectations enter its saved sigmoid readout.
The learned scores are evaluated locally with Qiskit statevectors, then
classically thresholded into a Grover phase oracle. Supplied candidate centers
optionally apply the same score-ranked NMS; evaluation labels never select marks.
It accepts only `current-qnn-window-v3` features: red/white stripe Fourier
magnitude, stripe cross-column phase agreement, red/white balance, yellow head
and dark outline, blue leg morphology, horizontal and vertical palette-centroid
alignment in fixed pixel units, and supplied target height. These handcrafted
RGB descriptors use known-style palette, stripe-spacing and shape priors from
the training artwork. They receive no target-template pixels or clean-background
image at runtime. At24px height the stripe period is approximately1.66px,
below pixel Nyquist; the representation cannot recover stripes lost in rasterization.

The architecture exports40 parameter slots:32 circuit angles, seven readout
weights and a bias. The final four RZ slots (indices25,27,29,31) change phases
followed only by basis permutations and Z-product readout, leaving predictions
unchanged. The trained candidate freezes them at zero and optimizes36 slots.
This is a slot count, not proof of36 independent effective degrees of freedom.

One backend job contains one measured Grover circuit. `run_demo(backend)` accepts
an injected Qiskit-compatible backend; `main(shots)` also sees an injected global
`backend`. QNN inference submits no backend jobs. With an empty oracle, raw
uniform diagnostic measurements are retained and no locations are reported.
For a nonempty oracle all sampled addresses remain in the reported counts,
including unmarked outcomes; samples are never postselected to look successful.

The compact saved feature table demonstrates circuit/score and Grover parity.
It is not a full 4096-window site run, new image-domain benchmark, coherent QNN
sigmoid threshold, or evidence of quantum speedup. Known target size and classical
feature preparation remain prerequisites of the browser's detector.

```sh
python -m pip install -r requirements.txt
python main.py --shots 2048
python main.py --diagnostic --shots 2048
python -m unittest test_qiskit.py -v
python validate_local.py
```

Run these commands from this `qollab` directory. `model.json` is the byte-for-byte
frozen trained V3 checkpoint, SHA256
`9c5a25af8a37eb8482f09e49631418e63c05c47d0317fd0a2a5ead9b6c63465a`.
`scene.json` contains the first 16 untouched held-out feature rows in fixed test
order, with saved NumPy expectations and evaluation labels. The original held-out
fixture and its three final RGB PNGs are included, with checksums in
`trained-package-manifest.json` and [asset credits](ASSET_CREDITS.md).
These rows combine different windows and scenes;
Grover addresses index the fixture table rather than regions of one image.
Consequently this companion applies the frozen score threshold without
cross-scene NMS. The website's complete scanner and independent full-scene audit
remain separate evidence.

`validate_local.py` writes `local-validation.json` and `trained-validation.json`,
including exact circuit/readout/score and Grover distribution comparisons, plus
one seeded sampled job for the trained fixture. It does not change the checkpoint
or threshold. The test suite's separate backend invocations are validation runs;
each `main.py` or `run_demo()` invocation submits exactly one job.

`--diagnostic` explicitly uses random numerical-parity weights and synthetic
pixel-derived features. They are labelled diagnostic and make no trained-model
performance claim. The normal entry point requires `model.json` and `scene.json`
from the frozen trained checkpoint and test corpus; it does not
silently substitute diagnostic weights.

Local validation uses Qiskit2.5.2. Source is original implementation; see the
parent project's MIT license and scientific notes. No credentials or network
downloads are used at runtime.
