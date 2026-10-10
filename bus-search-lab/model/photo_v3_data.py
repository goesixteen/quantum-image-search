"""Predeclared v3 patch and scene renderer; training identities only.

Cached resized foregrounds speed generation without changing the pixel model.
Illumination is applied to rendered RGB; alpha is retained for evaluation only.
"""
from __future__ import annotations
import hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from train import ROOT,DIST
from photo_features_v3 import extract_photo_features_v3

SEED=2026101030
SPLITS={'train':(4800,SEED,False),'validation':(1200,SEED+1,False),
        'test':(2000,SEED+202,False),'stress_test':(1200,SEED+203,True)}
SCENE_SEED=SEED+50


def asset_paths():
    return [DIST/'assets/real-schoolbus.png',DIST/'assets/street-captcha.png',ROOT/'model/training-assets/sauk-centre-street-512.png']


def load_training_assets():
    paths=asset_paths();bus=Image.open(paths[0]).convert('RGBA')
    backgrounds=[Image.open(p).convert('RGB') for p in paths[1:]]
    assert all(bg.size==(512,512) for bg in backgrounds)
    return bus,backgrounds


def illuminate(image,gain,gamma,balance,noise=None):
    rgb=np.asarray(image,dtype=np.float64)/255.
    rgb=255.*np.clip((rgb**gamma)*gain*np.asarray(balance)[None,None,:],0,1)
    if noise is not None:rgb+=noise
    return Image.fromarray(np.clip(rgb,0,255).astype(np.uint8))


def patches(n,seed,bus,backgrounds,stress=False):
    rng=np.random.default_rng(seed);labels=np.arange(n)%2;images=[]
    scaled=[bg.resize((256,256),Image.Resampling.LANCZOS) for bg in backgrounds]
    widths=range(36 if stress else 44,65 if stress else 60)
    sprites={w:bus.resize((w,min(round(w*bus.height/bus.width),54)),Image.Resampling.LANCZOS) for w in widths}
    for label in labels:
        bi=int(rng.integers(len(backgrounds)));bg=backgrounds[bi] if rng.random()<.5 else scaled[bi]
        x,y=rng.integers(0,bg.width-63,2);im=bg.crop((int(x),int(y),int(x+64),int(y+64)))
        if not label and rng.random()<.35:
            grid=int(rng.choice([4,8]));cell=512//grid;tx,ty=rng.integers(0,grid,2)
            im=backgrounds[bi].crop((int(tx*cell),int(ty*cell),int((tx+1)*cell),int((ty+1)*cell))).resize((64,64),Image.Resampling.LANCZOS)
        if label:
            obj=sprites[int(rng.choice(list(widths)))];w,h=obj.size
            if rng.random()<.5:px=int(rng.integers(-w//2,65-w//2));py=int(rng.integers(-h//2,65-h//2))
            else:px=int(rng.integers(0,max(1,65-w)));py=int(rng.integers(0,max(1,65-h)))
            im.paste(obj,(px,py),obj)
        gain=float(rng.uniform(.4 if stress else .6,1.35 if stress else 1.25))
        gamma=float(rng.uniform(.75 if stress else .85,1.3 if stress else 1.2))
        balance=rng.uniform(.85 if stress else .9,1.15 if stress else 1.1,3)
        noise=rng.normal(0,2,(64,64,3)) if stress else None
        images.append(illuminate(im,gain,gamma,balance,noise))
    return np.array([extract_photo_features_v3(im) for im in images]),labels.astype(float),images


def scene_features(scene,grid):
    cell=512//grid
    return np.array([extract_photo_features_v3(scene.crop((gx*cell,gy*cell,(gx+1)*cell,(gy+1)*cell)).resize((64,64),Image.Resampling.LANCZOS)) for gy in range(grid) for gx in range(grid)])


def foreground_scene(background,bus,grid,x,y):
    cell=512//grid;width=round(cell*.82);height=min(round(width*bus.height/bus.width),round(cell*.84))
    sprite=bus.resize((width,height),Image.Resampling.LANCZOS);scene=background.copy();scene.paste(sprite,(x,y),sprite)
    mask=Image.new('L',(512,512));mask.paste(sprite.getchannel('A'),(x,y));a=np.asarray(mask)>32
    truth=np.array([bool(a[gy*cell:(gy+1)*cell,gx*cell:(gx+1)*cell].any()) for gy in range(grid) for gx in range(grid)])
    return scene,truth


def validation_scenes(bus,backgrounds,n=128):
    rng=np.random.default_rng(SCENE_SEED);sets=[]
    for bi,bg in enumerate(backgrounds):
        for grid in [4,8]:
            cell=512//grid;width=round(cell*.82);height=min(round(width*bus.height/bus.width),round(cell*.84))
            empty=[]
            for gain in [.55,.75,1.,1.2]:
                for gamma in [.85,1.,1.15]:
                    for balance in [[1,1,1],[1.08,1,.92],[.92,1,1.08]]:
                        empty.append(scene_features(illuminate(bg,gain,gamma,balance),grid))
            features=[];truths=[];positions=[]
            for k in range(n):
                x=int(rng.integers(0,513-width));y=int(rng.integers(0,513-height))
                scene,truth=foreground_scene(bg,bus,grid,x,y)
                gain=float(rng.uniform(.6,1.25));gamma=float(rng.uniform(.85,1.2));balance=rng.uniform(.9,1.1,3)
                features.append(scene_features(illuminate(scene,gain,gamma,balance),grid));truths.append(truth);positions.append([x,y])
            sets.append(dict(background=bi,grid=grid,empty_features=np.array(empty),features=np.array(features),truth=np.array(truths),positions=positions))
    return sets


def fingerprint(features,labels):
    return hashlib.sha256(np.asarray(features,dtype='<f8').tobytes()+np.asarray(labels,dtype='<f8').tobytes()).hexdigest()


def provenance():
    return [dict(file=str(p.relative_to(ROOT)),sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in asset_paths()]
