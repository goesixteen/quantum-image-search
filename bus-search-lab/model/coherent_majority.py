"""Coherent three-copy majority event and actual 14-qubit amplification.

Frozen raw-output QNN; no measurement, sigmoid, threshold or retraining.
Each copy is conditionally independent given the same two address qubits.
Statevectors and primitive gate lists only: no dense 14-qubit unitary matrices.
"""
from __future__ import annotations

import argparse
from collections import Counter
from dataclasses import replace
import hashlib
import json
import math
from pathlib import Path
import time

import numpy as np

from coherent_prototype import Gate, preparation_gates, recommend_from_probability
from train_coherent_classifier import fixed_exemplars, raw_probability

ROOT = Path(__file__).resolve().parent.parent


def preparation(features, theta, copies):
    if copies not in (1, 3):
        raise ValueError('This comparison supports one or three four-qubit copies.')
    base = preparation_gates(features, theta)
    payload_qubits = 4 * copies
    gates = [Gate('h', payload_qubits + q) for q in range(2)]
    for copy in range(copies):
        for gate in base[2:]:
            gates.append(replace(gate, qubit=gate.qubit + 4 * copy,
                                 target=None if gate.target is None else gate.target + 4 * copy))
    return gates


class StatevectorCircuit:
    """Apply cached primitive gate indices without constructing a unitary matrix."""
    def __init__(self, features, theta, copies):
        self.copies = copies
        self.payload_qubits = 4 * copies
        self.qubits = self.payload_qubits + 2
        self.dimension = 1 << self.qubits
        self.indices = np.arange(self.dimension, dtype=np.uint32)
        self.gates = preparation(features, theta, copies)
        self.inverse_gates = [gate.inverse() for gate in reversed(self.gates)]
        self.cache = {}
        local = np.arange(1 << self.payload_qubits, dtype=np.uint32)
        votes = sum(((local >> (4 * copy + 3)) & 1) for copy in range(copies))
        self.local_good = votes >= (copies // 2 + 1)
        self.good = np.tile(self.local_good, 4)
        self.good_phase_pairs = [(3, 7), (3, 11), (7, 11)] if copies == 3 else []
        self.good_cz_masks = [((self.indices & (1 << a)) != 0) & ((self.indices & (1 << b)) != 0)
                             for a, b in self.good_phase_pairs]

    def gate_indices(self, gate):
        key = (gate.kind, gate.qubit, gate.target, gate.address)
        if key in self.cache:
            return self.cache[key]
        if not 0 <= gate.qubit < self.qubits:
            raise ValueError('Gate wire outside register.')
        selected = np.ones(self.dimension, dtype=bool)
        if gate.address is not None:
            if not 0 <= gate.address < 4 or gate.qubit >= self.payload_qubits:
                raise ValueError('Invalid address-controlled payload rotation.')
            selected = (self.indices >> self.payload_qubits) == gate.address
        wire = 1 << gate.qubit
        if gate.kind in ('h', 'ry'):
            lower = self.indices[selected & ((self.indices & wire) == 0)]
            value = lower, lower | wire
        elif gate.kind == 'rz':
            chosen = self.indices[selected]
            value = chosen, np.where(chosen & wire, -1., 1.)
        elif gate.kind == 'cx':
            if gate.target is None or gate.target == gate.qubit or not 0 <= gate.target < self.qubits:
                raise ValueError('Invalid CNOT target.')
            target = 1 << gate.target
            lower = self.indices[selected & ((self.indices & wire) != 0) & ((self.indices & target) == 0)]
            value = lower, lower | target
        else:
            raise ValueError(f'Unsupported primitive {gate.kind}')
        self.cache[key] = value
        return value

    def apply(self, state, inverse=False):
        result = np.asarray(state, dtype=np.complex128).copy()
        if result.shape != (self.dimension,) or not np.all(np.isfinite(result)):
            raise ValueError('Expected a finite statevector; dense matrices are not supported.')
        for gate in self.inverse_gates if inverse else self.gates:
            left, right = self.gate_indices(gate)
            if gate.kind == 'rz':
                result[left] *= np.exp(-.5j * gate.angle * right)
            elif gate.kind == 'cx':
                result[left], result[right] = result[right].copy(), result[left].copy()
            else:
                a, b = result[left].copy(), result[right].copy()
                if gate.kind == 'h':
                    result[left], result[right] = (a + b) / math.sqrt(2), (a - b) / math.sqrt(2)
                else:
                    c, s = math.cos(gate.angle / 2), math.sin(gate.angle / 2)
                    result[left], result[right] = c * a - s * b, s * a + c * b
        return result

    def reflect_good(self, state):
        result = np.asarray(state, dtype=np.complex128).copy()
        if result.shape != (self.dimension,):
            raise ValueError('Expected a statevector.')
        if self.copies == 1:
            result[self.good] *= -1  # Z on q3.
        else:
            # Majority(a,b,c) = ab XOR ac XOR bc. Three CZ gates flip
            # exactly states with two or three output bits1; no ancilla.
            for mask in self.good_cz_masks:
                result[mask] *= -1
        return result

    def amplify(self, state):
        # Q = -A S0 A† S_good; apply rightmost operation first.
        reflected = self.reflect_good(state)
        reflected = self.apply(reflected, inverse=True)
        reflected[0] *= -1
        return -self.apply(reflected)


def experiment(features, theta, copies, labels=None, iterations=6):
    if not isinstance(iterations, int) or isinstance(iterations, bool) or iterations < 0:
        raise ValueError('Iterations must be a nonnegative integer.')
    started = time.perf_counter()
    circuit = StatevectorCircuit(features, theta, copies)
    zero = np.zeros(circuit.dimension, dtype=np.complex128)
    zero[0] = 1
    prepared = circuit.apply(zero)
    branches = abs(prepared.reshape(4, -1)) ** 2
    raw = raw_probability(np.asarray(features), np.asarray(theta))
    event = raw if copies == 1 else 3 * raw ** 2 - 2 * raw ** 3
    actual_branch_event = branches[:, circuit.local_good].sum(axis=1) * 4
    a = float(event.mean())
    angle = math.asin(math.sqrt(np.clip(a, 0, 1)))
    conditional_initial = event / event.sum() if event.sum() > 1e-14 else None
    # Labels are consulted only for reporting probabilities after evolution.
    truth = None if labels is None else np.asarray(labels, dtype=bool)
    if truth is not None and truth.shape != (4,):
        raise ValueError('Expected four evaluation labels.')
    state = prepared.copy()
    history = []
    for k in range(iterations + 1):
        distribution = (abs(state) ** 2).reshape(4, -1)
        joint = distribution[:, circuit.local_good].sum(axis=1)
        p_good = float(joint.sum())
        given = joint / p_good if p_good > 1e-14 else None
        expected = math.sin((2 * k + 1) * angle) ** 2
        record = dict(iteration=k, norm=float(distribution.sum()),
                      good_event_probability=p_good, analytic_good_event_probability=expected,
                      formula_error=abs(p_good - expected),
                      address_marginal=distribution.sum(axis=1).tolist(),
                      address_and_good=joint.tolist(),
                      address_given_good=None if given is None else given.tolist())
        if truth is not None:
            record['evaluation_true_bus_and_good_probability'] = float(joint[truth].sum())
            record['evaluation_true_bus_address_probability'] = float(distribution[truth].sum())
            record['evaluation_true_bus_probability_given_good'] = None if given is None else float(given[truth].sum())
        history.append(record)
        if k < iterations:
            state = circuit.amplify(state)

    # Vector checks are independent of the analytic probability trajectory.
    recovery = float(np.max(abs(circuit.apply(prepared, inverse=True) - zero)))
    inverse_random_error, reflection_error = 0., 0.
    rng = np.random.default_rng(438201)
    for _ in range(3):
        probe = rng.normal(size=circuit.dimension) + 1j * rng.normal(size=circuit.dimension)
        probe /= np.linalg.norm(probe)
        inverse_random_error = max(inverse_random_error, float(np.max(abs(circuit.apply(circuit.apply(probe), inverse=True) - probe))))
        flipped = probe.copy()
        flipped[circuit.good] *= -1
        expected_Q = 2 * prepared * np.vdot(prepared, flipped) - flipped
        reflection_error = max(reflection_error, float(np.max(abs(circuit.amplify(probe) - expected_Q))))
    invariance = [float(np.max(abs(np.asarray(record['address_given_good']) - conditional_initial)))
                  for record in history if record['address_given_good'] is not None and conditional_initial is not None]
    checks = dict(branch_event_vs_independent_copy_polynomial_max_error=float(np.max(abs(actual_branch_event - event))),
                  address_uniform_preparation_max_error=float(np.max(abs(branches.sum(axis=1) - .25))),
                  A_dagger_A_zero_error=recovery, A_dagger_A_three_random_states_max_error=inverse_random_error,
                  Q_vs_rank_one_reflection_three_random_states_max_error=reflection_error,
                  actual_good_reflection_vs_majority_mask_max_error=float(np.max(abs(circuit.reflect_good(np.ones(circuit.dimension)) - np.where(circuit.good, -1., 1.)))),
                  analytic_curve_max_error=max(record['formula_error'] for record in history),
                  norm_max_error=max(abs(record['norm'] - 1) for record in history),
                  conditional_address_invariance_max_error=max(invariance, default=0.))
    if max(checks.values()) > 1e-10:
        raise AssertionError(checks)
    selected = recommend_from_probability(a)
    counts = Counter(('address_controlled_' if g.address is not None else '') + g.kind for g in circuit.gates)
    return dict(copies=copies, registers=dict(address=2, qnn_copies=copies, qubits_per_copy=4, total=circuit.qubits),
                dimension=circuit.dimension, statevector_complex128_bytes=circuit.dimension * 16,
                basis_convention=f'index = (address << {circuit.payload_qubits}) | copy_basis; copy c uses bits4c..4c+3',
                good_event='q3=1' if copies == 1 else 'at least two of payload bits3,7,11 are1',
                no_dense_unitary_matrix=True, no_intermediate_measurement=True, threshold_used=False, retraining=False,
                raw_single_copy_event_probabilities=raw.tolist(), analytic_branch_event_probabilities=event.tolist(),
                simulated_branch_event_probabilities=actual_branch_event.tolist(), initial_good_event_probability=a,
                initial_address_given_good=None if conditional_initial is None else conditional_initial.tolist(),
                recommended_first_peak_iterations=selected, history=history, selected_first_peak=history[selected] if selected <= iterations else None,
                resources=dict(A_primitive_count=len(circuit.gates), A_primitive_counts=dict(counts),
                               first_peak_A_applications=selected + 1, first_peak_A_dagger_applications=selected,
                               first_peak_total_preparation_primitives=(2 * selected + 1) * len(circuit.gates),
                               first_peak_good_reflections=selected, first_peak_zero_reflections=selected,
                               good_reflection_decomposition=['Z(3)'] if copies == 1 else ['CZ(3,7)', 'CZ(3,11)', 'CZ(7,11)'],
                               good_reflection_two_qubit_gates_per_iteration=0 if copies == 1 else 3,
                               physical_decomposition_supplied=False,
                               resource_scope='Logical preparation primitives and exact good-reflection decomposition. Address-controlled rotations and all-zero reflection still need physical decomposition; no hardware gate-depth claim.'),
                checks=checks, elapsed_seconds=time.perf_counter() - started)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model', type=Path, default=ROOT / 'model/coherent-classifier.json')
    parser.add_argument('--iterations', type=int, default=6)
    parser.add_argument('--verify-only', action='store_true')
    parser.add_argument('--output', type=Path, default=ROOT / 'model/coherent-majority-results.json')
    args = parser.parse_args()
    model_bytes = args.model.read_bytes()
    model = json.loads(model_bytes)
    if model['qubits'] != 4 or model['outputQubit'] != 3 or model['hasClassicalReadout'] is not False:
        raise ValueError('Requires the frozen raw-output four-qubit classifier with output wire3.')
    features, names, labels, _ = fixed_exemplars()
    one = experiment(features, model['theta'], 1, labels, args.iterations)
    majority = experiment(features, model['theta'], 3, labels, args.iterations)
    if args.model.read_bytes() != model_bytes:
        raise RuntimeError('Frozen checkpoint changed during evaluation.')
    report = dict(model_sha256=hashlib.sha256(model_bytes).hexdigest(), model_file=args.model.name,
                  source_sha256={name: hashlib.sha256((ROOT / 'model' / name).read_bytes()).hexdigest()
                                 for name in ['coherent_majority.py', 'coherent_prototype.py', 'train_coherent_classifier.py', 'train.py']},
                  features=features.tolist(), names=names, evaluation_labels=labels,
                  one_copy=one, three_copy_majority=majority,
                  interpretation='Majority changes the coherent predicate: q_i=3p_i^2-2p_i^3. Amplification preserves address weights inside each fixed good subspace. This four-exemplar synthetic experiment neither fixes systematic p>0.5 errors nor demonstrates a computational advantage.',
                  majority_parameter_sharing='All copies use identical frozen angles and the same address-conditioned feature table. This repeats circuit evaluation, not independent training or cloning an unknown quantum state.')
    if not args.verify_only:
        args.output.write_text(json.dumps(report, indent=2, allow_nan=False) + '\n')
    print(json.dumps(dict(verification='PASS', output=None if args.verify_only else str(args.output),
                         **{name: {key: value[key] for key in ['registers', 'initial_good_event_probability', 'recommended_first_peak_iterations', 'selected_first_peak', 'resources', 'checks']}
                            for name, value in [('one_copy', one), ('three_copy_majority', majority)]}), indent=2))


if __name__ == '__main__':
    main()
