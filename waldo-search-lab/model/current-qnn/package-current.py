"""Copy a validated frozen research checkpoint into the portable model package.

Never edits dist or changes a parameter/threshold. Root separately owns browser
QA and production promotion. Large feature matrices stay in scratch.
"""
import json,shutil
from pathlib import Path
import train_current_qnn as t

out=t.PROJECT/'model/current-qnn';out.mkdir(parents=True,exist_ok=True)
def copy(source,destination):
    if source.resolve()!=destination.resolve():shutil.copyfile(source,destination)
freeze=json.loads((t.OUT/'candidate-freeze.json').read_text())
assert all(t.sha(t.OUT/f)==h for f,h in freeze['files'].items())
assert all(t.sha(t.HERE/f)==h for f,h in freeze['sourceFiles'].items())
model=json.loads((t.OUT/'current-qnn.json').read_text())
baseline=json.loads((t.OUT/'current-logistic.json').read_text())
defaults=json.loads((t.OUT/'default-regression-front.json').read_text())
assert defaults['modelSHA256']==t.sha(t.OUT/'current-qnn.json')
assert all(r['correctPoints']>=1 and r['falsePoints']==0 if r['present'] else r['falsePoints']==0 for r in defaults['results']),'Default regression is not usable'
assert model['sceneValidation']['minimumCriticalScoreMargin']>=1e-12

sources=['protocol.json','build-corpus.mjs','train_current_qnn.py','default-regression.mjs','verify-training-objective.py','verify-trained-pixels.py','verify-trained-pixels.mjs','evaluate-mixed-diagnostic.py','evaluate-angle-controls.py','package-current.py','README.md','background-selection.json','background-selection.u16']
reports=['current-qnn.json','current-logistic.json','fixed-quantum-readout.json','candidate-freeze.json','usable-candidate-freeze.json','checkpoint-selection.json','quantum-contribution.json','feature-collisions.json','training-history.json','training-objective-verification.json','validation-threshold-frontier.json','validation-scene-results.json','default-regression.json','default-regression-front.json','trained-parity-fixtures.json','trained-pixel-fixtures.json','trained-parity-verification.json','mixed-validation-diagnostic.json','portable-replay-verification.json']
for name in sources:copy(t.HERE/name,out/name)
for name in reports:copy(t.OUT/name,out/name)
fixtures=out/'fixtures';fixtures.mkdir(exist_ok=True)
for file in (t.OUT/'fixtures').glob('*.png'):copy(file,fixtures/file.name)
summary={}
for split in ['train','validation','test']:
    m=json.loads((t.OUT/f'{split}-dataset.json').read_text())
    summary[split]={key:m[key] for key in ['split','seed','n','positives','negative','featuresSha256','labelsSha256','sourceHashes','target','scenes']}
    summary[split]['targetCompositeCount']=len(m['records'])
    summary[split]['targetRecordSHA256']=t.hashlib.sha256(json.dumps(m['records'],sort_keys=True).encode()).hexdigest()
    summary[split]['sourceManifestSHA256']=t.sha(t.OUT/f'{split}-dataset.json')
    summary[split]['visibilityRange']=[min(r['visibleFraction'] for r in m['records']),max(r['visibleFraction'] for r in m['records'])]
(out/'dataset-summary.json').write_text(json.dumps(summary,indent=2)+'\n')

test_path=t.OUT/'held-out-test-results.json';test=None
if test_path.exists():
    test=json.loads(test_path.read_text())
    assert test['frozenCandidateSHA256']==t.sha(t.OUT/'current-qnn.json')
    for name in ['held-out-test-results.json','heldout-feature-fixture.json','heldout-parity-verification.json','heldout-angle-controls.json']:
        if (t.OUT/name).exists():copy(t.OUT/name,out/name)
