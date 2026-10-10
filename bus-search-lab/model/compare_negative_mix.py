"""Paired placement regression on the two training-domain backgrounds.

This never fits or selects weights/thresholds. It reads both frozen checkpoints,
uses the current alpha>32 evaluation rule, and records per-background results.
"""
from __future__ import annotations
import hashlib,json
from pathlib import Path
from PIL import Image
from train import ROOT,DIST
from unseen_audit import compositing_audit,AUDIT_SEED


def main():
    paths={'frozen_photo':DIST/'model/model-photo.json','negative_mix':ROOT/'model/negative-mix-candidate.json'}
    hashes={key:hashlib.sha256(p.read_bytes()).hexdigest() for key,p in paths.items()}
    models={key:json.loads(p.read_text()) for key,p in paths.items()}
    backgrounds={'covington':DIST/'assets/street-captcha.png','sauk_centre':ROOT/'model/training-assets/sauk-centre-street-512.png'}
    bus=Image.open(DIST/'assets/real-schoolbus.png').convert('RGBA');out={}
    for key,model in models.items():
        out[key]={}
        for name,path in backgrounds.items():
            out[key][name]={}
            bg=Image.open(path).convert('RGB')
            for grid in [4,8]:
                full=compositing_audit(bg,bus,model,grid,384)
                full.pop('records')
                out[key][name][f'grid{grid}']=full
                print(key,name,grid,json.dumps(full['criteria']['alpha32']),flush=True)
    report=dict(protocol='Paired seed918273 placements,384 per background/grid/checkpoint; current alpha>32 evaluation only; no fitting or model selection.',models={key:dict(file=str(p.relative_to(ROOT)),sha256=hashes[key],threshold=models[key]['threshold']) for key,p in paths.items()},backgrounds={name:dict(file=str(p.relative_to(ROOT)),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),role='training-domain placement regression, not independent photograph holdout') for name,p in backgrounds.items()},seed=AUDIT_SEED,results=out)
    for key,path in paths.items():assert hashlib.sha256(path.read_bytes()).hexdigest()==hashes[key]
    (ROOT/'model/negative-mix-regression.json').write_text(json.dumps(report,indent=2))


if __name__=='__main__':main()
