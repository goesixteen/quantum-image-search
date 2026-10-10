/** Browser counterpart to model/train.py. Exact 4-qubit statevector inference.
 * Qubit 0 is the least significant basis bit. This module uses no packages.
 */
export const FEATURE_NAMES = [
  'yellow_coverage', 'yellow_aspect', 'window_runs', 'window_darkness',
  'window_spacing', 'wheel_runs', 'body_fill', 'lower_darkness',
];
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const segments = (profile) => {
  const runs = [];
  let start = -1;
  for (let i = 0; i <= profile.length; i++) {
    if (i < profile.length && profile[i]) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      runs.push([start, i]);
      start = -1;
    }
  }
  return runs;
};

/** Eight deterministic color/geometry features from 64x64 opaque RGBA pixels.
 * Images should be composited over the captcha background before extraction.
 * Neither the label nor a sprite's position is an input to this function.
 */
export function extractFeatures(imageData, colorMode = 'synthetic') {
  const { width: w, height: h, data } = imageData;
  if (!w || !h || data.length !== w * h * 4) throw new Error('Expected RGBA ImageData.');
  const yellow = new Uint8Array(w * h);
  const dark = new Uint8Array(w * h);
  const cols = new Uint16Array(w), rows = new Uint16Array(h);
  let area = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x, i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const hueOK = colorMode !== 'photo' || ((g - b) > (r - b) * .47 && r >= g * .96);
    if (r > 125 && g > 82 && b < 150 && r > b * 1.35 && g > b * 1.20 && r < g * 1.9 && hueOK) {
      yellow[p] = 1; area++; cols[x]++; rows[y]++;
    }
    dark[p] = .2126 * r + .7152 * g + .0722 * b < 105 ? 1 : 0;
  }
  const zero = () => Array(8).fill(0);
  if (area < 8) return zero();
  const cx = [], ry = [];
  cols.forEach((n, i) => { if (n >= 2) cx.push(i); });
  rows.forEach((n, i) => { if (n >= 2) ry.push(i); });
  if (cx.length < 2 || ry.length < 2) return zero();
  const x0 = cx[0], x1 = cx[cx.length - 1] + 1;
  const y0 = ry[0], y1 = ry[ry.length - 1] + 1;
  const bw = x1 - x0, bh = y1 - y0;
  const xa = x0 + Math.max(1, Math.floor(bw * .08));
  const xb = x1 - Math.max(1, Math.floor(bw * .08));
  const ya = y0 + Math.max(1, Math.floor(bh * .13));
  const yb = Math.min(h, y0 + Math.max(2, Math.floor(bh * .58)));
  if (xb <= xa || yb <= ya) return zero();
  const wp = [], wheels = [];
  let wd = 0, bd = 0, fill = 0;
  for (let x = xa; x < xb; x++) {
    let count = 0;
    for (let y = ya; y < yb; y++) count += dark[y * w + x];
    wd += count; wp.push(count / (yb - ya) > .48);
  }
  const runs = segments(wp), centers = runs.map(([a, b]) => (a + b) / 2);
  const gaps = centers.slice(1).map((v, i) => v - centers[i]);
  let spacing = 0;
  if (gaps.length >= 2) {
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const deviation = Math.sqrt(gaps.reduce((a, v) => a + (v - mean) ** 2, 0) / gaps.length);
    spacing = Math.max(0, 1 - deviation / Math.max(1, mean));
  }
  const wy0 = Math.max(0, y1 - 1), wy1 = Math.min(h, y1 + Math.max(2, Math.floor(bh * .36)));
  for (let x = x0; x < x1; x++) {
    let count = 0;
    for (let y = wy0; y < wy1; y++) count += dark[y * w + x];
    bd += count; wheels.push(count / (wy1 - wy0) > .40);
  }
  const ly0 = Math.min(h - 1, y0 + Math.floor(bh * .77));
  const ly1 = Math.min(h, ly0 + Math.max(1, Math.floor(bh * .14)));
  for (let y = ly0; y < ly1; y++) for (let x = x0; x < x1; x++) fill += yellow[y * w + x];
  return [area / (w * h * .22), bw / Math.max(1, bh) / 3, runs.length / 6,
    wd / ((xb - xa) * (yb - ya)) / .65, spacing, segments(wheels).length / 3,
    fill / ((ly1 - ly0) * bw), bd / ((wy1 - wy0) * bw) / .55].map(v => clamp(v));
}

/** Same eight geometric features, with a stricter yellow hue for street photos.
 * Use only with a model declaring featureExtractor === 'yellow-hue-v2'.
 */
export function extractPhotoFeatures(imageData) {
  return extractFeatures(imageData, 'photo');
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
