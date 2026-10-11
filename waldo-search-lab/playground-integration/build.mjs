// Embed the team's QNN playground directly in Wanda's lower section.
// Original source in ../qnn-playground remains unchanged. See README.md.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(app, '../qnn-playground');
const depsFlag = process.argv.indexOf('--deps-root');
const deps = depsFlag >= 0 ? path.resolve(process.argv[depsFlag + 1]) : path.join(source, 'node_modules');
const esbuild = await import(pathToFileURL(path.join(deps, 'esbuild/lib/main.js')));
const dist = path.join(app, 'dist');
const assets = path.join(dist, 'assets/qnn-playground');
await mkdir(assets, { recursive: true });

const originalHtml = await readFile(path.join(source, 'index.html'), 'utf8');
const innerHtml = originalHtml.match(/<body>([\s\S]*?)<\/body>/)[1]
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
  .replace('title="Training / test accuracy"', 'title="Illustrative generated-window check; pair information may overlap across splits"')
  .replace('>Accuracy</span>', '>Illustrative window check</span>')
  .replace('Accuracy is on new windows from the same artwork and backgrounds. Everything is simulated.', 'Live scores check generated windows from these same worlds. Training pairs can overlap across the split, so this is illustrative, not the frozen model’s reserved benchmark. Everything is simulated.')
  .replace(/<i class="material-icons">([^<]+)<\/i>/g, (_, icon) =>
    `<i class="material-icons" aria-hidden="true">${({replay:'↺',play_arrow:'▶',pause:'Ⅱ',skip_next:'▸|',add:'+',remove:'−'})[icon] ?? icon}</i>`);
