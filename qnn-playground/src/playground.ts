/* Copyright 2016 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

/* Modified 2026 for the QNN playground: the 2-D datasets, input features and
   output heatmap are replaced by the project's image-search pipeline (scenes,
   pixel features, region scores, Grover search); quantum engine (./qnn),
   circuit drawing, quantum views (./quantumViews), time-sliced training;
   regression, regularization, tutorials and analytics removed. See ../NOTICE. */

import * as nn from "./qnn";
import {HeatMap} from "./heatmap";
import {State, entanglers, readouts, getKeyFromValue} from "./state";
import {shuffle} from "./dataset";
import {AppendingLineChart} from "./linechart";
import {QuantumViews, arcSpace} from "./quantumViews";
import {SearchPanel, term} from "./search";
import {SCENES, Scene, Patch, Placement, makeDataset, regionFeatures,
    targetRegions} from "./scenes";
import * as d3 from 'd3';

let mainWidth;


const RECT_SIZE = 30;
const BIAS_SIZE = 5;
/** Patches per dataset (half contain the target). */
const NUM_PATCHES = 300;
/** Vertical spacing of qubit wires (gate box + Bloch sphere below it). */
const QUBIT_ROW = 82;
/** The demos' register; 8 features need at least 4 qubits (2 angles each). */
const DEMO_QUBITS = 4;
const qubits = () => state.networkShape[0];
const TRAIN_BUDGET_MS = 25;
/**
 * The guided view always trains from scratch while you watch: a fixed run of
 * SHOW_EPOCHS rounds, paced over about SHOW_MS (training itself is faster;
 * the pacing makes it visible), then it stops by itself.
 */
const SHOW_EPOCHS = 120;
const SHOW_MS = 4000;

enum HoverType {
  BIAS, WEIGHT
}

let HIDABLE_CONTROLS = [
  ["Discretize output", "discretize"],
  ["Play button", "playButton"],
  ["Step button", "stepButton"],
  ["Reset button", "resetButton"],
  ["Learning rate", "learningRate"],
  ["Entangler", "entangler"],
  ["Measurement shots", "shots"],
  ["Data re-uploading", "reupload"],
  ["Readout", "readout"],
  ["Which scene", "dataset"],
  ["Ratio train data", "percTrainData"],
  ["Noise level", "noise"],
  ["Batch size", "batchSize"],
  ["# of layers", "numHiddenLayers"],
];

class Player {
  private timerIndex = 0;
  private isPlaying = false;
  private callback: (isPlaying: boolean) => void = null;

  playOrPause() {
    if (this.isPlaying) {
      this.isPlaying = false;
      this.pause();
    } else {
      this.isPlaying = true;
      this.play();
    }
  }

  onPlayPause(callback: (isPlaying: boolean) => void) {
    this.callback = callback;
  }

  play() {
    this.pause();
    this.isPlaying = true;
    if (this.callback) {
      this.callback(this.isPlaying);
    }
    this.start(this.timerIndex);
  }

  playing(): boolean {
    return this.isPlaying;
  }

  pause() {
    this.timerIndex++;
    this.isPlaying = false;
    if (this.callback) {
      this.callback(this.isPlaying);
    }
  }

  private start(localTimerIndex: number) {
    d3.timer(() => {
      if (localTimerIndex < this.timerIndex) {
        return true;  // Done.
      }
      if (show) {
        stepShow();
        return false;
      }
      // Train within a per-frame time budget so large circuits (and
      // parameter-shift training with shots) never freeze the page.
      if (trainSamples(performance.now() + TRAIN_BUDGET_MS)) {
        finishEpoch();
      }
      return false;  // Not done.
    }, 0);
  }
}

let state = State.deserializeState();
sanitizeState();

/**
 * URL values are user input: a batch size of 0, a NaN learning rate or an
 * out-of-range threshold would silently stop training. Clamp them all.
 */
function sanitizeState() {
  let num = (v: any, lo: number, hi: number, dflt: number) =>
      Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : dflt;
  if (!SCENES[state.scene]) {
    state.scene = "bus";
  }
  if (state.mode !== "explorer") {
    state.mode = "guided";
  }
  state.batchSize = Math.round(num(state.batchSize, 1, 30, 10));
  state.learningRate = num(state.learningRate, 1e-5, 10, 0.1);
  if (!(state.learningRate > 0)) {
    state.learningRate = 0.1;
  }
  state.threshold = num(state.threshold, 0.01, 0.99, 0.5);
  state.noise = num(state.noise, 0, 50, 0);
  state.percTrainData = Math.round(num(state.percTrainData, 10, 90, 50) / 10)
      * 10;
  state.shots = [0, 10, 100, 1000].indexOf(+state.shots) >= 0 ?
      +state.shots : 0;
  state.numHiddenLayers = Math.round(num(state.networkShape?.length, 1,
      nn.MAX_LAYERS, 4));
  let q = Math.round(num(state.networkShape?.[0], nn.MIN_QUBITS,
      nn.MAX_QUBITS, DEMO_QUBITS));
  state.networkShape = d3.range(state.numHiddenLayers).map(() => q);
  state.target = Number.isInteger(+state.target) ? +state.target : 27;
  state.probe = Number.isInteger(+state.probe) && +state.probe >= 0 ?
      +state.probe : 0;
  state.jitterX = num(state.jitterX, -0.4, 0.4, 0);
  state.jitterY = num(state.jitterY, -0.4, 0.4, 0);
  if (!Array.isArray(state.off)) {
    state.off = [];
  }
}
let scene: Scene = SCENES[state.scene];

/** Per node id: a grid x grid matrix [col][row] of its value per region. */
let boundary: {[id: string]: number[][]} = {};
let selectedNodeId: string = null;
let linkWidthScale = d3.scale.linear()
  .domain([0, 2 * Math.PI])
  .range([1, 6])
  .clamp(true);
/** Gate angles are colored over -pi..pi (colorScale clamps at +-1). */
let angleColor = d3.scale.linear<string, number>()
                     .domain([-Math.PI, 0, Math.PI])
                     .range(["#f59322", "#e8eaeb", "#0877bd"])
                     .clamp(true);
let colorScale = d3.scale.linear<string, number>()
                     .domain([-1, 0, 1])
                     .range(["#f59322", "#e8eaeb", "#0877bd"])
                     .clamp(true);
let iter = 0;
let trainData: Patch[] = [];
let testData: Patch[] = [];
let network: nn.Node[][] = null;
let lossTrain = 0;
let lossTest = 0;
let accTrain = 0;
let accTest = 0;

/** The rendered scene the classifier reads, its regions and their scores. */
let raster = document.createElement("canvas");
raster.width = raster.height = 512;
let rasterCtx = raster.getContext("2d", {willReadFrequently: true});
let placement: Placement = {targetCell: null, distractors: []};
let regionFeats: number[][] = [];
let scores: number[] = [];
let moveMode = false;
let measured: {region: number, verdict: string} = null;
let demoModels: {[id: string]: nn.ProjectModel} = {};

let player = new Player();
let views = new QuantumViews({
  initialProbe: state.probe,
  onProbeMove: region => {
    state.probe = region;
    state.serialize(true);
    drawScene();
  },
  network: () => network,
  features: region => constructInput(regionFeats[region]),
  grid: () => state.grid,
  shots: () => state.shots,
  selectedNodeId: () => selectedNodeId,
  rectSize: RECT_SIZE,
});
let search = new SearchPanel({
  marked: () => markedRegions(),
  regions: () => state.grid * state.grid,
  truth: () => targetRegions(scene, state.grid, placement),
  target: () => scene.target,
  showMeasured: (region, verdict) => {
    measured = region == null ? null : {region, verdict};
    drawScene();
  },
  plain: () => guided(),
  coherent: () => {
    let block = network && nn.classifierBlock(network);
    if (!block) {
      return {unavailable: "The coherent oracle needs the <b>quantum-only " +
          "readout</b> (Readout menu): its \"target\" answer is qubit 0 " +
          "reading 0, which a quantum oracle can act on. The hybrid " +
          "readout's classical sigmoid cannot run inside a quantum " +
          "computer. Switch the readout, train, then try again.",
          D: 0, applyBlock: () => {}, accept: () => false,
          acceptance: () => []};
    }
    let feats = regionFeats.map(f => constructInput(f));
    return {unavailable: null, D: block.D,
        applyBlock: (i, re, im, inv) => block.apply(feats[i], re, im, inv),
        accept: a => (a & 1) === 0,
        acceptance: () => feats.map(f => block.acceptance(f))};
  },
  onSearched: () => {
    progress.searched = true;
    renderGuide();
  },
});

