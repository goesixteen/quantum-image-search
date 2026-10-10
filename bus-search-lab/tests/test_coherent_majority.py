"""Independent checks for the copy register mapping and coherent majority event.

Expected preparations come from tensor products of the established six-qubit
helper, rather than from the new implementation's own analytic diagnostics.
"""
from pathlib import Path
import itertools
import json
import math
import sys
import unittest

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'model'))
import coherent_prototype as single
from coherent_majority import StatevectorCircuit, experiment
from train_coherent_classifier import fixed_exemplars, raw_probability


def tensor_preparation(features, theta, copies):
    zero = np.zeros(64, dtype=complex)
    zero[0] = 1
    # Each address branch has amplitude 1/2. Restore a unit-normalized payload.
    branches = 2 * single.apply_circuit(
        zero, single.preparation_gates(features, theta)).reshape(4, 16)
    expected = []
    for branch in branches:
        payload = np.array([1.0], dtype=complex)
        for _ in range(copies):
            payload = np.kron(branch, payload)
        expected.append(payload / 2)
    return np.concatenate(expected)


class CoherentMajorityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        model = json.loads((ROOT / 'model/coherent-classifier.json').read_text())
        cls.theta = np.array(model['theta'])
        cls.features, _, cls.labels, _ = fixed_exemplars()

    def test_preparation_is_address_conditioned_tensor_product(self):
        rng = np.random.default_rng(551283)
        cases = [
            (self.features, self.theta),
            (rng.uniform(0, 1, (4, 8)), rng.normal(0, 1, 16)),
        ]
        for features, theta in cases:
            for copies in (1, 3):
                with self.subTest(copies=copies, layers=len(theta) // 8):
                    circuit = StatevectorCircuit(features, theta, copies)
                    zero = np.zeros(circuit.dimension, dtype=complex)
                    zero[0] = 1
                    prepared = circuit.apply(zero)
                    expected = tensor_preparation(features, theta, copies)
                    np.testing.assert_allclose(prepared, expected, atol=2e-13)

    def test_majority_mask_matches_boolean_predicate_and_three_cz_phases(self):
        circuit = StatevectorCircuit(self.features, self.theta, 3)
        basis = np.arange(circuit.dimension)
        a, b, c = [(basis >> bit) & 1 for bit in (3, 7, 11)]
        expected_good = (a + b + c) >= 2
        np.testing.assert_array_equal(circuit.good, expected_good)
        # Three pairwise CZs give exponent ab XOR ac XOR bc, including 111.
        three_cz_phase = (-1.0) ** ((a * b + a * c + b * c) % 2)
        np.testing.assert_array_equal(
            three_cz_phase, np.where(expected_good, -1.0, 1.0))
        # Test executed CZ gates, not only the phase identity in diagnostics.
        probe = np.ones(circuit.dimension, dtype=complex)
        np.testing.assert_array_equal(circuit.reflect_good(probe), three_cz_phase)
        np.testing.assert_array_equal(probe, np.ones(circuit.dimension))
        single_circuit = StatevectorCircuit(self.features, self.theta, 1)
        single_basis = np.arange(single_circuit.dimension)
        np.testing.assert_array_equal(
            single_circuit.reflect_good(np.ones(single_circuit.dimension)),
            np.where(single_basis & (1 << 3), -1.0, 1.0))
        for address in range(4):
            np.testing.assert_array_equal(
                circuit.good[address * 4096:(address + 1) * 4096],
                expected_good[:4096])

    def test_majority_branch_probability_matches_explicit_outcome_enumeration(self):
        circuit = StatevectorCircuit(self.features, self.theta, 3)
        prepared = tensor_preparation(self.features, self.theta, 3)
        branch_probabilities = (abs(prepared.reshape(4, -1)) ** 2)
        actual = branch_probabilities[:, circuit.local_good].sum(axis=1) * 4
        p = raw_probability(self.features, self.theta)
        expected = np.array([
            sum(math.prod(pi if bit else 1 - pi for bit in bits)
                for bits in itertools.product((0, 1), repeat=3)
                if sum(bits) >= 2)
            for pi in p
        ])
        np.testing.assert_allclose(actual, expected, atol=2e-13)
        np.testing.assert_allclose(expected, 3 * p ** 2 - 2 * p ** 3,
                                   atol=2e-13)

    def test_amplification_matches_reflection_about_independent_tensor_state(self):
        rng = np.random.default_rng(903731)
        for copies in (1, 3):
            with self.subTest(copies=copies):
                circuit = StatevectorCircuit(self.features, self.theta, copies)
                prepared = tensor_preparation(self.features, self.theta, copies)
                probe = rng.normal(size=circuit.dimension) + 1j * rng.normal(
                    size=circuit.dimension)
                probe /= np.linalg.norm(probe)
                flipped = probe.copy()
                flipped[circuit.good] *= -1
                expected = 2 * prepared * np.vdot(prepared, flipped) - flipped
                np.testing.assert_allclose(circuit.amplify(probe), expected,
                                           atol=2e-13)
                recovered = circuit.apply(circuit.apply(probe), inverse=True)
                np.testing.assert_allclose(recovered, probe, atol=2e-13)

    def test_good_bad_decomposition_predicts_joint_and_marginal_address_weights(self):
        p = raw_probability(self.features, self.theta)
        for copies in (1, 3):
            event = p if copies == 1 else 3 * p ** 2 - 2 * p ** 3
            a = float(event.mean())
            angle = math.asin(math.sqrt(a))
            conditional_good = event / event.sum()
            conditional_bad = (1 - event) / (1 - event).sum()
            report = experiment(self.features, self.theta, copies,
                                self.labels, iterations=6)
            for frame in report['history']:
                with self.subTest(copies=copies, iteration=frame['iteration']):
                    good = math.sin((2 * frame['iteration'] + 1) * angle) ** 2
                    joint = good * conditional_good
                    marginal = joint + (1 - good) * conditional_bad
                    np.testing.assert_allclose(frame['address_and_good'], joint,
                                               atol=2e-12)
                    np.testing.assert_allclose(frame['address_marginal'], marginal,
                                               atol=2e-12)
                    self.assertAlmostEqual(
                        frame['evaluation_true_bus_and_good_probability'],
                        joint[3], places=11)
                    self.assertAlmostEqual(
                        frame['evaluation_true_bus_address_probability'],
                        marginal[3], places=11)
                    self.assertAlmostEqual(
                        frame['evaluation_true_bus_probability_given_good'],
                        conditional_good[3], places=11)
            self.assertEqual(report['recommended_first_peak_iterations'], 1)
            self.assertEqual(report['resources']['A_primitive_count'],
                             2 + copies * 44 * (len(self.theta) // 8))


if __name__ == '__main__':
    unittest.main()