let css = await readFile(path.join(deps, 'material-design-lite/material.min.css'), 'utf8');
css += '\n' + (await readFile(path.join(source, 'styles.css'), 'utf8')).replace(/\bbody\b/g, '.qnn-surface');
css += '\n' + await readFile(path.join(app, 'playground-integration/theme.css'), 'utf8');
await writeFile(path.join(assets, 'playground.css'), css);
await copyFile(path.join(source, 'LICENSE'), path.join(assets, 'LICENSE.txt'));
await copyFile(path.join(source, 'NOTICE'), path.join(assets, 'NOTICE.txt'));
const thirdParty = [
  ['d3 3.5.17', await readFile(path.join(deps, 'd3/LICENSE'), 'utf8')],
  ['Material Design Lite 1.3.0 (CSS)', await readFile(path.join(deps, 'material-design-lite/LICENSE'), 'utf8')],
  ['seedrandom 2.4.4 (ARC4)', (await readFile(path.join(deps, 'seedrandom/seedrandom.js'), 'utf8')).match(/^\/\*([\s\S]*?)\*\//)[1].trim()]
];
await writeFile(path.join(assets, 'THIRD_PARTY_LICENSES.txt'), thirdParty.map(([name,license]) => name + '\n' + '='.repeat(name.length) + '\n\n' + license.trim()).join('\n\n') + '\n');
const versions = {};
for (const name of ['d3','material-design-lite','seedrandom','esbuild','typescript','@types/d3']) {
  versions[name] = JSON.parse(await readFile(path.join(deps, name, 'package.json'), 'utf8')).version;
}
await writeFile(path.join(assets, 'BUILD_RUNTIME.json'), JSON.stringify({
  node: process.version,
  packages: versions,
  source: '../qnn-playground (original source identity is recorded in the release receipt)',
  adaptations: ['same-page open Shadow DOM','scoped D3 document and window-bound UMD','isolated seeded Math','query-state preserves anchors','existing Wanda asset paths','native icons and forms','red/light responsive theme','guided settings restoration','illustrative live metrics and conditional oracle scaling'],
  original_science_source_unchanged: true
}, null, 2) + '\n');

const banner = `const qnnHost = window.document.getElementById('qnn-playground-mount');
const qnnRoot = qnnHost.shadowRoot;
const qnnSurface = qnnRoot.querySelector('.qnn-surface');
const document = new Proxy(window.document, {get(target,key) {
  if(key==='body') return qnnSurface;
  if(key==='querySelector') return selector => selector==='body' ? qnnSurface : qnnRoot.querySelector(selector);
  if(key==='querySelectorAll') return selector => qnnRoot.querySelectorAll(selector);
  if(key==='getElementById') return id => qnnRoot.getElementById(id);
  const value=Reflect.get(target,key,target);
  return typeof value==='function' ? value.bind(target) : value;
}});
const Math = Object.create(window.Math);`;

await esbuild.build({
  stdin: {
    contents: `import seedrandom from 'seedrandom/seedrandom.js';
Math.seedrandom = seed => { Math.random = seedrandom(seed); return Math.random; };
import('./src/playground.ts').catch(error => {
  qnnHost.setAttribute('data-playground-state','error');
  qnnSurface.insertAdjacentHTML('afterbegin','<p role="alert" class="load-error">The quantum playground could not start. Refresh to try again.</p>');
  console.error(error);
});`,
    resolveDir: source,
    sourcefile: 'wanda-embedded-entry.ts',
    loader: 'ts'
  },
  bundle: true, format: 'iife', target: 'es2020', minify: true,
  outfile: path.join(assets, 'engine.js'), banner: {js: banner},
  nodePaths: [deps], logLevel: 'info',
  plugins: [{name: 'wanda-page-isolation', setup(build) {
    build.onResolve({filter: /waldo-search-lab\/dist\//}, args => {
      const rel = args.path.split('waldo-search-lab/dist/')[1];
      return {path: path.join(dist, rel)};
    });
    build.onLoad({filter: /d3[\\/]d3\.js$/}, async args => ({
      contents: (await readFile(args.path, 'utf8'))
        .replace('var d3_document = this.document;', 'var d3_document = document;')
        .replace(/\}\(\);\s*$/, '}.call(window);'),
      loader: 'js'
    }));
    build.onLoad({filter: /seedrandom[\\/]seedrandom\.js$/}, async args => ({
      contents: (await readFile(args.path, 'utf8')).replace("var global = (0, eval)('this'),", 'var global = globalThis,'),
      loader: 'js'
    }));
    build.onLoad({filter: /src[\\/](state|scenes|playground|search|quantumViews)\.ts$/}, async args => {
      let contents = (await readFile(args.path, 'utf8')).replace(/\r\n/g, '\n');
      if (args.path.endsWith('scenes.ts')) {
        // Use the site's exact existing catalog, artwork and checkpoint.
        contents = contents.replace('let base = "project/wanda/";', 'let base = "";');
      }
      if (args.path.endsWith('state.ts')) {
        contents = contents.replace('window.location.hash.slice(1)', '(new URLSearchParams(window.location.search).get("qnn") || "")');
        const historyBlock = `    if (replace) {\n      window.history.replaceState(null, "", "#" + props.join("&"));\n    } else {\n      window.location.hash = props.join("&");\n    }`;
        if (!contents.includes(historyBlock)) throw new Error('Upstream URL-state contract changed.');
        contents = contents.replace(historyBlock, `    const url = new URL(window.location.href);\n    url.searchParams.set("qnn", props.join("&"));\n    window.history.replaceState(null, "", url);`);
      }
      if (args.path.endsWith('playground.ts')) {
        const guidedShape = `  if (guided() && !demoShape()) {\n    useDemoShape();\n    reset();\n    return;\n  }`;
        if (!contents.includes(guidedShape)) throw new Error('Upstream guided circuit-reset contract changed.');
        contents = contents.replace(guidedShape, `  if (guided() && (!demoShape() || state.entangler !== "cnot" || state.readout !== "project" || !state.reupload || state.shots !== 0 || state.off.length)) {\n    useDemoShape();\n    state.entangler = "cnot";\n    state.readout = "project";\n    state.reupload = true;\n    state.shots = 0;\n    state.off = [];\n    d3.select("#entanglers").property("value", "cnot");\n    d3.select("#readouts").property("value", "project");\n    d3.select("#reupload").property("value", "true");\n    d3.select("#shots").property("value", 0);\n    state.serialize(true);\n    reset();\n    return;\n  }`);
        contents = contents.replace('let avail = co.offsetLeft - cf.offsetLeft;', 'let avail = Math.max(260, co.offsetLeft > cf.offsetLeft ? co.offsetLeft - cf.offsetLeft : cf.clientWidth);');
        contents = contents.replace('.text(icon);', '.text(icon === "add" ? "+" : "−");');
        contents = contents.replace('"Correct on test squares:"', '"Illustrative window check:"')
          .replace('      "Accuracy");', '      "Illustrative window check");')
          .replace('`<b>${Math.round(100 * accTest)}%</b> correct on test ` +\n             `squares (classical baseline: ${Math.round(100 * baselineAcc)}%).`', '`Illustrative window check: <b>${Math.round(100 * accTest)}%</b> ` +\n             `(classical illustration: ${Math.round(100 * baselineAcc)}%).`')
          .replace('`<b>${Math.round(100 * accTest)}%</b> correct.`', '`illustrative check <b>${Math.round(100 * accTest)}%</b>.`')
          .replace('"hybrid" : "quantum-only"} readout; test accuracy on ', '"hybrid" : "quantum-only"} readout; illustrative window check on ')
          .replace('Accuracy is on new examples made the same way with the same ', 'This window check uses generated examples, with possible pair overlap, from the same ')
          .replace('square root of N checks instead of N.', 'square root of N/M oracle calls for M accepted addresses out of N, with efficient coherent input access.')
          .replace('readout\'s classical sigmoid cannot run inside a quantum " +\n          "computer.', 'readout\'s classical sigmoid is not implemented as a coherent " +\n          "quantum oracle in this playground.');
        contents = contents.replace('start().catch(err => {', `start().then(() => {\n  qnnHost.setAttribute("data-playground-state", "ready");\n  qnnHost.setAttribute("aria-busy", "false");\n  qnnHost.dispatchEvent(new CustomEvent("qnn-playground-ready"));\n}).catch(err => {\n  qnnHost.setAttribute("data-playground-state", "error");\n  qnnHost.setAttribute("aria-busy", "false");`);
      }
      if (args.path.endsWith('search.ts')) {
        contents = contents
          .replace('class: "grover-bars", width: 290, height: 64,', 'class: "grover-bars", width: 290, height: 64, viewBox: "0 0 290 64",')
          .replace('the square root of N checks instead of N. Here every square was ', 'the square root of N/M oracle calls for M accepted addresses out of N, with efficient coherent input access. Here every square was ')
          .replace('<b>Quantum advantage:</b> Grover needs about ', '<b>Ideal quantum query scaling:</b> Grover needs about ')
          .replace('√N checks instead of N, here ${rounds} rounds for ${N} squares, when ', '√(N/M) oracle calls for M accepted addresses out of N; this run uses ${rounds} rounds for ${N} squares. This assumes ')
          .replace('the check itself runs on a quantum computer; this demo scores every ', 'an efficient coherent predicate and input access. This demo scores every ')
          .replace('square first on a classical simulator, so it shows the speed-up rather ', 'square first on a classical simulator, so it illustrates amplification rather ')
          .replace('than achieving it.</span>', 'than demonstrating an end-to-end speedup.</span>');
      }
      if (args.path.endsWith('quantumViews.ts')) {
        contents = contents
          .replace('width: 290, height: 10, role: "img",', 'width: 290, height: 10, viewBox: "0 0 290 10", role: "img",')
          .replace('width: 290, height: 214,', 'width: 290, height: 214, viewBox: "0 0 290 214",')
          .replace('.attr("height", rows.length * rowH + 4);', '.attr("height", rows.length * rowH + 4).attr("viewBox", `0 0 290 ${rows.length * rowH + 4}`);');
      }
      return {contents, loader: 'ts'};
    });
  }}]
});

const embed = `// Same-page QNN playground, isolated from the game's DOM and seeded RNG.
const host = document.getElementById('qnn-playground-mount');
if (host) {
  const root = host.attachShadow({mode:'open'});
  root.innerHTML = '<link rel="stylesheet" href="assets/qnn-playground/playground.css"><div class="qnn-surface guided">' + ${JSON.stringify(innerHtml)} + '</div>';
  const styles = root.querySelector('link');
  const styled = new Promise((resolve,reject) => { styles.addEventListener('load',resolve,{once:true}); styles.addEventListener('error',reject,{once:true}); });
  let started = false;
  const start = async () => {
    if (started) return;
    started = true;
    host.setAttribute('data-playground-state','loading');
    host.setAttribute('aria-busy','true');
    try { await styled; await import('./assets/qnn-playground/engine.js'); }
    catch(error) { host.setAttribute('data-playground-state','error'); host.insertAdjacentHTML('beforebegin','<p role="alert" class="playground-error">The playground could not load. Refresh to try again.</p>'); console.error(error); }
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { if(entries.some(entry=>entry.isIntersecting)) { observer.disconnect(); start(); } }, {rootMargin:'160px'});
    observer.observe(host);
  } else { start(); }
}
`;
await writeFile(path.join(dist, 'qnn-playground.js'), embed);
console.log('Embedded current QNN playground. No source artwork or model changes.');
