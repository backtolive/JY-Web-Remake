# 事件 581 槽位段落比對 — 2026-11-19

原版 DOS 前後狀態來源：[opcode 20 滿隊分支觀察](opcode-20-dos-observation.md)。本輪沒有啟動 DOS 或改動存檔；以釘選的本機原始檔重算候選 opcode 3 的欄位投影。

```powershell
node tools/extractor/compare-original-event-581-slot.mjs original/dos
```

產物：[本機來源鎖定結果](../../assets/generated/event-comparisons/event-581-slot-362825d234ab4fac.local.json)，被 Git 忽略。KDEF event 581：byte 88988、106 bytes、SHA-256 `ac27f3fee143440e3d3af716d1b460e703959545f58d7f93a604c3a7f5e74386`；候選 opcode 3 位於 word 15／KDEF byte 89018。三個來源檔雜湊與記錄雜湊均核對。

| 隔離採樣前置 | 場景 32／槽 2 前值 | DOS 後值 | 本輪候選投影 |
|---|---|---|---|
| 單人隊伍 | `[1,2,-1,-1,-1,2718,2718,2718,0,30,21]` | `[0,0,-1,-1,-1,-1,-1,-1,0,30,21]` | 相符 |
| 六人滿隊 | 同上 | 同前值 | 不執行該分支的投影；相符 |

結果是**Source Confirmed 參數位置＋Verified Original 段落終態**的配對，不能標為「Verified Original opcode 3 各欄規則」。候選前後相鄰的 opcode 14／0／13 未被單獨排除；`-1` 欄位也沒有改前值對照。此案只支持以該路徑繼續設計隔離採樣，不開放 106 個同形事件的自動執行。

測試：`tests/unit/original-event-581-slot-comparison.test.mjs` 驗證本機來源、候選 offset、前後投影、來源改動拒絕與原始檔不變。決策見 [ADR 0059](../decisions/0059-event-581-slot-segment-comparison.md)。

後續[單指令 DOS 對照](opcode-3-shape581-isolated-20261119.md)已排除相鄰指令對已變欄位的必要性，並以改前值確認欄 3／4 寫入 `-1`。本段保留本輪靜態比對時的證據範圍。
