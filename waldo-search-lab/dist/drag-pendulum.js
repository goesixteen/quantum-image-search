/**
 * drag-pendulum.js: the swinging "held by the hand" preview shown while Wanda is dragged.
 * Presentation only; outside the quantum pipeline. stepDragPendulum({reducedMotion}) keeps
 * the sprite upright (no swing) when app.js reports prefers-reduced-motion.
 */
/**
 * Presentation-only hanging-sprite motion. Times are monotonic milliseconds,
 * normally performance.now(); pointer coordinates are viewport CSS pixels.
 *
 * create/set retain one state object. step returns a finite render snapshot.
 * Place the sprite's hand at snapshot.x/y and rotate around that hand by
 * angleRadians. Positive CSS rotation makes a body below the hand trail left
 * behind a pointer travelling right. Nothing here changes the dropped image.
 */
const MAX_ANGLE=.65;
const MAX_SPEED=2500;
const MAX_ANGULAR_SPEED=8;
const clamp=(value,low,high)=>Math.min(high,Math.max(low,value));
const finite=value=>Number.isFinite(value);
const boundedSpeed=(distance,seconds)=>{
  const speed=distance/seconds;
  return finite(speed)?clamp(speed,-MAX_SPEED,MAX_SPEED):Number.isNaN(speed)?0:Math.sign(speed)*MAX_SPEED;
};

function validatePoint({x,y,now}){
  if(![x,y,now].every(finite))throw new TypeError('Drag point and time must be finite.');
}

export function createDragPendulum({x,y,now}){
  validatePoint({x,y,now});
  return {x,y,angleRadians:0,angularVelocity:0,velocityX:0,velocityY:0,
    sampleX:x,sampleY:y,lastPointerTime:now,lastStepTime:now};
}

function recentVelocity(state,now){
  // Native drag events can arrive less often than animation frames. Briefly
  // retain a sample, then let its influence fade when the mouse stops.
  const age=Math.max(0,now-state.lastPointerTime-45);
  const decay=Math.exp(-age/110);
  return {vx:state.velocityX*decay,vy:state.velocityY*decay};
}

export function setDragPointer(state,{x,y,now}){
  validatePoint({x,y,now});
  state.x=x;state.y=y;
  const elapsed=now-state.lastPointerTime;
  // Duplicate or out-of-order timestamps still move the hand immediately.
  // Keep the velocity sample until time advances; never divide by zero.
  if(elapsed<1)return state;
  const seconds=elapsed/1000;
  const previous=recentVelocity(state,now);
  const blend=1-Math.exp(-elapsed/45);
  const vx=boundedSpeed(x-state.sampleX,seconds);
  const vy=boundedSpeed(y-state.sampleY,seconds);
  state.velocityX=previous.vx+(vx-previous.vx)*blend;
  state.velocityY=previous.vy+(vy-previous.vy)*blend;
  state.sampleX=x;state.sampleY=y;state.lastPointerTime=now;
  return state;
}

export function stepDragPendulum(state,now,{reducedMotion=false}={}){
  if(!finite(now))throw new TypeError('Drag animation time must be finite.');
  const clock=Math.max(state.lastStepTime,now);
  const elapsed=Math.min(.05,(clock-state.lastStepTime)/1000);
  state.lastStepTime=clock;
  const {vx,vy}=recentVelocity(state,clock);
  if(reducedMotion){
    state.angleRadians=0;state.angularVelocity=0;
  }else if(elapsed>0){
    // An underdamped spring follows a speed-dependent lean, then swings back
    // through the vertical when movement stops. Small substeps keep sparse
    // native events, slow frames and resumed tabs numerically well behaved.
    const restAngle=.5*Math.tanh(vx/900);
    const count=Math.ceil(elapsed/(1/120)),dt=elapsed/count;
    for(let i=0;i<count;i++){
      const acceleration=100*(restAngle-state.angleRadians)-6.2*state.angularVelocity;
      state.angularVelocity=clamp(state.angularVelocity+acceleration*dt,-MAX_ANGULAR_SPEED,MAX_ANGULAR_SPEED);
      state.angleRadians+=state.angularVelocity*dt;
      if(Math.abs(state.angleRadians)>MAX_ANGLE){
        state.angleRadians=clamp(state.angleRadians,-MAX_ANGLE,MAX_ANGLE);
        if(state.angleRadians*state.angularVelocity>0)state.angularVelocity=0;
      }
    }
    if(Math.abs(state.angleRadians)<.0001&&Math.abs(state.angularVelocity)<.001&&Math.abs(vx)<1){
      state.angleRadians=0;state.angularVelocity=0;
    }
  }
  return {x:state.x,y:state.y,angleRadians:state.angleRadians,vx,vy};
}
