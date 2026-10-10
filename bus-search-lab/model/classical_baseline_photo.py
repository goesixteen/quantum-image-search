"""Matched nine-parameter logistic baseline for the frozen photo-composite QNN.

Reuses the actual photo generator, hue feature extractor, counts and split seeds.
No QNN checkpoint, trainer, feature definition, asset or UI file is modified.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import time

import numpy as np
from PIL import Image

from classical_baseline import fit, sigmoid, verify_gradient, REGULARIZATION_GRID
from train import ROOT, DIST, FEATURE_NAMES, metrics, circuit
from train_photo import SEED, load_assets, photo_dataset
from photo_features import extract_photo_features

SPLITS = {
    'train': dict(n=3200, seed=SEED, stress=False),
    'validation': dict(n=800, seed=SEED + 1, stress=False),
    'test': dict(n=2000, seed=SEED + 202, stress=False),
    'stress_test': dict(n=1200, seed=SEED + 203, stress=True),
}
THRESHOLDS = np.arange(.15, .86, .01)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def score_features(features, weights, bias):
    return sigmoid(np.asarray(features) @ weights + bias)


def scene_audit(bus, backgrounds, weights, bias, threshold, grid, trials=384, qnn_model=None):
    """Same placement seed/geometry/raster/alpha criterion as placement_audit()."""
    rng = np.random.default_rng(SEED + 201)
    cell = 512 // grid
    width = round(cell * .82)
    sprite = bus.resize((width, min(round(width * bus.height / bus.width), round(cell * .84))), Image.Resampling.LANCZOS)
    hits, clean, misses = [], [], []
    paired = {name: {criterion: dict(hits=[], clean=[], misses=[]) for criterion in ['alpha20', 'alpha32']}
              for name in ['logistic', 'qnn'] if name == 'logistic' or qnn_model is not None}
    for trial in range(trials):
        scene = backgrounds[trial % len(backgrounds)].copy()
        x = int(rng.integers(0, 513 - sprite.width))
        y = int(rng.integers(0, 513 - sprite.height))
        scene.paste(sprite, (x, y), sprite)
        alpha_image = Image.new('L', (512, 512))
        alpha_image.paste(sprite.getchannel('A'), (x, y))
        raw_alpha = np.asarray(alpha_image)
        features, overlaps, overlaps32 = [], [], []
        for gy in range(grid):
            for gx in range(grid):
                tile = scene.crop((gx * cell, gy * cell, (gx + 1) * cell, (gy + 1) * cell)).resize((64, 64), Image.Resampling.LANCZOS)
                features.append(extract_photo_features(tile))
                tile_alpha = raw_alpha[gy * cell:(gy + 1) * cell, gx * cell:(gx + 1) * cell]
                overlaps.append(bool((tile_alpha > 20).any()))
                overlaps32.append(bool((tile_alpha > 32).any()))
        scores = score_features(features, weights, bias)
        marks = scores >= threshold
        overlap = np.asarray(overlaps)
        hit = bool(np.any(marks & overlap))
        hits.append(hit)
        clean.append(bool(np.all(~marks | overlap)))
        if not hit:
            misses.append(dict(position=[x, y], max_score=float(scores.max())))
        model_scores = {'logistic': scores}
        model_thresholds = {'logistic': threshold}
        if qnn_model is not None:
            model_scores['qnn'] = sigmoid(circuit(np.asarray(features), np.asarray(qnn_model['theta'])) @ np.asarray(qnn_model['readout']) + qnn_model['bias'])
            model_thresholds['qnn'] = qnn_model['threshold']
        for name, values in model_scores.items():
            accepted = values >= model_thresholds[name]
            for criterion, truth in [('alpha20', overlaps), ('alpha32', overlaps32)]:
                truth = np.asarray(truth)
                correct = bool(np.any(accepted & truth))
                paired[name][criterion]['hits'].append(correct)
                paired[name][criterion]['clean'].append(bool(np.all(~accepted | truth)))
                if not correct:
                    paired[name][criterion]['misses'].append(dict(position=[x, y], max_score=float(values.max())))
    empty, qnn_empty = [], []
    for background in backgrounds:
        features = [extract_photo_features(background.crop((gx * cell, gy * cell, (gx + 1) * cell, (gy + 1) * cell)).resize((64, 64), Image.Resampling.LANCZOS))
                    for gy in range(grid) for gx in range(grid)]
        scores = score_features(features, weights, bias)
        empty.append(dict(max_score=float(scores.max()), marked_tiles=np.flatnonzero(scores >= threshold).tolist(), scores=scores.tolist()))
        if qnn_model is not None:
            scores = sigmoid(circuit(np.asarray(features), np.asarray(qnn_model['theta'])) @ np.asarray(qnn_model['readout']) + qnn_model['bias'])
            qnn_empty.append(dict(max_score=float(scores.max()), marked_tiles=np.flatnonzero(scores >= qnn_model['threshold']).tolist(), scores=scores.tolist()))
    paired_summary = {name: {criterion: dict(scenes=trials, any_overlap_hit_rate=float(np.mean(values['hits'])),
                                             no_false_tile_mark_rate=float(np.mean(values['clean'])), misses=values['misses'])
                             for criterion, values in criteria.items()} for name, criteria in paired.items()}
    return dict(scenes=trials, seed=SEED + 201, grid=[grid, grid], sprite_size=list(sprite.size),
                any_overlap_hit_rate=float(np.mean(hits)), no_false_tile_mark_rate=float(np.mean(clean)),
                misses=misses, empty_scene_audits=empty,
                legacy_ground_truth='any foreground alpha>20 pixel in tile; matches frozen trainer audit',
                current_ui_ground_truth='any foreground alpha>32 pixel in tile; evaluation only',
                paired_comparison=paired_summary, qnn_empty_scene_audits=qnn_empty,
                scope='same supplied photo/cutout assets; held-out full-canvas placements; alpha overlap is evaluation only, not an inference input')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--qnn-model', type=Path, default=DIST / 'model/model-photo.json')
    parser.add_argument('--max-iterations', type=int, default=250)
    parser.add_argument('--scene-trials', type=int, default=384)
    parser.add_argument('--audit-only', action='store_true', help='Add paired alpha audits to the already frozen baseline without refitting.')
    args = parser.parse_args()
    started = time.perf_counter()
    model_bytes = args.qnn_model.read_bytes()
    model = json.loads(model_bytes)
    if model.get('featureVersion') != 'yellow-hue-v2' or model['featureNames'] != FEATURE_NAMES:
        raise RuntimeError('Expected the frozen photo QNN with exactly the hue feature extractor.')
    for name, config in SPLITS.items():
        if model['splitSeeds'][name] != config['seed'] or model['metrics'][name]['n'] != config['n']:
            raise RuntimeError('Frozen QNN split counts/seeds do not match the comparison protocol.')
    sources = {name: sha256(ROOT / 'model' / name) for name in ['train.py', 'train_photo.py', 'photo_features.py', 'classical_baseline.py']}
    paths = [DIST / 'assets' / asset['file'] for asset in model['assets']]
    for path, asset in zip(paths, model['assets']):
        if sha256(path) != asset['sha256']:
            raise RuntimeError(f'Asset hash mismatch: {path.name}')
    bus, backgrounds = load_assets(paths[0], paths[1:])
    output = ROOT / 'model/photo_baseline_metrics.json'
    if args.audit_only:
        report = json.loads(output.read_text())
        if report['qnn_reference']['model_sha256'] != hashlib.sha256(model_bytes).hexdigest():
            raise RuntimeError('Frozen baseline references a different QNN checkpoint.')
        if report['generator_source_sha256'] != sources:
            raise RuntimeError('Reference feature/generator source changed since baseline fitting.')
        audit_started = time.perf_counter()
        report['scene_audits'] = {f'grid{grid}': scene_audit(bus, backgrounds,
                                  np.asarray(report['raw_feature_weights']), report['raw_feature_bias'],
                                  report['threshold'], grid, args.scene_trials, model) for grid in [4, 8]}
        report['paired_audit_implementation_sha256'] = sha256(__file__)
        report['elapsed_seconds']['additional_paired_alpha_audits'] = time.perf_counter() - audit_started
        if sources != {name: sha256(ROOT / 'model' / name) for name in sources} or args.qnn_model.read_bytes() != model_bytes:
            raise RuntimeError('Reference source or QNN checkpoint changed during paired audit.')
        output.write_text(json.dumps(report, indent=2, allow_nan=False) + '\n')
        print(json.dumps({name: audit['paired_comparison'] for name, audit in report['scene_audits'].items()}, indent=2), flush=True)
        return
    gradient_error = verify_gradient()
    data, hashes, qnn_regenerated = {}, {}, {}
    print('Generating identical photo-QNN splits...', flush=True)
    for name, config in SPLITS.items():
        features, labels, _ = photo_dataset(config['n'], config['seed'], bus, backgrounds, config['stress'], extract_photo_features)
        if not np.all(np.isfinite(features)):
            raise AssertionError('All generated features must be finite.')
        data[name] = features, labels
        hashes[name] = hashlib.sha256(features.astype('<f8').tobytes() + labels.astype('<f8').tobytes()).hexdigest()
        qnn_prediction = sigmoid(circuit(features, np.asarray(model['theta'])) @ np.asarray(model['readout']) + model['bias'])
        regenerated = metrics(labels, qnn_prediction, model['threshold'])
        for key in ['true_positive', 'false_positive', 'false_negative', 'true_negative']:
            if regenerated[key] != model['metrics'][name][key]:
                raise RuntimeError(f'Regenerated {name} QNN confusion matrix differs; comparison is not matched.')
        if abs(regenerated['bce'] - model['metrics'][name]['bce']) > 1e-10:
            raise RuntimeError(f'Regenerated {name} QNN probabilities differ from its frozen checkpoint evaluation.')
        qnn_regenerated[name] = regenerated
    data_seconds = time.perf_counter() - started
    mean = data['train'][0].mean(axis=0)
    scale = data['train'][0].std(axis=0)
    scale = np.where(scale > 1e-10, scale, 1)
    designs = {name: np.c_[(features - mean) / scale, np.ones(len(features))] for name, (features, _) in data.items()}
    fitting_started = time.perf_counter()
    candidates = []
    for regularization in REGULARIZATION_GRID:
        parameters, optimization = fit(designs['train'], data['train'][1], regularization, args.max_iterations)
        bce = metrics(data['validation'][1], sigmoid(designs['validation'] @ parameters))['bce']
        candidates.append((bce, regularization, parameters, optimization))
    best_bce, regularization, parameters, optimization = min(candidates, key=lambda item: item[0])
    val_prediction = sigmoid(designs['validation'] @ parameters)
    threshold = max([metrics(data['validation'][1], val_prediction, float(t)) for t in THRESHOLDS], key=lambda result: result['f1'])['threshold']
    raw_weights = parameters[:-1] / scale
    raw_bias = float(parameters[-1] - raw_weights @ mean)
    predictions = {name: sigmoid(designs[name] @ parameters) for name in data}
    results = {name: metrics(labels, predictions[name], threshold) for name, (_, labels) in data.items()}
    parity = float(np.max(abs(score_features(data['test'][0], raw_weights, raw_bias) - predictions['test'])))
    if parity > 1e-12:
        raise AssertionError('Raw-feature conversion changed logistic predictions.')
    fitting_seconds = time.perf_counter() - fitting_started
    print('Auditing identical full-canvas placement protocol...', flush=True)
    audit_started = time.perf_counter()
    audits = {f'grid{grid}': scene_audit(bus, backgrounds, raw_weights, raw_bias, threshold, grid, args.scene_trials, model) for grid in [4, 8]}
    report = dict(
        version=1, name='Photo same-feature logistic regression', parameter_count=9,
        feature_names=FEATURE_NAMES, feature_version='yellow-hue-v2',
        training_domain=model['trainingDomain'], split_configuration=SPLITS,
        generator_source_sha256=sources, split_feature_and_label_sha256=hashes,
        comparator_source_sha256=sha256(__file__),
        assets=model['assets'], normalized_background=model.get('normalizedBackground'),
        preprocessing='training-only mean/std; affine standardization absorbed into raw coefficients',
        optimization='full-batch Newton logistic regression with line search; L2 weights only, bias unpenalized',
        regularization=float(regularization), regularization_selection='minimum validation BCE; no test/stress/scene selection',
        regularization_candidates=[dict(lambda_value=float(item[1]), validation_bce=float(item[0]), **item[3]) for item in candidates],
        threshold=threshold, threshold_selection='maximum validation F1 on QNN-matched 0.15..0.85 step0.01 grid; first maximum',
        best_validation_bce=best_bce, optimization_result=optimization,
        raw_feature_weights=raw_weights.tolist(), raw_feature_bias=raw_bias,
        training_feature_mean=mean.tolist(), training_feature_std=scale.tolist(),
        splits=results, scene_audits=audits,
        qnn_reference=dict(name=model['name'], parameter_count=model['parameterCount'], model_sha256=hashlib.sha256(model_bytes).hexdigest(),
                           model_path=str(args.qnn_model), split_seeds_and_counts_confirmed=True,
                           regenerated_confusion_and_bce_confirmed=True, regenerated_splits=qnn_regenerated),
        verification=dict(loss_gradient_finite_difference_max_error=gradient_error, raw_vs_standardized_probability_max_error=parity),
        elapsed_seconds=dict(data_generation_and_qnn_recheck=data_seconds, fitting_and_validation_selection=fitting_seconds,
                             scene_audits=time.perf_counter() - audit_started, total=time.perf_counter() - started),
        interpretation='Same input features and examples compare classifier behavior, not equal model capacity, photographic generalization, Grover success, or quantum runtime advantage.',
    )
    if sources != {name: sha256(ROOT / 'model' / name) for name in sources} or args.qnn_model.read_bytes() != model_bytes:
        raise RuntimeError('A reference source or checkpoint changed during evaluation; rerun after freezing it.')
    output.write_text(json.dumps(report, indent=2, allow_nan=False) + '\n')
    print(json.dumps(dict(output=str(output), splits=results,
                          scene_audits={name: dict(hit_rate=audit['any_overlap_hit_rate'], clean_rate=audit['no_false_tile_mark_rate'], empty_marks=[a['marked_tiles'] for a in audit['empty_scene_audits']]) for name, audit in audits.items()}), indent=2), flush=True)


if __name__ == '__main__':
    main()
