// Pixel template oracle. This module never receives renderer positions or truth masks.
// Target ImageData must already be rasterized at its fixed display size.
const clamp = (x, low, high) => Math.max(low, Math.min(high, x));

function imageShape(image, name) {
  if (!image || !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1 || !image.data || image.data.length !== image.width * image.height * 4) throw new TypeError(`${name} must be RGBA ImageData.`);
  return image;
}

function numberOption(value, fallback, low, high, name) {
  const result = value ?? fallback;
  if (!Number.isFinite(result) || result < low || result > high) throw new RangeError(`${name} must be in [${low}, ${high}].`);
  return result;
}

export function gridSpec(grid, width = 512, height = 512) {
  if (!Number.isInteger(grid) || grid < 2 || grid > 64 || (grid & (grid - 1))) throw new RangeError('grid must be a power of two from 2 to 64.');
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new RangeError('Canvas dimensions must be positive.');
  return { grid, count: grid * grid, qubits: 2 * Math.log2(grid), cellWidth: width / grid, cellHeight: height / grid, quantizationRadius: Math.hypot(width / grid, height / grid) / 2 };
}

export function candidatePoint(index, grid, width = 512, height = 512) {
  const spec = gridSpec(grid, width, height);
  if (!Number.isInteger(index) || index < 0 || index >= spec.count) throw new RangeError('Candidate index is outside the grid.');
  return { index, x: (index % grid + .5) * spec.cellWidth, y: (Math.floor(index / grid) + .5) * spec.cellHeight };
}

export function pointCandidate(x, y, grid, width = 512, height = 512) {
  const spec = gridSpec(grid, width, height);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > width || y > height) throw new RangeError('Point is outside the canvas.');
  return Math.min(grid - 1, Math.floor(y / spec.cellHeight)) * grid + Math.min(grid - 1, Math.floor(x / spec.cellWidth));
}

export function pointDistance(a, b) {
  if (![a?.x, a?.y, b?.x, b?.y].every(Number.isFinite)) throw new TypeError('Points must have finite x and y.');
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Multiplicative integer hash provides deterministic spatial sampling, independent
// of target identity and location. Color balancing keeps large white areas from
// dominating a target that also contains smaller distinctive colors.
function hash(index) {
  let x = (index + 1) >>> 0; x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); return (x ^ (x >>> 16)) >>> 0;
}

export function prepareTemplate(targetImageData, options = {}) {
  const target = imageShape(targetImageData, 'targetImageData');
  const sampleCount = numberOption(options.sampleCount, 192, 16, 256, 'sampleCount');
  const minAlpha = numberOption(options.minAlpha, 160, 1, 255, 'minAlpha');
  const points = [];
  for (let i = 0; i < target.width * target.height; i++) {
    const offset = i * 4;
    if (target.data[offset + 3] >= minAlpha) points.push({ index: i, priority: hash(i) });
  }
  if (points.length < 16) throw new RangeError('Target needs at least 16 sufficiently opaque pixels at its rendered size.');
  points.sort((a, b) => a.priority - b.priority || a.index - b.index);
  const chosen = points.slice(0, Math.floor(sampleCount));
  const colors = new Map();
  for (const { index } of chosen) {
    const i = index * 4, bin = (target.data[i] >> 6) * 16 + (target.data[i + 1] >> 6) * 4 + (target.data[i + 2] >> 6);
    colors.set(bin, (colors.get(bin) || 0) + 1);
  }
  const samples = chosen.map(({ index }) => {
    const i = index * 4, r = target.data[i], g = target.data[i + 1], b = target.data[i + 2];
    const bin = (r >> 6) * 16 + (g >> 6) * 4 + (b >> 6);
    return Object.freeze({ dx: index % target.width + .5 - target.width / 2, dy: Math.floor(index / target.width) + .5 - target.height / 2, r, g, b, alpha: target.data[i + 3] / 255, weight: 1 / Math.sqrt(colors.get(bin)) });
  });
  return Object.freeze({ width: target.width, height: target.height, samples: Object.freeze(samples), opaquePixelCount: points.length, minAlpha, totalWeight: samples.reduce((sum, p) => sum + p.weight, 0) });
}

