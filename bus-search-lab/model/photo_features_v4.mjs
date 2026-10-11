/** Experimental photo-local-bands-v4. Pixel-only, one coherent local vector. */
export const FEATURE_VERSION='photo-local-bands-v4';
export const FEATURE_NAMES=['visible_band_width','local_body_warm_fill','local_window_darkness',
  'local_window_runs','local_window_spacing','local_lower_dark_runs','local_dark_stripe','window_body_contrast'];

function runs(profile,threshold=0) {
  const out=[];let start=-1;
  for(let i=0;i<=profile.length;i++) {
    if(i<profile.length&&profile[i]>threshold) {if(start<0)start=i;}
    else if(start>=0) {out.push([start,i]);start=-1;}
  }
  return out;
}
function median(values) {
  values.sort((a,b)=>a-b);const n=values.length;
  return n ? (n%2 ? values[(n-1)/2] : (values[n/2-1]+values[n/2])/2) : 0;
}
function meanRegion(mask,w,xa,xb,ya,yb) {
  let total=0;for(let y=ya;y<yb;y++)for(let x=xa;x<xb;x++)total+=mask[y*w+x];
  return total/((xb-xa)*(yb-ya));
}
function profileRegion(mask,w,xa,xb,ya,yb) {
  const out=[];
  for(let x=xa;x<xb;x++){let total=0;for(let y=ya;y<yb;y++)total+=mask[y*w+x];out.push(total/(yb-ya));}
  return out;
}
function bandsFor(warm,w,h) {
  const bands=[];
  for(let y=0;y<h;y++) {
    const segments=runs(warm.subarray(y*w,(y+1)*w)),merged=[];
    for(const [a,b] of segments) {
      if(merged.length&&a-merged.at(-1)[1]<=2)merged.at(-1)[1]=b;
      else merged.push([a,b]);
    }
    for(const [x0,x1] of merged) {
      if(x1-x0<8)continue;
      if(y+1<h&&meanRegion(warm,w,x0,x1,y+1,y+2)>=.75)continue;
      bands.push([x0,x1,y]);
    }
  }
  return bands.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0])||a[2]-b[2]||a[0]-b[0]).slice(0,24);
}
function describeBand(warm,lum,w,h,band) {
  const [x0,x1,y]=band,bw=x1-x0,by0=Math.max(0,y-4),by1=y+1,fill=meanRegion(warm,w,x0,x1,by0,by1),values=[];
  for(let yy=by0;yy<by1;yy++)for(let x=x0;x<x1;x++)if(warm[yy*w+x])values.push(lum[yy*w+x]);
  if(values.length<4||fill<.25)return null;
  const body=median(values),dark=new Uint8Array(w*h);
  for(let i=0;i<dark.length;i++)dark[i]=lum[i]<body*.68 ? 1:0;
  const xa=x0+Math.max(1,Math.floor(bw*.08)),xb=x1-Math.max(1,Math.floor(bw*.08)),ya=Math.max(0,y-12),yb=Math.max(0,y-5);
  if(xb<=xa)return null;
  let winDark=0,windows=[],contrast=0;
  if(yb>ya) {
    winDark=meanRegion(dark,w,xa,xb,ya,yb);windows=runs(profileRegion(dark,w,xa,xb,ya,yb),.45);
    contrast=Math.max(0,(body-meanRegion(lum,w,xa,xb,ya,yb))/Math.max(body,1));
  }
  const centers=windows.map(([a,b])=>(a+b)/2),gaps=centers.slice(1).map((c,i)=>c-centers[i]);let spacing=0;
  if(gaps.length>=2) {const mean=gaps.reduce((a,b)=>a+b,0)/gaps.length,std=Math.sqrt(gaps.reduce((a,b)=>a+(b-mean)**2,0)/gaps.length);spacing=Math.max(0,1-std/Math.max(1,mean));}
  const wy0=Math.min(h,y+1),wy1=Math.min(h,y+7);let wheels=[],wheelDark=0;
  if(wy1>wy0) {wheels=runs(profileRegion(dark,w,x0,x1,wy0,wy1),.35);wheelDark=meanRegion(dark,w,x0,x1,wy0,wy1);}
  let stripe=0;
  for(let yy=Math.max(0,y-6);yy<y+1;yy++)stripe=Math.max(stripe,meanRegion(dark,w,x0,x1,yy,yy+1));
  const features=[bw/w,fill,winDark/.65,windows.length/6,spacing,wheels.length/3,stripe,contrast/.6].map(v=>Math.max(0,Math.min(1,v)));
  const windowQuality=Math.min(windows.length,6)/6*(.4+.6*spacing),wheelQuality=Math.min(wheels.length,2)/2*Math.max(0,1-Math.abs(wheelDark-.22)/.40);
  const quality=(bw/w)*fill*(.05+windowQuality)*(.5+.5*contrast)*(.7+.3*wheelQuality);
  return {features,quality};
}
export function extractPhotoFeaturesV4(imageData) {
  const {width:w,height:h,data}=imageData;
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||data.length!==w*h*4)throw new RangeError('Expected RGBA image data');
  const warm=new Uint8Array(w*h),lum=new Float64Array(w*h);
  for(let i=0;i<w*h;i++) {
    const r=data[4*i],g=data[4*i+1],b=data[4*i+2],max=Math.max(r,g,b),min=Math.min(r,g,b);
    lum[i]=.2126*r+.7152*g+.0722*b;
    warm[i]=max>32&&(max-min)/Math.max(max,1)>=.24&&r>=.90*g&&r>b&&g>b&&(g-b)>=(r-b)*.25&&(g-b)<=(r-b)*1.10 ? 1:0;
  }
  let selected=Array(8).fill(0),best=-1;
  for(const band of bandsFor(warm,w,h)) {const result=describeBand(warm,lum,w,h,band);if(result&&result.quality>best+1e-12){selected=result.features;best=result.quality;}}
  return selected;
}
export function predictLogisticV4(features,model) {
  if(model.featureVersion!==FEATURE_VERSION||features.length!==8)throw new RangeError('Expected photo-local-bands-v4 features/model');
  const logit=features.reduce((sum,value,i)=>sum+value*model.raw_feature_weights[i],model.raw_feature_bias);
  return 1/(1+Math.exp(-Math.max(-40,Math.min(40,logit))));
}