/* ------------------------- Guided (simple) view ------------------------ */

function guided(): boolean {
  return state.mode !== "explorer";
}

/** What a first-time visitor has done, for the guided steps. */
let progress = {searched: false, weightsLoaded: false, trained: false};
/** The guided view's training run in progress (null when not running). */
let show: {start: number} = null;
let lastGuideKey = "";

/**
 * The guided view's numbered steps: picture -> scores -> marks -> search,
 * each with one plain sentence, one action and a tick when done.
 */
function renderGuide() {
  let guide = d3.select("#guide").style("display", guided() ? null : "none");
  if (!guided()) {
    return;
  }
  let N = state.grid * state.grid, M = markedRegions().length;
  let trained = progress.trained || progress.weightsLoaded ||
      (!show && iter > 0 && accTest >= 0.85);
  let steps = [
    {title: "Pick a picture", done: true,
     text: `<b>${scene.title}</b>: find the ${scene.target}. ` +
         (scene.id === "bus" ? "Yellow trucks and vans are decoys." :
             "Recoloured look-alikes are decoys.")},
    {title: "Score every square", done: trained,
     text: `A ${qubits()}-qubit ${term("quantum circuit", "A program for a quantum " +
         `computer: ${qubits()} qubits that are rotated and linked step by step. ` +
         "Here it is simulated in your browser.")} scores each square ` +
         "from 0 to 1." +
         (show ? ` <b>Training…</b> round ${iter} of ${SHOW_EPOCHS}: ` +
             `<b>${Math.round(100 * accTest)}%</b> correct.` +
             `<span class="train-bar"><span style="width:` +
             `${Math.round(100 * iter / SHOW_EPOCHS)}%"></span></span>` :
         trained ? ` Trained for ${iter} rounds: ` +
             `<b>${Math.round(100 * accTest)}%</b> correct on test ` +
             `squares (classical baseline: ${Math.round(100 * baselineAcc)}%).` :
             " Untrained: the scores are random."),
     actions: show ? [] : [["Train again", () => trainFromScratch()]]},
    {title: "Mark the likely squares", done: M > 0 && 2 * M <= N,
     text: `Squares at or above the ${term("threshold", "The cut-off " +
         "score: squares at or above it are marked as candidates.")} ` +
         `(${state.threshold.toFixed(2)}) are marked: <b>${M} of ${N}</b>.`},
    {title: "Search", done: progress.searched,
     text: `${term("Grover's search", "A quantum search algorithm. When " +
         "the check runs inside a quantum computer, it needs only about the " +
         "square root of N checks instead of N.")} picks a square, ` +
         "favouring marked ones (no speed-up here: squares were scored " +
         "first).",
     actions: [["Run the search", () => search.start()]]},
  ];
  let next = steps.findIndex(st => !st.done);
  // Rebuild only when something changed, so buttons are not replaced
  // under the pointer while training updates every frame.
  let key = steps.map(st => st.done + st.text).join("|") + next +
      progress.weightsLoaded + !!show;
  if (key === lastGuideKey) {
    return;
  }
  lastGuideKey = key;
  guide.html("");
  guide.append("p").attr("class", "guide-intro").html(
      `<b>Find a hidden object with a quantum computer</b> (simulated).` +
      (show ? " First, watch the circuit learn from example squares " +
          "(sped up)." : ""));
  let row = guide.append("ol").attr("class", "guide-steps");
  steps.forEach((st, i) => {
    let li = row.append("li").classed("done", st.done)
        .classed("next", i === next);
    li.append("div").attr("class", "step-title")
        .html(`<span class="step-num">${st.done ? "✓" : i + 1}</span> ` +
            st.title);
    li.append("div").attr("class", "step-text").html(st.text);
    (st.actions || []).forEach(([label, act]) => {
      li.append("button").attr("class", "step-action").text(label as string)
          .on("click", act as any);
    });
  });
}

/**
 * Resets to an untrained circuit and starts training it: the paced run in
 * the guided view (reset starts it), open-ended training otherwise.
 */
function trainFromScratch() {
  reset();
  if (!guided()) {
    player.play();
  }
  renderGuide();
}

/** Starts the guided view's paced training run on the current circuit. */
function startShow() {
  show = {start: performance.now()};
  player.play();
  renderGuide();
}

/**
 * One frame of the paced run: train the rounds that are due by now (within
 * the frame budget), redraw once, and stop after SHOW_EPOCHS.
 */
function stepShow() {
  let due = Math.min(SHOW_EPOCHS, Math.ceil(SHOW_EPOCHS *
      (performance.now() - show.start) / SHOW_MS));
  let deadline = performance.now() + TRAIN_BUDGET_MS, trainedAny = false;
  while (iter < due && performance.now() < deadline) {
    trainSamples(Infinity);
    iter++;
    trainedAny = true;
  }
  if (iter >= SHOW_EPOCHS) {
    show = null;
    progress.trained = true;
    player.pause();
  }
  if (trainedAny) {
    updateMetrics();
    updateUI();
  }
}

/** Switches between the guided view and every detail. */
function setMode(mode: string) {
  state.mode = mode;
  state.serialize(true);
  applyMode();
  // The guided view never starts from an untrained circuit: train it.
  if (guided() && iter === 0 && !progress.weightsLoaded) {
    startShow();
  }
}

function applyMode() {
  let g = guided();
  d3.select("body").classed("guided", g);
  d3.select("#mode-toggle").text(g ? "Show all details" : "Simpler view");
  d3.select(".column.data > .ui-dataset > p").text(g ?
      "Pick a picture to search" : "Which scene do you want to search?");
  d3.select(".column.features > p").text(g ?
      "8 numbers measured from each square" :
      "Which pixel features do you feed in?");
  d3.select(".callout.thumbnail .label").html(g ?
      "This box shows one <b>qubit</b> for every square of the picture. " +
      "Hover to see it on the picture." :
      "This box is &lang;Z&rang; of one <b>qubit</b> for every region of " +
      "the scene; the sphere below is its state for the probe region. " +
      "Hover to enlarge; click to edit.");
  d3.select(".callout.weights .label").html(g ?
      "Each measurement <b>turns</b> one qubit by an angle." :
      "Each feature sets a fixed <b>rotation angle</b>, &pi; &times; its " +
      "value, on one qubit.");
  d3.select("#accuracy-label").text(g ? "Correct on test squares:" :
      "Accuracy");
  d3.select("#top-controls .control .label").text(g ? "Training rounds" :
      "Epoch");
  d3.select("label[for='threshold']").html(g ?
      `Score needed to be marked: <span class="value">` +
      `${state.threshold.toFixed(2)}</span>` :
      `Threshold <span class="value">${state.threshold.toFixed(2)}</span>`);
  d3.select("#colormap-label").html(g ?
      "Colors: orange = low, white = middle, blue = high." :
      "Colors: &lang;Z&rang; &minus;1&hellip;1; scores and features " +
      "0&hellip;1 (blue = high); angles &minus;&pi;&hellip;&pi;.");
  renderSceneLegend();
  if (network) {
    drawNetwork(network);
    updateReadoutInfo();
    updateUI();
  }
  renderGuide();
}

/** Key to the picture's marks, right beside it. */
function renderSceneLegend() {
  d3.select("#scene-legend").html(
      `<span><i class="sw score"></i>blue = higher score (the circuit ` +
      `thinks the ${scene.target} is there)</span>` +
      "<span><i class=\"sw marked\"></i>dashed = marked for the search</span>" +
      (guided() ? "<span><i class=\"sw probe\"></i>black frame = the " +
          "square you clicked (its score is below)</span>" :
          "<span><i class=\"sw probe\"></i>“inspecting”: the square " +
          "shown in the circuit (click to change)</span>") +
      "<span><i class=\"sw found\"></i>green ✓ / red ✗ = square the " +
      "search picked</span>");
}
let lineChart = new AppendingLineChart(d3.select("#linechart"),
    ["#777", "black"]);

