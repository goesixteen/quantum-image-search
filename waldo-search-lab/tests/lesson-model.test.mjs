import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {homedir} from 'node:os';
import {createRequire} from 'node:module';
import {addressAt,inspectPredicate,lessonRounds} from '../dist/lesson-model.js';
import {scanQNN} from '../dist/wanda-localizer.js';
import {bitstring,oracle,recommendIterations,simulateGrover} from '../dist/quantum.js';

const require=createRequire(import.meta.url);
let canvas;
try { canvas=require('@napi-rs/canvas'); }
catch { canvas=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas')); }
const model=JSON.parse(fs.readFileSync(new URL('../dist/model/wanda-qnn.json',import.meta.url)));
const heldout=JSON.parse(fs.readFileSync(new URL('../model/wanda-qnn/held-out-trace-fixtures.json',import.meta.url)));
const row=heldout.fixtures[0];
// The saved final-composite PNG is the only visual scanner input. Row metadata
// supplies the declared target size; labels/renderer positions never reach it.
const image=await canvas.loadImage(fs.readFileSync(new URL('../model/wanda-qnn/'+row.fixture,import.meta.url)));
const sceneCanvas=canvas.createCanvas(image.width,image.height),ctx=sceneCanvas.getContext('2d');
ctx.drawImage(image,0,0);
const rgba=ctx.getImageData(0,0,image.width,image.height);
const scanOptions={targetWidth:row.targetWidth,targetHeight:row.targetHeight,batchSize:4096};
const coarse=await scanQNN(rgba,model,{...scanOptions,grid:4});
const fine=await scanQNN(rgba,model,{...scanOptions,grid:64});
const inspect=(result,selected,windowScore,extra={})=>inspectPredicate({grid:result.geometry.grid,selected,windowScore,threshold:model.threshold,scores:result.scores,candidates:result.candidates,marks:result.marks,nmsRadius:result.diagnostics.nmsRadius,...extra});
const finePoint=index=>({x:4+8*(index%64),y:4+8*Math.floor(index/64)});
const windowIndex=({x,y})=>((y-4)/8)*64+(x-4)/8;
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<2e-13,`${actual} != ${expected}`);
function fixture(grid=4) {
  const N=grid*grid,width=512/grid;
  return {grid,scores:new Float64Array(N),candidates:Array.from({length:N},(_,index)=>({index,bestX:(index%grid+.5)*width,bestY:(Math.floor(index/grid)+.5)*width,score:0})),marks:[],selected:{x:width/2,y:width/2},windowScore:0,threshold:.5,nmsRadius:12};
}

test('actual Wanda RGB fine-window scores aggregate to each coarse address maximum and its representative',t=>{
  assert.equal(coarse.diagnostics.scoreEvaluations,4096);
  assert.equal(coarse.scores.length,16);
  assert.deepEqual(Array.from(coarse.windowScores),Array.from(fine.windowScores));
  // Independent coordinate-bin enumeration, rather than deriving an expected
  // maximum from the scanner's already-aggregated candidates/scores.
  for(let address=0;address<16;address++) {
    const column=address%4,rowIndex=Math.floor(address/4),indices=[];
    for(let row=16*rowIndex;row<16*(rowIndex+1);row++)for(let col=16*column;col<16*(column+1);col++)indices.push(row*64+col);
    const maximum=Math.max(...indices.map(i=>fine.windowScores[i]));
    const firstMaximum=indices.find(i=>fine.windowScores[i]===maximum);
    assert.equal(coarse.scores[address],maximum);
    assert.equal(coarse.candidates[address].windowIndex,firstMaximum);
    assert.deepEqual({x:coarse.candidates[address].bestX,y:coarse.candidates[address].bestY},finePoint(firstMaximum));
  }
  const accepted=coarse.marks[0];
  assert.ok(Number.isInteger(accepted),'frozen pixel fixture has an accepted coarse address');
  const lowerWindows=Array.from(fine.windowScores,(score,index)=>({score,index,point:finePoint(index)}))
    .filter(item=>addressAt(item.point.x,item.point.y,4).index===accepted&&item.score<model.threshold);
  const selected=lowerWindows.reduce((a,b)=>a.score<b.score?a:b);
  const explanation=inspect(coarse,selected.point,selected.score);
  assert.equal(explanation.index,accepted);
  assert.equal(explanation.windowScore,selected.score);
  assert.equal(explanation.addressScore,coarse.scores[accepted]);
  assert.equal(explanation.scorePass,false);
  assert.equal(explanation.addressPass,true);
  assert.equal(explanation.accepted,true);
  assert.equal(explanation.representative,false);
  assert.equal(explanation.qubits,4);
  assert.equal(coarse.geometry.pointTolerance,Math.hypot(8,8)/2+1,'coarse addressing retains the fixed fine-window localization tolerance');
  t.diagnostic(JSON.stringify({selected: selected.point,selectedScore:selected.score,address:accepted,addressScore:explanation.addressScore,representative:explanation.bestPoint,fixedPointTolerance:coarse.geometry.pointTolerance}));
});

