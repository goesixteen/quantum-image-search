// Replaces upstream's browserify/tsify/concat scripts with one esbuild step.
// Produces the same dist/ layout upstream's index.html expects:
//   bundle.js (src/playground.ts), bundle.css (MDL + styles.css),
//   lib.js (MDL + seedrandom globals), index.html, favicon.png, and project/
//   (the demos' artwork and trained models).
// `--watch` rebuilds on change and serves dist/ via ../serve.mjs.
import * as esbuild from 'esbuild';
import { mkdir, readFile, writeFile, copyFile, watch as watchFs } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const mod = p => path.join(root, 'node_modules', p);
const watch = process.argv.includes('--watch');

async function concat(out, files) {
  const parts = await Promise.all(files.map(f => readFile(f, 'utf8')));
  await writeFile(path.join(dist, out), parts.join('\n'));
}

// The image-search demos' own artwork and trained weights, copied at build
// time so the playground never drifts from them (single source of truth).
const PROJECT_FILES = {
  'project/bus/bus.png': '../bus-search-lab/dist/assets/bus.png',
  'project/bus/car.png': '../bus-search-lab/dist/assets/car.png',
  'project/bus/truck.png': '../bus-search-lab/dist/assets/truck.png',
  'project/bus/van.png': '../bus-search-lab/dist/assets/van.png',
  'project/bus/model.json': '../bus-search-lab/dist/model/model.json',
  'project/crowd/crowd-captcha.png': '../waldo-search-lab/dist/assets/crowd-captcha.png',
  'project/crowd/character.png': '../waldo-search-lab/dist/assets/character.png',
  'project/crowd/model.json': '../waldo-search-lab/dist/model/model.json',
};

async function copyProject() {
  for (const [to, from] of Object.entries(PROJECT_FILES)) {
    await mkdir(path.dirname(path.join(dist, to)), { recursive: true });
    await copyFile(path.join(root, from), path.join(dist, to));
  }
}

async function copyStatic() {
  await concat('bundle.css', [mod('material-design-lite/material.min.css'), path.join(root, 'styles.css')]);
  await copyFile(path.join(root, 'index.html'), path.join(dist, 'index.html'));
  await copyFile(path.join(root, 'favicon.png'), path.join(dist, 'favicon.png'));
}

await mkdir(dist, { recursive: true });
await concat('lib.js', [mod('material-design-lite/material.min.js'), mod('seedrandom/seedrandom.min.js')]);
await copyStatic();
await copyProject();

const options = {
  entryPoints: [path.join(root, 'src/playground.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2017',
  outfile: path.join(dist, 'bundle.js'),
  sourcemap: true,
  minify: !watch,
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  await import('../serve.mjs');
  for await (const _ of watchFs(root, { recursive: false })) await copyStatic().catch(console.error);
} else {
  await esbuild.build(options);
}
