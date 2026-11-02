# GitHub Pages 建置與發布流程

2026-11-02。Phase 12 的靜態發布子集。Status: workflow 已完成並通過本機語法／建置驗證；GitHub hosted runner 與正式網址尚未驗證。

使用者已選 GitHub Pages，沿用 backtolive/JY-Web-Remake，發布分支為既有 develop。沒有建立其他託管帳號、改變倉庫可見性或加入 Token。

## 流程

`.github/workflows/ci.yml` 延伸既有 checks workflow：

1. push／PR／workflow_dispatch 啟動，使用 Ubuntu 24.04、Node 24、Python 3.14 與固定 pnpm 11.25.0／lockfile。
2. 執行核心／Web typecheck、Node 19 項、Python 4 項及共用 Schema 檢查。
3. 建置 apps/web/dist，檢查相對資產路徑與商業資源隔離。
4. 安裝固定 Chromium 與 Linux 系統依賴，執行 4 個隔離 E2E。CI 安裝依據 [Playwright 官方指引](https://playwright.dev/docs/ci)，透過 wrapper 保持專用瀏覽器路徑一致。
5. 瀏覽器 report／證據保留 7 天；測試通過的網站成品另保留 7 天，artifact 名稱包含 commit SHA。
6. 只有非 PR、develop 分支且 check 成功時，才包裝 Pages artifact（1 天）並進入 deploy job。相同網站成品直接交給官方 deploy-pages，不重新建置。

檢查 job 只有 contents:read。只有部署 job 具有 pages:write／id-token:write，並使用 github-pages environment。PR、main 或其他分支不部署，無 pull_request_target／外部部署 Token；同 ref 的 workflow 不互相中斷發布。設定依據 [GitHub Pages 自訂工作流程](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

原版輸入／references 不存在於 CI 工作需求中。Report upload 只指定 e2e-report／e2e-results；不把整個 assets/generated 或瀏覽器安裝目錄上傳。網站 artifact 只指定 apps/web/dist。

## 一次性的 GitHub 設定

GitHub 連接工具讀取 `backtolive/JY-Web-Remake` 回傳 404；這只表示目前連接無法讀取此倉庫，不能據此判定倉庫不存在或私有。本輪工具也未提供可用的 Pages 管理寫入操作，因此沒有代為啟用或聲稱已上線。

倉庫管理者請開啟 [Settings → Pages](https://github.com/backtolive/JY-Web-Remake/settings/pages)，將 **Build and deployment → Source** 設為 **GitHub Actions**。

之後將本次 workflow 與 E2E 變更提交／推送至 develop，Actions 的 checks 便會執行並發布。若 github-pages environment 已有分支限制而拒絕 develop，至 Settings → Environments → github-pages，將 develop 納入允許的 deployment branches；保留既有審核要求。不要把發布分支來源設為根目錄或把 original 目錄上傳。

手動 Run workflow 是否可見取決於 workflow_dispatch 是否已在預設分支；目前預設分支為 main，因此首輪以 push develop 觸發，不要求先改預設分支或合併 main。

無自訂網域時，預期專案網址為 `https://backtolive.github.io/JY-Web-Remake/`；這是待發布網址，不是本輪成功回傳的部署結果。以 deploy job 回傳的 page_url 為準，必須再以正式 HTTPS 網址驗證 3D／對話／切圖／存讀檔，才能標為上線驗收。

## 本機檢查與限制

- actionlint 1.7.12 語法檢查無錯誤；官方 Windows amd64 發行 ZIP SHA256 為 `6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9`，已核對。工具僅保留在忽略目錄。
- typecheck、Node tests、Python tests、schema check、artifact check 與 Windows Chromium E2E 通過。Linux `--with-deps` 已接入，尚未在 hosted Ubuntu 執行，不能用 Windows 結果替代遠端驗證。
- CLI 拒絕未知安裝參數；正常安裝保持只下載 chromium，CI 額外傳遞 --with-deps。
- 尚未提交／推送本輪 workflow，也未觸發新的 GitHub Actions run、修改 Pages 管理設定或驗證公開頁面。

後續若部署失敗，先看 checks 的 build／browser regression／configure Pages／publish 步驟，保留對應 artifact 作診斷，不改用包含原始資源的發布路徑。
