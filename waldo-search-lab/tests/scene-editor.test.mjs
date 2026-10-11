import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  createMask,rasterizeMaskPaths,normalizeMaskPaths,coverCropRect,targetRectFromCenter,
  renderBackground,createForegroundLayers,serializeForegroundLayers,compositeLayeredScene,
  compositeScene,visibleTargetAlpha,visibleTargetRegions,
  getDepthAnchor,invalidateDepthAnchor,
} from '../dist/scene-editor.js';

const require=createRequire(import.meta.url);
let raster;
try {raster=require('@napi-rs/canvas');}
catch {
  const fallback=process.env.SCENE_EDITOR_CANVAS_MODULE??path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
  try {raster=require(fallback);}catch {throw new Error('Raster tests require @napi-rs/canvas. Install it locally or set SCENE_EDITOR_CANVAS_MODULE.');}
}
const {createCanvas,loadImage}=raster;
const factory=(w,h)=>createCanvas(w,h);
const pixel=(canvas,x,y)=>Array.from(canvas.getContext('2d').getImageData(x,y,1,1).data);
function solid(w,h,color) {const c=factory(w,h);c.getContext('2d').fillStyle=color;c.getContext('2d').fillRect(0,0,w,h);return c;}
function pathsFor(x,y,width,height,opacity=1) {return [{type:'rect',x,y,width,height,opacity}];}
function layerFor(base,paths,zIndex=10,enabled=true) {return createForegroundLayers(base,[{id:'foreground',name:'Object',paths,zIndex,enabled}],{canvasFactory:factory});}

test('cover crop centers the source and preserves its aspect ratio',()=>{
  assert.deepEqual(coverCropRect(8,4,4,4),{sx:2,sy:0,sw:4,sh:4,dx:0,dy:0,dw:4,dh:4});
  assert.deepEqual(coverCropRect(4,8,4,4),{sx:0,sy:2,sw:4,sh:4,dx:0,dy:0,dw:4,dh:4});
  assert.deepEqual(targetRectFromCenter(5,7,4,6),{x:3,y:4,width:4,height:6});
});

test('background cover crop uses central original source pixels',()=>{
  const c=solid(4,2,'#008800'),ctx=c.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,1,2);ctx.fillStyle='#0000ff';ctx.fillRect(3,0,1,2);
  const base=renderBackground(c,{size:2,canvasFactory:factory});
  assert.deepEqual(pixel(base,0,0),[0,136,0,255]);assert.deepEqual(pixel(base,1,1),[0,136,0,255]);
});

test('paint/erase mask paths are ordered, serializable and undoable',()=>{
  const mask=createMask(8,factory),paths=[{type:'rect',x:0,y:0,width:8,height:8},{type:'stroke',points:[[4,4]],radius:2,operation:'erase'}];
  const clone=JSON.parse(JSON.stringify(normalizeMaskPaths(paths)));rasterizeMaskPaths(mask,clone);
  assert.equal(pixel(mask,4,4)[3],0);assert.equal(pixel(mask,0,0)[3],255);
  rasterizeMaskPaths(mask,clone.slice(0,1));assert.equal(pixel(mask,4,4)[3],255);
});

test('polygon and brush paint are clipped to canvas bounds',()=>{
  const mask=createMask(8,factory);rasterizeMaskPaths(mask,[{type:'polygon',points:[[-2,-2],[7,-2],[-2,7]]}]);
  assert.equal(pixel(mask,1,1)[3],255);assert.equal(pixel(mask,7,7)[3],0);
  rasterizeMaskPaths(mask,[{type:'stroke',points:[[2,5],[6,5]],radius:1}]);
  assert.equal(pixel(mask,4,5)[3],255);assert.equal(pixel(mask,0,0)[3],0);
});

test('invalid path data is rejected before changing a mask',()=>{
  assert.throws(()=>normalizeMaskPaths([{type:'stroke',points:[[NaN,0]],radius:1}]),/finite/);
  assert.throws(()=>normalizeMaskPaths([{type:'polygon',points:[[0,0],[1,1]]}]),/3/);
  assert.throws(()=>normalizeMaskPaths([{type:'rect',x:0,y:0,width:-1,height:1}]),/negative/);
  assert.throws(()=>serializeForegroundLayers([{id:'same'},{id:'same'}]),/unique/);
});

