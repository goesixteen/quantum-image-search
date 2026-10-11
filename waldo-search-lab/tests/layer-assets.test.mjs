import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {getDepthAnchor,renderBackground,compositeLayeredScene} from '../dist/scene-editor.js';
const require=createRequire(import.meta.url);
let canvas;
try { canvas=require('@napi-rs/canvas'); }
catch { canvas=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas')); }
const {createCanvas,loadImage}=canvas;
const factory=(w,h)=>createCanvas(w,h),dir=fileURLToPath(new URL('../dist/',import.meta.url));
const catalog=JSON.parse(fs.readFileSync(dir+'/historical-scene-catalog.json')),presets=JSON.parse(fs.readFileSync(dir+'/foreground-presets.json'));
test('historical catalog retains the exact three scenes used by the archived layer benchmark',()=>{
  assert.deepEqual(catalog.scenes.map(s=>s.id),['legacy','magic-arena','qualicity-queue']);
  for(const s of catalog.scenes.slice(1)){assert.equal(s.license,'CC BY 4.0');assert.match(s.creditUrl,/^https:\/\/www.peppercarrot.com\//);assert.ok(fs.existsSync(dir+'/'+s.src));}
});
for(const scene of catalog.scenes)test(scene.id+': stored PNG registrations preserve source pixels and feet-depth behavior',async()=>{
  const base=renderBackground(await loadImage(dir+'/'+scene.src),{canvasFactory:factory});
  const baseData=base.getContext('2d').getImageData(0,0,512,512).data;
  const record=JSON.parse(fs.readFileSync(dir+'/assets/layers/'+scene.id+'/registrations.json'));
  const definitions=presets.backgrounds[scene.id].layers;
  assert.ok(definitions.length>=6);assert.equal(record.layers.length,definitions.length);
  const layers=[];
  for(const d of definitions){
    const reg=record.layers.find(r=>r.id===d.id),bytes=fs.readFileSync(dir+'/'+reg.png);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),reg.sha256);
    const png=await loadImage(bytes),cutout=factory(png.width,png.height);cutout.getContext('2d').drawImage(png,0,0);
    assert.equal(png.width,reg.width);assert.equal(png.height,reg.height);assert.deepEqual(d.cutoutPosition,reg.position);
    const anchor=getDepthAnchor(cutout);assert.equal(reg.position.y+anchor.y,reg.depthAnchorY);assert.equal(d.depthAnchorY,reg.depthAnchorY);
    const foreground=factory(512,512),mask=factory(512,512);foreground.getContext('2d').drawImage(png,reg.position.x,reg.position.y);mask.getContext('2d').drawImage(await loadImage(dir+'/'+reg.maskPNG),0,0);
    const rgba=foreground.getContext('2d').getImageData(0,0,512,512).data;let opaquePixels=0,sample=-1;
    for(let i=0;i<rgba.length;i+=4)if(rgba[i+3]===255){assert.deepEqual(Array.from(rgba.slice(i,i+3)),Array.from(baseData.slice(i,i+3)),d.id+' source RGB');opaquePixels++;if(sample<0)sample=i/4;}
    assert.ok(opaquePixels>0,d.id+' has original opaque pixels');
    const l={...d,foregroundCanvas:foreground,maskCanvas:mask};layers.push(l);
    const target=factory(512,512);target.getContext('2d').fillStyle='#ff00ff';target.getContext('2d').fillRect(0,0,512,512);
    const sx=sample%512,sy=Math.floor(sample/512),opts={backgroundCanvas:base,target,foregroundLayers:[l],targetDepthMode:'auto',canvasFactory:factory};
    const behind=compositeLayeredScene({...opts,targetRect:{x:0,y:reg.depthAnchorY-513,width:512,height:512}}),front=compositeLayeredScene({...opts,targetRect:{x:0,y:reg.depthAnchorY-511,width:512,height:512}});
    assert.equal(behind.layerDepths[0].aboveTarget,true);assert.equal(front.layerDepths[0].aboveTarget,false);
    assert.deepEqual(Array.from(behind.canvas.getContext('2d').getImageData(sx,sy,1,1).data),Array.from(baseData.slice(sample*4,sample*4+4)));
    assert.deepEqual(Array.from(front.canvas.getContext('2d').getImageData(sx,sy,1,1).data),[255,0,255,255]);
  }
  const absent=compositeLayeredScene({backgroundCanvas:base,foregroundLayers:layers,targetDepthMode:'auto',canvasFactory:factory});
  assert.deepEqual(absent.canvas.getContext('2d').getImageData(0,0,512,512).data,baseData);
});
