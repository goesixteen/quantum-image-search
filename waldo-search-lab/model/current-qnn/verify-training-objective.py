"""Check new ranking/BCE gradients and optimized NMS against reference."""
import numpy as np
import train_current_qnn as t
rng=np.random.default_rng(41);x=rng.random((4,8));parameters=rng.normal(0,.4,40);parameters[t.DEAD]=0
def loss(v):
    logits=t.circuit(x,v[:32])@v[32:39]+v[39]
    return float(np.mean(np.logaddexp(0,logits[:2])-np.array([1.,0.])*logits[:2])+.25*np.logaddexp(0,1-logits[2]+logits[3]))
read,jac=t.circuit(x,parameters[:32],True);logits=read@parameters[32:39]+parameters[39];pair=.25*t.sigmoid(np.array([1-logits[2]+logits[3]]))[0]
errors=np.r_[(t.sigmoid(logits[:2])-np.array([1.,0.]))/2,-pair,pair]
analytic=np.r_[np.einsum('n,npk,k->p',errors,jac,parameters[32:39]),read.T@errors,np.sum(errors)]
numeric=[]
for index in range(40):
    plus=parameters.copy();minus=parameters.copy();plus[index]+=1e-5;minus[index]-=1e-5;numeric.append((loss(plus)-loss(minus))/2e-5)
error=float(np.max(np.abs(analytic-numeric)));assert error<1e-7,error
assert max(abs(analytic[t.DEAD]))<1e-12
for width in [8,18,39]:
    p=rng.random((1,4096));t.NMS_CACHE.clear();seq=t.nms_sequence(p,0,width)
    for threshold in [.2,.7,.95,1.]:
        actual=set(seq[p[0,seq]>=threshold]);expected=set(t.accepted_indices(p[0],t.CENTERS,threshold,width));assert actual==expected
z=rng.random((20,8));y=np.r_[np.ones(10),np.zeros(10)];pairs=np.array([[i,i+10] for i in range(10)]);weights=t.balanced_weights(y);beta,_=t.logistic_fit(z,y,.01,weights,pairs)
def classical_loss(b):
    logits=z@b[:-1]+b[-1];delta=(z[pairs[:,0]]-z[pairs[:,1]])@b[:-1]
    return float(np.sum(weights*(np.logaddexp(0,logits)-y*logits))+.005*np.sum(b[:-1]**2)+.25*np.mean(np.logaddexp(0,1-delta)))
gradient=[]
for index in range(9):
    plus=beta.copy();minus=beta.copy();plus[index]+=1e-5;minus[index]-=1e-5;gradient.append((classical_loss(plus)-classical_loss(minus))/2e-5)
stationarity=float(np.max(np.abs(gradient)));assert stationarity<1e-6,stationarity
report=dict(quantum40SlotCombinedLossGradientMaxError=error,finalRZGradientMax=float(max(abs(analytic[t.DEAD]))),matchedLogisticCombinedObjectiveStationarityMax=stationarity,nmsComparisons=12,status='PASS')
t.save('training-objective-verification.json',report);print(report)
