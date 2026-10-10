import { createUniformState, probabilities, simulateGrover, recommendIterations, sample, bitstring } from './quantum.js';
import * as qnn from './qnn.js';
import { regionsFromAlpha } from './ground-truth.js';
const { extractFeatures, predict } = qnn;

const $ = id => document.getElementById(id);
const canvas = $('scene'), ctx = canvas.getContext('2d', { willReadFrequently: true });
const raster = document.createElement('canvas'); raster.width = raster.height = 512;
const rasterCtx = raster.getContext('2d', { willReadFrequently: true });
rasterCtx.imageSmoothingEnabled=true;rasterCtx.imageSmoothingQuality='high';
const patch = document.createElement('canvas'); patch.width = patch.height = 64;
const patchCtx = patch.getContext('2d', { willReadFrequently: true });
patchCtx.imageSmoothingEnabled=true;patchCtx.imageSmoothingQuality='high';
let grid = 8, bus = { x: 288, y: 224 }, model, metrics, sprite, demoSprite, customSprite = false, hasBus = true;
let sceneMode='illustrated', streetPhoto=null, realSprite=null, syntheticModel=null, photoModel=null, customBackground=null;
let defaultStreet=null, emeryvilleStreet=null, photoSetting='covington';
let distractors = [], scores = [], marked = [], state = null, measured = null;
let running = false, modelReady = false, dirty = true, revision = 0, runRevision = 0, manualRounds = false;
let pointerDown = false, dragChanged = false;
const assets = new Map();
const baselines = new Map();
const formatPercent = n => `${(100 * n).toFixed(2)}%`;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const motionDelay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160;
const image = src => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });

