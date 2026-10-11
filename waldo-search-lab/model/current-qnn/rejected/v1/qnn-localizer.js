/** Fine location oracle scored ONLY by the saved variational QNN.
 * Final scene RGB + declared target size; no template, clean background, mask or truth.
 * Always scan64² windows; coarse Grover addresses retain their maximum learned score.
 */
import {predict} from './qnn.js';
export const FEATURE_VERSION='current-qnn-window-v1';
export const FEATURE_NAMES=['torso_red','torso_white','stripe_transitions','stripe_contrast','stripe_coherence','lower_blue','vertical_color_order','central_color_concentration'];
const clip=x=>Math.max(0,Math.min(1,x)),mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const geometryCache=new Map();
function finite(n,name){if(typeof n!=='number'||!Number.isFinite(n))throw new TypeError(name+' must be finite.');return n;}
function sceneShape(image){if(!image||!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width<1||image.height<1||!image.data||image.data.length!==image.width*image.height*4)throw new TypeError('Expected RGBA ImageData.');}
function windowGeometry(targetWidth,targetHeight){
  finite(targetWidth,'Target width');finite(targetHeight,'Target height');if(targetWidth<=0||targetHeight<=0)throw new RangeError('Target dimensions must be positive.');
  const key=targetWidth+':'+targetHeight;if(geometryCache.has(key))return geometryCache.get(key);
  const w=Math.max(targetWidth+8,Math.ceil(1.6*targetWidth)),h=targetHeight+8,x=Array.from({length:24},(_,i)=>-w/2+(i+.5)*w/24),y=Array.from({length:48},(_,i)=>-h/2+(i+.5)*h/48);
  const core=x.map((v,i)=>Math.abs(v)<=.42*targetWidth?i:-1).filter(i=>i>=0),left=core.filter(i=>x[i]<0),right=core.filter(i=>x[i]>=0),flank=x.map((v,i)=>Math.abs(v)>=.60*targetWidth?i:-1).filter(i=>i>=0);
  const rows=(lo,hi)=>y.map((v,i)=>{const t=(v+targetHeight/2)/targetHeight;return t>=lo&&t<hi?i:-1;}).filter(i=>i>=0);
  const result={w,h,x,y,core,left,right,flank,torso:rows(.18,.60),lower:rows(.58,.94),spatial:rows(.18,.94)};if(geometryCache.size>32)geometryCache.clear();geometryCache.set(key,result);return result;
}
function featuresAt(image,cx,cy,g){
  const red=new Float64Array(48),white=new Float64Array(48),blue=new Float64Array(48),left=new Float64Array(48),right=new Float64Array(48),flank=new Float64Array(48),color=new Float64Array(48),d=image.data;
  const coreSet=new Set(g.core),leftSet=new Set(g.left),rightSet=new Set(g.right),flankSet=new Set(g.flank);
  const xs=g.x.map(v=>Math.floor(cx+v));
  for(let row=0;row<48;row++){const y=Math.floor(cy+g.y[row]);for(let col=0;col<24;col++){
    const x=xs[col],inside=x>=0&&x<image.width&&y>=0&&y<image.height,offset=inside?(y*image.width+x)*4:-1,r=inside?d[offset]:0,green=inside?d[offset+1]:0,b=inside?d[offset+2]:0;
    const R=r>125&&r>1.38*green&&r>1.25*b?1:0,W=Math.min(r,green,b)>170&&Math.max(r,green,b)-Math.min(r,green,b)<65?1:0,B=b>85&&b>1.12*r&&b>.90*green?1:0;
    if(coreSet.has(col)){red[row]+=R;white[row]+=W;blue[row]+=B;color[row]+=R||B?1:0;}if(leftSet.has(col))left[row]+=R;if(rightSet.has(col))right[row]+=R;if(flankSet.has(col))flank[row]+=R||B?1:0;
  }red[row]/=g.core.length||1;white[row]/=g.core.length||1;blue[row]/=g.core.length||1;left[row]/=g.left.length||1;right[row]/=g.right.length||1;flank[row]/=g.flank.length||1;color[row]/=g.core.length||1;}
  const values=(profile,rows)=>rows.map(i=>profile[i]),rp=values(red,g.torso),wp=values(white,g.torso),tr=mean(rp),tw=mean(wp),lb=mean(values(blue,g.lower)),lr=mean(values(red,g.lower)),tb=mean(values(blue,g.torso));
  const std=Math.sqrt(mean(rp.map(v=>(v-tr)**2)));let transitions=0;for(let i=1;i<rp.length;i++)transitions+=Math.abs(rp[i]-rp[i-1])*Math.min(1,wp[i]+wp[i-1]);
  const coherence=Math.max(0,1-mean(g.torso.map(i=>Math.abs(left[i]-right[i])))),concentration=mean(values(color,g.spatial))-mean(values(flank,g.spatial));
  return [tr/.25,tw/.45,transitions/3,std/.30,coherence*std/.20,lb/.25,(tr-lr+lb-tb)/.40,concentration/.40].map(clip);
}
export function extractWindowFeatures(imageData,cx,cy,{targetWidth,targetHeight}={}){sceneShape(imageData);finite(cx,'Center x');finite(cy,'Center y');return featuresAt(imageData,cx,cy,windowGeometry(targetWidth,targetHeight));}
function validateModel(model){
  if(model?.featureVersion!==FEATURE_VERSION||!Array.isArray(model.featureNames)||model.featureNames.join('|')!==FEATURE_NAMES.join('|'))throw new TypeError('Expected the current QNN window feature contract.');
  if(!Array.isArray(model.theta)||model.theta.length!==32||!model.theta.every(Number.isFinite)||!Array.isArray(model.readout)||model.readout.length!==7||!model.readout.every(Number.isFinite)||!Number.isFinite(model.bias))throw new TypeError('Expected a finite four-qubit, four-layer model with seven observable readouts.');
}
function abort(){const error=new Error('QNN scan cancelled.');error.name='AbortError';throw error;}
const yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0));
export async function scanQNN(imageData,model,{grid=64,targetWidth,targetHeight,threshold=model?.threshold,batchSize=64,onProgress=null,shouldCancel=null,includeWindowScores=true,nmsRadius=Math.max(12,.35*targetWidth)}={}){
  sceneShape(imageData);if(imageData.width!==512||imageData.height!==512)throw new RangeError('Current QNN localizer expects a512×512 scene.');validateModel(model);
  if(![4,8,16,32,64].includes(grid))throw new RangeError('Grover grid must be4,8,16,32 or64.');finite(threshold,'Threshold');if(threshold<0||threshold>1)throw new RangeError('Threshold must be within0..1.');if(!Number.isInteger(batchSize)||batchSize<1)throw new RangeError('Batch size must be positive integer.');finite(nmsRadius,'NMS radius');if(nmsRadius<0)throw new RangeError('NMS radius must be nonnegative.');
  const g=windowGeometry(targetWidth,targetHeight),N=grid**2,scores=new Float64Array(N),windowScores=new Float64Array(4096),candidates=Array.from({length:N},(_,index)=>({index,bestX:(index%grid+.5)*512/grid,bestY:(Math.floor(index/grid)+.5)*512/grid,score:-1})),started=performance.now();
  if(shouldCancel?.())abort();onProgress?.(0,{scoreEvaluations:0,total:4096});
  for(let i=0;i<4096;i++){
    const cx=(i%64+.5)*8,cy=(Math.floor(i/64)+.5)*8,score=predict(featuresAt(imageData,cx,cy,g),model),address=Math.floor(cy/(512/grid))*grid+Math.floor(cx/(512/grid));windowScores[i]=score;
    if(score>candidates[address].score){scores[address]=score;candidates[address]={index:address,bestX:cx,bestY:cy,score,windowIndex:i,registrationScore:score};}
    if((i+1)%batchSize===0||i===4095){onProgress?.((i+1)/4096,{scoreEvaluations:i+1,total:4096});await yieldTask();if(shouldCancel?.())abort();}
  }
  const accepted=candidates.filter(c=>c.score>=threshold).sort((a,b)=>b.score-a.score||a.index-b.index),kept=[];
  for(const c of accepted)if(!kept.some(k=>Math.hypot(c.bestX-k.bestX,c.bestY-k.bestY)<=nmsRadius))kept.push(c);
  return {scores,candidates,marks:kept.map(c=>c.index).sort((a,b)=>a-b),...(includeWindowScores?{windowScores}:{}),geometry:{grid,count:N,scanGrid:64,scanSpacing:8,pointTolerance:Math.hypot(8,8)/2+1,targetWidth,targetHeight,windowWidth:g.w,windowHeight:g.h},diagnostics:{scoreEvaluations:4096,qnnCircuitEvaluations:4096,featureSamplesPerWindow:1152,acceptedBeforeNMS:accepted.length,suppressedCount:accepted.length-kept.length,nmsRadius,threshold,runtimeMs:performance.now()-started,oracle:'trained four-qubit QNN sigmoid readout',inferenceInputs:['final scene RGB','declared target width/height','saved model']}};
}
