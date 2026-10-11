"""Held-out window controls at frozen parameters; no fitting or selection."""
import json
import numpy as np
import train_current_qnn as t
model=json.loads((t.OUT/'current-qnn.json').read_text())
freeze=json.loads((t.OUT/'candidate-freeze.json').read_text())
assert t.sha(t.OUT/'current-qnn.json')==freeze['files']['current-qnn.json']
x,y,meta=t.load_split('test');theta=np.array(model['theta']);readout=np.array(model['readout'])
trained=t.predict(x,theta,readout,model['bias'])
initial=np.random.default_rng(model['optimizationSeed']).normal(0,.4,32);initial[t.DEAD]=0
controls={}
for name,angles in [('zeroThetaSameReadout',np.zeros(32)),('initialThetaSameReadout',initial)]:
    p=t.predict(x,angles,readout,model['bias']);controls[name]=dict(meanPredictionChange=float(np.mean(np.abs(trained-p))),maxPredictionChange=float(np.max(np.abs(trained-p))),metricsAtFrozenThreshold=t.measure(y,p,model['threshold']))
fixed=json.loads((t.OUT/'fixed-quantum-readout.json').read_text());p=t.predict(x,np.array(fixed['theta']),np.array(fixed['readout']),fixed['bias'])
controls['fixedInitialQuantumRefittedReadout']=dict(balancedBCE=t.bce(y,p,True),metricsAtHalf=t.measure(y,p,.5),note='Readout/regularization were selected before test scoring by validation BCE; 0.5 window metrics are not the saved scene operating point.')
report=dict(scope='Reserved same-asset test windows, after exact candidate freeze; controls fixed before test, no new fitting/selection. Participation is not quantum advantage.',candidateSHA256=t.sha(t.OUT/'current-qnn.json'),testFeaturesSHA256=meta['featuresSha256'],trained=t.measure(y,trained,model['threshold']),controls=controls)
t.save('heldout-angle-controls.json',report);print(json.dumps(dict(trainedBalancedBCE=report['trained']['balanced_bce'],zeroMeanChange=controls['zeroThetaSameReadout']['meanPredictionChange'],initialMeanChange=controls['initialThetaSameReadout']['meanPredictionChange'],fixedRefittedBalancedBCE=controls['fixedInitialQuantumRefittedReadout']['balancedBCE'])))
