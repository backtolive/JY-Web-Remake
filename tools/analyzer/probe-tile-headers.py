"""Read-only image-header candidates; does not decode or classify geometry."""
import hashlib
import json
import struct
import sys
from pathlib import Path


def probe(root):
    names = ['MMAP.IDX', 'MMAP.GRP', 'SDX001', 'SMP001', 'ALLSIN.GRP']
    data = {name: (root / name).read_bytes() for name in names}
    maps = data['ALLSIN.GRP']
    rows = []
    for layer in (0, 1, 2):
        ids = sorted({struct.unpack_from('<h', maps, 49152 + layer * 8192 + ((y * 64 + x) * 2))[0]
                      for y in range(28, 36) for x in range(13, 21)})
        for tile in ids:
            if tile <= 0:
                continue
            candidates = []
            for index_name, group_name in [('MMAP.IDX', 'MMAP.GRP'), ('SDX001', 'SMP001')]:
                index, group = data[index_name], data[group_name]
                if len(index) % 4:
                    raise ValueError('UNALIGNED_INDEX:' + index_name)
                ends = struct.unpack('<' + 'I' * (len(index) // 4), index)
                for mode, resource in [('direct', tile), ('half', tile // 2)]:
                    start = ends[resource - 1] if 0 < resource <= len(ends) else 0
                    end = ends[resource] if resource < len(ends) else -1
                    valid = 0 <= start <= end <= len(group) and end - start >= 8
                    candidates.append({'mode': mode, 'sourceFile': group_name, 'resourceId': resource, 'sourceOffset': start,
                                       'byteLength': end - start, 'validRange': valid,
                                       'header': dict(zip(['width', 'height', 'xOffset', 'yOffset'],
                                                         struct.unpack_from('<4h', group, start))) if valid else None})
            rows.append({'layer': layer, 'tileValue': tile, 'even': tile % 2 == 0, 'candidates': candidates})
    for name in names:
        if (root / name).read_bytes() != data[name]:
            raise ValueError('SOURCE_CHANGED:' + name)
    return {'probeVersion': '0.1.0', 'confidence': 'Community Implementation',
            'sourceCommit': '89962d7fc2837c143e176c306d83b4e38dab6e77',
            'scope': 'Scene 1 origin 13,28 size 8x8; MMAP and scene-specific SDX/SMP header candidates only; no full-container normalization, image or geometry verification',
            'sources': [{'sourceFile': name, 'sha256': hashlib.sha256(raw).hexdigest(), 'byteLength': len(raw)}
                        for name, raw in data.items()], 'entries': rows}


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: probe-tile-headers.py <original-directory>')
    print(json.dumps(probe(Path(sys.argv[1])), indent=2))
