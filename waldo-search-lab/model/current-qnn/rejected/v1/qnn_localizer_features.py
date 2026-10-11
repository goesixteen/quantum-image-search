"""Exact current fine-QNN feature contract shared with dist/qnn-localizer.js.

Only final composite RGB and nominal target size enter this function. No clean
background, target template pixels, labels, masks or true placement are accepted.
Centers are candidate scan coordinates, not target coordinates. Out-of-frame
samples are RGB zero. Alpha is ignored: the application supplies an opaque scene.
"""
from __future__ import annotations
import math
import numpy as np
FEATURE_VERSION = 'current-qnn-window-v1'
FEATURE_NAMES = ['torso_red', 'torso_white', 'stripe_transitions', 'stripe_contrast', 'stripe_coherence', 'lower_blue', 'vertical_color_order', 'central_color_concentration']

def extract_window_features(image, cx, cy, target_width, target_height):
    rgb = np.asarray(image)
    if rgb.ndim != 3 or rgb.shape[2] not in (3, 4) or not np.isfinite([cx, cy, target_width, target_height]).all() or min(target_width, target_height) <= 0:
        raise ValueError('Expected RGB/RGBA pixels and finite positive target dimensions.')
    w, h = max(target_width + 8, math.ceil(1.6 * target_width)), target_height + 8
    x = -w / 2 + (np.arange(24, dtype=np.float64) + .5) * w / 24
    y = -h / 2 + (np.arange(48, dtype=np.float64) + .5) * h / 48
    ix, iy = np.floor(cx + x).astype(int), np.floor(cy + y).astype(int)
    inside = (iy[:, None] >= 0) & (iy[:, None] < rgb.shape[0]) & (ix[None, :] >= 0) & (ix[None, :] < rgb.shape[1])
    pixels = rgb[np.clip(iy, 0, rgb.shape[0] - 1)[:, None], np.clip(ix, 0, rgb.shape[1] - 1)[None, :], :3].astype(np.float64)
    pixels[~inside] = 0
    r, g, b = pixels[..., 0], pixels[..., 1], pixels[..., 2]
    red = (r > 125) & (r > 1.38 * g) & (r > 1.25 * b)
    white = (pixels.min(axis=2) > 170) & (pixels.max(axis=2) - pixels.min(axis=2) < 65)
    blue = (b > 85) & (b > 1.12 * r) & (b > .90 * g)
    core = np.abs(x) <= .42 * target_width
    left, right, flank = core & (x < 0), core & (x >= 0), np.abs(x) >= .60 * target_width
    rel = (y + target_height / 2) / target_height
    torso, lower, spatial = (rel >= .18) & (rel < .60), (rel >= .58) & (rel < .94), (rel >= .18) & (rel < .94)
    def profile(mask, columns):
        return mask[:, columns].sum(axis=1, dtype=np.float64) / max(1, int(columns.sum()))
    def average(values):
        return float(np.sum(values, dtype=np.float64) / len(values)) if len(values) else 0.
    rp, wp, bp = profile(red, core), profile(white, core), profile(blue, core)
    rr, ww = rp[torso], wp[torso]
    tr, tw, lb, lr, tb = average(rr), average(ww), average(bp[lower]), average(rp[lower]), average(bp[torso])
    std = math.sqrt(average((rr - tr) ** 2))
    transitions = sum(abs(float(rr[i] - rr[i - 1])) * min(1., float(ww[i] + ww[i - 1])) for i in range(1, len(rr)))
    coherence = max(0., 1. - average(np.abs(profile(red, left)[torso] - profile(red, right)[torso])))
    concentration = average(profile(red | blue, core)[spatial]) - average(profile(red | blue, flank)[spatial])
    return np.clip([tr / .25, tw / .45, transitions / 3, std / .30, coherence * std / .20, lb / .25, (tr - lr + lb - tb) / .40, concentration / .40], 0., 1.)

def extract_features_batch(image, centers, target_width, target_height):
    return np.asarray([extract_window_features(image, x, y, target_width, target_height) for x, y in centers], dtype=np.float64)

def accepted_indices(scores, centers, threshold, target_width, nms_radius=None):
    """Same threshold-first, stable score/index NMS as JS at64×64 validation."""
    radius = max(12., .35 * target_width) if nms_radius is None else nms_radius
    ranked = sorted((i for i, s in enumerate(scores) if s >= threshold), key=lambda i: (-scores[i], i))
    kept = []
    for i in ranked:
        if all(math.hypot(centers[i][0] - centers[j][0], centers[i][1] - centers[j][1]) > radius for j in kept):
            kept.append(i)
    return sorted(kept)
