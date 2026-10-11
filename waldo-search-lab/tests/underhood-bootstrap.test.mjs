import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {simulateGrover,recommendIterations} from '../dist/quantum.js';

const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),hood=readFileSync(new URL('../dist/underhood.js',import.meta.url),'utf8');
const registration=app.match(/^window\.addEventListener\('wanda-underhood-ready'.*$/m)?.[0],ready=hood.match(/^window\.dispatchEvent\(new CustomEvent\('wanda-underhood-ready'\)\);$/m)?.[0];
assert.ok(registration&&ready,'Both shipped modules must participate in the readiness handshake.');
// Execute the shipped event publisher/registration, omitting only unrelated canvas drawing.
const scenePublisher=app.slice(app.indexOf('function publishSceneTrace()'),app.indexOf('function refresh('));
const quantumPublisher=app.slice(app.indexOf('function updateQuantum()'),app.indexOf('  const softMap=',app.indexOf('function updateQuantum()')))+'\n}';
function harness({built=false,readyState=true}={}){
  const window=new EventTarget(),marks=built?[2420]:[],trace=built?simulateGrover(4096,marks,50):null,model={id:'frozen-model'},image={id:'unchanged-RGB'},extract=()=>{};
  const state={ready:readyState,target:{},currentModel:model,mode:'current-qnn',grid:64,threshold:.9056472752971427,scores:built?Array(4096).fill(.1):null,matches:built?{candidates:Array(4096).fill({bestX:420,bestY:300}),diagnostics:{}}:null,marks,trace,iteration:built?50:0,busy:false,measurement:built?2420:null};
  const context=vm.createContext({window,CustomEvent,state,renderPixels:()=>image,targetRect:()=>({width:15,height:52}),extractWindowFeatures:extract,recommendIterations,measuredPoint:()=>({x:420,y:300})});
  vm.runInContext(scenePublisher+quantumPublisher+registration,context);
  const events=[];
  return {state,context,image,model,events,initializePublish(){vm.runInContext('publishSceneTrace();updateQuantum();',context);},subscribe(){window.addEventListener('wanda-scene',e=>events.push(['scene',e.detail]));window.addEventListener('wanda-grover',e=>events.push(['grover',e.detail]));},announce(){vm.runInContext(ready,context);}};
}

test('late explainer listeners recover the actual unbuilt scene after fast game initialization',()=>{
  const f=harness();f.initializePublish();f.subscribe();assert.equal(f.events.length,0);f.announce();
  assert.equal(f.events.length,2);assert.equal(f.events[0][0],'scene');assert.equal(f.events[0][1].image,f.image);assert.equal(f.events[0][1].model,f.model);assert.equal(f.events[0][1].scores,null);assert.equal(f.events[1][1],null,'Unbuilt must remain unbuilt rather than substituting uniform toy amplitudes');
});

test('early explainer readiness waits for normal initialization without touching nonexistent assets',()=>{
  const f=harness({readyState:false});f.subscribe();f.announce();assert.equal(f.events.length,0);f.state.ready=true;f.initializePublish();assert.equal(f.events.length,2);
  assert.ok(app.indexOf(registration)<app.lastIndexOf('initialize();'));assert.ok(hood.trim().endsWith(ready),'Readiness is emitted only after all explainer listeners are installed');
});

test('late readiness replays an already sampled exact run without reset, rescan or another shot',()=>{
  const f=harness({built:true}),before=JSON.stringify(f.state);f.initializePublish();f.subscribe();f.announce();
  const snapshot=f.events[1][1];assert.equal(snapshot.iteration,50);assert.equal(snapshot.measurement,2420);assert.equal(snapshot.amplitudes,f.state.trace.history[50].amplitudes);assert.equal(snapshot.marks,f.state.marks);assert.equal(f.events[0][1].scores,f.state.scores);assert.equal(JSON.stringify(f.state),before);
});
