"""Reproducible current-asset quantum-window model. No template in inference.

Build native vectors first with build-corpus.mjs corpus/full-validation.
Train/validation selection: python train_current_qnn.py fit
After freeze, generate full-test then: python train_current_qnn.py test
"""
from pathlib import Path
import sys,json,hashlib,time,os,argparse
os.environ.setdefault('OPENBLAS_NUM_THREADS','1')
import numpy as np
HERE=Path(__file__).resolve().parent
DEFAULT_PROJECT=HERE.parents[1] if (HERE.parents[1]/'dist/scene-catalog.json').exists() else HERE.parents[1]/'outputs/waldo-search-lab'
PARSER=argparse.ArgumentParser();PARSER.add_argument('mode',nargs='?',default='fit');PARSER.add_argument('--project-dir');PARSER.add_argument('--output');ARGS,_=PARSER.parse_known_args()
PROJECT=Path(ARGS.project_dir or os.environ.get('QNN_PROJECT_DIR') or DEFAULT_PROJECT).resolve();OUT=Path(ARGS.output or os.environ.get('QNN_OUTPUT_DIR') or HERE).resolve();OUT.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(PROJECT/'model'))
from qnn_core import circuit,sigmoid
from qnn_localizer_features import FEATURE_VERSION,FEATURE_NAMES,accepted_indices
DEAD=np.array([25,27,29,31]);ACTIVE=np.array([i for i in range(32) if i not in DEAD])
CENTERS=np.array([[(i%64+.5)*8,(i//64+.5)*8] for i in range(4096)])
NMS_CACHE={}
def nms_sequence(probabilities,index,width):
    """Full greedy order; thresholded prefixes equal threshold-first NMS."""
    key=(id(probabilities),index)
    if key in NMS_CACHE:return NMS_CACHE[key]
    p=probabilities[index];radius=max(12.,.35*width);extent=int(np.ceil(radius/8));offsets=[(dx,dy) for dy in range(-extent,extent+1) for dx in range(-extent,extent+1) if np.hypot(dx*8,dy*8)<=radius]
    blocked=np.zeros((64,64),dtype=bool);kept=[]
    for i in np.argsort(-p,kind='stable'):
        row,col=divmod(int(i),64)
        if blocked[row,col]:continue
        kept.append(int(i))
        for dx,dy in offsets:
            x,y=col+dx,row+dy
            if 0<=x<64 and 0<=y<64:blocked[y,x]=True
    result=np.array(kept,dtype=int);NMS_CACHE[key]=result;return result
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def save(name,data): (OUT/name).write_text(json.dumps(data,indent=2,allow_nan=False)+'\n',encoding='utf8')
def load_split(split):
    m=json.loads((OUT/f'{split}-dataset.json').read_text());x=np.fromfile(OUT/m['features'],dtype='<f8').reshape(-1,8);y=np.fromfile(OUT/m['labels'],dtype='u1').astype(float)
    assert len(y)==m['n'] and sha(OUT/m['features'])==m['featuresSha256'] and sha(OUT/m['labels'])==m['labelsSha256']
    assert m['featureVersion']==FEATURE_VERSION and m['featureNames']==list(FEATURE_NAMES),'Wrong feature contract'
    assert m['sourceHashes']['featureJS']==sha(PROJECT/'dist/qnn-localizer.js'),'Feature source changed'
    return x,y,m
def balanced_weights(y):return np.where(y==1,.5/max(1,np.sum(y==1)),.5/max(1,np.sum(y==0)))
def source_weights(y,m):
    foreground=len(m['records'])*8+(len(m['records'])+2)//3;idx=np.arange(len(y));pos=y==1;hard=(y==0)&(idx<foreground);background=(y==0)&~hard
    return np.where(pos,.5/max(1,pos.sum()),np.where(hard,.25/max(1,hard.sum()),.25/max(1,background.sum())))
def bce(y,p,balanced=False,weights=None):
    losses=-(y*np.log(np.maximum(p,1e-12))+(1-y)*np.log(np.maximum(1-p,1e-12)))
    return float(np.sum(losses*weights)) if weights is not None else float(np.sum(losses*balanced_weights(y))) if balanced else float(np.mean(losses))
def measure(y,p,t):
    pred=p>=t;pos=y==1;tp=int(np.sum(pred&pos));fp=int(np.sum(pred&~pos));fn=int(np.sum(~pred&pos));tn=int(np.sum(~pred&~pos))
    return dict(n=len(y),threshold=float(t),accuracy=float(np.mean(pred==pos)),precision=tp/max(1,tp+fp),recall=tp/max(1,tp+fn),f1=2*tp/max(1,2*tp+fp+fn),true_positive=tp,false_positive=fp,false_negative=fn,true_negative=tn,bce=bce(y,p),balanced_bce=bce(y,p,True))
def predict(x,theta,readout,bias):
    return np.concatenate([sigmoid(circuit(x[i:i+2048],theta)@readout+bias) for i in range(0,len(x),2048)])
def logistic_fit(x,y,l2=.001,weights=None):
    d=np.column_stack([x,np.ones(len(x))]);w=balanced_weights(y) if weights is None else weights;reg=np.r_[np.full(x.shape[1],l2),0.];beta=np.zeros(d.shape[1]);history=[]
    def objective(b):
        z=d@b;return float(np.sum(w*(np.logaddexp(0,z)-y*z))+.5*np.sum(reg*b*b))
    for step in range(80):
        p=sigmoid(d@beta);gradient=d.T@(w*(p-y))+reg*beta;hessian=(d.T*(w*p*(1-p)))@d+np.diag(reg)+np.eye(len(beta))*1e-10
        direction=np.linalg.solve(hessian,gradient);rate=1.;loss=objective(beta)
        while rate>1e-8 and objective(beta-rate*direction)>loss-1e-4*rate*float(gradient@direction):rate*=.5
        beta-=rate*direction;history.append(objective(beta))
        if np.max(np.abs(gradient))<1e-8:break
    return beta,history
def scene_data(split):
    m=json.loads((OUT/f'{split}-scenes.json').read_text());assert sha(OUT/m['features'])==m['featuresSha256'];assert m['featureVersion']==FEATURE_VERSION and m['sourceHashes']['featureJS']==sha(PROJECT/'dist/qnn-localizer.js');x=np.memmap(OUT/m['features'],dtype='<f8',mode='r',shape=(m['rows'],8));return x,m
def scene_predictions(x,m,model):
    if model['kind']=='qnn':p=predict(x,np.array(model['theta']),np.array(model['readout']),model['bias'])
    else:p=sigmoid(np.asarray(x)@np.array(model['coefficients'])+model['bias'])
    return p.reshape(-1,4096)
def scene_summary(m,probabilities,threshold):
    records=[]
    for index,(rec,p) in enumerate(zip(m['records'],probabilities)):
        sequence=nms_sequence(probabilities,index,rec['width']);accepted=sequence[p[sequence]>=threshold];is_target=rec['kind']=='target'
        distances=np.linalg.norm(CENTERS[accepted]-np.array(rec['center']),axis=1) if is_target else np.full(len(accepted),np.inf)
        true=int(np.sum(distances<=6.657));false=len(accepted)-true
        records.append(dict(id=rec['id'],scene=rec['scene'],kind=rec['kind'],height=rec['height'],width=rec['width'],center=rec['center'],visibleFraction=rec['visibleFraction'],accepted=len(accepted),correctPoints=true,falsePoints=false,completeHit=bool(true and not false),emptyOracle=not len(accepted),maxScore=float(np.max(p)),bestPoint=CENTERS[int(np.argmax(p))].tolist(),bestPointError=float(np.min(distances)) if len(distances) and is_target else None))
    targets=[r for r in records if r['kind']=='target'];absent=[r for r in records if r['kind']=='absent']
    result=dict(targetScenes=len(targets),absenceScenes=len(absent),completeHits=sum(r['completeHit'] for r in targets),completeHitRate=sum(r['completeHit'] for r in targets)/max(1,len(targets)),targetFalsePointScenes=sum(r['falsePoints']>0 for r in targets),targetFalsePointRate=sum(r['falsePoints']>0 for r in targets)/max(1,len(targets)),targetEmptyOracles=sum(r['emptyOracle'] for r in targets),targetCoverage=sum(r['correctPoints']>0 for r in targets)/max(1,len(targets)),absenceFalsePointScenes=sum(r['falsePoints']>0 for r in absent),absenceAcceptedPoints=sum(r['accepted'] for r in absent),threshold=float(threshold))
    result['bySize']={str(h):dict(n=len(a),completeHits=sum(r['completeHit'] for r in a),anyFalse=sum(r['falsePoints']>0 for r in a),emptyOracles=sum(r['emptyOracle'] for r in a)) for h in [24,52,80,112] if (a:=[r for r in targets if abs(r['height']-h)<=10])}
    return result,records
def select_threshold(m,p):
    # Complete-scene decisions change only at highest true/false accepted scores.
    critical=[]
    for i,rec in enumerate(m['records']):
        seq=nms_sequence(p,i,rec['width']);good=np.linalg.norm(CENTERS[seq]-rec['center'],axis=1)<=6.657 if rec['kind']=='target' else np.zeros(len(seq),bool)
        critical.extend([float(max(p[i,seq[good]],default=-1)),float(max(p[i,seq[~good]],default=-1))])
    values=np.array([c for c in critical if c>=0]);thresholds=np.unique(np.r_[0.,1.00000001,values,np.nextafter(values,np.inf)])
    frontier=[]
    for threshold in thresholds:
        summary,_=scene_summary(m,p,float(threshold));summary['feasible']=summary['absenceFalsePointScenes']==0 and summary['targetFalsePointRate']<=.01;frontier.append(summary)
    feasible=[r for r in frontier if r['feasible']];chosen=max(feasible,key=lambda r:(r['completeHits'],-r['targetEmptyOracles'],-r['threshold']))
    return chosen,frontier
def collisions(x,y):
    unique,inverse=np.unique(np.round(x,12),axis=0,return_inverse=True);pos=np.bincount(inverse,weights=y,minlength=len(unique));counts=np.bincount(inverse,minlength=len(unique));mixed=(pos>0)&(pos<counts)
    return dict(n=len(y),allZeroPositive=int(np.sum((y==1)&np.all(x==0,axis=1))),positiveN=int(np.sum(y)),uniqueRounded12=len(unique),conflictingVectors=int(np.sum(mixed)),rowsAtConflictingVectors=int(np.sum(counts[mixed])),positiveRowsAtConflictingVectors=int(np.sum(pos[mixed])),irreducibleClassificationErrorsAtIdenticalVectors=int(np.sum(np.minimum(pos[mixed],counts[mixed]-pos[mixed]))))
def fit(resume_selection=False):
    started=time.time();xt,yt,mt=load_split('train');xv,yv,mv=load_split('validation');wt,wv=source_weights(yt,mt),source_weights(yv,mv);rng=np.random.default_rng(202610107);theta=rng.normal(0,.4,32);theta[DEAD]=0;initial=theta.copy();readout=rng.normal(0,.25,7);bias=0.;params=np.r_[theta,readout,bias];moment=np.zeros(40);velocity=np.zeros(40);pos=np.flatnonzero(yt==1);cut=len(mt['records'])*8+(len(mt['records'])+2)//3;hard=np.flatnonzero((yt==0)&(np.arange(len(yt))<cut));background=np.flatnonzero((yt==0)&(np.arange(len(yt))>=cut));history=[];best=None
    for step in ([] if resume_selection else range(1,2001)):
        idx=np.r_[rng.choice(pos,64),rng.choice(hard,32),rng.choice(background,32)];x=xt[idx];y=yt[idx];read,jac=circuit(x,params[:32],True);p=sigmoid(read@params[32:39]+params[39]);error=(p-y)/len(y)
        gradient=np.r_[np.einsum('n,npk,k->p',error,jac,params[32:39]),read.T@error,np.sum(error)];gradient[DEAD]=0
        moment=.9*moment+.1*gradient;velocity=.999*velocity+.001*gradient**2;rate=.025*(.45+.55*(1-step/2000));params-=rate*(moment/(1-.9**step))/(np.sqrt(velocity/(1-.999**step))+1e-8);params[DEAD]=0
        if step==1 or step%100==0:
            pv=predict(xv,params[:32],params[32:39],params[39]);loss=bce(yv,pv,weights=wv);record=dict(step=step,validationSourceWeightedBCE=loss,elapsedSeconds=time.time()-started);history.append(record);print(json.dumps(record),flush=True)
            if best is None or loss<best[0]:best=(loss,params.copy(),step)
    if resume_selection:
        previous=json.loads((OUT/'current-qnn-provisional.json').read_text());params=np.r_[previous['theta'],previous['readout'],previous['bias']];best=(0,params,previous['checkpointStep']);history=json.loads((OUT/'training-history.json').read_text())
    params=best[1];model=dict(name='Current striped target QNN centered-window candidate v2',kind='qnn',featureVersion=FEATURE_VERSION,featureNames=list(FEATURE_NAMES),qubits=4,layers=4,theta=params[:32].tolist(),readout=params[32:39].tolist(),bias=float(params[39]),parameterCount=40,optimizedParameterCount=36,frozenInactiveSlots=DEAD.tolist(),readyForDemo=False,trainingDomain='Same OpenMoji striped target over Original Festival, Magic Arena, and Qualicity Queue; supplied known height24–112px; native high-quality resizing; registered depth-band partials; no unseen identity claim.',checkpointStep=best[2],sourceHashes=dict(trainer=sha(__file__),qnnCore=sha(PROJECT/'model/qnn_core.py'),featurePython=sha(PROJECT/'model/qnn_localizer_features.py'),**mt['sourceHashes']),dataHashes={k:dict(features=m['featuresSha256'],labels=m['labelsSha256']) for k,m in [('train',mt),('validation',mv)]})
    save('current-qnn-provisional.json',model);save('training-history.json',history)
    beta_candidates=[]
    for l2 in [.0001,.001,.01]:
        beta,h=logistic_fit(xt,yt,l2,wt);loss=bce(yv,sigmoid(xv@beta[:-1]+beta[-1]),weights=wv);beta_candidates.append((loss,l2,beta,h))
    _,l2,beta,h=min(beta_candidates,key=lambda a:a[0]);baseline=dict(kind='logistic',featureVersion=FEATURE_VERSION,featureNames=list(FEATURE_NAMES),coefficients=beta[:-1].tolist(),bias=float(beta[-1]),regularization=l2,trainingObjective='source-group weighted BCE (positive.5,nearby/decoy.25,background.25) plus L2 on weights',hyperparameterValidation=[dict(l2=a[1],balancedBCE=a[0]) for a in beta_candidates]);save('current-logistic-provisional.json',baseline)
    # Fitting a readout on frozen initial quantum features controls for a trained-angle wrapper.
    zt=np.concatenate([circuit(xt[i:i+2048],initial) for i in range(0,len(xt),2048)]);zv=circuit(xv,initial);fixed=[]
    for l2f in [.0001,.001,.01]:
        bf,hf=logistic_fit(zt,yt,l2f,wt);fixed.append((bce(yv,sigmoid(zv@bf[:-1]+bf[-1]),weights=wv),l2f,bf))
    _,lf,bf=min(fixed,key=lambda a:a[0]);fixed_model=dict(kind='qnn',theta=initial.tolist(),readout=bf[:-1].tolist(),bias=float(bf[-1]),regularization=lf,training='fixed initial quantum angles; readout-only weighted Newton fit');save('fixed-quantum-readout.json',fixed_model)
    xs,ms=scene_data('validation');pq=scene_predictions(xs,ms,model);pl=scene_predictions(xs,ms,baseline);chosen,frontier=select_threshold(ms,pq);lc,lfro=select_threshold(ms,pl);model['threshold']=chosen['threshold'];baseline['threshold']=lc['threshold'];model['sceneValidation']=chosen;baseline['sceneValidation']=lc
    trainp=predict(xt,params[:32],params[32:39],params[39]);valp=predict(xv,params[:32],params[32:39],params[39]);zero=predict(xv,np.zeros(32),params[32:39],params[39]);initp=predict(xv,initial,params[32:39],params[39]);fixedp=sigmoid(zv@bf[:-1]+bf[-1])
    model['metrics']={split:measure(y,p,model['threshold']) for split,y,p in [('train',yt,trainp),('validation',yv,valp)]};baseline['metrics']={split:measure(y,sigmoid(x@beta[:-1]+beta[-1]),baseline['threshold']) for split,x,y in [('train',xt,yt),('validation',xv,yv)]}
    evidence=dict(thetaChangeMean=float(np.mean(np.abs(params[:32][ACTIVE]-initial[ACTIVE]))),thetaChangeMax=float(np.max(np.abs(params[:32]-initial))),optimizedQuantumSlots=28,exportedAngleSlots=32,inactiveFinalRZSlots=DEAD.tolist(),trainedValidation=measure(yv,valp,model['threshold']),zeroThetaSameReadout=dict(meanPredictionChange=float(np.mean(np.abs(valp-zero))),maxPredictionChange=float(np.max(np.abs(valp-zero))),metrics=measure(yv,zero,model['threshold'])),initialThetaSameReadout=dict(meanPredictionChange=float(np.mean(np.abs(valp-initp))),maxPredictionChange=float(np.max(np.abs(valp-initp))),metrics=measure(yv,initp,model['threshold'])),fixedInitialQuantumRefittedReadout=dict(validationBalancedBCE=bce(yv,fixedp,True),metricsAtHalf=measure(yv,fixedp,.5),regularization=fixed_model['regularization']),warning='Participation/change does not establish a quantum advantage; the matched classical model and whole-scene audit are reported separately.')
    save('current-qnn.json',model);save('current-logistic.json',baseline);save('quantum-contribution.json',evidence);save('validation-threshold-frontier.json',dict(qnn=frontier,logistic=lfro,selection='zero empty-scene false marks; <=1% target scenes with false points; maximum complete hits across every target scene'))
    _,qrecords=scene_summary(ms,pq,model['threshold']);_,lrecords=scene_summary(ms,pl,baseline['threshold']);save('validation-scene-results.json',dict(qnn=dict(summary=chosen,records=qrecords),logistic=dict(summary=lc,records=lrecords)))
    save('feature-collisions.json',dict(train=collisions(xt,yt),validation=collisions(xv,yv),rounding='12 decimals for exact-vector collision diagnostic, not model input'))
    fixtures=[dict(features=x.tolist(),probability=float(p)) for x,p in zip(xv[:20],valp[:20])];save('trained-parity-fixtures.json',fixtures)
    freeze=dict(phase='before held-out full-scene test and independent audit',files={name:sha(OUT/name) for name in ['current-qnn.json','current-logistic.json','validation-threshold-frontier.json','feature-collisions.json','quantum-contribution.json','trained-parity-fixtures.json']},sourceFiles={name:sha(HERE/name) for name in ['protocol.json','build-corpus.mjs','train_current_qnn.py']},elapsedSeconds=time.time()-started);save('candidate-freeze.json',freeze);print(json.dumps(dict(completed='fit',qnn=chosen,logistic=lc,elapsedSeconds=time.time()-started)),flush=True)
def test():
    freeze=json.loads((OUT/'candidate-freeze.json').read_text());assert all(sha(OUT/f)==h for f,h in freeze['files'].items()),'Frozen candidate changed';assert all(sha(HERE/f)==h for f,h in freeze.get('sourceFiles',{}).items()),'Frozen source changed'
    xt,yt,mt=load_split('test');xs,ms=scene_data('test');results={}
    for name,filename in [('qnn','current-qnn.json'),('logistic','current-logistic.json')]:
        model=json.loads((OUT/filename).read_text());windowp=predict(xt,np.array(model['theta']),np.array(model['readout']),model['bias']) if name=='qnn' else sigmoid(xt@np.array(model['coefficients'])+model['bias']);p=scene_predictions(xs,ms,model);summary,records=scene_summary(ms,p,model['threshold']);results[name]=dict(windows=measure(yt,windowp,model['threshold']),sceneSummary=summary,records=records)
    save('held-out-test-results.json',dict(scope='Previously used asset identities; held-out center partitions and seeded rendering. No threshold or parameter change after this result.',frozenCandidateSHA256=sha(OUT/'current-qnn.json'),testDataHashes=dict(features=mt['featuresSha256'],labels=mt['labelsSha256'],sceneFeatures=ms['featuresSha256']),results=results));print(json.dumps({k:v['sceneSummary'] for k,v in results.items()}),flush=True)
if __name__=='__main__':fit() if (len(sys.argv)<2 or sys.argv[1]=='fit') else fit(True) if sys.argv[1]=='resume-selection' else test()
