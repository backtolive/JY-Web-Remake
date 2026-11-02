# ADR 0001：研究與最小工具鏈

2026-11-02。Accepted for scaffolding；引擎採用 Pending。

採 pnpm workspace、TypeScript、Node test runner；盤點器使用 Node 標準函式庫。Python 3.11+ 預留給資料工具，待環境驗收。Babylon.js、React、Vitest、Playwright 仍為候選，沒有開始遊戲實作。

來源追蹤型別是契約，不是已確認的 DOS 資料布局。第三方資料隔離，授權不明不複製。引擎選擇須等待實作、授權、資料相容與建置驗證，本決策不授權跳入 Phase 3。
