"""Run local SDK tests and save exact trained circuit and sampled-job evidence."""
from datetime import datetime,timezone
import hashlib
import json
import math
import unittest
import numpy as np
import qiskit
from qiskit.quantum_info import Operator
import main as demo
import test_qiskit as checks

tests=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromModule(checks))
if not tests.wasSuccessful():raise SystemExit(1)
model,scene=demo.load_data('model.json'),demo.load_data('scene.json')
backend=checks.CountingSimulator();report=demo.run_demo(backend,shots=4096,verbose=False)
readout_error=max(float(np.max(np.abs(demo.quantum_readout(f,model)-expected))) for f,expected in zip(scene['features'],scene['expectedReadouts']))
score_error=max(abs(score-expected) for score,expected in zip(report['scores'],scene['expectedScores']))
N,M,k=report['candidates'],len(report['learnedMarkedIndices']),report['iterations']
accepted=math.sin((2*k+1)*math.asin(math.sqrt(M/N)))**2
analytic=np.full(N,(1-accepted)/(N-M) if M<N else 0.)
if M:analytic[report['learnedMarkedIndices']]=accepted/M
diagonal=np.ones(16);diagonal[[2,9]]=-1
oracle_error=float(np.max(np.abs(Operator(demo.phase_oracle(4,[2,9])).data-np.diag(diagonal))))
diffuser_error=float(np.max(np.abs(Operator(demo.diffuser(4)).data-(np.full((16,16),1/8)-np.eye(16)))))
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
report.update({
    'createdAtUtc':datetime.now(timezone.utc).isoformat(),'qiskitVersion':qiskit.__version__,'numpyVersion':np.__version__,
    'testsPassed':tests.testsRun-len(tests.skipped),'testsSkipped':len(tests.skipped),
    'modelSHA256':sha(demo.HERE/'model.json'),'heldoutFixtureSHA256':sha(demo.HERE/'held-out-trace-fixtures.json'),
    'selectedRows':list(range(16)),'samplingSeed':2026101107,
    'maxReadoutErrorVsSavedNumPy':readout_error,'maxScoreErrorVsSavedNumPy':score_error,
    'maxDistributionErrorVsAnalyticGrover':float(np.max(np.abs(np.asarray(report['idealDistribution'])-analytic))),
    'maxOracleMatrixError':oracle_error,'maxDiffuserMatrixError':diffuser_error,
    'scoreSelectionPolicy':'Frozen threshold; no test-based row selection or threshold adjustment',
    'implementationOrigin':'Adapted original project qollab/main.py, preserved unchanged in its archived package',
    'limitations':['First16 window table combines scenes; no cross-scene NMS or full image search',
                   'Known-size handcrafted RGB features prepared classically; fixture features are saved',
                   'QNN circuit evaluated with local statevectors; classical readout/threshold compile the phase oracle',
                   'No coherent QNN sigmoid oracle, hardware/platform verification, calibration or quantum-advantage evidence'],
    'sourceSHA256':{name:sha(demo.HERE/name) for name in ['main.py','test_qiskit.py','validate_local.py','prepare_package.py','requirements.txt']}
})
(demo.HERE/'local-validation.json').write_text(json.dumps(report,indent=2)+'\n')
manifest=demo.load_data('package-manifest.json')
manifest['sourceSHA256']=report['sourceSHA256']
(demo.HERE/'package-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({key:report[key] for key in ['testsPassed','testsSkipped','maxReadoutErrorVsSavedNumPy','maxScoreErrorVsSavedNumPy','maxDistributionErrorVsAnalyticGrover','learnedMarkedIndices','iterations','idealPredicateMass','idealTrueLabelMass','observedPredicateFraction','observedTrueLabelFraction','backendJobsSubmitted','circuitsInJob']}))
