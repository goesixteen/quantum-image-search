"""Local Where's Wanda: genuine Qiskit QNN and compiled Grover predicate.

QNN expectations run in local exact statevectors. The classical sigmoid,
threshold and optional peak suppression compile marks; exactly one measured
Grover circuit is submitted in one backend job. No coherent sigmoid threshold,
live Qollab verification, hardware speedup or image-recognition advantage claim.
"""
from __future__ import annotations
import argparse
import json
import math
from pathlib import Path
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.quantum_info import Statevector
from qiskit.providers.basic_provider import BasicSimulator

HERE = Path(__file__).resolve().parent if '__file__' in globals() else Path('.')
FEATURE_VERSION = 'wanda-window-v1'
FEATURE_NAMES = ['sweater_stripe_fourier', 'sweater_cross_phase', 'sweater_red_white_balance', 'warm_face_brown_hair', 'blue_trouser_morphology', 'body_horizontal_alignment_px', 'body_vertical_alignment_px', 'supplied_wanda_height']

def load_data(filename):
    for file in (HERE / filename, Path(filename)):
        if file.is_file():
            return json.loads(file.read_text())
    raise FileNotFoundError('Missing saved local project file: ' + filename)

def validate_model(model):
    if model.get('featureVersion') != FEATURE_VERSION or model.get('featureNames') != FEATURE_NAMES:
        raise ValueError('Expected the current fine-window QNN feature contract.')
    if model.get('qubits') != 4 or model.get('layers') != 4 or np.asarray(model['theta']).shape != (32,) or np.asarray(model['readout']).shape != (7,):
        raise ValueError('Expected four qubits, four layers,32 circuit angles and seven readouts.')
    if not np.isfinite([*model['theta'], *model['readout'], model['bias'], model['threshold']]).all() or not 0 <= model['threshold'] <= 1:
        raise ValueError('Model values must be finite; threshold must be within0..1.')

def qnn_circuit(features, model):
    validate_model(model)
    values = np.asarray(features, dtype=float)
    if values.shape != (8,) or not np.isfinite(values).all() or np.any(values < 0) or np.any(values > 1):
        raise ValueError('Expected eight finite features within0..1.')
    circuit = QuantumCircuit(4, name='Wanda QNN')
    p = 0
    for _ in range(4):
        for q in range(4):
            circuit.ry(math.pi * values[q], q)
            circuit.rz(math.pi * values[q + 4], q)
        for q in range(4):
            circuit.ry(model['theta'][p], q)
            circuit.rz(model['theta'][p + 1], q)
            p += 2
        for control, target in ((0, 1), (1, 2), (2, 3), (3, 0)):
            circuit.cx(control, target)
    return circuit

def quantum_readout(features, model):
    probabilities = Statevector.from_instruction(qnn_circuit(features, model)).probabilities()
    indices = np.arange(16)
    z = np.asarray([np.where(indices & (1 << q), -1., 1.) for q in range(4)])
    observables = np.asarray([*z, z[0] * z[1], z[2] * z[3], np.prod(z, axis=0)])
    return observables @ probabilities

def predict(features, model):
    logit = float(quantum_readout(features, model) @ np.asarray(model['readout']) + model['bias'])
    return 1 / (1 + math.exp(-max(-40., min(40., logit))))

def recommend_iterations(N, M):
    if not isinstance(N, int) or N < 2 or N & (N - 1):
        raise ValueError('N must be a power of two, at least two.')
    if not isinstance(M, int) or not 0 <= M <= N:
        raise ValueError('M must be an integer within0..N.')
    if M in (0, N):
        return 0
    theta = math.asin(math.sqrt(M / N))
    ideal = math.pi / (4 * theta) - .5
    lower, upper = max(0, math.floor(ideal)), math.ceil(ideal)
    return upper if math.sin((2 * upper + 1) * theta) ** 2 > math.sin((2 * lower + 1) * theta) ** 2 + 1e-14 else lower

def phase_all_ones(circuit):
    target = circuit.num_qubits - 1
    if target == 0:
        circuit.z(0)
    else:
        circuit.h(target)
        circuit.mcx(list(range(target)), target)
        circuit.h(target)

def phase_oracle(qubits, marks):
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
    circuit = QuantumCircuit(qubits, name='Diffusion')
    circuit.h(range(qubits)); circuit.x(range(qubits)); phase_all_ones(circuit)
    circuit.x(range(qubits)); circuit.h(range(qubits)); circuit.global_phase = math.pi
    return circuit

