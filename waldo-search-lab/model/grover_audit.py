"""Ground-truth mass under the browser's first-peak Grover rule.

This consumes evaluation annotations only after a classifier has made its marks.
It does not make a classifier or oracle depend on ground truth.
"""
from __future__ import annotations
import math
import numpy as np


def recommend_iterations(n, m):
    if isinstance(n, bool) or isinstance(m, bool) or not isinstance(n, (int, np.integer)) or not isinstance(m, (int, np.integer)) or n < 1 or n & (n - 1) or not 0 <= m <= n:
        raise ValueError('Expected a power-of-two n and 0 <= m <= n.')
    if m in (0, n):
        return 0
    theta = math.asin(math.sqrt(m / n))
    ideal = math.pi / (4 * theta) - .5
    lower, upper = max(0, math.floor(ideal)), math.ceil(ideal)
    p = lambda k: math.sin((2 * k + 1) * theta) ** 2
    return upper if p(upper) > p(lower) + 1e-14 else lower


def target_mass(n, marked, true_tiles):
    marked, truth = set(marked), set(true_tiles)
    if any(isinstance(i, bool) or not isinstance(i, (int, np.integer)) or not 0 <= i < n for i in marked | truth):
        raise ValueError('Every index must be an integer in the candidate register.')
    m = len(marked)
    iterations = recommend_iterations(n, m)
    if m in (0, n):
        predicate_mass = m / n
        actual_mass = len(truth) / n
    else:
        theta = math.asin(math.sqrt(m / n))
        predicate_mass = math.sin((2 * iterations + 1) * theta) ** 2
        actual_mass = len(marked & truth) / m * predicate_mass + len(truth - marked) / (n - m) * (1 - predicate_mass)
    return dict(iterations=iterations, marked_count=m, true_tile_count=len(truth),
                correct_mark_count=len(marked & truth), false_mark_count=len(marked - truth),
                ideal_predicate_mass=predicate_mass, ideal_alpha32_target_mass=actual_mass,
                search_runs=m > 0,
                effective_target_mass_if_empty_oracle_means_no_output=actual_mass if m > 0 else 0.)


def summarize_audit(audit):
    values = [target_mass(audit['grid'] ** 2, record['marked'], record['alpha32_tiles']) for record in audit['records']]
    def stats(key):
        x = np.asarray([v[key] for v in values])
        return dict(mean=float(x.mean()), minimum=float(x.min()), median=float(np.median(x)), maximum=float(x.max()))
    return dict(
        scenes=len(values), empty_oracle_scene_count=sum(not v['search_runs'] for v in values),
        iteration_counts={str(k): sum(v['iterations'] == k for v in values) for k in sorted(set(v['iterations'] for v in values))},
        ideal_predicate_mass=stats('ideal_predicate_mass'),
        ideal_alpha32_target_mass=stats('ideal_alpha32_target_mass'),
        effective_target_mass_if_empty_oracle_means_no_output=stats('effective_target_mass_if_empty_oracle_means_no_output'),
        semantics='Ideal exact-statevector probabilities after the browser first-peak iteration rule, not sampled outcomes. Empty marks give a uniform theoretical distribution at zero rounds; the UI returns no search result, so a separate effective mass treats those scenes as zero.',
        formula='(|T intersect S|/M) sin^2((2k+1)theta) + (|T minus S|/(N-M)) cos^2((2k+1)theta), theta=asin(sqrt(M/N)); uniform for M=0 or N.',
    )