function markedRegions(): number[] {
  let out: number[] = [];
  scores.forEach((s, i) => {
    if (s >= state.threshold) {
      out.push(i);
    }
  });
  return out;
}

/** The circuit input for a patch: switched-off features feed angle 0. */
function constructInput(features: number[]): number[] {
  return features.map((v, i) =>
      state.off.indexOf(scene.featureNames[i]) >= 0 ? 0 : v);
}

function makeGUI() {
  d3.select("#reset-button").on("click", () => {
    reset();
  });

  d3.select("#play-pause-button").on("click", function () {
    show = null;  // Pausing ends the paced run; play then trains on freely.
    player.playOrPause();
  });

  player.onPlayPause(isPlaying => {
    d3.select("#play-pause-button").classed("playing", isPlaying);
  });

  d3.select("#next-step-button").on("click", () => {
    show = null;
    player.pause();
    oneStep();
  });

  d3.select("#data-regen-button").on("click", () => {
    generateData();
    reset();
  });

  let sceneThumbs = d3.selectAll("canvas[data-scene]");
  sceneThumbs.on("click", function() {
    let id = this.dataset.scene;
    if (id === state.scene) {
      return;
    }
    state.scene = id;
    scene = SCENES[id];
    state.grid = scene.defaultGrid;
    state.off = [];
    sceneThumbs.classed("selected", false);
    d3.select(this).classed("selected", true);
    placeScene(true);
    generateData();
    reset();
  });
  d3.select(`canvas[data-scene=${state.scene}]`).classed("selected", true);

  d3.select("#load-weights").on("click", () => loadDemoWeights());
  // A real button (it used to be a caption that looked clickable but
  // was not): start over from an untrained circuit and train it.
  d3.select(".timeline-controls").append("button")
      .attr({class: "play-caption", type: "button",
          title: "Start from an untrained circuit and watch it learn"})
      .text("Train it yourself")
      .on("click", () => trainFromScratch());
  d3.select("#mode-toggle").on("click", () =>
      setMode(guided() ? "explorer" : "guided"));

  d3.select("#add-layers").on("click", () => {
    if (state.numHiddenLayers >= nn.MAX_LAYERS) {
      return;
    }
    state.numHiddenLayers++;
    reset();
  });

  d3.select("#remove-layers").on("click", () => {
    if (state.numHiddenLayers <= 1) {
      return;
    }
    state.numHiddenLayers--;
    reset();
  });

  let discretize = d3.select("#discretize").on("change", function() {
    state.discretize = this.checked;
    state.serialize();
    drawScene();
  });
  discretize.property("checked", state.discretize);

  let percTrain = d3.select("#percTrainData").on("input", function() {
    state.percTrainData = this.value;
    d3.select("label[for='percTrainData'] .value").text(this.value);
    generateData();
    reset();
  });
  percTrain.property("value", state.percTrainData);
  d3.select("label[for='percTrainData'] .value").text(state.percTrainData);

  let noise = d3.select("#noise").on("input", function() {
    state.noise = this.value;
    d3.select("label[for='noise'] .value").text(this.value);
    generateData();
    reset();
  });
  state.noise = Math.max(0, Math.min(50, state.noise));
  noise.property("value", state.noise);
  d3.select("label[for='noise'] .value").text(state.noise);

  let batchSize = d3.select("#batchSize").on("input", function() {
    state.batchSize = +this.value;
    d3.select("label[for='batchSize'] .value").text(this.value);
    reset();
  });
  batchSize.property("value", state.batchSize);
  d3.select("label[for='batchSize'] .value").text(state.batchSize);

  d3.select("#entanglers").on("change", function() {
    state.entangler = entanglers[this.value];
    reset();
  }).property("value", getKeyFromValue(entanglers, state.entangler));

  d3.select("#readouts").on("change", function() {
    state.readout = readouts[this.value];
    reset();
  }).property("value", getKeyFromValue(readouts, state.readout));

  d3.select("#learningRate").on("change", function() {
    state.learningRate = +this.value;
    state.serialize();
  }).property("value", state.learningRate);

  // Shots only change how values are estimated, so training carries on.
  d3.select("#shots").on("change", function() {
    state.shots = +this.value;
    nn.setShots(network, state.shots);
    state.serialize();
    updateReadoutInfo();
    updateMetrics();
    updateUI();
  }).property("value", state.shots);

  d3.select("#reupload").on("change", function() {
    state.reupload = this.value === "true";
    reset();
  }).property("value", String(state.reupload));

  // Scene: threshold, grid, target placement, probe.
  d3.select("#threshold").on("input", function() {
    state.threshold = +this.value;
    d3.select("label[for='threshold'] .value")
        .text(state.threshold.toFixed(2));
    state.serialize(true);
    search.clear();
    updateMetrics();
    updateUI();
  }).property("value", state.threshold);
  d3.select("label[for='threshold'] .value").text(state.threshold.toFixed(2));

  d3.select("#grid-size").on("change", function() {
    let old = state.grid;
    state.grid = +this.value;
    let rescale = (cell: number) => cell < 0 ? cell :
        Math.floor(Math.floor(cell / old) * state.grid / old) * state.grid +
        Math.floor((cell % old) * state.grid / old);
    state.target = rescale(state.target);
    views.setProbe(rescale(views.probe));
    placeScene(true);
    search.clear();
    drawNetwork(network);
    updateUI(true);
  }).property("value", state.grid);

  d3.select("#move-target").on("click", () => {
    moveMode = !moveMode;
    d3.select("#move-target").classed("active", moveMode)
        .text(moveMode ? "Click a region…" : "Move target");
  });
  d3.select("#random-spot").on("click", () => {
    // Anywhere, not just centred in a region: it may straddle a border,
    // which is harder than the demos' default placement.
    state.target = Math.floor(Math.random() * state.grid * state.grid);
    state.jitterX = Math.round((Math.random() - 0.5) * 80) / 100;
    state.jitterY = Math.round((Math.random() - 0.5) * 80) / 100;
    placeScene(false);
    search.clear();
    updateUI();
  });
  d3.select("#compare-run").on("click", () => runComparison());
  d3.select("#toggle-target").on("click", () => {
    state.target = state.target >= 0 ? -1 : views.probe;
    placeScene(false);
    search.clear();
    updateUI();
  });

  let canvas = d3.select("#scene-canvas");
  canvas.on("click", function() {
    let box = (this as HTMLCanvasElement).getBoundingClientRect();
    let e = d3.event as MouseEvent;
    let col = Math.floor((e.clientX - box.left) / box.width * state.grid);
    let row = Math.floor((e.clientY - box.top) / box.height * state.grid);
    let region = Math.max(0, Math.min(state.grid - 1, row)) * state.grid +
        Math.max(0, Math.min(state.grid - 1, col));
    if (moveMode) {
      moveMode = false;
      d3.select("#move-target").classed("active", false).text("Move target");
      state.target = region;
      state.jitterX = state.jitterY = 0;
      placeScene(false);
      search.clear();
      updateUI();
    }
    views.setProbe(region);
  }).on("keydown", () => {
    let e = d3.event as KeyboardEvent;
    if (views.moveProbe(e.key)) {
      e.preventDefault();
    }
  });

  // Search, readout, state and comparison sit in one full-width row of
  // cards under the circuit, not in a long narrow column.
  let panels = d3.select("#panels");
  let card = (cls: string) => panels.append("div")
      .attr("class", `panel-card ${cls}`);
  search.init(card("card-search"));
  let readoutCard = card("card-readout");
  readoutCard.append("div").attr("id", "readout-info");
  views.initReadout(readoutCard);
  views.initStatevector(card("card-state"));
  let compareCard = card("card-compare");
  (compareCard.node() as Element).appendChild(
      document.getElementById("compare-panel"));

  // Add scale to the gradient color map.
  let x = d3.scale.linear().domain([-1, 1]).range([0, 144]);
  let xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .tickValues([-1, 0, 1])
    .tickFormat(d3.format("d"));
  d3.select("#colormap g.core").append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0,10)")
    .call(xAxis);

  window.addEventListener("resize", () => {
    let newWidth = document.querySelector("#main-part")
        .getBoundingClientRect().width;
    if (newWidth !== mainWidth) {
      mainWidth = newWidth;
      drawNetwork(network);
      updateUI(true);
    }
  });

  if (state.hideText) {
    d3.select("#article-text").style("display", "none");
  }
}

