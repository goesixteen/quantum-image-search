/* Quantum-state views for the QNN playground (new file, not from upstream).

Everything here shows the exact state of the classifier register for
one image patch, the "probe" region picked on the scene:
  - a Bloch sphere under every gate box (arrow length < 1 = entangled),
  - arcs between qubit pairs sized by their quantum mutual information,
  - the readout panel (measured observables -> classical sigmoid -> score),
  - a statevector panel (amplitudes by phase, plus a measurement histogram).
Kept out of playground.ts so that file stays close to upstream.
==============================================================================*/

import * as d3 from "d3";
import * as nn from "./qnn";

/** What the views need from the playground. */
export interface ViewContext {
  network(): nn.Node[][];
  /** Pixel features of a scene region (the circuit's input). */
  features(region: number): number[];
  /** Regions per side of the scene grid. */
  grid(): number;
  shots(): number;
  /** Id of the hovered gate box, if any. */
  selectedNodeId(): string;
  rectSize: number;
  initialProbe?: number;
  /** Called when the user moves the probe (to persist it in the URL). */
  onProbeMove?: (region: number) => void;
}

const BLOCH_R = 15;
/** Keeps the projected arrow inside the sphere outline. */
const PROJ = 0.9;
export const ENT_COLOR = "#7e3fb1";

/** Space reserved to the right of a gate column for its arcs. */
export function arcSpace(numQubits: number): number {
  return 6 + 5 * (numQubits - 1) + 6;
}

function ket(index: number, n: number): string {
  let bits = "";
  for (let q = n - 1; q >= 0; q--) {
    bits += (index >> q) & 1;
  }
  return `|${bits}⟩`;
}

export class QuantumViews {
  /** Scene region whose patch state is shown. */
  probe = 0;

  constructor(private ctx: ViewContext) {
    if (Number.isInteger(ctx.initialProbe) && ctx.initialProbe >= 0) {
      this.probe = ctx.initialProbe;
    }
  }

  /** Moves the probe to a region (clamped to the grid). */
  setProbe(region: number) {
    let n = this.ctx.grid() ** 2;
    this.probe = Math.max(0, Math.min(n - 1, region));
    this.update();
    if (this.ctx.onProbeMove) {
      this.ctx.onProbeMove(this.probe);
    }
  }

