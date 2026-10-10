"""Lightweight frozen v3 verification and training-asset illumination probe.

No evaluation photographs, fitting, or production model writes.
"""
from __future__ import annotations
import hashlib,json
import numpy as np
from PIL import Image,ImageDraw
from train import ROOT,DIST,circuit,sigmoid
from photo_features import extract_photo_features
from photo_features_v3 import extract_photo_features_v3
from photo_v3_data import illuminate


def main():
    model_path=ROOT/'model/photo-v3-qnn-candidate.json';original=model_path.read_bytes();model=json.loads(original)
    fixtures=json.loads((ROOT/'model/photo-v3-parity-fixtures.json').read_text());feature_error=0.;prob_error=0.
    for item in fixtures:
        image=Image.fromarray(np.array(item['rgba'],dtype=np.uint8).reshape(item['height'],item['width'],4),'RGBA');f=extract_photo_features_v3(image)
        feature_error=max(feature_error,float(np.max(abs(f-item['features']))));p=float(sigmoid(circuit(f[None,:],np.array(model['theta']))@model['readout']+model['bias'])[0]);prob_error=max(prob_error,abs(p-item['qnn_probability']))
    assert feature_error<1e-12 and prob_error<1e-12
    # Exact floating-pixel uniform-gain invariance in a non-clipped warm-body
    # geometry, safely above the declared max-channel32 sensor-noise floor.
    image=Image.new('RGB',(64,64),(190,205,210));d=ImageDraw.Draw(image);d.rectangle((7,17,56,40),fill=(220,170,45))
    for x in [12,21,30,39,48]:d.rectangle((x,20,x+5,29),fill=(28,33,40))
    for x in [18,48]:d.ellipse((x-4,37,x+4,45),fill=(22,25,28))
    rgb=np.asarray(image,dtype=float);baseline=extract_photo_features_v3(rgb)
    invariant_error=max(float(np.max(abs(extract_photo_features_v3(rgb*gain)-baseline))) for gain in [.5,.75,1.])
    assert invariant_error<1e-12
    bus=Image.open(DIST/'assets/real-schoolbus.png').convert('RGBA');sprite=bus.resize((52,22),Image.Resampling.LANCZOS)
    patch=Image.new('RGB',(64,64),(215,225,232));patch.paste(sprite,(6,21),sprite);probe=[]
    for gain in [1.,.8,.6,.4]:
        image=illuminate(patch,gain,1.,[1,1,1]);v2=extract_photo_features(image);v3=extract_photo_features_v3(image)
        probe.append(dict(gain=gain,v2_features=v2.tolist(),v3_features=v3.tolist(),v2_nonzero_features=int(np.count_nonzero(v2)),v3_nonzero_features=int(np.count_nonzero(v3))))
    report=dict(checks_passed=3,fixture_count=len(fixtures),feature_max_error=feature_error,qnn_prediction_max_error=prob_error,unclipped_float_uniform_gain_feature_max_error=invariant_error,training_asset_illumination_probe=probe,limits='Exact uniform-scale check concerns floating RGB with no clipping and all warm pixels above32. Quantization, gamma, white balance, saturation/clipping, and dark floor can change features. No broad illumination-invariance claim.',model_sha256=hashlib.sha256(original).hexdigest())
    assert model_path.read_bytes()==original
    (ROOT/'model/photo-v3-verification.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))


if __name__=='__main__':main()
