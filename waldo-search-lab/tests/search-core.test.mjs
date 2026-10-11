import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { prepareTemplate, matchTemplate, gridSpec, candidatePoint, pointCandidate, pointDistance } from '../dist/search-core.js';
import { simulateGrover, recommendIterations } from '../dist/quantum.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function image(width, height, fn) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(fn(x, y), (y * width + x) * 4);
  return { width, height, data };
}

function png(filename) {
  const bytes = fs.readFileSync(filename), compressed = [];
  let width, height, channels;
  for (let i = 8; i < bytes.length;) {
    const length = bytes.readUInt32BE(i), type = bytes.toString('ascii', i + 4, i + 8), start = i + 8;
    if (type === 'IHDR') { width = bytes.readUInt32BE(start); height = bytes.readUInt32BE(start + 4); assert.equal(bytes[start + 8], 8); channels = { 2: 3, 6: 4 }[bytes[start + 9]]; assert.ok(channels); assert.equal(bytes[start + 12], 0); }
    if (type === 'IDAT') compressed.push(bytes.subarray(start, start + length));
    i += length + 12;
  }
  const raw = inflateSync(Buffer.concat(compressed)), stride = width * channels, decoded = new Uint8Array(height * stride);
  const paeth = (a, b, c) => { const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c); return da <= db && da <= dc ? a : db <= dc ? b : c; };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], row = y * stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? decoded[row + x - channels] : 0, up = y ? decoded[row + x - stride] : 0, corner = y && x >= channels ? decoded[row + x - stride - channels] : 0;
      const predicted = [0, left, up, Math.floor((left + up) / 2), paeth(left, up, corner)][filter];
      assert.notEqual(predicted, undefined); decoded[row + x] = (raw[y * (stride + 1) + 1 + x] + predicted) & 255;
    }
  }
  return image(width, height, (x, y) => { const i = (y * width + x) * channels; return [decoded[i], decoded[i + 1], decoded[i + 2], channels === 4 ? decoded[i + 3] : 255]; });
}

// Independent premultiplied bilinear renderer. The matcher never receives x/y,
// occluder masks, alpha ground truth, or a target-present flag from these tests.
function resize(source, width, height) {
  return image(width, height, (x, y) => {
    const sx = (x + .5) * source.width / width - .5, sy = (y + .5) * source.height / height - .5;
    const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0, sum = [0, 0, 0, 0];
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const px = Math.max(0, Math.min(source.width - 1, x0 + i)), py = Math.max(0, Math.min(source.height - 1, y0 + j));
      const offset = (py * source.width + px) * 4, weight = (i ? fx : 1 - fx) * (j ? fy : 1 - fy), a = source.data[offset + 3] / 255;
      for (let c = 0; c < 3; c++) sum[c] += source.data[offset + c] * a * weight;
      sum[3] += a * weight;
    }
    return [...sum.slice(0, 3).map((v) => sum[3] ? v / sum[3] : 0), sum[3] * 255];
  });
}

function composite(background, target, x, y, occlusion = null) {
  const scene = { ...background, data: new Uint8ClampedArray(background.data) };
  for (let ty = 0; ty < target.height; ty++) for (let tx = 0; tx < target.width; tx++) {
    const sx = x + tx, sy = y + ty;
    if (sx < 0 || sy < 0 || sx >= scene.width || sy >= scene.height) continue;
    const i = (sy * scene.width + sx) * 4, t = (ty * target.width + tx) * 4, a = target.data[t + 3] / 255;
    for (let c = 0; c < 3; c++) scene.data[i + c] = a * target.data[t + c] + (1 - a) * scene.data[i + c];
    if (occlusion?.(tx, ty)) scene.data.set([37, 61, 44, 255], i);
  }
  return scene;
}

function subpixelComposite(background, target, x, y) {
  const scene = { ...background, data: new Uint8ClampedArray(background.data) };
  for (let sy = Math.max(0, Math.floor(y)); sy < Math.min(scene.height, Math.ceil(y + target.height)); sy++) for (let sx = Math.max(0, Math.floor(x)); sx < Math.min(scene.width, Math.ceil(x + target.width)); sx++) {
    const tx = sx - x, ty = sy - y, ix = Math.floor(tx), iy = Math.floor(ty), fx = tx - ix, fy = ty - iy, rgba = [0, 0, 0, 0];
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const px = ix + i, py = iy + j;
      if (px < 0 || py < 0 || px >= target.width || py >= target.height) continue;
      const offset = (py * target.width + px) * 4, weight = (i ? fx : 1 - fx) * (j ? fy : 1 - fy), alpha = target.data[offset + 3] / 255;
      for (let c = 0; c < 3; c++) rgba[c] += target.data[offset + c] * alpha * weight;
      rgba[3] += alpha * weight;
    }
    const offset = (sy * scene.width + sx) * 4;
    for (let c = 0; c < 3; c++) scene.data[offset + c] = rgba[c] + (1 - rgba[3]) * background.data[offset + c];
  }
  return scene;
}

