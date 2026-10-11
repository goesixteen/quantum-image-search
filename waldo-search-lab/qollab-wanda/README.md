# Quantum Vision: Where's Wanda?

**A trained quantum neural network decides where Wanda might be, and Grover's
algorithm amplifies those places before a single measurement picks one.**
Built with Qiskit; runs on Qollab's free simulators, local and IonQ.

This README is the source for the project's Qollab.xyz page. It covers what
the project does, the problem it explores, how to run, replicate and extend
it, and what was built during the hackathon.

---

## The problem

"Where's Wanda?" is a search problem. A classical computer checks the regions
of a crowded picture one by one, so it needs on the order of **N** checks for
**N** regions. Grover's algorithm needs only about **√N** queries, but only if
something can tell it which regions to "mark". In real images, nobody hands
you that marking rule: it has to be **learned**.

This project explores that gap. It asks: *can a quantum classifier learn the
marking rule, and how does its output plug into an actual Grover circuit?* It
also states exactly where the quantum advantage would and would not come from
in a pipeline like this.

## What it does

```text
 image windows ──► 8 features ──► QNN (4 qubits) ──► score ──► score ≥ threshold?
                                                                      │
                     measured counts ◄── Grover search (4 qubits) ◄── marked rows
```

1. **Features.** Each image window is described by eight numbers in [0, 1]:
   red/white stripe strength and phase, sweater colour balance, face and hair,
   blue trousers, body alignment, and the supplied character height. They are
   computed classically from the pixels and saved in `scene.json`.
2. **Quantum neural network (classifier).** A 4-qubit, 4-layer variational
   circuit. Every layer re-uploads the features as `RY(πx₀..₃)` / `RZ(πx₄..₇)`,
   applies trained `RY`/`RZ` rotations and entangles the qubits with a CNOT ring
   `0→1→2→3→0`. Seven Pauli-Z expectation values (`Z0, Z1, Z2, Z3, Z0Z1, Z2Z3,
   Z0Z1Z2Z3`) go through a trained linear readout and a sigmoid to give a score.
3. **Marking.** Every window scoring at or above the frozen threshold
   (0.9056) is marked.
4. **Grover search.** A second 4-qubit register indexes the 16 windows. A
   phase oracle flips the sign of each marked address, and a diffuser reflects
   about the average. After the recommended number of rounds (here 1, because
   4 of 16 rows are marked), nearly all probability sits on the marked rows.
5. **Measurement.** Exactly **one** measured circuit is submitted to the
   backend you picked, and the counts are printed per row.

### Sample output (local simulator, 2048 shots)

```text
Scores (threshold 0.9056):
  row  score    marked  label
    0  0.9896   yes     Wanda
    1  0.9962   yes     Wanda
    2  0.0054   no      -
  ...
Measured counts by row (# = 2% of shots):
  row  0    512  ############  <- marked
  row  1    506  ############  <- marked
  row  2      0
  ...
Ideal chance of measuring a marked row: 1.000; observed: 1.000
```

The program also prints the QNN and Grover circuits as text diagrams, followed
by a full JSON report with every score, the ideal distribution, the raw
counts, the transpiled depth and the gate counts.

## How to run it

### On Qollab.xyz (no installation)

1. Open the project and press **Run**.
2. In **Select QPU**, choose any free simulator: the built-in local
   simulator, the AWS Braket local simulator, an IBM noise model, or **IonQ's
   simulator**.
3. Optional **Run settings**:
   - **Shots** (default 2048): how many times the Grover circuit is measured.
   - **Iterations** (default -1): Grover rounds. Use -1 for the recommended
     count, or 0, 1, 2 and so on to watch the amplitudes under- or overshoot.
4. Read the console output.

How the program fits Qollab's runtime:
- Qollab injects a `backend` global for the device you selected and calls
  `main()` automatically, so the script never hard-codes a backend.
- Every run submits a single job, which is what IonQ's simulators and
  hardware require.
- The circuit uses 4 qubits, far below every simulator's limit. It transpiles
  for IonQ's simulator at depth 13, using native `mcx` gates.
- Only Qiskit and NumPy are needed, and both are preinstalled on Qollab.

### Locally

```sh
python -m pip install -r requirements.txt   # qiskit>=2.5.2,<3, numpy>=2
python main.py                              # recommended Grover rounds, 2048 shots
python main.py --shots 4096 --iterations 0  # no amplification: see the uniform baseline
python main.py --iterations 3               # overshoot: amplification rotates past the peak
```

Locally, the program uses Qiskit's `BasicSimulator`. No account, API key or
network access is needed.

## Replicate and verify

```sh
python -m unittest test_qiskit.py -v   # 12 tests
python validate_local.py               # tests + seeded 4,096-shot run → local-validation.json
```

The tests check that:

- **The model is genuine.** `model.json` and the fixtures match their recorded
  SHA-256 hashes (`package-manifest.json`). The Qiskit QNN reproduces
  expectation values and scores from an independent NumPy implementation to
  about 1e-15.
- **The Grover mathematics is exact.** The oracle and diffuser equal their
  textbook matrices. The full output distribution matches the analytic formula
  `sin²((2k+1)θ)` for 0, 1, the recommended and 8 rounds, including the cases
  with nothing marked and everything marked.
- **Reporting is honest.** Ground-truth labels never change scores, marks or
  samples, and samples on unmarked rows are always reported, never filtered
  out. Each run submits exactly one job containing one circuit.
- **Qollab rules are followed.** Loading the file with an injected `backend`
  runs nothing until `main()` is called, and `main()`'s signature meets the
  Run-settings rules.

