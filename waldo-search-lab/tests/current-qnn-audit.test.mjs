import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {seededRandom,pointTruth,idealMass,summarize,verifyLearnedMarks,protocolFiles} from '../model/audit-current-qnn.mjs';
import {simulateGrover} from '../dist/quantum.js';

test('independent audit grades point truth and visibility separately from accepted marks',()=>{
  const candidates=[{index:0,bestX:4,bestY:4},{index:1,bestX:12,bestY:4},{index:2,bestX:20,bestY:4}];
  assert.deepEqual([...pointTruth(candidates,{x:8,y:4},true,4)],[0,1]);
  assert.equal(pointTruth(candidates,{x:8,y:4},false,4).size,0);
  assert.deepEqual([...pointTruth(candidates,{x:8,y:4},true,3.99)],[]);
});
test('analytic audit true-point mass agrees with actual statevectors, including unmarked truth',()=>{
  for(const marks of [[],[2],[2,7,9],Array.from({length:16},(_,i)=>i)]){
    const truth=new Set([2,5]),r=idealMass(16,marks,truth);
    if(!marks.length){assert.equal(r.truePointMass,0);assert.equal(r.distribution,null);continue;}
    const f=simulateGrover(16,marks,r.rounds).history.at(-1);
    assert.ok(Math.abs(r.predicateMass-f.successProbability)<1e-12);
    for(let i=0;i<16;i++)assert.ok(Math.abs(r.distribution[i]-f.probabilities[i])<1e-12);
    assert.ok(Math.abs(r.truePointMass-f.probabilities[2]-f.probabilities[5])<1e-12);
  }
});
test('scene summary retains false marks, misses, partial-visibility strata, and abstentions',()=>{
  const row=(observable,visibleFraction,found,falseMarks,marks,index)=>({observable,visibleFraction,found,falseMarks,marks,measurement:{index,correct:found&&index!=null},quantum:{truePointMass:found?.8:0}});
  const r=summarize([row(true,.8,true,0,[0],0),row(true,.1,false,1,[4],4),row(true,.3,false,0,[],null),row(false,0,false,1,[5],5)]);
  assert.deepEqual([r.probes,r.observable,r.hits,r.misses,r.cleanHits,r.falseMarks,r.abstentions],[4,3,1,2,1,2,1]);
  assert.deepEqual([r.visibleAtLeast20Percent,r.visibleBetween1And20Percent,r.nearHiddenMarks],[2,1,1]);
});
test('learned oracle acceptance must be exactly threshold and NMS, with no forced result',()=>{
  const result={scores:[.9,.8,.6,0],candidates:[0,1,2,3].map(i=>({index:i,bestX:i*8+4,bestY:4})),marks:[0,2]};
  assert.equal(verifyLearnedMarks(result,.5,20,4),true);
  assert.throws(()=>verifyLearnedMarks({...result,marks:[0]},.5,20,4),/threshold-plus-NMS/);
  assert.throws(()=>verifyLearnedMarks({...result,marks:[0,0]},.5,20,4),/Duplicate/);
  assert.equal(verifyLearnedMarks({...result,scores:[0,0,0,0],marks:[]},.5,20,4),true);
  const boundary={scores:[.9,.8,.7,.1],candidates:[4,16,28,52].map((x,i)=>({index:i,bestX:x,bestY:4})),marks:[0,2]};
  assert.equal(verifyLearnedMarks(boundary,.5,20,4),true,'NMS suppresses equal-radius neighbor');
});
test('sampling streams reproduce without accidentally sharing mutable state',()=>{
  const a=seededRandom(0xCC05A714),b=seededRandom(0xCC05A714),c=seededRandom(0xCC05A715);
  const aa=Array.from({length:16},()=>a()),bb=Array.from({length:16},()=>b()),cc=Array.from({length:16},()=>c());
  assert.deepEqual(aa,bb);assert.notDeepEqual(aa,cc);assert.ok(aa.every(x=>x>=0&&x<1));
});
test('delivered-source protocol directory resolves without depending on scratch workspace',()=>{
  const paths=protocolFiles('model/current-qnn/audit-protocol'),base=path.resolve('model/current-qnn/audit-protocol');
  assert.equal(paths.directory,base);assert.equal(paths.protocolPath,path.join(base,'independent-audit-protocol.json'));assert.equal(paths.freezePath,path.join(base,'independent-audit-freeze.json'));
});
