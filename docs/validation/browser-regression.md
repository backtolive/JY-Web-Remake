# 可重跑的瀏覽器回歸測試

2026-11-02。Phase 7／11 子集。Status: 4 個隔離 Chromium E2E 全部通過；正式部署、完整遊戲及原版規則未驗收。

## 本輪提交與工作範圍

依使用者要求先將 Web MVP 與鏡頭相對控制提交為 `daa02ae` 並推送 origin/develop（28 檔），之後才開始本輪測試建置。新增 Playwright 1.56.1，使用其固定 Chromium 141.0.7390.37／build 1194，下載至忽略的 assets/generated/playwright-browsers。

測試使用全新瀏覽器 context、Mock 內容及獨立 4273 連接埠；既有 4173 試玩與其 localStorage 不受影響。測試服務啟動及生命週期採 Playwright [webServer 設定](https://playwright.dev/docs/test-webserver)，Windows 下以 Node 直接啟動 Vite，減少 shell／pnpm 子程序層。沒有連接使用者的瀏覽器 profile 或第三方服務，也不需要原版商業資料。

## 命令

```powershell
pnpm install --frozen-lockfile
pnpm run test:e2e:install
pnpm run test:e2e
```

第一個安裝命令同步測試框架；`test:e2e:install` 首次下載官方瀏覽器，之後可重用。`test:e2e` 先執行正式網站 build，再啟動隔離測試服務，執行測試並停止自有服務。4273 已被其他服務占用時明確失敗，不重用不明服務。

此輪 Windows 一般程序環境完整通過並正常清理。首次在受限執行沙箱內遇到 Windows 測試服務結束停滯，已停止該輪專用程序，再以正常 Windows 程序權限驗證；這不表示使用者必須以管理員身分執行。Codex 沙箱若再阻擋瀏覽器／程序清理，應用正常權限的核准執行方式，不略過清理或把既有試玩服務終止。

## 案例與結果

| 案例 | 驗證內容 | 結果 |
|---|---|---|
| 渲染方向／碰撞／出口 | 讀取實際 WebGL 畫面像素，辨識角色長袍的最大連通區；逐一驗證 ↑↓←→ 的渲染位置變化；組合鍵到達出口、NPC／障礙阻擋不穿角 | Passed |
| 對話／選項／存讀／備份 | 在對話及選項中保存、重新整理、恢復；一次性物品不重複領取；上一份備份恢復到先前對話 | Passed |
| 真正下載再回匯 | 點選 UI 匯出、接收 download、保存 Mock JSON、重新開始、用檔案選擇器回匯；MOD 不同或 JSON 損壞時保留當前對話 | Passed |
| 窄版觸控 | 390×844、touch context，以 tap 操作八方向按鈕，驗證格子位置及無水平溢出 | Passed |

4 passed，約 13.1 秒。這是本機隔離 Chromium 實際渲染／UI 測試，不是 NullEngine 或只呼叫核心的測試。像素判定針對目前 Mock 占位角色色彩，將來換美術須更新辨識策略；未涵蓋真實手機硬體、所有瀏覽器或長時間效能。

## 發現並修正

短按兩鍵且在組合窗口內放開時，舊控制器等到最後一鍵放開才取方向，可能把斜向誤判為單鍵。現在在第一鍵放開前保留並提交完整組合，剩餘按住的鍵則按正常重複間隔繼續。新增同一單元測試中的快速組合鍵斷言，E2E 也以真實 keyDown／keyUp 驗證可到達出口。

canvas 的標籤原本在 Chromium 呈現 generic 角色；補上 role=img，使場景及位置圖具有明確的無障礙角色。沒有新增測試專用遊戲狀態入口，像素測試也不讀取引擎私有狀態。

## 證據

- HTML report：assets/generated/e2e-report/index.html。
- 結果目錄：assets/generated/e2e-results，含成功測試的桌面／手機 screenshot 與下載的 Mock 存檔。
- `.last-run.json`：status=passed、failedTests=[]。
- 失敗才保存 trace／失敗截圖；沒有保留第一次選取器失敗作為最後成功證據。

上述全部受 Git 忽略，不加入發布網站或版本庫。測試程式與固定依賴／設定則可提交。首次錯誤、修正、重跑的過程不代表全部原版功能已通過。
