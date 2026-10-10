"""Frozen-model, pixel-only domain holdout audit. Never fits or changes a model.

Primary compositing ground truth: a tile contains any alpha>32 target pixel.
Old alpha>20 and rectangle-overlap>10% criteria are reported separately.
Second-bus photo uses a coarse manual bbox only as evaluation annotation.
"""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageOps
from train import ROOT,DIST,circuit,sigmoid
from photo_features import extract_photo_features

AUDIT_SEED=918273
ALPHA_THRESHOLD=32

def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def scores_for_scene(scene,model,grid,score_fn=None):
    cell=512//grid
    feats=np.array([extract_photo_features(scene.crop((x*cell,y*cell,(x+1)*cell,(y+1)*cell)).resize((64,64),Image.Resampling.LANCZOS)) for y in range(grid) for x in range(grid)])
    if score_fn is not None:
        out=np.asarray(score_fn(feats),dtype=float)
        assert out.shape==(grid*grid,) and np.all(np.isfinite(out))
        return out
    return sigmoid(circuit(feats,np.array(model['theta']))@model['readout']+model['bias'])

def show_scores(scene,scores,grid,threshold,path,title):
    out=Image.new('RGB',(512,550),(247,249,252));out.paste(scene,(0,0));d=ImageDraw.Draw(out);cell=512//grid
    for k,p in enumerate(scores):
        x=(k%grid)*cell;y=(k//grid)*cell;color=(226,48,46) if p>=threshold else (33,84,130)
        d.rectangle((x,y,x+cell-1,y+cell-1),outline=color,width=2 if p>=threshold else 1)
        d.rectangle((x+2,y+2,x+67,y+16),fill=(248,249,251));d.text((x+4,y+3),f'{k}:{p:.3f}',fill=color)
    d.text((5,520),title,fill=(35,45,55));d.text((5,536),'Red = classifier mark; annotation does not enter inference.',fill=(35,45,55));out.save(path)

def compositing_audit(background,bus,model,grid,n,score_fn=None):
    rng=np.random.default_rng(AUDIT_SEED);cell=512//grid;width=round(cell*.82);height=min(round(width*bus.height/bus.width),round(cell*.84))
    sprite=bus.resize((width,height),Image.Resampling.LANCZOS);records=[]
    empty=scores_for_scene(background,model,grid,score_fn);empty_marked=empty>=model['threshold']
    totals={name:dict(hits=0,clean=0,complete=0) for name in ['alpha32','alpha20','bbox_area10']};new_hits=0
    for i in range(n):
        x=int(rng.integers(0,513-width));y=int(rng.integers(0,513-height));scene=background.copy();scene.paste(sprite,(x,y),sprite)
        mask=Image.new('L',(512,512));mask.paste(sprite.getchannel('A'),(x,y));alpha=np.asarray(mask)
        gt32=[];gt20=[];oldbbox=[]
        for gy in range(grid):
            for gx in range(grid):
                tile=alpha[gy*cell:(gy+1)*cell,gx*cell:(gx+1)*cell]
                gt32.append(bool((tile>32).any()));gt20.append(bool((tile>20).any()))
                overlap=max(0,min(x+width,(gx+1)*cell)-max(x,gx*cell))*max(0,min(y+height,(gy+1)*cell)-max(y,gy*cell))
                oldbbox.append(overlap/(cell*cell)>.1)
        scores=scores_for_scene(scene,model,grid,score_fn);marked=scores>=model['threshold'];truths={'alpha32':np.array(gt32),'alpha20':np.array(gt20),'bbox_area10':np.array(oldbbox)}
        for name,truth in truths.items():
            hit=bool(np.any(marked&truth));clean=bool(np.all(~marked|truth));totals[name]['hits']+=hit;totals[name]['clean']+=clean;totals[name]['complete']+=hit and clean
        new_hits+=bool(np.any(marked&truths['alpha32']&~empty_marked))
        records.append(dict(position=[x,y],scores=scores.tolist(),marked=np.flatnonzero(marked).tolist(),alpha32_tiles=np.flatnonzero(truths['alpha32']).tolist(),alpha20_tiles=np.flatnonzero(truths['alpha20']).tolist(),bbox_area10_tiles=np.flatnonzero(truths['bbox_area10']).tolist()))
    summaries={name:dict(any_overlap_hit_rate=t['hits']/n,no_false_tile_mark_rate=t['clean']/n,complete_scene_rate=t['complete']/n,hit_count=t['hits'],complete_count=t['complete']) for name,t in totals.items()}
    return dict(grid=grid,scenes=n,seed=AUDIT_SEED,sprite_size=[width,height],primary_ground_truth='any target alpha >32 pixel in tile',criteria=summaries,new_correct_mark_hit_rate=new_hits/n,empty_scene=dict(marked_tiles=np.flatnonzero(empty_marked).tolist(),scores=empty.tolist(),max_score=float(empty.max())),records=records)

def transformed_bbox(source_size,bbox):
    w,h=source_size;side=min(w,h);left=(w-side)/2;top=(h-side)/2;scale=512/side
    x0,y0,x1,y1=bbox
    return [max(0,min(512,(x0-left)*scale)),max(0,min(512,(y0-top)*scale)),max(0,min(512,(x1-left)*scale)),max(0,min(512,(y1-top)*scale))]

def bus_photo_audit(path,bbox,model,image_prefix='unseen'):
    source=Image.open(path).convert('RGB');scene=ImageOps.fit(source,(512,512),method=Image.Resampling.LANCZOS);tb=transformed_bbox(source.size,bbox);results={}
    for grid in [4,8]:
        p=scores_for_scene(scene,model,grid);marked=p>=model['threshold'];cell=512//grid;truth=[]
        for gy in range(grid):
            for gx in range(grid):
                overlap=max(0,min(tb[2],(gx+1)*cell)-max(tb[0],gx*cell))*max(0,min(tb[3],(gy+1)*cell)-max(tb[1],gy*cell))
                truth.append(overlap>0)
        truth=np.array(truth);results[f'grid{grid}']=dict(scores=p.tolist(),marked_tiles=np.flatnonzero(marked).tolist(),bbox_overlap_tiles=np.flatnonzero(truth).tolist(),any_mark_overlaps_bbox=bool(np.any(marked&truth)),definite_false_marks_outside_bbox=np.flatnonzero(marked&~truth).tolist(),coarse_bbox_mark_recall=float(np.mean(marked[truth])) if truth.any() else None)
        show_scores(scene,p,grid,model['threshold'],ROOT/'model'/f'{image_prefix}-bus-grid{grid}.png',f'Independent bus photo; coarse bbox; {grid}x{grid} scores')
    # Known-ROI recognition probe, not a localization test and not transparent.
    roi=source.crop(tuple(bbox));width=52;height=round(width*roi.height/roi.width);thumb=roi.resize((width,height),Image.Resampling.LANCZOS)
    patch=Image.new('RGB',(64,64),(215,225,232));patch.paste(thumb,((64-width)//2,(64-height)//2))
    f=extract_photo_features(patch);prob=float(sigmoid(circuit(f[None,:],np.array(model['theta']))@model['readout']+model['bias'])[0]);patch.save(ROOT/'model'/f'{image_prefix}-bus-known-roi.png')
    return dict(source_sha256=sha(path),original_bbox_xyxy=bbox,normalized_bbox_xyxy=tb,bbox_scope='Loose manually supplied evaluation rectangle, not segmentation. A mark inside its background pixels is not proven correct.',grids=results,known_roi_probe=dict(score=prob,marked=prob>=model['threshold'],features=f.tolist(),normalized_roi_size=[width,height],scope='Supplied bbox crop rescaled and letterboxed; no background removal; recognition probe with known ROI, not localization.'))

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--model',default=str(DIST/'model/model-photo.json'));ap.add_argument('--street',default=str(ROOT/'model/evaluation-assets/emeryville-bay-street-512.png'));ap.add_argument('--bus-photo',default=str(ROOT/'model/evaluation-assets/daniel-oines-blue-bird-vision-original.jpg'));ap.add_argument('--bus-bbox',default='50,650,4260,2200');ap.add_argument('--placements',type=int,default=384);ap.add_argument('--output',default=str(ROOT/'model/unseen-audit.json'));ap.add_argument('--image-prefix',default='unseen');args=ap.parse_args()
    if not args.image_prefix or not all(c.isalnum() or c in '-_' for c in args.image_prefix):ap.error('Invalid image prefix')
    model_path=Path(args.model);before=sha(model_path);model=json.loads(model_path.read_text());assert model['featureVersion']=='yellow-hue-v2'
    street=Image.open(args.street).convert('RGB');assert street.size==(512,512)
    bus=Image.open(DIST/'assets/real-schoolbus.png').convert('RGBA')
    grids={f'grid{grid}':compositing_audit(street,bus,model,grid,args.placements) for grid in [4,8]}
    for grid in [4,8]:show_scores(street,np.array(grids[f'grid{grid}']['empty_scene']['scores']),grid,model['threshold'],ROOT/'model'/f'{args.image_prefix}-empty-grid{grid}.png',f'Independent Emeryville street, no visible schoolbus; {grid}x{grid}')
    bbox=[int(v) for v in args.bus_bbox.split(',')];second=bus_photo_audit(args.bus_photo,bbox,model,args.image_prefix)
    report=dict(protocol='Frozen pixel-only model; independent photograph identities; no fitting, threshold selection, or feature changes from evaluation data.',model=dict(file=Path(args.model).name,sha256=before,threshold=model['threshold'],featureVersion=model['featureVersion'],training_asset_hashes=model['assets']),assets=dict(street=dict(file=Path(args.street).name,sha256=sha(args.street)),seen_cutout=dict(file='real-schoolbus.png',sha256=sha(DIST/'assets/real-schoolbus.png')),second_bus=dict(file=Path(args.bus_photo).name,sha256=sha(args.bus_photo))),ground_truth=dict(primary_alpha_threshold=32,primary_tile_rule='any alpha>32 foreground pixel',comparators=['any alpha>20 pixel (previous local audit)','sprite rectangle overlap exceeds10% of tile area (former browser rule)']),compositing=grids,second_bus=second,scope='One independent street plus one independent bus photograph. Compositing tests seen foreground identity on unseen background. Second-photo bbox is coarse. No population photographic accuracy claim.')
    assert sha(model_path)==before,'Audit must never modify model bytes.'
    Path(args.output).write_text(json.dumps(report,indent=2))
    for grid in [4,8]:
        a=grids[f'grid{grid}'];print(json.dumps(dict(grid=grid,empty_marks=a['empty_scene']['marked_tiles'],criteria=a['criteria'],new_correct_mark_hit_rate=a['new_correct_mark_hit_rate']),indent=2))
    print('Second bus:',json.dumps(second['grids'],indent=2));print('Known-ROI score:',second['known_roi_probe']['score']);print('Frozen model SHA256:',before)

if __name__=='__main__':main()
