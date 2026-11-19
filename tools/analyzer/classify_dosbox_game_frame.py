"""Compare a DOSBox-X game-only PNG with a known clean frame from the same scene.

This is a visual-state guard for automation, not OCR or event evidence by itself.
It only uses Python's standard library and leaves both PNGs unchanged.
"""

import argparse
import json
import struct
import zlib
from pathlib import Path


REGIONS = {
    "top_dialogue": (16, 16, 624, 160),
    "center_prompt": (118, 76, 522, 162),
    "bottom_dialogue": (16, 252, 624, 380),
}


def read_indexed_png(path: Path):
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"not a PNG: {path}")
    width = height = None
    palette = None
    idat = bytearray()
    offset = 8
    while offset < len(data):
        length = struct.unpack_from(">I", data, offset)[0]
        kind = data[offset + 4 : offset + 8]
        payload = data[offset + 8 : offset + 8 + length]
        offset += 12 + length
        if kind == b"IHDR":
            width, height, depth, color, _, _, interlace = struct.unpack(">IIBBBBB", payload)
            if (depth, color, interlace) != (8, 3, 0):
                raise ValueError("expected non-interlaced 8-bit indexed game PNG")
        elif kind == b"PLTE":
            palette = [payload[i : i + 3] for i in range(0, len(payload), 3)]
        elif kind == b"IDAT":
            idat.extend(payload)
        elif kind == b"IEND":
            break
    if width is None or height is None or palette is None:
        raise ValueError("incomplete indexed PNG")
    raw = zlib.decompress(idat)
    rows = []
    previous = bytearray(width)
    pos = 0
    for _ in range(height):
        filter_type = raw[pos]
        pos += 1
        row = bytearray(raw[pos : pos + width])
        pos += width
        for x in range(width):
            left = row[x - 1] if x else 0
            up = previous[x]
            upper_left = previous[x - 1] if x else 0
            if filter_type == 1:
                row[x] = (row[x] + left) & 255
            elif filter_type == 2:
                row[x] = (row[x] + up) & 255
            elif filter_type == 3:
                row[x] = (row[x] + ((left + up) // 2)) & 255
            elif filter_type == 4:
                p = left + up - upper_left
                distances = (abs(p - left), abs(p - up), abs(p - upper_left))
                predictor = (left, up, upper_left)[distances.index(min(distances))]
                row[x] = (row[x] + predictor) & 255
            elif filter_type != 0:
                raise ValueError(f"unsupported PNG filter {filter_type}")
        rows.append(row)
        previous = row
    return width, height, palette, rows


def region_change(reference, frame, bounds, stride):
    _, _, ref_palette, ref_rows = reference
    _, _, frame_palette, frame_rows = frame
    x1, y1, x2, y2 = bounds
    changed = total = 0
    for y in range(y1, y2, stride):
        for x in range(x1, x2, stride):
            a = ref_palette[ref_rows[y][x]]
            b = frame_palette[frame_rows[y][x]]
            if max(abs(a[i] - b[i]) for i in range(3)) >= 32:
                changed += 1
            total += 1
    return round(changed / total, 4)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reference", type=Path, help="clean PNG from the same scene and camera")
    parser.add_argument("frame", type=Path, nargs="+", help="captured PNG to classify")
    parser.add_argument("--stride", type=int, default=4)
    args = parser.parse_args()
    if args.stride < 1:
        parser.error("--stride must be positive")
    reference = read_indexed_png(args.reference)
    for path in args.frame:
        frame = read_indexed_png(path)
        if frame[:2] != reference[:2]:
            raise ValueError("frame dimensions differ from reference")
        changes = {name: region_change(reference, frame, bounds, args.stride) for name, bounds in REGIONS.items()}
        overlay_regions = [name for name, ratio in changes.items() if ratio >= 0.08]
        print(
            json.dumps(
                {
                    "frame": str(path),
                    "overlayPresent": bool(overlay_regions),
                    "overlayRegions": overlay_regions,
                    "changeRatio": changes,
                },
                ensure_ascii=False,
            )
        )


if __name__ == "__main__":
    main()