test('named cutouts contain only masked original pixels and encode real PNGs',async()=>{
  const base=solid(4,4,'#285078'),layers=layerFor(base,pathsFor(1,1,2,2)),layer=layers[0];
  assert.deepEqual(pixel(layer.foregroundCanvas,1,1),[40,80,120,255]);assert.equal(pixel(layer.foregroundCanvas,0,0)[3],0);
  assert.deepEqual(layer.bounds,{x:1,y:1,width:2,height:2});assert.match(layer.pngDataURL,/^data:image\/png;base64,/);
  assert.deepEqual(layer.cutoutPosition,{x:1,y:1});assert.equal(layer.cutoutCanvas.width,2);assert.equal(layer.cutoutCanvas.height,2);assert.match(layer.cutoutPNGDataURL,/^data:image\/png;base64,/);assert.deepEqual(pixel(layer.cutoutCanvas,0,0),[40,80,120,255]);
  const decoded=await loadImage(layer.pngDataURL),copy=factory(4,4);copy.getContext('2d').drawImage(decoded,0,0);
  assert.deepEqual(pixel(copy,1,1),[40,80,120,255]);assert.equal(pixel(copy,0,0)[3],0);
  assert.deepEqual(serializeForegroundLayers(layers),[{id:'foreground',name:'Object',zIndex:10,enabled:true,paths:normalizeMaskPaths(pathsFor(1,1,2,2))}]);
});

test('foreground restores original background over target and removes hidden truth alpha',()=>{
  const base=solid(4,4,'#285078'),target=solid(2,2,'#dc140a'),layers=layerFor(base,pathsFor(2,1,1,2));
  const scene=compositeLayeredScene({backgroundCanvas:base,target,targetRect:{x:1,y:1,width:2,height:2},foregroundLayers:layers,canvasFactory:factory});
  assert.deepEqual(pixel(scene.canvas,1,1),[220,20,10,255]);assert.deepEqual(pixel(scene.canvas,2,1),[40,80,120,255]);
  assert.equal(scene.visibleTarget.data[(1*4+1)*4+3],255);assert.equal(scene.visibleTarget.data[(1*4+2)*4+3],0);
  assert.deepEqual([...visibleTargetRegions(scene.visibleTarget,2)],[0,2]);
});

test('target front/depth and enabled toggles change pixels and independent visibility',()=>{
  const base=solid(4,4,'#004400'),target=solid(2,2,'#ff0000'),layers=layerFor(base,pathsFor(0,0,4,4));
  const options={backgroundCanvas:base,target,targetRect:{x:1,y:1,width:2,height:2},foregroundLayers:layers,canvasFactory:factory};
  const behind=compositeLayeredScene(options);assert.equal(visibleTargetRegions(behind.visibleTarget,2).size,0);assert.deepEqual(pixel(behind.canvas,1,1),[0,68,0,255]);
  const front=compositeLayeredScene({...options,targetZIndex:11});assert.deepEqual(pixel(front.canvas,1,1),[255,0,0,255]);assert.equal(visibleTargetRegions(front.visibleTarget,2).size,4);
  const equal=compositeLayeredScene({...options,targetZIndex:10});assert.equal(visibleTargetRegions(equal.visibleTarget,2).size,0);
  layers[0].enabled=false;const disabled=compositeLayeredScene(options);assert.deepEqual(pixel(disabled.canvas,1,1),[255,0,0,255]);
});

test('overlapping translucent foreground uses alpha union, not additive hiding',()=>{
  const base=solid(2,2,'#000000'),target=solid(2,2,'#ff0000');
  const layers=createForegroundLayers(base,[{id:'a',zIndex:10,paths:pathsFor(0,0,2,2,.5)},{id:'b',zIndex:20,paths:pathsFor(0,0,2,2,.5)}],{canvasFactory:factory});
  const scene=compositeLayeredScene({backgroundCanvas:base,target,targetRect:{x:0,y:0,width:2,height:2},foregroundLayers:layers,canvasFactory:factory});
  const alpha=scene.visibleTarget.data[3];assert.ok(alpha>=62&&alpha<=65);assert.ok(pixel(scene.canvas,0,0)[0]>=62&&pixel(scene.canvas,0,0)[0]<=65);
});