/* ------------------------------ The scene ------------------------------ */

/**
 * Renders the scene and extracts every region's features (the slow part,
 * done only when the scene changes). `newDistractors` reshuffles the bus
 * scene's other vehicles.
 */
function placeScene(newDistractors: boolean) {
  let cells = state.grid * state.grid;
  if (state.target >= cells) {
    state.target = cells - 1;
  }
  // The probe square must exist in this grid (old URLs, or a scene switch
  // from 8 x 8 to 4 x 4, can carry one that doesn't).
  if (views.probe >= cells) {
    views.probe = state.probe = cells - 1;
  }
  if (newDistractors || !placement.distractors.length) {
    placement.distractors = scene.randomDistractors(state.grid)
        .filter(d => d.cell !== state.target);
  }
  placement.targetCell = state.target >= 0 ? state.target : null;
  placement.jitter = {dx: state.jitterX, dy: state.jitterY};
  placement.distractors = placement.distractors.filter(d =>
      d.cell !== placement.targetCell);
  scene.render(rasterCtx, state.grid, placement);
  regionFeats = regionFeatures(scene, raster, state.grid);
  measured = null;
  d3.select("#toggle-target").text(state.target >= 0 ? "Remove target" :
      "Restore target");
  renderSceneLegend();
  state.serialize(true);
}

/** Scene view: the image, each region's value, marks, probe and result. */
function drawScene() {
  let canvas = document.getElementById("scene-canvas") as HTMLCanvasElement;
  let ctx = canvas.getContext("2d");
  ctx.drawImage(raster, 0, 0);
  let g = state.grid, s = 512 / g;
  let selected = selectedNodeId != null && boundary[selectedNodeId];
  let marked = new Set(markedRegions());
  for (let i = 0; i < g * g; i++) {
    let x = (i % g) * s, y = Math.floor(i / g) * s;
    // Hovering a box shows that node's map; otherwise the region scores,
    // as a blue wash whose strength is the score (the scene stays visible).
    if (selected) {
      let v = boundary[selectedNodeId][i % g][Math.floor(i / g)];
      let c = d3.rgb(colorScale(v) as any as string);
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.55)`;
    } else {
      let v = state.discretize ? (marked.has(i) ? 1 : 0) : scores[i];
      ctx.fillStyle = guided() && !marked.has(i) ?
          `rgba(255,255,255,${0.45 - 0.3 * v})` :
          `rgba(8,119,189,${0.6 * v})`;
    }
    ctx.fillRect(x, y, s, s);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1;
  for (let k = 1; k < g; k++) {
    ctx.beginPath();
    ctx.moveTo(k * s, 0); ctx.lineTo(k * s, 512);
    ctx.moveTo(0, k * s); ctx.lineTo(512, k * s);
    ctx.stroke();
  }
  // Marked for the Grover oracle (score >= threshold): dashed outline.
  ctx.setLineDash([10, 5]);
  ctx.strokeStyle = "#0877bd";
  ctx.lineWidth = guided() ? 6 : 3;
  marked.forEach(i => ctx.strokeRect((i % g) * s + 4,
      Math.floor(i / g) * s + 4, s - 8, s - 8));
  ctx.setLineDash([]);
  // Score labels on coarse grids.
  if (g <= 4 && !selected) {
    ctx.font = "bold 22px Roboto, sans-serif";
    scores.forEach((sc, i) => {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect((i % g) * s + 6, Math.floor(i / g) * s + 6, 62, 28);
      ctx.fillStyle = "#183D4E";
      ctx.fillText(sc.toFixed(2), (i % g) * s + 11, Math.floor(i / g) * s + 28);
    });
  }
  // Probe: dark frame with an "inspecting" tag (not to be read as "the
  // target is here").
  let p = views.probe, px = (p % g) * s, py = Math.floor(p / g) * s;
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 5;
  ctx.strokeRect(px + 2.5, py + 2.5, s - 5, s - 5);
  if (!guided()) {
    ctx.font = `bold ${g <= 4 ? 18 : 13}px Roboto, sans-serif`;
    let tag = "inspecting", tw = ctx.measureText(tag).width + 10;
    ctx.fillStyle = "#111";
    ctx.fillRect(px + 2, py + s - (g <= 4 ? 26 : 20), Math.min(tw, s - 4),
        g <= 4 ? 24 : 18);
    ctx.fillStyle = "#fff";
    ctx.fillText(tag, px + 7, py + s - (g <= 4 ? 8 : 6));
  }
  // The clicked square's score, in words.
  if (scores[p] != null) {
    let sc = scores[p];
    d3.select("#square-info").html(`Square ${p} scores ` +
        `<b>${sc.toFixed(2)}</b>: ` + (sc >= state.threshold ?
            "marked, so the search may pick it." :
            `below the threshold (${state.threshold.toFixed(2)}), so not ` +
            "marked.") + " Click any square to check it.");
  }
  if (measured) {
    let m = measured.region, ok = measured.verdict === "found";
    ctx.strokeStyle = ok ? "#1b8a3a" : "#c0392b";
    ctx.lineWidth = 8;
    ctx.strokeRect((m % g) * s + 4, Math.floor(m / g) * s + 4, s - 8, s - 8);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = `bold ${g <= 4 ? 40 : 30}px Roboto, sans-serif`;
    ctx.fillText(ok ? "✓" : "✗", (m % g) * s + s - (g <= 4 ? 44 : 30),
        Math.floor(m / g) * s + (g <= 4 ? 44 : 32));
  }
}

/** Data column: a preview of each scene and a strip of training patches. */
function drawSceneThumbnails() {
  for (let id in SCENES) {
    let el = document.querySelector(`canvas[data-scene=${id}]`) as
        HTMLCanvasElement;
    el.width = el.height = 100;
    let c = document.createElement("canvas");
    c.width = c.height = 512;
    SCENES[id].render(c.getContext("2d"), SCENES[id].defaultGrid,
        {targetCell: SCENES[id].defaultGrid * 3 + 2, distractors:
            SCENES[id].randomDistractors(SCENES[id].defaultGrid)});
    el.getContext("2d").drawImage(c, 0, 0, 100, 100);
  }
  d3.select(".scene-name").text(`${scene.title}: find the ${scene.target}.`);
}

function drawPatchStrip() {
  let strip = d3.select("#patch-strip");
  strip.selectAll("*").remove();
  let pos = trainData.filter(p => p.label === 1).slice(0, 4);
  let neg = trainData.filter(p => p.label === 0).slice(0, 4);
  pos.concat(neg).forEach(p => {
    let cell = strip.append("div").attr("class", "patch")
        .attr("title", p.label ? `Contains the ${scene.target}` :
            `No ${scene.target}`);
    let c = cell.append("canvas").attr({width: 32, height: 32}).node() as
        HTMLCanvasElement;
    c.getContext("2d").drawImage(p.canvas, 0, 0, 32, 32);
    cell.append("b").attr("class", p.label ? "pos" : "neg")
        .html(p.label ? "&#10003;" : "&#10007;");
  });
}

/** Loads the scene demo's exact trained weights into the demos' circuit. */
async function loadDemoWeights() {
  let forScene = scene;
  let model = demoModels[forScene.id];
  if (!model) {
    model = await (await fetch(forScene.modelUrl)).json();
    demoModels[forScene.id] = model;
  }
  if (scene !== forScene) {
    return;  // The scene changed while downloading; those weights don't fit.
  }
  // The demos' scores are exact expectation values: "these scores match the
  // site" is only true without shot noise.
  state.shots = 0;
  d3.select("#shots").property("value", 0);
  state.numHiddenLayers = model.layers;
  state.networkShape = d3.range(model.layers).map(() => model.qubits);
  state.entangler = "cnot";
  state.reupload = true;
  state.readout = "project";
  state.off = [];
  d3.select("#entanglers").property("value", "cnot");
  d3.select("#reupload").property("value", "true");
  d3.select("#readouts").property("value", "project");
  reset(false);
  nn.loadWeights(network, model);
  state.threshold = model.threshold;
  d3.select("#threshold").property("value", state.threshold);
  d3.select("label[for='threshold'] .value").text(state.threshold.toFixed(2));
  updateMetrics();
  updateUI();
  let acc = (model as any).metrics?.test?.accuracy;
  progress.weightsLoaded = true;
  renderGuide();
  if (guided()) {
    return;
  }
  d3.select("#readout-info").html(
      `<b>Demo weights loaded</b>: these are the exact parameters the ` +
      `${scene.title} site uses` + (acc ? ` (${(100 * acc).toFixed(1)}% ` +
      "on its own held-out patches)" : "") + ", so these region scores " +
      "match it. Press play to keep training from here.");
}

/* ------------------------------ The circuit ---------------------------- */

function updateBiasesUI(network: nn.Node[][]) {
  nn.forEachNode(network, true, node => {
    d3.select(`rect#bias-${node.id}`).style("fill", angleColor(node.bias));
  });
}

