/** Read-only explanation of the already computed detector predicate. No truth inputs. */
export function addressAt(x,y,grid=64) {
  if(![4,8,16,32,64].includes(grid)||![x,y].every(Number.isFinite)||x<0||y<0||x>512||y>512)throw new RangeError('Expected a supported grid and point inside the scene.');
  const width=512/grid,column=Math.min(grid-1,Math.floor(x/width)),row=Math.min(grid-1,Math.floor(y/width));
  return {index:row*grid+column,row,column,qubits:Math.log2(grid*grid),cellWidth:width};
}

export function inspectPredicate({grid=64,selected,windowScore,threshold,scores,candidates,marks=[],nmsRadius=0}={}) {
  const address=addressAt(selected.x,selected.y,grid),N=grid*grid;
  if(!Number.isFinite(threshold)||threshold<0||threshold>1)throw new RangeError('Expected a finite detector threshold.');
  if(scores==null||candidates==null)return {...address,built:false,N,windowScore,threshold};
  if(scores.length!==N||candidates.length!==N||!Number.isFinite(nmsRadius)||nmsRadius<0)throw new RangeError('Predicate geometry differs from its location register.');
  const unique=new Set(marks);
  if(unique.size!==marks.length||[...unique].some(i=>!Number.isInteger(i)||i<0||i>=N))throw new RangeError('Invalid accepted address set.');
  const best=candidates[address.index],accepted=unique.has(address.index),addressScore=scores[address.index],scorePass=windowScore>=threshold,addressPass=addressScore>=threshold;
  const representative=best.bestX===selected.x&&best.bestY===selected.y;
  const suppressor=addressPass&&!accepted?[...unique].map(i=>candidates[i]).sort((a,b)=>b.score-a.score||a.index-b.index).find(c=>Math.hypot(c.bestX-best.bestX,c.bestY-best.bestY)<=nmsRadius):null;
  return {...address,built:true,N,windowScore,threshold,scorePass,addressPass,addressScore,accepted,representative,
    bestPoint:{x:best.bestX,y:best.bestY},suppressor:suppressor?.index??null,
    acceptedCount:unique.size,aboveThresholdCount:Array.from(scores).filter(v=>v>=threshold).length};
}

export function lessonRounds(N,M,peak,maximum) {
  if(!Number.isInteger(N)||N<1||!Number.isInteger(M)||M<0||M>N||!Number.isInteger(peak)||peak<0||!Number.isInteger(maximum)||maximum<peak)throw new RangeError('Invalid saved Grover run.');
  return {start:0,peak,pastPeak:M>0&&M<N?Math.min(maximum,2*peak+1):peak};
}
