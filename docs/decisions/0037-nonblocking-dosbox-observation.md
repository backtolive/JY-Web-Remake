# ADR 0037: Observe DOSBox-X gameplay without pausing the guest

Date: 2026-11-11
Status: Accepted

## Context

The session-002 game is also the debugger's guest process. Breakpoints set at a frequently executed code address and on INT 21 repeatedly stopped and resumed the guest after **Run Normal**. The user observed the console alternating between `I->` and `(Running)`, delayed keyboard response, and inconsistent screenshot timing. `BPLIST` confirmed `BP 0160:1D543E`, `BPINT 21`, and `BPINT 21 AH=4B`; deleting all three restored an empty breakpoint list and the console returned to `(Running)`.

## Decision

- Prefer non-pausing evidence for gameplay tests: read item-count values from memory without modifying them, and/or compare game-page images before and after an action.
- For a known operation with an expected result, wait at least one second between input commands and use the expected state transition or file/log evidence; do not capture and inspect an image after every command. Capture the exact game window only when the result is unexpected or ambiguous, or when a milestone needs visual evidence.
- Use DOSBox-X's built-in Save state / Load state to checkpoint and restore the full emulator session when the goal is to return to the same guest progress. Record the selected DOSBox-X slot, state-file path, DOSBox-X version/configuration, and state-file hash. Keep this separate from the game's own R*.GRP/S*.GRP/D*.GRP save slots. A save-state snapshot is an explicit user-approved emulator checkpoint, not a routine pause for observation.
- Do not use breakpoints to observe item counts, page changes, or other tests that do not require the guest to stop.
- Do not pause the whole game as a routine precondition for observation. Keep the DOSBox-X guest running while collecting evidence.
- Freeze the guest only for these two reverse-engineering tasks:
  1. Trace binary instructions / disassembly at a specific execution point.
  2. Capture a complete save-area or memory snapshot before an action, resume for the action, capture the after snapshot, then diff them to locate the memory address that stores the target save data.
- For either exception, freeze only while taking a consistent snapshot or tracing the required instruction window; resume during the user's game action. Record the target and reason. Remove temporary breakpoints before returning to normal play or capture.
- Continue using exact window identity and game-only capture; do not use desktop-wide screenshots for visual checks.

## Consequences

Routine interaction tests can preserve keyboard responsiveness and render/capture continuity. Images are reserved for unexpected/ambiguous results or milestone evidence, not every input. Emulator state checkpoints allow exact progress restoration without editing native game save files; they must be separately hashed and identified. Memory observations must remain read-only and be validated against game behavior. Debugger CPU state is supporting evidence and must not be treated as a substitute for observed game behavior.