test('no target reconstructs the base byte-for-byte even with overlapping masks',()=>{
  const base=factory(8,8),ctx=base.getContext('2d');for(let y=0;y<8;y++)for(let x=0;x<8;x++){ctx.fillStyle=`rgb(${x*29},${y*29},${(x+y)*15})`;ctx.fillRect(x,y,1,1);}
  const layers=createForegroundLayers(base,[{id:'a',paths:[{type:'stroke',points:[[0,0],[7,7]],radius:2,opacity:.4}]},{id:'b',paths:pathsFor(1,1,4,4,.5)}],{canvasFactory:factory});
  const scene=compositeLayeredScene({backgroundCanvas:base,foregroundLayers:layers,canvasFactory:factory});
  assert.deepEqual(Array.from(scene.canvas.getContext('2d').getImageData(0,0,8,8).data),Array.from(ctx.getImageData(0,0,8,8).data));assert.equal(visibleTargetRegions(scene.visibleTarget,2).size,0);
});

test('single-mask wrapper and pure alpha rule handle partial target transparency',()=>{
  const target={width:1,height:1,data:new Uint8ClampedArray([200,100,50,128])},mask={width:1,height:1,data:new Uint8ClampedArray([255,255,255,128])};
  assert.equal(visibleTargetAlpha(target,mask).data[3],64);
  assert.equal(visibleTargetRegions({width:1,height:1,data:new Uint8ClampedArray([0,0,0,32])},1).size,0);
  assert.equal(visibleTargetRegions({width:1,height:1,data:new Uint8ClampedArray([0,0,0,33])},1).size,1);
  const c=solid(4,4,'#001122'),t=solid(1,1,'#ff0000'),m=createMask(4,factory);rasterizeMaskPaths(m,pathsFor(1,1,1,1));
  const scene=compositeScene({background:c,target:t,targetRect:{x:1,y:1,width:1,height:1},mask:m,size:4,canvasFactory:factory});
  assert.deepEqual(pixel(scene.canvas,1,1),[0,17,34,255]);assert.equal(visibleTargetRegions(scene.visibleTarget,2).size,0);
});

test('canvas drawing state is preserved while scene coordinates stay untransformed',()=>{
  const base=solid(4,4,'#004400'),target=solid(1,1,'#ff0000'),mask=createMask(4,factory),maskCtx=mask.getContext('2d');
  maskCtx.translate(10,10);maskCtx.globalAlpha=.2;rasterizeMaskPaths(mask,pathsFor(1,1,1,1));assert.equal(pixel(mask,1,1)[3],255);assert.equal(maskCtx.globalAlpha,.2);assert.equal(maskCtx.getTransform().e,10);
  const layers=layerFor(base,pathsFor(1,1,1,1)),out=solid(4,4,'#0000ff'),occ=createMask(4,factory),outCtx=out.getContext('2d'),occCtx=occ.getContext('2d');
  outCtx.translate(10,10);outCtx.globalAlpha=.5;occCtx.globalCompositeOperation='destination-out';occCtx.globalAlpha=.25;
  const outputAlpha=outCtx.globalAlpha,occluderAlpha=occCtx.globalAlpha;
  const scene=compositeLayeredScene({backgroundCanvas:base,target,targetRect:{x:1,y:1,width:1,height:1},foregroundLayers:layers,outputCanvas:out,occlusionMaskCanvas:occ,canvasFactory:factory});
  assert.deepEqual(pixel(scene.canvas,1,1),[0,68,0,255]);assert.equal(visibleTargetRegions(scene.visibleTarget,2).size,0);assert.equal(outCtx.globalAlpha,outputAlpha);assert.equal(outCtx.getTransform().e,10);assert.equal(occCtx.globalCompositeOperation,'destination-out');assert.equal(occCtx.globalAlpha,occluderAlpha);
});

