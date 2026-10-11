/** node model/build-depth-bands.mjs legacy [--band-height 16]
 * Load actual registered object PNGs, retain whole silhouettes, export full-scene rows.
 */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {createRequire} from 'node:module';import {homedir} from 'node:os';import {fileURLToPath} from 'node:url';
import {createDepthBands} from '../dist/depth-bands.js';
const require=createRequire(import.meta.url);let canvas;try{canvas=require('@napi-rs/canvas');}catch{canvas=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'));}
const {createCanvas,loadImage}=canvas,factory=(w,h)=>createCanvas(w,h),dist=fileURLToPath(new URL('../dist/',import.meta.url));
const scene=process.argv[2];if(!scene||scene.startsWith('--'))throw Error('Provide a scene id; Original Festival is legacy.');
const bh=process.argv.indexOf('--band-height'),bandHeight=bh<0?16:Number(process.argv[bh+1]),presets=JSON.parse(fs.readFileSync(path.join(dist,'foreground-presets.json'))),definitions=presets.backgrounds[scene]?.layers;if(!definitions)throw Error('Unknown scene '+scene);
const registrations=JSON.parse(fs.readFileSync(path.join(dist,'assets/layers',scene,'registrations.json'))),layers=[],sourceObjects=[],hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const d of definitions){
  const r=registrations.layers.find(r=>r.id===d.id);if(!r||r.png!==d.cutoutPNG||r.maskPNG!==d.maskPNG||JSON.stringify(r.position)!==JSON.stringify(d.cutoutPosition))throw Error('Object registration mismatch '+d.id);
  const bytes=fs.readFileSync(path.join(dist,d.cutoutPNG));if(hash(bytes)!==r.sha256)throw Error('Object hash mismatch '+d.id);
  const image=await loadImage(bytes),maskImage=await loadImage(path.join(dist,d.maskPNG)),foregroundCanvas=factory(512,512),maskCanvas=factory(512,512);
  if(image.width!==r.width||image.height!==r.height||maskImage.width!==512||maskImage.height!==512)throw Error('Object dimensions mismatch '+d.id);
  foregroundCanvas.getContext('2d').drawImage(image,r.position.x,r.position.y);maskCanvas.getContext('2d').drawImage(maskImage,0,0);layers.push({...d,foregroundCanvas,maskCanvas});sourceObjects.push({id:d.id,png:d.cutoutPNG,sha256:r.sha256,maskPNG:d.maskPNG,maskSHA256:hash(fs.readFileSync(path.join(dist,d.maskPNG))),position:r.position});
}
const result=createDepthBands(layers,{bandHeight,canvasFactory:factory,includeDataURLs:false}),relative='assets/depth-bands/'+scene,outDir=path.join(dist,relative);fs.mkdirSync(outDir,{recursive:true});
function save(name,canvas){const bytes=canvas.toBuffer('image/png');fs.writeFileSync(path.join(outDir,name),bytes);return {path:relative+'/'+name,sha256:hash(bytes),width:canvas.width,height:canvas.height};}
const atlas=save('objects-only.png',result.objectAtlasCanvas),bands=result.bands.map(b=>{const image=save(b.id+'.png',b.foregroundCanvas),mask=save(b.id+'-mask.png',b.maskCanvas);return {id:b.id,name:b.name,enabled:true,zIndex:b.zIndex,paths:[],level:b.level,depthRange:b.depthRange,memberIDs:b.memberIDs,memberDepthAnchors:b.memberDepthAnchors,depthAnchorY:b.depthAnchorY,bounds:b.bounds,cutoutPNG:image.path,maskPNG:mask.path,cutoutPosition:{x:0,y:0},sha256:image.sha256,maskSHA256:mask.sha256,width:512,height:512};});
const record={version:1,scene,sceneSize:512,bandHeight,alphaThreshold:32,depthConvention:'front-when-lower',depthTieBreak:'foreground-front',method:'Whole supplied transparent object PNGs grouped by floor((alphaBottom-1)/bandHeight). Each full-scene row uses maximum member bottom; silhouettes are never horizontally sliced. Known authored masks, not semantic segmentation or automatic ground removal.',objectAtlas:atlas,sourceObjects,objects:result.objects,bands};
fs.writeFileSync(path.join(outDir,'registrations.json'),JSON.stringify(record,null,2)+'\n');
const presetPath=path.join(dist,'depth-band-presets.json'),merged=fs.existsSync(presetPath)?JSON.parse(fs.readFileSync(presetPath)):{version:1,backgrounds:{}};
merged.backgrounds[scene]={bandHeight,alphaThreshold:32,objectAtlas:atlas.path,registration:relative+'/registrations.json',layers:bands};fs.writeFileSync(presetPath,JSON.stringify(merged,null,2)+'\n');
console.log(JSON.stringify({scene,objects:result.objects.length,bands:bands.length,bandHeight,atlas:atlas.path,levels:bands.map(b=>b.level)}));
