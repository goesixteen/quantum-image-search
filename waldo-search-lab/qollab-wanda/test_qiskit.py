"""Tests for main.py: trained-model parity, exact Grover maths and Qollab run rules.

Run with ``python -m unittest test_qiskit.py -v``. Every test is independent of
the network and of any paid service; backends are Qiskit's local BasicSimulator.

What is checked, and why it matters:

* **Frozen inputs.** model.json and the fixtures match their recorded SHA-256
  hashes, so results cannot silently come from a different model.
* **QNN parity.** The Qiskit circuit reproduces the expectation values and
  scores saved by an independent NumPy implementation to ~1e-13.
* **Grover correctness.** Oracle and diffuser equal their textbook matrices,
  and the full output distribution matches the analytic formula for any
  number of rounds, including the empty and all-marked edge cases.
* **Honest reporting.** Labels never influence scores or samples, unmarked
  samples are never discarded, and each run submits exactly one job (IonQ's
  simulators and QPUs allow only one job per run).
* **Qollab runtime.** Loading the file with an injected ``backend`` does not
  run anything until the runtime calls ``main()``, and the ``main`` signature
  satisfies Qollab's Run settings rules.
"""
import contextlib
import hashlib
import inspect
import io
import math
import re
import unittest

import numpy as np
from qiskit.providers.basic_provider import BasicSimulator
from qiskit.quantum_info import Operator, Statevector

import main as demo


class CountingSimulator(BasicSimulator):
    """BasicSimulator that counts jobs and circuits per job, with a fixed seed."""

    def __init__(self):
        super().__init__()
        self.calls = 0
        self.job_circuit_count = None

    def run(self, run_input, **kwargs):
        self.calls += 1
        self.job_circuit_count = len(run_input) if isinstance(run_input, list) else 1
        kwargs['seed_simulator'] = 2026101107  # reproducible counts
        return super().run(run_input, **kwargs)


class WandaQiskitTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model, cls.scene = demo.load_data('model.json'), demo.load_data('scene.json')

    # -- Frozen inputs -------------------------------------------------------

    def test_exact_frozen_weights_and_first16_rows(self):
        """Every packaged data file matches its checksum; rows are 0..15 in order."""
        manifest = demo.load_data('package-manifest.json')
        for name, expected in manifest['files'].items():
            self.assertEqual(hashlib.sha256((demo.HERE / name).read_bytes()).hexdigest(), expected, name)
        self.assertEqual(manifest['files']['model.json'],
                         'd1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88')
        self.assertEqual([r['row'] for r in self.scene['evaluationRowMetadata']], list(range(16)))
        self.assertEqual(self.model['featureVersion'], 'wanda-window-v1')

    # -- Stage 1: QNN classifier --------------------------------------------

    def test_actual_trained_qiskit_readout_and_sigmoid_match_independent_numpy(self):
        """Qiskit expectations and scores equal the independently saved NumPy values."""
        for feature, readout, score in zip(self.scene['features'], self.scene['expectedReadouts'],
                                           self.scene['expectedScores']):
            np.testing.assert_allclose(demo.quantum_readout(feature, self.model), readout, atol=1e-13, rtol=0)
            self.assertAlmostEqual(demo.predict(feature, self.model), score, places=13)
        # 4 layers x 4 qubits x (1 encoding + 1 trainable) RY and RZ; 4 layers x 4 CNOTs.
        gates = demo.qnn_circuit(self.scene['features'][0], self.model).count_ops()
        self.assertEqual(gates['ry'], 32)
        self.assertEqual(gates['rz'], 32)
        self.assertEqual(gates['cx'], 16)

    def test_last_rz_slots_change_no_diagonal_readout_or_score(self):
        """The final-layer RZ angles only change phases, so Z expectations are unchanged."""
        changed = {**self.model, 'theta': list(self.model['theta'])}
        for i, delta in zip([25, 27, 29, 31], [.9, -1.4, 2.1, -.7]):
            changed['theta'][i] += delta
        for f in self.scene['features']:
            np.testing.assert_allclose(demo.quantum_readout(f, self.model), demo.quantum_readout(f, changed),
                                       atol=1e-13, rtol=0)

    def test_wrong_feature_or_circuit_metadata_is_rejected(self):
        """A model for a different feature contract or circuit shape is refused."""
        feature = self.scene['features'][0]
        for change in [{'featureVersion': 'current-qnn-window-v3'}, {'qubits': 3}, {'layers': 3}]:
            with self.assertRaises(ValueError):
                demo.qnn_circuit(feature, {**self.model, **change})
        with self.assertRaises(ValueError):
            demo.qnn_circuit(feature[:7], self.model)

    # -- Stage 2: Grover search ---------------------------------------------

    def test_exact_oracle_and_reflection_matrices(self):
        """Oracle is diag(+-1) on marked rows; diffuser is 2|s><s| - I."""
        diagonal = np.ones(16)
        diagonal[[2, 9]] = -1
        np.testing.assert_allclose(Operator(demo.phase_oracle(4, [2, 9])).data, np.diag(diagonal),
                                   atol=1e-13, rtol=0)
        np.testing.assert_allclose(Operator(demo.diffuser(4)).data, np.full((16, 16), 1 / 8) - np.eye(16),
                                   atol=1e-13, rtol=0)

    def test_full_distribution_matches_analytic_first_peak_overshoot_and_edges(self):
        """After k rounds, marked rows share sin^2((2k+1)theta); the rest share the remainder."""
        for N, marks in [(16, [3]), (64, [2, 19]), (16, []), (16, list(range(16)))]:
            for k in [0, 1, demo.recommend_iterations(N, len(marks)), 8]:
                probabilities = Statevector.from_instruction(demo.grover_circuit(N, marks, k)).probabilities()
                M = len(marks)
                accepted = math.sin((2 * k + 1) * math.asin(math.sqrt(M / N))) ** 2
                expected = np.full(N, (1 - accepted) / (N - M) if M < N else 0.)
                if M:
                    expected[marks] = accepted / M
                np.testing.assert_allclose(probabilities, expected, atol=2e-13, rtol=0)
                self.assertAlmostEqual(float(probabilities.sum()), 1, places=11)

    # -- Honest reporting -----------------------------------------------------

    def test_one_backend_job_and_labels_never_change_scores_marks_or_samples(self):
        """Flipping every label leaves scores, marks and counts identical; one job per run."""
        a, b = CountingSimulator(), CountingSimulator()
        one = demo.run_demo(a, shots=4096, verbose=False)
        changed = {**self.scene, 'evaluationLabels': [1 - int(y) for y in self.scene['evaluationLabels']]}
        two = demo.run_demo(b, shots=4096, verbose=False, model=self.model, scene=changed)
        self.assertEqual(a.calls, 1)
        self.assertEqual(a.job_circuit_count, 1)
        self.assertEqual(one['scores'], two['scores'])
        self.assertEqual(one['learnedMarkedIndices'], two['learnedMarkedIndices'])
        self.assertEqual(one['counts'], two['counts'])
        self.assertEqual(one['threshold'], self.model['threshold'])
        self.assertEqual(one['classifierQubits'], 4)
        self.assertEqual(one['searchQubits'], 4)
        self.assertEqual(sum(one['reportedRowCounts'].values()), one['shots'])
        self.assertLess(abs(one['observedPredicateFraction'] - one['idealPredicateMass']), .04)

    def test_unmarked_samples_are_preserved_without_forced_or_postselected_answers(self):
        """With 0 rounds most shots land on unmarked rows, and all of them are reported."""
        # Build a one-accepted-row table from real rows, using the unchanged weights and threshold.
        scores = self.scene['expectedScores']
        positive = self.scene['features'][int(np.argmax(scores))]
        negative = self.scene['features'][int(np.argmin(scores))]
        self.assertGreaterEqual(max(scores), self.model['threshold'])
        self.assertLess(min(scores), self.model['threshold'])
        scene = {'features': [positive] + [negative] * 15, 'evaluationLabels': [1] + [0] * 15}
        backend = CountingSimulator()
        result = demo.run_demo(backend, shots=4096, verbose=False, model=self.model, scene=scene, iterations=0)
        self.assertEqual(result['learnedMarkedIndices'], [0])
        self.assertEqual(result['iterations'], 0)
        self.assertEqual(backend.calls, 1)
        self.assertEqual(sum(result['reportedRowCounts'].values()), 4096)
        self.assertGreater(sum(c for i, c in result['reportedRowCounts'].items() if int(i) != 0), 0)

    def test_empty_and_full_predicates_have_honest_output_policy(self):
        """No marks: no locations reported. All marked: uniform, every row reported."""
        for threshold in [1., 0.]:
            model = {**self.model, 'threshold': threshold}
            backend = CountingSimulator()
            report = demo.run_demo(backend, shots=256, verbose=False, model=model, scene=self.scene)
            self.assertEqual(backend.calls, 1)
            self.assertEqual(sum(report['counts'].values()), 256)
            self.assertEqual(report['iterations'], 0)
            self.assertEqual(sum(report['reportedRowCounts'].values()), 0 if threshold else 256)

    # -- Qollab runtime -------------------------------------------------------

    def test_injected_backend_requires_explicit_entrypoint_and_never_runs_twice(self):
        """Loading main.py with a `backend` global submits nothing; main() submits exactly one job."""
        backend = CountingSimulator()
        namespace = {'__name__': '__main__', '__file__': str(demo.HERE / 'main.py'), 'backend': backend}
        exec((demo.HERE / 'main.py').read_text(), namespace)
        self.assertEqual(backend.calls, 0)
        with contextlib.redirect_stdout(io.StringIO()):
            report = namespace['main'](256)
        self.assertEqual(backend.calls, 1)
        self.assertEqual(report['backendJobsSubmitted'], 1)

    def test_qollab_style_default_call_prints_summary_and_uses_recommended_rounds(self):
        """Qollab calls main() with the form defaults; -1 means 'recommended rounds'."""
        backend = CountingSimulator()
        namespace = {'__name__': '__main__', '__file__': str(demo.HERE / 'main.py'), 'backend': backend}
        exec((demo.HERE / 'main.py').read_text(), namespace)
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            report = namespace['main']()
        self.assertEqual(backend.calls, 1)
        self.assertEqual(report['iterations'], report['recommendedIterations'])
        self.assertIn('Stage 2: Grover search', output.getvalue())
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(namespace['main'](128, 0)['iterations'], 0)

    def test_main_signature_satisfies_qollab_run_settings_rules(self):
        """`def main(` is on one line at column 0 and every parameter is an annotated int/float/str/bool."""
        source = (demo.HERE / 'main.py').read_text()
        lines = [line for line in source.splitlines() if re.match(r'def main\(', line)]
        self.assertEqual(len(lines), 1)
        self.assertTrue(lines[0].rstrip().endswith(':'))
        for parameter in inspect.signature(demo.main).parameters.values():
            self.assertIn(parameter.annotation, ('int', 'float', 'str', 'bool', int, float, str, bool))
            self.assertIsNot(parameter.default, inspect.Parameter.empty)


if __name__ == '__main__':
    unittest.main()
