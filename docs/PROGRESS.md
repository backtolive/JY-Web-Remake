# 進度 — 2026-11-03

## 交接保存：codex-break（最新）

Phase: 現有 3／5／7 局部成果；下一階段為地圖視覺轉換切片。Status: 依使用者要求保存成果與交接，不開始新切片實作。Completed Tasks / Files Changed: 新增 docs/HANDOFF.md，記錄目前功能、事件 670 阻礙、驗證限制及可直接使用的下階段提示詞；更新 TODO／PROGRESS。Tests Executed / Results: 本輪檢查 Git 狀態及文件差異；最近程式驗證與 E2E 收尾限制見交接及下節，沒有新程式修改。Research Findings: 使用者下一目標為全自動素材轉換管線，先以 8×8 原版區域 ID 對照及 Mock 3D 組裝驗證。Known Limitations / Unverified Assumptions: 該切片尚未實作；圖像 ID 映射及 3D 推測不能視為原版驗證，Phase 1／2 未解項保留。Next Recommended Tasks: 依 HANDOFF 提示詞開始；本輪執行 commit、codex-break tag 及 push，實際結果以 Git 與回覆為準。

## 原版事件 670：可達性門檻發現阻礙（最新）

Phase: 3／5／7 局部。Status: 門檻完成；候選擴充停止。開始前重讀計畫／進度／待辦並檢查 Git；保留上一輪未提交變更。

Completed Tasks / Files Changed: prepare-mvp 支援明確 --candidate、逐槽 NPC／事件映射與來源 provenance；新增 check-slice-npcs，準備包寫入前必須從入口實際 MOVE 搜尋並驗證碰撞／對話／存讀續行。readiness 納入逐 NPC 結果；2 項 Mock、ADR 0013、validation/preview-npc-reachability、README／TODO／PROGRESS 更新。

Tests Executed / Test Results: 23 Node、4 Python、typecheck、Schema、build、artifact 通過；既有 mvp:prepare／mvp:check 通過且原版輸入讀取前後雜湊相同。--candidate 拒絕槽 3／4 為實際驗收失敗，已停止開放；開發暫存候選包已刪除。四個 Chromium 案例均 ok，但 Windows webServer 收尾停滯，以 Ctrl+C 結束（exit 1），不宣稱整輪 E2E 正常通過；其後 4273 無監聽。詳見 validation/preview-npc-reachability。

Research Findings: 既有入口四方向可達 602 格，兩個候選 NPC 雖有可站立鄰格，皆無從入口到達的路徑。Known Limitations / Unverified Assumptions: 此為現有保守碰撞模型結果，不能推定 DOS 不可達；原因可能涉及通行判定、事件阻擋或缺少切圖／動態狀態，尚未確認。原版 Phase 1／2 未解研究與完整階段驗收保持未完成。Next Recommended Tasks: 唯讀追查連通區邊界及固定來源碰撞證據，再恢復事件 670 擴充。本輪尚未 commit／push。

## Phase 3／5：原版事件全量支援目錄（最新）

Status: 本輪靜態切片完成，完整階段未驗收。開始前已讀主計畫／進度／待辦並確認 develop 工作目錄乾淨；沿正式發布後的原版內容擴充方向推進。

Completed Tasks / Files Changed: 新增 catalogue-dialogue-events.mjs 與 2 項 Mock 測試；逐筆記錄事件接受／空／拒絕、TALK 引用、場景目前互動欄位反向引用及來源偏移／SHA256。新增 ADR 0012、validation/dialogue-event-catalogue，更新 README／TODO／PROGRESS。原版衍生報告僅留 assets/generated，不含文字或 payload，不進網站。

Tests Executed / Test Results: 21 Node、4 Python、typecheck、Schema 同步、build、靜態 artifact 檢查通過；實際原版重跑結果相同，八份輸入前後 SHA256 不變，報告確認 Git 忽略。無 UI 變更，未重跑 E2E；既有 Babylon chunk 提示保留。

Research Findings: 1,018 事件中 264 純對話、23 空、731 拒絕；72 個純對話事件有目前場景互動引用，84 場景該欄位無越界引用。場景 1 的事件 670（槽 3／4）可作下一個候選。來源沿用固定 Pascal commit，等級 Community Implementation，未新增 Verified Original 結論。

