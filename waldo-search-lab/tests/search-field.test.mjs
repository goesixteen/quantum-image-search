import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCandidateField,buildSearchDisplayField,colorizeField} from '../dist/search-field.js';
import {simulateGrover} from '../dist/quantum.js';
import {prepareTemplate,matchTemplate} from '../dist/search-core.js';
const vector=(grid,value=0)=>Array(grid**2).fill(value);
const near=(a,b,tolerance=1e-12)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} vs ${b}`);
const finiteRange=a=>a.forEach(v=>assert.ok(Number.isFinite(v)&&v>=0&&v<=1));

test('full-lattice detector field is finite and localized at supplied interior evidence',()=>{
  const scores=vector(8);scores[3*8+5]=.8;
  const f=buildCandidateField({candidateScores:scores,grid:8,fieldSize:128});
  finiteRange(f.values);finiteRange(f.intensities);assert.equal(f.values.length,128**2);
  assert.ok(Math.abs(f.peak.x+.5-(5+.5)*16)<=1);assert.ok(Math.abs(f.peak.y+.5-(3+.5)*16)<=1);
  assert.ok(f.values[f.peak.y*128+f.peak.x]>f.values[f.peak.y*128+f.peak.x+10]);
  assert.ok(f.maximum<=.8);assert.equal(f.values[0],0);assert.ok(f.displayOnly);assert.match(f.label,/not calibrated/);
});

test('zero and constant detector evidence stay flat without fabricated objects',()=>{
  for(const level of [0,.03,.4,1]) {
    const f=buildCandidateField({candidateScores:vector(16,level),grid:16,fieldSize:96});
    assert.ok(f.isFlat);f.values.forEach(v=>near(v,level));f.intensities.forEach(v=>near(v,level**.6));assert.equal(f.hasEvidence,level>0);
  }
});

test('fixed score scale keeps weak evidence weak, with no max stretching',()=>{
  const strong=vector(8);strong[27]=.8;const weak=strong.map(v=>v/20);
  const a=buildCandidateField({candidateScores:strong,grid:8}),b=buildCandidateField({candidateScores:weak,grid:8});
  a.values.forEach((v,i)=>near(v/20,b.values[i]));assert.ok(Math.max(...b.intensities)<Math.max(...a.intensities)/3);
});

test('edge kernels are clipped rather than wrapping evidence around the scene',()=>{
  const scores=vector(8);scores[0]=1;const f=buildCandidateField({candidateScores:scores,grid:8,fieldSize:64});
  assert.ok(f.values[0]>0);assert.equal(f.values[63],0);assert.equal(f.values[63*64],0);assert.equal(f.values[4095],0);
});

test('uniform quantum state and no-evidence crossfades remain flat at every progress',()=>{
  const candidate=buildCandidateField({candidateScores:vector(8),grid:8}),probabilities=vector(8,1/64);
  for(const progress of [0,.1,.5,1]) {
    const f=buildSearchDisplayField({candidateField:candidate,probabilities,grid:8,progress});
    finiteRange(f.values);assert.ok(f.isFlat);assert.ok(f.exactUniform);near(f.maximum,Math.log(2)/Math.log(65)*f.blend);
  }
});

test('actual Grover frames produce display peaks while exact Born probabilities are retained',()=>{
  const frame=simulateGrover(64,[27],5).history.at(-1),original=frame.probabilities.slice();
  const f=buildSearchDisplayField({probabilities:frame.probabilities,grid:8,fieldSize:128,phase:'probability'});
  finiteRange(f.intensities);assert.ok(Math.abs(f.peak.x+.5-56)<=1);assert.ok(Math.abs(f.peak.y+.5-56)<=1);
  assert.deepEqual(Array.from(f.exactProbabilities),original);near(f.exactProbabilities.reduce((a,b)=>a+b),1);
  assert.ok(f.exactProbabilities!==frame.probabilities);assert.deepEqual(frame.probabilities,original);
  assert.notEqual(f.values.length,f.exactProbabilities.length);assert.match(f.units,/not Born probability/);
});

test('candidate-to-probability crossfade has deterministic endpoints and midpoint',()=>{
  const scores=vector(8);scores[27]=.9;const candidate=buildCandidateField({candidateScores:scores,grid:8}),probabilities=simulateGrover(64,[27],2).history.at(-1).probabilities;
  const a=buildSearchDisplayField({candidateField:candidate,probabilities,grid:8,phase:'candidate'}),b=buildSearchDisplayField({candidateField:candidate,probabilities,grid:8,phase:'probability'}),mid=buildSearchDisplayField({candidateField:candidate,probabilities,grid:8,progress:.5});
  assert.deepEqual(a.values,candidate.intensities);assert.deepEqual(b.values,b.probabilityIntensities);near(mid.blend,.5);
  mid.values.forEach((v,i)=>near(v,(a.values[i]+b.values[i])/2));
  assert.deepEqual(mid.values,buildSearchDisplayField({candidateField:candidate,probabilities,grid:8,progress:.5}).values);
});

test('snapshot transitions interpolate only display data, leaving current state exact',()=>{
  const previous=vector(4,1/16),current=vector(4);current[5]=1;
  const f=buildSearchDisplayField({probabilities:current,previousProbabilities:previous,grid:4,roundProgress:.25,phase:'probability'});
  f.displayProbabilities.forEach((v,i)=>near(v,.75*previous[i]+.25*current[i]));assert.deepEqual(Array.from(f.exactProbabilities),current);
  assert.match(f.label,/snapshot\/evidence crossfades/);near(f.displayProbabilities.reduce((a,b)=>a+b),1);
});

test('colorized display has bounded channels and evidence-free transparency',()=>{
  const f=buildCandidateField({candidateScores:vector(4),grid:4,fieldSize:32}),rgba=colorizeField(f);
  assert.equal(rgba.length,32*32*4);for(let i=3;i<rgba.length;i+=4)assert.equal(rgba[i],0);
  const scores=vector(4);scores[5]=1;const g=buildCandidateField({candidateScores:scores,grid:4,fieldSize:32}),c=colorizeField(g,{opacity:.5});
  assert.ok(c.some((v,i)=>i%4===3&&v>0));for(let i=3;i<c.length;i+=4)assert.ok(c[i]<=128);
});

test('input shape, range and quantum normalization are validated',()=>{
  assert.throws(()=>buildCandidateField({candidateScores:[1],grid:4}),/entries/);
  assert.throws(()=>buildCandidateField({candidateScores:'0'.repeat(16),grid:4}),/numeric entries/);
  assert.throws(()=>buildCandidateField({candidateScores:vector(4,NaN),grid:4}),/within/);
  assert.throws(()=>buildCandidateField({candidateScores:vector(4),grid:4,sigmaCells:0}),/sigma/);
  assert.throws(()=>buildSearchDisplayField({probabilities:vector(4,0),grid:4}),/sum/);
  assert.throws(()=>buildSearchDisplayField({probabilities:vector(4,1/16),grid:4,progress:2}),/progress/);
  assert.throws(()=>buildSearchDisplayField({probabilities:vector(4,1/16),grid:4,phase:'invent'}),/phase/);
  assert.throws(()=>buildSearchDisplayField({candidateField:{grid:4,width:128,height:128,intensities:[1]},probabilities:vector(4,1/16),grid:4}),/entries/);
  assert.throws(()=>colorizeField({}),/field/);
});

test('score input arrays are copied and never overwritten',()=>{
  const scores=new Float32Array(16);scores[5]=.5;const before=Array.from(scores),f=buildCandidateField({candidateScores:scores,grid:4});
  assert.deepEqual(Array.from(scores),before);scores[5]=0;assert.equal(f.sourceScores[5],.5);assert.ok(f.maximum>0);
});

test('color exposure is bounded, fixed and leaves alpha/field/state data untouched',()=>{
  const scores=vector(4);scores[5]=.8;const candidate=buildCandidateField({candidateScores:scores,grid:4,fieldSize:32});
  const f=buildSearchDisplayField({candidateField:candidate,probabilities:simulateGrover(16,[5],2).history.at(-1).probabilities,grid:4,fieldSize:32});
  const snapshots=[f.values.slice(),f.intensities.slice(),f.exactProbabilities.slice(),f.probabilityValues.slice()];
  const original=colorizeField(f),explicit=colorizeField(f,{exposure:1}),bright=colorizeField(f,{exposure:1.8});
  assert.deepEqual(original,explicit);for(let i=3;i<original.length;i+=4)assert.equal(bright[i],original[i]);
  [f.values,f.intensities,f.exactProbabilities,f.probabilityValues].forEach((array,i)=>assert.deepEqual(array,snapshots[i]));
  assert.throws(()=>colorizeField(f,{exposure:0}),/exposure/);assert.throws(()=>colorizeField(f,{exposure:4.1}),/exposure/);assert.throws(()=>colorizeField(f,{exposure:NaN}),/exposure/);
  const zero=buildCandidateField({candidateScores:vector(4),grid:4,fieldSize:8});
  for(const exposure of [.25,1,1.8,4]){const c=colorizeField(zero,{exposure});for(let i=3;i<c.length;i+=4)assert.equal(c[i],0);assert.deepEqual(c,colorizeField(zero));}
});

test('exposure follows the same monotonic palette key with a fixed saturation point',()=>{
  // Known palette stops: a higher fixed exposure moves the same intensity
  // farther along this key; channels themselves need not be monotonic.
  const f={width:5,height:1,intensities:new Float64Array([0,.1,.2,.3,.5])};
  const c=colorizeField(f,{exposure:2,opacity:1,transparentZero:false});
  const stops=[[22,57,116],[27,136,161],[68,200,175],[251,209,86],[255,245,211]];
  stops.forEach((rgb,i)=>assert.deepEqual(Array.from(c.slice(i*4,i*4+3)),rgb));
  const saturated=colorizeField({width:3,height:1,intensities:new Float64Array([.5,.75,1])},{exposure:2});
  for(let i=0;i<3;i++)assert.deepEqual(Array.from(saturated.slice(i*4,i*4+3)),[255,245,211]);
});

test('actual template registration output supplies evidence, with flat absent-scene field',()=>{
  const image=(w,h,fn)=>{const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)data.set(fn(x,y),(y*w+x)*4);return{width:w,height:h,data};};
  const background=image(32,32,()=>[190,210,215,255]),target=image(8,8,(x,y)=>(x+y)%2?[255,35,30,255]:[250,250,250,255]),scene=image(32,32,(x,y)=>x>=12&&x<20&&y>=16&&y<24?Array.from(target.data.slice(((y-16)*8+x-12)*4,((y-16)*8+x-12)*4+4)):[190,210,215,255]);
  const template=prepareTemplate(target,{sampleCount:64}),present=matchTemplate(scene,template,{grid:8,backgroundImageData:background}),absent=matchTemplate(background,template,{grid:8,backgroundImageData:background});
  assert.ok(present.marks.length);const f=buildCandidateField({candidateScores:present.candidates.map(c=>c.registrationScore),grid:8,fieldSize:64,source:'template registration score'});
  assert.ok(f.maximum>0);assert.ok(Math.abs((f.peak.x+.5)/2-16)<4);assert.ok(Math.abs((f.peak.y+.5)/2-20)<4);
  const empty=buildCandidateField({candidateScores:absent.candidates.map(c=>c.registrationScore),grid:8});assert.ok(empty.isFlat);assert.equal(empty.maximum,0);assert.equal(absent.marks.length,0);
});
