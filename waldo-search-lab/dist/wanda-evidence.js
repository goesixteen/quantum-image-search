/**
 * wanda-evidence.js: renders the frozen Wanda QNN's reserved-test metrics (and the
 * matched logistic baseline) from model/wanda-qnn-metrics.json into #wanda-metrics.
 * Pipeline role: reports evaluation of stage 2; no inference happens here.
 *   renderWandaEvidence(metrics): metrics is the parsed JSON, or null while unavailable.
 */
const pct=x=>(100*x).toFixed(1)+'%';
export function renderWandaEvidence(metrics){
 if(!metrics?.qnn?.sceneMetrics?.test){document.getElementById('wanda-test-scope').textContent='Wanda’s model is trained and frozen. Reserved test evaluation is running; final numbers will appear when the record is ready. Historical accuracy is kept separate below.';return;}
 const q=metrics.qnn,l=metrics.logistic,s=q.sceneMetrics.test,w=q.windowMetrics.test,ls=l.sceneMetrics.test;
 const cards=[['Native reserved scenes',s.completeHits+' / '+s.targetScenes],['Native empty false points',s.absenceFalsePointScenes+' / '+s.absenceScenes],['Native window recall',pct(w.recall)],['Learned classifier', '4 qubits / 4 layers']];
 const container=document.getElementById('wanda-metrics');container.replaceChildren();
 for(const [label,value]of cards){const card=document.createElement('div'),title=document.createElement('span'),n=document.createElement('strong');title.textContent=label;n.textContent=value;card.append(title,n);container.append(card);}
 const wrongPoints=s.targetFalsePointScenes===1?'1 scene contains':s.targetFalsePointScenes+' scenes contain';
 document.getElementById('wanda-test-scope').textContent='Native-rendered held-out placements of this same Wanda PNG in the original five unseeded backgrounds, fully visible, at five supplied heights: 40, 46, 52, 58 and 64 px. At the frozen '+pct(s.threshold)+' threshold: '+s.completeHits+' / '+s.targetScenes+' complete target scenes; '+wrongPoints+' an incorrect accepted point. The matched logistic baseline completes '+ls.completeHits+' / '+ls.targetScenes+' scenes. These figures measure the accepted point set before sampling, with a fixed 6.66 px center tolerance. They do not cover the newly curated Park lookalike variant, browser accuracy, unseen artwork, hidden targets or arbitrary people.';
 const c=metrics.quantumContribution;
 if(c?.trainedValidation&&c?.zeroThetaSameReadout?.metrics){const t=c.trainedValidation,z=c.zeroThetaSameReadout.metrics,i=c.initialThetaSameReadout?.metrics;document.getElementById('wanda-participation').textContent='Quantum-angle participation check, using the same learned readout: trained rotations recover '+t.true_positive+' positive validation windows; zero rotations recover '+z.true_positive+(i?', initial untrained rotations recover '+i.true_positive:'')+'. Both quantum angles and classical readout were fitted. This control measures circuit participation, not quantum advantage.';}
 else document.getElementById('wanda-participation').textContent='Both the quantum angles and the classical readout were fitted. The downloadable evidence records the frozen selection and circuit-participation controls; benchmark differences do not establish quantum advantage.';
}
