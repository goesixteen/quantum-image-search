import { renderWandaEvidence } from './wanda-evidence.js';
import { extractFeatures, predict } from './qnn.js';
import { simulateGrover, recommendIterations, sample, bitstring } from './quantum.js';
import { prepareTemplate, matchTemplate, candidatePoint, gridSpec } from './search-core.js';
import { renderBackground, createForegroundLayers, compositeLayeredScene, targetRectFromCenter, serializeForegroundLayers } from './scene-editor.js';
import { buildCandidateField, buildSearchDisplayField, colorizeField } from './search-field.js';
import { scanQNN, extractWindowFeatures } from './wanda-localizer.js';
import { composeCuratedScene } from './curated-scenes.js';
import { createLatestOperation,runLatestOperation,createPointerSession,pointerAction } from './interaction-lifecycle.js';

const $ = id => document.getElementById(id);
const canvas = $('scene'), ctx = canvas.getContext('2d');
const quantumMap = $('quantum-map'), mapCtx = quantumMap.getContext('2d');
const curve = $('convergence-curve'), curveCtx = curve.getContext('2d');
const makeCanvas = (w=512,h=w) => { const c=document.createElement('canvas');c.width=w;c.height=h;return c; };
const composite = makeCanvas(), targetLayer = makeCanvas(), occlusionMask = makeCanvas();
const patch = makeCanvas(128), patchCtx = patch.getContext('2d',{willReadFrequently:true});
const state = {ready:false,busy:false,sceneLoading:false,targetLoading:false,revision:0,sceneLoadRevision:0,targetLoadRevision:0,grid:64,mode:'current-qnn',size:52,cx:420,cy:300,present:true,
  snap:false,depth:'1000',view:'probability',threshold:.45,scores:null,matches:null,marks:[],trace:null,iteration:0,
  measurement:null,evaluation:null,sceneId:'wanda-festival',targetId:'wanda',background:null,target:null,layers:[],curatedArtwork:null,
  catalog:null,presets:null,bandPresets:null,model:null,currentModel:null,frame:null,animationMs:140,customPaths:[],tool:'move',pointer:null,
  candidateField:null,fieldScores:null,displayField:null,fieldPhase:'candidate',fieldProgress:0,roundProgress:1,previousProbabilities:null,fieldSource:'trained QNN detection score',fieldSigma:2.25,fieldReveal:1,colorExposure:1,fieldScorePower:1};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const pct=n=>(100*n).toFixed(2)+'%';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const frameYield=()=>new Promise(r=>requestAnimationFrame(r));
