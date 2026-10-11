/* Grover search over the scene's regions: the last step of the project's
pipeline. Two oracles:
  list      (the site's) every region is scored first, classically; the
            regions above the threshold are marked. Once that list exists the
            answer is already known, so this shows how amplification behaves,
            never a speed-up.
  coherent  the classifier runs inside the search, on a superposition of all
            region indices; its qubit 0 decides the phase flip and the
            classifier is then uncomputed (quantum/coherent.js). This is the
            setting where Grover could matter - and an uncertain classifier
            visibly degrades it.
Uses the Where's Wanda site's Grover simulator (waldo-search-lab/dist/
quantum.js) for the
list oracle. Ground truth is looked at only after measuring, as on the site.
==============================================================================*/

import * as d3 from "d3";
import {simulateGrover, recommendIterations, sample, bitstring}
    from "../../waldo-search-lab/dist/quantum.js";
import {coherentAmplification, recommendedRounds}
    from "./quantum/coherent.js";

/** What the coherent oracle needs from the classifier. */
export interface CoherentOracle {
  /** Why it cannot run (e.g. wrong readout), or null when it can. */
  unavailable: string | null;
  /** Ancilla dimension (2^qubits of the classifier). */
  D: number;
  /** Run (or, inverse, un-run) the classifier on region i's features. */
  applyBlock(i: number, re: Float64Array, im: Float64Array,
      inverse: boolean): void;
  /** Ancilla basis states the oracle flips (classifier says "target"). */
  accept(a: number): boolean;
  /** Each region's chance that the classifier says "target". */
  acceptance(): number[];
}

export interface SearchContext {
  /** Regions the list oracle marks (score >= threshold). */
  marked(): number[];
  regions(): number;
  /** Regions the target really overlaps; read only after a measurement. */
  truth(): Set<number>;
  /** The target, as used in sentences ("Wanda"). */
  target(): string;
  /** Show the measured region on the scene (null clears it). */
  showMeasured(region: number | null, verdict: string): void;
  /**
   * Show one round of a running search on the scene: every region's chance
   * of being measured (null clears it).
   */
  showRound?(probabilities: ArrayLike<number> | null, round: number,
      rounds: number): void;
  /** True in the guided (plain-language) view. */
  plain(): boolean;
  coherent(): CoherentOracle;
  /** Called after a search finishes (for the guided steps). */
  onSearched?(): void;
}

/** A term with a plain-language definition on hover. */
export const term = (word: string, meaning: string) =>
    `<span class="term" tabindex="0" title="${meaning}">${word}</span>`;

const GROVER_PLAIN = "A quantum search algorithm. When the check for 'is " +
    "this the one?' runs inside a quantum computer, it needs only about " +
    "the square root of N checks instead of N. Here every square was " +
    "already scored one by one, so this step shows how the search behaves, " +
    "not a speed-up.";

/**
 * Where Grover's advantage over classical search lies, stated for this run:
 * real when the check runs on quantum hardware, not realized here because
 * every square was scored first.
 */
const ADVANTAGE = (N: number, rounds: number) =>
    `<span class="advantage"><b>Quantum advantage:</b> Grover needs about ` +
    `√N checks instead of N, here ${rounds} rounds for ${N} squares, when ` +
    "the check itself runs on a quantum computer; this demo scores every " +
    "square first on a classical simulator, so it shows the speed-up rather " +
    "than achieving it.</span>";

type Oracle = "list" | "coherent";

export class SearchPanel {
  private rounds = 0;
  private manualRounds = false;
  private measured: number | null = null;
  /** Incremented to cancel a running search animation. */
  private runToken = 0;
  private running = false;
  oracle: Oracle = "list";

  constructor(private ctx: SearchContext) {}

