"""Quantum CAPTCHA: learned schoolbus predicate + Qiskit Grover search.

Qollab pre-creates `backend` with the compute instance selected in its Run UI.
Locally this file falls back to Qiskit's built-in BasicSimulator. Exactly one
backend.run call is made, containing one measured search circuit.

The saved QNN is evaluated with local exact Qiskit statevectors before compiling
the search oracle. This demonstrates a hybrid learned predicate, not coherent
sigmoid thresholding or a measured end-to-end quantum speedup.
"""
import json
import math
from pathlib import Path

import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.quantum_info import Statevector
from qiskit.providers.basic_provider import BasicSimulator

# Edit this index (row-major 0..15) and press Run to move the synthetic bus.
# None gives a no-bus scene. The separate interactive site supports image dragging.
BUS_TILE = 11
SHOTS = 2048

HERE = Path(__file__).resolve().parent if '__file__' in globals() else Path('.')


def load_data(filename: str) -> dict:
    for path in [HERE / filename, Path(filename)]:
        if path.is_file():
            return json.loads(path.read_text())
    raise FileNotFoundError(f'Upload {filename} alongside main.py as a Qollab project file.')


def qnn_circuit(features, model: dict) -> QuantumCircuit:
    features = np.asarray(features, dtype=float)
    theta = np.asarray(model['theta'], dtype=float)
    if features.shape != (8,) or not np.all(np.isfinite(features)):
        raise ValueError('Expected eight finite feature values.')
    if model['qubits'] != 4 or len(theta) != 8 * model['layers']:
        raise ValueError('Expected the four-qubit exported QNN architecture.')
    circuit = QuantumCircuit(4, name='BusPatch-QNN')
    parameter = 0
    for _ in range(model['layers']):
        for qubit in range(4):
            circuit.ry(math.pi * features[qubit], qubit)
            circuit.rz(math.pi * features[qubit + 4], qubit)
        for qubit in range(4):
            circuit.ry(theta[parameter], qubit)
            circuit.rz(theta[parameter + 1], qubit)
            parameter += 2
        for control, target in [(0, 1), (1, 2), (2, 3), (3, 0)]:
            circuit.cx(control, target)
    return circuit


def predict(features, model: dict) -> float:
    distribution = Statevector.from_instruction(qnn_circuit(features, model)).probabilities()
    basis = np.arange(16)
    z = np.array([np.where(basis & (1 << q), -1, 1) for q in range(4)])
    observables = np.array([*z, z[0] * z[1], z[2] * z[3], z.prod(axis=0)])
    expectations = observables @ distribution
    logit = float(expectations @ np.asarray(model['readout']) + model['bias'])
    return 1 / (1 + math.exp(-max(-40.0, min(40.0, logit))))


def recommend_iterations(N: int, M: int) -> int:
    if N < 2 or not isinstance(N, int) or N & (N - 1):
        raise ValueError('N must be a power of two, at least two.')
    if not isinstance(M, int) or not 0 <= M <= N:
        raise ValueError('M must be an integer between 0 and N.')
    if M in (0, N):
        return 0
    theta = math.asin(math.sqrt(M / N))
    ideal = math.pi / (4 * theta) - 0.5
    lower, upper = max(0, math.floor(ideal)), math.ceil(ideal)
    p = lambda k: math.sin((2 * k + 1) * theta) ** 2
    return upper if p(upper) > p(lower) + 1e-14 else lower


def phase_on_all_ones(circuit: QuantumCircuit) -> None:
    target = circuit.num_qubits - 1
    if target == 0:
        circuit.z(0)
    else:
        circuit.h(target)
        circuit.mcx(list(range(target)), target)
        circuit.h(target)


def phase_oracle(qubits: int, marks) -> QuantumCircuit:
    circuit = QuantumCircuit(qubits, name='Learned phase oracle')
    for index in sorted(set(marks)):
        if not isinstance(index, int) or not 0 <= index < 2 ** qubits:
            raise ValueError('Marked index must fit inside the register.')
        zero_bits = [q for q in range(qubits) if not (index & (1 << q))]
        if zero_bits:
            circuit.x(zero_bits)
        phase_on_all_ones(circuit)
        if zero_bits:
            circuit.x(zero_bits)
    return circuit


def diffuser(qubits: int) -> QuantumCircuit:
    circuit = QuantumCircuit(qubits, name='Inversion about mean')
    circuit.h(range(qubits))
    circuit.x(range(qubits))
    phase_on_all_ones(circuit)
    circuit.x(range(qubits))
    circuit.h(range(qubits))
    # H X MCZ X H = I - 2|s><s|; global phase pi gives the exact D convention.
    circuit.global_phase = math.pi
    return circuit


