"""Reserved fixed-model window metrics and first16 ordered pixel-derived trace rows."""
from pathlib import Path
import argparse,json,hashlib,sys,importlib.util
import numpy as np
HERE=Path(__file__).resolve().parent;PROJECT=HERE.parents[1]
p=argparse.ArgumentParser();p.add_argument('--output',default=str(HERE));a=p.parse_args();OUT=Path(a.output)
spec=importlib.util.spec_from_file_location('wanda_trainer',HERE/'train.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
freeze=json.loads((OUT/'usable-candidate-freeze.json').read_text());assert all(sha(OUT/f)==h for f,h in freeze['files'].items())
x,y,m=module.load_split('test');model=json.loads((OUT/'wanda-qnn.json').read_text());baseline=json.loads((OUT/'wanda-logistic.json').read_text());q=module.predict(x,np.array(model['theta']),np.array(model['readout']),model['bias']);l=module.sigmoid(x@baseline['coefficients']+baseline['bias']);report=dict(scope='Same five scene assets and same target; disjoint reserved center partitions. Window metrics are separate from complete-scene search.',modelSHA256=sha(OUT/'wanda-qnn.json'),dataFeaturesSHA256=m['featuresSha256'],dataLabelsSHA256=m['labelsSha256'],qnn=module.measure(y,q,model['threshold']),logistic=module.measure(y,l,baseline['threshold']));(OUT/'reserved-window-test-results.json').write_text(json.dumps(report,indent=2)+'\n')
rows={r['row']:r for r in m['windowRecords']};z=module.circuit(x[:16],np.array(model['theta']));fixtures=[dict(row=i,features=x[i].tolist(),expectedReadouts=z[i].tolist(),expectedProbability=float(q[i]),label=int(y[i]),**{k:v for k,v in rows[i].items() if k not in ('row','label')}) for i in range(16)];packet=dict(featureVersion=model['featureVersion'],modelSHA256=report['modelSHA256'],selection='First16reservedtestrowsinexistingdatasetorder; no score-based selection; labels evaluation-only',sourceDatasetSHA256=sha(OUT/'test-dataset.json'),fixtures=fixtures);(OUT/'held-out-trace-fixtures.json').write_text(json.dumps(packet,indent=2)+'\n');print(json.dumps(report))
