"""Read-only source-backed structure audit, not a DOS interpreter or converter."""
import hashlib
import json
import re
import struct
import subprocess
import sys
from collections import Counter
from pathlib import Path

COMMIT = "1d439afe76dae41c821065c3a33c1c6709dc7fce"
SOURCE = "修改器/fishedit0.72_src/FishEdit.ini"


def audit_words(words, table):
    """Check lexical widths and declared branch destinations; never execute rules."""
    cursor, starts, targets, instructions = 0, set(), [], []
    while cursor < len(words):
        starts.add(cursor)
        opcode = words[cursor]
        if opcode == -1:
            if cursor != len(words) - 1:
                return {"error": "trailing-data", "wordOffset": cursor}
            break
        if opcode not in table:
            return {"error": "unknown-opcode", "wordOffset": cursor, "value": opcode}
        row = table[opcode]
        width = row["words"]
        if cursor + width > len(words):
            return {"error": "truncated-instruction", "wordOffset": cursor}
        for slot in row["branchSlots"]:
            targets.append({"from": cursor, "slot": slot, "target": cursor + width + words[cursor + slot]})
        instructions.append({"offset": cursor, "opcode": opcode})
        cursor += width
    else:
        return {"error": "missing-terminal", "wordOffset": cursor}
    bad = [target for target in targets if target["target"] not in starts]
    return {"instructions": instructions, "branchChecks": len(targets), "invalidTargets": bad}


def audit(root, checkout):
    head = subprocess.check_output(["git", "-C", str(checkout), "rev-parse", "HEAD"], text=True).strip()
    if head != COMMIT:
        raise ValueError("Unexpected source commit")
    raw = subprocess.check_output(["git", "-C", str(checkout), "show", "HEAD:" + SOURCE])
    table = {}
    for line_number, line in enumerate(raw.decode("gb18030").splitlines(), 1):
        match = re.match(r"\s*Attrib(\d+)\s*=\s*\S+\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+", line, re.I)
        if match:
            opcode, width, branch, yes, no = map(int, match.groups())
            if opcode in table or width < 1 or (branch and not (0 < yes < width and 0 < no < width)):
                raise ValueError("Unexpected source table shape")
            table[opcode] = {"opcode": opcode, "words": width, "sourceLine": line_number,
                             "branchSlots": [yes, no] if branch else []}
    if sorted(table) != list(range(68)):
        raise ValueError("Expected 68 source entries")
    # Keep INI semantics intact. Opcode 50 has a branch description in a different
    # document, but active INI disables branch annotation; no silent override.
    idx, data = [(root / name).read_bytes() for name in ("KDEF.IDX", "KDEF.GRP")]
    if len(idx) % 4:
        raise ValueError("Unaligned index")
    ends = struct.unpack("<" + "I" * (len(idx) // 4), idx)
    if not ends or list(ends) != sorted(ends) or ends[-1] != len(data):
        raise ValueError("Invalid index bounds")
    events, histogram = [], Counter()
    for event_id, (start, end) in enumerate(zip((0,) + ends[:-1], ends)):
        if (end - start) % 2:
            events.append({"event": event_id, "error": "odd-length"})
            continue
        words = struct.unpack("<" + "h" * ((end - start) // 2), data[start:end])
        row = audit_words(words, table)
        histogram.update(x["opcode"] for x in row.get("instructions", []))
        # Do not export all instructions or game content; retain aggregate evidence.
        count = len(row.pop("instructions", []))
        events.append({"event": event_id, "instructionCount": count, **row})
    return {"auditVersion": "0.1.0", "confidence": "Community Implementation",
            "sourceCommit": COMMIT, "sourcePath": SOURCE, "sourceSha256": hashlib.sha256(raw).hexdigest(),
            "inputHashes": {"KDEF.IDX": hashlib.sha256(idx).hexdigest(), "KDEF.GRP": hashlib.sha256(data).hexdigest()},
            "table": list(table.values()), "events": events, "histogram": dict(sorted(histogram.items())),
            "limitations": "Lexical layout and declared branch boundaries only; opcode 50 branch slots not enabled in active INI. No runtime or original behavior verification."}


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python audit_fishedit_layout.py <original-directory> <pinned-checkout>")
    print(json.dumps(audit(Path(sys.argv[1]), Path(sys.argv[2])), ensure_ascii=True, indent=2))
