# ADR 0058：全事件靜態檢查與執行證據分級

日期：2026-11-19。狀態：Phase 3／6 局部盤點；不宣稱全事件可執行。

`tools/analyzer/audit-event-conversion-coverage.mjs` 逐筆讀取本機 0.3.0 KDEF／TALK 語料及原始檔，核對來源 SHA-256、每筆原始 bytes、偏移、候選指令與參數、對話 ID、候選跳轉目標，並使用現行 `readDialogueOnlyEvent` 判斷**狹義純對話預覽**資格。這是一次批次資料檢查，不啟動 DOS 或執行 1,018 個事件。

報告把三層結果分開：`candidateLayoutValid` 只代表候選切分與原始 bytes 一致；`previewEligible` 代表目前唯讀預覽器可接受且至少有一段對話；`runtimeStatus` 只標明有無來源鎖定的已觀察路徑轉接器。事件 673 僅在七個來源雜湊及事件記錄雜湊相符時標成 `source-locked-observed-path-only`。這不能推廣到同 opcode 的其他事件。

輸出 JSON 只寫在 Git 忽略的 `assets/generated/event-coverage/`，逐事件保留 ID、來源偏移／雜湊、候選 opcode 組合、預覽拒絕原因、執行轉接狀態。摘要另外以 `0`、正值、`-1`、`-2` 等形狀統計 opcode 3 的 13 個候選參數；**參數形狀相同不代表效果相同**。後續選樣時先依形狀與前置條件分組，再只對新增語意做 DOS 比對。

候選切分依 FishEdit 0.72 釘選版本，並非 DOS 指令游標或分支語意的原版驗證。初始 ALLDEF 互動引用不涵蓋動態改寫、自動或道具觸發。語料與正式 Runtime／存檔仍需分開；報告不可直接餵入執行器。
