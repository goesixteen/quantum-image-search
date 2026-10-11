"""Regenerate synthetic pixel-derived fixtures; never fit or select model weights."""
import hashlib
import json
from pathlib import Path
import sys
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT / 'model'))
from qnn_core import circuit, sigmoid

source = ROOT / 'tests/qnn-localizer-fixtures.json'
fixture = json.loads(source.read_text())
model = {**fixture['model'], 'diagnostic': True,
         'name': 'Random numerical parity weights, not trained'}
cases = fixture['cases'] + fixture['cases'][:4]
features = np.asarray([case['features'] for case in cases])
readouts = circuit(features, np.asarray(model['theta']))
scores = sigmoid(readouts @ np.asarray(model['readout']) + model['bias'])
scene = {
    'scope': 'Diagnostic compact16-candidate table from synthetic V3 pixel parity fixtures; repeated rows, no trained localization claim.',
    'features': features.tolist(), 'expectedReadouts': readouts.tolist(),
    'expectedScores': scores.tolist(), 'evaluationLabels': None,
    'pixelFixtureSource': 'tests/qnn-localizer-fixtures.json',
    'pixelFixtureSHA256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'selection': 'First12 cases plus first4 repeated; predetermined numeric parity only.'
}
for name, data in [('diagnostic-model.json', model), ('diagnostic-scene.json', scene)]:
    (HERE / name).write_text(json.dumps(data, indent=2) + '\n')
print('Saved16 V3 diagnostic candidates; original checkpoint and training data untouched.')