function updateWeightsUI(network: nn.Node[][], container) {
  for (let layerIdx = 1; layerIdx < network.length; layerIdx++) {
    for (let node of network[layerIdx]) {
      for (let link of node.inputLinks) {
        if (link.kind === "entangle" && !link.fixed) {
          container.select(`#gate${link.source.id}-${link.dest.id}`)
              .style("fill", angleColor(link.weight));
        }
      }
    }
  }
}

function drawNode(cx: number, cy: number, nodeId: string, isInput: boolean,
    container, node?: nn.Node) {
  let x = cx - RECT_SIZE / 2;
  let y = cy - RECT_SIZE / 2;

  let nodeGroup = container.append("g")
    .attr({
      "class": "node",
      "id": `node${nodeId}`,
      "transform": `translate(${x},${y})`
    });

  nodeGroup.append("rect")
    .attr({
      x: 0,
      y: 0,
      width: RECT_SIZE,
      height: RECT_SIZE,
    });
  let featureIndex = isInput ? node.index : -1;
  let active = isInput &&
      state.off.indexOf(scene.featureNames[featureIndex]) < 0;
  if (isInput) {
    nodeGroup.append("text").attr({
      class: "main-label",
      x: -10,
      y: RECT_SIZE / 2 + 4, "text-anchor": "end"
    }).text(scene.featureLabels[featureIndex])
      .append("title").text(scene.featureNames[featureIndex]);
    nodeGroup.classed(active ? "active" : "inactive", true);
  } else {
    // The small square is the gate's trainable RY angle (TF's bias square).
    nodeGroup.append("rect")
      .attr({
        id: `bias-${nodeId}`,
        x: -BIAS_SIZE - 2,
        y: RECT_SIZE - BIAS_SIZE + 3,
        width: BIAS_SIZE,
        height: BIAS_SIZE,
      }).on("mouseenter", function() {
        updateHoverCard(HoverType.BIAS, node, d3.mouse(container.node()));
      }).on("mouseleave", function() {
        updateHoverCard(null);
      });
  }

  let div = d3.select("#network").insert("div", ":first-child")
    .attr({
      "id": `canvas-${nodeId}`,
      "class": "canvas"
    })
    .style({
      position: "absolute",
      left: `${x + 3}px`,
      top: `${y + 3}px`
    })
    .on("mouseenter", function() {
      selectedNodeId = nodeId;
      div.classed("hovered", true);
      nodeGroup.classed("hovered", true);
      drawScene();
      views.update();
      if (!isInput) {
        updateHoverCard(HoverType.BIAS, node, [x + RECT_SIZE + 6, y - 10]);
      }
    })
    .on("mouseleave", function() {
      selectedNodeId = null;
      div.classed("hovered", false);
      nodeGroup.classed("hovered", false);
      drawScene();
      views.update();
      if (!isInput) {
        updateHoverCard(null);
      }
    });
  if (isInput) {
    div.on("click", function() {
      let name = scene.featureNames[featureIndex];
      state.off = active ? state.off.concat([name]) :
          state.off.filter(f => f !== name);
      state.serialize();
      drawNetwork(network);
      updateMetrics();
      updateUI(true);
    });
    div.style("cursor", "pointer");
    div.classed(active ? "active" : "inactive", true);
    div.attr("title", `${scene.featureNames[featureIndex]}: click to ` +
        (active ? "switch off (its angle becomes 0)" : "switch on"));
  }
  let nodeHeatMap = new HeatMap(RECT_SIZE, state.grid, [0, 1], [0, 1], div,
      {noSvg: true});
  div.datum({heatmap: nodeHeatMap, id: nodeId});
  if (!isInput) {
    div.append("div").attr("class", "probe-dot");
    div.style("cursor", "pointer");
    div.attr({tabindex: 0, role: "button",
        "aria-label": `Gate on qubit ${node.index}, layer ${node.layer}` +
            (node.dead ? " (cannot affect the measurement)" : "")})
      .on("focus", () => (div.on("mouseenter") as any).call(div.node()))
      .on("blur", () => (div.on("mouseleave") as any).call(div.node()))
      .on("keydown", () => {
        if ((d3.event as KeyboardEvent).key === "Enter") {
          let edit = d3.select("#network").on("click.edit") as any;
          if (edit) {
            edit();
          }
        }
      });
  }
}

/** Node centers from the last drawNetwork. */
let node2coord: {[id: string]: {cx: number, cy: number}} = {};

/**
 * Draws the circuit: one wire per qubit, a column of gate boxes per layer
 * (each box shows that qubit's <Z> for every scene region), the entangling
 * ring after each column, and the measurement feeding the readout.
 * Feature -> gate lines are the fixed angle encodings.
 */
