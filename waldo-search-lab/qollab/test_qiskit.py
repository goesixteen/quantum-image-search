"""Independent Qiskit readout/Grover and exactly-one-job validation."""
import contextlib
import io
import hashlib
import math
import unittest
import numpy as np
from qiskit.quantum_info import Operator, Statevector
from qiskit.providers.basic_provider import BasicSimulator
import main as demo

class CountingSimulator(BasicSimulator):
    def __init__(self):
        super().__init__(); self.calls = 0
    def run(self, *args, **kwargs):
        self.calls += 1; kwargs['seed_simulator'] = 202610107
        return super().run(*args, **kwargs)

class CrowdQiskitTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = demo.load_data('diagnostic-model.json'); cls.scene = demo.load_data('diagnostic-scene.json')

    def test_exact_qnn_scores_match_independent_numpy_and_browser_fixture(self):
        for feature, expected in zip(self.scene['features'], self.scene['expectedScores']):
            self.assertAlmostEqual(demo.predict(feature, self.model), expected, places=13)
        self.assertEqual(demo.qnn_circuit(self.scene['features'][0], self.model).count_ops()['cx'], 16)

    def test_all_seven_observables_match_saved_numpy_readout(self):
        for feature, expected in zip(self.scene['features'], self.scene['expectedReadouts']):
            np.testing.assert_allclose(demo.quantum_readout(feature, self.model), expected, atol=1e-13)

    def test_final_four_rz_slots_are_prediction_inactive(self):
        changed = {**self.model, 'theta': list(self.model['theta'])}
        for i, delta in zip((25,27,29,31), (.7,-1.2,2.9,-.4)):
            changed['theta'][i] += delta
        for feature in self.scene['features']:
            np.testing.assert_allclose(demo.quantum_readout(feature,self.model),demo.quantum_readout(feature,changed),atol=1e-13)
            self.assertAlmostEqual(demo.predict(feature,self.model),demo.predict(feature,changed),places=13)

    def test_oracle_and_diffuser_are_exact_independent_matrices(self):
        diagonal = np.ones(16); diagonal[[3, 11]] = -1
        np.testing.assert_allclose(Operator(demo.phase_oracle(4, [3, 11])).data, np.diag(diagonal), atol=1e-13)
        np.testing.assert_allclose(Operator(demo.diffuser(4)).data, np.full((16, 16), 2/16) - np.eye(16), atol=1e-13)

    def test_grover_curve_and_empty_full_overshoot(self):
        for N, marks in ((16, [3]), (64, [2, 17]), (16, []), (16, list(range(16)))):
            for k in (0, 1, demo.recommend_iterations(N, len(marks)), 8):
                p = Statevector.from_instruction(demo.grover_circuit(N, marks, k)).probabilities()
                self.assertAlmostEqual(float(p.sum()), 1., places=11)
                expected = math.sin((2*k+1)*math.asin(math.sqrt(len(marks)/N)))**2
                self.assertAlmostEqual(float(p[marks].sum()), expected, places=11)

    def test_single_job_one_circuit_and_labels_do_not_enter_predicate(self):
        # A controlled diagnostic threshold exercises nonempty sampling; no trained threshold changes.
        model = {**self.model, 'threshold': sorted(self.scene['expectedScores'])[7]}
        backend = CountingSimulator(); first = demo.run_demo(backend, shots=4096, verbose=False, model=model, scene=self.scene, diagnostic=True)
        changed = {**self.scene, 'evaluationLabels': [1] * 16}; other = CountingSimulator(); second = demo.run_demo(other, shots=4096, verbose=False, model=model, scene=changed, diagnostic=True)
        self.assertEqual(backend.calls, 1); self.assertEqual(first['backendJobsSubmitted'], 1); self.assertEqual(first['circuitsInJob'], 1)
        self.assertEqual(first['scores'], second['scores']); self.assertEqual(first['learnedMarkedIndices'], second['learnedMarkedIndices']); self.assertEqual(first['counts'], second['counts'])
        self.assertEqual(sum(first['reportedDetectionCounts'].values()), first['shots'])
        self.assertLess(abs(first['observedPredicateFraction'] - first['idealPredicateMass']), .04)

    def test_empty_predicate_reports_abstention_even_with_diagnostic_counts(self):
        model = {**self.model, 'threshold': 1.}; backend = CountingSimulator(); report = demo.run_demo(backend, shots=256, verbose=False, model=model, scene=self.scene)
        self.assertEqual(backend.calls, 1); self.assertEqual(report['learnedMarkedIndices'], []); self.assertEqual(report['reportedDetectionCounts'], {}); self.assertEqual(report['idealPredicateMass'], 0.)

    def test_injected_backend_loading_does_not_submit_twice(self):
        backend = CountingSimulator(); namespace = {'__name__': '__main__', '__file__': str(demo.HERE/'main.py'), 'backend': backend}; exec((demo.HERE/'main.py').read_text(), namespace)
        self.assertEqual(backend.calls, 0)
        with contextlib.redirect_stdout(io.StringIO()):
            report = namespace['run_demo'](shots=256, model=self.model, scene=self.scene, diagnostic=True)
        self.assertEqual(backend.calls, 1); self.assertEqual(report['backendJobsSubmitted'], 1)

    def test_frozen_trained_checkpoint_if_packaged(self):
        if not (demo.HERE/'model.json').exists() or not (demo.HERE/'scene.json').exists():
            self.skipTest('Frozen trained checkpoint pending; diagnostic parity remains verified.')
        model, scene = demo.load_data('model.json'), demo.load_data('scene.json')
        self.assertFalse(model.get('diagnostic', False))
        self.assertEqual(hashlib.sha256((demo.HERE/'model.json').read_bytes()).hexdigest(),scene['modelSHA256'])
        self.assertEqual(scene['split'],'test')
        self.assertEqual([row['row'] for row in scene['evaluationRowMetadata']],list(range(16)))
        for feature, expected in zip(scene['features'], scene['expectedScores']):
            self.assertAlmostEqual(demo.predict(feature, model), expected, places=13)
        for feature, expected in zip(scene['features'], scene['expectedReadouts']):
            np.testing.assert_allclose(demo.quantum_readout(feature,model),expected,atol=1e-13)
        backend = CountingSimulator(); report = demo.run_demo(backend, shots=4096, verbose=False)
        self.assertEqual(backend.calls, 1); self.assertFalse(report['diagnostic'])
        self.assertEqual(report['threshold'],model['threshold'])
        self.assertEqual(report['learnedMarkedIndices'],[i for i,score in enumerate(report['scores']) if score>=model['threshold']])
        self.assertEqual(sum(report['reportedDetectionCounts'].values()),report['shots'] if report['learnedMarkedIndices'] else 0)

if __name__ == '__main__':
    unittest.main()