  init(container) {
    let panel = container.append("div").attr("id", "search-panel");
    panel.append("div").attr("class", "search-title");
    let modes = panel.append("div").attr("class", "search-row oracle-row");
    modes.append("label").attr("for", "oracle-mode").text("Oracle");
    modes.append("select").attr("id", "oracle-mode")
      .on("change", () => {
        this.oracle = (d3.event as any).target.value;
        this.clear();
        this.refresh();
      })
      .html("<option value='list'>List: regions scored first (the site)" +
          "</option><option value='coherent'>Coherent: classifier inside " +
          "the search</option>");
    let row = panel.append("div").attr("class", "search-row");
    row.append("label").attr({for: "grover-rounds", class: "rounds-label"});
    row.append("input").attr({id: "grover-rounds", type: "range", min: 0,
        max: 12, step: 1})
      .on("input", () => {
        this.cancel();
        this.rounds = +(d3.event as any).target.value;
        this.manualRounds = true;
        this.measured = null;
        this.ctx.showMeasured(null, "");
        this.render();
      });
    row.append("span").attr("class", "rounds-value");
    panel.append("svg").attr({class: "grover-bars", width: 290, height: 64,
        role: "img", "aria-label": "Probability of measuring each region"});
    panel.append("div").attr("class", "search-stats");
    let buttons = panel.append("div").attr("class", "search-buttons");
    buttons.append("button").attr({id: "grover-run",
        class: "mdl-button mdl-js-button mdl-button--raised"})
      .text("Search").on("click", () => this.run());
    panel.append("div").attr("class", "search-result");
  }

  /** Re-derive the oracle from the current model (every UI update). */
  refresh() {
    if (!this.manualRounds) {
      this.rounds = this.bestRounds();
    }
    if (!this.running) {
      this.render();
    }
  }

  /** Forget a past measurement and stop any running search. */
  clear() {
    this.cancel();
    this.measured = null;
    this.manualRounds = false;
    this.ctx.showMeasured(null, "");
    d3.select("#search-panel .search-result").text("");
    d3.select("#search-banner").attr("class", null).html("");
  }

  /** Run a search (the guided steps' button uses this). */
  start() {
    this.run();
  }

  private cancel() {
    this.runToken++;
    this.running = false;
  }

  private bestRounds(): number {
    let N = this.ctx.regions();
    if (this.oracle === "coherent") {
      let c = this.ctx.coherent();
      if (c.unavailable) {
        return 0;
      }
      let acc = c.acceptance();
      return recommendedRounds(acc.reduce((s, v) => s + v, 0) / N);
    }
    let M = this.ctx.marked().length;
    return M > 0 && M < N ? recommendIterations(N, M) : 0;
  }

  /** Probabilities of each index after k rounds, for the current oracle. */
  private simulate(rounds: number): Float64Array[] | null {
    let N = this.ctx.regions();
    if (this.oracle === "coherent") {
      let c = this.ctx.coherent();
      if (c.unavailable) {
        return null;
      }
      return coherentAmplification({N, D: c.D, rounds,
          applyBlock: (i, re, im, inv) => c.applyBlock(i, re, im, inv),
          accept: a => c.accept(a)}).history.map(h => h.probabilities);
    }
    return simulateGrover(N, this.ctx.marked(), rounds).history
        .map(h => Float64Array.from(h.probabilities));
  }