function drawNetwork(network: nn.Node[][]): void {
  let svg = d3.select("#svg");
  svg.select("g.core").remove();
  d3.select("#network").selectAll("div.canvas").remove();
  d3.select("#network").selectAll("div.plus-minus-neurons").remove();

  let padding = 3;
  let co = d3.select(".column.output").node() as HTMLDivElement;
  let cf = d3.select(".column.features").node() as HTMLDivElement;
  let width = co.offsetLeft - cf.offsetLeft;
  svg.attr("width", width);

  node2coord = {};
  let container = svg.append("g")
    .classed("core", true)
    .attr("transform", `translate(${padding},${padding})`);
  let numLayers = network.length;
  let numQubits = network[1].length;
  let featureWidth = 118;
  let circuitStart = featureWidth + 60;
  let circuitEnd = width - 22 - 16 - arcSpace(numQubits);
  let segment = (circuitEnd - circuitStart) / (numLayers - 2);
  let layerScale = (l: number) => circuitStart + (l - 1) * segment;
  let nodeIndexScale = (nodeIndex: number) => nodeIndex * (RECT_SIZE + 25);
  let rowY = (q: number) => q * QUBIT_ROW + RECT_SIZE / 2;

  let calloutThumb = d3.select(".callout.thumbnail").style("display", "none");
  let calloutWeights = d3.select(".callout.weights").style({display: null,
      top: `${nodeIndexScale(network[0].length) + 6}px`, left: "36px"});

  let wires = container.append("g").attr("class", "wires");
  let gates = container.append("g").attr("class", "gates");

  let cx = RECT_SIZE / 2 + 56;
  let maxY = nodeIndexScale(network[0].length);
  network[0].forEach((node, i) => {
    let cy = nodeIndexScale(i) + RECT_SIZE / 2;
    node2coord[node.id] = {cx, cy};
    drawNode(cx, cy, node.id, true, container, node);
  });
  maxY = Math.max(maxY, numQubits * QUBIT_ROW);
  let arcs = container.append("g").attr("class", "entanglement");

  let colX = (l: number) => layerScale(l) + RECT_SIZE / 2;
  let firstX = colX(1) - RECT_SIZE / 2 - 24;
  let meterX = width - 22;
  let space = arcSpace(numQubits);
  let finalArcX = meterX - 16 - space;
  let measureAll = nn.getReadout(network).kind === "project";

  for (let q = 0; q < numQubits; q++) {
    let y = rowY(q);
    let end = q === 0 || measureAll ? meterX : meterX - 14;
    wires.append("line").attr({class: "wire", x1: firstX, y1: y, x2: end,
        y2: y});
    wires.append("text").attr({class: "ket", x: firstX - 3, y: y + 4,
        "text-anchor": "end"}).text("|0⟩");
    wires.append("text").attr(q === 0 || measureAll ?
        {class: "ket", x: meterX, y: y + 25, "text-anchor": "middle"} :
        {class: "ket", x: end + 4, y: y + 4}).text(`q${q}`);
  }

  for (let layerIdx = 1; layerIdx < numLayers - 1; layerIdx++) {
    let cx = colX(layerIdx);
    if (layerIdx === 1) {
      addPlusMinusControl(layerScale(layerIdx), layerIdx);
    } else {
      d3.select("#network").append("div")
          .classed("plus-minus-neurons", true).classed("layer-label", true)
          .style("left", `${layerScale(layerIdx) - 25}px`)
          .text(`layer ${layerIdx}`);
    }
    network[layerIdx].forEach((node, q) => {
      let cy = rowY(q);
      node2coord[node.id] = {cx, cy};
      drawNode(cx, cy, node.id, false, container, node);
      views.drawBlochSphere(gates, node, cx, cy);
      let encodes = node.inputLinks.filter(l => l.kind === "encode");
      if (layerIdx === 1) {
        encodes.forEach(link => drawLink(link, node2coord, container,
            encodes));
      } else if (encodes.length) {
        gates.append("text").attr({class: "reupload-tag",
            x: cx - RECT_SIZE / 2 - 3, y: cy - RECT_SIZE / 2 + 2,
            "text-anchor": "end"}).text("f→")
          .append("title").text("The same features are re-encoded here " +
              `(RY(π·f${q}) RZ(π·f${q + numQubits})).`);
      }
      if (layerIdx === 1 && q === numQubits - 1) {
        calloutThumb.style({display: null,
            top: `${cy + RECT_SIZE / 2 + 44}px`, left: `${cx + 4}px`});
      }
    });

    let ents: nn.Link[] = [];
    network[layerIdx].forEach(n => n.outputs.forEach(l => {
      if (l.kind === "entangle") {
        ents.push(l);
      }
    }));
    let arcRoom = 0;
    if (layerIdx > 1) {
      views.drawEntanglementArcs(arcs, String(layerIdx),
          cx + RECT_SIZE / 2 + 4, numQubits, rowY);
      arcRoom = space - 8;
    }
    let xa = cx + RECT_SIZE / 2 + arcRoom + 14;
    let xb = (layerIdx < numLayers - 2 ? colX(layerIdx + 1) - RECT_SIZE / 2 :
        finalArcX) - 14;
    let pitch = ents.length ? (xb - xa) / ents.length : 0;
    ents.forEach((link, k) => {
      let x = xa + (k + 0.5) * pitch;
      drawEntangler(link, x, rowY(link.source.index),
          rowY(link.dest.index), gates, pitch < 26);
    });
  }

  views.drawEntanglementArcs(arcs, "final", finalArcX, numQubits, rowY);

  // Measurement: every qubit (hybrid readout) or qubit 0 only.
  let output = nn.getOutputNode(network);
  node2coord[output.id] = {cx: width + RECT_SIZE / 2, cy: rowY(0)};
  for (let q = 0; q < (measureAll ? numQubits : 1); q++) {
    let meter = gates.append("g").attr({class: "meter",
        transform: `translate(${meterX - 12},${rowY(q) - 11})`});
    meter.append("rect").attr({width: 24, height: 22, rx: 2});
    meter.append("path").attr("d", "M4,16 A8,8 0 0 1 20,16");
    meter.append("line").attr({x1: 12, y1: 16, x2: 18, y2: 7});
    meter.append("title").text(`Measure qubit ${q}`);
  }
  if (measureAll) {
    wires.append("line").attr({class: "wire readout", x1: meterX + 14,
        y1: rowY(0), x2: meterX + 14, y2: rowY(numQubits - 1)});
  }
  wires.append("line").attr({class: "wire readout", x1: meterX + 12,
      y1: rowY(0), x2: width, y2: rowY(0)});

  views.markDeadGates(network);

  d3.select("#network").selectAll("div.circuit-legend").remove();
  d3.select("#network").append("div").attr("class", "circuit-legend")
      .style({top: `${numQubits * QUBIT_ROW + 12}px`,
          left: `${colX(1) + 120}px`,
          width: `${Math.max(200, width - colX(1) - 140)}px`})
      .html(guided() ?
          `<b>In short:</b> ${numQubits} qubits mix` +
          " the square's 8 clues over " +
          "several rounds; the meters on the right turn them into the " +
          "square's bus score.<br><b>How to read it</b> (left to right):" +
          "<span class='key'><b>|0⟩</b> each line is one " +
          term("qubit", "A quantum bit. Unlike a normal bit it can be " +
              "partly 0 and partly 1 at once.") + ", starting at 0</span>" +
          "<span class='key'><b>dotted lines</b> the square's 8 " +
          "measurements turn the qubits</span>" +
          "<span class='key'><b>▢ box</b> a turn the circuit learns; " +
          "its tiny map shows the qubit for every square (blue = leaning " +
          "to 0, orange = leaning to 1)</span>" +
          "<span class='key'><b>●–⊕</b> links two qubits (" +
          term("entanglement", "A link between qubits: their values " +
              "become connected, so they must be described together.") +
          ")</span><span class='key'><b>meter</b> reads each qubit; the " +
          "readings combine into the square's score</span>" :
          "Sphere under each gate and arcs after it: the probe region's " +
          "state right after that column's rotations, <i>before</i> the ⊕ " +
          "ring that follows (so layer 1 is never entangled; the last " +
          "ring shows only in the arcs next to the meters). Shorter arrow " +
          "= more entangled. <span class='arc'>Purple arcs</span>: " +
          "correlation between qubit pairs (mutual information); solid = " +
          "the pair is entangled, dashed = correlated only. Faded gates " +
          "cannot affect the measurement.");
  maxY = Math.max(maxY, numQubits * QUBIT_ROW + 40);

  svg.attr("height", maxY);
  let height = Math.max(
    getRelativeHeight(calloutThumb),
    getRelativeHeight(calloutWeights),
    getRelativeHeight(d3.select("#network"))
  );
  d3.select(".column.features").style("height", height + "px");
}

/** One two-qubit gate of the entangling ring, drawn in circuit notation. */
function drawEntangler(link: nn.Link, x: number, yc: number, yt: number,
    container, compact = false) {
  let g = container.append("g").attr("class", "entangler");
  g.append("line").attr({x1: x, y1: yc, x2: x, y2: yt});
  g.append("circle").attr({class: "control", cx: x, cy: yc, r: 3.5});
  if (link.gate === "cnot") {
    g.append("circle").attr({class: "target", cx: x, cy: yt, r: 7});
    g.append("path").attr({class: "plus",
        d: `M${x - 7},${yt}H${x + 7}M${x},${yt - 7}V${yt + 7}`});
  } else {
    let w = compact ? 11 : 20, h = compact ? 11 : 16;
    g.append("rect").attr({id: `gate${link.source.id}-${link.dest.id}`,
        class: "cry", x: x - w / 2, y: yt - h / 2, width: w, height: h, rx: 2})
      .style("fill", angleColor(link.weight));
    if (!compact) {
      g.append("text").attr({class: "cry-label", x, y: yt + 3,
          "text-anchor": "middle"}).text("RY");
    }
    g.on("mouseenter", function() {
      updateHoverCard(HoverType.WEIGHT, link, d3.mouse(this));
    }).on("mouseleave", function() {
      updateHoverCard(null);
    });
  }
  let name = link.gate === "cry" ? "CRY" : link.gate.toUpperCase();
  g.append("title").text(`${name}: control q${link.source.index}, ` +
      `target q${link.dest.index}` + (link.fixed ? " (fixed gate)" : ""));
}

function getRelativeHeight(selection) {
  let node = selection.node() as HTMLAnchorElement;
  return node.offsetHeight + node.offsetTop;
}

/**
 * The qubit +/- control above layer 1. Every layer shares one register, so it
 * changes all layers at once: 4 (the demos', 2 features per qubit) up to
 * MAX_QUBITS.
 */