test('actual threshold-passing fine window can have f(j)=0 after score-ranked NMS',t=>{
  const suppressed=fine.candidates.find(candidate=>candidate.score>=model.threshold&&!fine.marks.includes(candidate.index));
  assert.ok(suppressed,'the frozen raster has a real neighboring high-score window');
  const explanation=inspect(fine,{x:suppressed.bestX,y:suppressed.bestY},suppressed.score);
  assert.equal(explanation.scorePass,true);
  assert.equal(explanation.addressPass,true);
  assert.equal(explanation.representative,true);
  assert.equal(explanation.accepted,false);
  assert.ok(fine.marks.includes(explanation.suppressor));
  const kept=fine.candidates[explanation.suppressor];
  assert.ok(kept.score>=suppressed.score);
  assert.ok(Math.hypot(kept.bestX-suppressed.bestX,kept.bestY-suppressed.bestY)<=fine.diagnostics.nmsRadius);
  assert.equal(explanation.aboveThresholdCount,fine.diagnostics.acceptedBeforeNMS);
  assert.equal(explanation.acceptedCount,fine.marks.length);
  const amplitude=Array(4096).fill(1/64),flipped=oracle(amplitude,fine.marks);
  assert.equal(flipped[suppressed.index],amplitude[suppressed.index],'passing the detector threshold alone does not define the phase flip');
  assert.equal(flipped[kept.index],-amplitude[kept.index]);
  t.diagnostic(JSON.stringify({thresholdPassing:suppressed.index,accepted:explanation.suppressor,distance:Math.hypot(kept.bestX-suppressed.bestX,kept.bestY-suppressed.bestY)}));
});

test('suppression explanation follows score priority, inclusive radius, and index tie-break rather than mark-array order',()=>{
  const data=fixture(64);
  // Three consecutive fine centers at x4/12/20. The two outer candidates are
  // farther apart than radius8 and both survive; either is a nearby witness
  // for the middle candidate, but only the first-ranked one caused its removal.
  data.selected={x:12,y:4};data.windowScore=.9;data.nmsRadius=8;data.marks=[0,2];
  for(const [index,score] of [[0,.8],[1,.9],[2,1]]) {data.scores[index]=score;data.candidates[index]={index,bestX:4+8*index,bestY:4,score};}
  let explanation=inspectPredicate(data);
  assert.equal(explanation.index,1);assert.equal(explanation.accepted,false);assert.equal(explanation.suppressor,2,'higher score suppresses before a lower-index, later-kept neighbor');
  assert.equal(Math.hypot(data.candidates[2].bestX-data.selected.x,data.candidates[2].bestY-data.selected.y),data.nmsRadius,'equality belongs to the suppressed side of the production NMS rule');
  data.marks.reverse();assert.equal(inspectPredicate(data).suppressor,2,'serialization order is irrelevant to score priority');
  for(const index of [0,1,2]) {data.scores[index]=1;data.candidates[index].score=1;}
  data.windowScore=1;
  explanation=inspectPredicate(data);
  assert.equal(explanation.suppressor,0,'equal scores use the earlier address index, including when supplied marks arrive reversed');
  data.nmsRadius=7.999;
  assert.equal(inspectPredicate(data).suppressor,null,'an out-of-radius neighbor is not offered as a suppression cause');
});

test('selecting the actual coarse representative reports the saved score without changing any predicate inputs',()=>{
  const representative=coarse.candidates[coarse.marks[0]],selected={x:representative.bestX,y:representative.bestY};
  const scoresBefore=Array.from(coarse.scores),marksBefore=coarse.marks.slice(),candidatesBefore=structuredClone(coarse.candidates);
  const explanation=inspect(coarse,selected,fine.windowScores[windowIndex(selected)]);
  assert.equal(explanation.representative,true);
  assert.equal(explanation.windowScore,explanation.addressScore);
  assert.deepEqual(explanation.bestPoint,selected);
  assert.equal(explanation.accepted,true);
  assert.deepEqual(Array.from(coarse.scores),scoresBefore);
  assert.deepEqual(coarse.marks,marksBefore);
  assert.deepEqual(coarse.candidates,candidatesBefore);
});

test('the supplied accepted set, not a score reconstruction or argmax, is the explained phase predicate',()=>{
  const data=fixture();data.windowScore=.9;data.scores[0]=.9;data.candidates[0].score=.9;
  let explanation=inspectPredicate(data);
  assert.equal(explanation.addressPass,true);assert.equal(explanation.accepted,false);assert.equal(explanation.suppressor,null);
  // Deliberately supplied different acceptance proves this module explains the
  // saved predicate; it does not silently recompute or repair the detector.
  data.scores[0]=.1;data.windowScore=.1;data.candidates[0].score=.1;data.marks=[0];
  explanation=inspectPredicate(data);
  assert.equal(explanation.scorePass,false);assert.equal(explanation.addressPass,false);assert.equal(explanation.accepted,true);
  const state=Array(16).fill(.25);assert.equal(oracle(state,data.marks)[explanation.index],-.25);
});

