# 全量原版事件／對話結構轉換

日期：2026-11-09
Phase：3 局部資料轉換；Phase 3／6 整體未驗收
可信度：Community Implementation

## 結果

`tools/extractor/convert_original_event_corpus.py` 將本機原版來源轉成完整、可追溯的 JSON 中間資料，輸出只寫至 Git 忽略的 `assets/generated/event-corpus/`，不納入版本控制。

- 1,018／1,018 個 KDEF 事件可依 FishEdit 0.72 候選表切分；輸出 14,333 個記錄（含每事件一個 `-1` 結尾），其中 13,315 條是候選指令。
- 2,977／2,977 個 TALK 資源以 CP950 解碼，0 筆解碼失敗；原始 bytes 以 base64 保留，文字控制碼另以 token 保留。
- 3,561 個 opcode 1 對話引用全部能找到 TALK 資源。
- 16,061 個目前互動欄位事件引用全部指向有效事件 ID。
- 依 FishEdit 啟用表計算的候選跳轉目標全數落在候選指令起點或事件終點；Opcode 50 的動態分支不在此檢查內。
- 每項 KDEF／TALK 及來源檔均保留來源偏移、長度與 SHA-256。

## 尚未完成的執行轉換

此資料集不是可執行的遊戲內容包。參數目前保留為原始整數，不推定 flags、人物、道具、金錢、隊伍、戰鬥、切圖等狀態效果，也沒有完整遊戲 Runtime 可回放全部事件。

- Opcode 15 共 114 次：在 FishEdit 候選布局下每筆後續欄位都是 83；其後 109 筆接 opcode 7、5 筆直接接 `-1`。FishEdit 0.72 將 15 描述為死亡返回選單 `(5300)`，`5300` 按其文件位元組序為 83。Pascal／Lua 社群引擎也將 15 當停止／Game Over 類指令，但不讀該欄位。使用者已排除「15 是比較條件分支」的未驗證資料。全部 1,018 個事件均以 `-1` 結尾；Pascal 把 7 當事件中止、負數當事件讀取結束。使用者提出「7 是死亡結局、-1 是破關結局」仍待實際案例驗證，現有資料不支持這種結局分類。
- Opcode 50 共 1 次（事件 676）：FishEdit 文件的五物品條件說明與 Pascal 動態分支／事件資料改寫路徑不同；未證明哪個等同 DOS 原版。
- 其他 opcode 有社群實作可作候選語意，但未透過 DOS 原版逐項比對。
- 事件引用盤點目前只涵蓋 ALLDEF 的目前互動欄位；自動觸發、道具觸發與事件表動態寫入未被完整解決。
- UI 尚未提供全部事件的執行／狀態差異驗證器。

## 驗證界線與下一步

已驗證的是候選結構切分、原始來源追溯、解碼與引用完整性，不是事件可達性或事件執行結果。下一步應先建立版本化事件 IR 與逐 opcode 語意／狀態效果對照表；把有證據的命令實作進受控 Runtime，未解命令須停在事件並保留事件前狀態。之後再逐事件比較前後旗標、物品、角色狀態、位置與地圖切換。Opcode 15／50 的 DOS 原版案例仍是阻擋其正確執行的具體問題。

## 2026-11-14：限定 opcode 55 游標註記

轉換器 0.2.0 以**同時符合** `KDEF.GRP` SHA-256 `135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06` 和 `KDEF.IDX` SHA-256 `bf02eccf1dab01fd0ae033cdf807f56b978a71a6c2ab9be05e366239b485104b` 為守門，將[原版事件 464 單點 trace](opcode-55-original-event464-trace-20261114.md)的 DOS 游標觀察附在 28 筆同形 opcode 55 上。新本機產物是 ignored 的 `assets/generated/event-corpus/all-events-f74f14cb52d63561.local.json`；舊產物保留供先前研究文件重現。

每筆新增 `originalDosCursor.nextWordOffset`（五字候選記錄起點 +4）、`nextWordValue=0`、證據路徑與等級。事件 464 的四筆標 `Verified Original`，其餘 24 筆標 `Inferred from same-shape source bytes`。FishEdit 的 `candidateBranchTargets` 照舊保留並標 unverified；本資料集仍為 `executable:false`，未把原版命令效果直接轉為通用 Runtime。

全量重跑得到 1,018 事件、14,333 記錄、2,977 對話、28 筆限定游標註記。移除新增註記及版本／摘要欄後，0.2.0 與舊產物 JSON 完全相同。這證明本次沒有改動原始 bytes、對話、來源偏移或其他候選指令。測試包含作用範圍拒絕非同形 55 案例及 `tests/unit/test_original_event_conversion.py`。

## 2026-11-15：opcode 55 後續 opcode 3 的限定欄位註記

轉換器 0.3.0 在同一雙雜湊守門下，為 28 組 `55 → 3` 的 opcode 3 加不可執行的 `originalDosEventUpdate`。事件 464 的槽 2 實際差分證明欄 2／3／4 寫入 `862／-1／-1`；其他欄位、其他案例仍保留證據分級。事件 303 中檢查槽 4 與更新槽 2 不同，註記分別記錄兩者。見[欄位差分](opcode-3-after-55-event464-fields-20261115.md)。

本機產物為 ignored `assets/generated/event-corpus/all-events-a1d24e65a50b8f98.local.json`。事件 ID、`-1` 欄位寫入及圖像欄保留各自標示證據等級。移除新註記、版本、摘要及限制欄的新增文字後，與 0.2.0 產物逐欄相同；1,018 事件及 2,977 對話不變。`executable:false` 仍然是硬邊界。現有 Web 原版讀取器只能接受 296 個只含 0／1／7／終止符的候選事件；其餘 722 個至少含一個效果、分支或未實作指令，這是完整劇情遊玩尚未完成的具體缺口。
