"""Prepare a reversible isolated DOS save for original-event observation.

This is a synthetic test state, not an original save or verified field schema.
"""

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import struct


FILES = ("R", "S", "D")
EXTENSIONS = ("GRP", "IDX")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("game_dir", type=Path)
    parser.add_argument("evidence_dir", type=Path)
    parser.add_argument("--restore", action="store_true")
    parser.add_argument("--source-slot", type=int, choices=(1, 2, 3), default=1)
    parser.add_argument("--world-scene", type=int)
    parser.add_argument("--first-coordinate-offset", type=int, default=3)
    parser.add_argument("--second-coordinate-offset", type=int, default=0)
    parser.add_argument("--unlock-scene", action="store_true")
    parser.add_argument("--spawn-near-event", type=int)
    parser.add_argument("--align-jump2-spawn", action="store_true",
                        help="Also set the scene's alternate JumpY2/JumpX2 candidate to the near-event spawn")
    parser.add_argument("--entrance-distance", type=int, default=1)
    parser.add_argument("--activate-event", type=int)
    parser.add_argument("--give-items", type=int, nargs="+")
    parser.add_argument("--give-quantity", type=int, default=1)
    parser.add_argument("--zero-count-item", type=int)
    parser.add_argument("--set-player-hp", type=int)
    parser.add_argument("--set-player-sex", type=int)
    parser.add_argument("--set-player-facing", type=int, choices=(0, 1, 2, 3))
    parser.add_argument("--set-role-sex", type=int, nargs=2, metavar=("ROLE", "VALUE"))
    parser.add_argument("--set-player-ethics", type=int)
    parser.add_argument("--set-player-attack", type=int)
    parser.add_argument("--set-team-slot", type=int, nargs=2, metavar=("SLOT", "ROLE"))
    parser.add_argument("--set-team-roles", type=int, nargs=6,
                        metavar=("ROLE0", "ROLE1", "ROLE2", "ROLE3", "ROLE4", "ROLE5"))
    parser.add_argument("--set-scene-cell", type=int, nargs=5,
                        metavar=("SCENE", "LAYER", "X", "Y", "VALUE"))
    parser.add_argument("--set-event-pictures", type=int, nargs=3,
                        metavar=("SCENE", "SLOT", "VALUE"))
    parser.add_argument("--set-event-picture-range", type=int, nargs=4,
                        metavar=("SCENE", "FIRST_SLOT", "LAST_SLOT", "VALUE"))
    parser.add_argument("--set-event-id", type=int, nargs=3,
                        metavar=("SCENE", "SLOT", "EVENT"))
    parser.add_argument("--set-event-field", type=int, nargs=4, action="append",
                        metavar=("SCENE", "SLOT", "FIELD", "VALUE"))
    parser.add_argument("--set-scene-exit", type=int, nargs=4, action="append",
                        metavar=("SCENE", "EXIT_INDEX", "X", "Y"))
    args = parser.parse_args()
    game_dir = args.game_dir.resolve(strict=True)
    evidence_dir = args.evidence_dir.resolve()
    expected = Path("assets/generated/dosbox-x/session-002/game").resolve()
    if game_dir != expected or evidence_dir == game_dir or game_dir in evidence_dir.parents:
        raise SystemExit("Only the isolated session-002 game copy is writable")
    if args.give_items and (args.world_scene is None or args.spawn_near_event is None):
        raise SystemExit("Inventory setup requires --world-scene and --spawn-near-event")
    if args.activate_event is not None and args.world_scene is not None and args.spawn_near_event is None:
        raise SystemExit("World event activation requires --spawn-near-event")
    if args.give_items and (len(set(args.give_items)) != len(args.give_items) or
                            any(item < 0 or item > 724 for item in args.give_items)):
        raise SystemExit("Item IDs must be unique and within 0..724")
    if args.zero_count_item is not None and args.zero_count_item not in (args.give_items or []):
        raise SystemExit("Zero-count item must be one of --give-items")
    if not 0 <= args.give_quantity <= 32767:
        raise SystemExit("Synthetic item quantity must be 0..32767")
    if args.activate_event is not None and not 0 <= args.activate_event < 1018:
        raise SystemExit("Event ID must be 0..1017")
    if not 1 <= args.entrance_distance <= 5:
        raise SystemExit("Entrance distance must be 1..5")
    if args.set_player_hp is not None and not 1 <= args.set_player_hp <= 999:
        raise SystemExit("Synthetic player HP must be 1..999")
    if args.set_player_sex is not None and not 0 <= args.set_player_sex <= 2:
        raise SystemExit("Synthetic player sex candidate must be 0..2")
    if args.set_role_sex is not None and not (0 <= args.set_role_sex[0] < 320 and 0 <= args.set_role_sex[1] <= 2):
        raise SystemExit("Synthetic role sex candidate must be role 0..319 and value 0..2")
    if args.set_player_ethics is not None and not 0 <= args.set_player_ethics <= 100:
        raise SystemExit("Synthetic player ethics candidate must be 0..100")
    if args.set_player_attack is not None and not 0 <= args.set_player_attack <= 1000:
        raise SystemExit("Synthetic player attack candidate must be 0..1000")
    if args.set_team_slot is not None and not (0 <= args.set_team_slot[0] < 6 and -1 <= args.set_team_slot[1] < 320):
        raise SystemExit("Synthetic team slot or role is outside candidate range")
    if args.set_team_roles is not None:
        roles = args.set_team_roles
        if roles[0] != 0 or any(not -1 <= role < 320 for role in roles) or len({role for role in roles if role >= 0}) != len([role for role in roles if role >= 0]):
            raise SystemExit("Synthetic party must retain protagonist 0 and unique valid role IDs")
    if args.set_team_slot is not None and args.set_team_roles is not None:
        raise SystemExit("Select either one synthetic team slot or the full party")
    if args.set_scene_cell is not None:
        scene, layer, x, y, value = args.set_scene_cell
        if not (0 <= scene < 100 and 0 <= layer < 6 and 0 <= x < 64 and 0 <= y < 64
                and -32768 <= value <= 32767):
            raise SystemExit("Synthetic scene cell is outside 100 scenes / 6 layers / 64x64 / int16")
    if args.set_event_pictures is not None:
        scene, slot, value = args.set_event_pictures
        if not (0 <= scene < 100 and 0 <= slot < 200 and -32768 <= value <= 32767):
            raise SystemExit("Synthetic event picture is outside 100 scenes / 200 slots / int16")
    if args.set_event_picture_range is not None:
        scene, first, last, value = args.set_event_picture_range
        if not (0 <= scene < 100 and 0 <= first <= last < 200 and -32768 <= value <= 32767):
            raise SystemExit("Synthetic event picture range is outside 100 scenes / 200 slots / int16")
    if args.set_event_id is not None:
        scene, slot, event_id = args.set_event_id
        if not (0 <= scene < 100 and 0 <= slot < 200 and -1 <= event_id < 1018):
            raise SystemExit("Synthetic event ID is outside candidate range")
    if args.set_event_field is not None:
        for scene, slot, field, value in args.set_event_field:
            if not (0 <= scene < 100 and 0 <= slot < 200 and 0 <= field < 11
                    and -32768 <= value <= 32767):
                raise SystemExit("Synthetic event field is outside 100 scenes / 200 slots / 11 fields / int16")
    if args.set_scene_exit is not None:
        for scene, exit_index, x, y in args.set_scene_exit:
            if not (0 <= scene < 84 and 0 <= exit_index < 3 and 0 <= x < 64 and 0 <= y < 64):
                raise SystemExit("Synthetic scene exit is outside 84 scenes / 3 exits / 64x64")
    if args.align_jump2_spawn and (args.world_scene is None or args.spawn_near_event is None):
        raise SystemExit("--align-jump2-spawn requires --world-scene and --spawn-near-event")
    backup = evidence_dir / "original-slot3"
    names = [f"{stem}3.{extension}" for stem in FILES for extension in EXTENSIONS]

    if args.restore:
        manifest = json.loads((evidence_dir / "manifest.json").read_text(encoding="utf-8"))
        for name in names:
            source = backup / name
            if digest(source) != manifest["before"][name]:
                raise SystemExit(f"Backup hash mismatch: {name}")
            shutil.copy2(source, game_dir / name)
        print(json.dumps({name: digest(game_dir / name) for name in names}, indent=2))
        return

    if evidence_dir.exists():
        raise SystemExit(f"Evidence directory already exists: {evidence_dir}")
    backup.mkdir(parents=True)
    before = {}
    for name in names:
        source = game_dir / name
        before[name] = digest(source)
        shutil.copy2(source, backup / name)

    for stem in FILES:
        for extension in EXTENSIONS:
            if args.source_slot != 3:
                shutil.copy2(game_dir / f"{stem}{args.source_slot}.{extension}", game_dir / f"{stem}3.{extension}")

    changes = []

    def patch_word(name: str, offset: int, value: int) -> None:
        path = game_dir / name
        data = bytearray(path.read_bytes())
        previous = struct.unpack_from("<h", data, offset)[0]
        struct.pack_into("<h", data, offset, value)
        path.write_bytes(data)
        changes.append({"file": name, "byteOffset": offset, "before": previous, "after": value})

    if args.set_player_hp is not None:
        patch_word("R3.GRP", 836 + 34, args.set_player_hp)
    if args.set_player_sex is not None:
        patch_word("R3.GRP", 836 + 28, args.set_player_sex)
    if args.set_player_facing is not None:
        patch_word("R3.GRP", 12, args.set_player_facing)  # candidate MFace, not DOS-verified
    if args.set_role_sex is not None:
        role, value = args.set_role_sex
        patch_word("R3.GRP", 836 + 182 * role + 28, value)
    if args.set_player_ethics is not None:
        patch_word("R3.GRP", 836 + 112, args.set_player_ethics)
    if args.set_player_attack is not None:
        patch_word("R3.GRP", 836 + 86, args.set_player_attack)
    if args.set_team_slot is not None:
        slot, role = args.set_team_slot
        patch_word("R3.GRP", 24 + slot * 2, role)
    if args.set_team_roles is not None:
        for slot, role in enumerate(args.set_team_roles):
            patch_word("R3.GRP", 24 + slot * 2, role)
    if args.set_scene_cell is not None:
        scene, layer, x, y, value = args.set_scene_cell
        patch_word("S3.GRP", scene * 49152 + layer * 8192 + (y * 64 + x) * 2, value)
    if args.set_event_pictures is not None:
        scene, slot, value = args.set_event_pictures
        for field in (5, 6, 7):
            patch_word("D3.GRP", (scene * 200 + slot) * 22 + field * 2, value)
    if args.set_event_picture_range is not None:
        scene, first, last, value = args.set_event_picture_range
        for slot in range(first, last + 1):
            for field in (5, 6, 7):
                patch_word("D3.GRP", (scene * 200 + slot) * 22 + field * 2, value)
    if args.set_event_id is not None:
        scene, slot, event_id = args.set_event_id
        patch_word("D3.GRP", (scene * 200 + slot) * 22 + 4, event_id)
    if args.set_event_field is not None:
        for scene, slot, field, value in args.set_event_field:
            patch_word("D3.GRP", (scene * 200 + slot) * 22 + field * 2, value)
    if args.set_scene_exit is not None:
        for scene, exit_index, x, y in args.set_scene_exit:
            scene_offset = 97076 + scene * 52
            patch_word("R3.GRP", scene_offset + (16 + exit_index) * 2, y)
            patch_word("R3.GRP", scene_offset + (19 + exit_index) * 2, x)

    # Community layout candidates; DOS interpretation remains unverified.
    if args.world_scene is None:
        patch_word("R3.GRP", 2, 33)  # candidate scene 32 + 1
        patch_word("R3.GRP", 8, 24)  # candidate local row, north of slot 0
        patch_word("R3.GRP", 10, 31)  # candidate local column
        indoor_event = args.activate_event if args.activate_event is not None else 676
        patch_word("D3.GRP", (32 * 200) * 22 + 4, indoor_event)  # scene 32, slot 0, field 2
        target = {"kind": "indoor-event", "scene": 32, "event": indoor_event}
    else:
        if not 0 <= args.world_scene < 84:
            raise SystemExit("world-scene must be 0..83")
        scene_offset = 97076 + args.world_scene * 52 + 20
        scene_bytes = (game_dir / f"R{args.source_slot}.GRP").read_bytes()
        first, second = struct.unpack_from("<2h", scene_bytes, scene_offset)
        patch_word("R3.GRP", 4, first + args.first_coordinate_offset)
        patch_word("R3.GRP", 6, second + args.second_coordinate_offset)
        if args.unlock_scene:
            patch_word("R3.GRP", scene_offset - 2, 0)  # candidate EnCondition
        event_position = None
        if args.spawn_near_event is not None:
            scene_map = (game_dir / f"S{args.source_slot}.GRP").read_bytes()
            matches = []
            for x in range(64):
                for y in range(64):
                    offset = (((args.world_scene * 6 + 3) * 64 + x) * 64 + y) * 2
                    if struct.unpack_from("<h", scene_map, offset)[0] == args.spawn_near_event:
                        matches.append((x, y))
            if len(matches) != 1 or matches[0][1] + args.entrance_distance >= 64:
                raise SystemExit(f"Expected one interior event cell, got {matches}")
            x, y = matches[0]
            patch_word("R3.GRP", scene_offset + 8, y + args.entrance_distance)  # candidate EntranceY
            patch_word("R3.GRP", scene_offset + 10, x)  # candidate EntranceX
            if args.align_jump2_spawn:
                patch_word("R3.GRP", scene_offset + 28, y + args.entrance_distance)  # candidate JumpY2
                patch_word("R3.GRP", scene_offset + 30, x)  # candidate JumpX2
            event_position = {"slot": args.spawn_near_event, "x": x, "y": y,
                              "spawnX": x, "spawnY": y + args.entrance_distance}
        if args.activate_event is not None:
            patch_word("D3.GRP", (args.world_scene * 200 + args.spawn_near_event) * 22 + 4,
                       args.activate_event)
        if args.give_items:
            inventory = (game_dir / "R3.GRP").read_bytes()
            slots = [struct.unpack_from("<2h", inventory, 36 + index * 4)
                     for index in range(200)]
            if any(item in (number for number, _ in slots) for item in args.give_items):
                raise SystemExit("Required item already present; refusing ambiguous quantity setup")
            free = [index for index, (number, _) in enumerate(slots) if number == -1]
            if len(free) < len(args.give_items):
                raise SystemExit("Not enough empty inventory slots")
            for item, index in zip(args.give_items, free):
                patch_word("R3.GRP", 36 + index * 4, item)
                patch_word("R3.GRP", 36 + index * 4 + 2,
                           0 if item == args.zero_count_item else args.give_quantity)
        target = {"kind": "world-approach", "scene": args.world_scene,
                  "sourceSceneCoordinates": [first, second],
                  "firstCoordinateOffset": args.first_coordinate_offset,
                  "secondCoordinateOffset": args.second_coordinate_offset,
                  "candidateEntranceConditionForcedToZero": args.unlock_scene,
                  "candidateNearbyEventSpawn": event_position,
                  "candidateAlternateEntranceAligned": args.align_jump2_spawn,
                  "candidateActivatedEvent": args.activate_event,
                  "candidateEventIdOverride": args.set_event_id,
                  "candidateEventFieldOverrides": args.set_event_field or [],
                  "candidateGrantedInventoryItems": args.give_items or [],
                  "candidateGrantedInventoryQuantity": args.give_quantity,
                  "candidateZeroCountItem": args.zero_count_item}

    after = {name: digest(game_dir / name) for name in names}
    manifest = {
        "classification": "Synthetic State / Inferred",
        "sourceSlot": args.source_slot,
        "targetSlot": 3,
        "candidatePlayerFacing": args.set_player_facing,
        "target": target,
        "before": before,
        "after": after,
        "changesAfterSourceCopy": changes,
        "limitations": "Scene and coordinate fields are community candidates; game load and event trigger require DOS verification.",
    }
    (evidence_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
