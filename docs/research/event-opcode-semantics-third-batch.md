# Event opcode semantics — third static evidence batch

Date: 2026-11-11
Phase: Phase 3 local research; Phase 3 / 6 overall acceptance remains incomplete.
Status: Static comparison for opcodes 17–31 against the pinned community implementation and local candidate-decoded corpus. This batch found a conflict between the FishEdit opcode-20 label and the checked-in Pascal dispatcher. No DOS handler is marked Verified Original.
Confidence: Handler behavior is `Community Implementation`; argument widths and decoded samples are `FishEdit 0.72 candidate`; original DOS effects remain `Unknown`.

## Sources

- Corpus: `assets/generated/event-corpus/all-events-ce00ac1ebede9e7e.local.json`. The KDEF input hashes and parser metadata are in `docs/validation/full-original-event-corpus.md`.
- Candidate widths/descriptions: FishEdit 0.72, pinned commit `1d439afe76dae41c821065c3a33c1c6709dc7fce`. Its descriptions warn they may be wrong.
- Community handlers: `references/kys-jedisdl/kys_event.pas`, commit `4d225cb9b7b9a3ac46a796ecb0acde525ef72acc`; dispatcher `references/kys-jedisdl/kys_main.pas`, same commit.

## Handler comparison

| Opcode | Candidate words / occurrences | What the pinned community handler does | Community effects / dispatch | DOS status |
|---:|---:|---|---|---|
| 17 | 6 / 127 | Writes one `SData[scene, layer, y, x]` cell to a picture/resource ID; `scene=-2` resolves to current scene. | Requests a refresh for the active scene. Dispatcher advances 6 words. (`kys_event.pas:605–612`, `kys_main.pas:6853–6858`) | Unknown |
| 18 | 4 / 2 | Searches inventory slots for matching item ID; does not check amount. | Returns a branch offset; dispatcher adds the returned offset plus four words. Already covered in batch 1. | Unknown |
| 19 | 3 / 15 | Assigns `Sx=y`, `Sy=x`, copies them to `Cx/Cy`, initializes and redraws the scene. | Immediate position change in this community engine; dispatcher advances 3 words. The argument-to-axis swap is important and is not DOS proof. (`kys_event.pas:632–639`, `kys_main.pas:6863–6866`) | Unknown |
| 20 | 3 / 82 | Checks whether any of six party slots is empty. If all six are occupied it returns `jump1`; if any is empty it returns `jump2`. | Branch only; does not change MP. Dispatcher applies the returned offset and advances 3 words. (`kys_event.pas:644–656`, `kys_main.pas:6868–6873`) | Unknown |
| 21 | 2 / 35 | Removes the specified role ID from the party list and compacts remaining entries to the front; fills trailing slots with `-1`. | Mutates `Teamlist`; dispatcher advances 2 words. (`kys_event.pas:659–675`, `kys_main.pas:6875–6878`) | Unknown |
| 22 | 1 / 1 | Sets current MP to zero for every occupied party member. | Mutates party character records; dispatcher advances 1 word. (`kys_event.pas:678–684`, `kys_main.pas:6880–6883`) | Unknown |
| 23 | 3 / 1 | Assigns the second value to `Rrole[rnum].UsePoi`. The handler parameter is named `Poison`, but the field written is `UsePoi`. | Mutates one character stat; dispatcher advances 3 words. (`kys_event.pas:687–690`, `kys_main.pas:6885–6888`) | Unknown |
| 24 | 1 / 0 | Empty handler in this source. | Dispatcher advances 1 word. The local candidate corpus has zero occurrences, so there is no local DOS sample to test. (`kys_event.pas:695–698`, `kys_main.pas:6890–6893`) | Unknown |
| 25 | 5 / 52 | Animates a scene transition from `(x1,y1)` to `(x2,y2)` by drawing intermediate positions; then sets the event's scene coordinates. | Presentation and cursor/scene-coordinate changes; loop advances while the SDL event poll continues, not a fixed-duration guarantee. Dispatcher advances 5 words. (`kys_event.pas:703–748`, `kys_main.pas:6895–6898`) | Unknown |
| 26 | 6 / 121 | Adds three supplied values to fields 2, 3, and 4 of a target event record; `scene=-2` resolves to current scene. | Mutates `DData`; if target is current scene, reinitializes it and clears refresh flag. Dispatcher advances 6 words. (`kys_event.pas:751–765`, `kys_main.pas:6900–6903`) | Unknown |
| 27 | 4 / 43 | Animates the protagonist when `enum=-1`; otherwise cycles the selected event's three picture fields from `beginpic` through `endpic`, reinitializing and redrawing. | Mutates `DData` for non-player event and redraws; animation steps depend on SDL event polling. Dispatcher advances 4 words. (`kys_event.pas:768–811`, `kys_main.pas:6905–6908`) | Unknown |
| 28 | 6 / 22 | Tests whether the specified role's Ethics value is inclusively within `[e1,e2]`, then returns a branch offset. | Dispatcher adds return offset and advances 6 words. (`kys_event.pas:814–818`, `kys_main.pas:6910–6913`) | Unknown |
| 29 | 6 / 5 | Tests whether the specified role's Attack is inclusively within `[r1,r2]`. Community `MODVersion=41` changes this to a lower-bound-only test. | Dispatcher adds return offset and advances 6 words. The MOD-specific override is not evidence about the original game. (`kys_event.pas:821–830`, `kys_main.pas:6915–6918`) | Unknown |
| 30 | 5 / 7 | Animates the protagonist moving through intermediate scene coordinates, updates facing/step sprite, then commits `Sx/Sy/Cx/Cy`. | Mutates player scene coordinates and redraws; intermediate steps use an SDL event-poll loop. Dispatcher advances 5 words. (`kys_event.pas:833–894`, `kys_main.pas:6920–6923`) | Unknown |
| 31 | 4 / 8 | Searches for `MONEY_ID` and checks whether its amount is at least the requested value; returns yes/no offset. | Unlike opcode 18/43's ID-only check, this handler checks amount. Dispatcher adds returned offset and advances 4 words. (`kys_event.pas:897–909`, `kys_main.pas:6925–6928`) | Unknown |

