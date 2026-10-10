"""Record exact candidate/protocol freeze before fresh evaluation disclosure."""
import hashlib,json
from datetime import datetime,timezone
from train import ROOT,DIST


def main():
    names=['photo_features_v3.py','photo_features_v3.mjs','photo_v3_data.py','train_photo_v3.py','audit_photo_v3.py','verify_photo_v3.py','verify_photo_v3.mjs','analyze_photo_v3.py','freeze_photo_v3.py','photo-v3-protocol.json','photo-v3-qnn-candidate.json','photo-v3-logistic-candidate.json','photo-v3-metrics.json','photo-v3-analysis.json','photo-v3-parity-verification.json','photo-v3-verification.json']
    files={f'model/{name}':hashlib.sha256((ROOT/'model'/name).read_bytes()).hexdigest() for name in names}
    for path in [DIST/'qnn.js',DIST/'model/model-photo.json',DIST/'assets/real-schoolbus.png',DIST/'assets/street-captcha.png',ROOT/'model/training-assets/sauk-centre-street-512.png']:
        files[str(path.relative_to(ROOT))]=hashlib.sha256(path.read_bytes()).hexdigest()
    models={name:json.loads((ROOT/'model'/f'photo-v3-{name}-candidate.json').read_text()) for name in ['qnn','logistic']}
    report=dict(frozen_at_utc=datetime.now(timezone.utc).isoformat(),status='Feature/model/threshold/renderer/protocol freeze before fresh asset disclosure',files_sha256=files,thresholds={name:model['threshold'] for name,model in models.items()},readyForDemo=False,remaining_evaluation='Fresh street identities: normalized512 empty+128 seeded seen-cutout placements pergrid. Fresh bus identities: supplied coarsebbox fullphoto and knownROI thumbnail52px wide. Diagnostic Emeryville/Oines only after this freeze; neither changes candidates.',audit_seed=2026101130,ground_truth='any inserted alpha>32 pixel in tile; segmentation unavailable for independently photographed bus bboxes')
    (ROOT/'model/photo-v3-freeze.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))


if __name__=='__main__':main()
