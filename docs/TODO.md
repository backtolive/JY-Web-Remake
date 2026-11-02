# 待辦

- [x] 使用者選定 GitHub Pages；既有 checks workflow 擴充為核心／Schema／build／E2E／artifact，只有 develop 通過才發布。
- [x] 工作流程通過 actionlint；安裝 wrapper 支援 Linux --with-deps，所有研究／原版輸入不作 CI 需求。
- [x] 使用者已將倉庫改為 Public 並設定 Pages Source=GitHub Actions；GitHub connector 已確認 visibility=public 且可讀取倉庫。
- [x] 4fc68e4 已提交／推送，Ubuntu hosted runner 所有核心／Schema／build／E2E 通過並上傳成品。
- [x] 管理者已確認將 develop 加入 github-pages 允許清單。
- [ ] 重跑 API Actions write 受限，改由 SSH 推送正式網址測試設定觸發新 run；取得部署 URL 後完成正式子目錄操作驗證。

- [x] 提交 daa02ae 並推送 origin/develop，保存 Web MVP 與鏡頭控制修正。
- [x] 新增可重跑 Playwright E2E：真正 WebGL 渲染方向、快速組合鍵／出口、對話／選項／備份、下載回匯／不相容拒絕及窄版觸控；4 案通過。
- [x] 修正短按組合鍵在放開時退回單鍵方向，補上 canvas 的明確無障礙圖像角色。

- [x] 修正 3D 鏡頭與鍵盤方向錯位：鏡頭相對八方向、組合鍵／長按、正交投影與嚴格牆角碰撞。
- [x] 已用獨立 Chromium 補上實際畫面方向與觸控測試；原 IAB API 故障紀錄保留，真實玩家手感仍可繼續回饋。

## 最新狀態：本機 Web MVP 可操作

- [x] 依要求先提交 e0686a8，成功推送 origin/develop（33 檔核心／資料／Schema／測試）。
- [x] Phase 7：React／Vite 靜態 app、Babylon.js 固定斜角占位場景、鍵盤／按鈕、NPC／對話／選項、場景切換。
- [x] 本機存讀檔、上一份備份、匯出／匯入 UI、內容組合分槽、MOD 問候切換及不相容存檔拒絕。
- [x] 本機原版預覽包 File API 匯入；建置拒絕 original／references／assets/generated 直接引入。
- [x] 開發與正式打包版瀏覽器操作驗證、桌面／窄版配置、15 Node＋4 Python 測試、靜態輸出檢查。
- [x] 已選 GitHub Pages 並準備 CI／CD；正式 HTTPS 發布驗證仍以上方最新待辦追蹤。
- [x] 補齊下載回匯瀏覽器測試與可獨立執行 E2E；另保留真實手機／長時間按住操作、其他瀏覽器的驗證。
- [ ] 逐項擴充原版事件與圖像，戰鬥另按證據推進；原版資料仍不隨網站發行。

詳見 validation/web-mvp.md、deployment.md、ADR 0010。本節取代下列歷史狀態中的「尚無可玩網頁／下一步開始 UI」，不表示完整 Phase 6 或原版還原完成。

## 目前狀態：可開始第一個 3D 場景 MVP

- [x] TALK 2,977 筆、84 場景及純對話事件子集解析，未知效果明確拒絕。
- [x] 最小 Game Content Package／Save Schema、Ajv 與跨引用驗證器；Schema 檔案與 runtime 同源檢查。
- [x] 無畫面核心：移動碰撞、鄰格互動、對話／選項／條件／旗標／物品、切圖與座標轉接。
- [x] 最小 MOD 依賴／排序／文字 patch／衝突診斷、精確包組合存檔、對話／選項續行及錯誤原子性。
- [x] 同一核心完成獨立 Mock 原創流程與本機河洛客棧純對話切片；mvp:check 回報 ready:true。
- [x] Phase 7 首個切片已完成上述本機畫面與操作驗收，詳細範圍見最新 Web MVP 紀錄。

此為第一場景準備就緒，不是完整 Phase 3／6 或可玩 MVP 完成。範圍與命令見 docs/mvp-readiness.md。以下舊有階段清單中的「未開始／下一項」由本節最新狀態取代，完整平台工作仍待後續。