  private render(iteration = this.rounds, history?: Float64Array[]) {
    let N = this.ctx.regions(), n = Math.log2(N), plain = this.ctx.plain();
    let marked = this.ctx.marked(), M = marked.length;
    let coherent = this.oracle === "coherent";
    let c = coherent ? this.ctx.coherent() : null;
    d3.select("#oracle-mode").property("value", this.oracle);
    d3.select("#search-panel .search-title").html(plain ?
        `<b>${term("Grover's search", GROVER_PLAIN)}</b> picks one of the ` +
        `${N} squares, favouring the ${M} marked square` +
        `${M === 1 ? "" : "s"}. The squares were already scored, so this ` +
        "shows how the search behaves, not a speed-up." :
        coherent ?
        `<b>Coherent Grover search</b> over ${N} regions: a ${n}-qubit ` +
        "index register plus the classifier's qubits. Each round runs the " +
        "classifier on every region at once (controlled by the index), " +
        "flips the phase where qubit 0 reads 0 (\"target\"), uncomputes " +
        "the classifier, then reflects about the start state." :
        `<b>Grover search</b> over ${N} regions: a separate ${n}-qubit ` +
        `register. The oracle flips the sign of the ${M} region` +
        `${M === 1 ? "" : "s"} scoring above the threshold. Every region ` +
        "was scored first, classically, so the answer is already known: " +
        "this shows how amplification behaves, not a speed-up.");
    d3.select("#search-panel .rounds-label").text(plain ? "Boost rounds" :
        "Rounds k");
    d3.select("#grover-rounds").property("value", this.rounds)
        .attr("max", Math.max(12, this.rounds + 3));
    let best = this.bestRounds();
    d3.select("#search-panel .rounds-value").text(`${iteration}` +
        (best > 0 ? ` (best: ${best})` : ""));
    if (coherent && c.unavailable) {
      d3.select("#search-panel svg.grover-bars").selectAll("rect").remove();
      d3.select("#search-panel .search-stats").html(c.unavailable);
      d3.select("#grover-run").property("disabled", true);
      return;
    }
    let probs = Array.from((history || this.simulate(iteration))[iteration]);
    let top = Math.max(...probs, 1e-9), bw = 290 / N;
    let markSet = new Set(coherent ? [] : marked);
    let bars = d3.select("#search-panel svg.grover-bars").selectAll("rect")
        .data(probs);
    bars.enter().append("rect").append("title");
    bars.exit().remove();
    bars.attr({x: (d, i) => i * bw, width: Math.max(1, bw - 1),
        y: d => 64 - 60 * d / top, height: d => 60 * d / top})
      .attr("class", (d, i) => (markSet.has(i) ? "marked" : "") +
          (i === this.measured ? " measured" : ""))
      .select("title").text((d, i) => `Region ${i} |${bitstring(i, n)}⟩: ` +
          `${(100 * d).toFixed(1)}%${markSet.has(i) ? " (marked)" : ""}`);
    if (coherent) {
      let acc = c.acceptance(), mass = acc.reduce((s, v) => s + v, 0) / N;
      let bestRegion = probs.indexOf(Math.max(...probs));
      let lost = 1 - probs.reduce((s, v) => s + v, 0);
      d3.select("#search-panel .search-stats").html(
          `Most likely after k = ${iteration}: region ${bestRegion} ` +
          `(<b>${(100 * probs[bestRegion]).toFixed(1)}%</b>). The ` +
          `classifier says "target" for ${(100 * mass).toFixed(1)}% of the ` +
          "start state; where it is unsure, its qubits stay entangled with " +
          "the index and amplification works less well than with a clean " +
          "list. A classifier that answers close to 0 or 1 everywhere would " +
          "make a clean oracle; one that classifies well only with a " +
          "threshold does not." +
          (lost > 1e-9 ? ` (${(100 * lost).toFixed(2)}% lost)` : ""));
      d3.select("#grover-run").property("disabled", false);
      return;
    }
    let chance = 0;
    marked.forEach(i => { chance += probs[i]; });
    let random = (100 * M / N).toFixed(1);
    d3.select("#search-panel .search-stats").html(M === 0 ?
        (plain ? "No square is marked, so there is nothing to search for. " +
            "Lower the threshold or train the circuit." :
            "No region is above the threshold, so the oracle marks nothing " +
            "and Grover cannot help: lower the threshold or train more.") :
        2 * M > N ? `<b>${M} of ${N} squares are marked</b>, so the search ` +
            "cannot beat guessing. " + (plain ? "The circuit is not picky " +
            "enough yet: train it, or raise the threshold." : "Grover " +
            "needs a small marked set: train more or raise the threshold.") :
        plain ? `Chance to land on a marked square: ` +
            `<b>${(100 * chance).toFixed(1)}%</b> (${random}% if you just ` +
            "guessed). Note: with the list already known, simply reading it " +
            "would be 100%." :
        `After k = ${iteration}: <b>${(100 * chance).toFixed(1)}%</b> ` +
        `chance to measure a marked region (vs ${random}% by picking at ` +
        "random; reading the list directly would be 100%).");
    d3.select("#grover-run").property("disabled", M === 0);
  }

