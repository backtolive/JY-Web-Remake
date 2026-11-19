# Event opcode semantics — second static evidence batch

Date: 2026-11-11
Phase: Phase 3 local research; Phase 3 / 6 overall acceptance remains incomplete.
Status: Static comparison for opcodes 3–15 against the pinned community implementation and local candidate-decoded event corpus. No DOS opcode behavior is marked Verified Original.
Confidence: Pascal handler behavior is `Community Implementation`; event arguments/widths are `FishEdit 0.72 candidate`; DOS behavior remains `Unknown`.

## Sources

- Local event corpus and input hashes: `assets/generated/event-corpus/all-events-ce00ac1ebede9e7e.local.json`; source and parser metadata are recorded in `docs/validation/full-original-event-corpus.md`.
- Candidate widths and labels: FishEdit 0.72, source commit `1d439afe76dae41c821065c3a33c1c6709dc7fce`; its opcode descriptions warn that they may be incorrect.
- Community handlers: `references/kys-jedisdl/kys_event.pas`, commit `4d225cb9b7b9a3ac46a796ecb0acde525ef72acc`; dispatch loop: `references/kys-jedisdl/kys_main.pas`, same pinned repository.

## Handler comparison

| Opcode | Candidate words / occurrences | Candidate argument count | What the pinned community handler does | Community control flow / writes | DOS status |
|---:|---:|---:|---|---|---|
| 3 | 14 / 2,320 | 13 | Rewrites one event record. `-2` means keep the old value in this source; it resolves omitted scene/event IDs from the current event, unregisters and re-registers the event coordinate, updates fields, and requests a scene refresh if its picture changed. | Mutates `DData` and `SData`; the dispatcher advances 14 words. (`kys_event.pas:346–390`, `kys_main.pas:6779–6784`) | Unknown |
| 4 | 4 / 167 | 3 | Compares the used `CurItem` ID with the supplied ID and chooses one of two return offsets. | Dispatcher applies returned offset and advances four words. (`kys_event.pas:392–400`, `kys_main.pas:6787–6790`) | Unknown |
| 5 | 3 / 43 | 2 | Shows a cancel/fight choice; choosing fight returns the first offset, all other choices the second. It does not itself start combat. | Redraws after the choice; dispatcher applies returned offset and advances three words. (`kys_event.pas:403–422`, `kys_main.pas:6792–6795`) | Unknown |
| 6 | 5 / 145 | 4 | Calls `Battle(battlenum, getexp)` and chooses the win or loss offset from the returned boolean. | Starts combat; dispatcher applies returned offset and advances five words. (`kys_event.pas:425–430`, `kys_main.pas:6797–6800`) | Unknown |
| 7 | 1 / 645 | 0 | No named handler: the dispatcher exits the current event loop. | The dispatcher advances one word and breaks. It does not truncate the stored event record; many records have later candidate instructions. (`kys_main.pas:6802–6806`; corpus count in `event-opcode-coverage.md`) | Unknown |
| 8 | 2 / 15 | 1 | Assigns the supplied number to `exitscencemusicnum`. | One-word advance after the opcode; no immediate music operation in this handler. (`kys_event.pas:433–436`, `kys_main.pas:6807–6811`) | Unknown |
| 9 | 3 / 81 | 2 | Shows a request-to-join choice; “要求” returns the first offset, otherwise the second. This handler alone does not add the character to the team. | Redraws; dispatcher applies returned offset and advances three words. (`kys_event.pas:440–459`, `kys_main.pas:6812–6815`) | Unknown |
| 10 | 2 / 80 | 1 | Adds the character ID to the first empty team slot. It also transfers up to four carried items into party inventory and clears those carried-item fields. If no slot is empty, this implementation makes no change. | Mutates team and character inventory fields; fixed two-word advance. (`kys_event.pas:462–487`, `kys_main.pas:6817–6820`) | Unknown |
| 11 | 3 / 7 | 2 | Shows a lodging yes/no choice and chooses one of two return offsets. | Redraws; dispatcher applies returned offset and advances three words. (`kys_event.pas:490–511`, `kys_main.pas:6822–6825`) | Unknown |
| 12 | 1 / 7 | 0 | For each party member, restores HP, MP, and physical power and reduces hurt/poison by 33, but only when hurt is not above 33 and poison is not positive. | Mutates party character records; one-word advance. (`kys_event.pas:514–537`, `kys_main.pas:6827–6830`) | Unknown |
| 13 | 1 / 346 | 0 | Initializes the scene, clears `NeedRefreshScence`, and draws a short fade-in sequence. | Presentation/scene refresh; one-word advance. (`kys_event.pas:540–557`, `kys_main.pas:6832–6835`) | Unknown |
| 14 | 1 / 171 | 0 | Draws a short fade-to-black sequence. | Presentation; one-word advance. (`kys_event.pas:560–572`, `kys_main.pas:6837–6840`) | Unknown |
| 15 | 2 / 114 | 1 candidate word | The handler takes no parameters, sets `where := 4`, draws a defeat/failure message (“勝敗乃兵家常事，但是……” / “地球上又多了一失蹤人口”), then waits for a key. | Dispatcher calls the parameterless handler, advances only one word, then breaks the event loop. (`kys_event.pas:575–589`, `kys_main.pas:6842–6847`) | Unknown |

## Opcode 15: the trailing `83`

The local candidate parser finds 114 opcode-15 records, and all 114 have one following candidate word whose value is `83`. Example: event 20 has KDEF byte offset `1930`, event source offset `1654`, and event SHA-256 `c46001a4520b033a537d58338caa27abe995bc5d8f17a62907b1a981277eaf3c`; its candidate record is opcode `15`, followed by `83`, then the `-1` record terminator.

In the pinned community Pascal dispatcher, opcode 15 consumes no argument: it calls a parameterless handler, increments the cursor by one word, and immediately breaks. Thus the next word `83` is **not read by that handler or dispatched as another opcode in this implementation**. The FishEdit-width parser instead groups it as opcode 15's one candidate argument. These two source descriptions disagree about the record boundary/consumption. The value's meaning is `Unknown`; it is not evidence for a branch, ending ID, or parameter meaning in the DOS game.

The community handler makes the user's “failure/game-over” hypothesis plausible as a research lead, because its effect is explicitly a defeat screen. It does not confirm original DOS behavior, whether opcode 15 means game over, or whether the trailing 83 has meaning. DOSBox-X sampling against an event known to contain opcode 15 is still required.

## What this establishes—and what it does not

- The pinned community source describes actual candidate mutations and screens, including that opcode 9 asks a join request while opcode 10 performs a team addition.
- The source's opcode 15 handling is parameterless and terminates the current event loop after showing a defeat/failure message. Its cursor behavior conflicts with the candidate parser's two-word width.
- None of these facts independently proves that the original executable behaves the same way. The FishEdit labels and argument widths remain candidates, and all DOS runtime effects remain Unknown.
- User-confirmed controls are recorded separately in `docs/validation/dosbox-x-debugger-and-sampling.md`; those observations do not establish opcode semantics.

## Next evidence step

Resume with one isolated DOSBox-X session only. First capture and identify the title menu, then navigate one key at a time; use the selected row's visible state before Enter. Load a known-good save before trying events. To investigate opcode 15, select an event whose trigger and prerequisites are independently identified, observe its screen and state before/after, and record the exact event/offset/starting save. Do not use `83` as a predicted game-over code or synthetic parameter unless original runtime evidence establishes that role.