test('aliased destination canvases and wrong-sized layers fail before changing the base',()=>{
  const base=solid(4,4,'#123456'),target=solid(1,1,'#ff0000'),before=pixel(base,0,0);
  assert.throws(()=>compositeLayeredScene({backgroundCanvas:base,outputCanvas:base,canvasFactory:factory}),/distinct/);
  assert.deepEqual(pixel(base,0,0),before);
  const out=factory(4,4);assert.throws(()=>compositeLayeredScene({backgroundCanvas:base,outputCanvas:out,targetCanvas:out,canvasFactory:factory}),/distinct/);
  const bad={id:'bad',maskCanvas:createMask(2,factory),foregroundCanvas:solid(2,2,'#fff'),zIndex:10};
  assert.throws(()=>compositeLayeredScene({backgroundCanvas:base,target,targetRect:{x:0,y:0,width:1,height:1},foregroundLayers:[bad],canvasFactory:factory}),/dimensions/);
});

test('registered classic-art presets produce source-pixel PNGs and occlude a target',async()=>{
  const dist=fileURLToPath(new URL('../dist/',import.meta.url)),presets=JSON.parse(fs.readFileSync(path.join(dist,'foreground-presets.json'),'utf8'));
  assert.equal(presets.sceneSize,512);
  for(const id of ['bruegel','seurat']) {
    const preset=presets.backgrounds[id],image=await loadImage(path.join(dist,preset.asset));
    assert.deepEqual([image.width,image.height],preset.sourceDimensions);const crop=coverCropRect(image.width,image.height,512,512);
    for(const key of ['sx','sy','sw','sh'])assert.ok(Math.abs(crop[key]-preset.coverCrop[key])<1e-9);
    assert.equal(preset.layers.length,3);const base=renderBackground(image,{canvasFactory:factory}),layers=createForegroundLayers(base,preset.layers,{canvasFactory:factory});
    for(const layer of layers) {
      assert.ok(layer.enabled);assert.ok(layer.bounds.width>0&&layer.bounds.height>0);assert.match(layer.pngDataURL,/^data:image\/png;base64,/);
      const alpha=layer.maskCanvas.getContext('2d').getImageData(0,0,512,512).data;let index=-1;
      for(let i=3;i<alpha.length;i+=4)if(alpha[i]===255){index=(i-3)/4;break;}
      assert.ok(index>=0);const x=index%512,y=Math.floor(index/512);assert.deepEqual(pixel(layer.foregroundCanvas,x,y),pixel(base,x,y));
      const target=solid(1,1,'#ff00ff'),scene=compositeLayeredScene({backgroundCanvas:base,target,targetRect:{x,y,width:1,height:1},foregroundLayers:[layer],canvasFactory:factory});
      assert.deepEqual(pixel(scene.canvas,x,y),pixel(base,x,y));assert.equal(visibleTargetRegions(scene.visibleTarget,64).size,0);
    }
    const absent=compositeLayeredScene({backgroundCanvas:base,foregroundLayers:layers,canvasFactory:factory});
    assert.deepEqual(absent.canvas.getContext('2d').getImageData(0,0,512,512).data,base.getContext('2d').getImageData(0,0,512,512).data);
  }
});

test('canonical depth anchor uses opaque silhouette bottom, not transparent padding',()=>{
  const source=factory(10,12),ctx=source.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(2,3,6,5);
  const anchor=getDepthAnchor(source);assert.deepEqual(anchor.bounds,{x:2,y:3,width:6,height:5});assert.equal(anchor.y,8);assert.equal(anchor.x,5);
  const low={width:1,height:2,data:new Uint8ClampedArray([255,0,0,255,255,0,0,32])};assert.equal(getDepthAnchor(low).y,1);assert.equal(getDepthAnchor(low,{alphaThreshold:0}).y,2);
  assert.equal(getDepthAnchor(factory(2,2)).y,null);assert.throws(()=>getDepthAnchor(source,{alphaThreshold:NaN}),/finite/);
});

