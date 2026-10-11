/** Independent, predeclared current-QNN scene audit. No fitting or threshold selection.
 * node model/audit-current-qnn.mjs --freeze
 * node model/audit-current-qnn.mjs --evaluate --model ABS_MODEL --output ABS_REPORT
 * Delivered source: add --protocol-dir model/current-qnn/audit-protocol
 * The freeze command does not import the localizer or read candidate model bytes.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {getDepthAnchor,renderBackground,compositeLayeredScene} from '../dist/scene-editor.js';
import {recommendIterations,sample} from '../dist/quantum.js';

const require=createRequire(import.meta.url);
let native;
try{native=require('@napi-rs/canvas');}
catch{native=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'));}
const {createCanvas,loadImage}=native;
const factory=(w,h)=>createCanvas(w,h);
const project=fileURLToPath(new URL('../',import.meta.url));
const dist=path.join(project,'dist'),workspace=path.resolve(project,'../..');
const scratch=path.join(workspace,'work/qnn-current');
export function protocolFiles(directory=scratch){
  const root=path.resolve(directory);
  return{directory:root,protocolPath:path.join(root,'independent-audit-protocol.json'),freezePath:path.join(root,'independent-audit-freeze.json')};
}
const rgba=c=>c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height);
const hashBytes=b=>crypto.createHash('sha256').update(b).digest('hex');
const hashFile=p=>hashBytes(fs.readFileSync(p));
const readJSON=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sceneIDs=['legacy','magic-arena','qualicity-queue'];
const heights=[24,52,80,112],deltas=[-6,-1,0,1,6];
const cleanSeed=0x71A3E2C9,samplingSeed=0xCC05A714;
const tolerance=Math.hypot(8,8)/2+1;
export function seededRandom(seed){let s=seed>>>0;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
export function pointTruth(candidates,center,observable,pointTolerance=tolerance){
  const result=new Set();
  if(observable)for(const c of candidates)if(Math.hypot(c.bestX-center.x,c.bestY-center.y)<=pointTolerance)result.add(c.index);
  return result;
}
export function verifyLearnedMarks(result,threshold,targetWidth,N=4096){
  if(!Array.isArray(result.marks)||result.scores.length!==N||result.candidates.length!==N)throw Error('Invalid detector output shape');
  const unique=new Set(result.marks);if(unique.size!==result.marks.length)throw Error('Duplicate marked address');
  for(let i=0;i<N;i++){
    const c=result.candidates[i],s=result.scores[i];
    if(c.index!==i||!Number.isFinite(s)||s<0||s>1||!Number.isFinite(c.bestX)||!Number.isFinite(c.bestY))throw Error('Malformed learned candidate');
  }
  const radius=Math.max(12,targetWidth*.35),passing=result.candidates.filter(c=>result.scores[c.index]>=threshold).sort((a,b)=>result.scores[b.index]-result.scores[a.index]||a.index-b.index),accepted=[];
  for(const c of passing)if(!accepted.some(a=>Math.hypot(c.bestX-a.bestX,c.bestY-a.bestY)<=radius))accepted.push(c);
  const expected=accepted.map(c=>c.index).sort((a,b)=>a-b);
  if(JSON.stringify(expected)!==JSON.stringify(result.marks))throw Error('Marks do not equal threshold-plus-NMS of learned scores');
  return true;
}
export function idealMass(N,marks,truth){
  const accepted=new Set(marks),M=accepted.size,rounds=recommendIterations(N,M);
  if(!M)return{rounds:0,predicateMass:0,truePointMass:0,abstention:true,distribution:null};
  const theta=Math.asin(Math.sqrt(M/N)),predicateMass=M===N?1:Math.sin((2*rounds+1)*theta)**2;
  const distribution=Float64Array.from({length:N},(_,i)=>M===N?1/N:accepted.has(i)?predicateMass/M:(1-predicateMass)/(N-M));
  return{rounds,predicateMass,truePointMass:[...truth].reduce((s,i)=>s+distribution[i],0),abstention:false,distribution};
}
export function summarize(probes){
  const visible=probes.filter(p=>p.observable),inDomainVisible=probes.filter(p=>p.visibleFraction>=.20);
  return{probes:probes.length,observable:visible.length,belowOrAtVisibilityGate:probes.length-visible.length,
    hits:visible.filter(p=>p.found).length,misses:visible.filter(p=>!p.found).length,
    cleanHits:visible.filter(p=>p.found&&!p.falseMarks).length,
    falseMarks:probes.reduce((s,p)=>s+p.falseMarks,0),falseMarkedScenes:probes.filter(p=>p.falseMarks>0).length,
    abstentions:probes.filter(p=>!p.marks.length).length,
    nearHiddenMarks:probes.filter(p=>!p.observable&&p.marks.length).length,
    visibleAtLeast20Percent:inDomainVisible.length,hitsAtLeast20Percent:inDomainVisible.filter(p=>p.found).length,
    visibleBetween1And20Percent:visible.filter(p=>p.visibleFraction<.20).length,
    hitsBetween1And20Percent:visible.filter(p=>p.visibleFraction<.20&&p.found).length,
    seededCorrect:probes.filter(p=>p.measurement.correct).length,
    seededMiss:probes.filter(p=>p.measurement.index!=null&&!p.measurement.correct).length,
    seededAbstention:probes.filter(p=>p.measurement.index==null).length,
    meanTruePointMass:probes.length?probes.reduce((s,p)=>s+p.quantum.truePointMass,0)/probes.length:0};
}
async function targetSource(){
  const source=await loadImage(path.join(dist,'assets/open-art/openmoji-striped-standing.png'));
  const c=factory(source.width,source.height);c.getContext('2d').drawImage(source,0,0);
  const data=rgba(c).data;let x0=source.width,y0=source.height,x1=0,y1=0;
  for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(data[(y*source.width+x)*4+3]>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);}
  if(x1<=x0||y1<=y0)throw Error('Empty target source');
  const trimmed=factory(x1-x0,y1-y0);trimmed.getContext('2d').drawImage(c,x0,y0,x1-x0,y1-y0,0,0,trimmed.width,trimmed.height);
  return{canvas:trimmed,sourceDimensions:{width:source.width,height:source.height},trim:{x:x0,y:y0,width:x1-x0,height:y1-y0}};
}
async function proposedProtocol(){
  const catalog=readJSON(path.join(dist,'scene-catalog.json')),presets=readJSON(path.join(dist,'depth-band-presets.json'));
  const target=await targetSource(),assets=new Map(),cases=[],defaultChecks=[];
  const pin=relative=>assets.set(relative,{path:relative,sha256:hashFile(path.join(dist,relative))});
  ['scene-catalog.json','depth-band-presets.json','scene-editor.js','quantum.js','assets/open-art/openmoji-striped-standing.png'].forEach(pin);
  for(const [si,id]of sceneIDs.entries()){
    const entry=catalog.scenes.find(s=>s.id===id),preset=presets.backgrounds[id];if(!entry||!preset)throw Error('Missing declared scene '+id);
    pin(entry.src);pin(preset.registration);const record=readJSON(path.join(dist,preset.registration));
    for(const b of preset.layers){pin(b.cutoutPNG);pin(b.maskPNG);}
    for(const height of heights){
      const width=Math.max(1,Math.round(height*target.trim.width/target.trim.height));
      const add=(kind,cx,cy,extra={})=>{const rect={x:Math.round(cx-width/2),y:Math.round(cy-height/2),width,height};cases.push({id:id+'-h'+height+'-'+String(cases.length+1).padStart(4,'0'),scene:id,height,width,kind,rect,...extra});};
      add('clean-default-coordinate',280,350,{bands:false});
      const random=seededRandom((cleanSeed^Math.imul(si+1,0x9E3779B9)^height)>>>0);
      for(let k=0;k<24;k++)add('clean-seeded',width/2+8+random()*(512-width-16),height/2+8+random()*(512-height-16),{bands:false,seededCase:k});
      for(const band of preset.layers){
        const member=record.objects.find(o=>band.memberIDs.includes(o.id)&&o.depthAnchorY===band.depthAnchorY);
        if(!member)throw Error('No maximum-bottom member '+band.id);
        const cx=Math.max(width/2,Math.min(512-width/2,member.bounds.x+member.bounds.width/2));
        for(const delta of deltas)add('band-crossing',cx,band.depthAnchorY+delta-height/2,{bands:true,band:band.id,anchorMember:member.id,footDelta:delta});
      }
    }
    const height=52,width=Math.max(1,Math.round(height*target.trim.width/target.trim.height));
    defaultChecks.push({id:id+'-default-banded',scene:id,height,width,kind:'default-banded-contract',bands:true,rect:{x:Math.round(280-width/2),y:Math.round(350-height/2),width,height}});
  }
  if(cases.length!==840)throw Error('Declared 840-case count changed: '+cases.length);
  const empty=sceneIDs.flatMap(scene=>heights.map(height=>({id:scene+'-empty-h'+height,scene,height,width:Math.max(1,Math.round(height*target.trim.width/target.trim.height)),bands:true,present:false})));
  return{version:1,kind:'predeclared independent engineering audit, not independent artwork identities',sceneIDs,heights,grid:64,N:4096,pointTolerance:tolerance,
    visibility:{observableAlphaMassStrictlyGreaterThan:.01,trainingPositiveVisibilityAtLeast:.20,alphaMassDenominator:'clipped rendered target canvas, matching app evaluation',alphaThresholdForDepth:32},
    cleanSeed,samplingSeed,cleanCasesPerSceneSize:25,bandFootDeltas:deltas,allowAndReportEdgeClipping:true,
    targetSource:target.sourceDimensions,targetTrimAlphaStrictlyGreaterThan:16,targetTrim:target.trim,
    rendering:'Shared current scene-editor; native @napi-rs/canvas. Integer target top-left; automatic lower-bottom-in-front, foreground-front ties. Clean cases disable all bands.',
    inferenceInputs:['final composite RGBA','frozen saved QNN model','declared rendered target width/height','fixed search grid'],
    prohibitedInferenceInputs:['target placement','truth/visibility alpha','depth metadata','clean-background pixels','target-template pixels','template matches or accepted template gate'],
    outcomes:{hit:'observable target and >=1 accepted fixed address center within tolerance',falseMark:'accepted address outside truth-center tolerance, or any accepted address when not observable',cleanHit:'hit with zero false marks',abstention:'zero accepted addresses',measurement:'one seeded exact first-peak Born draw; M=0 abstains'},
    cases,empty,defaultChecks,additionalContracts:['Malformed image data rejected','Nonpositive/missing scan geometry rejected','Changing extraneous placement/truth options cannot alter scores','Unsupported uploaded target selects explicit comparator with notice in app; not evaluated as in-domain QNN recall'],
    uniqueGeometryCount:new Set(cases.map(c=>JSON.stringify([c.scene,c.rect,c.bands]))).size,
    assets:[...assets.values()].sort((a,b)=>a.path.localeCompare(b.path)),
    limits:'Held-out deterministic placements of the same supplied striped PNG on the same three scene identities. No fresh-identity or general-person-recognition claim. Native raster results need independent browser replay. No fitting or threshold selection based on this audit.'};
}
export async function freezeProtocol(protocolDirectory=scratch){
  const{directory,protocolPath,freezePath}=protocolFiles(protocolDirectory);
  if(fs.existsSync(protocolPath)||fs.existsSync(freezePath))throw Error('Audit freeze already exists; do not overwrite it.');
  const protocol=await proposedProtocol(),bytes=JSON.stringify(protocol,null,2)+'\n';fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(protocolPath,bytes);
  const manifest={protocol:path.relative(workspace,protocolPath),protocolSHA256:hashBytes(bytes),harnessSHA256:hashFile(fileURLToPath(import.meta.url)),frozenAtUtc:new Date().toISOString(),candidateModelRead:false,modelScoresRead:false};
  fs.writeFileSync(freezePath,JSON.stringify(manifest,null,2)+'\n');return manifest;
}
export async function verifyProtocol(protocolDirectory=scratch){
  const{protocolPath,freezePath}=protocolFiles(protocolDirectory);
  const freeze=readJSON(freezePath),protocol=readJSON(protocolPath);
  if(hashFile(protocolPath)!==freeze.protocolSHA256)throw Error('Protocol bytes changed after freeze');
  for(const a of protocol.assets)if(hashFile(path.join(dist,a.path))!==a.sha256)throw Error('Pinned audit asset/renderer changed: '+a.path);
  if(JSON.stringify(await proposedProtocol())!==JSON.stringify(protocol))throw Error('Protocol reconstruction differs');
  return{freeze,protocol};
}
async function loadScene(id,protocol){
  const entry=readJSON(path.join(dist,'scene-catalog.json')).scenes.find(s=>s.id===id),preset=readJSON(path.join(dist,'depth-band-presets.json')).backgrounds[id];
  const background=renderBackground(await loadImage(path.join(dist,entry.src)),{canvasFactory:factory}),layers=[];
  for(const b of preset.layers){const foregroundCanvas=factory(512,512),maskCanvas=factory(512,512);foregroundCanvas.getContext('2d').drawImage(await loadImage(path.join(dist,b.cutoutPNG)),0,0);maskCanvas.getContext('2d').drawImage(await loadImage(path.join(dist,b.maskPNG)),0,0);layers.push({...b,foregroundCanvas,maskCanvas});}
  return{background,layers};
}
export async function evaluate(modelPath,output,{protocolDirectory=scratch}={}){
  const{freeze,protocol}=await verifyProtocol(protocolDirectory);
  const modulePath=path.join(dist,'qnn-localizer.js');if(!fs.existsSync(modulePath))throw Error('Stable localizer not yet available');
  const {scanQNN}=await import(pathToFileURL(modulePath));
  if(typeof scanQNN!=='function')throw Error('Expected stable scanQNN API');
  const model=readJSON(modelPath),threshold=model.threshold;if(!Number.isFinite(threshold))throw Error('Frozen model threshold missing');
  const modelHash=hashFile(modelPath),source=await targetSource(),targets=new Map();
  for(const height of heights){const width=Math.round(height*source.canvas.width/source.canvas.height),c=factory(width,height);c.getContext('2d').drawImage(source.canvas,0,0,width,height);targets.set(height,c);}
  const scenes=new Map();for(const id of sceneIDs)scenes.set(id,await loadScene(id,protocol));
  const report={version:1,startedAtUtc:new Date().toISOString(),protocolSHA256:freeze.protocolSHA256,protocolFrozenAtUtc:freeze.frozenAtUtc,modelSHA256:modelHash,modelPath:path.relative(workspace,modelPath),threshold,localizerSHA256:hashFile(modulePath),harnessSHA256:hashFile(fileURLToPath(import.meta.url)),scope:'Independent predefined same-art engineering probes, including known defaults. Audit positions are not restricted to the training protocol\'s held-out coordinate partition. No fresh-identity or general-person-recognition claim; native raster evidence needs separate browser replay. No fitting or threshold selection based on this audit.',originalProtocolScope:protocol.limits,probes:[],empty:[],defaultChecks:[],contracts:{},inferenceInputs:protocol.inferenceInputs};
  const random=seededRandom(protocol.samplingSeed);
  async function scoreCase(c){
    const scene=scenes.get(c.scene),target=c.present===false?null:targets.get(c.height);
    const frame=compositeLayeredScene({backgroundCanvas:scene.background,target,targetRect:c.rect??null,foregroundLayers:c.bands?scene.layers:[],targetDepthMode:'auto',depthConvention:'front-when-lower',depthTieBreak:'foreground-front',canvasFactory:factory});
    const input=rgba(frame.canvas),inputHash=hashBytes(input.data);
    // No rendering/evaluation metadata or source/template/background pixels enter this call.
    const result=await scanQNN(input,model,{grid:protocol.grid,targetWidth:c.width,targetHeight:c.height,threshold});
    verifyLearnedMarks(result,threshold,c.width,protocol.N);
    const center=c.rect?{x:c.rect.x+c.width/2,y:c.rect.y+c.height/2}:null;
    const full=rgba(frame.targetCanvas).data;let total=0,remaining=0;for(let i=3;i<full.length;i+=4){total+=full[i];remaining+=frame.visibleTarget.data[i];}
    const visibleFraction=total?remaining/total:0,observable=c.present!==false&&visibleFraction>.01;
    const truth=center?pointTruth(result.candidates,center,observable,protocol.pointTolerance):new Set();
    const points=result.marks.map(i=>({...result.candidates[i],error:center?Math.hypot(result.candidates[i].bestX-center.x,result.candidates[i].bestY-center.y):null,correct:truth.has(i)}));
    const quantum=idealMass(protocol.N,result.marks,truth),index=quantum.distribution?sample(quantum.distribution,random):null;
    const summary={...c,inputRGBA_SHA256:inputHash,visibleFraction,observable,clipped:c.rect?c.rect.x<0||c.rect.y<0||c.rect.x+c.width>512||c.rect.y+c.height>512:false,center,
      marks:result.marks,points,found:points.some(p=>p.correct),falseMarks:points.filter(p=>!p.correct).length,
      maxScore:Math.max(...result.scores),diagnostics:result.diagnostics,quantum:{rounds:quantum.rounds,predicateMass:quantum.predicateMass,truePointMass:quantum.truePointMass,abstention:quantum.abstention},
      measurement:{index,correct:index!=null&&truth.has(index),outcome:index==null?'abstention':truth.has(index)?'hit':'miss'}};
    return{summary,input,result};
  }
  for(const [i,c]of protocol.cases.entries()){report.probes.push((await scoreCase(c)).summary);if((i+1)%30===0)console.log(JSON.stringify({completed:i+1,total:protocol.cases.length,summary:summarize(report.probes)}));}
  for(const c of protocol.empty){const {summary}=await scoreCase(c);report.empty.push(summary);}
  for(const c of protocol.defaultChecks)report.defaultChecks.push((await scoreCase(c)).summary);
  const reference=await scoreCase(protocol.defaultChecks[0]);
  const misleading=await scanQNN(reference.input,model,{grid:64,targetWidth:protocol.defaultChecks[0].width,targetHeight:52,threshold,targetCenter:{x:-999,y:999},visibleTargetAlpha:new Uint8Array(1),templateMatches:{marks:[0]},backgroundImageData:{invalid:true}});
  report.contracts.extraneousForbiddenMetadataIgnored=JSON.stringify(reference.result.scores)===JSON.stringify(misleading.scores)&&JSON.stringify(reference.result.marks)===JSON.stringify(misleading.marks);
  report.contracts.invalidImageRejected=false;try{await scanQNN({width:512,height:512,data:new Uint8ClampedArray(4)},model,{grid:64,targetWidth:20,targetHeight:52});}catch{report.contracts.invalidImageRejected=true;}
  report.contracts.invalidGeometryRejected=false;try{await scanQNN(reference.input,model,{grid:64,targetWidth:0,targetHeight:52});}catch{report.contracts.invalidGeometryRejected=true;}
  report.contracts.unsupportedUploadAppReview='Pending separate UI/source review; no assertion that an arbitrary uploaded target is recognized by the trained class.';
  report.summary=summarize(report.probes);report.byScene=Object.fromEntries(sceneIDs.map(id=>[id,summarize(report.probes.filter(p=>p.scene===id))]));
  report.bySize=Object.fromEntries(heights.map(h=>[h,summarize(report.probes.filter(p=>p.height===h))]));
  report.byKind=Object.fromEntries(['clean-default-coordinate','clean-seeded','band-crossing'].map(k=>[k,summarize(report.probes.filter(p=>p.kind===k))]));
  report.emptySummary={cases:report.empty.length,falseMarkedScenes:report.empty.filter(p=>p.marks.length).length,falseMarks:report.empty.reduce((s,p)=>s+p.marks.length,0),abstentions:report.empty.filter(p=>!p.marks.length).length};
  if(hashFile(modelPath)!==modelHash)throw Error('Model changed during audit');await verifyProtocol(protocolDirectory);report.completedAtUtc=new Date().toISOString();
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),value=key=>{const i=args.indexOf(key);return i<0?null:args[i+1];};
  const protocolDirectory=value('--protocol-dir')?path.resolve(value('--protocol-dir')):scratch;
  if(args.includes('--freeze'))console.log(JSON.stringify(await freezeProtocol(protocolDirectory),null,2));
  else if(args.includes('--verify-protocol'))console.log(JSON.stringify((await verifyProtocol(protocolDirectory)).freeze,null,2));
  else if(args.includes('--evaluate')){const model=value('--model'),output=value('--output');if(!model||!output)throw Error('--evaluate requires --model and --output');const r=await evaluate(path.resolve(model),path.resolve(output),{protocolDirectory});console.log(JSON.stringify({summary:r.summary,empty:r.emptySummary,contracts:r.contracts,output},null,2));}
  else throw Error('Use --freeze, --verify-protocol, or --evaluate --model PATH --output PATH; optional --protocol-dir DIRECTORY');
}
