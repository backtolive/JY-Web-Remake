# 原版純對話事件目錄 — 2026-11-02

Phase: 3／5 局部。Status: 全量靜態目錄完成，未轉換新的可玩事件。

執行 `node tools/analyzer/catalogue-dialogue-events.mjs original/dos`。輸出為 `assets/generated/event-catalogue/dialogue-events-b91c6306a273204c.local.json`，已確認 Git 忽略。相同 bytes 重跑輸出相同路徑與內容；輸出檔使用排他建立，已有內容必須完全相同。八份輸入讀取前後 SHA256 一致。

| 分類 | 數量 |
|---|---:|
| KDEF 事件總數 | 1,018 |
| 純對話且 TALK 引用／文字驗證通過 | 264 |
| 支援子集但無對話 | 23 |
| 拒絕 | 731 |
| 純對話且被目前場景互動欄位引用 | 72 |
| 84 場景互動欄位超出事件範圍 | 0 |

拒絕統計按第一個失敗位置分類，不是整個事件所有指令的頻率。包括 10 筆 EVENT_DIALOGUE_PARAMETERS，其餘 721 筆為目前子集不支援的 opcode；這些事件不轉譯、不略過錯誤。原始參數差異保留待研究，未放寬解析器。

場景 1：事件 668／槽 2／cell 2191 為既有切片；新增候選事件 670 引用於槽 3／cell 1171 與槽 4／cell 1107。兩個槽共享事件不代表同一 NPC。cell 為 arrayIndex1 × 64 + arrayIndex2，並非已驗證的 DOS 世界座標。工具只輸出 ID 與位置，不輸出場景名稱或劇本文字。

來源等級為 Community Implementation。來源延續 [TALK／KDEF 研究](../research/talk-kdef-source-analysis.md) 固定的 kys-jedisdl commit `4d225cb9b7b9a3ac46a796ecb0acde525ef72acc`，讀取／分派位置及限制見該文件；本輪沒有新增原版行為驗證或第三方授權結論。

Tests Executed / Results:

- 新增 2 項 Mock 測試：確定輸出、輸入不變、精確檔案偏移與場景反向引用、無效引用、未知指令／控制碼／編碼拒絕、損壞容器與意外錯誤中止。
- 全部 21 Node、4 Python、typecheck、Schema 同步、build、靜態網站 artifact 檢查通過。既有 Babylon chunk 大小提示仍存在。
- 實際資料重跑一致，八份來源前後雜湊不變，報告 Git 忽略。沒有 UI 修改，本輪未重跑瀏覽器 E2E。

Known Limitations / Unverified Assumptions: 不是完整 Phase 3／5 驗收；未分析分支、動態賦值、自動／物品觸發、可達性或原版公式。264 筆為支援候選，不是 264 筆原版驗證。公開站台仍為 Mock；原版版本、15／50、授權及圖像格式研究持續追蹤。

Next Recommended Tasks: 以事件 670 擴充本機河洛客棧切片，逐槽確認碰撞、鄰格互動與存讀續行，完成瀏覽器實測後再開放；完整事件轉換、戰鬥、編輯器另行驗收。
