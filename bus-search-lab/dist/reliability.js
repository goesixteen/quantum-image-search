import { computeOracleReliability } from './oracle-reliability.js';
const byId = id => document.getElementById(id);
const count = byId('reliability-true-count'), recall = byId('reliability-recall'), fpr = byId('reliability-fpr');
const percent = value => (100 * value).toFixed(2) + '%';
const configuration = () => ({ trueCount: Number(count.value), recall: Number(recall.value) / 100, falsePositiveRate: Number(fpr.value) / 100 });

function probabilityRow(label, value, className) {
  const row=document.createElement('div'); row.className='reliability-bar '+className;
  const text=document.createElement('span'); text.textContent=label;
  const track=document.createElement('div'), fill=document.createElement('i'); track.className='reliability-track'; fill.style.width=100*value+'%'; track.append(fill);
  const number=document.createElement('strong'); number.textContent=percent(value); row.append(text,track,number); return row;
}
function study(result) {
  const article=document.createElement('article');article.className='reliability-study';
  const heading=document.createElement('h2');heading.textContent=result.parameters.N+' candidate regions';article.append(heading);
  article.append(probabilityRow('True target',result.expectedTrueTargetMass,'true-bar'),probabilityRow('Accepted set',result.expectedPredicateMass,'accepted-bar'));
  const stats=document.createElement('div');stats.className='reliability-small-stats';
  for(const [label,value]of[['Any false mark',percent(result.anyFalseMarkProbability)],['Empty oracle',percent(result.emptyOracleProbability)],['Mean search rounds',result.expectedGroverIterations.toFixed(2)]]) {
    const item=document.createElement('div'),text=document.createElement('span'),number=document.createElement('strong');text.textContent=label;number.textContent=value;item.append(text,number);stats.append(item);
  }
  article.append(stats);const cost=document.createElement('p');cost.textContent=result.resources.classicalDetectorEvaluationsForCompiledOracle+' classical detector calls to compile this oracle · '+result.resources.addressQubits+' search qubits';article.append(cost);
  return article;
}
function render() {
  const params=configuration();byId('true-count-value').textContent=params.trueCount;byId('recall-value').textContent=(100*params.recall).toFixed(0)+'%';byId('fpr-value').textContent=(100*params.falsePositiveRate).toFixed(1)+'%';recall.disabled=params.trueCount===0;
  const results=[16,64].map(N=>computeOracleReliability({N,...params}));byId('reliability-studies').replaceChildren(...results.map(study));
  byId('reliability-result').textContent=params.trueCount===0?'There is no target. Any accepted set is entirely wrong, even if its probability is high.':`Under these hypothetical rates, true-target probability is ${percent(results[0].expectedTrueTargetMass)} with 16 regions and ${percent(results[1].expectedTrueTargetMass)} with 64. More acceptance alone does not mean better recognition.`;
  document.querySelectorAll('[data-reliability-case]').forEach(button=>{
    const expected={normal:{trueCount:1,recall:.9,falsePositiveRate:.01},perfect:{trueCount:1,recall:1,falsePositiveRate:0},absent:{trueCount:0,recall:.9,falsePositiveRate:.01}}[button.dataset.reliabilityCase];button.setAttribute('aria-pressed',String(Object.keys(expected).every(key=>params[key]===expected[key])));
  });
}
for(const input of[count,recall,fpr])input.addEventListener('input',render);
document.querySelectorAll('[data-reliability-case]').forEach(button=>button.addEventListener('click',()=>{
  count.value=button.dataset.reliabilityCase==='absent'?'0':'1';recall.value=button.dataset.reliabilityCase==='perfect'?'100':'90';fpr.value=button.dataset.reliabilityCase==='perfect'?'0':'1';render();
}));
render();
