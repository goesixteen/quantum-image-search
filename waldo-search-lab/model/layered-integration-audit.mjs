#!/usr/bin/env node
// Frozen pixel-oracle integration audit. Images are rasterized only in memory;
// this script does not change source artwork, matcher defaults, weights, or UI.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { prepareTemplate, matchTemplate, gridSpec, pointDistance } from '../dist/search-core.js';
import { recommendIterations } from '../dist/quantum.js';
import { renderBackground, createForegroundLayers, compositeLayeredScene } from '../dist/scene-editor.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canvasModule = process.env.CODEX_CANVAS_MODULE || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
let canvas;
try { canvas = require('@napi-rs/canvas'); } catch { canvas = require(canvasModule); }
const { createCanvas, loadImage } = canvas;
const factory = (width, height) => createCanvas(width, height);
const sha = (filename) => createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const sceneIds = ['bruegel', 'seurat'], heights = [24, 52, 80, 112], grids = [16, 32, 64];
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist/scene-catalog.json')));
const presets = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist/foreground-presets.json')));
const targetEntry = catalog.targets.find((t) => t.id === 'striped');
const sourcePaths = ['model/layered-integration-audit.mjs', 'dist/search-core.js', 'dist/scene-editor.js', 'dist/foreground-presets.json', 'dist/scene-catalog.json', 'dist/' + targetEntry.src, 'dist/assets/open-art/openmoji-striped-standing.svg', ...sceneIds.map((id) => 'dist/' + catalog.scenes.find((s) => s.id === id).src)];
const sourceHashes = Object.fromEntries(sourcePaths.map((file) => [file, sha(path.join(ROOT, file))]));
const started = new Date().toISOString();
const targetSource = await loadImage(path.join(ROOT, 'dist', targetEntry.src));

// Same alpha>16 trim as the app's normalizedTarget. Use the final verified PNG
// from the live catalog; SVG source is hashed for provenance, never rerendered.
function normalizeTarget(source) {
  const natural = createCanvas(source.width, source.height), ctx = natural.getContext('2d');
  ctx.drawImage(source, 0, 0);
  const data = ctx.getImageData(0, 0, natural.width, natural.height).data;
  let x0 = natural.width, y0 = natural.height, x1 = 0, y1 = 0;
  for (let y = 0; y < natural.height; y++) for (let x = 0; x < natural.width; x++) if (data[(y * natural.width + x) * 4 + 3] > 16) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1); }
  if (x1 <= x0 || y1 <= y0) throw new Error('Target raster has no alpha>16 pixels.');
  const trimmed = createCanvas(x1 - x0, y1 - y0);
  trimmed.getContext('2d').drawImage(natural, x0, y0, x1 - x0, y1 - y0, 0, 0, trimmed.width, trimmed.height);
  return { canvas: trimmed, trim: { x: x0, y: y0, width: trimmed.width, height: trimmed.height }, naturalSize: { width: source.width, height: source.height } };
}
const normalized = normalizeTarget(targetSource);
const templates = new Map();
for (const height of heights) {
  const width = Math.round(height * normalized.canvas.width / normalized.canvas.height);
  const raster = createCanvas(width, height);
  raster.getContext('2d').drawImage(normalized.canvas, 0, 0, width, height);
  const data = raster.getContext('2d').getImageData(0, 0, width, height);
  templates.set(height, { raster, template: prepareTemplate(data), width, height, rgbaSHA256: createHash('sha256').update(data.data).digest('hex') });
}

const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
function rectangle(cx, cy, target) {
  return { x: Math.round(clamp(cx - target.width / 2, 0, 512 - target.width)), y: Math.round(clamp(cy - target.height / 2, 0, 512 - target.height)), width: target.width, height: target.height };
}
function positions(target) {
  const w = target.width, h = target.height;
  const fixed = [[w / 2, h / 2], [512 - w / 2, h / 2], [w / 2, 512 - h / 2], [512 - w / 2, 512 - h / 2], [256, 256], [280, 350], [128, 128], [384, 384]];
  let seed = 202610106 + target.height;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let i = 0; i < 16; i++) fixed.push([w / 2 + random() * (512 - w), h / 2 + random() * (512 - h)]);
  return fixed.map(([cx, cy], i) => ({ id: 'placement-' + String(i).padStart(2, '0'), rect: rectangle(cx, cy, target) }));
}
function foregroundPositions(layer, target) {
  const b = layer.bounds, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  return [['center', cx, cy], ['top', cx, b.y], ['bottom', cx, b.y + b.height], ['left', b.x, cy], ['right', b.x + b.width, cy], ['upper-quarter', cx, b.y + b.height * .25]].map(([label, x, y]) => ({ id: layer.id + '-' + label, focusLayer: layer.id, rect: rectangle(x, y, target) }));
}

