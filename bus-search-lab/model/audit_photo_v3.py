"""Read-only v3 photograph audit; use only after feature/model/protocol freeze.

Supplied normalized street PNGs must be512×512. Bus photographs require manually
supplied XYXY boxes and are known-ROI/coarse-box diagnostics, not segmentation.
"""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageOps
from train import ROOT,DIST,circuit,sigmoid
from photo_features_v3 import extract_photo_features_v3,FEATURE_VERSION
from photo_v3_data import SEED,scene_features,foreground_scene
from unseen_audit import transformed_bbox
from amplification_audit import summarize_audit

AUDIT_SEED=SEED+100


def scorer(model):
    assert model['featureVersion']==FEATURE_VERSION
    if 'theta' in model:return lambda f:sigmoid(circuit(f,np.array(model['theta']))@model['readout']+model['bias'])
    return lambda f:sigmoid(f@model['raw_feature_weights']+model['raw_feature_bias'])


def street_audit(path,bus,models,n):
    bg=Image.open(path).convert('RGB');assert bg.size==(512,512)
    result={}
    for grid in [4,8]:
        rng=np.random.default_rng(AUDIT_SEED);width=round(512/grid*.82);height=round(width*bus.height/bus.width)
        empty=scene_features(bg,grid);features=[];truth=[];positions=[]
        for i in range(n):
            x=int(rng.integers(0,513-width));y=int(rng.integers(0,513-height));scene,t=foreground_scene(bg,bus,grid,x,y)
            features.append(scene_features(scene,grid));truth.append(t);positions.append([x,y])
        features=np.array(features);truth=np.array(truth);result[f'grid{grid}']={}
        for name,model in models.items():
            fn=scorer(model);blank=fn(empty);p=fn(features.reshape(-1,8)).reshape(features.shape[:2]);marked=p>=model['threshold'];hit=np.any(marked&truth,axis=1);false=np.any(marked&~truth,axis=1)
            records=[dict(position=positions[i],scores=p[i].tolist(),marked=np.flatnonzero(marked[i]).tolist(),alpha32_tiles=np.flatnonzero(truth[i]).tolist()) for i in range(n)]
            full=dict(grid=grid,scenes=n,seed=AUDIT_SEED,ground_truth='any target alpha>32 pixel',empty_scene=dict(marked_tiles=np.flatnonzero(blank>=model['threshold']).tolist(),scores=blank.tolist()),hit_count=int(hit.sum()),false_mark_scene_count=int(false.sum()),complete_count=int((hit&~false).sum()),any_overlap_hit_rate=float(hit.mean()),complete_scene_rate=float((hit&~false).mean()),records=records)
            full['grover_probability_summary']=summarize_audit(full);result[f'grid{grid}'][name]=full
    return result


def bus_audit(path,bbox,models):
    source=Image.open(path).convert('RGB');scene=ImageOps.fit(source,(512,512),method=Image.Resampling.LANCZOS);tb=transformed_bbox(source.size,bbox)
    roi=source.crop(tuple(bbox));width=52;height=min(54,round(width*roi.height/roi.width));thumb=roi.resize((width,height),Image.Resampling.LANCZOS)
    patch=Image.new('RGB',(64,64),(215,225,232));patch.paste(thumb,((64-width)//2,(64-height)//2));f=extract_photo_features_v3(patch)
    results={}
    for name,model in models.items():
        fn=scorer(model);prob=float(fn(f[None,:])[0]);grids={}
        for grid in [4,8]:
            scores=fn(scene_features(scene,grid));cell=512//grid;overlaps=[]
            for gy in range(grid):
                for gx in range(grid):
                    overlap=max(0,min(tb[2],(gx+1)*cell)-max(tb[0],gx*cell))*max(0,min(tb[3],(gy+1)*cell)-max(tb[1],gy*cell));overlaps.append(overlap>0)
            truth=np.array(overlaps);marked=scores>=model['threshold']
            grids[f'grid{grid}']=dict(scores=scores.tolist(),marked_tiles=np.flatnonzero(marked).tolist(),coarse_bbox_overlap_tiles=np.flatnonzero(truth).tolist(),any_mark_overlaps_bbox=bool(np.any(marked&truth)),definite_false_marks_outside_bbox=np.flatnonzero(marked&~truth).tolist())
        results[name]=dict(known_roi_probability=prob,known_roi_marked=prob>=model['threshold'],grids=grids)
    return dict(source_dimensions=list(source.size),original_bbox_xyxy=bbox,normalized_bbox_xyxy=tb,known_roi_size=[width,height],known_roi_features=f.tolist(),bbox_scope='Loose evaluation box, not segmentation. Mark inside box need not contain bus pixels. Known-ROI test is recognition after supplied crop, not localization.',models=results)


def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--street',action='append',default=[]);ap.add_argument('--bus-photo',action='append',default=[]);ap.add_argument('--bus-bbox',action='append',default=[]);ap.add_argument('--placements',type=int,default=128);ap.add_argument('--output',required=True);ap.add_argument('--role',choices=['fresh-held-out','previously-inspected-diagnostic','training-domain-regression'],required=True);args=ap.parse_args()
    if len(args.bus_photo)!=len(args.bus_bbox):ap.error('Provide one --bus-bbox x0,y0,x1,y1 per --bus-photo')
    paths={name:ROOT/'model'/f'photo-v3-{name}-candidate.json' for name in ['qnn','logistic']};hashes={name:sha(path) for name,path in paths.items()};models={name:json.loads(path.read_text()) for name,path in paths.items()}
    bus=Image.open(DIST/'assets/real-schoolbus.png').convert('RGBA')
    streets=[dict(file=str(path),sha256=sha(path),results=street_audit(path,bus,models,args.placements)) for path in args.street]
    buses=[dict(file=str(path),sha256=sha(path),results=bus_audit(path,[int(i) for i in bbox.split(',')],models)) for path,bbox in zip(args.bus_photo,args.bus_bbox)]
    report=dict(protocol='Frozen photo-relative-v3 candidates; pixel-only scores; no fitting or threshold changes. Empty-oracle effective mass returns no search result.',asset_role=args.role,model_sha256=hashes,thresholds={name:model['threshold'] for name,model in models.items()},renderer='512RGB PNG; Pillow LANCZOS tile128→64 for4grid; native64 for8grid; resized real-schoolbus cutout52x22/105x44 withalpha>32 evaluation only',streets=streets,bus_photos=buses)
    assert all(sha(path)==hashes[name] for name,path in paths.items())
    Path(args.output).write_text(json.dumps(report,indent=2))
    for street in streets:
        for grid,group in street['results'].items():
            for name,row in group.items():print(Path(street['file']).name,grid,name,json.dumps(dict(empty_marks=row['empty_scene']['marked_tiles'],hits=row['hit_count'],complete=row['complete_count'],effective_target_mass=row['grover_probability_summary']['effective_target_mass_if_empty_oracle_means_no_output']['mean'])),flush=True)
    for bus_photo in buses:print(Path(bus_photo['file']).name,'known ROI',json.dumps({name:row['known_roi_probability'] for name,row in bus_photo['results']['models'].items()}),flush=True)


if __name__=='__main__':main()
