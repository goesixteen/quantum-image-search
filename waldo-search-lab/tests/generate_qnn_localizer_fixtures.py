"""Regenerate deterministic pixel/NumPy circuit parity fixtures; no model fitting."""
import json
from pathlib import Path
import sys
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'model'))
from qnn_localizer_features import extract_window_features, FEATURE_VERSION, FEATURE_NAMES
from qnn_core import circuit, sigmoid

rng = np.random.default_rng(202610107)
height, width = 71, 53
image = rng.integers(0, 256, (height, width, 4), dtype=np.uint8)
image[..., 3] = 255
palette = np.array([[225, 35, 35], [235, 235, 230], [20, 70, 170]])
for y in range(9, 53):
    image[y, 15:34, :3] = palette[(y // 3) % 3]
theta = rng.uniform(-2, 2, 32)
model = {'featureVersion': FEATURE_VERSION, 'featureNames': FEATURE_NAMES, 'qubits': 4, 'layers': 4,
         'theta': theta.tolist(), 'readout': rng.normal(0, 1, 7).tolist(), 'bias': -.4, 'threshold': .5}
cases = []
for target_height in (24, 52, 112):
    target_width = round(target_height * 18 / 52)
    for cx, cy in ((26, 35), (4, 4), (48, 65), (26.5, 35.25)):
        f = extract_window_features(image, cx, cy, target_width, target_height)
        score = float(sigmoid(circuit(f[None, :], theta) @ np.asarray(model['readout']) + model['bias'])[0])
        cases.append({'cx': cx, 'cy': cy, 'targetWidth': target_width, 'targetHeight': target_height, 'features': f.tolist(), 'score': score})
result = {'description': 'Synthetic pixels and random circuit parameters, numerical parity only; not trained-model evidence.',
          'width': width, 'height': height, 'rgba': image.reshape(-1).tolist(), 'model': model, 'cases': cases}
(ROOT / 'tests/qnn-localizer-fixtures.json').write_text(json.dumps(result, separators=(',', ':')) + '\n')
print('Saved12 pixel/circuit parity cases')
