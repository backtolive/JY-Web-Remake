# Event opcode semantics — fourth static evidence batch

Date: 2026-11-11
Phase: Phase 3 local research; Phase 3 / 6 overall acceptance remains incomplete.
Status: Static comparison for opcodes 32–49 against the pinned community implementation and local candidate-decoded corpus. These are source observations, not DOS gameplay verification.
Confidence: Handler behavior is `Community Implementation`; decoded arguments and record widths are `FishEdit 0.72 candidate`; original DOS runtime semantics remain `Unknown`.

## Sources

- Local event corpus: `assets/generated/event-corpus/all-events-ce00ac1ebede9e7e.local.json`; original input hashes and parser metadata: `docs/validation/full-original-event-corpus.md`.
- FishEdit 0.72 candidate instruction widths and descriptions, pinned commit `1d439afe76dae41c821065c3a33c1c6709dc7fce`.
- `kys-jedisdl` community handlers: `references/kys-jedisdl/kys_event.pas`, commit `4d225cb9b7b9a3ac46a796ecb0acde525ef72acc`; dispatcher in `kys_main.pas` at the same commit.

## Handler comparison

| Opcode | Candidate words / occurrences | What the pinned community handler does | Community effects / dispatch | DOS status |
|---:|---:|---|---|---|
| 32 | 3 / 160 | Adds the signed amount to a matching inventory item, or inserts a new item; clamps some signed-overflow cases and rearranges the list. Amount zero is a no-op. | Mutates party inventory; dispatcher advances 3 words. See batch 1 for contrast with opcode 2's additional notification. (`kys_event.pas:912–940`, `kys_main.pas:6928–6931`) | Unknown |
| 33 | 4 / 7 | Learns a magic in the first empty slot, or increments its level if already present; caps level at 10. The loop does nothing if all ten slots are occupied. `dismode=0` displays a notice and waits for a key. | Mutates a role's magic IDs/levels; dispatcher advances 4 words. (`kys_event.pas:943–970`, `kys_main.pas:6933–6936`) | Unknown |
| 34 | 3 / 4 | Adds the value to Aptitude, with an upper cap of 100. The handler has no lower clamp. The notice appears only when the applied increment is positive. | Mutates a role stat; dispatcher advances 3 words. (`kys_event.pas:973–997`, `kys_main.pas:6938–6941`) | Unknown |
| 35 | 5 / 8 | With an explicit slot 0–9, overwrites that magic ID/level. Otherwise writes to the first empty slot. If the list is full, the source appears to fall back to `Magic[0]` but writes `MagLevel[i]` at `i=10`; this is a suspicious out-of-range source bug, not a safe behavior to copy. | Mutates a role's magic table; dispatcher advances 5 words. (`kys_event.pas:1000–1025`, `kys_main.pas:6943–6946`) | Unknown |
| 36 | 4 / 1 | Normally compares the protagonist's `Sexual` field with a supplied value. If that value is greater than 255, instead uses the `$7000` flag set by the extended opcode-50 path to choose a branch. | Returns branch offset; dispatcher adds it plus 4 words. (`kys_event.pas:1028–1037`, `kys_main.pas:6948–6951`) | Unknown |
| 37 | 2 / 156 | Adds the argument to protagonist Ethics and clamps to `[0,100]`. | Mutates protagonist stat; dispatcher advances 2 words. (`kys_event.pas:1040–1046`, `kys_main.pas:6953–6956`) | Unknown |
| 38 | 5 / 3 | In the selected scene/layer, replaces every cell with `oldpic` by `newpic`; scene `-2` resolves to the current scene. | Mutates `SData`; reinitializes the active scene when applicable. (`kys_event.pas:1049–1065`, `kys_main.pas:6958–6961`) | Unknown |
| 39 | 2 / 3 | Sets the specified scene's `EnCondition` to zero. | Mutates scene-entry state; dispatcher advances 2 words. The FishEdit Chinese description says “open scene”, but the source field assignment alone does not establish user-visible accessibility. (`kys_event.pas:1068–1070`, `kys_main.pas:6963–6966`) | Unknown |
| 40 | 2 / 12 | Sets `SFace`, derives a standing-sprite frame from it, and redraws. | Mutates facing/presentation; dispatcher advances 2 words. (`kys_event.pas:1073–1077`, `kys_main.pas:6968–6971`) | Unknown |
| 41 | 4 / 6 | Adds the item to a character's four carried-item slots, merges an existing item ID, or uses the first empty slot. Nonpositive resulting amounts clear that slot. It does not directly add the item to party inventory in this handler. | Mutates `TakingItem` / amount fields; dispatcher advances 4 words. (`kys_event.pas:1080–1114`, `kys_main.pas:6973–6976`) | Unknown |
| 42 | 3 / 2 | Scans party roles and branches to the first offset if any occupied role has `Sexual=1`; otherwise returns the second. | Branch only; dispatcher applies return offset plus 3 words. (`kys_event.pas:1117–1130`, `kys_main.pas:6978–6981`) | Unknown |
| 43 | 4 / 5 | Delegates to `instruct_18`; tests whether an inventory slot has the item ID, not its amount. | Branch only; dispatcher applies return offset plus 4 words. (`kys_event.pas:1133–1137`, `kys_main.pas:6983–6986`) | Unknown |
| 44 | 7 / 6 | Animates the pictures for two scene events. It initializes both event registrations and advances their frame IDs; the loop stop condition uses only the first frame range. | Mutates two events' picture fields and redraws the scene; dispatcher advances 7 words. (`kys_event.pas:1140–1169`, `kys_main.pas:6988–6991`) | Unknown |
| 45 | 3 / 3 | Adds to role Speed, draws a notification, and waits for a key. | Mutates one stat and blocks for user acknowledgement; dispatcher advances 3 words. (`kys_event.pas:1195–1208`, `kys_main.pas:6993–6996`) | Unknown |
| 46 | 3 / 2 | Adds to MaxMP, then sets CurrentMP equal to the new MaxMP; draws a notice and waits for a key. | Mutates two stat fields and blocks for input; dispatcher advances 3 words. (`kys_event.pas:1211–1225`, `kys_main.pas:6998–7001`) | Unknown |
| 47 | 3 / 5 | Adds to Attack; draws a notice and waits for a key. | Mutates one stat and blocks for input; dispatcher advances 3 words. (`kys_event.pas:1228–1241`, `kys_main.pas:7003–7006`) | Unknown |
| 48 | 3 / 8 | Adds to MaxHP, then sets CurrentHP equal to the new MaxHP; draws a notice and waits for a key. | Mutates two stat fields and blocks for input; dispatcher advances 3 words. (`kys_event.pas:1244–1258`, `kys_main.pas:7008–7011`) | Unknown |
| 49 | 3 / 3 | Assigns the argument directly to the role's `MPType`. | Mutates one role field; dispatcher advances 3 words. (`kys_event.pas:1261–1264`, `kys_main.pas:7013–7016`) | Unknown |

