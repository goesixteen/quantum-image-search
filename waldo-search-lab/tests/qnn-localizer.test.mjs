import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {extractWindowFeatures,scanQNN,FEATURE_NAMES,FEATURE_VERSION} from '../dist/qnn-localizer.js';
import {predict} from '../dist/qnn.js';
const fixture=JSON.parse(fs.readFileSync(new URL('./qnn-localizer-fixtures.json',import.meta.url))),small={width:fixture.width,height:fixture.height,data:Uint8ClampedArray.from(fixture.rgba)};
function scene(){const data=new Uint8ClampedArray(512*512*4);for(let y=0;y<512;y++)for(let x=0;x<512;x++){const i=(y*512+x)*4,k=(Math.floor(x/19)+Math.floor(y/7))%4,colors=[[225,35,35],[235,235,230],[20,70,170],[170,140,110]];data.set([...colors[k],255],i);}return {width:512,height:512,data};}
const model={...fixture.model},image=scene();let fine;
test('Python/JavaScript features and genuine statevector readout agree on12 pixel/edge/scale fixtures',()=>{
  let featureError=0,scoreError=0;for(const c of fixture.cases){const f=extractWindowFeatures(small,c.cx,c.cy,c);f.forEach((v,i)=>featureError=Math.max(featureError,Math.abs(v-c.features[i])));scoreError=Math.max(scoreError,Math.abs(predict(f,model)-c.score));}
  assert.ok(featureError<1e-12,'feature error '+featureError);assert.ok(scoreError<1e-12,'QNN score error '+scoreError);
});
test('RGBA alpha is ignored; RGB-only features reject malformed geometry',()=>{
  const transparent={...small,data:Uint8ClampedArray.from(small.data)};for(let i=3;i<transparent.data.length;i+=4)transparent.data[i]=0;
  assert.deepEqual(extractWindowFeatures(small,26,35,{targetWidth:18,targetHeight:52}),extractWindowFeatures(transparent,26,35,{targetWidth:18,targetHeight:52}));assert.throws(()=>extractWindowFeatures(small,26,35,{targetWidth:NaN,targetHeight:52}));assert.throws(()=>extractWindowFeatures({...small,data:[]},26,35,{targetWidth:18,targetHeight:52}));
});
test('fixed4096-window scores are exactly QNN predictions; threshold1 safely keeps empty oracle',async()=>{
  const progress=[];fine=await scanQNN(image,model,{grid:64,targetWidth:18,targetHeight:52,threshold:1,batchSize:1024,onProgress:p=>progress.push(p)});
  assert.equal(fine.diagnostics.scoreEvaluations,4096);assert.equal(fine.windowScores.length,4096);assert.deepEqual(fine.marks,[]);assert.equal(progress[0],0);assert.equal(progress.at(-1),1);
  for(const i of [0,63,64,1765,4095]){const cx=(i%64+.5)*8,cy=(Math.floor(i/64)+.5)*8,expected=predict(extractWindowFeatures(image,cx,cy,{targetWidth:18,targetHeight:52}),model);assert.equal(fine.windowScores[i],expected);assert.equal(fine.scores[i],expected);assert.equal(fine.candidates[i].bestX,cx);assert.equal(fine.candidates[i].bestY,cy);}
});
test('coarse addresses aggregate learned window maxima and retain associated fine coordinates',async()=>{
  const coarse=await scanQNN(image,model,{grid:4,targetWidth:18,targetHeight:52,threshold:0,batchSize:1024});assert.equal(coarse.scores.length,16);assert.equal(coarse.geometry.pointTolerance,Math.hypot(8,8)/2+1);
  for(let address=0;address<16;address++){const indices=Array.from({length:4096},(_,i)=>i).filter(i=>Math.floor((Math.floor(i/64)+.5)*8/128)*4+Math.floor((i%64+.5)*8/128)===address),maximum=Math.max(...indices.map(i=>fine.windowScores[i])),first=indices.find(i=>fine.windowScores[i]===maximum);assert.equal(coarse.scores[address],maximum);assert.equal(coarse.candidates[address].windowIndex,first);}
  const ranked=coarse.candidates.slice().sort((a,b)=>b.score-a.score||a.index-b.index),kept=[];for(const c of ranked)if(!kept.some(k=>Math.hypot(c.bestX-k.bestX,c.bestY-k.bestY)<=12))kept.push(c);assert.deepEqual(coarse.marks,kept.map(c=>c.index).sort((a,b)=>a-b));
});
test('circuit parameter changes affect predictions; legacy models cannot enter new feature path',async()=>{
  const features=fixture.cases[0].features,changed={...model,theta:model.theta.slice()};changed.theta[0]+=.8;assert.ok(Math.abs(predict(features,model)-predict(features,changed))>1e-5);await assert.rejects(scanQNN(image,{...model,featureVersion:'legacy'},{targetWidth:18,targetHeight:52}),/feature contract/);for(const metadata of [{qubits:3},{layers:3}])await assert.rejects(scanQNN(image,{...model,...metadata},{targetWidth:18,targetHeight:52}),/four-qubit, four-layer/);assert.equal(FEATURE_VERSION,'current-qnn-window-v3');assert.equal(FEATURE_NAMES.length,8);
});
test('cooperative cancellation stops after a yielded batch and reports AbortError',async()=>{
  let cancel=false,completed=0;await assert.rejects(scanQNN(image,model,{targetWidth:18,targetHeight:52,batchSize:32,onProgress:p=>{completed=Math.round(p*4096);if(p>0)cancel=true;},shouldCancel:()=>cancel}),{name:'AbortError'});assert.equal(completed,32);
});
test('v3 explicitly preserves supplied scale and gives finite continuous absence features',()=>{
  const blank={width:512,height:512,data:new Uint8ClampedArray(512*512*4)};
  for(const height of [24,52,112]){const f=extractWindowFeatures(blank,256,256,{targetWidth:Math.round(height*18/52),targetHeight:height});assert.ok(f[0]<1e-12);assert.ok(f[1]<1e-12);assert.equal(f[7],(height-24)/88);assert.ok(f.every(v=>Number.isFinite(v)&&v>=0&&v<=1));}
});
test('v3 fixed-pixel spatial evidence distinguishes an8px shift of a large synthetic silhouette',()=>{
  const data=new Uint8ClampedArray(512*512*4),cx=256,cy=256,H=112,W=39;
  function rectangle(x0,y0,w,h,color){for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)data.set([...color,255],(y*512+x)*4);}
  const top=cy-H/2;rectangle(cx-6,top+2,12,11,[252,234,43]);
  for(let y=top+22;y<top+56;y++)rectangle(cx-14,y,28,1,Math.cos(2*Math.PI*((y-top)/H)/(40/580))>=0?[223,48,59]:[255,255,255]);
  rectangle(cx-6,top+58,12,40,[40,107,192]);const pixels={width:512,height:512,data},at=(dx,dy)=>extractWindowFeatures(pixels,cx+dx,cy+dy,{targetWidth:W,targetHeight:H}),center=at(0,0),shiftX=at(8,0),shiftY=at(0,8);
  assert.ok(center[5]>shiftX[5]+.2,'horizontal centering remains in pixels');assert.ok(center[3]>shiftY[3]+.1,'head registration remains in pixels');assert.ok(center[6]>shiftY[6]+.1,'vertical centering remains in pixels');assert.ok(center[0]>.35,'known-period stripe evidence retained');
});
