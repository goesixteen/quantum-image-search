/** Wanda location oracle scored ONLY by its separately trained variational QNN.
 * Final scene RGB + declared target size; no template, clean background, mask or truth.
 * Always scan64² windows; coarse Grover addresses retain their maximum learned score.
 */
import {predict} from './qnn.js';
export const FEATURE_VERSION='wanda-window-v1';
export const FEATURE_NAMES=['sweater_stripe_fourier','sweater_cross_phase','sweater_red_white_balance','warm_face_brown_hair','blue_trouser_morphology','body_horizontal_alignment_px','body_vertical_alignment_px','supplied_wanda_height'];
export const FEATURE_PRIORS=Object.freeze({targetSHA256:'ae679a90fb94c8ad10a589fd6fa6a27404b7d519f6ad750557749a1595229777',red:[215,21,30],white:[249,244,242],blue:[35,101,180],skin:[250,180,100],hair:[60,29,11],stripePeriodFraction:.0597,redCentroid:-.100,blueCentroid:.209,heightRange:[40,64],samples:[28,64]});
const clip=x=>Math.max(0,Math.min(1,x)),mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const geometryCache=new Map();
function finite(n,name){if(typeof n!=='number'||!Number.isFinite(n))throw new TypeError(name+' must be finite.');return n;}
function sceneShape(image){if(!image||!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width<1||image.height<1||!image.data||image.data.length!==image.width*image.height*4)throw new TypeError('Expected RGBA ImageData.');}
function windowGeometry(targetWidth,targetHeight){
  finite(targetWidth,'Target width');finite(targetHeight,'Target height');if(targetWidth<=0||targetHeight<=0)throw new RangeError('Target dimensions must be positive.');
  const key=targetWidth+':'+targetHeight;if(geometryCache.has(key))return geometryCache.get(key);
  const w=Math.max(targetWidth+16,Math.ceil(1.6*targetWidth)),h=targetHeight+16,x=Array.from({length:28},(_,i)=>-w/2+(i+.5)*w/28),y=Array.from({length:64},(_,i)=>-h/2+(i+.5)*h/64);
  const core=x.map((v,i)=>Math.abs(v)<=.42*targetWidth?i:-1).filter(i=>i>=0),left=core.filter(i=>x[i]<0),right=core.filter(i=>x[i]>=0),flank=x.map((v,i)=>Math.abs(v)>=.60*targetWidth?i:-1).filter(i=>i>=0);
  const rows=(lo,hi)=>y.map((v,i)=>{const t=(v+targetHeight/2)/targetHeight;return t>=lo&&t<hi?i:-1;}).filter(i=>i>=0);
  const result={w,h,x,y,core,left,right,torso:rows(.27,.50),lower:rows(.55,.92),redRegion:rows(.23,.55),blueRegion:rows(.52,.94),head:rows(.01,.285),targetHeight};
  result.coreMask=x.map((_,i)=>core.includes(i));result.leftMask=x.map((_,i)=>left.includes(i));result.rightMask=x.map((_,i)=>right.includes(i));
  result.redMask=y.map((_,i)=>result.redRegion.includes(i));result.blueMask=y.map((_,i)=>result.blueRegion.includes(i));result.headMask=y.map((_,i)=>result.head.includes(i));result.legMask=y.map((_,i)=>result.lower.includes(i));
  result.cos=y.map(v=>Math.cos(2*Math.PI*(v+targetHeight/2)/(.0597*targetHeight)));result.sin=y.map(v=>Math.sin(2*Math.PI*(v+targetHeight/2)/(.0597*targetHeight)));
  result.headWeight=new Float64Array(1792);result.ringWeight=new Float64Array(1792);result.legWeight=new Float64Array(1792);result.gapWeight=new Float64Array(1792);
  result.momentWeight=x.map(v=>Math.abs(v)<=.65*targetWidth+4?Math.exp(-v*v/(2*(.60*targetWidth+3)**2)):0);
  for(let row=0;row<64;row++)for(let col=0;col<28;col++){
    const dx=x[col],dy=y[row],i=row*28+col;
    if(result.headMask[row]){const radius=Math.hypot(dx,dy+.365*targetHeight);result.headWeight[i]=Math.exp(-radius*radius/50);result.ringWeight[i]=Math.exp(-((radius-.095*targetHeight)**2)/(2*Math.max(1,.025*targetHeight)**2));}
    if(result.legMask[row]){const legOffset=.18*targetWidth,variance=2*Math.max(.8,.075*targetWidth)**2;result.legWeight[i]=Math.exp(-((dx-legOffset)**2)/variance)+Math.exp(-((dx+legOffset)**2)/variance);result.gapWeight[i]=Math.exp(-dx*dx/variance);}
  }
  if(geometryCache.size>32)geometryCache.clear();geometryCache.set(key,result);return result;
}
function featuresAt(image,cx,cy,g){
  // Art-informed palette/period/shape descriptors, not PNG-template pixels.
  // The Fourier phase comparison is between columns; centering uses fixed6px moments.
  const red=new Float64Array(64),white=new Float64Array(64),left=new Float64Array(64),right=new Float64Array(64),d=image.data;
  let nr=0,nb=0,rx=0,ry=0,bx=0,by=0,headEvidence=0,headWeight=0,ringEvidence=0,ringWeight=0,legEvidence=0,legWeight=0,gapEvidence=0,gapWeight=0;
  const xs=g.x.map(v=>Math.floor(cx+v));
  for(let row=0;row<64;row++){const y=Math.floor(cy+g.y[row]);for(let col=0;col<28;col++){
    const x=xs[col],inside=x>=0&&x<image.width&&y>=0&&y<image.height,offset=inside?(y*image.width+x)*4:-1,r=inside?d[offset]:0,green=inside?d[offset+1]:0,b=inside?d[offset+2]:0;
    let R=0,W=0,B=0;
    if(inside&&g.redMask[row]){const t=clip(((r-215)*34+(green-21)*223+(b-30)*212)/95829),confidence=Math.exp(-((r-215-34*t)**2+(green-21-223*t)**2+(b-30-212*t)**2)/2888);R=confidence*(1-t);W=confidence*t;}
    if(inside&&g.blueMask[row])B=Math.exp(-((r-35)**2+(green-101)**2+(b-180)**2)/4050);
    const dx=x+.5-cx,dy=y+.5-cy;
    if(g.coreMask[col]){red[row]+=R;white[row]+=W;}if(g.leftMask[col])left[row]+=R-W;if(g.rightMask[col])right[row]+=R-W;
    const moment=g.momentWeight[col];if(g.redMask[row]){nr+=R*moment;rx+=R*dx*moment;ry+=R*dy*moment;}if(g.blueMask[row]){nb+=B*moment;bx+=B*dx*moment;by+=B*dy*moment;}
    const slot=row*28+col;
    if(g.headMask[row]){const Y=inside?Math.exp(-((r-250)**2+(green-180)**2+(b-100)**2)/5000):0,D=inside?Math.exp(-((r-60)**2+(green-29)**2+(b-11)**2)/2888):0;headWeight+=g.headWeight[slot];headEvidence+=Y*g.headWeight[slot];ringWeight+=g.ringWeight[slot];ringEvidence+=D*g.ringWeight[slot];}
    if(g.legMask[row]){legWeight+=g.legWeight[slot];legEvidence+=B*g.legWeight[slot];gapWeight+=g.gapWeight[slot];gapEvidence+=B*g.gapWeight[slot];}
  }red[row]/=g.core.length||1;white[row]/=g.core.length||1;left[row]/=g.left.length||1;right[row]/=g.right.length||1;}
  const rp=g.torso.map(i=>red[i]),wp=g.torso.map(i=>white[i]);
  const spectrum=profile=>{const values=g.torso.map(i=>profile[i]),dc=mean(values);return [mean(g.torso.map((row,j)=>(values[j]-dc)*g.cos[row])),mean(g.torso.map((row,j)=>(values[j]-dc)*g.sin[row]))];};
  const [real,imag]=spectrum(red.map((v,i)=>v-white[i])),[lr,li]=spectrum(left),[rr,ri]=spectrum(right);
  const periodic=Math.hypot(real,imag),crossPhase=Math.max(0,lr*rr+li*ri),balance=2*Math.sqrt(mean(rp)*mean(wp)),head=headEvidence/(headWeight||1)*(.5+.5*ringEvidence/(ringWeight||1)),legs=Math.max(0,legEvidence/(legWeight||1)-.5*gapEvidence/(gapWeight||1));
  const weightSum=g.momentWeight.reduce((a,b)=>a+b,0),densityR=nr/(weightSum*g.redRegion.length||1),densityB=nb/(weightSum*g.blueRegion.length||1),presenceR=densityR/(densityR+.04),presenceB=densityB/(densityB+.04),presence=(densityR+densityB)/(densityR+densityB+.04),centerX=(rx+bx)/(nr+nb||1);
  const horizontal=presence*Math.exp(-centerX*centerX/72),vertical=(presenceR*Math.exp(-((ry/(nr||1)+.100*g.targetHeight)**2)/72)+presenceB*Math.exp(-((by/(nb||1)-.209*g.targetHeight)**2)/72))/2;
  return [periodic,crossPhase,balance,head,legs,horizontal,vertical,clip((g.targetHeight-40)/24)].map(clip);
}
export function extractWindowFeatures(imageData,cx,cy,{targetWidth,targetHeight}={}){sceneShape(imageData);finite(cx,'Center x');finite(cy,'Center y');return featuresAt(imageData,cx,cy,windowGeometry(targetWidth,targetHeight));}
function validateModel(model){
  if(model?.featureVersion!==FEATURE_VERSION||!Array.isArray(model.featureNames)||model.featureNames.join('|')!==FEATURE_NAMES.join('|'))throw new TypeError('Expected the Wanda window feature contract.');
  if(model.qubits!==4||model.layers!==4||!Array.isArray(model.theta)||model.theta.length!==32||!model.theta.every(Number.isFinite)||!Array.isArray(model.readout)||model.readout.length!==7||!model.readout.every(Number.isFinite)||!Number.isFinite(model.bias))throw new TypeError('Expected a finite four-qubit, four-layer model with seven observable readouts.');
}
function abort(){const error=new Error('QNN scan cancelled.');error.name='AbortError';throw error;}
const yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0));
export async function scanQNN(imageData,model,{grid=64,targetWidth,targetHeight,threshold=model?.threshold,batchSize=64,onProgress=null,shouldCancel=null,includeWindowScores=true,nmsRadius=Math.max(12,.35*targetWidth)}={}){
  sceneShape(imageData);if(imageData.width!==512||imageData.height!==512)throw new RangeError('Wanda localizer expects a512×512 scene.');validateModel(model);
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
  return {scores,candidates,marks:kept.map(c=>c.index).sort((a,b)=>a-b),...(includeWindowScores?{windowScores}:{}),geometry:{grid,count:N,scanGrid:64,scanSpacing:8,pointTolerance:Math.hypot(8,8)/2+1,targetWidth,targetHeight,windowWidth:g.w,windowHeight:g.h},diagnostics:{scoreEvaluations:4096,qnnCircuitEvaluations:4096,featureSamplesPerWindow:1792,acceptedBeforeNMS:accepted.length,suppressedCount:accepted.length-kept.length,nmsRadius,threshold,runtimeMs:performance.now()-started,oracle:'trained four-qubit Wanda QNN sigmoid readout',inferenceInputs:['final scene RGB','declared target width/height','saved model']}};
}