const background = image(512, 512, (x, y) => [45 + x % 17, 92 + y % 19, 115 + (x + y) % 23, 255]);
const symbol = image(40, 60, (x, y) => {
  if (x < 5 || x >= 35 || y < 3 || y >= 57) return [0, 0, 0, 0];
  if (y > 42) return [28, 64, 181, 255];
  if (x < 8 || x > 31) return [20, 23, 27, 255];
  return Math.floor(y / 5) % 2 ? [243, 238, 224, 255] : [217, 29, 32, 255];
});
const target = prepareTemplate(symbol);
const audit = [];
const alphaFraction = (target, predicate) => {
  let opaque = 0, hidden = 0;
  for (let y = 0; y < target.height; y++) for (let x = 0; x < target.width; x++) if (target.data[(y * target.width + x) * 4 + 3] > 32) { opaque++; if (predicate(x, y)) hidden++; }
  return opaque ? hidden / opaque : 0;
};

function auditResult(name, result, truth = []) {
  const tolerance = gridSpec(result.grid).quantizationRadius + 1;
  const distances = result.marks.map((i) => Math.min(...truth.map((p) => pointDistance({ x: result.candidates[i].bestX, y: result.candidates[i].bestY }, p))));
  audit.push({ name, grid: result.grid, marks: result.marks, passingBeforeSuppression: result.diagnostics.thresholdPassingCount, maximumScore: Math.max(...result.scores), strongestPoints: [...result.candidates].sort((a, b) => b.registrationScore - a.registrationScore).slice(0, 3).map((c) => ({ x: c.bestX, y: c.bestY, score: c.score })), refinedPoints: result.marks.map((i) => ({ x: result.candidates[i].bestX, y: result.candidates[i].bestY, score: result.scores[i] })), tolerance, distances, comparisons: result.diagnostics.sampleComparisons });
  return { distances, tolerance };
}

test('finite address coordinates and fixed target size are independent of search grid', () => {
  for (const grid of [16, 32, 64]) {
    const spec = gridSpec(grid); assert.equal(spec.count, grid ** 2); assert.equal(spec.qubits, Math.log2(grid ** 2));
    for (const index of [0, 17, grid ** 2 - 1]) { const p = candidatePoint(index, grid); assert.equal(pointCandidate(p.x, p.y, grid), index); }
  }
  assert.equal(pointCandidate(512, 512, 64), 4095);
  assert.throws(() => gridSpec(15)); assert.throws(() => pointCandidate(-1, 1, 64)); assert.throws(() => candidatePoint(4096, 64));
  assert.throws(() => prepareTemplate(image(10, 10, () => [0, 0, 0, 0])));
  assert.throws(() => matchTemplate(background, target, { threshold: NaN }));
});

test('point localization succeeds on all fine grids without any position input', () => {
  const x = 107, y = 201, scene = composite(background, symbol, x, y), truth = { x: x + 20, y: y + 30 };
  for (const grid of [16, 32, 64]) {
    const result = matchTemplate(scene, target, { grid, backgroundImageData: background });
    const { distances, tolerance } = auditResult('synthetic_full', result, [truth]);
    assert.equal(result.templateSize.width, 40); assert.equal(result.templateSize.height, 60);
    assert.ok(result.marks.length > 0); assert.ok(distances.every((d) => d <= tolerance), JSON.stringify(audit.at(-1)));
    assert.ok(result.diagnostics.sampleComparisons <= 1_000_000);
  }
});

test('unchanged clean background has zero accepted points; no argmax fallback', () => {
  for (const grid of [16, 32, 64]) {
    const result = matchTemplate(background, target, { grid, backgroundImageData: background });
    auditResult('synthetic_empty', result); assert.deepEqual(result.marks, []); assert.equal(Math.max(...result.scores), 0);
  }
});

test('partial occlusion can preserve a match and extensive occlusion can abstain', () => {
  const truth = { x: 200, y: 320 };
  const partial = composite(background, symbol, 180, 290, (x) => x < 15);
  const hidden = composite(background, symbol, 180, 290, (x) => x < 34);
  const accepted = matchTemplate(partial, target, { grid: 64, backgroundImageData: background });
  const rejected = matchTemplate(hidden, target, { grid: 64, backgroundImageData: background });
  const { distances, tolerance } = auditResult('synthetic_partial_occlusion', accepted, [truth]);
  auditResult('synthetic_extensive_occlusion', rejected, [truth]);
  assert.ok(accepted.marks.length); assert.ok(distances.every((d) => d <= tolerance)); assert.deepEqual(rejected.marks, []);
});

