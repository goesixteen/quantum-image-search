import test from 'node:test';
import assert from 'node:assert/strict';
import {createLatestOperation,runLatestOperation,createPointerSession,pointerAction} from '../dist/interaction-lifecycle.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};

test('cancellation rejects delayed completion and prevents later steps or commit',async()=>{
  const owner=createLatestOperation(),pending=deferred(),events=[];
  const run=runLatestOperation(owner,[async()=>{events.push('decode');await pending.promise;return true;},()=>events.push('world')],()=>events.push('commit'));
  owner.cancel();pending.resolve();assert.equal(await run,false);assert.deepEqual(events,['decode']);
});

test('a newer selection wins even when an earlier asynchronous step finishes later',async()=>{
  const owner=createLatestOperation(),old=deferred(),events=[];
  const first=runLatestOperation(owner,[()=>old.promise,()=>events.push('stale-world')],()=>events.push('stale-commit'));
  const second=runLatestOperation(owner,[()=>true],()=>events.push('new-commit'));
  assert.equal(await second,true);old.resolve(true);assert.equal(await first,false);assert.deepEqual(events,['new-commit']);
});

test('a rejected loader never advances reset defaults, while an owned sequence commits exactly once',async()=>{
  const owner=createLatestOperation(),events=[];
  assert.equal(await runLatestOperation(owner,[()=>false,()=>events.push('unwanted')],()=>events.push('unwanted-commit')),false);
  assert.equal(await runLatestOperation(owner,[()=>true,()=>true],()=>events.push('commit')),true);assert.deepEqual(events,['commit']);
});

test('pointer actions belong to their initiating pointer and preserve the original move offset',()=>{
  const point={x:106,y:98},center={x:100,y:100},rect={x:90,y:70,width:20,height:60},session=createPointerSession({pointerId:7,tool:'move',point,center,rect});
  assert.equal(pointerAction(session,8,{x:150,y:150}),null);
  assert.deepEqual(pointerAction(session,7,{x:116,y:108}),{type:'move',x:110,y:110});assert.deepEqual(point,{x:106,y:98});
  const outside=createPointerSession({pointerId:7,tool:'move',point:{x:50,y:50},center,rect});assert.deepEqual(pointerAction(outside,7,{x:60,y:60}),{type:'move',x:60,y:60});
});

test('brush actions retain their own path and tool rather than another mutable gesture',()=>{
  const session=createPointerSession({pointerId:3,tool:'paint',point:{x:10,y:20},radius:12}),path=session.path;
  const action=pointerAction(session,3,{x:30,y:40});assert.equal(action.path,path);assert.equal(path.operation,'paint');assert.deepEqual(path.points,[[10,20]]);
  const erase=createPointerSession({pointerId:4,tool:'erase',point:{x:10,y:20},radius:12});assert.equal(erase.path.operation,'erase');assert.notEqual(erase.path,path);
  assert.equal(pointerAction(session,4,{x:0,y:0}),null);assert.throws(()=>createPointerSession({pointerId:3,tool:'paint',point:{x:0,y:0},radius:0}),RangeError);
});