metrics=dict(scope='Same target artwork and three previously used scene identities; center-partition and seeded-rendering holdout. Fully visible primary targets, optional occlusion reported separately. No unseen-identity or quantum-advantage claim.',featureVersion=model['featureVersion'],fitRevision=model['fitRevision'],qnn=dict(windowMetrics=model['metrics'],sceneMetrics=dict(validation=model['sceneValidation'])),logistic=dict(windowMetrics=baseline['metrics'],sceneMetrics=dict(validation=baseline['sceneValidation'])),quantumContribution=json.loads((t.OUT/'quantum-contribution.json').read_text()),defaultRegression=defaults,freezeHashes=dict(candidate=t.sha(t.OUT/'current-qnn.json'),candidateFreeze=t.sha(t.OUT/'candidate-freeze.json')))
if test:
    for key in ['qnn','logistic']:
        metrics[key]['windowMetrics']['test']=test['results'][key]['windows']
        metrics[key]['sceneMetrics']['test']=test['results'][key]['sceneSummary']
    if (t.OUT/'heldout-angle-controls.json').exists():metrics['heldoutControls']=json.loads((t.OUT/'heldout-angle-controls.json').read_text())
(out/'current-qnn-metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')

failures=out/'rejected';failures.mkdir(exist_ok=True)
for revision in ['v1','v2','v2b','v3']:
    src=t.OUT/f'candidate-{revision}'
    if not src.exists():continue
    dst=failures/revision;dst.mkdir(exist_ok=True)
    for name in ['current-qnn.json','current-logistic.json','protocol.json','candidate-freeze.json','feature-collisions.json','quantum-contribution.json','training-history.json','checkpoint-selection.json','default-regression.json','default-regression-front.json','trained-parity-verification.json','train_current_qnn.py','build-corpus.mjs','v1-exact-threshold-check.json']:
        if (src/name).exists():copy(src/name,dst/name)
    frontier=src/'validation-threshold-frontier.json'
    if frontier.exists():
        original=json.loads(frontier.read_text());compact=dict(originalSHA256=t.sha(frontier),scope='Compact projection of preserved original development frontier; full original remains in work.',selection=original.get('selection'))
        for key in ['qnn','logistic']:
            compact[key]=[{k:r[k] for k in ['threshold','completeHits','targetScenes','targetEmptyOracles','targetFalsePointScenes','absenceFalsePointScenes','feasible'] if k in r} for r in original[key]]
        (dst/'validation-frontier-compact.json').write_text(json.dumps(compact,indent=2)+'\n')
    engine=t.OUT/f'{revision[:2]}-feature-engine'
    if revision in ['v1','v2','v2b'] and engine.exists():
        for name in ['qnn-localizer.js','qnn_localizer_features.py']:
            if (engine/name).exists():copy(engine/name,dst/name)
if (t.OUT/'candidate-v3-exact/checkpoint-selection.json').exists():copy(t.OUT/'candidate-v3-exact/checkpoint-selection.json',failures/'v3/first-exact-boundary-selection.json')
if (t.OUT/'candidate-v3/train_current_qnn.v3-optimization.py').exists():copy(t.OUT/'candidate-v3/train_current_qnn.v3-optimization.py',failures/'v3/train_current_qnn.optimization-source.py')
if (t.OUT/'v2b-training-feature-diagnostic.json').exists():copy(t.OUT/'v2b-training-feature-diagnostic.json',failures/'v2b-training-feature-diagnostic.json')
release=dict(scope='Portable local reproducibility package. Parameters/threshold preserved byte-for-byte; production readiness and browser QA are owned by root.',files={str(f.relative_to(out)).replace('\\','/'):t.sha(f) for f in out.rglob('*') if f.is_file() and f.name!='package-integrity.json'},externalSourceFiles={name:t.sha(t.PROJECT/name) for name in ['dist/qnn-localizer.js','dist/qnn.js','dist/scene-editor.js','model/qnn_core.py','model/qnn_localizer_features.py']})
(out/'package-integrity.json').write_text(json.dumps(release,indent=2)+'\n')
print(json.dumps(dict(package=str(out),modelSHA256=t.sha(out/'current-qnn.json'),testScored=bool(test),files=len(release['files']))))
