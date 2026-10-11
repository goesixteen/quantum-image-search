"""Run local SDK checks and save transparent diagnostic/trained-checkpoint status."""
from datetime import datetime, timezone
import hashlib
import json
import math
import unittest
import numpy as np
import qiskit
from qiskit.quantum_info import Operator
import main as demo
import test_qiskit as checks

result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromModule(checks))
if not result.wasSuccessful():
    raise SystemExit(1)
model, scene = demo.load_data('diagnostic-model.json'), demo.load_data('diagnostic-scene.json')
readout_error = max(float(np.max(np.abs(demo.quantum_readout(f, model) - expected)))
                    for f, expected in zip(scene['features'], scene['expectedReadouts']))
score_error = max(abs(demo.predict(f, model) - expected)
                  for f, expected in zip(scene['features'], scene['expectedScores']))
diagonal = np.ones(16); diagonal[[3, 11]] = -1
oracle_error = float(np.max(np.abs(Operator(demo.phase_oracle(4, [3, 11])).data - np.diag(diagonal))))
diffuser_error = float(np.max(np.abs(Operator(demo.diffuser(4)).data - (np.full((16, 16), 2 / 16) - np.eye(16)))))
controlled = {**model, 'threshold': sorted(scene['expectedScores'])[7]}
backend = checks.CountingSimulator()
sample = demo.run_demo(backend, shots=4096, verbose=False, model=controlled, scene=scene, diagnostic=True)
pending = not (demo.HERE / 'model.json').exists() or not (demo.HERE / 'scene.json').exists()
trained_summary = None
if not pending:
    trained_model, trained_scene = demo.load_data('model.json'), demo.load_data('scene.json')
    trained_backend = checks.CountingSimulator()
    trained = demo.run_demo(trained_backend, shots=4096, verbose=False)
    trained['modelSHA256'] = hashlib.sha256((demo.HERE / 'model.json').read_bytes()).hexdigest()
    trained['sceneSHA256'] = hashlib.sha256((demo.HERE / 'scene.json').read_bytes()).hexdigest()
    trained['heldoutFixtureSHA256'] = trained_scene['heldoutFixtureSHA256']
    trained['selectedRowIndices'] = [row['row'] for row in trained_scene['evaluationRowMetadata']]
    trained['split'] = trained_scene['split']
    trained['samplingSeed'] = 202610107
    trained['createdAt'] = datetime.now(timezone.utc).isoformat()
    trained['maxReadoutErrorVsSavedNumPy'] = max(float(np.max(np.abs(demo.quantum_readout(f, trained_model) - expected)))
                                               for f, expected in zip(trained_scene['features'], trained_scene['expectedReadouts']))
    trained['maxScoreErrorVsSavedNumPy'] = max(abs(score - expected) for score, expected in zip(trained['scores'], trained_scene['expectedScores']))
    M, N, k = len(trained['learnedMarkedIndices']), trained['candidates'], trained['iterations']
    theta = math.asin(math.sqrt(M / N))
    accepted_mass = math.sin((2*k+1)*theta)**2
    analytic = np.full(N, (1-accepted_mass)/(N-M) if M < N else 0.)
    if M:
        analytic[trained['learnedMarkedIndices']] = accepted_mass/M
    trained['maxDistributionErrorVsAnalyticGrover'] = float(np.max(np.abs(np.asarray(trained['idealDistribution']) - analytic)))
    (demo.HERE / 'trained-validation.json').write_text(json.dumps(trained, indent=2) + '\n')
    trained_summary = {key: trained[key] for key in ['modelSHA256', 'heldoutFixtureSHA256', 'maxReadoutErrorVsSavedNumPy',
                       'maxScoreErrorVsSavedNumPy', 'maxDistributionErrorVsAnalyticGrover', 'threshold',
                       'learnedMarkedIndices', 'iterations', 'idealPredicateMass', 'idealTrueLabelMass',
                       'observedPredicateFraction', 'observedTrueLabelFraction', 'backendJobsSubmitted', 'circuitsInJob']}
report = {
    'status': 'V3 diagnostic parity verified; trained checkpoint pending' if pending else 'V3 diagnostic and frozen trained-checkpoint parity verified',
    'createdAt': datetime.now(timezone.utc).isoformat(), 'featureVersion': demo.FEATURE_VERSION,
    'qiskitVersion': qiskit.__version__, 'testsPassed': result.testsRun - len(result.skipped),
    'testsSkipped': len(result.skipped), 'trainedCheckpointPending': pending,
    'fixtureCandidates': len(scene['features']), 'maxReadoutError': readout_error,
    'maxScoreError': score_error, 'maxOracleMatrixError': oracle_error,
    'maxDiffuserMatrixError': diffuser_error,
    'trainedCheckpoint': trained_summary,
    'controlledDiagnosticSampling': {
        'note': 'Median threshold used ONLY for numerical sampling test; not trained threshold or performance evidence',
        'backendJobs': backend.calls, 'shots': sample['shots'], 'marks': sample['learnedMarkedIndices'],
        'idealPredicateMass': sample['idealPredicateMass'], 'observedPredicateFraction': sample['observedPredicateFraction']
    },
    'sourceSHA256': {name: hashlib.sha256((demo.HERE / name).read_bytes()).hexdigest()
                     for name in ['main.py', 'diagnostic-model.json', 'diagnostic-scene.json', 'test_qiskit.py']},
    'scope': 'Local Qiskit SDK only; no Qollab/IonQ run, uploads, API keys, test-set threshold tuning or advantage claim. Compiled hybrid oracle, not coherent QNN sigmoid threshold.'
}
(demo.HERE / 'local-validation.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({key: report[key] for key in ['status', 'testsPassed', 'testsSkipped', 'maxReadoutError', 'maxScoreError']}))
