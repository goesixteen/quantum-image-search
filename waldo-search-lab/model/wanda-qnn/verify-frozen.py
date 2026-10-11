"""Read-only frozen checkpoint/source/pixel parity verifier; no training or writes."""
from pathlib import Path
import json,sys,hashlib
import numpy as np
from PIL import Image
HERE=Path(__file__).resolve().parent;PROJECT=HERE.parents[1];sys.path.insert(0,str(PROJECT/'model'))
from wanda_features import extract_window_features
from qnn_core import circuit,sigmoid
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
freeze=json.loads((HERE/'usable-candidate-freeze.json').read_text());assert all(sha(HERE/f)==h for f,h in freeze['files'].items()),'Frozen evidence changed';assert all(sha(HERE/f)==h for f,h in freeze['sourceFiles'].items()),'Frozen source changed'
model=json.loads((HERE/'wanda-qnn.json').read_text());erratum=json.loads((HERE/'metadata-erratum.json').read_text());assert sha(HERE/'wanda-qnn.json')==erratum['frozenModelSHA256'];assert model['trainingDomain']==erratum['inheritedIncorrectValue'];assert sha(PROJECT/'dist/model/wanda-qnn.json')==sha(HERE/'wanda-qnn.json')
rows=json.loads((HERE/'pixel-parity-fixtures.json').read_text())['fixtures'];errors=[]
for row in rows:
    assert sha(HERE/row['file'])==row['sha256'];rgb=np.asarray(Image.open(HERE/row['file']).convert('RGBA'));f=extract_window_features(rgb,*row['candidateCenter'],row['targetWidth'],row['targetHeight']);z=circuit(f[None,:],np.array(model['theta']))[0];s=float(sigmoid(z@model['readout']+model['bias']));errors.append([float(np.max(np.abs(f-row['features']))),float(np.max(np.abs(z-row['readout']))),abs(s-row['score'])])
assert np.max(errors)<2e-12
report=dict(passed=True,readOnly=True,modelSHA256=sha(HERE/'wanda-qnn.json'),frozenFiles=len(freeze['files']),frozenSourceFiles=len(freeze['sourceFiles']),pixelFixtures=len(rows),maxFeatureReadoutScoreErrors=np.max(errors,axis=0).tolist(),metadataErratumVerified=True);print(json.dumps(report))
