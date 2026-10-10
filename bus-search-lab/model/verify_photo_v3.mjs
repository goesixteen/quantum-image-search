/** Verify identical-pixel feature/circuit/logistic parity without retraining. */
import fs from 'node:fs';
import { extractPhotoFeaturesV3,predictLogisticV3 } from './photo_features_v3.mjs';
import { predict } from '../dist/qnn.js';
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url),'utf8'));
const qnn=read('photo-v3-qnn-candidate.json'),logistic=read('photo-v3-logistic-candidate.json'),fixtures=read('photo-v3-parity-fixtures.json');
let maxFeatureError=0,maxQnnError=0,maxLogisticError=0;
for(const item of fixtures) {
  const f=extractPhotoFeaturesV3({width:item.width,height:item.height,data:new Uint8ClampedArray(item.rgba)});
  for(let i=0;i<8;i++)maxFeatureError=Math.max(maxFeatureError,Math.abs(f[i]-item.features[i]));
  maxQnnError=Math.max(maxQnnError,Math.abs(predict(f,qnn)-item.qnn_probability));
  maxLogisticError=Math.max(maxLogisticError,Math.abs(predictLogisticV3(f,logistic)-item.logistic_probability));
}
if(maxFeatureError>1e-12||maxQnnError>1e-12||maxLogisticError>1e-12)throw new Error('Photo v3 parity failed');
console.log(JSON.stringify({fixtures:fixtures.length,maxFeatureError,maxQnnError,maxLogisticError},null,2));
