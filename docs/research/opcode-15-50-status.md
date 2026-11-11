# Opcode 15／50 research status

Date: 2026-11-11. Current confidence for DOS runtime behavior: Unknown.

This page replaces the earlier summary that said the Pascal dispatcher omitted opcode 15. That statement was incorrect: the checked-in community Pascal dispatcher calls `instruct_15` and breaks its event loop.

## Opcode 15

- Local corpus: 114 occurrences; all 114 candidate records have a following 16-bit value of `83` under the FishEdit 0.72 two-word layout.
- FishEdit 0.72 describes it as death/return-to-menu and documents parameter `5300`, which corresponds to decimal `83` in its stated low-byte-first encoding.
- `kys-jedisdl` Pascal `CallEvent` calls `instruct_15`, increments past the two-word record, and breaks the event loop. That source handler changes presentation/state and waits for input; this is community behavior, not Original Verified.
- The local follow-up pattern is 109 times opcode 7 and five times `-1`. All 1,018 event resources end with `-1`. The bytes therefore do not support treating `-1` alone as a win ending. The user's suggestion that 7 and -1 mean death/win endings remains unverified.
- DOSBox-X has reached the game title screen and its debugger UI is available, but no controlled opcode-15 replay has been captured. Meaning and effect of `83` remain unknown for the original game.

## Opcode 50

- Local corpus: one occurrence, event 676, arguments `138,139,140,141,142,6,0` under the FishEdit candidate width.
- FishEdit 0.72 describes a five-item check with two relative offsets. Its active `FishEdit.ini` disables branch annotation for opcode 50, so structural audit does not validate these destinations.
- `kys-jedisdl` Pascal dispatches to `instruct_50`; values greater than 128 take a five-item check, while other values route to an extension path. After the handler, dispatcher return values may select a relative branch or write back dynamic event data. This is an implementation from that community source, not DOS proof.
- Actual item test, branch target, inventory effect, and comparison with DOS remain unknown.

## Evidence boundaries

The 68-row width/count/handler/runtime inventory is in [event-opcode-coverage.md](event-opcode-coverage.md). Full candidate test cases are in [opcode-15-50-cases.md](../validation/opcode-15-50-cases.md). The structure audit validates candidate record boundaries and offsets; it does not establish runtime semantics or route reachability. Do not implement opcode 15 as a comparison branch.

## Next replay evidence

Use the separate session-002 copy documented in [DOSBox-X debugger and sampling](../validation/dosbox-x-debugger-and-sampling.md). Create a legitimate in-game save first, replay the relevant event from a copy, and capture a before/after screen plus save-state diff. Do not edit commercial game files or use guessed save offsets as if they were verified.
