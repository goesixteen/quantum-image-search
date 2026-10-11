import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {traceQNN,getQNNFrame} from '../dist/qnn-trace.js';
import {layerPlaybackBounds,circuitFramePosition,createCircuitPlayback} from '../dist/circuit-playback.js';
const model=JSON.parse(readFileSync(new URL('../dist/model/wanda-qnn.json',import.meta.url),'utf8')),fixture=JSON.parse(readFileSync(new URL('../model/wanda-qnn/held-out-trace-fixtures.json',import.meta.url),'utf8')).fixtures[0],trace=traceQNN(fixture.features,model);
const context=position=>({trace,scene:{},position,available:true,visible:true,reducedMotion:false});

test('layer stops derive from actual gate metadata, including fractional starts and final completion',()=>{
  for(const [position,end]of [[0,20],[19.9,20],[20,40],[39.99,40],[40,60],[60,80],[79.99,80]])assert.equal(layerPlaybackBounds(trace,position).end,end);
  assert.equal(layerPlaybackBounds(trace,80).finished,true);
  const uneven={gates:[{layer:0},{layer:0},{layer:1},{layer:1},{layer:1}]};assert.equal(layerPlaybackBounds(uneven,1.5).end,2);assert.equal(layerPlaybackBounds(uneven,2).end,5,'the helper does not hardcode20 gates');
});

test('all four frozen-model boundaries present the final CNOT endpoint and exact saved state',()=>{
  const before=JSON.stringify(trace.gates);
  for(const end of [20,40,60,80]){
    const p=circuitFramePosition(trace,end),frame=getQNNFrame(trace,p.gateIndex,p.progress);
    assert.equal(p.boundary,true);assert.equal(frame.gate.kind,'cx');assert.equal(frame.gate.control,3);assert.equal(frame.gate.target,0);assert.equal(frame.gate.layer,end/20-1);assert.equal(frame.completedGates,end);
    assert.deepEqual(frame.state,trace.states[end]);assert.equal(frame.effectiveProgress,1);assert.ok(Math.abs(frame.norm-1)<2e-14);
    const layer=trace.gates.slice(end-20,end);assert.deepEqual(layer.map(g=>g.phase),[...Array(8).fill('encoding'),...Array(8).fill('trained'),...Array(4).fill('entangling')]);
  }
  assert.equal(JSON.stringify(trace.gates),before);assert.deepEqual(circuitFramePosition(trace,20.25),{gateIndex:20,progress:.25,boundary:false,layer:1});
});

test('one playback clamps exactly at its layer, and next click starts the next actual layer without rewind',()=>{
  const playback=createCircuitPlayback(),c=context(19.9),token=playback.start(c),result=playback.advance(token,c,.1,4);assert.deepEqual(result,{position:20,complete:true,layer:0});assert.equal(playback.owns(token),false);
  c.position=20;const next=playback.start(c);assert.ok(playback.owns(next));assert.deepEqual(playback.advance(next,c,.1,1),{position:20.1,complete:false,layer:1});
  c.position=80;assert.equal(playback.start(c),null);assert.equal(c.position,80);
});

test('pause/manual invalidation prevents stale frames from advancing or cancelling a newer playback',()=>{
  const playback=createCircuitPlayback(),c=context(9.25),old=playback.start(c);playback.stop();assert.equal(c.position,9.25);const fresh=playback.start(c);
  assert.equal(playback.advance(old,c,.1,4),null);assert.equal(playback.owns(fresh),true);assert.deepEqual(playback.advance(fresh,c,.1,4),{position:9.65,complete:false,layer:0});
});

test('image/window identity, tab visibility, readiness and reduced motion cancel owned frames',()=>{
  for(const change of [c=>({...c,trace:traceQNN(fixture.features,model)}),c=>({...c,scene:{}}),c=>({...c,visible:false}),c=>({...c,available:false}),c=>({...c,reducedMotion:true})]){
    const playback=createCircuitPlayback(),c=context(16),token=playback.start(c);assert.equal(playback.advance(token,change(c),.1,1),null);assert.equal(playback.owns(token),false);assert.equal(c.position,16);
  }
  assert.equal(createCircuitPlayback().start({...context(16),reducedMotion:true}),null);
});

test('fractional rotation and CNOT states keep production interpolation, including one-gate stepping at boundaries',()=>{
  for(const position of [0,.25,8.5,16.5,19,19.5,20,40,60,80]){
    const p=circuitFramePosition(trace,position),frame=getQNNFrame(trace,p.gateIndex,p.progress);
    if(Number.isInteger(position))assert.deepEqual(frame.state,trace.states[position]);
    else if(trace.gates[Math.floor(position)].kind==='cx')assert.deepEqual(frame.state,trace.states[Math.floor(position)]);
    assert.ok(Math.abs(frame.norm-1)<2e-14);
  }
  for(const position of [NaN,-1,80.1])assert.throws(()=>circuitFramePosition(trace,position),RangeError);
});

test('the shipped RAF handler stops at the exact boundary and stale callbacks leave a newer RAF untouched',()=>{
  const source=readFileSync(new URL('../dist/underhood.js',import.meta.url),'utf8'),start=source.indexOf('function tick(now,token){'),end=source.indexOf("$('circuit-play').addEventListener",start),playback=createCircuitPlayback(),scene={},drawn=[];
  const runtime={circuitPlayback:playback,gatePosition:19.9,lastTime:0,raf:27,playing:true,$:()=>({value:4}),requestAnimationFrame:()=>42,updateCircuit:()=>drawn.push(runtime.gatePosition),circuitContext:()=>({trace,scene,position:runtime.gatePosition,available:true,visible:true,reducedMotion:false}),stopCircuit:()=>{runtime.playing=false;playback.stop();runtime.raf=0;}};
  vm.createContext(runtime);vm.runInContext("'use strict';\n"+source.slice(start,end),runtime);
  const first=playback.start(runtime.circuitContext());runtime.tick(100,first);assert.equal(runtime.gatePosition,20);assert.equal(runtime.playing,false);assert.deepEqual(drawn,[20]);
  runtime.playing=true;runtime.raf=42;const next=playback.start(runtime.circuitContext());runtime.tick(150,first);assert.equal(runtime.raf,42);assert.equal(runtime.gatePosition,20);assert.equal(playback.owns(next),true);
});
