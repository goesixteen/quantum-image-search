"""Wanda feature contract shared with dist/wanda-localizer.js.

Only final composite RGB and nominal target size enter this function. No clean
background, target template pixels, labels, masks or true placement are accepted.
Centers are candidate scan coordinates, not target coordinates. Out-of-frame
samples are RGB zero. Alpha is ignored: the application supplies an opaque scene.
"""
from __future__ import annotations
import math
import numpy as np
FEATURE_VERSION = 'wanda-window-v1'
FEATURE_NAMES = ['sweater_stripe_fourier', 'sweater_cross_phase', 'sweater_red_white_balance', 'warm_face_brown_hair', 'blue_trouser_morphology', 'body_horizontal_alignment_px', 'body_vertical_alignment_px', 'supplied_wanda_height']

def extract_window_features(image, cx, cy, target_width, target_height):
    rgb = np.asarray(image)
    if rgb.ndim != 3 or rgb.shape[2] not in (3, 4) or not np.isfinite([cx, cy, target_width, target_height]).all() or min(target_width, target_height) <= 0:
        raise ValueError('Expected RGB/RGBA pixels and finite positive target dimensions.')
    w, h = max(target_width + 16, math.ceil(1.6 * target_width)), target_height + 16
    x = -w / 2 + (np.arange(28, dtype=np.float64) + .5) * w / 28
    y = -h / 2 + (np.arange(64, dtype=np.float64) + .5) * h / 64
    ix, iy = np.floor(cx + x).astype(int), np.floor(cy + y).astype(int)
    inside = (iy[:, None] >= 0) & (iy[:, None] < rgb.shape[0]) & (ix[None, :] >= 0) & (ix[None, :] < rgb.shape[1])
    pixels = rgb[np.clip(iy, 0, rgb.shape[0] - 1)[:, None], np.clip(ix, 0, rgb.shape[1] - 1)[None, :], :3].astype(np.float64)
    pixels[~inside] = 0
    r, g, b = pixels[..., 0], pixels[..., 1], pixels[..., 2]
    # Palette and structural priors calibrated from training artwork; no runtime PNG input.
    t = np.clip(((r-215)*34+(g-21)*223+(b-30)*212)/95829,0.,1.)
    confidence = np.exp(-((r-215-34*t)**2+(g-21-223*t)**2+(b-30-212*t)**2)/2888)*inside
    red, white = confidence*(1-t), confidence*t
    blue = np.exp(-((r-35)**2+(g-101)**2+(b-180)**2)/4050)*inside
    yellow = np.exp(-((r-250)**2+(g-180)**2+(b-100)**2)/5000)*inside
    dark = np.exp(-((r-60)**2+(g-29)**2+(b-11)**2)/2888)*inside
    core = np.abs(x) <= .42 * target_width
    left, right, flank = core & (x < 0), core & (x >= 0), np.abs(x) >= .60 * target_width
    rel = (y + target_height / 2) / target_height
    torso, lower = (rel >= .27) & (rel < .50), (rel >= .55) & (rel < .92)
    red_rows, blue_rows, head_rows = (rel >= .23) & (rel < .55), (rel >= .52) & (rel < .94), (rel >= .01) & (rel < .285)
    def profile(mask, columns):
        return mask[:, columns].sum(axis=1, dtype=np.float64) / max(1, int(columns.sum()))
    def average(values):
        return float(np.sum(values, dtype=np.float64) / len(values)) if len(values) else 0.
    rp, wp = profile(red, core), profile(white, core)
    rr, ww = rp[torso], wp[torso]
    phase = 2*np.pi*(y+target_height/2)/(.0597*target_height)
    def spectrum(values):
        centered=values[torso]-average(values[torso])
        return average(centered*np.cos(phase[torso])),average(centered*np.sin(phase[torso]))
    zr,zi=spectrum(rp-wp);lr,li=spectrum(profile(red-white,left));br,bi=spectrum(profile(red-white,right))
    periodic=math.hypot(zr,zi);cross=max(0.,lr*br+li*bi);balance=2*math.sqrt(average(rr)*average(ww))
    dx, dy = ix.astype(np.float64) + .5 - cx, iy.astype(np.float64) + .5 - cy
    moment=np.where(np.abs(x)<=.65*target_width+4,np.exp(-x*x/(2*(.60*target_width+3)**2)),0.)
    R, B = red*red_rows[:,None]*moment[None,:], blue*blue_rows[:,None]*moment[None,:]
    nr, nb = float(R.sum()), float(B.sum())
    rx, ry = float((R*dx[None,:]).sum()), float((R*dy[:,None]).sum())
    bx, by = float((B*dx[None,:]).sum()), float((B*dy[:,None]).sum())
    dr, db = nr/max(1,float(moment.sum())*int(red_rows.sum())), nb/max(1,float(moment.sum())*int(blue_rows.sum()))
    pr, pb, presence = dr/(dr+.04), db/(db+.04), (dr+db)/(dr+db+.04)
    center_x = (rx+bx)/(nr+nb or 1)
    horizontal = presence*math.exp(-center_x**2/72)
    vertical = (pr*math.exp(-(ry/(nr or 1)+.100*target_height)**2/72)+pb*math.exp(-(by/(nb or 1)-.209*target_height)**2/72))/2
    # Shape weights use fixed sample offsets; centroid alignment uses actual nearest-pixel centers.
    radius=np.sqrt(x[None,:]**2+(y[:,None]+.365*target_height)**2)
    weights=np.exp(-radius**2/50)*head_rows[:,None]
    ring=np.exp(-(radius-.095*target_height)**2/(2*max(1,.025*target_height)**2))*head_rows[:,None]
    head=float((weights*yellow).sum())/(float(weights.sum()) or 1)*(.5+.5*float((ring*dark).sum())/(float(ring.sum()) or 1))
    leg_offset=.18*target_width;variance=2*max(.8,.075*target_width)**2
    lobes=(np.exp(-(x[None,:]-leg_offset)**2/variance)+np.exp(-(x[None,:]+leg_offset)**2/variance))*lower[:,None]
    gap=np.exp(-x[None,:]**2/variance)*lower[:,None]
    legs=max(0.,float((lobes*blue).sum())/(float(lobes.sum()) or 1)-.5*float((gap*blue).sum())/(float(gap.sum()) or 1))
    return np.clip([periodic,cross,balance,head,legs,horizontal,vertical,(target_height-40)/24],0.,1.)

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
