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

VERIFIED_DOS_55_KDEF_SHA256 = "135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06"
VERIFIED_DOS_55_KDEF_INDEX_SHA256 = "bf02eccf1dab01fd0ae033cdf807f56b978a71a6c2ab9be05e366239b485104b"
DOS_55_EVIDENCE = "docs/validation/opcode-55-original-event464-trace-20261114.md"
DOS_3_AFTER_55_EVIDENCE = "docs/validation/opcode-3-after-55-event464-fields-20261115.md"


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


def convert_event(event_id, source_offset, raw, table, *, verified_dos_55=False):
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
        if opcode == 55 and verified_dos_55:
            if args[1:] != [-1, 14, 0] or cursor + 5 >= len(words) or words[cursor + 5] != 3:
                raise ValueError(f"DOS_55_EVIDENCE_SCOPE:{event_id}@{cursor}")
            # This DOS build took five words, then the helper returned -1.
            # The resulting cursor lands on the final candidate parameter (0).
            item["originalDosCursor"] = {
                "nextWordOffset": cursor + 4,
                "nextWordValue": words[cursor + 4],
                "evidence": "Verified Original" if event_id == 464 else "Inferred from same-shape source bytes",
                "evidencePath": DOS_55_EVIDENCE,
                "runtimeEffectVerified": event_id == 464,
            }
        if opcode == 3 and verified_dos_55 and instructions and instructions[-1]["opcode"] == 55:
            previous = instructions[-1]
            if len(args) != 13 or args[0] != -2 or args[2:4] != [-2, -2] or args[5:] != [-1, -1, -2, -2, -2, -2, -2, -2]:
                raise ValueError(f"DOS_3_AFTER_55_EVIDENCE_SCOPE:{event_id}@{cursor}")
            # These are observed writes, not a generic interpretation of all
            # thirteen arguments. The -2 fields still lack a contrast probe.
            first_verified_update = event_id == 464 and cursor == 33
            item["originalDosEventUpdate"] = {
                "sceneSelector": -2,
                "precedingOpcode55CheckedSlot": previous["args"][0],
                "targetSlot": args[1],
                "candidateFieldWrites": {"2": args[4], "3": -1, "4": -1},
                "eventIdWriteEvidence": "Verified Original" if event_id == 464 else "Inferred from same-shape source bytes",
                "negativeOneWriteEvidence": "Verified Original" if first_verified_update else "Inferred from same-shape source bytes",
                "pictureFieldsFiveAndSixPreservedEvidence": "Verified Original" if first_verified_update else "Unknown",
                "evidencePath": DOS_3_AFTER_55_EVIDENCE,
                "executable": False,
            }
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
    verified_dos_55 = (sha256(files["KDEF.GRP"]) == VERIFIED_DOS_55_KDEF_SHA256
                       and sha256(files["KDEF.IDX"]) == VERIFIED_DOS_55_KDEF_INDEX_SHA256)
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
        instructions = convert_event(event_id, start, raw, table, verified_dos_55=verified_dos_55)
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

    dos_55_count = sum("originalDosCursor" in instruction for event in events for instruction in event["instructions"])
    dos_3_after_55_count = sum("originalDosEventUpdate" in instruction for event in events for instruction in event["instructions"])
    if verified_dos_55 and (dos_55_count != 28 or dos_3_after_55_count != 28):
        raise ValueError(f"DOS_55_EVIDENCE_COUNT:{dos_55_count}:{dos_3_after_55_count}")

    return {"schemaVersion": 1, "converterVersion": "0.3.0", "classification": "original-derived-local",
            "confidence": "Community Implementation", "executable": False,
            "layoutSource": {"repository": "scarsty/kys-tools", "commit": "1d439afe76dae41c821065c3a33c1c6709dc7fce",
                             "tableSha256": table_hash},
            "inputs": [{"sourceFile": name, "byteLength": len(raw), "sha256": sha256(raw)}
                       for name, raw in files.items()],
            "summary": {"events": len(events), "instructions": sum(len(e["instructions"]) for e in events),
                        "dialogues": len(talks), "talkDecodeFailures": sum(not t["decoded"] for t in talks),
                        "dynamicOpcode50": sum(i["opcode"] == 50 for e in events for i in e["instructions"]),
                        "currentInteractionReferences": len(refs), "invalidCurrentInteractionReferences": len(bad_refs),
                        "scopedDosOpcode55Cursors": dos_55_count,
                        "scopedDosOpcode3After55Updates": dos_3_after_55_count},
            "eventReferences": refs, "invalidEventReferences": bad_refs,
            "limits": ["Instruction boundaries are FishEdit-derived, not verified against original DOS execution.",
                       "Opcode arguments are preserved without assigning state effects.",
                       "Opcode 50, branches, reachability, automatic triggers, and post-event state are not interpreted.",
                       "Opcode 55 cursor annotations apply only to the pinned KDEF/IDX hashes; 24 of 28 occurrences have identical source bytes but no individual DOS replay.",
                       "Opcode 3 updates after opcode 55 are scoped observations, not general opcode 3 semantics or executable events."],
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
