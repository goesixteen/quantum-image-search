// Replaces upstream's browserify/tsify/concat scripts with one esbuild step.
// Produces the same dist/ layout upstream's index.html expects:
//   bundle.js (src/playground.ts), bundle.css (MDL + styles.css),
//   lib.js (MDL + seedrandom globals), index.html, favicon.png, and project/
//   (the Wanda site's artwork, scene catalog and trained model).
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

// The Where's Wanda site's own artwork, catalog and trained weights, copied
// at build time so the playground never drifts from it (single source of
// truth). It follows the site's scene catalog: every built-in Wanda
// background it lists (Park's curated, pre-rendered variant as the site
// shows it) and the Wanda target.
const WANDA = '../waldo-search-lab/dist/';
const PROJECT_FILES = {
  'project/wanda/scene-catalog.json': WANDA + 'scene-catalog.json',
  'project/wanda/model/wanda-qnn.json': WANDA + 'model/wanda-qnn.json',
};

async function wandaFiles() {
  const catalog = JSON.parse(await readFile(path.join(root, WANDA, 'scene-catalog.json'), 'utf8'));
  const files = {};
  for (const scene of catalog.scenes.filter(s => s.id.startsWith('wanda-'))) {
    const src = scene.curatedArtwork?.preRenderedSrc ?? scene.src;
    files['project/wanda/' + src] = WANDA + src;
  }
  for (const target of catalog.targets) files['project/wanda/' + target.src] = WANDA + target.src;
  return files;
}

async function copyProject() {
  for (const [to, from] of Object.entries({...PROJECT_FILES, ...await wandaFiles()})) {
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