test('depth bounds are cached and explicit invalidation supports mutable source canvases',()=>{
  const source=factory(6,8),ctx=source.getContext('2d');ctx.fillRect(1,1,2,2);
  const first=getDepthAnchor(source),second=getDepthAnchor(source);assert.strictEqual(first,second);assert.ok(Object.isFrozen(first));
  ctx.fillRect(1,5,2,2);assert.strictEqual(getDepthAnchor(source),first);
  invalidateDepthAnchor(source);assert.equal(getDepthAnchor(source).y,7);assert.notStrictEqual(getDepthAnchor(source),first);
  ctx.clearRect(0,0,6,8);assert.equal(getDepthAnchor(source,{useCache:false}).y,null);
  invalidateDepthAnchor();assert.equal(getDepthAnchor(source).y,null);
});

test('auto lower feet put the target in front; higher and tied feet keep it behind',()=>{
  const base=solid(32,32,'#285078'),target=solid(8,8,'#ff0000');
  const layers=layerFor(base,[{type:'polygon',points:[[6,8],[22,8],[22,24],[6,24]]}],-100);
  const options={backgroundCanvas:base,target,foregroundLayers:layers,targetDepthMode:'auto',canvasFactory:factory};
  const higher=compositeLayeredScene({...options,targetRect:{x:10,y:12,width:8,height:8}});
  assert.equal(higher.targetDepthAnchorY,20);assert.deepEqual(higher.depthOrder,['$target','foreground']);assert.equal(higher.layerDepths[0].aboveTarget,true);assert.deepEqual(pixel(higher.canvas,12,15),pixel(base,12,15));
  const lower=compositeLayeredScene({...options,targetRect:{x:10,y:18,width:8,height:8}});
  assert.equal(lower.targetDepthAnchorY,26);assert.deepEqual(lower.depthOrder,['foreground','$target']);assert.equal(lower.layerDepths[0].aboveTarget,false);assert.deepEqual(pixel(lower.canvas,12,20),[255,0,0,255]);
  const tie=compositeLayeredScene({...options,targetRect:{x:10,y:16,width:8,height:8}});
  assert.equal(tie.targetDepthAnchorY,24);assert.equal(tie.layerDepths[0].aboveTarget,true);assert.deepEqual(pixel(tie.canvas,12,18),pixel(base,12,18));
  const targetWins=compositeLayeredScene({...options,targetRect:{x:10,y:16,width:8,height:8},depthTieBreak:'target-front'});
  assert.deepEqual(targetWins.depthOrder,['foreground','$target']);assert.deepEqual(pixel(targetWins.canvas,12,18),[255,0,0,255]);
});

test('auto resolves each object separately and ignores inverted manual z indexes',()=>{
  const base=solid(64,64,'#285078'),target=solid(20,20,'#ff0000');
  const layers=createForegroundLayers(base,[{id:'upper',zIndex:100,paths:pathsFor(8,10,24,20)},{id:'lower',zIndex:-100,paths:pathsFor(24,25,24,25)}],{canvasFactory:factory});
  const options={backgroundCanvas:base,target,targetRect:{x:16,y:20,width:20,height:20},foregroundLayers:layers,targetDepthMode:'auto',canvasFactory:factory};
  const scene=compositeLayeredScene(options);assert.deepEqual(scene.depthOrder,['upper','$target','lower']);
  assert.deepEqual(scene.layerDepths.map(l=>[l.id,l.depthAnchorY,l.aboveTarget]),[['upper',30,false],['lower',50,true]]);
  assert.deepEqual(pixel(scene.canvas,20,25),[255,0,0,255]);assert.deepEqual(pixel(scene.canvas,28,28),pixel(base,28,28));
  const reversed=compositeLayeredScene({...options,foregroundLayers:[...layers].reverse()});assert.deepEqual(reversed.depthOrder,scene.depthOrder);
  assert.deepEqual(reversed.canvas.getContext('2d').getImageData(0,0,64,64).data,scene.canvas.getContext('2d').getImageData(0,0,64,64).data);
  const manual=compositeLayeredScene({...options,targetDepthMode:'manual'});assert.deepEqual(manual.depthOrder,['lower','$target','upper']);assert.deepEqual(pixel(manual.canvas,20,25),pixel(base,20,25));
});

