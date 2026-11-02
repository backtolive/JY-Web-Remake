# 靜態網站建置與部署

目前已使用 **GitHub Pages**，沿用既有倉庫與 develop 分支。[正式試玩](https://backtolive.github.io/JY-Web-Remake/) 已上線，HTTP 200 與四項正式網址 E2E 通過。工作流程與首輪發布證據見 [Pages 發布紀錄](validation/github-pages-pipeline.md)。

此版為瀏覽器單機 MVP，沒有後端、帳號或資料庫；發布預設只包含 Mock 原創內容。原版預覽包由玩家自己在本機選檔載入。

## 建置

```powershell
pnpm install --frozen-lockfile
pnpm run build
node tools/validator/check-web-build.mjs
```

上傳 **apps/web/dist 的所有檔案及子目錄** 到 HTTPS 靜態網站。必須一起保留 assets 目錄與其相對結構；不是只上傳 index.html，也不是根目錄核心 TS 的 dist。

Vite 設定 base='./'，因此輸出支援網域根目錄及一般子目錄。建置設定依據 [Vite 官方 Production Build](https://vite.dev/guide/build) 的 relative base 說明。沒有客戶端路由或 API，不需要 SPA rewrite 或伺服器函式。網站須透過 HTTPS（本機可用 localhost），以支援 Web Crypto 內容雜湊；不要用 file:// 直接開啟輸出。

## 發布前檢查

```powershell
pnpm run typecheck
pnpm run test
pnpm run schema:check
pnpm run preview
```

前往顯示的本機預覽網址，測試 3D、移動碰撞、NPC／選項、切圖及存讀檔，再發布同一份輸出。`mvp:prepare`／`mvp:check` 是原版資料研究工具，不是公開網站建置的必要步驟；沒有原版遊戲目錄的部署環境仍可建置站台。

託管平台建置命令為 `pnpm run build`，發布目錄 `apps/web/dist`，Node 版本 24。既有 checks workflow 已擴充為建置／測試／artifact 與 develop 專用 Pages 發布，GitHub 管理端已啟用，首輪遠端發布及正式網址操作驗證已完成。原版資源、references、assets/generated、玩家存檔與密鑰均不應加入發布目錄。

初次部署後，使用實際正式網址重做操作測試。本機存檔屬於各自 origin；換網域或連接埠不會自動攜帶存檔，可使用 JSON 匯出／匯入轉移。
