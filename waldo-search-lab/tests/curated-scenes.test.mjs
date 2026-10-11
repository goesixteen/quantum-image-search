import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {homedir} from 'node:os';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {composeCuratedScene} from '../dist/curated-scenes.js';
const require=createRequire(import.meta.url);let canvas;
try{canvas=require('@napi-rs/canvas');}catch{canvas=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'));}
const {createCanvas,loadImage}=canvas,factory=(w,h)=>createCanvas(w,h),pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const backgroundFile=new URL('../dist/assets/wanda/park-512.png',import.meta.url),spriteFile=new URL('../dist/assets/wanda/lookalikes/coral-denim-v1.png',import.meta.url);
const backgroundBytes=fs.readFileSync(backgroundFile),spriteBytes=fs.readFileSync(spriteFile),background=await loadImage(fileURLToPath(backgroundFile)),image=await loadImage(fileURLToPath(spriteFile)),base=factory(512,512);
base.getContext('2d').imageSmoothingEnabled=false;base.getContext('2d').drawImage(background,0,0);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),placement=(id,x,y,height=52)=>({id,image,centerX:x,centerY:y,height});

test('empty curated composition preserves actual original Park pixels and files byte-for-byte',()=>{
  assert.equal(hash(backgroundBytes),'d20ea478a665eac1221fafcf3079dff71e9d9a40ca56846546628216452ceabd');
  const before=pixels(base).slice(),result=composeCuratedScene({backgroundCanvas:base,canvasFactory:factory});
  assert.notEqual(result.canvas,base);assert.deepEqual(pixels(result.canvas),before);assert.deepEqual(pixels(base),before);assert.deepEqual(result.placements,[]);
  assert.deepEqual(fs.readFileSync(backgroundFile),backgroundBytes);assert.deepEqual(fs.readFileSync(spriteFile),spriteBytes);
});

test('one/two actual source sprites modify only their footprints at40/52/64px without touching original RGB',()=>{
  const before=pixels(base).slice();
  for(const height of [40,52,64])for(const count of [1,2]) {
    const requested=[placement('first',116,180,height),placement('second',356,388,height)].slice(0,count),result=composeCuratedScene({backgroundCanvas:base,placements:requested,canvasFactory:factory}),actual=pixels(result.canvas);
    let changed=0;
    for(let y=0;y<512;y++)for(let x=0;x<512;x++) {
      const offset=(y*512+x)*4,inside=result.placements.some(({rectangle:r})=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height);
      for(let k=0;k<4;k++){if(actual[offset+k]!==before[offset+k])changed++;if(!inside)assert.equal(actual[offset+k],before[offset+k]);}
    }
    assert.ok(changed>100);assert.deepEqual(pixels(base),before);assert.equal(result.placements.length,count);assert.equal(result.rendererOnly,true);
    for(const metadata of result.placements){assert.equal(metadata.rendererOnly,true);assert.equal(metadata.rectangle.height,height);assert.deepEqual(metadata.trimBounds,{x:285,y:21,width:441,height:1494});assert.equal(Object.hasOwn(metadata,'score'),false);assert.equal(Object.hasOwn(metadata,'accepted'),false);}
  }
});

test('transparent silhouette holes preserve underlying pixels even inside the resized footprint',()=>{
  const result=composeCuratedScene({backgroundCanvas:base,placements:[placement('person',116,180)],canvasFactory:factory}),r=result.placements[0].rectangle;
  // Reconstruct the independently declared source-alpha trim/resize contract.
  const trim=factory(441,1494);trim.getContext('2d').drawImage(image,285,21,441,1494,0,0,441,1494);
  const sprite=factory(r.width,r.height),ctx=sprite.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(trim,0,0,r.width,r.height);
  const alpha=pixels(sprite),before=pixels(base),actual=pixels(result.canvas);let transparent=0;
  for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++)if(alpha[(y*r.width+x)*4+3]===0){transparent++;const i=((r.y+y)*512+r.x+x)*4;assert.deepEqual(actual.slice(i,i+4),before.slice(i,i+4));}
  assert.ok(transparent>20,'source is a silhouette rather than an opaque rectangle');
});

test('fractional requested centers report the integer-registered actual center and do not alter input records',()=>{
  const input=[placement('person',116.1,180.3)],before=input.map(p=>({...p})),result=composeCuratedScene({backgroundCanvas:base,placements:input,canvasFactory:factory});
  assert.deepEqual(input,before);assert.deepEqual(result.placements[0].requestedCenter,{x:116.1,y:180.3});assert.deepEqual(result.placements[0].center,{x:116.5,y:180});
  result.placements[0].rectangle.x=0;assert.equal(input[0].centerX,116.1);
});

test('blank sources, invalid geometry, duplicate identities and aliasing canvas factories fail',()=>{
  const blank=factory(10,10),compose=placements=>composeCuratedScene({backgroundCanvas:base,placements,canvasFactory:factory});
  assert.throws(()=>compose([{id:'blank',image:blank,centerX:100,centerY:100,height:52}]),/alpha/);
  for(const height of [15,97,NaN,52.5])assert.throws(()=>compose([placement('person',100,100,height)]),/height/);
  assert.throws(()=>compose([placement('person',NaN,100)]),/finite/);assert.throws(()=>compose([placement('person',-100,100)]),/wholly/);
  assert.throws(()=>compose([placement('same',100,100),placement('same',300,300)]),/unique/);
  const before=pixels(base).slice();assert.throws(()=>composeCuratedScene({backgroundCanvas:base,canvasFactory:()=>base}),/fresh/);assert.deepEqual(pixels(base),before);
});
