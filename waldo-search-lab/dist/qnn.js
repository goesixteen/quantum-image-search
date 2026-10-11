/** Pixel features for a synthetic red/white horizontally striped explorer.
 * No face recognition, coordinates, sprite mask, or placement labels are inputs.
 */
export const FEATURE_NAMES = ['red_coverage', 'stripe_bands', 'white_gaps',
  'stripe_regularity', 'stripe_coherence', 'blue_below', 'stripe_area', 'stripe_aspect'];
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const runs = profile => {
  const result = []; let start = -1;
  for (let i = 0; i <= profile.length; i++) {
    if (i < profile.length && profile[i]) { if (start < 0) start = i; }
    else if (start >= 0) { result.push([start, i]); start = -1; }
  }
  return result;
};
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

export function extractFeatures(imageData) {
  const { width: w, height: h, data } = imageData;
  if (!w || !h || data.length !== w * h * 4) throw new Error('Expected opaque RGBA ImageData.');
  const redPrefix = Array.from({ length: h }, () => new Float64Array(w + 1));
  const whitePrefix = Array.from({ length: h }, () => new Float64Array(w + 1));
  const bluePrefix = Array.from({ length: h }, () => new Float64Array(w + 1));
  let redArea = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    const red = r > 125 && r > 1.38 * g && r > 1.25 * b ? 1 : 0;
    const white = Math.min(r, g, b) > 170 && Math.max(r, g, b) - Math.min(r, g, b) < 65 ? 1 : 0;
    const blue = b > 85 && b > 1.12 * r && b > .90 * g ? 1 : 0;
    redPrefix[y][x + 1] = redPrefix[y][x] + red;
    whitePrefix[y][x + 1] = whitePrefix[y][x] + white;
    bluePrefix[y][x + 1] = bluePrefix[y][x] + blue;
    redArea += red;
  }
  const coverage = clamp(redArea / (w * h * .12));
  let best = [coverage, 0, 0, 0, 0, 0, 0, 0], bestStrength = 0;
  const widths = [...new Set([.06, .10, .16, .24].map(f => Math.max(3, Math.round(w * f))))];
  for (const width of widths) for (let x = 0; x + width <= w; x += Math.max(1, Math.floor(width / 3))) {
    const rp = [], wp = [], bp = [];
    for (let y = 0; y < h; y++) {
      rp.push((redPrefix[y][x + width] - redPrefix[y][x]) / width);
      wp.push((whitePrefix[y][x + width] - whitePrefix[y][x]) / width);
      bp.push((bluePrefix[y][x + width] - bluePrefix[y][x]) / width);
    }
    const bands = runs(rp.map(v => v > .35)).filter(([a, b]) => b - a <= Math.max(3, Math.floor(h * .16)));
    let chain = [];
    const evaluate = group => {
      if (group.length < 2) return;
      const first = group[0][0], last = group.at(-1)[1], span = last - first;
      const redValues = [], whiteValues = [], centers = group.map(([a, b]) => (a + b) / 2);
      group.forEach(([a, b]) => { for (let y = a; y < b; y++) redValues.push(rp[y]); });
      for (let k = 0; k < group.length - 1; k++) {
        for (let y = group[k][1]; y < group[k + 1][0]; y++) whiteValues.push(wp[y]);
      }
      const gapMeans = centers.slice(1).map((v, i) => v - centers[i]);
      const avgGap = mean(gapMeans), variance = mean(gapMeans.map(v => (v - avgGap) ** 2));
      const regularity = clamp(1 - Math.sqrt(variance) / (avgGap + 1));
      const redMean = mean(redValues), whiteMean = mean(whiteValues);
      const strength = (group.length - 1) * Math.sqrt(width) * redMean * whiteMean * (.25 + .75 * regularity);
      if (strength <= bestStrength) return;
      const bottom = Math.min(h, last + Math.max(4, Math.round(span * 2)));
      bestStrength = strength;
      best = [coverage, clamp((group.length - 1) / 4), clamp(whiteMean / .65), regularity,
        clamp(redMean * whiteMean / .65), clamp(mean(bp.slice(last, bottom)) / .35),
        clamp(width * span / (w * h * .12)), clamp(span / (width * 2))];
    };
    for (const band of bands) {
      if (!chain.length) { chain = [band]; continue; }
      const previous = chain.at(-1), gap = band[0] - previous[1];
      if (gap >= 1 && gap <= Math.max(3, Math.floor(h * .14)) && mean(wp.slice(previous[1], band[0])) > .35) {
        chain.push(band);
      } else { evaluate(chain); chain = [band]; }
    }
    evaluate(chain);
  }
  return best;
}

/** Returns raw observable expectations for the trained variational circuit. */
export function quantumReadout(features, theta) {
  if (features.length !== 8 || !theta.length || theta.length % 8 !== 0) throw new Error('Expected 8 features and a multiple of 8 circuit parameters.');
  const re = new Float64Array(16), im = new Float64Array(16); re[0] = 1;
  const ry = (q, angle) => {
    const mask = 1 << q, c = Math.cos(angle / 2), s = Math.sin(angle / 2);
    for (let a = 0; a < 16; a++) if (!(a & mask)) {
      const b = a | mask, ar = re[a], ai = im[a], br = re[b], bi = im[b];
      re[a] = c * ar - s * br; im[a] = c * ai - s * bi;
      re[b] = s * ar + c * br; im[b] = s * ai + c * bi;
    }
  };
  const rz = (q, angle) => {
    const c = Math.cos(angle / 2), sn = Math.sin(angle / 2);
    for (let i = 0; i < 16; i++) {
      const s = (i & (1 << q)) ? sn : -sn, r = re[i], j = im[i];
      re[i] = c * r - s * j; im[i] = s * r + c * j;
    }
  };
  const cx = (control, target) => {
    for (let a = 0; a < 16; a++) if ((a & (1 << control)) && !(a & (1 << target))) {
      const b = a | (1 << target);
      [re[a], re[b]] = [re[b], re[a]]; [im[a], im[b]] = [im[b], im[a]];
    }
  };
  let p = 0;
  for (let layer = 0; layer < theta.length / 8; layer++) {
    for (let q = 0; q < 4; q++) { ry(q, Math.PI * features[q]); rz(q, Math.PI * features[q + 4]); }
    for (let q = 0; q < 4; q++) { ry(q, theta[p++]); rz(q, theta[p++]); }
    cx(0, 1); cx(1, 2); cx(2, 3); cx(3, 0);
  }
  const out = Array(7).fill(0);
  for (let i = 0; i < 16; i++) {
    const prob = re[i] ** 2 + im[i] ** 2;
    const z = [0, 1, 2, 3].map(q => (i & (1 << q)) ? -1 : 1);
    const obs = [...z, z[0] * z[1], z[2] * z[3], z[0] * z[1] * z[2] * z[3]];
    obs.forEach((v, k) => { out[k] += prob * v; });
  }
  return out;
}

/** Classical sigmoid readout of trained quantum expectations (score in [0,1]). */
export function predict(features, model) {
  const z = quantumReadout(features, model.theta);
  let logit = model.bias;
  z.forEach((v, k) => { logit += v * model.readout[k]; });
  return 1 / (1 + Math.exp(-clamp(logit, -40, 40)));
}
