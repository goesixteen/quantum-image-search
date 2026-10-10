# Quantum CAPTCHA

**Current project instruction: iterate without submitting.** Keep this package
and SDK validation local. Qollab uploads and public project/source/video
publication are withheld unless the user later explicitly authorizes them.

A trained four-qubit QNN scores schoolbus-containing image-patch features. A
Qiskit circuit applies Grover amplitude amplification to the learned positive
regions of a 4-by-4 synthetic CAPTCHA.

For a future explicitly authorized platform run, place **the contents of this
folder** at the top level of a Qollab project, with
`main.py`, `model.json`, `scene.json`, and `requirements.txt` together. Press Run,
choose the built-in free simulator, and set **Bus Tile** from 0 to 15. Tile indices
are row-major. Set it to -1 for a scene without the bus. **Shots** controls the
number of final measurements.

The runtime supplies `backend`. This entry point submits exactly one circuit in
one backend job, so the same code follows IonQ's one-job-per-run constraint. No
API keys, sign-in inside the code, or network downloads are required.

The QNN is evaluated with exact local Qiskit statevectors before its sigmoid
scores are classically thresholded into a phase oracle. Grover's interference is
then simulated by a real Qiskit gate circuit. The quantum circuit amplifies this
fixed learned predicate; the example does not claim faster image processing than
classical inference.

The saved example gives one learned mark and three Grover iterations. Its ideal
marked-outcome probability is 96.1319%, starting from 6.25%. Finite-shot output
varies. This probability concerns the provided learned predicate, rather than an
overall model accuracy measurement.

This Qollab core uses saved feature vectors generated from synthetic patches. The
companion web demo handles image dragging and feature extraction; the Qollab core
is a compact, independently runnable quantum experiment.

Local validation with Qiskit 2.5.2: six focused tests passed, including independent
oracle/diffuser matrix checks, 16/64-region curves, the trained predicate,
no-bus behavior, one-job accounting, and emulation of Qollab's automatic `main()`
entry point. A live Qollab Run is unverified and deferred under the current
instruction; local testing is not a claim of platform execution.

To run locally:

```sh
python -m pip install -r requirements.txt
python main.py
python -m unittest test_qiskit.py -v
```

Project source is original implementation made during the October 9–11, 2026
build window with AI-assisted engineering. Grover search and amplitude
amplification are established algorithms; they are credited in the full project
science notes. Saved model parameters were trained on generated synthetic
patches, not on real schoolbus photographs. See the repository's MIT license and
the full project documentation for reproducibility and limitations.