function addPlusMinusControl(x: number, layerIdx: number) {
  let div = d3.select("#network").append("div")
    .classed("plus-minus-neurons", true).classed("qubit-control", true)
    .style("left", `${x - 40}px`);
  let n = qubits();
  let button = (icon: string, delta: number, title: string) => {
    let b = div.append("button")
        .attr("class", "mdl-button mdl-js-button mdl-button--icon")
        .attr("title", title)
        .property("disabled", n + delta < nn.MIN_QUBITS ||
            n + delta > nn.MAX_QUBITS)
        .on("click", () => {
          state.networkShape = state.networkShape.map(() => n + delta);
          reset();
        });
    b.append("i").attr("class", "material-icons").text(icon);
  };
  button("add", 1, `Add a qubit (up to ${nn.MAX_QUBITS})`);
  button("remove", -1, `Remove a qubit (8 features need at least ` +
      `${nn.MIN_QUBITS}: two angles per qubit)`);
  div.append("div").attr("class", "qubit-count")
      .text(`${n} qubit${n === 1 ? "" : "s"}`);
  d3.select("#network").append("div")
    .classed("plus-minus-neurons", true).classed("layer-label", true)
    .style("left", `${x - 25}px`)
    .text(`layer ${layerIdx}`);
}

interface CardField {
  label: string;
  get: () => number;
  set: (v: number) => void;
}

function updateHoverCard(type: HoverType, nodeOrLink?: nn.Node | nn.Link,
    coordinates?: [number, number]) {
  let hovercard = d3.select("#hovercard");
  // Gate boxes are HTML canvases above the SVG, so listen on their parent.
  d3.select("#network").on("click.edit", null);
  if (type == null) {
    hovercard.style("display", "none");
    return;
  }
  let fields: CardField[] = [], note: string, editable = true;
  if (type === HoverType.WEIGHT) {
    let link = nodeOrLink as nn.Link;
    if (link.kind === "encode") {
      editable = false;
      note = `Fixed encoding: ${link.axis.toUpperCase()}(π · ` +
          `${scene.featureNames[link.source.index]}) on q${link.dest.index}` +
          (state.reupload ? ", in every layer." : ", in layer 1.") +
          " It has no trainable weight, as in the demos.";
    } else {
      fields.push({label: "CRY angle", get: () => link.weight,
          set: v => { link.weight = v; }});
      note = `Controlled RY: control q${link.source.index}, ` +
          `target q${link.dest.index}.`;
      if (link.dead) {
        editable = false;
        note += " It cannot affect any measured observable.";
      }
    }
  } else {
    let node = nodeOrLink as nn.Node;
    fields.push({label: "RY angle θ", get: () => node.bias,
        set: v => { node.bias = v; }});
    fields.push({label: "RZ angle φ", get: () => node.phase,
        set: v => { node.phase = v; }});
    note = guided() ?
        `Qubit ${node.index}, layer ${node.layer}: the square's ` +
        "measurements turn the qubit, then two learned angles θ and φ turn " +
        "it further. The box shows the qubit for every square." :
        `q${node.index}, layer ${node.layer}: encoded features, then ` +
        "trainable RY(θ) RZ(φ). Box: ⟨Z⟩ for each region; sphere: the " +
        "probe region.";
    if (node.dead) {
      editable = false;
      note = `q${node.index}, layer ${node.layer}: this gate cannot affect ` +
          "the measurement (its gradient is always 0).";
    } else if (node.rzDead) {
      note += " Its RZ has no effect: an RZ just before measuring Z-strings " +
          "never does (the demos' audit lists these slots too).";
    }
  }
  hovercard.selectAll(".field").remove();
  let rows = fields.map(f => {
    let row = hovercard.insert("div", ".gate").attr("class", "field");
    row.append("span").text(`${f.label} = `);
    let value = row.append("span").attr("class", "value")
        .text(f.get().toFixed(2));
    let input = row.append("input").attr({type: "number", step: "0.1"})
        .property("value", f.get().toFixed(2)).style("display", "none")
        .on("input", function() {
          if (this.value != null && this.value !== "") {
            f.set(+this.value);
            updateUI();
          }
        })
        .on("keypress", () => {
          if ((d3.event as any).keyCode === 13) {
            updateHoverCard(type, nodeOrLink, coordinates);
          }
        });
    return {value, input};
  });
  hovercard.select(".hint").text(!fields.length ? "" : editable ?
      "Click to edit." : "Not editable: no effect on the measurement.");
  hovercard.select(".gate").text(note);
  if (editable && rows.length) {
    d3.select("#network").on("click.edit", () => {
      rows.forEach(r => {
        r.value.style("display", "none");
        r.input.style("display", null);
      });
      (rows[0].input.node() as HTMLInputElement).focus();
    });
  }
  hovercard.style({
    "left": `${coordinates[0] + 20}px`,
    "top": `${coordinates[1]}px`,
    "display": "block"
  });
}

function drawLink(
    input: nn.Link, node2coord: {[id: string]: {cx: number, cy: number}},
    container, siblings: nn.Link[]) {
  let index = siblings.indexOf(input);
  let length = siblings.length;
  let line = container.insert("path", ":first-child");
  let source = node2coord[input.source.id];
  let dest = node2coord[input.dest.id];
  let datum = {
    source: {
      y: source.cx + RECT_SIZE / 2 + 2,
      x: source.cy
    },
    target: {
      y: dest.cx - RECT_SIZE / 2,
      x: dest.cy + ((index - (length - 1) / 2) / length) * 12
    }
  };
  let diagonal = d3.svg.diagonal().projection(d => [d.y, d.x]);
  let off = state.off.indexOf(scene.featureNames[input.source.index]) >= 0;
  line.attr({
    "marker-start": "url(#markerArrow)",
    class: `link encode ${input.axis}` + (off ? " off" : ""),
    id: "link" + input.source.id + "-" + input.dest.id,
    d: diagonal(datum, 0)
  });
  container.append("path")
    .attr("d", diagonal(datum, 0))
    .attr("class", "link-hover")
    .on("mouseenter", function() {
      updateHoverCard(HoverType.WEIGHT, input, d3.mouse(this));
    }).on("mouseleave", function() {
      updateHoverCard(null);
    });
  return line;
}

/**
 * Does the quantum part matter? Trains fresh circuits with and without the
 * entangling ring on the same patches, for the same number of epochs, and
 * reports them next to the classical baseline. Time-sliced: the page stays
 * responsive while it runs.
 */
async function runComparison() {
  let out = d3.select("#compare-result");
  let epochs = 120;
  let results: string[] = [];
  d3.select("#compare-run").property("disabled", true);
  for (let entangler of ["cnot", "none"] as nn.Entangler[]) {
    let net = nn.buildNetwork({featureIds: scene.featureNames, qubits: qubits(),
        layers: state.numHiddenLayers, entangler, reupload: state.reupload,
        readout: state.readout, shots: 0});
    for (let e = 0; e < epochs; e++) {
      let order = trainData.slice();
      shuffle(order);
      order.forEach((p, i) => {
        nn.forwardProp(net, constructInput(p.features));
        nn.backProp(net, p.label);
        if ((i + 1) % state.batchSize === 0 || i === order.length - 1) {
          nn.updateWeights(net, state.learningRate);
        }
      });
      if (e % 10 === 0) {
        out.text(`Training the ${entangler === "cnot" ? "entangled" :
            "unentangled"} circuit: epoch ${e} / ${epochs}…`);
        await new Promise(r => setTimeout(r, 0));
      }
    }
    let correct = testData.filter(p => (nn.forwardProp(net,
        constructInput(p.features)) >= state.threshold ? 1 : 0) ===
        p.label).length / Math.max(1, testData.length);
    results.push(`${entangler === "cnot" ? "With CNOT ring" :
        "No entanglement"}: <b>${Math.round(100 * correct)}%</b>`);
  }
  results.push(`Logistic regression (9 parameters, classical): ` +
      `<b>${Math.round(100 * baselineAcc)}%</b>`);
  out.html(`Same ${trainData.length} training patches, ${epochs} epochs ` +
      `each, ${state.numHiddenLayers} layers, ${state.readout === "project" ?
          "hybrid" : "quantum-only"} readout; test accuracy on ` +
      `${testData.length} new patches:<br>${results.join("<br>")}<br>` +
      "If these are close, entanglement is not what makes this task work.");
  d3.select("#compare-run").property("disabled", false);
}

function updateReadoutInfo() {
  let shots = state.shots;
  if (guided()) {
    d3.select("#readout-info").html("");
    return;
  }
  d3.select("#readout-info").html(
      "Accuracy is on new patches made the same way with the same " +
      "artwork (in-distribution), not on new pictures. " +
      `Each region's patch is scored by the circuit; regions scoring at ` +
      `least the threshold are <b>marked</b> (dashed) for the Grover ` +
      `oracle. Values are ` + (shots > 0 ? `estimated from ${shots} shots; ` +
          "gradients by parameter shift." :
          "exact; gradients by the adjoint method (simulator only).") +
      " Click a region to inspect its quantum state.");
}

