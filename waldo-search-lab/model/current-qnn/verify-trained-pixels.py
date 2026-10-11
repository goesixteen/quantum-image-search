"""Parity on the predeclared first 16 actual rendered split windows.

Python/Pillow decodes the saved opaque native PNG pixels and checks its feature
extractor against the native JavaScript vectors, then exports trained readouts.
Use validation before freeze; use test only after candidate freeze.
"""
import sys,json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
import train_current_qnn as t
from qnn_localizer_features import extract_window_features

split='test' if '--test' in sys.argv else 'validation'
model_path=t.OUT/'current-qnn.json'
model=json.loads(model_path.read_text())
meta=json.loads((t.OUT/f'{split}-dataset.json').read_text())
vectors=np.fromfile(t.OUT/meta['features'],dtype='<f8').reshape(-1,8)
labels=np.fromfile(t.OUT/meta['labels'],dtype='u1')
records=meta['windowRecords'][:16]
assert [r['row'] for r in records]==list(range(16))
fixtures=[];max_error=0.;cache={}
for record in records:
    file=t.OUT/record['fixture']
    if str(file) not in cache:cache[str(file)]=np.array(Image.open(file).convert('RGBA'))
    assert labels[record['row']]==record['label']
    features=extract_window_features(cache[str(file)],*record['candidateCenter'],record['targetWidth'],record['targetHeight'])
    max_error=max(max_error,float(np.max(np.abs(features-vectors[record['row']]))))
    readout=t.circuit(features[None,:],np.array(model['theta']))[0]
    probability=float(t.sigmoid(np.array([readout@np.array(model['readout'])+model['bias']]))[0])
    fixtures.append(dict(**record,features=vectors[record['row']].tolist(),expectedReadouts=readout.tolist(),expectedProbability=probability,pixelFixtureSHA256=t.sha(file)))
assert max_error<1e-12,max_error
report=dict(scope='First16 rows in fixed split order; genuine final scene RGB and supplied scale; no favorable-example selection.',split=split,featureVersion=model['featureVersion'],featureNames=model['featureNames'],modelSHA256=t.sha(model_path),pythonFeatureSHA256=t.sha(t.PROJECT/'model/qnn_localizer_features.py'),pythonVsStoredNativeJSFeatureMaxError=max_error,fixtures=fixtures)
t.save('heldout-feature-fixture.json' if split=='test' else 'trained-pixel-fixtures.json',report)
print(json.dumps(dict(split=split,n=len(fixtures),pythonVsStoredNativeJSFeatureMaxError=max_error,status='PASS')))
