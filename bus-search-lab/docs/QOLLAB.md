# Qollab runnable Quantum CAPTCHA core

**Current instruction: keep iterating without submitting work.** This package remains locally tested. Do not upload it to Qollab or publish a public project/source/video without a later explicit human instruction. The platform setup below documents a future authorized run; local SDK validation may continue.

The `qollab/` folder is a self-contained Qiskit project sample. It uses the saved
trained model, evaluates its quantum circuit locally, compiles the learned marked
set into a gate-based oracle, and submits one measured Grover circuit. It is
separate from the companion interactive HTML demo.

## Upload shape and entry point

For a future explicitly authorized platform run, the **contents** of `qollab/` belong in the project's top-level file tree:

```text
main.py                  runnable entry point
model.json               frozen trained parameters and model metadata
scene.json               saved synthetic patch features
requirements.txt         Qiskit / NumPy dependency ranges
README.md                project explanation
test_qiskit.py           local validation source
local-validation.json    saved local experiment evidence
```

Qollab recognizes a top-level `main.py` as a Python project. A `main.py` inside a
folder does not create an entry point. If top-level `index.html` and `main.js` are
also present, Qollab selects a JS project instead. Keep this Python sample's entry
point at the top level. [Official runtime
documentation](https://qollab.xyz/learn/docs/runtime-environment).

The runtime creates a global `backend` in `main.py` from the runner's selected
compute instance. The script uses it directly and only falls back to
`BasicSimulator` when executed locally without that global. The standard result
path is `job.result().get_counts()`. [Official Python/Qiskit
example](https://qollab.xyz/learn/docs/python-qiskit-projects),
[Qiskit BasicProvider](https://quantum.cloud.ibm.com/docs/en/api/qiskit/providers_basic_provider).

The entry signature is deliberately on one line, with supported primitive types:

```python
def main(bus_tile: int = 11, shots: int = 2048):
```

This supplies **Bus Tile** and **Shots** fields in Qollab's Run settings. Use a
row-major tile index 0–15; -1 creates a no-bus feature scene. Qollab automatically
calls a supported `main()` after loading the script. The local execution guard
therefore checks whether Qollab's `backend` global exists, avoiding an automatic
second call. [Entry-point rules](https://qollab.xyz/learn/docs/runtime-environment).

## Model and circuit flow

1. Load packaged parameters and synthetic scene features; no network request is
   needed.
2. Construct the actual trained QNN with Qiskit `Ry`, `Rz`, and CNOT gates for
   every candidate's feature vector.
3. Evaluate its seven expectation values with Qiskit's exact `Statevector`, then
   apply the saved classical readout and sigmoid.
4. Threshold these scores to produce the learned marked set. The known placement
   is used to generate the synthetic input and grade the outcome; the marked set
   comes from inference.
5. Build a four-qubit uniform search circuit. For every marked index, X gates on
   its zero bits surround a multi-controlled Z phase. Each Grover iteration
   applies that oracle and the diffuser.
6. Transpile for the supplied backend, submit the circuit once, and measure all
   search qubits once per shot.

The report labels exact ideal probabilities separately from measured shot
fractions. It reports both marked-set success and the known bus-tile fraction,
which could differ if the learned predicate has errors. A no-bus case with no
marks explicitly reports that uniform measurement outcomes are not detections.

The example's feature vectors are compiled synthetic inputs. Its Bus Tile field
moves the saved bus feature vector among candidate cells. It does not read or
classify a newly uploaded image on Qollab. The companion interactive site handles
pixel-based feature extraction and dragging; this core provides a compact
judge-runnable Qiskit experiment.

The learned oracle remains classically constructed from all-region scores. This
is a valid conditioned Grover simulation, not a coherent implementation of the
sigmoid threshold and not an end-to-end runtime speedup. The independent coherent
raw-event appendix is described in `COHERENT_PROTOTYPE.md`.

## One job per run

There is exactly one call to

```python
job = selected_backend.run(compiled, shots=shots)
```

and it receives one circuit. Local statevector checks and QNN inference do not
submit backend jobs. This meets the documented IonQ one-job-per-run structure;
the built-in local simulator supports multiple jobs but this core does not need
them. [Qollab backend limits](https://qollab.xyz/learn/docs/compute-backends).

Shots are final measurements, not extra Grover iterations. Changing the shot
count estimates the same circuit distribution more precisely; changing Bus Tile
rebuilds the learned predicate. IonQ runs may have a noise model, so compare their
measured distribution with the separately printed ideal prediction.

## Local verification

Verified with **Qiskit 2.5.2** and NumPy in the work-step virtual environment:

```powershell
python -m unittest discover -s qollab -p test_qiskit.py -v
```

Six focused tests passed. They compare the phase oracle and diffuser with
independent dense matrices; compare Grover curves for `N=16,64` and `M=1,2,4`
against the analytic success formula including overshoot; exercise trained
positive and background inference; count backend calls; test an absent bus; and
emulate Qollab's load-then-auto-call entry-point flow. The emulation proves that
loading the script submits no job when `backend` is injected, and calling
`main()` submits exactly one.

Saved local result: a bus at tile 11 produces the learned marked set `[11]` and
three oracle calls. Ideal marked probability is **96.13189697%**. With the
recorded seeded 2,048-shot local run, 1,993 outcomes are `1011`, giving
**97.31445313%** observed marked fraction. The difference is finite-shot sampling
variation, not a different model accuracy. The evidence is stored in
`qollab/local-validation.json`.

The QNN parameters and features in this folder are frozen snapshots of the model
export. `scene.json` records both source SHA-256 hashes. If the model is retrained,
refresh the packaged data and rerun validation before shipping it.

## Remaining platform check

The code follows Qollab's current official interface and has been tested locally,
including injected-backend emulation. It has **not yet been run in a live Qollab
project**. This check is deferred under the no-submission instruction. If the
human later authorizes a platform run, verify the top-level tree, settings form,
counts, transpilation, and one-job behavior on the selected simulator. Record
actual live evidence before describing the project as platform-tested. This is
not an automatic next-step instruction.

No API keys are needed inside the source. The platform's runner supplies its
configured backend. Preserve `model.json` and `scene.json` as project files:
Qollab run-to-run state is not persistent. [Runtime data and backend
rules](https://qollab.xyz/learn/docs/runtime-environment),
[hackathon FAQ](https://qollab.xyz/programs/hackathon/how-it-works#faq).

The competition requires a public, runnable Qiskit Qollab project, a public
2–3-minute demo, and disclosure of reused work. The current event's submission
deadline is October 11, 2026, at 19:00 Eastern. The sample README supplies a
starting project description; publication and the demo video remain separate
deliverables. [Official hackathon
information](https://qollab.xyz/programs/hackathon/how-it-works).
