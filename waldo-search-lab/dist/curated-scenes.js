/** Curated scene artwork composition ONLY. No detector/model/score/acceptance.
 * Preserve the original background asset and its historical evaluation scope.
 * Inference must receive only the returned final pixels plus its ordinary inputs;
 * placements below describe rendering and must never enter the detector.
 */
function finite(value,name) {
  if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${name} must be finite.`);
  return value;
}
function imageSize(image) {
  const width=image?.naturalWidth||image?.width,height=image?.naturalHeight||image?.height;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw new TypeError('A decoded image or canvas is required.');
  return {width,height};
}

/** composeCuratedScene({backgroundCanvas, placements, canvasFactory})
 * placements: [{id,image,centerX,centerY,height}], height integer16..96.
 * Each source is cropped to alpha>16 bounds, high-quality resized once, then
 * copied at an integer top-left with smoothing disabled. Whole sprites must fit.
 * Returned {canvas,placements,rendererOnly:true} includes rounded actual centers.
 * The supplied factory must return a fresh canvas of the requested dimensions.
 * Sources are never modified. The output512canvas becomes the background on
 * which the existing compositor subsequently adds the actual Wanda target.
 */
export function composeCuratedScene({backgroundCanvas,placements=[],canvasFactory}={}) {
  if(backgroundCanvas?.width!==512||backgroundCanvas?.height!==512||typeof backgroundCanvas.getContext!=='function')throw new TypeError('A512×512 background canvas is required.');
  if(!Array.isArray(placements)||typeof canvasFactory!=='function')throw new TypeError('Provide placement records and a canvasFactory.');
  const ids=new Set(),sources=new Set([backgroundCanvas,...placements.map(p=>p?.image)]),created=new Set();
  const definitions=placements.map(p=>{
    if(!p||typeof p.id!=='string'||!p.id.trim()||ids.has(p.id))throw new RangeError('Each curated object needs a unique nonempty id.');ids.add(p.id);
    imageSize(p.image);finite(p.centerX,'Center x');finite(p.centerY,'Center y');
    if(!Number.isInteger(p.height)||p.height<16||p.height>96)throw new RangeError('Curated height must be an integer within16..96.');
    return {id:p.id,image:p.image,centerX:p.centerX,centerY:p.centerY,height:p.height};
  });
  function fresh(width,height) {
    const c=canvasFactory(width,height);
    if(!c||sources.has(c)||created.has(c)||c.width!==width||c.height!==height||typeof c.getContext!=='function')throw new TypeError('canvasFactory must return a fresh canvas of the requested size.');
    created.add(c);return c;
  }
  const trims=new Map(),rasters=new Map(),prepared=[];
  for(const p of definitions) {
    if(!trims.has(p.image)) {
      const size=imageSize(p.image),raw=fresh(size.width,size.height),r=raw.getContext('2d');r.imageSmoothingEnabled=false;r.drawImage(p.image,0,0);
      const rgba=r.getImageData(0,0,size.width,size.height).data;let x0=size.width,y0=size.height,x1=0,y1=0;
      for(let y=0;y<size.height;y++)for(let x=0;x<size.width;x++)if(rgba[(y*size.width+x)*4+3]>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);}
      if(x1<=x0||y1<=y0)throw new RangeError('The curated sprite has no alpha>16 pixels.');
      const trim=fresh(x1-x0,y1-y0);trim.getContext('2d').drawImage(raw,x0,y0,x1-x0,y1-y0,0,0,trim.width,trim.height);
      trims.set(p.image,{canvas:trim,bounds:{x:x0,y:y0,width:x1-x0,height:y1-y0},sourceDimensions:size});
    }
    const trim=trims.get(p.image);let sized=rasters.get(p.image);if(!sized){sized=new Map();rasters.set(p.image,sized);}
    if(!sized.has(p.height)) {
      const width=Math.max(1,Math.round(p.height*trim.canvas.width/trim.canvas.height)),sprite=fresh(width,p.height),c=sprite.getContext('2d');
      c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(trim.canvas,0,0,width,p.height);sized.set(p.height,sprite);
    }
    const sprite=sized.get(p.height),rect={x:Math.round(p.centerX-sprite.width/2),y:Math.round(p.centerY-sprite.height/2),width:sprite.width,height:sprite.height};
    if(rect.x<0||rect.y<0||rect.x+rect.width>512||rect.y+rect.height>512)throw new RangeError('Every curated sprite must fit wholly within the512px scene.');
    prepared.push({sprite,metadata:{id:p.id,requestedCenter:{x:p.centerX,y:p.centerY},center:{x:rect.x+rect.width/2,y:rect.y+rect.height/2},rectangle:rect,trimBounds:{...trim.bounds},sourceDimensions:{...trim.sourceDimensions},rendererOnly:true}});
  }
  const canvas=fresh(512,512),c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(backgroundCanvas,0,0);
  for(const {sprite,metadata} of prepared)c.drawImage(sprite,metadata.rectangle.x,metadata.rectangle.y);
  return {canvas,placements:prepared.map(p=>p.metadata),rendererOnly:true};
}
