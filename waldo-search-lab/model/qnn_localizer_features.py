"""Exact current fine-QNN feature contract shared with dist/qnn-localizer.js.

Only final composite RGB and nominal target size enter this function. No clean
background, target template pixels, labels, masks or true placement are accepted.
Centers are candidate scan coordinates, not target coordinates. Out-of-frame
samples are RGB zero. Alpha is ignored: the application supplies an opaque scene.
"""
from __future__ import annotations
import math
import numpy as np
FEATURE_VERSION = 'current-qnn-window-v3'
FEATURE_NAMES = ['stripe_fourier_magnitude', 'stripe_cross_phase', 'red_white_balance', 'yellow_head_outline', 'blue_leg_morphology', 'horizontal_palette_alignment_px', 'vertical_palette_alignment_px', 'supplied_target_height']

def extract_window_features(image, cx, cy, target_width, target_height):
    rgb = np.asarray(image)
    if rgb.ndim != 3 or rgb.shape[2] not in (3, 4) or not np.isfinite([cx, cy, target_width, target_height]).all() or min(target_width, target_height) <= 0:
        raise ValueError('Expected RGB/RGBA pixels and finite positive target dimensions.')
    w, h = max(target_width + 16, math.ceil(1.6 * target_width)), target_height + 16
    x = -w / 2 + (np.arange(24, dtype=np.float64) + .5) * w / 24
    y = -h / 2 + (np.arange(48, dtype=np.float64) + .5) * h / 48
    ix, iy = np.floor(cx + x).astype(int), np.floor(cy + y).astype(int)
    inside = (iy[:, None] >= 0) & (iy[:, None] < rgb.shape[0]) & (ix[None, :] >= 0) & (ix[None, :] < rgb.shape[1])
    pixels = rgb[np.clip(iy, 0, rgb.shape[0] - 1)[:, None], np.clip(ix, 0, rgb.shape[1] - 1)[None, :], :3].astype(np.float64)
    pixels[~inside] = 0
    r, g, b = pixels[..., 0], pixels[..., 1], pixels[..., 2]
    # Palette and structural priors calibrated from training artwork; no runtime PNG input.
    t = np.clip(((r-223)*32+(g-48)*207+(b-59)*196)/82289,0.,1.)
    confidence = np.exp(-((r-223-32*t)**2+(g-48-207*t)**2+(b-59-196*t)**2)/2450)*inside
    red, white = confidence*(1-t), confidence*t
    blue = np.exp(-((r-40)**2+(g-107)**2+(b-192)**2)/3200)*inside
    yellow = np.exp(-((r-252)**2+(g-234)**2+(b-43)**2)/3200)*inside
    dark = np.exp(-(r*r+g*g+b*b)/3200)*inside
    core = np.abs(x) <= .42 * target_width
    left, right, flank = core & (x < 0), core & (x >= 0), np.abs(x) >= .60 * target_width
    rel = (y + target_height / 2) / target_height
    torso, lower = (rel >= .20) & (rel < .50), (rel >= .55) & (rel < .95)
    red_rows, blue_rows, head_rows = (rel >= .10) & (rel < .62), (rel >= .40) & (rel < 1.05), (rel >= -.04) & (rel < .22)
    def profile(mask, columns):
        return mask[:, columns].sum(axis=1, dtype=np.float64) / max(1, int(columns.sum()))
    def average(values):
        return float(np.sum(values, dtype=np.float64) / len(values)) if len(values) else 0.
    rp, wp = profile(red, core), profile(white, core)
    rr, ww = rp[torso], wp[torso]
    phase = 2*np.pi*(y+target_height/2)/(40/580*target_height)
    def spectrum(values):
        centered=values[torso]-average(values[torso])
        return average(centered*np.cos(phase[torso])),average(centered*np.sin(phase[torso]))
    zr,zi=spectrum(rp-wp);lr,li=spectrum(profile(red-white,left));br,bi=spectrum(profile(red-white,right))
    periodic=math.hypot(zr,zi);cross=max(0.,lr*br+li*bi);balance=2*math.sqrt(average(rr)*average(ww))
    dx, dy = ix.astype(np.float64) + .5 - cx, iy.astype(np.float64) + .5 - cy
    R, B = red*red_rows[:,None], blue*blue_rows[:,None]
    nr, nb = float(R.sum()), float(B.sum())
    rx, ry = float((R*dx[None,:]).sum()), float((R*dy[:,None]).sum())
    bx, by = float((B*dx[None,:]).sum()), float((B*dy[:,None]).sum())
    dr, db = nr/max(1,24*int(red_rows.sum())), nb/max(1,24*int(blue_rows.sum()))
    pr, pb, presence = dr/(dr+.03), db/(db+.03), (dr+db)/(dr+db+.03)
    center_x = (rx+bx)/(nr+nb or 1)
    horizontal = presence*math.exp(-center_x**2/72)
    vertical = (pr*math.exp(-(ry/(nr or 1)+.147*target_height)**2/72)+pb*math.exp(-(by/(nb or 1)-.178*target_height)**2/72))/2
    # Shape weights use fixed sample offsets; centroid alignment uses actual nearest-pixel centers.
    radius=np.sqrt(x[None,:]**2+(y[:,None]+.43*target_height)**2)
    weights=np.exp(-radius**2/72)*head_rows[:,None]
    ring=np.exp(-(radius-.056*target_height)**2/(2*max(1,.018*target_height)**2))*head_rows[:,None]
    head=float((weights*yellow).sum())/(float(weights.sum()) or 1)*(.5+.5*float((ring*dark).sum())/(float(ring.sum()) or 1))
    leg_offset=(.14+.22*(rel-.5))*target_width;variance=2*max(1,.08*target_width)**2
    lobes=(np.exp(-(x[None,:]-leg_offset[:,None])**2/variance)+np.exp(-(x[None,:]+leg_offset[:,None])**2/variance))*lower[:,None]
    gap=np.exp(-x[None,:]**2/variance)*lower[:,None]
    legs=max(0.,float((lobes*blue).sum())/(float(lobes.sum()) or 1)-.5*float((gap*blue).sum())/(float(gap.sum()) or 1))
    return np.clip([periodic,cross,balance,head,legs,horizontal,vertical,(target_height-24)/88],0.,1.)

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
