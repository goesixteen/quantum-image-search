import numpy as np

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


