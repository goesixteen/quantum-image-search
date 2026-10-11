/* The two image-search scenes of this project, and their training data.

Each scene reuses its demo's own pieces: the same original artwork (copied
into dist/project/ by scripts/build.mjs), the same pixel feature extractor
(imported straight from the demo's qnn.js) and the same trained weights.
Training patches are generated in the browser following each demo's
model/train.py recipe; they approximate (do not reproduce) its datasets.
==============================================================================*/

import * as busFeatures from "../../bus-search-lab/dist/qnn.js";
import * as crowdFeatures from "../../waldo-search-lab/dist/qnn.js";

export interface Placement {
  /** Region index of the target, or null when it is absent. */
  targetCell: number | null;
  /** Offset from the region's centre, in region widths (0 = centred). */
  jitter?: {dx: number, dy: number};
  /** Bus scene: region index -> distractor sprite. */
  distractors: {cell: number, kind: string}[];
}

export interface Scene {
  id: "bus" | "crowd";
  title: string;
  target: string;
  featureNames: string[];
  /** Short labels for the feature column. */
  featureLabels: string[];
  /** Side of the square patch the extractor expects. */
  patchSize: number;
  defaultGrid: number;
  modelUrl: string;
  credit: string;
  load(): Promise<void>;
  /** Draws the 512 x 512 scene the classifier reads. */
  render(ctx: CanvasRenderingContext2D, grid: number, p: Placement): void;
  /** The target's pixel rectangle; used only for ground truth after measuring. */
  targetRect(grid: number, cell: number, jitter?: {dx: number, dy: number}):
      {x: number, y: number, w: number, h: number};
  /** A synthetic training patch: label 1 contains the target. */
  makePatch(positive: boolean): HTMLCanvasElement;
  extract(image: ImageData): number[];
  randomDistractors(grid: number): {cell: number, kind: string}[];
}

const SIZE = 512;
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

function canvas(side: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  let c = document.createElement("canvas");
  c.width = c.height = side;
  let ctx = c.getContext("2d", {willReadFrequently: true});
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return [c, ctx];
}

/* ----------------------------- School bus ------------------------------ */

const busImages: {[name: string]: HTMLImageElement} = {};

