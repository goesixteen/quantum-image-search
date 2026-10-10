"""Eight illumination-relative photo features; experimental, not a live model.

Warm-color selection uses channel ratios and saturation, allowing orange/yellow
body colors without the v2 absolute brightness floor. Dark shape evidence is
relative to the median warm-pixel luminance. Constants are fixed before fresh
photograph identities are disclosed; this is an engineered prior, not learned
image segmentation or color-invariant perception.
"""
from __future__ import annotations
import numpy as np
from train import run_count

FEATURE_VERSION='photo-relative-v3'
FEATURE_NAMES=['warm_coverage','warm_aspect','relative_window_runs',
               'relative_window_darkness','window_spacing','relative_wheel_runs',
               'lower_warm_fill','relative_lower_darkness']


def relative_masks(image):
    rgb=np.asarray(image,dtype=np.float64)[...,:3]
    if rgb.ndim!=3 or rgb.shape[2]!=3:raise ValueError('Expected RGB or RGBA pixels')
    r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
    maximum=rgb.max(axis=2);minimum=rgb.min(axis=2)
    saturation=(maximum-minimum)/np.maximum(maximum,1)
    warm=(maximum>32)&(saturation>=.24)&(r>=.90*g)&(r>b)&(g>b)&((g-b)>=(r-b)*.25)&((g-b)<=(r-b)*1.10)
    luminance=.2126*r+.7152*g+.0722*b
    body_luminance=float(np.median(luminance[warm])) if warm.any() else 0.
    dark=luminance<body_luminance*.64
    return warm,dark,body_luminance


def extract_photo_features_v3(image):
    warm,dark,_=relative_masks(image);h,w=warm.shape
    ys,xs=np.where(warm)
    if len(xs)<8:return np.zeros(8)
    cols=np.flatnonzero(warm.sum(axis=0)>=2);rows=np.flatnonzero(warm.sum(axis=1)>=2)
    if len(cols)<2 or len(rows)<2:return np.zeros(8)
    x0,x1,y0,y1=int(cols[0]),int(cols[-1])+1,int(rows[0]),int(rows[-1])+1
    bw,bh=x1-x0,y1-y0
    xa,xb=x0+max(1,int(bw*.08)),x1-max(1,int(bw*.08))
    ya,yb=y0+max(1,int(bh*.13)),min(h,y0+max(2,int(bh*.58)))
    if xb<=xa or yb<=ya:return np.zeros(8)
    win=dark[ya:yb,xa:xb];runs=run_count(win.mean(axis=0)>.48)
    centers=[(a+b)/2 for a,b in runs];gaps=np.diff(centers)
    spacing=float(max(0,1-np.std(gaps)/max(1,np.mean(gaps)))) if len(gaps)>=2 else 0.
    wy0=max(0,y1-1);wy1=min(h,y1+max(2,int(bh*.36)));wheel=dark[wy0:wy1,x0:x1]
    wheels=run_count(wheel.mean(axis=0)>.40)
    ly=min(h-1,y0+int(bh*.77));lower=warm[ly:min(h,ly+max(1,int(bh*.14))),x0:x1]
    return np.clip(np.array([len(xs)/(w*h*.22),bw/max(1,bh)/3,len(runs)/6,win.mean()/.65,spacing,len(wheels)/3,lower.mean(),wheel.mean()/.55]),0,1)