Known Limitations / Unverified Assumptions: 未新增可玩事件、不驗證可達性／動態改寫／自動與物品觸發；10 筆對話參數差異持續拒絕。Phase 1／2 版本／授權／15／50 未解項持續追蹤，未宣告完整 Phase 3／5／6 完成。Next Recommended Tasks: 擴充本機事件 670，逐槽驗證位置、碰撞、互動、存讀及實際畫面。本輪尚未 commit／push。

## 正式發布驗收完成（最新）

Phase: 12 靜態發布子集。Status: GitHub Pages 已上線。

- 正式網址：https://backtolive.github.io/JY-Web-Remake/ （HTTP 200）。
- 發布版本：d4e8dca927b8c5cbcfb9c9506c5d36348b552c10，已推送 origin/develop。
- [Actions run 41470850061](https://github.com/backtolive/JY-Web-Remake/actions/runs/41470850061)：Ubuntu check 125363698046 與 deploy 125364535721 均成功；部署工作回傳上述 environment URL。
- CI 通過核心 19 Node、4 Python、Schema、typecheck、build、artifact 與 4 Chromium E2E。
- 對正式 HTTPS 子目錄執行隔離 Chromium E2E：4 passed（16.2 秒），包含實際 WebGL 畫面移動／碰撞／出口、對話續行與備份、真正下載回匯及不相容拒絕、390×844 觸控與溢出檢查。
- 重跑命令（PowerShell）：`$env:PLAYWRIGHT_TEST_BASE_URL='https://backtolive.github.io/JY-Web-Remake/'; node tools/validator/run-browser-tests.mjs`。報告與桌面／手機截圖保留於忽略的 assets/generated/e2e-report、e2e-results。
- 管理者已允許 develop 部署，其他環境保護保留。公開輸出僅含 Mock，原版資源未發布；本機選檔匯入仍由玩家自行提供。

Known Limitations: 此為 Mock 場景 MVP，非完整原版遊戲；尚未驗證實體手機、其他瀏覽器與長時間遊玩。Next Recommended Tasks: 依既有證據擴充原版事件／圖像，戰鬥與完整編輯器仍按 MASTER_PLAN 推進。下列「尚未發布」段落為歷史準備紀錄，以本節為準。

## GitHub Pages 首輪發布

使用者已確認 Public 與 Pages Source=GitHub Actions；connector get_repo 已回傳 public 與倉庫中繼資料，先前 404 阻礙解除。本輪準備提交目前 E2E／CI／Pages 變更並推送 develop，追蹤實際 hosted runner 與部署結果；在取得成功結果前保持未上線狀態。

遠端結果：4fc68e4 已成功推送，checks run 41469850559 的 Ubuntu check 全部通過（19 Node＋4 Python＋4 真實 Chromium E2E，E2E 19.5 秒），網站／報告／Pages artifact 上傳成功。deploy job 在執行前被 environment protection 拒絕，註記為 develop 不在 github-pages 允許分支，已向管理者提出具體設定需求並等待完成；不改寫或移除保護繞過限制。另準備正式 HTTPS 子目錄 E2E base URL 支援，尚未執行正式站台測試。

使用者隨後確認已允許 develop。僅重跑失敗 job 的 GitHub API 因 integration 缺少 Actions write 回傳 403；改以既有已授權 SSH git 流程提交正式 HTTPS E2E base URL 支援與結果紀錄，觸發新 workflow。此為測試設定的實際變更，不用空提交偽造新版本。

## GitHub Pages／CI 工作流程準備

Phase: 12 靜態發布子集。Status: 工作流程與本機檢查完成，正式站台未上線。使用者選定 GitHub Pages，沿用目前倉庫／develop。

Completed Tasks / Files Changed: 擴充 .github/workflows/ci.yml，加入 Python／Schema／artifact／Linux Chromium E2E、測試報告與網站成品保留；非 PR 的 develop 在 check 成功後以 Pages artifact 發布，部署權限限於 deploy job、使用 github-pages environment。run-browser-tests 支援 --with-deps，更新 README／deployment／github-pages-pipeline／TODO／PROGRESS。

Tests Executed / Results: 官方 actionlint 1.7.12 ZIP 校驗一致、workflow lint 無錯；typecheck、19 Node、4 Python、Schema／artifact、本機 Chromium 4 E2E 通過。未知安裝參數明確拒絕。Known Limitations: Windows 結果不是 hosted Ubuntu 驗證；GitHub connector get_repo 回傳 404，目前無法代改 Pages 管理端設定。本輪未提交推送、未觸發遠端 run、未宣稱預期網址已部署。Next Recommended Tasks: 管理者設定 Pages Source=GitHub Actions，提交推送 develop，驗證部署回傳 URL 與正式站台操作。詳見 validation/github-pages-pipeline.md。

## Phase 7／11：隔離瀏覽器回歸完成

Status: 4 個 E2E 通過。先依要求將 daa02ae 推送 origin/develop（28 檔），才開始本輪下一步；本輪後續修改尚未另行 commit／push。

Completed Tasks / Files Changed: 固定 Playwright 1.56.1 與官方 Chromium、playwright.config.ts、test:e2e／安裝 wrapper、tests/e2e/web-mvp.spec.ts、package／lock、canvas ARIA 角色、快速組合鍵放開修正與單元斷言、browser-regression／README／web-mvp／TODO／PROGRESS。專用 4273 與全新 context 不影響 4173 試玩或玩家存檔。

Tests Executed / Results: 4 passed（13.1s）：實際 WebGL 像素方向與出口／碰撞、對話與選項重整續行／一次性物品／備份、UI 真正下載後用 chooser 回匯／MOD 不符與損壞 JSON 拒絕、390×844 touch 按鈕與無水平溢出。修正後另執行 Node 19 項、Python 4 項、typecheck、schema／artifact 檢查；通過。測試服務正常清理，4173 HTTP 200。HTML report／截圖／Mock 下載檔保留 ignored assets/generated。

Research Findings: 修正並補證快速短按組合鍵的放開順序問題，不再只依單元時鐘或投影數學推定 UI 正確。Known Limitations: 首輪沙箱執行 Windows server 清理停滯，清理自有測試程序後以正常程序權限完整跑通；IAB API 未宣稱恢復。只驗證隔離 Chromium 與 Mock，像素辨識依現有占位美術，未涵蓋真實手機或完整原版。Next Recommended Tasks: 選定 HTTPS 託管／CI 或按證據擴充原版內容；保留原版 15／50、授權與版本待辦。

## Phase 7 修正：畫面與輸入方向一致

Status: 程式與自動驗證完成，修正版實際 UI 重測受瀏覽器 API 限制。Completed Tasks: 共享相機角度的 screen-to-grid 適配、正交斜角投影、核心八方向及禁止穿角、八方向畫面按鈕、鍵盤組合／短按／長按與失焦停止。Files Changed: game-core types/runtime、web view-controls／App／renderer／styles、view-controls tests、ADR 0011、web-mvp／TODO／PROGRESS。

Tests Executed / Results: 新增四項測試，包含 Babylon NullEngine 實際投影（中心／偏離中心）、八方向映射、可控時鐘輸入及牆角／NPC／出口整合；全數通過。整體 Node 19 項、Python 4 項、typecheck／build、artifact 檢查通過；4173 HTTP 200，輸出已更新。Known Limitations: 本輪瀏覽器工具回報 browser.user unavailable，嘗試既有分頁及文件指引恢復仍受限，未取得修正版 UI 截圖或實測；不以舊圖當作新證據。Next Recommended Tasks: 玩家刷新預覽確認方向手感，工具恢復後再補實際鍵盤／觸控重測。本輪未另行 commit／push。

## Phase 7：可操作的本機 Web MVP

Status: 第一個占位 3D 場景切片完成，正式站台未部署。先依使用者要求將 e0686a8 成功推送 origin/develop（33 檔），再開始此次 Web 工作；本節網站實作尚未另行 commit／push。

Completed Tasks: 新建 apps/web React／Vite／Babylon.js，純核心命令串接固定斜角 3D、鍵盤與按鈕、鄰格 NPC、對話／選項、原創兩場景切換、行囊；localStorage 內容分槽／備份與匯出入、MOD 切換、原版包只在本機 File API 讀取。建置插件拒絕私人原版／研究／生成資料匯入，根 build 產生可部署 apps/web/dist，相對資產路徑。

Files Changed: apps/web、package／lock／workspace、web-storage tests、check-web-build、README、AGENTS、TODO／PROGRESS、mvp-readiness 更新標記、deployment、validation/web-mvp、ADR 0010。Tests Executed / Results: build、typecheck、15 Node＋4 Python、schema 與原版 readiness、靜態 artifact／HTTP 200；實際瀏覽器開發／正式版 3D ready、碰撞、對話／選項／物品、重新整理後存讀續行、s 切圖往返、MOD 問候、不相容存檔拒絕保持對話、本機河洛客棧包載入／對話；桌面與窄版無水平溢出、測後恢復 viewport。瀏覽器 error／warn 抓取為空。原創畫面截圖保留本機忽略目錄。

Research Findings: 靜態站台建置不需 DOSBox、原版輸入或後端；原版資料可與網站發行隔離。Known Limitations / Unverified Assumptions: 尚未部署、無雲端存檔／帳號；完整戰鬥／原版圖像音效／其他劇情未做；正式硬體手機與完整 E2E／下載回匯尚未驗證。Babylon chunk >500 kB 有建置提示，已採 renderer 動態載入但未全面優化。Next Recommended Tasks: 選定 HTTPS 託管並接部署，再按證據擴充內容；完整 Phase 6 不標通過。

## 第一個場景 MVP 前置就緒（MASTER_PLAN v1.3）

Phase: 3／5／6 必要子集；Status: Ready to start scoped Phase 7 MVP，尚無可玩網頁、整體階段未驗收。依使用者「繼續直到可以進行 MVP」持續實作至就緒門檻，見 ADR 0009 與 mvp-readiness.md。

Completed Tasks: 自行實作 TALK／場景／純對話事件解析，通用內容／存檔 Schema 與 Ajv、跨包引用、精確依賴／確定排序／文字 patch 衝突、純 TypeScript 移動／事件／選項／條件／旗標／物品／切圖、步數限制與錯誤原子性、固定 seed／座標轉接、內容組合檢查及暫停續行。新增 Mock 原創包與 MOD，及本機原版 scene 1／slot 2／event 668 的只讀切片與六層呈現資料。

Files Changed: game-data/original.ts 與 exports；game-core types/schema/content/runtime；共用 schemas；extractor prepare-mvp；validator schema 匯出與 readiness；Mock fixtures／core 與 original tests；Ajv 固定版本／lock、tsconfig、package scripts、MASTER_PLAN／AGENTS／README、ADR 0009、readiness、TODO／PROGRESS。

Tests Executed / Test Results: build、typecheck、13 項 Node 測試及 4 項 Python Mock；schema 同步、mvp:prepare 可重跑同路徑、mvp:check（Mock 全流程＋原版載入／對話存讀／結束）通過。2,977 TALK 全部 WHATWG Big5 成功、未知控制碼 0，逐筆 UTF-8 SHA256 與 CP950 相同；84 場景保留 100 容量；627 原始檔與基準相同。商業切片與本機研究 JSON 皆受 Git 忽略。

Research Findings: 首個無戰鬥場景的必要路徑不需等待完整 DOS VM 或參考引擎建置。Known Limitations / Unverified Assumptions: 原版切片為社群候選規則，預覽入口／軸向非 DOS 驗證，其他事件格保守阻擋；未轉原版傳送／戰鬥／未知 opcode，無圖片或聲音重建。MOD 只支援最小文字 patch；存檔變更拒絕而非遷移。Next Recommended Tasks: Phase 7 Web 3D／操作 UI 與瀏覽器存讀檔，實際畫面驗收。所有本輪實作尚未新增 commit／push。

## MASTER_PLAN v1.2／Phase 3 首個索引模組

Phase: 1／2 未解研究持續，3 局部交付。Status: IDX／GRP 邊界模組完成，無可玩 MVP。依使用者要求先提交 35c3f4d 並成功推送 origin/develop（15 檔），其後才進行本節工作。

Completed Tasks: 調整為按功能證據驗收、參考引擎按需建置；自行實作純 TS uint32 LE 結束偏移解析與獨立 bytes 切片、metadata CLI、三項 Mock 測試。Files Changed: MASTER_PLAN、AGENTS、README、ADR 0008、game-data 索引與 exports、extractor CLI、idx-grp tests、解析報告、格式狀態、TODO／PROGRESS。

Tests Executed / Test Results: build、typecheck、4 項 Node 測試通過；實際 118 組 strict 稽核，117 相容、MMAP resourceId 3731 明確拒絕；TALK 2,977 邊界重跑一致；完整 627 檔前後與既有基準雜湊相同。研究 JSON 保留本機並檢查 Git 排除。

Research Findings: 共用容器讀取可獨立推進，不必等待 15／50 或整個參考引擎建置。Known Limitations / Unverified Assumptions: 容器相容不證明內容語意，MMAP 不自動修補；原版控制符號、事件規則、精確版本及授權未解，Phase 1／2／3 整體均未驗收。Next Recommended Tasks: TALK 的 bytes／文字候選解讀與控制碼保留。本節改動為推送後續的新工作，尚未另行 commit／push。

## Phase 2：依賴組態核對

Status: 靜態矩陣完成，整體未驗收。Completed Tasks / Files Changed: 新增 validation/candidate-dependency-matrix.md，audit_source_notices.py 0.2.0 增加三個建置檔雜湊與 MSBuild XML 各組態明載值，連結 engine-build，更新 TODO／PROGRESS。Research Findings: B 預設來源走 SDL3_mixer，但 x64 專案明列 BASS／BASSMIDI／smallpot；iconv／libzip 的 Windows 外部設定待查，Android stub 存在不代表被引用。Tests Executed: 固定來源重跑一致性、XML 組態與依賴斷言、版本防護及四項 Mock、Git 排除與 diff。Results: 通過。Known Limitations: 不展開 MSBuild 繼承或執行前處理；未編譯、未安裝工具鏈、未變更第三方來源，依賴版本／授權未結案。Unverified Assumptions: 各組態可建置性與原版相容性。Next Recommended Tasks: 固定單一研究目標與依賴版本，補上游鏈後配置工具鏈；15／50 原版證據另行處理。

## Phase 2：候選聲明與建置組態盤點

Status: 明訂範圍盤點完成，整體 Phase 2 未完成。Completed Tasks: audit_source_notices.py 固定 Git 物件逐檔雜湊／行號，A 10 檔、B 29 檔；補入 list.h Linux Kernel 上游、tml ZLIB 及 Android ARM64 CMake 限制，修正比較表舊狀態，新增 ADR 0007。Files Changed: 工具、license-review、engine-build、engine-comparison、ADR、PROGRESS、TODO。Tests Executed: 兩次固定來源結果一致、來源 commit 防護、4 項既有 Mock、diff 與本機報告 Git 排除檢查。Test Results: 通過。Research Findings: 7 檔有聲明關鍵字；無符合 LICENSE／COPYING／NOTICE 命名的路徑，不等於無授權。Known Limitations / Unverified Assumptions: 標記掃描不是法律或整包採用結論；未編譯，外部依賴與素材待審，原版 15／50 未驗證。Next Recommended Tasks: 按實際建置組態列依賴與上游鏈，再完成候選採用評估；原版自動輸入限制另行處理。

## 事件 676 路線研究

0.3.0 更新（Phase 1／2，部分完成）：使用者確認手動方向鍵與 Esc 均正常，自動操作工具點選畫面後的 Esc 仍無可靠結果，停止重複試鍵。新增候選背包 ID／數量與場景入口原值探測；基底及 R1 的 138–142 均無匹配槽。整理 OP50-NONE 手動重播清單，保留入口原值以避免兩來源 X／Y 命名差異。Files Changed: probe_event_routes.py、route、PROGRESS、TODO。Tests: 十檔讀取前後雜湊與重跑一致性、背包候選條件、四項既有 Mock、diff 檢查。Results: 通過。Known Limitations: 使用者操作確認不是自動重播證據；15／50 均未執行，路線可達性及背包語意未升為 Verified Original。Next: 手動執行 OP50-NONE 並保存證據，或先修復自動輸入。

後續完成：probe_event_routes.py 0.2.0 加入指令 3 反向閉包與針對性場景／地圖核對。候選鏈為洪七公居場景 23 槽 0 的 460 → 海邊小屋場景 32 槽 0 的 675 → 676；進度一保留 460 入口，但海邊小屋仍為 673，尚未完成啟用。兩場景槽 0 各有一個候選地圖事件格。更新 route、cases、TODO，明確區分 50 自身條件與 yes 分支後續五條 32 的副作用。Tests: 重複探測、十檔輸入雜湊、既有四項 Mock、diff 檢查。Results: 通過。Limitations: 非 DOS 執行，不驗證通行／對話續行，閉包僅涵蓋指令 3；Phase 1／2 尚未驗收。Next: 依此路線執行原版案例，操作阻礙仍待解決。

Phase: 1／2。Status: 部分完成。Completed Tasks: 新增唯讀 probe_event_routes.py 與 validation/event-676-route.md；核對固定來源的 DData 事件欄位與指令 3 寫入。Research Findings: ALLDEF／D1 均無 675／676 直接引用；事件 675 word offset 50 有把當前槽欄位 2 設為 676 的候選指令。Tests Executed: 真實輸入掃描、重跑一致性、輸入前後雜湊、既有 Mock 測試與 diff 檢查。Known Limitations / Unverified Assumptions: 尚未證明賦值可達；本輪 Escape／space 未確認功能選單，未執行 15／50。Next Recommended Tasks: 追查 675 的前置啟用鏈及可靠輸入，不跨入正式解析器階段。Files Changed: 上述工具、路線文件、PROGRESS、TODO。

## MASTER_PLAN v1.1 架構修訂

Phase: 架構規劃修訂；現有執行階段仍為 Phase 1／2。Status: 本次文件修訂完成，平台功能尚未實作。

Completed Tasks: 依使用者要求確立通用武俠 RPG 引擎＋金庸內容包，新增 Phase 13 十項平台交付；將內容 Schema、Runtime、規則與條件、MOD resolver、存檔精確內容組合提前至 Phase 6；補充存檔預檢／遷移、MVP 與測試要求。

Files Changed: MASTER_PLAN.md、AGENTS.md、README.md、docs/TODO.md、docs/PROGRESS.md、docs/decisions/0005-generic-engine-content-platform.md。

Tests Executed: 文件結構、必要交付與階段順序一致性檢查、git diff --check。Test Results: 通過；Phase 0–13 各有唯一標題，十項交付、存檔相容性與 ADR 連結完整。無執行程式碼變更，未重跑遊戲測試。

Research Findings: 這是已核准的產品架構決策，不新增原版逆向結論。Known Limitations: 實際 Schema、腳本語法、封裝格式、規則介面與平台實作均待後續 ADR 及驗證。Unverified Assumptions: 原有 DOS 指令差異與來源授權限制仍存在。Next Recommended Tasks: 繼續目前 Phase 1／2 的指令 15／50 證據研究；到 Phase 6 按新版契約驗收，再於首個 MVP 後交付完整 Phase 13。

## 原版研究紀錄

原版啟動驗證本輪：使用者確認 CMD 啟動器可執行，桌面工具本輪可觀察 DOSBox-X。完成主選單 → 載入進度一 → 大地圖，模擬器保存 z_000.png。新增 capture_original_evidence.py 與 original-boot-load-smoke.md，保存 BOOT-LOAD1 本機 17 檔證據並逐檔驗證雜湊；無缺檔，隔離副本及原始 627 檔未變更。Tests Executed: 實際原版啟動／載入、截圖檢查、證據雜湊、路徑限制與既有 Mock 測試。Known Limitations: 移動、功能選單、聲音、15／50 及自動重播未驗證，不把載入通過當作規則驗證。Next Recommended Tasks: 確認可靠輸入與進度一的可到達測試路線，仍在 Phase 1／2。

啟動相容性修正：使用者在本機 PowerShell 執行 ps1 遇到未簽章限制。新增 scripts/Start-OriginalGame.cmd，直接以既有隔離設定開啟 DOSBox-X，不修改系統執行原則；檢查 runtime、設定及隔離 Z.COM 存在後才啟動。更新環境說明與待辦。遊戲選單、聲音及事件驗證仍須分別取得證據，不把啟動成功當作驗收完成。

本輪驗證：CMD 啟動器回傳 0，模擬器程序存在；新日誌記錄 Z.COM／LOGO.SCR 執行，627 檔原始雜湊未改變，git diff --check 通過。未取得遊戲畫面證據；本輪變更尚未 commit／push。

DOSBox-X 本輪：完成官方 2026.10.01 x64 portable 下載與官方 SHA256 核對，保留在 assets/generated。新增 scripts/Start-OriginalGame.ps1 及 docs/validation/dosbox-x-setup.md；首次複製 627 檔至 session-001/game 並逐檔驗證。日誌確認 z.com／LOGO.SCR 執行；未視覺確認選單，未執行 15／50。computer-use 恢復嘗試仍回報 GetCursorPos 存取拒絕，已停止 UI 輸入。Tests Executed: 下載雜湊、複製雜湊、啟動日誌、設定／啟動腳本語法、原始完整雜湊與 Git 排除檢查。Known Limitations: 聲音／操作／選單／事件與可重播輸入待驗證。Next Recommended Tasks: 使用 -ShowWindow 在可見桌面確認遊戲後執行原版案例。

15／50 行為本輪：完整檢查 Pascal 函式，修正先前將 50 概括為動態版本的描述；本機首參數 138 走五物品 ID 條件路徑，社群來源不查數量。新增 probe_opcode_behavior.py 及原版待執行案例矩陣。114 條 15 均附帶 83；事件 676 的 50 兩個候選分支為 word offset 14／8，皆在邊界。Tests Executed: 唯讀探測、既有 4 項 Mock 測試、完整輸入雜湊檢查。Known Limitations: 未找到 PATH 可用 DOS 模擬器，未執行原版；所有原版行為與 83 用途仍 Unknown。Next Recommended Tasks: 配置隔離 DOS 測試環境並執行案例，不修改原始資料、不提前實作通用 Runtime。

最新 Phase 1／2：找到 kys-tools commit 1d439afe76dae41c821065c3a33c1c6709dc7fce 保存的 FishEdit 0.72 來源。新增 audit_fishedit_layout.py、4 項 Mock 測試、fishedit-opcode-evidence.md 與 ADR 0006，更新來源／工具／授權／待辦。依來源長度表，1,018 個事件全部線性相容，共 13,315 條指令；啟用設定宣告的 1,394 個分支目標皆在邊界。15 為兩單位；50 文件為五物品條件，與 Pascal 動態實作不同。Tests Executed: Mock 測試、實際資料稽核、重複結果與原始檔雜湊檢查。Known Limitations: 50 的分支設定與文件不一致，原版語意／版本／授權未確認。Next Recommended Tasks: 原版 15／50 行為案例與來源核對，不啟動 Phase 3／6／13。

Phase: 0 基礎驗收完成；1／2 僅啟動獲准的前置工具與公開研究。

Status: 部分完成；尚無可玩 MVP，未進入 Phase 3。

KDEF 布局本輪：新增 audit_kdef_layout.py、community-opcode-table.md、kdef-layout-compatibility.md 與 ADR 0004。固定來源的 68 條分派表與本機資料比對後，922 個事件線性結構相容、95 個遇到候選未知值 83、1 個遇動態指令 50 停止。事件 20 顯示指令 15 的參數布局在兩社群來源間有差異。Status: 完整解析／轉換停止，繼續來源研究。Tests Executed: 來源形狀檢查、全事件唯讀稽核、重複結果、完整檔案雜湊與 Git 排除檢查。Known Limitations: 不是 DOS VM，不驗證分支可達性，參數語意及擴充界線待查。Next Recommended Tasks: 尋找接近 DOS 的指令定義或反組譯證據，優先釐清 15／50，不跨入 Phase 3。

TALK／KDEF 本輪：新增兩個隔離研究來源（kys-jedisdl、sfe-kdef）並固定 commit。找到 Pascal 引擎直接讀取、XOR 與事件執行來源。新增 probe_dialogue_events.py、talk-kdef-source-analysis.md，更新版本／格式／工具／授權／比較／待辦。2,977 筆 TALK 均可 CP950 解碼，標準 Big5 有 1 筆失敗；1,018 筆 KDEF 全部偶數長度。Tests Executed: 唯讀探測、重複結果一致、完整輸入雜湊及 Git 排除檢查。Known Limitations: 指令邊界、原版控制符號、完整授權及成功建置未完成。Next Recommended Tasks: 建立 opcode 逐條來源表並確認社群擴充界線，Phase 2 尚未完成。

本輪更新：新增 audit_original.py 與 full-field-index-audit.md，檢查 5,668 個來源定義的候選文字欄位，Big5／CP950 零解碼失敗。118 組索引無超界值；MMAP 的 5,000 個尾端零值作為例外保留。四組附帶事件修正檔與正式目錄副本完全相同。Tests Executed: 實際輸入稽核、重複稽核一致性、完整原始輸入雜湊與 Git 排除檢查。Known Limitations: TALK、KDEF、保留區用途、原版規則、完整授權及成功建置仍待確認。Next Recommended Tasks: 對話／事件原始讀取來源與 MOD 工具一手發布追查，不進入 Phase 3。

最新更新：完成編碼、容量與轉換限制研究，詳見 research/encoding-map-conversion.md。新增唯讀研究探測 tools/analyzer/probe_original.py，輸出附來源 commit、假設等級與輸入雜湊的本機報告（不提交）。抽樣支持 Big5／CP950，未確認全資料編碼；地圖容量相當於 100 區塊但場景紀錄 84 筆，尾端非零資料必須保留。原轉換說明排除 50 指令，依賴 FishEdit 匯出與人工事件修補。Tests Executed: 實際輸入探測、JSON 結果檢查、完整重掃、Git 排除及 diff 檢查。Test Results: 通過，627 檔雜湊未改變。Known Limitations: 事件 opcode、原版尾端用途及完整授權未確認。Next Recommended Tasks: 完整編碼檢查與工具一手來源追查；未跨入 Phase 3。

Completed Tasks: AGENTS、workspace、TS 建置與測試、來源契約、盤點器、匯入規範、資料隔離、兩個候選初查及第一候選 commit 記錄。

Files Changed: AGENTS、README、package／lock／workspace／tsconfig／pyproject、gitignore、packages/game-data、tools/analyzer、tests/unit、original／references 說明、docs 研究／決策／驗證／進度／待辦與預留目錄。

Tests Executed: pnpm run build、pnpm run typecheck、pnpm run test。

Test Results: 通過；1 個 Mock 測試涵蓋 SHA256、巢狀路徑、未知格式、重複結果一致、輸入未改寫及輸出目錄保護。初次 pnpm 因 store 差異觸發非互動安裝失敗，統一 workspace store 後重跑通過。

Research Findings: 候選與路徑可確認，尚無已確認可直接移植的規則。詳見 research 與 validation。

Known Limitations: 使用者已說明為原始中文版、無 MOD 或修補；精確發行版本與檔案一致性尚未獨立驗證。候選來源已取得，make／GCC 與可用 Visual Studio 工具鏈不足。Phase 1、2 尚未驗收。

Unverified Assumptions: 原版版本、資料結構、公式、事件語意、上游關係、授權及最終 Web 技術均待確認。

Next Recommended Tasks: 補充輸入版本與來源資訊，驗證格式及完整性；修復候選來源取得、查授權與建置需求，再審查資料讀取實作。

Phase 1 更新：2026-11-02 完成 original/dos 共 627 檔、128,510,353 bytes 的唯讀盤點。重複掃描逐筆一致；118 組 IDX／GRP 同名配對齊全。原始資料及 inventory.local.json 皆確認受 Git 忽略；未執行附帶程式、未修改資料。Files Changed: 本機盤點與 research 的 inventory／game-version／file-format-status、PROGRESS、TODO。Tests Executed: 兩次真實輸入雜湊掃描、配對檢查與 Git 忽略檢查。Test Results: 通過；不代表已完成遊戲格式或發行版本驗證。

Python 修正：已將可用 Python bin 置於使用者 PATH 前方。Python 3.14.7、ssl／sqlite3／venv 匯入、專案 .venv 建立與 pip 26.2.1 均通過。既有終端與 Codex 需重新啟動才能繼承新 PATH；可立即使用 .venv/Scripts/python.exe。


Phase 2 本輪：兩候選來源取得與 commit 固定完成；建立 docs/research/source-index.md、補充授權／比較／建置紀錄與 ADR 0002。RANGER、R1–R3 六段邊界與長度符合候選結構，整除筆數為 320／200／84／93／5，僅表示長度相容。已定位事件、對話、傷害與 AI；未驗證公式。make 重試失敗，vswhere 無可用安裝。Known Limitations: 混合授權、中文編碼與容量配置仍待查；未編譯執行。Next Recommended Tasks: 追查編碼、地圖容量及轉換限制，補齊工具鏈後重試；不跨入 Phase 3。

