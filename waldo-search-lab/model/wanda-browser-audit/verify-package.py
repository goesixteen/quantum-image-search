"""Read-only verification of the new browser audit package; no fitting or rendering."""
from pathlib import Path
import argparse, hashlib, json
import numpy as np
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--audit-dir', default=str(Path(__file__).resolve().parent))
args = parser.parse_args()
audit = Path(args.audit_dir).resolve()
manifest = json.loads((audit / 'audit-manifest.json').read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
for name, expected in manifest['files'].items():
    path = (audit / name).resolve()
    assert path.is_relative_to(audit), f'Out-of-package path: {name}'
    assert sha(path) == expected, f'Changed package file: {name}'
report = json.loads((audit / 'report.json').read_text())
fixtures = json.loads((audit / 'fixture-manifest.json').read_text())
assert not report['selfTest'] and report['casesCompared'] == 20
assert not report['missingCases'] and len(report['captureControlsVerifiedCases']) == 20
assert not report['captureControlsUnverifiedCases']
assert sha(audit / 'frozen-wanda-qnn.json') == report['modelSHA256']
rows = {row['id']: row for row in report['rows']}
for case in fixtures['cases']:
    native = np.asarray(Image.open(audit / case['expectedPNG']).convert('RGBA'))
    browser = np.asarray(Image.open(audit / case['browserPNG']).convert('RGBA'))
    assert native.shape == browser.shape == (512, 512, 4)
    assert np.all(native[:, :, 3] == 255) and np.all(browser[:, :, 3] == 255)
    assert sha(audit / case['browserPNG']) == rows[case['id']]['browserPNG_SHA256']
    assert int(np.any(native[:, :, :3] != browser[:, :, :3], axis=2).sum()) == rows[case['id']]['differentRGBPixels']
summary = report['summary']
assert summary['targetCases'] == 15 and summary['absenceCases'] == 5
assert summary['nativeCompleteHits'] == 13 and summary['browserCompleteCases'] == 15
assert summary['nativeCleanAbsences'] == summary['browserCleanAbsences'] == 5
assert summary['equalOracleCases'] == 18 and summary['byteIdenticalCases'] == 0
print(json.dumps({'verifiedFiles': len(manifest['files']), 'decodedFrames': 40,
                  'modelSHA256': report['modelSHA256'], 'summary': summary}, indent=2))
