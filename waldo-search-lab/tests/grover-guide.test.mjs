import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoundGuide,guideEligibility} from '../dist/grover-guide.js';
import {simulateGrover,oracle,diffuse} from '../dist/quantum.js';

function fixture({round=0,reducedMotion=false}={}){
  const scene={},marks=[2420],history=simulateGrover(4096,marks,103).history,views=[],commits=[],jobs=[];
  let context={scene,marks,amplitudes:history[round].amplitudes,iteration:round,maximum:103,busy:false,available:true,hidden:false,reducedMotion};
  const guide=createRoundGuide({readContext:()=>context,onView:phase=>views.push({phase,round:context.iteration}),onCommit:next=>{commits.push(next);context={...context,iteration:next,amplitudes:history[next].amplitudes};guide.sync();},setTimer:(callback,ms)=>{assert.equal(ms,2000);const job={callback,cancelled:false};jobs.push(job);return job;},clearTimer:job=>{job.cancelled=true;}});
  return {guide,views,commits,jobs,history,get context(){return context;},set context(v){context=v;},fire(){jobs.find(j=>!j.cancelled&&!j.fired).fired=true;const job=jobs.find(j=>j.fired&&!j.executed);job.executed=true;job.callback();}};
}

test('one exact round holds before, oracle and reflection before committing once without measuring',()=>{
  const f=fixture();assert.equal(f.guide.start(),true);assert.deepEqual(f.views,[{phase:'before',round:0}]);assert.equal(f.commits.length,0);
  f.fire();assert.equal(f.views.at(-1).phase,'oracle');assert.equal(f.context.iteration,0);
  const base=f.context.amplitudes,flipped=oracle(base,f.context.marks);assert.deepEqual(flipped.map(a=>a*a),base.map(a=>a*a));
  f.fire();assert.equal(f.views.at(-1).phase,'diffuse');assert.equal(f.context.iteration,0);assert.deepEqual(diffuse(flipped),f.history[1].amplitudes);
  f.fire();assert.deepEqual(f.commits,[1]);assert.equal(f.guide.state().status,'complete');assert.equal(f.context.iteration,1);assert.equal(f.jobs.filter(j=>!j.cancelled&&!j.fired).length,0);
});

test('pause and hidden-view resume preserve the exact preview and cannot commit in the background',()=>{
  const f=fixture();f.guide.start();f.fire();const stale=f.jobs.at(-1).callback;f.context={...f.context,hidden:true};f.guide.sync();assert.equal(f.guide.state().status,'paused');stale();assert.equal(f.commits.length,0);assert.equal(f.views.at(-1).phase,'oracle');
  f.context={...f.context,hidden:false};f.guide.toggle();f.fire();assert.equal(f.views.at(-1).phase,'diffuse');f.fire();assert.deepEqual(f.commits,[1]);
});

test('stale callbacks after any saved-state identity or readiness change cannot advance or commit',()=>{
  for(const change of [c=>({...c,scene:{}}),c=>({...c,amplitudes:c.amplitudes.slice()}),c=>({...c,marks:c.marks.slice()}),c=>({...c,iteration:2}),c=>({...c,busy:true}),c=>({...c,available:false})]){
    const f=fixture();f.guide.start();f.fire();f.fire();const old=f.jobs.at(-1).callback;f.context=change(f.context);f.guide.sync();old();assert.equal(f.commits.length,0);assert.equal(f.guide.state().status,'idle');
  }
});

test('reduced motion requires explicit step clicks and enabling it mid-play clears the timer',()=>{
  const f=fixture({reducedMotion:true});f.guide.start();assert.equal(f.jobs.length,0);f.guide.toggle();assert.equal(f.views.at(-1).phase,'oracle');f.guide.toggle();assert.equal(f.views.at(-1).phase,'diffuse');assert.equal(f.commits.length,0);f.guide.toggle();assert.deepEqual(f.commits,[1]);
  const live=fixture();live.guide.start();const old=live.jobs.at(-1).callback;live.context={...live.context,reducedMotion:true};live.guide.sync();old();assert.equal(live.views.length,1);assert.equal(live.guide.state().status,'manual');live.guide.toggle();assert.equal(live.views.at(-1).phase,'oracle');
  const boundary=fixture();boundary.guide.start();boundary.context={...boundary.context,reducedMotion:true};boundary.fire();assert.equal(boundary.views.length,1,'a preference change detected at the timer boundary must not auto-step');assert.equal(boundary.guide.state().status,'manual');
});

test('starting at the peak keeps that round and the next exact round may lower accepted probability',()=>{
  const f=fixture({round:50});f.guide.start();assert.equal(f.views[0].round,50);f.fire();f.fire();f.fire();assert.deepEqual(f.commits,[51]);assert.ok(f.history[51].successProbability<f.history[50].successProbability);
});

test('restart and manual invalidation suppress old callbacks; empty/full/last-round states are disabled',()=>{
  const f=fixture();f.guide.start();f.fire();const old=f.jobs.at(-1).callback;f.guide.start();old();assert.equal(f.views.at(-1).phase,'before');assert.equal(f.commits.length,0);f.guide.cancel('Manual control');f.jobs.at(-1).callback();assert.equal(f.commits.length,0);
  for(const context of [null,{...f.context,marks:[]},{...f.context,marks:Array.from({length:4096},(_,i)=>i)},{...f.context,iteration:103}])assert.equal(guideEligibility(context).enabled,false);
});
