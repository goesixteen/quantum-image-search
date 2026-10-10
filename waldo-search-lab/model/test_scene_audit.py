"""Checks for audit fairness, pixel-cache parity and no-output semantics.

Run from waldo-search-lab: python -m unittest discover -s model -p test_scene_audit.py -v
"""
import hashlib
import json
import unittest
import numpy as np
from PIL import Image

from scene_audit import ROOT, PixelScorer, configurations, render, sample_scores, evaluate, truth_from_alpha
from logistic_core import sigmoid as logistic_sigmoid


class SceneAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = json.loads((ROOT / 'dist/model/model.json').read_text())
        cls.baseline = json.loads((ROOT / 'model/baseline_metrics.json').read_text())
        cls.report = json.loads((ROOT / 'model/scene-audit.json').read_text())
        cls.crowd = Image.open(ROOT / 'dist/assets/crowd-captcha.png').convert('RGB')
        cls.character = Image.open(ROOT / 'dist/assets/character.png').convert('RGBA')

    def test_declared_counts_bounds_and_all_snapped_positions(self):
        for grid in [4, 8]:
            for suite in ['nominal', 'stress']:
                rows = configurations(self.character, grid, suite)
                self.assertEqual(len(rows), 384)
                self.assertEqual(len({r['id'] for r in rows}), 384)
                for row in rows:
                    x, y = row['position']
                    width, height = row['sprite_size']
                    self.assertTrue(0 <= x <= 512 - width and 0 <= y <= 512 - height)
                if suite == 'nominal':
                    self.assertEqual(sum(r['family'] == 'snapped' for r in rows), grid * grid)
                    self.assertEqual(sum(r['family'].endswith('_boundary') for r in rows), 192)

    def test_brightness_does_not_change_alpha_ground_truth(self):
        row = configurations(self.character, 8, 'nominal')[28]
        reference_scene, reference_alpha = render(self.crowd, self.character, row)
        expected = truth_from_alpha(reference_alpha, 8)
        for foreground, scene in [(0.72, 1.), (1.22, 1.), (1., .72), (1., 1.22)]:
            variant = dict(row, foreground_brightness=foreground, scene_brightness=scene)
            image, alpha = render(self.crowd, self.character, variant)
            self.assertEqual(truth_from_alpha(alpha, 8), expected)
            self.assertFalse(np.array_equal(np.asarray(image), np.asarray(reference_scene)))

    def test_cache_and_saved_scores_match_naive_pixel_inference(self):
        scorer = PixelScorer(self.model, self.baseline)
        for index in [0, 40, 383, 384, 412, 767, 768, 1151, 1152, 1488, 1535]:
            row = self.report['records'][index]
            scene, _ = render(self.crowd, self.character, row['config'])
            cached = scorer.features(scene, row['config']['grid'])
            repeated = scorer.features(scene, row['config']['grid'])
            naive = scorer.features(scene, row['config']['grid'], use_cache=False)
            np.testing.assert_array_equal(cached, naive)
            np.testing.assert_array_equal(repeated, naive)
            self.assertEqual(hashlib.sha256(naive.astype('<f8').tobytes()).hexdigest(), row['features_sha256'])
            for name, scores in scorer.scores(naive).items():
                np.testing.assert_allclose(scores, row['models'][name]['scores'], rtol=0, atol=1e-14)

    def test_logistic_scorer_matches_saved_unclipped_implementation(self):
        scorer = PixelScorer(self.model, self.baseline)
        features = np.random.default_rng(61923).uniform(0, 1, (16, 8))
        expected = logistic_sigmoid(features @ self.baseline['raw_feature_weights'] + self.baseline['raw_feature_bias'])
        np.testing.assert_array_equal(scorer.scores(features)['logistic'], expected)

    def test_annotations_cannot_change_marks_or_seeded_measurement(self):
        scores = np.asarray([.8, .9] + [.03] * 14)
        before = scores.copy()
        samples = sample_scores(scores, .22, np.random.default_rng(68213).random(64))
        values = [evaluate(samples, truth) for truth in [[], [0], [0, 1], [3, 5, 7]]]
        self.assertEqual(len({tuple(v['marked_tiles']) for v in values}), 1)
        self.assertEqual(len({v['sampled']['single_measurement_region'] for v in values}), 1)
        np.testing.assert_array_equal(scores, before)
        self.assertEqual(values[0]['sampled']['target_hits'], 0)
        self.assertGreater(values[2]['sampled']['target_hits'], 0)

    def test_empty_oracle_returns_no_output_even_when_target_exists(self):
        samples = sample_scores(np.full(16, .01), .22, np.random.default_rng(539).random(64))
        value = evaluate(samples, [3])
        self.assertIsNone(value['sampled']['single_measurement_region'])
        self.assertEqual(value['sampled']['returned_measurements'], 0)
        self.assertEqual(value['amplification']['ideal_alpha32_target_mass'], 1 / 16)
        self.assertEqual(value['amplification']['effective_target_mass_if_empty_oracle_means_no_output'], 0)


if __name__ == '__main__':
    unittest.main()
