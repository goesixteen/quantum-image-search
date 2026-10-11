/** Presentation geometry only. No scores, quantum gates, probabilities or sampling. */
const positive=(value,name)=>{if(!Number.isFinite(value)||value<=0)throw new RangeError(name+' must be positive and finite.');return value;};

/** CSS-pixel coordinates, with a bounded high-DPI backing store. */
export function surfaceSpec(width,height,devicePixelRatio=1){
  positive(width,'Width');positive(height,'Height');positive(devicePixelRatio,'Pixel ratio');
  const ratio=Math.max(1,Math.min(2,devicePixelRatio));
  const pixelWidth=Math.max(1,Math.round(width*ratio)),pixelHeight=Math.max(1,Math.round(height*ratio));
  return {width,height,pixelWidth,pixelHeight,scaleX:pixelWidth/width,scaleY:pixelHeight/height,ratio};
}

/** A consecutive, explicitly labelled slice of the actual ordered layer. */
export function circuitViewport(gates,activeGateIndex,width){
  positive(width,'Width');
  if(!Array.isArray(gates)||!gates.length||!Number.isInteger(activeGateIndex))throw new TypeError('An ordered gate list and integer gate index are required.');
  if(gates.some((g,i)=>!Number.isInteger(g.index)||(i&&g.index<=gates[i-1].index)))throw new RangeError('Gate indices must be strictly increasing.');
  const capacity=Math.max(1,Math.floor((width-64)/36)),count=Math.min(gates.length,capacity);
  let local=gates.findIndex(g=>g.index>=activeGateIndex);if(local<0)local=gates.length-1;
  const start=Math.max(0,Math.min(gates.length-count,local-Math.floor((count-1)/2)));
  return {gates:gates.slice(start,start+count),start,end:start+count,total:gates.length,complete:count===gates.length};
}

/** Some addresses for signed bars. All probabilities remain in the saved state. */
export function representativeAddresses(N,marks,width){
  positive(width,'Width');
  if(!Number.isSafeInteger(N)||N<1)throw new RangeError('Address count must be a positive integer.');
  const accepted=Array.from(new Set(marks));
  if(accepted.some(i=>!Number.isSafeInteger(i)||i<0||i>=N))throw new RangeError('Invalid accepted address.');
  const capacity=Math.min(20,Math.max(3,Math.floor((width-48)/36)));
  if(N<=capacity)return Array.from({length:N},(_,i)=>i);
  const result=new Set(accepted.slice(0,Math.min(4,Math.max(1,Math.floor(capacity/3)))));
  // Uniformly spread reference addresses, including both ends when space allows.
  const references=capacity-result.size;
  for(let i=0;i<references;i++)result.add(Math.round(i*(N-1)/(references-1)));
  for(let i=0;result.size<capacity;i++)result.add(i);
  return [...result].sort((a,b)=>a-b);
}

/** Responsive 16-basis diagram; the narrow 4x4 view keeps bitstrings readable. */
export function basisLayout(width){
  positive(width,'Width');const columns=width<500?4:16,rows=16/columns,margin=12,top=28,rowHeight=rows>1?82:160;
  return {width,height:top+rows*rowHeight+10,columns,rows,margin,top,rowHeight,cellWidth:(width-2*margin)/columns};
}

export function basisIndexAt(layout,x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y))throw new TypeError('Pointer coordinates must be finite.');
  const column=Math.max(0,Math.min(layout.columns-1,Math.floor((x-layout.margin)/layout.cellWidth)));
  const row=Math.max(0,Math.min(layout.rows-1,Math.floor((y-layout.top)/layout.rowHeight)));
  return row*layout.columns+column;
}

/** Signed heights on the common scale, including subpixel tails and exact zero. */
export function signedBarGeometry(amplitude,maximum,baseline,range){
  if(!Number.isFinite(amplitude)||!Number.isFinite(baseline))throw new TypeError('Amplitude and baseline must be finite.');
  positive(maximum,'Amplitude scale');positive(range,'Plot range');
  const height=Math.abs(amplitude)*range/maximum;
  return {top:amplitude>=0?baseline-height:baseline,height,tip:baseline-amplitude*range/maximum};
}