def grover_circuit(N: int, marks, iterations: int | None = None, measure: bool = True) -> QuantumCircuit:
    marks = sorted(set(marks))
    default = recommend_iterations(N, len(marks))
    qubits = int(math.log2(N))
    steps = default if iterations is None else iterations
    if not isinstance(steps, int) or steps < 0:
        raise ValueError('Iterations must be a nonnegative integer.')
    circuit = QuantumCircuit(qubits, qubits if measure else 0, name='Quantum CAPTCHA')
    circuit.h(range(qubits))
    oracle_gate = phase_oracle(qubits, marks).to_gate()
    diffusion_gate = diffuser(qubits).to_gate()
    for _ in range(steps):
        circuit.append(oracle_gate, range(qubits))
        circuit.append(diffusion_gate, range(qubits))
    if measure:
        circuit.measure(range(qubits), range(qubits))
    return circuit


def scene_features(scene: dict, bus_tile: int | None):
    N = scene['gridSide'] ** 2
    background = scene['backgroundFeatures']
    features = [background[index % len(background)] for index in range(N)]
    if bus_tile is not None:
        if not isinstance(bus_tile, int) or not 0 <= bus_tile < N:
            raise ValueError(f'Bus tile must be None or an integer in 0..{N-1}.')
        features[bus_tile] = scene['busFeatures']
    return features


def run_demo(selected_backend=None, bus_tile: int | None = BUS_TILE, shots: int = SHOTS, verbose: bool = True) -> dict:
    if not isinstance(shots, int) or shots <= 0:
        raise ValueError('Shots must be a positive integer.')
    model, scene = load_data('model.json'), load_data('scene.json')
    N = scene['gridSide'] ** 2
    features = scene_features(scene, bus_tile)
    scores = [predict(feature, model) for feature in features]
    marks = [index for index, score in enumerate(scores) if score >= model['threshold']]
    iterations = recommend_iterations(N, len(marks))
    exact_circuit = grover_circuit(N, marks, iterations, measure=False)
    ideal_distribution = Statevector.from_instruction(exact_circuit).probabilities()
    expected_success = float(sum(ideal_distribution[index] for index in marks))
    measured_circuit = grover_circuit(N, marks, iterations, measure=True)
    if selected_backend is None:
        selected_backend = globals().get('backend')
    if selected_backend is None:
        selected_backend = BasicSimulator()
    compiled = transpile(measured_circuit, selected_backend, optimization_level=1)
    # Single job, single circuit: preserves Qollab's IonQ one-job-per-run limit.
    job = selected_backend.run(compiled, shots=shots)
    counts = job.result().get_counts()
    count_by_index = {int(label.replace(' ', ''), 2): int(count) for label, count in counts.items()}
    observed_shots = sum(count_by_index.values())
    observed_marked = sum(count_by_index.get(index, 0) for index in marks)
    backend_name = getattr(selected_backend, 'name', type(selected_backend).__name__)
    if callable(backend_name):
        backend_name = backend_name()
    report = dict(
        project='Quantum CAPTCHA',
        backend=str(backend_name),
        model_name=model['name'],
        model_layers=model['layers'],
        regions=N,
        qubits=int(math.log2(N)),
        bus_tile_for_evaluation=bus_tile,
        qnn_scores=scores,
        threshold=model['threshold'],
        learned_marked_indices=marks,
        ideal_oracle_calls=iterations,
        ideal_marked_probability=expected_success,
        ideal_distribution=ideal_distribution.tolist(),
        observed_shots=observed_shots,
        observed_marked_fraction=observed_marked / observed_shots if observed_shots else 0,
        observed_bus_tile_fraction=None if bus_tile is None or not observed_shots else count_by_index.get(bus_tile, 0) / observed_shots,
        counts=dict(counts),
        backend_jobs_submitted=1,
        circuits_in_job=1,
        transpiled_depth=compiled.depth(),
        transpiled_gate_counts=dict(compiled.count_ops()),
        oracle_construction='local exact Qiskit QNN expectations + classical sigmoid threshold; compiled phase oracle',
    )
    if verbose:
        print('Quantum CAPTCHA — trained QNN + Grover search')
        print(f'Backend: {backend_name}; {N} regions; {report["qubits"]} search qubits')
        print(f'Learned marked regions: {marks}; threshold: {model["threshold"]:.3f}')
        print(f'Ideal Grover oracle calls: {iterations}; ideal marked probability: {expected_success:.6f}')
        print(f'Observed marked fraction: {report["observed_marked_fraction"]:.6f} from {observed_shots} shots')
        if not marks:
            print('No region passed the QNN threshold; the sampled uniform outcomes are not bus detections.')
        print('QNN inference and oracle compilation run classically before the one measured circuit job.')
        print(measured_circuit.draw(output='text', fold=100))
        print(json.dumps(report, indent=2))
    return report


def main(bus_tile: int = 11, shots: int = 2048):
    """Qollab calls this once and creates Bus Tile / Shots fields in Run settings."""
    return run_demo(bus_tile=None if bus_tile == -1 else bus_tile, shots=shots)


# Qollab automatically invokes main() after loading main.py; do not run it twice.
if __name__ == '__main__' and 'backend' not in globals():
    main()