/* --------------------------- Training & metrics ------------------------ */

/**
 * Runs every region through the circuit: region scores, and per node a
 * grid x grid map of its value (features, <Z> per qubit) for the boxes.
 */
function updateBoundary() {
  let g = state.grid;
  boundary = {};
  nn.forEachNode(network, false, node => {
    boundary[node.id] = d3.range(g).map(() => new Array(g));
  });
  scores = [];
  regionFeats.forEach((features, r) => {
    let col = r % g, row = Math.floor(r / g);
    scores.push(nn.forwardProp(network, constructInput(features)));
    nn.forEachNode(network, false, node => {
      // <Z> is -1..1 (orange..blue); features and scores are 0..1, shown
      // as white..blue so that 0 reads as "nothing", not as negative.
      boundary[node.id][col][row] = node.output;
    });
  });
}

/** Cross-entropy and accuracy (at the threshold) in one pass. */
function evaluate(network: nn.Node[][], patches: Patch[]):
    {loss: number, accuracy: number} {
  let loss = 0, correct = 0;
  for (let p of patches) {
    let score = nn.forwardProp(network, constructInput(p.features));
    loss += nn.bce(score, p.label);
    if ((score >= state.threshold ? 1 : 0) === p.label) {
      correct++;
    }
  }
  let n = Math.max(1, patches.length);
  return {loss: loss / n, accuracy: correct / n};
}

function updateMetrics() {
  let train = evaluate(network, trainData), test = evaluate(network, testData);
  lossTrain = train.loss;
  lossTest = test.loss;
  accTrain = train.accuracy;
  accTest = test.accuracy;
}

function updateUI(firstStep = false) {
  updateWeightsUI(network, d3.select("g.core"));
  updateBiasesUI(network);
  updateBoundary();
  d3.select("#network").selectAll("div.canvas")
      .each(function(data: {heatmap: HeatMap, id: string}) {
    data.heatmap.updateBackground(boundary[data.id], false);
  });
  drawScene();

  function zeroPad(n: number): string {
    let pad = "000000";
    return (pad + n).slice(-pad.length);
  }

  function addCommas(s: string): string {
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  d3.select("#loss-train").text(lossTrain.toFixed(3));
  d3.select("#loss-test").text(lossTest.toFixed(3));
  d3.select("#accuracy").text(guided() ? `${Math.round(100 * accTest)}%` :
      `${Math.round(100 * accTrain)} / ${Math.round(100 * accTest)}%`);
  d3.select("#baseline").text(`${Math.round(100 * baselineAcc)}%`);
  d3.select("#iter-number").text(addCommas(zeroPad(iter)));
  lineChart.addDataPoint([lossTrain, lossTest]);
  views.update();
  search.refresh();
  renderGuide();
}

/** Position within the current epoch, so one epoch can span frames. */
let epochPos = 0;

/**
 * Trains on patches from the current epoch until `deadline` (from
 * performance.now()). Returns true when the epoch is complete.
 */
function trainSamples(deadline: number): boolean {
  if (epochPos === 0) {
    shuffle(trainData);  // A fresh order every epoch (seeded, reproducible).
  }
  while (epochPos < trainData.length) {
    let patch = trainData[epochPos];
    nn.forwardProp(network, constructInput(patch.features));
    nn.backProp(network, patch.label);
    epochPos++;
    if (epochPos % state.batchSize === 0) {
      nn.updateWeights(network, state.learningRate);
    }
    if (performance.now() > deadline && epochPos < trainData.length) {
      return false;
    }
  }
  // A last partial batch is applied now, not carried into the next epoch.
  if (epochPos % state.batchSize !== 0) {
    nn.updateWeights(network, state.learningRate);
  }
  epochPos = 0;
  return true;
}

function finishEpoch(): void {
  iter++;
  updateMetrics();
  updateUI();
}

/** One full epoch (the Step button). */
function oneStep(): void {
  trainSamples(Infinity);
  finishEpoch();
}

/**
 * Rebuilds an untrained circuit. In the guided view this also starts the
 * paced training run, so a beginner always sees the circuit learn.
 */
function reset(autoTrain = true) {
  lineChart.reset();
  player.pause();
  state.numHiddenLayers = Math.min(nn.MAX_LAYERS,
      Math.max(1, state.numHiddenLayers));
  let q = Math.min(nn.MAX_QUBITS, Math.max(nn.MIN_QUBITS, qubits()));
  state.networkShape = d3.range(state.numHiddenLayers).map(() => q);
  state.serialize();
  let suffix = state.numHiddenLayers !== 1 ? "s" : "";
  d3.select("#layers-label").text("Layer" + suffix);
  d3.select("#num-layers").text(state.numHiddenLayers);

  iter = 0;
  epochPos = 0;
  show = null;
  progress.weightsLoaded = false;
  progress.trained = false;
  progress.searched = false;
  network = nn.buildNetwork({
    featureIds: scene.featureNames,
    qubits: qubits(),
    layers: state.numHiddenLayers,
    entangler: state.entangler,
    reupload: state.reupload,
    readout: state.readout,
    shots: state.shots,
  });
  search.clear();
  updateReadoutInfo();
  updateMetrics();
  drawNetwork(network);
  updateUI(true);
  if (autoTrain && guided()) {
    startShow();
  }
}

function hideControls() {
  let hiddenProps = state.getHiddenProps();
  hiddenProps.forEach(prop => {
    let controls = d3.selectAll(`.ui-${prop}`);
    if (controls.size() === 0) {
      console.warn(`0 html elements found with class .ui-${prop}`);
    }
    controls.style("display", "none");
  });

  let hideControls = d3.select(".hide-controls");
  HIDABLE_CONTROLS.forEach(([text, id]) => {
    let label = hideControls.append("label")
      .attr("class", "mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect");
    let input = label.append("input")
      .attr({
        type: "checkbox",
        class: "mdl-checkbox__input",
      });
    if (hiddenProps.indexOf(id) === -1) {
      input.attr("checked", "true");
    }
    input.on("change", function() {
      state.setHideProperty(id, !this.checked);
      state.serialize();
      d3.select(".hide-controls-link")
        .attr("href", window.location.href);
    });
    label.append("span")
      .attr("class", "mdl-checkbox__label label")
      .text(text);
  });
  d3.select(".hide-controls-link")
    .attr("href", window.location.href);
}

/** A fresh, seeded set of labelled patches, split into train and test. */
function generateData(firstTime = false) {
  if (!firstTime) {
    state.seed = Math.random().toFixed(5);
    state.serialize();
  }
  Math.seedrandom(state.seed);
  let data = makeDataset(scene, NUM_PATCHES, state.noise);
  shuffle(data);
  let splitIndex = Math.floor(data.length * state.percTrainData / 100);
  trainData = data.slice(0, splitIndex);
  testData = data.slice(splitIndex);
  // The demos' classical baseline on the very same patches.
  let logistic = nn.trainLogistic(trainData.map(p => p.features),
      trainData.map(p => p.label));
  baselineAcc = testData.filter(p => (logistic(p.features) >= 0.5 ? 1 : 0) ===
      p.label).length / Math.max(1, testData.length);
  drawSceneThumbnails();
  drawPatchStrip();
}

/** Test accuracy of logistic regression on the same 8 features. */
let baselineAcc = 0;

async function start() {
  d3.select("#readout-info").text("Loading the scenes…");
  for (let id in SCENES) {
    await SCENES[id].load();
  }
  if (!Number.isInteger(state.grid) || [4, 8].indexOf(state.grid) < 0) {
    state.grid = scene.defaultGrid;
  }
  if (state.seed == null) {
    state.seed = Math.random().toFixed(5);
  }
  makeGUI();
  d3.select("#grid-size").property("value", state.grid);
  Math.seedrandom(state.seed);
  placeScene(true);
  generateData(true);
  reset();
  hideControls();
  applyMode();
}

start().catch(err => {
  console.error(err);
  d3.select(".column.output").insert("div", ":first-child")
      .attr("class", "load-error")
      .text(`Could not start: ${err.message}. Run "npm run build" and ` +
          "serve dist/ over HTTP.");
});
