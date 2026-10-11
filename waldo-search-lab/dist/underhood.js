/**
 * underhood.js: the earlier "look under the hood" explainer (circuit playback, Bloch
 * spheres, joint 4-qubit state, Grover rounds and measurement). It listens for app.js
 * 'wanda-scene' / 'wanda-grover' events and replays the classifier circuit (qnn-trace.js)
 * and Grover steps (quantum.js oracle/diffuse) for the selected window.
 * Not loaded by the current index.html, whose lower section now embeds the QNN
 * playground (qnn-playground.js) instead; tests still exercise its readiness handshake
 * and playback loop.
 */
import {traceQNN,getQNNFrame} from './qnn-trace.js';
import {oracle,diffuse,recommendIterations} from './quantum.js';
import {addressAt,inspectPredicate,lessonRounds} from './lesson-model.js';
import {summarizeMeasurement} from './measurement-view.js';
import {createRoundGuide,guideEligibility} from './grover-guide.js';
import {layerPlaybackBounds,circuitFramePosition,createCircuitPlayback} from './circuit-playback.js';
import {surfaceSpec,circuitViewport,representativeAddresses,basisLayout,basisIndexAt,signedBarGeometry} from './drawing-layout.js';

const $=id=>document.getElementById(id),tau=2*Math.PI;
let scene=null,trace=null,jointFrame=null,selected={x:420,y:300},playing=false,lastTime=0,raf=0,gatePosition=0,grover=null,operation='before',activeTab=0,lastAnnouncedLayer=-1,measurement=null,inspectedAddress=0,distributionURL=null,measurementKey=null;
let groverGuide=null,guideCommitDispatch=false;
const circuitPlayback=createCircuitPlayback();
const featuresLabels=['Stripe rhythm','Stripe coherence','Red / white balance','Warm / dark color pattern','Blue lower-region contrast','Color-centroid X alignment','Color-centroid Y alignment','Supplied size'];
const sphereColors=['#7cdbcb','#f5c76d','#a6b6ed','#e9a6ae'];
for(let q=0;q<4;q++){
 const card=document.createElement('div');card.className='bloch-card';
 const title=document.createElement('strong');title.textContent='QUBIT '+q;
 const c=document.createElement('canvas');c.width=c.height=260;c.setAttribute('aria-label','Reduced Bloch state of qubit '+q);
 const p=document.createElement('p');p.id='bloch-'+q+'-value';card.append(title,c,p);$('bloch-spheres').append(card);
}
const spheres=[...$('bloch-spheres').querySelectorAll('canvas')];
const fnum=(v,d=3)=>Number(v).toFixed(d),percent=v=>(100*v).toFixed(2)+'%';
function responsiveCanvas(el,height){
 const width=el.getBoundingClientRect().width;if(width<1)return null;
 const spec=surfaceSpec(width,height,window.devicePixelRatio||1);el.style.height=height+'px';
 if(el.width!==spec.pixelWidth||el.height!==spec.pixelHeight){el.width=spec.pixelWidth;el.height=spec.pixelHeight;}
 const c=el.getContext('2d');c.setTransform(spec.scaleX,0,0,spec.scaleY,0,0);c.clearRect(0,0,width,height);
 return {c,w:width,h:height};
}
let jointLayout=null;
function line(c,x1,y1,x2,y2,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function arrow(c,a,b,color,width=2){line(c,...a,...b,color,width);const angle=Math.atan2(b[1]-a[1],b[0]-a[0]);c.fillStyle=color;c.beginPath();c.moveTo(...b);c.lineTo(b[0]-8*Math.cos(angle-.4),b[1]-8*Math.sin(angle-.4));c.lineTo(b[0]-8*Math.cos(angle+.4),b[1]-8*Math.sin(angle+.4));c.fill();}
function project(v){return [130+91*(v.x*.90-v.y*.48),135+91*(v.y*.28-v.x*.14-v.z*.91)];}
function sphere(q,frame){
 const width=spheres[q].getBoundingClientRect().width;if(width<1)return;const surface=responsiveCanvas(spheres[q],width);if(!surface)return;
 const {c}=surface,r=frame.qubits[q],font=12*260/width;c.scale(width/260,width/260);
 const grd=c.createRadialGradient(104,102,8,130,135,98);grd.addColorStop(0,'#2e546b');grd.addColorStop(1,'#153148');c.fillStyle=grd;c.beginPath();c.arc(130,135,94,0,tau);c.fill();
 c.strokeStyle='#587486';c.lineWidth=1;c.stroke();
 for(const plane of ['xy','xz','yz']){c.beginPath();for(let n=0;n<=80;n++){const t=n/80*tau,v={x:0,y:0,z:0};v[plane[0]]=Math.cos(t);v[plane[1]]=Math.sin(t);const p=project(v);n?c.lineTo(...p):c.moveTo(...p);}c.strokeStyle=plane==='xy'?'#698697':'#456479';c.setLineDash(plane==='xy'?[]:[3,3]);c.stroke();}c.setLineDash([]);
 const o=project({x:0,y:0,z:0});
 for(const [axis,v]of [['x',{x:1.1,y:0,z:0}],['y',{x:0,y:1.1,z:0}],['z',{x:0,y:0,z:1.1}]]){const p=project(v);line(c,...o,...p,'#7892a1',.8);c.fillStyle='#a9c0ca';c.font=font+'px monospace';c.fillText(axis,p[0]+3,p[1]-3);}
 // Path points come from the real joint state under a fractional unitary angle.
 if(frame.gate?.kind!=='cx'&&frame.gate?.qubit===q&&frame.gateProgress>0){c.strokeStyle=sphereColors[q]+'70';c.lineWidth=3;c.beginPath();for(let n=0;n<=14;n++){const p=project(getQNNFrame(trace,frame.gateIndex,frame.gateProgress*n/14).qubits[q].bloch);n?c.lineTo(...p):c.moveTo(...p);}c.stroke();}
 const p=project(r.bloch);arrow(c,o,p,sphereColors[q],3);c.fillStyle=sphereColors[q];c.beginPath();c.arc(...p,4,0,tau);c.fill();
 c.fillStyle='#a9c0ca';c.font=font+'px monospace';c.fillText('|0⟩',137,34);c.fillText('|1⟩',137,244);
 $('bloch-'+q+'-value').textContent='|r| '+fnum(r.length)+' · purity '+fnum(r.purity);
 spheres[q].setAttribute('aria-label','Qubit '+q+': Bloch x '+fnum(r.bloch.x)+', y '+fnum(r.bloch.y)+', z '+fnum(r.bloch.z)+', length '+fnum(r.length));
}
function circuitMap(frame){
 const surface=responsiveCanvas($('circuit-map'),232);if(!surface)return;const {c,w}=surface;
 const layer=Math.min(trace.layers-1,frame.gate?.layer??trace.layers-1),gates=trace.gates.filter(g=>g.layer===layer),view=circuitViewport(gates,frame.gateIndex,w),dx=(w-58)/view.gates.length;
 c.font='12px monospace';c.fillStyle='#b7d4dc';c.fillText('Layer '+(layer+1)+' / '+trace.layers+' · '+(view.complete?'all '+view.total+' gates':'gates '+(view.start+1)+'–'+view.end+' of '+view.total),12,19);
 for(let q=0;q<4;q++){const y=50+q*50;line(c,38,y,w-12,y,'#49677d');c.fillStyle='#a9c7d4';c.fillText('q'+q,8,y+4);}
 for(let j=0;j<view.gates.length;j++){const g=view.gates[j],x=44+(j+.5)*dx,active=g.index===frame.gateIndex,passed=g.index<frame.completedGates,col=g.phase==='encoding'?'#72d7c7':g.phase==='trained'?'#f1c577':'#eca4b1';
 c.globalAlpha=active?1:passed?.8:.35;
 if(g.kind==='cx'){const y0=50+g.control*50,y1=50+g.target*50;line(c,x,y0,x,y1,col,active?3:1.5);c.fillStyle=col;c.beginPath();c.arc(x,y0,4,0,tau);c.fill();c.strokeStyle=col;c.beginPath();c.arc(x,y1,9,0,tau);c.stroke();line(c,x-9,y1,x+9,y1,col);line(c,x,y1-9,x,y1+9,col);if(active){c.globalAlpha=.5+.5*Math.sin(frame.gateProgress*Math.PI);c.strokeStyle=col;c.lineWidth=5;c.stroke();}}
 else{const y=50+g.qubit*50;c.fillStyle=active?'#355970':'#173047';c.fillRect(x-14,y-14,28,28);c.strokeStyle=col;c.lineWidth=active?2:1;c.strokeRect(x-14,y-14,28,28);c.fillStyle=col;c.font='12px monospace';c.fillText(g.kind==='ry'?'Ry':'Rz',x-8,y+4);}
 }c.globalAlpha=1;
 $('circuit-map').setAttribute('aria-label','Actual layer '+(layer+1)+' of '+trace.layers+', showing gates '+(view.start+1)+' through '+view.end+' of '+view.total+'. The gate controls reach the entire circuit.');
}
function drawJoint(frame){
 const el=$('joint-state'),width=el.getBoundingClientRect().width;if(width<1)return;
 jointLayout=basisLayout(width);const surface=responsiveCanvas(el,jointLayout.height);if(!surface)return;const {c,w}=surface,{columns,margin,top,rowHeight,cellWidth}=jointLayout;
 c.fillStyle='#aac6d4';c.font='12px monospace';c.fillText('16 outcomes · fixed 0–100% scale',12,17);
 for(let i=0;i<16;i++){
  const x=margin+(i%columns)*cellWidth,y=top+Math.floor(i/columns)*rowHeight,base=y+rowHeight-24,barHeight=rowHeight-36;
  c.fillStyle='#35546a';c.fillRect(x+4,base-barHeight,cellWidth-9,barHeight);c.fillStyle='#83d6c9';const bar=frame.probabilities[i]*barHeight;c.fillRect(x+4,base-bar,cellWidth-9,bar);
  c.fillStyle='#aac6d4';c.font='12px monospace';c.fillText(i.toString(2).padStart(4,'0'),x+2,base+17);
 }
 el.setAttribute('aria-label','All sixteen actual joint basis probabilities, on a fixed zero to one scale. '+(columns===4?'Four rows of four outcomes.':'One row of sixteen outcomes.')+' Arrow keys inspect every complex amplitude.');
}
function joint(frame){
 jointFrame=frame;
 drawJoint(frame);
 const correlations=$('joint-correlations');correlations.replaceChildren();
 for(const pair of frame.correlations){const row=document.createElement('div');row.className='correlation-row';const a=document.createElement('span');a.textContent='C(Z'+pair.qubits[0]+',Z'+pair.qubits[1]+')';const b=document.createElement('span');b.textContent=fnum(pair.connected);row.append(a,b);correlations.append(row);}
 $('circuit-readout').textContent='Final seven Z expectations → learned weighted sum → sigmoid: '+percent(trace.score)+'. This is the window’s detector score, not a calibrated probability that Wanda is present.';
 const readouts=$('qnn-readouts');readouts.replaceChildren();
 for(let i=0;i<7;i++){const row=document.createElement('div');row.className='correlation-row';const a=document.createElement('span');a.textContent=frame.observableNames[i];const b=document.createElement('span');b.textContent=fnum(trace.expectations[i])+' × '+fnum(scene.model.readout[i]);row.append(a,b);readouts.append(row);}
 const formula=document.createElement('p');formula.textContent='Σ wⱼ⟨Z-productⱼ⟩ + bias '+fnum(scene.model.bias)+' = '+fnum(trace.logit)+'. sigmoid(logit) = '+percent(trace.score)+'.';readouts.append(formula);
 updateBasisInspector();
}
function updateCircuit(){
 if(!trace)return;const total=trace.gates.length,presentation=circuitFramePosition(trace,gatePosition),t=presentation.progress,frame=getQNNFrame(trace,presentation.gateIndex,t);
 $('circuit-gate').value=gatePosition;$('circuit-gate-value').textContent=Math.min(total,Math.floor(gatePosition))+' / '+total;
 const g=frame.gate;
 $('circuit-caption').textContent=presentation.boundary?(gatePosition===total?'Circuit complete. ':'')+'Layer '+(g.layer+1)+' complete · final CNOT q'+g.control+' → q'+g.target+' applied · '+gatePosition+' / '+total+' gates. '+(gatePosition===total?'The full-circuit readout is now reached.':'Play next layer starts at this exact state.'):!g?'Circuit complete · seven measured expectations feed the learned readout.':g.kind==='cx'?'Layer '+(g.layer+1)+' · CNOT q'+g.control+' → q'+g.target+' · linking pulse; exact state changes at the gate endpoint.':'Layer '+(g.layer+1)+' · '+(g.phase==='encoding'?'Image angle':'Learned angle')+' · '+g.kind.toUpperCase()+' on q'+g.qubit+' · '+fnum(g.angle)+' rad × '+Math.round(t*100)+'%';
 circuitMap(frame);frame.qubits.forEach((_,q)=>sphere(q,frame));joint(frame);
 const layer=g?.layer??trace.layers,key=(presentation.boundary?'complete-':'gate-')+layer;if(key!==lastAnnouncedLayer){lastAnnouncedLayer=key;$('circuit-announce').textContent=presentation.boundary?'Layer '+(layer+1)+' complete, after its final CNOT.':g?'Circuit layer '+(layer+1)+' of '+trace.layers+'.':'Circuit complete. Final learned readout is '+percent(trace.score)+'.';}updateCircuitControls();
}
function reducedCircuitMotion(){return window.matchMedia('(prefers-reduced-motion: reduce)').matches||$('circuit-reduce-motion').checked;}
function circuitContext(){return {trace,scene,position:gatePosition,available:!!scene&&!$('find').disabled&&$('find').getAttribute('aria-busy')!=='true',visible:activeTab===0&&!document.hidden,reducedMotion:reducedCircuitMotion()};}
function updateCircuitControls(){
 const button=$('circuit-play'),context=circuitContext(),bounds=trace?layerPlaybackBounds(trace,gatePosition):null;
 button.disabled=!context.available||!trace||bounds.finished;button.setAttribute('aria-pressed',String(playing));
 button.textContent=playing?'Pause layer':bounds?.finished?'Circuit complete':context.reducedMotion?'Advance one gate':gatePosition>0&&Number.isInteger(gatePosition)&&bounds?.start===gatePosition?'Play next layer ('+(bounds.layer+1)+')':'Play this layer';
 const note=$('image-next-action');if(note)note.textContent=!trace?'Restore Wanda to inspect her trained circuit.':bounds.finished?'All four layers are complete. Restart or choose an earlier gate to inspect them again; the full-circuit score stays visible.':'Play layer '+(bounds.layer+1)+' through gate '+bounds.end+' to watch image encoding, learned rotations and exact CNOT endpoints. Playback stops at that layer; the displayed score refers to all four layers.';
}
function stopCircuit(){playing=false;circuitPlayback.stop();cancelAnimationFrame(raf);raf=0;updateCircuitControls();}
function tick(now,token){
 // An old RAF must not clear or advance a newly started playback.
 if(!circuitPlayback.owns(token))return;raf=0;
 const delta=Math.max(0,(now-lastTime)/1000);lastTime=now;const result=circuitPlayback.advance(token,circuitContext(),delta,Number($('circuit-speed').value));
 if(!result){stopCircuit();return;}gatePosition=result.position;updateCircuit();if(result.complete)stopCircuit();else raf=requestAnimationFrame(time=>tick(time,token));
}
$('circuit-play').addEventListener('click',()=>{
 const context=circuitContext();if(!trace||!context.available||!context.visible||gatePosition>=trace.gates.length)return;if(playing){stopCircuit();return;}
 if(context.reducedMotion){circuitPlayback.stop();gatePosition=Math.min(trace.gates.length,Math.floor(gatePosition)+1);updateCircuit();return;}
 const token=circuitPlayback.start(context);if(token==null)return;playing=true;lastTime=performance.now();updateCircuitControls();raf=requestAnimationFrame(time=>tick(time,token));
});
$('circuit-restart').addEventListener('click',()=>{stopCircuit();gatePosition=0;updateCircuit();});
$('circuit-gate').addEventListener('input',e=>{stopCircuit();gatePosition=Number(e.target.value);updateCircuit();});
function selectedWindow(){
 if(!scene)return;stopCircuit();
 const geometry={targetWidth:scene.targetWidth,targetHeight:scene.targetHeight},features=scene.extract(scene.image,selected.x,selected.y,geometry);
 trace=traceQNN(features,scene.model);gatePosition=0;$('circuit-gate').max=trace.gates.length;
 const sceneCanvas=$('trace-scene'),c=sceneCanvas.getContext('2d');c.putImageData(scene.image,0,0);const W=Math.max(scene.targetWidth+16,Math.ceil(1.6*scene.targetWidth)),H=scene.targetHeight+16;
 c.strokeStyle='#d34e45';c.lineWidth=2;c.strokeRect(selected.x-W/2,selected.y-H/2,W,H);c.fillStyle='#fffcf5';c.fillRect(selected.x-W/2,selected.y-H/2-15,48,13);c.fillStyle='#d34e45';c.font='10px monospace';c.fillText('WINDOW',selected.x-W/2+3,selected.y-H/2-5);
 const crop=$('trace-crop');crop.width=Math.ceil(W*3);crop.height=Math.ceil(H*3);const cc=crop.getContext('2d'),raw=document.createElement('canvas');raw.width=raw.height=512;raw.getContext('2d').putImageData(scene.image,0,0);cc.imageSmoothingEnabled=false;cc.drawImage(raw,selected.x-W/2,selected.y-H/2,W,H,0,0,crop.width,crop.height);
 $('trace-export').href=raw.toDataURL('image/png');$('trace-export').setAttribute('aria-disabled','false');
 $('trace-address').textContent='x '+selected.x+' · y '+selected.y;
 $('trace-score').textContent='Saved QNN score '+percent(trace.score)+' · threshold '+percent(scene.threshold)+(trace.score>=scene.threshold?' · passes score threshold.':' · below score threshold.');
 const bars=$('trace-features');bars.replaceChildren();features.forEach((v,i)=>{const r=document.createElement('div');r.className='trace-feature';const label=document.createElement('span');label.textContent=featuresLabels[i];const bar=document.createElement('div');bar.className='feature-bar';const fill=document.createElement('i');fill.style.width=100*v+'%';bar.append(fill);const output=document.createElement('output');output.textContent=fnum(v);r.append(label,bar,output);bars.append(r);});
 $('trace-best').disabled=!scene.scores;updateCircuit();renderPredicate();renderLesson();
}
$('trace-scene').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();selected={x:Math.max(4,Math.min(508,Math.floor((e.clientX-r.left)*512/r.width/8)*8+4)),y:Math.max(4,Math.min(508,Math.floor((e.clientY-r.top)*512/r.height/8)*8+4))};selectedWindow();});
$('trace-scene').addEventListener('keydown',e=>{const delta={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]}[e.key];if(!delta)return;e.preventDefault();selected={x:Math.max(4,Math.min(508,selected.x+delta[0])),y:Math.max(4,Math.min(508,selected.y+delta[1]))};selectedWindow();});
$('trace-best').addEventListener('click',()=>{if(!scene?.scores)return;let best=0;for(let i=1;i<scene.scores.length;i++)if(scene.scores[i]>scene.scores[best])best=i;const c=scene.candidates?.[best];selected=c?{x:c.bestX,y:c.bestY}:{x:(best%scene.grid+.5)*512/scene.grid,y:(Math.floor(best/scene.grid)+.5)*512/scene.grid};selectedWindow();});
window.addEventListener('wanda-scene',e=>{groverGuide?.cancel('The image or oracle changed. Preview one round of the new saved state.');scene=e.detail;lastAnnouncedLayer=-1;for(const id of ['circuit-play','circuit-restart','circuit-gate'])$(id).disabled=!scene;if(scene){if(!scene.scores)selectTab(0);selectedWindow();return;}stopCircuit();trace=null;jointFrame=null;selectTab(0);$('trace-best').disabled=true;$('trace-export').removeAttribute('href');$('trace-export').setAttribute('aria-disabled','true');$('trace-address').textContent='Comparison mode';$('trace-score').textContent='The Wanda circuit trace is available with the trained Wanda QNN. Restore Wanda to inspect it.';$('circuit-caption').textContent='Wanda QNN trace unavailable: the active oracle is a separate comparison.';$('trace-features').replaceChildren();for(const id of ['trace-scene','trace-crop','circuit-map','joint-state','oracle-map']){const c=$(id);c.getContext('2d').clearRect(0,0,c.width,c.height);}spheres.forEach(c=>c.getContext('2d').clearRect(0,0,c.width,c.height));$('joint-correlations').replaceChildren();$('qnn-readouts').replaceChildren();$('circuit-readout').textContent='Restore the trained Wanda QNN to view its learned readout.';renderPredicate();renderLesson();});
let inspectedBasis=0;
function updateBasisInspector(){if(!jointFrame)return;const b=jointFrame.basis[inspectedBasis];$('joint-inspector').textContent='|'+b.bitstring+'⟩ : '+fnum(b.real,4)+(b.imaginary<0?' − ':' + ')+fnum(Math.abs(b.imaginary),4)+'i · phase '+fnum(b.phase)+' rad · probability '+percent(b.probability);}
$('joint-state').addEventListener('pointermove',e=>{if(!jointFrame||!jointLayout)return;const r=e.currentTarget.getBoundingClientRect();inspectedBasis=basisIndexAt(jointLayout,(e.clientX-r.left)*jointLayout.width/r.width,(e.clientY-r.top)*jointLayout.height/r.height);updateBasisInspector();});
$('joint-state').addEventListener('keydown',event=>{if(!jointFrame||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();inspectedBasis=event.key==='Home'?0:event.key==='End'?15:Math.max(0,Math.min(15,inspectedBasis+(event.key==='ArrowRight'?1:-1)));updateBasisInspector();});
function groverDrawing(){
 if(!grover||!scene){for(const id of ['grover-operation','grover-plane']){const surface=responsiveCanvas($(id),id==='grover-plane'?240:250);if(!surface)continue;const {c}=surface;c.fillStyle='#60727d';c.font='14px sans-serif';c.fillText('Read this image to build',18,55);c.fillText('its actual location state.',18,78);} $('grover-operation-note').textContent='No saved state yet. Phase and reflection will use your actual accepted addresses.';$('grover-plane-note').textContent='The location register is separate from the four-qubit classifier.';return;}
 const base=grover.amplitudes,marks=grover.marks,N=base.length,M=marks.length,marked=new Set(marks),flipped=oracle(base,marks),reflected=diffuse(flipped),values=operation==='oracle'?flipped:operation==='diffuse'?reflected:base;
 const mean=flipped.reduce((s,a)=>s+a,0)/N,max=Math.max(1/Math.sqrt(N),Math.abs(mean),...base.map(Math.abs),...flipped.map(Math.abs),...reflected.map(Math.abs));
 const surface=responsiveCanvas($('grover-operation'),250);
 if(surface){const {c,w,h}=surface,y0=122,scale=82/max,indices=representativeAddresses(N,marks,w),dx=(w-48)/indices.length;
 c.font='12px monospace';c.fillStyle='#5f727f';c.fillText(N+' '+(N===1?'address':'addresses')+' · '+M+' accepted',18,19);c.fillText(indices.length===N?'Every address below':indices.length+' representative addresses below',18,38);
 line(c,18,y0,w-12,y0,'#b0b9ba');c.fillStyle='#60727d';c.font='12px monospace';c.fillText('0',5,y0+4);if(operation!=='before'){c.setLineDash([5,4]);line(c,18,y0-mean*scale,w-12,y0-mean*scale,'#9f793c');c.setLineDash([]);c.fillStyle='#9f793c';c.fillText('Post-oracle mean '+fnum(mean,4),18,h-33);}
 for(let j=0;j<indices.length;j++){const i=indices[j],x=22+j*dx,bar=signedBarGeometry(values[i],max,y0,82);c.fillStyle=marked.has(i)?'#d24e45':'#5d879d';c.fillRect(x,bar.top,Math.max(6,dx-10),bar.height);c.fillStyle='#60727d';c.font='12px monospace';c.fillText(String(i),x,h-53);}
 c.fillStyle='#60727d';c.font='12px monospace';c.fillText('Shared amplitude scale ±'+fnum(max,4),18,h-10);
 $('grover-operation').setAttribute('aria-label','Exact signed amplitudes for '+indices.length+' '+(indices.length===N?'all':'representative')+' addresses out of '+N+'. All three phase/reflection views share amplitude scale plus or minus '+max+'.');}
 const mass=marks.reduce((s,i)=>s+values[i]**2,0),beforeMass=marks.reduce((s,i)=>s+base[i]**2,0);
 $('grover-operation-note').textContent=operation==='before'?'At round '+grover.iteration+', accepted-set probability is '+exactPercent(beforeMass)+'. Bar height carries a sign; probability is its square.':operation==='oracle'?'The oracle flips only accepted amplitudes. Their squared magnitudes are unchanged: '+exactPercent(mass)+' accepted-set probability. The mean shifts, enabling interference.':'Reflection previews round '+(grover.iteration+1)+', using a′ = 2ā − a. Accepted-set probability becomes '+exactPercent(mass)+'. Complete one round saves it; the three views share one amplitude scale.';
 const planeSurface=responsiveCanvas($('grover-plane'),240);
 if(planeSurface){const {c:p,w}=planeSurface,ox=w/2,oy=130,r=Math.max(40,Math.min(88,w/2-32));
 p.strokeStyle='#c8d2d0';p.beginPath();p.arc(ox,oy,r,0,tau);p.stroke();line(p,15,oy,w-15,oy,'#b2bfbd');line(p,ox,22,ox,230,'#b2bfbd');p.fillStyle='#60747d';p.font='12px monospace';if(N>M)p.fillText('|unmarked⟩',ox+10,oy+19);if(M)p.fillText('|marked⟩',ox+7,22);
 const alpha=N>M?values.reduce((s,a,i)=>s+(marked.has(i)?0:a),0)/Math.sqrt(N-M):0,beta=M?marks.reduce((s,i)=>s+values[i],0)/Math.sqrt(M):0;
 arrow(p,[ox,oy],[ox+alpha*r,oy-beta*r],operation==='oracle'?'#d24e45':'#345d80',3);
 const angle=Math.atan2(beta,alpha);p.strokeStyle='#d7a854';p.lineWidth=3;p.beginPath();p.arc(ox,oy,26,0,-angle,angle>0);p.stroke();}
 const theta=Math.asin(Math.sqrt(M/N));$('grover-plane-note').textContent=M&&M<N?'θ = asin √(M/N) = '+fnum(theta)+' rad. Each complete round rotates by 2θ; the first useful peak is round '+recommendIterations(N,M)+'. This 2D view groups equivalent marked and unmarked amplitudes.':M===0?'The learned oracle accepts no address. The demo abstains; Grover cannot manufacture recognition evidence.':'All addresses are accepted. Amplification cannot distinguish them.';
}
for(const b of document.querySelectorAll('[data-grover-step]'))b.addEventListener('click',()=>{groverGuide?.cancel('Manual phase view selected. Watch one round starts from the saved state.');operation=b.dataset.groverStep;for(const peer of document.querySelectorAll('[data-grover-step]'))peer.setAttribute('aria-pressed',String(peer===b));groverDrawing();});
window.addEventListener('wanda-grover',e=>{const old=grover;grover=e.detail;groverGuide?.sync();if(grover?.measurement!=null&&grover.measurement!==old?.measurement)inspectedAddress=grover.measurement;groverDrawing();renderLesson();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopCircuit();groverGuide?.pause('Paused while this page is hidden. Resume keeps the same exact preview.');}});
function renderPredicate(){
 if(!scene||!trace){$('predicate-window').textContent='Restore Wanda and the trained QNN to inspect the live predicate.';$('predicate-decision').textContent='Comparison mode';$('predicate-reason').textContent='This lesson uses the trained Wanda detector.';$('predicate-best').disabled=true;$('predicate-above').textContent='Unavailable';$('predicate-kept').textContent='Unavailable';return;}
 const info=inspectPredicate({grid:scene.grid,selected,windowScore:trace.score,threshold:scene.threshold,scores:scene.scores,candidates:scene.candidates,marks:scene.marks,nmsRadius:scene.diagnostics?.nmsRadius??0});
 $('predicate-register').textContent=info.qubits+' qubits / '+info.N.toLocaleString()+' addresses';
 $('predicate-window').textContent='Window center ('+selected.x+', '+selected.y+') maps to address '+info.index+' = |'+info.index.toString(2).padStart(info.qubits,'0')+'⟩. Its QNN score is '+percent(trace.score)+'.';
 $('predicate-above').textContent=info.built?String(info.aboveThresholdCount):'Not scanned';$('predicate-kept').textContent=info.built?String(info.acceptedCount):'Not scanned';$('predicate-best').disabled=!info.built;
 if(!info.built){$('predicate-decision').textContent='f(j) is not built yet.';$('predicate-reason').textContent='A selected window can be scored on its own. Read the whole image to gather address representatives, threshold them and suppress nearby duplicates.';}
 else { $('predicate-decision').textContent='f('+info.index+') = '+(info.accepted?'1 · marked':'0 · unmarked');
  const max='This address’s best window is ('+info.bestPoint.x+', '+info.bestPoint.y+'), score '+percent(info.addressScore)+', against threshold '+percent(info.threshold)+'. ';
  const selectedNote=info.representative?'The selected window is its representative. ':('The selected window '+(info.scorePass?'passes':'fails')+' the threshold; another window represents this cell. ');
  const reason=info.accepted?'The representative passes and survives peak suppression.':!info.addressPass?'Its representative is below threshold.':info.suppressor!=null?'Its representative passes, but nearby accepted address '+info.suppressor+' suppresses this duplicate peak.':'Its representative passes but was not retained by peak suppression.';
  $('predicate-reason').textContent=max+selectedNote+reason; }
 const c=$('oracle-map').getContext('2d'),s=512/scene.grid;c.putImageData(scene.image,0,0);c.fillStyle='rgba(255,252,245,.78)';c.fillRect(0,0,512,512);
 for(let k=1;k<scene.grid;k++){line(c,k*s,0,k*s,512,'#72849535',.5);line(c,0,k*s,512,k*s,'#72849535',.5);}
 if(info.built)for(const i of scene.marks){const candidate=scene.candidates[i],x=i%scene.grid*s,y=Math.floor(i/scene.grid)*s;c.fillStyle='#ce5547';c.fillRect(x,y,s,s);c.strokeStyle='#ce5547';c.lineWidth=2;c.beginPath();c.arc(candidate.bestX,candidate.bestY,7,0,tau);c.stroke();}
 c.strokeStyle='#2447c8';c.lineWidth=3;c.strokeRect(info.column*s,info.row*s,s,s);
 $('oracle-map').setAttribute('aria-label',(info.built?info.acceptedCount+' accepted addresses.':'Oracle not built.')+' Selected address '+info.index+'. Click a cell or use arrow keys to inspect its best window.');
}
function inspectAddress(index){if(!scene)return;const candidate=scene.candidates?.[index];selected=candidate?{x:candidate.bestX,y:candidate.bestY}:{x:4+(index%scene.grid)*512/scene.grid,y:4+Math.floor(index/scene.grid)*512/scene.grid};selectedWindow();}
$('oracle-map').addEventListener('click',event=>{if(!scene)return;const r=event.currentTarget.getBoundingClientRect();inspectAddress(addressAt((event.clientX-r.left)*512/r.width,(event.clientY-r.top)*512/r.height,scene.grid).index);});
$('oracle-map').addEventListener('keydown',event=>{if(!scene)return;const move={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(!move)return;event.preventDefault();const a=addressAt(selected.x,selected.y,scene.grid),col=Math.max(0,Math.min(scene.grid-1,a.column+move[0])),row=Math.max(0,Math.min(scene.grid-1,a.row+move[1]));inspectAddress(row*scene.grid+col);});
$('predicate-best').addEventListener('click',()=>{if(scene?.candidates)inspectAddress(addressAt(selected.x,selected.y,scene.grid).index);});
const stages=[
 {title:'Pixels become rotation angles.',copy:'Eight classical descriptors set angles α = πx. Learned rotations and CNOTs transform one four-qubit state; the spheres show its reduced states.'},
 {title:'Signs prepare interference.',copy:'A phase flip alone leaves |a|² unchanged. Reflection previews the next round’s odds; saving the round makes that state available for measurement.'},
 {title:'Sample the saved quantum state.',copy:'Born probabilities are a². Accepted and unmarked outcomes both remain possible; the sampled point is independently evaluated afterward.'}
];
const tabNames=['image','grover','measure'];
function requestLesson(action,round){window.dispatchEvent(new CustomEvent('wanda-lesson-request',{detail:{action,round}}));}
function showOperation(value){operation=value;for(const b of document.querySelectorAll('[data-grover-step]'))b.setAttribute('aria-pressed',String(b.dataset.groverStep===value));groverDrawing();}
function selectTab(index,{focus=false}={}){
 activeTab=Math.max(0,Math.min(2,index));if(activeTab!==1)groverGuide?.pause('Paused outside Grover interference. Resume keeps the same saved round.');if(activeTab!==0)stopCircuit();
 for(let i=0;i<3;i++){const tab=$('explainer-tab-'+tabNames[i]),panel=$('explainer-'+tabNames[i]);tab.setAttribute('aria-selected',String(i===activeTab));tab.tabIndex=i===activeTab?0:-1;panel.hidden=i!==activeTab;}
 if(focus)$('explainer-tab-'+tabNames[activeTab]).focus({preventScroll:true});
 if(activeTab===0&&trace)updateCircuit();groverDrawing();renderLesson();
}
for(const tab of document.querySelectorAll('[role=tab][data-explainer-tab]')){
 tab.addEventListener('click',()=>selectTab(Number(tab.dataset.explainerTab)));
 tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();selectTab(event.key==='Home'?0:event.key==='End'?2:(activeTab+(event.key==='ArrowRight'?1:2))%3,{focus:true});});
}
function precise(value){return value===0?'0':Math.abs(value)<1e-6?value.toExponential(6):value.toPrecision(8);}
function exactPercent(value){return precise(value*100)+'%';}
function drawMeasurementBars(){
 const surface=responsiveCanvas($('measurement-bars'),210);if(!surface)return;const {c,w}=surface;
 if(!measurement){c.fillStyle='#60727d';c.font='14px sans-serif';c.fillText('Read the image for its exact',18,55);c.fillText('measurement probabilities.',18,78);return;}
 const groups=[['Accepted',measurement.accepted,'#ce5547'],['Unmarked',measurement.unmarked,'#5d879d']],left=16,barWidth=w-32;
 for(let i=0;i<groups.length;i++){const [name,group,color]=groups[i],y=20+i*80;
 c.fillStyle='#60727d';c.font='14px sans-serif';c.fillText(name,left,y);c.textAlign='right';c.fillText(exactPercent(group.total),w-left,y);c.textAlign='left';
 c.fillStyle='#e8e5dc';c.fillRect(left,y+12,barWidth,24);c.fillStyle=color;c.fillRect(left,y+12,barWidth*group.total,24);
 c.fillStyle='#60727d';c.font='12px sans-serif';c.fillText(group.count.toLocaleString()+' '+(group.count===1?'address':'addresses'),left,y+54);}
 c.fillStyle='#60727d';c.font='12px sans-serif';if(w<500){c.fillText('0–100% scale',16,183);c.fillText('Both totals cover every address',16,203);}else c.fillText('0–100% scale · both totals cover every address',16,198);
}
function renderMeasurement(){
 if(measurementKey?.scene===scene&&measurementKey?.amplitudes===grover?.amplitudes&&measurementKey?.marks===grover?.marks){updateMeasurementInspector();drawMeasurementBars();return;}
 measurementKey={scene,amplitudes:grover?.amplitudes,marks:grover?.marks};
 if(distributionURL){URL.revokeObjectURL(distributionURL);distributionURL=null;}
 $('measurement-export').removeAttribute('href');$('measurement-export').setAttribute('aria-disabled','true');$('measurement-address').disabled=true;
 if(!scene||!grover){measurement=null;drawMeasurementBars();$('measurement-classes').replaceChildren();$('measurement-summary').textContent='Read this image to build the actual location state. No example probabilities are substituted.';$('measurement-address-detail').textContent='Any-address inspection becomes available after the scan.';return;}
 measurement=summarizeMeasurement(grover.amplitudes,grover.marks);drawMeasurementBars();
 const {N,accepted,unmarked}=measurement,groups=[['Accepted',accepted],['Unmarked',unmarked]],rows=$('measurement-classes');rows.replaceChildren();
 for(const [name,group]of groups){
  const row=document.createElement('div'),label=document.createElement('strong'),details=document.createElement('span');row.className='measurement-class';label.textContent=name+' · '+group.count.toLocaleString()+' '+(group.count===1?'address':'addresses');
  details.textContent='Total '+exactPercent(group.total)+(group.count?(group.uniform?' · each p = '+precise(group.eachProbability):' · individual p range '+precise(group.minimum)+'–'+precise(group.maximum)):' · no address in this class');row.append(label,details);rows.append(row);
 }
 $('measurement-summary').textContent='Round '+grover.iteration+' · '+N.toLocaleString()+' exact outcomes. '+(!grover.marks.length?'The mathematical state is uniform, but the empty-oracle policy abstains.':accepted.uniform&&unmarked.uniform?'Equal probabilities inside each predicate class; different QNN scores do not weight Grover outcomes.':'Probabilities vary inside a class; inspect every actual value.')+' Sampling uses this completed round, not the next-round reflection preview.';
 inspectedAddress=Math.max(0,Math.min(N-1,inspectedAddress));$('measurement-address').max=N-1;$('measurement-address').value=inspectedAddress;$('measurement-address').disabled=false;updateMeasurementInspector();
 const payload={iteration:grover.iteration,grid:grover.grid,marks:grover.marks,amplitudes:Array.from(grover.amplitudes),probabilities:Array.from(measurement.probabilities),norm:measurement.norm,scope:'Exact saved location state. No normalized subset, detector-score weighting or postselection.'};
 distributionURL=URL.createObjectURL(new Blob([JSON.stringify(payload)],{type:'application/json'}));$('measurement-export').href=distributionURL;$('measurement-export').setAttribute('aria-disabled','false');
}
function updateMeasurementInspector(){
 if(!measurement||!grover)return;const i=inspectedAddress,point=scene?.candidates?.[i],marked=grover.marks.includes(i);$('measurement-address').value=i;$('measurement-address-value').textContent=i;
 $('measurement-address-detail').textContent='|'+i.toString(2).padStart(Math.log2(measurement.N),'0')+'⟩ · '+(marked?'accepted':'unmarked')+' · signed amplitude '+precise(grover.amplitudes[i])+' · p = '+precise(measurement.probabilities[i])+' ('+exactPercent(measurement.probabilities[i])+')'+(point?' · representative point ('+point.bestX+', '+point.bestY+')':'');
}
$('measurement-address').addEventListener('input',event=>{inspectedAddress=Number(event.target.value);updateMeasurementInspector();});
function renderLesson(){
 if(playing&&!circuitContext().available)stopCircuit();else updateCircuitControls();
 const stage=stages[activeTab];$('lesson-step-title').textContent=stage.title;$('lesson-step-copy').textContent=stage.copy;
 const busy=!!grover?.busy||$('find').getAttribute('aria-busy')==='true',available=!!scene&&!busy&&!$('find').disabled,ready=available&&!!grover;
 for(const b of document.querySelectorAll('[data-circuit-milestone],#circuit-previous,#circuit-next'))b.disabled=!scene;
 for(const b of document.querySelectorAll('[data-grover-step]'))b.disabled=!ready;
 $('lesson-run').disabled=!available;$('lesson-run').textContent=busy?'Reading the image…':scene&&!available?'Artwork loading…':scene?.scores?'Read image again':'Read this image';
 $('lesson-live').textContent=!scene?'Restore the trained Wanda QNN to inspect its circuit and location state.':busy?'Reading the image; saved-run controls wait until it is ready.':!available?'Artwork is loading; the previous window remains inspectable.':!grover?'Window inspection is ready. Read the image to build its oracle without sampling.':grover.marks.length===0?'Empty oracle: no reported answer and no sampling.':grover.marks.length+' / '+grover.amplitudes.length.toLocaleString()+' addresses accepted · saved round '+grover.iteration+' · accepted mass '+exactPercent(grover.marks.reduce((sum,i)=>sum+grover.amplitudes[i]**2,0))+'.';
 for(const id of ['lesson-first','lesson-peak','lesson-overshoot','lesson-sample'])$(id).disabled=!ready||grover.marks.length===0;
 if(grover?.marks.length===grover?.amplitudes.length)$('lesson-overshoot').disabled=true;
 $('lesson-advance').disabled=!ready||!grover.marks.length||grover.iteration>=grover.maximum;
 $('lesson-round').disabled=!ready||!grover.marks.length;$('lesson-round').max=grover?.maximum??0;$('lesson-round').value=grover?.iteration??0;$('lesson-round-value').textContent=grover?.iteration??0;
 $('lesson-round-note').textContent=!grover?'Read the image to inspect its saved exact rounds.':grover.marks.length===0?'Empty accepted set: the state exists, but the demo abstains.':'First useful peak: round '+grover.peak+' · saved through '+grover.maximum+'. Reflect previews the next round; Complete one round commits it. Round changes clear the old sample.';
 $('lesson-measurement').textContent=!scene?'Restore the trained Wanda QNN to inspect its measurement.':grover?.measurement==null?'No current sample. Read this image waits for you; Find Wanda samples automatically.':'Sampled address '+grover.measurement+' → point ('+grover.point.x+', '+grover.point.y+'). '+(grover.marks.includes(grover.measurement)?'Accepted by the detector.':'Unmarked outcome, retained without postselection.')+' '+$('ground-truth').textContent;
 $('explainer-back').disabled=activeTab===0;$('explainer-next').disabled=activeTab===2;$('explainer-next').textContent=activeTab===0?'Next: Grover →':activeTab===1?'Next: Measurement →':'Three stages explored';renderMeasurement();groverGuide?.sync();renderGuide();
}
function footerStage(delta){selectTab(activeTab+delta,{focus:true});$('compact-explainer').scrollIntoView({behavior:reducedCircuitMotion()?'instant':'smooth',block:'start'});}
$('explainer-back').addEventListener('click',()=>footerStage(-1));$('explainer-next').addEventListener('click',()=>footerStage(1));
$('lesson-run').addEventListener('click',()=>requestLesson('build'));
for(const [id,key]of [['lesson-first','start'],['lesson-peak','peak'],['lesson-overshoot','pastPeak']])$(id).addEventListener('click',()=>{if(!grover||grover.busy)return;const rounds=lessonRounds(grover.amplitudes.length,grover.marks.length,grover.peak,grover.maximum);requestLesson('round',rounds[key]);showOperation('before');});
$('lesson-round').addEventListener('input',event=>{if(!grover||grover.busy)return;requestLesson('round',Number(event.target.value));showOperation('before');});
$('lesson-sample').addEventListener('click',()=>requestLesson('measure'));
$('lesson-advance').addEventListener('click',()=>{if(!grover||grover.busy||grover.iteration>=grover.maximum)return;requestLesson('round',grover.iteration+1);showOperation('before');});
for(const button of document.querySelectorAll('[data-quiz]'))button.addEventListener('click',()=>{const [question,choice]=button.dataset.quiz.split('-');for(const peer of document.querySelectorAll('[data-quiz^="'+question+'-"]'))peer.setAttribute('aria-pressed',String(peer===button));$('quiz-'+question).textContent=question==='phase'?(choice==='correct'?'Yes. Changing a to −a leaves |a|² unchanged. Reflection uses those signs to change the next round’s odds.':'The sign flip alone changes phase, not |a|². Compare Before oracle with Phase flip above.'):(choice==='correct'?'Yes. Repeated reflections rotate past the accepted direction. Try First peak, then Past the peak.':'More is not always better. The accepted-set probability oscillates; inspect a later round.');});
for(const [id,position]of [['circuit-previous',-1],['circuit-next',1]])$(id).addEventListener('click',()=>{if(!trace)return;stopCircuit();gatePosition=Math.max(0,Math.min(trace.gates.length,position<0?Math.ceil(gatePosition)-1:Math.floor(gatePosition)+1));updateCircuit();});
for(const button of document.querySelectorAll('[data-circuit-milestone]'))button.addEventListener('click',()=>{if(!trace)return;stopCircuit();const value=button.dataset.circuitMilestone;gatePosition=value==='readout'?trace.gates.length:Number(value);updateCircuit();});
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{if(event.matches)stopCircuit();else if(!playing)stopCircuit();groverGuide?.sync();renderGuide();});
$('circuit-reduce-motion').addEventListener('change',()=>{stopCircuit();groverGuide?.sync();renderGuide();});
function guideContext(){return {scene,amplitudes:grover?.amplitudes,marks:grover?.marks??[],iteration:grover?.iteration,maximum:grover?.maximum,busy:!!grover?.busy||$('find').getAttribute('aria-busy')==='true',available:!!scene&&!$('find').disabled,hidden:activeTab!==1||document.hidden,reducedMotion:reducedCircuitMotion()};}
function renderGuide(){
 const button=$('grover-watch'),replay=$('grover-replay'),note=$('grover-guide-note');if(!button||!replay||!note)return;
 const context=guideContext(),eligibility=guideEligibility(context),state=groverGuide?.state()??{status:'idle',step:null};
 button.disabled=!eligibility.enabled;replay.disabled=!eligibility.enabled;button.setAttribute('aria-pressed',String(state.status==='playing'));
 button.textContent=state.status==='playing'?'Pause round':['paused','manual'].includes(state.status)?context.reducedMotion?'Next exact step':'Resume round':context.reducedMotion?'Start step-by-step':state.status==='complete'?'Watch another round':'Watch one round';
 for(const item of document.querySelectorAll('[data-grover-guide]')){if(item.dataset.groverGuide===state.step)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');}
 const r=state.startRound,next=state.nextRound;
 const copy=state.step==='before'?'Saved round '+r+'. These signed amplitudes are the current state; the scale is shared with the two exact previews. Measurement still uses saved round '+r+'.':state.step==='oracle'?'Saved round '+r+' · phase flip preview. Accepted signs reverse; every squared magnitude stays unchanged. Measurement still uses saved round '+r+'.':state.step==='diffuse'?'Saved round '+r+' · reflection previews round '+next+'. Odds may rise or fall. This preview is not saved; measurement still uses round '+r+'.':'Saved round '+state.savedRound+'. This completed state is now available for measurement. The guide took no sample and stops after this one round.';
 note.textContent=state.step?(copy+(state.reason?' '+state.reason:'')):!eligibility.enabled?eligibility.reason:state.reason||'Start from saved round '+context.iteration+'. Watch exact signs and reflection, then save one round. No automatic rewind or sample.';
}
groverGuide=createRoundGuide({readContext:guideContext,onView:showOperation,onChange:renderGuide,onCommit:round=>{
 // Only this dispatch may cross to r+1 without cancelling its own guide.
 guideCommitDispatch=true;try{requestLesson('round',round);showOperation('before');}finally{guideCommitDispatch=false;}
}});
$('grover-watch')?.addEventListener('click',()=>groverGuide.toggle());
$('grover-replay')?.addEventListener('click',()=>groverGuide.start());
window.addEventListener('wanda-lesson-request',()=>{if(!guideCommitDispatch)groverGuide.cancel('Manual run control selected. Start another preview from the saved round.');});
for(const id of ['measure','iteration','find','replay'])$(id)?.addEventListener(id==='iteration'?'input':'click',()=>{if(!guideCommitDispatch)groverGuide.cancel('The search or measurement control changed. Start another exact preview if needed.');});
renderLesson();
groverDrawing();

let resizeFrame=0;
function redrawResponsive(){
 resizeFrame=0;if(activeTab===0&&trace)updateCircuit();if(activeTab===1)groverDrawing();if(activeTab===2)drawMeasurementBars();
}
function queueResponsiveRedraw(){if(!resizeFrame)resizeFrame=requestAnimationFrame(redrawResponsive);}
const drawResizeObserver=new ResizeObserver(queueResponsiveRedraw);
for(const id of ['circuit-map','joint-state','grover-operation','grover-plane','measurement-bars'])drawResizeObserver.observe($(id));
window.addEventListener('resize',queueResponsiveRedraw);
document.querySelector('#qnn-stage .compact-detail').addEventListener('toggle',queueResponsiveRedraw);
// One handshake after every listener/controller is installed; no rescan or measurement.
window.dispatchEvent(new CustomEvent('wanda-underhood-ready'));