## Important candidate-label mismatch: opcode 20

FishEdit labels opcode 20 as “all party members' internal power becomes zero.” The pinned Pascal dispatcher routes opcode 20 to `instruct_20`, whose only operation is to inspect whether any party slot is empty and choose between two offsets. In that same source, opcode 22 calls `instruct_22`, which sets MP to zero for all current party members. This is a strong indication that the FishEdit opcode-20 description is shifted or otherwise wrong relative to this community implementation. It is not proof that DOS opcode 20/22 have these meanings.

Candidate sample: event 10, KDEF resource byte offset `864`, instruction byte offset `1084`, arguments `[0,6]`, event SHA-256 `1014503f653c547cce3fcc67e7f9fdab09b61532977c5b925d941c7f5303ca20`. Under the community handler this would ask whether the six-person party is full, but only an original runtime case can validate that behavior.

## Coordinate intervention related to opcode 19

Opcode 19's community handler swaps its two arguments into `Sx=y` and `Sy=x`. Separately, a controlled Synthetic State intervention on the local R3 save established that changing `R3.GRP` offset 6 from 235 to 245 changes the original executable's loaded map position; see `docs/research/original-save-layout-candidate.md`. These facts do not establish that opcode 19 writes that same save header field or shares that axis convention. An opcode-19 DOS case still needs a replayable event and pre/post position evidence.

## What this establishes—and what it does not

- The pinned community implementation provides concrete candidate state writes and branch formulas for these handlers.
- Opcode 20's FishEdit label conflicts with the Pascal handler, while opcode 22's handler matches that label. Do not transfer the Pascal interpretation to DOS without a runtime test.
- None of these source comparisons proves DOS behavior, original argument meaning, failure semantics, event reachability, or exact coordinate axes.
- User-confirmed Escape/Exit behavior and DOSBox-X emulator save states are operational evidence recorded separately; they are not evidence for any opcode.

## Next evidence step

Continue with opcodes 32–49 source-level state effects, then 50–67. For runtime sampling, restore the DOSBox-X Capture slot 1 checkpoint `assets/generated/dosbox-x/session-002/save/1.sav` rather than rewriting a game save to recreate the tested progress. Wait at least one second between inputs; capture a game-only frame only when the observed result is unexpected or unclear.
