"""Learn a circuit-native bus event, then coherently amplify it with A/A†.

There is no classical sigmoid, learned readout, or threshold in the coherent
experiment. Training optimizes only variational RY/RZ angles, with p(bus) equal
to the Born probability of output wire3 being1. Working UI models are untouched.
"""
from __future__ import annotations
import argparse,json,math,time
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from train import ROOT,SEED,FEATURE_NAMES,dataset,circuit,metrics,extract_features,vehicle
from coherent_prototype import preparation_gates,apply_circuit,amplify,good_mask,recommend_from_probability

OUTPUT_WIRE=3

def raw_probability(features,theta):
    return np.clip((1-circuit(features,theta)[:,OUTPUT_WIRE])/2,0,1)

def weighted_bce(y,p,negative_weight=2.):
    p=np.clip(p,1e-8,1-1e-8)
    return float(-np.mean(y*np.log(p)+negative_weight*(1-y)*np.log(1-p)))

def fit(x,y,vx,vy,layers,steps,restarts,negative_weight):
    bestloss=math.inf;best=None;history=[];best_at=None
    start=time.time()
    for restart in range(restarts):
        rng=np.random.default_rng(SEED+400+100*layers+restart)
        theta=rng.normal(0,.65,8*layers);m=np.zeros_like(theta);v=np.zeros_like(theta)
        for step in range(1,steps+1):
            idx=rng.choice(len(x),128,replace=False);read,jac=circuit(x[idx],theta,True)
            p=np.clip((1-read[:,OUTPUT_WIRE])/2,1e-7,1-1e-7)
            # Chain rule through the physical probability, not a shifted loss.
            loss_derivative=(-y[idx]/p+negative_weight*(1-y[idx])/(1-p))/len(idx)
            grad=np.einsum('n,np->p',loss_derivative,-.5*jac[:,:,OUTPUT_WIRE])
            norm=np.linalg.norm(grad)
            if norm>5:grad*=5/norm
            m=.9*m+.1*grad;v=.999*v+.001*grad**2
            lr=.026*(.35+.65*(1-step/steps))
            theta-=lr*m/(1-.9**step)/(np.sqrt(v/(1-.999**step))+1e-8)
            if step==1 or step%100==0:
                vp=raw_probability(vx,theta);loss=weighted_bce(vy,vp,negative_weight)
                accuracy=float(np.mean((vp>=.5)==vy))
                history.append(dict(layers=layers,restart=restart,step=step,validation_weighted_bce=loss,validation_accuracy_at_half=accuracy))
                if loss<bestloss:bestloss=loss;best=theta.copy();best_at=dict(layers=layers,restart=restart,step=step)
                print(f'layers{layers} restart{restart} step{step}: weighted BCE{loss:.4f} accuracy@0.5 {accuracy:.3f} elapsed{time.time()-start:.1f}s',flush=True)
    return dict(theta=best,validation_weighted_bce=bestloss,history=history,best_at=best_at,elapsed_seconds=time.time()-start)

def fixed_exemplars():
    """Declared before training: hard yellow truck, blue car, striped sign, bus."""
    images=[];names=['yellow truck','blue car','striped yellow sign','yellow schoolbus'];labels=[0,0,0,1]
    for kind,color in [('truck',(247,193,39)),('car',(77,129,183)),('sign',None),('bus',(247,193,39))]:
        im=Image.new('RGB',(64,64),(215,225,232))
        if kind=='sign':
            d=ImageDraw.Draw(im);d.rectangle((8,20,55,43),fill=(247,193,39),outline=(35,44,53))
            for xx in range(13,52,8):d.rectangle((xx,23,xx+3,40),fill=(35,44,53))
        else:
            obj=vehicle(kind,color).resize((52,32),Image.Resampling.LANCZOS);im.paste(obj,(6,16),obj)
        images.append(im)
    return np.array([extract_features(im) for im in images]),names,labels,images

