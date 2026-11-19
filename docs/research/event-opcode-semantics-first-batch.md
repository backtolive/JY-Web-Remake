# Event opcode semantics — first static evidence batch

Date: 2026-11-11
Phase: Phase 3 local research; Phase 3 / 6 overall acceptance remains incomplete.
Status: Six common opcodes have a source-separated static comparison. This is not DOS runtime verification.
Confidence: FishEdit layout/labels and `kys-jedisdl` behavior are `Community Implementation`; original DOS behavior remains `Unknown`.

## Sources and limits

- Local event corpus: `assets/generated/event-corpus/all-events-ce00ac1ebede9e7e.local.json`, built from local KDEF/TALK inputs. Corpus input hashes and candidate parser version are recorded in `docs/validation/full-original-event-corpus.md`.
- Candidate record widths and descriptions: FishEdit 0.72, pinned source commit `1d439afe76dae41c821065c3a33c1c6709dc7fce`; local INI SHA-256 `3063b99eca031d9157d94387caa0536eae99b3c1114afb476d641f1710a06064`. FishEdit documentation warns its descriptions may be wrong.
- Handler behavior: `references/kys-jedisdl/kys_event.pas`, repository commit `4d225cb9b7b9a3ac46a796ecb0acde525ef72acc`; dispatch and relative-return handling: `references/kys-jedisdl/kys_main.pas`. This is a community engine, not the DOS executable.
- Each corpus sample below is identified by event ID, KDEF byte offset, instruction-relative byte offset, and the event record SHA-256. The numeric argument list is the candidate parser's signed 16-bit interpretation, not a claim about the values' runtime meaning.

## First batch

| Opcode | Frequency | Candidate arguments / FishEdit label | What the community handler actually does | State / control-flow evidence in that source | DOS status |
|---:|---:|---|---|---|---|
| 0 | 4,108 | No arguments; “clear foreground display” | `instruct_0` calls `InitialScence(1)` only when `NeedRefreshScence=1`, clears that flag, then calls `Redraw`. It does not simply clear every layer of the screen. (`kys_event.pas:117–127`) | Reads and clears `NeedRefreshScence`; redraws presentation. Dispatcher advances one word. | Unknown |
| 1 | 3,561 | `[talk ID, portrait ID, display mode]`; dialogue | `instruct_1` selects portrait/dialogue positions from `dismode`, loads the selected TALK byte range, draws text and portrait, waits for a non-direction key, then redraws. (`kys_event.pas:129–247`) | Presentation and input wait; no game-state write identified in this handler. Dispatcher advances four words. | Unknown |
| 2 | 325 | `[item ID, amount]`; “get item” | Calls `instruct_32(item, amount)`, then draws a “got/lost item” notification based on the sign and displays the numeric amount. (`kys_event.pas:251–278`) | Delegates inventory mutation to opcode 32 and waits for a key after displaying a notice. Dispatcher advances three words. | Unknown |
| 16 | 80 | `[character ID, if-in-team offset, if-not-in-team offset]`; team-membership check | Scans six `Teamlist` entries; returns the first offset if the character ID is present, otherwise the second. (`kys_event.pas:590–601`) | Dispatcher adds the returned offset and then adds the four-word instruction width. This is a community-source relative-branch formula, not yet a DOS-verified rule. (`kys_main.pas:6847–6852`) | Unknown |
| 18 | 2 | `[item ID, if-present offset, if-absent offset]`; item check | Scans `RItemList` for a matching `Number`; returns the present offset if found, absent offset otherwise. It does not inspect `Amount` in this handler. (`kys_event.pas:617–628`) | Dispatcher adds returned offset and then the four-word instruction width. Whether a zero-count item can remain in this list is not resolved here. | Unknown |
| 32 | 160 | `[item ID, amount]`; increase item quantity | When amount is nonzero, searches `RItemList`; adds the amount to a matching entry or writes a new entry, clamps certain negative wraparound cases, then calls `ReArrangeItem`. (`kys_event.pas:912–941`) | Writes inventory list and invokes rearrangement. No user-facing notice is drawn by this handler itself. Dispatcher advances three words. | Unknown |

### Corpus examples

These are candidate-decoded instruction examples; source offsets are byte offsets into `KDEF.GRP`.

| Opcode | Event | Event byte offset | Instruction byte offset within event | Candidate args | Event SHA-256 |
|---:|---:|---:|---:|---|---|
| 0 | 0 | 0 | 0 | `[]` | `b7d1b3a1104cc86b1cea310793cf777002db0517281d135a02de079b0ea87c23` |
| 1 | 1 | 4 | 4 | `[0, 1, 0]` | `bbbb4ad00ed6075c644daef51a87ddde1daee158147182fd5cbf238ea113a024` |
| 2 | 13 | 1414 | 1444 | `[11, 3]` | `ab9a28188b0c436a19de22d6e182d52924ae8fc6504a8022d21c8d68f09ba9d8` |
| 16 | 27 | 2266 | 2266 | `[1, 1, 0]` | `976f666f9c9ac4b0b87f00f7e2bb43646240f00fef488375e376b5f8957db4fd` |
| 18 | 37 | 3770 | 3770 | `[173, 0, 15]` | `9dffd5525639978f026ae57f9f087c8d00e96962a5c841a9db9f25a6021feb09` |
| 32 | 10 | 864 | 930 | `[133, -1]` | `1014503f653c547cce3fcc67e7f9fdab09b61532977c5b925d941c7f5303ca20` |

## What this establishes—and what it does not

- It establishes that the pinned community implementation treats opcodes 2 and 32 differently at the presentation layer: opcode 2 delegates to the inventory mutation and then displays a notice; opcode 32 performs the mutation without that notice in its handler.
- It establishes how that community source reads the team and item lists for opcodes 16 and 18, and how its dispatcher applies their returned offsets.
- It does not establish that the DOS game uses the same data structure, item-presence condition, branch formula, screen wait, or state side effect. FishEdit's description is another candidate source, not independent runtime proof.
- No DOSBox-X action, pause, breakpoint, or gameplay test was performed for this static batch. Opcode adapter implementation should wait until the desired DOS behaviors are independently supported.

## Next evidence step

Use a legal in-game save in isolated session-002 to select a reproducible event case for one state-changing opcode. Keep the game running during ordinary input and page observation; compare read-only memory values only after the corresponding inventory address is known. If that address must be found, follow ADR0037: freeze only for consistent before/after snapshots, resume for the action, then diff. Record the exact event, starting save hash, input, page result, state delta, and whether any branch was taken. Do not use a community handler or FishEdit label as the expected result.
