"""Post-freeze training-domain gates and validation probability accounting.

Reads frozen candidates; no fitting, threshold selection, or fresh asset reads.
Fixed absence/default/boundary probes are supplemental diagnostics, not a new
model selection suite. Replays the declared scene-validation renderer exactly.
"""
from __future__ import annotations
import hashlib,json
import numpy as np
from train import ROOT
from photo_v3_data import load_training_assets,validation_scenes,foreground_scene,scene_features
from audit_photo_v3 import scorer
from amplification_audit import summarize_audit,target_mass


def main():
    paths={name:ROOT/'model'/f'photo-v3-{name}-candidate.json' for name in ['qnn','logistic']};original={name:p.read_bytes() for name,p in paths.items()};models={name:json.loads(value) for name,value in original.items()};bus,backgrounds=load_training_assets();scenes=validation_scenes(bus,backgrounds);validation={}
    for name,model in models.items():
        records=[];groups=[]
        for s in scenes:
            probs=scorer(model)(s['features'].reshape(-1,8)).reshape(s['features'].shape[:2]);marked=probs>=model['threshold']
            items=[dict(marked=np.flatnonzero(marked[i]).tolist(),alpha32_tiles=np.flatnonzero(s['truth'][i]).tolist()) for i in range(len(probs))]
            group=dict(grid=s['grid'],records=items);summary=summarize_audit(group);groups.append(dict(background=s['background'],grid=s['grid'],summary=summary))
            records.extend([target_mass(s['grid']**2,row['marked'],row['alpha32_tiles']) for row in items])
        empty=sum(not r['search_runs'] for r in records);count=len(records)
        validation[name]=dict(target_scenes=count,empty_oracle_scenes=empty,nonempty_oracle_scenes=count-empty,mean_ideal_predicate_mass=float(np.mean([r['ideal_predicate_mass'] for r in records])),mean_theoretical_alpha32_target_mass=float(np.mean([r['ideal_alpha32_target_mass'] for r in records])),mean_effective_target_mass_empty_means_no_output=float(np.mean([r['effective_target_mass_if_empty_oracle_means_no_output'] for r in records])),groups=groups)
    gates={}
    for grid in [4,8]:
        width=round(512/grid*.82);height=round(width*bus.height/bus.width);default_center=[320,192] if grid==4 else [288,224]
        centers={'ui_default_or_grid_snap':default_center,'vertical_boundary':[256,224],'horizontal_boundary':[288,256],'four_way_boundary':[256,256],'left_edge':[width/2,224],'top_left_edge':[width/2,height/2]}
        cases={}
        for label,center in centers.items():
            x=round(center[0]-width/2);y=round(center[1]-height/2);scene,truth=foreground_scene(backgrounds[0],bus,grid,x,y);features=scene_features(scene,grid);results={}
            for name,model in models.items():
                scores=scorer(model)(features);marked=scores>=model['threshold'];indices=np.flatnonzero(marked).tolist();gt=np.flatnonzero(truth).tolist()
                results[name]=dict(marked=indices,alpha32_tiles=gt,max_score=float(scores.max()),hit=bool(np.any(marked&truth)),false_marks=np.flatnonzero(marked&~truth).tolist(),grover=target_mass(grid*grid,indices,gt))
            cases[label]=dict(center=center,top_left=[x,y],models=results)
        blank=scene_features(backgrounds[0],grid);absence={name:np.flatnonzero(scorer(model)(blank)>=model['threshold']).tolist() for name,model in models.items()}
        gates[f'grid{grid}']=dict(absence_marks=absence,scope='Covington numeric512 raster, Pillow resized sprites/patches; rounded UI-like centers. Not browser pixel parity or model selection.',cases=cases)
    assert all(path.read_bytes()==original[name] for name,path in paths.items())
    report=dict(protocol='Read-only supplemental frozen-candidate analysis on training identities only. Validation set regenerates declared seeds; fixed default/boundary probes are descriptive and never select candidate weights/thresholds.',model_sha256={name:hashlib.sha256(value).hexdigest() for name,value in original.items()},validation_probability_accounting=validation,default_absence_boundary_gates=gates)
    (ROOT/'model/photo-v3-gate-audit.json').write_text(json.dumps(report,indent=2));print(json.dumps(validation,indent=2))
    for grid,group in gates.items():
        for label,case in group['cases'].items():print(grid,label,json.dumps({name:dict(hit=row['hit'],marks=row['marked']) for name,row in case['models'].items()}),flush=True)


if __name__=='__main__':main()
