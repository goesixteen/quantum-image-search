"""Reproducible synthetic schoolbus QNN experiment; NumPy + Pillow only.

Run: python model/train.py --steps 900
All paths are resolved relative to this file; no downloads or GPU required.
"""
from __future__ import annotations
import argparse, json, math, time
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
FEATURE_NAMES = ['yellow_coverage', 'yellow_aspect', 'window_runs',
                 'window_darkness', 'window_spacing', 'wheel_runs',
                 'body_fill', 'lower_darkness']
SEED = 20261010

def vehicle(kind='bus', color=(247, 193, 39), variant=0):
    """104 x 64 transparent PNG; rendered at 2x demo pixel size."""
    im = Image.new('RGBA', (104, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    ink = (35, 44, 53, 255)
    glass = (46, 62, 78, 255)
    fill = (*color, 255)
    if kind == 'bus':
        d.polygon([(5, 8), (81, 8), (96, 17), (100, 29), (100, 48), (4, 48), (4, 11)], fill=ink)
        d.polygon([(6, 10), (80, 10), (93, 18), (97, 30), (97, 45), (6, 45)], fill=fill)
        for x in [10, 23, 36, 49, 62]:
            d.rounded_rectangle((x, 15, x + 9, 29), radius=1, fill=glass)
            d.line((x + 1, 16, x + 7, 16), fill=(139, 166, 181), width=1)
        d.polygon([(77, 15), (86, 15), (92, 25), (92, 29), (77, 29)], fill=glass)
        d.rectangle((8, 34, 95, 36), fill=ink)
        d.rectangle((78, 39, 85, 45), fill=glass)
        d.rectangle((95, 32, 99, 38), fill=(255, 245, 204))
        d.rectangle((4, 30, 7, 35), fill=(197, 50, 47))
        # Legible geometry at the demo scale; no tiny text required by the model.
        for x in [24, 82]:
            d.ellipse((x - 10, 41, x + 10, 61), fill=ink)
            d.ellipse((x - 4, 47, x + 4, 55), fill=(167, 180, 188))
    elif kind == 'truck':
        d.rectangle((5, 13, 65, 46), fill=ink)
        d.rectangle((7, 15, 63, 43), fill=fill)
        d.polygon([(67, 23), (88, 23), (100, 34), (100, 47), (67, 47)], fill=ink)
        d.polygon([(70, 25), (86, 25), (96, 35), (96, 44), (70, 44)], fill=fill)
        d.polygon([(73, 27), (85, 27), (93, 35), (73, 35)], fill=glass)
        for x in [23, 80]:
            d.ellipse((x-9, 40, x+9, 58), fill=ink)
            d.ellipse((x-3, 46, x+3, 52), fill=(167,180,188))
    elif kind == 'van':
        d.rounded_rectangle((6, 15, 96, 49), radius=9, fill=ink)
        d.rounded_rectangle((8, 17, 94, 46), radius=7, fill=fill)
        for x in [54, 75]:
            d.rounded_rectangle((x, 21, x+15, 33), radius=2, fill=glass)
        d.line((50, 18, 50, 45), fill=ink, width=2)
        for x in [24, 78]:
            d.ellipse((x-9, 41, x+9, 59), fill=ink)
            d.ellipse((x-3, 47, x+3, 53), fill=(167,180,188))
    else:
        d.polygon([(4, 35), (23, 31), (34, 19), (68, 19), (81, 31), (99, 35), (99, 48), (4, 48)], fill=ink)
        d.polygon([(7, 37), (25, 34), (36, 22), (66, 22), (79, 34), (96, 37), (96, 45), (7, 45)], fill=fill)
        d.polygon([(35, 24), (49, 24), (49, 32), (28, 32)], fill=glass)
        d.polygon([(53, 24), (65, 24), (74, 32), (53, 32)], fill=glass)
        for x in [24, 80]:
            d.ellipse((x-9, 40, x+9, 58), fill=ink)
            d.ellipse((x-3, 46, x+3, 52), fill=(167,180,188))
    return im

def run_count(profile, min_width=1):
    active = np.asarray(profile, dtype=bool)
    bounds = np.flatnonzero(np.diff(np.r_[False, active, False]))
    segments = [(int(a), int(b)) for a,b in zip(bounds[::2], bounds[1::2]) if b-a >= min_width]
    return segments

def extract_features(image):
    rgb = np.asarray(image, dtype=np.float64)[..., :3]
    h,w,_ = rgb.shape
    r,g,b = rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
    yellow = (r>125)&(g>82)&(b<150)&(r>b*1.35)&(g>b*1.20)&(r<g*1.9)
    dark = (0.2126*r+0.7152*g+0.0722*b)<105
    ys,xs = np.where(yellow)
    if len(xs)<8:
        return np.zeros(8)
    # Small bright noise is dropped by requiring at least two pixels per row/column.
    cols = np.flatnonzero(yellow.sum(axis=0)>=2)
    rows = np.flatnonzero(yellow.sum(axis=1)>=2)
    if len(cols)<2 or len(rows)<2:
        return np.zeros(8)
    x0,x1,y0,y1 = int(cols[0]),int(cols[-1])+1,int(rows[0]),int(rows[-1])+1
    bw,bh = x1-x0,y1-y0
    xa,xb = x0+max(1,int(bw*.08)),x1-max(1,int(bw*.08))
    ya,yb = y0+max(1,int(bh*.13)),min(h,y0+max(2,int(bh*.58)))
    if xb<=xa or yb<=ya:
        return np.zeros(8)
    win = dark[ya:yb,xa:xb]
    window_runs = run_count(win.mean(axis=0)>.48)
    centers = [(a+b)/2 for a,b in window_runs]
    gaps = np.diff(centers)
    spacing = float(max(0,1-np.std(gaps)/max(1,np.mean(gaps)))) if len(gaps)>=2 else 0.
    # Wheels are sought below the yellow body; a dark road spanning the entire
    # tile is one run, so it does not produce a two-wheel signature.
    wy0 = max(0,y1-1)
    wy1 = min(h,y1+max(2,int(bh*.36)))
    wheel = dark[wy0:wy1,x0:x1]
    wheel_runs = run_count(wheel.mean(axis=0)>.40)
    bottom_y = min(h-1,y0+int(bh*.77))
    lower = yellow[bottom_y:min(h,bottom_y+max(1,int(bh*.14))),x0:x1]
    return np.clip(np.array([
        len(xs)/(w*h*.22),
        bw/max(1,bh)/3,
        len(window_runs)/6,
        win.mean()/.65,
        spacing,
        len(wheel_runs)/3,
        lower.mean(),
        wheel.mean()/.55,
    ]),0,1)

def sample(rng, positive, stress=False, kind_override=None):
    base = np.array([215,225,232])+rng.integers(-20,16,3)
    base = tuple(np.clip(base,170,250).tolist())
    im = Image.new('RGB',(64,64),base)
    d = ImageDraw.Draw(im)
    # Neutral captcha scene texture / road boundaries.
    for _ in range(int(rng.integers(0,4))):
        x,y = rng.integers(-12,62,2)
        shade = tuple(int(v) for v in np.clip(np.array(base)+rng.integers(-35,16),120,250))
        if rng.random()<.5:
            d.rectangle((int(x),int(y),int(x+rng.integers(8,40)),int(y+rng.integers(4,24))), outline=shade, width=1)
        else:
            d.line((0,int(y),64,int(y)),fill=shade,width=int(rng.integers(1,3)))
    if positive:
        color=(int(rng.integers(222,256)),int(rng.integers(165,213)),int(rng.integers(15,72)))
        obj=vehicle('bus',color)
        width=int(rng.integers(39 if stress else 44,62 if stress else 58))
        height=round(width*64/104)
        obj=obj.resize((width,height),Image.Resampling.LANCZOS)
        if stress and rng.random()<.45:
            # Deliberately shifted across a tile boundary (at least ~half visible).
            x=int(rng.choice([-1,1])*rng.integers(1,width//2)) if rng.random()<.5 else int(rng.integers(24,45))
            y=int(rng.integers(-6,47))
        elif rng.random()<.48:
            # Include half-body and four-way-boundary fragments. A minimum
            # half-width / half-height remains visible; a blank roof sliver
            # is deliberately not labeled recognizable.
            x=int(rng.integers(-width//2,65-width//2))
            y=int(rng.integers(-height//2,65-height//2))
        else:
            x=int(rng.integers(0,max(1,65-width)))
            y=int(rng.integers(4,max(5,61-height)))
        im.paste(obj,(x,y),obj)
    else:
        kind=kind_override or rng.choice(['car','van','truck','rectangle','sign','clutter','empty'],p=[.15,.15,.15,.15,.15,.15,.1])
        if kind in ['car','van','truck']:
            color=(int(rng.integers(222,256)),int(rng.integers(165,213)),int(rng.integers(15,72))) if rng.random()<.68 else tuple(rng.integers(25,230,3).tolist())
            obj=vehicle(kind,color)
            width=int(rng.integers(34,59)); height=round(width*64/104)
            obj=obj.resize((width,height),Image.Resampling.LANCZOS)
            x=int(rng.integers(-width//4,65-width//2));y=int(rng.integers(4,64-height//2))
            im.paste(obj,(x,y),obj)
        elif kind in ['rectangle','sign']:
            x,y=rng.integers(0,37,2);bw=int(rng.integers(16,55));bh=int(rng.integers(8,30))
            color=(int(rng.integers(220,255)),int(rng.integers(160,215)),int(rng.integers(20,80)))
            d.rectangle((int(x),int(y),int(x+bw),int(y+bh)),fill=color,outline=(40,50,60),width=1)
            if kind=='sign':
                for bx in range(int(x+4),min(63,int(x+bw-2)),7):
                    d.rectangle((bx,int(y+3),bx+3,int(y+bh-3)),fill=(45,55,65))
        elif kind=='clutter':
            for _ in range(int(rng.integers(2,7))):
                x,y=rng.integers(0,59,2);sz=rng.integers(3,15,2)
                d.ellipse((int(x),int(y),int(x+sz[0]),int(y+sz[1])),fill=tuple(rng.integers(25,250,3).tolist()))
    if stress:
        # Sensor noise unseen at this magnitude in training, plus slight blur.
        arr=np.asarray(im).astype(float)+rng.normal(0,2.7,(64,64,3))
        im=Image.fromarray(np.clip(arr,0,255).astype(np.uint8))
    return im

def dataset(n, seed, stress=False):
    rng=np.random.default_rng(seed)
    labels=np.arange(n)%2
    images=[sample(rng,bool(y),stress) for y in labels]
    features=np.array([extract_features(im) for im in images])
    return features,labels.astype(float),images

INDICES=np.arange(16)
Z=np.array([[1 if not (i>>q)&1 else -1 for i in INDICES] for q in range(4)])
OBS=np.array([*Z,Z[0]*Z[1],Z[2]*Z[3],Z[0]*Z[1]*Z[2]*Z[3]])
PAIRS=[(np.flatnonzero((INDICES&(1<<q))==0),np.flatnonzero((INDICES&(1<<q))!=0)) for q in range(4)]
CNOT=[np.array([i^(1<<t) if (i>>c)&1 else i for i in INDICES]) for c,t in [(0,1),(1,2),(2,3),(3,0)]]

def circuit(features,theta,jacobian=False):
    n=len(features); channels=len(theta)+1 if jacobian else 1
    s=np.zeros((n,channels,16),dtype=np.complex128);s[:,0,0]=1
    p=0
    def ry(q,angle,param=None):
        nonlocal s
        a,b=PAIRS[q];aa=s[:,:,a].copy();bb=s[:,:,b].copy()
        c=np.cos(angle/2).reshape(-1,1,1);v=np.sin(angle/2).reshape(-1,1,1)
        s[:,:,a]=c*aa-v*bb;s[:,:,b]=v*aa+c*bb
        if jacobian and param is not None:
            s[:,param+1,a]+=.5*(-v[:,0,:]*aa[:,0,:]-c[:,0,:]*bb[:,0,:])
            s[:,param+1,b]+=.5*(c[:,0,:]*aa[:,0,:]-v[:,0,:]*bb[:,0,:])
    def rz(q,angle,param=None):
        nonlocal s
        phase=np.exp(-.5j*angle.reshape(-1,1)*Z[q][None,:])
        s*=phase[:,None,:]
        if jacobian and param is not None:
            s[:,param+1,:]+=-.5j*Z[q][None,:]*s[:,0,:]
    for layer in range(len(theta)//8):
        for q in range(4):
            ry(q,np.pi*features[:,q])
            rz(q,np.pi*features[:,q+4])
        for q in range(4):
            ry(q,np.full(n,theta[p]),p);p+=1
            rz(q,np.full(n,theta[p]),p);p+=1
        for permutation in CNOT:
            s=s[:,:,permutation]
    prob=np.abs(s[:,0,:])**2
    read=prob@OBS.T
    if jacobian:
        deriv=2*np.real(np.conj(s[:,0,None,:])*s[:,1:,:])
        return read,deriv@OBS.T
    return read

def sigmoid(x):
    return 1/(1+np.exp(-np.clip(x,-40,40)))

def metrics(y,p,threshold=.5):
    pred=p>=threshold;pos=y==1;neg=~pos
    tp=int(np.sum(pred&pos));fp=int(np.sum(pred&neg));fn=int(np.sum((~pred)&pos));tn=int(np.sum((~pred)&neg))
    # Pairwise definition avoids library dependence and handles ties exactly.
    pp=p[pos];pn=p[neg]
    auc=float(np.mean((pp[:,None]>pn[None,:])+.5*(pp[:,None]==pn[None,:])))
    return dict(n=len(y),threshold=float(threshold),accuracy=float(np.mean(pred==y)),precision=tp/max(1,tp+fp),recall=tp/max(1,tp+fn),f1=2*tp/max(1,2*tp+fp+fn),roc_auc=auc,true_positive=tp,false_positive=fp,false_negative=fn,true_negative=tn,bce=float(-np.mean(y*np.log(np.maximum(p,1e-9))+(1-y)*np.log(np.maximum(1-p,1e-9)))))

def save_montage(images,ys,ps,path):
    canvas=Image.new('RGB',(12*96,6*88),(247,249,252));d=ImageDraw.Draw(canvas)
    for k,(im,y,p) in enumerate(zip(images[:72],ys[:72],ps[:72])):
        x=(k%12)*96;y0=(k//12)*88
        canvas.paste(im,(x+16,y0+2))
        d.text((x+3,y0+68),f'{"bus" if y else "other"} {p:.2f}',fill=(35,45,55))
    canvas.save(path)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--steps',type=int,default=1800)
    parser.add_argument('--layers',type=int,default=4)
    parser.add_argument('--restarts',type=int,default=3)
    args=parser.parse_args()
    DIST.joinpath('model').mkdir(parents=True,exist_ok=True);DIST.joinpath('assets').mkdir(parents=True,exist_ok=True)
    for kind,color,name in [('bus',(247,193,39),'bus'),('car',(77,129,183),'car'),('van',(186,77,72),'van'),('truck',(247,193,39),'truck')]:
        vehicle(kind,color).save(DIST/'assets'/f'{name}.png')
    x,y,trainims=dataset(3200,SEED)
    vx,vy,vims=dataset(800,SEED+1)
    # Fresh test seeds were reserved after exploratory crop-policy changes.
    tx,ty,tims=dataset(2000,SEED+102)
    sx,sy,sims=dataset(1200,SEED+103,True)
    ntheta=8*args.layers;nparams=ntheta+8
    best_loss=math.inf;best=None;history=[]
    start=time.time()
    for restart in range(args.restarts):
        rng=np.random.default_rng(SEED+4+restart)
        params=np.r_[rng.normal(0,.65,ntheta),rng.normal(0,.2,7),0.]
        m=np.zeros(nparams);v=np.zeros(nparams)
        for step in range(1,args.steps+1):
            idx=rng.choice(len(x),128,replace=False);bx=x[idx];by=y[idx]
            read,jac=circuit(bx,params[:ntheta],True)
            p=sigmoid(read@params[ntheta:-1]+params[-1]);err=(p-by)/len(by)
            grad_theta=np.einsum('n,npk,k->p',err,jac,params[ntheta:-1])
            grad=np.r_[grad_theta,read.T@err+.0004*params[ntheta:-1],err.sum()]
            m=.9*m+.1*grad;v=.999*v+.001*grad**2
            lr=.028*(.45+.55*(1-step/args.steps))
            params-=lr*(m/(1-.9**step))/(np.sqrt(v/(1-.999**step))+1e-8)
            if step%100==0 or step==1:
                vp=sigmoid(circuit(vx,params[:ntheta])@params[ntheta:-1]+params[-1]);score=metrics(vy,vp)
                history.append(dict(restart=restart,step=step,validation_bce=score['bce'],validation_accuracy=score['accuracy']))
                if score['bce']<best_loss:best_loss=score['bce'];best=params.copy()
                print(f'restart {restart} step {step:4} val BCE {score["bce"]:.4f} accuracy {score["accuracy"]:.3f} elapsed {time.time()-start:.1f}s',flush=True)
    params=best
    vp=sigmoid(circuit(vx,params[:ntheta])@params[ntheta:-1]+params[-1])
    thresholds=np.arange(.2,.86,.01);scores=[metrics(vy,vp,t) for t in thresholds]
    chosen=max(scores,key=lambda s:s['f1']);threshold=chosen['threshold']
    results={}
    for name,xx,yy in [('train',x,y),('validation',vx,vy),('test',tx,ty),('stress_test',sx,sy)]:
        pp=sigmoid(circuit(xx,params[:ntheta])@params[ntheta:-1]+params[-1])
        results[name]=metrics(yy,pp,threshold)
    tp=sigmoid(circuit(tx,params[:ntheta])@params[ntheta:-1]+params[-1])
    sp=sigmoid(circuit(sx,params[:ntheta])@params[ntheta:-1]+params[-1])
    save_montage(tims,ty,tp,ROOT/'model'/'test-montage.png')
    save_montage(sims,sy,sp,ROOT/'model'/'stress-montage.png')
    split_seeds=dict(train=SEED,validation=SEED+1,test=SEED+102,stress_test=SEED+103)
    model=dict(version=1,name='BusPatch-QNN-v1',seed=SEED,splitSeeds=split_seeds,qubits=4,layers=args.layers,featureNames=FEATURE_NAMES,theta=params[:ntheta].tolist(),readout=params[ntheta:-1].tolist(),bias=float(params[-1]),threshold=threshold,observables=['Z0','Z1','Z2','Z3','Z0Z1','Z2Z3','Z0Z1Z2Z3'],parameterCount=nparams,trainingDomain='synthetic 64x64 neutral-background vehicle patches; no photographs',metrics=results)
    (DIST/'model'/'model.json').write_text(json.dumps(model,indent=2))
    report=dict(seed=SEED,split_seeds=split_seeds,steps_per_restart=args.steps,restarts=args.restarts,layers=args.layers,best_validation_bce=best_loss,elapsed_seconds=time.time()-start,threshold_selection='maximum validation F1; fresh test seeds +102/+103 reserved after exploratory crop-policy changes',splits=results,history=history)
    (ROOT/'model'/'metrics.json').write_text(json.dumps(report,indent=2))
    # Cross-runtime parity fixtures: raw RGBA pixels, extracted features, output.
    fixtures=[]
    for im,feat,p in zip(tims[:12],tx[:12],tp[:12]):
        fixtures.append(dict(rgba=np.asarray(im.convert('RGBA')).reshape(-1).tolist(),width=64,height=64,features=feat.tolist(),probability=float(p)))
    (ROOT/'model'/'parity-fixtures.json').write_text(json.dumps(fixtures,separators=(',',':')))
    print(json.dumps(results,indent=2),flush=True)

if __name__=='__main__':main()
