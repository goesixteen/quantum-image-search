"""Package registered whole-object PNGs and silhouette bands using only stdlib."""
from pathlib import Path
import json
import zipfile

dist = Path(__file__).resolve().parents[1] / 'dist'
catalog = json.loads((dist / 'scene-catalog.json').read_text(encoding='utf-8-sig'))
for scene in catalog['scenes']:
    folder = dist / 'assets/depth-bands' / scene['id']
    pack = folder / 'layers.zip'
    with zipfile.ZipFile(pack, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for source in sorted(folder.iterdir()):
            if source.suffix in ('.png', '.json'):
                archive.write(source, 'bands/' + source.name)
        for source in sorted((dist / 'assets/layers' / scene['id']).iterdir()):
            if source.suffix in ('.png', '.json'):
                archive.write(source, 'objects/' + source.name)
        archive.write(dist / scene['src'], 'background.png')
        archive.writestr('README.txt', scene['name'] + '\n' + scene['credit'] + '\n'
            'The object-only copy is transparent outside curated object silhouettes.\n'
            'Whole registered objects are grouped by floor((alphaBottom-1)/16); '
            'no horizontal image slices cut through them. Each band uses its maximum '
            'member bottom. Lower target feet draw in front; equal or higher feet behind.\n'
            'Band PNGs and masks are full 512x512; individual objects are cropped with '
            'registered positions. See each registrations.json for hashes and anchors.\n'
            'Curated masks are approximate and do not segment every person or object.\n')
    with zipfile.ZipFile(pack) as archive:
        assert archive.testzip() is None
    print(scene['id'] + ': ' + str(pack.stat().st_size) + ' bytes')
