"""Package exact frozen weights and first16 predeclared test windows, without fitting."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import main as demo

HERE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--model', type=Path, required=True)
parser.add_argument('--fixture', type=Path, required=True)
parser.add_argument('--expected-model-sha256', required=True)
parser.add_argument('--expected-fixture-sha256', required=True)
options = parser.parse_args()
def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()
if sha(options.model) != options.expected_model_sha256.lower() or sha(options.fixture) != options.expected_fixture_sha256.lower():
    raise ValueError('Frozen checkpoint or predeclared fixture checksum differs.')
model = json.loads(options.model.read_text())
fixture = json.loads(options.fixture.read_text())
demo.validate_model(model)
rows = fixture['fixtures']
if fixture.get('split') != 'test' or len(rows) != 16 or [row['row'] for row in rows] != list(range(16)):
    raise ValueError('Expected untouched first16 test rows in fixed order.')
if fixture['modelSHA256'] != sha(options.model) or fixture['featureVersion'] != demo.FEATURE_VERSION or fixture['featureNames'] != demo.FEATURE_NAMES:
    raise ValueError('Test fixture does not match frozen model/feature contract.')
# Copy byte-for-byte. Scores, threshold, checkpoint metadata and labels are untouched.
shutil.copyfile(options.model, HERE / 'model.json')
shutil.copyfile(options.fixture, HERE / 'heldout-feature-fixture.json')
pixel_files = {}
for row in rows:
    relative = Path(row['fixture'])
    if relative.is_absolute() or '..' in relative.parts:
        raise ValueError('Fixture PNG path must remain inside its source folder.')
    source = options.fixture.parent / relative
    if sha(source) != row['pixelFixtureSHA256']:
        raise ValueError('Source RGB fixture checksum differs: ' + str(relative))
    destination = HERE / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
    pixel_files[relative.as_posix()] = sha(destination)
scene = {
    'scope': 'First16 fixed-order held-out pixel-derived windows. This compact row table combines example scenes; it is not one CAPTCHA or a full4096-window localization audit. Grover addresses index fixture rows, not scene coordinates. Threshold-only compilation, without cross-scene NMS.',
    'split': 'test', 'selection': 'First16 rows in fixed split order; no favorable-example selection or threshold tuning.',
    'modelSHA256': sha(options.model), 'heldoutFixtureSHA256': sha(options.fixture),
    'features': [row['features'] for row in rows],
    'expectedReadouts': [row['expectedReadouts'] for row in rows],
    'expectedScores': [row['expectedProbability'] for row in rows],
    'evaluationLabels': [row['label'] for row in rows],
    # These fields are provenance/evaluation metadata, never acceptance inputs.
    'evaluationRowMetadata': [{key: value for key, value in row.items()
                               if key not in ['features', 'expectedReadouts', 'expectedProbability']}
                              for row in rows]
}
(HERE / 'scene.json').write_text(json.dumps(scene, indent=2) + '\n')
manifest = {
    'packagedAtUtc': datetime.now(timezone.utc).isoformat(), 'featureVersion': demo.FEATURE_VERSION,
    'modelSHA256': sha(HERE / 'model.json'), 'heldoutFixtureSHA256': sha(HERE / 'heldout-feature-fixture.json'),
    'sceneSHA256': sha(HERE / 'scene.json'), 'pixelFixtures': pixel_files,
    'rows': 16, 'selectedRowIndices': list(range(16)), 'split': 'test',
    'scope': 'Local-only exact-checkpoint circuit companion; no training, threshold changes, contest upload or hardware execution.'
}
(HERE / 'trained-package-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest, indent=2))
