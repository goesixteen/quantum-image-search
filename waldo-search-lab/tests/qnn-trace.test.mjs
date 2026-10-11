import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {quantumReadout,predict} from '../dist/qnn.js';
import {zeroQNNState,applyQNNGate,buildQNNGates,summarizeQNNState,traceQNN,getQNNFrame} from '../dist/qnn-trace.js';
const near=(a,b,tolerance=2e-13)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const stateNear=(a,b)=>{a.re.forEach((v,i)=>near(v,b.re[i]));a.im.forEach((v,i)=>near(v,b.im[i]));};

test('all trained saved held-out readouts and detector scores match independent NumPy fixtures',()=>{
  const model=JSON.parse(fs.readFileSync(new URL('../qollab/model.json',import.meta.url))),fixture=JSON.parse(fs.readFileSync(new URL('../qollab/heldout-feature-fixture.json',import.meta.url)));
  for(const row of fixture.fixtures){const trace=traceQNN(row.features,model);trace.expectations.forEach((z,i)=>near(z,row.expectedReadouts[i]));near(trace.score,row.expectedProbability);near(trace.score,predict(row.features,model));assert.equal(trace.gates.length,80);assert.equal(trace.states.length,81);}
});

test('trace follows production inference for arbitrary positive multiple-of-eight theta lengths',()=>{
  const features=[.1,.4,.8,.2,.9,.0,.7,.3];
  for(const count of [8,16,24,32,40]){const theta=Array.from({length:count},(_,i)=>3*Math.sin(i+.37)),trace=traceQNN(features,theta),expected=quantumReadout(features,theta);trace.expectations.forEach((z,i)=>near(z,expected[i]));assert.equal(trace.layers,count/8);assert.equal(trace.gates.length,count/8*20);assert.equal(trace.score,null);near(trace.final.norm,1);}
});

test('gate labels retain repeated input encoding, parameter indices, and exact ring ordering',()=>{
  const features=[.2,.3,.4,.5,.6,.7,.8,.9],theta=Array.from({length:16},(_,i)=>i/10),gates=buildQNNGates(features,theta);
  for(let layer=0;layer<2;layer++){
    const group=gates.slice(layer*20,(layer+1)*20);
    assert.deepEqual(group.slice(0,8).map(g=>g.featureIndex),[0,4,1,5,2,6,3,7]);
    group.slice(0,8).forEach(g=>near(g.angle,Math.PI*features[g.featureIndex]));
    assert.deepEqual(group.slice(8,16).map(g=>g.parameterIndex),Array.from({length:8},(_,i)=>layer*8+i));
    assert.deepEqual(group.slice(16).map(g=>[g.control,g.target]),[[0,1],[1,2],[2,3],[3,0]]);
  }
});

test('Bell pair has zero local Bloch vectors, mixed reduced states, and joint correlation',()=>{
  let state=applyQNNGate(zeroQNNState(),{kind:'ry',qubit:0,angle:Math.PI/2});state=applyQNNGate(state,{kind:'cx',control:0,target:1});const summary=summarizeQNNState(state);
  near(summary.probabilities[0],.5);near(summary.probabilities[3],.5);
  for(const q of [0,1]){near(summary.qubits[q].length,0);near(summary.qubits[q].purity,.5);near(summary.qubits[q].reducedDensity[0][0].re,.5);near(summary.qubits[q].reducedDensity[1][1].re,.5);}
  for(const q of [2,3]){near(summary.qubits[q].bloch.z,1);near(summary.qubits[q].purity,1);}
  near(summary.correlations.find(p=>p.qubits.join() === '0,1').connected,1);
  // Same local spheres as a classical 00/11 mixture cannot specify the Bell phase.
  const phaseFlipped={re:Float64Array.from(state.re),im:Float64Array.from(state.im)};phaseFlipped.re[3]*=-1;
  assert.deepEqual(summarizeQNNState(phaseFlipped).qubits,summary.qubits);assert.notDeepEqual(phaseFlipped,state);
});

