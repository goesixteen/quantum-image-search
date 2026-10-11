"""Verify actual native-composite rows against the independent Python extractor."""
from pathlib import Path
import sys,json,argparse,hashlib
import numpy as np
from PIL import Image
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE.parents[1]/'model'))
from wanda_features import extract_window_features
p=argparse.ArgumentParser();p.add_argument('--output',default=str(HERE));p.add_argument('--split',default='train');a=p.parse_args();OUT=Path(a.output);m=json.loads((OUT/(a.split+'-dataset.json')).read_text());x=np.fromfile(OUT/m['features'],dtype='<f8').reshape(-1,8);errors=[]
for row in m['windowRecords']:
    image=np.asarray(Image.open(OUT/row['fixture']).convert('RGBA'));f=extract_window_features(image,*row['candidateCenter'],row['targetWidth'],row['targetHeight']);errors.append(float(np.max(np.abs(f-x[row['row']]))))
assert errors and max(errors)<2e-12
report=dict(split=a.split,nativeCompositeRows=len(errors),maxFeatureError=max(errors),featureVersion=m['featureVersion'],featuresSHA256=m['featuresSha256'],featureSourceSHA256=hashlib.sha256((HERE.parents[1]/'model/wanda_features.py').read_bytes()).hexdigest(),passed=True);(OUT/(a.split+'-corpus-parity.json')).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
