# 全事件靜態覆蓋檢查 — 2026-11-19

輸入：`assets/generated/event-corpus/all-events-a1d24e65a50b8f98.local.json`（轉換器 0.3.0）與本機 `original/dos`。命令：

```powershell
node tools/analyzer/audit-event-conversion-coverage.mjs assets/generated/event-corpus/all-events-a1d24e65a50b8f98.local.json original/dos
```

逐事件結果：[本機 JSON 報告](../../assets/generated/event-coverage/event-coverage-4549c70938ff2500.local.json)，被 Git 忽略，不含在部署包中。來源全檔及每筆 KDEF／TALK 原始 bytes、偏移與雜湊都核對；候選指令與參數按原始 int16 再核一次。初始 `ALLDEF.GRP` 互動欄位的 16,061 個引用亦從原始 bytes 獨立重建後與語料逐項比對，0 個無效引用。

| 檢查 | 結果 | 意義 |
|---|---:|---|
| KDEF 事件候選切分與原始 bytes 一致 | 1,018／1,018 | FishEdit 候選結構；不是 DOS 執行驗證 |
| TALK ID 引用有效 | 1,018／1,018 事件 | 該事件內所有 opcode 1 都指向現有 TALK 資源 |
| 候選跳轉目標落在候選邊界 | 1,018／1,018 | 不含 opcode 50 動態分支語意 |
| 對話參數符合現有預覽器限制 | 1,003／1,018 | 另 15 筆涉及肖像／側別或文字控制的預覽限制，不代表原始資料錯誤 |
| 可進入現有純對話預覽 | 264／1,018 | 至少一段對話，且現有狹義讀取器接受 |
| 有來源鎖定的限定執行路徑 | 1／1,018 | 事件 673 的已觀察路徑；非整個事件系統 |

其餘預覽結果：721 筆遇到預覽器不支援的指令、10 筆由讀取器直接拒絕對話參數、23 筆沒有對話。15 筆參數不符者有 5 筆同時先被其他不支援指令擋住，因此這些分類數量不能直接互減。

全語料有 179 種 opcode 集合。opcode 3 出現在 587 個事件、共 2,320 次；僅以候選參數的正值／零／`-1`／`-2` 形狀分組，已有 102 類。這些是**待挑選對照案例的結構索引**，不是 102 個已確認的效果規則。下一個樣本應從同形案例和已有 DOS 欄位差分中選一組，核對其前置與實際寫入，再決定能否共享轉換規則；不必對 587 個事件各做一次 DOS 遊玩測試。

測試：`tests/unit/event-conversion-coverage.test.mjs` 驗證來源位元組改動、指令參數改動及引用錯誤不會被標成可執行。證據分級與限制見 [ADR 0058](../decisions/0058-static-event-coverage-gate.md)。