test('auto convention is configurable, overrides survive serialization, and foreground ties are stable',()=>{
  const base=solid(32,32,'#285078'),target=solid(8,8,'#ff0000');
  const definitions=[{id:'a',depthAnchorY:20,paths:pathsFor(8,8,16,16)},{id:'b',depthAnchorY:20,paths:pathsFor(8,8,16,16)}];
  const layers=createForegroundLayers(base,definitions,{canvasFactory:factory});
  assert.equal(serializeForegroundLayers(layers)[0].depthAnchorY,20);assert.equal(layers[0].depthAnchorY,20);
  const options={backgroundCanvas:base,target,targetRect:{x:10,y:10,width:8,height:8},foregroundLayers:layers,targetDepthMode:'auto',targetDepthAnchorY:20,canvasFactory:factory};
  assert.deepEqual(compositeLayeredScene(options).depthOrder,['$target','a','b']);
  const inverted=compositeLayeredScene({...options,targetDepthAnchorY:18,depthConvention:'front-when-higher'});assert.deepEqual(inverted.depthOrder,['a','b','$target']);
  assert.ok(inverted.layerDepths.every(l=>l.anchorSource==='override'&&!l.aboveTarget));
  assert.throws(()=>serializeForegroundLayers([{id:'invalid',depthAnchorY:NaN}]),/finite/);
  assert.throws(()=>compositeLayeredScene({...options,targetDepthMode:'magic'}),/manual or auto/);
  assert.throws(()=>compositeLayeredScene({...options,depthConvention:'random'}),/convention/);
});

test('fractional placement projects cached local feet continuously and excludes source padding',()=>{
  const base=solid(32,32,'#285078'),target=factory(8,12),ctx=target.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,8,8);
  const layers=layerFor(base,pathsFor(4,4,20,16));
  const options={backgroundCanvas:base,target,targetRect:{x:8.25,y:12.125,width:8,height:12},foregroundLayers:layers,targetDepthMode:'auto',canvasFactory:factory};
  const scene=compositeLayeredScene(options);assert.equal(scene.targetDepthAnchorY,20.125);assert.equal(scene.layerDepths[0].aboveTarget,false);
  assert.deepEqual(pixel(scene.canvas,10,16),[255,0,0,255]);
  const higher=compositeLayeredScene({...options,targetRect:{...options.targetRect,y:11.875}});assert.equal(higher.targetDepthAnchorY,19.875);assert.equal(higher.layerDepths[0].aboveTarget,true);
  assert.deepEqual(pixel(higher.canvas,10,16),pixel(base,10,16));
  const scaled=compositeLayeredScene({...options,targetRect:{x:8.5,y:3.25,width:8,height:24}});assert.equal(scaled.targetDepthAnchorY,19.25);
});

test('auto occlusion follows actual PNG alpha instead of an oversized helper mask',()=>{
  const base=solid(32,32,'#285078'),foreground=factory(32,32),ctx=foreground.getContext('2d');ctx.fillStyle='#285078';ctx.fillRect(8,8,16,8);
  const mask=createMask(32,factory);rasterizeMaskPaths(mask,pathsFor(0,0,32,32));
  const layer={id:'actual-png',zIndex:999,foregroundCanvas:foreground,maskCanvas:mask};
  const scene=compositeLayeredScene({backgroundCanvas:base,target:solid(8,8,'#ff0000'),targetRect:{x:10,y:10,width:8,height:8},foregroundLayers:[layer],targetDepthMode:'auto',canvasFactory:factory});
  assert.equal(scene.layerDepths[0].depthAnchorY,16);assert.equal(scene.layerDepths[0].aboveTarget,false);assert.equal(scene.visibleTarget.data[(14*32+14)*4+3],255);
});

