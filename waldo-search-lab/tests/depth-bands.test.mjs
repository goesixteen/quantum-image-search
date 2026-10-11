import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {homedir} from 'node:os';import {fileURLToPath} from 'node:url';
import {createDepthBands} from '../dist/depth-bands.js';import {compositeLayeredScene} from '../dist/scene-editor.js';
const require=createRequire(import.meta.url);
let canvas;
try { canvas=require('@napi-rs/canvas'); }
catch { canvas=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas')); }
const {createCanvas,loadImage}=canvas,factory=(w,h)=>createCanvas(w,h),dist=fileURLToPath(new URL('../dist/',import.meta.url)),pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
function object(id,x,y,w,h,size=64,alpha=1){const c=factory(size,size),ctx=c.getContext('2d');ctx.fillStyle='rgba(240,60,20,'+alpha+')';ctx.fillRect(x,y,w,h);return {id,name:id,enabled:true,foregroundCanvas:c};}
const defs=JSON.parse(fs.readFileSync(dist+'/foreground-presets.json')).backgrounds.legacy.layers,actual=[];
for(const d of defs){const c=factory(512,512);c.getContext('2d').drawImage(await loadImage(dist+'/'+d.cutoutPNG),d.cutoutPosition.x,d.cutoutPosition.y);actual.push({...d,foregroundCanvas:c});}
test('Original Festival first: whole object pixels remain registered, with transparent non-object background',()=>{
  const r=createDepthBands(actual,{canvasFactory:factory,includeDataURLs:false});assert.equal(r.objects.length,actual.length);assert.ok(actual.length>=12);assert.ok(r.bands.length>1);assert.equal(pixels(r.objectAtlasCanvas)[3],0);
  for(const l of actual){const source=pixels(l.foregroundCanvas),band=r.bands.find(b=>b.memberIDs.includes(l.id)),output=pixels(band.foregroundCanvas);assert.ok(band);for(let i=3;i<source.length;i+=4)if(source[i]>0)assert.ok(output[i]>0,l.id+' silhouette pixel retained');}
  const memberCount=r.bands.reduce((s,b)=>s+b.memberIDs.length,0);assert.equal(memberCount,actual.length);
  const union=factory(512,512);for(const b of r.bands)union.getContext('2d').drawImage(b.foregroundCanvas,0,0);assert.deepEqual(pixels(union),pixels(r.objectAtlasCanvas));
  const unionData=pixels(union),sourceBuffers=actual.map(l=>pixels(l.foregroundCanvas));for(let i=3;i<unionData.length;i+=4)if(!sourceBuffers.some(data=>data[i]>0))assert.equal(unionData[i],0);
});
test('Original Festival every row: higher target behind, lower target in front, ties foreground front',()=>{
  const r=createDepthBands(actual,{canvasFactory:factory,includeDataURLs:false}),base=factory(512,512),target=factory(1,1);target.getContext('2d').fillRect(0,0,1,1);
  for(const b of r.bands)for(const delta of [-1,0,1]){const frame=compositeLayeredScene({backgroundCanvas:base,target,targetRect:{x:10,y:b.depthAnchorY+delta-1,width:1,height:1},foregroundLayers:r.bands,targetDepthMode:'auto',canvasFactory:factory});assert.equal(frame.layerDepths.find(l=>l.id===b.id).aboveTarget,delta<=0);}
});
test('row membership uses bottom-1, maximum actual member foot, and preserves pixels beyond row rectangle',()=>{
  const r=createDepthBands([object('a',4,1,3,15),object('b',9,1,3,16),object('c',20,2,4,29)],{size:64,canvasFactory:factory,includeDataURLs:false});assert.deepEqual(r.bands.map(b=>b.level),[0,1]);assert.deepEqual(r.bands[1].memberIDs,['b','c']);assert.equal(r.bands[1].depthAnchorY,31);assert.deepEqual(r.bands[1].depthRange,{start:16,endExclusive:32});assert.ok(pixels(r.bands[1].foregroundCanvas)[(1*64+9)*4+3]>0);
});
test('source-over overlap retains soft alpha and masks equal final foreground alpha',()=>{
  const layers=[object('a',4,4,8,8,64,.5),object('b',8,4,8,8,64,.5)],r=createDepthBands(layers,{size:64,canvasFactory:factory,includeDataURLs:false});assert.equal(r.bands.length,1);const p=pixels(r.bands[0].foregroundCanvas),m=pixels(r.bands[0].maskCanvas);assert.ok(Math.abs(p[(5*64+9)*4+3]-192)<=1);for(let i=3;i<p.length;i+=4)assert.equal(p[i],m[i]);assert.deepEqual(pixels(r.objectAtlasCanvas),p);
});
test('empty and disabled objects are ignored, while faint edges on a valid object survive',()=>{
  const solid=object('solid',4,4,3,3),ctx=solid.foregroundCanvas.getContext('2d');ctx.fillStyle='rgba(10,20,30,.05)';ctx.fillRect(25,25,1,1);const r=createDepthBands([solid,{...object('off',0,0,64,64),enabled:false},{id:'empty',foregroundCanvas:factory(64,64)}],{size:64,canvasFactory:factory,includeDataURLs:false});assert.equal(r.objects.length,1);assert.ok(pixels(r.bands[0].foregroundCanvas)[(25*64+25)*4+3]>0);assert.equal(r.bands[0].depthAnchorY,7);assert.ok(r.bands[0].bounds.x+r.bands[0].bounds.width>=26);
});
test('reject duplicate ids, invalid numeric geometry, and unregistered source sizes',()=>{
  assert.throws(()=>createDepthBands([object('a',1,1,1,1),object('a',2,2,1,1)],{size:64,canvasFactory:factory}),/Duplicate/);for(const bad of [NaN,Infinity,0,-1,2.5]){assert.throws(()=>createDepthBands([],{size:bad,canvasFactory:factory}));assert.throws(()=>createDepthBands([],{bandHeight:bad,canvasFactory:factory}));}assert.throws(()=>createDepthBands([object('x',1,1,1,1)],{size:512,canvasFactory:factory}));
});