Latest local result: 12 of 12 tests passed with Qiskit 2.5.2 and NumPy 2.5.4.
Readout error versus NumPy was 7.8e-16, score error 2.2e-16, and Grover
distribution error versus the analytic curve 1.4e-15. The frozen threshold
marks rows `[0, 1, 9, 10]`, which are exactly the four true Wanda rows. One
round puts ideal probability 1.000 on them. See `local-validation.json`.

`prepare_package.py` rebuilds `scene.json` from the frozen files. It does no
training, row picking or threshold tuning. The training code, the full
4,096-window image scan and the classical baselines are in the parent
repository under `waldo-search-lab/model/`.

## Results, honestly

- **The marking rule is learned.** The QNN's 28 effective circuit angles were
  trained, and the marked rows here come from its scores. The ground truth is
  used only after sampling, to grade the result.
- **Where the quantum speed-up would come from.** Grover needs about √N oracle
  calls instead of N checks. In this program, though, every window is scored
  first and the oracle is *compiled* from those classical decisions, so the
  end-to-end run has **no speed-up**. A real speed-up would need the classifier
  itself inside the oracle as a coherent circuit. That is the natural next step
  (see below).
- **Scope.** The 16 rows are the first 16 reserved test windows, taken in fixed
  order from several scenes. The Grover addresses therefore index a feature
  table, not regions of one picture. The interactive website runs the full
  64 × 64-region (12-qubit) search over a single scene.
- **Classical comparison.** A matched logistic-regression baseline performs
  about as well on this data (historically 298/300 for the QNN versus 299/300
  for the baseline). The project claims no machine-learning advantage.
- **The score is not a calibrated probability** that a real person is present.
- **Parameter slots.** The model exports 40 slots: 32 circuit angles, 7 readout
  weights and 1 bias. The final `RZ` on each qubit (slots 25, 27, 29 and 31)
  cannot affect a Z readout. A test proves this.

## Extend it

- **Your own scene.** Replace `scene.json` with your own 8-feature rows. The
  row count must be a power of two, and features must be in [0, 1]. Use
  `../model/wanda_features.py` to compute features from any RGB image.
- **More regions.** With 64 rows the search register has 6 qubits.
  `recommend_iterations` picks the right number of rounds.
- **Coherent oracle.** Replace `phase_oracle` with the QNN circuit itself plus
  a threshold comparison and uncomputation. This is the path to a genuine
  Grover speed-up.
- **Noise study.** Run on an IBM noise model in Qollab and compare
  `observedPredicateFraction` with `idealPredicateMass`.

## Companion interactive website

The parent repository (`waldo-search-lab/`) contains the interactive
**Quantum Vision: Where's Wanda?** page. Visitors place Wanda in a crowd, watch
the QNN score every region and see the Grover search animate round by round.
It also includes a **QNN Playground**, modelled on the TensorFlow Neural
Network Playground, for training the classifier live. The page is static HTML
and JavaScript that runs `node serve.mjs`. It simulates the same circuit with the same frozen weights classically in
the browser.
Its accessibility support (keyboard operation, screen-reader labels,
reduced motion and contrast) is documented in
`waldo-search-lab/docs/ACCESSIBILITY.md`.

## Built during the hackathon, and what came before

All project code, models, artwork and evidence were created during the
hackathon window (commits from 2026-10-10 onward). Outside material used:

| What | How it is used | License |
|---|---|---|
| [Qiskit](https://github.com/Qiskit/qiskit) | circuits, simulation and transpilation | Apache-2.0 (dependency) |
| NumPy | numerical arrays | BSD-3-Clause (dependency) |
| [TensorFlow Neural Network Playground](https://github.com/tensorflow/playground), commit `02469bd` | **website only**: the QNN Playground forks its layout. Its upstream files keep Apache-2.0, and the project's own additions are MIT. See `qnn-playground/NOTICE`. | Apache-2.0 |
| d3 v3, Material Design Lite, seedrandom | **website only**: playground UI libraries | BSD-3 / Apache-2.0 / MIT |
| AI-generated artwork | Wanda and crowd scenes, created for this project; prompts in `generation-prompts.json` | see `artwork-provenance.json` |

This Qiskit package depends only on Qiskit and NumPy, and contains no
third-party code.

## Files

| File | Purpose |
|---|---|
| `main.py` | the program: QNN, oracle, Grover search and Qollab entry point `main()` |
| `model.json` | frozen trained weights and threshold |
| `scene.json` | the 16 feature rows plus labels (labels are used only for grading) |
| `requirements.txt` | `qiskit`, `numpy` |
| `test_qiskit.py`, `validate_local.py` | tests and the evidence generator |
| `local-validation.json`, `package-manifest.json` | saved evidence and checksums |
| `prepare_package.py`, `held-out-trace-fixtures.json`, `fixtures/` | rebuild inputs and source images |
| `artwork-provenance.json`, `generation-prompts.json` | artwork disclosure |

To publish on Qollab, drag this folder (or a zip of it) onto the **New
Project** card. Qollab removes the single wrapping folder, so `main.py` lands
at the top level and makes this a Python project. This `README.md` becomes the
project write-up. The folder holds 19 files, all under 2 MB (the limits are 100
files and 2 MB per file). In the Project Card, add the tags `qiskit`, `ionq`
and `grover`, and link the Git repository and the companion website.

## License

The project's code is released under the MIT License (see `LICENSE`). The
artwork is original AI-generated material whose provenance is recorded in
`artwork-provenance.json`. No public-domain or Creative Commons status is
claimed for it.
