"""Audit compatibility against a pinned community dispatch table, not a DOS VM.

Stops each event at unknown/truncated/dynamic instructions; never guesses widths.
"""
import hashlib
import json
import re
import struct
import subprocess
import sys
from collections import Counter
from pathlib import Path

COMMIT = "4d225cb9b7b9a3ac46a796ecb0acde525ef72acc"


def source_table(checkout):
    head = subprocess.check_output(["git", "-C", str(checkout), "rev-parse", "HEAD"], text=True).strip()
    if head != COMMIT:
        raise ValueError("Unexpected source commit")
    # Read committed bytes, so an edited checkout cannot silently change evidence.
    raw = subprocess.check_output(["git", "-C", str(checkout), "show", "HEAD:kys_main.pas"])
    text = raw.decode("utf-8-sig").replace("\r\n", "\n")
    start = text.index("      case e[i] of", text.index("procedure CallEvent(num: integer);", text.index("implementation")))
    stop = text.index("        else\n        begin\n          i := i + 1;", start)
    region = text[start:stop]
    labels = list(re.finditer(r"^        (\d+):", region, re.M))
    rows = []
    for i, label in enumerate(labels):
        body = region[label.end():labels[i + 1].start() if i + 1 < len(labels) else len(region)]
        steps = re.findall(r"i := i \+ (\d+);", body)
        if len(steps) != 1:
            raise ValueError("Unexpected dispatcher shape; review source manually")
        slots = [int(n) for n in re.findall(r"e\[i \+ (\d+)\]", body)]
        width = int(steps[0])
        if max(slots, default=0) + 1 != width:
            raise ValueError("Unexpected parameter/width mismatch")
        rows.append({"opcode": int(label[1]), "words": width, "parameters": width - 1,
                     "sourceLine": text[:start + label.start()].count("\n") + 1,
                     "control": "dynamic" if int(label[1]) == 50 else
                     "conditional" if re.search(r"i := i \+ instruct_", body) else
                     "stop" if "break;" in body else "next"})
    if [row["opcode"] for row in rows] != list(range(68)):
        raise ValueError("Expected all 68 community dispatcher entries")
    return rows, hashlib.sha256(raw).hexdigest()


def audit(root, checkout):
    rows, source_hash = source_table(checkout)
    table = {row["opcode"]: row for row in rows}
    idx = (root / "KDEF.IDX").read_bytes()
    data = (root / "KDEF.GRP").read_bytes()
    if len(idx) % 4:
        raise ValueError("Unaligned index")
    ends = struct.unpack("<" + "I" * (len(idx) // 4), idx)
    if not ends or list(ends) != sorted(ends) or ends[-1] != len(data):
        raise ValueError("Invalid candidate boundaries")
    failures, completed, histogram = [], [], Counter()
    for event_id, (start, end) in enumerate(zip((0,) + ends[:-1], ends)):
        if (end - start) % 2:
            failures.append({"event": event_id, "reason": "odd-length"})
            continue
        words = struct.unpack("<" + "h" * ((end - start) // 2), data[start:end])
        cursor = 0
        while cursor < len(words):
            opcode = words[cursor]
            if opcode < 0:
                if opcode == -1 and cursor == len(words) - 1:
                    completed.append(event_id)
                else:
                    failures.append({"event": event_id, "wordOffset": cursor, "reason": "unexpected-negative-or-tail", "value": opcode})
                break
            reason = "unknown-opcode" if opcode not in table else "dynamic-opcode" if opcode == 50 else None
            if reason is None and cursor + table[opcode]["words"] > len(words):
                reason = "truncated-instruction"
            if reason:
                failures.append({"event": event_id, "wordOffset": cursor, "byteOffset": start + cursor * 2,
                                 "reason": reason, "value": opcode})
                break
            histogram[opcode] += 1
            cursor += table[opcode]["words"]
        else:
            failures.append({"event": event_id, "reason": "missing-terminal"})
    return {"auditVersion": "0.1.0", "confidence": "Community Implementation", "sourceCommit": COMMIT,
            "sourceSha256": source_hash, "inputHashes": {"KDEF.IDX": hashlib.sha256(idx).hexdigest(),
                                                         "KDEF.GRP": hashlib.sha256(data).hexdigest()},
            "table": rows, "eventCount": len(ends), "linearCompatibleEvents": completed,
            "failures": failures, "partialHistogram": dict(sorted(histogram.items())),
            "limitations": "Linear structure only; continues past execution stops to audit later branches. No reachability, branch semantics or DOS equivalence verified."}


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python audit_kdef_layout.py <original-directory> <pinned-checkout>")
    print(json.dumps(audit(Path(sys.argv[1]), Path(sys.argv[2])), ensure_ascii=True, indent=2))
