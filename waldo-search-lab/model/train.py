"""Learn a pixel-derived red/white stripe predicate on generated crowd composites.

Held-out examples use new seeded positions/scales of the same character asset.
This experiment does not train face identity or general people-search detection.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import time

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageOps

from qnn_core import circuit, sigmoid, metrics

ROOT = Path(__file__).resolve().parent.parent
FEATURE_NAMES = ['red_coverage', 'stripe_bands', 'white_gaps', 'stripe_regularity',
                 'stripe_coherence', 'blue_below', 'stripe_area', 'stripe_aspect']
SEED = 202610103


def segments(profile):
    bounds = np.flatnonzero(np.diff(np.r_[False, np.asarray(profile, dtype=bool), False]))
    return [(int(a), int(b)) for a, b in zip(bounds[::2], bounds[1::2])]


def extract_features(image):
    rgb = np.asarray(image)[..., :3].astype(float)
    h, w = rgb.shape[:2]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    red = (r > 125) & (r > 1.38 * g) & (r > 1.25 * b)
    white = (np.minimum(np.minimum(r, g), b) > 170) & (np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b) < 65)
    blue = (b > 85) & (b > 1.12 * r) & (b > .90 * g)
    prefixes = [np.pad(np.cumsum(mask, axis=1), ((0, 0), (1, 0))) for mask in [red, white, blue]]
    coverage = float(np.clip(red.sum() / (w * h * .12), 0, 1))
    best = np.array([coverage, 0, 0, 0, 0, 0, 0, 0], dtype=float)
    best_strength = 0.0
    # Explicit half-up rounding matches JavaScript Math.round.
    widths = sorted(set(max(3, int(math.floor(w * f + .5))) for f in [.06, .10, .16, .24]))
    for width in widths:
        for x in range(0, w - width + 1, max(1, width // 3)):
            rp, wp, bp = [(p[:, x + width] - p[:, x]) / width for p in prefixes]
            bands = [(a, b) for a, b in segments(rp > .35) if b - a <= max(3, int(h * .16))]
            chains, chain = [], []
            for band in bands:
                if not chain:
                    chain = [band]
                    continue
                previous = chain[-1]
                gap = band[0] - previous[1]
                if gap >= 1 and gap <= max(3, int(h * .14)) and wp[previous[1]:band[0]].mean() > .35:
                    chain.append(band)
                else:
                    chains.append(chain)
                    chain = [band]
            chains.append(chain)
            for group in chains:
                if len(group) < 2:
                    continue
                first, last = group[0][0], group[-1][1]
                span = last - first
                red_values = np.concatenate([rp[a:b] for a, b in group])
                white_values = np.concatenate([wp[group[i][1]:group[i + 1][0]] for i in range(len(group) - 1)])
                centers = np.array([(a + b) / 2 for a, b in group])
                gaps = np.diff(centers)
                regularity = float(np.clip(1 - np.std(gaps) / (gaps.mean() + 1), 0, 1))
                red_mean, white_mean = float(red_values.mean()), float(white_values.mean())
                strength = (len(group) - 1) * math.sqrt(width) * red_mean * white_mean * (.25 + .75 * regularity)
                if strength <= best_strength:
                    continue
                bottom = min(h, last + max(4, int(math.floor(span * 2 + .5))))
                best_strength = strength
                blue_below = float(bp[last:bottom].mean()) if bottom > last else 0.0
                best = np.clip([coverage, (len(group) - 1) / 4, white_mean / .65, regularity,
                                red_mean * white_mean / .65, blue_below / .35,
                                width * span / (w * h * .12), span / (width * 2)], 0, 1)
    return best


def load_assets():
    crowd_path, character_path = ROOT / 'dist/assets/crowd.png', ROOT / 'dist/assets/character.png'
    if not crowd_path.is_file() or not character_path.is_file():
        raise FileNotFoundError('Expected dist/assets/crowd.png and dist/assets/character.png.')
    crowd = Image.open(crowd_path).convert('RGB').resize((512, 512), Image.Resampling.LANCZOS)
    crowd.save(ROOT / 'dist/assets/crowd-captcha.png')
    character = Image.open(character_path).convert('RGBA')
    return crowd, character


def make_decoy(character, kind):
    data = np.asarray(character).copy()
    r, g, b = data[..., 0].astype(float), data[..., 1].astype(float), data[..., 2].astype(float)
    red = (r > 125) & (r > 1.38 * g) & (r > 1.25 * b) & (data[..., 3] > 30)
    if kind == 'blue_stripes':
        data[red, :3] = [42, 105, 205]
    else:
        # Remove white torso stripes in an explicitly generated training decoy.
        # The inference extractor never receives these coordinates or masks.
        h, w = red.shape
        white = (np.minimum(np.minimum(r, g), b) > 150) & (data[..., 3] > 30)
        torso = np.zeros((h, w), dtype=bool)
        torso[int(h * .30):int(h * .72), int(w * .05):int(w * .95)] = True
        data[white & torso, :3] = [195, 38, 44]
    return Image.fromarray(data, 'RGBA')


def patch_sample(rng, crowd, character, positive, split='train'):
    side = 128
    crop_scale = int(rng.choice([4, 6, 8]))
    crop_w, crop_h = max(16, crowd.width // crop_scale), max(16, crowd.height // crop_scale)
    x = int(rng.integers(0, max(1, crowd.width - crop_w + 1)))
    y = int(rng.integers(0, max(1, crowd.height - crop_h + 1)))
    resampling = rng.choice([Image.Resampling.BILINEAR, Image.Resampling.BICUBIC, Image.Resampling.LANCZOS])
    image = crowd.crop((x, y, x + crop_w, y + crop_h)).resize((side, side), int(resampling))
    inserted = positive or rng.random() < .55
    if inserted:
        obj = character if positive else make_decoy(character, str(rng.choice(['solid_red', 'blue_stripes'])))
        height = int(rng.integers(52, 158))
        width = max(8, round(obj.width * height / obj.height))
        obj = obj.resize((width, height), int(resampling))
        if rng.random() < .5:
            obj = ImageOps.mirror(obj)
        obj = ImageEnhance.Brightness(obj).enhance(float(rng.uniform(.90, 1.08)))
        px = int(rng.integers(-max(1, width // 5), max(1, side - int(width * .75))))
        py = int(rng.integers(-max(1, height // 6), max(1, side - int(height * .60))))
        image.paste(obj, (px, py), obj)
    return image


def dataset(n, seed, crowd, character):
    rng = np.random.default_rng(seed)
    labels = (np.arange(n) % 2).astype(float)
    images = [patch_sample(rng, crowd, character, bool(label)) for label in labels]
    features = np.array([extract_features(image) for image in images])
    if not np.all(np.isfinite(features)):
        raise AssertionError('All extracted pixel features must be finite.')
    return features, labels, images


def save_montage(images, labels, scores, path):
    output = Image.new('RGB', (8 * 144, 5 * 154), (249, 246, 237))
    draw = ImageDraw.Draw(output)
    for index, (image, label, score) in enumerate(zip(images[:40], labels[:40], scores[:40])):
        x, y = (index % 8) * 144, (index // 8) * 154
        output.paste(image, (x + 8, y + 3))
        draw.text((x + 4, y + 134), f'{"striped" if label else "other"} {score:.2f}', fill=(35, 35, 35))
    output.save(path)


def grid_audit(crowd, character, model):
    rng = np.random.default_rng(SEED + 104)
    rows = []
    for grid in [4, 8]:
        # Match the UI's square canvas and cell-relative original explorer size.
        canvas = crowd.resize((512, 512), Image.Resampling.LANCZOS)
        cell_w, cell_h = 512 / grid, 512 / grid
        empty_features = []
        for i in range(grid * grid):
            x, y = (i % grid) * cell_w, (i // grid) * cell_h
            tile = canvas.crop((round(x), round(y), round(x + cell_w), round(y + cell_h))).resize((128, 128), Image.Resampling.LANCZOS)
            empty_features.append(extract_features(tile))
        base_scores = sigmoid(circuit(np.array(empty_features), np.array(model['theta'])) @ np.array(model['readout']) + model['bias'])
        trials = []
        for trial in range(20):
            image = canvas.copy()
            height = round(cell_h * .75)
            width = max(8, round(character.width * height / character.height))
            obj = character.resize((width, height), Image.Resampling.LANCZOS)
            px, py = int(rng.integers(0, 512 - width)), int(rng.integers(0, 512 - height))
            image.paste(obj, (px, py), obj)
            features, true_tiles = [], []
            for i in range(grid * grid):
                x, y = (i % grid) * cell_w, (i // grid) * cell_h
                tile = image.crop((round(x), round(y), round(x + cell_w), round(y + cell_h))).resize((128, 128), Image.Resampling.LANCZOS)
                features.append(extract_features(tile))
                intersection = max(0, min(x + cell_w, px + width) - max(x, px)) * max(0, min(y + cell_h, py + height) - max(y, py))
                if intersection >= width * height * .20:
                    true_tiles.append(i)
            scores = sigmoid(circuit(np.array(features), np.array(model['theta'])) @ np.array(model['readout']) + model['bias'])
            marks = [i for i, value in enumerate(scores) if value >= model['threshold']]
            trials.append(dict(trial=trial, x=px, y=py, width=width, height=height,
                               ground_truth_tiles=true_tiles, marked_tiles=marks,
                               at_least_one_true_tile_marked=bool(set(marks) & set(true_tiles)),
                               false_positive_tiles=len(set(marks) - set(true_tiles))))
        rows.append(dict(grid=grid, empty_crowd_false_positive_tiles=int(np.sum(base_scores >= model['threshold'])),
                         empty_crowd_max_score=float(max(base_scores)),
                         placement_trials=len(trials), placement_recall=sum(t['at_least_one_true_tile_marked'] for t in trials) / len(trials),
                         ground_truth='tiles covering at least 20% of inserted character bounding-box area; evaluation only', trials=trials))
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--steps', type=int, default=800)
    parser.add_argument('--layers', type=int, default=4)
    args = parser.parse_args()
    crowd, character = load_assets()
    started = time.time()
    print('Extracting pixel features from original crowd / explorer composites...', flush=True)
    x, y, _ = dataset(1600, SEED, crowd, character)
    vx, vy, _ = dataset(400, SEED + 1, crowd, character)
    tx, ty, tims = dataset(600, SEED + 102, crowd, character)
    print('Training...', flush=True)
    rng = np.random.default_rng(SEED + 3)
    ntheta = args.layers * 8
    parameters = np.r_[rng.normal(0, .65, ntheta), rng.normal(0, .2, 7), 0.]
    m, v = np.zeros(len(parameters)), np.zeros(len(parameters))
    best_loss, best, history = math.inf, parameters.copy(), []
    for step in range(1, args.steps + 1):
        ids = rng.choice(len(x), 128, replace=False)
        read, jac = circuit(x[ids], parameters[:ntheta], True)
        prediction = sigmoid(read @ parameters[ntheta:-1] + parameters[-1])
        error = (prediction - y[ids]) / len(ids)
        grad = np.r_[np.einsum('n,npk,k->p', error, jac, parameters[ntheta:-1]),
                     read.T @ error + .0004 * parameters[ntheta:-1], error.sum()]
        m, v = .9 * m + .1 * grad, .999 * v + .001 * grad ** 2
        rate = .028 * (.45 + .55 * (1 - step / args.steps))
        parameters -= rate * (m / (1 - .9 ** step)) / (np.sqrt(v / (1 - .999 ** step)) + 1e-8)
        if step % 50 == 0 or step == 1:
            vp = sigmoid(circuit(vx, parameters[:ntheta]) @ parameters[ntheta:-1] + parameters[-1])
            score = metrics(vy, vp)
            history.append(dict(step=step, validation_bce=score['bce'], validation_accuracy=score['accuracy']))
            if score['bce'] < best_loss:
                best_loss, best = score['bce'], parameters.copy()
            print(f'step {step}: validation accuracy {score["accuracy"]:.3f}; elapsed {time.time()-started:.1f}s', flush=True)
    parameters = best
    vp = sigmoid(circuit(vx, parameters[:ntheta]) @ parameters[ntheta:-1] + parameters[-1])
    threshold = max((metrics(vy, vp, t) for t in np.arange(.15, .86, .01)), key=lambda s: s['f1'])['threshold']
    results = {}
    for name, xx, yy in [('train', x, y), ('validation', vx, vy), ('test', tx, ty)]:
        prediction = sigmoid(circuit(xx, parameters[:ntheta]) @ parameters[ntheta:-1] + parameters[-1])
        results[name] = metrics(yy, prediction, threshold)
    model = dict(version=1, name='StripePatch-QNN-v1', seed=SEED, qubits=4, layers=args.layers,
                 featureNames=FEATURE_NAMES, theta=parameters[:ntheta].tolist(), readout=parameters[ntheta:-1].tolist(),
                 bias=float(parameters[-1]), threshold=threshold, parameterCount=len(parameters),
                 observables=['Z0', 'Z1', 'Z2', 'Z3', 'Z0Z1', 'Z2Z3', 'Z0Z1Z2Z3'],
                 trainingDomain='new seeded positions/scales of the SAME generated striped-explorer asset over crowd patches; no face identity training',
                 splitSeeds=dict(train=SEED, validation=SEED + 1, test=SEED + 102), metrics=results)
    (ROOT / 'dist/model/model.json').write_text(json.dumps(model, indent=2) + '\n')
    test_scores = sigmoid(circuit(tx, parameters[:ntheta]) @ parameters[ntheta:-1] + parameters[-1])
    save_montage(tims, ty, test_scores, ROOT / 'model/test-montage.png')
    fixtures = [dict(width=image.width, height=image.height, rgba=np.asarray(image.convert('RGBA')).reshape(-1).tolist(),
                     features=feature.tolist(), probability=float(probability))
                for image, feature, probability in zip(tims[:10], tx[:10], test_scores[:10])]
    (ROOT / 'model/parity-fixtures.json').write_text(json.dumps(fixtures, separators=(',', ':')))
    audit = grid_audit(crowd, character, model)
    report = dict(seed=SEED, steps=args.steps, layers=args.layers, splits=results, history=history,
                  threshold_selection='validation F1; test placements held out; all splits reuse the same character/crowd assets',
                  assetHashes={name: hashlib.sha256((ROOT / f'dist/assets/{name}').read_bytes()).hexdigest() for name in ['crowd.png', 'character.png']},
                  grid_audit=audit, elapsed_seconds=time.time() - started)
    (ROOT / 'model/metrics.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(results, indent=2), flush=True)
    print(json.dumps([dict(grid=a['grid'], empty_false_positive_tiles=a['empty_crowd_false_positive_tiles'], placement_recall=a['placement_recall']) for a in audit], indent=2), flush=True)


if __name__ == '__main__':
    main()