function sceneSize() { return 512 / grid; }
function busRect() {
  const width = sceneSize() * .82;
  const ratio = sprite ? sprite.height / sprite.width : .62;
  const height = Math.min(width * ratio, sceneSize() * .84);
  return { x: bus.x - width / 2, y: bus.y - height / 2, width, height };
}
function renderRaster() {
  rasterCtx.fillStyle = '#d7e1e8'; rasterCtx.fillRect(0, 0, 512, 512);
  const background=customBackground??(sceneMode==='photo'?streetPhoto:null);
  if(background){const side=Math.min(background.width,background.height);rasterCtx.drawImage(background,(background.width-side)/2,(background.height-side)/2,side,side,0,0,512,512);}
  // Background geometry remains distinct from the user-controlled object.
  rasterCtx.lineWidth = 1; rasterCtx.strokeStyle = '#c7d3dd';
  if(!background)for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) {
    const s = sceneSize();
    rasterCtx.strokeRect(x * s + s * .09, y * s + s * .09, s * .82, s * .82);
  }
  if(!background)for (const d of distractors) {
    const s = sceneSize(), px = (d.col + .5) * s, py = (d.row + .5) * s;
    const img = assets.get(d.kind);
    if (img) {
      const width = s * .72, height = width * img.height / img.width;
      rasterCtx.drawImage(img, px - width / 2, py - height / 2, width, height);
    } else {
      rasterCtx.fillStyle = d.color;
      rasterCtx.fillRect(px - s * .24, py - s * .12, s * .48, s * .24);
      rasterCtx.fillStyle = '#33445a';
      rasterCtx.fillRect(px - s * .1, py - s * .15, s * .22, s * .08);
      for (const dx of [-.16, .16]) { rasterCtx.beginPath(); rasterCtx.arc(px + s * dx, py + s * .13, s * .055, 0, Math.PI * 2); rasterCtx.fill(); }
    }
  }
  if (sprite && hasBus) { const r = busRect(); rasterCtx.drawImage(sprite, r.x, r.y, r.width, r.height); }
}
function renderScene() {
  renderRaster(); ctx.drawImage(raster, 0, 0);
  const s = sceneSize();
  if ($('heatmap').checked && scores.length) {
    scores.forEach((p, i) => { ctx.fillStyle = `rgba(223,153,14,${p * .45})`; ctx.fillRect((i % grid) * s, Math.floor(i / grid) * s, s, s); });
  }
  ctx.lineWidth = 1; ctx.strokeStyle = sceneMode==='photo'?'#ffffff80':'#667c8f40';
  for (let k = 1; k < grid; k++) { ctx.beginPath(); ctx.moveTo(k*s,0); ctx.lineTo(k*s,512); ctx.moveTo(0,k*s); ctx.lineTo(512,k*s); ctx.stroke(); }
  ctx.font = `${grid === 8 ? 9 : 12}px Consolas, monospace`; ctx.textBaseline = 'top';
  for (let i = 0; i < grid * grid; i++) { const x=(i%grid)*s+5,y=Math.floor(i/grid)*s+5;if(backgroundForLabels()){ctx.fillStyle='#101b2caa';ctx.fillRect(x-2,y-1,18,13);}ctx.fillStyle = backgroundForLabels()?'#edf3fc':'#5f7181';ctx.fillText(String(i).padStart(2,'0'),x,y); }
  for (const i of marked) { ctx.strokeStyle = '#c68d0d'; ctx.lineWidth = 2; ctx.strokeRect((i % grid)*s+2,Math.floor(i/grid)*s+2,s-4,s-4); }
  if (measured !== null) {
    const x=(measured%grid)*s,y=Math.floor(measured/grid)*s;
    ctx.fillStyle = '#101b2c1c'; ctx.fillRect(x,y,s,s);
    ctx.strokeStyle = '#101b2c'; ctx.lineWidth = 4; ctx.strokeRect(x+4,y+4,s-8,s-8);
    ctx.fillStyle = '#101b2c'; ctx.fillRect(x+s-25,y+5,20,17);
    ctx.fillStyle = '#ffd45e'; ctx.font = 'bold 12px Segoe UI'; ctx.fillText(marked.includes(measured)?'✓':'?',x+s-20,y+5);
  }
}
function backgroundForLabels(){return customBackground||sceneMode==='photo';}
function photoContext() {
  $('street-picker').hidden=sceneMode!=='photo';
  $('photo-background').value=customBackground?'custom':photoSetting;
  const unseen=photoSetting==='emeryville';
  $('unseen-report').hidden=sceneMode!=='photo'||!unseen||!!customBackground;
  if(customBackground){$('street-attribution').removeAttribute('href');$('street-attribution').textContent='Your uploaded background · local only';}
  else{$('street-attribution').href=unseen?'https://commons.wikimedia.org/wiki/File:Main_Street_(1766449963).jpg':'https://commons.wikimedia.org/wiki/File:Covington,_Va_-_Main_Street.jpg';$('street-attribution').textContent=unseen?'Payton Chung / CC BY 2.0':'Jarek Tuszyński / CC BY-SA 3.0';}
  if(customSprite){$('bus-attribution').removeAttribute('href');$('bus-attribution').textContent='Your uploaded bus · local only';}
  else{$('bus-attribution').href='https://commons.wikimedia.org/wiki/File:Blue_Bird_A3FE_school_bus_Tacoma.jpg';$('bus-attribution').textContent='SupportPDX / CC BY 2.0';}
  $('bus-edit-note').hidden=customSprite;
  $('bus-token-image').hidden=customSprite;$('bus-token').lastElementChild.textContent=customSprite?'Drag your uploaded bus into the scene':'Drag this bus into the scene';
  if(customBackground||customSprite)$('scene-footnote').textContent='Your images stay in this browser. The model was trained on the supplied demo assets; recognition of uploads is experimental.';
  else if(sceneMode==='photo')$('scene-footnote').textContent=unseen?'Unseen street stress test: this frozen model mistakes some building details for buses. Remove the bus to inspect false positives; Grover amplifies the model’s accepted regions.':'A photographed bus, AI-assisted cutout, and real street photo. The model is tested on composites using these assets.';
}
function chooseStreet(setting) {
  const selected=setting==='emeryville'?emeryvilleStreet:defaultStreet;
  if(sceneMode!=='photo'||!selected)return;
  photoSetting=setting;streetPhoto=selected;customBackground=null;$('upload-street').value='';photoContext();invalidate();
  if(setting==='emeryville')setResult('Unseen street loaded. The same frozen model can mistake buildings for buses. Inspect its heatmap and compare target probability after measurement.','warning');
}
function modelReport() {
  const accuracy=model.metrics?.test?.accuracy;
  $('model-accuracy').textContent=Number.isFinite(accuracy)?`${(accuracy*100).toFixed(1)}%`:'see report';
  $('model-samples').textContent=model.metrics?.train?.n??'see report';$('model-parameters').textContent=model.parameterCount??'see weights';
  $('model-domain').textContent=sceneMode==='photo'?'PHOTO COMPOSITES':'SYNTHETIC DATA';
  $('model-details').textContent=sceneMode==='photo'?'Trained on a real photographed bus cutout composited into street-photo crops. The test uses held-out placements of the same asset; it does not test unseen buses or independent real photographs.':'Four-qubit circuit, four layers, eight engineered pixel features. Test patches use independent synthetic random seeds. This does not measure real-photo detection.';
  $('weights-download').href=sceneMode==='photo'?'model/model-photo.json':'model/model-synthetic.json';
  $('metrics-download').href=sceneMode==='photo'?'model/photo-metrics.json':'model/metrics.json';
  renderBaselineReport();
}
function renderBaselineReport() {
  const baseline=baselines.get(sceneMode),table=$('baseline-table');table.replaceChildren();
  $('baseline-domain').textContent=sceneMode==='photo'?'Photo-composite comparison · same 8 pixel features':'Illustrated-domain comparison · same 8 pixel features';
  $('baseline-download').href=sceneMode==='photo'?'model/photo_baseline_metrics.json':'model/baseline_metrics.json';
  if(!baseline){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=3;cell.textContent='Comparison report unavailable.';row.append(cell);table.append(row);return;}
  const q=model.metrics.test,b=baseline.splits.test;
  for(const [name,m]of[[`QNN · ${model.parameterCount} slots`,q],[`Logistic · ${baseline.parameter_count??9} parameters`,b]]){
    const row=document.createElement('tr');for(const value of[name,formatPercent(m.accuracy),formatPercent(m.recall)]){const td=document.createElement('td');td.textContent=value;row.append(td);}table.append(row);
  }
  $('baseline-note').textContent=`${b.accuracy>q.accuracy?'Logistic scores higher on this test.':'The QNN scores higher on this test.'} Same seeded patches, different model families and parameter counts. These results do not establish quantum superiority or an end-to-end search speedup.`;
}
function chooseScene(mode) {
  if(mode==='photo'&&(!photoModel||!streetPhoto||!realSprite))return;
  sceneMode=mode;customBackground=null;customSprite=false;hasBus=true;sprite=mode==='photo'?realSprite:demoSprite;model=mode==='photo'?photoModel:syntheticModel;
  $('upload').value='';$('upload-street').value='';
  const t=model.threshold;$('threshold').value=t;$('threshold-value').textContent=Number(t).toFixed(2);
  $('bus-token-image').src=mode==='photo'?'assets/real-schoolbus.png':'assets/bus.png';
  $('scene-photo').setAttribute('aria-pressed',String(mode==='photo'));$('scene-illustrated').setAttribute('aria-pressed',String(mode==='illustrated'));
  $('photo-credit').hidden=mode!=='photo';$('snap').checked=mode!=='photo';$('toggle-bus').textContent='Remove bus';
  $('scene-footnote').textContent=mode==='photo'?'A photographed bus, AI-assisted cutout, and real street photo. The model is tested on composites using these assets.':'Original synthetic bus artwork. Uploads stay in your browser.';
  photoContext();
  if(mode==='photo'){grid=4;$('grid-size').value='4';bus={x:192,y:448};}else{grid=8;$('grid-size').value='8';bus={x:288,y:224};}
  $('grid-label').textContent=`${grid*grid} regions / ${Math.log2(grid*grid)} qubits`;manualRounds=false;createDistractors();modelReport();invalidate();
}
function createDistractors() {
  distractors = [];
  const used = new Set();
  const kinds = ['car.png','truck.png','van.png'];
  for(let n=0;n<Math.min(11,grid*grid/3);n++) {
    const idx = Math.floor(Math.random()*grid*grid); if(used.has(idx)) continue; used.add(idx);
    distractors.push({col:idx%grid,row:Math.floor(idx/grid),kind:kinds[n%kinds.length],color:['#dd8665','#7c9aae','#aaa79a'][n%3]});
  }
}
function renderBars(distribution = probabilities(createUniformState(grid*grid))) {
  const max = Math.max(...distribution, .001), markSet = new Set(marked);
  const fragment = document.createDocumentFragment();
  distribution.forEach((p, i) => {
    const bar = document.createElement('div');
    bar.className = `prob-bar${markSet.has(i) ? ' marked' : ''}${measured===i?' measured':''}`;
    bar.style.height = `${Math.max(2,100*p/max)}%`;
    bar.title = `Region ${i}: ${formatPercent(p)}${markSet.has(i)?' (QNN marked)':''}`;
    fragment.append(bar);
  });
  $('probability-bars').replaceChildren(fragment);
  $('first-bitstring').textContent=bitstring(0, Math.log2(grid*grid));
  $('last-bitstring').textContent=bitstring(grid*grid-1, Math.log2(grid*grid));
  $('probability-scale').textContent=`Autoscaled · peak ${formatPercent(Math.max(...distribution))}`;
}
function renderCurve() {
  const c=$('trajectory'),g=c.getContext('2d'),w=c.width,h=c.height;
  g.clearRect(0,0,w,h);g.strokeStyle='#46556b';g.lineWidth=1;
  for(const y of [10,50,90]){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
  if(!scores.length){$('curve-caption').textContent='Build an oracle to see the curve';return;}
  const history=simulateGrover(grid*grid,marked,12).history;
  g.strokeStyle='#75d4c6';g.lineWidth=2;g.beginPath();
  history.forEach((s,k)=>{const x=k*w/12,y=90-s.successProbability*80;k?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();
  const k=Number($('iterations').value),y=90-history[k].successProbability*80,x=k*w/12;
  g.strokeStyle='#ffd45e88';g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();
  g.fillStyle='#ffd45e';g.beginPath();g.arc(x,y,4,0,2*Math.PI);g.fill();
  $('curve-caption').textContent=`${formatPercent(history[k].successProbability)} at k=${k}`;
}
function renderTable() {
  const fragment = document.createDocumentFragment();
  const markSet = new Set(marked);
  scores.forEach((p,i) => {
    const row = document.createElement('tr'); if(markSet.has(i)) row.className='is-marked';
    const values = [`${String(i).padStart(2,'0')} / ${bitstring(i,Math.log2(grid*grid))}`,p.toFixed(4),markSet.has(i)?'yes':'—',state?state.amplitudes[i].toFixed(4):'—',state?formatPercent(state.probabilities[i]):'—'];
    for(const value of values){ const cell=document.createElement('td');cell.textContent=value;row.append(cell); }fragment.append(row);
  });
  $('scores-table').replaceChildren(fragment);
}
function setPhase(number,title,description) { $('step-count').textContent=String(number).padStart(2,'0');$('phase-title').textContent=title;$('phase-description').textContent=description; }
function setResult(text, type='') {
  $('result').textContent=text; $('result').className=`result-message ${type}`;
  $('scene-result').textContent=text; $('scene-result').className=`scene-result ${type}`;
}
function setRunControls(label) {
  for(const id of ['run','run-scene']) {
    const button=$(id);button.disabled=running||!modelReady;
    button.firstElementChild.textContent=label??(running?'Searching…':modelReady?'Solve CAPTCHA':'Loading trained model…');
  }
}
function evaluateTargetRegions() {
  if(!hasBus||!sprite)return new Set();
  const mask=document.createElement('canvas');mask.width=mask.height=512;
  const maskCtx=mask.getContext('2d',{willReadFrequently:true}),r=busRect();
  maskCtx.drawImage(sprite,r.x,r.y,r.width,r.height);
  return regionsFromAlpha(maskCtx.getImageData(0,0,512,512),grid);
}
function invalidate() {
  revision++;dirty=true;state=null;measured=null;scores=[];marked=[];
  $('measure').disabled=true;$('marked-count').textContent='—';$('success-prob').textContent='—';$('round-count').textContent='—';
  $('distribution-label').textContent='Uniform state';setPhase(0,'Ready to find the bus','The model reads pixels. You control the scene.');
  $('target-probability').textContent='Bus overlap is checked after measurement.';
  if(model) setResult('Scene changed. Run the model to build a fresh oracle.');
  renderScene();renderBars();renderTable();renderCurve();
}
function classify() {
  renderRaster(); const s=sceneSize(); scores=[];
  // This path only receives pixels. It never reads the bus position or placement labels.
  for(let row=0;row<grid;row++) for(let col=0;col<grid;col++) {
    patchCtx.clearRect(0,0,64,64);patchCtx.drawImage(raster,col*s,row*s,s,s,0,0,64,64);
    const extractor=sceneMode==='photo'?(qnn.extractPhotoFeatures??extractFeatures):extractFeatures;
    scores.push(predict(extractor(patchCtx.getImageData(0,0,64,64)),model));
  }
  dirty=false; updateMarks();
}
function updateMarks() {
  const threshold=Number($('threshold').value);marked=scores.flatMap((p,i)=>p>=threshold?[i]:[]);
  $('marked-count').textContent=String(marked.length);
  const optimal=recommendIterations(grid*grid,marked.length);
  if(!manualRounds){$('iterations').value=optimal;$('iteration-value').textContent=optimal;}
  $('round-caption').textContent=`recommended: ${optimal}`;
  $('oracle-caption').textContent=`score ≥ ${threshold.toFixed(2)}`;
  renderScene();renderTable();renderCurve();
}
function showState(snapshot) {
  state=snapshot;$('success-prob').textContent=formatPercent(snapshot.successProbability);$('round-count').textContent=snapshot.iteration;
  $('target-probability').textContent='Bus overlap is checked after measurement.';
  $('distribution-label').textContent=`after ${snapshot.iteration} round${snapshot.iteration===1?'':'s'}`;
  $('prob-caption').textContent='in QNN marked set';renderBars(snapshot.probabilities);renderTable();
}
function measure() {
  if(!state||!marked.length)return;
  measured=sample(state.probabilities);
  const isMarked=marked.includes(measured),row=Math.floor(measured/grid)+1,col=measured%grid+1;
  // Ground truth is used only for this post-measurement evaluation, never the oracle.
  const targetRegions=evaluateTargetRegions(),overlapsBus=targetRegions.has(measured);
  const targetMass=[...targetRegions].reduce((sum,i)=>sum+state.probabilities[i],0);
  $('target-probability').textContent=`True-target probability: ${formatPercent(targetMass)} · evaluated after measurement`;
  setPhase(4,`Measured region ${String(measured).padStart(2,'0')}`,`|${bitstring(measured,Math.log2(grid*grid))}⟩ · row ${row}, column ${col}`);
  if(isMarked&&overlapsBus) setResult(`Measured a marked region overlapping the placed bus. QNN score: ${scores[measured].toFixed(3)}. Measurement is probabilistic.`, 'success');
  else if(isMarked) setResult(`Measured a QNN marked region that does not overlap the bus. This is a detector false positive; Grover faithfully amplified it.`, 'warning');
  else setResult(`Measured an unmarked region. This can happen because the amplified distribution still has probability outside the marked set.`, 'warning');
  $('measure').disabled=false;renderScene();renderBars(state.probabilities);
}
async function run() {
  if(running||!modelReady)return;running=true;runRevision=revision;measured=null;setRunControls();$('measure').disabled=true;
  try {
    setPhase(1,'The QNN reads each patch','Angle encoding → trainable gates → measured expectations.');
    setResult(`Evaluating ${grid*grid} image patches with the trained four-qubit circuit…`);
    await sleep(motionDelay);
    if(runRevision!==revision)return;
    if(dirty)classify();else updateMarks();
    if(!marked.length){
      showState(simulateGrover(grid*grid,[],0).history[0]);setPhase(1,'No bus regions marked','Every patch scored below the decision threshold.');
      $('target-probability').textContent='Empty oracle · no measurement.';
      setResult('The model did not recognize a bus at this threshold. Try a centered placement, inspect the heatmap, or lower the threshold. No answer has been forced.', 'warning');return;
    }
    const k=Number($('iterations').value),sim=simulateGrover(grid*grid,marked,k);
    setPhase(2,'The learned oracle is ready',`${marked.length} of ${grid*grid} states will have their phase flipped.`);
    showState(sim.history[0]);await sleep(motionDelay*2);
    for(const snapshot of sim.history.slice(1)) {
      if(runRevision!==revision)return;
      setPhase(3,`Amplification round ${snapshot.iteration} / ${k}`,'Flip the marked signs, then reflect every amplitude about the mean.');
      showState(snapshot);await sleep(motionDelay);
    }
    if(runRevision!==revision)return;
    measure();
  } catch(error) { console.error(error);setResult(`Simulation error: ${error.message}`,'warning'); }
  finally {running=false;setRunControls();}
}
function positionAt(event) {
  hasBus=true;$('toggle-bus').textContent='Remove bus';
  const bounds=canvas.getBoundingClientRect(),s=sceneSize();
  let x=(event.clientX-bounds.left)/bounds.width*512,y=(event.clientY-bounds.top)/bounds.height*512;
  if($('snap').checked){x=(Math.floor(x/s)+.5)*s;y=(Math.floor(y/s)+.5)*s;}
  const r=busRect();bus.x=Math.max(r.width/2,Math.min(512-r.width/2,x));bus.y=Math.max(r.height/2,Math.min(512-r.height/2,y));
  invalidate();$('canvas-hint').textContent='Run the search to inspect this placement';
}
canvas.addEventListener('pointerdown',event=>{pointerDown=true;dragChanged=false;canvas.setPointerCapture(event.pointerId);positionAt(event);});
canvas.addEventListener('pointermove',event=>{if(pointerDown){dragChanged=true;positionAt(event);}});
canvas.addEventListener('pointerup',()=>{pointerDown=false;});
canvas.addEventListener('pointercancel',()=>{pointerDown=false;});
canvas.addEventListener('dragover',event=>{event.preventDefault();event.dataTransfer.dropEffect='copy';});
canvas.addEventListener('drop',event=>{event.preventDefault();positionAt(event);});
$('bus-token').addEventListener('dragstart',event=>{event.dataTransfer.setData('text/plain','quantum-captcha-bus');event.dataTransfer.effectAllowed='copy';});
$('bus-token').addEventListener('click',()=>{hasBus=true;invalidate();canvas.focus();});
$('scene-photo').addEventListener('click',()=>chooseScene('photo'));$('scene-illustrated').addEventListener('click',()=>chooseScene('illustrated'));
$('photo-background').addEventListener('change',event=>chooseStreet(event.target.value));
canvas.addEventListener('keydown',event=>{
  if(event.key==='Enter'){event.preventDefault();run();return;}
  const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
  if(!delta)return;event.preventDefault();const step=$('snap').checked?sceneSize():8,r=busRect();
  bus.x=Math.max(r.width/2,Math.min(512-r.width/2,bus.x+delta[0]*step));bus.y=Math.max(r.height/2,Math.min(512-r.height/2,bus.y+delta[1]*step));invalidate();
});
$('run').addEventListener('click',run);$('run-scene').addEventListener('click',run);$('measure').addEventListener('click',measure);
$('random-bus').addEventListener('click',()=>{const s=sceneSize();hasBus=true;$('toggle-bus').textContent='Remove bus';bus={x:(Math.floor(Math.random()*grid)+.5)*s,y:(Math.floor(Math.random()*grid)+.5)*s};invalidate();});
$('restore-bus').addEventListener('click',()=>{sprite=sceneMode==='photo'?realSprite:demoSprite;customSprite=false;hasBus=true;$('toggle-bus').textContent='Remove bus';$('upload').value='';photoContext();invalidate();});
$('toggle-bus').addEventListener('click',()=>{hasBus=!hasBus;$('toggle-bus').textContent=hasBus?'Remove bus':'Restore bus';invalidate();});
$('shuffle').addEventListener('click',()=>{createDistractors();invalidate();});
$('heatmap').addEventListener('change',()=>{if(model&&dirty)classify();renderScene();});
$('grid-size').addEventListener('change',event=>{grid=Number(event.target.value);const s=sceneSize();bus={x:(Math.floor(bus.x/s)+.5)*s,y:(Math.floor(bus.y/s)+.5)*s};manualRounds=false;createDistractors();$('grid-label').textContent=`${grid*grid} regions / ${Math.log2(grid*grid)} qubits`;invalidate();});
$('snap').addEventListener('change',()=>{if($('snap').checked){const s=sceneSize();bus.x=(Math.floor(bus.x/s)+.5)*s;bus.y=(Math.floor(bus.y/s)+.5)*s;invalidate();}});
$('threshold').addEventListener('input',()=>{
  $('threshold-value').textContent=Number($('threshold').value).toFixed(2);revision++;manualRounds=false;state=null;measured=null;$('measure').disabled=true;
  if(scores.length){updateMarks();showState(simulateGrover(grid*grid,marked,0).history[0]);setResult('Threshold changed. Run search with the new marked set.');}
});
$('iterations').addEventListener('input',()=>{
  manualRounds=true;revision++;$('iteration-value').textContent=$('iterations').value;measured=null;$('measure').disabled=true;
  if(scores.length){const sim=simulateGrover(grid*grid,marked,Number($('iterations').value));showState(sim.history.at(-1));setPhase(3,'Explore the amplification curve','This preview updates the ideal state at your selected round count.');setResult('Round preview updated. Run the search to animate and measure.');renderScene();renderCurve();}
});
$('upload').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  if(!file.type.startsWith('image/')){setResult('Please choose an image file.','warning');return;}
  const url=URL.createObjectURL(file);
  try{sprite=await image(url);customSprite=true;hasBus=true;$('toggle-bus').textContent='Remove bus';photoContext();invalidate();setResult('Custom image loaded locally. The active model may not generalize to this image.','warning');}
  catch{setResult('The image could not be decoded. Try a PNG or JPEG.','warning');}
  finally{URL.revokeObjectURL(url);}
});
$('upload-street').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;const url=URL.createObjectURL(file);
  try{customBackground=await image(url);photoContext();invalidate();setResult('Your background is loaded locally. Detection on a new photograph is experimental.','warning');}
  catch{setResult('The background could not be decoded. Try a PNG or JPEG.','warning');}
  finally{URL.revokeObjectURL(url);}
});
async function init() {
  createDistractors();renderScene();renderBars();
  try {
    const [loadedModel,busImage] = await Promise.all([fetch('model/model.json').then(r=>{if(!r.ok)throw Error('Model weights missing');return r.json();}),image('assets/bus.png')]);
    model=loadedModel;syntheticModel=loadedModel;sprite=busImage;demoSprite=busImage;
    for(const name of ['car.png','truck.png','van.png']) {try{assets.set(name,await image(`assets/${name}`));}catch{/* geometric fallback is intentional */}}
    const t=model.threshold??model.decision_threshold??.5;$('threshold').value=t;$('threshold-value').textContent=Number(t).toFixed(2);
    try{metrics=await fetch('model/metrics.json').then(r=>r.json());}catch{metrics=model.metrics??{};}
    modelReport();
    await Promise.all([['illustrated','baseline_metrics.json'],['photo','photo_baseline_metrics.json']].map(async([domain,file])=>{
      try{const response=await fetch(`model/${file}`);if(response.ok)baselines.set(domain,await response.json());}catch{/* Optional evidence file. */}
    }));modelReport();
    invalidate();setResult('Loading the photo scene. The trained model is ready.');
    try{emeryvilleStreet=await image('assets/emeryville-street.png');$('street-emeryville').disabled=false;}catch{/* Optional independent street experiment. */}
    try{[photoModel,streetPhoto,realSprite]=await Promise.all([fetch('model/model-photo.json').then(r=>{if(!r.ok)throw Error('Photo model not ready');return r.json();}),image('assets/street-captcha.png'),image('assets/real-schoolbus.png')]);defaultStreet=streetPhoto;if(photoModel.readyForDemo===true){$('scene-photo').disabled=false;chooseScene('photo');}}catch{/* Photo experiment is enabled once its trained weights are validated. */}
    modelReady=true;setRunControls();setResult('Drag the bus to make your challenge, then press Solve CAPTCHA.');
  } catch(error){console.error(error);modelReady=false;setRunControls('Model unavailable');setPhase(0,'Model unavailable','The simulator needs its trained model and bus sprite.');setResult(`Unable to load: ${error.message}. Serve this folder over HTTP rather than opening a file URL.`, 'warning');}
}
init();


