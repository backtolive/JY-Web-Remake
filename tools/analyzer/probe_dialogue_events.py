"""Source-backed, read-only TALK/KDEF research; no game content export."""
import hashlib
import json
import struct
import sys
from pathlib import Path


def probe(root):
    result = {"probeVersion": "0.1.0", "sourceCommit": "4d225cb9b7b9a3ac46a796ecb0acde525ef72acc",
              "confidence": "Community Implementation", "inputs": {}, "datasets": {}}
    for stem in ("TALK", "KDEF"):
        parts = []
        for extension in ("IDX", "GRP"):
            name = f"{stem}.{extension}"
            data = (root / name).read_bytes()
            result["inputs"][name] = {"size": len(data), "sha256": hashlib.sha256(data).hexdigest()}
            parts.append(data)
        index, data = parts
        if len(index) % 4:
            raise ValueError(f"{stem}: unaligned candidate index")
        ends = struct.unpack("<" + "I" * (len(index) // 4), index)
        if not ends or list(ends) != sorted(ends) or ends[-1] != len(data):
            raise ValueError(f"{stem}: candidate index does not fit")
        chunks = [data[start:end] for start, end in zip((0,) + ends[:-1], ends)]
        row = {"records": len(chunks), "empty": sum(not x for x in chunks),
               "oddBytes": sum(len(x) % 2 for x in chunks),
               "minBytes": min(map(len, chunks)), "maxBytes": max(map(len, chunks))}
        if stem == "TALK":
            transformed = [bytes(value ^ 0xFF for value in chunk) for chunk in chunks]
            row["xorFFTerminalIds"] = [i for i, chunk in enumerate(transformed) if chunk.endswith(b"\xff")]
            # Source maps decoded FF to NUL. Keep transformation separate from text decoding.
            texts = [chunk.replace(b"\xff", b"\0") for chunk in transformed]
            row["codecs"] = {}
            for codec in ("big5", "cp950", "gbk"):
                failures = []
                for record_id, chunk in enumerate(texts):
                    try:
                        chunk.decode(codec, errors="strict")
                    except UnicodeDecodeError as error:
                        failures.append({"id": record_id, "offset": error.start,
                                         "hex": chunk[error.start:error.end].hex()})
                row["codecs"][codec] = {"success": len(texts) - len(failures), "failures": failures}
        result["datasets"][stem] = row
    return result


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python tools/analyzer/probe_dialogue_events.py <original-directory>")
    print(json.dumps(probe(Path(sys.argv[1])), ensure_ascii=True, indent=2))
