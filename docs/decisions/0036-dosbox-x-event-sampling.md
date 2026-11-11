# ADR 0036: DOSBox-X event sampling uses isolated sessions and loopback debugger control

Date: 2026-11-11
Status: Accepted for validation workflow; end-to-end replay pending

## Context

Event behavior cannot be marked verified from a structural parse, FishEdit descriptions, or community-engine code alone. DOSBox-X 2026.10.01 provides a built-in debugger and a local debugger-control protocol. The existing `session-001` has been used as a baseline and must not receive synthetic-save edits.

## Decision

- Preserve `session-001` as the baseline and use a separate copied `session-002` for interactive save work.
- Keep a SHA-256 manifest of session-002 root-level RANGER/R1-R3/S1-S3/D1-D3 save-related files before any game save or edit.
- Configure debugger control on loopback only (`127.0.0.1:58991`); require a live debugger response before treating a command as executed.
- Record normal in-game saves as `Original Save`; any byte-edited save remains `Synthetic State` until loaded and behaviorally sampled in DOSBox-X.
- Mark each opcode effect by evidence class. Candidate widths and community handlers are implementation leads, not `Verified Original` behavior.

## Consequences

The workflow keeps baseline state recoverable and creates reproducible evidence artifacts. Automated desktop access and actual TCP control still need to pass before event replay can be considered automated. The 68-row catalog exposes current Runtime gaps but does not implement those effects.
