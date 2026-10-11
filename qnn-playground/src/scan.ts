/* The Where's Wanda site's window scan, minus the circuit.

waldo-search-lab/dist/wanda-localizer.js scanQNN() scores 4096 window centres
(4 + 8 * column, 4 + 8 * row) on the 512 x 512 scene with the trained QNN,
keeps each Grover address's highest window score (and that window's centre),
accepts addresses scoring at least the threshold, then applies greedy
non-maximum suppression. Ground truth is the site's point tolerance: an
address is correct when its best window centre lies within
hypot(8, 8) / 2 + 1 px of the target's centre.

scanQNN calls the demos' fixed 4-qubit predict(); the playground scores with
whatever circuit is being trained, so this module takes the scores and repeats
everything else exactly. tests/qnn.test.mjs checks it against scanQNN.
==============================================================================*/

export const SCENE_SIZE = 512;
/** Window centres per side, and their spacing in pixels. */
export const SCAN_GRID = 64;
export const SCAN_SPACING = 8;
export const POINT_TOLERANCE = Math.hypot(SCAN_SPACING, SCAN_SPACING) / 2 + 1;
/** The Grover address grids the site allows. */
export const ADDRESS_GRIDS = [4, 8, 16, 32, 64];

export interface Point {
  x: number;
  y: number;
}

/** The 4096 window centres, in scanQNN's (row-major) order. */
export function windowCenters(): Point[] {
  let out: Point[] = [];
  for (let i = 0; i < SCAN_GRID * SCAN_GRID; i++) {
    out.push({x: (i % SCAN_GRID + .5) * SCAN_SPACING,
        y: (Math.floor(i / SCAN_GRID) + .5) * SCAN_SPACING});
  }
  return out;
}

/** The address (region index) of a point on a grid x grid address grid. */
export function addressOf(p: Point, grid: number): number {
  let s = SCENE_SIZE / grid;
  return Math.floor(p.y / s) * grid + Math.floor(p.x / s);
}

/**
 * Window indices per address, in scan order (so a tie keeps the first
 * window, as scanQNN's strict ">" does).
 */
export function windowsByAddress(grid: number): number[][] {
  let out: number[][] = Array.from({length: grid * grid}, () => []);
  windowCenters().forEach((p, i) => out[addressOf(p, grid)].push(i));
  return out;
}

/** scanQNN's non-maximum suppression radius for a target width. */
export function nmsRadius(targetWidth: number): number {
  return Math.max(12, .35 * targetWidth);
}

/**
 * scanQNN's marks: addresses scoring >= threshold, best first (ties by
 * index), dropping any whose best point lies within `radius` of one kept.
 */
export function suppress(scores: ArrayLike<number>, points: Point[],
    threshold: number, radius: number): number[] {
  let accepted: number[] = [];
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] >= threshold) {
      accepted.push(i);
    }
  }
  accepted.sort((a, b) => scores[b] - scores[a] || a - b);
  let kept: number[] = [];
  for (let i of accepted) {
    if (!kept.some(k => Math.hypot(points[i].x - points[k].x,
        points[i].y - points[k].y) <= radius)) {
      kept.push(i);
    }
  }
  return kept.sort((a, b) => a - b);
}

/** Addresses whose best point is within the site's tolerance of `center`. */
export function truthByPoint(points: Point[], center: Point | null,
    tolerance = POINT_TOLERANCE): Set<number> {
  let out = new Set<number>();
  if (center) {
    points.forEach((p, i) => {
      if (Math.hypot(p.x - center.x, p.y - center.y) <= tolerance) {
        out.add(i);
      }
    });
  }
  return out;
}
