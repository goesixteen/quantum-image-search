/** Faithful full-state trace of qnn.js quantumReadout(), with reduced local states.
 * The classifier's four wires form one entangled state, not independent neurons.
 * Basis index uses q0 as the least-significant bit; bitstrings read q3 q2 q1 q0.
 */
export const QNN_OBSERVABLES = ['Z0','Z1','Z2','Z3','Z0Z1','Z2Z3','Z0Z1Z2Z3'];
const isVector = value => Array.isArray(value) || ArrayBuffer.isView(value);
function vector(value, length, name) {
  if (!isVector(value) || (length != null && value.length !== length) || !Array.from(value).every(Number.isFinite)) throw new TypeError(name+' must contain finite numbers'+(length == null ? '.' : ' with length '+length+'.'));
  return Array.from(value);
}
function fraction(progress) { if (!Number.isFinite(progress) || progress < 0 || progress > 1) throw new RangeError('Gate progress must be within0..1.'); return progress; }
function qubit(q) { if (!Number.isInteger(q) || q < 0 || q > 3) throw new RangeError('Qubit must be an integer within0..3.'); return q; }
export function zeroQNNState() { const re = new Float64Array(16), im = new Float64Array(16); re[0] = 1; return {re, im}; }
function stateCopy(state) {
  const re = Float64Array.from(vector(state?.re,16,'State real amplitudes')), im = Float64Array.from(vector(state?.im,16,'State imaginary amplitudes'));
  let norm = 0; for (let i=0;i<16;i++) norm += re[i]**2+im[i]**2;
  if (Math.abs(norm-1)>1e-9) throw new RangeError('State must be normalized.');
  return {re,im};
}

/** Apply a rotation's fractional angle or a CNOT endpoint, without mutating input. */
export function applyQNNGate(state, gate, progress=1) {
  fraction(progress); const {re,im}=stateCopy(state);
  if (gate?.kind==='ry') {
    const q=qubit(gate.qubit); if (!Number.isFinite(gate.angle)) throw new TypeError('Rotation angle must be finite.');
    const mask=1<<q,c=Math.cos(gate.angle*progress/2),s=Math.sin(gate.angle*progress/2);
    for (let a=0;a<16;a++) if (!(a&mask)) { const b=a|mask,ar=re[a],ai=im[a],br=re[b],bi=im[b]; re[a]=c*ar-s*br;im[a]=c*ai-s*bi;re[b]=s*ar+c*br;im[b]=s*ai+c*bi; }
  } else if (gate?.kind==='rz') {
    const q=qubit(gate.qubit); if (!Number.isFinite(gate.angle)) throw new TypeError('Rotation angle must be finite.');
    const c=Math.cos(gate.angle*progress/2),sn=Math.sin(gate.angle*progress/2);
    for (let i=0;i<16;i++) { const s=(i&(1<<q))?sn:-sn,r=re[i],j=im[i];re[i]=c*r-s*j;im[i]=s*r+c*j; }
  } else if (gate?.kind==='cx') {
    const control=qubit(gate.control),target=qubit(gate.target); if (control===target) throw new RangeError('CNOT wires must differ.');
    // Intermediate display frames hold the exact input; there is no claimed CNOT path.
    if (progress===1) for (let a=0;a<16;a++) if ((a&(1<<control))&&!(a&(1<<target))) { const b=a|(1<<target);[re[a],re[b]]=[re[b],re[a]];[im[a],im[b]]=[im[b],im[a]]; }
  } else throw new TypeError('Gate kind must be ry, rz or cx.');
  return {re,im};
}

/** Exactly the production encoding, trained rotations, and ordered CNOT ring. */
export function buildQNNGates(features, theta) {
  features=vector(features,8,'Features');theta=vector(theta,null,'Circuit angles');
  if (!theta.length || theta.length%8) throw new RangeError('Circuit angles must have positive length divisible by8.');
  const gates=[];let p=0;
  const add=gate=>gates.push({index:gates.length,...gate});
  for (let layer=0;layer<theta.length/8;layer++) {
    for (let q=0;q<4;q++) {
      add({layer,phase:'encoding',kind:'ry',qubit:q,angle:Math.PI*features[q],featureIndex:q,label:'RY(πx'+q+')'});
      add({layer,phase:'encoding',kind:'rz',qubit:q,angle:Math.PI*features[q+4],featureIndex:q+4,label:'RZ(πx'+(q+4)+')'});
    }
    for (let q=0;q<4;q++) {
      add({layer,phase:'trained',kind:'ry',qubit:q,angle:theta[p],parameterIndex:p,label:'RY(θ'+p+')'});p++;
      add({layer,phase:'trained',kind:'rz',qubit:q,angle:theta[p],parameterIndex:p,label:'RZ(θ'+p+')'});p++;
    }
    for (const [control,target] of [[0,1],[1,2],[2,3],[3,0]]) add({layer,phase:'entangling',kind:'cx',control,target,label:'CX '+control+'→'+target,interpolation:'endpoint-only'});
  }
  return gates;
}