test('two distinct instances remain two matches after threshold-first suppression', () => {
  const scene = composite(composite(background, symbol, 70, 80), symbol, 360, 400);
  const result = matchTemplate(scene, target, { grid: 64, backgroundImageData: background });
  const truth = [{ x: 90, y: 110 }, { x: 380, y: 430 }];
  const { distances, tolerance } = auditResult('synthetic_two_instances', result, truth);
  assert.equal(result.marks.length, 2); assert.ok(distances.every((d) => d <= tolerance));
});

test('scene-only matching is available and threshold-empty scenes remain empty', () => {
  const scene = composite(background, symbol, 243, 122);
  const result = matchTemplate(scene, target, { grid: 64 });
  const { distances, tolerance } = auditResult('synthetic_scene_only', result, [{ x: 263, y: 152 }]);
  assert.ok(result.marks.length); assert.ok(distances.every((d) => d <= tolerance));
  const empty = matchTemplate(background, target, { grid: 64 });
  auditResult('synthetic_scene_only_empty', empty); assert.deepEqual(empty.marks, []);
});

test('actual original crowd artwork: empty scenes and separate placement audit', () => {
  const crowd = png(path.join(root, 'dist/assets/crowd-captcha.png'));
  const explorer = resize(png(path.join(root, 'dist/assets/character.png')), 64, 96);
  const template = prepareTemplate(explorer), positions = [[137, 233], [306, 81], [39, 382]];
  for (const grid of [16, 32, 64]) {
    const empty = matchTemplate(crowd, template, { grid, backgroundImageData: crowd });
    auditResult('art_empty', empty); assert.deepEqual(empty.marks, []);
    for (const [x, y] of positions) {
      const result = matchTemplate(composite(crowd, explorer, x, y), template, { grid, backgroundImageData: crowd });
      const { distances, tolerance } = auditResult(`art_full_${x}_${y}`, result, [{ x: x + 32, y: y + 48 }]);
      assert.ok(result.marks.length, JSON.stringify(audit.at(-1))); assert.ok(distances.every((d) => d <= tolerance), JSON.stringify(audit.at(-1)));
    }
  }
  const partial = matchTemplate(composite(crowd, explorer, 226, 180, (x) => x < 23), template, { grid: 64, backgroundImageData: crowd });
  const { distances, tolerance } = auditResult('art_partial_occlusion', partial, [{ x: 258, y: 228 }]);
  assert.ok(partial.marks.length, JSON.stringify(audit.at(-1))); assert.ok(distances.every((d) => d <= tolerance), JSON.stringify(audit.at(-1)));
  const sceneOnlyEmpty = matchTemplate(crowd, template, { grid: 64 });
  auditResult('art_scene_only_empty', sceneOnlyEmpty);
  assert.deepEqual(sceneOnlyEmpty.marks, [], JSON.stringify(audit.at(-1)));
});

test('dense seeded placement audit keeps truth independent and reports point precision', () => {
  const crowd = png(path.join(root, 'dist/assets/crowd-captcha.png'));
  const explorer = resize(png(path.join(root, 'dist/assets/character.png')), 64, 96), template = prepareTemplate(explorer);
  let seed = 202610105;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  const positions = Array.from({ length: 24 }, () => [Math.floor(random() * 449), Math.floor(random() * 417)]);
  const counts = {};
  for (const grid of [16, 32, 64]) {
    let hits = 0, falseMarks = 0, maximumError = 0;
    for (const [x, y] of positions) {
      const result = matchTemplate(composite(crowd, explorer, x, y), template, { grid, backgroundImageData: crowd });
      const center = { x: x + 32, y: y + 48 }, tolerance = gridSpec(grid).quantizationRadius + 1;
      const distances = result.marks.map((i) => pointDistance(center, { x: result.candidates[i].bestX, y: result.candidates[i].bestY }));
      hits += distances.some((d) => d <= tolerance) ? 1 : 0;
      falseMarks += distances.filter((d) => d > tolerance).length;
      maximumError = Math.max(maximumError, ...distances);
    }
    counts[grid] = { scenes: positions.length, hits, falseMarks, maximumError };
    assert.equal(hits, positions.length, JSON.stringify(counts)); assert.equal(falseMarks, 0, JSON.stringify(counts));
  }
  console.log('DENSE_AUDIT ' + JSON.stringify({ seed: 202610105, counts }));
});

