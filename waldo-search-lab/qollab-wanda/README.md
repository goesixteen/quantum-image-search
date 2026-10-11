# Where's Wanda — local Qiskit companion

Run the actual frozen Wanda variational classifier in Qiskit, then sample a
Grover circuit whose predicate comes from its learned scores. This separate
package preserves the historical `qollab/` companion and every frozen model
and evidence artifact. It performs no upload, submission or network request.
Live Qollab or IonQ execution remains unverified.

## Run locally

From this directory, with Python installed:

```sh
python -m pip install -r requirements.txt
python main.py --shots 2048
python main.py --shots 2048 --iterations 0
python -m unittest test_qiskit.py -v
python validate_local.py
```

The first command uses the recommended first peak; `--iterations` inspects
another round without changing scores, weights or threshold. Each `main.py`
or `run_demo()` invocation submits exactly **one backend job containing one
measured Grover circuit**. The test suite runs independent checks with their
own jobs. The default backend is Qiskit's local `BasicSimulator`.

`run_demo(selected_backend, shots=2048)` accepts a supplied Qiskit-compatible
backend. In an injected environment, a global `backend` is used by
`main(shots=2048)`. Loading the script with that global does not automatically
run or submit a job: invoke `main()` once explicitly. Compatibility is verified
with the local SDK; a particular platform/provider adapter may need changes.
No credentials, account setup or paid service are included.

## Exact model and fixture

`model.json` is the byte-for-byte frozen Wanda checkpoint, SHA256
`d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88`.
Its unchanged threshold is `0.9056472752971427`. The trained circuit accepts
the `wanda-window-v1` eight-feature contract.

`scene.json` contains the **first 16 reserved test rows in fixed dataset order**.
The untouched source fixture is included as `held-out-trace-fixtures.json`,
SHA256 `a6da338c53bea727b3c7e39f4f24aa81c618e554e8029a05035e3a5997db49ea`.
The three actual source PNGs, expected NumPy observables/scores, and provenance
metadata are included. `package-manifest.json` records their checksums.

This compact table combines windows from multiple examples. Its Grover
addresses are **fixture row numbers**, not regions of one CAPTCHA. It applies
the frozen score threshold; cross-scene duplicate suppression would be
inappropriate. It is a circuit-parity companion rather than the website's
complete 4,096-window scan, a new whole-scene accuracy benchmark, or evidence
about unseen characters/backgrounds. Labels, true positions and visibility
metadata enter evaluation only after scoring and backend sampling.

`prepare_package.py` reproducibly rebuilds the table from the included frozen
model/fixture. Within the parent project it also copies the original source
PNGs and provenance; a standalone folder uses the copies already included.
No fitting, favorable-example selection or threshold tuning occurs.

## Quantum and classical boundaries

The classifier uses **four qubits**, with four repetitions of input
`RY(πx[0:4])`, `RZ(πx[4:8])`, learned `RY/RZ` angles and CNOT ring
`0→1→2→3→0`. Local exact Qiskit statevectors yield
`Z0,Z1,Z2,Z3,Z0Z1,Z2Z3,Z0Z1Z2Z3`; the saved affine readout and sigmoid produce
a detector score. Classical thresholding compiles the Grover phase flips.
QNN inference submits no backend jobs and is not a coherent sigmoid oracle.

The 16-row Grover register also has four qubits, **separate from the classifier**.
The website's 64×64 register has twelve search qubits. This companion does
not claim a combined classifier/search circuit or quantum image memory.

The representation uses artwork-informed palette, stripe-spacing, body and
centering priors, with supplied width/height. These features are computed
classically and saved here. The output score is not a calibrated probability
of a real person being present. The simulated circuit and its trained angles
are genuine model components; this does not establish an end-to-end quantum
speedup or machine-learning advantage.

The model exports 40 parameter slots: 32 circuit angles, seven readout weights
and one bias. Four final RZ slots (`25,27,29,31`) do not affect the diagonal
readout, leaving 28 optimized quantum angles plus eight classical slots. They
can change quantum phases while preserving the detector score. Slot count
does not prove independent effective dimensions.

## Sampling and verification

All sampled addresses remain in `counts`. With a nonempty predicate,
`reportedRowCounts` retains every sampled row, including unmarked rows. With
an empty predicate, the diagnostic uniform counts are retained and reported
answers are empty. No argmax answer, accepted-only postselection or forced
successful sample is supplied. An all-accepted predicate remains uniform and
cannot distinguish rows.

`validate_local.py` writes `local-validation.json`, including the exact full
distribution, accepted-set mass, separately labelled true-row mass, and a
4,096-shot seeded local job. The ten tests cover the trained seven-observable
and score parity, exact oracle/reflection matrices, analytic amplification
including overshoot and empty/full cases, immutable fixture order/hashes,
prediction-inactive phase slots, exactly one job/circuit, label independence,
injected entrypoint behavior, and retention of unmarked samples.

Verified locally with Qiskit 2.5.2: **10 tests passed, zero skipped**. Maximum
readout error versus saved NumPy is `5.55e-16`, score error `2.22e-16`, and
full Grover distribution error versus the analytic curve `1.44e-15`. The frozen
threshold accepts rows `[0,1,9,10]`; one round has ideal accepted mass one for
this 16-row table. Its seeded 4,096-shot sample also stays in those four rows.
This table result is not Wanda's image-localization accuracy.
See [the complete local report](local-validation.json) and
[package checksums](package-manifest.json).

## Artwork and license

The fixture PNGs use original AI-generated Wanda/Festival/Beach artwork created
for this project with the built-in image-generation tool. They are native
composite renderings; the blue-striped scene is an explicit distractor variant.
See the included `artwork-provenance.json` and `generation-prompts.json` for
source disclosure. No public-domain or Creative Commons status is asserted for
generated artwork. Preserve these records when distributing the fixtures.

Original application code is MIT-licensed; see `LICENSE`. Nothing in this
package publishes contest materials or runs a remote quantum service.
