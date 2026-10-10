"""Reserved-background evaluation of already frozen photo logistic/QNN models.

No fitting, feature changes, regularization search, or threshold selection occurs.
Uses the trainer's shared held-out renderer with a baseline scoring callback.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import time

import numpy as np
from PIL import Image

from train import ROOT, DIST
from classical_baseline_photo import score_features
from unseen_audit import compositing_audit
from amplification_audit import summarize_audit


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--placements', type=int, default=384)
    parser.add_argument('--street', type=Path, default=ROOT / 'model/evaluation-assets/emeryville-bay-street-512.png')
    args = parser.parse_args()
    if args.placements < 1:
        parser.error('--placements must be positive')
    started = time.perf_counter()
    baseline_path = ROOT / 'model/photo_baseline_metrics.json'
    qnn_path = DIST / 'model/model-photo.json'
    sprite_path = DIST / 'assets/real-schoolbus.png'
    paths = [baseline_path, qnn_path, sprite_path, args.street]
    paths += [ROOT / 'model' / name for name in ['unseen_audit.py', 'amplification_audit.py', 'classical_baseline_photo.py', 'classical_baseline_photo_unseen.py', 'photo_features.py', 'train.py', 'train_photo.py', 'classical_baseline.py']]
    frozen = {str(path.relative_to(ROOT)): sha(path) for path in paths}
    baseline = json.loads(baseline_path.read_text())
    qnn = json.loads(qnn_path.read_text())
    if baseline['qnn_reference']['model_sha256'] != sha(qnn_path):
        raise RuntimeError('The comparison requires the original frozen QNN checkpoint.')
    if abs(baseline['threshold'] - .82) > 1e-12:
        raise RuntimeError('Expected the previously frozen 0.82 validation-selected threshold.')
    for name, digest in baseline['generator_source_sha256'].items():
        if sha(ROOT / 'model' / name) != digest:
            raise RuntimeError(f'Frozen baseline feature/generator changed: {name}')
    if sha(sprite_path) != baseline['assets'][0]['sha256']:
        raise RuntimeError('Seen foreground cutout differs from the frozen training asset.')
    street, bus = Image.open(args.street).convert('RGB'), Image.open(sprite_path).convert('RGBA')
    if street.size != (512, 512):
        raise RuntimeError('Use the saved exact 512x512 evaluation raster.')
    weights, bias = np.asarray(baseline['raw_feature_weights']), baseline['raw_feature_bias']
    scorer = lambda features: score_features(features, weights, bias)
    audits = {}
    for grid in [4, 8]:
        logistic = compositing_audit(street, bus, {'threshold': baseline['threshold']}, grid, args.placements, score_fn=scorer)
        quantum = compositing_audit(street, bus, qnn, grid, args.placements)
        for a, b in zip(logistic['records'], quantum['records']):
            if any(a[key] != b[key] for key in ['position', 'alpha32_tiles', 'alpha20_tiles', 'bbox_area10_tiles']):
                raise RuntimeError('Paired evaluation pixels/annotations are not the same.')
        logistic['grover_probability_summary'] = summarize_audit(logistic)
        quantum['grover_probability_summary'] = summarize_audit(quantum)
        audits[f'grid{grid}'] = dict(logistic=logistic, qnn=quantum)
    if frozen != {str(path.relative_to(ROOT)): sha(path) for path in paths}:
        raise RuntimeError('A frozen input changed during audit; no report was written.')
    report = dict(
        protocol='Reserved independent Emeryville street; original seen bus cutout; identical paired pixels/positions; classifiers and validation-selected thresholds frozen before evaluation.',
        fitting_or_threshold_selection=False,
        frozen_sha256=frozen,
        models=dict(logistic=dict(parameters=9, threshold=baseline['threshold'], baseline_report='photo_baseline_metrics.json'),
                    qnn=dict(parameters=qnn['parameterCount'], threshold=qnn['threshold'], checkpoint='model-photo.json')),
        ground_truth='Any inserted foreground alpha>32 pixel per region, used only for evaluation. Alpha>20 and previous coarse rectangle rule are also logged by the shared renderer.',
        complete_scene_definition='At least one correct marked tile and zero false marked tiles; this does not require marking every target-overlapping tile.',
        compositing=audits, elapsed_seconds=time.perf_counter() - started,
        interpretation='One unseen street identity with a seen bus identity; no general photographic recognition claim. Hit rate alone can be inflated by preexisting background marks. Complete scene rate, empty false marks, new-correct-mark hit rate, and actual target mass expose contamination.',
    )
    output = ROOT / 'model/photo_baseline_unseen_audit.json'
    output.write_text(json.dumps(report, indent=2, allow_nan=False) + '\n')
    for key, paired in audits.items():
        print(json.dumps(dict(grid=key, **{name: dict(empty_marks=value['empty_scene']['marked_tiles'], alpha32=value['criteria']['alpha32'], new_correct_mark_hit_rate=value['new_correct_mark_hit_rate'], grover=value['grover_probability_summary']) for name, value in paired.items()}), indent=2), flush=True)
    print(f'Wrote {output}', flush=True)


if __name__ == '__main__':
    main()
