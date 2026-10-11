/* The playground's scene: the Where's Wanda site, and its training data.

It reuses the site's own pieces (waldo-search-lab), so it cannot drift from
it: the five catalog backgrounds and wanda.png (dist/scene-catalog.json), the
site's compositor (dist/scene-editor.js), its window feature extractor
(dist/wanda-localizer.js) at the supplied height, the 4096-window scan with
max-per-address, threshold and NMS (see scan.ts), and the site's
wanda-qnn.json.

Artwork, catalog and weights are copied into dist/project/ by
scripts/build.mjs. Training data are generated in the browser following the
site's recipe (model/wanda-qnn/build-corpus.mjs and protocol.json). They
approximate, and do not reproduce, its dataset.
==============================================================================*/

import {extractWindowFeatures, FEATURE_NAMES as WANDA_FEATURES}
    from "../../waldo-search-lab/dist/wanda-localizer.js";
import {compositeLayeredScene, targetRectFromCenter}
    from "../../waldo-search-lab/dist/scene-editor.js";
import {trainLogistic, ProjectModel} from "./qnn";
import {Point, SCENE_SIZE, SCAN_GRID, ADDRESS_GRIDS, POINT_TOLERANCE,
    windowCenters, windowsByAddress, nmsRadius, truthByPoint} from "./scan";

export interface Placement {
  /** Region index of the target, or null when it is absent. */
  targetCell: number | null;
  /** Offset from the region's centre, in region widths (0 = centred). */
  jitter?: {dx: number, dy: number};
  /** Catalog background id and supplied target height (px). */
  background?: string;
  height?: number;
}

/** One window (or patch) the classifier can score for an address. */
export interface Candidate {
  /** Where a hit would be: the window centre. */
  point: Point;
  features: number[];
}

/** One labelled training/test example. */
export interface Patch {
  canvas: HTMLCanvasElement;
  features: number[];
  label: number;
  /**
   * A pairwise ranking example: `features` is a target window and
   * `pair` a nearby non-target window from the same composite.
   */
  pair?: number[];
}

