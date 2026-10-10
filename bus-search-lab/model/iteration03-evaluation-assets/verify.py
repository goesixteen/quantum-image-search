"""Check asset integrity and the recorded experiment freeze without model imports.

--release-primary records disclosure authorization only after every integrity
check passes. It never opens holdbacks to fitting or changes detector files.
"""
from pathlib import Path
from PIL import Image
import argparse
import datetime
import hashlib
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent.parent


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pixels(image):
    return hashlib.sha256(image.convert("RGB").tobytes()).hexdigest()


def verify(release_primary=False):
    manifest_path = ROOT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf8"))
    freeze_path = PROJECT / "model" / "photo-v3-freeze.json"
    freeze = json.loads(freeze_path.read_text(encoding="utf8"))
    checked_files = []
    for relative, expected in freeze["files_sha256"].items():
        path = PROJECT / Path(relative)
        assert sha256(path) == expected, f"Frozen experiment file changed: {relative}"
        checked_files.append(relative)
    assert freeze["readyForDemo"] is False
    assert freeze["thresholds"] == {"qnn": 0.95, "logistic": 0.94}
    records = []
    for asset in manifest["assets"]:
        source = ROOT / asset["original"]
        assert sha256(source) == asset["sha256"], source
        assert source.stat().st_size == asset["bytes"], source
        if asset.get("expectedSha1"):
            assert hashlib.sha1(source.read_bytes()).hexdigest() == asset["expectedSha1"]
        with Image.open(source) as original:
            original.seek(asset["evaluationFrame"])
            assert list(original.size) == asset["dimensions"]
            assert getattr(original, "n_frames", 1) == asset["frameCount"]
            if asset["kind"] == "street":
                normalization = asset["normalization"]
                prepared_path = ROOT / asset["normalized"]
                assert sha256(prepared_path) == normalization["sha256"]
                x, y, width, height = normalization["cropXYWH"]
                reconstructed = original.convert("RGB").crop((x, y, x + width, y + height))
                reconstructed = reconstructed.resize(tuple(normalization["size"]), Image.Resampling.LANCZOS)
                with Image.open(prepared_path) as prepared:
                    assert list(prepared.size) == [512, 512]
                    assert prepared.convert("RGB").tobytes() == reconstructed.tobytes()
                    assert pixels(prepared) == normalization["decodedPixelSha256"]
            else:
                roi = asset["roi"]
                roi_path = ROOT / roi["path"]
                assert sha256(roi_path) == roi["sha256"]
                left, top, right, bottom = roi["boxXYXY"]
                assert 0 <= left < right <= original.width
                assert 0 <= top < bottom <= original.height
                with Image.open(roi_path) as crop:
                    assert list(crop.size) == roi["dimensions"]
                    assert crop.convert("RGB").tobytes() == original.convert("RGB").crop(tuple(roi["boxXYXY"])).tobytes()
                    assert pixels(crop) == roi["decodedPixelSha256"]
                svg = ET.parse(ROOT / roi["evidence"]).getroot()
                assert svg.tag.endswith("svg")
                ns = "{http://www.w3.org/2000/svg}"
                rectangle = svg.find(ns + "rect")
                background = svg.find(ns + "image")
                assert rectangle is not None and background is not None
                assert background.attrib["href"] == asset["original"]
                expected_rectangle = [left, top, right - left, bottom - top]
                assert [int(rectangle.attrib[name]) for name in ("x", "y", "width", "height")] == expected_rectangle
        records.append({"id": asset["id"], "originalSha256": asset["sha256"], "pixelsReproduced": True})
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    if release_primary:
        assert manifest["futureHoldbackIds"] == ["street-c", "bus-c"]
        assert manifest["primaryIds"] == ["street-a", "street-b", "bus-a", "bus-b"]
        manifest["status"] = "primary-released-for-frozen-evaluation-future-holdback-locked"
        manifest["modelCandidateFreeze"] = {
            "path": "model/photo-v3-freeze.json",
            "sha256": sha256(freeze_path),
            "frozenAtUtc": freeze["frozen_at_utc"],
            "filesSha256": freeze["files_sha256"],
            "thresholds": freeze["thresholds"],
            "auditSeed": freeze["audit_seed"],
            "readyForDemo": freeze["readyForDemo"],
        }
        previous_release = manifest.get("releaseRecord") or {}
        manifest["releaseRecord"] = {
            "recordWrittenAtUtc": previous_release.get("recordWrittenAtUtc", previous_release.get("releasedAtUtc", now)),
            "initialDisclosureAtUtcExact": None,
            "initialDisclosureOrdering": "Freeze and all-file hash verification preceded the primary disclosure message; that message preceded the audit command reported by train_qnn as 09:19 UTC. Exact message seconds were not retained.",
            "afterFreezeVerified": True,
            "beforeFreshScoring": True,
            "ids": manifest["primaryIds"],
            "recipient": "train_qnn research agent",
            "purpose": "locked evaluation only; no fitting, model selection or threshold adjustment",
            "futureHoldbackIdsUnreleased": manifest["futureHoldbackIds"],
            "frozenFileHashesVerifiedBeforeRelease": True,
        }
        for asset in manifest["assets"]:
            asset["modelDevelopmentAccess"] = (
                "released for frozen evaluation only; fitting prohibited"
                if asset["id"] in manifest["primaryIds"] else
                "unreleased future holdback; do not open until a separately recorded later freeze"
            )
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")
        primary_release = {
            "status": manifest["status"],
            "modelCandidateFreeze": manifest["modelCandidateFreeze"],
            "releaseRecord": manifest["releaseRecord"],
            "assets": [asset for asset in manifest["assets"] if asset["id"] in manifest["primaryIds"]],
            "holdbackInstruction": "Only this primary inventory may be opened by model-development agents this iteration; c-labelled files and full manifest remain steward-only.",
        }
        (ROOT / "primary-release.json").write_text(json.dumps(primary_release, indent=2) + "\n", encoding="utf8")
    report = {
        "verifiedAtUtc": now,
        "passed": True,
        "modelImportsOrPredictions": False,
        "assets": records,
        "freezeFileSha256": sha256(freeze_path),
        "frozenExperimentFilesChecked": checked_files,
        "manifestStatus": manifest["status"],
        "futureHoldbackReleased": False,
    }
    (ROOT / "integrity-verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf8")
    print(f"Verified {len(records)} original/derivative assets and {len(checked_files)} frozen experiment files.")
    print(manifest["status"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--release-primary", action="store_true")
    verify(parser.parse_args().release_primary)
