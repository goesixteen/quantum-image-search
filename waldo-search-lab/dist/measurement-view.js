/**
 * measurement-view.js: summarizes Born-rule measurement probabilities of a saved Grover
 * state (stage 5): total, minimum and maximum probability for accepted vs. unmarked addresses.
 *   summarizeMeasurement(amplitudes, markedIndices): exact values with no renormalisation
 *   or sampling; unnormalised states and invalid accepted sets throw. Used by underhood.js.
 */
/** Exact saved-state measurement summary. No score, color, truth, or sampling. */
import {probabilities} from './quantum.js';

export function summarizeMeasurement(amplitudes,markedIndices) {
  const distribution=Float64Array.from(probabilities(amplitudes)),N=distribution.length;
  const norm=distribution.reduce((sum,p)=>sum+p,0);
  if(Math.abs(norm-1)>1e-9)throw new RangeError('The saved quantum state must be normalized.');
  if(!markedIndices||typeof markedIndices[Symbol.iterator]!=='function')throw new TypeError('Accepted addresses must be iterable.');
  const indices=Array.from(markedIndices),marks=new Set(indices);
  if(marks.size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=N))throw new RangeError('Invalid accepted address set.');
  function group(accepted) {
    let count=0,total=0,minimum=Infinity,maximum=-Infinity;
    distribution.forEach((p,i)=>{if(marks.has(i)===accepted){count++;total+=p;minimum=Math.min(minimum,p);maximum=Math.max(maximum,p);}});
    const uniform=count===0||maximum===minimum;
    return {count,total,uniform,eachProbability:count&&uniform?minimum:null,minimum:count?minimum:null,maximum:count?maximum:null};
  }
  return {N,M:marks.size,norm,probabilities:distribution,accepted:group(true),unmarked:group(false)};
}
