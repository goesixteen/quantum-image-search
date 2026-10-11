/** Score an opaque actual-browser export; renderer truth enters grading only afterward. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {scanQNN} from '../../dist/wanda-localizer.js';
import {simulateGrover,recommendIterations,sample} from '../../dist/quantum.js';
const here=path.dirname(fileURLToPath(import.meta.url)),project=path.resolve(here,'../..'),source=path.resolve(process.argv[2]??path.join(project,'../../work/wanda-two-target-browser-composite.png'));
const require=createRequire(import.meta.url);let canvas;
try {canvas=require('@napi-rs/canvas');}catch {canvas=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'));}
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const modelFile=path.join(project,'dist/model/wanda-qnn.json'),model=JSON.parse(fs.readFileSync(modelFile));
assert.equal(sha(modelFile),'d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88');
assert.equal(sha(source),'24c6b496c34847da273a5170654ca360271c08d47cfaa8bb44ff7400d0a80b3f');
const retainedScene=path.join(here,'browser-two-scene.png');
if(path.resolve(source)!==path.resolve(retainedScene))fs.copyFileSync(source,retainedScene);
const image=await canvas.loadImage(source),c=canvas.createCanvas(512,512);assert.equal(image.width,512);assert.equal(image.height,512);c.getContext('2d').drawImage(image,0,0);
const pixels=c.getContext('2d').getImageData(0,0,512,512);for(let i=3;i<pixels.data.length;i+=4)assert.equal(pixels.data[i],255,'browser scorer input is opaque final RGB');
const scan=await scanQNN(pixels,model,{grid:64,targetWidth:15,targetHeight:52,batchSize:4096});
const N=4096,M=scan.marks.length,peak=recommendIterations(N,M),maximum=M&&M<N?2*peak+3:0,trace=simulateGrover(N,scan.marks,maximum),distribution=trace.history[peak].probabilities;
// The experiment grader knows both centers. The website's ordinary placement
// grader knows only its inserted first copy; the embedded copy is background RGB.
const centers=[{x:420.5,y:300},{x:276.5,y:348}],tolerance=scan.geometry.pointTolerance;
const targetIndices=centers.map(center=>scan.candidates.filter(candidate=>Math.hypot(candidate.bestX-center.x,candidate.bestY-center.y)<=tolerance).map(candidate=>candidate.index));
const trueSet=new Set(targetIndices.flat()),marks=new Set(scan.marks),acceptedPoints=scan.marks.map(i=>{const p=scan.candidates[i];return {index:i,x:p.bestX,y:p.bestY,score:p.score,distances:centers.map(center=>Math.hypot(p.bestX-center.x,p.bestY-center.y)),correct:trueSet.has(i)};});
let randomState=2026101107;const rng=()=>{randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;return(randomState>>>0)/4294967296;};
const outcomes=[],counts={},eachTarget=Array(centers.length).fill(0);let unmarked=0,misses=0;
for(let j=0;j<10000;j++){const index=sample(distribution,rng);outcomes.push(index);counts[index]=(counts[index]??0)+1;if(!marks.has(index))unmarked++;if(!trueSet.has(index))misses++;targetIndices.forEach((indices,k)=>{if(indices.includes(index))eachTarget[k]++;});}
assert.equal(Object.values(counts).reduce((s,n)=>s+n,0),10000);
const maxFormulaError=Math.max(...trace.history.map(frame=>Math.abs(frame.successProbability-Math.sin((2*frame.iteration+1)*trace.theta)**2)));
const maxNormError=Math.max(...trace.history.map(frame=>Math.abs(frame.probabilities.reduce((s,p)=>s+p,0)-1)));assert.ok(maxFormulaError<1e-11);assert.ok(maxNormError<1e-11);
fs.writeFileSync(path.join(here,'browser-two-scan.json.gz'),gzipSync(JSON.stringify({...scan,scores:Array.from(scan.scores),windowScores:Array.from(scan.windowScores)})));
fs.writeFileSync(path.join(here,'browser-two-grover-history.json.gz'),gzipSync(JSON.stringify(trace)));
fs.writeFileSync(path.join(here,'browser-two-sampled-addresses.json'),JSON.stringify({seed:2026101107,draws:10000,round:peak,outcomes,counts})+'\n');
const report={recordedAtUtc:new Date().toISOString(),scope:'Engineering experiment on actual Chromium final-RGB PNG exported by the website. Frozen model rescored locally; not a held-out accuracy estimate.',inputSHA256:sha(source),modelSHA256:sha(modelFile),featureSHA256:sha(path.join(project,'dist/wanda-localizer.js')),inferenceInputs:['actual browser final opaque RGB','declared15x52 size','frozen Wanda model'],N,M,peak,maximum,threshold:model.threshold,diagnostics:scan.diagnostics,acceptedPoints,independentGrading:{centers,pointTolerance:tolerance,trueAddressSets:targetIndices,falseAcceptedPoints:acceptedPoints.filter(p=>!p.correct).length,websiteGraderScope:'The ordinary website knows only its inserted first copy at420.5/300. The embedded second is background RGB; the experiment grader independently knows both after scoring.'},probabilities:{accepted:trace.history[peak].successProbability,eitherTrueTarget:[...trueSet].reduce((sum,i)=>sum+distribution[i],0),eachTarget:targetIndices.map(indices=>indices.reduce((sum,i)=>sum+distribution[i],0)),unmarked:distribution.reduce((sum,p,i)=>sum+(marks.has(i)?0:p),0)},samples:{seed:2026101107,draws:10000,counts,eachTarget,unmarked,misses,noPostselection:true},verification:{maxFormulaError,maxNormError},files:{rawScene:'browser-two-scene.png',scan:'browser-two-scan.json.gz',exactHistory:'browser-two-grover-history.json.gz',allSampledAddresses:'browser-two-sampled-addresses.json'}};
fs.writeFileSync(path.join(here,'browser-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
