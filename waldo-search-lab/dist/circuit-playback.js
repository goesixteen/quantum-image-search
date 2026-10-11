/**
 * circuit-playback.js: gate-by-gate playback position for the QNN circuit explainer.
 * Pipeline role: presentation of the classifier circuit (stage 2) only; it never changes
 * gates, parameters or readouts. Used by underhood.js and tests/circuit-playback.test.mjs.
 */
/** Playback ownership and exact gate coordinates only; no circuit or readout changes. */
function positionValid(trace,position){
  if(!Array.isArray(trace?.gates)||!trace.gates.length||!Number.isFinite(position)||position<0||position>trace.gates.length)throw new RangeError('Position must lie inside an ordered circuit trace.');
}

export function layerPlaybackBounds(trace,position){
  positionValid(trace,position);const gates=trace.gates;
  if(position===gates.length)return {finished:true,layer:gates.at(-1).layer,start:gates.length,end:gates.length};
  const index=Math.floor(position),layer=gates[index].layer;
  let start=index,end=index+1;while(start>0&&gates[start-1].layer===layer)start--;while(end<gates.length&&gates[end].layer===layer)end++;
  return {finished:false,layer,start,end};
}

/** A layer boundary presents the last gate AFTER its exact endpoint, not the next gate. */
export function circuitFramePosition(trace,position){
  positionValid(trace,position);const boundary=Number.isInteger(position)&&position>0&&(position===trace.gates.length||trace.gates[position-1].layer!==trace.gates[position].layer);
  return boundary?{gateIndex:position-1,progress:1,boundary:true,layer:trace.gates[position-1].layer}:{gateIndex:Math.floor(position),progress:position-Math.floor(position),boundary:false,layer:trace.gates[Math.floor(position)].layer};
}

export function createCircuitPlayback(){
  let generation=0,run=null;
  function stop(){generation++;run=null;}
  function start(context){
    stop();if(!context?.trace||!context.scene||!context.available||!context.visible||context.reducedMotion)return null;
    const bounds=layerPlaybackBounds(context.trace,context.position);if(bounds.finished)return null;
    run={token:generation,trace:context.trace,scene:context.scene,start:context.position,end:bounds.end,layer:bounds.layer};return run.token;
  }
  const owns=token=>!!run&&token===run.token;
  function advance(token,context,elapsedSeconds,speed){
    // A stale callback must not cancel a newer run or touch its position.
    if(!owns(token))return null;
    if(context.trace!==run.trace||context.scene!==run.scene||!context.available||!context.visible||context.reducedMotion||context.position<run.start||context.position>run.end){stop();return null;}
    if(!Number.isFinite(elapsedSeconds)||elapsedSeconds<0||!Number.isFinite(speed)||speed<=0)throw new RangeError('Playback timing must be finite and nonnegative.');
    const position=Math.min(run.end,context.position+Math.min(.1,elapsedSeconds)*speed),complete=position===run.end,layer=run.layer;
    if(complete)stop();return {position,complete,layer};
  }
  return {start,stop,owns,advance};
}