export interface Scene {
  id: "wanda";
  title: string;
  /** The target with its article, as used in sentences. */
  target: string;
  featureNames: string[];
  /** Short labels for the feature column. */
  featureLabels: string[];
  /** Address grids (regions per side) the site offers, and its default. */
  grids: number[];
  defaultGrid: number;
  /** The site's default target square, on the default grid. */
  defaultTarget: number;
  /** The site's trained weights (loaded by load()). */
  model: ProjectModel;
  credit: string;
  /** What the guided view says about decoys. */
  decoys: string;
  load(): Promise<void>;
  /** Draws the 512 x 512 scene the classifier reads. */
  render(ctx: CanvasRenderingContext2D, grid: number, p: Placement): void;
  /** Per address, every window the scan scores there. */
  candidates(raster: HTMLCanvasElement, grid: number, p: Placement):
      Candidate[][];
  /** The site's NMS radius for marked addresses. */
  nmsRadius(p: Placement): number;
  /** Correct addresses, used only after measuring. */
  truth(grid: number, p: Placement, best: Point[]): Set<number>;
  makeDataset(n: number, noise: number): Patch[];
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randInt = (a: number, b: number) => Math.floor(rand(a, b));
const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

function image(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

async function json(src: string): Promise<any> {
  let r = await fetch(src);
  if (!r.ok) {
    throw new Error(`Could not load ${src}`);
  }
  return r.json();
}

function canvas(w: number, h = w): [HTMLCanvasElement,
    CanvasRenderingContext2D] {
  let c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  let ctx = c.getContext("2d", {willReadFrequently: true});
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return [c, ctx];
}

/**
 * A canvas made as the site's makeCanvas() and targetRaster() make
 * theirs: a plain 2D context (no willReadFrequently, which in Chrome moves
 * drawing to the CPU and changes high-quality resampling). Rendering Wanda
 * through it keeps her pixels identical to the site's.
 */
function siteCanvas(w: number, h = w): [HTMLCanvasElement,
    CanvasRenderingContext2D] {
  let c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

/** TF Playground's noise slider (0..50): Gaussian sensor noise in place. */
function addNoise(im: ImageData, noise: number) {
  if (noise <= 0) {
    return;
  }
  let sigma = noise * .6;
  for (let k = 0; k < im.data.length; k += 4) {
    for (let ch = 0; ch < 3; ch++) {
      let g = Math.sqrt(-2 * Math.log(Math.max(1e-12, Math.random()))) *
          Math.cos(2 * Math.PI * Math.random());
      im.data[k + ch] = Math.max(0, Math.min(255, im.data[k + ch] + g * sigma));
    }
  }
}

/** Centre of `cell` on a grid, moved by `jitter` region widths. */
function cellCenter(grid: number, cell: number,
    jitter?: {dx: number, dy: number}): Point {
  let s = SCENE_SIZE / grid;
  return {x: (cell % grid + .5 + (jitter?.dx ?? 0)) * s,
      y: (Math.floor(cell / grid) + .5 + (jitter?.dy ?? 0)) * s};
}

/* ---------------------------- Where's Wanda ---------------------------- */

/** The catalog's five built-in backgrounds, staged as the site does. */
export const wandaBackgrounds: {id: string, name: string,
    canvas: HTMLCanvasElement}[] = [];
/** wanda.png trimmed to alpha > 16, as the site and its corpus do. */
let wandaTrimmed: HTMLCanvasElement;
const wandaRasters = new Map<string, HTMLCanvasElement>();
/** The heights the site's model was trained at; 52 is its default. */
export const WANDA_HEIGHTS = [40, 46, 52, 58, 64];
export const WANDA_DEFAULT_HEIGHT = 52;
/** Correct-label radius of the site's corpus (protocol.json). */
const CORPUS_TOLERANCE = 6.657;
/** Window features of the last rendered scene (they do not depend on grid). */
let sceneWindows: {raster: HTMLCanvasElement, key: string,
    features: number[][]} = null;

function wandaWidth(height: number): number {
  return Math.max(1, Math.round(height * wandaTrimmed.width /
      wandaTrimmed.height));
}

/**
 * The target resized with high smoothing (the site's targetRaster), or one
 * of its corpus's altered-art decoys (build-corpus.mjs raster()).
 */
function wandaRaster(height: number, kind = "target"): HTMLCanvasElement {
  let key = `${height}:${kind}`;
  if (wandaRasters.has(key)) {
    return wandaRasters.get(key);
  }
  let width = wandaWidth(height);
  // The site's targetRaster(): a plain canvas, high-quality resize.
  let [c, ctx] = kind === "target" ? siteCanvas(width, height) :
      canvas(width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(wandaTrimmed, 0, 0, width, height);
  if (kind !== "target") {
    let d = ctx.getImageData(0, 0, width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let i = (y * width + x) * 4, r = d.data[i], g = d.data[i + 1],
            b = d.data[i + 2], red = r > 125 && r > 1.38 * g && r > 1.25 * b;
        if (kind === "blue-stripes" && red) {
          d.data[i] = 35; d.data[i + 1] = 101; d.data[i + 2] = 180;
        }
        if (kind === "solid-red" && y >= height * .27 && y < height * .50 &&
            Math.min(r, g, b) > 170 && d.data[i + 3] > 32) {
          d.data[i] = 215; d.data[i + 1] = 21; d.data[i + 2] = 30;
        }
      }
    }
    ctx.putImageData(d, 0, 0);
  }
  wandaRasters.set(key, c);
  return c;
}

/**
 * The site's targetRect: a centre (kept inside the frame, as dragging is)
 * and an integer-origin rectangle. `center` is the rectangle's true centre.
 */
function wandaRect(grid: number, p: Placement) {
  let h = p.height ?? WANDA_DEFAULT_HEIGHT, w = wandaWidth(h);
  let c = cellCenter(grid, p.targetCell, p.jitter);
  let cx = Math.max(w / 2, Math.min(SCENE_SIZE - w / 2, c.x));
  let cy = Math.max(h / 2, Math.min(SCENE_SIZE - h / 2, c.y));
  let r = targetRectFromCenter(cx, cy, w, h);
  r.x = Math.round(r.x);
  r.y = Math.round(r.y);
  return {...r, center: {x: r.x + w / 2, y: r.y + h / 2}};
}

function wandaBackground(id?: string): HTMLCanvasElement {
  return (wandaBackgrounds.find(b => b.id === id) ?? wandaBackgrounds[0])
      .canvas;
}

/**
 * One training composite as build-corpus.mjs render(): a background drawn
 * 1:1, the (target or decoy) raster at an integer origin. Only the region
 * the windows can reach is drawn; extractWindowFeatures treats pixels
 * outside the 512 frame as outside, and the crop is clipped to that frame.
 */
function wandaComposite(bg: HTMLCanvasElement, height: number, cx: number,
    cy: number, kind: string | null, reach: number, noise: number) {
  let t = kind ? wandaRaster(height, kind) : null;
  let w = wandaWidth(height);
  let x = Math.round(cx - w / 2), y = Math.round(cy - height / 2);
  let center = {x: x + w / 2, y: y + height / 2};
  let x0 = Math.max(0, Math.floor(center.x - reach)),
      y0 = Math.max(0, Math.floor(center.y - reach)),
      x1 = Math.min(SCENE_SIZE, Math.ceil(center.x + reach)),
      y1 = Math.min(SCENE_SIZE, Math.ceil(center.y + reach));
  let [c, ctx] = canvas(x1 - x0, y1 - y0);
  ctx.drawImage(bg, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
  if (t) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(t, x - x0, y - y0);
  }
  let im = ctx.getImageData(0, 0, c.width, c.height);
  addNoise(im, noise);
  ctx.putImageData(im, 0, 0);
  let shape = {targetWidth: w, targetHeight: height};
  return {
    center,
    canvas: c,
    features: (p: Point) => Array.from(extractWindowFeatures(im, p.x - x0,
        p.y - y0, shape)) as number[],
    /** The window around `p`, for the patch strip. */
    crop: (p: Point) => {
      let ww = Math.max(w + 16, Math.ceil(1.6 * w)), wh = height + 16;
      let [v, vctx] = canvas(ww, wh);
      // Shift the composite so the window's top-left lands at (0, 0).
      vctx.drawImage(c, ww / 2 - (p.x - x0), wh / 2 - (p.y - y0));
      return v;
    },
  };
}

const wandaScene: Scene = {
  id: "wanda",
  title: "Where's Wanda",
  target: "Wanda",
  featureNames: WANDA_FEATURES,
  featureLabels: ["stripes", "x-phase", "red/white", "face+hair", "trousers",
      "align x", "align y", "height"],
  grids: ADDRESS_GRIDS,
  // The site's 64 x 64 address grid (12 Grover qubits) and its default
  // centre (420, 300).
  defaultGrid: 64,
  defaultTarget: 37 * 64 + 52,
  model: null,
  credit: "Original AI-generated Wanda and backgrounds from waldo-search-lab.",
  decoys: "Striped bystanders are decoys.",
  async load() {
    let base = "project/wanda/";
    let catalog = await json(base + "scene-catalog.json");
    let target = catalog.targets.find((t: any) => t.id === "wanda");
    let img = await image(base + target.src);
    // The site's normalizedTarget(): trim to alpha > 16.
    let [full, fctx] = canvas(img.naturalWidth, img.naturalHeight);
    fctx.drawImage(img, 0, 0);
    let d = fctx.getImageData(0, 0, full.width, full.height).data;
    let x0 = full.width, y0 = full.height, x1 = 0, y1 = 0;
    for (let y = 0; y < full.height; y++) {
      for (let x = 0; x < full.width; x++) {
        if (d[(y * full.width + x) * 4 + 3] > 16) {
          x0 = Math.min(x0, x); y0 = Math.min(y0, y);
          x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1);
        }
      }
    }
    let [t, tctx] = siteCanvas(x1 - x0, y1 - y0);
    tctx.drawImage(full, x0, y0, t.width, t.height, 0, 0, t.width, t.height);
    wandaTrimmed = t;
    wandaRasters.clear();
    wandaBackgrounds.length = 0;
    for (let entry of catalog.scenes) {
      if (!entry.id.startsWith("wanda-")) {
        continue;
      }
      // The site shows Park's curated variant (an added coral-and-denim
      // lookalike); it uses the pre-rendered file, so do we.
      let src = entry.curatedArtwork?.preRenderedSrc ?? entry.src;
      let bg = await image(base + src);
      // The site's renderSceneImage(): high-quality 512 px staging.
      let [c, ctx] = siteCanvas(SCENE_SIZE);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bg, 0, 0, SCENE_SIZE, SCENE_SIZE);
      wandaBackgrounds.push({id: entry.id, name: entry.name, canvas: c});
    }
    this.model = await json(base + "model/wanda-qnn.json");
  },
  render(ctx, grid, p) {
    let bg = wandaBackground(p.background), present = p.targetCell != null;
    let h = p.height ?? WANDA_DEFAULT_HEIGHT;
    let r = present ? wandaRect(grid, p) : null;
    // The site's own compositor, with its Wanda setting (the raster is
    // already resized, so it is copied without a second filter).
    let frame = (compositeLayeredScene as any)({backgroundCanvas: bg,
        target: present ? wandaRaster(h) : null,
        targetRect: r && {x: r.x, y: r.y, width: r.width, height: r.height},
        targetSmoothing: false});
    ctx.drawImage(frame.canvas, 0, 0);
  },
  candidates(raster, grid, p) {
    let key = JSON.stringify(p) + grid;
    if (!sceneWindows || sceneWindows.raster !== raster ||
        sceneWindows.key !== key) {
      let im = raster.getContext("2d", {willReadFrequently: true})
          .getImageData(0, 0, SCENE_SIZE, SCENE_SIZE);
      let h = p.height ?? WANDA_DEFAULT_HEIGHT;
      let shape = {targetWidth: wandaWidth(h), targetHeight: h};
      sceneWindows = {raster, key, features: windowCenters().map(c =>
          Array.from(extractWindowFeatures(im, c.x, c.y, shape)) as number[])};
    }
    let centers = windowCenters(), feats = sceneWindows.features;
    return windowsByAddress(grid).map(ws => ws.map(i =>
        ({point: centers[i], features: feats[i]})));
  },
  nmsRadius: p => nmsRadius(wandaWidth(p.height ?? WANDA_DEFAULT_HEIGHT)),
  truth(grid, p, best) {
    return truthByPoint(best, p.targetCell == null ? null :
        wandaRect(grid, p).center);
  },
  makeDataset(n, noise) {
    // build-corpus.mjs, scaled down. Per composite (random background,
    // height and centre): the nearest scan-lattice window and one jittered
    // by up to 4 px (labelled by the 6.657 px corpus tolerance), six nearby
    // windows 8..32 px away, and on every third composite a recoloured
    // decoy at the lattice window. protocol.json weights cross-entropy
    // 0.5 / 0.25 / 0.25 over targets / nearby+decoys / backgrounds and adds
    // 0.25 x a pairwise margin over (target, nearby) pairs of one composite;
    // here those weights are example counts: n/2 targets, n/4 nearby or
    // decoy, n/4 background windows, plus n/4 pairs.
    let positives: Patch[] = [], nearby: Patch[] = [], pairs: Patch[] = [];
    let crops: HTMLCanvasElement[] = [];
    for (let k = 0; positives.length < n / 2; k++) {
      let bg = pick(wandaBackgrounds).canvas, height = pick(WANDA_HEIGHTS);
      let w = wandaWidth(height);
      let cx = randInt(Math.ceil(w / 2) + 2, 510 - Math.ceil(w / 2));
      let cy = randInt(height / 2 + 2, 510 - height / 2);
      let reach = 32 + 1.6 * w + height;
      let s = wandaComposite(bg, height, cx, cy, "target", reach, noise);
      let near = {x: Math.max(4, Math.min(508, Math.round((s.center.x - 4) /
          8) * 8 + 4)), y: Math.max(4, Math.min(508,
          Math.round((s.center.y - 4) / 8) * 8 + 4))};
      let windows = [near, {x: s.center.x + randInt(-4, 5),
          y: s.center.y + randInt(-4, 5)}];
      for (let j = 0; j < 6; j++) {
        let offset = randInt(8, 33), angle = Math.random() * 2 * Math.PI;
        windows.push({x: s.center.x + Math.cos(angle) * offset,
            y: s.center.y + Math.sin(angle) * offset});
      }
      let pos: number[][] = [], neg: number[][] = [];
      for (let p of windows) {
        let label = Math.hypot(p.x - s.center.x, p.y - s.center.y) <=
            CORPUS_TOLERANCE ? 1 : 0;
        let features = s.features(p);
        (label ? pos : neg).push(features);
        (label ? positives : nearby).push({canvas: s.crop(p), features,
            label});
      }
      pos.forEach(f => neg.forEach(g => pairs.push({canvas: null,
          features: f, pair: g, label: 1})));
      if (k % 3 === 0) {
        let decoy = wandaComposite(bg, height, cx, cy,
            k % 2 ? "solid-red" : "blue-stripes", reach, noise);
        nearby.push({canvas: decoy.crop(near), features: decoy.features(near),
            label: 0});
      }
    }
    let sample = (from: Patch[], m: number) => {
      let copy = from.slice(), out: Patch[] = [];
      while (out.length < m && copy.length) {
        out.push(copy.splice(randInt(0, copy.length), 1)[0]);
      }
      return out;
    };
    let chosenPos = positives.slice(0, Math.ceil(n / 2));
    let chosenNear = sample(nearby, Math.floor(n / 4));
    // Background windows: target-free scenes on the scan lattice. The site
    // mines them: a training-only logistic teacher keeps its 64 highest-
    // scoring windows plus 128 random ones per scene and height. Here: a
    // third hardest of a 3x pool, the rest random.
    let pool: Patch[] = [];
    for (let i = 0; i < 3 * Math.floor(n / 4); i++) {
      let bg = pick(wandaBackgrounds).canvas, height = pick(WANDA_HEIGHTS);
      let w = wandaWidth(height), lattice = SCAN_GRID * SCAN_GRID;
      let at = windowCenters()[randInt(0, lattice)];
      let s = wandaComposite(bg, height, at.x, at.y, null,
          1.6 * w + height, noise);
      pool.push({canvas: s.crop(at), features: s.features(at), label: 0});
    }
    let train = chosenPos.concat(chosenNear);
    let teacher = trainLogistic(train.map(p => p.features),
        train.map(p => p.label));
    pool.sort((a, b) => teacher(b.features) - teacher(a.features));
    let nb = Math.floor(n / 4), hard = Math.round(nb / 3);
    let background = pool.slice(0, hard).concat(sample(pool.slice(hard),
        nb - hard));
    return chosenPos.concat(chosenNear, background,
        sample(pairs, Math.floor(n / 4)));
  },
};

export const WANDA: Scene = wandaScene;
