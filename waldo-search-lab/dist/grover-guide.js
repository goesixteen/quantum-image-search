/** One exact round's presentation lifecycle. No interpolation, probabilities or sampling. */
export function guideEligibility(context){
  if(!context?.scene||!context.amplitudes)return {enabled:false,reason:'Read this image first to build its saved location state.'};
  if(context.busy||!context.available)return {enabled:false,reason:'Wait for the image or search to finish.'};
  if(!context.marks.length)return {enabled:false,reason:'Empty oracle: the demo abstains; there is no accepted location to amplify.'};
  if(context.marks.length===context.amplitudes.length)return {enabled:false,reason:'Every address is accepted; amplification cannot distinguish them.'};
  if(context.iteration>=context.maximum)return {enabled:false,reason:'This is the last saved round. Choose an earlier round to inspect one more.'};
  return {enabled:true,reason:''};
}

export function createRoundGuide({readContext,onView,onCommit,onChange=()=>{},setTimer=setTimeout,clearTimer=clearTimeout,delay=2000}){
  if(!Number.isFinite(delay)||delay<=0)throw new RangeError('Guide delay must be positive.');
  const phases=['before','oracle','diffuse','complete'];
  let base=null,committed=null,step=-1,status='idle',generation=0,timer=null,committing=false,reason='';
  const clear=()=>{generation++;if(timer!=null)clearTimer(timer);timer=null;};
  const same=(a,b)=>a&&b&&a.scene===b.scene&&a.amplitudes===b.amplitudes&&a.marks===b.marks&&a.iteration===b.iteration&&a.maximum===b.maximum;
  const state=()=>({status,step:phases[step]??null,startRound:base?.iteration??null,savedRound:committed?.iteration??base?.iteration??null,nextRound:base?base.iteration+1:null,reason});
  const changed=()=>onChange(state());
  function cancel(message='The saved run changed. Start a new one-round preview.'){
    clear();base=null;committed=null;step=-1;status='idle';reason=message;changed();
  }
  function pause(message='Paused. Resume keeps the same saved round and exact preview.'){
    if(!base||status==='complete'||status==='idle')return false;clear();status=readContext()?.reducedMotion?'manual':'paused';reason=message;changed();return true;
  }
  function sync(){
    if(!base)return true;const current=readContext();
    // The only allowed identity transition is this guide's synchronous, one-round commit.
    if(committing&&current?.scene===base.scene&&current.marks===base.marks&&current.iteration===base.iteration+1&&!current.busy)return true;
    if(!same(status==='complete'?committed:base,current)||current.busy||!current.available){cancel();return false;}
    if(current.hidden&&status==='playing')pause('Paused while this view is hidden. Resume requires the same saved state.');
    else if(current.reducedMotion&&status==='playing')pause('Reduced animations: advance each exact step explicitly.');
    return true;
  }
  function schedule(){
    const owner=generation;
    timer=setTimer(()=>{timer=null;if(owner!==generation||status!=='playing'||!sync()||owner!==generation||status!=='playing')return;if(readContext().hidden)return;advance();},delay);
  }
  function advance(){
    if(!sync()||!base||status==='complete'||readContext().hidden)return false;
    clear();step++;
    if(step<3){onView(phases[step]);reason='';changed();if(status==='playing')schedule();return true;}
    // Mark the transaction before dispatch: its own saved-round event is synchronous.
    status='complete';committing=true;reason='';
    try{onCommit(base.iteration+1);}finally{committing=false;}
    const current=readContext();
    if(!base||!current||current.scene!==base.scene||current.marks!==base.marks||current.iteration!==base.iteration+1||current.busy||!current.available){cancel('The round was not saved; the run changed or became unavailable.');return false;}
    committed={...current};changed();return true;
  }
  function start(){
    const current=readContext(),eligibility=guideEligibility(current);
    if(!eligibility.enabled||current.hidden){cancel(eligibility.reason||'Open Grover interference to watch this round.');return false;}
    clear();base={...current};committed=null;step=0;status=current.reducedMotion?'manual':'playing';reason='';onView('before');changed();if(status==='playing')schedule();return true;
  }
  function toggle(){
    if(status==='playing')return pause();
    if(status==='idle'||status==='complete')return start();
    if(!sync()||readContext().hidden)return false;
    if(readContext().reducedMotion){status='manual';return advance();}
    status='playing';reason='';changed();schedule();return true;
  }
  return {state,start,toggle,pause,cancel,sync};
}