const imageCache=new Map(),resetOwner=createLatestOperation();
const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
function reducedGameMotion(){return state.animationMs===0||motionPreference.matches||$('circuit-reduce-motion').checked;}
function syncSearchButton(){const unavailable=!state.ready||state.sceneLoading||state.targetLoading;$('find').disabled=unavailable;$('find').textContent=state.busy?'Stop search':'Find Wanda';$('find').setAttribute('aria-busy',String(state.busy));}
let lastStatusTitle='';
function loadImage(src) { if(imageCache.has(src))return imageCache.get(src);const p=new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('An image could not be loaded.'));i.src=src;});imageCache.set(src,p);p.catch(()=>{if(imageCache.get(src)===p)imageCache.delete(src);});return p; }
function status(title,text) {
  const simple={'Reading the composite…':'Looking for Wanda…','Reading windows with the trained QNN…':'Reading visual clues…','Exploring visual candidates…':'Spotting possibilities…','Amplifying accepted addresses…':'Amplifying the search…','Target localized.':'Found Wanda.','No accepted location.':'No match found.'};
  $('result-title').textContent=simple[title]||title;
  $('status').textContent=title==='Target localized.'&&state.evaluation?'Measured point '+Math.round(state.evaluation.point.x)+', '+Math.round(state.evaluation.point.y)+' · turn the heat map on or off to inspect the result.':title==='Ready to search.'?'Drag Wanda or tap anywhere to place her, then choose Find Wanda.':text;
  $('scene-status').textContent=title+' '+text;
  if(title!==lastStatusTitle||state.evaluation){$('search-announcer').textContent=$('result-title').textContent+' '+$('status').textContent;lastStatusTitle=title;}
}
function targetRect() {const h=state.mode==='qnn'?512/state.grid*.75:state.size;const w=Math.round(h*(state.target.width||state.target.naturalWidth)/(state.target.height||state.target.naturalHeight));const r=targetRectFromCenter(state.cx,state.cy,Math.max(1,w),Math.round(h));r.x=Math.round(r.x);r.y=Math.round(r.y);return r;}
let rasterCache=null;
function targetRaster() {const r=targetRect();if(rasterCache?.source===state.target&&rasterCache.width===r.width&&rasterCache.height===r.height)return rasterCache.canvas;const c=makeCanvas(r.width,r.height),rasterCtx=c.getContext('2d');if(state.targetId==='wanda')rasterCtx.imageSmoothingQuality='high';rasterCtx.drawImage(state.target,0,0,r.width,r.height);rasterCache={source:state.target,width:r.width,height:r.height,canvas:c};return c;}
function backgroundData() {return state.background.getContext('2d',{willReadFrequently:true}).getImageData(0,0,512,512);}
function renderSceneImage(image,entry) {
  // Match the pretest Wanda corpus's explicit high-quality 512px base staging.
  // Other scenes keep their existing crop/rendering contract.
  if(entry.id?.startsWith('wanda-')) {
    const base=makeCanvas(),baseCtx=base.getContext('2d');
    baseCtx.imageSmoothingEnabled=true;baseCtx.imageSmoothingQuality='high';
    baseCtx.drawImage(image,0,0,512,512);return base;
  }
  if(!entry.crop)return renderBackground(image);
  const {x,y,width,height}=entry.crop,w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;
  if(![x,y,width,height].every(Number.isInteger)||x<0||y<0||width<1||height<1||x+width>w||y+height>h)throw Error('The scene panel crop is invalid.');
  const panel=makeCanvas(width,height);panel.getContext('2d').drawImage(image,x,y,width,height,0,0,width,height);
  return renderBackground(panel);
}
async function loadSceneLayers(background,definitions) {
  const layers=createForegroundLayers(background,definitions,{includeDataURLs:!definitions.every(d=>d.cutoutPNG)});
  await Promise.all(layers.map(async(layer,index)=>{
    const definition=definitions[index];if(!definition.cutoutPNG)return;
    const [image,mask]=await Promise.all([loadImage(definition.cutoutPNG),loadImage(definition.maskPNG)]),p=definition.cutoutPosition;
    if(!p||!Number.isInteger(p.x)||!Number.isInteger(p.y))throw Error('A PNG layer needs its original registered position.');
    const foreground=layer.foregroundCanvas.getContext('2d');foreground.clearRect(0,0,512,512);foreground.drawImage(image,p.x,p.y);
    const m=layer.maskCanvas.getContext('2d');m.clearRect(0,0,512,512);m.drawImage(mask,0,0);
    layer.cutoutPNGDataURL=definition.cutoutPNG;layer.pngDataURL=definition.cutoutPNG;layer.maskPNG=definition.maskPNG;layer.cutoutPosition=p;
    layer.cutoutCanvas=makeCanvas(image.naturalWidth||image.width,image.naturalHeight||image.height);layer.cutoutCanvas.getContext('2d').drawImage(image,0,0);
    for(const key of ['bounds','level','depthRange','memberIDs','memberDepthAnchors'])if(definition[key]!=null)layer[key]=definition[key];
  }));
  return layers;
}
function renderPixels() {
  state.frame=compositeLayeredScene({backgroundCanvas:state.background,target:state.present?targetRaster():null,targetRect:targetRect(),foregroundLayers:state.layers,targetZIndex:state.depth==='auto'?0:Number(state.depth),targetDepthMode:state.depth==='auto'?'auto':'manual',depthConvention:'front-when-lower',outputCanvas:composite,targetCanvas:targetLayer,occlusionMaskCanvas:occlusionMask,targetSmoothing:state.targetId!=='wanda'});
  return composite.getContext('2d',{willReadFrequently:true}).getImageData(0,0,512,512);
}
function normalizedTarget(image,trim=true) {
  if(!trim)return image;
  const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height,c=makeCanvas(w,h),cctx=c.getContext('2d',{willReadFrequently:true});cctx.drawImage(image,0,0);
  const data=cctx.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=0,y1=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);}
  if(x1<=x0||y1<=y0)throw Error('The target image is completely transparent.');
  const out=makeCanvas(x1-x0,y1-y0);out.getContext('2d').drawImage(c,x0,y0,x1-x0,y1-y0,0,0,out.width,out.height);return out;
}
function templateImageData() {const c=targetRaster();return c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height);}
function resetSearch(message) {
  state.revision++;state.busy=false;state.scores=null;state.matches=null;state.marks=[];state.trace=null;state.iteration=0;state.measurement=null;state.evaluation=null;state.candidateField=null;state.fieldScores=null;state.displayField=null;state.fieldPhase='candidate';state.fieldProgress=0;state.roundProgress=1;state.previousProbabilities=null;
  syncSearchButton();$('measure').disabled=true;$('replay').disabled=true;$('iteration').disabled=true;$('iteration').value=0;$('iteration-value').textContent=0;
  for(const id of ['mark-count','iteration-count','success-probability','measured-region','runtime','inference-count'])$(id).textContent='—';
  $('ground-truth').className='ground-truth';$('ground-truth').textContent='Target placement is used only to evaluate a sampled result.';
  $('truth-mass').textContent='Not measured.';$('match-work').textContent='No oracle built.';
  if(state.ready){status('Ready to search.',message||'Drag Wanda into the scene, then animate the search.');draw();updateQuantum();}
}
function publishSceneTrace() {
  if(!state.ready||!state.target||!state.currentModel)return;
  if(state.mode!=='current-qnn'){window.dispatchEvent(new CustomEvent('wanda-scene',{detail:null}));return;}
  const r=targetRect();window.dispatchEvent(new CustomEvent('wanda-scene',{detail:{image:renderPixels(),model:state.currentModel,extract:extractWindowFeatures,targetWidth:r.width,targetHeight:r.height,threshold:state.threshold,grid:state.grid,scores:state.scores,candidates:state.matches?.candidates,marks:state.marks,diagnostics:state.matches?.diagnostics}}));
}
function refresh(message,{preserveReset=false}={}) {if(!preserveReset)resetOwner.cancel();resetSearch(message);syncControls();publishSceneTrace();}
function canUseQNN() {return state.sceneId==='legacy'&&state.targetId==='legacy';}
function canUseCurrentQNN() {return state.targetId==='wanda';}
function defaultOracleForTarget() {return canUseCurrentQNN()?'current-qnn':canUseQNN()?'qnn':'template';}
function setOracle(mode) {
  state.mode=mode;state.threshold=mode==='current-qnn'?state.currentModel.threshold:mode==='qnn'?state.model.threshold:.45;
}
function syncControls() {
  for(const button of document.querySelectorAll('[data-scene]')){button.setAttribute('aria-pressed',String(button.dataset.scene===state.sceneId));button.disabled=!state.ready;}
  $('toggle-heat').textContent='Heat map: '+(state.view==='image'?'off':'on');$('toggle-heat').setAttribute('aria-pressed',String(state.view!=='image'));
  document.querySelector('.demo-kind').textContent=state.mode==='template'?'PIXEL TEMPLATE COMPARISON':'TRAINED QNN + GROVER SIMULATION';
  if(!state.sceneLoading)$('scene-choice').value=state.sceneId;$('target-choice').value=state.targetId;$('oracle-mode').value=state.mode;
  $('oracle-mode').querySelector('[value=qnn]').disabled=!canUseQNN();
  $('oracle-mode').querySelector('[value=current-qnn]').disabled=!canUseCurrentQNN();
  $('grid-choice').value=state.grid;for(const o of $('grid-choice').options)o.disabled=state.mode==='qnn'&&Number(o.value)>8;
  $('target-size').value=state.size;$('target-size').disabled=state.mode==='qnn';$('target-size-value').textContent=Math.round(targetRect().height)+' px';
  $('tiny-target-note').hidden=state.mode!=='current-qnn'||state.size>=32;
  $('snap').checked=state.snap;$('depth-choice').value=state.depth;$('view-choice').value=state.view;
  $('threshold').value=state.threshold;$('threshold-value').textContent=Number(state.threshold.toFixed(6)).toString();
  $('remove').textContent=state.present?'Remove Wanda':'Restore Wanda';
  const evidenceLabel=state.mode==='template'?'Raw pixel resemblance':'QNN detection scores';for(const id of ['map-mode','view-choice'])$(id).querySelector('[value=evidence]').textContent=evidenceLabel;
  $('field-description').textContent='Soft peaks reveal '+(state.mode==='current-qnn'?'the trained Wanda QNN scores':state.mode==='qnn'?'the original QNN detector scores':'raw pixel resemblance across the scene')+'. Accepted addresses then gain simulated Grover probability. The curve and samples use exact rounds.';
  const spec=gridSpec(state.grid);$('grid-summary').textContent=spec.count.toLocaleString()+' cells · '+spec.cellWidth+' px · '+spec.qubits+' search qubits';
  $('register-explanation').textContent='Four classifier qubits and '+spec.qubits+' location qubits serve different jobs. The circuit scores a window; Grover amplifies a compiled accepted-address oracle over '+spec.count.toLocaleString()+' addresses. This simulation does not establish an end-to-end quantum speedup or broad person recognition.';
  const active=state.mode==='current-qnn'?'Trained Wanda QNN':state.mode==='qnn'?'Original-art QNN':'Pixel template comparison';
  $('oracle-badge').textContent=active+' · '+(state.mode==='template'?'classical recognition':'simulated quantum classifier');
  $('oracle-badge').dataset.quantum=String(state.mode!=='template');
  $('oracle-description').textContent=state.mode==='current-qnn'?'Trained four-qubit window classifier · final image pixels + selected size.':state.mode==='qnn'?'Frozen four-qubit QNN · original character and crowd only.':'Pixel template comparison · supplied PNG + final composite + clean background.';
  $('active-oracle').textContent=active;
  $('oracle-scope').textContent=state.mode==='current-qnn'?'The trained circuit scores centered image windows. Its learned scores alone select the oracle peaks; no target coordinates, template matching or clean background enter this mode. '+(state.curatedArtwork?'This curated background includes Wanda-derived bystander artwork added after training. Historical accuracy covers the original unseeded five scenes and does not cover this variant.':state.sceneId==='custom'?'Your background is outside the five-scene training domain.':'Training uses this Wanda artwork and five built-in scenes at heights 40, 46, 52, 58 and 64 px; selected size is supplied.'):state.mode==='qnn'?'The saved model reads image patches. Its original same-art evidence does not cover the new scenes or PNGs.':'Classical comparison selected. This mode matches the supplied target at a known size using a clean background reference.';
  if(!state.ready)for(const control of document.querySelectorAll('#experiment button,#experiment select,#experiment input'))control.disabled=true;
  syncSearchButton();
}
function drawHeat(context,frame,width=512,height=512,view=state.view,overlay=false) {
  if(view==='field'||view==='evidence'){
    const N=state.grid**2,probabilities=frame?.probabilities||Array(N).fill(1/N);
    const field=view==='evidence'?state.candidateField:(state.displayField ||= buildSearchDisplayField({candidateField:state.candidateField,probabilities,previousProbabilities:state.previousProbabilities,grid:state.grid,phase:state.fieldPhase,progress:state.fieldProgress,roundProgress:state.roundProgress,fieldSize:128,sigmaCells:state.fieldSigma}));
    if(!field)return;
    const c=makeCanvas(field.width,field.height),cctx=c.getContext('2d');cctx.putImageData(new ImageData(colorizeField(field,{opacity:(overlay ? .90 : .94)*state.fieldReveal,transparentZero:overlay,exposure:state.colorExposure}),field.width,field.height),0,0);
    context.save();context.imageSmoothingEnabled=true;context.drawImage(c,0,0,width,height);context.restore();
    if(!overlay)drawContours(context,field,width,height);
    return;
  }
  const N=state.grid**2,cellW=width/state.grid,cellH=height/state.grid;
  const values=view==='scores'?state.scores:frame?.probabilities;
  if(!values)return;
  for(let i=0;i<N;i++){
    let intensity,negative=false;
    if(view==='scores')intensity=values[i];
    else if(view==='amplitude'){const a=frame.amplitudes[i];negative=a<0;intensity=Math.log1p(Math.abs(a)*Math.sqrt(N))/Math.log1p(Math.sqrt(N));}
    else intensity=Math.log1p(values[i]*N)/Math.log1p(N);
    context.fillStyle=negative?'rgba(35,74,198,'+(overlay ? .72*intensity : .15+.85*intensity)+')':'rgba(234,79,31,'+(overlay ? .75*intensity : .08+.92*intensity)+')';
    context.fillRect(i%state.grid*cellW,Math.floor(i/state.grid)*cellH,cellW+.2,cellH+.2);
  }
}
function drawContours(context,field,width,height){
  const values=field.intensities,w=field.width,h=field.height;if(field.isFlat)return;
  context.save();context.strokeStyle='rgba(225,252,255,.17)';context.lineWidth=.7;
  for(const threshold of [.15,.25,.35,.45,.55,.65,.75]){context.beginPath();
    for(let y=0;y<h-1;y++)for(let x=0;x<w-1;x++){
      const a=values[y*w+x],b=values[y*w+x+1],c=values[(y+1)*w+x+1],d=values[(y+1)*w+x],crossings=[];
      if((a<threshold)!==(b<threshold))crossings.push([x+(threshold-a)/(b-a),y]);
      if((b<threshold)!==(c<threshold))crossings.push([x+1,y+(threshold-b)/(c-b)]);
      if((d<threshold)!==(c<threshold))crossings.push([x+(threshold-d)/(c-d),y+1]);
      if((a<threshold)!==(d<threshold))crossings.push([x,y+(threshold-a)/(d-a)]);
      for(let i=0;i+1<crossings.length;i+=2){context.moveTo((crossings[i][0]+.5)/w*width,(crossings[i][1]+.5)/h*height);context.lineTo((crossings[i+1][0]+.5)/w*width,(crossings[i+1][1]+.5)/h*height);}
    }context.stroke();
  }context.restore();
}
function measuredPoint(index) {if(state.mode!=='qnn'){const c=state.matches?.candidates[index];if(c)return{x:c.bestX,y:c.bestY};}return candidatePoint(index,state.grid);}
function draw() {
  if(!state.ready)return;renderPixels();ctx.clearRect(0,0,512,512);ctx.drawImage(composite,0,0);updateDepthReadout();
  const f=state.trace?.history[state.iteration];
  if(state.view!=='image')drawHeat(ctx,f,512,512,state.view,true);
  if($('show-grid').checked){ctx.strokeStyle=state.grid>16?'rgba(255,255,255,.16)':'rgba(255,255,255,.55)';ctx.lineWidth=.6;const s=512/state.grid;for(let i=1;i<state.grid;i++){ctx.beginPath();ctx.moveTo(i*s,0);ctx.lineTo(i*s,512);ctx.moveTo(0,i*s);ctx.lineTo(512,i*s);ctx.stroke();}}
  if($('show-layers').checked){ctx.save();ctx.setLineDash([4,3]);ctx.lineWidth=1.5;for(const l of state.layers.filter(l=>l.enabled)){const d=state.frame.layerDepths?.find(d=>d.id===l.id),b=l.bounds;ctx.strokeStyle=d?.aboveTarget?'#dc542c':'#1256d1';for(const p of l.paths){if(p.type!=='polygon')continue;ctx.beginPath();p.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.stroke();}if(b){const y=d?.depthAnchorY??b.y+b.height;ctx.beginPath();ctx.moveTo(b.x,y);ctx.lineTo(b.x+b.width,y);ctx.stroke();}}if(state.present){const r=targetRect(),y=state.frame.targetDepthAnchorY??r.y+r.height;ctx.setLineDash([]);ctx.strokeStyle='#2447c8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(r.x-6,y);ctx.lineTo(r.x+r.width+6,y);ctx.stroke();}ctx.restore();}
  if(state.pointer&&state.tool==='move'&&state.present){const r=targetRect();ctx.strokeStyle='#2447c8';ctx.lineWidth=1.5;ctx.strokeRect(r.x-2,r.y-2,r.width+4,r.height+4);}
  if(state.measurement!=null){const p=measuredPoint(state.measurement);ctx.strokeStyle=state.evaluation?.correct?'#2447c8':'#e45a28';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.moveTo(p.x-12,p.y);ctx.lineTo(p.x+12,p.y);ctx.moveTo(p.x,p.y-12);ctx.lineTo(p.x,p.y+12);ctx.stroke();}
}
function updateQuantum() {
  const N=state.grid**2,frame=state.trace?.history[state.iteration]||{probabilities:Array(N).fill(1/N),amplitudes:Array(N).fill(1/Math.sqrt(N)),successProbability:0};
  window.dispatchEvent(new CustomEvent('wanda-grover',{detail:state.trace?{amplitudes:frame.amplitudes,marks:state.marks,iteration:state.iteration,grid:state.grid,maximum:state.trace.history.length-1,peak:recommendIterations(N,state.marks.length),busy:state.busy,measurement:state.measurement,point:state.measurement==null?null:measuredPoint(state.measurement)}:null}));
  const softMap=['field','evidence'].includes($('map-mode').value);mapCtx.fillStyle=softMap?'#102846':'#fffaf0';mapCtx.fillRect(0,0,512,512);if(softMap&&state.background){mapCtx.save();mapCtx.globalAlpha=.22;mapCtx.drawImage(state.background,0,0);mapCtx.restore();}drawHeat(mapCtx,frame,512,512,$('map-mode').value,false);
  if(state.measurement!=null){const s=512/state.grid;mapCtx.strokeStyle='#203eae';mapCtx.lineWidth=2;mapCtx.strokeRect(state.measurement%state.grid*s,Math.floor(state.measurement/state.grid)*s,s,s);}
  const mode=$('map-mode').value;$('state-label').textContent='Round '+state.iteration+' · '+N.toLocaleString()+' amplitudes · '+(mode==='field'?'soft search field':mode==='evidence'?state.fieldSource:mode==='amplitude'?'signed amplitude':'exact Born probability');
  quantumMap.setAttribute('aria-label',mode==='field'?'Soft display blend of '+state.fieldSource+' and smoothed simulated Born probabilities.':mode==='evidence'?'Smoothed '+state.fieldSource+' display; scores are not calibrated identity probabilities.':mode==='amplitude'?'Signed Grover amplitudes on the address grid; logarithmic color intensity, exact values in the cell inspector.':'Born measurement probabilities on the address grid; logarithmic color intensity, exact values in the cell inspector.');
  $('field-stage').textContent=!state.candidateField?'Place a target and start the search.':state.fieldPhase==='candidate'?'01 · '+(state.mode==='current-qnn'?'Wanda-pattern scores':'Explore '+state.fieldSource):'02 · Amplify accepted addresses';$('field-progress').value=state.fieldPhase==='candidate'?0:Math.min(1,state.iteration/Math.max(1,recommendIterations(N,state.marks.length)));
  $('iteration-value').textContent=state.iteration;if(state.trace){$('iteration-count').textContent=state.iteration;$('success-probability').textContent=pct(frame.successProbability);}
  $('peak-value').textContent='Exact peak cell probability: '+pct(Math.max(...frame.probabilities));
  const cW=curve.width,cH=curve.height;curveCtx.clearRect(0,0,cW,cH);curveCtx.strokeStyle='#ccc0ab';curveCtx.lineWidth=1;curveCtx.beginPath();curveCtx.moveTo(20,cH-20);curveCtx.lineTo(cW-12,cH-20);curveCtx.stroke();
  if(state.trace){const hist=state.trace.history;curveCtx.strokeStyle='#e45a28';curveCtx.lineWidth=2;curveCtx.beginPath();hist.forEach((f,i)=>{const x=20+i/Math.max(1,hist.length-1)*(cW-32),y=10+(1-f.successProbability)*(cH-30);i?curveCtx.lineTo(x,y):curveCtx.moveTo(x,y);});curveCtx.stroke();const x=20+state.iteration/Math.max(1,hist.length-1)*(cW-32),y=10+(1-frame.successProbability)*(cH-30);curveCtx.fillStyle='#2447c8';curveCtx.beginPath();curveCtx.arc(x,y,4,0,Math.PI*2);curveCtx.fill();}
  curveCtx.font='13px ui-monospace, monospace';curveCtx.fillStyle='#596373';curveCtx.fillText('1',3,18);curveCtx.fillText('0',3,cH-20);curveCtx.fillText('P(accepted)',25,19);curveCtx.fillText('0',20,cH-3);if(state.trace){const max=state.trace.history.length-1;curveCtx.textAlign='right';curveCtx.fillText('Round '+max,cW-12,cH-3);curveCtx.textAlign='left';}
}
function inferQNN(data) {const s=512/state.grid,scores=[];for(let row=0;row<state.grid;row++)for(let col=0;col<state.grid;col++){patchCtx.clearRect(0,0,128,128);patchCtx.drawImage(composite,col*s,row*s,s,s,0,0,128,128);scores.push(predict(extractFeatures(patchCtx.getImageData(0,0,128,128)),state.model));}return scores;}
function evaluate(index) {
  renderPixels();const r=targetRect(),point=measuredPoint(index),center={x:r.x+r.width/2,y:r.y+r.height/2};
  const visible=state.frame.visibleTarget.data,full=targetLayer.getContext('2d').getImageData(0,0,512,512).data;let total=0,remaining=0;const regions=new Set();
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){const a=(y*512+x)*4+3;total+=full[a];remaining+=visible[a];if(visible[a]>32)regions.add(Math.floor(y/(512/state.grid))*state.grid+Math.floor(x/(512/state.grid)));}
  const visibleFraction=total?remaining/total:0,distance=Math.hypot(point.x-center.x,point.y-center.y),tolerance=state.mode==='current-qnn'?state.matches.geometry.pointTolerance:gridSpec(state.grid).quantizationRadius+1;
  const truth=new Set();if(state.present&&visibleFraction>.01){if(state.mode==='qnn')regions.forEach(i=>truth.add(i));else for(let i=0;i<state.grid**2;i++){const p=measuredPoint(i);if(Math.hypot(p.x-center.x,p.y-center.y)<=tolerance)truth.add(i);}}
  return {correct:truth.has(index),truth,distance,tolerance,visibleFraction,point,center,observable:state.present&&visibleFraction>.01};
}
function measure() {
  if(!state.trace||!state.marks.length||state.busy)return;const f=state.trace.history[state.iteration];state.measurement=sample(f.probabilities);state.evaluation=evaluate(state.measurement);
  const e=state.evaluation;$('measured-region').textContent=Math.round(e.point.x)+', '+Math.round(e.point.y);
  $('ground-truth').className='ground-truth '+(e.correct?'correct':'miss');$('ground-truth').textContent=(e.correct?'✓ Localized target. ':'Sample missed the target. ')+(state.mode!=='qnn'?'Center error '+e.distance.toFixed(1)+' px; tolerance '+e.tolerance.toFixed(1)+' px.':'Measured tile '+(state.measurement+1)+'.')+' Visible target: '+Math.round(100*e.visibleFraction)+'%.';
  const mass=[...e.truth].reduce((sum,i)=>sum+f.probabilities[i],0);$('truth-mass').textContent='Evaluated target probability: '+pct(mass);
  const explanation=state.mode==='current-qnn'?'The trained QNN selected image-window peaks; simulated Grover supplied this sampled address.':state.mode==='qnn'?'The original QNN marked image tiles; simulated Grover supplied this sample.':'The classical template comparison selected peaks; simulated Grover supplied this sample.';
  status(e.correct?'Target localized.':e.observable?'A sample, but not the target.':'No observable target.',e.correct?explanation:'Grover amplifies the accepted predicate, including errors. No answer is forced.');
  updateQuantum();draw();
}
async function displayInterval(milliseconds,token,onFrame){
  if(!milliseconds||reducedGameMotion()){if(token!==state.revision)return false;onFrame(1);return true;}
  const start=performance.now();let last=-Infinity;
  while(token===state.revision){await frameYield();if(token!==state.revision)return false;const elapsed=performance.now()-start,t=reducedGameMotion()?1:Math.min(1,elapsed/milliseconds);if(elapsed-last>=32||t===1){last=elapsed;onFrame(t);}if(t===1)return true;}return false;
}
async function animate(token,measureAtEnd=true) {
  const recommended=recommendIterations(state.grid**2,state.marks.length);state.measurement=null;state.evaluation=null;
  $('measured-region').textContent='Not sampled';$('ground-truth').className='ground-truth';$('ground-truth').textContent='Placement is evaluated after sampling this state.';$('truth-mass').textContent='Not measured.';
  state.iteration=0;state.fieldPhase='candidate';state.fieldProgress=0;state.previousProbabilities=null;state.roundProgress=1;
  status('Exploring visual candidates…',state.fieldSource+' forms the landscape; the oracle separately decides which addresses pass.');
  if(!await displayInterval(reducedGameMotion()?0:1200,token,t=>{state.fieldReveal=t;state.displayField=null;updateQuantum();draw();}))return;
  state.fieldReveal=1;state.fieldPhase='amplification';
  const duration=Math.max(state.animationMs,5000/Math.max(1,recommended));
  for(let k=0;k<=recommended;k++){
    if(reducedGameMotion())k=recommended;
    if(token!==state.revision)return;state.iteration=k;$('iteration').value=k;state.previousProbabilities=k?state.trace.history[k-1].probabilities:null;
    status('Amplifying accepted addresses…','Round '+k+' / '+recommended+' · smooth display between exact simulated rounds.');
    if(!await displayInterval(k?duration:0,token,t=>{state.roundProgress=t;state.fieldProgress=Number($('field-mix').value)*k/Math.max(1,recommended);state.displayField=null;updateQuantum();draw();}))return;
  }
  state.previousProbabilities=null;state.roundProgress=1;state.displayField=null;
  if(token!==state.revision)return;state.busy=false;syncSearchButton();$('iteration').disabled=false;$('measure').disabled=false;$('replay').disabled=false;if(measureAtEnd)measure();
}
async function search({lessonOnly=false}={}) {
  if(!state.ready||state.sceneLoading||state.targetLoading||state.busy)return;state.busy=true;const token=state.revision;syncSearchButton();updateQuantum();status('Reading the composite…','Building the oracle from the final reassembled image.');await frameYield();
  if(token!==state.revision)return;
  try {
    const started=performance.now(),data=renderPixels();state.measurement=null;state.evaluation=null;
    $('measured-region').textContent='Not sampled';$('ground-truth').className='ground-truth';$('ground-truth').textContent='Placement is evaluated after sampling this state.';$('truth-mass').textContent='Not measured.';
    if(state.mode==='current-qnn'){
      const r=targetRect();
      const matches=await scanQNN(data,state.currentModel,{grid:state.grid,targetWidth:r.width,targetHeight:r.height,threshold:state.threshold,shouldCancel:()=>token!==state.revision,onProgress:progress=>{
        if(token===state.revision)status('Reading windows with the trained QNN…',Math.round(progress*100)+'% · learned quantum circuit scores the final image.');
      }});
      if(token!==state.revision)return;state.matches=matches;
      state.scores=state.matches.scores;state.marks=state.matches.marks;state.fieldScores=state.scores;state.fieldSource='trained QNN detection score';
      const d=state.matches.diagnostics;$('inference-count').textContent=d.scoreEvaluations.toLocaleString();$('match-work').textContent=d.scoreEvaluations.toLocaleString()+' trained quantum-circuit window evaluations · '+state.currentModel.qubits+' qubits · '+state.currentModel.layers+' layers. Classical pixel features and peak suppression; no template-matcher fallback.';
    }else if(state.mode==='template'){const template=prepareTemplate(templateImageData());state.matches=matchTemplate(data,template,{grid:state.grid,threshold:state.threshold,backgroundImageData:backgroundData()});state.scores=state.matches.scores;state.marks=state.matches.marks;
      const visual=matchTemplate(data,template,{grid:state.grid,threshold:1,refine:false,maxRefinements:0});state.fieldScores=visual.candidates.map(c=>c.registrationScore);state.fieldSource='raw pixel resemblance';
      const d=state.matches.diagnostics;$('inference-count').textContent=d.scoreEvaluations.toLocaleString();$('match-work').textContent=d.scoreEvaluations.toLocaleString()+' oracle center tests · '+d.sampleComparisons.toLocaleString()+' pixel comparisons · '+d.suppressedCount+' nearby peaks suppressed. The display adds '+visual.diagnostics.scoreEvaluations.toLocaleString()+' raw resemblance tests without a clean-background reference.';
    }else{state.matches=null;state.scores=inferQNN(data);state.fieldScores=state.scores;state.fieldSource='QNN scores';state.marks=state.scores.flatMap((p,i)=>p>=state.threshold?[i]:[]);$('inference-count').textContent=state.grid**2;$('match-work').textContent=state.grid**2+' pixel-patch QNN evaluations.';}
    publishSceneTrace();state.candidateField=buildCandidateField({candidateScores:state.fieldScores,grid:state.grid,fieldSize:128,sigmaCells:state.fieldSigma,source:state.fieldSource,scorePower:state.fieldScorePower,interpolationMode:state.mode==='current-qnn'?'envelope':'average'});state.displayField=null;state.fieldPhase='candidate';state.fieldProgress=0;state.fieldReveal=1;state.previousProbabilities=null;
    if(token!==state.revision)return;const N=state.grid**2,M=state.marks.length,peak=recommendIterations(N,M),maximum=M&&M<N?Math.max(8,2*peak+3):0;
    state.trace=simulateGrover(N,state.marks,maximum);$('runtime').textContent=(performance.now()-started).toFixed(1)+' ms';$('mark-count').textContent=M+' / '+N;
    $('iteration').max=maximum;$('iteration').disabled=true;$('measure').disabled=true;$('replay').disabled=true;state.iteration=0;state.view='field';syncControls();updateQuantum();draw();
    if(!M){$('measured-region').textContent='None';$('ground-truth').textContent='No accepted state; no measurement requested.';$('truth-mass').textContent='Empty oracle · abstention.';status('No accepted location.','The target may be absent, too obscured, or below the threshold. Inspect match scores; the search does not invent a location.');}
    else if(lessonOnly){state.busy=false;$('iteration').disabled=false;$('measure').disabled=false;$('replay').disabled=false;status('Oracle ready.','The image has been scored. Follow the lesson from equal amplitudes; measurement waits for you.');}
    else await animate(token);
  }catch(error){if(token===state.revision&&error.name!=='AbortError'){status('The search needs attention.',error.message);console.error(error);}}finally{if(token===state.revision){state.busy=false;syncSearchButton();updateQuantum();}}
}
function updateDepthReadout() {
  const depths=state.frame?.layerDepths||[],r=targetRect(),foot=state.frame?.targetDepthAnchorY??r.y+r.height;
  const overlapping=depths.filter(d=>{const l=state.layers.find(l=>l.id===d.id),b=l?.bounds;return b&&b.x<r.x+r.width&&b.x+b.width>r.x&&b.y<r.y+r.height&&b.y+b.height>r.y;});
  const count=overlapping.filter(d=>d.aboveTarget).length;
  $('depth-readout').textContent=!state.present?'Target removed.':state.depth==='auto'?'Feet at y = '+Math.round(foot)+' · '+count+' overlapping depth band'+(count===1?'':'s')+' in front.':state.depth==='0'?'Target behind the enabled objects.':'Target kept in front of objects. Automatic depth is optional.';
  for(const l of state.layers){const badge=document.getElementById('depth-'+l.id);if(badge&&l.enabled===false){badge.textContent='Occlusion disabled';delete badge.dataset.front;}}
  for(const d of depths){const badge=document.getElementById('depth-'+d.id),l=state.layers.find(l=>l.id===d.id);if(badge){badge.textContent=!state.present?'Bottom y = '+(d.depthAnchorY??l.bounds?.y+l.bounds?.height):d.aboveTarget?'In front of target':'Behind target';badge.dataset.front=String(d.aboveTarget);badge.title='Object bottom at y = '+(d.depthAnchorY??l.depthAnchorY??l.bounds?.y+l.bounds?.height);}}
}
function renderLayerList() {
  const list=$('foreground-layers');list.replaceChildren();
  if(!state.layers.length){const p=document.createElement('p');p.textContent='No preset foreground cutouts for this background. Paint a custom foreground area below.';list.append(p);}
  for(const layer of state.layers){const item=document.createElement('div');item.className='layer-item';const check=document.createElement('input');check.type='checkbox';check.checked=layer.enabled;check.id='layer-'+layer.id;check.setAttribute('aria-label',layer.name);check.addEventListener('change',()=>{layer.enabled=check.checked;refresh('Foreground layers changed. The final composite is ready to search.');});
    const img=document.createElement('img');img.src=layer.cutoutPNGDataURL||layer.pngDataURL;img.alt='';const label=document.createElement('label');label.htmlFor=check.id;label.textContent=layer.name;if(layer.memberIDs){const members=document.createElement('small');members.className='band-members';members.textContent=layer.memberIDs.map(id=>state.presets.backgrounds[state.sceneId]?.layers.find(l=>l.id===id)?.name||id).join(' · ');label.append(members);}const link=document.createElement('a');link.href=layer.cutoutPNGDataURL||layer.pngDataURL;link.download=layer.id+'.png';link.textContent='PNG ↓';link.setAttribute('aria-label','Download '+layer.name+' PNG');const badge=document.createElement('span');badge.className='depth-badge';badge.id='depth-'+layer.id;badge.textContent='Bottom y = '+Math.round(layer.depthAnchorY??layer.bounds?.y+layer.bounds?.height);label.append(badge);item.append(check,img,label,link);list.append(item);
  }
}
async function selectScene(id,{resetToken=null}={}) {
  if(resetToken==null)resetOwner.cancel();else if(!resetOwner.isCurrent(resetToken))return false;cancelPointer();
  if(state.sceneId==='custom'){state.uploadedLayers=state.layers;state.uploadedPaths=state.customPaths;}
  resetSearch('Loading the selected scene…');const token=++state.sceneLoadRevision,entry=state.catalog.scenes.find(s=>s.id===id);if(!entry)return false;
  state.sceneLoading=true;syncSearchButton();updateQuantum();$('loading').hidden=false;$('loading').querySelector('strong').textContent='Opening the world…';
  try {
  const image=await loadImage(entry.src);if(token!==state.sceneLoadRevision||(resetToken!=null&&!resetOwner.isCurrent(resetToken)))return false;
  let background=renderSceneImage(image,entry),curatedArtwork=null;
  if(entry.curatedArtwork){
    const config=entry.curatedArtwork;
    if(typeof config.variantId!=='string'||!config.variantId.trim())throw Error('The curated artwork definition is invalid.');
    if(config.preRenderedSrc!=null){
      if(typeof config.preRenderedSrc!=='string'||!config.preRenderedSrc.trim())throw Error('The pre-rendered artwork source is invalid.');
      const prepared=await loadImage(config.preRenderedSrc);if(token!==state.sceneLoadRevision||(resetToken!=null&&!resetOwner.isCurrent(resetToken)))return false;
      if((prepared.naturalWidth||prepared.width)!==512||(prepared.naturalHeight||prepared.height)!==512)throw Error('The pre-rendered artwork must be512×512 pixels.');
      background=renderSceneImage(prepared,entry);curatedArtwork={variantId:config.variantId,preRenderedSrc:config.preRenderedSrc,rendererOnly:true};
    }else{
      if(!Array.isArray(config.placements)||config.placements.some(p=>typeof p?.src!=='string'||!p.src.trim()))throw Error('The curated artwork placements are invalid.');
      const placements=await Promise.all(config.placements.map(async p=>({id:p.id,image:await loadImage(p.src),centerX:p.centerX,centerY:p.centerY,height:p.height})));
      if(token!==state.sceneLoadRevision||(resetToken!=null&&!resetOwner.isCurrent(resetToken)))return false;
      // Artwork metadata stays in rendering. Detection receives final RGB only.
      const curated=composeCuratedScene({backgroundCanvas:background,placements,canvasFactory:makeCanvas});
      background=curated.canvas;curatedArtwork={variantId:config.variantId,placements:curated.placements,rendererOnly:true};
    }
  }
  const bandPreset=state.bandPresets.backgrounds[id],layers=await loadSceneLayers(background,bandPreset?.layers||[]);if(token!==state.sceneLoadRevision||(resetToken!=null&&!resetOwner.isCurrent(resetToken)))return false;
  state.sceneId=id;state.background=background;state.curatedArtwork=curatedArtwork;state.customPaths=[];state.layers=layers;if(state.mode==='qnn'&&!canUseQNN()){setOracle(defaultOracleForTarget());state.grid=64;state.snap=false;state.depth='1000';}
  $('scene-credit').textContent=entry.credit;$('scene-source').hidden=!entry.creditUrl;if(entry.creditUrl)$('scene-source').href=entry.creditUrl;$('layer-pack').hidden=!layers.length;$('layer-pack').href='assets/depth-bands/'+id+'/layers.zip';$('object-atlas-link').hidden=!bandPreset;$('object-atlas-link').href=bandPreset?.objectAtlas||'';$('object-atlas-image').src=bandPreset?.objectAtlas||'';$('band-summary').textContent=bandPreset?state.presets.backgrounds[id].layers.length+' curated objects · '+layers.length+' silhouette bands · '+bandPreset.bandHeight+' px foot levels':'No preset bands.';renderLayerList();refresh('World ready. Drag Wanda or tap to place her.',{preserveReset:resetToken!=null});return true;
  } catch(error) {if(token===state.sceneLoadRevision&&(resetToken==null||resetOwner.isCurrent(resetToken))){if(!state.ready)throw error;status('Scene unavailable.',error.message);}return false;} finally {if(token===state.sceneLoadRevision){state.sceneLoading=false;$('loading').hidden=state.ready;if(state.ready){syncControls();updateQuantum();}}}
}
async function selectTarget(id,{resetToken=null}={}) {
  if(resetToken==null)resetOwner.cancel();else if(!resetOwner.isCurrent(resetToken))return false;cancelPointer();
  resetSearch('Loading the selected target…');const token=++state.targetLoadRevision,entry=state.catalog.targets.find(t=>t.id===id);if(!entry)return false;
  state.targetLoading=true;syncSearchButton();updateQuantum();
  try {
  const image=await loadImage(entry.src);if(token!==state.targetLoadRevision||(resetToken!=null&&!resetOwner.isCurrent(resetToken)))return false;
  state.targetId=id;state.target=normalizedTarget(image,id!=='legacy');state.present=true;$('target-image').src=entry.src;$('target-token-image').src=state.target.toDataURL?state.target.toDataURL('image/png'):entry.src;$('target-credit').textContent=entry.credit;
  setOracle(defaultOracleForTarget());state.grid=state.mode==='qnn'?4:64;state.snap=state.mode==='qnn';state.depth='1000';
  if(state.mode==='qnn'){const s=512/state.grid;state.cx=(Math.floor(state.cx/s)+.5)*s;state.cy=(Math.floor(state.cy/s)+.5)*s;}
  refresh(state.mode==='current-qnn'?'Wanda QNN selected. Its trained scores will supply the search oracle.':state.mode==='qnn'?'Original explorer and its frozen QNN selected.':'This artwork uses the explicitly selected classical template comparison.',{preserveReset:resetToken!=null});return true;
  } catch(error) {if(token===state.targetLoadRevision&&(resetToken==null||resetOwner.isCurrent(resetToken))){if(!state.ready)throw error;status('Target unavailable.',error.message);}return false;} finally {if(token===state.targetLoadRevision){state.targetLoading=false;if(state.ready){syncControls();updateQuantum();}}}
}
function place(x,y) {const r=targetRect(),s=512/state.grid;state.cx=clamp(state.snap?(Math.floor(x/s)+.5)*s:x,r.width/2,512-r.width/2);state.cy=clamp(state.snap?(Math.floor(y/s)+.5)*s:y,r.height/2,512-r.height/2);state.present=true;refresh();}
function localPoint(event) {const r=canvas.getBoundingClientRect();return{x:(event.clientX-r.left)*512/r.width,y:(event.clientY-r.top)*512/r.height};}
function rebuildCustomLayer() {const existing=state.layers.filter(l=>l.id!=='custom');state.layers=[...existing,...createForegroundLayers(state.background,[{id:'custom',name:'Your foreground cutout',zIndex:40,enabled:true,paths:state.customPaths}])];}
function cancelPointer(){const pointer=state.pointer;if(!pointer)return;state.pointer=null;if(canvas.hasPointerCapture(pointer.pointerId))canvas.releasePointerCapture(pointer.pointerId);if(pointer.tool!=='move')renderLayerList();if(state.ready)draw();}
function endPointer(event){if(event&&state.pointer?.pointerId!==event.pointerId)return;cancelPointer();}
canvas.addEventListener('pointerdown',event=>{
  if(!state.ready||state.sceneLoading||state.targetLoading||state.pointer||event.isPrimary===false||event.button>0)return;
  event.preventDefault();canvas.focus();const point=localPoint(event);state.pointer=createPointerSession({pointerId:event.pointerId,tool:state.tool,point,center:{x:state.cx,y:state.cy},rect:targetRect(),radius:Number($('brush-size').value)});canvas.setPointerCapture(event.pointerId);
  if(state.pointer.tool==='move'){const action=pointerAction(state.pointer,event.pointerId,point);place(action.x,action.y);}else{state.customPaths.push(state.pointer.path);rebuildCustomLayer();refresh();}
});
canvas.addEventListener('pointermove',event=>{
  if(!state.pointer)return;if(!state.ready||state.sceneLoading||state.targetLoading){cancelPointer();return;}
  const action=pointerAction(state.pointer,event.pointerId,localPoint(event));if(!action)return;
  if(action.type==='move')place(action.x,action.y);else{if(!state.customPaths.includes(action.path)){cancelPointer();return;}action.path.points.push(action.point);rebuildCustomLayer();refresh();}
});
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('lostpointercapture',endPointer);
canvas.addEventListener('keydown',event=>{if(event.key==='Escape'){if(state.busy){event.preventDefault();stopSearch();}else if(state.pointer){event.preventDefault();cancelPointer();}return;}if(!state.ready||state.sceneLoading||state.targetLoading)return;if(event.key==='Enter'){event.preventDefault();search();return;}const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(d){event.preventDefault();const step=state.snap?512/state.grid:event.shiftKey?12:2;place(state.cx+d[0]*step,state.cy+d[1]*step);}});
$('target-token').addEventListener('dragstart',event=>{event.dataTransfer.setData('application/x-atlas-target',state.targetId);event.dataTransfer.effectAllowed='copy';});
canvas.addEventListener('dragover',event=>{event.preventDefault();canvas.classList.add('drop-ready');});
canvas.addEventListener('dragleave',()=>canvas.classList.remove('drop-ready'));
canvas.addEventListener('drop',async event=>{event.preventDefault();canvas.classList.remove('drop-ready');const p=localPoint(event),sceneToken=state.sceneLoadRevision;try{if(event.dataTransfer.files.length){if(!await uploadTarget(event.dataTransfer.files[0]))return;}else if(!state.ready||state.sceneLoading||state.targetLoading)return;if(sceneToken!==state.sceneLoadRevision)return;state.tool='move';$('editor-tool').value='move';place(p.x,p.y);}catch(error){status('The image needs attention.',error.message);}});
async function decodeFile(file) {if(!file||!/^image\/(png|jpeg|webp)$/.test(file.type))throw Error('Choose a PNG, JPEG or WebP image.');if(file.size>20*1024*1024)throw Error('Use an image smaller than 20 MB.');const url=URL.createObjectURL(file);try{return {image:await loadImage(url),url};}catch(error){URL.revokeObjectURL(url);imageCache.delete(url);throw error;}}
function restoreUploadedTarget() {resetOwner.cancel();cancelPointer();state.targetLoadRevision++;state.targetLoading=false;state.targetId='custom';state.target=state.uploadedTarget;state.present=true;setOracle('template');state.grid=64;$('target-image').src=state.uploadedTargetUrl;$('target-token-image').src=state.uploadedTargetUrl;$('target-credit').textContent='Your image · browser only';refresh('Uploaded target: classical template comparison selected. The trained QNN is for the built-in striped person.');}
async function uploadTarget(file) {
  resetOwner.cancel();cancelPointer();
  resetSearch('Loading your target image…');const token=++state.targetLoadRevision;state.targetLoading=true;syncControls();updateQuantum();let decoded,retained=false;
  try {decoded=await decodeFile(file);if(token!==state.targetLoadRevision)return false;const normalized=normalizedTarget(decoded.image);if(state.uploadedTargetUrl){URL.revokeObjectURL(state.uploadedTargetUrl);imageCache.delete(state.uploadedTargetUrl);}state.uploadedTarget=normalized;state.uploadedTargetUrl=decoded.url;retained=true;if(!$('target-choice').querySelector('[value=custom]'))$('target-choice').add(new Option('Your uploaded PNG','custom'));restoreUploadedTarget();return true;
  }catch(error){if(token!==state.targetLoadRevision)return false;throw error;
  }finally{if(decoded&&!retained){URL.revokeObjectURL(decoded.url);imageCache.delete(decoded.url);}if(token===state.targetLoadRevision){state.targetLoading=false;syncControls();publishSceneTrace();updateQuantum();}}
}
function restoreUploadedBackground() {resetOwner.cancel();cancelPointer();state.sceneLoadRevision++;state.sceneLoading=false;$('loading').hidden=state.ready;state.sceneId='custom';state.background=state.uploadedBackground;state.curatedArtwork=null;state.layers=state.uploadedLayers||[];state.customPaths=state.uploadedPaths||[];setOracle(defaultOracleForTarget());state.grid=64;$('scene-credit').textContent='Your background · browser only';$('scene-source').hidden=true;$('layer-pack').hidden=true;$('object-atlas-link').hidden=true;$('object-atlas-image').removeAttribute('src');$('band-summary').textContent='Your background has no preset depth bands.';renderLayerList();refresh('Your background is loaded locally. QNN performance on uploaded backgrounds is outside its built-in training domain.');}
async function uploadBackground(file) {
  resetOwner.cancel();cancelPointer();
  resetSearch('Loading your background image…');const token=++state.sceneLoadRevision;state.sceneLoading=true;syncControls();updateQuantum();let decoded;
  try {decoded=await decodeFile(file);if(token!==state.sceneLoadRevision)return false;state.uploadedBackground=renderBackground(decoded.image);state.uploadedLayers=[];state.uploadedPaths=[];if(!$('scene-choice').querySelector('[value=custom]'))$('scene-choice').add(new Option('Your uploaded background','custom'));restoreUploadedBackground();return true;
  }catch(error){if(token!==state.sceneLoadRevision)return false;throw error;
  }finally{if(decoded){URL.revokeObjectURL(decoded.url);imageCache.delete(decoded.url);}if(token===state.sceneLoadRevision){state.sceneLoading=false;$('loading').hidden=state.ready;syncControls();publishSceneTrace();updateQuantum();}}
}
function fileInput(id,action) {$(id).addEventListener('change',async event=>{try{if(event.target.files[0])await action(event.target.files[0]);}catch(error){status('The image needs attention.',error.message);}event.target.value='';});}
fileInput('upload-target',uploadTarget);fileInput('upload-background',uploadBackground);
$('background-drop').addEventListener('dragover',event=>event.preventDefault());$('background-drop').addEventListener('drop',async event=>{event.preventDefault();try{if(event.dataTransfer.files[0])await uploadBackground(event.dataTransfer.files[0]);}catch(error){status('The image needs attention.',error.message);}});
$('scene-choice').addEventListener('change',event=>{if(event.target.value==='custom')restoreUploadedBackground();else selectScene(event.target.value).catch(error=>status('Scene unavailable.',error.message));});
$('target-choice').addEventListener('change',event=>{if(event.target.value==='custom')restoreUploadedTarget();else selectTarget(event.target.value).catch(error=>status('Target unavailable.',error.message));});
$('grid-choice').addEventListener('change',event=>{state.grid=Number(event.target.value);if(state.snap){const s=512/state.grid;state.cx=(Math.floor(state.cx/s)+.5)*s;state.cy=(Math.floor(state.cy/s)+.5)*s;}refresh('Grover address cells changed; the fine QNN window scan keeps its 8px spacing and selected target size.');});
$('target-size').addEventListener('input',event=>{state.size=Number(event.target.value);refresh();});
$('oracle-mode').addEventListener('change',event=>{setOracle(event.target.value);state.grid=state.mode==='qnn'?4:64;state.snap=state.mode==='qnn';if(state.mode==='qnn'){state.depth='1000';const s=512/state.grid;state.cx=(Math.floor(state.cx/s)+.5)*s;state.cy=(Math.floor(state.cy/s)+.5)*s;}refresh(state.mode==='current-qnn'?'Trained Wanda QNN active. Its learned window scores decide the oracle.':state.mode==='qnn'?'Original-art QNN starts with a visible target snapped inside a tile.':'Classical template comparison selected. This mode does not run the trained QNN.');});
$('threshold').addEventListener('input',event=>{state.threshold=Number(event.target.value);refresh('Threshold changed. Build a fresh oracle to test it.');});
$('depth-choice').addEventListener('change',event=>{state.depth=event.target.value;refresh('Target stacking order changed. The search reads the reassembled image.');});
$('view-choice').addEventListener('change',event=>{state.view=event.target.value;draw();});
$('map-mode').addEventListener('change',updateQuantum);$('show-grid').addEventListener('change',draw);$('show-layers').addEventListener('change',draw);
$('field-softness').addEventListener('input',event=>{state.fieldSigma=Number(event.target.value);$('field-softness-value').textContent=state.fieldSigma.toFixed(2)+' cells';if(state.fieldScores)state.candidateField=buildCandidateField({candidateScores:state.fieldScores,grid:state.grid,fieldSize:128,sigmaCells:state.fieldSigma,source:state.fieldSource,scorePower:state.fieldScorePower,interpolationMode:state.mode==='current-qnn'?'envelope':'average'});state.displayField=null;updateQuantum();draw();});
$('field-faint').addEventListener('change',event=>{state.fieldScorePower=event.target.checked?.35:1;if(state.fieldScores)state.candidateField=buildCandidateField({candidateScores:state.fieldScores,grid:state.grid,fieldSize:128,sigmaCells:state.fieldSigma,source:state.fieldSource,scorePower:state.fieldScorePower,interpolationMode:state.mode==='current-qnn'?'envelope':'average'});state.displayField=null;updateQuantum();draw();});
$('field-mix').addEventListener('input',event=>{$('field-mix-value').textContent=Math.round(100*Number(event.target.value))+'%';if(state.trace)state.fieldProgress=Number(event.target.value)*Math.min(1,state.iteration/Math.max(1,recommendIterations(state.grid**2,state.marks.length)));state.displayField=null;updateQuantum();draw();});
$('field-exposure').addEventListener('input',event=>{state.colorExposure=Number(event.target.value);$('field-exposure-value').textContent=state.colorExposure.toFixed(1)+'×';updateQuantum();draw();});
$('snap').addEventListener('change',event=>{state.snap=event.target.checked;if(state.snap)place(state.cx,state.cy);});
$('editor-tool').addEventListener('change',event=>{cancelPointer();state.tool=event.target.value;canvas.style.cursor=state.tool==='move'?'grab':'crosshair';});
$('clear-custom').addEventListener('click',()=>{cancelPointer();state.customPaths=[];state.layers=state.layers.filter(l=>l.id!=='custom');renderLayerList();refresh();});
$('move').addEventListener('click',()=>place(60+Math.random()*392,60+Math.random()*392));$('remove').addEventListener('click',()=>{state.present=!state.present;refresh();});
function stopSearch(){if(!state.busy)return;cancelPointer();refresh('Search stopped. Your image and placement are preserved.');status('Search stopped.','Choose Find Wanda to start a fresh search.');}
$('find').addEventListener('click',()=>state.busy?stopSearch():search());$('measure').addEventListener('click',measure);
$('replay').addEventListener('click',async()=>{if(!state.trace||state.busy)return;state.busy=true;syncSearchButton();updateQuantum();$('iteration').disabled=true;$('measure').disabled=true;$('replay').disabled=true;await animate(state.revision);});
$('iteration').addEventListener('input',event=>{state.revision++;state.busy=false;syncSearchButton();state.iteration=Number(event.target.value);state.previousProbabilities=null;state.roundProgress=1;state.fieldReveal=1;state.fieldPhase='amplification';state.fieldProgress=Number($('field-mix').value)*Math.min(1,state.iteration/Math.max(1,recommendIterations(state.grid**2,state.marks.length)));state.displayField=null;state.measurement=null;state.evaluation=null;$('measured-region').textContent='Not sampled';$('ground-truth').className='ground-truth';$('ground-truth').textContent='Placement is evaluated after sampling this state.';$('truth-mass').textContent='Measure this state for an independent target check.';status('Inspecting amplitudes.','Round '+state.iteration+' · slide beyond the peak to see overshoot.');updateQuantum();draw();});
$('animation-speed').addEventListener('change',event=>{state.animationMs=Number(event.target.value);});
quantumMap.addEventListener('pointermove',event=>{const r=quantumMap.getBoundingClientRect(),x=clamp(Math.floor((event.clientX-r.left)/r.width*state.grid),0,state.grid-1),y=clamp(Math.floor((event.clientY-r.top)/r.height*state.grid),0,state.grid-1),i=y*state.grid+x,N=state.grid**2,f=state.trace?.history[state.iteration];$('cell-inspector').textContent='Cell '+i+' · |'+bitstring(i,Math.log2(N))+'⟩ · '+state.fieldSource+' '+(state.fieldScores?.[i]?.toFixed(3)??'—')+' · amplitude '+(f?f.amplitudes[i]:1/Math.sqrt(N)).toFixed(5)+' · exact probability '+pct(f?f.probabilities[i]:1/N);});
function download(canvas,name) {const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download=name;a.click();}
$('export-scene').addEventListener('click',()=>{renderPixels();download(composite,'search-atlas-composite.png');});
// Lesson controls use the same saved run, round inspector and measurement path.
window.addEventListener('wanda-lesson-request',event=>{
  if(state.mode!=='current-qnn'||!state.ready||state.busy)return;
  const request=event.detail;
  if(request?.action==='build'){search({lessonOnly:true});return;}
  if(request?.action==='run'){search();return;}
  if(!state.trace)return;
  if(request?.action==='measure'){measure();return;}
  if(request?.action==='round'&&Number.isInteger(request.round)&&request.round>=0&&request.round<state.trace.history.length){
    $('iteration').value=request.round;$('iteration').dispatchEvent(new Event('input'));
  }
});
$('export-layers').addEventListener('click',()=>{const payload={version:2,size:512,targetDepthMode:state.depth==='auto'?'auto':'manual',depthConvention:'front-when-lower',targetDepthAnchorY:state.frame?.targetDepthAnchorY,layerDepths:state.frame?.layerDepths,cutoutRegistrations:state.layers.map(l=>({id:l.id,position:l.cutoutPosition,width:l.cutoutCanvas?.width,height:l.cutoutCanvas?.height,png:l.cutoutPNGDataURL?.startsWith('data:')?null:l.cutoutPNGDataURL,maskPNG:l.maskPNG||null})),background:state.sceneId,target:state.targetId,targetRect:targetRect(),targetZIndex:state.depth==='auto'?0:Number(state.depth),layers:serializeForegroundLayers(state.layers)};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='search-atlas-layer-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
async function resetDemo(){
  await runLatestOperation(resetOwner,[token=>selectTarget('wanda',{resetToken:token}),token=>selectScene('wanda-festival',{resetToken:token})],()=>{
    state.present=true;state.grid=64;state.size=52;state.depth='1000';setOracle('current-qnn');state.cx=420;state.cy=300;state.view='image';state.snap=false;state.tool='move';$('editor-tool').value='move';refresh('Trained Wanda QNN and a fully visible Wanda in Festival are restored.');
  });
}
$('reset-demo').addEventListener('click',resetDemo);
$('toggle-heat').addEventListener('click',()=>{state.view=state.view==='image'?'field':'image';syncControls();draw();});
$('target-token').addEventListener('click',()=>{if(!state.ready)return;if(!state.present){state.present=true;refresh('Wanda restored. Tap the scene or use arrow keys to place her.');}canvas.focus();});
async function initialize() {
  try {const [catalog,presets,bandPresets,model,currentModel,wandaModel]=await Promise.all([fetch('scene-catalog.json').then(r=>r.json()),fetch('foreground-presets.json').then(r=>r.json()),fetch('depth-band-presets.json').then(r=>r.json()),fetch('model/model.json').then(r=>r.json()),fetch('model/current-qnn.json').then(r=>{if(!r.ok)throw Error('The historical QNN checkpoint is unavailable.');return r.json();}),fetch('model/wanda-qnn.json').then(r=>{if(!r.ok)throw Error('The trained Wanda QNN checkpoint is unavailable.');return r.json();})]);state.catalog=catalog;state.presets=presets;state.bandPresets=bandPresets;state.model=model;state.currentModel=wandaModel;
    for(const [id,entries]of[['scene-choice',catalog.scenes],['target-choice',catalog.targets]])for(const entry of entries)$(id).add(new Option(entry.name,entry.id));
    for(const entry of catalog.scenes){const b=document.createElement('button');b.className='scene-thumb';b.dataset.scene=entry.id;b.setAttribute('aria-label','Choose '+entry.name);b.setAttribute('aria-pressed',String(entry.id===state.sceneId));const image=document.createElement('img');image.src=entry.src;image.alt='';const label=document.createElement('span');label.textContent=entry.name.split(' · ')[0];b.append(image,label);b.addEventListener('click',()=>selectScene(entry.id));$('scene-thumbnails').append(b);}
    await selectTarget('wanda');await selectScene('wanda-festival');state.ready=true;for(const control of document.querySelectorAll('#experiment button,#experiment select,#experiment input'))control.disabled=false;$('loading').hidden=true;state.view='image';syncControls();refresh();
    $('model-circuit').textContent=model.qubits+' qubits · '+model.layers+' layers';$('model-parameters').textContent=model.parameterCount;$('test-accuracy').textContent=pct(model.metrics.test.accuracy);$('test-count').textContent=model.metrics.test.n;
    const wandaMetrics=await fetch('model/wanda-qnn-metrics.json').then(r=>r.ok?r.json():null);renderWandaEvidence(wandaMetrics);
    const currentMetrics=await fetch('model/current-qnn-metrics.json').then(r=>{if(!r.ok)throw Error('The current QNN evidence record is unavailable.');return r.json();});
    const currentTest=currentMetrics.qnn.windowMetrics.test;
    $('current-qnn-circuit').textContent=currentModel.qubits+' qubits · '+currentModel.layers+' layers';$('current-qnn-parameters').textContent=currentModel.optimizedParameterCount+' / '+currentModel.parameterCount+' exported';$('current-qnn-accuracy').textContent=pct(currentTest.accuracy);$('current-qnn-count').textContent=currentTest.n.toLocaleString();
    $('current-qnn-recall').textContent=pct(currentTest.recall);$('current-qnn-precision').textContent=pct(currentTest.precision);
    const comparison=$('current-baseline-table');comparison.replaceChildren();
    const qm=currentMetrics.qnn,lm=currentMetrics.logistic;
    for(const [label,q,l]of[['Positive-window recall',pct(qm.windowMetrics.test.recall),pct(lm.windowMetrics.test.recall)],['Accepted-window precision',pct(qm.windowMetrics.test.precision),pct(lm.windowMetrics.test.precision)],['Complete target scenes',qm.sceneMetrics.test.completeHits+' / '+qm.sceneMetrics.test.targetScenes,lm.sceneMetrics.test.completeHits+' / '+lm.sceneMetrics.test.targetScenes],['False-point target scenes',qm.sceneMetrics.test.targetFalsePointScenes,lm.sceneMetrics.test.targetFalsePointScenes],['False-point empty scenes',qm.sceneMetrics.test.absenceFalsePointScenes,lm.sceneMetrics.test.absenceFalsePointScenes]]){const row=document.createElement('tr');for(const value of[label,q,l]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}comparison.append(row);}
    const contribution=currentMetrics.quantumContribution,trained=contribution.trainedValidation,zero=contribution.zeroThetaSameReadout.metrics,initial=contribution.initialThetaSameReadout.metrics;
    $('current-qnn-contribution').textContent='At the frozen threshold, learned quantum angles recover '+trained.true_positive+' / '+(trained.true_positive+trained.false_negative)+' positive validation windows. Zero angles recover '+zero.true_positive+'; initial untrained angles recover '+initial.true_positive+', with the same learned readout. A separate fixed-angle/refitted-readout control has validation balanced loss '+contribution.fixedInitialQuantumRefittedReadout.validationBalancedBCE.toFixed(3)+' versus '+trained.balanced_bce.toFixed(3)+' for the trained circuit. These checks establish circuit participation; they do not establish quantum advantage.';
    const baseline=await fetch('model/baseline_metrics.json').then(r=>r.json()),table=$('baseline-table');table.replaceChildren();for(const [name,m]of[['Legacy QNN · 40 slots',model.metrics.test],['Logistic · 9 parameters',baseline.splits.test]]){const row=document.createElement('tr');for(const value of[name,pct(m.accuracy),pct(m.recall)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}table.append(row);}
  }catch(error){status('The editor could not load.',error.message);$('loading').innerHTML='<strong>The editor needs attention.</strong><span>Refresh after the image files load.</span>';console.error(error);}
}
for(const control of document.querySelectorAll('#experiment button,#experiment select,#experiment input'))control.disabled=true;
// Replay current snapshots when the explainer's module listeners arrive after asset loading.
window.addEventListener('wanda-underhood-ready',()=>{if(!state.ready)return;publishSceneTrace();updateQuantum();});
initialize();
