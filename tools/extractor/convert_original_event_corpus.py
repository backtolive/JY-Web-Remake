"""Lossless local conversion of all KDEF/TALK records into a traceable corpus.

The FishEdit table is used only to split candidate instruction boundaries. This
does not claim original-DOS semantics and the output is not executable content.
Commercial source-derived text is written only to the ignored generated folder.
"""
import base64
import hashlib
import json
import struct
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "analyzer"))
from audit_fishedit_layout import source_table


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def ranges_from_index(index, group_length):
    if len(index) % 4:
        raise ValueError("IDX_UNALIGNED")
    ends = list(struct.unpack("<" + "I" * (len(index) // 4), index))
    if not ends or ends != sorted(ends) or ends[-1] != group_length:
        raise ValueError("IDX_BOUNDS")
    starts = [0, *ends[:-1]]
    return [(start, end) for start, end in zip(starts, ends)]


def talk_tokens(raw):
    if not raw:
        raise ValueError("TALK_EMPTY")
    transformed = bytes(value ^ 0xFF for value in raw)
    if transformed[-1] != 0xFF:
        raise ValueError("TALK_TERMINATOR")
    payload = transformed[:-1]
    tokens, start = [], 0

    def flush(end):
        if end <= start:
            return
        chunk = payload[start:end]
        try:
            tokens.append({"kind": "text", "text": chunk.decode("cp950", errors="strict")})
        except UnicodeDecodeError:
            tokens.append({"kind": "undecoded", "bytesHex": chunk.hex(), "codec": "CP950"})

    for offset, value in enumerate(payload):
        if value == 0x2A or value < 0x20 or value in (0x7F, 0xFF):
            flush(offset)
            tokens.append({"kind": "lineBreak" if value == 0x2A else "control", "offset": offset,
                           **({} if value == 0x2A else {"value": value})})
            start = offset + 1
    flush(len(payload))
    return {"tokens": tokens, "decoded": not any(t["kind"] == "undecoded" for t in tokens),
            "terminalOffset": len(raw) - 1, "transformedPayloadSha256": sha256(payload)}


def convert_event(event_id, source_offset, raw, table):
    if len(raw) % 2:
        raise ValueError(f"EVENT_ALIGNMENT:{event_id}")
    words = struct.unpack("<" + "h" * (len(raw) // 2), raw)
    instructions, cursor, terminated = [], 0, False
    while cursor < len(words):
        opcode = words[cursor]
        byte_offset = source_offset + cursor * 2
        if opcode == -1:
            if cursor != len(words) - 1:
                raise ValueError(f"EVENT_TRAILING_DATA:{event_id}@{cursor}")
            instructions.append({"opcode": -1, "wordOffset": cursor, "sourceByteOffset": byte_offset,
                                 "kind": "terminator", "args": []})
            terminated = True
            break
        row = table.get(opcode)
        if row is None:
            raise ValueError(f"EVENT_UNKNOWN_OPCODE:{event_id}@{cursor}:{opcode}")
        width = row["words"]
        if cursor + width > len(words):
            raise ValueError(f"EVENT_TRUNCATED:{event_id}@{cursor}:{opcode}")
        args = list(words[cursor + 1:cursor + width])
        item = {"opcode": opcode, "wordOffset": cursor, "sourceByteOffset": byte_offset,
                "kind": "instruction", "args": args, "layoutEvidence": "FishEdit 0.72 candidate"}
        targets = [cursor + width + args[slot - 1] for slot in row["branchSlots"]]
        if targets:
            item["candidateBranchTargets"] = targets
            item["branchSemantics"] = "unverified"
        if opcode == 1 and len(args) == 3:
            item["dialogueRef"] = {"talkId": args[0], "portraitId": args[1], "side": args[2]}
        if opcode == 50:
            item["executionStatus"] = "dynamic-community-variant; manual semantic adapter required"
        instructions.append(item)
        cursor += width
    if not terminated:
        raise ValueError(f"EVENT_UNTERMINATED:{event_id}")
    return instructions


def convert_corpus(original_dir, source_checkout):
    rows, table_hash = source_table(source_checkout)
    table = rows
    files = {name: (original_dir / name).read_bytes() for name in
             ("KDEF.IDX", "KDEF.GRP", "TALK.IDX", "TALK.GRP", "RANGER.IDX", "RANGER.GRP", "ALLDEF.GRP")}
    event_ranges = ranges_from_index(files["KDEF.IDX"], len(files["KDEF.GRP"]))
    talk_ranges = ranges_from_index(files["TALK.IDX"], len(files["TALK.GRP"]))
    talks = []
    for talk_id, (start, end) in enumerate(talk_ranges):
        raw = files["TALK.GRP"][start:end]
        decoded = talk_tokens(raw)
        talks.append({"id": f"original.jy:talk/{talk_id}", "talkId": talk_id,
                      "sourceFile": "TALK.GRP", "sourceOffset": start, "byteLength": len(raw),
                      "sha256": sha256(raw), "rawBase64": base64.b64encode(raw).decode("ascii"), **decoded})
    events = []
    for event_id, (start, end) in enumerate(event_ranges):
        raw = files["KDEF.GRP"][start:end]
        instructions = convert_event(event_id, start, raw, table)
        events.append({"id": f"original.jy:event/{event_id}", "eventId": event_id,
                       "sourceFile": "KDEF.GRP", "sourceOffset": start, "byteLength": len(raw),
                       "sha256": sha256(raw), "rawBase64": base64.b64encode(raw).decode("ascii"),
                       "instructions": instructions})

    # Current interaction references only; automatic/item triggers and dynamic
    # event-table writes remain explicitly outside this reference pass.
    refs, bad_refs = [], []
    ranger_ranges = ranges_from_index(files["RANGER.IDX"], len(files["RANGER.GRP"]))
    if len(ranger_ranges) != 6 or (ranger_ranges[3][1] - ranger_ranges[3][0]) % 52:
        raise ValueError("SCENE_RECORD_LAYOUT")
    scene_count = (ranger_ranges[3][1] - ranger_ranges[3][0]) // 52
    if scene_count < 0 or len(files["ALLDEF.GRP"]) < scene_count * 4400:
        raise ValueError("SCENE_EVENT_CAPACITY")
    for scene_id in range(scene_count):
        base = scene_id * 4400
        for slot_id in range(200):
            offset = base + slot_id * 22 + 4
            event_id = struct.unpack_from("<h", files["ALLDEF.GRP"], offset)[0]
            if event_id < 0:
                continue
            row = {"sceneId": scene_id, "slotId": slot_id, "eventId": event_id,
                   "sourceFile": "ALLDEF.GRP", "sourceOffset": offset}
            (refs if event_id < len(events) else bad_refs).append(row)

    return {"schemaVersion": 1, "converterVersion": "0.1.0", "classification": "original-derived-local",
            "confidence": "Community Implementation", "executable": False,
            "layoutSource": {"repository": "scarsty/kys-tools", "commit": "1d439afe76dae41c821065c3a33c1c6709dc7fce",
                             "tableSha256": table_hash},
            "inputs": [{"sourceFile": name, "byteLength": len(raw), "sha256": sha256(raw)}
                       for name, raw in files.items()],
            "summary": {"events": len(events), "instructions": sum(len(e["instructions"]) for e in events),
                        "dialogues": len(talks), "talkDecodeFailures": sum(not t["decoded"] for t in talks),
                        "dynamicOpcode50": sum(i["opcode"] == 50 for e in events for i in e["instructions"]),
                        "currentInteractionReferences": len(refs), "invalidCurrentInteractionReferences": len(bad_refs)},
            "eventReferences": refs, "invalidEventReferences": bad_refs,
            "limits": ["Instruction boundaries are FishEdit-derived, not verified against original DOS execution.",
                       "Opcode arguments are preserved without assigning state effects.",
                       "Opcode 50, branches, reachability, automatic triggers, and post-event state are not interpreted."],
            "events": events, "talks": talks}


def write_local_bundle(project, bundle):
    root = project / "assets" / "generated"
    output = root / "event-corpus"
    # Avoid following symlinks/junctions: every existing path component must be a directory.
    def is_link_or_junction(path):
        return path.is_symlink() or (hasattr(path, "is_junction") and path.is_junction())

    for current in (project, project / "assets", root):
        if is_link_or_junction(current) or not current.is_dir():
            raise ValueError(f"UNSAFE_OUTPUT_PATH:{current}")
    output.mkdir(parents=True, exist_ok=True)
    if is_link_or_junction(output) or not output.is_dir():
        raise ValueError("UNSAFE_OUTPUT_DIRECTORY")
    serialized = json.dumps(bundle, ensure_ascii=False, indent=2) + "\n"
    digest = sha256(serialized.encode("utf-8"))[:16]
    destination = output / f"all-events-{digest}.local.json"
    try:
        with destination.open("x", encoding="utf-8", newline="\n") as stream:
            stream.write(serialized)
    except FileExistsError:
        if destination.read_text(encoding="utf-8") != serialized:
            raise
    return destination


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("Usage: python convert_original_event_corpus.py <original-directory> <pinned-source-checkout> <project-root>")
    try:
        bundle = convert_corpus(Path(sys.argv[1]), Path(sys.argv[2]))
        destination = write_local_bundle(Path(sys.argv[3]), bundle)
        print(json.dumps({"destination": str(destination), "summary": bundle["summary"]}, ensure_ascii=False, indent=2))
    except (OSError, ValueError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
