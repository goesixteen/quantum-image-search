import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {homedir} from 'node:os';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {quantumReadout,predict} from '../dist/qnn.js';
import {FEATURE_NAMES,FEATURE_VERSION,extractWindowFeatures} from '../dist/wanda-localizer.js';
import {traceQNN,getQNNFrame} from '../dist/qnn-trace.js';
const require=createRequire(import.meta.url);
let canvas;
try{canvas=require('@napi-rs/canvas');}catch{canvas=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'));}
const dir=fileURLToPath(new URL('../model/wanda-qnn/',import.meta.url));
const modelBytes=fs.readFileSync(new URL('../dist/model/wanda-qnn.json',import.meta.url)),model=JSON.parse(modelBytes);
const geometry=JSON.parse(fs.readFileSync(dir+'/pixel-parity-fixtures.json')),heldout=JSON.parse(fs.readFileSync(dir+'/held-out-trace-fixtures.json'));
const rows=[...geometry.fixtures.map(r=>({...r,expectedReadouts:r.readout,expectedProbability:r.score,role:'predeclared geometry'})),...heldout.fixtures.map(r=>({...r,role:'first16 reserved test rows'}))];
const near=(a,b,tolerance=2e-13)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

test('frozen Wanda circuit trace matches all12 predeclared and16 untouched held-out NumPy readouts/scores',t=>{
  assert.equal(sha(modelBytes),'d1f49aa304668d2826f36652ac70d0f51b64dc4eb86acfd2c0e7804f80ff4c88');
  assert.equal(geometry.modelSHA256,sha(modelBytes));assert.equal(heldout.modelSHA256,sha(modelBytes));assert.equal(geometry.fixtures.length,12);assert.equal(heldout.fixtures.length,16);
  assert.equal(model.featureVersion,FEATURE_VERSION);assert.deepEqual(model.featureNames,FEATURE_NAMES);
  let readoutError=0,scoreError=0;
  for(const row of rows){const trace=traceQNN(row.features,model),production=quantumReadout(row.features,model.theta);assert.equal(trace.gates.length,80);
    trace.expectations.forEach((z,i)=>{readoutError=Math.max(readoutError,Math.abs(z-row.expectedReadouts[i]));near(z,row.expectedReadouts[i]);near(z,production[i]);});
    scoreError=Math.max(scoreError,Math.abs(trace.score-row.expectedProbability));near(trace.score,row.expectedProbability);near(trace.score,predict(row.features,model));
  }
  t.diagnostic(JSON.stringify({cases:rows.length,predeclaredGeometry:12,heldoutRows:16,maxReadoutError:readoutError,maxScoreError:scoreError}));
});

test('actual final RGB PNGs reproduce the new Wanda features and traced detector score without labels',async t=>{
  const cache=new Map();let featureError=0,readoutError=0,scoreError=0;
  for(const row of rows){const file=row.file||row.fixture,expectedSHA=row.sha256||row.pixelFixtureSHA256;
    // Geometry fixtures include PNG hashes; held-out fixture provenance is checked
    // through its exact recovered feature vectors, without inventing a missing hash.
    if(!cache.has(file)){const bytes=fs.readFileSync(path.join(dir,file));if(expectedSHA)assert.equal(sha(bytes),expectedSHA);const image=await canvas.loadImage(bytes),c=canvas.createCanvas(image.width,image.height);c.getContext('2d').drawImage(image,0,0);cache.set(file,c.getContext('2d').getImageData(0,0,c.width,c.height));}
    const features=extractWindowFeatures(cache.get(file),...row.candidateCenter,row),trace=traceQNN(features,model);
    features.forEach((f,i)=>{featureError=Math.max(featureError,Math.abs(f-row.features[i]));near(f,row.features[i]);});
    trace.expectations.forEach((z,i)=>{readoutError=Math.max(readoutError,Math.abs(z-row.expectedReadouts[i]));near(z,row.expectedReadouts[i]);});scoreError=Math.max(scoreError,Math.abs(trace.score-row.expectedProbability));near(trace.score,row.expectedProbability);
  }
  t.diagnostic(JSON.stringify({cases:rows.length,uniquePNGFiles:cache.size,maxFeatureError:featureError,maxReadoutError:readoutError,maxScoreError:scoreError}));
});

test('actual new Wanda weights yield physical reduced states at every gate and fractional-rotation frame',t=>{
  let normError=0,purityIdentityError=0,frames=0,minimumPurity=1;
  for(const row of rows){const trace=traceQNN(row.features,model);
    for(let gate=0;gate<=trace.gates.length;gate++)for(const progress of gate===trace.gates.length?[0]:[0,.5]){
      const frame=getQNNFrame(trace,gate,progress);frames++;normError=Math.max(normError,Math.abs(frame.norm-1));near(frame.norm,1);
      for(const q of frame.qubits){const rho=q.reducedDensity;near(rho[0][0].re+rho[1][1].re,1);near(rho[0][1].re,rho[1][0].re);near(rho[0][1].im,-rho[1][0].im);
        const determinant=rho[0][0].re*rho[1][1].re-rho[0][1].re**2-rho[0][1].im**2;assert.ok(determinant>=-2e-13);assert.ok(q.length<=1+2e-13);assert.ok(q.purity>=.5-2e-13&&q.purity<=1+2e-13);minimumPurity=Math.min(minimumPurity,q.purity);
        purityIdentityError=Math.max(purityIdentityError,Math.abs(q.purity-(1+q.length**2)/2));near(q.purity,(1+q.length**2)/2);near(q.bloch.z,frame.expectations[q.qubit]);
      }
    }
  }
  assert.ok(minimumPurity<.9,'learned examples include mixed local states; spheres must retain their actual lengths');
  t.diagnostic(JSON.stringify({cases:rows.length,frames,maxNormError:normError,maxPurityIdentityError:purityIdentityError,minimumLocalPurity:minimumPurity}));
});
