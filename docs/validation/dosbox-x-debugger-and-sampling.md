# DOSBox-X 操作、除錯及存檔採樣路徑

Date: 2026-11-11

## Current verification

- DOSBox-X 2026.10.01 opened the isolated game copy and reached its title screen. The log shows `Z.COM` loading `Z.DAT`, launching `DOS4GW.EXE`, and reading the game's resource files.
- All six requested keys now have visible game-response evidence in session-001: Up/Down changed title/load-menu selection; Enter opened the load-slot menu and loaded the existing progress-1 save; Left/Right moved the map relative to the centered character; Up/Down moved the map vertically. Escape was received, after which the game area stayed black. Escape's game meaning is still unknown, so this does not count as confirmed return/quit behavior. No new save was created.
- The working route is direct `WM_KEYDOWN` + `WM_KEYUP` `PostMessage` to the exact DOSBox-X game HWND, using `scripts/Send-DOSBoxX-Key.ps1`. Elevated PowerShell was required in this environment: the ordinary shell got Win32 error 5 for `PostMessage`; elevated delivery returned success and visible game movement/selection. The script matches one exact window title and refuses zero or multiple matches. It reports that messages were queued; only the visual game response is evidence that the game consumed them.
- The desktop controller's own `click`/`pressKey` APIs still report `GetCursorPos failed: Access denied`; `SendInput` also could not safely acquire foreground focus. These are not blockers for the direct elevated `PostMessage` route. Do not use global key broadcast.
- session-002's game window is titled with a `DEBUGGER` suffix and stayed black through `RUN`, `BREAK`, and `VRD`. A targeted Up message was accepted by Windows but produced no visible response. The working game-control result therefore remains session-001; debugger mode/game display integration still needs investigation.
- The Debug menu exposes **Start DOSBox-X Debugger**, **Run debugger**, **Run normal**, and **Run watch**. The debugger window displayed EAX–EIP, CS:IP disassembly, data view and file-open log rows. This confirms the debugger build is present.
- A separate local copy was made at ignored path `assets/generated/dosbox-x/session-002/game`. Twenty root-level save-slot files (RANGER, R1–R3, S1–S3, D1–D3, including IDX/GRP where present) had identical SHA-256 values between session-001 and session-002 immediately after copying. No save was written in this session yet.

## Interactive launch

Use `scripts/Start-DOSBox-X-Session-002.cmd`. It mounts only the session-002 game copy and uses `session-002/dosbox-x.conf`; save writes therefore cannot touch `original/dos` or session-001. To send one key to a visible game window, run PowerShell elevated and pass its exact current title:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/Send-DOSBoxX-Key.ps1 -Key Right -WindowTitle "DOSBox-X 2026.10.01: Z - 20000 cycles/ms"
```

Supported `-Key` values are `Up`, `Down`, `Left`, `Right`, `Escape`, and `Enter`. The script refuses ambiguous title matches. If several DOSBox-X windows share the same title, pass the decimal HWND reported by the Windows window inventory as `-WindowHandle`; the helper still validates the exact title and handle together. Verify the resulting game screen; a successful `PostMessage` call by itself only proves that Windows accepted the message. A cursor movement alone is not a game response.

The game's original save files are root-level files in this distribution (`RANGER.GRP/IDX`, `R1–R3`, `S1–S3`, `D1–D3`). A community Pascal implementation instead opens `AppPath + 'save/...'`; that directory disagreement means its path layout must not be imposed on the DOS original. Create a normal in-game save in session-002 first, then hash the changed slot set and use that as the replay baseline.

## Built-in debugger and local TCP control

Official DOSBox-X `README.debugger` describes the debugger and its loopback protocol (`PING`, `BREAK`, `EXEC`). This 2026.10.01 session config sets `mcp_server=58991`; DOSBox-X connects as a TCP client to `127.0.0.1:58991`. Start the bridge before the emulator:

```powershell
node tools/validator/dosbox-x-debugger-control.mjs --port 58991 --timeout 90000 HELP
```

Then start session-002 with `scripts/Start-DOSBox-X-Session-002.cmd`. The bridge issues one request per invocation. `EXEC` runs a debugger command; `--action PING` checks the channel; `--action BREAK` asks DOSBox-X to enter the debugger. Examples:

```powershell
node tools/validator/dosbox-x-debugger-control.mjs --action PING
node tools/validator/dosbox-x-debugger-control.mjs HELP
node tools/validator/dosbox-x-debugger-control.mjs 'BPINT 21 4B'
node tools/validator/dosbox-x-debugger-control.mjs BPLIST
node tools/validator/dosbox-x-debugger-control.mjs --action BREAK
```

Live session-002 verification passed: `PING` returned `PONG`; `HELP`, `CPU`, and `BPLIST` returned output; `BPINT 21 4B` and `BP 0160:001D543E` were accepted and later appeared in `BPLIST`. `RUN` returned `OK`, which the manual defines as acceptance only. `BREAK` returned an acknowledgement. The debugger screen still showed `RUN` afterward, and this bundled build did not recognize `STEPIN`; therefore a breakpoint visibly halting execution and single-step are not yet confirmed. The address came from live `EV CS EIP` output and is a DOSBox-X session address, not an opcode/event address. `BPINT 21` may fire frequently. `MEMREAD` constraints and real-mode restrictions still apply.

The bridge binds only to loopback and handles one command at a time. Node unit tests cover PING/BREAK/EXEC request framing and response collection. The earlier sandboxed mock loopback attempt was denied with `EACCES`; the elevated local bridge and isolated session-002 now complete the documented handshake and debugger requests. The desktop controller still denies window activation, so use debugger control rather than relying on the CUA key API for debugger interactions.

## Save-based event sampling

The safe sampling loop is:

1. Boot session-002 and use the normal in-game save UI to create a named slot. Capture the save file set and SHA-256 hashes before editing anything.
2. Copy that baseline to a new sample directory. Never edit the only copy of a known-good save.
3. To replay an event, first discover the event trigger and required state from verified game data or a repeatable route. If constructing a synthetic save is necessary, record every modified file, byte offset, prior/new value, and classify it `Synthetic State` until DOSBox-X accepts and loads it.
4. Load the sample in the game, capture the event and post-event state, and compare save hashes / game-visible state against the baseline. Keep game behavior evidence distinct from community-engine inference.

The Pascal `LoadR`/`SaveR` code is a useful candidate layout, but it reads an eight-word offset table and fixed record arrays from a different directory convention; no synthetic save layout is declared DOS-verified here. Do not jump to a target event by changing guessed offsets until a legitimate session-002 save is available and its coordinates/state fields are matched against the source layout.

## References

- [DOSBox-X debugger manual](https://github.com/joncampbell123/dosbox-x/blob/master/README.debugger) — debugger modes, breakpoint commands, `DEBUGBOX`, local `mcp_server` protocol, and `MEMREAD` constraints.
- [DOSBox-X command-line options](https://dosbox-x.com/wiki/DOSBox%E2%80%90X%E2%80%99s-Command%E2%80%90Line-Options) — `-keydbg`, `-break-start`, `-console`, `-log-int21`, and `-log-fileio`.

## Status

Boot/title display: passed. Six-key input: visibly passed in session-001 (Escape produced a black game area, semantics unknown); repeat against isolated session-002 remains useful for a clean reproducible capture. Existing progress-1 save load: passed; creating a new save and checking hashes: pending. Debugger TCP: PING and EXEC passed; BP/BPINT set and listed; BREAK acknowledged, but actual stop-at-breakpoint is not confirmed and STEPIN is unsupported by this bundled build. Event jump/replay: not yet implemented or verified.