const busScene: Scene = {
  id: "bus",
  title: "School-bus CAPTCHA",
  target: "school bus",
  featureNames: busFeatures.FEATURE_NAMES,
  featureLabels: ["yellow", "aspect", "windows", "win dark", "spacing",
      "wheels", "body", "lower"],
  patchSize: 64,
  defaultGrid: 8,
  modelUrl: "project/bus/model.json",
  credit: "Original synthetic vehicle artwork from bus-search-lab.",
  async load() {
    for (let name of ["bus", "car", "truck", "van"]) {
      busImages[name] = await image(`project/bus/${name}.png`);
    }
  },
  render(ctx, grid, p) {
    // As bus-search-lab's renderRaster: plain lot, tile outlines, distractor
    // vehicles, and the bus centred in its tile at 82% of the tile width.
    let s = SIZE / grid;
    ctx.fillStyle = "#d7e1e8";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#c7d3dd";
    for (let i = 0; i < grid * grid; i++) {
      ctx.strokeRect((i % grid) * s + s * .09,
          Math.floor(i / grid) * s + s * .09, s * .82, s * .82);
    }
    for (let d of p.distractors) {
      let img = busImages[d.kind], w = s * .72, h = w * img.height / img.width;
      ctx.drawImage(img, (d.cell % grid + .5) * s - w / 2,
          (Math.floor(d.cell / grid) + .5) * s - h / 2, w, h);
    }
    if (p.targetCell != null) {
      let r = this.targetRect(grid, p.targetCell, p.jitter);
      ctx.drawImage(busImages.bus, r.x, r.y, r.w, r.h);
    }
  },
  targetRect(grid, cell, jitter) {
    let s = SIZE / grid, img = busImages.bus;
    let w = s * .82, h = Math.min(w * img.height / img.width, s * .84);
    let dx = (jitter?.dx ?? 0) * s, dy = (jitter?.dy ?? 0) * s;
    return {x: (cell % grid + .5) * s - w / 2 + dx,
        y: (Math.floor(cell / grid) + .5) * s - h / 2 + dy, w, h};
  },
  makePatch(positive) {
    // Follows bus-search-lab/model/train.py sample(): neutral background,
    // light clutter, then a bus (sometimes cut by the tile edge) or a hard
    // negative (other vehicles, yellow signs and boxes, clutter, nothing).
    let [c, ctx] = canvas(64);
    let base = [215, 225, 232].map(v => Math.max(170, Math.min(250,
        v + randInt(-20, 16))));
    ctx.fillStyle = `rgb(${base})`;
    ctx.fillRect(0, 0, 64, 64);
    for (let k = randInt(0, 4); k > 0; k--) {
      let shade = base.map(v => Math.max(120, Math.min(250,
          v + randInt(-35, 16))));
      ctx.strokeStyle = `rgb(${shade})`;
      let x = randInt(-12, 62), y = randInt(-12, 62);
      if (Math.random() < .5) {
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, randInt(8, 40), randInt(4, 24));
      } else {
        ctx.lineWidth = randInt(1, 3);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y); ctx.stroke();
      }
    }
    let sprite = (img: HTMLImageElement, w: number, x: number, y: number) =>
        ctx.drawImage(img, x, y, w, Math.round(w * img.height / img.width));
    if (positive) {
      let w = randInt(44, 58), h = Math.round(w * 64 / 104);
      if (Math.random() < .48) {
        sprite(busImages.bus, w, randInt(-w / 2, 65 - w / 2),
            randInt(-h / 2, 65 - h / 2));
      } else {
        sprite(busImages.bus, w, randInt(0, Math.max(1, 65 - w)),
            randInt(4, Math.max(5, 61 - h)));
      }
      return c;
    }
    let kind = pick(["car", "van", "truck", "rectangle", "sign", "clutter",
        "clutter", "empty"]);
    if (kind === "car" || kind === "van" || kind === "truck") {
      let w = randInt(34, 59), h = Math.round(w * 64 / 104);
      sprite(busImages[kind], w, randInt(-w / 4, 65 - w / 2),
          randInt(4, 64 - h / 2));
    } else if (kind === "rectangle" || kind === "sign") {
      let x = randInt(0, 37), y = randInt(0, 37);
      let bw = randInt(16, 55), bh = randInt(8, 30);
      ctx.fillStyle = `rgb(${randInt(220, 255)},${randInt(160, 215)},` +
          `${randInt(20, 80)})`;
      ctx.fillRect(x, y, bw, bh);
      ctx.strokeStyle = "rgb(40,50,60)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, bw, bh);
      if (kind === "sign") {
        ctx.fillStyle = "rgb(45,55,65)";
        for (let bx = x + 4; bx < Math.min(63, x + bw - 2); bx += 7) {
          ctx.fillRect(bx, y + 3, 4, bh - 5);
        }
      }
    } else if (kind === "clutter") {
      for (let k = randInt(2, 7); k > 0; k--) {
        ctx.fillStyle = `rgb(${randInt(25, 250)},${randInt(25, 250)},` +
            `${randInt(25, 250)})`;
        ctx.beginPath();
        ctx.ellipse(randInt(0, 59), randInt(0, 59), randInt(2, 8),
            randInt(2, 8), 0, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    return c;
  },
  extract: im => Array.from(busFeatures.extractFeatures(im)) as number[],
  randomDistractors(grid) {
    let cells = new Set<number>(), out = [];
    let kinds = ["car", "truck", "van"];
    for (let n = 0; n < Math.min(11, grid * grid / 3); n++) {
      let cell = randInt(0, grid * grid);
      if (!cells.has(cell)) {
        cells.add(cell);
        out.push({cell, kind: kinds[n % 3]});
      }
    }
    return out;
  },
};

/* ------------------------------- Crowd -------------------------------- */

let crowdImage: HTMLImageElement;
let explorer: HTMLCanvasElement;
const decoys: HTMLCanvasElement[] = [];

/** Port of waldo-search-lab/model/train.py make_decoy (training only). */
function makeDecoy(source: HTMLCanvasElement, kind: string) {
  let [c, ctx] = [document.createElement("canvas"), null as any];
  c.width = source.width;
  c.height = source.height;
  ctx = c.getContext("2d", {willReadFrequently: true});
  ctx.drawImage(source, 0, 0);
  let im = ctx.getImageData(0, 0, c.width, c.height), d = im.data;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      let i = (y * c.width + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
      let red = r > 125 && r > 1.38 * g && r > 1.25 * b && d[i + 3] > 30;
      if (kind === "blue_stripes" && red) {
        d[i] = 42; d[i + 1] = 105; d[i + 2] = 205;
      } else if (kind === "solid_red") {
        let white = Math.min(r, g, b) > 150 && d[i + 3] > 30;
        let torso = y >= c.height * .30 && y < c.height * .72 &&
            x >= c.width * .05 && x < c.width * .95;
        if (white && torso) {
          d[i] = 195; d[i + 1] = 38; d[i + 2] = 44;
        }
      }
    }
  }
  ctx.putImageData(im, 0, 0);
  return c;
}

