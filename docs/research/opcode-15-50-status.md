# Opcode 15／50 research status

Date: 2026-11-12. Current confidence for DOS runtime behavior: limited original execution cases; full opcode semantics remain unverified. See [opcode 15 DOS observation](../validation/opcode-15-dos-observation.md) and [opcode 50 DOS observation](../validation/opcode-50-dos-observation.md).

This page replaces the earlier summary that said the Pascal dispatcher omitted opcode 15. That statement was incorrect: the checked-in community Pascal dispatcher calls `instruct_15` and breaks its event loop. It also corrects a later description that said the dispatcher advanced across a two-word record: source inspection shows it increments the word index by **one** before breaking.

## Opcode 15

- Local corpus: 114 occurrences; all 114 candidate records have a following 16-bit value of `83` under the FishEdit 0.72 two-word layout.
- FishEdit 0.72 describes it as death/return-to-menu and documents parameter `5300`, which corresponds to decimal `83` in its stated low-byte-first encoding.
- `kys-jedisdl` Pascal `CallEvent` calls parameterless `instruct_15`, increments the word index by one, and breaks the event loop (`kys_main.pas:6842–6847`). The handler sets `where := 4`, displays a defeat/failure message and waits for a key (`kys_event.pas:575–589`). This is community behavior, not Original Verified.
- Consequently, that dispatcher does not consume the following candidate word `83` as an argument. FishEdit's candidate width groups opcode 15 and 83 together, so the candidate layout and community dispatch consumption disagree. The word's DOS meaning remains Unknown.
- The local follow-up pattern is 109 times opcode 7 and five times `-1`. All 1,018 event resources end with `-1`. The bytes therefore do not support treating `-1` alone as a win ending. The user's suggestion that 7 and -1 mean death/win endings remains unverified.
- A controlled DOSBox-X replay of unchanged original event 190 with synthetic HP 1 twice produced battle loss followed by the death/load page. The original event's loss path contains `15,83`. This is strong behavioral evidence for that path, but no DOS instruction trace isolates whether 15 consumes 83 or whether the following 7 executes. The role of `83` remains Unknown.

**2026-11-14 DOS 補證**：本機原版 handler `0160:001E15CF` 在隔離 `15,83,7` 腳本中實際命中。其機器碼讀取下一個 signed word 並作為處理函式參數，之後出現死亡／讀檔頁。因此本 DOS 版本**會讀取 `83`**；上方社群版「只前進一字」不適用於本機二進位。返回路徑靜態指令為游標加 2，但本案例處理函式未返回到所設停點；`83` 的具體意義與 `7` 是否執行仍 Unknown。見[限定 trace](../validation/opcode-15-83-binary-trace-20261114.md)。

後續將 Synthetic Script 第二字改成 `82`，死亡／讀檔頁的精確 PNG 與 `83` 案 SHA-256 完全相同。此對照只涵蓋可見畫面，不把 `83` 標為無效參數；隱藏狀態與函式內資料流仍待查。

## Opcode 50

- Local corpus: one occurrence, event 676, arguments `138,139,140,141,142,6,0` under the FishEdit candidate width.
- FishEdit 0.72 describes a five-item check with two relative offsets. Its active `FishEdit.ini` disables branch annotation for opcode 50, so structural audit does not validate these destinations.
- `kys-jedisdl` Pascal dispatches to `instruct_50`; values greater than 128 (or `MODVersion=11`) take a five-item check, while other values route to an extension path. For the sole local case, first value 138 selects the five-item path. The handler tests IDs 138–142 by searching inventory slots, then returns candidate offset 6 if all are found or 0 otherwise. The dispatcher adds that return to the position after the 8-word candidate instruction. After the handler, its general return path may instead write back dynamic event data for sufficiently large values. This is an implementation from that community source, not DOS proof.
- The local structure audit identifies candidate destinations at word offsets 14 and 8. DOSBox-X event 676 replays show all five items present takes the reward branch, none or any one of the five missing takes the missing-material branch. In the latter cases the four other items remain. A synthetic `(140,0)` slot still takes the present branch; reversing five slots does not change it; unrelated ID 200 survives the reward branch. These are local cases, not proof for every inventory encoding. The community handler checks for matching IDs, not positive amounts.

## Evidence boundaries

The 68-row width/count/handler/runtime inventory is in [event-opcode-coverage.md](event-opcode-coverage.md). Full candidate test cases are in [opcode-15-50-cases.md](../validation/opcode-15-50-cases.md). The structure audit validates candidate record boundaries and offsets; it does not establish runtime semantics or route reachability. Do not implement opcode 15 as a comparison branch.

## Next replay evidence

Continue with the isolated session-002 copy documented in [DOSBox-X debugger and sampling](../validation/dosbox-x-debugger-and-sampling.md). The legitimate in-game third-slot baseline and reversible synthetic copies are recorded in ADR0039. Capture before/after screens and read-only runtime state; use a short debugger trace only when exact DOS instruction behavior is needed. Do not edit commercial original files or treat community candidate offsets as generally verified.
