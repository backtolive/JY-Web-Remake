# IDX／GRP 邊界解析器 0.1.0

2026-11-02。Phase 3 首個小範圍交付完成；整體 Phase 1／2／3 尚未驗收。依 ADR 0008 逐格式推進。

## 實作範圍與來源

`packages/game-data/src/idx-grp.ts` 是自行實作、無 UI／Node 專屬依賴的 TypeScript 模組。以 uint32 little-endian 讀 IDX 的排他結束偏移，資源 ID 從 0 起；前一結束偏移為下一筆起點。保留重複偏移代表的空資源，最後一筆必須恰好涵蓋 GRP。資源切片回傳獨立 bytes，包含傳入 Node Buffer 時亦不共享可寫記憶體。

格式證據見 research/full-field-index-audit.md、talk-kdef-source-analysis.md，以及固定 Pascal commit `4d225cb9b7b9a3ac46a796ecb0acde525ef72acc` 的 TALK／KDEF 讀取研究。這是容器邊界相容性，不把記錄、圖像、文字或事件語意宣告為已確認。沒有複製參考引擎程式碼。

明確拒絕：IDX 非四位元組對齊、偏移倒退／越界、GRP 未被完全涵蓋、無效切片區間，以及超過一百萬筆的索引。GRP 長度限制於 uint32 可表示範圍；不自動修復或裁切 MMAP。

## 使用

Node.js 24 可直接執行 metadata CLI，輸出至 stdout，不寫入來源或輸出資源內容：

```powershell
node tools/extractor/inspect-idx-grp.mjs original/dos/TALK.IDX original/dos/TALK.GRP
```

輸出包含 parserVersion、輸入檔名／長度／SHA256、各資源 ID／IDX 位移／GRP 位移／長度／SHA256。錯誤以 stderr JSON 回報 code 及已知 resourceId，退出碼為 1；成功為 0。此報告不是 Game Content Package 或最終 canonical ID 映射。

## 驗證結果

- TypeScript build、typecheck 通過。
- Node 共 4 項測試通過：3 項新增 Mock 涵蓋 golden 切片、空筆／子視圖、Buffer 複製隔離、畸形索引／區間、穩定 provenance 與 CLI 錯誤；1 項既有盤點測試通過。
- 本機實際 118 組 IDX／GRP：117 組通過 strict 容器邊界檢查；MMAP.IDX 在 resourceId 3731（從 0 起算）因偏移回到 0，明確回報 DECREASING_OFFSET。
- TALK 可列出 2,977 個邊界，重跑 metadata 完全相同；不輸出文字或解讀控制符號。
- 執行前後完整 627 檔 inventory 相同，並與既有基準的路徑／長度／SHA256 一致。

本機證據為 `idx-grp-audit.local.json`、`talk-index.local.json`，受 Git 忽略；原版內容未提交。117 組通過不代表這些資源已被完整解碼或屬於同一種語意記錄。

## 下一步與限制

優先逐項增加 TALK 的原始 bytes／文字候選解讀，保留控制碼與來源，新增明確的編碼與終止符驗證；不要先推定事件 runtime。MMAP 需獨立格式規格，15／50 的原版行為、精確發行版本與第三方授權保留原待辦。尚無人物／地圖視覺化或可玩 Web MVP。