const rgbDistance = (r, g, b) => Math.sqrt((r * r + g * g + b * b) / 3);

export function matchTemplate(sceneImageData, template, options = {}) {
  const scene = imageShape(sceneImageData, 'sceneImageData');
  if (!template || !Array.isArray(template.samples) || template.samples.length < 16 || !Number.isFinite(template.totalWeight) || template.totalWeight <= 0) throw new TypeError('Use prepareTemplate to create a target template.');
  const background = options.backgroundImageData == null ? null : imageShape(options.backgroundImageData, 'backgroundImageData');
  if (background && (background.width !== scene.width || background.height !== scene.height)) throw new RangeError('Background and scene dimensions must match.');
  const grid = options.grid ?? 32, spec = gridSpec(grid, scene.width, scene.height);
  const threshold = numberOption(options.threshold, .45, 0, 1, 'threshold');
  const colorTolerance = numberOption(options.colorTolerance, 75, 1, 255, 'colorTolerance');
  const minContrast = numberOption(options.minContrast, 18, 1, 255, 'minContrast');
  const minimumVisibleFraction = numberOption(options.minimumVisibleFraction, .30, 0, 1, 'minimumVisibleFraction');
  const minimumInformativeFraction = numberOption(options.minimumInformativeFraction, .20, 0, 1, 'minimumInformativeFraction');
  const suppressionRadius = numberOption(options.suppressionRadius, Math.max(4, Math.min(template.width, template.height) * .35), 0, Math.max(scene.width, scene.height), 'suppressionRadius');
  const maxRefinements = Math.floor(numberOption(options.maxRefinements, 12, 0, 128, 'maxRefinements'));
  const scanGrid = 64, scanWidth = scene.width / scanGrid, scanHeight = scene.height / scanGrid;
  const diagnostics = { scoreEvaluations: 0, sampleComparisons: 0, backgroundProvided: !!background, scanGrid, thresholdPassingCount: 0, suppressedCount: 0, sparseTemplateSamples: template.samples.length };

  function scoreAt(x, y) {
    diagnostics.scoreEvaluations++;
    let informativeWeight = 0, matchedWeight = 0, qualityWeight = 0, inBoundsWeight = 0;
    for (const p of template.samples) {
      diagnostics.sampleComparisons++;
      const sx = Math.floor(x + p.dx), sy = Math.floor(y + p.dy);
      if (sx < 0 || sy < 0 || sx >= scene.width || sy >= scene.height) continue;
      inBoundsWeight += p.weight;
      const i = (sy * scene.width + sx) * 4;
      let er = p.r, eg = p.g, eb = p.b, gain = 1;
      if (background) {
        er = p.alpha * p.r + (1 - p.alpha) * background.data[i];
        eg = p.alpha * p.g + (1 - p.alpha) * background.data[i + 1];
        eb = p.alpha * p.b + (1 - p.alpha) * background.data[i + 2];
        const contrast = rgbDistance(er - background.data[i], eg - background.data[i + 1], eb - background.data[i + 2]);
        if (contrast < minContrast) continue;
        const sceneChange = rgbDistance(scene.data[i] - background.data[i], scene.data[i + 1] - background.data[i + 1], scene.data[i + 2] - background.data[i + 2]);
        const expectedError = rgbDistance(scene.data[i] - er, scene.data[i + 1] - eg, scene.data[i + 2] - eb);
        gain = clamp((sceneChange - expectedError) / contrast, 0, 1);
      }
      informativeWeight += p.weight;
      const distance = rgbDistance(scene.data[i] - er, scene.data[i + 1] - eg, scene.data[i + 2] - eb);
      if (distance <= colorTolerance && gain >= .3) matchedWeight += p.weight;
      qualityWeight += p.weight * Math.max(0, 1 - distance / colorTolerance) ** 2 * gain;
    }
    const informativeFraction = informativeWeight / template.totalWeight;
    const matchedFraction = informativeWeight ? matchedWeight / informativeWeight : 0;
    const inBoundsFraction = inBoundsWeight / template.totalWeight;
    const registrationScore = informativeFraction >= minimumInformativeFraction && inBoundsFraction >= .65 ? qualityWeight / informativeWeight : 0;
    const score = matchedFraction >= minimumVisibleFraction ? registrationScore : 0;
    return { score: clamp(score, 0, 1), registrationScore: clamp(registrationScore, 0, 1), matchedFraction, informativeFraction, inBoundsFraction, bestX: x, bestY: y };
  }

  const candidates = Array.from({ length: spec.count }, (_, index) => {
    const p = candidatePoint(index, grid, scene.width, scene.height);
    return { index, centerX: p.x, centerY: p.y, score: 0, registrationScore: 0, matchedFraction: 0, informativeFraction: 0, inBoundsFraction: 0, bestX: p.x, bestY: p.y };
  });
  // A fixed 64x64 registration lattice is shared across selectable search grids.
  // Each address aggregates only center hypotheses inside its own cell.
  for (let row = 0; row < scanGrid; row++) for (let col = 0; col < scanGrid; col++) {
    const x = (col + .5) * scanWidth, y = (row + .5) * scanHeight;
    const candidate = candidates[pointCandidate(x, y, grid, scene.width, scene.height)];
    const result = scoreAt(x, y);
    if (result.registrationScore > candidate.registrationScore) Object.assign(candidate, result);
  }
  if (options.refine !== false && maxRefinements) {
    const promising = candidates.filter((c) => c.registrationScore > .01).sort((a, b) => b.registrationScore - a.registrationScore || a.index - b.index).slice(0, maxRefinements);
    for (const candidate of promising) {
      const originX = candidate.bestX, originY = candidate.bestY;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        if (dx === 0 && dy === 0) continue;
        const x = originX + dx * scanWidth / 8, y = originY + dy * scanHeight / 8;
        if (x < 0 || y < 0 || x >= scene.width || y >= scene.height || pointCandidate(x, y, grid, scene.width, scene.height) !== candidate.index) continue;
        const result = scoreAt(x, y);
        if (result.registrationScore > candidate.registrationScore) Object.assign(candidate, result);
      }
      // A stripe alias can put the coarse winner one pixel beyond the closest
      // lattice neighborhood. One small polishing pass resolves that edge case.
      const polishX = candidate.bestX, polishY = candidate.bestY;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const x = polishX + dx * scanWidth / 8, y = polishY + dy * scanHeight / 8;
        if (x < 0 || y < 0 || x >= scene.width || y >= scene.height || pointCandidate(x, y, grid, scene.width, scene.height) !== candidate.index) continue;
        const result = scoreAt(x, y);
        if (result.registrationScore > candidate.registrationScore) Object.assign(candidate, result);
      }
    }
  }
  const passing = candidates.filter((c) => c.score >= threshold && c.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
  diagnostics.thresholdPassingCount = passing.length;
  const accepted = [];
  for (const candidate of passing) if (!accepted.some((other) => Math.hypot(candidate.bestX - other.bestX, candidate.bestY - other.bestY) < suppressionRadius)) accepted.push(candidate);
  diagnostics.suppressedCount = passing.length - accepted.length;
  return { scores: candidates.map((c) => c.score), marks: accepted.map((c) => c.index).sort((a, b) => a - b), candidates, grid, candidateCount: spec.count, threshold, suppressionRadius, templateSize: { width: template.width, height: template.height }, localizationTolerance: { centerQuantizationRadius: spec.quantizationRadius, registrationStepX: scanWidth / 8, registrationStepY: scanHeight / 8 }, diagnostics };
}
