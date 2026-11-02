"""Collect 15/50 structural evidence; does not evaluate inventory or run events."""
import json
import struct
import sys
from collections import Counter
from pathlib import Path

from audit_fishedit_layout import audit


def probe(root, source):
    report = audit(root, source)
    if any("error" in event or event["invalidTargets"] for event in report["events"]):
        raise ValueError("Candidate layout must pass before behavior probes")
    table = {row["opcode"]: row["words"] for row in report["table"]}
    index = (root / "KDEF.IDX").read_bytes()
    data = (root / "KDEF.GRP").read_bytes()
    ends = struct.unpack("<" + "I" * (len(index) // 4), index)
    values15, cases50 = Counter(), []
    for event_id, (start, end) in enumerate(zip((0,) + ends[:-1], ends)):
        words = struct.unpack("<" + "h" * ((end - start) // 2), data[start:end])
        cursor, boundaries, pending = 0, set(), []
        while words[cursor] != -1:
            boundaries.add(cursor)
            opcode = words[cursor]
            if opcode == 15:
                values15[words[cursor + 1]] += 1
            if opcode == 50:
                pending.append({"event": event_id, "wordOffset": cursor,
                                "parameters": list(words[cursor + 1:cursor + 8]),
                                "candidateTargets": [cursor + 8 + words[cursor + 6], cursor + 8 + words[cursor + 7]]})
            cursor += table[opcode]
        boundaries.add(cursor)
        for case in pending:
            case["targetsOnBoundaries"] = all(target in boundaries for target in case["candidateTargets"])
            cases50.append(case)
    return {"probeVersion": "0.1.0", "confidence": "Community Implementation",
            "layoutSourceCommit": report["sourceCommit"],
            "behaviorReferenceCommit": "4d225cb9b7b9a3ac46a796ecb0acde525ef72acc",
            "inputHashes": report["inputHashes"], "opcode15ArgumentHistogram": dict(values15),
            "opcode50Candidates": cases50,
            "limitations": "No DOS execution; opcode50 slots6/7 checked separately from active FishEdit INI. No inventory or control-flow simulation."}


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python probe_opcode_behavior.py <original-directory> <kys-tools-checkout>")
    print(json.dumps(probe(Path(sys.argv[1]), Path(sys.argv[2])), ensure_ascii=True, indent=2))