const crowdScene: Scene = {
  id: "crowd",
  title: "Crowd explorer",
  target: "explorer",
  featureNames: crowdFeatures.FEATURE_NAMES,
  featureLabels: ["red", "bands", "white", "regular", "coherent",
      "blue", "area", "aspect"],
  patchSize: 128,
  defaultGrid: 4,
  modelUrl: "project/crowd/model.json",
  credit: "Original crowd and explorer artwork from waldo-search-lab.",
  async load() {
    crowdImage = await image("project/crowd/crowd-captcha.png");
    let img = await image("project/crowd/character.png");
    // A 256-px-tall working copy keeps decoys and patches fast to make.
    explorer = document.createElement("canvas");
    explorer.height = 256;
    explorer.width = Math.round(256 * img.width / img.height);
    let ctx = explorer.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, explorer.width, explorer.height);
    decoys.length = 0;
    decoys.push(makeDecoy(explorer, "solid_red"),
        makeDecoy(explorer, "blue_stripes"));
  },
  render(ctx, grid, p) {
    // As waldo-search-lab's renderPixels: the crowd, plus the explorer at
    // 75% of one tile's height, centred in its tile.
    ctx.drawImage(crowdImage, 0, 0, SIZE, SIZE);
    if (p.targetCell != null) {
      let r = this.targetRect(grid, p.targetCell, p.jitter);
      ctx.drawImage(explorer, r.x, r.y, r.w, r.h);
    }
  },
  targetRect(grid, cell, jitter) {
    let s = SIZE / grid, h = s * .75, w = h * explorer.width / explorer.height;
    let dx = (jitter?.dx ?? 0) * s, dy = (jitter?.dy ?? 0) * s;
    return {x: (cell % grid) * s + (s - w) / 2 + dx,
        y: Math.floor(cell / grid) * s + (s - h) / 2 + dy, w, h};
  },
  makePatch(positive) {
    // Follows waldo-search-lab/model/train.py patch_sample(): a crowd crop
    // at 1/4..1/8 scale, plus the explorer (positive) or, often, a
    // recoloured decoy explorer (negative), mirrored and re-lit at random.
    let [c, ctx] = canvas(128);
    let scale = pick([4, 6, 8]), cw = SIZE / scale;
    ctx.drawImage(crowdImage, randInt(0, SIZE - cw + 1), randInt(0,
        SIZE - cw + 1), cw, cw, 0, 0, 128, 128);
    if (positive || Math.random() < .55) {
      let obj = positive ? explorer : pick(decoys);
      let h = randInt(52, 158), w = Math.max(8, Math.round(obj.width * h /
          obj.height));
      let px = randInt(-Math.max(1, w / 5), Math.max(1, 128 - w * .75));
      let py = randInt(-Math.max(1, h / 6), Math.max(1, 128 - h * .6));
      ctx.save();
      ctx.filter = `brightness(${rand(.9, 1.08)})`;
      if (Math.random() < .5) {
        ctx.translate(px + w, py);
        ctx.scale(-1, 1);
        ctx.drawImage(obj, 0, 0, w, h);
      } else {
        ctx.drawImage(obj, px, py, w, h);
      }
      ctx.restore();
    }
    return c;
  },
  extract: im => Array.from(crowdFeatures.extractFeatures(im)) as number[],
  randomDistractors: () => [],
};

export const SCENES: {[id: string]: Scene} = {bus: busScene, crowd: crowdScene};

/** One labelled training/test patch. */
export interface Patch {
  canvas: HTMLCanvasElement;
  features: number[];
  label: number;
}

/**
 * A balanced patch dataset for a scene. `noise` (0..50, TF's noise slider)
 * adds Gaussian sensor noise before feature extraction.
 */
export function makeDataset(scene: Scene, n: number, noise: number): Patch[] {
  let patches: Patch[] = [];
  for (let i = 0; i < n; i++) {
    let label = i % 2;
    let c = scene.makePatch(label === 1);
    let ctx = c.getContext("2d", {willReadFrequently: true});
    let im = ctx.getImageData(0, 0, c.width, c.height);
    if (noise > 0) {
      let sigma = noise * .6;
      for (let k = 0; k < im.data.length; k += 4) {
        for (let ch = 0; ch < 3; ch++) {
          let g = Math.sqrt(-2 * Math.log(Math.max(1e-12, Math.random()))) *
              Math.cos(2 * Math.PI * Math.random());
          im.data[k + ch] = Math.max(0, Math.min(255,
              im.data[k + ch] + g * sigma));
        }
      }
      ctx.putImageData(im, 0, 0);
    }
    patches.push({canvas: c, features: scene.extract(im), label});
  }
  return patches;
}

/**
 * Cuts the rendered scene into grid x grid regions and extracts each
 * region's features at the scene's patch size, as the demos do.
 */
export function regionFeatures(scene: Scene, raster: HTMLCanvasElement,
    grid: number): number[][] {
  let [c, ctx] = canvas(scene.patchSize);
  let s = SIZE / grid, out: number[][] = [];
  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(raster, col * s, row * s, s, s, 0, 0, c.width, c.height);
      out.push(scene.extract(ctx.getImageData(0, 0, c.width, c.height)));
    }
  }
  return out;
}

/** Regions overlapping the target (ground truth, used only after measuring). */
export function targetRegions(scene: Scene, grid: number,
    p: Placement): Set<number> {
  let out = new Set<number>();
  if (p.targetCell == null) {
    return out;
  }
  let r = scene.targetRect(grid, p.targetCell, p.jitter), s = SIZE / grid;
  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      let ox = Math.min(r.x + r.w, (col + 1) * s) - Math.max(r.x, col * s);
      let oy = Math.min(r.y + r.h, (row + 1) * s) - Math.max(r.y, row * s);
      // At least 20% of the target's box, like the crowd demo's audit.
      if (ox > 0 && oy > 0 && ox * oy >= .2 * r.w * r.h) {
        out.add(row * grid + col);
      }
    }
  }
  return out;
}