test('visible-alpha occlusion audit records its actual covered fraction', () => {
  const crowd = png(path.join(root, 'dist/assets/crowd-captcha.png'));
  const explorer = resize(png(path.join(root, 'dist/assets/character.png')), 64, 96), template = prepareTemplate(explorer);
  const partialMask = (_x, y) => y >= 24 && y < 44, largeMask = (_x, y) => y >= 8 && y < 90;
  const partial = matchTemplate(composite(crowd, explorer, 226, 180, partialMask), template, { grid: 64, backgroundImageData: crowd });
  const large = matchTemplate(composite(crowd, explorer, 226, 180, largeMask), template, { grid: 64, backgroundImageData: crowd });
  const partialFraction = alphaFraction(explorer, partialMask), extensiveFraction = alphaFraction(explorer, largeMask);
  const { distances, tolerance } = auditResult('art_visible_alpha_partial', partial, [{ x: 258, y: 228 }]);
  auditResult('art_visible_alpha_extensive', large, [{ x: 258, y: 228 }]);
  console.log('OCCLUSION_AUDIT ' + JSON.stringify({ partialFraction, extensiveFraction }));
  assert.ok(partialFraction > .20); assert.ok(partial.marks.length); assert.ok(distances.every((d) => d <= tolerance)); assert.deepEqual(large.marks, []);
});

test('simple foreground color distractors are not a full target match', () => {
  const red = image(64, 96, () => [219, 28, 32, 255]);
  const redScene = composite(background, red, 190, 170);
  const result = matchTemplate(redScene, target, { grid: 64, backgroundImageData: background });
  auditResult('solid_red_distractor', result); assert.deepEqual(result.marks, []);
});

test('fractional placements expose resampling tolerance separately from integer fixtures', () => {
  const crowd = png(path.join(root, 'dist/assets/crowd-captcha.png'));
  const explorer = resize(png(path.join(root, 'dist/assets/character.png')), 64, 96), template = prepareTemplate(explorer);
  const positions = [[137.25, 233.25], [306.5, 81.5], [39.75, 382.75]];
  let hits = 0;
  for (const [x, y] of positions) {
    const result = matchTemplate(subpixelComposite(crowd, explorer, x, y), template, { grid: 64, backgroundImageData: crowd });
    const { distances, tolerance } = auditResult(`art_fractional_${x}_${y}`, result, [{ x: x + 32, y: y + 48 }]);
    hits += result.marks.length ? 1 : 0;
    assert.ok(distances.every((d) => d <= tolerance), JSON.stringify(audit.at(-1)));
    // This intentionally preserves a measured limitation instead of adjusting
    // the threshold on the stress cases. Integer canvas placements avoid it.
    if (x === 137.25) { assert.deepEqual(result.marks, []); assert.ok(Math.max(...result.scores) > .43 && Math.max(...result.scores) < .45); }
  }
  console.log('FRACTIONAL_AUDIT ' + JSON.stringify({ scenes: positions.length, hits, positions }));
});

test('fine-grid Grover frames retain actual signed amplitudes and Born probabilities', () => {
  const results = [];
  for (const grid of [16, 32, 64]) {
    const N = grid ** 2, marks = [Math.floor(N / 2) - 1], rounds = recommendIterations(N, 1);
    const trace = simulateGrover(N, marks, rounds * 2 + 2), theta = Math.asin(1 / Math.sqrt(N));
    let maximumError = 0;
    for (const frame of trace.history) {
      const good = Math.sin((2 * frame.iteration + 1) * theta), bad = Math.cos((2 * frame.iteration + 1) * theta) / Math.sqrt(N - 1);
      for (let i = 0; i < N; i++) {
        maximumError = Math.max(maximumError, Math.abs(frame.amplitudes[i] - (i === marks[0] ? good : bad)));
        assert.ok(Math.abs(frame.probabilities[i] - frame.amplitudes[i] ** 2) < 1e-15);
      }
      assert.ok(Math.abs(frame.probabilities.reduce((a, b) => a + b, 0) - 1) < 1e-12);
    }
    assert.ok(maximumError < 1e-12);
    assert.ok(trace.history.some((frame) => frame.amplitudes[marks[0]] < 0));
    results.push({ grid, states: N, recommendedRounds: rounds, frames: trace.history.length, maximumAmplitudeError: maximumError });
  }
  console.log('FINE_GROVER_AUDIT ' + JSON.stringify(results));
});

test.after(() => {
  console.log('PIXEL_AUDIT ' + JSON.stringify(audit));
});
