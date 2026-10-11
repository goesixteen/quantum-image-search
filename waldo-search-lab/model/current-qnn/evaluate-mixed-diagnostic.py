"""Optional old mixed-visibility validation diagnostic, never model selection.

Reads an already inspected prior V3 validation matrix and the frozen clean-front
checkpoint. This is a development diagnostic, not an independent/test set.
"""
import json
import numpy as np
import train_current_qnn as t
archive=t.OUT/'candidate-v3'
meta=json.loads((archive/'validation-scenes.json').read_text())
assert t.sha(archive/meta['features'])==meta['featuresSha256']
assert meta['featureVersion']==t.FEATURE_VERSION
features=np.memmap(archive/meta['features'],dtype='<f8',mode='r',shape=(meta['rows'],8))
results={}
for key,name in [('qnn','current-qnn.json'),('logistic','current-logistic.json')]:
    model=json.loads((t.OUT/name).read_text());probability=t.scene_predictions(features,meta,model);summary,records=t.scene_summary(meta,probability,model['threshold']);results[key]=dict(summary=summary,records=records)
report=dict(scope='Previously inspected mixed-occlusion validation composites, now rescored at the frozen clean-front checkpoint/threshold. No refitting or threshold selection from these outcomes; not a fresh holdout.',candidateSHA256=t.sha(t.OUT/'current-qnn.json'),sceneFeatureSHA256=meta['featuresSha256'],results=results)
t.save('mixed-validation-diagnostic.json',report);print(json.dumps({key:value['summary'] for key,value in results.items()}))
