/** Whole-object depth rows for supplied transparent PNG silhouettes.
 * This groups known masks; it does not segment objects or remove ground pixels.
 * Every source pixel stays at its original scene registration, including soft edges.
 * Band width deliberately coarsens the per-object alpha-bottom depth convention.
 */
import {getDepthAnchor} from './scene-editor.js';

function defaultCanvasFactory(w,h){let c;if(typeof document!=='undefined')c=document.createElement('canvas');else if(typeof OffscreenCanvas!=='undefined')c=new OffscreenCanvas(w,h);else throw Error('Provide a canvasFactory outside the browser.');c.width=w;c.height=h;return c;}
function integer(value,name){if(!Number.isInteger(value)||value<1)throw new RangeError(name+' must be a positive integer.');return value;}
function rgba(canvas){return canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height);}
function png(canvas,enabled){return enabled&&canvas.toDataURL?canvas.toDataURL('image/png'):null;}
function make(w,h,factory){const c=factory(w,h);if(!c||c.width!==w||c.height!==h||!c.getContext('2d'))throw new TypeError('canvasFactory must return a canvas of the requested dimensions.');return c;}

export function createDepthBands(layers,{size=512,bandHeight=16,alphaThreshold=32,canvasFactory=defaultCanvasFactory,includeDataURLs=true}={}){
  integer(size,'Scene size');integer(bandHeight,'Band height');
  if(typeof alphaThreshold!=='number'||!Number.isFinite(alphaThreshold)||alphaThreshold<0||alphaThreshold>255)throw new RangeError('Alpha threshold must be within 0..255.');
  if(!Array.isArray(layers))throw new TypeError('Layers must be an array.');
  const seen=new Set(),groups=new Map(),objects=[];
  for(const layer of layers){
    if(!layer||typeof layer.id!=='string'||!layer.id.length)throw new TypeError('Every object needs a nonempty string id.');
    if(seen.has(layer.id))throw new RangeError('Duplicate object id: '+layer.id);seen.add(layer.id);
    if(layer.enabled===false)continue;
    const source=layer.foregroundCanvas;
    if(!source?.getContext||source.width!==size||source.height!==size)throw new RangeError('Each object must be registered on a full scene-size foregroundCanvas.');
    const anchor=getDepthAnchor(source,{alphaThreshold,canvasFactory,useCache:false});if(anchor.empty)continue;
    const level=Math.floor((anchor.y-1)/bandHeight),object={id:layer.id,name:String(layer.name??layer.id),depthAnchorY:anchor.y,level,bounds:anchor.bounds};objects.push(object);
    if(!groups.has(level))groups.set(level,[]);groups.get(level).push({layer,object});
  }
  const bands=[...groups.entries()].sort((a,b)=>a[0]-b[0]).map(([level,members])=>{
    const foregroundCanvas=make(size,size,canvasFactory),ctx=foregroundCanvas.getContext('2d');
    // Full-scene source-over preserves silhouettes; rows identify depth, not image crops.
    for(const {layer} of members)ctx.drawImage(layer.foregroundCanvas,0,0);
    const maskCanvas=make(size,size,canvasFactory),mask=maskCanvas.getContext('2d');mask.drawImage(foregroundCanvas,0,0);mask.globalCompositeOperation='source-in';mask.fillStyle='#fff';mask.fillRect(0,0,size,size);mask.globalCompositeOperation='source-over';
    const bounds=getDepthAnchor(foregroundCanvas,{alphaThreshold:0,canvasFactory,useCache:false}).bounds;
    const cutoutCanvas=make(bounds.width,bounds.height,canvasFactory);cutoutCanvas.getContext('2d').drawImage(foregroundCanvas,bounds.x,bounds.y,bounds.width,bounds.height,0,0,bounds.width,bounds.height);
    const dataURL=png(foregroundCanvas,includeDataURLs),depthAnchorY=Math.max(...members.map(m=>m.object.depthAnchorY));
    return {id:'depth-band-'+level,name:'Depth row '+(level+1),enabled:true,zIndex:level,paths:[],foregroundCanvas,canvas:foregroundCanvas,maskCanvas,level,depthRange:{start:level*bandHeight,endExclusive:(level+1)*bandHeight},memberIDs:members.map(m=>m.object.id),memberDepthAnchors:members.map(m=>({id:m.object.id,y:m.object.depthAnchorY})),depthAnchorY,bounds,position:{x:0,y:0},size,pngDataURL:dataURL,dataURL,maskDataURL:png(maskCanvas,includeDataURLs),cutoutCanvas,cutoutPNGDataURL:png(cutoutCanvas,includeDataURLs),cutoutPosition:{x:bounds.x,y:bounds.y}};
  });
  const objectAtlasCanvas=make(size,size,canvasFactory),atlas=objectAtlasCanvas.getContext('2d');for(const band of bands)atlas.drawImage(band.foregroundCanvas,0,0);
  return {bands,objectAtlasCanvas,objects,size,bandHeight,alphaThreshold,depthConvention:'front-when-lower',depthTieBreak:'foreground-front'};
}
export const buildDepthBands=createDepthBands;