## Candidate corpus examples

All numbers below are candidate signed-word decodes; they are not independent proof of the parameter names.

| Opcode | Event | KDEF event byte offset | Instruction byte offset | Candidate args | Event SHA-256 |
|---:|---:|---:|---:|---|---|
| 33 | 284 | 44976 | 45326 | `[35,61,0]` | `3bbbc0a2a400cfe60ac611dc7349ccc481f9e86e6b2826315eaf3437876b2137` |
| 35 | 115 | 18648 | 18686 | `[10,0,10,900]` | `0a48c40b6fff17d196dbc80fb83a85bc854a7362422f1074600e129ee08f5983` |
| 38 | 416 | 64808 | 64830 | `[-2,0,994,990]` | `62320814e5f8d26eb385cb0ebf98997c528dfeec956a0fddad803b2a9e9cbb88` |
| 41 | 289 | 46184 | 46390 | `[36,78,1]` | `c191d39636c89da677c8e221d7e1df3be20ef390a7f9991612e2bc27aa387c4b` |
| 44 | 534 | 83264 | 83504 | `[1,6486,6520,2,6450,6484]` | `678434a1bc435dd84551b664b159cb37848b1de4a9e93664f37b8c5aea1e92f2` |
| 48 | 115 | 18648 | 18756 | `[10,200]` | `0a48c40b6fff17d196dbc80fb83a85bc854a7362422f1074600e129ee08f5983` |

## What this establishes—and what it does not

- This records what the pinned community handlers read and write, including user-visible waits and source-level edge cases.
- It reveals candidate pitfalls for a future adapter: opcode 35's apparently out-of-range fallback, opcode 39's ambiguous “open scene” label versus `EnCondition := 0`, and opcode 44's first-range-only animation stop condition.
- It does not verify that the DOS executable uses the same field meaning, caps, party membership predicates, visuals, waits, or branch offsets. Keep all DOS behavior `Unknown` until a controlled original-game case confirms it.

## Next evidence step

Continue static source coverage through opcodes 50–67, preserving this same source split. For runtime tests, restore the saved DOSBox-X Capture slot 1 checkpoint rather than reconstructing the current state by rewriting the game's save files. Wait at least one second between input actions; inspect a game-only image only for an unexpected or ambiguous result.
