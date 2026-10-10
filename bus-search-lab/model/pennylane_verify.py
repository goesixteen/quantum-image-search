"""Independent framework check of exported QNN and Grover statevectors.

Run with the optional PennyLane environment: python model/pennylane_verify.py
Qubit labels are preserved; device wire order reverses labels to agree with
the custom simulator's little-endian basis convention.
"""
from pathlib import Path
import json
import numpy as np
import pennylane as qml
from train import circuit

ROOT = Path(__file__).resolve().parent.parent
model = json.loads((ROOT / 'dist/model/model.json').read_text())
theta = np.array(model['theta'])
dev = qml.device('default.qubit', wires=[3, 2, 1, 0])

@qml.qnode(dev)
def qnn(features):
    p = 0
    for layer in range(model['layers']):
        for q in range(4):
            qml.RY(np.pi * features[q], wires=q)
            qml.RZ(np.pi * features[q + 4], wires=q)
        for q in range(4):
            qml.RY(theta[p], wires=q); p += 1
            qml.RZ(theta[p], wires=q); p += 1
        for a, b in [(0, 1), (1, 2), (2, 3), (3, 0)]:
            qml.CNOT(wires=[a, b])
    obs = [qml.Z(q) for q in range(4)] + [qml.Z(0) @ qml.Z(1), qml.Z(2) @ qml.Z(3), qml.Z(0) @ qml.Z(1) @ qml.Z(2) @ qml.Z(3)]
    return tuple(qml.expval(o) for o in obs)

def grover_framework(N, marks, rounds):
    n = int(np.log2(N)); device = qml.device('default.qubit', wires=range(n))
    diagonal = np.ones(N); diagonal[marks] = -1
    @qml.qnode(device)
    def search():
        for q in range(n): qml.Hadamard(wires=q)
        for _ in range(rounds):
            qml.DiagonalQubitUnitary(diagonal, wires=range(n))
            qml.GroverOperator(wires=range(n))
        return qml.state()
    return np.asarray(search())

def main():
    rng = np.random.default_rng(20261010)
    features = np.vstack([np.zeros(8), np.ones(8), rng.random((30, 8))])
    reference = circuit(features, theta)
    independent = np.array([qnn(x) for x in features])
    qnn_error = float(np.max(np.abs(reference - independent)))
    cases = []
    for N, marks, rounds in [(4, [2], 1), (16, [7], 3), (64, [28], 6), (64, [3, 12], 4), (64, [], 3), (16, list(range(16)), 2)]:
        state = np.full(N, 1 / np.sqrt(N))
        for _ in range(rounds):
            state[marks] *= -1; state = 2 * np.mean(state) - state
        result = grover_framework(N, marks, rounds)
        error = float(np.max(np.abs(state - result)))
        cases.append({'N': N, 'marks': marks, 'rounds': rounds, 'max_amplitude_error': error})
    report = {'pennylane_version': qml.__version__, 'model_layers': model['layers'], 'qnn_feature_vectors': len(features), 'qnn_expectation_max_error': qnn_error, 'grover_cases': cases, 'passed': qnn_error < 1e-12 and all(c['max_amplitude_error'] < 1e-12 for c in cases)}
    (ROOT / 'model/pennylane-verification.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
    assert report['passed'], 'Independent framework verification failed'

if __name__ == '__main__': main()
