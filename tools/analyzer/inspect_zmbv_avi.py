"""Inspect local DOSBox-X ZMBV AVI frames without a system codec.

Supports the 32-bit, zlib-compressed, 16x16-block captures in this workspace.
This is a research-only decoder for ignored local captures, not product code.
"""

import argparse
import hashlib
import json
from pathlib import Path
import struct
import zlib


def chunks(data: bytes):
    offset = 12
    while offset + 8 <= len(data):
        tag = data[offset:offset + 4]
        size = struct.unpack_from("<I", data, offset + 4)[0]
        if tag in (b"RIFF", b"LIST"):
            offset += 12
            continue
        yield tag, data[offset + 8:offset + 8 + size]
        offset += 8 + size + (size & 1)


def signed(value: int) -> int:
    return value - 256 if value >= 128 else value


def decode_interframe(payload: bytes, previous: bytes, width: int, height: int,
                      block_width: int, block_height: int) -> bytes:
    across = (width + block_width - 1) // block_width
    down = (height + block_height - 1) // block_height
    vector_bytes = (across * down * 2 + 3) & ~3
    if len(payload) < vector_bytes:
        raise ValueError("Short ZMBV motion vector table")
    vectors = payload[:vector_bytes]
    differences = memoryview(payload)[vector_bytes:]
    next_frame = bytearray(width * height * 4)
    diff_offset = 0
    block_index = 0
    for y in range(0, height, block_height):
        block_h = min(block_height, height - y)
        for x in range(0, width, block_width):
            block_w = min(block_width, width - x)
            vx = signed(vectors[block_index])
            vy = signed(vectors[block_index + 1])
            block_index += 2
            has_difference = vx & 1
            source_x = x + (vx >> 1)
            source_y = y + (vy >> 1)
            row_bytes = block_w * 4
            for row in range(block_h):
                dest = ((y + row) * width + x) * 4
                if 0 <= source_y + row < height and 0 <= source_x and source_x + block_w <= width:
                    source = ((source_y + row) * width + source_x) * 4
                    next_frame[dest:dest + row_bytes] = previous[source:source + row_bytes]
                elif 0 <= source_y + row < height:
                    for col in range(block_w):
                        sx = source_x + col
                        if 0 <= sx < width:
                            source = ((source_y + row) * width + sx) * 4
                            next_frame[dest + col * 4:dest + col * 4 + 4] = previous[source:source + 4]
                if has_difference:
                    if diff_offset + row_bytes > len(differences):
                        raise ValueError("Short ZMBV XOR block")
                    for col in range(row_bytes):
                        next_frame[dest + col] ^= differences[diff_offset + col]
                    diff_offset += row_bytes
    if diff_offset != len(differences):
        raise ValueError(f"Unused XOR bytes: {len(differences) - diff_offset}")
    return bytes(next_frame)


def png_rgb(frame: bytes, width: int, height: int) -> bytes:
    # ZMBV 32-bit samples are B,G,R,unused. Write a small RGB PNG directly.
    rows = bytearray()
    stride = width * 4
    for y in range(height):
        rows.append(0)
        row = frame[y * stride:(y + 1) * stride]
        for x in range(0, len(row), 4):
            rows.extend((row[x + 2], row[x + 1], row[x]))

    def chunk(kind: bytes, content: bytes) -> bytes:
        return struct.pack(">I", len(content)) + kind + content + struct.pack(">I", zlib.crc32(kind + content) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" +
            chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)) +
            chunk(b"IDAT", zlib.compress(bytes(rows), 6)) +
            chunk(b"IEND", b""))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("avi", type=Path)
    parser.add_argument("--max-frames", type=int, default=1200)
    parser.add_argument("--sample-step", type=int, default=100)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    data = args.avi.read_bytes()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    info = next(body for tag, body in chunks(data) if tag == b"strf")
    width, height = struct.unpack_from("<ii", info, 4)
    if width <= 0 or height <= 0 or width > 1920 or height > 1080:
        raise ValueError("Unexpected AVI dimensions")
    previous = bytes(width * height * 4)
    inflater = None
    block_width = block_height = None
    results = []
    decoded_count = 0
    for index, (tag, packet) in enumerate((t, body) for t, body in chunks(data) if t == b"00dc"):
        if index >= args.max_frames:
            break
        flags = packet[0]
        if flags & 1:
            if tuple(packet[1:5]) != (0, 1, 1, 8):
                raise ValueError(f"Unsupported ZMBV format header: {packet[:7].hex()}")
            block_width, block_height = packet[5:7]
            inflater = zlib.decompressobj()
            payload = inflater.decompress(packet[7:])
            if len(payload) != width * height * 4:
                raise ValueError(f"Unexpected keyframe size {len(payload)}")
            current = payload
        else:
            if inflater is None:
                raise ValueError("Interframe before keyframe")
            payload = inflater.decompress(packet[1:])
            current = decode_interframe(payload, previous, width, height, block_width, block_height)
        if index % args.sample_step == 0:
            image = args.output_dir / f"frame-{index:05d}.png"
            image.write_bytes(png_rgb(current, width, height))
            results.append({"frame": index, "sha256": hashlib.sha256(current).hexdigest(),
                            "png": str(image), "packetBytes": len(packet)})
        previous = current
        decoded_count += 1
    print(json.dumps({"avi": str(args.avi), "width": width, "height": height,
                      "decodedFrames": decoded_count, "samples": results}, ensure_ascii=False))


if __name__ == "__main__":
    main()