def coherent_experiment(features,theta,names,labels):
    gates=preparation_gates(features,theta);zero=np.zeros(64,dtype=np.complex128);zero[0]=1
    prepared=apply_circuit(zero,gates);mask=good_mask(OUTPUT_WIRE)
    p=raw_probability(features,theta);a=float(np.sum(abs(prepared[mask])**2));angle=math.asin(math.sqrt(a))
    k_star=recommend_from_probability(a);state=prepared.copy();history=[];conditional=p/p.sum()
    for k in range(7):
        dist=(abs(state)**2).reshape(4,16);local=(np.arange(16)&(1<<OUTPUT_WIRE))!=0
        joint=dist[:,local].sum(axis=1);pg=float(joint.sum());given=joint/pg
        formula=math.sin((2*k+1)*angle)**2
        history.append(dict(iteration=k,p_good=pg,analytic_p_good=formula,address_marginal=dist.sum(axis=1).tolist(),address_and_good=joint.tolist(),address_given_good=given.tolist(),true_bus_and_good_probability=float(joint[np.array(labels)==1].sum()),true_bus_probability_given_good=float(given[np.array(labels)==1].sum()),formula_error=abs(pg-formula),norm_error=abs(float(dist.sum())-1),conditional_address_max_error=float(np.max(np.abs(given-conditional)))))
        if k<6:state=amplify(state,gates,OUTPUT_WIRE)
    identity=np.eye(64,dtype=np.complex128);A=apply_circuit(identity,gates);Ainv=apply_circuit(identity,gates,inverse=True)
    expected_Q=(2*np.outer(prepared,prepared.conj())-identity)@np.diag(np.where(mask,-1.,1.))
    checks=dict(A_inverse_error=float(np.max(abs(Ainv-A.conj().T))),A_unitarity_error=float(np.max(abs(A.conj().T@A-identity))),A_dagger_A_zero_error=float(np.max(abs(apply_circuit(prepared,gates,inverse=True)-zero))),Q_dense_reflection_error=float(np.max(abs(amplify(identity,gates,OUTPUT_WIRE)-expected_Q))),formula_max_error=max(h['formula_error'] for h in history),norm_max_error=max(h['norm_error'] for h in history),conditional_invariance_max_error=max(h['conditional_address_max_error'] for h in history),branch_probability_max_error=float(np.max(np.abs((abs(prepared.reshape(4,16))**2)[:,local].sum(axis=1)*4-p))))
    assert max(checks.values())<1e-10,checks
    return dict(registers=dict(address=2,qnn=4,total=6),names=names,labels=labels,features=features.tolist(),raw_bus_probabilities=p.tolist(),initial_good_probability=a,recommended_iterations=k_star,preparation_gate_count=len(gates),threshold_used=False,classical_readout_used=False,true_bus_prior_probability=.25,conditional_true_bus_probability=float(conditional[np.array(labels)==1].sum()),checks=checks,history=history,selected_first_peak=history[k_star],scope='Four explicitly fixed synthetic exemplars; soft learned output-wire event; no threshold or intermediate measurement. Relative address weights inside the good subspace are invariant under amplification.')

