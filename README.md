# JY-Web-Remake

研究優先的通用武俠 RPG 引擎與《金庸群俠傳》內容包專案，目前尚無可玩遊戲。MASTER_PLAN v1.1 納入 MOD、內容格式與網頁編輯器規劃；Phase 6 建立基礎契約，Phase 13 交付完整創作平台。架構決策見 [ADR 0005](docs/decisions/0005-generic-engine-content-platform.md)。

開發：Node.js 24+、pnpm 11.25.0。執行 pnpm install --frozen-lockfile、pnpm run build、pnpm run typecheck、pnpm run test。

Python 3.14.7 已驗收，專案虛擬環境為 `.venv`。可直接執行 `.\.venv\Scripts\python.exe`，或以 `.\.venv\Scripts\Activate.ps1` 啟用。PATH 修正後，既有終端與 Codex 需重新啟動。資料匯入見 original/README.md；進度與待辦見 docs/PROGRESS.md、docs/TODO.md。測試資料均為 Mock。
