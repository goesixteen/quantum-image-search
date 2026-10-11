/** Smooth DISPLAY fields from actual detector scores and Grover snapshots.
 * No detector, oracle, target coordinates, truth masks, randomness or DOM use.
 * Raster values are visualization samples, never a replacement statevector.
 */
const axisCache=new Map();
const clamp01=x=>Math.max(0,Math.min(1,x));
function bounded(value,name,low,high) {
  if(!Number.isFinite(value)||value<low||value>high)throw new RangeError(`${name} must be within ${low}..${high}.`);
  return value;
}
function shape(grid,fieldSize,sigmaCells) {
  if(!Number.isInteger(grid)||grid<1||grid>64)throw new RangeError('grid must be an integer within 1..64.');
  if(!Number.isInteger(fieldSize)||fieldSize<1||fieldSize>512)throw new RangeError('fieldSize must be an integer within 1..512.');
  bounded(sigmaCells,'sigmaCells',.25,8);
}
function vector(source,count,name,probability=false) {
  if(!source||(!Array.isArray(source)&&!ArrayBuffer.isView(source))||source.length!==count)throw new RangeError(`${name} needs exactly ${count} numeric entries.`);
  const result=Float64Array.from(source);let sum=0;
  for(const v of result){bounded(v,name,0,1);sum+=v;}
  if(probability&&Math.abs(sum-1)>1e-8)throw new RangeError(`${name} must sum to 1.`);
  return result;
}
function axisWeights(grid,resolution,sigma,mode='average') {
  const key=`${grid}:${resolution}:${sigma}:${mode}`;
  if(axisCache.has(key))return axisCache.get(key);
  const radius=mode==='envelope'?3*sigma:Math.max(1,3*sigma),weights=Array.from({length:resolution},(_,p)=>{
    const coordinate=(p+.5)*grid/resolution-.5,indices=[],values=[];
    const lower=Math.max(0,Math.ceil(coordinate-radius)),upper=Math.min(grid-1,Math.floor(coordinate+radius));let total=0;
    for(let i=lower;i<=upper;i++){const w=Math.exp(-.5*((coordinate-i)/sigma)**2);indices.push(i);values.push(w);total+=w;}
    const denominator=mode==='envelope'?Math.max(...values):total;
    return {indices,values:values.map(w=>w/denominator)};
  });
  if(axisCache.size>=32)axisCache.clear();axisCache.set(key,weights);return weights;
}
/** Separable normalized Gaussian interpolation; constants remain constants.
 * Truncated at3sigma, clipped and renormalized at edges; no wrapped peaks.
 */
function interpolate(source,grid,fieldSize,sigmaCells) {
  const weights=axisWeights(grid,fieldSize,sigmaCells),horizontal=new Float64Array(grid*fieldSize),values=new Float64Array(fieldSize**2);
  for(let row=0;row<grid;row++)for(let x=0;x<fieldSize;x++){
    const axis=weights[x];let value=0;
    for(let k=0;k<axis.indices.length;k++)value+=source[row*grid+axis.indices[k]]*axis.values[k];horizontal[row*fieldSize+x]=value;
  }
  for(let y=0;y<fieldSize;y++)for(let x=0;x<fieldSize;x++){
    const axis=weights[y];let value=0;
    for(let k=0;k<axis.indices.length;k++)value+=horizontal[axis.indices[k]*fieldSize+x]*axis.values[k];values[y*fieldSize+x]=clamp01(value);
  }
  return values;
}
/** F(x,y)=max_i(score_i G_i(x,y))/max_i(G_i(x,y)).
 * Cartesian address centers make both the Gaussian kernel and its maximum
 * denominator separable. Each axis is clipped to3sigma and normalized by max.
 * This is a display envelope, not a probability distribution or density.
 */
function interpolateEnvelope(source,grid,fieldSize,sigmaCells) {
  const weights=axisWeights(grid,fieldSize,sigmaCells,'envelope'),horizontal=new Float64Array(grid*fieldSize),values=new Float64Array(fieldSize**2);
  for(let row=0;row<grid;row++)for(let x=0;x<fieldSize;x++){
    const axis=weights[x];let value=0;
    for(let k=0;k<axis.indices.length;k++)value=Math.max(value,source[row*grid+axis.indices[k]]*axis.values[k]);horizontal[row*fieldSize+x]=value;
  }
  for(let y=0;y<fieldSize;y++)for(let x=0;x<fieldSize;x++){
    const axis=weights[y];let value=0;
    for(let k=0;k<axis.indices.length;k++)value=Math.max(value,horizontal[axis.indices[k]*fieldSize+x]*axis.values[k]);values[y*fieldSize+x]=clamp01(value);
  }
  return values;
}
function summarize(values,width) {
  let minimum=Infinity,maximum=-Infinity,peakIndex=0;
  values.forEach((v,i)=>{minimum=Math.min(minimum,v);if(v>maximum){maximum=v;peakIndex=i;}});
  return {minimum,maximum,isFlat:maximum-minimum<1e-12,peak:{x:peakIndex%width,y:Math.floor(peakIndex/width),value:maximum}};
}
function field(values,grid,fieldSize,sigmaCells,intensities,label) {
  return {width:fieldSize,height:fieldSize,grid,sigmaCells,values,intensities,label,...summarize(values,fieldSize),displayOnly:true,
    interpolation:'Locally normalized Gaussian interpolation on address centers;3sigma support, no edge wrap. Raster samples are not measurement probabilities.'};
}

/** Use matches.candidates.map(c=>c.registrationScore) for the full template
 * evidence landscape, or state.scores for accepted-score/QNN landscape.
 * Similarity scores are not calibrated probabilities. Fixed tone mapping keeps
 * weak inputs weak: no per-frame min/max stretching or invented scan texture.
 */
