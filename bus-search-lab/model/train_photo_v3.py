"""Train matched QNN/logistic v3 candidates under predeclared scene budgets.

Never loads evaluation asset directories or writes a production checkpoint.
Run from any directory: python model/train_photo_v3.py
"""
from __future__ import annotations
import hashlib,json,time
import numpy as np
from train import ROOT,DIST,circuit,sigmoid,metrics,save_montage
from classical_baseline import fit,verify_gradient
from photo_features_v3 import FEATURE_VERSION,FEATURE_NAMES
from photo_v3_data import SEED,SPLITS,load_training_assets,patches,validation_scenes,fingerprint,provenance

THRESHOLDS=np.round(np.arange(.1,.996,.005),3)


def select_threshold(vy,vp,scene_probabilities):
    totals=sum(len(s['scores']) for s in scene_probabilities);empty_totals=sum(len(s['empty']) for s in scene_probabilities)
    rows=[]
    for threshold in THRESHOLDS:
        empty_bad=0;false_scenes=0;complete=0;hits=0
        for s in scene_probabilities:
            marks=s['scores']>=threshold;truth=s['truth']
            false=np.any(marks&~truth,axis=1);hit=np.any(marks&truth,axis=1)
            false_scenes+=int(false.sum());hits+=int(hit.sum());complete+=int((hit&~false).sum())
            empty_bad+=int(np.any(s['empty']>=threshold,axis=1).sum())
        patch=metrics(vy,vp,float(threshold))
        feasible=empty_bad==0 and false_scenes/totals<=.01
        rows.append(dict(threshold=float(threshold),budget_feasible=feasible,empty_false_scenes=empty_bad,empty_scenes=empty_totals,false_mark_scenes=false_scenes,target_scenes=totals,hit_scenes=hits,complete_scenes=complete,complete_scene_rate=complete/totals,patch_f1=patch['f1']))
    feasible=[row for row in rows if row['budget_feasible']]
    if feasible:selected=max(feasible,key=lambda row:(row['complete_scene_rate'],row['patch_f1'],-row['threshold']))
    else:selected=max(rows,key=lambda row:(-row['empty_false_scenes']-row['false_mark_scenes'],row['complete_scene_rate'],row['patch_f1'],-row['threshold']))
    return selected,rows


def probabilities_for_scenes(scene_sets,score_fn):
    return [dict(background=s['background'],grid=s['grid'],truth=s['truth'],scores=score_fn(s['features'].reshape(-1,8)).reshape(s['features'].shape[:2]),empty=score_fn(s['empty_features'].reshape(-1,8)).reshape(s['empty_features'].shape[:2])) for s in scene_sets]


def scene_summary(probabilities,threshold):
    result=[]
    for s in probabilities:
        mark=s['scores']>=threshold;truth=s['truth'];hit=np.any(mark&truth,axis=1);false=np.any(mark&~truth,axis=1)
        result.append(dict(background=s['background'],grid=s['grid'],target_scenes=len(hit),hits=int(hit.sum()),false_scenes=int(false.sum()),complete_scenes=int((hit&~false).sum()),empty_scenes=len(s['empty']),empty_false_scenes=int(np.any(s['empty']>=threshold,axis=1).sum()),max_empty_score=float(s['empty'].max())))
    return result


def qnn_fit(x,y,vx,vy):
    best=None;best_loss=float('inf');history=[]
    for restart in range(3):
        rng=np.random.default_rng(SEED+4+restart);p=np.r_[rng.normal(0,.65,32),rng.normal(0,.2,7),0.]
        m=np.zeros(40);v=np.zeros(40)
        for step in range(1,2201):
            ids=rng.choice(len(x),128,replace=False);read,jac=circuit(x[ids],p[:32],True);prediction=sigmoid(read@p[32:-1]+p[-1]);error=(prediction-y[ids])/len(ids)
            grad=np.r_[np.einsum('n,npk,k->p',error,jac,p[32:-1]),read.T@error+.0004*p[32:-1],error.sum()]
            m=.9*m+.1*grad;v=.999*v+.001*grad*grad;lr=.026*(.45+.55*(1-step/2200))
            p-=lr*m/(1-.9**step)/(np.sqrt(v/(1-.999**step))+1e-8)
            if step==1 or step%100==0:
                score=metrics(vy,sigmoid(circuit(vx,p[:32])@p[32:-1]+p[-1]))
                row=dict(restart=restart,step=step,validation_bce=score['bce'],validation_accuracy=score['accuracy']);history.append(row)
                if score['bce']<best_loss:best_loss=score['bce'];best=p.copy();selected=row
                print('QNN',json.dumps(row),flush=True)
    return best,selected,history


def source_hashes():
    names=['photo_features_v3.py','photo_v3_data.py','train_photo_v3.py','train.py','classical_baseline.py','photo-v3-protocol.json']
    return {name:hashlib.sha256((ROOT/'model'/name).read_bytes()).hexdigest() for name in names}


