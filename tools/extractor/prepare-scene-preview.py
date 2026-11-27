"""Local original scene export: ground layer + tile images from SMP/SDX.
Usage: python tools/extractor/prepare-scene-preview.py <original-directory> <scene-id> [out-dir]
Outputs a content package with the scene's ground layer as a projected map (64x64).
Buildings are billboard; 3D models are postponed (same policy as world preview)."""
import sys, struct, json, base64, hashlib
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec

_spec = spec_from_file_location('scene_rle', Path(__file__).with_name('decode-scene-region.py'))
_decoder = module_from_spec(_spec)
_spec.loader.exec_module(_decoder)
decode, png = _decoder.decode, _decoder.png

def export(root, scene_id, out):
    names = ['RANGER.IDX', 'RANGER.GRP', 'ALLSIN.GRP', 'ALLDEF.GRP', 'MMAP.COL']
    data = {n: (root / n).read_bytes() for n in names}
    sha = lambda b: hashlib.sha256(b).hexdigest()

    # Scene record: 52 bytes each, section 3 of RANGER.GRP
    idx = struct.unpack('<' + str(len(data['RANGER.IDX']) // 4) + 'I', data['RANGER.IDX'])
    scene_section_offset = idx[3] if len(idx) > 3 else 0
    scene_count = (idx[4] - idx[3]) // 52 if len(idx) > 4 else 84
    if scene_id < 0 or scene_id >= scene_count:
        raise ValueError('SCENE_ID:' + str(scene_id))

    # Scene name (Big5, 10 bytes at offset 2 in the 52-byte record)
    record_offset = scene_section_offset + scene_id * 52
    name_bytes = data['RANGER.GRP'][record_offset + 2:record_offset + 12]
    nul = name_bytes.find(0)
    name = name_bytes[:nul if nul >= 0 else 10].decode('big5', errors='replace')

    # Map layers: 6 layers x 4096 cells x 2 bytes = 49152 bytes per scene
    layer_size = 4096 * 2
    scene_map_offset = scene_id * 49152
    layers = {}
    for layer_name, layer_idx in [('ground', 0), ('building', 1), ('object', 2)]:
        raw = data['ALLSIN.GRP'][scene_map_offset + layer_idx * layer_size: scene_map_offset + (layer_idx + 1) * layer_size]
        layers[layer_name] = struct.unpack('<4096h', raw)

    # Entrance position (from scene record offsets 20, 22)
    ex, ey = struct.unpack_from('<2h', data['RANGER.GRP'], record_offset + 20)

    # Tile images from SDX/SMP (scene-specific atlas)
    sdx_name = f'SDX{scene_id:03d}'
    smp_name = f'SMP{scene_id:03d}'
    sdx_path = root / sdx_name
    smp_path = root / smp_name
    if not sdx_path.exists() or not smp_path.exists():
        raise ValueError(f'SCENE_ATLAS_MISSING:{sdx_name}/{smp_name}')
    sdx = sdx_path.read_bytes()
    smp = smp_path.read_bytes()
    palette = data['MMAP.COL']

    # SDX: array of uint32 end-offsets into SMP
    sdx_entries = struct.unpack('<' + str(len(sdx) // 4) + 'I', sdx)
    last = next((i for i in range(len(sdx_entries) - 1, -1, -1) if sdx_entries[i]), -1)
    if last < 0:
        raise ValueError('SCENE_SDX_EMPTY')

    # Collect unique non-zero tile IDs from ground + building layers
    tile_ids = sorted(set(t for t in layers['ground'] + layers['building'] if t > 0))
    images = []
    for tile in tile_ids:
        if tile % 2:
            raise ValueError('SCENE_ODD_TILE:' + str(tile))
        r = tile // 2
        if r > last:
            continue  # Image not in this scene's atlas; skip (unknown tile)
        a = sdx_entries[r - 1] if r > 0 else 0
        b = sdx_entries[r]
        if not (0 <= a < b <= len(smp)):
            raise ValueError(f'SCENE_IMAGE_RANGE:{tile}')
        raw = smp[a:b]
        im = decode(raw, palette)
        image = png(im['width'], im['height'], im['rgba'])
        images.append({
            'tileValue': tile, 'resourceId': r,
            'assetId': f'local.scene{scene_id}:tile/{tile}',
            'width': im['width'], 'height': im['height'],
            'xOffset': im['xOffset'], 'yOffset': im['yOffset'],
            'sourceFile': smp_name, 'sourceOffset': a, 'sourceByteLength': b - a,
            'sourceSha256': sha(raw), 'sha256': sha(image),
            'dataUri': 'data:image/png;base64,' + base64.b64encode(image).decode(),
        })

    # Collision: building layer non-zero = blocked (same policy as world preview)
    blocked = [y * 64 + x for y in range(64) for x in range(64)
               if layers['building'][y * 64 + x] != 0]
    blocked_set = set(blocked)

    # Entry: use scene entrance if valid, else first free cell
    if 0 <= ex < 64 and 0 <= ey < 64 and ey * 64 + ex not in blocked_set:
        entry = (ex, ey)
    else:
        entry = next((x, y) for y in range(64) for x in range(64) if y * 64 + x not in blocked_set)

    # Content package
    pid = f'local.original.scene{scene_id}-preview'
    mid = pid + ':map/scene'
    pkg = {
        'manifest': {
            'id': pid, 'version': '0.1.0', 'schemaVersion': 1, 'runtimeVersion': '0.1.0',
            'kind': 'base', 'classification': 'original-derived',
            'license': 'Local original data only; redistribution not authorized',
            'ruleset': f'community-scene{scene_id}-v1', 'priority': 0, 'dependencies': [],
        },
        'entry': {'mapId': mid, 'x': entry[0], 'y': entry[1]},
        'maps': [{'id': mid, 'name': f'場景 {scene_id}：{name}', 'width': 64, 'height': 64,
                  'blocked': blocked, 'npcs': [], 'portals': []}],
        'events': [], 'dialogues': [], 'items': [], 'patches': [],
    }

    # Projected map: ground (projection: ground) + building (projection: billboard)
    ground_data = struct.pack('<4096h', *layers['ground'])
    building_data = struct.pack('<4096h', *layers['building'])
    projected = {
        'version': 1, 'width': 64, 'height': 64,
        'images': images,
        'layers': [
            {'id': 'scene-ground', 'projection': 'ground',
             'data': base64.b64encode(ground_data).decode(), 'sha256': sha(ground_data)},
            {'id': 'scene-building', 'projection': 'billboard',
             'data': base64.b64encode(building_data).decode(), 'sha256': sha(building_data)},
        ],
    }

    bundle = {
        'package': pkg,
        'projectedMap': projected,
        'previewNotes': [
            f'場景 {scene_id}（{name}）64×64 原圖投影；地表 ground＋建築 billboard。',
            f'通行採建築層非零阻擋；{len(blocked)} 格阻擋。',
            '3D 模型暫擱；事件未接入。',
        ],
        'provenance': {
            'converterVersion': '0.1.0', 'confidence': 'Community Implementation',
            'sceneId': scene_id, 'sceneName': name,
            'sourceEntry': {'recordOffset': record_offset, 'x': ex, 'y': ey},
            'sources': [{'sourceFile': n, 'sha256': sha(data[n]), 'byteLength': len(data[n])} for n in names]
                      + [{'sourceFile': sdx_name, 'sha256': sha(sdx), 'byteLength': len(sdx)},
                         {'sourceFile': smp_name, 'sha256': sha(smp), 'byteLength': len(smp)}],
            'cellOffsetFormula': '(y*64+x)*2 in ALLSIN.GRP scene section',
            'imageIndexRule': 'tileValue/2; SDX little-endian end-offsets into SMP',
            'independentImages': len(images),
        },
    }

    out.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(bundle, ensure_ascii=False, separators=(',', ':')).encode()
    target = out / f'scene{scene_id}-{sha(serialized)[:16]}.local.json'
    if target.exists() and target.read_bytes() != serialized:
        raise ValueError('OUTPUT_CHANGED')
    target.write_bytes(serialized)
    print(json.dumps({
        'destination': str(target.resolve()),
        'sceneId': scene_id, 'sceneName': name,
        'images': len(images), 'cells': 4096,
        'blocked': len(blocked), 'entry': entry,
        'bytes': len(serialized),
    }))

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python tools/extractor/prepare-scene-preview.py <original-directory> <scene-id> [out-dir]')
        sys.exit(1)
    root = Path(sys.argv[1])
    scene_id = int(sys.argv[2])
    out = Path(sys.argv[3]) if len(sys.argv) > 3 else Path('assets/generated/scene-preview')
    export(root, scene_id, out)