test('fractional rotations have normalized actual states and analytic Bloch coordinates including positive Y',()=>{
  const angle=2.3;
  for(const t of [0,.25,.5,.75,1]){
    const rotated=applyQNNGate(zeroQNNState(),{kind:'ry',qubit:2,angle},t),summary=summarizeQNNState(rotated),b=summary.qubits[2].bloch;
    near(summary.norm,1);near(b.x,Math.sin(t*angle));near(b.y,0);near(b.z,Math.cos(t*angle));near(summary.qubits[2].purity,1);
    const phase=applyQNNGate(rotated,{kind:'rz',qubit:2,angle:1.1},t),p=summarizeQNNState(phase).qubits[2].bloch;
    near(p.x,Math.sin(t*angle)*Math.cos(t*1.1));near(p.y,Math.sin(t*angle)*Math.sin(t*1.1));near(p.z,Math.cos(t*angle));
  }
  const plus=applyQNNGate(zeroQNNState(),{kind:'ry',qubit:0,angle:Math.PI/2}),plusI=applyQNNGate(plus,{kind:'rz',qubit:0,angle:Math.PI/2});near(summarizeQNNState(plusI).qubits[0].bloch.y,1);
});

test('local rotations of an entangled state preserve reduced purities',()=>{
  const bell=applyQNNGate(applyQNNGate(zeroQNNState(),{kind:'ry',qubit:0,angle:Math.PI/2}),{kind:'cx',control:0,target:1});
  const before=summarizeQNNState(bell),after=summarizeQNNState(applyQNNGate(bell,{kind:'ry',qubit:0,angle:.73},.41));
  after.qubits.forEach((q,i)=>near(q.purity,before.qubits[i].purity));near(after.norm,1);
});

test('CNOT displays exact endpoints and permutes complex amplitudes without invented fractional states',()=>{
  const raw=Array.from({length:16},(_,i)=>[Math.sin(i+.1),Math.cos(i*.7)]),norm=Math.sqrt(raw.reduce((s,[r,j])=>s+r*r+j*j,0)),state={re:Float64Array.from(raw,v=>v[0]/norm),im:Float64Array.from(raw,v=>v[1]/norm)},gate={kind:'cx',control:2,target:0};
  for(const t of [0,.1,.5,.999])stateNear(applyQNNGate(state,gate,t),state);
  const after=applyQNNGate(state,gate,1);for(let i=0;i<16;i++){const output=(i&4)?i^1:i;near(after.re[output],state.re[i]);near(after.im[output],state.im[i]);}stateNear(applyQNNGate(after,gate),state);
  const trace=traceQNN([.2,.3,.4,.5,.6,.7,.8,.9],Array(8).fill(.3));assert.equal(getQNNFrame(trace,16,.5).interpolation,'endpoint-only');assert.equal(getQNNFrame(trace,16,.5).effectiveProgress,0);stateNear(getQNNFrame(trace,16,1).state,trace.states[17]);stateNear(getQNNFrame(trace,20).state,trace.finalState);
});

test('reduced-density matrices remain physical throughout every gate and intermediate rotation',()=>{
  const trace=traceQNN([.2,.4,.6,.8,.1,.3,.5,.7],Array.from({length:32},(_,i)=>Math.sin(i)*2));
  for(let i=0;i<trace.gates.length;i++)for(const t of [.0,.43,1]){
    const frame=getQNNFrame(trace,i,t);near(frame.norm,1);
    for(const q of frame.qubits){const rho=q.reducedDensity;near(rho[0][0].re+rho[1][1].re,1);near(rho[0][1].re,rho[1][0].re);near(rho[0][1].im,-rho[1][0].im);assert.ok(q.length<=1+1e-12);assert.ok(q.purity>=.5-1e-12&&q.purity<=1+1e-12);near(q.bloch.z,frame.expectations[q.qubit]);}
  }
});

test('trace rejects incompatible circuit/readout metadata and invalid interpolation inputs',()=>{
  const f=Array(8).fill(.1),theta=Array(32).fill(.2),model={theta,readout:Array(7).fill(.3),bias:.1,qubits:4,layers:4};
  assert.throws(()=>traceQNN(f,{...model,qubits:3}));assert.throws(()=>traceQNN(f,{...model,layers:3}));assert.throws(()=>traceQNN(f,{...model,readout:[1]}));assert.throws(()=>traceQNN(f,[NaN,...theta.slice(1)]));assert.throws(()=>traceQNN(f,Array(7).fill(0)));
  const trace=traceQNN(f,theta);for(const t of [-.1,1.01,NaN])assert.throws(()=>getQNNFrame(trace,0,t));assert.throws(()=>getQNNFrame(trace,-1));assert.throws(()=>applyQNNGate(zeroQNNState(),{kind:'cx',control:0,target:0}));
});
