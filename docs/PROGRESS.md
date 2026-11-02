# 進度 — 2026-11-02

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

