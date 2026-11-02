# JY-Web-Remake

通用武俠 RPG 引擎與《金庸群俠傳》內容包專案，已有可在本機瀏覽器操作的 3D 場景 MVP：原創兩場景、移動碰撞、NPC 對話與選項、MOD 及本機存讀檔。預設內容明確標為 Mock；不是完整版原版重製。MASTER_PLAN v1.3 按功能證據推進，參考引擎僅按需建置；完整戰鬥與原版規則尚未驗收。見 [Web MVP 驗證](docs/validation/web-mvp.md) 與 [部署說明](docs/deployment.md)。

開發：Node.js 24+、pnpm 11.25.0。執行 pnpm install --frozen-lockfile、pnpm run build、pnpm run typecheck、pnpm run test。

試玩：`pnpm run dev` 後開啟 http://127.0.0.1:5173/；方向鍵／WASD 移動，E 互動，金色圓環切換場景。`pnpm run build` 產生完整靜態網站於 **apps/web/dist**，`pnpm run preview` 可在 http://127.0.0.1:4173/ 驗證正式輸出。尚未部署公開網址；原版切片僅支援玩家本機選檔載入。

移動採畫面相對方向：↑／W 就是畫面向上，兩個方向鍵可組合斜走（如 W＋D 往右上），亦提供八方向按鈕；正交斜角鏡頭維持方向一致，斜走不穿過牆角。

瀏覽器回歸：首次執行 `pnpm run test:e2e:install` 安裝隔離 Chromium，之後 `pnpm run test:e2e` 會建置網站並以獨立 4273 連接埠驗證畫面方向、對話存讀與下載回匯。結果見 [E2E 驗證紀錄](docs/validation/browser-regression.md)，不需要原版資源。

正式託管已選 GitHub Pages：checks workflow 會先完成測試，再僅由 develop 發布網站成品；PR 不部署。尚需倉庫 Settings → Pages 將 Source 設為 GitHub Actions，並提交推送本輪變更。見 [發布流程](docs/validation/github-pages-pipeline.md)，目前尚未正式上線。

唯讀檢視資源邊界：`node tools/extractor/inspect-idx-grp.mjs original/dos/TALK.IDX original/dos/TALK.GRP`。只輸出 metadata，不匯出商業資源；適用範圍與驗證見 [解析器報告](docs/validation/idx-grp-parser.md)。

`pnpm run schema:check` 檢查共用 JSON Schema；`pnpm run mvp:prepare` 由本機 original/dos 建立受 Git 忽略的原版預覽切片；`pnpm run mvp:check` 執行 Mock 原創與原版切片的無畫面整合驗證。兩種內容使用相同核心；Mock 定義不是原版規則。沒有原版資料的環境仍可執行 build、typecheck、test、schema:check。

Python 3.14.7 已驗收，專案虛擬環境為 `.venv`。可直接執行 `.\.venv\Scripts\python.exe`，或以 `.\.venv\Scripts\Activate.ps1` 啟用。PATH 修正後，既有終端與 Codex 需重新啟動。資料匯入見 original/README.md；進度與待辦見 docs/PROGRESS.md、docs/TODO.md。測試資料均為 Mock。