function visibility(frame, present) {
  if (!present) return { targetAlphaPixels: 0, visibleAlphaPixels: 0, visibleFraction: null, visibleAlphaMassFraction: null, visibilityBucket: 'absent' };
  const target = frame.targetCanvas.getContext('2d').getImageData(0, 0, 512, 512).data, visible = frame.visibleTarget.data;
  let targetPixels = 0, visiblePixels = 0, targetMass = 0, visibleMass = 0;
  for (let i = 3; i < target.length; i += 4) {
    targetPixels += target[i] > 32 ? 1 : 0; visiblePixels += visible[i] > 32 ? 1 : 0;
    targetMass += target[i]; visibleMass += visible[i];
  }
  const fraction = targetPixels ? visiblePixels / targetPixels : 0;
  return { targetAlphaPixels: targetPixels, visibleAlphaPixels: visiblePixels, visibleFraction: fraction, visibleAlphaMassFraction: targetMass ? visibleMass / targetMass : 0, visibilityBucket: !visiblePixels ? 'fully-hidden' : fraction <= .1 ? 'at-most-10-percent-visible' : fraction <= .4 ? 'at-most-40-percent-visible' : fraction < .999 ? 'partly-visible' : 'unoccluded' };
}

let randomSeed = 202610107;
const measurementRandom = () => { randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0; return randomSeed / 2 ** 32; };
const rows = [];
function evaluate(sceneId, target, background, layers, fixture, group, depth, grid, present = true) {
  const frame = compositeLayeredScene({ backgroundCanvas: background, target: present ? target.raster : null, targetRect: fixture.rect, foregroundLayers: layers, targetZIndex: depth, canvasFactory: factory });
  const scene = frame.canvas.getContext('2d').getImageData(0, 0, 512, 512);
  const backgroundData = background.getContext('2d').getImageData(0, 0, 512, 512);
  const before = performance.now();
  // Only final pixels, known clean-background pixels, the known template, and
  // grid enter inference. Truth/visibility are evaluated after this call.
  const result = matchTemplate(scene, target.template, { grid, backgroundImageData: backgroundData });
  const milliseconds = performance.now() - before;
  const visible = visibility(frame, present), spec = gridSpec(grid);
  const center = { x: fixture.rect.x + fixture.rect.width / 2, y: fixture.rect.y + fixture.rect.height / 2 }, tolerance = spec.quantizationRadius + 1;
  const visibleTarget = present && visible.visibleAlphaPixels > 0;
  const correctIndices = new Set(result.candidates.filter((c) => visibleTarget && pointDistance(center, { x: c.bestX, y: c.bestY }) <= tolerance).map((c) => c.index));
  const accepted = result.marks.map((index) => {
    const c = result.candidates[index];
    return { index, x: c.bestX, y: c.bestY, score: c.score, distanceToReferenceCenter: pointDistance(center, { x: c.bestX, y: c.bestY }), correctVisiblePoint: correctIndices.has(index) };
  });
  const N = spec.count, M = accepted.length, rounds = recommendIterations(N, M), theta = Math.asin(Math.sqrt(M / N));
  const predicateMass = M ? Math.sin((2 * rounds + 1) * theta) ** 2 : 0;
  const trueAccepted = accepted.filter((p) => p.correctVisiblePoint).length;
  const markedTrueMass = M ? trueAccepted / M * predicateMass : 0;
  const unmarkedTrueMass = M && M < N ? (correctIndices.size - trueAccepted) / (N - M) * (1 - predicateMass) : 0;
  const truePointMass = markedTrueMass + unmarkedTrueMass;
  // One reproducible seed stream gives a secondary ideal-Born sample outcome.
  // Empty oracles abstain; they do not silently measure the uniform state.
  let sampledIndex = null;
  if (M) {
    const draw = measurementRandom();
    if (draw < predicateMass || M === N) sampledIndex = result.marks[Math.min(M - 1, Math.floor(draw / predicateMass * M))];
    else {
      const unmarked = result.candidates.filter((c) => !result.marks.includes(c.index));
      sampledIndex = unmarked[Math.min(unmarked.length - 1, Math.floor((draw - predicateMass) / (1 - predicateMass) * unmarked.length))].index;
    }
  } else measurementRandom();
  const peak = result.candidates.reduce((best, c) => c.score > best.score ? c : best, result.candidates[0]);
  const record = { id: `${sceneId}-h${target.height}-g${grid}-${group}-${fixture.id}`, scene: sceneId, height: target.height, width: target.width, grid, group, focusLayer: fixture.focusLayer ?? null, rect: fixture.rect, targetZIndex: depth, present, ...visible, pointTolerance: tolerance, markedCount: M, correctCandidateCount: correctIndices.size, trueAcceptedCount: trueAccepted, accepted, targetHit: trueAccepted > 0, falsePointMarks: M - trueAccepted, completeCleanHit: trueAccepted > 0 && trueAccepted === M, missedVisibleTarget: visibleTarget && trueAccepted === 0, emptyOracle: M === 0, maximumScore: peak.score, peak: { x: peak.bestX, y: peak.bestY }, grover: { rounds, expectedPredicateMass: predicateMass, trueVisiblePointMass: truePointMass, markedTrueMass, unmarkedTrueMass, noOutputPolicy: M === 0 }, seededSample: { index: sampledIndex, correctVisiblePoint: sampledIndex != null && correctIndices.has(sampledIndex), noOutput: sampledIndex == null }, runtimeMs: milliseconds, comparisons: result.diagnostics.sampleComparisons, thresholdPassingBeforeSuppression: result.diagnostics.thresholdPassingCount };
  rows.push(record);
  return record;
}

