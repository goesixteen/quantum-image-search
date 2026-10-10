"""Six-qubit coherent QNN event amplification research prototype.

This is separate from the main UI's classically thresholded image oracle.
Good means one raw QNN register bit is |1>; it is NOT the trained sigmoid score.
Only NumPy and Python's standard library are required. No intermediate measurement
or threshold is used by the preparation, inverse, or amplification operators.
"""
from __future__ import annotations

import argparse
from collections import Counter
from dataclasses import dataclass, replace
import hashlib
import json
import math
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
N_QNN = 4
N_ADDRESS = 2
N_QUBITS = N_QNN + N_ADDRESS
DIMENSION = 1 << N_QUBITS
N_CANDIDATES = 1 << N_ADDRESS


@dataclass(frozen=True)
class Gate:
    kind: str
    qubit: int
    angle: float = 0.0
    target: int | None = None
    address: int | None = None

    def inverse(self) -> 'Gate':
        if self.kind in ('ry', 'rz'):
            return replace(self, angle=-self.angle)
        if self.kind in ('h', 'cx'):
            return self
        raise ValueError(f'Unsupported gate {self.kind!r}')


def apply_gate(state: np.ndarray, gate: Gate) -> np.ndarray:
    """Apply a primitive or address-controlled rotation; supports matrix columns.

    Index = (address << 4) | qnn_basis; QNN bit 0 is least significant.
    Address-controlled rotations apply only when both address bits equal the
    requested value. Their physical multi-control decomposition is not included.
    """
    result = np.asarray(state, dtype=np.complex128).copy()
    if result.ndim not in (1, 2) or result.shape[0] != DIMENSION:
        raise ValueError(f'State must have {DIMENSION} rows.')
    indices = np.arange(DIMENSION)
    mask = 1 << gate.qubit
    selected = np.ones(DIMENSION, dtype=bool)
    if gate.address is not None:
        selected = (indices >> N_QNN) == gate.address
    if gate.kind in ('ry', 'h'):
        lower = indices[(indices & mask == 0) & selected]
        upper = lower | mask
        a, b = result[lower].copy(), result[upper].copy()
        if gate.kind == 'h':
            result[lower], result[upper] = (a + b) / math.sqrt(2), (a - b) / math.sqrt(2)
        else:
            c, s = math.cos(gate.angle / 2), math.sin(gate.angle / 2)
            result[lower], result[upper] = c * a - s * b, s * a + c * b
    elif gate.kind == 'rz':
        chosen = indices[selected]
        z = np.where(chosen & mask, -1, 1)
        phase = np.exp(-0.5j * gate.angle * z)
        result[chosen] *= phase if result.ndim == 1 else phase[:, None]
    elif gate.kind == 'cx':
        if gate.target is None or gate.target == gate.qubit:
            raise ValueError('A CNOT needs a distinct target.')
        target_mask = 1 << gate.target
        lower = indices[(indices & mask != 0) & (indices & target_mask == 0) & selected]
        upper = lower | target_mask
        result[lower], result[upper] = result[upper].copy(), result[lower].copy()
    else:
        raise ValueError(f'Unsupported gate {gate.kind!r}')
    return result


def apply_circuit(state: np.ndarray, gates: list[Gate], inverse: bool = False) -> np.ndarray:
    result = np.asarray(state, dtype=np.complex128).copy()
    sequence = [gate.inverse() for gate in reversed(gates)] if inverse else gates
    for gate in sequence:
        result = apply_gate(result, gate)
    return result


