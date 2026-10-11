"""Independent actual-trained readout/Grover and one-job/no-postselection checks."""
import contextlib
import hashlib
import io
import math
from pathlib import Path
import unittest
import numpy as np
from qiskit.providers.basic_provider import BasicSimulator
from qiskit.quantum_info import Operator, Statevector
import main as demo

class CountingSimulator(BasicSimulator):
    def __init__(self):
        super().__init__(); self.calls = 0; self.job_circuit_count = None
    def run(self, run_input, **kwargs):
        self.calls += 1; self.job_circuit_count = len(run_input) if isinstance(run_input,list) else 1
        kwargs['seed_simulator'] = 2026101107
        return super().run(run_input, **kwargs)

class WandaQiskitTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model,cls.scene = demo.load_data('model.json'),demo.load_data('scene.json')

    def test_exact_frozen_weights_and_first16_rows(self):
        manifest=demo.load_data('package-manifest.json')
        for name,expected in manifest['files'].items():
            self.assertEqual(hashlib.sha256((demo.HERE/name).read_bytes()).hexdigest(),expected,name)
        self.assertEqual(manifest['files']['model.json'],'d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88')
        self.assertEqual([r['row'] for r in self.scene['evaluationRowMetadata']],list(range(16)))
        self.assertEqual(self.model['featureVersion'],'wanda-window-v1')

    def test_actual_trained_qiskit_readout_and_sigmoid_match_independent_numpy(self):
        for feature,readout,score in zip(self.scene['features'],self.scene['expectedReadouts'],self.scene['expectedScores']):
            np.testing.assert_allclose(demo.quantum_readout(feature,self.model),readout,atol=1e-13,rtol=0)
            self.assertAlmostEqual(demo.predict(feature,self.model),score,places=13)
        gates=demo.qnn_circuit(self.scene['features'][0],self.model).count_ops()
        self.assertEqual(gates['ry'],32);self.assertEqual(gates['rz'],32);self.assertEqual(gates['cx'],16)

    def test_last_rz_slots_change_no_diagonal_readout_or_score(self):
        changed={**self.model,'theta':list(self.model['theta'])}
        for i,delta in zip([25,27,29,31],[.9,-1.4,2.1,-.7]):changed['theta'][i]+=delta
        for f in self.scene['features']:
            np.testing.assert_allclose(demo.quantum_readout(f,self.model),demo.quantum_readout(f,changed),atol=1e-13,rtol=0)

    def test_exact_oracle_and_reflection_matrices(self):
        diagonal=np.ones(16);diagonal[[2,9]]=-1
        np.testing.assert_allclose(Operator(demo.phase_oracle(4,[2,9])).data,np.diag(diagonal),atol=1e-13,rtol=0)
        np.testing.assert_allclose(Operator(demo.diffuser(4)).data,np.full((16,16),1/8)-np.eye(16),atol=1e-13,rtol=0)

    def test_full_distribution_matches_analytic_first_peak_overshoot_and_edges(self):
        for N,marks in [(16,[3]),(64,[2,19]),(16,[]),(16,list(range(16)))]:
            for k in [0,1,demo.recommend_iterations(N,len(marks)),8]:
                probabilities=Statevector.from_instruction(demo.grover_circuit(N,marks,k)).probabilities();M=len(marks)
                accepted=math.sin((2*k+1)*math.asin(math.sqrt(M/N)))**2
                expected=np.full(N,(1-accepted)/(N-M) if M<N else 0.)
                if M:expected[marks]=accepted/M
                np.testing.assert_allclose(probabilities,expected,atol=2e-13,rtol=0)
                self.assertAlmostEqual(float(probabilities.sum()),1,places=11)

    def test_one_backend_job_and_labels_never_change_scores_marks_or_samples(self):
        a,b=CountingSimulator(),CountingSimulator()
        one=demo.run_demo(a,shots=4096,verbose=False)
        changed={**self.scene,'evaluationLabels':[1-int(y) for y in self.scene['evaluationLabels']]}
        two=demo.run_demo(b,shots=4096,verbose=False,model=self.model,scene=changed)
        self.assertEqual(a.calls,1);self.assertEqual(a.job_circuit_count,1)
        self.assertEqual(one['scores'],two['scores']);self.assertEqual(one['learnedMarkedIndices'],two['learnedMarkedIndices']);self.assertEqual(one['counts'],two['counts'])
        self.assertEqual(one['threshold'],self.model['threshold']);self.assertEqual(one['classifierQubits'],4);self.assertEqual(one['searchQubits'],4)
        self.assertEqual(sum(one['reportedRowCounts'].values()),one['shots'])
        self.assertLess(abs(one['observedPredicateFraction']-one['idealPredicateMass']),.04)

    def test_unmarked_samples_are_preserved_without_forced_or_postselected_answers(self):
        # Construct a one-accepted-row table using unchanged trained weights/threshold.
        scores=self.scene['expectedScores'];positive=self.scene['features'][int(np.argmax(scores))];negative=self.scene['features'][int(np.argmin(scores))]
        self.assertGreaterEqual(max(scores),self.model['threshold']);self.assertLess(min(scores),self.model['threshold'])
        scene={'features':[positive]+[negative]*15,'evaluationLabels':[1]+[0]*15}
        backend=CountingSimulator();result=demo.run_demo(backend,shots=4096,verbose=False,model=self.model,scene=scene,iterations=0)
        self.assertEqual(result['learnedMarkedIndices'],[0]);self.assertEqual(result['iterations'],0);self.assertEqual(backend.calls,1)
        self.assertEqual(sum(result['reportedRowCounts'].values()),4096)
        self.assertGreater(sum(c for i,c in result['reportedRowCounts'].items() if int(i)!=0),0)

    def test_empty_and_full_predicates_have_honest_output_policy(self):
        for threshold in [1.,0.]:
            model={**self.model,'threshold':threshold};backend=CountingSimulator();report=demo.run_demo(backend,shots=256,verbose=False,model=model,scene=self.scene)
            self.assertEqual(backend.calls,1);self.assertEqual(sum(report['counts'].values()),256);self.assertEqual(report['iterations'],0)
            self.assertEqual(sum(report['reportedRowCounts'].values()),0 if threshold else 256)

    def test_injected_backend_requires_explicit_entrypoint_and_never_runs_twice(self):
        backend=CountingSimulator();namespace={'__name__':'__main__','__file__':str(demo.HERE/'main.py'),'backend':backend}
        exec((demo.HERE/'main.py').read_text(),namespace);self.assertEqual(backend.calls,0)
        with contextlib.redirect_stdout(io.StringIO()):report=namespace['main'](256)
        self.assertEqual(backend.calls,1);self.assertEqual(report['backendJobsSubmitted'],1)

    def test_wrong_feature_or_circuit_metadata_is_rejected(self):
        feature=self.scene['features'][0]
        for change in [{'featureVersion':'current-qnn-window-v3'},{'qubits':3},{'layers':3}]:
            with self.assertRaises(ValueError):demo.qnn_circuit(feature,{**self.model,**change})
        with self.assertRaises(ValueError):demo.qnn_circuit(feature[:7],self.model)

if __name__=='__main__':unittest.main()