## 目前優先：MASTER_PLAN v1.2 逐格式推進

- [x] 依使用者要求，先 commit `35c3f4d` 並推送 origin/develop，保存既有研究與原版啟動驗證。
- [x] 修正全域研究門檻，參考引擎建置改按需；ADR 0008 記錄局部驗收。
- [x] Phase 3：交付自行實作的 IDX／GRP 邊界解析、唯讀 metadata CLI 與 Mock 測試；117 組相容、MMAP 明確拒絕，627 檔未變。
- [x] Phase 3：TALK bytes／文字候選解讀與控制碼保留；本機 WHATWG Big5 與 CP950 顯示字串逐筆相同，不推定 DOS 字型完全一致。

以下 Phase 1／2 未解事項繼續追蹤，但不作無關格式的共同門檻。舊有「完成全部前置後才解析」已由 ADR 0008 取代。

- [x] Phase 1／2：唯讀追查 676 場景引用；找到事件 675 的候選動態賦值，見 validation/event-676-route.md。
- [x] 建立指令 3 的反向賦值閉包：洪七公居 460 → 海邊小屋 675 → 676；核對進度一與候選地圖事件格。
- [ ] 驗證此鏈的原版可達性／可靠操作，區分 50 條件與後續事件的背包副作用；其他間接呼叫未完整排除。
- [x] 使用者確認手動方向鍵／Esc 正常；0.3.0 核對 R1 五物品全缺並整理 OP50-NONE 手動清單。自動輸入仍受限。

## MASTER_PLAN v1.1：平台架構規劃

- [x] 更新主計畫為通用武俠 RPG 引擎＋金庸內容包，新增 Phase 13 及 ADR 0005。
- [x] 將內容／腳本／規則／MOD 契約及存檔內容組合驗證提前至 Phase 6。
- [ ] Phase 6：定義 Game Content Package manifest、穩定 ID、JSON Schema 與跨檔引用驗證器。
- [ ] Phase 6：實作受控 Event／Dialogue Runtime、Rule Engine、條件運算器與可序列化續行。
- [ ] Phase 6：建立確定 MOD 依賴／排序／衝突解析，並以原版包及獨立 Mock 原創包驗收。
- [ ] Phase 6／10：保存精確內容與 MOD 組合、預檢不相容變更，測試備份與存檔遷移。
- [ ] Phase 13（首個 MVP 後）：交付完整劇情／事件及地圖／NPC 編輯器、自動化劇情測試、MOD 匯入／匯出與版本管理，原版與自製內容保持隔離。

上述為已納入計畫的後續工作，不表示開始實作或略過目前 Phase 1／2 的原版驗收。

## 當前研究與前置工作

- [x] Phase 2：完成固定來源建置依賴矩陣；按 A Makefile、B Windows／Android 組態區分需求，保留三個建置檔雜湊與 vcxproj 明載設定。
- [ ] 僅在特定問題需要建置 B 時，釐清音效後端／連結清單與 Windows 外部依賴並配置工具鏈；目前不是優先工作。

- [x] Phase 2：完成 A／B 固定版本 src 共 39 個 C／C++ 檔的聲明／雜湊盤點，補入 tml ZLIB 與 list.h 上游線索；完整授權審查仍未完成。
- [x] Phase 2：核對 B 的 Android ARM64 CMake 配置及目前 PATH 工具鏈；更新建置阻礙與 ADR 0007。

