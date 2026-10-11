/** Interaction ownership only; this module never reads image pixels or model outputs. */
export function createLatestOperation(){
  let revision=0;
  return {start:()=>++revision,cancel:()=>{revision++;},isCurrent:token=>token===revision};
}

/** Only the latest operation may advance asynchronous steps or commit its result. */
export async function runLatestOperation(owner,steps,commit){
  const token=owner.start();
  for(const step of steps){
    if(!owner.isCurrent(token))return false;
    const accepted=await step(token);
    if(!owner.isCurrent(token)||accepted===false)return false;
  }
  if(!owner.isCurrent(token))return false;
  commit();return true;
}

const pointFinite=point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.y);
export function createPointerSession({pointerId,tool,point,center,rect,radius}){
  if(!Number.isInteger(pointerId)||!['move','paint','erase'].includes(tool)||!pointFinite(point))throw new TypeError('Invalid pointer session.');
  if(tool==='move'){
    if(!pointFinite(center)||!rect||![rect.x,rect.y,rect.width,rect.height].every(Number.isFinite))throw new TypeError('Move geometry must be finite.');
    const inside=point.x>=rect.x&&point.x<=rect.x+rect.width&&point.y>=rect.y&&point.y<=rect.y+rect.height;
    return {pointerId,tool,offset:inside?{x:point.x-center.x,y:point.y-center.y}:{x:0,y:0}};
  }
  if(!Number.isFinite(radius)||radius<=0)throw new RangeError('Brush radius must be positive.');
  return {pointerId,tool,path:{type:'stroke',points:[[point.x,point.y]],radius,operation:tool==='erase'?'erase':'paint'}};
}

export function pointerAction(session,pointerId,point){
  if(!session||session.pointerId!==pointerId)return null;
  if(!pointFinite(point))throw new TypeError('Pointer coordinates must be finite.');
  return session.tool==='move'?{type:'move',x:point.x-session.offset.x,y:point.y-session.offset.y}:{type:'stroke',path:session.path,point:[point.x,point.y]};
}
