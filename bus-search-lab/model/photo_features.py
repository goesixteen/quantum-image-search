"""Eight bus-geometry features with a tighter yellow-hue color predicate.

The synthetic extractor is preserved in train.py. This optional photo variant
rejects red/brown brick: 28-degree minimum yellow hue, plus r >= .96g.
It shares all subsequent region/feature definitions with the synthetic version.
"""
import numpy as np
from train import run_count

def extract_photo_features(image):
    rgb=np.asarray(image,dtype=np.float64)[...,:3]
    h,w,_=rgb.shape;r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
    yellow=(r>125)&(g>82)&(b<150)&(r>b*1.35)&(g>b*1.20)&(r<g*1.9)&((g-b)>(r-b)*.47)&(r>=g*.96)
    dark=(.2126*r+.7152*g+.0722*b)<105
    ys,xs=np.where(yellow)
    if len(xs)<8:return np.zeros(8)
    cols=np.flatnonzero(yellow.sum(axis=0)>=2);rows=np.flatnonzero(yellow.sum(axis=1)>=2)
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
    ly=min(h-1,y0+int(bh*.77));lower=yellow[ly:min(h,ly+max(1,int(bh*.14))),x0:x1]
    return np.clip(np.array([len(xs)/(w*h*.22),bw/max(1,bh)/3,len(runs)/6,win.mean()/.65,spacing,len(wheels)/3,lower.mean(),wheel.mean()/.55]),0,1)
