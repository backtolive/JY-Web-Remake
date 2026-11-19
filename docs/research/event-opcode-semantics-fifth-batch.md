# Event opcode semantics — fifth static evidence batch

Date: 2026-11-11
Phase: Phase 3 local research; Phase 3 / 6 overall acceptance remains incomplete.
Status: Static comparison for opcodes 50–67 against the pinned community implementation and local candidate-decoded corpus. This report records source behavior only; no opcode in this range is DOS-verified.
Confidence: FishEdit widths/counts/descriptions are candidate evidence; Pascal handler details are `Community Implementation`; DOS runtime behavior remains `Unknown`.

## Sources

- Candidate corpus and source hashes: `assets/generated/event-corpus/all-events-ce00ac1ebede9e7e.local.json`; metadata in `docs/validation/full-original-event-corpus.md`.
- Candidate widths, frequencies, and editor descriptions: `docs/research/event-opcode-coverage.md`; FishEdit 0.72 pinned commit `1d439afe76dae41c821065c3a33c1c6709dc7fce`.
- Community handlers: `references/kys-jedisdl/kys_event.pas`, commit `4d225cb9b7b9a3ac46a796ecb0acde525ef72acc`; dispatch in `references/kys-jedisdl/kys_main.pas` at that commit.

## Handler comparison

