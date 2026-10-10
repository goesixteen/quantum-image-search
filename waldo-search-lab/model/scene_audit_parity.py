"""Export hard scene fixture patches for identical-pixel browser-QNN parity.

This does not test the browser's image assembly/resampling. It tests the JS
feature extractor and saved quantum circuit on exactly the same RGBA arrays.
"""
import base64
import hashlib
import json
import platform
from pathlib import Path
import numpy as np
from PIL import Image, __version__ as pillow_version

from scene_audit import ROOT, PixelScorer, sha


def main():
    fixtures_path = ROOT / 'model/scene-audit-fixtures.json'
    fixtures = json.loads(fixtures_path.read_text())
    qnn_path, baseline_path = ROOT / 'dist/model/model.json', ROOT / 'model/baseline_metrics.json'
    qnn, baseline = json.loads(qnn_path.read_text()), json.loads(baseline_path.read_text())
    scorer = PixelScorer(qnn, baseline)
    rows = []
    for fixture in fixtures:
        path = ROOT / fixture['scene_file']
        if sha(path) != fixture['scene_sha256']:
            raise RuntimeError('Saved scene pixels changed.')
        record = fixture['record']
        scene = Image.open(path).convert('RGB')
        grid = record['config']['grid']
        features = scorer.features(scene, grid, use_cache=False)
        if hashlib.sha256(features.astype('<f8').tobytes()).hexdigest() != record['features_sha256']:
            raise AssertionError('Saved PNG does not reproduce recorded scene features.')
        # Labels choose diagnostic examples only; their RGBA pixels alone enter
        # each predictor. Include target, highest-score and every false tile.
        chosen = {max(record['true_tiles'], key=lambda i: record['alpha_pixel_counts'][i]),
                  int(np.argmax(record['models']['qnn']['scores'])),
                  *record['models']['qnn']['false_marked_tiles']}
        cell = 512 // grid
        for index in sorted(chosen):
            x, y = index % grid * cell, index // grid * cell
            patch = scene.crop((x, y, x + cell, y + cell)).resize((128, 128), Image.Resampling.LANCZOS).convert('RGBA')
            rows.append(dict(id=record['config']['id'] + f'-tile{index}', scene_id=record['config']['id'], tile=index,
                             width=128, height=128, rgba_base64=base64.b64encode(patch.tobytes()).decode('ascii'),
                             features=features[index].tolist(), probability=record['models']['qnn']['scores'][index],
                             label_scope='Target/false annotation selects a diagnostic patch only; not an inference input.'))
    output = ROOT / 'model/scene-audit-parity-fixtures.json'
    report = dict(qnn_model_sha256=sha(qnn_path), baseline_sha256=sha(baseline_path),
                  fixture_report_sha256=sha(fixtures_path), javascript_module_sha256=sha(ROOT / 'dist/qnn.js'),
                  source_sha256=sha(__file__), software=dict(python=platform.python_version(), numpy=np.__version__, pillow=pillow_version),
                  scope='Identical supplied RGBA patch pixels; no native browser raster parity claim.', fixtures=rows)
    output.write_text(json.dumps(report, separators=(',', ':'), allow_nan=False) + '\n')
    print(f'Exported {len(rows)} hard diagnostic patches to {output}')


if __name__ == '__main__':
    main()
