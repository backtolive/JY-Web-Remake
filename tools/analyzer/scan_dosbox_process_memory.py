"""Read-only search for a known game record in one running DOSBox-X process.

The expected record is built from the isolated save file. This does not pause or
write the guest; a match is only a candidate host address until correlated with
another controlled game action.
"""

import argparse
import ctypes
from ctypes import wintypes
import json
from pathlib import Path
import struct


class MemoryBasicInformation(ctypes.Structure):
    _fields_ = [
        ("BaseAddress", ctypes.c_void_p),
        ("AllocationBase", ctypes.c_void_p),
        ("AllocationProtect", wintypes.DWORD),
        ("PartitionId", wintypes.WORD),
        ("RegionSize", ctypes.c_size_t),
        ("State", wintypes.DWORD),
        ("Protect", wintypes.DWORD),
        ("Type", wintypes.DWORD),
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pid", type=int)
    parser.add_argument("save", type=Path)
    parser.add_argument("--scene", type=int, default=32)
    parser.add_argument("--slot", type=int, default=0)
    parser.add_argument("--expected-event", type=int, default=676)
    parser.add_argument("--needle-words", type=int, choices=range(3, 12), default=11)
    parser.add_argument("--inventory", action="store_true")
    parser.add_argument("--team", action="store_true")
    parser.add_argument("--team-candidate-roles", type=int, nargs=6,
                        metavar=("ROLE0", "ROLE1", "ROLE2", "ROLE3", "ROLE4", "ROLE5"),
                        help="Read-only search for a candidate six-role runtime team")
    parser.add_argument("--player", action="store_true")
    parser.add_argument("--role", type=int, help="Original R3 character record, 0..319")
    parser.add_argument("--save-header", action="store_true")
    parser.add_argument("--world-scene-record", type=int)
    parser.add_argument("--scene-layer", type=int, nargs=2, metavar=("SCENE", "LAYER"))
    parser.add_argument("--count-values", type=int, nargs="*", default=[])
    parser.add_argument("--cell-coordinates", type=int, nargs=2, metavar=("X", "Y"))
    parser.add_argument("--region-summary", action="store_true")
    parser.add_argument("--read-address", type=lambda value: int(value, 0))
    parser.add_argument("--max-queries", type=int, default=10000)
    parser.add_argument("--max-region-bytes", type=int, default=256 * 1024 * 1024)
    parser.add_argument("--max-results", type=int, default=20)
    args = parser.parse_args()
    if sum((args.inventory, args.team, args.team_candidate_roles is not None, args.player, args.role is not None, args.save_header, args.world_scene_record is not None, args.scene_layer is not None)) > 1:
        parser.error("Select only one record type")
    if args.team_candidate_roles is not None and (args.team_candidate_roles[0] != 0 or any(not -1 <= role < 320 for role in args.team_candidate_roles)):
        parser.error("Candidate team must start with protagonist 0 and contain roles -1..319")
    if args.role is not None and not 0 <= args.role < 320:
        parser.error("Role must be 0..319")
    if args.world_scene_record is not None and not 0 <= args.world_scene_record < 84:
        parser.error("World scene record must be 0..83")
    if args.scene_layer is not None and not (0 <= args.scene_layer[0] < 100 and 0 <= args.scene_layer[1] < 6):
        parser.error("Scene/layer must be within 0..99 / 0..5")
    if args.cell_coordinates is not None and (args.scene_layer is None or not all(0 <= value < 64 for value in args.cell_coordinates)):
        parser.error("Cell coordinates require a scene-layer and x/y within 0..63")
    if args.max_results < 1:
        parser.error("Max results must be positive")
    save_name = "S3.GRP" if args.scene_layer is not None else ("R3.GRP" if args.inventory or args.team or args.team_candidate_roles is not None or args.player or args.role is not None or args.save_header or args.world_scene_record is not None else "D3.GRP")
    expected_save = Path("assets/generated/dosbox-x/session-002/game") / save_name
    expected_save = expected_save.resolve()
    if args.save.resolve() != expected_save:
        raise SystemExit("Only the isolated session-002 game save is accepted")
    data = args.save.read_bytes()
    anchor_offset = 0
    if args.save_header:
        anchor_offset = 12
        needle = data[12:36]
        prior_event = None
        record_length = 36
    elif args.inventory:
        needle = data[36:52]
        prior_event = None
        record_length = 80
    elif args.team:
        needle = data[24:52]
        prior_event = None
        record_length = 28
    elif args.team_candidate_roles is not None:
        needle = struct.pack("<6h", *args.team_candidate_roles)
        prior_event = None
        record_length = 28
    elif args.player:
        needle = data[836:852]
        prior_event = None
        record_length = 160
    elif args.role is not None:
        role_offset = 836 + 182 * args.role
        anchor_offset = 8
        needle = data[role_offset + 8:role_offset + 18]
        prior_event = None
        record_length = 182
    elif args.world_scene_record is not None:
        scene_offset = 97076 + args.world_scene_record * 52
        needle = data[scene_offset:scene_offset + 16]
        prior_event = None
        record_length = 52
    elif args.scene_layer is not None:
        scene, layer = args.scene_layer
        scene_offset = (scene * 6 + layer) * 8192
        section = data[scene_offset:scene_offset + 8192]
        anchor_offset = next((offset for offset in range(0, 8192 - 16, 2)
                              if sum(value != 0 for value in struct.unpack_from("<8h", section, offset)) >= 4
                              and data.count(section[offset:offset + 16]) == 1), -1)
        if anchor_offset < 0:
            raise SystemExit("No unique nonzero scene-layer anchor found")
        needle = section[anchor_offset:anchor_offset + 16]
        prior_event = None
        record_length = 8192
    else:
        offset = (args.scene * 200 + args.slot) * 22
        needle = bytearray(data[offset:offset + 22])
        if len(needle) != 22:
            raise SystemExit("Event slot is out of bounds")
        prior_event = struct.unpack_from("<h", needle, 4)[0]
        struct.pack_into("<h", needle, 4, args.expected_event)
        needle = bytes(needle[:args.needle_words * 2])
        record_length = 22

    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    kernel.OpenProcess.restype = wintypes.HANDLE
    kernel.VirtualQueryEx.argtypes = [wintypes.HANDLE, ctypes.c_void_p,
                                       ctypes.POINTER(MemoryBasicInformation), ctypes.c_size_t]
    kernel.VirtualQueryEx.restype = ctypes.c_size_t
    kernel.ReadProcessMemory.argtypes = [wintypes.HANDLE, ctypes.c_void_p,
                                         ctypes.c_void_p, ctypes.c_size_t,
                                         ctypes.POINTER(ctypes.c_size_t)]
    kernel.ReadProcessMemory.restype = wintypes.BOOL
    kernel.CloseHandle.argtypes = [wintypes.HANDLE]
    handle = kernel.OpenProcess(0x0410, False, args.pid)
    if not handle:
        raise OSError(ctypes.get_last_error(), "OpenProcess failed")
    if args.read_address is not None:
        try:
            record_buffer = ctypes.create_string_buffer(record_length)
            record_read = ctypes.c_size_t()
            if not kernel.ReadProcessMemory(handle, ctypes.c_void_p(args.read_address),
                                            record_buffer, record_length, ctypes.byref(record_read)) or record_read.value != record_length:
                raise OSError(ctypes.get_last_error(), "ReadProcessMemory failed at exact address")
            values = struct.unpack("<" + "h" * (record_length // 2), record_buffer.raw)
            cells = ({"rowMajor": values[args.cell_coordinates[1] * 64 + args.cell_coordinates[0]],
                      "columnMajor": values[args.cell_coordinates[0] * 64 + args.cell_coordinates[1]]}
                     if args.cell_coordinates is not None else None)
            print(json.dumps({"pid": args.pid, "kind": "save-header" if args.save_header else "inventory" if args.inventory else "team-candidate" if args.team_candidate_roles is not None else "team" if args.team else "role" if args.role is not None else "player" if args.player else "world-scene" if args.world_scene_record is not None else "scene-layer" if args.scene_layer is not None else "event-slot",
                              "address": hex(args.read_address),
                              "words": list(values) if args.scene_layer is None else None,
                              "counts": {str(value): values.count(value) for value in args.count_values} if args.scene_layer is not None else None,
                              "cells": cells}))
        finally:
            kernel.CloseHandle(handle)
        return
    matches = []
    matched_records = []
    scanned = 0
    regions = 0
    readable_regions = []
    queries = 0
    try:
        address = 0
        maximum = 0x00007FFFFFFFFFFF
        while address < maximum:
            queries += 1
            if queries > args.max_queries:
                break
            info = MemoryBasicInformation()
            if not kernel.VirtualQueryEx(handle, ctypes.c_void_p(address), ctypes.byref(info), ctypes.sizeof(info)):
                break
            base = int(info.BaseAddress or 0)
            size = int(info.RegionSize)
            next_address = base + size
            if next_address <= address:
                break
            if info.State == 0x1000 and info.Protect & 0xFF in (2, 4, 8, 0x20, 0x40, 0x80) and not info.Protect & 0x100:
                regions += 1
                if args.region_summary:
                    readable_regions.append((base, size, info.Protect))
                    address = next_address
                    continue
                if size > args.max_region_bytes:
                    address = next_address
                    continue
                position = base
                carry = b""
                while position < next_address:
                    count = min(4 * 1024 * 1024, next_address - position)
                    buffer = ctypes.create_string_buffer(count)
                    read = ctypes.c_size_t()
                    success = kernel.ReadProcessMemory(handle, ctypes.c_void_p(position), buffer,
                                                       count, ctypes.byref(read))
                    if success and read.value:
                        block = carry + buffer.raw[:read.value]
                        start = 0
                        while (found := block.find(needle, start)) >= 0:
                            matched_address = position - len(carry) + found - anchor_offset
                            matches.append(matched_address)
                            if len(matched_records) < args.max_results:
                                record_buffer = ctypes.create_string_buffer(record_length)
                                record_read = ctypes.c_size_t()
                                if kernel.ReadProcessMemory(handle, ctypes.c_void_p(matched_address),
                                                            record_buffer, record_length, ctypes.byref(record_read)) and record_read.value == record_length:
                                    values = struct.unpack("<" + "h" * (record_length // 2), record_buffer.raw)
                                    cells = ({"rowMajor": values[args.cell_coordinates[1] * 64 + args.cell_coordinates[0]],
                                              "columnMajor": values[args.cell_coordinates[0] * 64 + args.cell_coordinates[1]]}
                                             if args.cell_coordinates is not None else None)
                                    matched_records.append({"address": hex(matched_address),
                                                            "words": list(values) if args.scene_layer is None else None,
                                                            "counts": {str(value): values.count(value) for value in args.count_values} if args.scene_layer is not None else None,
                                                            "cells": cells})
                            start = found + 1
                        carry = block[-(len(needle) - 1):]
                        scanned += read.value
                    else:
                        carry = b""
                    position += count
            address = next_address
    finally:
        kernel.CloseHandle(handle)
    if args.region_summary:
        print(json.dumps({"pid": args.pid, "readableRegions": len(readable_regions),
               "queries": queries, "lastAddress": hex(address),
               "totalReadableBytes": sum(size for _, size, _ in readable_regions),
               "largestRegions": [(hex(base), size, protection)
                                  for base, size, protection in sorted(readable_regions, key=lambda row: row[1], reverse=True)[:25]]}))
        return
    print(json.dumps({"pid": args.pid, "kind": "save-header" if args.save_header else "inventory" if args.inventory else "team-candidate" if args.team_candidate_roles is not None else "team" if args.team else "role" if args.role is not None else "player" if args.player else "world-scene" if args.world_scene_record is not None else "scene-layer" if args.scene_layer is not None else "event-slot",
           "scene": args.scene, "slot": args.slot,
           "saveEvent": prior_event, "expectedMemoryEvent": args.expected_event,
           "needleWords": args.needle_words,
           "scannedBytes": scanned, "regions": regions,
           "candidateCount": len(matches),
           "candidateHostAddresses": [hex(value) for value in matches[:args.max_results]],
           "candidateRecords": matched_records}))


if __name__ == "__main__":
    main()
