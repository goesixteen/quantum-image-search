"""Audit both supported photo-grid raster scales and independently check gradients."""
import argparse,json
from pathlib import Path
import numpy as np
from train import ROOT,DIST,circuit
from train_photo import load_assets,placement_audit
from photo_features import extract_photo_features

ap=argparse.ArgumentParser();ap.add_argument('--model',default=str(ROOT/'model/model-photo-candidate.json'));args=ap.parse_args()
model=json.loads(Path(args.model).read_text())
bus,bgs=load_assets(DIST/'assets/real-schoolbus.png',[DIST/'assets/street-captcha.png'])
results={f'grid{grid}':placement_audit(bus,bgs,model,feature_extractor=extract_photo_features,grid=grid) for grid in [4,8]}
theta=np.array(model['theta']);feat=np.random.default_rng(1832).uniform(0,1,(9,8));read,jac=circuit(feat,theta,True);error=0
for k in range(len(theta)):
    p=theta.copy();m=theta.copy();p[k]+=np.pi/2;m[k]-=np.pi/2
    error=max(error,float(np.max(np.abs(.5*(circuit(feat,p)-circuit(feat,m))-jac[:,k,:]))))
assert error<1e-12,error
results['derivative_max_error']=error
(ROOT/'model/photo-placement-audit.json').write_text(json.dumps(results,indent=2))
for grid in [4,8]:
    a=results[f'grid{grid}'];print(json.dumps(dict(grid=grid,hit_rate=a['any_overlap_hit_rate'],clean_rate=a['no_false_tile_mark_rate'],miss_count=len(a['misses']),empty_marked_tiles=a['empty_scene_audits'][0]['marked_tiles'],empty_max_score=a['empty_scene_audits'][0]['max_score']),indent=2))
print('derivative_max_error',error)