def derivative_check(theta):
    probes=np.random.default_rng(8163).uniform(0,1,(9,8));read,jac=circuit(probes,theta,True);error=0
    for k in range(len(theta)):
        tp=theta.copy();tm=theta.copy();tp[k]+=np.pi/2;tm[k]-=np.pi/2
        shifted=(circuit(probes,tp)-circuit(probes,tm))*.5
        error=max(error,float(np.max(np.abs(shifted-jac[:,k,:]))))
    assert error<1e-12,error
    null_slots=list(range(len(theta)-7,len(theta),2))
    null_error=float(np.max(np.abs(jac[:,null_slots,OUTPUT_WIRE])))
    assert null_error<1e-12,null_error
    return error,null_error

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--steps',type=int,default=2000);ap.add_argument('--restarts',type=int,default=3);ap.add_argument('--negative-weight',type=float,default=2.);ap.add_argument('--verify-only',action='store_true');args=ap.parse_args()
    if args.verify_only:
        model=json.loads((ROOT/'model/coherent-classifier.json').read_text());theta=np.array(model['theta']);features,names,labels,_=fixed_exemplars();experiment=coherent_experiment(features,theta,names,labels);derr,nullerr=derivative_check(theta)
        print(json.dumps(dict(verification='PASS',coherent_checks=experiment['checks'],parameter_shift_derivative_max_error=derr,output_insensitive_final_rz_derivative_max_error=nullerr),indent=2));return
    start=time.time();x,y,_=dataset(3200,SEED);vx,vy,_=dataset(800,SEED+1)
    candidates=[fit(x,y,vx,vy,layers,args.steps,args.restarts,args.negative_weight) for layers in [4,6]]
    chosen=min(candidates,key=lambda c:c['validation_weighted_bce']);theta=chosen['theta'];layers=len(theta)//8
    vp=raw_probability(vx,theta);threshold=max([metrics(vy,vp,float(t)) for t in np.arange(.15,.86,.01)],key=lambda s:s['f1'])['threshold']
    tx,ty,_=dataset(2000,SEED+102);sx,sy,_=dataset(1200,SEED+103,True)
    reports={}
    for name,xx,yy in [('train',x,y),('validation',vx,vy),('test',tx,ty),('stress_test',sx,sy)]:
        p=raw_probability(xx,theta)
        reports[name]=dict(at_half=metrics(yy,p,.5),at_validation_threshold=metrics(yy,p,threshold),mean_positive_probability=float(p[yy==1].mean()),mean_negative_probability=float(p[yy==0].mean()),weighted_bce=weighted_bce(yy,p,args.negative_weight))
    features,names,labels,images=fixed_exemplars();experiment=coherent_experiment(features,theta,names,labels)
    derivative_error,null_error=derivative_check(theta)
    model=dict(name='CoherentBus-QNN-v1',qubits=4,layers=layers,outputQubit=OUTPUT_WIRE,parameterCount=len(theta),observableRelevantParameterCount=len(theta)-4,outputInsensitiveAngleSlots=list(range(len(theta)-7,len(theta),2)),theta=theta.tolist(),featureNames=FEATURE_NAMES,featureExtractor='yellow-v1',readoutType='Born probability: p(bus)=(1-<Z3>)/2',hasClassicalReadout=False,diagnosticThreshold=threshold,negativeLossWeight=args.negative_weight,splitSeeds=dict(train=SEED,validation=SEED+1,test=SEED+102,stress_test=SEED+103),trainingDomain='synthetic vehicle patches; same generator and splits as illustrated hybrid model',bestCheckpoint=chosen['best_at'])
    metrics_report=dict(model=model['name'],architecture_selection='Choose four or six layers by lowest validation weighted BCE; three seeded restarts per architecture; output qubit fixed to 3.',classification=reports,coherent_experiment=experiment,parameter_shift_derivative_max_error=derivative_error,output_insensitive_final_rz_derivative_max_error=null_error,elapsed_seconds=time.time()-start,candidates=[{k:v for k,v in c.items() if k!='theta'} for c in candidates])
    (ROOT/'model/coherent-classifier.json').write_text(json.dumps(model,indent=2));(ROOT/'model/coherent-classifier-metrics.json').write_text(json.dumps(metrics_report,indent=2))
    montage=Image.new('RGB',(4*144,106),(247,249,252));d=ImageDraw.Draw(montage)
    for k,im in enumerate(images):montage.paste(im,(k*144+40,2));d.text((k*144+3,72),names[k],fill=(35,45,55));d.text((k*144+3,88),f'p(bus)={experiment["raw_bus_probabilities"][k]:.3f}',fill=(35,45,55))
    montage.save(ROOT/'model/coherent-exemplars.png')
    print(json.dumps(dict(selected=model['bestCheckpoint'],test=reports['test'],coherent=dict(raw_probabilities=experiment['raw_bus_probabilities'],initial_good=experiment['initial_good_probability'],conditional_bus=experiment['conditional_true_bus_probability'],first_peak=experiment['selected_first_peak'],checks=experiment['checks'])),indent=2),flush=True)

if __name__=='__main__':main()