def grover_circuit(N, marks, iterations=None, measure=False):
    marks = sorted(set(marks)); recommended = recommend_iterations(N, len(marks))
    steps = recommended if iterations is None else iterations
    if not isinstance(steps, int) or steps < 0:
        raise ValueError('Iterations must be a nonnegative integer.')
    qubits = int(math.log2(N)); circuit = QuantumCircuit(qubits, qubits if measure else 0, name='Wanda learned predicate search')
    circuit.h(range(qubits)); oracle = phase_oracle(qubits, marks).to_gate(); diffusion = diffuser(qubits).to_gate()
    for _ in range(steps):
        circuit.append(oracle, range(qubits)); circuit.append(diffusion, range(qubits))
    if measure:
        circuit.measure(range(qubits), range(qubits))
    return circuit

def learned_marks(scores, threshold):
    """Fixture addresses combine scenes. Apply score threshold without cross-scene NMS."""
    return [i for i, score in enumerate(scores) if score >= threshold]

def run_demo(selected_backend=None, shots=2048, verbose=True, *, model=None, scene=None, iterations=None):
    if not isinstance(shots, int) or shots <= 0:
        raise ValueError('Shots must be a positive integer.')
    model = model if model is not None else load_data('model.json')
    scene = scene if scene is not None else load_data('scene.json')
    values = scene['features']; N = len(values); recommend_iterations(N, 0)
    scores = [predict(feature, model) for feature in values]
    marks = learned_marks(scores, model['threshold']); recommended = recommend_iterations(N, len(marks))
    steps = recommended if iterations is None else iterations
    ideal = Statevector.from_instruction(grover_circuit(N, marks, steps)).probabilities()
    measured = grover_circuit(N, marks, steps, measure=True)
    selected_backend = selected_backend if selected_backend is not None else globals().get('backend')
    selected_backend = selected_backend if selected_backend is not None else BasicSimulator()
    compiled = transpile(measured, selected_backend, optimization_level=1)
    # Exactly one job containing exactly one measured circuit. QNN statevectors submit no jobs.
    counts = selected_backend.run(compiled, shots=shots).result().get_counts()
    numeric = {int(bits.replace(' ', ''), 2): int(count) for bits, count in counts.items()}; total = sum(numeric.values())
    # Labels enter only here, after prediction, oracle construction and backend sampling.
    labels = scene.get('evaluationLabels'); true_indices = [] if labels is None else [i for i, y in enumerate(labels) if y == 1]
    if labels is not None and len(labels) != N:
        raise ValueError('Evaluation labels must match saved candidate count.')
    name = getattr(selected_backend, 'name', type(selected_backend).__name__); name = name() if callable(name) else name
    report = dict(project="Where's Wanda Qiskit companion", execution='local SDK validation; live Qollab/IonQ unverified',
        modelName=model.get('name', 'saved QNN'), featureVersion=model['featureVersion'], classifierQubits=4, searchQubits=int(math.log2(N)), candidates=N,
        qnnStatevectorEvaluations=N, coherentQNNOracle=False,
        exportedParameterSlots=40, predictionActiveSlots=36, inactiveFinalRZSlots=[25,27,29,31],
        scores=scores, threshold=model['threshold'], learnedMarkedIndices=marks, recommendedIterations=recommended, iterations=steps,
        idealDistribution=ideal.tolist(), idealPredicateMass=float(ideal[marks].sum()) if marks else 0.,
        idealTrueLabelMass=(float(ideal[true_indices].sum()) if marks else 0.) if labels is not None else None,
        emptyOraclePolicy='backend uniform diagnostic counts retained; no locations reported when accepted set is empty',
        reportedRowCounts={str(i): count for i, count in numeric.items()} if marks else {},
        observedPredicateFraction=sum(numeric.get(i, 0) for i in marks) / total if total else 0.,
        observedTrueLabelFraction=(sum(numeric.get(i, 0) for i in true_indices) / total if marks and total else 0.) if labels is not None else None,
        counts=dict(counts), shots=total, backend=str(name), backendJobsSubmitted=1, circuitsInJob=1,
        transpiledDepth=compiled.depth(), transpiledGateCounts=dict(compiled.count_ops()),
        oracleConstruction='local Qiskit QNN expectations + classical sigmoid/threshold; compiled phase-flip oracle on fixture rows',
        scope=scene.get('scope', 'saved feature-table quantum circuit example, not full image search'))
    if verbose:
        print(json.dumps(report, indent=2))
    return report

def main(shots: int = 2048):
    """Optional injected-backend entry point. No upload or live execution is performed."""
    return run_demo(shots=shots)

if __name__ == '__main__' and 'backend' not in globals():
    parser = argparse.ArgumentParser(); parser.add_argument('--shots', type=int, default=2048); parser.add_argument('--iterations', type=int)
    options = parser.parse_args(); run_demo(shots=options.shots, iterations=options.iterations)
