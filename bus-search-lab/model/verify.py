"""Independent circuit derivative and demo-layout verification."""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from train import circuit, extract_features, vehicle, sigmoid, ROOT

model=json.loads((ROOT/'dist'/'model'/'model.json').read_text())
theta=np.array(model['theta']);readout=np.array(model['readout'])
rng=np.random.default_rng(88119)
feat=rng.uniform(0,1,(9,8))
expect,jac=circuit(feat,theta,True)
maxerror=0
for p in range(len(theta)):
    a=theta.copy();b=theta.copy();a[p]+=np.pi/2;b[p]-=np.pi/2
    shifted=(circuit(feat,a)-circuit(feat,b))*.5
    maxerror=max(maxerror,float(np.max(np.abs(shifted-jac[:,p,:]))))
assert maxerror<1e-12,maxerror
sprite=vehicle().resize((52,32),Image.Resampling.LANCZOS)
positions=[(x,y) for x in [0,6,25,38,48,58,62,63,64,72] for y in [0,8,24,32,40,48,56,60,63,64,72]]
features=[];bounds=[]
for x,y in positions:
    scene=Image.new('RGB',(128,128),(215,225,232));scene.paste(sprite,(x,y),sprite)
    for gy in range(2):
        for gx in range(2):
            features.append(extract_features(scene.crop((gx*64,gy*64,(gx+1)*64,(gy+1)*64))))
    # Ground truth from the actual alpha channel, unavailable to the classifier.
    mask=Image.new('L',(128,128),0);mask.paste(sprite.getchannel('A'),(x,y))
    alpha=np.asarray(mask)>20
    bounds.append([int(alpha[gy*64:(gy+1)*64,gx*64:(gx+1)*64].sum()) for gy in range(2) for gx in range(2)])
p=sigmoid(circuit(np.array(features),theta)@readout+model['bias']).reshape(-1,4)
marked=p>=model['threshold']
hit=np.any(marked&(np.array(bounds)>0),axis=1)
clean=np.all(~marked|(np.array(bounds)>0),axis=1)
misses=[dict(position=pos,probabilities=probs.tolist(),visible_alpha_pixels=b) for pos,probs,b,h in zip(positions,p,bounds,hit) if not h]
report=dict(parameter_shift_jacobian_max_error=maxerror,demo_scenes=len(positions),any_overlap_hit_rate=float(hit.mean()),no_false_tile_mark_rate=float(clean.mean()),misses=misses)
# Every integer phase in a 64-pixel tile, with the site's light outline raster.
# Translation across the full 512-pixel canvas repeats these phases, except for
# external image edges; this is a local raster diagnostic, not an end-to-end
# browser or Grover measurement benchmark.
dense=[];dense_bounds=[]
for y in range(64):
    for x in range(64):
        scene=Image.new('RGB',(128,128),(215,225,232));d=ImageDraw.Draw(scene)
        for yy in range(2):
            for xx in range(2):
                d.rectangle((xx*64+6,yy*64+6,xx*64+58,yy*64+58),outline=(199,211,221))
        scene.paste(sprite,(x,y),sprite)
        alpha=Image.new('L',(128,128),0);alpha.paste(sprite.getchannel('A'),(x,y));mask=np.asarray(alpha)>20
        for gy in range(2):
            for gx in range(2):
                dense.append(extract_features(scene.crop((gx*64,gy*64,(gx+1)*64,(gy+1)*64))))
        dense_bounds.append([int(mask[gy*64:(gy+1)*64,gx*64:(gx+1)*64].sum()) for gy in range(2) for gx in range(2)])
dp=sigmoid(circuit(np.array(dense),theta)@readout+model['bias']).reshape(-1,4)
dm=dp>=model['threshold'];db=np.array(dense_bounds)
dh=np.any(dm&(db>0),axis=1);dc=np.all(~dm|(db>0),axis=1)
report['dense_phase_audit']=dict(scenes=4096,any_overlap_hit_rate=float(dh.mean()),no_false_tile_mark_rate=float(dc.mean()),miss_count=int(np.sum(~dh)),positions_of_misses=[(int(i%64),int(i//64)) for i in np.flatnonzero(~dh)],sprite_render_pixels=[52,32],background_rgb=[215,225,232],caption='Integer tile phases in local 2x2 raster, equivalent interior translations on 8x8 grid; no distractors, no measurement randomness; not browser fractional rasterization.')
overview=Image.new('RGB',(512,536),(246,248,251));od=ImageDraw.Draw(overview)
for i,ok in enumerate(dh):
    color=(25,146,110) if ok else (208,57,47)
    od.rectangle(((i%64)*8,(i//64)*8,(i%64)*8+7,(i//64)*8+7),fill=color)
od.text((7,518),f'Bus top-left tile phase x/y: green=hit; red=miss ({(~dh).sum()}/4096)',fill=(36,47,55))
overview.save(ROOT/'model'/'boundary-audit.png')
(ROOT/'model'/'verification.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='dense_phase_audit'},indent=2))
print(json.dumps({k:v for k,v in report['dense_phase_audit'].items() if k!='positions_of_misses'},indent=2))