const layerDetails = {};
for (const sceneId of sceneIds) {
  const entry = catalog.scenes.find((s) => s.id === sceneId);
  const background = renderBackground(await loadImage(path.join(ROOT, 'dist', entry.src)), { canvasFactory: factory });
  const layers = createForegroundLayers(background, presets.backgrounds[sceneId].layers, { canvasFactory: factory, includeDataURLs: false });
  layerDetails[sceneId] = layers.map((layer) => ({ id: layer.id, zIndex: layer.zIndex, bounds: layer.bounds, enabled: layer.enabled }));
  for (const height of heights) {
    const target = templates.get(height), nominal = positions(target);
    const focused = layers.flatMap((layer) => foregroundPositions(layer, target));
    for (const grid of grids) {
      for (const fixture of nominal) {
        evaluate(sceneId, target, background, [], fixture, 'clean', 0, grid);
        evaluate(sceneId, target, background, layers, fixture, 'layered-nominal', 0, grid);
      }
      for (const fixture of focused) {
        evaluate(sceneId, target, background, layers, fixture, 'foreground-behind', 0, grid);
        evaluate(sceneId, target, background, layers, fixture, 'foreground-in-front', 40, grid);
      }
      evaluate(sceneId, target, background, layers, nominal[5], 'empty', 0, grid, false);
      const rect = nominal[5].rect;
      const completeCover = createForegroundLayers(background, [{ id: 'full-cover-control', name: 'Constructed full cover', zIndex: 40, paths: [{ type: 'rect', x: rect.x - 2, y: rect.y - 2, width: rect.width + 4, height: rect.height + 4 }] }], { canvasFactory: factory, includeDataURLs: false });
      evaluate(sceneId, target, background, [...layers, ...completeCover], nominal[5], 'constructed-full-cover', 0, grid);
    }
    console.log(`Audited ${sceneId} height${height}: ${rows.length} records so far.`);
  }
}