/** Partial trace, exact basis probabilities, and actual Z-product observables. */
export function summarizeQNNState(inputState) {
  const state=stateCopy(inputState),{re,im}=state,probabilities=Float64Array.from(re,(r,i)=>r*r+im[i]*im[i]);
  const expectations=Array(7).fill(0),pairs=[];
  for (let i=0;i<16;i++) {
    const z=[0,1,2,3].map(q=>(i&(1<<q))?-1:1),obs=[...z,z[0]*z[1],z[2]*z[3],z[0]*z[1]*z[2]*z[3]];
    obs.forEach((v,k)=>{expectations[k]+=probabilities[i]*v;});
  }
  const qubits=Array.from({length:4},(_,q)=>{
    const mask=1<<q;let p0=0,p1=0,cr=0,ci=0;
    for (let a=0;a<16;a++) if (!(a&mask)) {const b=a|mask;p0+=probabilities[a];p1+=probabilities[b];cr+=re[a]*re[b]+im[a]*im[b];ci+=im[a]*re[b]-re[a]*im[b];}
    const bloch={x:2*cr,y:-2*ci,z:p0-p1},length=Math.hypot(bloch.x,bloch.y,bloch.z);
    return {qubit:q,reducedDensity:[[{re:p0,im:0},{re:cr,im:ci}],[{re:cr,im:-ci},{re:p1,im:0}]],bloch,length,purity:p0*p0+p1*p1+2*(cr*cr+ci*ci)};
  });
  for (let a=0;a<4;a++) for (let b=a+1;b<4;b++) {
    let zz=0;for (let i=0;i<16;i++) zz+=probabilities[i]*((i&(1<<a))?-1:1)*((i&(1<<b))?-1:1);
    pairs.push({qubits:[a,b],zz,connected:zz-expectations[a]*expectations[b]});
  }
  return {state,probabilities,qubits,expectations,observableNames:QNN_OBSERVABLES.slice(),correlations:pairs,
    norm:probabilities.reduce((a,b)=>a+b,0),basis:Array.from({length:16},(_,i)=>({index:i,bitstring:i.toString(2).padStart(4,'0'),real:re[i],imaginary:im[i],probability:probabilities[i],phase:Math.atan2(im[i],re[i])}))};
}

/** Save full-state gate endpoints, then reproduce the production classical readout. */
export function traceQNN(features, modelOrTheta) {
  const hasModel=!isVector(modelOrTheta),model=hasModel?modelOrTheta:null,theta=hasModel?model?.theta:modelOrTheta;
  const gates=buildQNNGates(features,theta),layers=theta.length/8;
  if (hasModel && (model.qubits!=null&&model.qubits!==4 || model.layers!=null&&model.layers!==layers)) throw new RangeError('Model metadata must match the four-qubit circuit angle count.');
  const states=[zeroQNNState()];for (const gate of gates) states.push(applyQNNGate(states.at(-1),gate));
  const final=summarizeQNNState(states.at(-1));let logit=null,score=null;
  if (hasModel) {const readout=vector(model.readout,7,'Readout');if (!Number.isFinite(model.bias)) throw new TypeError('Readout bias must be finite.');logit=model.bias;final.expectations.forEach((z,k)=>{logit+=z*readout[k];});score=1/(1+Math.exp(-Math.max(-40,Math.min(40,logit))));}
  return {qubits:4,layers,features:Array.from(features),theta:Array.from(theta),gates,states,initialState:states[0],finalState:states.at(-1),final,expectations:final.expectations,logit,score};
}

/** gateIndex===gates.length requests final state. CNOT uses exact endpoints only. */
export function getQNNFrame(trace,gateIndex,progress=0) {
  fraction(progress);if (!Number.isInteger(gateIndex)||gateIndex<0||gateIndex>trace.gates.length) throw new RangeError('Gate index is outside the trace.');
  const gate=trace.gates[gateIndex]||null,effectiveProgress=gate?.kind==='cx'?(progress===1?1:0):progress;
  const state=gate?applyQNNGate(trace.states[gateIndex],gate,progress):trace.finalState;
  return {...summarizeQNNState(state),gate,gateIndex,gateProgress:progress,effectiveProgress,
    completedGates:gateIndex+(gate&&effectiveProgress===1?1:0),interpolation:gate?(gate.kind==='cx'?'endpoint-only':'fractional-angle'):'final'};
}
