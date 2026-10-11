"""Pixel feature/circuit parity; finite-difference check of training objective."""
from pathlib import Path
import sys,json,hashlib,argparse,os
os.environ.setdefault('OPENBLAS_NUM_THREADS','1')
import numpy as np
from PIL import Image
HERE=Path(__file__).resolve().parent;PROJECT=HERE.parents[1];sys.path.insert(0,str(PROJECT/'model'))
from wanda_features import extract_window_features,FEATURE_VERSION,FEATURE_NAMES
from qnn_core import circuit,sigmoid
p=argparse.ArgumentParser();p.add_argument('--output',default=str(HERE));a=p.parse_args();OUT=Path(a.output)
data=json.loads((OUT/'pixel-parity-fixtures.json').read_text());assert data['featureVersion']==FEATURE_VERSION and data['featureNames']==FEATURE_NAMES
feature_errors=[];read_errors=[];score_errors=[]
for row in data['fixtures']:
    raw=(OUT/row['file']).read_bytes();assert hashlib.sha256(raw).hexdigest()==row['sha256']
    image=np.asarray(Image.open(OUT/row['file']).convert('RGBA'));f=extract_window_features(image,*row['candidateCenter'],row['targetWidth'],row['targetHeight']);z=circuit(f[None,:],np.array(data['model']['theta']))[0];score=float(sigmoid(z@data['model']['readout']+data['model']['bias']))
    feature_errors.append(float(np.max(np.abs(f-row['features']))));read_errors.append(float(np.max(np.abs(z-row['readout']))));score_errors.append(abs(score-row['score']))
assert max(feature_errors)<2e-12 and max(read_errors)<2e-12 and max(score_errors)<2e-12
# Independent gradient check includes classical sigmoid BCE and the pairwise term.
rng=np.random.default_rng(9101);x=rng.random((6,8));theta=rng.normal(0,.4,32);theta[[25,27,29,31]]=0;beta=rng.normal(0,.3,7);bias=.1;y=np.array([1,1,0,0,0,0]);weights=np.array([.25,.25,.125,.125,.125,.125]);z,j=circuit(x,theta,True);logits=z@beta+bias;pair=.25*sigmoid(1-logits[:2]+logits[2:4])/2;error=weights*(sigmoid(logits)-y);error[:2]-=pair;error[2:4]+=pair
analytic=np.r_[np.einsum('n,npk,k->p',error,j,beta),z.T@error,error.sum()];params=np.r_[theta,beta,bias]
def loss(v):
    l=circuit(x,v[:32])@v[32:39]+v[39]
    return float(np.sum(weights*(np.logaddexp(0,l)-y*l))+.25*np.mean(np.logaddexp(0,1-l[:2]+l[2:4])))
finite=[]
for k in range(40):
    plus=params.copy();minus=params.copy();plus[k]+=1e-5;minus[k]-=1e-5;finite.append((loss(plus)-loss(minus))/2e-5)
gradient_error=float(np.max(np.abs(analytic-finite)));assert gradient_error<2e-8
report=dict(fixtures=len(feature_errors),featureVersion=FEATURE_VERSION,maxFeatureError=max(feature_errors),maxReadoutError=max(read_errors),maxScoreError=max(score_errors),modelSHA256=data['modelSHA256'],gradientParameters=40,maxGradientError=gradient_error,passed=True)
(OUT/'parity-verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