def main():
    start=time.perf_counter();sources=source_hashes();bus,backgrounds=load_training_assets();data={};hashes={}
    for name,(n,seed,stress) in SPLITS.items():
        data[name]=patches(n,seed,bus,backgrounds,stress);hashes[name]=fingerprint(*data[name][:2]);print('Generated',name,n,hashes[name],flush=True)
    x,y,_=data['train'];vx,vy,_=data['validation']
    scenes=validation_scenes(bus,backgrounds);print('Scene validation rendered',sum(len(s['features']) for s in scenes),flush=True)
    params,selected,history=qnn_fit(x,y,vx,vy)
    qnn_score=lambda f:sigmoid(circuit(f,params[:32])@params[32:-1]+params[-1])
    mean=x.mean(axis=0);scale=x.std(axis=0);scale=np.where(scale>1e-10,scale,1)
    design=np.c_[(x-mean)/scale,np.ones(len(x))];vdesign=np.c_[(vx-mean)/scale,np.ones(len(vx))];classical=[]
    for regularization in [1e-6,1e-5,1e-4,1e-3,.01,.1]:
        weights,optimization=fit(design,y,regularization,250);loss=metrics(vy,sigmoid(vdesign@weights))['bce']
        classical.append((loss,regularization,weights,optimization));print('Logistic',regularization,loss,flush=True)
    logloss,reg,weights,optimization=min(classical,key=lambda row:row[0]);raw=weights[:-1]/scale;bias=float(weights[-1]-raw@mean)
    logistic_score=lambda f:sigmoid(f@raw+bias)
    base=dict(version=3,featureVersion=FEATURE_VERSION,featureExtractor=FEATURE_VERSION,featureNames=FEATURE_NAMES,readyForDemo=False,seed=SEED,splitSeeds={name:seed for name,(n,seed,stress) in SPLITS.items()},trainingDomain='One real bus cutout on Covington/Sauk Centre with controlled illumination; placements and augmentations held out, not photograph identities',assets=provenance(),sourceHashes=sources)
    reports={};models={}
    for name,score_fn in [('qnn',qnn_score),('logistic',logistic_score)]:
        probs=probabilities_for_scenes(scenes,score_fn);threshold_selection,threshold_rows=select_threshold(vy,score_fn(vx),probs);threshold=threshold_selection['threshold']
        results={split:metrics(labels,score_fn(features),threshold) for split,(features,labels,images) in data.items()}
        model={**base,'name':f'BusPhoto-v3-{name}-candidate','threshold':threshold,'metrics':results,'validationBudgetFeasible':threshold_selection['budget_feasible']}
        if name=='qnn':model.update(qubits=4,layers=4,parameterCount=40,theta=params[:32].tolist(),readout=params[32:-1].tolist(),bias=float(params[-1]),observables=['Z0','Z1','Z2','Z3','Z0Z1','Z2Z3','Z0Z1Z2Z3'])
        else:model.update(parameterCount=9,raw_feature_weights=raw.tolist(),raw_feature_bias=bias,regularization=reg)
        report=dict(splits=results,threshold_selection=threshold_selection,threshold_candidates=threshold_rows,validation_scene_summary=scene_summary(probs,threshold))
        if name=='qnn':report.update(checkpoint_selection=selected,history=history)
        else:report.update(regularization=reg,regularization_candidates=[dict(validation_bce=row[0],regularization=row[1],optimization=row[3]) for row in classical],optimization=optimization)
        models[name]=model;reports[name]=report
        (ROOT/'model'/f'photo-v3-{name}-candidate.json').write_text(json.dumps(model,indent=2))
        save_montage(data['test'][2],data['test'][1],score_fn(data['test'][0]),ROOT/'model'/f'photo-v3-{name}-montage.png')
        print(name,json.dumps(dict(threshold_selection=threshold_selection,test=results['test'])),flush=True)
    fixtures=[]
    for im,f in zip(data['test'][2][:16],data['test'][0][:16]):fixtures.append(dict(width=64,height=64,rgba=np.asarray(im.convert('RGBA')).reshape(-1).tolist(),features=f.tolist(),qnn_probability=float(qnn_score(f[None,:])[0]),logistic_probability=float(logistic_score(f[None,:])[0])))
    (ROOT/'model/photo-v3-parity-fixtures.json').write_text(json.dumps(fixtures,separators=(',',':')))
    checks=dict(logistic_gradient_max_error=verify_gradient(),raw_standardized_logistic_max_error=float(np.max(abs(logistic_score(data['test'][0])-sigmoid(np.c_[(data['test'][0]-mean)/scale,np.ones(len(data['test'][0]))]@weights)))))
    assert checks['raw_standardized_logistic_max_error']<1e-12
    assert source_hashes()==sources,'Frozen source changed during fitting.'
    report=dict(protocol_file='photo-v3-protocol.json',source_sha256=sources,split_configuration={name:dict(n=n,seed=seed,stress=stress) for name,(n,seed,stress) in SPLITS.items()},split_feature_and_label_sha256=hashes,assets=provenance(),models=reports,verification=checks,elapsed_seconds=time.perf_counter()-start)
    (ROOT/'model/photo-v3-metrics.json').write_text(json.dumps(report,indent=2));print('Done',report['elapsed_seconds'],flush=True)


if __name__=='__main__':main()
