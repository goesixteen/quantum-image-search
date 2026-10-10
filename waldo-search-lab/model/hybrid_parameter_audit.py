"""Read-only influence check for frozen bus and crowd hybrid parameter slots.

Final learned RZ gates alter phases before a CNOT basis permutation and Z-only
observables. They cannot affect the current predictions. This is not a proof
that the remaining parameter slots are independent degrees of freedom.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent


def load_source(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def audit(model_path, source_path, module_name):
    before = sha(model_path)
    model = json.loads(model_path.read_text())
    core = load_source(source_path, module_name)
    features = np.random.default_rng(362614).uniform(0, 1, (128, 8))
    theta, readout = np.asarray(model['theta']), np.asarray(model['readout'])
    values, jac = core.circuit(features, theta, True)
    slots = list(range(len(theta) - 7, len(theta), 2))
    active = [i for i in range(len(theta)) if i not in slots]
    logits = values @ readout + model['bias']
    prediction = core.sigmoid(logits)
    logit_jac = np.einsum('npk,k->np', jac, readout)
    prediction_jac = logit_jac * (prediction * (1 - prediction))[:, None]
    varied = theta.copy()
    varied[slots] += [1.37, -4.21, 2.65, 5.98]
    alternative_values = core.circuit(features, varied)
    alternative_prediction = core.sigmoid(alternative_values @ readout + model['bias'])
    maximum = float(np.max(abs(alternative_prediction - prediction)))
    inactive = float(np.max(abs(prediction_jac[:, slots])))
    assert maximum < 1e-12 and inactive < 1e-12
    assert sha(model_path) == before
    return dict(model=model['name'], model_path=str(model_path.relative_to(ROOT.parent)), model_sha256=before,
                source_path=str(source_path.relative_to(ROOT.parent)), source_sha256=sha(source_path),
                parameter_slots=model['parameterCount'], angle_slots=len(theta), readout_weights=len(readout), biases=1,
                prediction_insensitive_angle_slots=slots,
                remaining_prediction_influencing_slots_observed=model['parameterCount'] - len(slots),
                probes=len(features), probe_seed=362614,
                checks=dict(final_rz_all_observable_derivative_max=float(np.max(abs(jac[:, slots]))),
                            final_rz_prediction_derivative_max=inactive,
                            finite_joint_final_rz_perturbation_observable_max_error=float(np.max(abs(alternative_values - values))),
                            finite_joint_final_rz_perturbation_prediction_max_error=maximum,
                            smallest_active_angle_max_probe_derivative=float(np.min(np.max(abs(prediction_jac[:, active]), axis=0)))),
                mechanism='Final learned RZ phases leave basis probabilities unchanged; the final CNOT ring only permutes basis amplitudes. All seven readouts are Z-products, hence depend only on those probabilities.',
                interpretation='40 nominal parameter slots, including four prediction-insensitive final RZ angles; 36 remaining slots. Nonzero responses on probes do not prove independence, identifiability, or a 36-dimensional function family.')


def main():
    bus = ROOT.parent / 'bus-search-lab'
    cases = [('bus_illustrated', bus / 'dist/model/model-synthetic.json', bus / 'model/train.py'),
             ('bus_photo', bus / 'dist/model/model-photo.json', bus / 'model/train.py'),
             ('crowd', ROOT / 'dist/model/model.json', ROOT / 'model/qnn_core.py')]
    output = {name: audit(model, source, name + '_audit_reference') for name, model, source in cases}
    report = dict(verification='PASS', cases=output, mutation=False,
                  scope='Read-only numerical checks and basis-probability argument for the actual current hybrid circuits; no hardware/generalization claim.')
    (ROOT / 'model/hybrid-parameter-audit.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({name: dict(slots=case['parameter_slots'], inactive=case['prediction_insensitive_angle_slots'],
                               remaining_slots=case['remaining_prediction_influencing_slots_observed'], checks=case['checks']) for name, case in output.items()}, indent=2))


if __name__ == '__main__':
    main()
