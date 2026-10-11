"""Read-only reproduction of feature interventions; not rendered evaluation."""
from pathlib import Path
import argparse, hashlib, json, sys
import numpy as np
p=argparse.ArgumentParser();p.add_argument('--project-dir',type=Path);p.add_argument('--output',type=Path)
a=p.parse_args();here=Path(__file__).resolve().parent;project=a.project_dir or here.parents[1]
sys.path.insert(0,str(project/'model'));from qnn_core import circuit,sigmoid
model_path=project/'dist/model/wanda-qnn.json'
assert hashlib.sha256(model_path.read_bytes()).hexdigest()=='d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88'
model=json.loads(model_path.read_text());source=json.loads((here/'coral-results.json').read_text())
selected=[r for r in source['rows'] if r['id'].endswith('-final') and r['scanHeight'] in [40,46,52]]
X=np.asarray([r['localPeaks'][0]['features'] for r in selected]);score=lambda v:sigmoid(circuit(v,np.asarray(model['theta']))@model['readout']+model['bias']);base=score(X);variants={}
for j,name in enumerate(['stripe_fourier','stripe_phase','redwhite_balance','face_hair','blue_trouser_morphology','x_alignment','y_alignment']):
    for value in [0,.05,.10,.20]:
        v=X.copy();v[:,j]=value;variants[f'{name}={value}']=score(v)
for factor in [.5,.25,0]:
    v=X.copy();v[:,:3]*=factor;variants[f'all_shirt_evidence_x{factor}']=score(v)
    v=X.copy();v[:,4]*=factor;v[:,5:7]*=factor;variants[f'blue_and_body_alignment_x{factor}']=score(v)
    v=X.copy();v[:,:3]*=factor;v[:,4]*=factor;variants[f'shirt_and_blue_x{factor}']=score(v)
unsafe=base>=model['threshold'];expected=json.loads((here/'counterfactual-results.json').read_text());max_error=0.
assert len(selected)==expected['sourceRows'] and int(unsafe.sum())==expected['originalAccepted']
for i,r in enumerate(selected):
    assert r['id']==expected['rows'][i]['id']
    max_error=max(max_error,abs(float(base[i])-expected['rows'][i]['originalScore']))
    for name,prob in variants.items():max_error=max(max_error,abs(float(prob[i])-expected['rows'][i]['counterfactualScores'][name]))
assert np.isfinite(max_error) and max_error<1e-12
report={'scope':expected['scope'],'rows':len(selected),'interventions':len(variants),'comparisons':len(selected)*(len(variants)+1),'maximumScoreError':max_error,'verified':True}
if a.output:
    assert a.output.resolve()!=(here/'counterfactual-results.json').resolve()
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
