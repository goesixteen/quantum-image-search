/** Controlled same-art one/two-copy experiment, using the unchanged production scanner. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {compositeLayeredScene} from '../../dist/scene-editor.js';
import {scanQNN} from '../../dist/wanda-localizer.js';
import {simulateGrover,recommendIterations,sample} from '../../dist/quantum.js';

const here=path.dirname(fileURLToPath(import.meta.url)),project=path.resolve(here,'../..'),dist=path.join(project,'dist');
const require=createRequire(import.meta.url);let canvas;
try {canvas=require('@napi-rs/canvas');}
catch {canvas=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'));}
const {createCanvas,loadImage}=canvas,factory=(w,h)=>createCanvas(w,h);
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const modelFile=path.join(dist,'model/wanda-qnn.json'),model=JSON.parse(fs.readFileSync(modelFile));
assert.equal(sha(modelFile),'d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88');
const targetSource=path.join(dist,'assets/wanda/wanda.png'),backgroundSource=path.join(dist,'assets/wanda/festival-512.png');
const source=await loadImage(targetSource),trim=factory(440,1493);trim.getContext('2d').drawImage(source,285,21,440,1493,0,0,440,1493);
const height=52,width=Math.round(height*trim.width/trim.height),sprite=factory(width,height),sc=sprite.getContext('2d');
sc.imageSmoothingEnabled=true;sc.imageSmoothingQuality='high';sc.drawImage(trim,0,0,width,height);
const background=await loadImage(backgroundSource),base=factory(512,512),bc=base.getContext('2d');
bc.imageSmoothingEnabled=true;bc.imageSmoothingQuality='high';bc.drawImage(background,0,0,512,512);
const requested=[[420,300],[276,348]],rects=requested.map(([x,y])=>({x:Math.round(x-width/2),y:Math.round(y-height/2),width,height}));
function render(input,rect) {
  return compositeLayeredScene({backgroundCanvas:input,target:sprite,targetRect:rect,foregroundLayers:[],targetDepthMode:'manual',targetZIndex:1000,targetSmoothing:false,canvasFactory:factory}).canvas;
}
const firstOnly=render(base,rects[0]),secondOnly=render(base,rects[1]),both=render(firstOnly,rects[1]);
const browserBackground=path.resolve(project,'../../work/wanda-two-target-browser-background.png');
fs.mkdirSync(path.dirname(browserBackground),{recursive:true});fs.writeFileSync(browserBackground,secondOnly.toBuffer('image/png'));
const seed=2026101107,draws=10000;
function seededRandom(value) {let state=value>>>0;return()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};}
function saveCompressed(file,value) {const bytes=Buffer.from(JSON.stringify(value));fs.writeFileSync(path.join(here,file),gzipSync(bytes));assert.deepEqual(JSON.parse(gunzipSync(fs.readFileSync(path.join(here,file)))),JSON.parse(bytes));}
const cases=[];
for(const [id,scene,count] of [['one',firstOnly,1],['two',both,2]]) {
  fs.writeFileSync(path.join(here,id+'-scene.png'),scene.toBuffer('image/png'));
  const pixels=scene.getContext('2d').getImageData(0,0,512,512);
  // Only final RGBA, frozen model, and supplied size reach inference.
  const scan=await scanQNN(pixels,model,{grid:64,targetWidth:width,targetHeight:height,batchSize:4096});
  const N=4096,M=scan.marks.length,peak=recommendIterations(N,M),maximum=M&&M<N?2*peak+3:0,trace=simulateGrover(N,scan.marks,maximum);
  const distribution=trace.history[peak].probabilities;
  // Renderer centers and independent grading are consulted only AFTER scanning.
  const centers=rects.slice(0,count).map(r=>({x:r.x+r.width/2,y:r.y+r.height/2})),tolerance=scan.geometry.pointTolerance;
  const targetIndices=centers.map(center=>scan.candidates.filter(c=>Math.hypot(c.bestX-center.x,c.bestY-center.y)<=tolerance).map(c=>c.index));
  const trueIndices=new Set(targetIndices.flat()),marks=new Set(scan.marks);
  const acceptedPoints=scan.marks.map(i=>{const c=scan.candidates[i];return {index:i,x:c.bestX,y:c.bestY,score:c.score,distances:centers.map(p=>Math.hypot(c.bestX-p.x,c.bestY-p.y)),correct:trueIndices.has(i)};});
  const rng=seededRandom(seed),outcomes=[],counts={},gradedCounts=Array(count).fill(0);let unmarked=0,misses=0;
  for(let j=0;j<draws;j++) {
    const index=sample(distribution,rng);outcomes.push(index);counts[index]=(counts[index]??0)+1;
    if(!marks.has(index))unmarked++;
    if(!trueIndices.has(index))misses++;
    targetIndices.forEach((indices,k)=>{if(indices.includes(index))gradedCounts[k]++;});
  }
  assert.equal(Object.values(counts).reduce((sum,n)=>sum+n,0),draws);
  let maxNormError=0,maxFormulaError=0;
  for(const frame of trace.history) {
    maxNormError=Math.max(maxNormError,Math.abs(frame.probabilities.reduce((sum,p)=>sum+p,0)-1));
    maxFormulaError=Math.max(maxFormulaError,Math.abs(frame.successProbability-Math.sin((2*frame.iteration+1)*trace.theta)**2));
  }
  assert.ok(maxNormError<1e-11);assert.ok(maxFormulaError<1e-11);
  saveCompressed(id+'-scan.json.gz',{scores:Array.from(scan.scores),windowScores:Array.from(scan.windowScores),candidates:scan.candidates,marks:scan.marks,geometry:scan.geometry,diagnostics:scan.diagnostics});
  saveCompressed(id+'-grover-history.json.gz',trace);
  fs.writeFileSync(path.join(here,id+'-sampled-addresses.json'),JSON.stringify({seed,draws,round:peak,outcomes,counts})+'\n');
  const result={id,targetCount:count,requestedCenters:requested.slice(0,count),renderedCenters:centers,targetRectangles:rects.slice(0,count),knownWidth:width,knownHeight:height,threshold:model.threshold,N,M,peak,maximum,theta:trace.theta,acceptedPoints,aboveThreshold:scan.diagnostics.acceptedBeforeNMS,diagnostics:scan.diagnostics,pointTolerance:tolerance,grading:{rule:'Closest candidate point within fixed fine-lattice quantization tolerance; every copy is fully visible. Coordinates consulted only after inference.',trueAddressSets:targetIndices,falseAcceptedPoints:acceptedPoints.filter(p=>!p.correct).length},probabilities:{accepted:trace.history[peak].successProbability,trueTarget:[...trueIndices].reduce((sum,i)=>sum+distribution[i],0),eachTarget:targetIndices.map(indices=>indices.reduce((sum,i)=>sum+distribution[i],0)),unmarked:distribution.reduce((sum,p,i)=>sum+(marks.has(i)?0:p),0)},samples:{seed,draws,counts,unmarked,misses,eachTarget:gradedCounts,noPostselection:true,emptyOraclePolicy:M?'All measured addresses retained, including unmarked and errors.':'No reported answer; diagnostic uniform samples retained separately.'},verification:{maxNormError,maxFormulaError},files:{scene:id+'-scene.png',scan:id+'-scan.json.gz',exactGroverHistory:id+'-grover-history.json.gz',allSamples:id+'-sampled-addresses.json'},rounds:trace.history.map(f=>({round:f.iteration,acceptedProbability:f.successProbability,trueTargetProbability:[...trueIndices].reduce((sum,i)=>sum+f.probabilities[i],0)}))};
  cases.push(result);console.log(JSON.stringify({id,M,peak,acceptedPoints,probabilities:result.probabilities,samples:result.samples}));
}
const report={recordedAtUtc:new Date().toISOString(),scope:'Controlled same-art two-copy demonstration at predefined current/former default centers; not a held-out accuracy or generalization benchmark.',renderer:{backend:'@napi-rs/canvas',background:'Native-high five-argument512 staging of delivered normalized Festival PNG.',targetTrim:[285,21,725,1514],targetResize:'High-quality15x52 sprite; integer placement, targetSmoothing=false.',foreground:'Both copies fully in front; no masks/layers affect the pixels.',browserCaveat:'Native high-quality1:1 background can differ from Chromium. Uploadable second-only PNG is provided for an actual browser comparison; this report is native, not browser parity.'},inferenceInputs:['final opaque RGBA pixels','declared15x52 size','unchanged saved Wanda QNN'],unchangedSources:{model:sha(modelFile),features:sha(path.join(dist,'wanda-localizer.js')),qnn:sha(path.join(dist,'qnn.js')),compositor:sha(path.join(dist,'scene-editor.js')),grover:sha(path.join(dist,'quantum.js')),background:sha(backgroundSource),target:sha(targetSource)},browserBackground:{file:'../../../../work/wanda-two-target-browser-background.png',sha256:sha(browserBackground),containsOnlySecondWanda:true,requestedCenter:requested[1],renderedCenter:[rects[1].x+width/2,rects[1].y+height/2]},cases};
fs.writeFileSync(path.join(here,'report.json'),JSON.stringify(report,null,2)+'\n');

// Illustration only: annotations and target grades are never scanner inputs.
const picture=factory(1112,708),p=picture.getContext('2d');p.fillStyle='#f8f6ee';p.fillRect(0,0,picture.width,picture.height);p.fillStyle='#243c51';p.font='bold 24px sans-serif';p.fillText('One Wanda versus two: the frozen QNN + Grover',28,37);p.font='14px sans-serif';p.fillText('Festival · both copies fully visible · 52 px · same threshold · no forced or postselected samples',28,63);
for(const [j,scene] of [firstOnly,both].entries()) {
  const r=cases[j],x=28+j*556;p.drawImage(scene,x,112);p.font='bold 18px sans-serif';p.fillStyle='#243c51';p.fillText(j?'Two copies':'One copy',x,94);
  for(const point of r.acceptedPoints) {p.strokeStyle=point.correct?'#2469ce':'#d64726';p.lineWidth=2;p.beginPath();p.arc(x+point.x,112+point.y,8,0,Math.PI*2);p.stroke();}
  p.font='15px sans-serif';p.fillStyle='#243c51';p.fillText(`${r.M} accepted · peak ${r.peak} · accepted mass ${(100*r.probabilities.accepted).toFixed(3)}%`,x,649);
  p.fillText(`10,000 draws: ${r.samples.eachTarget.join(' / ')} target hits; ${r.samples.unmarked} unmarked`,x,674);
}
p.font='11px sans-serif';p.fillStyle='#6b7680';p.fillText('Controlled native renderer demonstration. Blue rings mark accepted points after inference; this is not a held-out accuracy estimate.',28,697);
const illustration=path.resolve(project,'../docs/screenshots/wanda-two-target-experiment.png');fs.writeFileSync(illustration,picture.toBuffer('image/png'));
const manifest={recordedAtUtc:report.recordedAtUtc,modelSHA256:report.unchangedSources.model,files:Object.fromEntries(fs.readdirSync(here).filter(f=>f!=='manifest.json').map(f=>[f,sha(path.join(here,f))])),illustration:{path:'../../../docs/screenshots/wanda-two-target-experiment.png',sha256:sha(illustration)},browserBackground:report.browserBackground};
fs.writeFileSync(path.join(here,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({report:path.join(here,'report.json'),illustration,browserBackground}));
