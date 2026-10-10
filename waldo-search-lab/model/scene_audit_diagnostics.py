"""Post-evaluation sensitivity to repeated probes; no fitting or new scenes.

Keeps the original declared384-case report intact. Deduplication is secondary
descriptive analysis, not a replacement selected for better performance.
"""
from collections import defaultdict
import hashlib
import json
from pathlib import Path

from scene_audit import ROOT, summary


def main():
    path = ROOT / 'model/scene-audit.json'
    raw = path.read_bytes()
    original = json.loads(raw)
    groups = {}
    for suite in ['nominal', 'stress']:
        groups[suite] = {}
        for grid in [4, 8]:
            rows = [r for r in original['records'] if r['config']['suite'] == suite and r['config']['grid'] == grid]
            by_geometry, by_features = defaultdict(list), defaultdict(list)
            for row in rows:
                c = row['config']
                key = tuple(c['position']) + tuple(c['sprite_size']) + (c['foreground_brightness'], c['scene_brightness'])
                by_geometry[key].append(row)
                by_features[row['features_sha256']].append(row)
            unique = [cluster[0] for cluster in by_geometry.values()]
            different_truth_clusters = [cluster for cluster in by_features.values() if len({tuple(r['true_tiles']) for r in cluster}) > 1]
            no_common_true = [cluster for cluster in different_truth_clusters if not set.intersection(*(set(r['true_tiles']) for r in cluster))]
            groups[suite][f'grid{grid}'] = dict(
                original_cases=len(rows), unique_render_configurations=len(unique), unique_feature_matrices=len(by_features),
                repeated_geometry_ids=[[r['config']['id'] for r in cluster] for cluster in by_geometry.values() if len(cluster) > 1],
                geometry_deduplicated_models={name: summary(unique, name) for name in ['qnn', 'logistic']},
                same_feature_matrix_different_alpha_truth_cluster_count=len(different_truth_clusters),
                same_feature_matrix_no_common_true_tile_cluster_count=len(no_common_true),
                feature_collision_examples=[[r['config']['id'] for r in cluster] for cluster in different_truth_clusters[:4]],
            )
    report = dict(source_report_sha256=hashlib.sha256(raw).hexdigest(), analysis_source_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                  status='Post-evaluation descriptive sensitivity; does not change frozen classifier or original protocol.', groups=groups,
                  semantics='A unique rendering key is position, sprite size, foreground light, and scene light within a fixed suite/grid. The first declared case represents each repeated key. Identical engineered feature matrices need not mean identical RGB images.')
    output = ROOT / 'model/scene-audit-diagnostics.json'
    output.write_text(json.dumps(report, indent=2, allow_nan=False) + '\n')
    print(json.dumps({suite: {grid: {k: v for k, v in data.items() if k in ['original_cases', 'unique_render_configurations', 'unique_feature_matrices', 'same_feature_matrix_different_alpha_truth_cluster_count', 'same_feature_matrix_no_common_true_tile_cluster_count']} | {'deduplicated_hits': {name: value['target_hit_scenes'] for name, value in data['geometry_deduplicated_models'].items()}} for grid, data in cases.items()} for suite, cases in groups.items()}, indent=2))


if __name__ == '__main__':
    main()
