# ADR 0038: Confirm the live session at the start of a new user-directed operation

Date: 2026-11-11
Status: Accepted by the user

## Context

A title-menu `Down` + `Enter` action was attempted without confirming the currently selected entry. The game returned to the DOS prompt, so the result did not identify the menu selection or provide useful opcode evidence. The user requires a fresh state check after a new user instruction starts or redirects a non-continuous operation. This is a task-boundary check, not a requirement to repeat the full inventory before every tool call in one continuous operation.

## Decision

- When an abnormal or ambiguous result appears, inspect the exact window's current image or dialog text before diagnosing or sending another action. A PAUSED title, incomplete log, CPU activity, or TCP connection alone cannot distinguish a modal warning from a hung load. Check owned/modal windows as well. If background capture shows an occluding app, it is not evidence of the target's content; recover the target capture before reasoning from it.
- Before restoring emulator state, match the exact build including SDL1 versus SDL2. Read any mismatch warning; do not force a cross-build restore as a recovery shortcut.
- At the start of a new user-directed operation, enumerate DOSBox-X windows and identify the intended session by exact HWND, PID, title, and window class.
- Read the current game page from that exact game's own capture path. Never infer it from another session, a stale capture, or a desktop-wide screenshot.
- Confirm whether the guest is Running or paused when that distinction affects the requested operation. Query debugger state only through a console/control channel verified to belong to that exact session. If the mapping is uncertain, do not issue debugger commands.
- Within one continuous operation, carry forward the last confirmed state; do not repeat the full inventory for every tool call. Verify an action's result when the next dependent action requires that result to be known.
- Do not batch ambiguous menu inputs or confirm an option before its selection is known. If an action returns to a DOS prompt, changes title/HWND/PID, or otherwise invalidates the state assumptions, rediscover the affected state before continuing.
- Before launching or restarting a session, check whether its exact process is already running. An access-denied or not-found result from a lower-privilege process query is not evidence that the emulator is absent; re-query with the same privilege context used to operate it. Reuse the existing exact session instead of opening a duplicate. If a duplicate was created by this operation, close only that known PID and verify the remaining window inventory.
- Keep at most one DOSBox-X game session open for this project's interactive verification. When a known checkpoint exists, resume it with DOSBox-X `Capture > Load state` and its recorded slot rather than reconstructing progress by rewriting game save files. Record the state file/hash and emulator config/version; create a new emulator window only after confirming no current game session exists.
- Keep save files read-only during reconnaissance. Use a copied slot for edits; identify all files/offsets changed and preserve a known-good baseline hash.

## Consequences

Each new user-directed operation starts from an observed session/page state. State is carried through continuous work and refreshed only when a new user instruction starts or redirects the operation, or when an observed transition invalidates it. Ambiguous menu navigation becomes a state-identification task rather than a claimed test result. Session identity and privilege boundaries must also be resolved before launch/restart; an unobservable process must not be treated as a missing process. This decision applies across games using the shared DOSBox-X operator skill.
