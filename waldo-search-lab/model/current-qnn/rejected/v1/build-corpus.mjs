/** Native current-scene corpus. Features receive final pixels/size only. */
import fs from 'node:fs';import path from 'node:path';import{createRequire}from'node:module';import{pathToFileURL}from'node:url';import{createHash}from'node:crypto';
const taskRoot='C:/Users/henri/Documents/Codex/2026-10-10/new-chat',out=path.join(taskRoot,'work/qnn-current'),dist=path.join(taskRoot,'outputs/waldo-search-lab/dist'),require=createRequire(import.meta.url);
const{createCanvas,loadImage}=require('C:/Users/henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const{extractWindowFeatures,FEATURE_VERSION,FEATURE_NAMES}=await import(pathToFileURL(path.join(dist,'qnn-localizer.js')));
const{compositeLayeredScene}=await import(pathToFileURL(path.join(dist,'scene-editor.js')));
const factory=(w,h)=>createCanvas(w,h),sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const protocol=JSON.parse(fs.readFileSync(path.join(out,'protocol.json'),'utf8')),catalog=JSON.parse(fs.readFileSync(path.join(dist,'scene-catalog.json'),'utf8'));
const mode=process.argv[2]??'corpus',manifest={featureVersion:FEATURE_VERSION,featureNames:FEATURE_NAMES,sourceHashes:{generator:sha(path.join(out,'build-corpus.mjs')),featureJS:sha(path.join(dist,'qnn-localizer.js')),rendererJS:sha(path.join(dist,'scene-editor.js')),protocol:sha(path.join(out,'protocol.json'))},rendering:'@napi-rs/canvas native high-quality target resize; normalized512 PNGs drawn1:1; exact registered band source pixels'};
const rngFor=seed=>{let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};};
const integer=(rng,low,high)=>low+Math.floor(rng()*(high-low));
const role=(cx,cy)=>(Math.floor(cx/8)+3*Math.floor(cy/8))%10;
const belongs=(split,cx,cy)=>split==='train'?role(cx,cy)<=6:split==='validation'?role(cx,cy)===7:role(cx,cy)>=8;
const centers=Array.from({length:4096},(_,i)=>[(i%64+.5)*8,(Math.floor(i/64)+.5)*8]);
const source=await loadImage(path.join(dist,'assets/open-art/openmoji-striped-standing.png')),sourceCanvas=factory(source.width,source.height);sourceCanvas.getContext('2d').drawImage(source,0,0);const original=sourceCanvas.getContext('2d').getImageData(0,0,source.width,source.height);let x0=source.width,y0=source.height,x1=0,y1=0;
for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(original.data[(y*source.width+x)*4+3]>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);}
manifest.target={file:'assets/open-art/openmoji-striped-standing.png',sha256:sha(path.join(dist,'assets/open-art/openmoji-striped-standing.png')),trim:[x0,y0,x1,y1],aspect:(x1-x0)/(y1-y0)};
const trimmed=factory(x1-x0,y1-y0);trimmed.getContext('2d').drawImage(source,x0,y0,x1-x0,y1-y0,0,0,trimmed.width,trimmed.height);
const rasters=new Map();
function raster(height,kind='target'){
 const key=height+':'+kind;if(rasters.has(key))return rasters.get(key);const width=Math.max(1,Math.round(height*trimmed.width/trimmed.height)),c=factory(width,height),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(trimmed,0,0,width,height);
 if(kind!=='target'){const d=ctx.getImageData(0,0,width,height);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,r=d.data[i],g=d.data[i+1],b=d.data[i+2],red=r>125&&r>1.38*g&&r>1.25*b;if(kind==='blue-stripes'&&red){d.data[i]=30;d.data[i+1]=110;d.data[i+2]=205;}if(kind==='solid-red'&&y>=height*.18&&y<height*.6&&Math.min(r,g,b)>170&&d.data[i+3]>32){d.data[i]=220;d.data[i+1]=35;d.data[i+2]=35;}}ctx.putImageData(d,0,0);}
 rasters.set(key,c);return c;
}
const scenes=[];manifest.scenes=[];
for(const id of protocol.scenes){const entry=catalog.scenes.find(s=>s.id===id),image=await loadImage(path.join(dist,entry.src)),base=factory(512,512);base.getContext('2d').drawImage(image,0,0);const regFile=path.join(dist,'assets/depth-bands',id,'registrations.json'),reg=JSON.parse(fs.readFileSync(regFile,'utf8')),layers=[];
 for(const band of reg.bands){const foreground=await loadImage(path.join(dist,band.cutoutPNG)),mask=await loadImage(path.join(dist,band.maskPNG)),fc=factory(512,512),mc=factory(512,512);fc.getContext('2d').drawImage(foreground,0,0);mc.getContext('2d').drawImage(mask,0,0);const d=mc.getContext('2d').getImageData(0,0,512,512).data,points=[];for(let i=3;i<d.length;i+=4)if(d[i]>32)points.push((i-3)/4);layers.push({...band,foregroundCanvas:fc,maskCanvas:mc,points,cutoutCanvas:fc});}
 scenes.push({id,base,layers,data:base.getContext('2d').getImageData(0,0,512,512)});manifest.scenes.push({id,source:entry.src,sourceSha256:sha(path.join(dist,entry.src)),bandRegistrationsSha256:sha(regFile),bands:reg.bands.map(b=>({id:b.id,foregroundSha256:sha(path.join(dist,b.cutoutPNG)),maskSha256:sha(path.join(dist,b.maskPNG))}))});
}
function render(scene,height,cx,cy,kind='target'){
 const target=raster(height,kind),rect={x:Math.round(cx-target.width/2),y:Math.round(cy-target.height/2),width:target.width,height},frame=compositeLayeredScene({backgroundCanvas:scene.base,target,targetRect:rect,foregroundLayers:scene.layers,targetDepthMode:'auto',depthConvention:'front-when-lower',canvasFactory:factory}),visible=frame.visibleTarget.data,full=frame.targetCanvas.getContext('2d').getImageData(0,0,512,512).data;let mass=0,remaining=0;for(let i=3;i<visible.length;i+=4){mass+=full[i];remaining+=visible[i];}
 return{data:frame.canvas.getContext('2d').getImageData(0,0,512,512),cx:rect.x+target.width/2,cy:rect.y+height/2,width:target.width,height,visibleFraction:mass?remaining/mass:0};
}
function drawScene(split,index,rng){
 const scene=scenes[index%scenes.length];let attempts=0;
 while(attempts++<1000){const height=integer(rng,24,113);let cx=integer(rng,8,505),cy=integer(rng,8,505);
  if(index%2===0){const layer=scene.layers[integer(rng,0,scene.layers.length)];if(layer.points.length){const point=layer.points[integer(rng,0,layer.points.length)];cx=point%512+integer(rng,-8,9);cy=Math.round(layer.depthAnchorY-height*(.55+rng()*.55));}}
  if(cx<8||cx>504||cy<8||cy>504||!belongs(split,cx,cy))continue;const result=render(scene,height,cx,cy);
  if(result.visibleFraction>=.20&&belongs(split,result.cx,result.cy))return{...result,scene,attempts,id:`${split}-${index}`};
 }
 throw Error('Target draw budget exhausted for '+split+' '+index);
}
function writeVectors(name,features,labels){const matrix=Float64Array.from(features.flat()),ys=Uint8Array.from(labels);fs.writeFileSync(path.join(out,name+'.f64'),Buffer.from(matrix.buffer));fs.writeFileSync(path.join(out,name+'.u8'),Buffer.from(ys.buffer));return{n:labels.length,positives:labels.filter(y=>y===1).length,negative:labels.filter(y=>y===0).length,features:name+'.f64',labels:name+'.u8',featuresSha256:sha(path.join(out,name+'.f64')),labelsSha256:sha(path.join(out,name+'.u8'))};}
for(const split of ['train','validation','test']){
 if(mode==='full-validation'&&split!=='validation'||mode==='full-test'&&split!=='test')continue;
 const rng=rngFor(protocol.splitSeeds[split]),records=[],features=[],labels=[];const full=mode.startsWith('full-'),fd=full?fs.openSync(path.join(out,split+'-scene-features.f64'),'w'):null;let rowOffset=0;
 for(let i=0;i<protocol.targetScenes[split];i++){
  const sceneRng=rngFor((protocol.splitSeeds[split]+Math.imul(i+1,104729))>>>0),s=drawScene(split,i,sceneRng);records.push({id:s.id,scene:s.scene.id,height:s.height,width:s.width,center:[s.cx,s.cy],visibleFraction:s.visibleFraction,attempts:s.attempts,kind:'target',featureRowOffset:rowOffset});
  if(full){const values=centers.map(([x,y])=>extractWindowFeatures(s.data,x,y,{targetWidth:s.width,targetHeight:s.height})),matrix=Float64Array.from(values.flat());fs.writeSync(fd,Buffer.from(matrix.buffer));rowOffset+=4096;}
  else{
   const near=[Math.min(63,Math.max(0,Math.round((s.cx-4)/8)))*8+4,Math.min(63,Math.max(0,Math.round((s.cy-4)/8)))*8+4];
   const windows=[near,[s.cx+integer(rng,-4,5),s.cy+integer(rng,-4,5)]];
   for(let k=0;k<6;k++){const offset=integer(rng,8,33),angle=rng()*2*Math.PI;windows.push([s.cx+Math.cos(angle)*offset,s.cy+Math.sin(angle)*offset]);}
   for(const[x,y]of windows){features.push(extractWindowFeatures(s.data,x,y,{targetWidth:s.width,targetHeight:s.height}));labels.push(Number(Math.hypot(x-s.cx,y-s.cy)<=6.657));}
   if(i%3===0){const decoy=render(s.scene,s.height,s.cx,s.cy,i%2?'solid-red':'blue-stripes');features.push(extractWindowFeatures(decoy.data,near[0],near[1],{targetWidth:s.width,targetHeight:s.height}));labels.push(0);}
  }
  if(i%25===0)console.log(JSON.stringify({mode,split,targetScenes:i,elapsedMs:Math.round(performance.now())}));
 }
 const heights=split==='train'?protocol.trainingAbsenceHeights:split==='validation'?protocol.validationAbsenceHeights:[24,52,80,112];
 for(const scene of scenes)for(const height of heights){const width=raster(height).width;
  if(full){const matrix=Float64Array.from(centers.map(([x,y])=>extractWindowFeatures(scene.data,x,y,{targetWidth:width,targetHeight:height})).flat());fs.writeSync(fd,Buffer.from(matrix.buffer));records.push({id:`${split}-empty-${scene.id}-h${height}`,kind:'absent',scene:scene.id,height,width,center:null,visibleFraction:0,featureRowOffset:rowOffset});rowOffset+=4096;}
  else for(const[x,y]of centers)if(belongs(split,x,y)){features.push(extractWindowFeatures(scene.data,x,y,{targetWidth:width,targetHeight:height}));labels.push(0);}
 }
 if(fd!==null)fs.closeSync(fd);
 const metadata={...manifest,split,seed:protocol.splitSeeds[split],mode,records,...(full?{features:split+'-scene-features.f64',rows:rowOffset,featuresSha256:sha(path.join(out,split+'-scene-features.f64'))}:writeVectors(split,features,labels))};fs.writeFileSync(path.join(out,split+(full?'-scenes':'-dataset')+'.json'),JSON.stringify(metadata,null,2)+'\n');console.log(JSON.stringify({completed:split,mode,rows:metadata.n??rowOffset}));
}
if(sha(path.join(dist,'qnn-localizer.js'))!==manifest.sourceHashes.featureJS)throw Error('Feature source changed during corpus generation: discard/rebuild this corpus.');
