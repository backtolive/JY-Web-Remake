"""Reversible synthetic KDEF opcode probe in the ignored DOSBox-X game copy."""

import argparse
import hashlib
import json
import pathlib
import struct


BASELINE_SHA256 = "135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06"
EVENTS = {
    1017: (121188, 26, "d4a349215b38f7f14a913aab14367064f0e46b728ae79fff321e1c277094c6aa"),
    464: (71352, 210, "0a23ad50eb196bf088274a3187b6cca485bf08646fdda1e658439c688f69eff4"),
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("game_dir", type=pathlib.Path)
    parser.add_argument("evidence_dir", type=pathlib.Path)
    parser.add_argument("--restore", action="store_true")
    parser.add_argument("--opcode", type=int, choices=(0, 15, 55, 65), default=55)
    parser.add_argument("--visual-probe", choices=("with-zero", "without-zero"))
    parser.add_argument("--slot-write-probe", action="store_true",
                        help="Isolate the event 581 opcode-3 argument shape in spare event 464")
    parser.add_argument("--equal-jump", type=int, default=3)
    parser.add_argument("--unequal-jump", type=int, default=0)
    parser.add_argument("--compare-value", type=int, default=-1)
    parser.add_argument("--terminal-code", type=int, default=83,
                        help="Synthetic opcode 15 second word, for an isolated parameter contrast")
    args = parser.parse_args()
    if not 0 <= args.terminal_code <= 32767:
        raise SystemExit("Synthetic opcode 15 second word must be 0..32767")
    game = args.game_dir.resolve(strict=True)
    evidence = args.evidence_dir.resolve()
    path = game / "KDEF.GRP"
    backup = evidence / "original-KDEF.GRP"
    manifest_path = evidence / "manifest.json"
    if args.slot_write_probe and args.visual_probe:
        raise SystemExit("Choose one synthetic probe mode")
    event_id = 464 if args.visual_probe or args.slot_write_probe else 1017
    event_offset, event_length, event_sha256 = EVENTS[event_id]
    if args.slot_write_probe:
        # Exact 13-argument shape from original event 581 word 15; no neighbouring 14/0/13.
        words = (3, -2, 2, 0, 0, -1, -1, -1, -1, -1, -1, -2, -2, -2, 7)
        probe_words = words + (-1,) * (event_length // 2 - len(words))
    elif args.visual_probe:
        # Synthetic event edit: disable the current event's image, then end.
        words = (3, -2, 0, 0, 0, -1, -1, -1, -1, -1, -1, -2, -2, -2)
        if args.visual_probe == "with-zero":
            words += (0,)
        words += (7,)
        probe_words = words + (-1,) * (event_length // 2 - len(words))
    elif args.opcode == 55:
        probe_words = (55, 2, args.compare_value, args.equal_jump, args.unequal_jump,
                       2, 57, 1, 7, -1, -1, -1, -1)
    elif args.opcode == 15:
        probe_words = (15, args.terminal_code, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1)
    else:
        probe_words = (args.opcode, 2, 57, 1, 7, -1, -1, -1, -1, -1, -1, -1, -1)
    probe_event = struct.pack(f"<{len(probe_words)}h", *probe_words)
    current = path.read_bytes()

    if args.restore:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        original = backup.read_bytes()
        if sha256(current) != manifest["patchedSha256"]:
            raise SystemExit("Refusing restore: isolated KDEF changed after probe")
        if sha256(original) != manifest["baselineSha256"]:
            raise SystemExit("Refusing restore: backup hash mismatch")
        path.write_bytes(original)
        if sha256(path.read_bytes()) != BASELINE_SHA256:
            raise SystemExit("Restore verification failed")
        print(json.dumps({"restoredSha256": BASELINE_SHA256}))
        return

    if evidence.exists():
        raise SystemExit("Evidence directory already exists; refusing overwrite")
    original_event = current[event_offset:event_offset + event_length]
    if sha256(current) != BASELINE_SHA256 or sha256(original_event) != event_sha256:
        raise SystemExit("Refusing patch: isolated KDEF baseline mismatch")
    evidence.mkdir(parents=True)
    backup.write_bytes(current)
    patched = bytearray(current)
    patched[event_offset:event_offset + event_length] = probe_event
    path.write_bytes(patched)
    manifest = {
        "classification": "Synthetic Script / original DOS interpreter probe",
        "gameCopy": str(game),
        "file": "KDEF.GRP",
        "eventId": event_id,
        "sourceOffset": event_offset,
        "byteLength": event_length,
        "baselineSha256": BASELINE_SHA256,
        "originalEventSha256": sha256(original_event),
        "probeEventSha256": sha256(probe_event),
        "patchedSha256": sha256(patched),
        "probeWords": probe_words,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest))


if __name__ == "__main__":
    main()
