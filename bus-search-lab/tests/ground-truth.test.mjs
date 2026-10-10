import test from 'node:test';
import assert from 'node:assert/strict';
import { regionsFromAlpha } from '../dist/ground-truth.js';
const raster=()=>({width:8,height:8,data:new Uint8ClampedArray(8*8*4)});
const pixel=(image,x,y,alpha)=>{image.data[(y*image.width+x)*4+3]=alpha;};
test('an absent rendered target labels no regions',()=>assert.deepEqual([...regionsFromAlpha(raster(),4)],[]));
test('transparent sprite padding does not label a region',()=>{
  const image=raster();pixel(image,0,0,32);pixel(image,7,7,33);
  assert.deepEqual([...regionsFromAlpha(image,4)],[15]);
});
test('a target crossing a candidate boundary labels both visible fragments',()=>{
  const image=raster();pixel(image,3,5,255);pixel(image,4,5,255);
  assert.deepEqual([...regionsFromAlpha(image,4)],[9,10]);
  assert.deepEqual([...regionsFromAlpha(image,2)],[2,3]);
});
test('invalid candidate geometry is rejected',()=>assert.throws(()=>regionsFromAlpha(raster(),3),RangeError));