| Opcode | Candidate words / occurrences | Pinned community implementation | Community effects / dispatch | DOS status |
|---:|---:|---|---|---|
| 50 | 8 / 1 | `instruct_50` has two modes. If first argument `>128` (or `MODVersion=11`), it searches for all five listed item IDs and returns yes/no offset. Otherwise the first argument selects an `instruct_50e` operation. The extension family includes parameter arithmetic/comparison, string operations, resource/role/item/scene/shop reads and writes, party/event/map data access, selected raw-address reads/writes, battle data access, drawing, menus, random values, nested events, and effects. | Dispatcher advances eight words, then uses a small return as a relative jump; large encoded return values write data back into the event buffer. Local event 676 starts with 138, so the community implementation takes the five-item path. Its item search checks IDs, not positive amounts. (`kys_event.pas:1266–1286, 1623–2230`; `kys_main.pas:7008–7015`) | Unknown |
| 51 | 1 / 1 | Chooses a random entry from the community source's Softstar talk range and displays it. | Dialogue/presentation; advances one word. (`kys_event.pas:1290–1293`; `kys_main.pas:7027–7031`) | Unknown |
| 52 | 1 / 1 | Draws the protagonist's Ethics value, waits for a key, then redraws. | Read-only display plus blocking acknowledgement; advances one word. (`kys_event.pas:1295–1307`; `kys_main.pas:7032–7036`) | Unknown |
| 53 | 1 / 1 | Draws the protagonist's Repute value, waits for a key, then redraws. | Read-only display plus blocking acknowledgement; advances one word. (`kys_event.pas:1309–1321`; `kys_main.pas:7037–7041`) | Unknown |
| 54 | 1 / 1 | Sets `EnCondition=0` for scene records 0–100, then restores special values: scenes 2 and 38 to 2; scenes 75 and 80 to 1. | Mutates scene-entry conditions globally; advances one word. The editor label says this follows meeting Nan Xian, but this source alone does not prove that original rule. (`kys_event.pas:1323–1343`; `kys_main.pas:7042–7046`) | Unknown |
| 55 | 5 / 28 | Compares `DData[CurScence, eventIndex, 2]` with the supplied value and returns the yes or no relative offset. | Branch only; dispatcher adds the selected offset plus five words. (`kys_event.pas:1347–1353`; `kys_main.pas:7047–7051`) | Unknown |
| 56 | 2 / 105 | Adds the amount to protagonist Repute. If the value crosses from at most 200 to above 200, inserts a specific event record through `instruct_3`. | Mutates Repute and conditionally mutates event data; advances two words. The inserted event IDs are hard-coded in this community implementation. (`kys_event.pas:1358–1366`; `kys_main.pas:7052–7056`) | Unknown |
| 57 | 1 / 1 | Runs a hard-coded protagonist animation and a fixed animation sequence associated by source comments with the Gaochang maze stone door. | Presentation/animation; advances one word. This does not establish the scene or trigger semantics in DOS. (`kys_event.pas:1368–1388`; `kys_main.pas:7057–7061`) | Unknown |
| 58 | 1 / 1 | Runs up to 15 random battles. A loss calls opcode 15 and stops the sequence; every third win rests and restores related state. If `where<>3` after the loop, it shows dialogue and grants item `$8F`. | Battle, dialogue, rest, and potential inventory changes; advances one word. Many story-specific battle and dialogue IDs are embedded in this handler. (`kys_event.pas:1390–1428`; `kys_main.pas:7062–7066`) | Unknown |
| 59 | 1 / 1 | Sets `TeamList[1..5]` to `-1`; does not clear slot 0 or related event records. | Mutates the party list; advances one word. (`kys_event.pas:1432–1440`; `kys_main.pas:7067–7071`) | Unknown |
| 60 | 6 / 5 | Resolves scene `-2` to current scene and checks whether an event's picture fields 5, 6, or 7 equal the supplied picture ID. | Branch only; dispatcher applies selected offset plus six words. (`kys_event.pas:1430–1438`; `kys_main.pas:7072–7076`) | Unknown |
| 61 | 3 / 14 | Checks picture field 5 for event slots 11 through 24 in the current scene; returns yes only when every value is 4664. | Branch only; dispatcher applies returned offset plus three words. (`kys_event.pas:1440–1451`; `kys_main.pas:7077–7081`) | Unknown |
| 62 | 7 / 1 | Sets the scene-role picture to `-1`, runs two event animations, sets `where=3`, redraws, then executes the ending sequence/text and end image. | End-game presentation; dispatcher advances seven words and breaks the current event loop. The community source's display flow is not proof of opcode 62's original DOS meaning. (`kys_event.pas:1454–1480` and `EndAmi`; `kys_main.pas:7082–7087`) | Unknown |
| 63 | 3 / 1 | Assigns the supplied value to a role's `Sexual` field. | Mutates a role field; advances three words. (`kys_event.pas:1536–1539`; `kys_main.pas:7088–7092`) | Unknown |
| 64 | 1 / 1 | Chooses one of five shops randomly, lists in-stock items, asks for a selection, checks whether the party can afford it, then adds the item, subtracts money, and decrements stock. Cancellation or insufficient funds does not purchase. | Interactive shop flow with inventory, money, and stock effects; advances one word. (`kys_event.pas:1543–1585`; `kys_main.pas:7093–7097`) | Unknown |
| 65 | 1 / 1 | No named handler or state change in this dispatcher; it only increments the instruction index by one. | Candidate one-word no-op in this community build. FishEdit's label (“go to another inn”) is not implemented here and is not original-game proof. (`kys_main.pas:7098–7101`) | Unknown |
| 66 | 2 / 1 | Stops current MP3 playback and starts the specified music track in loop mode. | Audio side effect; advances two words. (`kys_event.pas:1588–1592`; `kys_main.pas:7102–7106`) | Unknown |
| 67 | 2 / 20 | Calls `PlaySoundA` with the supplied sound ID. | Sound effect; advances two words. (`kys_event.pas:1594–1598`; `kys_main.pas:7107–7111`) | Unknown |

## Important boundaries

- Opcode 50 is an overloaded community implementation: a five-item condition for high first arguments and a separate extension operation family otherwise. The single local occurrence, event 676 with first argument 138, follows the former path in this source. That does not establish DOS semantics.
- The `instruct_50e` sub-opcode is a second layer inside opcode 50; it must not be confused with top-level event opcodes 51–67. Its raw-address cases are hard-coded implementation details and are unsafe to generalize without runtime evidence.
- Opcode 65 has a FishEdit label but no corresponding action in this dispatcher. The only source-supported observation here is that this community dispatcher skips its one-word record.
- Opcode 62 is the only row in this batch whose community dispatcher explicitly breaks after execution. This is not evidence that opcode 15 or any other opcode means game over in the DOS executable.
- No source comparison validates the candidate FishEdit record widths, event reachability, argument names, visual effects, or state writes against the DOS executable.

## Next evidence step

Static handler comparison now reaches the final local candidate opcode range. Reconcile this batch with the 68-row coverage table, then select DOS cases by replayable evidence (starting with opcodes 15 and 50) using the existing DOSBox-X state checkpoint. Restore slot 1 rather than reconstructing progress from game save files. Wait at least one second between input actions; capture a game-only frame only after an unexpected or ambiguous outcome.
