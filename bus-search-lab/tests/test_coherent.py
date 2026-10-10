"""Focused validation of the coherent appendix; NumPy, no quantum SDK required."""
from pathlib import Path
import json
import math
import sys
import unittest

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'model'))
import coherent_prototype as c


class CoherentPrototypeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = json.loads((ROOT / 'dist/model/model.json').read_text())
        cls.fixtures = json.loads((ROOT / 'model/parity-fixtures.json').read_text())
        cls.features = np.array([cls.fixtures[index]['features'] for index in [0, 2, 1, 4]])

    def test_address_controlled_feature_rotation_only_changes_selected_branch(self):
        zero = np.zeros(64, dtype=complex)
        zero[0] = 1
        gates = [c.Gate('h', 4), c.Gate('h', 5), c.Gate('ry', 0, math.pi, address=2)]
        state = c.apply_circuit(zero, gates)
        expected = np.zeros(64, dtype=complex)
        expected[[0, 16, 33, 48]] = 0.5
        np.testing.assert_allclose(state, expected, atol=1e-14)

    def test_explicit_inverse_recovers_arbitrary_complex_state(self):
        rng = np.random.default_rng(20261010)
        state = rng.normal(size=64) + 1j * rng.normal(size=64)
        state /= np.linalg.norm(state)
        gates = c.preparation_gates(self.features, np.array(self.model['theta']))
        final = c.apply_circuit(c.apply_circuit(state, gates), gates, inverse=True)
        np.testing.assert_allclose(final, state, atol=1e-13)

    def test_exported_qnn_sigmoid_parity_and_prepared_address_marginal(self):
        zero = np.zeros(64, dtype=complex)
        zero[0] = 1
        gates = c.preparation_gates(self.features, np.array(self.model['theta']))
        prepared = c.apply_circuit(zero, gates)
        _, scores = c.raw_patch_readouts(prepared, self.model)
        expected = [self.fixtures[index]['probability'] for index in [0, 2, 1, 4]]
        np.testing.assert_allclose(scores, expected, atol=1e-11)
        marginal = (abs(prepared.reshape(4, 16)) ** 2).sum(axis=1)
        np.testing.assert_allclose(marginal, np.full(4, 0.25), atol=1e-13)

    def test_actual_learned_preparation_passes_dense_unitary_and_curve_checks(self):
        report = c.simulate(self.features, self.model, iterations=12)
        self.assertEqual(report['qubits']['total'], 6)
        self.assertEqual(report['preparation_primitive_gate_total'], 2 + 44 * self.model['layers'])
        self.assertLess(max(report['checks'].values()), 1e-11)
        initial = report['initial_address_probability_given_good']
        for frame in report['history']:
            self.assertAlmostEqual(frame['norm'], 1, places=11)
            np.testing.assert_allclose(frame['address_probability_given_good'], initial, atol=1e-11)

    def test_toy_preparations_cover_zero_full_and_exact_quarter_events(self):
        for a in [0.0, 0.01, 0.25, 0.5, 1.0]:
            zero = np.zeros(64, dtype=complex)
            zero[0] = 1
            gates = [c.Gate('h', 4), c.Gate('h', 5), c.Gate('ry', 0, 2 * math.asin(math.sqrt(a)))]
            state = c.apply_circuit(zero, gates)
            theta = math.asin(math.sqrt(a))
            for k in range(9):
                actual = float(np.sum(abs(state[c.good_mask(0)]) ** 2))
                expected = math.sin((2 * k + 1) * theta) ** 2
                self.assertAlmostEqual(actual, expected, places=11)
                self.assertAlmostEqual(float(np.sum(abs(state) ** 2)), 1, places=11)
                state = c.amplify(state, gates, output_qubit=0)
        self.assertEqual(c.recommend_from_probability(0), 0)
        self.assertEqual(c.recommend_from_probability(1), 0)
        self.assertEqual(c.recommend_from_probability(0.25), 1)

    def test_invalid_feature_and_model_shapes_fail_explicitly(self):
        with self.assertRaises(ValueError):
            c.preparation_gates(np.zeros((3, 8)), np.zeros(24))
        with self.assertRaises(ValueError):
            c.preparation_gates(np.full((4, 8), 1.1), np.zeros(24))
        with self.assertRaises(ValueError):
            c.good_mask(4)
        with self.assertRaises(ValueError):
            c.simulate(self.features, self.model, iterations=-1)


if __name__ == '__main__':
    unittest.main()