- [x] 規範、workspace、TS 建置與測試。
- [x] 資料隔離、匯入規範、唯讀盤點器。
- [x] 公開研究初稿與建置阻礙紀錄。
- [x] Phase 0：Python 3.14.7、標準函式庫、.venv 與 pip 已驗收。
- [x] Phase 1：收到安裝後 DOS 目錄，完成 627 檔盤點、兩次雜湊一致及 Git 排除檢查。
- [x] Phase 1：記錄使用者說明：原始中文版，無 MOD 或修補。
- [ ] Phase 1：確認精確發行版本、中文編碼與取得來源，交叉驗證目錄完整性及檔案一致性。
- [ ] Phase 1：核對實際 bytes、版本與格式。
- [x] Phase 2：取得兩候選研究所需來源，固定 commit 並定位主要函式。
- [ ] Phase 2：完成逐檔與外部依賴授權審查。
- [ ] Phase 2：讀取 Makefile／solution，配置工具鏈，完成實際編譯與執行或完整失敗紀錄。
- [ ] Phase 2：建立事件、戰鬥、地圖、資源讀取函式與來源行號索引。
- [ ] Phase 2：取得 MOD 工具一手發布與授權，實測支援版本。
- [ ] Phase 2：完成引擎採用 ADR。
- [x] 按功能證據開始首個 IDX／GRP 邊界解析器與 Mock golden 測試；不表示完整資料解析驗收通過。


- [x] Phase 1／2：完成名稱編碼抽樣、地圖容量算術及事件轉換限制研究；見 encoding-map-conversion.md。
- [ ] Phase 1／2：確認完整文字資料的編碼，追查第 84 筆後地圖資料的原版用途；不可裁切非零尾端。
- [ ] Phase 2：取得 FishEdit 0.72 一手來源與授權，驗證匯出格式及 50 指令替代方案。

- [x] Phase 1／2：完成 5,668 個候選欄位編碼及 118 組索引邊界稽核，記錄 MMAP 尾端零值例外。
- [x] Phase 2：確認固定 commit 四個事件修正副本與對應事件完全相同。
- [ ] Phase 1／2：追查 MMAP 索引保留區、原版 TALK 與 KDEF 讀取來源；在證據不足前不推定轉碼或 opcode 配置。

- [x] Phase 2：取得 Pascal 候選的 TALK／KDEF 直接讀取來源並固定 commit。
- [x] Phase 1／2：確認 2,977 筆 TALK 的 CP950 解碼相容性與 1,018 筆 KDEF 的偶數長度。
- [ ] Phase 2：建立逐條 opcode 長度、參數與分支來源表，區分原版與社群擴充。
- [x] Phase 2：建立 68 條 Pascal 分派長度／參數槽／控制類別／來源行號表與實際布局稽核。
- [ ] Phase 2：解決指令 15 的來源差異、動態指令 50 與參數語意；不以跳過未知值方式推進。
- [x] Phase 2：取得 FishEdit 0.72 指令長度來源，確認 15 為兩單位的候選布局，完成 1,018 事件結構稽核。
- [x] Phase 2：確認 50 的五物品文件描述與 Pascal 動態版本有別，不將兩者混為同一語意。
- [ ] Phase 2：驗證指令 50 的分支設定／文件差異、15 附帶值的 DOS 用途與原版執行結果。
- [x] Phase 2：追查 Pascal 50 的完整分流與物品 ID 檢查，確認本機 138 走物品路徑；檢查事件 676 兩個目標邊界。
- [x] Phase 2：確認 114 條指令 15 均附帶 83，建立原版待執行案例矩陣。
- [ ] Phase 1／2：配置隔離的 DOSBox-X 執行與重播環境，執行 opcode-15-50-cases.md；原始資料不得作為可寫掛載。
- [x] Phase 1／2：下載官方 DOSBox-X 2026.10.01 portable，核對官方 SHA256、驗證 627 檔隔離副本，建立啟動腳本與日誌設定。
- [ ] Phase 1／2：在可見桌面確認選單、操作與聲音，再執行 15／50 案例；本次 computer-use 回報桌面存取拒絕。
- [x] 修正本機啟動指引：提供直接執行 DOSBox-X 的 CMD 啟動器，避免依賴未簽章的 PowerShell 腳本；既有隔離設定不變。
- [x] 使用者確認 CMD 可啟動；直接觀察原版主選單、成功載入進度一至大地圖，保存原生截圖與 17 檔證據快照。
- [ ] 確認可靠移動／功能選單輸入與進度一測試路線，再執行 15／50；聲音及自動輸入重播仍未驗證。
- [ ] Phase 2：追查 sfe-kdef 缺少的核心原始碼與授權，不能以附帶 binary 視為完整來源。

