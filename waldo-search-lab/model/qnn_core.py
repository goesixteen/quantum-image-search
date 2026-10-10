import numpy as np

INDICES=np.arange(16)
Z=np.array([[1 if not (i>>q)&1 else -1 for i in INDICES] for q in range(4)])
OBS=np.array([*Z,Z[0]*Z[1],Z[2]*Z[3],Z[0]*Z[1]*Z[2]*Z[3]])
PAIRS=[(np.flatnonzero((INDICES&(1<<q))==0),np.flatnonzero((INDICES&(1<<q))!=0)) for q in range(4)]
CNOT=[np.array([i^(1<<t) if (i>>c)&1 else i for i in INDICES]) for c,t in [(0,1),(1,2),(2,3),(3,0)]]

def circuit(features,theta,jacobian=False):
    n=len(features); channels=len(theta)+1 if jacobian else 1
    s=np.zeros((n,channels,16),dtype=np.complex128);s[:,0,0]=1
    p=0
    def ry(q,angle,param=None):
        nonlocal s
        a,b=PAIRS[q];aa=s[:,:,a].copy();bb=s[:,:,b].copy()
        c=np.cos(angle/2).reshape(-1,1,1);v=np.sin(angle/2).reshape(-1,1,1)
        s[:,:,a]=c*aa-v*bb;s[:,:,b]=v*aa+c*bb
        if jacobian and param is not None:
            s[:,param+1,a]+=.5*(-v[:,0,:]*aa[:,0,:]-c[:,0,:]*bb[:,0,:])
            s[:,param+1,b]+=.5*(c[:,0,:]*aa[:,0,:]-v[:,0,:]*bb[:,0,:])
    def rz(q,angle,param=None):
        nonlocal s
        phase=np.exp(-.5j*angle.reshape(-1,1)*Z[q][None,:])
        s*=phase[:,None,:]
        if jacobian and param is not None:
            s[:,param+1,:]+=-.5j*Z[q][None,:]*s[:,0,:]
    for layer in range(len(theta)//8):
        for q in range(4):
            ry(q,np.pi*features[:,q])
            rz(q,np.pi*features[:,q+4])
        for q in range(4):
            ry(q,np.full(n,theta[p]),p);p+=1
            rz(q,np.full(n,theta[p]),p);p+=1
        for permutation in CNOT:
            s=s[:,:,permutation]
    prob=np.abs(s[:,0,:])**2
    read=prob@OBS.T
    if jacobian:
        deriv=2*np.real(np.conj(s[:,0,None,:])*s[:,1:,:])
        return read,deriv@OBS.T
    return read

def sigmoid(x):
    return 1/(1+np.exp(-np.clip(x,-40,40)))

def metrics(y,p,threshold=.5):
    pred=p>=threshold;pos=y==1;neg=~pos
    tp=int(np.sum(pred&pos));fp=int(np.sum(pred&neg));fn=int(np.sum((~pred)&pos));tn=int(np.sum((~pred)&neg))
    # Pairwise definition avoids library dependence and handles ties exactly.
    pp=p[pos];pn=p[neg]
    auc=float(np.mean((pp[:,None]>pn[None,:])+.5*(pp[:,None]==pn[None,:])))
    return dict(n=len(y),threshold=float(threshold),accuracy=float(np.mean(pred==y)),precision=tp/max(1,tp+fp),recall=tp/max(1,tp+fn),f1=2*tp/max(1,2*tp+fp+fn),roc_auc=auc,true_positive=tp,false_positive=fp,false_negative=fn,true_negative=tn,bce=float(-np.mean(y*np.log(np.maximum(p,1e-9))+(1-y)*np.log(np.maximum(1-p,1e-9)))))