export function buildCandidateField({candidateScores,grid,fieldSize=128,sigmaCells=.85,source='detector score',scorePower=.6,interpolationMode='average'}={}) {
  shape(grid,fieldSize,sigmaCells);bounded(scorePower,'scorePower',.1,4);
  if(!['average','envelope'].includes(interpolationMode))throw new RangeError('interpolationMode must be average or envelope.');
  const sourceScores=vector(candidateScores,grid**2,'candidateScores'),values=(interpolationMode==='envelope'?interpolateEnvelope:interpolate)(sourceScores,grid,fieldSize,sigmaCells);
  const intensities=Float64Array.from(values,v=>v**scorePower);
  const result={...field(values,grid,fieldSize,sigmaCells,intensities,interpolationMode==='envelope'?`Max-Gaussian ${source} score envelope; display only, not calibrated target probability or person similarity.`:`Smoothed ${source}; detector evidence, not calibrated target probability.`),
    sourceScores,source,scorePower,interpolationMode,hasEvidence:sourceScores.some(v=>v>0),units:'detector score within0..1'};
  if(interpolationMode==='envelope')result.interpolation='Maximum score × Gaussian / maximum Gaussian, separable axis support clipped at3sigma without wrapping. Preserves constants and the global score bound; display samples are not Born probabilities or person-similarity estimates.';
  return result;
}

/** Crossfade measured detector evidence into a Gaussian display of actual
 * Born probabilities. progress is presentation crossfade only, not a quantum
 * circuit fraction. Optional roundProgress crossfades two recorded snapshots,
 * not an intermediate gate state; exactProbabilities always stores the supplied
 * current snapshot for sampling/inspection. Do not sample intensities/values.
 */
export function buildSearchDisplayField({candidateField=null,candidateScores=null,probabilities,previousProbabilities=null,
  grid,phase='amplification',progress=1,roundProgress=1,fieldSize=candidateField?.width??128,
  sigmaCells=candidateField?.sigmaCells??.85,source='detector score'}={}) {
  shape(grid,fieldSize,sigmaCells);bounded(progress,'progress',0,1);bounded(roundProgress,'roundProgress',0,1);
  if(!['candidate','amplification','probability'].includes(phase))throw new RangeError('phase must be candidate, amplification or probability.');
  if(candidateField&&(candidateField.grid!==grid||candidateField.width!==fieldSize||candidateField.height!==fieldSize))throw new RangeError('candidateField dimensions must match.');
  if(!candidateField&&candidateScores)candidateField=buildCandidateField({candidateScores,grid,fieldSize,sigmaCells,source});
  const candidateIntensities=candidateField?vector(candidateField.intensities,fieldSize**2,'candidateField intensities'):null;
  const exactProbabilities=vector(probabilities,grid**2,'probabilities',true),previous=previousProbabilities?vector(previousProbabilities,grid**2,'previousProbabilities',true):null;
  const displayProbabilities=previous?Float64Array.from(exactProbabilities,(v,i)=>previous[i]*(1-roundProgress)+v*roundProgress):exactProbabilities.slice();
  const probabilityValues=interpolate(displayProbabilities,grid,fieldSize,sigmaCells);
  const denominator=Math.log1p(grid**2),probabilityIntensities=Float64Array.from(probabilityValues,v=>clamp01(Math.log1p(v*grid**2)/denominator));
  const blend=phase==='candidate'?0:phase==='probability'?1:progress*progress*(3-2*progress);
  const values=Float64Array.from(probabilityIntensities,(v,i)=>clamp01((1-blend)*(candidateIntensities?.[i]??0)+blend*v));
  return {...field(values,grid,fieldSize,sigmaCells,values,'Smoothed search display; Gaussian kernel and snapshot/evidence crossfades are visualization only.'),
    exactProbabilities,displayProbabilities,probabilityValues,probabilityIntensities,candidateField,blend,phase,progress,roundProgress,
    units:'display intensity within0..1, not Born probability',
    probabilityScale:'Fixed log1p(N × smoothed per-address probability)/log1p(N); uniform input remains spatially uniform.',
    hasDetectorEvidence:candidateField?.hasEvidence??false,
    exactUniform:Math.max(...exactProbabilities)-Math.min(...exactProbabilities)<1e-12};
}

/** Ready for new ImageData(colorizeField(field),field.width,field.height).
 * Draw to a small offscreen Canvas and scale it with smoothing enabled.
 * Palette is a fixed cool-to-warm mapping; alpha never uses a frame maximum.
 * exposure changes only the palette position clamp(intensity × exposure,0,1).
 * Its fixed multiplicative mapping is monotonic, saturates at1, and never
 * renormalizes by observed field maxima or changes alpha/probabilities.
 */
export function colorizeField(displayField,{opacity=.78,transparentZero=true,exposure=1}={}) {
  bounded(opacity,'opacity',0,1);bounded(exposure,'exposure',.25,4);const intensities=displayField?.intensities;
  if(!intensities||intensities.length!==displayField.width*displayField.height)throw new TypeError('A display field is required.');
  const colors=[[22,57,116],[27,136,161],[68,200,175],[251,209,86],[246,102,55],[255,245,211]],data=new Uint8ClampedArray(intensities.length*4);
  intensities.forEach((value,i)=>{bounded(value,'intensity',0,1);const t=clamp01(value*exposure)*(colors.length-1),a=Math.min(colors.length-2,Math.floor(t)),f=t-a;
    for(let channel=0;channel<3;channel++)data[i*4+channel]=Math.round(colors[a][channel]*(1-f)+colors[a+1][channel]*f);
    data[i*4+3]=Math.round(255*opacity*(transparentZero?Math.sqrt(value):1));
  });return data;
}
