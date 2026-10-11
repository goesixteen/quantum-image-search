"""Where's Wanda: a trained quantum neural network steering a Grover search.

What this program does
----------------------
Finding a character in a crowded picture is a search problem: look at every
region and ask "is she here?". This project answers that question with two
quantum circuits, both built with Qiskit:

1. **Classifier (4 qubits).** A variational quantum neural network (QNN)
   reads eight colour and shape features of one image window and outputs a
   score between 0 and 1 for "this window shows Wanda". Its 32 rotation
   angles were trained beforehand and are loaded from ``model.json``.
2. **Search (4 qubits for 16 windows).** Every window whose score passes the
   frozen threshold becomes a "marked" address. A Grover circuit (phase
   oracle plus diffusion) amplifies the probability of measuring those
   addresses, and one measured job is run on the selected backend.

Pipeline::

    scene.json features --> QNN circuit (exact statevector) --> 7 Pauli-Z expectations
        --> classical readout + sigmoid --> score >= threshold? --> marked addresses
        --> Grover circuit (oracle + diffuser) x k --> measure on `backend` --> counts

Running it
----------
* **On Qollab:** the runtime injects a global ``backend`` (the simulator or QPU
  chosen in the Select QPU dialog) and automatically calls ``main()`` after
  loading this file. ``shots`` and ``iterations`` appear as Run settings.
* **Locally:** ``python main.py --shots 2048`` uses Qiskit's ``BasicSimulator``.

Design constraints
------------------
* **One backend job per run.** IonQ's simulators and QPUs reject a second job
  in the same run, so the QNN is evaluated with local exact statevectors (no
  jobs) and only the single measured Grover circuit is submitted.
* **Honest scope.** The oracle is *compiled* from classical threshold
  decisions; this is not a coherent QNN-inside-the-oracle circuit and does
  not demonstrate a quantum speed-up. The 16 rows come from several test
  scenes, so the addresses index a feature table, not regions of one image.
* **Labels are used only for grading.** Ground-truth labels in ``scene.json``
  are read only after scoring, oracle construction and sampling.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.providers.basic_provider import BasicSimulator
from qiskit.quantum_info import Statevector

# Directory that holds the data files. Qollab runs with the project root as the
# working directory, so the cwd fallback in `load_data` also covers runtimes
# where `__file__` is undefined.
HERE = Path(__file__).resolve().parent if '__file__' in globals() else Path('.')

# The feature contract the frozen model was trained on. A model trained on a
# different feature extractor would silently give meaningless scores, so it is
# rejected instead.
FEATURE_VERSION = 'wanda-window-v1'
# Each value is in [0, 1] and is computed classically from the image pixels by
# ../model/wanda_features.py (and its JS twin dist/wanda-localizer.js); the
# saved values live in scene.json.
FEATURE_NAMES = [
    'sweater_stripe_fourier',        # Fourier strength of red/white stripes at Wanda's stripe spacing
    'sweater_cross_phase',           # left and right torso halves show stripes in the same phase
    'sweater_red_white_balance',     # torso has both red and white (geometric mean of coverage)
    'warm_face_brown_hair',          # skin-tone head ringed by dark hair
    'blue_trouser_morphology',       # two blue leg lobes with a gap between them
    'body_horizontal_alignment_px',  # red/blue mass is centred in the window horizontally
    'body_vertical_alignment_px',    # red above and blue below at the expected offsets
    'supplied_wanda_height',         # supplied character height, (h - 40) / 24
]

QNN_QUBITS = 4
QNN_LAYERS = 4
ENTANGLER_RING = ((0, 1), (1, 2), (2, 3), (3, 0))  # CNOT ring, applied every layer


# ---------------------------------------------------------------------------
# Loading and validating saved data
# ---------------------------------------------------------------------------

def load_data(filename):
    """Load a JSON file shipped with the project.

    Call this with a plain string literal (for example ``load_data('model.json')``):
    Qollab only bundles data files whose names appear as plain strings in the code.
    """
    for file in (HERE / filename, Path(filename)):
        if file.is_file():
            return json.loads(file.read_text())
    raise FileNotFoundError('Missing saved local project file: ' + filename)


def validate_model(model):
    """Reject a model that does not match the circuit this file builds."""
    if model.get('featureVersion') != FEATURE_VERSION or model.get('featureNames') != FEATURE_NAMES:
        raise ValueError('Expected the current fine-window QNN feature contract.')
    if (model.get('qubits') != QNN_QUBITS or model.get('layers') != QNN_LAYERS
            or np.asarray(model['theta']).shape != (32,) or np.asarray(model['readout']).shape != (7,)):
        raise ValueError('Expected four qubits, four layers, 32 circuit angles and seven readouts.')
    values = [*model['theta'], *model['readout'], model['bias'], model['threshold']]
    if not np.isfinite(values).all() or not 0 <= model['threshold'] <= 1:
        raise ValueError('Model values must be finite; threshold must be within 0..1.')


# ---------------------------------------------------------------------------
# Stage 1: the quantum neural network classifier
# ---------------------------------------------------------------------------

def qnn_circuit(features, model):
    """Build the 4-qubit, 4-layer QNN circuit for one image window.

    Each layer has three parts:

    * **Data re-uploading.** Feature ``x[q]`` sets ``RY(pi*x[q])`` and feature
      ``x[q+4]`` sets ``RZ(pi*x[q+4])`` on qubit ``q``. Encoding the input again
      in every layer makes the model more expressive than encoding it once.
    * **Trainable rotations.** One learned ``RY`` and one learned ``RZ`` angle
      per qubit (8 per layer, 32 in total, read from ``model['theta']``).
    * **Entanglement.** A CNOT ring ``0->1->2->3->0`` so features on different
      qubits can interact (for example stripes *and* blue trousers together).
    """
    validate_model(model)
    values = np.asarray(features, dtype=float)
    if values.shape != (8,) or not np.isfinite(values).all() or np.any(values < 0) or np.any(values > 1):
        raise ValueError('Expected eight finite features within 0..1.')
    circuit = QuantumCircuit(QNN_QUBITS, name='Wanda QNN')
    p = 0  # index of the next trainable angle in model['theta']
    for _ in range(QNN_LAYERS):
        for q in range(QNN_QUBITS):
            circuit.ry(math.pi * values[q], q)
            circuit.rz(math.pi * values[q + 4], q)
        for q in range(QNN_QUBITS):
            circuit.ry(model['theta'][p], q)
            circuit.rz(model['theta'][p + 1], q)
            p += 2
        for control, target in ENTANGLER_RING:
            circuit.cx(control, target)
    return circuit


def quantum_readout(features, model):
    """Return the seven Pauli-Z expectation values the classifier reads out.

    The observables are ``Z0, Z1, Z2, Z3, Z0Z1, Z2Z3, Z0Z1Z2Z3``. All of them are
    diagonal in the computational basis, so each is a weighted sum of the 16
    basis-state probabilities: a basis state contributes +1 when its selected
    bits have even parity and -1 when odd. The exact statevector is used so no
    backend job is spent here (see "One backend job per run" above).
    """
    probabilities = Statevector.from_instruction(qnn_circuit(features, model)).probabilities()
    indices = np.arange(2 ** QNN_QUBITS)
    # z[q][i] is the eigenvalue of Z on qubit q for basis state i (+1 if bit q is 0).
    z = np.asarray([np.where(indices & (1 << q), -1., 1.) for q in range(QNN_QUBITS)])
    observables = np.asarray([*z, z[0] * z[1], z[2] * z[3], np.prod(z, axis=0)])
    return observables @ probabilities


def predict(features, model):
    """Score one window: a learned linear readout of the expectations, then a sigmoid.

    The logit is clipped to [-40, 40] so ``exp`` cannot overflow; the clipping
    does not change any score at double precision.
    """
    logit = float(quantum_readout(features, model) @ np.asarray(model['readout']) + model['bias'])
    return 1 / (1 + math.exp(-max(-40., min(40., logit))))


def learned_marks(scores, threshold):
    """Addresses whose score meets the frozen threshold.

    The website also suppresses nearby duplicate detections (non-maximum
    suppression). That step is skipped here because the 16 fixture rows come
    from different scenes, so "nearby" has no meaning between them.
    """
    return [i for i, score in enumerate(scores) if score >= threshold]


# ---------------------------------------------------------------------------
# Stage 2: Grover search over the marked addresses
# ---------------------------------------------------------------------------

def recommend_iterations(N, M):
    """Number of Grover rounds that maximises the chance of measuring a marked address.

    With ``M`` marked items out of ``N``, each round rotates the state by
    ``2*theta`` where ``sin(theta) = sqrt(M/N)``, and after ``k`` rounds the
    success probability is ``sin^2((2k+1)*theta)``. The ideal real-valued ``k``
    is ``pi/(4*theta) - 1/2``; the better of its floor and ceiling is returned.
    With no marks (or all marks) amplification cannot help, so 0 is returned.
    """
    if not isinstance(N, int) or N < 2 or N & (N - 1):
        raise ValueError('N must be a power of two, at least two.')
    if not isinstance(M, int) or not 0 <= M <= N:
        raise ValueError('M must be an integer within 0..N.')
    if M in (0, N):
        return 0
    theta = math.asin(math.sqrt(M / N))
    ideal = math.pi / (4 * theta) - .5
    lower, upper = max(0, math.floor(ideal)), math.ceil(ideal)
    upper_is_better = math.sin((2 * upper + 1) * theta) ** 2 > math.sin((2 * lower + 1) * theta) ** 2 + 1e-14
    return upper if upper_is_better else lower


def phase_all_ones(circuit):
    """Flip the sign of the |11...1> state only (a multi-controlled Z).

    Built as H . multi-controlled-X . H on the last qubit, which equals a
    multi-controlled Z and transpiles to any backend's native gate set.
    """
    target = circuit.num_qubits - 1
    if target == 0:
        circuit.z(0)
    else:
        circuit.h(target)
        circuit.mcx(list(range(target)), target)
        circuit.h(target)


def phase_oracle(qubits, marks):
    """Phase oracle that multiplies each marked address by -1.

    For each marked index, X gates temporarily map that index to |11...1>
    (on the qubits where its bit is 0), the all-ones phase flip is applied, and
    the X gates are undone. Qubit ``q`` holds bit ``q`` of the address
    (little-endian, matching Qiskit's bit ordering).
    """
    if not isinstance(qubits, int) or qubits < 1:
        raise ValueError('Positive search-qubit count required.')
    circuit = QuantumCircuit(qubits, name='Compiled QNN predicate')
    for index in sorted(set(marks)):
        if not isinstance(index, int) or not 0 <= index < 2 ** qubits:
            raise ValueError('Invalid marked address.')
        zero = [q for q in range(qubits) if not index & (1 << q)]
        if zero:
            circuit.x(zero)
        phase_all_ones(circuit)
        if zero:
            circuit.x(zero)
    return circuit


def diffuser(qubits):
    """Grover diffusion operator ``2|s><s| - I`` (reflection about the uniform state).

    H.X . (phase flip of |11...1>) . X.H gives ``I - 2|s><s|``; the global phase
    of pi turns it into ``2|s><s| - I``. The global phase does not change any
    measurement outcome, but it makes the exact matrix tests line up.
    """
    circuit = QuantumCircuit(qubits, name='Diffusion')
    circuit.h(range(qubits))
    circuit.x(range(qubits))
    phase_all_ones(circuit)
    circuit.x(range(qubits))
    circuit.h(range(qubits))
    circuit.global_phase = math.pi
    return circuit


def grover_circuit(N, marks, iterations=None, measure=False):
    """Full Grover search: uniform superposition, then ``iterations`` x (oracle, diffuser).

    ``iterations=None`` uses :func:`recommend_iterations`. With ``measure=True``
    every search qubit is measured into a classical bit.
    """
    marks = sorted(set(marks))
    steps = recommend_iterations(N, len(marks)) if iterations is None else iterations
    if not isinstance(steps, int) or steps < 0:
        raise ValueError('Iterations must be a nonnegative integer.')
    qubits = int(math.log2(N))
    circuit = QuantumCircuit(qubits, qubits if measure else 0, name='Wanda learned predicate search')
    circuit.h(range(qubits))
    oracle = phase_oracle(qubits, marks).to_gate()
    diffusion = diffuser(qubits).to_gate()
    for _ in range(steps):
        circuit.append(oracle, range(qubits))
        circuit.append(diffusion, range(qubits))
    if measure:
        circuit.measure(range(qubits), range(qubits))
    return circuit


# ---------------------------------------------------------------------------
# End-to-end run
# ---------------------------------------------------------------------------

def run_demo(selected_backend=None, shots=2048, verbose=True, *, model=None, scene=None, iterations=None):
    """Score every window, build the oracle, run ONE measured Grover job, return a report.

    ``selected_backend`` defaults to Qollab's injected global ``backend``, then to
    Qiskit's local ``BasicSimulator``. ``model``/``scene`` default to the saved
    files and can be replaced by tests. Returns a JSON-serialisable dict.
    """
    if not isinstance(shots, int) or shots <= 0:
        raise ValueError('Shots must be a positive integer.')
    model = model if model is not None else load_data('model.json')
    scene = scene if scene is not None else load_data('scene.json')
    values = scene['features']
    N = len(values)
    recommend_iterations(N, 0)  # validates that N is a power of two before any work

    # Stage 1: classify every window with the QNN (local statevectors, no jobs).
    scores = [predict(feature, model) for feature in values]
    marks = learned_marks(scores, model['threshold'])

    # Stage 2: build the Grover circuit from the learned marks.
    recommended = recommend_iterations(N, len(marks))
    steps = recommended if iterations is None else iterations
    ideal = Statevector.from_instruction(grover_circuit(N, marks, steps)).probabilities()
    measured = grover_circuit(N, marks, steps, measure=True)

    selected_backend = selected_backend if selected_backend is not None else globals().get('backend')
    selected_backend = selected_backend if selected_backend is not None else BasicSimulator()
    compiled = transpile(measured, selected_backend, optimization_level=1)
    # Exactly one job containing exactly one measured circuit (IonQ allows one job per run).
    counts = selected_backend.run(compiled, shots=shots).result().get_counts()
    numeric = {int(bits.replace(' ', ''), 2): int(count) for bits, count in counts.items()}
    total = sum(numeric.values())

    # Labels enter only here, after prediction, oracle construction and backend sampling.
    labels = scene.get('evaluationLabels')
    true_indices = [] if labels is None else [i for i, y in enumerate(labels) if y == 1]
    if labels is not None and len(labels) != N:
        raise ValueError('Evaluation labels must match saved candidate count.')

    name = getattr(selected_backend, 'name', type(selected_backend).__name__)
    name = name() if callable(name) else name  # older providers expose name() as a method

    report = dict(
        project="Where's Wanda Qiskit companion",
        execution='local SDK validation; live Qollab/IonQ unverified',
        modelName=model.get('name', 'saved QNN'),
        featureVersion=model['featureVersion'],
        classifierQubits=QNN_QUBITS,
        searchQubits=int(math.log2(N)),
        candidates=N,
        qnnStatevectorEvaluations=N,
        coherentQNNOracle=False,
        # 32 circuit angles + 7 readout weights + 1 bias. The final RZ of each qubit
        # (slots 25, 27, 29, 31) comes after the last rotations, so it changes only
        # phases and cannot affect the diagonal Z readout.
        exportedParameterSlots=40,
        predictionActiveSlots=36,
        inactiveFinalRZSlots=[25, 27, 29, 31],
        scores=scores,
        threshold=model['threshold'],
        learnedMarkedIndices=marks,
        recommendedIterations=recommended,
        iterations=steps,
        idealDistribution=ideal.tolist(),
        idealPredicateMass=float(ideal[marks].sum()) if marks else 0.,
        idealTrueLabelMass=(float(ideal[true_indices].sum()) if marks else 0.) if labels is not None else None,
        emptyOraclePolicy='backend uniform diagnostic counts retained; no locations reported when accepted set is empty',
        # Every sampled row is reported, marked or not: no post-selection of "good" answers.
        reportedRowCounts={str(i): count for i, count in numeric.items()} if marks else {},
        observedPredicateFraction=sum(numeric.get(i, 0) for i in marks) / total if total else 0.,
        observedTrueLabelFraction=(sum(numeric.get(i, 0) for i in true_indices) / total
                                   if marks and total else 0.) if labels is not None else None,
        counts=dict(counts),
        shots=total,
        backend=str(name),
        backendJobsSubmitted=1,
        circuitsInJob=1,
        transpiledDepth=compiled.depth(),
        transpiledGateCounts=dict(compiled.count_ops()),
        oracleConstruction='local Qiskit QNN expectations + classical sigmoid/threshold; compiled phase-flip oracle on fixture rows',
        scope=scene.get('scope', 'saved feature-table quantum circuit example, not full image search'),
    )
    if verbose:
        print_summary(report, model, scene, measured)
        print('\nFull JSON report:')
        print(json.dumps(report, indent=2))
    return report


def print_summary(report, model, scene, measured):
    """Print a short, human-readable explanation of the run before the full JSON."""
    labels = scene.get('evaluationLabels')
    marks = set(report['learnedMarkedIndices'])
    print("Where's Wanda: QNN classifier + Grover search")
    print('=' * 46)
    print(f"Backend: {report['backend']}    shots: {report['shots']}")
    print('\nStage 1: QNN circuit for window 0 (the same circuit runs for every window):')
    print(qnn_circuit(scene['features'][0], model).draw(output='text', fold=110))
    print(f"\nScores (threshold {report['threshold']:.4f}):")
    print('  row  score    marked  label')
    for i, score in enumerate(report['scores']):
        label = '' if labels is None else ('Wanda' if labels[i] == 1 else '-')
        print(f"  {i:>3}  {score:.4f}   {'yes' if i in marks else 'no':<6}  {label}")
    print(f"\nStage 2: Grover search, {report['iterations']} round(s) "
          f"(recommended {report['recommendedIterations']}) on {report['searchQubits']} qubits:")
    print(measured.draw(output='text', fold=110))
    print('\nMeasured counts by row (# = 2% of shots):')
    total = report['shots'] or 1
    numeric = {int(bits.replace(' ', ''), 2): c for bits, c in report['counts'].items()}
    for i in range(report['candidates']):
        share = numeric.get(i, 0) / total
        flag = '  <- marked' if i in marks else ''
        print(f"  row {i:>2} {numeric.get(i, 0):>6}  {'#' * round(share * 50)}{flag}")
    print(f"\nIdeal chance of measuring a marked row: {report['idealPredicateMass']:.3f}; "
          f"observed: {report['observedPredicateFraction']:.3f}")
    if report['observedTrueLabelFraction'] is not None:
        print(f"Observed fraction landing on a true Wanda row: {report['observedTrueLabelFraction']:.3f}")


# The `def main(` line must stay on one line with int/float/str/bool annotations:
# Qollab parses it to build the Run settings form and then calls main() itself.
def main(shots: int = 2048, iterations: int = -1):
    """Qollab entry point. ``iterations = -1`` uses the recommended number of Grover rounds."""
    return run_demo(shots=shots, iterations=None if iterations < 0 else iterations)


# Local command-line use only. On Qollab the injected `backend` global exists and the
# runtime calls main() itself, so calling it here too would submit a second job.
if __name__ == '__main__' and 'backend' not in globals():
    parser = argparse.ArgumentParser(description="Run the Where's Wanda QNN + Grover demo locally.")
    parser.add_argument('--shots', type=int, default=2048, help='measurement shots (default 2048)')
    parser.add_argument('--iterations', type=int, help='Grover rounds (default: recommended)')
    options = parser.parse_args()
    run_demo(shots=options.shots, iterations=options.iterations)