test('an unbuilt oracle is distinct from a scored genuine empty accepted set',()=>{
  const data=fixture();
  const unbuilt=inspectPredicate({...data,scores:null,candidates:null});
  assert.equal(unbuilt.built,false);assert.equal(unbuilt.N,16);
  assert.equal(Object.hasOwn(unbuilt,'accepted'),false);assert.equal(Object.hasOwn(unbuilt,'acceptedCount'),false);
  const oneMissing=inspectPredicate({...data,candidates:null});assert.equal(oneMissing.built,false);
  const empty=inspectPredicate(data);
  assert.equal(empty.built,true);assert.equal(empty.accepted,false);assert.equal(empty.acceptedCount,0);assert.equal(empty.aboveThresholdCount,0);
  // No accepted mark is invented even when a saved positive score is supplied.
  const positiveButEmpty=inspectPredicate({...data,windowScore:.95,scores:Float64Array.from(data.scores,(_,i)=>i===0?.95:0)});
  assert.equal(positiveButEmpty.built,true);assert.equal(positiveButEmpty.addressPass,true);assert.equal(positiveButEmpty.acceptedCount,0);
});

test('canvas-edge and internal-boundary addressing matches the displayed location register on all supported grids',()=>{
  for(const grid of [4,8,16,32,64]) {
    const width=512/grid,N=grid**2;
    assert.deepEqual(addressAt(0,0,grid),{index:0,row:0,column:0,qubits:Math.log2(N),cellWidth:width});
    assert.equal(addressAt(width-1e-6,width-1e-6,grid).index,0);
    assert.equal(addressAt(width,width,grid).index,grid+1);
    assert.equal(addressAt(512,0,grid).index,grid-1);
    assert.equal(addressAt(0,512,grid).index,N-grid);
    const last=addressAt(512,512,grid);assert.equal(last.index,N-1);assert.equal(last.row,grid-1);assert.equal(last.column,grid-1);
    assert.equal(bitstring(last.index,last.qubits),'1'.repeat(last.qubits));
    assert.equal(addressAt(508,508,grid).index,last.index,'last fine-window center stays inside the last coarse address');
  }
  for(const [x,y,g] of [[-1,0,64],[0,513,64],[NaN,0,64],[0,Infinity,4],[1,1,3]])assert.throws(()=>addressAt(x,y,g),RangeError);
});

test('incompatible saved geometry, threshold, or accepted indices fail rather than describe another oracle',()=>{
  const data=fixture();
  for(const update of [{scores:[]},{candidates:[]},{nmsRadius:-1},{nmsRadius:NaN},{threshold:-.01},{threshold:1.01},{threshold:NaN},{marks:[0,0]},{marks:[16]},{marks:[-.1]},{marks:[1.5]}])assert.throws(()=>inspectPredicate({...data,...update}),RangeError);
});

test('saved empty/full controls stay at their real zero-round peak and preserve their distinct probabilities',()=>{
  for(const N of [16,64,4096])for(const M of [0,N]) {
    const peak=recommendIterations(N,M),controls=lessonRounds(N,M,peak,10);
    assert.deepEqual(controls,{start:0,peak:0,pastPeak:0});
    const trace=simulateGrover(N,Array.from({length:M},(_,i)=>i),controls.pastPeak);
    near(trace.history[0].successProbability,M/N);
    near(trace.history[0].probabilities.reduce((sum,p)=>sum+p,0),1);
  }
});

test('saved past-peak controls select available completed rounds and expose overshoot in the actual simulator',()=>{
  for(const N of [16,64,4096])for(const M of [1,2]) {
    const peak=recommendIterations(N,M),maximum=2*peak+3,controls=lessonRounds(N,M,peak,maximum);
    assert.equal(controls.start,0);assert.equal(controls.peak,peak);assert.equal(controls.pastPeak,2*peak+1);
    const trace=simulateGrover(N,Array.from({length:M},(_,i)=>i),maximum);
    assert.ok(trace.history[controls.pastPeak].successProbability<trace.history[controls.peak].successProbability);
    assert.equal(lessonRounds(N,M,peak,peak+1).pastPeak,peak+1,'the control never selects a round missing from the saved trace');
    assert.equal(lessonRounds(N,M,peak,peak).pastPeak,peak,'there is no invented past-peak snapshot when the saved trace ends at its peak');
  }
  assert.throws(()=>lessonRounds(16,17,0,1),RangeError);
  assert.throws(()=>lessonRounds(16,1,3,2),RangeError);
  assert.throws(()=>lessonRounds(16,1,1.5,4),RangeError);
});
