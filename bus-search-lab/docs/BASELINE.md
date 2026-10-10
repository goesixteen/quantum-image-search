# Same-feature classical baseline

Completed October 10, 2026. Source: [classical_baseline.py](../model/classical_baseline.py). Full weights, split configuration, hyperparameter results, confusion matrices, and numerical checks: [baseline_metrics.json](../model/baseline_metrics.json).

## What is compared

The baseline is logistic regression on exactly the same eight engineered features used by the QNN. It imports `dataset` and `FEATURE_NAMES` from [train.py](../model/train.py), so the synthetic images, labels, and feature extraction follow the trainer's frozen generator. It has eight coefficients and one bias, for nine fitted prediction parameters. Features are standardized using only training-split mean and standard deviation; this is an invertible affine transformation, and the report also exports equivalent coefficients directly on the original features.

The baseline uses no quantum circuit. The QNN applies a nonlinear variational quantum feature transformation and a classical sigmoid readout. Comparing these models evaluates two model families on this synthetic task; it does not isolate a quantum advantage. A simple linear model is only one baseline, and stronger nonlinear classical baselines remain useful next experiments.

## Split and selection protocol

| Split | Patches | Seed | Role |
| --- | ---: | ---: | --- |
| Train | 3,200 | 20261010 | Fit coefficients and preprocessing |
| Validation | 800 | 20261011 | Select regularization and threshold |
| Held-out test | 2,000 | 20261112 | Final synthetic patch evaluation |
| Stress test | 1,200 | 20261113 | Final noisy/cropped synthetic evaluation |

The held-out and stress seeds were reserved after exploratory crop-policy diagnostics. Both models use these same final seeds. Different seeds test different rendered examples from the same generator; they do not establish recognition of unseen photographic schoolbus appearances.

The objective is mean binary cross-entropy plus \(\lambda\|w\|_2^2/2\), with an unpenalized bias. A full-batch Newton optimizer with backtracking line search fits six candidate regularization values: \(10^{-6},10^{-5},10^{-4},10^{-3},10^{-2},10^{-1}\). The minimum validation BCE selects **\(\lambda=0.001\)**. The same threshold grid used by the QNN, 0.20 through 0.85 in steps of 0.01, then selects the first maximum of validation F1: **threshold 0.52**. Neither final test split participates in selection.

## Measured baseline results

| Split | Accuracy | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: |
| Train | 95.6563% | 96.7370% | 94.5000% | 95.6054% |
| Validation | 96.2500% | 97.6804% | 94.7500% | 96.1929% |
| Held-out test | 95.1000% | 96.3992% | 93.7000% | 95.0304% |
| Stress test | 94.8333% | 96.2199% | 93.3333% | 94.7547% |

On the 2,000-patch test split, the baseline has 937 true positives, 965 true negatives, 35 false positives, and 63 false negatives. These are patch classification outcomes, not successful full-captcha localizations or Grover measurement outcomes.

The preserved [synthetic QNN checkpoint](../dist/model/model-synthetic.json) uses four qubits, four encoding/ansatz layers, and 40 fitted parameters, including its classical readout. Its checkpoint and threshold 0.28 are chosen only on validation. The saved model's feature names, split seeds, and sample counts are checked by the baseline script before evaluating the comparison. A later photo-composite model is evaluated separately and is not the QNN in this table.

| Final split | Model | Accuracy | Precision | Recall | F1 |
| --- | --- | ---: | ---: | ---: | ---: |
| Held-out, 2,000 patches | Logistic regression | 95.1000% | 96.3992% | 93.7000% | 95.0304% |
| Held-out, 2,000 patches | Hybrid QNN | 96.9500% | 96.3475% | 97.6000% | 96.9697% |
| Stress, 1,200 patches | Logistic regression | 94.8333% | 96.2199% | 93.3333% | 94.7547% |
| Stress, 1,200 patches | Hybrid QNN | 96.1667% | 96.9492% | 95.3333% | 96.1345% |

The QNN has higher accuracy/recall in these particular tests, while logistic-regression test precision is slightly higher. Different capacities, inductive biases, and optimization procedures contribute to this comparison. It establishes the measured behavior of these two implementations, not a general quantum-superiority result. The final QNN metrics and source are also documented in [RESEARCH.md](RESEARCH.md).

## Verification and reproduction

The code checks the analytic loss gradient against central finite differences, with a maximum absolute error of approximately \(1.41\times10^{-11}\). It also verifies that exported raw-feature coefficients reproduce standardized-feature predictions, with a maximum error of approximately \(4.44\times10^{-16}\). The report records SHA-256 hashes of the trainer source and referenced QNN model, exact split sizes/seeds, and the QNN metric snapshot. It rejects a comparison with mismatched features, seeds, or sample counts, and rejects a generator-source change during evaluation.

Run from the project directory with Python, NumPy, and Pillow available:

```powershell
python model/classical_baseline.py
```

The default reference is `dist/model/model-synthetic.json`. To choose it explicitly:

```powershell
python model/classical_baseline.py --qnn-model dist/model/model-synthetic.json
```

On this desktop, the bundled interpreter is available even though the plain `python` command points to the Windows app-install alias:

```powershell
& 'C:\Users\henri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' model/classical_baseline.py
```

The script regenerates the data deterministically, refits the baseline, and rewrites only `model/baseline_metrics.json`. It requires no downloads, GPU, SciPy, or scikit-learn. Timing fields can vary between runs; weights, selections, and metrics should reproduce within numerical tolerance with the same generator and NumPy behavior.

## Interpretation for the demo

Show the classical and QNN accuracy/F1 together with the synthetic domain and parameter counts. The baseline establishes that these engineered features already carry substantial task information. If the QNN is more accurate in this frozen experiment, describe the measured difference as specific to these models, training choices, and data. It does not imply that a quantum computer is needed, that the QNN beats all classical methods, or that the complete image pipeline runs faster.

Do not compare optimizer wall-clock times as a hardware advantage. Both models run classically, have different model capacity and optimization methods, and the Grover stage still has its separate oracle-build and simulation costs.
