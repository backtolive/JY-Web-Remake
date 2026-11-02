"""Snapshot local original-game evidence; copies remain under ignored assets/generated.

This does not execute events or mark any rule Verified Original.
"""
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[2]


def capture(session, case_id):
    session = session.resolve()
    allowed = (PROJECT / "assets/generated").resolve()
    if not session.is_relative_to(allowed) or session == allowed:
        raise ValueError("Session must be inside assets/generated")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,63}", case_id):
        raise ValueError("Use a simple case ID without paths")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    destination = session / "evidence" / f"{case_id}-{stamp}"
    destination.mkdir(parents=True, exist_ok=False)
    manifest = {"schemaVersion": 1, "caseId": case_id, "capturedAtUtc": stamp,
                "status": "Evidence captured; behavior assertions require review",
                "emulatorRelease": "2026.10.01", "files": [], "missing": []}
    # Snapshot the relevant saves, their scene/event companions, and current
    # working scene buffers. Do not assume a successfully loaded save is initial.
    relative_paths = ["dosbox-x.conf", "dosbox-x.log"]
    relative_paths += ["game/" + name for name in (
        "RANGER.IDX", "RANGER.GRP", "R1.IDX", "R1.GRP", "S1.IDX", "S1.GRP", "D1.IDX", "D1.GRP",
        "ALLSINBK.GRP", "ALLDEFBK.GRP", "KDEF.IDX", "KDEF.GRP", "TALK.IDX", "TALK.GRP")]
    images = sorted((session / "capture").glob("*.png"))
    if not images:
        raise ValueError("No emulator PNG screenshots found; capture evidence first")
    relative_paths += [str(image.relative_to(session)) for image in images]
    for relative in relative_paths:
        source = session / relative
        if not source.exists():
            manifest["missing"].append(relative)
            continue
        if not source.resolve().is_relative_to(session):
            raise ValueError("Evidence source points outside the session")
        before = source.stat()
        data = source.read_bytes()
        after = source.stat()
        if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
            raise ValueError(f"Evidence changed while reading: {relative}; retry at a stable game state")
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        manifest["files"].append({"path": relative, "size": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    exe = PROJECT / "assets/generated/dosbox-x/runtime-2026.10.01/mingw-build/mingw-sdl2/dosbox-x.exe"
    manifest["emulatorSha256"] = hashlib.sha256(exe.read_bytes()).hexdigest()
    # Last write is the completion marker. A directory without manifest is incomplete.
    (destination / "manifest.local.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return destination


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python capture_original_evidence.py <session-directory> <case-id>")
    print(capture(Path(sys.argv[1]), sys.argv[2]))
