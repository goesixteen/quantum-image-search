"""Verify the v4 experiment freeze and prepare an isolated reserve disclosure.

This writes new Iteration 04 records only. Historical acquisition, release and
freeze manifests are read-only. No image decoding, model import or scoring.
"""
from pathlib import Path
import argparse
import datetime
import hashlib
import json

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent.parent
LOCK = ROOT / "iteration04-steward-lock.json"


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def reserve_paths(asset):
    paths = {asset["original"]: asset["sha256"]}
    if asset["kind"] == "street":
        paths[asset["normalized"]] = asset["normalization"]["sha256"]
    if asset.get("roi"):
        paths[asset["roi"]["path"]] = asset["roi"]["sha256"]
        paths[asset["roi"]["evidence"]] = sha256(ROOT / asset["roi"]["evidence"])
    return paths


def lock():
    assert not LOCK.exists(), "Existing lock must remain immutable."
    manifest_path = ROOT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf8"))
    reserves = [asset for asset in manifest["assets"] if asset["id"] in manifest["futureHoldbackIds"]]
    assert [asset["id"] for asset in reserves] == ["street-c", "bus-c"]
    paths = {}
    for asset in reserves:
        assert asset["modelScored"] is False and asset["featureVectorsComputed"] is False
        paths.update(reserve_paths(asset))
    for name, expected in paths.items():
        assert sha256(ROOT / name) == expected, name
    record = {
        "lockedAtUtc": utc(),
        "iteration": 4,
        "status": "reserve-identities-unreleased-awaiting-v4-exact-freeze",
        "historicalManifestSha256": sha256(manifest_path),
        "historicalPrimaryReleaseSha256": sha256(ROOT / "primary-release.json"),
        "reserveIds": [asset["id"] for asset in reserves],
        "reserveFilesSha256": paths,
        "modelImportsOrScoring": False,
        "historicalRecordsModified": False,
    }
    LOCK.write_text(json.dumps(record, indent=2) + "\n", encoding="utf8")
    print("Iteration 04 reserve lock written; no identities released.")


def prepare(freeze_relative, expected_freeze_sha256, record_disclosure=False):
    lock_record = json.loads(LOCK.read_text(encoding="utf8"))
    assert sha256(ROOT / "manifest.json") == lock_record["historicalManifestSha256"]
    assert sha256(ROOT / "primary-release.json") == lock_record["historicalPrimaryReleaseSha256"]
    for relative, expected in lock_record["reserveFilesSha256"].items():
        assert sha256(ROOT / relative) == expected, f"Reserved bytes changed: {relative}"
    freeze_path = (PROJECT / freeze_relative).resolve()
    assert freeze_path.is_relative_to(PROJECT.resolve()), "Freeze path must remain in the project."
    assert sha256(freeze_path) == expected_freeze_sha256, "Freeze manifest SHA does not match the declared freeze."
    freeze = json.loads(freeze_path.read_text(encoding="utf8"))
    assert freeze.get("frozen_at_utc"), "Freeze timestamp missing."
    assert freeze.get("thresholds"), "Frozen model thresholds missing."
    assert freeze.get("files_sha256"), "Frozen experiment file hashes missing."
    checked = []
    for relative, expected in freeze["files_sha256"].items():
        path = (PROJECT / Path(relative)).resolve()
        assert path.is_relative_to(PROJECT.resolve()), relative
        assert sha256(path) == expected, f"Frozen file changed: {relative}"
        checked.append(relative)
    verification = {
        "verifiedAtUtc": utc(),
        "freezePath": str(freeze_path.relative_to(PROJECT)),
        "freezeSha256": expected_freeze_sha256,
        "frozenAtUtc": freeze["frozen_at_utc"],
        "thresholds": freeze["thresholds"],
        "frozenFilesChecked": checked,
        "reserveFilesChecked": lock_record["reserveFilesSha256"],
        "historicalRecordsUnchanged": True,
        "modelImportsOrScoring": False,
        "passed": True,
    }
    (ROOT / "iteration04-steward-verification.json").write_text(json.dumps(verification, indent=2) + "\n", encoding="utf8")
    if record_disclosure:
        release_path = ROOT / "iteration04-reserve-release.json"
        assert not release_path.exists(), "Do not replace a recorded disclosure."
        manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf8"))
        reserves = [asset for asset in manifest["assets"] if asset["id"] in lock_record["reserveIds"]]
        release = {
            "iteration": 4,
            "disclosureRecordedAtUtc": utc(),
            "timestampMeaning": "Actual UTC recorded immediately before sending the reserve disclosure message; not claimed to be a platform-supplied message-send timestamp.",
            "recipient": "train_qnn research agent",
            "purpose": "Evaluation only after exact v4 freeze; no fitting or threshold selection from these identities.",
            "freezeVerification": verification,
            "assets": reserves,
            "historicalRecordsModified": False,
            "afterThisAudit": "These identities become inspected diagnostic fixtures. A later redesign needs a new untouched evaluation set.",
        }
        release_path.write_text(json.dumps(release, indent=2) + "\n", encoding="utf8")
        print("Recorded actual UTC disclosure preparation:", release["disclosureRecordedAtUtc"])
        print("Sanitized reserve inventory:", release_path.name)
    else:
        print("Freeze and reserved bytes verified; disclosure not recorded or authorized by this invocation.")
    print("Frozen experiment files checked:", len(checked))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--lock", action="store_true")
    parser.add_argument("--freeze")
    parser.add_argument("--expected-freeze-sha256")
    parser.add_argument("--record-disclosure", action="store_true")
    args = parser.parse_args()
    if args.lock:
        assert not args.freeze and not args.record_disclosure
        lock()
    else:
        assert args.freeze and args.expected_freeze_sha256
        prepare(args.freeze, args.expected_freeze_sha256, args.record_disclosure)