  /** Arrow keys on the scene move the probe one region. */
  moveProbe(key: string): boolean {
    let g = this.ctx.grid(), row = Math.floor(this.probe / g);
    let col = this.probe % g;
    let d = {ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0],
        ArrowDown: [1, 0]}[key];
    if (!d) {
      return false;
    }
    row = Math.max(0, Math.min(g - 1, row + d[0]));
    col = Math.max(0, Math.min(g - 1, col + d[1]));
    this.setProbe(row * g + col);
    return true;
  }

  regionLabel(region = this.probe): string {
    let g = this.ctx.grid();
    return `region ${region} (row ${Math.floor(region / g) + 1}, ` +
        `column ${region % g + 1})`;
  }

  /**
   * Bloch sphere under a gate box. Its arrow length already encodes how
   * entangled the qubit is (entropy is a function of it), so no extra meter.
   */
  drawBlochSphere(container, node: nn.Node, cx: number, cy: number) {
    let g = container.append("g").attr({class: "bloch",
        id: `bloch-${node.id}`,
        transform: `translate(${cx - 5},` +
            `${cy + this.ctx.rectSize / 2 + 5 + BLOCH_R})`});
    g.append("circle").attr({class: "sphere", r: BLOCH_R});
    g.append("ellipse").attr({class: "equator", rx: BLOCH_R,
        ry: BLOCH_R * 0.3});
    g.append("line").attr({class: "axis", x1: 0, y1: -BLOCH_R, x2: 0,
        y2: BLOCH_R});
    // Poles: |0> (Z = +1) up, |1> (Z = -1) down.
    g.append("text").attr({class: "pole", x: 3, y: -BLOCH_R + 8}).text("0");
    g.append("text").attr({class: "pole", x: 3, y: BLOCH_R - 2}).text("1");
    g.append("line").attr({class: "vector", x1: 0, y1: 0, x2: 0, y2: 0});
    g.append("circle").attr({class: "tip", r: 2});
    g.append("title");
  }

  /**
   * Arcs between every qubit pair at one point of the circuit; thickness is
   * their mutual information there. `key` is a layer number or "final".
   */
  drawEntanglementArcs(container, key: string, x0: number,
      numQubits: number, rowY: (q: number) => number) {
    let g = container.append("g").attr({class: "ent-arcs",
        id: `arcs-${key}`});
    for (let i = 0; i < numQubits; i++) {
      for (let j = i + 1; j < numQubits; j++) {
        let b = 6 + 5 * (j - i);
        let yi = rowY(i), yj = rowY(j);
        g.append("path").attr({id: `mi-${key}-${i}-${j}`,
            d: `M${x0},${yi}C${x0 + b * 1.33},${yi} ` +
               `${x0 + b * 1.33},${yj} ${x0},${yj}`})
          .style({stroke: ENT_COLOR, "stroke-width": 0, fill: "none"})
          .append("title");
      }
    }
  }

  /**
   * Fades gates that can never change the measured output (the engine finds
   * them numerically: their gradient is identically zero). Examples: q0's
   * last gate before a final CNOT ring, any RZ right before measurement, and
   * every qubit but q0 when there is no entangler.
   */
  markDeadGates(network: nn.Node[][]) {
    for (let l = 1; l < network.length - 1; l++) {
      network[l].forEach(node => {
        d3.select(`#node${node.id}`).classed("unreachable", node.dead);
        d3.select(`#canvas-${node.id}`).classed("unreachable", node.dead);
        d3.select(`#bloch-${node.id}`).classed("unreachable", node.dead);
        node.inputLinks.forEach(link => {
          d3.select(`#link${link.source.id}-${link.dest.id}`)
              .classed("unreachable", link.dead);
        });
      });
    }
  }

  /** Recomputes the probe state and refreshes every view. */
  update() {
    let network = this.ctx.network();
    if (network == null) {
      return;
    }
    if (this.probe >= this.ctx.grid() ** 2) {
      this.probe = 0;
    }
    let views = nn.probe(network, this.ctx.features(this.probe));
    for (let l = 1; l < network.length - 1; l++) {
      let view = views.layers[l - 1];
      network[l].forEach((node, q) => {
        let [bx, by, bz] = view.bloch[q];
        let len = Math.sqrt(bx * bx + by * by + bz * bz);
        // Oblique projection: X toward the viewer (down-left), Y right, Z up.
        let px = PROJ * BLOCH_R * (by - 0.35 * bx);
        let py = PROJ * BLOCH_R * (-bz + 0.3 * bx);
        let g = d3.select(`#bloch-${node.id}`);
        g.select(".vector").attr({x2: px, y2: py});
        g.select(".tip").attr({cx: px, cy: py});
        let s = view.single[q];
        g.select("title").text(`q${q} after layer ${l}: Bloch vector ` +
            `(${bx.toFixed(2)}, ${by.toFixed(2)}, ${bz.toFixed(2)}), ` +
            `|r| = ${len.toFixed(2)}; entanglement entropy ` +
            `${s.toFixed(2)} bit`);
      });
      if (l > 1) {
        this.updateArcs(String(l), view);
      }
    }
    this.updateArcs("final", views.final);

    let selectedId = this.ctx.selectedNodeId();
    let selected: nn.Node = null;
    network.slice(1, -1).forEach(layer => layer.forEach(n => {
      if (n.id === selectedId) {
        selected = n;
      }
    }));
    if (selected) {
      this.renderStatevector(views.layers[selected.layer - 1],
          `after the layer-${selected.layer} gates`, false);
    } else {
      this.renderStatevector(views.final, "just before measurement", true);
    }
    this.renderReadout(network, views.observables, views.score);
    let g = this.ctx.grid(), size = this.ctx.rectSize;
    d3.selectAll("#network div.canvas .probe-dot").style({
      left: `${(this.probe % g + .5) / g * size}px`,
      top: `${(Math.floor(this.probe / g) + .5) / g * size}px`,
    });
  }

  /** Builds the readout panel (the hybrid model's classical step). */
  initReadout(container) {
    let panel = container.append("div").attr("id", "readout-panel");
    panel.append("div").attr("class", "ro-title");
    panel.append("svg").attr({width: 290, height: 10, role: "img",
        "aria-label": "Measured observables and the readout"});
    panel.append("div").attr("class", "ro-score");
  }

  private renderReadout(network: nn.Node[][], obs: number[], score: number) {
    let ro = nn.getReadout(network);
    let project = ro.kind === "project";
    d3.select("#readout-panel .ro-title").html(project ?
        `<b>Readout</b> for ${this.regionLabel()}: measure all ` +
        `${network[1].length} qubits, estimate ${ro.labels.length} ` +
        "Z-string averages, then a <b>classical</b> sigmoid " +
        (ro.labels.length === 7 ? "(the demos' hybrid model)." :
            "(the demos' hybrid model uses 7 on 4 qubits).") :
        `<b>Readout</b> for ${this.regionLabel()}: measure qubit 0 only; ` +
        "the score is (1 + ⟨Z₀⟩) / 2, with no classical layer.");
    let rows = ro.labels.map((label, k) => ({label, v: obs[k],
        w: project ? ro.weights[k] : null}));
    let rowH = 15, svg = d3.select("#readout-panel svg")
        .attr("height", rows.length * rowH + 4);
    let sel = svg.selectAll("g.ro-row").data(rows);
    let enter = sel.enter().append("g").attr("class", "ro-row");
    enter.append("text").attr({class: "ro-label", x: 0, y: 11});
    enter.append("rect").attr({class: "ro-track", x: 62, y: 3, width: 120,
        height: 9});
    enter.append("rect").attr({class: "ro-bar", y: 3, height: 9});
    enter.append("text").attr({class: "ro-weight", x: 290, y: 11,
        "text-anchor": "end"});
    sel.exit().remove();
    sel.attr("transform", (d, k) => `translate(0,${k * rowH})`);
    sel.select(".ro-label").text(d => `⟨${d.label}⟩`);
    // Bar from the centre of the track: blue for +, orange for -.
    sel.select(".ro-bar").attr({x: d => 122 + Math.min(0, d.v) * 60,
        width: d => Math.abs(d.v) * 60})
      .style("fill", d => d.v >= 0 ? "#0877bd" : "#f59322");
    sel.select(".ro-weight").text(d => d.w == null ?
        `${d.v.toFixed(2)}` :
        `${d.v.toFixed(2)} × w ${d.w >= 0 ? "+" : "−"}` +
        `${Math.abs(d.w).toFixed(2)}`);
    d3.select("#readout-panel .ro-score").html(project ?
        `score = σ(b + Σ w·⟨O⟩) = σ(${ro.bias.toFixed(2)} + ` +
        `${rows.reduce((s, d) => s + d.w * d.v, 0).toFixed(2)}) = ` +
        `<b>${score.toFixed(3)}</b>` :
        `score = (1 + ${obs[0].toFixed(2)}) / 2 = <b>${score.toFixed(3)}</b>`);
  }

  private updateArcs(key: string, view: nn.StateView) {
    // Up to 15 pairs share ~40px at 6 qubits; with 5+ qubits only arcs of at
    // least 0.15 bits are drawn (every value is still in its tooltip).
    let floor = view.bloch.length >= 5 ? 0.15 : 0.01;
    view.pairs.forEach(({i, j, mutualInfo, negativity}) => {
      let mi = mutualInfo < floor ? 0 : mutualInfo;
      // Thickness: total correlation (mutual information). Solid only if
      // the pair is actually entangled (negativity > 0); dashed if the
      // correlation is classical, as for any two qubits of a GHZ state.
      let entangled = negativity > 1e-3;
      d3.select(`#mi-${key}-${i}-${j}`)
        .style({"stroke-width": mi === 0 ? 0 : 0.8 + 2.4 * mi,
            "stroke-opacity": Math.min(1, 0.3 + mi / 1.5),
            "stroke-dasharray": entangled ? null : "3 3"})
        .select("title").text(`q${i}–q${j}: mutual information ` +
            `${mutualInfo.toFixed(2)} bits; ` + (entangled ?
                `entangled (negativity ${negativity.toFixed(2)})` :
                "not entangled as a pair (negativity 0)"));
    });
  }

  /** Builds the statevector panel. */
  initStatevector(container) {
    let panel = container.append("div").attr("id", "statevector");
    panel.append("div").attr("class", "sv-title");
    let svg = panel.append("svg").attr({width: 290, height: 214,
        role: "img", "aria-label": "Statevector amplitudes and " +
            "measurement histogram for the probe region"});
    svg.append("text").attr({class: "sv-label", x: 0, y: 10})
        .text("Amplitudes: height |ψ|; dial = phase vs the largest");
    svg.append("g").attr({class: "dials", transform: "translate(0,24)"});
    svg.append("g").attr({class: "amps", transform: "translate(0,32)"});
    svg.append("g").attr({class: "kets", transform: "translate(0,82)"});
    svg.append("text").attr({class: "sv-label hist-label", x: 0, y: 132});
    svg.append("text").attr({class: "sv-label hist-scale", x: 290, y: 206,
        "text-anchor": "end"});
    svg.append("g").attr({class: "hist", transform: "translate(0,138)"});
    svg.append("text").attr({class: "sv-label z0", x: 0, y: 206});
  }

  private renderStatevector(view: nn.StateView, when: string,
      showMeasurement: boolean) {
    let n = view.bloch.length, dim = view.re.length;
    let bw = 260 / dim, gap = dim <= 16 ? 2 : dim <= 32 ? 1 : 0;
    let order = d3.range(n).map(q => `q${n - 1 - q}`).join("");
    d3.select("#statevector .sv-title").html(
        `<b>Classifier state</b> |ψ⟩ for ${this.regionLabel()}, ${when}. ` +
        `Basis states are written |${order}⟩, so q0 is the rightmost bit.`);
    // A global phase is unobservable, so rotate the state to make the
    // largest amplitude real and positive; colors then show relative phase.
    let big = 0;
    for (let i = 1; i < dim; i++) {
      if (Math.hypot(view.re[i], view.im[i]) >
          Math.hypot(view.re[big], view.im[big])) {
        big = i;
      }
    }
    let g = Math.atan2(view.im[big], view.re[big]);
    let c = Math.cos(g), s = Math.sin(g);
    let amps = d3.range(dim).map(i => {
      let re = view.re[i] * c + view.im[i] * s;
      let im = view.im[i] * c - view.re[i] * s;
      return {i, re, im, mag: Math.hypot(re, im)};
    });
    let bars = d3.select("#statevector g.amps").selectAll("rect")
        .data(amps);
    bars.enter().append("rect").append("title");
    bars.exit().remove();
    bars.attr({x: d => d.i * bw, width: Math.max(1, bw - gap),
        y: d => 44 - 44 * d.mag, height: d => 44 * d.mag})
      .style("fill", "#55626b")
      .select("title").text(d => `${ket(d.i, n)}: ψ = ${d.re.toFixed(3)} ` +
          `${d.im < 0 ? "−" : "+"} ${Math.abs(d.im).toFixed(3)}i ` +
          `(global phase removed), probability ` +
          `${(d.mag * d.mag).toFixed(3)}`);

    // Phase dials (a clock hand at the relative phase), when there is room.
    let r = Math.min(6, bw / 2 - 1);
    let dials = d3.select("#statevector g.dials").selectAll("g.phase-dial")
        .data(r >= 3 ? amps.filter(d => d.mag > 0.02) : [], d => String(d.i));
    let entered = dials.enter().append("g").attr("class", "phase-dial");
    entered.append("circle");
    entered.append("line");
    dials.exit().remove();
    dials.attr("transform", d => `translate(${d.i * bw + bw / 2},0)`);
    dials.select("circle").attr("r", r);
    dials.select("line").attr({x1: 0, y1: 0,
        x2: d => r * d.re / d.mag, y2: d => -r * d.im / d.mag});

    let labelEvery = dim <= 16 ? 1 : dim / 8;
    let kets = d3.select("#statevector g.kets").selectAll("text")
        .data(amps.filter(d => d.i % labelEvery === 0));
    kets.enter().append("text");
    kets.exit().remove();
    kets.attr({transform: d => `translate(${d.i * bw + bw / 2 + 3},0) ` +
        "rotate(-90)", "text-anchor": "end"})
      .text(d => ket(d.i, n));

    // Measuring every qubit: exact Born probabilities, or a sampled histogram.
    let probs = nn.probabilities(view.re, view.im);
    let shots = this.ctx.shots();
    let freq = shots > 0 ?
        Array.from(nn.sampleCounts(probs, shots)).map(k => k / shots) :
        Array.from(probs);
    let z0Only = nn.getReadout(this.ctx.network()).kind === "z0";
    d3.select("#statevector .hist-label").text(showMeasurement ?
        (shots > 0 ? `Measure all, ${shots} shots` : "Measure all, exact") +
        (z0Only ? " (blue q0=0, orange q0=1)" : "") :
        "Probabilities if measured here");
    // Scale so the tallest bar fills the plot; the label states the scale.
    let top = Math.max(0.1, d3.max(freq));
    d3.select("#statevector .hist-scale").text(`max ${top.toFixed(2)}`);
    let hist = d3.select("#statevector g.hist").selectAll("rect")
        .data(freq);
    hist.enter().append("rect").append("title");
    hist.exit().remove();
    hist.attr({x: (d, i) => i * bw, width: Math.max(1, bw - gap),
        y: d => 56 - 56 * d / top, height: d => 56 * d / top})
      // With the Z0 readout: blue where q0 reads 0 (Z = +1), orange for 1.
      .style("fill", (d, i) => !z0Only ? "#55626b" :
          (i & 1) ? "#f59322" : "#0877bd")
      .select("title").text((d, i) => `${ket(i, n)}: ${d.toFixed(3)}`);
    let p0 = 0, p1 = 0;
    freq.forEach((f, i) => { if (i & 1) { p1 += f; } else { p0 += f; } });
    d3.select("#statevector .z0").text(!showMeasurement ? "" : z0Only ?
        `⟨Z₀⟩ = P(q₀=0) − P(q₀=1) = ${p0.toFixed(2)} − ${p1.toFixed(2)} = ` +
        `${(p0 - p1).toFixed(2)}` :
        "Each shot yields all 7 readout values.");
  }
}
