"""V4 feature matrices on the frozen v3 pixels and scene-augmentation policy."""
from __future__ import annotations
import json
import numpy as np
from PIL import Image
from train import ROOT
import photo_v3_data as frozen_renderer
from photo_features_v4 import extract_photo_features_v4

SEED=frozen_renderer.SEED
SPLITS=frozen_renderer.SPLITS
SCENE_SEED=frozen_renderer.SCENE_SEED
load_training_assets=frozen_renderer.load_training_assets
foreground_scene=frozen_renderer.foreground_scene
illuminate=frozen_renderer.illuminate
fingerprint=frozen_renderer.fingerprint
provenance=frozen_renderer.provenance


def patches(n,seed,bus,backgrounds,stress=False):
    previous,labels,images=frozen_renderer.patches(n,seed,bus,backgrounds,stress)
    previous_report=json.loads((ROOT/'model/photo-v3-metrics.json').read_text())
    split=next(name for name,(count,s,st) in SPLITS.items() if (count,s,st)==(n,seed,stress))
    assert fingerprint(previous,labels)==previous_report['split_feature_and_label_sha256'][split], 'Frozen v3 pixel generator must reproduce exactly'
    features=np.array([extract_photo_features_v4(im) for im in images])
    return features,labels,images


def scene_features(scene,grid):
    cell=512//grid
    return np.array([extract_photo_features_v4(scene.crop((gx*cell,gy*cell,(gx+1)*cell,(gy+1)*cell)).resize((64,64),Image.Resampling.LANCZOS)) for gy in range(grid) for gx in range(grid)])


def validation_scenes(bus,backgrounds,n=128):
    rng=np.random.default_rng(SCENE_SEED);sets=[]
    for bi,bg in enumerate(backgrounds):
        for grid in [4,8]:
            cell=512//grid;width=round(cell*.82);height=min(round(width*bus.height/bus.width),round(cell*.84))
            empty=[]
            for gain in [.55,.75,1.,1.2]:
                for gamma in [.85,1.,1.15]:
                    for balance in [[1,1,1],[1.08,1,.92],[.92,1,1.08]]:empty.append(scene_features(illuminate(bg,gain,gamma,balance),grid))
            features=[];truths=[];positions=[]
            for k in range(n):
                x=int(rng.integers(0,513-width));y=int(rng.integers(0,513-height));scene,truth=foreground_scene(bg,bus,grid,x,y)
                gain=float(rng.uniform(.6,1.25));gamma=float(rng.uniform(.85,1.2));balance=rng.uniform(.9,1.1,3)
                features.append(scene_features(illuminate(scene,gain,gamma,balance),grid));truths.append(truth);positions.append([x,y])
            sets.append(dict(background=bi,grid=grid,empty_features=np.array(empty),features=np.array(features),truth=np.array(truths),positions=positions))
    return sets