def preparation_gates(features: np.ndarray, theta: np.ndarray) -> list[Gate]:
    """A = coherent address initialization + feature reuploading + learned gates."""
    features = np.asarray(features, dtype=float)
    theta = np.asarray(theta, dtype=float)
    if features.shape != (N_CANDIDATES, 8) or theta.ndim != 1 or theta.size == 0 or theta.size % 8:
        raise ValueError('Expected exactly four 8-feature vectors and eight circuit angles per layer.')
    if not np.all(np.isfinite(features)) or np.any((features < 0) | (features > 1)):
        raise ValueError('Features must be finite values in [0,1].')
    if not np.all(np.isfinite(theta)):
        raise ValueError('Circuit parameters must be finite.')
    gates = [Gate('h', N_QNN + q) for q in range(N_ADDRESS)]
    parameter = 0
    for _ in range(theta.size // 8):
        for qubit in range(N_QNN):
            for address in range(N_CANDIDATES):
                gates.append(Gate('ry', qubit, math.pi * features[address, qubit], address=address))
                gates.append(Gate('rz', qubit, math.pi * features[address, qubit + 4], address=address))
        for qubit in range(N_QNN):
            gates.append(Gate('ry', qubit, theta[parameter]))
            gates.append(Gate('rz', qubit, theta[parameter + 1]))
            parameter += 2
        for control, target in [(0, 1), (1, 2), (2, 3), (3, 0)]:
            gates.append(Gate('cx', control, target=target))
    return gates


def good_mask(output_qubit: int) -> np.ndarray:
    if not isinstance(output_qubit, int) or not 0 <= output_qubit < N_QNN:
        raise ValueError('Output qubit must be 0, 1, 2, or 3.')
    return (np.arange(DIMENSION) & (1 << output_qubit)) != 0


def amplify(state: np.ndarray, gates: list[Gate], output_qubit: int = 3) -> np.ndarray:
    """Q = -A S_0 A† S_good, evaluated right to left using the actual gate list."""
    result = np.asarray(state, dtype=np.complex128).copy()
    result[good_mask(output_qubit)] *= -1  # Z on the raw QNN output bit.
    result = apply_circuit(result, gates, inverse=True)
    result[0] *= -1  # S_0 negates only the full six-qubit all-zero state.
    result = apply_circuit(result, gates)
    return -result


def raw_patch_readouts(prepared: np.ndarray, model: dict) -> tuple[np.ndarray, np.ndarray]:
    """Diagnostics only: recover per-address expectation values and sigmoid scores.

    These exact simulator expectations are never passed into amplification.
    """
    branches = prepared.reshape(N_CANDIDATES, 1 << N_QNN) * math.sqrt(N_CANDIDATES)
    probabilities = abs(branches) ** 2
    basis = np.arange(1 << N_QNN)
    z = np.array([np.where(basis & (1 << q), -1, 1) for q in range(N_QNN)])
    observables = np.array([*z, z[0] * z[1], z[2] * z[3], z.prod(axis=0)])
    readouts = probabilities @ observables.T
    logit = readouts @ np.asarray(model['readout']) + model['bias']
    scores = 1 / (1 + np.exp(-np.clip(logit, -40, 40)))
    return readouts, scores


def recommend_from_probability(a: float) -> int:
    if a <= 0 or a >= 1:
        return 0
    theta = math.asin(math.sqrt(a))
    ideal = math.pi / (4 * theta) - 0.5
    lower, upper = max(0, math.floor(ideal)), math.ceil(ideal)
    p = lambda k: math.sin((2 * k + 1) * theta) ** 2
    return upper if p(upper) > p(lower) + 1e-14 else lower


def simulate(features: np.ndarray, model: dict, iterations: int = 6, output_qubit: int = 3) -> dict:
    if not isinstance(iterations, int) or iterations < 0:
        raise ValueError('Iterations must be a nonnegative integer.')
    if model.get('qubits') != N_QNN or model.get('layers') != len(model['theta']) // 8:
        raise ValueError('This prototype requires four QNN qubits and eight circuit angles per layer.')
    gates = preparation_gates(features, np.asarray(model['theta']))
    zero = np.zeros(DIMENSION, dtype=np.complex128)
    zero[0] = 1
    prepared = apply_circuit(zero, gates)
    mask = good_mask(output_qubit)
    a = float(np.sum(abs(prepared[mask]) ** 2))
    theta = math.asin(math.sqrt(min(1.0, max(0.0, a))))
    readouts, scores = raw_patch_readouts(prepared, model)
    raw_event = (1 - readouts[:, output_qubit]) / 2
    conditional_initial = raw_event / raw_event.sum() if raw_event.sum() > 1e-14 else None
    state = prepared.copy()
    history = []
    for iteration in range(iterations + 1):
        distribution = abs(state) ** 2
        per_address = distribution.reshape(N_CANDIDATES, 1 << N_QNN)
        local_good = ((np.arange(1 << N_QNN) & (1 << output_qubit)) != 0)
        joint_good = per_address[:, local_good].sum(axis=1)
        p_good = float(joint_good.sum())
        analytic = math.sin((2 * iteration + 1) * theta) ** 2
        conditional = joint_good / p_good if p_good > 1e-14 else None
        history.append(dict(
            iteration=iteration,
            norm=float(distribution.sum()),
            good_event_probability=p_good,
            analytic_good_event_probability=analytic,
            absolute_formula_error=abs(p_good - analytic),
            address_probability=per_address.sum(axis=1).tolist(),
            joint_address_and_good_probability=joint_good.tolist(),
            address_probability_given_good=None if conditional is None else conditional.tolist(),
            A_applications=iteration + 1,
            A_dagger_applications=iteration,
            good_reflections=iteration,
            zero_reflections=iteration,
        ))
        if iteration < iterations:
            state = amplify(state, gates, output_qubit)

    # Verify inverse and full matrix unitarity independently of the trajectory.
    identity = np.eye(DIMENSION, dtype=np.complex128)
    A = apply_circuit(identity, gates)
    A_inverse = apply_circuit(identity, gates, inverse=True)
    inverse_error = float(np.max(abs(A_inverse - A.conj().T)))
    unitarity_error = float(np.max(abs(A.conj().T @ A - identity)))
    recovery_error = float(np.max(abs(apply_circuit(prepared, gates, inverse=True) - zero)))
    # Independent dense reflection operator, rather than the procedural inverse.
    S_good = np.diag(np.where(mask, -1.0, 1.0))
    expected_Q = (2 * np.outer(prepared, prepared.conj()) - identity) @ S_good
    actual_Q = amplify(identity, gates, output_qubit)
    reflection_error = float(np.max(abs(actual_Q - expected_Q)))
    max_formula_error = max(frame['absolute_formula_error'] for frame in history)
    max_norm_error = max(abs(frame['norm'] - 1) for frame in history)
    conditional_errors = [
        float(np.max(abs(np.asarray(frame['address_probability_given_good']) - conditional_initial)))
        for frame in history
        if frame['address_probability_given_good'] is not None and conditional_initial is not None
    ]
    checks = dict(
        inverse_matches_conjugate_transpose_max_error=inverse_error,
        A_unitarity_max_error=unitarity_error,
        A_dagger_A_zero_recovery_max_error=recovery_error,
        Q_matches_dense_reflection_max_error=reflection_error,
        analytic_curve_max_error=max_formula_error,
        normalization_max_error=max_norm_error,
        conditional_address_invariance_max_error=max(conditional_errors, default=0.0),
    )
    if any(error > 1e-10 for error in checks.values()):
        raise AssertionError(f'Coherent simulator consistency check failed: {checks}')
    gate_counts = Counter(
        'address_controlled_' + gate.kind if gate.address is not None else gate.kind
        for gate in gates
    )
    return dict(
        purpose='coherent amplification of a raw QNN register-bit event; not sigmoid/threshold classification',
        qubits=dict(address=N_ADDRESS, qnn=N_QNN, total=N_QUBITS),
        qnn_layers=model['layers'],
        basis_convention='basis_index = (address << 4) | qnn_basis; QNN bit 0 is least significant',
        good_event=f'QNN qubit {output_qubit} measured as 1',
        initial_good_event_probability=a,
        theta=theta,
        recommended_first_peak_iterations=recommend_from_probability(a),
        features=np.asarray(features).tolist(),
        diagnostic_classical_sigmoid_scores=scores.tolist(),
        diagnostic_raw_bit_event_probabilities=raw_event.tolist(),
        initial_address_probability_given_good=None if conditional_initial is None else conditional_initial.tolist(),
        preparation_primitive_gate_counts=dict(gate_counts),
        preparation_primitive_gate_total=len(gates),
        checks=checks,
        history=history,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model', type=Path, default=ROOT / 'dist/model/model.json')
    parser.add_argument('--features', type=Path, help='Optional JSON array with exactly four rows of eight features.')
    parser.add_argument('--fixtures', type=Path, default=ROOT / 'model/parity-fixtures.json')
    parser.add_argument('--fixture-indices', default='0,2,1,4')
    parser.add_argument('--output-qubit', type=int, default=3)
    parser.add_argument('--iterations', type=int, default=6)
    parser.add_argument('--output', type=Path, default=ROOT / 'model/coherent-results.json')
    args = parser.parse_args()
    model_bytes = args.model.read_bytes()
    model = json.loads(model_bytes)
    if args.features:
        features = np.asarray(json.loads(args.features.read_text()), dtype=float)
        provenance = dict(features_path=str(args.features.resolve()))
    else:
        indices = [int(value) for value in args.fixture_indices.split(',')]
        if len(indices) != N_CANDIDATES:
            raise ValueError('Supply exactly four fixture indices.')
        fixture_bytes = args.fixtures.read_bytes()
        fixtures = json.loads(fixture_bytes)
        features = np.array([fixtures[index]['features'] for index in indices], dtype=float)
        provenance = dict(
            fixtures_path=str(args.fixtures.resolve()),
            fixtures_sha256=hashlib.sha256(fixture_bytes).hexdigest(),
            fixture_indices=indices,
            domain='held-out synthetic patch features; no photographs',
        )
    report = simulate(features, model, args.iterations, args.output_qubit)
    report['model_path'] = str(args.model.resolve())
    report['model_sha256'] = hashlib.sha256(model_bytes).hexdigest()
    report['provenance'] = provenance
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(f'Saved {args.output}')
    print(f'Raw bit-event probability before amplification: {report["initial_good_event_probability"]:.6f}')
    print(f'First-peak iteration: {report["recommended_first_peak_iterations"]}')
    for frame in report['history']:
        print(f'k={frame["iteration"]}: event P={frame["good_event_probability"]:.9f}; '
              f'analytic={frame["analytic_good_event_probability"]:.9f}; '
              f'error={frame["absolute_formula_error"]:.2e}')
    print('Maximum consistency error:', max(report['checks'].values()))
    print('Raw bit-event amplification does not implement the trained sigmoid threshold.')


if __name__ == '__main__':
    main()
