import fs from 'node:fs';
import assert from 'node:assert/strict';
import { extractFeatures, predict, quantumReadout } from '../dist/qnn.js';

const root = new URL('../', import.meta.url);
const model = JSON.parse(fs.readFileSync(new URL('dist/model/model.json', root)));
const fixtures = JSON.parse(fs.readFileSync(new URL('model/parity-fixtures.json', root)));
let maxFeatureError = 0, maxPredictionError = 0;
assert.equal(model.featureNames.length, 8);
assert.equal(model.theta.length, 8 * model.layers);
for (const fixture of fixtures) {
  const features = extractFeatures({ width: fixture.width, height: fixture.height, data: new Uint8ClampedArray(fixture.rgba) });
  assert.ok(features.every(Number.isFinite));
  features.forEach((value, index) => {
    maxFeatureError = Math.max(maxFeatureError, Math.abs(value - fixture.features[index]));
  });
  const prediction = predict(features, model);
  maxPredictionError = Math.max(maxPredictionError, Math.abs(prediction - fixture.probability));
  const zeroReadout = quantumReadout(Array(8).fill(0), model.theta);
  assert.equal(zeroReadout.length, 7);
  assert.ok(zeroReadout.every(value => Number.isFinite(value) && Math.abs(value) <= 1 + 1e-12));
}
assert.ok(maxFeatureError < 1e-10, `Feature parity error ${maxFeatureError}`);
assert.ok(maxPredictionError < 1e-10, `QNN prediction parity error ${maxPredictionError}`);
// The shirt extending to the bottom of a patch has no below-region pixels.
// It must return finite blue evidence rather than a NaN from an empty average.
const synthetic = new Uint8ClampedArray(32 * 32 * 4);
for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
  const red = Math.floor(y / 4) % 2 === 1;
  synthetic.set(red ? [210, 30, 40, 255] : [240, 240, 240, 255], (y * 32 + x) * 4);
}
const bottomFeatures = extractFeatures({ width: 32, height: 32, data: synthetic });
assert.ok(bottomFeatures.every(Number.isFinite));
console.log(JSON.stringify({ fixtures: fixtures.length, maxFeatureError, maxPredictionError,
  bottomCroppedStripeFeaturesFinite: true, circuitLayers: model.layers }, null, 2));
