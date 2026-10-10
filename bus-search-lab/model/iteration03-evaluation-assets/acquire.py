"""Acquire unscored photographic evaluation fixtures; no model imports or fitting.

Run only when regenerating missing originals/normalizations. Existing originals
are preserved. Corpus/release metadata are defined here for reproducibility.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from PIL import Image
import datetime
import hashlib
import json
import time

ROOT = Path(__file__).resolve().parent
ASSETS = [
    dict(id="street-a", kind="street", group="iteration03-primary",
         title="Main Street, South Lancaster MA.jpg", creator="John Phelan", date="2010-06-27",
         page="https://commons.wikimedia.org/wiki/File:Main_Street,_South_Lancaster_MA.jpg",
         download="https://upload.wikimedia.org/wikipedia/commons/2/2a/Main_Street%2C_South_Lancaster_MA.jpg",
         license="CC BY 3.0", licenseUrl="https://creativecommons.org/licenses/by/3.0/"),
    dict(id="street-b", kind="street", group="iteration03-primary",
         title="Main Street, Buffalo, NY - 52685131767.jpg", creator="Warren LeMay (w_lemay)", date="2022-07-31",
         page="https://commons.wikimedia.org/wiki/File:Main_Street,_Buffalo,_NY_-_52685131767.jpg",
         download="https://upload.wikimedia.org/wikipedia/commons/d/db/Main_Street%2C_Buffalo%2C_NY_-_52685131767.jpg",
         license="CC BY-SA 2.0", licenseUrl="https://creativecommons.org/licenses/by-sa/2.0/",
         source="https://www.flickr.com/photos/59081381@N03/52685131767/"),
    dict(id="bus-a", kind="schoolbus", group="iteration03-primary",
         title="Left side of Thomas Built MVP ER school bus (13182497535).jpg", creator="Ben Schumin", date="2014-02-04",
         page="https://commons.wikimedia.org/wiki/File:Left_side_of_Thomas_Built_MVP_ER_school_bus_(13182497535).jpg",
         download="https://upload.wikimedia.org/wikipedia/commons/7/79/Left_side_of_Thomas_Built_MVP_ER_school_bus_%2813182497535%29.jpg",
         license="CC BY-SA 2.0", licenseUrl="https://creativecommons.org/licenses/by-sa/2.0/",
         source="https://www.flickr.com/photos/schuminweb/13182497535/",
         expectedSha1="bb49fd629977729372611f299405003c6b36aa5d"),
    dict(id="bus-b", kind="schoolbus", group="iteration03-primary",
         title="TBBWestcoastER.jpg", creator="Ariana Rose Taylor-Stanley", date="2005-03-22",
         page="https://commons.wikimedia.org/wiki/File:TBBWestcoastER.jpg",
         download="https://upload.wikimedia.org/wikipedia/commons/8/8d/TBBWestcoastER.jpg",
         license="CC BY 2.0", licenseUrl="https://creativecommons.org/licenses/by/2.0/",
         source="https://www.flickr.com/photos/20411245@N00/7195675/"),
    dict(id="street-c", kind="street", group="unreleased-future-holdback",
         title="Concord MA.jpg", creator="-jkb-", date="2009-10-19",
         page="https://commons.wikimedia.org/wiki/File:Concord_MA.jpg",
         download="https://upload.wikimedia.org/wikipedia/commons/1/1a/Concord_MA.jpg",
         license="CC BY 3.0 (chosen from offered licenses)", licenseUrl="https://creativecommons.org/licenses/by/3.0/"),
    dict(id="bus-c", kind="schoolbus", group="unreleased-future-holdback",
         title="2003 AmTran 3800.jpg", creator="2008ICBE200", date="2024-07-12",
         page="https://commons.wikimedia.org/wiki/File:2003_AmTran_3800.jpg",
         download="https://upload.wikimedia.org/wikipedia/commons/2/22/2003_AmTran_3800.jpg",
         license="CC BY 4.0", licenseUrl="https://creativecommons.org/licenses/by/4.0/"),
]


def download(url):
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=45) as response:
                return response.read()
        except HTTPError as error:
            if error.code != 429 or attempt == 2:
                raise
            requested = error.headers.get("Retry-After", "")
            delay = max(20 * (attempt + 1), int(requested)) if requested.isdigit() else 20 * (attempt + 1)
            print(f"Rate limit: waiting {delay}s before retry {attempt + 1}", flush=True)
            time.sleep(delay)
    raise RuntimeError("Unreachable download retry state")


def prepare():
    manifest_path = ROOT / "manifest.json"
    old = json.loads(manifest_path.read_text(encoding="utf8")) if manifest_path.exists() else {}
    old_assets = {asset["id"]: asset for asset in old.get("assets", [])}
    assets = []
    manifest = {
        **old,
        "version": 1,
        "acquiredAtUtc": old.get("acquiredAtUtc", datetime.datetime.now(datetime.timezone.utc).isoformat()),
        "status": old.get("status", "locked-awaiting-feature-model-threshold-protocol-freeze"),
        "noScoringBeforeFreeze": True,
        "primaryIds": ["street-a", "street-b", "bus-a", "bus-b"],
        "futureHoldbackIds": ["street-c", "bus-c"],
        "modelCandidateFreeze": old.get("modelCandidateFreeze"),
        "releaseRecord": old.get("releaseRecord"),
        "dataSteward": "research subagent",
        "fittingAccessProhibited": True,
        "assets": assets,
    }
    for specification in ASSETS:
        asset = {**specification, **old_assets.get(specification["id"], {})}
        path = ROOT / (asset["id"] + "-source.jpg")
        if not path.exists():
            data = download(asset["download"])
            path.write_bytes(data)
            time.sleep(4)
        else:
            data = path.read_bytes()
        asset.update(original=path.name, bytes=len(data), sha256=hashlib.sha256(data).hexdigest(),
                     sha1=hashlib.sha1(data).hexdigest())
        if asset.get("expectedSha1"):
            assert asset["sha1"] == asset["expectedSha1"]
            asset["commonsChecksumVerified"] = True
        with Image.open(path) as image:
            assert image.format in {"JPEG", "MPO"}
            asset.update(dimensions=list(image.size), format=image.format,
                         exifOrientation=image.getexif().get(274),
                         iccProfilePresent=bool(image.info.get("icc_profile")),
                         frameCount=getattr(image, "n_frames", 1), evaluationFrame=0)
            if asset["kind"] == "street":
                width, height = image.size
                side = min(width, height)
                x, y = (width - side) // 2, (height - side) // 2
                normalized = ROOT / (asset["id"] + "-512.png")
                prepared = image.convert("RGB").crop((x, y, x + side, y + side))
                prepared.resize((512, 512), Image.Resampling.LANCZOS).save(normalized)
                asset.update(normalized=normalized.name, normalization={
                    **asset.get("normalization", {}),
                    "cropXYWH": [x, y, side, side], "size": [512, 512], "mode": "RGB",
                    "resize": "Pillow LANCZOS", "exifTranspose": False, "profileTransform": False,
                    "sha256": hashlib.sha256(normalized.read_bytes()).hexdigest()})
        assets.append(asset)
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")
        print(asset["id"], asset["group"], asset["dimensions"], asset["sha256"], flush=True)


if __name__ == "__main__":
    prepare()
