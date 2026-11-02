# JY-Web-Remake

通用武俠 RPG 引擎與《金庸群俠傳》內容包專案，目前已具備第一個 3D 場景 MVP 的資料與無畫面核心前置，尚無可玩網頁。MASTER_PLAN v1.3 按功能證據推進，參考引擎僅按需建置。原版邊界／對話／場景解析、內容 Schema、受控 Runtime、最小 MOD 與精確存讀檔已有測試；完整戰鬥與原版規則尚未驗收。見 [MVP 就緒報告](docs/mvp-readiness.md) 及 [ADR 0009](docs/decisions/0009-first-scene-mvp-readiness.md)。

開發：Node.js 24+、pnpm 11.25.0。執行 pnpm install --frozen-lockfile、pnpm run build、pnpm run typecheck、pnpm run test。

唯讀檢視資源邊界：`node tools/extractor/inspect-idx-grp.mjs original/dos/TALK.IDX original/dos/TALK.GRP`。只輸出 metadata，不匯出商業資源；適用範圍與驗證見 [解析器報告](docs/validation/idx-grp-parser.md)。

`pnpm run schema:check` 檢查共用 JSON Schema；`pnpm run mvp:prepare` 由本機 original/dos 建立受 Git 忽略的原版預覽切片；`pnpm run mvp:check` 執行 Mock 原創與原版切片的無畫面整合驗證。兩種內容使用相同核心；Mock 定義不是原版規則。沒有原版資料的環境仍可執行 build、typecheck、test、schema:check。

Python 3.14.7 已驗收，專案虛擬環境為 `.venv`。可直接執行 `.\.venv\Scripts\python.exe`，或以 `.\.venv\Scripts\Activate.ps1` 啟用。PATH 修正後，既有終端與 Codex 需重新啟動。資料匯入見 original/README.md；進度與待辦見 docs/PROGRESS.md、docs/TODO.md。測試資料均為 Mock。
