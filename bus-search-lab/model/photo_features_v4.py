"""Localized eight-feature warm-body/window/stripe/wheel representation.

This is an engineered pixel-only selector, not learned segmentation. Warm color
matches the illumination-relative v3 predicate, while geometry is computed
around local horizontal body bands rather than one whole-patch bounding box.
"""
from __future__ import annotations
import numpy as np
from train import run_count
from photo_features_v3 import relative_masks

FEATURE_VERSION='photo-local-bands-v4'
FEATURE_NAMES=['visible_band_width','local_body_warm_fill','local_window_darkness',
               'local_window_runs','local_window_spacing','local_lower_dark_runs',
               'local_dark_stripe','window_body_contrast']
MAX_CANDIDATES=24


def candidate_bands(warm,return_pre_cap_count=False):
    h,w=warm.shape;bands=[]
    for y in range(h):
        segments=run_count(warm[y]);merged=[]
        for x0,x1 in segments:
            if merged and x0-merged[-1][1]<=2:merged[-1]=(merged[-1][0],x1)
            else:merged.append((x0,x1))
        for x0,x1 in merged:
            if x1-x0<8:continue
            if y+1<h and warm[y+1,x0:x1].mean()>=.75:continue
            bands.append((x0,x1,y))
    ranked=sorted(bands,key=lambda b:(-(b[1]-b[0]),b[2],b[0]))
    if return_pre_cap_count:return ranked[:MAX_CANDIDATES],len(ranked)
    return ranked[:MAX_CANDIDATES]


def candidate_features(warm,luminance,band):
    h,w=warm.shape;x0,x1,y=band;bw=x1-x0
    body_y0=max(0,y-4);body_y1=y+1;body=warm[body_y0:body_y1,x0:x1]
    fill=float(body.mean())
    local_warm=luminance[body_y0:body_y1,x0:x1][body]
    if len(local_warm)<4 or fill<.25:return None
    body_lum=float(np.median(local_warm));dark=luminance<body_lum*.68
    xa=x0+max(1,int(bw*.08));xb=x1-max(1,int(bw*.08))
    ya=max(0,y-12);yb=max(0,y-5)
    if xb<=xa:return None
    if yb>ya:
        win=dark[ya:yb,xa:xb];window_dark=float(win.mean());runs=run_count(win.mean(axis=0)>.45)
        contrast=float(max(0,(body_lum-luminance[ya:yb,xa:xb].mean())/max(body_lum,1)))
    else:window_dark=0.;runs=[];contrast=0.
    centers=[(a+b)/2 for a,b in runs];gaps=np.diff(centers)
    spacing=float(max(0,1-np.std(gaps)/max(1,np.mean(gaps)))) if len(gaps)>=2 else 0.
    wheel_y0=min(h,y+1);wheel_y1=min(h,y+7)
    if wheel_y1>wheel_y0:
        wheel=dark[wheel_y0:wheel_y1,x0:x1];wheels=run_count(wheel.mean(axis=0)>.35);wheel_dark=float(wheel.mean())
    else:wheels=[];wheel_dark=0.
    stripe=float(dark[max(0,y-6):y+1,x0:x1].mean(axis=1).max())
    features=np.clip(np.array([bw/w,fill,window_dark/.65,len(runs)/6,spacing,len(wheels)/3,stripe,contrast/.6]),0,1)
    window_quality=min(len(runs),6)/6*(.4+.6*spacing)
    wheel_quality=min(len(wheels),2)/2*max(0,1-abs(wheel_dark-.22)/.40)
    quality=(bw/w)*fill*(.05+window_quality)*(.5+.5*contrast)*(.7+.3*wheel_quality)
    return features,float(quality)


def extract_photo_features_v4(image,return_diagnostics=False):
    rgb=np.asarray(image,dtype=float)[...,:3];warm,_,_=relative_masks(rgb)
    luminance=.2126*rgb[:,:,0]+.7152*rgb[:,:,1]+.0722*rgb[:,:,2]
    selected=np.zeros(8);best=-1.;winner=None;bands,pre_cap_count=candidate_bands(warm,True)
    for band in bands:
        candidate=candidate_features(warm,luminance,band)
        if candidate is not None and candidate[1]>best+1e-12:selected,best=candidate;winner=band
    if return_diagnostics:return selected,dict(candidate_count=len(bands),pre_cap_count=pre_cap_count,discarded_by_cap=pre_cap_count-len(bands),selected_band=winner,quality=best)
    return selected