test('auto absence restores real Original Festival bytes and actual cutout PNGs set the feet',async()=>{
  const dist=fileURLToPath(new URL('../dist/',import.meta.url));
  const base=renderBackground(await loadImage(path.join(dist,'assets/crowd-captcha.png')),{canvasFactory:factory});
  const presets=JSON.parse(fs.readFileSync(path.join(dist,'foreground-presets.json'),'utf8')).backgrounds.legacy;
  const layers=createForegroundLayers(base,presets.layers,{canvasFactory:factory});
  const absent=compositeLayeredScene({backgroundCanvas:base,foregroundLayers:layers,targetDepthMode:'auto',canvasFactory:factory});
  assert.deepEqual(absent.canvas.getContext('2d').getImageData(0,0,512,512).data,base.getContext('2d').getImageData(0,0,512,512).data);assert.equal(absent.targetDepthAnchorY,null);assert.ok(absent.layerDepths.every(l=>!l.aboveTarget));
  for(const layer of layers) {
    const anchor=getDepthAnchor(layer.foregroundCanvas),decoded=await loadImage(layer.pngDataURL),decodedAnchor=getDepthAnchor(decoded,{canvasFactory:factory});
    assert.deepEqual(decodedAnchor.bounds,anchor.bounds);assert.equal(decodedAnchor.y,anchor.y);
    const alpha=layer.foregroundCanvas.getContext('2d').getImageData(0,0,512,512).data;let sample=-1;
    for(let i=3;i<alpha.length;i+=4)if(alpha[i]===255){sample=(i-3)/4;break;}
    const x=sample%512,y=Math.floor(sample/512),height=Math.ceil(anchor.y-y+8),target=solid(12,height,'#ff00ff');
    const opts={backgroundCanvas:base,target,foregroundLayers:[layer],targetDepthMode:'auto',canvasFactory:factory};
    const behind=compositeLayeredScene({...opts,targetRect:{x:x-6,y:anchor.y-height-1,width:12,height}});
    assert.equal(behind.layerDepths[0].aboveTarget,true);assert.deepEqual(pixel(behind.canvas,x,y),pixel(base,x,y));
    const front=compositeLayeredScene({...opts,targetRect:{x:x-6,y:anchor.y-height+1,width:12,height}});
    assert.equal(front.layerDepths[0].aboveTarget,false);assert.deepEqual(pixel(front.canvas,x,y),[255,0,255,255]);
  }
});

test('actual original explorer PNG bottom sets the continuous target anchor after rasterization',async()=>{
  const dist=fileURLToPath(new URL('../dist/',import.meta.url)),source=await loadImage(path.join(dist,'assets/character.png'));
  const target=factory(32,48);target.getContext('2d').drawImage(source,0,0,32,48);
  const rgba=target.getContext('2d').getImageData(0,0,32,48).data;let expectedBottom=0;
  for(let y=0;y<48;y++)for(let x=0;x<32;x++)if(rgba[(y*32+x)*4+3]>32)expectedBottom=Math.max(expectedBottom,y+1);
  assert.ok(expectedBottom>0&&expectedBottom<48);
  const scene=compositeLayeredScene({backgroundCanvas:solid(512,512,'#123456'),target,targetRect:{x:111.25,y:200.375,width:32,height:48},targetDepthMode:'auto',canvasFactory:factory});
  assert.equal(scene.targetDepthAnchorY,200.375+expectedBottom);assert.deepEqual(scene.depthOrder,['$target']);
});

test('single-mask convenience wrapper forwards auto-depth options',()=>{
  const base=solid(32,32,'#285078'),target=solid(8,8,'#ff0000'),mask=createMask(32,factory);rasterizeMaskPaths(mask,pathsFor(6,8,16,16));
  const scene=compositeScene({background:base,target,targetRect:{x:10,y:18,width:8,height:8},mask,size:32,targetDepthMode:'auto',canvasFactory:factory});
  assert.equal(scene.targetDepthAnchorY,26);assert.deepEqual(scene.depthOrder,['custom-mask','$target']);assert.deepEqual(pixel(scene.canvas,12,20),[255,0,0,255]);
});
