"""Combine world + scene previews into a single content package with portals.
Usage: python tools/extractor/combine-world-scenes.py <original-directory> [scene-ids...]
Defaults to scenes 1 and 53 if no IDs specified.
Outputs to assets/generated/combined-world/."""
import sys, struct, json, base64, hashlib
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec

_spec = spec_from_file_location('scene_rle', Path(__file__).with_name('decode-scene-region.py'))
_decoder = module_from_spec(_spec)
_spec.loader.exec_module(_decoder)
decode, png = _decoder.decode, _decoder.png

def load_world(root):
    """Load world map data (same logic as prepare-world-preview.py)."""
    names = ['EARTH.002', 'SURFACE.002', 'BUILDING.002', 'BUILDX.002', 'BUILDY.002',
             'MMAP.IDX', 'MMAP.GRP', 'MMAP.COL', 'RANGER.IDX', 'RANGER.GRP']
    data = {n: (root / n).read_bytes() for n in names}
    sha = lambda b: hashlib.sha256(b).hexdigest()
    layers = {}
    for n in names[:5]:
        if len(data[n]) != 480 * 480 * 2:
            raise ValueError('WORLD_LAYER_SIZE:' + n)
        layers[n] = struct.unpack('<230400h', data[n])
    idx = struct.unpack('<' + str(len(data['MMAP.IDX']) // 4) + 'I', data['MMAP.IDX'])
    last = next(i for i in range(len(idx) - 1, -1, -1) if idx[i])
    # Ground + surface + building images
    tile_ids = sorted(set(t for n in names[:3] for t in layers[n] if t > 0))
    images = []
    for tile in tile_ids:
        if tile % 2:
            raise ValueError('WORLD_ODD_ID')
        r = tile // 2
        if r > last:
            continue
        a = idx[r - 1] if r else 0
        b = idx[r]
        raw = data['MMAP.GRP'][a:b]
        im = decode(raw, data['MMAP.COL'])
        image = png(im['width'], im['height'], im['rgba'])
        images.append({
            'tileValue': tile, 'assetId': f'local.world:tile/{tile}',
            'width': im['width'], 'height': im['height'],
            'xOffset': im['xOffset'], 'yOffset': im['yOffset'],
            'sha256': sha(image),
            'dataUri': 'data:image/png;base64,' + base64.b64encode(image).decode(),
        })
    blocked = [y * 480 + x for y in range(480) for x in range(480)
               if x < 10 or y < 10 or x > 470 or y > 470
               or layers['BUILDX.002'][y * 480 + x] != 0 or layers['BUILDY.002'][y * 480 + x] != 0]
    # Scene 1 entrance (world coordinates)
    ends = struct.unpack('<6I', data['RANGER.IDX'])
    scene1_offset = ends[2] + 52
    ex, ey = struct.unpack_from('<2h', data['RANGER.GRP'], scene1_offset + 20)
    return {
        'layers': layers, 'images': images, 'blocked': blocked,
        'entry': (ex, ey), 'sha': sha, 'data': data,
    }

def load_scene(root, scene_id):
    """Load a single scene's ground + building layers, tile images, and NPC slots from ALLDEF."""
    sha = lambda b: hashlib.sha256(b).hexdigest()
    sdx_name = f'SDX{scene_id:03d}'
    smp_name = f'SMP{scene_id:03d}'
    sdx = (root / sdx_name).read_bytes()
    smp = (root / smp_name).read_bytes()
    palette = (root / 'MMAP.COL').read_bytes()
    allsin = (root / 'ALLSIN.GRP').read_bytes()
    alldef = (root / 'ALLDEF.GRP').read_bytes()
    ranger_idx = (root / 'RANGER.IDX').read_bytes()
    ranger_grp = (root / 'RANGER.GRP').read_bytes()

    idx = struct.unpack('<' + str(len(ranger_idx) // 4) + 'I', ranger_idx)
    scene_section_offset = idx[3] if len(idx) > 3 else 0
    record_offset = scene_section_offset + scene_id * 52
    ex, ey = struct.unpack_from('<2h', ranger_grp, record_offset + 20)
    name_bytes = ranger_grp[record_offset + 2:record_offset + 12]
    nul = name_bytes.find(0)
    name = name_bytes[:nul if nul >= 0 else 10].decode('big5', errors='replace')

    layer_size = 4096 * 2
    scene_map_offset = scene_id * 49152
    ground_raw = allsin[scene_map_offset: scene_map_offset + layer_size]
    building_raw = allsin[scene_map_offset + layer_size: scene_map_offset + 2 * layer_size]
    ground = struct.unpack('<4096h', ground_raw)
    building = struct.unpack('<4096h', building_raw)

    sdx_entries = struct.unpack('<' + str(len(sdx) // 4) + 'I', sdx)
    last = next((i for i in range(len(sdx_entries) - 1, -1, -1) if sdx_entries[i]), -1)
    tile_ids = sorted(set(t for t in ground + building if t > 0))
    images = []
    for tile in tile_ids:
        if tile % 2:
            continue
        r = tile // 2
        if r > last:
            continue
        a = sdx_entries[r - 1] if r > 0 else 0
        b = sdx_entries[r]
        if not (0 <= a < b <= len(smp)):
            continue
        raw = smp[a:b]
        im = decode(raw, palette)
        image = png(im['width'], im['height'], im['rgba'])
        images.append({
            'tileValue': tile, 'assetId': f'local.scene{scene_id}:tile/{tile}',
            'width': im['width'], 'height': im['height'],
            'xOffset': im['xOffset'], 'yOffset': im['yOffset'],
            'sha256': sha(image),
            'dataUri': 'data:image/png;base64,' + base64.b64encode(image).decode(),
        })
    blocked = [y * 64 + x for y in range(64) for x in range(64) if building[y * 64 + x] != 0]
    # NPC positions from ALLDEF scene slots (200 slots × 11 int16 fields)
    # Slot position in 64x64 grid: x = slot % 64, y = slot // 64
    # Only slots with non-zero event ID (field 0) are NPC triggers
    alldef_view = struct.unpack('<' + str(len(alldef) // 2) + 'h', alldef)
    npcs = []
    scene_alldef_offset = scene_id * 2200  # 200 slots * 11 fields
    for slot in range(200):
        field_offset = scene_alldef_offset + slot * 11
        if field_offset + 11 > len(alldef_view):
            break
        event_id = alldef_view[field_offset]
        if event_id > 0:
            nx = slot % 64
            ny = slot // 64
            # Skip if blocked
            if building[ny * 64 + nx] == 0:
                npcs.append({'id': f'npc-{scene_id}-{slot}', 'x': nx, 'y': ny})
    return {
        'ground': ground, 'building': building, 'images': images,
        'blocked': blocked, 'entry': (ex, ey), 'name': name,
        'npcs': npcs, 'sha': sha, 'sdx': sdx, 'smp': smp,
    }

def main():
    if len(sys.argv) < 2:
        print('Usage: python tools/extractor/combine-world-scenes.py <original-directory> [scene-ids...]')
        sys.exit(1)
    root = Path(sys.argv[1])
    scene_ids = [int(x) for x in sys.argv[2:]] if len(sys.argv) > 2 else [1, 53]
    out = Path('assets/generated/combined-world')

    print(f'Loading world map...')
    world = load_world(root)
    print(f'  {len(world["images"])} world images, {len(world["blocked"])} blocked cells')

    scenes = {}
    for sid in scene_ids:
        print(f'Loading scene {sid}...')
        scenes[sid] = load_scene(root, sid)
        print(f'  scene {sid}: {len(scenes[sid]["images"])} images')

    # Build combined content package
    pid = 'local.original.combined-world'
    world_map_id = pid + ':map/world'
    maps = [{
        'id': world_map_id, 'name': '世界地圖',
        'width': 480, 'height': 480,
        'blocked': world['blocked'], 'npcs': [],
        'portals': [],
    }]
    scene_map_ids = {}
    for sid in scene_ids:
        mid = f'{pid}:map/scene{sid}'
        scene_map_ids[sid] = mid
        maps.append({
            'id': mid, 'name': f'場景 {sid}：{scenes[sid]["name"]}',
            'width': 64, 'height': 64,
            'blocked': scenes[sid]['blocked'],
            'npcs': scenes[sid]['npcs'],
            'portals': [],
        })

    # Add portals: world → scene at scene entrance positions (offset to avoid overlap)
    for i, sid in enumerate(scene_ids):
        wx, wy = scenes[sid]['entry']
        # Offset portals to avoid overlap when multiple scenes share the same entrance
        px, py = wx + i, wy + i
        if 0 <= px < 480 and 0 <= py < 480:
            maps[0]['portals'].append({
                'x': px, 'y': py,
                'mapId': scene_map_ids[sid],
                'toX': 1, 'toY': 1,
            })
            print(f'  Portal: world({px},{py}) -> scene{sid}')

    # Add portals: scene → world (at scene corner, back to world entrance)
    for sid in scene_ids:
        wx, wy = scenes[sid]['entry']
        if 0 <= wx < 480 and 0 <= wy < 480:
            maps[scene_ids.index(sid) + 1]['portals'].append({
                'x': 0, 'y': 0,
                'mapId': world_map_id,
                'toX': wx, 'toY': wy,
            })

    # Per-map projected maps: each map gets its own projected map with proper images
    projected_maps = []
    # World projected map
    world_layers = []
    sha = world['sha']
    data = world['data']
    for n, lid, proj in [('EARTH.002', 'world-ground', 'ground'),
                          ('SURFACE.002', 'world-surface', 'billboard'),
                          ('BUILDING.002', 'world-building', 'billboard')]:
        raw = data[n]
        world_layers.append({
            'id': lid, 'projection': proj,
            'data': base64.b64encode(raw).decode(), 'sha256': sha(raw),
        })
    projected_maps.append({
        'mapId': world_map_id,
        'projectedMap': {
            'version': 1, 'width': 480, 'height': 480,
            'images': world['images'],
            'layers': world_layers,
        },
    })
    # Scene projected maps
    for sid in scene_ids:
        ground_raw = struct.pack('<4096h', *scenes[sid]['ground'])
        building_raw = struct.pack('<4096h', *scenes[sid]['building'])
        projected_maps.append({
            'mapId': scene_map_ids[sid],
            'projectedMap': {
                'version': 1, 'width': 64, 'height': 64,
                'images': scenes[sid]['images'],
                'layers': [
                    {'id': f'scene{sid}-ground', 'projection': 'ground',
                     'data': base64.b64encode(ground_raw).decode(), 'sha256': sha(ground_raw)},
                    {'id': f'scene{sid}-building', 'projection': 'billboard',
                     'data': base64.b64encode(building_raw).decode(), 'sha256': sha(building_raw)},
                ],
            },
        })
        print(f'  Scene {sid} projected map: {len(scenes[sid]["images"])} images, 64x64')

    pkg = {
        'manifest': {
            'id': pid, 'version': '0.1.0', 'schemaVersion': 1, 'runtimeVersion': '0.1.0',
            'kind': 'base', 'classification': 'original-derived',
            'license': 'Local original data only; redistribution not authorized',
            'ruleset': 'community-combined-world-v1', 'priority': 0, 'dependencies': [],
        },
        'entry': {'mapId': world_map_id, 'x': world['entry'][0], 'y': world['entry'][1]},
        'maps': maps, 'events': [], 'dialogues': [], 'items': [], 'patches': [],
    }

    bundle = {
        'package': pkg,
        'projectedMaps': projected_maps,
        'previewNotes': [
            f'結合世界地圖（480×480）＋{len(scene_ids)} 個場景（64×64）。',
            f'Portals：世界→場景（場景入口位置）＋場景→世界（角落返回）。',
            f'每張地圖有獨立 projected map（{len(projected_maps)} 個渲染層）。',
            '3D 模型暫擱；事件未接入。',
        ],
        'provenance': {
            'converterVersion': '0.1.0', 'confidence': 'Community Implementation',
            'worldEntry': list(world['entry']),
            'scenes': {str(sid): {'name': scenes[sid]['name'], 'entry': list(scenes[sid]['entry'])} for sid in scene_ids},
            'sources': [
                {'sourceFile': n, 'sha256': sha(data[n]), 'byteLength': len(data[n])}
                for n in ['EARTH.002', 'SURFACE.002', 'BUILDING.002', 'BUILDX.002', 'BUILDY.002',
                          'MMAP.IDX', 'MMAP.GRP', 'MMAP.COL', 'RANGER.IDX', 'RANGER.GRP']
            ] + [
                {'sourceFile': 'ALLSIN.GRP', 'sha256': sha((root / 'ALLSIN.GRP').read_bytes()), 'byteLength': (root / 'ALLSIN.GRP').stat().st_size},
            ] + [
                {'sourceFile': f'SDX{sid:03d}', 'sha256': sha(scenes[sid]['sdx']), 'byteLength': len(scenes[sid]['sdx'])}
                for sid in scene_ids
            ] + [
                {'sourceFile': f'SMP{sid:03d}', 'sha256': sha(scenes[sid]['smp']), 'byteLength': len(scenes[sid]['smp'])}
                for sid in scene_ids
            ],
            'worldImages': len(world['images']),
            'sceneImages': {str(sid): len(scenes[sid]['images']) for sid in scene_ids},
        },
    }

    out.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(bundle, ensure_ascii=True, separators=(',', ':')).encode()
    target = out / f'combined-{sha(serialized)[:16]}.local.json'
    if target.exists() and target.read_bytes() != serialized:
        raise ValueError('OUTPUT_CHANGED')
    target.write_bytes(serialized)
    print(json.dumps({
        'destination': str(target.resolve()),
        'worldImages': len(world['images']),
        'sceneIds': scene_ids,
        'portals': len(maps[0]['portals']),
        'bytes': len(serialized),
    }))

if __name__ == '__main__':
    main()
