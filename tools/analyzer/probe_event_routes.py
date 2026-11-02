"""Read-only candidate scene references, not proof of DOS reachability."""
import hashlib
import json
import struct
import sys
from pathlib import Path
from audit_fishedit_layout import audit


def probe(root, source):
    result = {"probeVersion": "0.3.0", "confidence": "Community Implementation",
              "sourceCommit": "4d225cb9b7b9a3ac46a796ecb0acde525ef72acc",
              "targetEvent": 676, "inputs": {}, "references": []}
    direct = []
    # Pascal DData[scene, slot, field], fields 2/3/4 call event scripts.
    for name in ("ALLDEF.GRP", "D1.GRP"):
        data = (root / name).read_bytes()
        if len(data) % (200 * 11 * 2):
            raise ValueError(f"{name}: incomplete candidate scene block")
        result["inputs"][name] = {"size": len(data), "sha256": hashlib.sha256(data).hexdigest()}
        for offset in range(0, len(data), 22):
            fields = struct.unpack_from("<11h", data, offset)
            for field in (2, 3, 4):
                if fields[field] >= 0:
                    direct.append({"file": name, "scene": offset // 4400,
                        "slot": (offset % 4400) // 22, "field": field, "event": fields[field],
                        "byteOffset": offset + field * 2})
    layout = audit(root, source)
    if any("error" in event or event["invalidTargets"] for event in layout["events"]):
        raise ValueError("Candidate instruction layout must pass")
    widths = {row["opcode"]: row["words"] for row in layout["table"]}
    result["layoutSourceCommit"] = layout["sourceCommit"]
    result["scriptInputHashes"] = layout["inputHashes"]
    assignments = []
    ends = struct.unpack("<" + "I" * ((root / "KDEF.IDX").stat().st_size // 4), (root / "KDEF.IDX").read_bytes())
    data = (root / "KDEF.GRP").read_bytes()
    for event, (start, end) in enumerate(zip((0,) + ends[:-1], ends)):
        words = struct.unpack("<" + "h" * ((end - start) // 2), data[start:end])
        cursor = 0
        while words[cursor] != -1:
            if words[cursor] == 3:
                params = words[cursor + 1:cursor + 14]
                for field in (2, 3, 4):
                    if params[field + 2] >= 0:
                        assignments.append({"event": event, "wordOffset": cursor,
                            "targetEvent": params[field + 2], "sceneParameter": params[0],
                            "slotParameter": params[1], "field": field})
            cursor += widths[words[cursor]]
    # Backward assignment closure is finite even when scripts reference themselves.
    relevant = {676}
    while True:
        predecessors = {row["event"] for row in assignments if row["targetEvent"] in relevant}
        if predecessors <= relevant:
            break
        relevant.update(predecessors)
    result["candidateEventClosure"] = sorted(relevant)
    result["references"] = [row for row in direct if row["event"] in relevant]
    result["candidateAssignments"] = [row for row in assignments if row["targetEvent"] in relevant]
    scenes = {row["scene"] for row in result["references"]}
    scenes.update(row["sceneParameter"] for row in result["candidateAssignments"] if row["sceneParameter"] >= 0)
    result["candidateSceneContext"] = []
    result["candidateInventory"] = []
    for record_name, map_name, event_name in (("RANGER", "ALLSIN.GRP", "ALLDEF.GRP"),
                                               ("R1", "S1.GRP", "D1.GRP")):
        def read(name):
            raw = (root / name).read_bytes()
            result["inputs"][name] = {"size": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}
            return raw
        index = read(record_name + ".IDX")
        record = read(record_name + ".GRP")
        if len(index) != 24:
            raise ValueError("Expected candidate six-boundary record index")
        bounds = struct.unpack("<6I", index)
        if list(bounds) != sorted(bounds) or bounds[-1] != len(record):
            raise ValueError("Invalid candidate record bounds")
        if bounds[0] != 836 or (bounds[2] - bounds[1]) % 190:
            raise ValueError("Candidate base/item layout mismatch")
        inventory = [struct.unpack_from("<2h", record, 36 + slot * 4) for slot in range(200)]
        for item in range(138, 143):
            item_start = bounds[1] + item * 190
            if item_start + 190 > bounds[2]:
                raise ValueError("Candidate required item out of bounds")
            result["candidateInventory"].append({"record": record_name, "item": item,
                "nameCp950": record[item_start + 2:item_start + 22].split(b"\0")[0].decode("cp950"),
                "matchingSlots": [{"slot": slot, "quantity": quantity}
                                  for slot, (number, quantity) in enumerate(inventory) if number == item]})
        maps, events = read(map_name), read(event_name)
        for scene in sorted(scenes):
            if (scene + 1) * 52 > bounds[3] - bounds[2] or (scene + 1) * 49152 > len(maps) or (scene + 1) * 4400 > len(events):
                raise ValueError("Candidate scene out of bounds")
            start = bounds[2] + scene * 52
            slot = struct.unpack_from("<11h", events, scene * 4400)
            layer = struct.unpack_from("<4096h", maps, scene * 49152 + 3 * 8192)
            result["candidateSceneContext"].append({"record": record_name, "scene": scene,
                "nameCp950": record[start + 2:start + 12].split(b"\0")[0].decode("cp950"),
                "entranceRawWordsAt20": list(struct.unpack_from("<4h", record, start + 20)),
                "slot0ScriptFields": list(slot[2:5]),
                "slot0MapCells": [{"arrayIndex1": cell // 64, "arrayIndex2": cell % 64}
                                  for cell, value in enumerate(layer) if value == 0]})
    result["limitations"] = "Candidate layout and slot0 map cells only; no passability, enable flags, assignment reachability, inventory, or DOS reachability evaluated. Map array indices are not screen coordinates. -2 parameters require runtime context. Closure covers opcode3 assignments only, not every indirect call. No route is proven playable."
    return result


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python probe_event_routes.py <original-directory> <kys-tools-checkout>")
    print(json.dumps(probe(Path(sys.argv[1]), Path(sys.argv[2])), indent=2))
