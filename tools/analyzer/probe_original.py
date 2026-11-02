"""Read-only source-derived research probes; not a canonical game-data extractor.

Hypotheses and source locations are documented in docs/research/source-index.md.
Prints JSON to stdout; redirect outside the original directory.
"""
import hashlib
import json
import struct
import sys
from pathlib import Path


def probe(root: Path) -> dict:
    result = {"probeVersion": "0.1.0", "sourceCommit": "89962d7fc2837c143e176c306d83b4e38dab6e77",
              "confidence": "Community Implementation", "records": [], "nameSamples": [], "mapCapacity": []}
    inputs = {}

    def read(name):
        data = (root / name).read_bytes()
        inputs[name] = {"size": len(data), "sha256": hashlib.sha256(data).hexdigest()}
        return data

    for stem in ("RANGER", "R1", "R2", "R3"):
        index, data = read(stem + ".IDX"), read(stem + ".GRP")
        if len(index) != 24:
            raise ValueError(f"{stem}: expected candidate six-boundary index")
        ends = struct.unpack("<6I", index)
        if list(ends) != sorted(ends) or ends[-1] != len(data):
            raise ValueError(f"{stem}: candidate boundaries do not fit")
        sizes = [b - a for a, b in zip((0,) + ends[:-1], ends)]
        widths = (182, 190, 52, 136, 30)
        if any(size % width for size, width in zip(sizes[1:], widths)):
            raise ValueError(f"{stem}: candidate record widths do not divide sections")
        counts = [size // width for size, width in zip(sizes[1:], widths)]
        result["records"].append({"stem": stem, "boundaries": ends, "sectionBytes": sizes, "candidateCounts": counts})
        if stem == "RANGER":
            scene_count = counts[2]
            for kind, start, width, offset, count in (("person", ends[0], 182, 8, counts[0]),
                                                      ("scene", ends[2], 52, 2, counts[2])):
                for record_id in range(min(6, count)):
                    raw = data[start + record_id * width + offset:start + record_id * width + offset + 10].split(b"\0")[0]
                    decoded = {}
                    for codec in ("big5", "cp950", "gbk"):
                        try:
                            decoded[codec] = raw.decode(codec, errors="strict")
                        except UnicodeDecodeError:
                            decoded[codec] = None
                    result["nameSamples"].append({"kind": kind, "id": record_id, "hex": raw.hex(), "decoded": decoded})

    for filename, block in (("ALLSIN.GRP", 64 * 64 * 6 * 2), ("ALLDEF.GRP", 200 * 11 * 2)):
        data = read(filename)
        tail = data[scene_count * block:]
        result["mapCapacity"].append({"file": filename, "candidateBlockBytes": block,
                                      "wholeBlocks": len(data) // block, "remainder": len(data) % block,
                                      "beyondSceneRecordsBytes": len(tail), "tailNonzeroBytes": sum(x != 0 for x in tail)})
    result["inputs"] = inputs
    return result


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python tools/analyzer/probe_original.py <original-directory>")
    print(json.dumps(probe(Path(sys.argv[1])), ensure_ascii=True, indent=2))
