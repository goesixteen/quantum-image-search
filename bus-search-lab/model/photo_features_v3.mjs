/** Experimental photo-relative-v3 pixel extractor. No placement/alpha inputs. */
export const FEATURE_VERSION = 'photo-relative-v3';
export const FEATURE_NAMES = ['warm_coverage','warm_aspect','relative_window_runs',
  'relative_window_darkness','window_spacing','relative_wheel_runs','lower_warm_fill','relative_lower_darkness'];

function median(values) {
  values.sort((a,b)=>a-b);
  const n=values.length;
  return n ? (n%2 ? values[(n-1)/2] : (values[n/2-1]+values[n/2])/2) : 0;
}
function runs(profile,threshold) {
  const out=[];let start=-1;
  for(let i=0;i<=profile.length;i++) {
    if(i<profile.length && profile[i]>threshold) { if(start<0)start=i; }
    else if(start>=0) { out.push([start,i]);start=-1; }
  }
  return out;
}
function meanRegion(mask,w,xa,xb,ya,yb) {
  let total=0;
  for(let y=ya;y<yb;y++)for(let x=xa;x<xb;x++)total+=mask[y*w+x];
  return total/((xb-xa)*(yb-ya));
}
function profileRegion(mask,w,xa,xb,ya,yb) {
  const out=[];
  for(let x=xa;x<xb;x++) { let total=0;for(let y=ya;y<yb;y++)total+=mask[y*w+x];out.push(total/(yb-ya)); }
  return out;
}
export function extractPhotoFeaturesV3(imageData) {
  const {width:w,height:h,data}=imageData;
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||data.length!==w*h*4)throw new RangeError('Expected RGBA image data');
  const warm=new Uint8Array(w*h),lum=new Float64Array(w*h),body=[],cols=new Uint32Array(w),rows=new Uint32Array(h);
  let count=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const i=y*w+x,j=4*i,r=data[j],g=data[j+1],b=data[j+2],max=Math.max(r,g,b),min=Math.min(r,g,b);
    lum[i]=.2126*r+.7152*g+.0722*b;
    if(max>32&&(max-min)/Math.max(max,1)>=.24&&r>=.90*g&&r>b&&g>b&&(g-b)>=(r-b)*.25&&(g-b)<=(r-b)*1.10) {
      warm[i]=1;count++;cols[x]++;rows[y]++;body.push(lum[i]);
    }
  }
  if(count<8)return Array(8).fill(0);
  const xs=Array.from(cols,(_,i)=>i).filter(i=>cols[i]>=2),ys=Array.from(rows,(_,i)=>i).filter(i=>rows[i]>=2);
  if(xs.length<2||ys.length<2)return Array(8).fill(0);
  const dark=new Uint8Array(w*h),cut=median(body)*.64;
  for(let i=0;i<dark.length;i++)dark[i]=lum[i]<cut ? 1:0;
  const x0=xs[0],x1=xs.at(-1)+1,y0=ys[0],y1=ys.at(-1)+1,bw=x1-x0,bh=y1-y0;
  const xa=x0+Math.max(1,Math.floor(bw*.08)),xb=x1-Math.max(1,Math.floor(bw*.08)),ya=y0+Math.max(1,Math.floor(bh*.13)),yb=Math.min(h,y0+Math.max(2,Math.floor(bh*.58)));
  if(xb<=xa||yb<=ya)return Array(8).fill(0);
  const windows=runs(profileRegion(dark,w,xa,xb,ya,yb),.48),centers=windows.map(([a,b])=>(a+b)/2),gaps=centers.slice(1).map((c,i)=>c-centers[i]);
  let spacing=0;
  if(gaps.length>=2) {
    const mean=gaps.reduce((a,b)=>a+b,0)/gaps.length,std=Math.sqrt(gaps.reduce((a,b)=>a+(b-mean)**2,0)/gaps.length);
    spacing=Math.max(0,1-std/Math.max(1,mean));
  }
  const wy0=Math.max(0,y1-1),wy1=Math.min(h,y1+Math.max(2,Math.floor(bh*.36))),wheels=runs(profileRegion(dark,w,x0,x1,wy0,wy1),.40);
  const ly=Math.min(h-1,y0+Math.floor(bh*.77)),lower=meanRegion(warm,w,x0,x1,ly,Math.min(h,ly+Math.max(1,Math.floor(bh*.14))));
  return [count/(w*h*.22),bw/Math.max(1,bh)/3,windows.length/6,meanRegion(dark,w,xa,xb,ya,yb)/.65,spacing,wheels.length/3,lower,meanRegion(dark,w,x0,x1,wy0,wy1)/.55].map(v=>Math.max(0,Math.min(1,v)));
}

export function predictLogisticV3(features,model) {
  if(model.featureVersion!==FEATURE_VERSION||features.length!==8)throw new RangeError('Expected photo-relative-v3 features/model');
  const logit=features.reduce((sum,value,i)=>sum+value*model.raw_feature_weights[i],model.raw_feature_bias);
  return 1/(1+Math.exp(-Math.max(-40,Math.min(40,logit))));
}
