"""Training/validation-only v3 representation and threshold-frontier analysis.

No evaluation asset reads, fitting, candidate writes, or threshold reselection.
Regenerates exact seeded inputs and checks their recorded fingerprints.
"""
from __future__ import annotations
import hashlib,json
import numpy as np
from train import ROOT,circuit,sigmoid,metrics
from photo_v3_data import SPLITS,load_training_assets,patches,fingerprint


def collision_summary(features,labels):
    groups={}
    for row,label in zip(features,labels):
        key=np.asarray(row,dtype='<f8').tobytes();counts=groups.setdefault(key,[0,0]);counts[int(label)]+=1
    mixed=[counts for counts in groups.values() if min(counts)>0]
    positive=labels==1;negative=~positive;zero=np.all(features==0,axis=1)
    return dict(examples=len(labels),positive_examples=int(positive.sum()),negative_examples=int(negative.sum()),positive_all_zero_count=int((positive&zero).sum()),negative_all_zero_count=int((negative&zero).sum()),unique_exact_vectors=len(groups),mixed_label_exact_vectors=len(mixed),positive_examples_with_identical_negative_vector=sum(counts[1] for counts in mixed),negative_examples_with_identical_positive_vector=sum(counts[0] for counts in mixed),minimum_training_sample_errors_for_any_deterministic_feature_only_classifier=sum(min(counts) for counts in groups.values()),sample_lookup_accuracy_upper_bound=1-sum(min(counts) for counts in groups.values())/len(labels),interpretation='Exact floating-feature equality on this finite generated sample only. Lookup upper bound is not held-out accuracy or a learned-model claim.')


def nearest_negative(train_x,train_y,val_x,val_y):
    tx=train_x[train_y==0];vx=val_x[val_y==1];distances=[]
    for start in range(0,len(vx),128):
        block=vx[start:start+128];square=np.maximum(0,(block*block).sum(axis=1)[:,None]+(tx*tx).sum(axis=1)[None,:]-2*block@tx.T)
        distances.extend(np.sqrt(square.min(axis=1)).tolist())
    distances=np.array(distances)
    return dict(validation_positive_examples=len(vx),training_negative_examples=len(tx),nearest_negative_l2_minimum=float(distances.min()),nearest_negative_l2_median=float(np.median(distances)),positive_count_within_1e_minus3=int((distances<=1e-3).sum()),positive_count_within_1e_minus2=int((distances<=1e-2).sum()),meaning='Distance proximity is diagnostic similarity, not proof that a classifier cannot separate distinct vectors.')


def frontier(rows):
    selected=[]
    for row in rows:
        if not any(other['complete_scenes']>=row['complete_scenes'] and other['false_mark_scenes']<=row['false_mark_scenes'] and other['empty_false_scenes']<=row['empty_false_scenes'] and (other['complete_scenes']>row['complete_scenes'] or other['false_mark_scenes']<row['false_mark_scenes'] or other['empty_false_scenes']<row['empty_false_scenes']) for other in rows):selected.append(row)
    out=[]
    for row in selected:
        key=(row['complete_scenes'],row['false_mark_scenes'],row['empty_false_scenes'])
        if not any((r['complete_scenes'],r['false_mark_scenes'],r['empty_false_scenes'])==key for r in out):out.append(row)
    return out


def main():
    original={name:(ROOT/'model'/f'photo-v3-{name}-candidate.json').read_bytes() for name in ['qnn','logistic']};report=json.loads((ROOT/'model/photo-v3-metrics.json').read_text());bus,backgrounds=load_training_assets();data={}
    for name in ['train','validation']:
        n,seed,stress=SPLITS[name];x,y,_=patches(n,seed,bus,backgrounds,stress);actual=fingerprint(x,y)
        assert actual==report['split_feature_and_label_sha256'][name],f'{name} fingerprint mismatch';data[name]=(x,y)
    x,y=data['train'];vx,vy=data['validation'];combined_x=np.r_[x,vx];combined_y=np.r_[y,vy]
    analysis=dict(protocol='Training/validation-only post-fit analysis; all candidates/thresholds unchanged; no diagnostic or fresh evaluation assets loaded.',representation=dict(train=collision_summary(x,y),validation=collision_summary(vx,vy),combined_train_validation=collision_summary(combined_x,combined_y),nearest_training_negative=nearest_negative(x,y,vx,vy)),threshold_frontiers={},split_fingerprints_confirmed=True,model_sha256={name:hashlib.sha256(value).hexdigest() for name,value in original.items()})
    for name,value in original.items():
        model=json.loads(value);vp=sigmoid(circuit(vx,np.array(model['theta']))@model['readout']+model['bias']) if name=='qnn' else sigmoid(vx@model['raw_feature_weights']+model['raw_feature_bias'])
        rows=report['models'][name]['threshold_candidates'];best_patch=max(rows,key=lambda row:row['patch_f1']);best_complete=max(rows,key=lambda row:row['complete_scenes'])
        selected_threshold=model['threshold'];grid_points=[.30,.50,.70,.85,.90,.94,.95,.97,.995]
        points=[min(rows,key=lambda row:abs(row['threshold']-threshold)) for threshold in grid_points]
        analysis['threshold_frontiers'][name]=dict(selected=report['models'][name]['threshold_selection'],validation_patch_f1_maximum_operating_point=best_patch,unconstrained_complete_scene_maximum=best_complete,representative_points=points,pareto_points=frontier(rows),selected_empty_oracle_validation_patch_positive_count=int(np.sum(vp[vy==1]<selected_threshold)),validation_positive_examples=int((vy==1).sum()),selected_patch_metrics=metrics(vy,vp,selected_threshold),meaning='All512 foreground scenes remain in complete-scene denominator; complete requires≥1 true mark and zero false marks. Abstention is a failure. Threshold frontiers are descriptive validation analysis, not new selected candidates.')
    for name,value in original.items():assert (ROOT/'model'/f'photo-v3-{name}-candidate.json').read_bytes()==value
    (ROOT/'model/photo-v3-analysis.json').write_text(json.dumps(analysis,indent=2));print(json.dumps(dict(representation=analysis['representation'],frontiers={name:{key:row[key] for key in ['selected','validation_patch_f1_maximum_operating_point','unconstrained_complete_scene_maximum']} for name,row in analysis['threshold_frontiers'].items()}),indent=2))


if __name__=='__main__':main()
