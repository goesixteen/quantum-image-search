"""Transfer a four-qubit QNN to supplied real-bus / street-photo compositing.

Asset files are required. Metrics concern this asset set and held-out placement
seeds, not unseen photographs or unseen schoolbus identities. Stable synthetic
weights are read from model-synthetic.json by default; --init-model can select a
frozen photo checkpoint. Initial checkpoint bytes are never overwritten. Use
--output-prefix to isolate new experiments from historical photo metrics.
"""
from __future__ import annotations
import argparse, hashlib, json, math, time
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageOps
from train import ROOT, DIST, circuit, sigmoid, extract_features, metrics, save_montage, dataset
from photo_features import extract_photo_features

SEED=731091

def load_assets(bus_path,background_paths):
    bus=Image.open(bus_path).convert('RGBA')
    if np.asarray(bus)[:,:,3].min()==255:
        raise ValueError('The supplied bus must be a transparent cutout, not a rectangular photo.')
    backgrounds=[ImageOps.fit(Image.open(p).convert('RGB'),(512,512),method=Image.Resampling.LANCZOS) for p in background_paths]
    return bus,backgrounds

def photo_dataset(n,seed,bus,backgrounds,stress=False,feature_extractor=extract_features,multiscale=True):
    rng=np.random.default_rng(seed);labels=np.arange(n)%2;images=[]
    for label in labels:
        original_bg=backgrounds[int(rng.integers(len(backgrounds)))];bg=original_bg
        # A4x4 grid extracts128-pixel tiles and resizes them to64; an8x8
        # grid extracts64 directly. Randomly mixing these scene scales makes
        # the training background raster match both browser grid options.
        if multiscale and rng.random()<.5:bg=bg.resize((256,256),Image.Resampling.LANCZOS)
        x,y=rng.integers(0,bg.width-63,2)
        im=bg.crop((int(x),int(y),int(x+64),int(y+64)))
        if not label and rng.random()<.35:
            # Include the actual empty captcha tiles as hard negatives.
            # Background assets are shared across all splits by design;
            # only placement/augmentation seeds are held out.
            grid=int(rng.choice([4,8]));cell=512//grid;tx,ty=rng.integers(0,grid,2)
            im=original_bg.crop((int(tx*cell),int(ty*cell),int((tx+1)*cell),int((ty+1)*cell))).resize((64,64),Image.Resampling.LANCZOS)
        if label:
            width=int(rng.integers(44 if not stress else 36,60 if not stress else 65))
            height=min(round(width*bus.height/bus.width),54)
            obj=bus.resize((width,height),Image.Resampling.LANCZOS)
            # Full, one-axis cropped, and two-axis cropped placements.
            if rng.random()<.50:
                px=int(rng.integers(-width//2,65-width//2));py=int(rng.integers(-height//2,65-height//2))
            else:
                px=int(rng.integers(0,max(1,65-width)));py=int(rng.integers(0,max(1,65-height)))
            if stress:
                obj=ImageEnhance.Brightness(obj).enhance(float(rng.uniform(.82,1.16)))
            im.paste(obj,(px,py),obj)
        if stress:
            a=np.asarray(im).astype(float)+rng.normal(0,2,(64,64,3))
            im=Image.fromarray(np.clip(a,0,255).astype(np.uint8))
        images.append(im)
    return np.array([feature_extractor(im) for im in images]),labels.astype(float),images

def placement_audit(bus,backgrounds,model,n=384,feature_extractor=extract_features,grid=8,alpha_threshold=20):
    rng=np.random.default_rng(SEED+201);scores=[];overlaps=[];positions=[]
    width=round(512/grid*.82);cell=512//grid
    sprite=bus.resize((width,min(round(width*bus.height/bus.width),round(cell*.84))),Image.Resampling.LANCZOS)
    for k in range(n):
        background=backgrounds[k%len(backgrounds)];scene=background.copy()
        x=int(rng.integers(0,513-sprite.width));y=int(rng.integers(0,513-sprite.height))
        scene.paste(sprite,(x,y),sprite)
        a=Image.new('L',(512,512));a.paste(sprite.getchannel('A'),(x,y));alpha=np.asarray(a)>alpha_threshold
        feats=[];ground=[]
        for gy in range(grid):
            for gx in range(grid):
                patch=scene.crop((gx*cell,gy*cell,(gx+1)*cell,(gy+1)*cell)).resize((64,64),Image.Resampling.LANCZOS)
                feats.append(feature_extractor(patch))
                ground.append(bool(alpha[gy*cell:(gy+1)*cell,gx*cell:(gx+1)*cell].any()))
        pp=sigmoid(circuit(np.array(feats),np.array(model['theta']))@model['readout']+model['bias'])
        scores.append(pp);overlaps.append(ground);positions.append((x,y))
    scores=np.array(scores);overlaps=np.array(overlaps);marked=scores>=model['threshold']
    hits=np.any(marked&overlaps,axis=1);clean=np.all(~marked|overlaps,axis=1)
    # Empty scenes directly assess whether the photo alone creates targets.
    blank=[]
    for background in backgrounds:
        fs=[feature_extractor(background.crop((gx*cell,gy*cell,(gx+1)*cell,(gy+1)*cell)).resize((64,64),Image.Resampling.LANCZOS)) for gy in range(grid) for gx in range(grid)]
        p=sigmoid(circuit(np.array(fs),np.array(model['theta']))@model['readout']+model['bias'])
        blank.append(dict(max_score=float(p.max()),marked_tiles=np.flatnonzero(p>=model['threshold']).tolist(),scores=p.tolist()))
    return dict(scenes=n,seed=SEED+201,grid=[grid,grid],sprite_size=list(sprite.size),ground_truth=f'any target alpha >{alpha_threshold} pixel in tile',any_overlap_hit_rate=float(hits.mean()),no_false_tile_mark_rate=float(clean.mean()),complete_scene_rate=float((hits&clean).mean()),misses=[dict(position=list(positions[i]),max_score=float(scores[i].max())) for i in np.flatnonzero(~hits)],empty_scene_audits=blank,scope='Same provided cutout/street-photo assets; randomized unseen full-canvas placement seeds; deterministic predicate only, not Grover shot success.')

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--bus',required=True);ap.add_argument('--background',action='append',required=True);ap.add_argument('--steps',type=int,default=1800);ap.add_argument('--restarts',type=int,default=2);ap.add_argument('--features',choices=['original','hue'],default='hue');ap.add_argument('--init-model',default=str(DIST/'model/model-synthetic.json'));ap.add_argument('--output-prefix',default='photo');ap.add_argument('--audit-alpha-threshold',type=int,default=20);args=ap.parse_args()
    if not args.output_prefix or not all(c.isalnum() or c in '-_' for c in args.output_prefix):
        ap.error('--output-prefix must contain only letters, digits, hyphens, or underscores')
    extractor=extract_photo_features if args.features=='hue' else extract_features
    bus,backgrounds=load_assets(args.bus,args.background)
    splits={}
    for name,n,off,stress in [('train',3200,0,False),('validation',800,1,False),('test',2000,202,False),('stress_test',1200,203,True)]:
        splits[name]=photo_dataset(n,SEED+off,bus,backgrounds,stress,extractor)
    x,y,ims=splits['train'];vx,vy,_=splits['validation']
    init_path=Path(args.init_model);init_hash=hashlib.sha256(init_path.read_bytes()).hexdigest()
    stable=json.loads(init_path.read_text());ntheta=len(stable['theta']);nparams=ntheta+8
    original=np.r_[stable['theta'],stable['readout'],stable['bias']]
    baseline={name:metrics(yy,sigmoid(circuit(xx,np.array(stable['theta']))@stable['readout']+stable['bias']),stable['threshold']) for name,(xx,yy,_) in splits.items()}
    print('Before photo transfer:',json.dumps(baseline['validation']),flush=True)
    start=time.time();best=None;bestloss=math.inf;history=[]
    for restart in range(args.restarts):
        rng=np.random.default_rng(SEED+4+restart)
        params=original.copy() if restart==0 else np.r_[rng.normal(0,.65,ntheta),rng.normal(0,.2,7),0]
        m=np.zeros(nparams);v=np.zeros(nparams)
        for step in range(1,args.steps+1):
            idx=rng.choice(len(x),128,replace=False);read,jac=circuit(x[idx],params[:ntheta],True)
            p=sigmoid(read@params[ntheta:-1]+params[-1]);err=(p-y[idx])/len(idx)
            grad=np.r_[np.einsum('n,npk,k->p',err,jac,params[ntheta:-1]),read.T@err+.0004*params[ntheta:-1],err.sum()]
            m=.9*m+.1*grad;v=.999*v+.001*grad**2;lr=.024*(.45+.55*(1-step/args.steps))
            params-=lr*m/(1-.9**step)/(np.sqrt(v/(1-.999**step))+1e-8)
            if step==1 or step%100==0:
                p=sigmoid(circuit(vx,params[:ntheta])@params[ntheta:-1]+params[-1]);score=metrics(vy,p)
                history.append(dict(restart=restart,step=step,validation_bce=score['bce'],validation_accuracy=score['accuracy']))
                if score['bce']<bestloss:bestloss=score['bce'];best=params.copy()
                print(f'restart {restart} step {step} validation BCE {score["bce"]:.4f} accuracy {score["accuracy"]:.3f}',flush=True)
    params=best;vp=sigmoid(circuit(vx,params[:ntheta])@params[ntheta:-1]+params[-1])
    threshold=max([metrics(vy,vp,float(t)) for t in np.arange(.15,.86,.01)],key=lambda s:s['f1'])['threshold']
    results={};fixtures=[]
    for name,(xx,yy,images) in splits.items():
        pp=sigmoid(circuit(xx,params[:ntheta])@params[ntheta:-1]+params[-1]);results[name]=metrics(yy,pp,threshold)
        if name in ['test','stress_test']:save_montage(images,yy,pp,ROOT/'model'/f'{args.output_prefix}-{name}-montage.png')
        if name=='test':
            for im,f,p in zip(images[:12],xx[:12],pp[:12]):fixtures.append(dict(width=64,height=64,rgba=np.asarray(im.convert('RGBA')).reshape(-1).tolist(),features=f.tolist(),probability=float(p)))
    sources=[dict(file=Path(p).name,sha256=hashlib.sha256(Path(p).read_bytes()).hexdigest()) for p in [args.bus,*args.background]]
    feature_version='yellow-hue-v2' if args.features=='hue' else 'yellow-v1'
    model={**stable,'name':f'BusPatch-QNN-{args.output_prefix}-v1','seed':SEED,'featureExtractor':feature_version,'featureVersion':feature_version,'readyForDemo':False,'sceneGridSizes':[4,8],'splitSeeds':dict(train=SEED,validation=SEED+1,test=SEED+202,stress_test=SEED+203),'theta':params[:ntheta].tolist(),'readout':params[ntheta:-1].tolist(),'bias':float(params[-1]),'threshold':threshold,'metrics':results,'trainingDomain':'same supplied real schoolbus cutout composited on supplied street-photo assets; held-out placement seeds, not unseen photo identities','assets':sources,'initialCheckpoint':dict(file=init_path.name,sha256=init_hash)}
    # Remove inherited normalization metadata when a different asset set is used.
    if args.output_prefix!='photo':model.pop('normalizedBackground',None)
    audit=placement_audit(bus,backgrounds,model,feature_extractor=extractor,alpha_threshold=args.audit_alpha_threshold)
    report=dict(seed=SEED,split_seeds=model['splitSeeds'],before_transfer=baseline,splits=results,steps_per_restart=args.steps,restarts=args.restarts,best_validation_bce=bestloss,history=history,elapsed_seconds=time.time()-start,assets=sources,initial_checkpoint=model['initialCheckpoint'],placement_audit=audit,scope=model['trainingDomain'],selection='Minimum validation BCE across declared restarts; threshold maximizes validation F1 only. Evaluation photograph assets are never loaded during training.')
    report['placement_audit_grid4']=placement_audit(bus,backgrounds,model,feature_extractor=extractor,grid=4,alpha_threshold=args.audit_alpha_threshold)
    candidate_path=ROOT/'model'/('model-photo-candidate.json' if args.output_prefix=='photo' else f'{args.output_prefix}-candidate.json')
    metrics_path=ROOT/'model'/f'{args.output_prefix}-metrics.json'
    fixtures_path=ROOT/'model'/('parity-fixtures-photo.json' if args.output_prefix=='photo' else f'{args.output_prefix}-parity-fixtures.json')
    candidate_path.write_text(json.dumps(model,indent=2));metrics_path.write_text(json.dumps(report,indent=2));fixtures_path.write_text(json.dumps(fixtures,separators=(',',':')))
    if args.output_prefix=='photo':(ROOT/'model/metrics-photo.json').write_text(json.dumps(report,indent=2))
    assert hashlib.sha256(init_path.read_bytes()).hexdigest()==init_hash,'Initial checkpoint must remain frozen.'
    print(json.dumps(results,indent=2),flush=True);print(json.dumps(audit,indent=2),flush=True)

if __name__=='__main__':main()
