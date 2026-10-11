/** Pixel-layer composition for the scene editor. No classifier/oracle imports.
 * All paths use inference-scene pixels (512×512 by default), not CSS pixels.
 */

function finite(value,name) {
  if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${name} must be finite.`);
  return value;
}
function positive(value,name) {
  finite(value,name);if(value<=0)throw new RangeError(`${name} must be positive.`);return value;
}
function sizeOf(size) {
  if(!Number.isInteger(size)||size<1)throw new RangeError('Scene size must be a positive integer.');return size;
}
function defaultCanvasFactory(width,height) {
  let canvas;
  if(typeof document!=='undefined')canvas=document.createElement('canvas');
  else if(typeof OffscreenCanvas!=='undefined')canvas=new OffscreenCanvas(width,height);
  else throw new Error('Provide a canvasFactory outside the browser.');
  canvas.width=width;canvas.height=height;return canvas;
}
function newCanvas(size,factory=defaultCanvasFactory) {return factory(size,size);}
function contextOf(canvas) {const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('A 2D canvas is required.');return ctx;}
function sceneState(ctx) {ctx.resetTransform();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;}
function resetCanvas(canvas,size) {if(canvas.width!==size)canvas.width=size;if(canvas.height!==size)canvas.height=size;const ctx=contextOf(canvas);ctx.save();ctx.resetTransform();ctx.clearRect(0,0,size,size);ctx.restore();return canvas;}
function pointsOf(points,minimum) {
  if(!Array.isArray(points)||points.length<minimum)throw new RangeError(`At least ${minimum} path points are required.`);
  return points.map((point)=>{
    const x=Array.isArray(point)?point[0]:point?.x,y=Array.isArray(point)?point[1]:point?.y;
    return [finite(x,'Point x'),finite(y,'Point y')];
  });
}

/** Deep-copy/validate JSON paths; paint and erase are replayed in input order. */
export function normalizeMaskPaths(paths) {
  if(!Array.isArray(paths))throw new TypeError('Paths must be an array.');
  return paths.map(path=>{
    const operation=path.operation??'paint',opacity=path.opacity??1;
    if(!['paint','erase'].includes(operation))throw new RangeError('Path operation must be paint or erase.');
    finite(opacity,'Opacity');if(opacity<0||opacity>1)throw new RangeError('Opacity must be within 0..1.');
    const base={type:path.type,operation,opacity};
    if(path.type==='polygon')return {...base,points:pointsOf(path.points,3)};
    if(path.type==='stroke')return {...base,points:pointsOf(path.points,1),radius:positive(path.radius,'Brush radius')};
    if(path.type==='rect') {
      const x=finite(path.x,'Rectangle x'),y=finite(path.y,'Rectangle y'),width=finite(path.width,'Rectangle width'),height=finite(path.height,'Rectangle height');
      if(width<0||height<0)throw new RangeError('Rectangle dimensions cannot be negative.');return {...base,x,y,width,height};
    }
    throw new RangeError('Unknown mask path type.');
  });
}

export function createMask(size=512,canvasFactory=defaultCanvasFactory) {return newCanvas(sizeOf(size),canvasFactory);}

/** Native Canvas antialiasing is retained in mask alpha. */
export function rasterizeMaskPaths(maskCanvas,paths,{clear=true}={}) {
  const normalized=normalizeMaskPaths(paths),ctx=contextOf(maskCanvas);
  ctx.save();
  try {
    sceneState(ctx);if(clear)ctx.clearRect(0,0,maskCanvas.width,maskCanvas.height);
    ctx.fillStyle='#fff';ctx.strokeStyle='#fff';ctx.lineJoin='round';ctx.lineCap='round';
    for(const path of normalized) {
      ctx.globalCompositeOperation=path.operation==='erase'?'destination-out':'source-over';ctx.globalAlpha=path.opacity;
      if(path.type==='rect')ctx.fillRect(path.x,path.y,path.width,path.height);
      else if(path.type==='polygon') {
        ctx.beginPath();ctx.moveTo(...path.points[0]);for(const point of path.points.slice(1))ctx.lineTo(...point);ctx.closePath();ctx.fill();
      } else {
        ctx.beginPath();
        if(path.points.length===1) {ctx.arc(...path.points[0],path.radius,0,2*Math.PI);ctx.fill();}
        else {ctx.lineWidth=2*path.radius;ctx.moveTo(...path.points[0]);for(const point of path.points.slice(1))ctx.lineTo(...point);ctx.stroke();}
      }
    }
  } finally {ctx.restore();}
  return maskCanvas;
}

export function coverCropRect(sourceWidth,sourceHeight,width=512,height=width) {
  positive(sourceWidth,'Source width');positive(sourceHeight,'Source height');positive(width,'Destination width');positive(height,'Destination height');
  const scale=Math.max(width/sourceWidth,height/sourceHeight),sw=width/scale,sh=height/scale;
  return {sx:(sourceWidth-sw)/2,sy:(sourceHeight-sh)/2,sw,sh,dx:0,dy:0,dw:width,dh:height};
}
export function targetRectFromCenter(centerX,centerY,width,height) {
  finite(centerX,'Center x');finite(centerY,'Center y');positive(width,'Target width');positive(height,'Target height');
  return {x:centerX-width/2,y:centerY-height/2,width,height};
}
export function renderBackground(background,{size=512,canvas=null,canvasFactory=defaultCanvasFactory,fill='#f6f1e7'}={}) {
  sizeOf(size);canvas=resetCanvas(canvas??newCanvas(size,canvasFactory),size);const ctx=contextOf(canvas);
  ctx.save();sceneState(ctx);ctx.fillStyle=fill;ctx.fillRect(0,0,size,size);
  if(background) {
    const width=background.naturalWidth||background.width,height=background.naturalHeight||background.height;
    const r=coverCropRect(width,height,size,size);ctx.imageSmoothingEnabled=!(r.sw===size&&r.sh===size&&Number.isInteger(r.sx)&&Number.isInteger(r.sy));ctx.imageSmoothingQuality='high';ctx.drawImage(background,r.sx,r.sy,r.sw,r.sh,0,0,size,size);
  }
  ctx.restore();return canvas;
}
function renderTarget(target,rect,size,canvasFactory,canvas=null,targetSmoothing=true) {
  canvas=resetCanvas(canvas??newCanvas(size,canvasFactory),size);
  if(target) {
    if(!rect)throw new TypeError('A targetRect is required when target is present.');
    const x=finite(rect.x,'Target x'),y=finite(rect.y,'Target y'),width=positive(rect.width,'Target width'),height=positive(rect.height,'Target height');
    const ctx=contextOf(canvas);ctx.save();sceneState(ctx);ctx.imageSmoothingEnabled=targetSmoothing;ctx.imageSmoothingQuality='high';ctx.drawImage(target,x,y,width,height);ctx.restore();
  }
  return canvas;
}
function requireMaskSize(mask,size) {if(mask&&(mask.width!==size||mask.height!==size))throw new RangeError('Mask and scene dimensions must match.');}
function cutoutFromMask(backgroundCanvas,maskCanvas,canvasFactory=defaultCanvasFactory) {
  const size=backgroundCanvas.width;requireMaskSize(maskCanvas,size);const foreground=newCanvas(size,canvasFactory),ctx=contextOf(foreground);
  ctx.drawImage(backgroundCanvas,0,0);ctx.globalCompositeOperation='destination-in';ctx.drawImage(maskCanvas,0,0);ctx.globalCompositeOperation='source-over';return foreground;
}
function imageDataOf(source) {
  if(source?.getContext)return contextOf(source).getImageData(0,0,source.width,source.height);
  if(ArrayBuffer.isView(source?.data)&&Number.isInteger(source.width)&&Number.isInteger(source.height)&&source.data.length===source.width*source.height*4)return source;
  throw new TypeError('Expected a canvas or RGBA ImageData.');
}

/** Target alpha ×(1−occluder alpha). This evaluation data never enters inference. */
export function visibleTargetAlpha(targetCanvasOrData,occlusionMaskCanvasOrData=null) {
  const target=imageDataOf(targetCanvasOrData),mask=occlusionMaskCanvasOrData?imageDataOf(occlusionMaskCanvasOrData):null;
  if(mask&&(mask.width!==target.width||mask.height!==target.height))throw new RangeError('Target and occlusion dimensions must match.');
  let result;
  if(targetCanvasOrData?.getContext)result=contextOf(targetCanvasOrData).createImageData(target.width,target.height);
  else if(typeof ImageData!=='undefined')result=new ImageData(target.width,target.height);
  else result={width:target.width,height:target.height,data:new Uint8ClampedArray(target.data.length)};
  result.data.set(target.data);
  for(let i=0;i<result.data.length;i+=4) {
    const alpha=Math.round(target.data[i+3]*(1-(mask?mask.data[i+3]/255:0)));result.data[i+3]=alpha;
    if(alpha===0)result.data[i]=result.data[i+1]=result.data[i+2]=0;
  }
  return result;
}
export function visibleTargetRegions(visibleAlpha,grid,threshold=32) {
  const image=imageDataOf(visibleAlpha);if(!Number.isInteger(grid)||grid<1)throw new RangeError('Grid must be a positive integer.');
  finite(threshold,'Alpha threshold');const regions=new Set();
  for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++)if(image.data[(y*image.width+x)*4+3]>threshold)regions.add(Math.floor(y*grid/image.height)*grid+Math.floor(x*grid/image.width));
  return regions;
}
function alphaBounds(canvas) {
  const image=imageDataOf(canvas);let x0=image.width,y0=image.height,x1=0,y1=0;
  for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++)if(image.data[(y*image.width+x)*4+3]>0){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);}
  return x1>x0&&y1>y0?{x:x0,y:y0,width:x1-x0,height:y1-y0}:null;
}

let depthAnchorCache=new WeakMap();

/** Drop cached alpha bounds after changing an existing source canvas/image. */
export function invalidateDepthAnchor(source=null) {
  if(source==null)depthAnchorCache=new WeakMap();
  else {if((typeof source!=='object'&&typeof source!=='function')||source===null)throw new TypeError('Depth source must be an object.');depthAnchorCache.delete(source);}
}

/** Canonical silhouette bottom in the source's local pixel coordinates.
 * Source canvases/images are treated as immutable until explicitly invalidated.
 */
export function getDepthAnchor(source,{alphaThreshold=32,canvasFactory=defaultCanvasFactory,useCache=true}={}) {
  if(!source||(typeof source!=='object'&&typeof source!=='function'))throw new TypeError('A depth source is required.');
  finite(alphaThreshold,'Depth alpha threshold');if(alphaThreshold<0||alphaThreshold>255)throw new RangeError('Depth alpha threshold must be within 0..255.');
  const width=source.naturalWidth||source.width,height=source.naturalHeight||source.height;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw new RangeError('Depth source dimensions must be positive integers.');
  const sourceKey=source.currentSrc||source.src||null;
  let cache=depthAnchorCache.get(source);
  if(!cache||cache.width!==width||cache.height!==height||cache.sourceKey!==sourceKey)cache={width,height,sourceKey,thresholds:new Map()};
  if(useCache&&cache.thresholds.has(alphaThreshold))return cache.thresholds.get(alphaThreshold);
  let image;
  if(source.getContext||ArrayBuffer.isView(source.data))image=imageDataOf(source);
  else {const raster=canvasFactory(width,height);contextOf(raster).drawImage(source,0,0,width,height);image=imageDataOf(raster);}
  let x0=width,y0=height,x1=0,y1=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(image.data[(y*width+x)*4+3]>alphaThreshold){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);}
  const bounds=x1>x0&&y1>y0?Object.freeze({x:x0,y:y0,width:x1-x0,height:y1-y0}):null;
  const anchor=Object.freeze({x:bounds?bounds.x+bounds.width/2:null,y:bounds?bounds.y+bounds.height:null,width,height,bounds,alphaThreshold,empty:bounds===null});
  if(useCache){cache.thresholds.set(alphaThreshold,anchor);depthAnchorCache.set(source,cache);}
  return anchor;
}

/** Serialize definitions only. Runtime canvases/PNG URLs are derived cache data. */
export function serializeForegroundLayers(layers) {
  if(!Array.isArray(layers))throw new TypeError('Layers must be an array.');const ids=new Set();
  return layers.map((layer,index)=>{
    const id=String(layer.id??`layer-${index+1}`);if(!id||ids.has(id))throw new RangeError('Layer IDs must be nonempty and unique.');ids.add(id);
    return {id,name:String(layer.name??id),zIndex:finite(layer.zIndex??10+index,'Layer zIndex'),enabled:layer.enabled!==false,paths:normalizeMaskPaths(layer.paths??[]),...(layer.depthAnchorY==null?{}:{depthAnchorY:finite(layer.depthAnchorY,'Layer depth anchor y')})};
  });
}
export function createForegroundLayers(backgroundSceneCanvas,definitions,{canvasFactory=defaultCanvasFactory,includeDataURLs=true}={}) {
  const size=backgroundSceneCanvas.width;if(backgroundSceneCanvas.height!==size)throw new RangeError('A square base scene is required.');
  return serializeForegroundLayers(definitions).map(definition=>{
    const maskCanvas=createMask(size,canvasFactory);rasterizeMaskPaths(maskCanvas,definition.paths);const foregroundCanvas=cutoutFromMask(backgroundSceneCanvas,maskCanvas,canvasFactory);
    const bounds=alphaBounds(maskCanvas),cutoutCanvas=bounds?canvasFactory(bounds.width,bounds.height):null;
    if(cutoutCanvas)contextOf(cutoutCanvas).drawImage(foregroundCanvas,bounds.x,bounds.y,bounds.width,bounds.height,0,0,bounds.width,bounds.height);
    const pngDataURL=includeDataURLs&&foregroundCanvas.toDataURL?foregroundCanvas.toDataURL('image/png'):null;
    const maskDataURL=includeDataURLs&&maskCanvas.toDataURL?maskCanvas.toDataURL('image/png'):null;
    const cutoutPNGDataURL=includeDataURLs&&cutoutCanvas?.toDataURL?cutoutCanvas.toDataURL('image/png'):null;
    return {...definition,maskCanvas,foregroundCanvas,canvas:foregroundCanvas,pngDataURL,dataURL:pngDataURL,maskDataURL,bounds,position:{x:0,y:0},size,cutoutCanvas,cutoutPNGDataURL,cutoutPosition:bounds?{x:bounds.x,y:bounds.y}:null};
  });
}

/** Reassemble the background, target and individual foreground PNG-equivalent layers. */
export function compositeLayeredScene({backgroundCanvas,target=null,targetRect=null,foregroundLayers=[],targetZIndex=0,targetDepthMode='manual',depthConvention='front-when-lower',depthTieBreak='foreground-front',depthAlphaThreshold=32,targetDepthAnchorY=null,cacheDepthAnchors=true,outputCanvas=null,canvasFactory=defaultCanvasFactory,targetCanvas=null,occlusionMaskCanvas=null,targetSmoothing=true}={}) {
  if(!backgroundCanvas?.getContext)throw new TypeError('A rendered backgroundCanvas is required.');
  const size=backgroundCanvas.width;if(backgroundCanvas.height!==size)throw new RangeError('A square base scene is required.');finite(targetZIndex,'Target zIndex');
  if(!['manual','auto'].includes(targetDepthMode))throw new RangeError('Target depth mode must be manual or auto.');
  if(!['front-when-lower','front-when-higher'].includes(depthConvention))throw new RangeError('Unknown depth convention.');
  if(!['foreground-front','target-front'].includes(depthTieBreak))throw new RangeError('Unknown depth tie break.');
  finite(depthAlphaThreshold,'Depth alpha threshold');if(depthAlphaThreshold<0||depthAlphaThreshold>255)throw new RangeError('Depth alpha threshold must be within 0..255.');
  if(targetDepthAnchorY!=null)finite(targetDepthAnchorY,'Target depth anchor y');
  const destinations=[outputCanvas,targetCanvas,occlusionMaskCanvas].filter(Boolean),sources=[backgroundCanvas,target,...foregroundLayers.flatMap(layer=>[layer.foregroundCanvas,layer.maskCanvas])].filter(Boolean);
  if(new Set(destinations).size!==destinations.length||destinations.some(canvas=>sources.includes(canvas)))throw new RangeError('Scene output, target and occlusion canvases must be distinct from each other and source canvases.');
  const enabled=foregroundLayers.map((layer,index)=>({...layer,index})).filter(layer=>layer.enabled!==false);
  for(const layer of enabled){if(!layer.maskCanvas?.getContext||!layer.foregroundCanvas?.getContext)throw new TypeError('Layer needs a maskCanvas and foregroundCanvas.');requireMaskSize(layer.maskCanvas,size);requireMaskSize(layer.foregroundCanvas,size);finite(layer.zIndex,'Layer zIndex');if(layer.depthAnchorY!=null)finite(layer.depthAnchorY,'Layer depth anchor y');}
  // Already-sized target rasters can be copied literally, avoiding a second filter.
  outputCanvas=resetCanvas(outputCanvas??newCanvas(size,canvasFactory),size);targetCanvas=renderTarget(target,targetRect,size,canvasFactory,targetCanvas,targetSmoothing);
  occlusionMaskCanvas=resetCanvas(occlusionMaskCanvas??newCanvas(size,canvasFactory),size);const maskCtx=contextOf(occlusionMaskCanvas);
  const auto=targetDepthMode==='auto',anchorOptions={alphaThreshold:depthAlphaThreshold,canvasFactory,useCache:cacheDepthAnchors};
  let resolvedTargetAnchorY=null;
  if(auto&&target) {
    if(targetDepthAnchorY!=null)resolvedTargetAnchorY=targetDepthAnchorY;
    else {const local=getDepthAnchor(target,anchorOptions);if(!local.empty)resolvedTargetAnchorY=targetRect.y+local.y/local.height*targetRect.height;}
  }
  const entries=[...enabled.map(layer=>({kind:'foreground',id:String(layer.id??`foreground-${layer.index+1}`),z:layer.zIndex,index:layer.index,layer,anchorY:auto?(layer.depthAnchorY??getDepthAnchor(layer.foregroundCanvas,anchorOptions).y):null,anchorSource:auto?(layer.depthAnchorY!=null?'override':'png-alpha-bottom'):'manual-z-index'})),{kind:'target',id:'$target',z:targetZIndex,index:-1,anchorY:resolvedTargetAnchorY}];
  entries.sort((a,b)=>{
    if(!auto)return a.z-b.z||a.index-b.index;
    if(a.anchorY==null&&b.anchorY!=null)return -1;if(a.anchorY!=null&&b.anchorY==null)return 1;
    const difference=a.anchorY==null?0:(a.anchorY-b.anchorY)*(depthConvention==='front-when-lower'?1:-1);
    if(difference)return difference;
    if(a.kind!==b.kind)return (a.kind==='target'?-1:1)*(depthTieBreak==='foreground-front'?1:-1);
    return a.index-b.index;
  });
  const targetOrder=entries.findIndex(entry=>entry.kind==='target');
  const layerDepths=entries.filter(entry=>entry.kind==='foreground').map(entry=>({id:entry.id,depthAnchorY:entry.anchorY,aboveTarget:entries.indexOf(entry)>targetOrder&&(!auto||!!target)&&(!auto||entry.anchorY!=null),anchorSource:entry.anchorSource}));
  const ctx=contextOf(outputCanvas);ctx.save();sceneState(ctx);ctx.drawImage(backgroundCanvas,0,0);maskCtx.save();sceneState(maskCtx);
  // With no target the exact original base is the complete reconstruction.
  // Avoid an unnecessary antialiased re-encoding of identical base colors.
  for(const entry of entries) {
    if(entry.kind==='target') {if(target)ctx.drawImage(targetCanvas,0,0);}
    else {if(target)ctx.drawImage(entry.layer.foregroundCanvas,0,0);if(auto?(!!target&&entry.anchorY!=null&&entries.indexOf(entry)>targetOrder):entry.z>=targetZIndex)maskCtx.drawImage(auto?entry.layer.foregroundCanvas:entry.layer.maskCanvas,0,0);}
  }
  ctx.restore();maskCtx.restore();return {canvas:outputCanvas,outputCanvas,backgroundCanvas,targetCanvas,foregroundLayers,occlusionMaskCanvas,visibleTarget:visibleTargetAlpha(targetCanvas,occlusionMaskCanvas),targetDepthMode,depthConvention,depthTieBreak,targetDepthAnchorY:resolvedTargetAnchorY,layerDepths,depthOrder:entries.map(entry=>entry.id)};
}

/** Convenience wrapper for one painted/erased foreground mask. */
export function compositeScene({background,target=null,targetRect=null,mask=null,targetZIndex=0,targetDepthMode='manual',depthConvention='front-when-lower',depthTieBreak='foreground-front',depthAlphaThreshold=32,targetDepthAnchorY=null,cacheDepthAnchors=true,outputCanvas=null,size=512,canvasFactory=defaultCanvasFactory,layers={},backgroundFill='#f6f1e7'}={}) {
  const backgroundCanvas=renderBackground(background,{size,canvas:layers.backgroundCanvas,canvasFactory,fill:backgroundFill});requireMaskSize(mask,size);
  const foregroundLayers=mask?[{id:'custom-mask',name:'Painted foreground',zIndex:10,enabled:true,maskCanvas:mask,foregroundCanvas:cutoutFromMask(backgroundCanvas,mask,canvasFactory)}]:[];
  return compositeLayeredScene({backgroundCanvas,target,targetRect,foregroundLayers,targetZIndex,targetDepthMode,depthConvention,depthTieBreak,depthAlphaThreshold,targetDepthAnchorY,cacheDepthAnchors,outputCanvas,canvasFactory,targetCanvas:layers.targetCanvas,occlusionMaskCanvas:layers.occlusionMaskCanvas});
}

/** Optional manual outlines for the existing normalized original AI crowd only. */
export const ORIGINAL_CROWD_LAYERS=[
  {id:'fountain-rim',name:'Front of the fountain',zIndex:10,enabled:false,paths:[{type:'polygon',points:[[239,309],[247,322],[263,332],[284,336],[307,332],[326,322],[336,310],[336,328],[326,342],[309,350],[286,353],[264,347],[248,337],[239,323]]}]},
  {id:'cafe-umbrella',name:'Blue café umbrella',zIndex:20,enabled:false,paths:[{type:'polygon',points:[[464,309],[485,310],[507,322],[492,336],[469,341],[444,335],[425,326],[439,315]]}]},
  {id:'foreground-greenery',name:'Foreground flower bed',zIndex:30,enabled:false,paths:[{type:'polygon',points:[[235,480],[246,470],[261,465],[274,467],[287,462],[301,468],[311,476],[315,491],[326,504],[320,512],[236,512],[231,501]]}]}
];
