"""Local scientific and one-job verification for the Qollab entry point."""
import json
import math
import unittest

import numpy as np
from qiskit.quantum_info import Operator, Statevector
from qiskit.providers.basic_provider import BasicSimulator

import main as captcha


class CountingSimulator(BasicSimulator):
    def __init__(self):
        super().__init__()
        self.run_calls = 0

    def run(self, *args, **kwargs):
        self.run_calls += 1
        kwargs['seed_simulator'] = 20261010
        return super().run(*args, **kwargs)


class QiskitCaptchaTests(unittest.TestCase):
    def test_phase_oracle_and_diffuser_match_independent_matrices(self):
        oracle = Operator(captcha.phase_oracle(4, [3, 8])).data
        diagonal = np.ones(16)
        diagonal[[3, 8]] = -1
        np.testing.assert_allclose(oracle, np.diag(diagonal), atol=1e-13)
        expected = np.full((16, 16), 2 / 16) - np.eye(16)
        np.testing.assert_allclose(Operator(captcha.diffuser(4)).data, expected, atol=1e-13)

    def test_qiskit_grover_curve_multiple_marks_and_overshoot(self):
        for N in [16, 64]:
            for M in [1, 2, 4]:
                marks = list(range(M))
                theta = math.asin(math.sqrt(M / N))
                for k in [0, 1, captcha.recommend_iterations(N, M), 8]:
                    circuit = captcha.grover_circuit(N, marks, k, measure=False)
                    distribution = Statevector.from_instruction(circuit).probabilities()
                    self.assertAlmostEqual(float(distribution.sum()), 1, places=11)
                    self.assertAlmostEqual(float(distribution[marks].sum()), math.sin((2 * k + 1) * theta) ** 2, places=11)

    def test_trained_qnn_positive_and_background_scores_are_different(self):
        model, scene = captcha.load_data('model.json'), captcha.load_data('scene.json')
        self.assertGreater(captcha.predict(scene['busFeatures'], model), model['threshold'])
        for feature in scene['backgroundFeatures']:
            self.assertLess(captcha.predict(feature, model), model['threshold'])

    def test_one_backend_job_one_circuit_and_reproducible_measurements(self):
        backend = CountingSimulator()
        report = captcha.run_demo(backend, bus_tile=11, shots=4096, verbose=False)
        self.assertEqual(backend.run_calls, 1)
        self.assertEqual(report['learned_marked_indices'], [11])
        self.assertEqual(report['backend_jobs_submitted'], 1)
        self.assertEqual(report['circuits_in_job'], 1)
        self.assertEqual(report['ideal_oracle_calls'], 3)
        self.assertAlmostEqual(report['ideal_marked_probability'], 0.9613189697265625, places=11)
        self.assertLess(abs(report['observed_marked_fraction'] - report['ideal_marked_probability']), 0.02)

    def test_absent_bus_reports_empty_predicate_without_false_detection(self):
        backend = CountingSimulator()
        report = captcha.run_demo(backend, bus_tile=None, shots=256, verbose=False)
        self.assertEqual(backend.run_calls, 1)
        self.assertEqual(report['learned_marked_indices'], [])
        self.assertEqual(report['ideal_oracle_calls'], 0)
        self.assertEqual(report['observed_marked_fraction'], 0)

    def test_qollab_auto_main_does_not_submit_twice(self):
        import contextlib
        import io
        backend = CountingSimulator()
        namespace = dict(__name__='__main__', __file__=str(captcha.HERE / 'main.py'), backend=backend)
        exec((captcha.HERE / 'main.py').read_text(), namespace)
        self.assertEqual(backend.run_calls, 0)
        with contextlib.redirect_stdout(io.StringIO()):
            report = namespace['main'](bus_tile=5, shots=256)
        self.assertEqual(backend.run_calls, 1)
        self.assertEqual(report['learned_marked_indices'], [5])


if __name__ == '__main__':
    unittest.main()
