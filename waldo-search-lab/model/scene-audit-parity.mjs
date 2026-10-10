/** Identical-pixel JS/Python parity on hard audit fixture patches. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extractFeatures, predict } from '../dist/qnn.js';

const fixturePath = new URL('./scene-audit-parity-fixtures.json', import.meta.url);
const modelPath = new URL('../dist/model/model.json', import.meta.url);
const modulePath = new URL('../dist/qnn.js', import.meta.url);
const fixtureBytes = readFileSync(fixturePath);
const fixtures = JSON.parse(fixtureBytes);
const modelBytes = readFileSync(modelPath);
const model = JSON.parse(modelBytes);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(modelBytes), fixtures.qnn_model_sha256, 'Frozen QNN changed.');
assert.equal(hash(readFileSync(modulePath)), fixtures.javascript_module_sha256, 'JS inference module changed.');
let featureError = 0, probabilityError = 0;
for (const fixture of fixtures.fixtures) {
  const data = new Uint8ClampedArray(Buffer.from(fixture.rgba_base64, 'base64'));
  assert.equal(data.length, fixture.width * fixture.height * 4);
  const features = extractFeatures({ width: fixture.width, height: fixture.height, data });
  assert.ok(features.every(Number.isFinite));
  const prediction = predict(features, model);
  featureError = Math.max(featureError, ...features.map((v, i) => Math.abs(v - fixture.features[i])));
  probabilityError = Math.max(probabilityError, Math.abs(prediction - fixture.probability));
  assert.ok(featureError < 1e-12, fixture.id);
  assert.ok(probabilityError < 1e-12, fixture.id);
}
console.log(JSON.stringify({ verification: 'PASS', patches: fixtures.fixtures.length,
  maxFeatureError: featureError, maxProbabilityError: probabilityError,
  fixturesSha256: hash(fixtureBytes), qnnModelSha256: hash(modelBytes),
  javascriptModuleSha256: hash(readFileSync(modulePath)),
  scope: 'Same RGBA arrays in JS and Python; browser image drawing/resampling is separately assessed.'
}, null, 2));