  /** Animate the rounds, then measure once. */
  private async run() {
    let N = this.ctx.regions(), coherent = this.oracle === "coherent";
    // Everything the measurement depends on is fixed now, so a slider move
    // or retraining mid-animation cannot change (or crash) this run.
    let rounds = this.rounds, marked = this.ctx.marked();
    if (!coherent && !marked.length) {
      return;
    }
    let history = this.simulate(rounds);
    if (!history) {
      return;
    }
    this.cancel();
    let token = this.runToken;
    this.running = true;
    this.measured = null;
    this.ctx.showMeasured(null, "");
    let reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let banner = d3.select("#search-banner");
    let markedChance = (k: number) => coherent ? 0 :
        marked.reduce((t, i) => t + history[k][i], 0);
    let wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    for (let k = 0; k <= rounds && !reduced; k++) {
      this.render(k, history);
      if (this.ctx.showRound) {
        this.ctx.showRound(history[k], k, rounds);
      }
      banner.attr("class", "searching").html(coherent ?
          `<b>Searching…</b> round ${k} of ${rounds}.` :
          `<b>Searching…</b> round ${k} of ${rounds}: the ${marked.length} ` +
          `marked square${marked.length === 1 ? "" : "s"} now hold ` +
          `<b>${(100 * markedChance(k)).toFixed(1)}%</b> of the chance ` +
          `(${(100 * markedChance(0)).toFixed(2)}% at the start).`);
      // About 4 s in all: many rounds (64 x 64 addresses) step faster.
      await wait(Math.min(180, 4000 / Math.max(1, rounds)));
      if (token !== this.runToken) {
        return;
      }
    }
    if (!reduced) {
      banner.html("<b>Measuring…</b> the register collapses to one square.");
      await wait(600);
      if (token !== this.runToken) {
        return;
      }
    }
    this.running = false;
    let probs = history[rounds];
    // A coherent run can leave a little probability outside the index
    // register's accounting only by rounding; normalise before sampling.
    let total = probs.reduce((s, v) => s + v, 0);
    this.measured = sample(Array.from(probs, v => v / total));
    // Ground truth is consulted only now, after the measurement.
    let truth = this.ctx.truth();
    let isMarked = coherent || marked.indexOf(this.measured) >= 0;
    let hit = truth.has(this.measured);
    let targetMass = 0;
    truth.forEach(i => { targetMass += probs[i]; });
    let verdict = hit ? "found" : isMarked ? "false positive" : "miss";
    let what = this.ctx.target();
    d3.select("#search-panel .search-result").attr("class",
        `search-result ${hit ? "good" : "bad"}`).html(
        `Measured region ${this.measured} ` +
        `|${bitstring(this.measured, Math.log2(N))}⟩: ` + (hit ?
            `<b>found ${what}</b>.` : coherent ?
            `<b>not ${what}</b>.` : isMarked ?
            `a <b>false positive</b>: the QNN marked it, but ` +
            `${what} is not there. Grover amplifies the classifier's mistakes too.` :
            `an <b>unmarked</b> region; measurement is probabilistic.`) +
        ` True-target probability was ${(100 * targetMass).toFixed(1)}%. ` +
        ADVANTAGE(N, rounds));
    d3.select("#search-banner").attr("class", hit ? "good" : "bad").html(
        (hit ? `<b>✓ Found ${what}</b> in square ${this.measured}.` :
        isMarked && !coherent ? `<b>✗ Square ${this.measured} does not hold ` +
            `${what}.</b> The circuit marked it by mistake, and the ` +
            "search trusts the marks." :
        `<b>✗ Missed:</b> square ${this.measured} does not hold ${what}. ` +
            "Searches are random; try again.") + " " + ADVANTAGE(N, rounds));
    this.ctx.showMeasured(this.measured, verdict);
    this.render(rounds, history);
    if (this.ctx.onSearched) {
      this.ctx.onSearched();
    }
  }
}
