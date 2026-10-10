"""Same-feature logistic-regression baseline for BusPatch-QNN.

Run with the bundled Python: python model/classical_baseline.py
Requires only NumPy and Pillow, as does the QNN trainer. Imports the trainer's
actual generator and feature extractor; it never changes the trainer or model.
The final held-out seeds were reserved after exploratory crop-policy diagnostics.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import time
from pathlib import Path

import numpy as np

from train import FEATURE_NAMES, ROOT, SEED, dataset, metrics


SPLITS = {
    "train": {"n": 3200, "seed": SEED, "stress": False},
    "validation": {"n": 800, "seed": SEED + 1, "stress": False},
    "test": {"n": 2000, "seed": SEED + 102, "stress": False},
    "stress_test": {"n": 1200, "seed": SEED + 103, "stress": True},
}
REGULARIZATION_GRID = (1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1)
THRESHOLDS = np.arange(0.2, 0.86, 0.01)


def sigmoid(logits):
    # Stable on either side of zero without changing the logistic function.
    logits = np.asarray(logits, dtype=float)
    out = np.empty_like(logits)
    positive = logits >= 0
    out[positive] = 1 / (1 + np.exp(-logits[positive]))
    exponential = np.exp(logits[~positive])
    out[~positive] = exponential / (1 + exponential)
    return out


def objective(design, labels, parameters, regularization):
    logits = design @ parameters
    return float(np.mean(np.logaddexp(0, logits) - labels * logits)
                 + 0.5 * regularization * np.sum(parameters[:-1] ** 2))


def derivatives(design, labels, parameters, regularization):
    probabilities = sigmoid(design @ parameters)
    penalty = np.r_[np.full(design.shape[1] - 1, regularization), 0.0]
    gradient = design.T @ (probabilities - labels) / len(labels) + penalty * parameters
    variance = probabilities * (1 - probabilities)
    hessian = (design.T * variance) @ design / len(labels) + np.diag(penalty)
    return gradient, hessian


def fit(design, labels, regularization, max_iterations):
    parameters = np.zeros(design.shape[1])
    for iteration in range(max_iterations):
        gradient, hessian = derivatives(design, labels, parameters, regularization)
        if np.max(np.abs(gradient)) < 1e-9:
            break
        # Tiny numerical damping safeguards a singular empirical Hessian.
        direction = np.linalg.solve(hessian + 1e-12 * np.eye(len(parameters)), gradient)
        current_loss = objective(design, labels, parameters, regularization)
        descent = float(gradient @ direction)
        step_size = 1.0
        accepted = False
        while step_size > 1e-12:
            proposal = parameters - step_size * direction
            if objective(design, labels, proposal, regularization) <= current_loss - 1e-4 * step_size * descent:
                parameters = proposal
                accepted = True
                break
            step_size *= 0.5
        if not accepted:
            break
    final_gradient, _ = derivatives(design, labels, parameters, regularization)
    return parameters, {
        "iterations": iteration + 1,
        "training_regularized_objective": objective(design, labels, parameters, regularization),
        "gradient_max_abs": float(np.max(np.abs(final_gradient))),
    }


def verify_gradient():
    rng = np.random.default_rng(41217)
    design = np.c_[rng.normal(size=(31, 8)), np.ones(31)]
    labels = rng.integers(0, 2, 31)
    parameters = rng.normal(0, 0.3, 9)
    analytic, _ = derivatives(design, labels, parameters, 1e-3)
    epsilon = 1e-5
    numerical = []
    for index in range(len(parameters)):
        shift = np.zeros_like(parameters)
        shift[index] = epsilon
        numerical.append((objective(design, labels, parameters + shift, 1e-3)
                          - objective(design, labels, parameters - shift, 1e-3)) / (2 * epsilon))
    error = float(np.max(np.abs(analytic - np.array(numerical))))
    assert error < 1e-8, error
    return error


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-iterations", type=int, default=250)
    parser.add_argument("--qnn-model", type=Path,
                        default=ROOT / "dist" / "model" / "model-synthetic.json",
                        help="Saved QNN checkpoint used for the same-feature/split comparison")
    args = parser.parse_args()
    if args.max_iterations < 1:
        parser.error("--max-iterations must be positive")
    started = time.perf_counter()
    gradient_error = verify_gradient()
    trainer_path = Path(__file__).resolve().parent / "train.py"
    source_sha256 = hashlib.sha256(trainer_path.read_bytes()).hexdigest()
    qnn_path = args.qnn_model.resolve()
    qnn_model = json.loads(qnn_path.read_text(encoding="utf-8"))
    if qnn_model["featureNames"] != FEATURE_NAMES:
        raise RuntimeError("Baseline feature definitions do not match the saved QNN model")
    for name, config in SPLITS.items():
        if qnn_model.get("splitSeeds", {}).get(name) != config["seed"] or qnn_model["metrics"][name]["n"] != config["n"]:
            raise RuntimeError("Baseline split configuration differs from the saved QNN; settle identical frozen splits before comparing")
    data = {}
    for name, config in SPLITS.items():
        features, labels, _ = dataset(config["n"], config["seed"], config["stress"])
        data[name] = (features, labels)
    generation_seconds = time.perf_counter() - started
    mean = data["train"][0].mean(axis=0)
    scale = data["train"][0].std(axis=0)
    scale = np.where(scale > 1e-10, scale, 1.0)
    designs = {name: np.c_[(features - mean) / scale, np.ones(len(features))]
               for name, (features, _) in data.items()}
    trained_at = time.perf_counter()
    candidates = []
    for regularization in REGULARIZATION_GRID:
        parameters, optimization = fit(designs["train"], data["train"][1], regularization, args.max_iterations)
        validation_probabilities = sigmoid(designs["validation"] @ parameters)
        validation_bce = metrics(data["validation"][1], validation_probabilities)["bce"]
        candidates.append((validation_bce, regularization, parameters, optimization))
    best_validation_bce, regularization, parameters, optimization = min(candidates, key=lambda item: item[0])
    validation_probabilities = sigmoid(designs["validation"] @ parameters)
    threshold_scores = [metrics(data["validation"][1], validation_probabilities, threshold)
                        for threshold in THRESHOLDS]
    # The ascending threshold grid and first maximum match the QNN convention.
    threshold = max(threshold_scores, key=lambda item: item["f1"])["threshold"]
    training_seconds = time.perf_counter() - trained_at
    results = {name: metrics(labels, sigmoid(designs[name] @ parameters), threshold)
               for name, (_, labels) in data.items()}
    raw_weights = parameters[:-1] / scale
    raw_bias = float(parameters[-1] - raw_weights @ mean)
    raw_predictions = sigmoid(data["test"][0] @ raw_weights + raw_bias)
    standardized_predictions = sigmoid(designs["test"] @ parameters)
    raw_parity_error = float(np.max(np.abs(raw_predictions - standardized_predictions)))
    assert raw_parity_error < 1e-12, raw_parity_error
    report = {
        "version": 1,
        "name": "Same-feature logistic regression",
        "feature_names": FEATURE_NAMES,
        "parameter_count": 9,
        "training_domain": "same synthetic 64x64 engineered-feature vehicle patches as QNN; no photographs",
        "generator_source_sha256": source_sha256,
        "split_configuration": SPLITS,
        "preprocessing": "feature mean/std fit on training split only; reversible affine standardization",
        "optimization": "full-batch Newton method with line search; mean BCE + lambda/2 times squared standardized weights; bias unpenalized",
        "regularization": float(regularization),
        "regularization_selection": "minimum validation BCE; test and stress results not used",
        "regularization_candidates": [{"lambda": float(item[1]), "validation_bce": float(item[0]), **item[3]}
                                      for item in candidates],
        "threshold": float(threshold),
        "threshold_selection": "maximum validation F1 on same 0.20..0.85 step-0.01 grid as QNN; first maximum",
        "best_validation_bce": float(best_validation_bce),
        "optimization_result": optimization,
        "raw_feature_weights": raw_weights.tolist(),
        "raw_feature_bias": raw_bias,
        "training_feature_mean": mean.tolist(),
        "training_feature_std": scale.tolist(),
        "splits": results,
        "qnn_reference": {
            "name": qnn_model["name"],
            "qubits": qnn_model["qubits"],
            "layers": qnn_model["layers"],
            "parameter_count": qnn_model["parameterCount"],
            "model_sha256": hashlib.sha256(qnn_path.read_bytes()).hexdigest(),
            "model_path_relative_to_project": str(qnn_path.relative_to(ROOT)) if qnn_path.is_relative_to(ROOT) else str(qnn_path),
            "same_features_and_split_seeds_confirmed": True,
            "splits": qnn_model["metrics"],
        },
        "verification": {"loss_gradient_finite_difference_max_error": gradient_error,
                         "raw_vs_standardized_probability_max_error": raw_parity_error},
        "elapsed_seconds": {"data_generation": generation_seconds,
                            "fitting_and_validation_selection": training_seconds,
                            "total": time.perf_counter() - started},
        "interpretation": "A transparent baseline on identical features. This comparison measures model behavior within one synthetic family; no quantum superiority or practical speedup is established.",
    }
    if hashlib.sha256(trainer_path.read_bytes()).hexdigest() != source_sha256:
        raise RuntimeError("Trainer source changed during baseline evaluation; rerun after generator is frozen")
    output = ROOT / "model" / "baseline_metrics.json"
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"name": report["name"], "regularization": regularization,
                      "threshold": threshold, "splits": results,
                      "verification": report["verification"], "output": str(output)}, indent=2))


if __name__ == "__main__":
    main()
