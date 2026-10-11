import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCandidateField,buildSearchDisplayField,colorizeField} from '../dist/search-field.js';
import {simulateGrover} from '../dist/quantum.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<2e-13,`${a} != ${b}`);
const build=(candidateScores,grid=64,extra={})=>buildCandidateField({candidateScores,grid,fieldSize:128,sigmaCells:2.25,scorePower:1,interpolationMode:'envelope',...extra});
const at=(field,col,row)=>field.values[(row*2)*128+col*2];

test('an isolated.99 score outranks a broad.20 region whose old Gaussian average was stronger',()=>{
  const scores=new Float64Array(4096);scores[12*64+12]=.99;
  for(let y=35;y<=51;y++)for(let x=35;x<=51;x++)scores[y*64+x]=.20;
  const average=buildCandidateField({candidateScores:scores,grid:64,fieldSize:128,sigmaCells:2.25,scorePower:1}),envelope=build(scores);
  assert.ok(at(average,12,12)<at(average,43,43),'old average dilutes a narrow peak more than a broad lower-score patch');
  near(at(envelope,12,12),.99);near(at(envelope,43,43),.20);
  assert.ok(at(envelope,12,12)>at(envelope,43,43));assert.ok(envelope.maximum<=.99);assert.equal(envelope.interpolationMode,'envelope');
  assert.match(envelope.label,/Max-Gaussian/);assert.match(envelope.label,/not calibrated/);assert.match(envelope.label,/person similarity/);assert.equal(envelope.displayOnly,true);
});

test('separable max field equals an independent direct two-dimensional kernel enumeration off grid',()=>{
  const grid=7,size=23,sigma=.7,scores=Array.from({length:grid**2},(_,i)=>((i*37)%101)/100),field=build(scores,grid,{fieldSize:size,sigmaCells:sigma});
  for(let py=0;py<size;py++)for(let px=0;px<size;px++) {
    const x=(px+.5)*grid/size-.5,y=(py+.5)*grid/size-.5;let numerator=0,denominator=0;
    for(let row=0;row<grid;row++)for(let col=0;col<grid;col++)if(Math.abs(x-col)<=3*sigma&&Math.abs(y-row)<=3*sigma) {
      const weight=Math.exp(-((x-col)**2+(y-row)**2)/(2*sigma*sigma));
      numerator=Math.max(numerator,scores[row*grid+col]*weight);denominator=Math.max(denominator,weight);
    }
    near(field.values[py*size+px],numerator/denominator);
  }
});

test('constants stay exact at edges and off-grid resolutions without min/max stretching',()=>{
  for(const grid of [1,7,64])for(const size of [1,23,128])for(const level of [0,.03,.4,1]) {
    const field=build(Array(grid**2).fill(level),grid,{fieldSize:size,sigmaCells:.25});
    field.values.forEach(v=>near(v,level));field.intensities.forEach(v=>near(v,level));assert.ok(field.isFlat);assert.equal(field.hasEvidence,level>0);
  }
});

test('strict3sigma support is clipped rather than wrapping from a boundary peak',()=>{
  const scores=new Float64Array(4096);scores[0]=.8;const field=build(scores,64,{sigmaCells:1});
  near(field.values[0],.8);assert.equal(field.values[127],0);assert.equal(field.values[127*128],0);assert.equal(field.values.at(-1),0);
  assert.ok(field.values[6]>0,'x=2.75cells is within the first-column3sigma support');assert.equal(field.values[7],0,'x=3.25cells is outside3sigma');
});

test('separate unequal peaks and duplicate copies preserve local score height, zero space and global bound',()=>{
  const scores=new Float64Array(4096);scores[10*64+10]=.9;scores[42*64+48]=.9;scores[42*64+10]=.4;
  const field=build(scores);near(at(field,10,10),.9);near(at(field,48,42),.9);near(at(field,10,42),.4);assert.equal(at(field,31,26),0);
  for(const value of field.values)assert.ok(Number.isFinite(value)&&value>=0&&value<=.9);
  const weak=build(Array.from(scores,v=>v*.01));field.values.forEach((v,i)=>near(weak.values[i],v*.01));
  const toned=build(scores,64,{scorePower:.35});toned.values.forEach((v,i)=>near(v,field.values[i]));toned.intensities.forEach((v,i)=>near(v,field.values[i]**.35));
});

test('envelope scores remain display data, while Grover assigns equal Born mass to unequal accepted scores',()=>{
  const scores=new Float64Array(4096),a=10*64+10,b=42*64+48;scores[a]=.99;scores[b]=.61;
  const candidate=build(scores),snapshot=simulateGrover(4096,[a,b],35).history.at(-1),before=snapshot.probabilities.slice(),originalScores=scores.slice(),values=candidate.values.slice();
  const display=buildSearchDisplayField({candidateField:candidate,probabilities:snapshot.probabilities,grid:64,phase:'probability'});
  near(at(candidate,10,10),.99);near(at(candidate,48,42),.61);near(snapshot.probabilities[a],snapshot.probabilities[b]);
  assert.deepEqual(Array.from(display.exactProbabilities),before);assert.deepEqual(snapshot.probabilities,before);assert.deepEqual(scores,originalScores);assert.deepEqual(candidate.values,values);
  near(display.probabilityValues[20*128+20],display.probabilityValues[84*128+96]);assert.match(display.units,/not Born probability/);
  colorizeField(candidate,{exposure:1});assert.deepEqual(candidate.values,values);
});

test('average remains the unchanged default, and validation/defensive copies apply to either mode',()=>{
  const scores=new Float32Array(16);scores[5]=.5;
  const defaultField=buildCandidateField({candidateScores:scores,grid:4}),explicitAverage=buildCandidateField({candidateScores:scores,grid:4,interpolationMode:'average'});
  assert.deepEqual(defaultField,explicitAverage);
  const envelope=build(scores,4);scores[5]=0;assert.equal(envelope.sourceScores[5],.5);assert.ok(envelope.maximum>0);
  for(const options of [{interpolationMode:'invented'},{sigmaCells:0},{scorePower:0},{fieldSize:0},{candidateScores:[1]},{candidateScores:Array(16).fill(NaN)},{candidateScores:Array(16).fill(1.01)}])assert.throws(()=>build(Array(16).fill(0),4,options),RangeError);
  const zero=build(Array(16).fill(0),4),rgba=colorizeField(zero);for(let i=3;i<rgba.length;i+=4)assert.equal(rgba[i],0);
});
