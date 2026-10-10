import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractFeatures, predict } from '../dist/qnn.js';
import { simulateGrover, recommendIterations } from '../dist/quantum.js';
const model = JSON.parse(await readFile(new URL('../dist/model/model.json',import.meta.url),'utf8'));
const fixtures = JSON.parse(await readFile(new URL('../model/parity-fixtures.json',import.meta.url),'utf8'));

test('pixel-only QNN predictions match independently computed Python fixtures',()=>{
  for(const f of fixtures){
    const x=extractFeatures({width:f.width,height:f.height,data:Uint8ClampedArray.from(f.rgba)});
    x.forEach((v,i)=>assert.ok(Math.abs(v-f.features[i])<1e-12));
    assert.ok(Math.abs(predict(x,model)-f.probability)<1e-12);
  }
});
test('learned predicate drives Grover without consulting image labels or coordinates',()=>{
  const scores=fixtures.map(f=>predict(extractFeatures({width:f.width,height:f.height,data:Uint8ClampedArray.from(f.rgba)}),model));
  while(scores.length<16)scores.push(predict(Array(8).fill(0),model));
  const marks=scores.flatMap((p,i)=>p>=model.threshold?[i]:[]);
  assert.ok(marks.length>0&&marks.length<16);
  const k=recommendIterations(16,marks.length),result=simulateGrover(16,marks,k).history.at(-1);
  const theta=Math.asin(Math.sqrt(marks.length/16));
  assert.ok(Math.abs(result.successProbability-Math.sin((2*k+1)*theta)**2)<1e-12);
});
test('blank raster produces no target at the frozen threshold',()=>{
  const f=extractFeatures({width:64,height:64,data:new Uint8ClampedArray(64*64*4).fill(255)});
  assert.ok(predict(f,model)<model.threshold);
  const result=simulateGrover(64,[],0).history[0];
  assert.equal(result.successProbability,0);
});