function summarize(records) {
  const total = records.length, visible = records.filter((r) => r.present && r.visibleAlphaPixels > 0);
  const sum = (fn) => records.reduce((value, row) => value + fn(row), 0);
  return { probes: total, visibleTargetProbes: visible.length, absentProbes: sum((r) => !r.present), fullyHiddenProbes: sum((r) => r.present && r.visibleAlphaPixels === 0), targetHits: sum((r) => r.targetHit), falsePointScenes: sum((r) => r.falsePointMarks > 0), falsePointMarks: sum((r) => r.falsePointMarks), completeCleanHits: sum((r) => r.completeCleanHit), missedVisibleTargets: sum((r) => r.missedVisibleTarget), emptyOracles: sum((r) => r.emptyOracle), hitRateGivenVisible: visible.length ? visible.filter((r) => r.targetHit).length / visible.length : null, completeCleanHitRateGivenVisible: visible.length ? visible.filter((r) => r.completeCleanHit).length / visible.length : null, meanPredicateMass: total ? sum((r) => r.grover.expectedPredicateMass) / total : null, meanTrueVisiblePointMass: total ? sum((r) => r.grover.trueVisiblePointMass) / total : null, sampledCorrectVisiblePoints: sum((r) => r.seededSample.correctVisiblePoint), sampledNoOutput: sum((r) => r.seededSample.noOutput), meanMatcherMs: total ? sum((r) => r.runtimeMs) / total : null, maximumComparisons: records.reduce((value, r) => Math.max(value, r.comparisons), 0), uniqueConfigurations: new Set(records.map((r) => JSON.stringify([r.scene, r.width, r.height, r.group, r.targetZIndex, r.present, r.rect]))).size };
}
const summary = {};
for (const group of [...new Set(rows.map((r) => r.group))]) {
  summary[group] = {};
  for (const height of heights) {
    summary[group][height] = {};
    for (const grid of grids) summary[group][height][grid] = summarize(rows.filter((r) => r.group === group && r.height === height && r.grid === grid));
  }
}
const visibilitySummary = Object.fromEntries([...new Set(rows.map((r) => r.visibilityBucket))].map((bucket) => [bucket, summarize(rows.filter((r) => r.visibilityBucket === bucket))]));
const changedSources = sourcePaths.filter((file) => sourceHashes[file] !== sha(path.join(ROOT, file)));
const failures = rows.filter((r) => r.missedVisibleTarget || r.falsePointMarks > 0).sort((a, b) => a.visibleFraction - b.visibleFraction || b.falsePointMarks - a.falsePointMarks).slice(0, 24).map((r) => ({ id: r.id, visibleFraction: r.visibleFraction, markedCount: r.markedCount, falsePointMarks: r.falsePointMarks, maximumScore: r.maximumScore, rect: r.rect, accepted: r.accepted }));
const report = { schemaVersion: 1, startedAt: started, completedAt: new Date().toISOString(), protocol: { title: 'Frozen known-template layered scene integration audit', renderer: '@napi-rs/canvas (native Skia); separate from Chrome', canvasPackageVersion: require(path.join(canvasModule, 'package.json')).version, sceneSize: 512, sceneIds, heights, grids, target: targetEntry.src, targetSource: normalized.naturalSize, alphaTrim: normalized.trim, targetRasters: Object.fromEntries([...templates].map(([h, t]) => [h, { width: t.width, height: t.height, samples: t.template.samples.length, rgbaSHA256: t.rgbaSHA256 }])), foregroundLayers: layerDetails, placementSeed: '202610106+height', nominalPlacementsPerSceneHeight: 24, focusedForegroundProbesPerLayer: 6, pairedAcrossGrids: true, repeatedConfigurationsAreWeightedAsProbes: true, visibilityRule: 'Count final visible target alpha>32; alpha is evaluated after pixel scoring and is never passed into inference.', oracle: { algorithm: 'Frozen pixel template matcher with clean-background reference', threshold: .45, defaultsUnmodified: true, emptyOracle: 'abstain with no output', nms: 'threshold-first; radius max(4,.35*min(width,height))' }, pointAccuracy: 'Visible target required; distance from refined point to rendered rectangle center <= half cell diagonal +1px.', quantumMass: 'Independent exact marked/unmarked aggregate formula; known marked count first peak. Includes accidental true-point mass on unmarked states; empty oracle contributes zero.', sampleSeed: 202610107, measurement: 'One ideal Born sample per predefined probe; report separately from exact mass.', constructedFullCover: 'Additional full rectangle copies clean-background pixels over target; a control, not a claim that every real preset can cover every size.', scope: 'Same known verified OpenMoji-derived PNG identity at each configured size, same selected paintings, exact clean background; no arbitrary-upload or QNN generalization claim.', sourceHashes, sourceChangesDuringRun: changedSources }, overall: summarize(rows), summary, visibilitySummary, illustrativeFailures: failures, records: rows };
fs.writeFileSync(path.join(ROOT, 'model/layered-integration-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log('AUDIT_SUMMARY ' + JSON.stringify({ overall: report.overall, visibilitySummary, sourceChangesDuringRun: changedSources }));
if (changedSources.length) process.exitCode = 2;
