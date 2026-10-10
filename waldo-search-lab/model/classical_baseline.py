"""Nine-parameter logistic comparator on the frozen StripePatch-QNN inputs.

Reuses the same pixel generator and held-out split seeds; no QNN files change.
Both models are scored on paired scenes, with the historical bounding-box rule
and the current browser's alpha>32 rule separately identified.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import time

import numpy as np
from PIL import Image

from train import ROOT, SEED, FEATURE_NAMES, dataset, extract_features
from qnn_core import circuit, metrics
from logistic_core import sigmoid, fit, verify_gradient

SPLITS = {'train': dict(n=1600, seed=SEED), 'validation': dict(n=400, seed=SEED + 1), 'test': dict(n=600, seed=SEED + 102)}
REGULARIZATION_GRID = (1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1)
THRESHOLDS = np.arange(.15, .86, .01)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def paired_scene_audit(crowd, character, model, weights, bias, threshold):
    rng = np.random.default_rng(SEED + 104)
    results = {}
    for grid in [4, 8]:
        canvas = crowd.resize((512, 512), Image.Resampling.LANCZOS)
        cell = 512 // grid
        features = [extract_features(canvas.crop((gx * cell, gy * cell, (gx + 1) * cell, (gy + 1) * cell)).resize((128, 128), Image.Resampling.LANCZOS))
                    for gy in range(grid) for gx in range(grid)]
        empty_features = np.asarray(features)
        empty_scores = {'logistic': sigmoid(empty_features @ weights + bias),
                        'qnn': sigmoid(circuit(empty_features, np.asarray(model['theta'])) @ np.asarray(model['readout']) + model['bias'])}
        thresholds = {'logistic': threshold, 'qnn': model['threshold']}
        trials = []
        for trial in range(20):
            scene = canvas.copy()
            height = round(cell * .75)
            width = max(8, round(character.width * height / character.height))
            obj = character.resize((width, height), Image.Resampling.LANCZOS)
            x, y = int(rng.integers(0, 512 - width)), int(rng.integers(0, 512 - height))
            scene.paste(obj, (x, y), obj)
            alpha_image = Image.new('L', (512, 512))
            alpha_image.paste(obj.getchannel('A'), (x, y))
            alpha = np.asarray(alpha_image) > 32
            features, bbox_true, alpha_true = [], [], []
            for index in range(grid * grid):
                gx, gy = index % grid, index // grid
                left, top = gx * cell, gy * cell
                tile = scene.crop((left, top, left + cell, top + cell)).resize((128, 128), Image.Resampling.LANCZOS)
                features.append(extract_features(tile))
                intersection = max(0, min(left + cell, x + width) - max(left, x)) * max(0, min(top + cell, y + height) - max(top, y))
                if intersection >= width * height * .20:
                    bbox_true.append(index)
                if alpha[top:top + cell, left:left + cell].any():
                    alpha_true.append(index)
            features = np.asarray(features)
            scores = {'logistic': sigmoid(features @ weights + bias),
                      'qnn': sigmoid(circuit(features, np.asarray(model['theta'])) @ np.asarray(model['readout']) + model['bias'])}
            outcome = dict(trial=trial, position=[x, y], sprite_size=[width, height], bbox20_true_tiles=bbox_true, alpha32_true_tiles=alpha_true)
            for name, values in scores.items():
                marks = np.flatnonzero(values >= thresholds[name]).tolist()
                outcome[name] = dict(marked_tiles=marks,
                                     bbox20_hit=bool(set(marks) & set(bbox_true)),
                                     alpha32_hit=bool(set(marks) & set(alpha_true)),
                                     bbox20_false_positive_tiles=len(set(marks) - set(bbox_true)),
                                     alpha32_false_positive_tiles=len(set(marks) - set(alpha_true)))
            trials.append(outcome)
        summary = {}
        for name in ['logistic', 'qnn']:
            summary[name] = dict(
                trials=len(trials), bbox20_hit_rate=sum(t[name]['bbox20_hit'] for t in trials) / len(trials),
                alpha32_hit_rate=sum(t[name]['alpha32_hit'] for t in trials) / len(trials),
                bbox20_no_false_tile_mark_rate=sum(t[name]['bbox20_false_positive_tiles'] == 0 for t in trials) / len(trials),
                alpha32_no_false_tile_mark_rate=sum(t[name]['alpha32_false_positive_tiles'] == 0 for t in trials) / len(trials),
                empty_crowd_max_score=float(empty_scores[name].max()),
                empty_crowd_marked_tiles=np.flatnonzero(empty_scores[name] >= thresholds[name]).tolist(),
            )
        results[f'grid{grid}'] = dict(grid=[grid, grid], seed=SEED + 104,
                                    historical_ground_truth='>=20% character bounding-box area in a tile; original trainer audit',
                                    current_ui_ground_truth='any foreground pixel with alpha>32 in a tile; evaluation only',
                                    summary=summary, trials=trials)
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--qnn-model', type=Path, default=ROOT / 'dist/model/model.json')
    parser.add_argument('--max-iterations', type=int, default=250)
    args = parser.parse_args()
    started = time.perf_counter()
    model_bytes = args.qnn_model.read_bytes()
    model = json.loads(model_bytes)
    if model['featureNames'] != FEATURE_NAMES:
        raise RuntimeError('Feature names differ from frozen QNN inputs.')
    for name, config in SPLITS.items():
        if model['splitSeeds'][name] != config['seed'] or model['metrics'][name]['n'] != config['n']:
            raise RuntimeError('Frozen QNN split configuration differs.')
    source_hashes = {name: sha256(ROOT / 'model' / name) for name in ['train.py', 'qnn_core.py', 'logistic_core.py', 'classical_baseline.py']}
    asset_hashes = {name: sha256(ROOT / 'dist/assets' / name) for name in ['crowd.png', 'crowd-captcha.png', 'character.png']}
    original_metrics = json.loads((ROOT / 'model/metrics.json').read_text())
    for name, digest in original_metrics['assetHashes'].items():
        if asset_hashes[name] != digest:
            raise RuntimeError('Asset bytes no longer match the trained experiment.')
    crowd = Image.open(ROOT / 'dist/assets/crowd-captcha.png').convert('RGB')
    original_normalized = Image.open(ROOT / 'dist/assets/crowd.png').convert('RGB').resize((512, 512), Image.Resampling.LANCZOS)
    if not np.array_equal(np.asarray(crowd), np.asarray(original_normalized)):
        raise RuntimeError('Normalized crowd pixels differ from the original training normalization.')
    character = Image.open(ROOT / 'dist/assets/character.png').convert('RGBA')
    gradient_error = verify_gradient()
    data, hashes, regenerated = {}, {}, {}
    print('Generating exact frozen Waldo-QNN split examples...', flush=True)
    for name, config in SPLITS.items():
        features, labels, _ = dataset(config['n'], config['seed'], crowd, character)
        data[name] = features, labels
        hashes[name] = hashlib.sha256(features.astype('<f8').tobytes() + labels.astype('<f8').tobytes()).hexdigest()
        qnn_prediction = sigmoid(circuit(features, np.asarray(model['theta'])) @ np.asarray(model['readout']) + model['bias'])
        score = metrics(labels, qnn_prediction, model['threshold'])
        for key in ['true_positive', 'false_positive', 'false_negative', 'true_negative']:
            if score[key] != model['metrics'][name][key]:
                raise RuntimeError(f'Regenerated QNN {name} confusion differs; comparison would be unmatched.')
        if abs(score['bce'] - model['metrics'][name]['bce']) > 1e-10:
            raise RuntimeError(f'Regenerated QNN {name} probabilities differ from frozen evaluation.')
        regenerated[name] = score
    data_seconds = time.perf_counter() - started
    mean, scale = data['train'][0].mean(axis=0), data['train'][0].std(axis=0)
    scale = np.where(scale > 1e-10, scale, 1.0)
    designs = {name: np.c_[(features - mean) / scale, np.ones(len(features))] for name, (features, _) in data.items()}
    fitting_started = time.perf_counter()
    candidates = []
    for regularization in REGULARIZATION_GRID:
        parameters, optimization = fit(designs['train'], data['train'][1], regularization, args.max_iterations)
        bce = metrics(data['validation'][1], sigmoid(designs['validation'] @ parameters))['bce']
        candidates.append((bce, regularization, parameters, optimization))
    best_bce, regularization, parameters, optimization = min(candidates, key=lambda item: item[0])
    vp = sigmoid(designs['validation'] @ parameters)
    threshold = max([metrics(data['validation'][1], vp, float(t)) for t in THRESHOLDS], key=lambda item: item['f1'])['threshold']
    weights = parameters[:-1] / scale
    bias = float(parameters[-1] - weights @ mean)
    predictions = {name: sigmoid(designs[name] @ parameters) for name in data}
    results = {name: metrics(labels, predictions[name], threshold) for name, (_, labels) in data.items()}
    parity = float(np.max(abs(sigmoid(data['test'][0] @ weights + bias) - predictions['test'])))
    if parity > 1e-12:
        raise AssertionError('Raw-feature coefficients changed logistic predictions.')
    fitting_seconds = time.perf_counter() - fitting_started
    print('Scoring both models on paired original scene placements...', flush=True)
    audit_started = time.perf_counter()
    audits = paired_scene_audit(crowd, character, model, weights, bias, threshold)
    # Preserve and verify the historical scene protocol before reporting UI alpha results.
    for historical in original_metrics['grid_audit']:
        actual = audits[f'grid{historical["grid"]}']['summary']['qnn']
        if abs(actual['bbox20_hit_rate'] - historical['placement_recall']) > 1e-12:
            raise RuntimeError('Paired QNN scenes no longer reproduce the stored bbox audit.')
        if len(actual['empty_crowd_marked_tiles']) != historical['empty_crowd_false_positive_tiles']:
            raise RuntimeError('Paired QNN empty-crowd audit no longer matches.')
    report = dict(
        version=1, name='Stripe same-feature logistic regression', parameter_count=9,
        feature_names=FEATURE_NAMES, training_domain=model['trainingDomain'], split_configuration=SPLITS,
        generator_source_sha256=source_hashes, assets_sha256=asset_hashes, split_feature_and_label_sha256=hashes,
        preprocessing='training-only mean/std; affine standardization absorbed into raw feature coefficients',
        optimization='full-batch Newton logistic regression with line search; L2 weights only, bias unpenalized',
        regularization=float(regularization), regularization_selection='minimum validation BCE; no test or scene selection',
        regularization_candidates=[dict(lambda_value=float(item[1]), validation_bce=float(item[0]), **item[3]) for item in candidates],
        threshold=threshold, threshold_selection='maximum validation F1 on QNN-matched 0.15..0.85 step0.01 grid; first maximum',
        best_validation_bce=best_bce, optimization_result=optimization,
        raw_feature_weights=weights.tolist(), raw_feature_bias=bias,
        training_feature_mean=mean.tolist(), training_feature_std=scale.tolist(),
        splits=results, paired_scene_audits=audits,
        qnn_reference=dict(name=model['name'], parameter_count=model['parameterCount'], model_sha256=hashlib.sha256(model_bytes).hexdigest(),
                           split_seeds_and_counts_confirmed=True, regenerated_confusion_and_bce_confirmed=True,
                           historical_bbox_scene_audit_confirmed=True, regenerated_splits=regenerated),
        verification=dict(loss_gradient_finite_difference_max_error=gradient_error, raw_vs_standardized_probability_max_error=parity),
        elapsed_seconds=dict(data_generation_and_qnn_recheck=data_seconds, fitting_and_validation_selection=fitting_seconds,
                             scene_audits=time.perf_counter() - audit_started, total=time.perf_counter() - started),
        interpretation='Same engineered pixel features/examples compare classifier behavior, not equal model capacity, unseen-character generalization, Grover outcomes, face identity, or quantum runtime advantage.',
    )
    if source_hashes != {name: sha256(ROOT / 'model' / name) for name in source_hashes} or args.qnn_model.read_bytes() != model_bytes:
        raise RuntimeError('Reference generator or QNN checkpoint changed; repeat after freezing it.')
    output = ROOT / 'model/baseline_metrics.json'
    output.write_text(json.dumps(report, indent=2, allow_nan=False) + '\n')
    print(json.dumps(dict(output=str(output), splits=results,
                          scene_audits={name: value['summary'] for name, value in audits.items()}), indent=2), flush=True)


if __name__ == '__main__':
    main()
