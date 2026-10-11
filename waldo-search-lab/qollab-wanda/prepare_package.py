"""Rebuild scene.json and package-manifest.json from the frozen model and fixture.

Usage: ``python prepare_package.py`` (developer tool; not needed to run the demo).

* Verifies model.json and held-out-trace-fixtures.json against their known
  SHA-256 hashes, so a different model or fixture cannot slip in.
* Copies the first 16 reserved test rows, in their fixed order, into scene.json.
  No training, row picking or threshold tuning happens here.
* Inside the full repository it also refreshes the source PNGs and artwork
  provenance; a standalone copy of this folder reuses the files it already has.
"""
import hashlib
import json
from pathlib import Path
import shutil

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()
model_file, fixture_file = HERE/'model.json', HERE/'held-out-trace-fixtures.json'
expected_model = 'd1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88'
expected_fixture = 'a6da338c53bea727b3c7e39f4f24aa81c618e554e8029a05035e3a5997db49ea'
if sha(model_file) != expected_model or sha(fixture_file) != expected_fixture:
    raise ValueError('Expected exact frozen Wanda weights and untouched first16 test rows.')
fixture = json.loads(fixture_file.read_text()); rows = fixture['fixtures']
if len(rows) != 16 or [r['row'] for r in rows] != list(range(16)) or fixture['modelSHA256'] != expected_model:
    raise ValueError('Fixture order/count or model provenance differs.')
scene = {
    'scope': 'First16 fixed-order reserved test windows from multiple example scenes. Grover addresses index this fixture table, not one CAPTCHA image. Threshold-only compilation; cross-scene NMS is inapplicable. Numerical circuit companion, not whole-scene accuracy or quantum-advantage evidence.',
    'split': 'test', 'selection': fixture['selection'], 'modelSHA256': expected_model,
    'fixtureSHA256': expected_fixture, 'sourceDatasetSHA256': fixture['sourceDatasetSHA256'],
    'features': [r['features'] for r in rows], 'expectedReadouts': [r['expectedReadouts'] for r in rows],
    'expectedScores': [r['expectedProbability'] for r in rows], 'evaluationLabels': [r['label'] for r in rows],
    'evaluationRowMetadata': [{k:v for k,v in r.items() if k not in ['features','expectedReadouts','expectedProbability']} for r in rows]
}
(HERE/'scene.json').write_text(json.dumps(scene, indent=2)+'\n')
# Existing portable copies suffice for a standalone table rebuild. A project checkout
# additionally provides the exact source PNGs and original generation provenance.
for relative in sorted({r['fixture'] for r in rows}):
    path = Path(relative)
    if path.is_absolute() or '..' in path.parts:
        raise ValueError('Fixture path must remain within the package.')
    source, dest = PROJECT/'model/wanda-qnn'/path, HERE/path
    if source.is_file():
        dest.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(source, dest)
    if not dest.is_file():
        raise FileNotFoundError('Missing source PNG: '+relative)
for source_name, dest_name in [('provenance.json','artwork-provenance.json'),('generation-prompts.json','generation-prompts.json')]:
    source = PROJECT/'dist/assets/wanda'/source_name
    if source.is_file(): shutil.copyfile(source,HERE/dest_name)
files = ['model.json','held-out-trace-fixtures.json','scene.json','artwork-provenance.json','generation-prompts.json'] + sorted({r['fixture'] for r in rows})
manifest = {'scope':'Local frozen model/fixture package; no upload, fit, row selection or threshold change.',
            'featureVersion':fixture['featureVersion'],'classifierQubits':4,'fixtureSearchQubits':4,
            'rows':16,'selectedRowIndices':list(range(16)),
            'files':{f:sha(HERE/f) for f in files}}
(HERE/'package-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'rows':16,'modelSHA256':expected_model,'fixtureSHA256':expected_fixture,'copiedPNGFiles':3}))
