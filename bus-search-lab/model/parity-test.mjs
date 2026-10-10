import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { extractFeatures, extractPhotoFeatures, predict, quantumReadout } from '../dist/qnn.js';
const model = JSON.parse(await readFile(process.argv[2] || new URL('../dist/model/model.json', import.meta.url), 'utf8'));
const fixtures = JSON.parse(await readFile(process.argv[3] || new URL('./parity-fixtures.json', import.meta.url), 'utf8'));
let maxFeatureError = 0, maxProbabilityError = 0;
const extractor = model.featureExtractor === 'yellow-hue-v2' ? extractPhotoFeatures : extractFeatures;
for (const fixture of fixtures) {
  const features = extractor({ width: fixture.width, height: fixture.height, data: Uint8ClampedArray.from(fixture.rgba) });
  features.forEach((v, k) => { maxFeatureError = Math.max(maxFeatureError, Math.abs(v - fixture.features[k])); });
  maxProbabilityError = Math.max(maxProbabilityError, Math.abs(predict(features, model) - fixture.probability));
}
assert(maxFeatureError < 1e-12, `Pixel feature parity error ${maxFeatureError}`);
assert(maxProbabilityError < 1e-12, `QNN probability parity error ${maxProbabilityError}`);
const blank = extractFeatures({ width: 64, height: 64, data: new Uint8ClampedArray(64 * 64 * 4).fill(255) });
assert(blank.every(v => v === 0));
assert(predict(blank, model) < model.threshold, 'Blank patch must not create a target.');
assert(quantumReadout(Array(8).fill(0), Array(24).fill(0)).every(v => Math.abs(v - 1) < 1e-12));
console.log(JSON.stringify({ fixtures: fixtures.length, maxFeatureError, maxProbabilityError, blankProbability: predict(blank, model) }, null, 2));
