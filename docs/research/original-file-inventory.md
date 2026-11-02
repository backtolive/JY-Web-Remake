# 原始檔案盤點

2026-11-02：使用者已放入安裝完成後的目錄 `original/dos`。完成唯讀盤點：627 個檔案，128,510,353 bytes（約 122.6 MiB）。完整逐檔 SHA256 報告位於 `docs/research/inventory.local.json`，已確認受 Git 忽略。

主要類別：118 個 IDX、118 個 GRP、77 個 WAV、24 個 XMI、5 個 .002、3 個 EXE、2 個 COL、223 個無副檔名檔案。其餘檔案亦全部包含於本機報告，未默默略過。

118 組 IDX／GRP 皆有同名配對；這僅為檔名完整性檢查，不代表索引內容正確。三個 EXE（LEGENDX.EXE、DOS4GW.EXE、SETSOUND.EXE）開頭皆為 MZ bytes，未執行任何遊戲或附帶程式。

兩次完整掃描結果逐筆一致，包含 SHA256 與大小。原檔未改寫，原始資料受 Git 忽略。使用者說明為原始中文版、無 MOD 或修補；精確發行版本、檔案未修改的獨立驗證及實際可執行性仍待確認。

已建立 tools/analyzer/inventory.mjs，輸出名稱、相對路徑、大小、SHA256、格式候選、可能用途、已知解析器及狀態。用途預設 Unknown、解析器 null，所有資料 not-parsed。副檔名不代表確認格式。符號連結及特殊檔明確失敗。

輸入規範見 [original/README.md](../../original/README.md)。Mock 測試不屬於原版盤點。
