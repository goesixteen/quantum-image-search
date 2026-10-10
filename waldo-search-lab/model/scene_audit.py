"""Expanded frozen crowd-QNN/logistic full-scene evaluation.

No training, threshold tuning, or UI modification. All inference uses RGB tile
pixels. Alpha masks and renderer metadata enter only evaluation after scoring.
Primary and stress suites reuse the same original character/crowd identities.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import time

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont

from train import ROOT, FEATURE_NAMES, extract_features
from qnn_core import circuit, sigmoid
from logistic_core import sigmoid as logistic_sigmoid
from grover_audit import target_mass

AUDIT_SEED = 202610303
MEASUREMENT_SEED = 202610304
SHOTS_PER_SCENE = 64
BOUNDARY_OFFSETS = [-.45, -.30, -.15, 0., .15, .30, .45]
STRESS = [
    ('small', .55, 1., 1.), ('large', 1.40, 1., 1.),
    ('foreground_dark', 1., .72, 1.), ('foreground_bright', 1., 1.22, 1.),
    ('small_dark', .60, .72, 1.), ('large_bright', 1.25, 1.22, 1.),
    ('scene_dark', 1., 1., .72), ('scene_bright', 1., 1., 1.22),
]


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def half_up(x):
    return int(math.floor(x + .5))


def geometry(character, grid, scale=1.):
    height = half_up(512 / grid * .75 * scale)
    return max(8, half_up(height * character.width / character.height)), height


def position(rng, grid, size, family, index):
    width, height = size
    if family == 'snapped':
        return half_up((index % grid) * 512 / grid + (512 / grid - width) / 2), half_up((index // grid) * 512 / grid + (512 / grid - height) / 2)
    x, y = float(rng.integers(0, 513 - width)), float(rng.integers(0, 513 - height))
    if family in ('vertical_boundary', 'corner_boundary'):
        boundary = (1 + index % (grid - 1)) * 512 / grid
        x = boundary - width / 2 + BOUNDARY_OFFSETS[(index // (grid - 1)) % len(BOUNDARY_OFFSETS)] * width
    if family in ('horizontal_boundary', 'corner_boundary'):
        boundary = (1 + (index // (grid - 1) if family == 'corner_boundary' else index) % (grid - 1)) * 512 / grid
        offset = BOUNDARY_OFFSETS[(index // len(BOUNDARY_OFFSETS) if family == 'corner_boundary' else index // (grid - 1)) % len(BOUNDARY_OFFSETS)]
        y = boundary - height / 2 + offset * height
    return int(np.clip(half_up(x), 0, 512 - width)), int(np.clip(half_up(y), 0, 512 - height))


def configurations(character, grid, suite, count=384):
    if count != 384:
        raise ValueError('The declared expanded audit has exactly 384 scenes per suite/grid.')
    rng = np.random.default_rng(AUDIT_SEED + grid * 100 + (10000 if suite == 'stress' else 0))
    output = []
    if suite == 'nominal':
        groups = [('snapped', grid * grid), ('vertical_boundary', 64), ('horizontal_boundary', 64), ('corner_boundary', 64), ('random', 384 - grid * grid - 192)]
        variants = [('default', 1., 1., 1., groups)]
    elif suite == 'stress':
        variants = [(name, scale, foreground, scene, [('random', 24), ('vertical_boundary', 12), ('horizontal_boundary', 6), ('corner_boundary', 6)])
                    for name, scale, foreground, scene in STRESS]
    else:
        raise ValueError('Unknown suite.')
    for variant, scale, foreground, scene, groups in variants:
        size = geometry(character, grid, scale)
        for family, n in groups:
            for i in range(n):
                x, y = position(rng, grid, size, family, i)
                output.append(dict(id=f'{suite}-g{grid}-{variant}-{family}-{i:03d}', grid=grid, suite=suite,
                                   variant=variant, family=family, position=[x, y], sprite_size=list(size),
                                   scale=scale, foreground_brightness=foreground, scene_brightness=scene))
    if len(output) != count or len(set(c['id'] for c in output)) != count:
        raise AssertionError('Audit IDs/count are not unique and fixed.')
    return output


def render(crowd, character, config):
    obj = character.resize(tuple(config['sprite_size']), Image.Resampling.LANCZOS)
    obj = ImageEnhance.Brightness(obj).enhance(config['foreground_brightness'])
    x, y = config['position']
    scene = crowd.copy()
    scene.paste(obj, (x, y), obj)
    scene = ImageEnhance.Brightness(scene).enhance(config['scene_brightness'])
    alpha = Image.new('L', (512, 512))
    alpha.paste(obj.getchannel('A'), (x, y))
    return scene, alpha


class PixelScorer:
    """Pixel-keyed feature cache; no placement or alpha enters this scorer."""
    def __init__(self, qnn, baseline):
        self.qnn, self.baseline = qnn, baseline
        self.cache = {}
        self.cache_hits = self.extracted = 0

    def features(self, scene, grid, use_cache=True):
        cell = 512 // grid
        features = []
        for row in range(grid):
            for column in range(grid):
                tile = scene.crop((column * cell, row * cell, (column + 1) * cell, (row + 1) * cell))
                key = (cell, hashlib.sha256(tile.tobytes()).digest())
                if use_cache and key in self.cache:
                    self.cache_hits += 1
                    value = self.cache[key]
                else:
                    value = extract_features(tile.resize((128, 128), Image.Resampling.LANCZOS))
                    if use_cache:
                        self.cache[key] = value
                        self.extracted += 1
                features.append(value)
        result = np.asarray(features)
        if result.shape != (grid * grid, 8) or not np.all(np.isfinite(result)):
            raise AssertionError('Invalid extracted features.')
        return result

    def scores(self, features):
        qnn = self.qnn
        values = dict(qnn=sigmoid(circuit(features, np.asarray(qnn['theta'])) @ np.asarray(qnn['readout']) + qnn['bias']),
                      logistic=logistic_sigmoid(features @ np.asarray(self.baseline['raw_feature_weights']) + self.baseline['raw_feature_bias']))
        if any(not np.all(np.isfinite(v)) or np.any((v < 0) | (v > 1)) for v in values.values()):
            raise AssertionError('Scores must be finite probabilities.')
        return values


def truth_from_alpha(alpha, grid):
    mask = np.asarray(alpha) > 32
    cell = 512 // grid
    counts = np.asarray([mask[row * cell:(row + 1) * cell, column * cell:(column + 1) * cell].sum()
                         for row in range(grid) for column in range(grid)])
    return np.flatnonzero(counts).tolist(), counts.tolist()


def final_distribution(n, marked, probability):
    m = len(marked)
    if m in (0, n):
        return np.full(n, 1 / n)
    distribution = np.full(n, (1 - probability) / (n - m))
    distribution[marked] = probability / m
    if abs(float(distribution.sum()) - 1) > 1e-12:
        raise AssertionError('Probability norm differs from one.')
    return distribution


def sample_scores(scores, threshold, draws):
    """Build the predicate and sample it before any alpha annotation is read."""
    marked = np.flatnonzero(scores >= threshold).tolist()
    mass = target_mass(len(scores), marked, [])
    distribution = final_distribution(len(scores), marked, mass['ideal_predicate_mass'])
    outcomes = None if not marked else np.minimum(np.searchsorted(np.cumsum(distribution), draws, side='right'), len(scores) - 1)
    return dict(scores=scores, threshold=threshold, marked=marked, distribution=distribution,
                outcomes=outcomes, requested_shots=len(draws))


def evaluate(sampled_scores, true_tiles):
    scores, threshold, marked = sampled_scores['scores'], sampled_scores['threshold'], sampled_scores['marked']
    truth, accepted = set(true_tiles), set(marked)
    mass = target_mass(len(scores), marked, true_tiles)
    distribution = sampled_scores['distribution']
    actual = float(distribution[true_tiles].sum())
    if abs(actual - mass['ideal_alpha32_target_mass']) > 1e-12:
        raise AssertionError('Distribution and independent target-mass formula disagree.')
    if marked:
        outcomes = sampled_scores['outcomes']
        hits = [int(i) in truth for i in outcomes]
        good = [int(i) in accepted for i in outcomes]
        sampled = dict(single_measurement_region=int(outcomes[0]), single_target_hit=bool(hits[0]), single_predicate_hit=bool(good[0]),
                       requested_shots=sampled_scores['requested_shots'], returned_measurements=len(outcomes), target_hits=sum(hits), predicate_hits=sum(good))
    else:
        sampled = dict(single_measurement_region=None, single_target_hit=False, single_predicate_hit=False,
                       requested_shots=sampled_scores['requested_shots'], returned_measurements=0, target_hits=0, predicate_hits=0)
    return dict(scores=scores.tolist(), threshold=threshold, marked_tiles=marked, true_marked_tiles=sorted(accepted & truth),
                false_marked_tiles=sorted(accepted - truth), target_hit=bool(accepted & truth),
                has_false_marks=bool(accepted - truth), clean_hit=bool(accepted & truth) and not bool(accepted - truth),
                best_true_tile_score=max((float(scores[i]) for i in truth), default=None),
                amplification=mass, sampled=sampled)


def stats(values):
    a = np.asarray(values, dtype=float)
    return dict(mean=float(a.mean()), minimum=float(a.min()), median=float(np.median(a)), maximum=float(a.max()),
                percentiles={str(p): float(np.percentile(a, p)) for p in [5, 25, 75, 95]})


def summary(records, name):
    model = [record['models'][name] for record in records]
    probabilities = np.asarray([m['amplification']['effective_target_mass_if_empty_oracle_means_no_output'] for m in model])
    single = sum(m['sampled']['single_target_hit'] for m in model)
    target_hits = sum(m['sampled']['target_hits'] for m in model)
    expected = float(probabilities.sum())
    variance = float(np.sum(probabilities * (1 - probabilities)))
    return dict(scenes=len(records), target_hit_scenes=sum(m['target_hit'] for m in model),
                false_mark_scenes=sum(m['has_false_marks'] for m in model), clean_hit_scenes=sum(m['clean_hit'] for m in model),
                missed_scenes=sum(not m['target_hit'] for m in model), empty_oracle_scenes=sum(not m['marked_tiles'] for m in model),
                true_marked_tiles_total=sum(len(m['true_marked_tiles']) for m in model), false_marked_tiles_total=sum(len(m['false_marked_tiles']) for m in model),
                missed_ids=[record['config']['id'] for record, m in zip(records, model) if not m['target_hit']],
                contaminated_ids=[record['config']['id'] for record, m in zip(records, model) if m['has_false_marks']],
                accepted_set_mass=stats([m['amplification']['ideal_predicate_mass'] for m in model]),
                exact_true_target_mass_with_empty_oracle_as_no_output=stats(probabilities),
                theoretical_true_target_mass_including_uniform_empty_state=stats([m['amplification']['ideal_alpha32_target_mass'] for m in model]),
                seeded_samples=dict(single_per_scene=dict(target_hits=single, requested_scenes=len(records), rate=single / len(records), expected_target_hits=expected,
                                                        expected_standard_deviation=math.sqrt(variance), observed_minus_expected=single - expected),
                                    repeated=dict(shots_requested=len(records) * SHOTS_PER_SCENE,
                                                  returned_measurements=sum(m['sampled']['returned_measurements'] for m in model), target_hits=target_hits,
                                                  target_rate_including_no_output=target_hits / (len(records) * SHOTS_PER_SCENE),
                                                  expected_target_hits=expected * SHOTS_PER_SCENE,
                                                  expected_standard_deviation=math.sqrt(variance * SHOTS_PER_SCENE), observed_minus_expected=target_hits - expected * SHOTS_PER_SCENE)))


def groups(records, field):
    return {key: {name: summary([r for r in records if r['config'][field] == key], name) for name in ['qnn', 'logistic']}
            for key in sorted(set(r['config'][field] for r in records))}


def font(size=15):
    try:
        return ImageFont.truetype('C:/Windows/Fonts/arial.ttf', size)
    except OSError:
        return ImageFont.load_default()


def export_fixtures(records, crowd, character):
    # Select illustrative failures transparently; these selections do not change aggregate metrics.
    selected, used = [], set()
    def choose(candidates, reason, key=None):
        candidates = [r for r in candidates if r['config']['id'] not in used]
        if not candidates:
            return
        record = min(candidates, key=key) if key else candidates[0]
        selected.append((record, reason))
        used.add(record['config']['id'])
    nominal = [r for r in records if r['config']['suite'] == 'nominal']
    stress = [r for r in records if r['config']['suite'] == 'stress']
    for grid in [4, 8]:
        same = [r for r in nominal if r['config']['grid'] == grid]
        choose([r for r in same if not r['models']['qnn']['target_hit'] and r['models']['logistic']['clean_hit']], 'Nominal QNN miss; logistic clean hit')
        choose([r for r in same if not r['models']['qnn']['target_hit'] and not r['models']['logistic']['target_hit']], 'Nominal both-model miss')
        choose(same, 'Lowest nominal QNN target mass', key=lambda r: r['models']['qnn']['amplification']['effective_target_mass_if_empty_oracle_means_no_output'])
    for variant, *_ in STRESS:
        choose([r for r in stress if r['config']['variant'] == variant and not r['models']['qnn']['clean_hit']], f'Stress failure: {variant}')
    # Retain the8x8 global-brightness contamination explicitly, rather than
    # letting earlier4x4 misses exhaust the illustrative selection budget.
    choose([r for r in stress if r['config']['grid'] == 8 and r['config']['variant'] == 'scene_bright' and r['models']['qnn']['has_false_marks']], 'Brightened crowd background contaminates QNN')
    selected = selected[:16]
    folder = ROOT / 'model/scene-audit-fixtures'
    folder.mkdir(exist_ok=True)
    metadata = []
    montage = Image.new('RGB', (1280, max(1, math.ceil(len(selected) / 2)) * 380), (248, 246, 239))
    for k, (record, reason) in enumerate(selected):
        config = record['config']
        scene, alpha = render(crowd, character, config)
        path = folder / (config['id'] + '.png')
        alpha_path = folder / (config['id'] + '-alpha.png')
        scene.save(path)
        alpha.save(alpha_path)
        card = Image.new('RGB', (640, 380), (248, 246, 239))
        draw = ImageDraw.Draw(card)
        draw.text((8, 4), reason, font=font(16), fill=(30, 40, 50))
        draw.text((8, 25), config['id'], font=font(11), fill=(70, 75, 85))
        view = scene.resize((320, 320), Image.Resampling.LANCZOS)
        cell = 320 / config['grid']
        vd = ImageDraw.Draw(view)
        for i in range(config['grid'] ** 2):
            x, y = i % config['grid'] * cell, i // config['grid'] * cell
            color = (34, 121, 70) if i in record['true_tiles'] else (242, 242, 242)
            vd.rectangle((x, y, x + cell - 1, y + cell - 1), outline=color, width=2 if i in record['true_tiles'] else 1)
            if i in record['models']['qnn']['marked_tiles']:
                vd.rectangle((x + 3, y + 3, x + cell - 4, y + cell - 4), outline=(216, 79, 37), width=2)
        card.paste(view, (8, 48))
        max_true = max(record['true_tiles'], key=lambda i: record['alpha_pixel_counts'][i])
        cell_source = 512 // config['grid']
        x, y = max_true % config['grid'] * cell_source, max_true // config['grid'] * cell_source
        tile = scene.crop((x, y, x + cell_source, y + cell_source)).resize((128, 128), Image.Resampling.LANCZOS)
        card.paste(tile.resize((192, 192), Image.Resampling.NEAREST), (350, 50))
        draw.text((350, 246), f'Largest target fragment: tile {max_true}', font=font(14), fill=(30, 40, 50))
        for row, name in enumerate(['qnn', 'logistic']):
            value = record['models'][name]
            mass = value['amplification']['effective_target_mass_if_empty_oracle_means_no_output']
            draw.text((350, 272 + row * 24), f'{name}: marks {value["marked_tiles"]}, target {mass:.1%}', font=font(13), fill=(30, 40, 50))
        draw.text((350, 328), f'Scale {config["scale"]}; foreground light {config["foreground_brightness"]}', font=font(13), fill=(30, 40, 50))
        draw.text((350, 348), f'Scene light {config["scene_brightness"]}; green truth, orange QNN', font=font(12), fill=(30, 40, 50))
        montage.paste(card, ((k % 2) * 640, (k // 2) * 380))
        metadata.append(dict(reason=reason, record=record, scene_file=str(path.relative_to(ROOT)), scene_sha256=sha(path),
                             alpha_file=str(alpha_path.relative_to(ROOT)), alpha_sha256=sha(alpha_path)))
    montage_path = ROOT / 'model/scene-audit-failures.png'
    montage.save(montage_path)
    (ROOT / 'model/scene-audit-fixtures.json').write_text(json.dumps(metadata, indent=2, allow_nan=False) + '\n')
    return dict(montage=str(montage_path.relative_to(ROOT)), fixture_report='model/scene-audit-fixtures.json',
                ids=[record['config']['id'] for record, _ in selected],
                selection='First qualifying miss/disagreement and lowest nominal target mass, then first failed stress case per declared variant; illustrative only.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify-only', action='store_true', help='Recompute eight saved records, seeded samples, source hashes and empty scenes without writing files.')
    args = parser.parse_args()
    started = time.perf_counter()
    qnn_path, baseline_path = ROOT / 'dist/model/model.json', ROOT / 'model/baseline_metrics.json'
    qnn, baseline = json.loads(qnn_path.read_text()), json.loads(baseline_path.read_text())
    if sha(qnn_path) != baseline['qnn_reference']['model_sha256'] or qnn['featureNames'] != FEATURE_NAMES or baseline['feature_names'] != FEATURE_NAMES:
        raise RuntimeError('QNN and baseline must be the frozen matched experiment.')
    sources = ['train.py', 'qnn_core.py', 'logistic_core.py', 'classical_baseline.py', 'grover_audit.py', 'scene_audit.py']
    paths = [qnn_path, baseline_path] + [ROOT / 'model' / name for name in sources] + [ROOT / 'dist/assets' / name for name in baseline['assets_sha256']]
    frozen = {str(path.relative_to(ROOT)): sha(path) for path in paths}
    for name, digest in baseline['generator_source_sha256'].items():
        if sha(ROOT / 'model' / name) != digest:
            raise RuntimeError('Reference source has changed since baseline fitting.')
    for name, digest in baseline['assets_sha256'].items():
        if sha(ROOT / 'dist/assets' / name) != digest:
            raise RuntimeError('Reference asset has changed since baseline fitting.')
    crowd = Image.open(ROOT / 'dist/assets/crowd-captcha.png').convert('RGB')
    character = Image.open(ROOT / 'dist/assets/character.png').convert('RGBA')
    assert crowd.size == (512, 512)
    scorer = PixelScorer(qnn, baseline)
    thresholds = dict(qnn=qnn['threshold'], logistic=baseline['threshold'])
    empty = {}
    for grid in [4, 8]:
        empty[f'grid{grid}'] = {}
        for light in [1., .72, 1.22]:
            features = scorer.features(ImageEnhance.Brightness(crowd).enhance(light), grid)
            values = scorer.scores(features)
            empty[f'grid{grid}'][str(light)] = {name: dict(marked_tiles=np.flatnonzero(v >= thresholds[name]).tolist(),
                                                              max_score=float(v.max()), scores=v.tolist()) for name, v in values.items()}
    if args.verify_only:
        stored = json.loads((ROOT / 'model/scene-audit.json').read_text())
        if stored['frozen_sha256'] != frozen:
            raise RuntimeError('Current input/source hashes differ from the saved audit.')
        selection = [stored['records'][i] for i in [0, 383, 384, 767, 768, 1151, 1152, 1535]]
        max_score_error = 0.
        for record in selection:
            scene, alpha = render(crowd, character, record['config'])
            true_tiles, counts = truth_from_alpha(alpha, record['config']['grid'])
            assert true_tiles == record['true_tiles'] and counts == record['alpha_pixel_counts']
            features = scorer.features(scene, record['config']['grid'], use_cache=False)
            assert hashlib.sha256(features.astype('<f8').tobytes()).hexdigest() == record['features_sha256']
            draws = np.random.default_rng(record['measurement_seed']).random(SHOTS_PER_SCENE)
            for name, scores in scorer.scores(features).items():
                max_score_error = max(max_score_error, float(np.max(abs(scores - np.asarray(record['models'][name]['scores'])))))
                replayed = evaluate(sample_scores(scores, thresholds[name], draws), true_tiles)
                assert replayed == record['models'][name]
        assert max_score_error < 1e-12 and empty == stored['empty_scenes']
        print(json.dumps(dict(verification='PASS', uncached_records_checked=len(selection), maximum_score_error=max_score_error,
                              empty_scenes_match=True, seeded_samples_and_record_metrics_match=True, frozen_source_hashes_match=True), indent=2))
        return
    records = []
    for suite in ['nominal', 'stress']:
        for grid in [4, 8]:
            for index, config in enumerate(configurations(character, grid, suite)):
                scene, alpha = render(crowd, character, config)
                features = scorer.features(scene, grid)
                scores = scorer.scores(features)
                draw_seed = MEASUREMENT_SEED ^ int.from_bytes(hashlib.sha256(config['id'].encode()).digest()[:8], 'little')
                draws = np.random.default_rng(draw_seed).random(SHOTS_PER_SCENE)
                sampled_scores = {name: sample_scores(v, thresholds[name], draws) for name, v in scores.items()}
                true_tiles, counts = truth_from_alpha(alpha, grid)
                models = {name: evaluate(value, true_tiles) for name, value in sampled_scores.items()}
                records.append(dict(config=config, true_tiles=true_tiles, alpha_pixel_counts=counts,
                                    features_sha256=hashlib.sha256(features.astype('<f8').tobytes()).hexdigest(),
                                    measurement_seed=draw_seed, models=models))
                if index % 96 == 0:
                    print(f'{suite} grid{grid} scene{index}: {time.perf_counter() - started:.1f}s', flush=True)
    summaries = {}
    for suite in ['nominal', 'stress']:
        summaries[suite] = {}
        for grid in [4, 8]:
            subset = [r for r in records if r['config']['suite'] == suite and r['config']['grid'] == grid]
            summaries[suite][f'grid{grid}'] = dict(models={name: summary(subset, name) for name in ['qnn', 'logistic']},
                                                  by_family=groups(subset, 'family'), by_variant=groups(subset, 'variant'),
                                                  unique_render_configurations=len({tuple(r['config']['position']) + tuple(r['config']['sprite_size']) + (r['config']['foreground_brightness'], r['config']['scene_brightness']) for r in subset}),
                                                  truth_fragment_count_histogram=dict(Counter(len(r['true_tiles']) for r in subset)))
    illustrations = export_fixtures(records, crowd, character)
    if frozen != {str(path.relative_to(ROOT)): sha(path) for path in paths}:
        raise RuntimeError('Frozen input changed during evaluation; no aggregate report written.')
    report = dict(version=1, seed=AUDIT_SEED, measurement_seed=MEASUREMENT_SEED, shots_per_scene=SHOTS_PER_SCENE,
                  thresholds=thresholds, frozen_sha256=frozen, summaries=summaries, empty_scenes=empty,
                  primary_ground_truth='Any inserted foreground alpha>32 pixel in a tile; annotation evaluated only after RGB scoring, predicate compilation and seeded measurements.',
                  clean_hit_definition='At least one true marked tile and no false marked tiles; not every overlapping tile must be marked.',
                  rendering='Exact normalized 512 crowd; integer placements; original 2:3 cutout; Pillow LANCZOS sprite and 128 feature patch rasterization. Browser fractional placements/resampling may differ.',
                  nominal_geometry='Character height 0.75 cell; all snapped centers +64 vertical/64 horizontal/64 corner boundary probes +remaining uniform random free placements; 384 per grid.',
                  stress_protocol='Eight declared scale/brightness variants with 48 placements each, same character/crowd identities. Brightness changes foreground alone or full RGB scene; alpha stays unchanged. No threshold/model selection.',
                  sampling='Common seeded uniform draws pair models per scene; 64 simulated Born samples, with the first also reported as one sample per scene. Samples are drawn before alpha annotation is evaluated. Empty oracle returns no output and contributes zero target success. Sampled outcomes are separate from exact probabilities.',
                  cache=dict(entries=len(scorer.cache), hits=scorer.cache_hits, unique_pixel_tiles_extracted=scorer.extracted,
                             policy='Cache keys hash raw RGB tile pixels and source cell width; never coordinates, alpha, labels, or metadata.'),
                  illustrations=illustrations, records=records, elapsed_seconds=time.perf_counter() - started,
                  scope='Controlled same-asset composite evaluation, not unseen characters/crowds, photographs, face identity, empirical quantum hardware, or speed advantage.')
    (ROOT / 'model/scene-audit.json').write_text(json.dumps(report, indent=2, allow_nan=False) + '\n')
    compact = dict(version=1, title='Expanded controlled crowd scene audit', scope=report['scope'],
                   raster='Pillow LANCZOS; native browser confirmation is limited to named fixtures in docs/SCENE_AUDIT.md',
                   full_report='scene-audit.json', fixtures='scene-audit-fixtures.json', audit_seed=AUDIT_SEED,
                   measurement_seed=MEASUREMENT_SEED, shots_per_scene=SHOTS_PER_SCENE, thresholds=thresholds,
                   models_sha256=dict(qnn=sha(qnn_path), logistic_report=sha(baseline_path)),
                   empty_oracle_policy='No output; zero effective true-target probability.',
                   protocol_weighting='384 predefined probes per suite/grid. Nominal 8x8 contains 369 unique rendering configurations because 15 corner probes repeat; all other suites/grids have 384 unique configurations. Aggregate statistics weight each declared probe. Deduplicated sensitivity is in scene-audit-diagnostics.json.',
                   unique_render_configurations={suite: {grid: a['unique_render_configurations'] for grid, a in grids.items()} for suite, grids in summaries.items()},
                   clean_hit_definition=report['clean_hit_definition'],
                   results={suite: {grid: {name: dict(scenes=v['scenes'], target_hit_scenes=v['target_hit_scenes'],
                                                        false_mark_scenes=v['false_mark_scenes'], clean_hit_scenes=v['clean_hit_scenes'],
                                                        missed_scenes=v['missed_scenes'], empty_oracle_scenes=v['empty_oracle_scenes'],
                                                        accepted_set_mass_mean=v['accepted_set_mass']['mean'],
                                                        exact_true_target_mass_mean=v['exact_true_target_mass_with_empty_oracle_as_no_output']['mean'],
                                                        sampled_single_target_hits=v['seeded_samples']['single_per_scene']['target_hits'],
                                                        repeated_shots_requested=v['seeded_samples']['repeated']['shots_requested'],
                                                        repeated_target_hits=v['seeded_samples']['repeated']['target_hits'])
                                                 for name, v in a['models'].items()} for grid, a in grids.items()} for suite, grids in summaries.items()},
                   empty_scene_false_marks={grid: {light: {name: len(v['marked_tiles']) for name, v in values.items()} for light, values in cases.items()} for grid, cases in empty.items()})
    (ROOT / 'model/scene-audit-summary.json').write_text(json.dumps(compact, indent=2, allow_nan=False) + '\n')
    print(json.dumps({suite: {grid: {name: {key: value[key] for key in ['scenes', 'target_hit_scenes', 'false_mark_scenes', 'clean_hit_scenes', 'empty_oracle_scenes', 'exact_true_target_mass_with_empty_oracle_as_no_output']} for name, value in summary_['models'].items()} for grid, summary_ in grids.items()} for suite, grids in summaries.items()}, indent=2), flush=True)


if __name__ == '__main__':
    main()
