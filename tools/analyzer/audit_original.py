"""Read-only research audit of candidate text fields and IDX boundaries.

Does not repair, convert, export game content, or assume all IDXs share semantics.
Source hypotheses: docs/research/source-index.md and encoding-map-conversion.md.
"""
import hashlib
import json
import struct
import sys
from pathlib import Path


def audit(root: Path) -> dict:
    result = {"auditVersion": "0.1.0", "sourceCommit": "89962d7fc2837c143e176c306d83b4e38dab6e77",
              "confidence": "Community Implementation", "inputs": {}, "indexes": [], "textFields": []}

    def read(p):
        data = p.read_bytes()
        result["inputs"][p.name] = {"size": len(data), "sha256": hashlib.sha256(data).hexdigest()}
        return data

    for p in sorted(root.glob("*.IDX")):
        data = read(p)
        grp = p.with_suffix(".GRP")
        row = {"file": p.name, "aligned4": len(data) % 4 == 0, "paired": grp.is_file()}
        if row["aligned4"] and row["paired"]:
            size = len(read(grp))
            ends = struct.unpack("<" + "I" * (len(data) // 4), data)
            last_nonzero = next((i for i in range(len(ends) - 1, -1, -1) if ends[i]), -1)
            prefix = ends[:last_nonzero + 1]
            row.update(entries=len(ends), grpBytes=size, finalValue=ends[-1] if ends else None,
                       decreases=[i for i in range(1, len(ends)) if ends[i] < ends[i - 1]],
                       outOfBounds=sum(x > size for x in ends), trailingZeros=len(ends) - last_nonzero - 1,
                       prefixNondecreasing=all(a <= b for a, b in zip(prefix, prefix[1:])),
                       lastNonzero=ends[last_nonzero] if last_nonzero >= 0 else None)
        result["indexes"].append(row)

    # Candidate fields from A jyconst.lua:146–147,207–209,275,300.
    layouts = ((0, 182, ((8, 10, "name"), (18, 10, "alias"))),
               (1, 190, ((2, 20, "name"), (22, 20, "name2"), (42, 30, "description"))),
               (2, 52, ((2, 10, "name"),)), (3, 136, ((2, 10, "name"),)))
    for stem in ("RANGER", "R1", "R2", "R3"):
        index = read(root / (stem + ".IDX"))
        data = read(root / (stem + ".GRP"))
        if len(index) != 24:
            raise ValueError(f"{stem}: unexpected candidate index size")
        ends = struct.unpack("<6I", index)
        if list(ends) != sorted(ends) or ends[-1] != len(data):
            raise ValueError(f"{stem}: candidate boundaries do not fit")
        for section, width, fields in layouts:
            start, stop = ends[section], ends[section + 1]
            if (stop - start) % width:
                raise ValueError(f"{stem}: unexpected record width")
            count = (stop - start) // width
            for offset, length, field in fields:
                for codec in ("big5", "cp950", "gbk"):
                    failed, empty = [], 0
                    for record_id in range(count):
                        pos = start + record_id * width + offset
                        raw = data[pos:pos + length].split(b"\0")[0]
                        empty += not raw
                        try:
                            raw.decode(codec, errors="strict")
                        except UnicodeDecodeError:
                            failed.append(record_id)
                    result["textFields"].append({"stem": stem, "section": section, "field": field,
                                                 "codec": codec, "count": count, "empty": empty,
                                                 "failedIds": failed})
    return result


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python tools/analyzer/audit_original.py <original-directory>")
    print(json.dumps(audit(Path(sys.argv[1])), ensure_ascii=True, indent=2))
