# 進度 — 2026-11-11

## DOSBox-X 自動驗證前置與 Opcode 覆蓋盤點（最新）

Phase: Phase 1／2 原版驗證（debugger 操作前置局部完成）；Phase 3／6 局部研究，整體未驗收。Status: 六個指定按鍵於 session-001 可見生效；隔離 session-002 的 debugger TCP PING／EXEC 成功，已設置並列出 breakpoint。實際中斷停止、建立新存檔及事件跳轉仍未驗收，因此尚未宣稱全指令可玩。

Completed Tasks: 建立 `session-002` 原版資料副本，核對 20 個 root-level RANGER/R1–R3/S1–S3/D1–D3 存檔檔案 SHA-256 與 session-001 初始副本一致；產生 ignored baseline manifest。新增 DOSBox-X loopback debugger 控制橋、session-002 啟動器、protocol 單元測試。新增 opcode 覆蓋產生器及來源標籤表，盤點 68 個 opcode 的候選字數、FishEdit描述、社群 Pascal dispatcher、出現次數與目前 Runtime 覆蓋。修正文檔先前錯稱 Pascal dispatcher 沒有 opcode 15 的結論。實際 handshake 後 HELP／CPU／BPLIST 有回應；BPINT 21 4B、BP 0160:001D543E 被接受並列在 breakpoint 清單；新增 PING／BREAK bridge 動作。

Files Changed: `tools/validator/dosbox-x-debugger-control.mjs`、`tools/validator/dosbox-x-debugger-protocol.mjs`、`tools/analyzer/build_event_opcode_catalog.py`、`scripts/Start-DOSBox-X-Session-002.cmd`、`scripts/Send-DOSBoxX-Key.ps1`、`tests/unit/dosbox-x-debugger-protocol.test.mjs`、`docs/validation/dosbox-x-debugger-and-sampling.md`、`docs/research/event-opcode-coverage.md`、`docs/research/opcode-15-50-status.md`、`docs/decisions/0036-dosbox-x-event-sampling.md`、本進度及 TODO。`assets/generated/dosbox-x/session-002` 只為 ignored 本機資料，未加入版控。

Tests Executed: debugger protocol Node unit tests；完整 Node unit suite；Python unit suite；shared JSON Schema 匯出同步；session-001/session-002存檔檔案雜湊對照；FishEdit 0.72 指令表形狀及全部事件記錄統計；loopback PING／HELP／CPU／BPLIST／BPINT／BP／BREAK 真實 debugger 請求；git diff whitespace check。

Test Results: debugger protocol unit tests 3/3 通過；完整 Node suite 67/67 通過。Python 14/14 通過（TMP/TEMP 指向工作區暫存目錄後）。68 條候選 opcode 切分覆蓋 1,018 events、13,315 opcode 指令和 1,018 個 `-1` 結尾記錄。DOSBox-X 鍵盤輸入以 elevated PowerShell 將 WM_KEYDOWN／UP 投遞至精確視窗：方向鍵在 session-001 選單與地圖產生可見反應，Enter 開啟進度槽並載入既有進度一，Esc 後畫面轉黑（語意未知）。session-002 真實 debugger PING 回 PONG；EXEC HELP／CPU／BPLIST 成功；BPINT／BP 指令接受且 BPLIST 列出。RUN 回 OK 僅代表接受；BREAK 回應 acknowledged，但畫面仍顯示 RUN；此 runtime 的 STEPIN 回 command not recognized。因此 breakpoint 實際停住與單步目前尚未證明。session-002 遊戲視窗持續黑畫面，定向 Up 投遞沒有可見遊戲反應。CUA click／pressKey 仍回報 access denied。沒有新建存檔。pnpm typecheck／build 先前被工作區 realpath EPERM 阻擋。

Research Findings: DOSBox-X 2026.10.01 官方 debugger README 提供 `BP`、`BPINT`、`BPLIST`、`RUN`、`MEMREAD` 與 loopback 控制協定。遊戲原始 DOS 副本把 RANGER/R1–R3/S1–S3/D1–D3 存檔檔案放遊戲根目錄；社群 Pascal `LoadR`/`SaveR` 使用 `save/` 目錄，路徑差異不可直接混用。Opcode parser 只做結構/對話引用；通用 game-core IR 也不等於原版 opcode adapter。FishEdit文件只提供 43 條語意描述，全部 DOS 執行效果仍未知。Opcode 7 在645處後面還接其他候選記錄共643處，不能把整個線性資料尾端都丟棄；完整Runtime要保留尾碼並建模分支可達性。

Known Limitations: 本輪按鍵畫面驗證使用 session-001 的既有進度一；session-002 的 debugger 模式視窗持續黑畫面，定向鍵沒有可見反應，尚未在該 session 建立新存檔。Break acknowledgement 未能藉單步證明 CPU 停止。Esc 的黑畫面狀態未判明是切換、淡出或退出。桌面控制器 API 仍被 access denied 阻止，但精確視窗 PostMessage 路徑在可見 session-001 可用。社群引擎存檔 offset 不能直接當 DOS 原版已驗證規格。dialogue-only parser 只讀Opcode 0/1，且僅容許 7 或 -1 是末字，並不建模 Opcode 7 在事件中間的 control flow；其餘Opcode效果未接入Runtime。Opcode 15／50 的原版行為仍未知。

Unverified Assumptions: `BREAK` acknowledgement 是否讓 runtime 從 RUN 狀態停住仍未確認；Esc 後黑畫面原因未知；存檔可否透過合法狀態複製出特定事件前置尚未確認。

Next Recommended Tasks: 先釐清 session-002 的 BREAK／BP 停止狀態，或用支援此 runtime 的手動 debugger interrupt；之後在 session-002 重跑六鍵並保存畫面證據、透過遊戲 UI 寫入／讀回獨立存檔 slot，再建立事件前置採樣副本。逐 opcode 補足參數語意、state effects、跳轉公式、失敗行為與證據等級，再實作受控 adapter；未知指令必須停止事件且不提交部分狀態。

# 進度 — 2026-11-04

## 全量原版劇情與事件轉換（2026-11-09，結構資料已產生）

Phase: 3 局部；Phase 3／6 整體未驗收。Status: 全量 KDEF／TALK 已轉成只供本機稽核的中間資料；尚未接入 Runtime，也不能用來驗證事件後狀態。

Completed Tasks / Files Changed: 新增 `tools/extractor/convert_original_event_corpus.py`，以固定 FishEdit 0.72 候選長度表轉換 1,018 個事件及 2,977 段對話；每個來源保留原 bytes、偏移、長度、SHA-256，對話 token 保留 CP950 文字與控制碼。輸出 `assets/generated/event-corpus/all-events-ce00ac1ebede9e7e.local.json` 為 Git 忽略的本機資料。新增 `tests/unit/test_original_event_conversion.py`、`docs/validation/full-original-event-corpus.md`，並把 FishEdit audit 的來源表讀取抽成可重用函式。

Tests Executed / Test Results: 轉換 1,018／1,018 events、2,977／2,977 talks，CP950 解碼失敗 0；3,561 對話引用、16,061 目前互動欄位引用均有效；候選分支目標 0 個無效，來源 hash／offset 0 個不符。全 Python 單元測試 14/14 通過；原版資料 Node 測試 3/3 通過。完整 Node 單元測試 63/64，既有 shared-schema 同步測試因 `description` 與匯出 schema 不一致而失敗。`pnpm run build`／`typecheck` 在 pnpm 啟動時遇 workspace `realpath` EPERM；直接跑 `tsc -b` 則因 node_modules 缺 `fast-uri` 而停止，故本輪沒有成功完成 TypeScript build/typecheck。

Research Findings: 所有事件結構均可由 FishEdit 候選表切分，但這是 Community Implementation 證據。Opcode 15 出現114次，後續欄位全為83；FishEdit描述為死亡返回選單(5300)，Pascal／Lua社群引擎作停止／Game Over類處理。使用者已排除「15為比較條件分支」的未驗證假結論。全部1,018事件以-1結尾；Pascal將7標為Break the event、負數作讀取終止。使用者假設7為死亡結局、-1為破關結局，尚無本機證據支持。Opcode 50出現1次（事件676），社群來源在五物品條件／動態分支及事件資料改寫上不一致；其餘opcode語意未逐項以DOS原版驗證。Known Limitations / Unverified Assumptions: 原始opcode參數尚未映射為可執行狀態效果；事件可達性、自動／物品觸發、人物／背包／旗標／戰鬥／切圖變更和事件後狀態均未驗證。不能把本次全量資料轉換稱為劇情已可玩。Next Recommended Tasks: 建立有來源等級的opcode→Runtime效果矩陣，先實作有來源支持且可隔離驗證的指令；未解指令必須使事件停下且state不提交，然後新增事件前後狀態差異檢視。用隔離DOSBox案例先觀察OP15，並分別確認7與-1的遊戲結果；再進行opcode 50案例。未commit／push。

## 2388尺寸校準嘗試與管線能力釐清（最新，未作新模型交付）

Phase: 8局部。Status: 本機GLB包裝變換實驗，不是重新送入管線推論；使用者指出未見管線重產，已停止將本機拉伸當成新模型方案。

Completed Tasks / Files Changed: footprint-model-calibration、bake-model-calibration及prepare-world-model選填尺寸規則；model-inspection可測水平主軸。以最大完整4×3引用範圍、108×102圖像與原始2:1投影算得高2.5402格距，包裝GLB及世界實驗包保留ignored目錄。

Tests Executed / Test Results: 本機尺寸公式2項Node、局部Chromium1項（5.8秒）、typecheck／build／artifact通過；實際GLB bbox為4×3×2.5402，但view_image仍見斜薄片外型，數值外框符合不等於山體重建成功。

Research Findings: 已讀既有服務openapi快照；PNG輸入進SPAR3D、GLB輸入只後處理，現API僅files／asset_type／asset_id／max_attempts／seed／texture_resolution，沒有占位尺寸或體積約束。這輪未向POST /api/jobs提交新工作。Known Limitations: 拉伸既有網格未補足山體結構，不能聲稱重新生成成功；尚無管線尺寸契約。Next Recommended Tasks: 先釐清／補足管線尺寸與體積重建能力，再依使用者指定流程重產2388；本機實驗檔不作已核准模型。未commit／push。


## Building限定轉換，首個2388模型（最新）

Phase: 8局部。Status: 使用者人工核定只有building轉模型，earth／surface最後處理；2388生成及世界接入完成，但模型偏薄，非美術定稿。開始前讀主計畫／進度／TODO、檢查opencode並保留既有變更。

Completed Tasks / Files Changed: ProjectedMap新增選填layer／ID模型綁定及hash驗證；投影renderer以AssetContainer共用模型、按可見錨點實例化，僅替換指定圖片；新增prepare-world-model、局部E2E／綁定單元測試、ADR0035／validation/building-model-2388.md。使用既有LAN服務Job bfee967703174d92856307cc5ed4580e succeeded，LOD0／Job／manifest／quality與預覽只在ignored目錄。

Tests Executed / Test Results: typecheck／build／artifact／diff通過；4項相關Node、局部Chromium1 passed（6.3秒），確認package及三層原始資料完全不變、2388單一綁定ready無alert／pageerror，view_image檢視實景；接合重跑同bytes／hash。未做全圖檢查或完整回歸。

Research Findings: 2388為山體圖，93放置錨點／10種格位引用排列，不是10模型尺寸；同ID共用尺度，各位置原mask保持不變。LOD0 1.14MB／7998三角形，源推論深度僅約0.112、寬約1.055，薄體問題存在於推論階段。Known Limitations / Unverified Assumptions: 單圖模型體積不足、背面／朝向與綠色底緣待調整；候選等比視覺fit尺寸非原版高度，不擅自拉厚。Next Recommended Tasks: 先修整及驗收2388體積與朝向，再轉下一個building；earth／surface保持原圖。未commit／push。


## 世界資產結構圖錄（最新）

Phase: 3／8局部。Status: 使用者人工操作回報正常；依要求先完成958圖的結構、疊加與占格盤點，語意及3D高度待逐圖核對，不修改Runtime或阻擋。開始前讀主計畫／進度／TODO、確認opencode並保留全部既有變更。

Completed Tasks / Files Changed: 新增prepare-world-asset-review.py及獨立HTML模板；輸出本機圖錄、完整JSON、空白決策模板、逐錨點mask及相鄰多圖疊合預覽。新增圖錄局部E2E、ADR0034／research/world-asset-structure.md／TODO；全部原圖及衍生資料只在ignored assets/generated/world-asset-review。

Tests Executed / Test Results: 來源及958張payload／PNG SHA逐一核對、前後來源hash不變、重跑catalogue hash一致；圖錄Chromium 1 passed（3.8秒），篩選460／180／318及5×7實占17格mask、SVG組合圖、類別保持待核對；view_image檢視圖錄與組合。typecheck／build／artifact／diff通過，公開107檔商業資源0；未跑世界路徑／全圖連通或完整遊戲回歸。

Research Findings: 同格earth後surface再依錨點排序疊加building；building層也含樹、岩石、坡壁及院落。7832個非空錨點中6966單格、866多格；50個圖片ID有不同占格mask；762個相鄰候選含740組多ID，全部未核准合併。Known Limitations / Unverified Assumptions: 相鄰不是同一物件的證據；像素高不是3D高度；外框不等於填滿遮罩。Next Recommended Tasks: 逐ID確認外觀／突起與原創高度，按實例mask決定占位；人工指定多圖成員後再合併，不自動套整個相鄰群。未commit／push。


## 完整世界座標軸修正（最新）

Phase: 7／8局部。Status: 原版世界X／Y與render統一，使用者後續回報人工操作正常；不宣稱完整碰撞還原。開始前讀MASTER_PLAN／PROGRESS／TODO、檢查opencode並保留既有變更。

Completed Tasks / Files Changed: view-controls新增projectedWorldPoint／projectedImageOffset與gridYSign；renderer統一世界玩家／錨點／跟隨目標，projected-map-renderer修正地面／立面基底；App鍵盤與按鈕、SceneView小地圖共用-1軸向。新增局部world-axis E2E、方向單元案例、ADR0033／validation/world-axis-alignment.md。

Tests Executed / Test Results: 6項相關Node、typecheck／build／artifact／diff通過；Chromium局部1 passed（9.8秒），從(358,229)驗證X+、Y+及已知blocked(358,228)。view_image檢視實景。依使用者要求未跑全圖連通／完整回歸。

Research Findings: 來源screenX=(x-y)*18／screenY=(x+y)*9要求X+右下、Y+左下；舊render Y→+Z讓Y+右上，並造成ground與billboard像素基底不一致。新render=(x,0,-y)，相機角度及原始blocked資料不改。Known Limitations / Unverified Assumptions: 每棟建築占格／船隻／場景入口尚未驗收，通行仍為Community Implementation；舊8×8 GLB包未重轉。Next Recommended Tasks: 玩家同一建築附近試走，若有具體格位落差再局部查證；不修改阻擋表遷就顯示。未commit／push。

## 前次完整世界實作補記（中斷後整理）

已交付480×480完整三層格網及958個獨立圖片ID，MMAP圖片全部嚴格RLE解碼；預覽包world-fa9af52a0d2428da.local.json及獨立PNG只在本機ignored。通用schema支援512邊長，附近投影隨移動建立／釋放。原版BUILDX／BUILDY支援占格規則及建築引用錨點，未自行依圖片類別分類。前次已做全圖連通檢查，但使用者已明確要求這類驗收延後，後續不擴大。來源檔與來源規則證據見ADR0033／validation/world-axis-alignment.md；不得把前次能行走當成畫面與阻擋完整吻合。


## 地面逐資源獨立核對及原配置還原（最新）

Phase: 8局部。Status: 21原圖／21獨立材質／64格來源對應完成；非高清美術定稿。依使用者明確要求，撤回平均色地表分類與共用草土方案。

Completed Tasks / Files Changed: 新增prepare-ground-review／independent-ground-resources／prepare-independent-ground、21筆外觀註記；保留每ID的PNG／payload hash、SMP001偏移、尺寸與錨點、逐格位置，玩法屬性與地表類別皆Unknown、mergeWith=null。新Mock／實際WebGL核對、ADR0032／validation／TODO；舊共用工具預設停用，舊紀錄明確標為撤回實驗。

Tests Executed / Test Results: 57 Node、typecheck／build／artifact通過；本輪Chromium 2 passed（6.7秒），21材質及64格ID對照完全相同、ready無pageerror／alert；view_image檢視21原圖及實景。輸出重跑同hash／bytes，圖片與原版衍生包只留ignored assets/generated。

Research Findings: 多個來源ID本身已含不同方向的黃褐／綠色交界，平均色與單張草圖會抹去原圖差異；1182為36×22含厚邊，其他20張36×18。Known Limitations / Unverified Assumptions: 本輪用完整原圖逆投影，不生成高清替代，不推定1182高度；低解析縮放仍有像素條紋；相機比例／光照不是DOS畫面驗收。Next Recommended Tasks: 逐ID原圖作為各自高清製作依據，保留原內部圖案及交界；不擅自合併或新增跨ID混色。未commit／push。


## 共用地面材質與成功LOD0（最新）

Phase: 8局部。Status: 64格共用草土base-color已呈現，樹木最新Job確認succeeded並改用LOD0。

Completed Tasks / Files Changed: 新增shared-ground-material／prepare-ground-material、GLB大小分析工具、新實景E2E、ADR0031／validation與生成提示詞紀錄；本機生成PNG、GLB及9.53MB預覽包均ignored。無Runtime或鏡頭操作變更。

Tests Executed / Test Results: 55 Node、typecheck／build／artifact、新Chromium實景1 passed（5.9秒）、重跑同bytes／hash；view_image檢視共用材質實景。公開107檔商業資源0，既有chunk提示保留。

Research Findings: 樹／石LOD0面數下降，但內嵌貼圖由JPEG組合變成含較大PNG，幾何節省被圖片抵銷；查證數字見validation/shared-ground-material.md。64格128三角形共用一張圖／一個材質，world UV與平滑頂點色減少格線。Known Limitations / Unverified Assumptions: 只有base color，無normal／height／roughness maps；原創地面色族非原版地形證據；未完成近景平鋪邊界／大型區域重複感及壓縮效能驗收。Next Recommended Tasks: 地面色調及重複尺度確認後製作路面／石板與欄杆共同材質。未commit／push。


## 第一批實際生成美術候選（最新）

Phase: 8局部。Status: 實際生成樹木／岩石已接入原版8×8配置，非最終美術定稿。使用者明確授權兩張PNG送至既有LAN服務；未增加鏡頭旋轉。

Completed Tasks / Files Changed: 新增prepare-art-sample離線接合、來源與輸入輸出hash驗證；model-inspection支援純幾何預檢；本機GLB預算由2MB調整4MB、索引accessor上限對應100k三角形；新增實際生成材質瀏覽器驗收、ADR0030及validation/first-generated-art-sample.md。原圖、GLB與預覽包只在ignored assets/generated。

Tests Executed / Test Results: 55 Node、9 Python、typecheck／Schema／build／artifact通過；完整Chromium 17 passed（47.3秒）、exit0，包含實際帶貼圖GLB呈現；離線接合重跑產生相同hash／bytes，Git忽略及diff檢查通過。已view_image檢視原圖及實景截圖。

Research Findings: SPAR3D樹木生成37,452三角形、2.53MB；岩石LOD0 7,999三角形、1.28MB。樹木推論成功但後處理verify因Triangle count changed on reload失敗，只使用raw_glb視覺候選；岩石工作succeeded。Known Limitations / Unverified Assumptions: 樹冠偏亮、岩石綠底與其他占位仍有風格差異；不宣稱定稿、原版3D形狀或完整量產／LOD／授權驗收。Next Recommended Tasks: 先做實景美術評估及共同地面材質，再擴大生成；不再增加占位置換案例。未commit／push。


## 本機模型替換與尺寸原點校正（最新）

Phase: 7／8局部。Status: 替換前置完成，不開放鏡頭旋轉、不呼叫精細模型生成服務。開始前讀主計畫／進度／TODO、確認opencode並保留全部既有變更。

Completed Tasks / Files Changed: 新增純資料model-replacement與exports、動態model-inspection；App新增assetId選擇／GLB替換／還原、樣式；placeholder-rock提供明確Mock變體且預設hash不變；範例生成工具、3項Node／E2E、ADR0029／validation／TODO更新。

Tests Executed / Results: 55 Node、9 Python、typecheck／Schema／build／artifact／diff通過；完整Chromium16 passed（43.7秒）exit0。實際GLB偏移／放大兩倍後校正到原外框與底部；全實例同ID更新，損壞檔案拒絕，遊戲存檔下載bytes相同，裝飾／阻擋格規則及還原後位置不變。view_image檢視藍色替換及還原截圖；範例重跑bytes一致、Git忽略。沒有改寫原版資料，既有Babylon chunk提示保留。

Research Findings: 穩定視覺ID可換新模型bytes但保留每實例原創尺寸；必須考慮bbox原點及Y旋轉，不能直接沿用新檔原始比例。Known Limitations / Unverified Assumptions: 校正為逐軸fit可能變形；只測靜態無貼圖Mock，2MB限制、無正式資產包持久化／精細風格／LOD驗收；替換只留當前預覽，刷新需重匯。Next Recommended Tasks: 一個共同尺寸與材質風格的精細樣本驗收，再決定量產規格；鏡頭旋轉保持暫停。未commit／push。

## 相機／小地圖即時視角同步（最新）

收尾結果：完整Chromium15 passed（38.0秒）、exit0，包含MiniMap／WebGL四方向像素比對及窄版觸控；view_image檢視目前投影後小地圖與3D平面的方向／俯角比例。diff檢查通過，既有Babylon chunk提示保留。此結果取代下文待補記狀態。

Phase: 7顯示與輸入。Status: 同步介面完成，未新增旋轉操作UI。開始前讀主計畫／進度／TODO、確認opencode並保留既有變更。Completed Tasks / Files Changed: view-controls新增CameraView及地面投影，畫面輸入可讀即時alpha；renderer在角度變化時發布視角，SceneView／App轉接到MiniMap與鍵盤／觸控，MiniMap不再固定135度或鏡射；新增實際多角度投影Node測試、ADR0028／validation／TODO更新。

Tests Executed / Results: 52 Node、9 Python、Schema、typecheck、build／artifact通過；完整E2E結果收尾補記。新增5方位×2俯角×8方向與真實Babylon矩陣位移一致，長按中更新視角後方向跟隨。Research Findings: 小地圖可與現用正交相機共用實際投影，不需為每個角度設定獨立補丁。Known Limitations / Unverified Assumptions: 尚未啟用旋轉操作，公式限現用無roll正交相機；自由視角手感／多角度美術待驗收。Next Recommended Tasks: 玩家確認目前對齊；日後旋轉操作走共用視角資料流。核心／碰撞／原版規則未改。未commit／push。

## 小地圖單軸反向修正（最新）

收尾結果：4項Chromium E2E全部通過（13.4秒）、exit0，包含上下左右MiniMap／WebGL雙畫布像素位移比對及390×844觸控；typecheck／build／artifact／diff通過。此結果取代本節待補記狀態。

Phase: 7顯示修正。Status: 保留135度旋轉並補畫面X鏡射。開始前讀主計畫／進度／TODO、檢查opencode並保留既有變更。Completed Tasks / Files Changed: SceneView MiniMap增加水平鏡射；web-mvp E2E在既有四方向WebGL像素測試中加入MiniMap角色點像素位移比對；ADR0027／TODO更新。

Tests Executed / Results: typecheck、build／artifact通過；新增四方向雙畫布比對案例已通過，其餘既有瀏覽器案例結果收尾補記。Research Findings: 先前僅旋轉未處理top-down與相機投影的手性差異，只有裁切與一般操作驗證不足以證明方向一致。Known Limitations / Unverified Assumptions: 固定相機下的顯示轉換，未支援任意旋轉相機；未改核心／來源資料／碰撞。Next Recommended Tasks: 玩家確認相對方向與阻擋配置。未commit／push。

## 行跡小地圖旋轉（最新）

收尾驗證：完整Chromium15 passed（38.6秒）、exit0；view_image實際檢視旋轉後的小地圖，四角留在卡片內，桌面及390×844觸控回歸通過。typecheck／build／artifact／diff通過。此結果取代下文待補記狀態。

Phase: 7顯示修正。Status: 已依使用者指定順時針135度繪製。開始前讀主計畫／進度／TODO、確認opencode並保留既有變更。Completed Tasks / Files Changed: SceneView的MiniMap對背景／阻擋／出口／NPC／角色共用Canvas旋轉，依實際地圖旋轉bounds縮放，192畫布保留8px邊距；ADR0027／TODO／PROGRESS更新。

Tests Executed / Results: typecheck、build／artifact通過；本輪完整Chromium回歸與截圖檢視結果於收尾補記，未另增鏡像實作的單元測試。Research Findings: 此為指定顯示角度，不改來源軸向或原版規則。Known Limitations / Unverified Assumptions: 固定135度，未支援動態鏡頭旋轉；原有未驗證格式／授權／原版規則不變。Next Recommended Tasks: 玩家比對視角方向與阻擋關係；需要時再調整呈現。未commit／push。

## 通行轉接統一與Mock建築剖視（最新）

Phase: 3／6／7／8局部。Status: 社群通行規則共用及獨立建築測試完成，非原版門事件／屋頂驗收。開始前讀計畫／進度／TODO、確認opencode並保留既有變更。

Completed Tasks / Files Changed: 新增scene-passability與exports，map-region parser0.2.0／collisionProfile，prepare-mvp共用同一判定；來源建築包0.2.0允許slot15的flag0格通行。新增prepare-building-demo、cutaway資產選項、renderer／SceneView／App手動剖視與匯入驗證、source wall標記、Node與E2E；ADR0026／validation／TODO更新。

Tests Executed / Results: 51 Node、9 Python、Schema／typecheck／build／artifact／diff及mvp:check通過，完整Chromium15 passed（38.9秒）exit0。來源門口可走過、未執行事件；Mock藍屋頂畫布像素>1000到<50再恢復，隱藏牆與桌子仍阻擋、角色位置不變；view_image檢視屋頂顯隱截圖。原版七份來源前後hash相同、輸出重跑同內容且Git忽略；第一選區仍22個blocked，建築選區20→19。Research Findings: 原始規則分歧源於重複轉接；以共享社群函式消除，但不提升為Verified Original。Known Limitations / Unverified Assumptions: 手動剖視非自動遮擋；原版門口672等腳本／切圖未轉換，沒有原版屋頂證據；Mock屋頂不混入來源包。Next Recommended Tasks: 剖視與尺度使用驗收、必要時角色輪廓／自動淡出，然後共同材質與精細替換。未commit／push。

## 第二來源占位切片：牆與門口（最新）

Phase: 3／7／8局部。Status: 視覺配置完成，門行為／屋頂未驗收。開始前讀主計畫／進度／TODO、確認opencode並保留既有變更。

Completed Tasks / Files Changed: RLE exporter增加可選區域參數／bounds檢查，產生獨立(20,22)8×8來源圖；新增prepare-building-preview、scene1-building-rules、兩項Node／一項Python／來源E2E、ADR0025／validation／TODO更新。牆、紅柱、欄杆映射為原創尺寸，來源offset／hash與門口raw event fields保留。

Tests Executed / Results: 49 Node、9 Python、Schema／typecheck／build／artifact／diff通過，Chromium14 passed（33.4秒）exit0；原圖與遊戲截圖view_image檢視完成。CLI重跑同hash、七份來源前後hash不變，所有原版衍生輸出Git忽略。Research Findings: 12張圖片／85次圖像放置；64地板＋7牆／柱＋6欄杆，家具及桌上器物6類未映射；無已確認屋頂。Known Limitations / Unverified Assumptions: 門口slot15欄位0=0按ADR0015應可通行，但extractMapRegion仍將全部事件阻擋；此次只驗證保守preview，不標原版門不可通過。牆柱部分遮擋角色，未處理屋頂／淡出／門事件。Next Recommended Tasks: 區域通行轉接一致化與門事件查證，獨立Mock測門洞、牆角、屋頂顯隱及遮擋，再進尺寸／材質。未commit／push。

## 選區完整占位覆蓋（最新）

收尾結果：高樹取景修正後，Chromium完整13 passed（28.6秒）、exit0，包含canvas上緣葉片裁切檢查；重新view_image確認兩棵樹完整入鏡。輸出重跑同hash、Git忽略、22個blocked與先前石頭包逐項一致。此結果取代本節下文的待補記狀態。

Phase: 3／7／8 局部。Status: 選區32個layer／resource ID均有占位，非原版外觀／規則或完整Phase8驗收。開始前讀計畫／進度／TODO、檢查opencode並保留既有變更。

Completed Tasks / Files Changed: 新增placeholder-vegetation／placeholder-catalogue與scene1-placeholder-models，--all-placeholders綁定7個草／樹／石頭ID；新增2項Node與本機E2E；renderer區域取景納入GLB載入後world bounds，修正高樹裁切；ADR0024／validation／TODO更新。

Research Findings: 完整選區85個視覺實例（64地板、6欄杆／柱、1告示牌、14 GLB：10草2樹2石），unmapped0、22個blocked格保留。尺寸為原創測試值、GLB為Mock，沒有原版樹種／比例或最終畫風結論。Tests Executed / Results: 47 Node、8 Python、Schema／typecheck／build／artifact通過；首次瀏覽器13項通過但視覺檢查發現樹冠裁切，修正後完整回歸結果依本輪補記。Known Limitations / Unverified Assumptions: 純色低模、無UV／LOD／共享快取／植被動畫，角色遮擋仍需評估；零未映射不是完整原版完成。Next Recommended Tasks: 完整占位選區的尺寸與遮擋驗收，保持碰撞獨立，再定義共同材質與精細模型替換。未commit／push。

## 相同 GLB 的裝飾／阻擋對照（最新）

Phase: 6／7／8 局部驗證。Status: 獨立Mock對照完成，未修改原版碰撞。開始前讀主計畫／進度／TODO，確認opencode並保留全部既有變更。

Completed Tasks / Files Changed: 新增prepare-collision-demo.mjs，產生相同石頭模型的綠格裝飾／紅格阻擋場景；App支援匯入有限純文字預覽說明並在切換時清除；兩項Node、一項E2E、ADR0023／validation／TODO更新。

Tests Executed / Results: 45 Node、8 Python、Schema、typecheck、build／artifact／diff通過，完整Chromium12 passed（24.4秒）exit0。實際view_image確認角色可與綠格模型重疊、紅格仍阻擋。相同模型／縮放／材質，不同blocked；存讀後結果相同，縮放或移除視覺不改碰撞。CLI重跑內容相同、輸出Git忽略，無原版資料修改。Research Findings: 現有架構能獨立控制模型與通行，GLB collider不參與核心。Known Limitations / Unverified Assumptions: 整格碰撞，不支援沿模型邊緣繞行／攀爬；Mock不代表原版規則。Next Recommended Tasks: 繼續占位資產及替換契約，以本對照防止精細模型影響通行。未commit／push。

## GLB 石頭占位驗證（最新）

Phase: 7／8 局部。Status: 真正 GLB 產生／綁定／載入及基本尺寸驗證完成，未精細化。開始前讀計畫／進度／TODO、確認 opencode並保留既有變更。

Completed Tasks / Files Changed: placeholder-rock、LocalModel契約／exports、map-region model支援、renderer官方GLB載入及ready Promise、SceneView等待／清理、App匯入hash／預算驗證；--rock-model來源ID映射與獨立GLB輸出、三項Node／Mock與原版E2E；固定@babylonjs/loaders 8.32.0及lock，新增ADR0022／validation／TODO。只寫本機模型與衍生包，不呼叫生成服務。

Tests Executed / Results: 43 Node、8 Python、typecheck／Schema／build／artifact／diff通過。官方loader＋NullEngine確認24頂點、8面、單位包圍盒；完整Chromium11 passed（22.3秒）exit0。Mock畫布補石頭像素檢查後單獨1 passed（3.5秒）exit0；Mock與來源選區截圖view_image檢視完成。原版包來源雜湊前後不變、Git忽略；GLB1288bytes、可重現。安裝沿既有專案pnpm store，未改全域設定。

Research Findings: 規則幾何可與真正GLB共用現有位置／碰撞分層；穩定assetId不綁特定模型bytes。64地板、6欄杆／柱、1告示牌、1 GLB石頭，6類資源待製作。Known Limitations / Unverified Assumptions: Mock八面體而非原版模型，無精細貼圖／風格或多角度驗收；每實例載入、無快取／LOD。build增加loader／PBR模組，chunk提示保留，完整Phase8／原版規則未驗收。Next Recommended Tasks: 在占位階段確認共同尺寸與模型替換契約，再做一組風格一致資產；不直接批次精細生成。未commit／push。

## 告示牌多格群組（最新）

Phase: 3／7／8 局部。Status: 兩片來源圖像 → 單一原創 proxy 完成。開始前讀主計畫／進度／TODO、檢查 opencode 並保留全部既有變更。

Completed Tasks / Files Changed: 新增 assemble-visual-groups.mjs、兩項 Mock，scene1-upper-rules 新增群組規則，prepare-ground-preview 支援單一群組實例／雙來源引用／consumed 診斷，新增 grouped-sign E2E、ADR 0021／validation／TODO 更新。

Research Findings: 3240 在 (15,35)、3242 在 (15,33)，相對位置 (0,-2)；圖片畫面 x 接縫恰為 -341，垂直範圍重疊，支持一面告示牌而非兩物件（Inferred）。原創幾何不等於原版尺寸。Tests Executed / Results: 40 Node、8 Python、Schema／typecheck／build／artifact／diff 通過，Chromium 9 passed（19.4 秒）exit 0，實際截圖 view_image 檢視一面牌子。重跑同 hash 路徑；來源前後雜湊不變，輸出僅留 ignored assets/generated。64 地板、6 欄杆／柱、1 告示牌，剩餘 7 類診斷，碰撞資料不變。Known Limitations / Unverified Assumptions: 只支援明確兩片接合，沒有原版背面／厚度／文字／UV 或物理尺寸驗證。Next Recommended Tasks: 草叢／樹／石頭策略及可替換材質／UV，維持來源追蹤與碰撞獨立。未 commit／push。

## 上層分類與欄杆規則預覽（最新）

Phase: 3／7／8 局部。Status: 11 張圖片分類與兩種欄杆 proxy 完成。開始前讀計畫／進度／TODO、確認 opencode、保留既有變更。

Completed Tasks / Files Changed: 逐張 view_image 檢視上層 PNG；新增 scene1-upper-rules.json、分類研究／ADR 0020／validation，prepare-ground-preview 新增 --upper-rules、規則／圖片證據核對與 review 來源；新增 3 項 Node 及欄杆 E2E，區分兩種 preview bundle；更新 TODO／PROGRESS。

Tests Executed / Results: 38 Node、8 Python、Schema、typecheck、build／artifact、diff 通過，Chromium 8 passed（18.1 秒）exit 0；實際截圖 view_image 檢視欄杆呈現。重跑同 hash 路徑，來源前後雜湊不變，原版及衍生包只留 ignored 目錄。Research Findings: 上層為 3 草叢／高草、2 樹、2 欄杆／柱、2 石頭、2 告示牌片段；無可確認牆體。兩欄杆類生成 6 實例，64 地板不變、9 類待製作，分類等級 Inferred，幾何 original-authored。Known Limitations / Unverified Assumptions: 厚度／方向未原版驗證、相鄰柱可能重複；告示牌需分組，植被／石頭／UV 尚未製作。Next Recommended Tasks: 查證告示牌片段的多格群組與錨點，定義可追溯單一資產組裝。未 commit／push。

## 原版地面 ID → 原創規則地板（最新）

Phase: 3／7／8 局部。Status: 選區地面本機預覽完成，不是原版完整 3D 還原。開始前讀計畫／PROGRESS／TODO，確認 opencode，保留全部既有變更。

Completed Tasks / Files Changed: RLE manifest 新增不透明像素平均色；新增 prepare-ground-preview.mjs，21 個地面 ID → 64 個明確 1×0.12×1 地板，保留來源資源與逐格偏移／雜湊。新增兩項 Mock、optional 本機 E2E、ADR 0019／validation；App 提示未呈現資源及獨立碰撞，切回原版預覽清除區域幾何。更新 TODO／PROGRESS。

Tests Executed / Results: 35 Node、8 Python、typecheck／Schema／build／artifact 通過；完整 Chromium 7 passed（16.3 秒）exit 0，補完 metadata 的最新包另 1 passed（3.2 秒）exit 0。實際 view_image 檢視地面分區；重跑輸出同路徑，來源前後雜湊相同，衍生包 Git 忽略。Research Findings: 原版地面圖號可作明確規則幾何的查詢鍵，平均色僅是暫時呈現；11 上層 ID 保持診斷未畫成牆。Known Limitations / Unverified Assumptions: 沒有 UV／細節貼圖、未還原上層／事件／原版碰撞；尺寸為 original-authored，不能當原版。Next Recommended Tasks: 上層逐圖分類與尺寸覆核，再補可替換材質，保持碰撞分離。未 commit／push。

## 原創規則幾何 Mock 場景（最新）

Phase: 7／8 局部。Status: 多四方體契約及 Mock 呈現完成；非完整原版資產轉換。開始前已讀主計畫／進度／TODO、檢查 opencode 並保留既有變更。

Completed Tasks / Files Changed: 新增 visual-primitive.ts、3 項 Node、獨立 Mock workshop fixture 與 Chromium 案例；map-region 新增 geometry／baseY、renderer 套用尺寸／偏移／旋轉／材質，區域模式不把碰撞資料額外畫牆；App 匯入先驗證契約與部件預算，SceneView 共用型別、game-data exports、ADR 0018／validation／TODO 更新。

Tests Executed / Results: 33 Node、8 Python、typecheck、Schema、build／artifact、diff 通過。實際截圖可見薄地板、窄牆、三階樓梯，view_image 檢視完成；首次沙箱內單案例通過但 server 收尾停滯，以 Ctrl+C 結束，改用正常程序權限完整 Chromium 回歸 6 passed（15.2 秒）、exit 0，包含原版預覽／新幾何／既有操作存讀及觸控。既有 Babylon chunk 提示保留。Research Findings: 原創尺寸可直接決定 box 幾何，無須模型生成服務；新 geometry 不讀來源繪圖高度。Known Limitations / Unverified Assumptions: 純色材質，尚無貼圖／UV、樹木模型、階梯爬升及原版分類／尺寸驗收；舊 asset 無 geometry 時仍保留舊 Mock 高度邏輯，不視為原版。Next Recommended Tasks: 以原版地面分類映射先接入規則地板，未分類上層明確診斷，逐項覆核。未 commit／push。

## 場景專屬圖片解碼與區域合成（最新）

Phase: 3／8 局部。Status: 選區解碼及靜態預覽完成，3D 規則尚未實作。開始前讀取計畫／進度／TODO、檢查 opencode，保留全部既有變更。

Completed Tasks / Files Changed: 新增 decode-scene-region.py（stdlib RLE／PNG／合成）、3 項 Mock 測試、ADR 0017、validation/scene-region-rle，更新 TODO／PROGRESS。32 張圖片、86 次放置、318×249 區域及 manifest 僅留本機 assets/generated/scene1-rle。

Research Findings: 32 個選中資源全部通過嚴格逐列解碼，實際圖片可辨識草地、土路、樹木、告示牌、階梯與欄杆。因此 building layer 不是純牆體分類；規則幾何須依資源映射，不能一律擠出。Source: 固定 A commit，Community Implementation，非 Verified Original。

Tests Executed / Test Results: 8 Python、30 Node、typecheck／build／artifact 通過；34 份輸出重跑 SHA256 相同、四份來源前後 bytes 不變、輸出 Git 忽略、diff 檢查通過。既有 Babylon chunk 大小提示保留。實際 view_image 檢視靜態合成；無 runtime 變更，不重跑 E2E。Known Limitations / Unverified Assumptions: 未與 DOS 畫面逐像素對照、未確認完整容器尾端或其他場景／戰鬥格式、未推定 3D 厚度／背面。Next Recommended Tasks: 分類覆核表＋primitive／材質契約，以地面及規則結構先做 Mock 3D，保留碰撞分離。未 commit／push。

## 圖塊索引／規則幾何查證（最新）

Phase: 3／8 局部。Status: 靜態來源與候選標頭核對完成，像素解碼及 3D 尺寸未驗收。開始前讀主計畫／進度／TODO 並確認 opencode，保留全部既有未提交變更。

Completed Tasks / Files Changed: 新增唯讀 probe-tile-headers.py、1 項 Mock 測試、research/tile-resource-mapping、ADR 0016；更新管線文件／TODO／PROGRESS，修正「building 可能不是圖片索引」的過早判讀。

Research Findings: 固定 A commit 載圖介面圖號除 2；地面／建築共用介面，layer 4／5 用於畫面 y 位移。場景 1 專用 SDX001／SMP001 half-index 候選 32 個均有有效標頭範圍，11 building 包含 96×160、95×152 等；ground 為 36×18 或 36×22。不能把直接 MMAP 索引的 PNG 當已驗收來源，也不能將圖像尺寸／位移當 3D 實體尺寸。

Tests Executed / Results: 5 Python、30 Node、typecheck、build／artifact、diff 檢查通過；本機探測前後 bytes 相同，報告 Git 忽略。既有 Babylon chunk 大小提示保留。未改 Web runtime，未重跑 E2E。Known Limitations / Unverified Assumptions: 僅 Community Implementation 與 bytes 標頭證據，未完成 RLE／色盤／錨點重組、場景專用索引尾端用途或其他場景／戰鬥映射。Next Recommended Tasks: 以專用資源集完成嚴格像素解碼及小區域重組，建立 primitive／尺寸／材質原創映射，保持碰撞獨立；不宣告完整 Phase 3／8 完成。尚未 commit／push。

## 資產轉換管線批次測試（最新）

Phase: 8 局部。Status: 管線可處理原版 tile PNG，但部分小尺寸 tile 因 collider verify 失敗；未接入 Web 預覽。開始前已讀計畫／進度／待辦並檢查 Git。

Completed Tasks / Files Changed: 解碼 MMAP.GRP 資源為 36×18 PNG（32 個 tile）；提交 6 張 ground tile 批次；2 個 succeeded、2 個 failed、1 個 inferencing；更新 asset-pipeline-integration.md。

Tests Executed / Test Results: curl 提交與輪詢；Node 30/30、E2E 5/5 通過。

Research Findings: ground tile ID 可對應 MMAP.GRP 資源；building ID 解碼為 1×1，可能不是圖片索引。

Known Limitations / Unverified Assumptions: 小尺寸 tile 的 collider verify 可能失敗；原版圖片索引規則未完全確認。

Next Recommended Tasks: 調整 tile 輸入或使用 raw_glb；接入 Web 預覽；驗證座標與碰撞。

## 資產轉換管線接通（最新）

Phase: 8 局部。Status: 管線 API 已接通並完成一次 Mock PNG → GLB 作業；未接入原版圖片或 HD 資產。開始前已讀計畫／進度／待辦並檢查 Git。

Completed Tasks / Files Changed: 使用 shell 實測內網 API，取得 openapi.json 與 agent guide；提交 64×64 透明 PNG，輪詢至 succeeded；下載 manifest/quality/lod0；新增 docs/formats/asset-pipeline-integration.md；更新 TODO/PROGRESS。

Tests Executed / Test Results: curl 連線 exit 0；job status succeeded；artifacts 10 項；manifest gameplay_ready false（Mock 貼圖）。

Research Findings: 管線輸入為 PNG（需 alpha）或 GLB；輸出 Master/LOD0-2/Collider/Manifest/Metadata/Quality。公開建置仍只含 Mock。

Known Limitations / Unverified Assumptions: 原版圖片尚未取得；tile ID → 圖片索引未查證；HD 資產未接入 Web 預覽。

Next Recommended Tasks: 對應區域 ID 取得原版圖片，轉換為 GLB，接入 region preview；保持素材隔離。

## 候選引擎授權研究（最新）

Phase: 2 局部。Status: 研究整理完成，未結案。開始前已讀計畫／進度／待辦並檢查 Git。

Completed Tasks / Files Changed: 新增 docs/research/candidate-engine-licenses.md；整理 kys-cpp、Jynew、jinyong Go 三個候選來源的授權與限制。

Tests Executed / Test Results: 網路來源與授權頁面查證；未編譯或執行第三方程式；未複製程式碼。

Research Findings: kys-cpp 為 BSD 3-Clause 附加金庸題材牟利限制；Jynew 程式碼開源但素材嚴格限制；jinyong Go 未找到可確認儲存庫。

Known Limitations / Unverified Assumptions: 授權可能更新，採用前需重新確認；未完成逐檔與外部依賴審查。

Next Recommended Tasks: 對候選來源做逐檔授權審查；必要時建立採用 ADR。

## 版本與授權研究追查（最新）

Phase: 1／2 局部。Status: 追查更新完成，未結案。開始前已讀計畫／進度／待辦並檢查 Git。

Completed Tasks / Files Changed: 更新 docs/research/version-license-status.md；執行原版檔案 Big5/CP950 關鍵字掃描；執行 audit_source_notices.py；網路搜尋 FishEdit 0.72 來源。

Tests Executed / Test Results: 唯讀字串掃描、audit_source_notices 固定來源盤點；未編譯或執行第三方程式；未修改原始資料。

Research Findings: 原版檔案未找到明確版本宣告，僅 LEGENDX.EXE 含 1.02 片段；FishEdit 0.72 一手來源未找到；候選來源 39 檔中 7 檔含聲明關鍵字，未找到 LICENSE/COPYING/NOTICE。

Known Limitations / Unverified Assumptions: 原版版本仍為 Unknown；授權審查未完成；不構成法律結論。

Next Recommended Tasks: DOSBox 可見桌面取得版本證據；取得 FishEdit 一手來源；完成授權審查。

## 版本與授權研究（最新）

Phase: 1／2 局部。Status: 研究整理完成，未結案。開始前已讀計畫／進度／待辦並檢查 Git。

Completed Tasks / Files Changed: 新增 docs/research/version-license-status.md；執行 audit_source_notices.py；整理原版版本線索與候選來源授權狀態。

Tests Executed / Test Results: 唯讀字串掃描、inventory 既有結果、audit_source_notices 固定來源盤點；未編譯或執行第三方程式。

Research Findings: 原版執行檔 LEGENDX.EXE 含 1.02 片段但無明確版本宣告；候選來源 39 檔盤點中 7 檔含聲明關鍵字，未找到 LICENSE/COPYING/NOTICE 命名檔案；sfe-kdef 缺少核心原始碼。

Known Limitations / Unverified Assumptions: 原版版本、編碼、取得來源與檔案完整性未交叉驗證；授權審查未完成；不構成法律結論。

Next Recommended Tasks: DOSBox 可見桌面取得版本證據；取得 FishEdit 一手來源；完成逐檔與外部依賴授權審查。

## 候選包升級為預設預覽 + 15／50 研究（最新）

Phase: 3／5 局部。Status: 候選包已升級為預設；15／50、版本與授權研究整理完成，未結案。開始前已讀計畫／進度／待辦並檢查 Git。

Completed Tasks / Files Changed: prepare-mvp.mjs 預設選取包含槽 2/3/4 與事件 668/670，版本 0.2.0；mvp:check 通過（3 NPC）；新增 docs/research/opcode-15-50-status.md；更新 TODO/PROGRESS。

Tests Executed / Test Results: mvp:prepare 重跑一致；mvp:check 通過；Node 30/30、E2E 5/5、typecheck 通過。

Research Findings: Pascal 引擎缺少 opcode 13-15，opcode 50 為輸入名稱，與 FishEdit 文件的五物品條件不一致；DOS 原版語意仍待手動驗證。版本與授權未結案。

Known Limitations / Unverified Assumptions: 候選包升級不表示完整原版通行判定；15/50 仍 Unknown；DOSBox 自動輸入受限。

Next Recommended Tasks: 手動執行 opcode-15-50-cases.md；繼續版本與授權研究；擴充原版事件與圖像。

## 事件 670 可達性追查（最新）

Phase: 3／5 局部。Status: 唯讀追查完成，碰撞模型依社群來源修正；候選包通過，未宣稱 DOS 原版驗證。開始前已讀計畫／進度／待辦並檢查 Git。

Completed Tasks / Files Changed: prepare-mvp.mjs blocked 計算改用 jinyong-legend SceneCanPass 規則（建築 > 0、水地面、事件欄位 0 != 0 才阻擋）；候選包成功生成並通過 checkSliceNpcs；新增 ADR 0015；更新 TODO／PROGRESS。

Tests Executed / Test Results: prepare-mvp --candidate 通過；check-mvp-readiness --original 通過；候選 NPC 3 步數 24／27 可達，對話存讀續行通過。全量 Node 30 通過、typecheck 通過。

Research Findings: 空事件格（欄位 0 == 0）可通行，欄 17 建築牆仍阻擋，但上方／下方存在由空事件格組成的通道可繞到槽 3／4。水地面 ID 採 CC.SceneWater 十六進位範圍。

Known Limitations / Unverified Assumptions: 規則等級 Community Implementation，未經 DOS 驗證；仍不宣稱完整原版通行判定。預設預覽維持槽 2，候選需明確 --candidate。

Next Recommended Tasks: 視需要將候選包升級為預設預覽前，先補瀏覽器實測與來源證據；繼續 15／50 與版本／授權研究。

## 地圖資源 ID → Mock 3D 最小切片（最新）

Phase: 3／5／7／8 局部。Status: 最小切片完成，未宣告完整 Phase 3／6／8。開始前已讀計畫／進度／待辦、檢查 Git，建立 opencode 本地分支，保留既有變更。

Completed Tasks / Files Changed: 新增 packages/game-data/src/map-region.ts 與匯出；tools/extractor/extract-map-region.mjs；tests/fixtures/map-region-mock-assets.json 與 mock-map-region-preview.json；tests/unit/map-region.test.mjs；web SceneView/renderer/App 支援區域視覺預覽；docs/TODO 更新。

Tests Executed / Test Results: node --test tests/unit/*.test.mjs 30 通過；tsc -b 通過；schema check 通過；pnpm web build 通過；實際原版區域擷取產生 assets/generated/map-regions/scene1-region-13-28-8x8-*.local.json，mapping 覆蓋全部 32 個來源 tile ID。

Research Findings: 場景 1「河洛客棧」的 bytes 選定起點 (13,28)、8×8，包含 21 個 ground tile ID、11 個 building tile ID、building height 4 與 event slot 2；未發現 object layer 非零值。ID 映射明確標示 Mock，不宣稱對應原圖。

Known Limitations / Unverified Assumptions: 視覺高度與顏色為 Mock 推測；原版圖片索引編碼、完整 2D→3D 生成、事件 670 可達性、15／50、授權與完整 Phase 1／2 未解項仍保留。公開建置仍只含 Mock。

Next Recommended Tasks: 後續可接圖片擷取、模型生成／驗證／快取；繼續事件 670 可達性唯讀追查。

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


2388 通行格圖（Phase 8 局部）：用目前世界預覽 blocked 與圖錄錨點疊合 93 張局部圖，來源 SHA 一致。周圍其他阻擋最少的 4 例各只有 1 格指向此山；因此尚無證據確定共同底面或重疊歸屬。產生器 python tools/analyzer/prepare-2388-blocking-review.py 已成功執行。輸出僅在本機 ignored 目錄。

Phase 8 局部：本機 Vite dev／preview 從固定世界包預載原圖地圖，頁首顯示玩家原始 X／Y 格座標。Chromium 驗證 4173 自動載入、移動由 (358,229) 更新至 (359,230)。建置與公開產物檢查通過，公開商業資源 0。

Phase 8 局部：依使用者核定的多數底面邏輯，新增工具為全部 318 個 BUILDING ID 計算最常見錨點引用外框寬深，輸出 ignored 本機設定。7,832 次引用中2388為3×3共78次；3個ID眾數並列，1個ID無引用，列為待定。這是畫面模型基底尺寸推定，未產生或拉伸GLB。

Phase 8 局部：讀取更新後服務 Agent Guide／OpenAPI 0.3.0，確認ai_pointcloud流程、target_width_m／target_depth_m、語意計畫、有效點雲、尺寸驗證。2388以外選building ID2398，常見完整格型3×3為45/56；送LAN job e4803a47e46e450696a0d05e435ef438，succeeded。品質檢查通過，Master尺寸3.0×2.9956×3.1433、49,000三角形。詳細來源、hash、限制見docs/validation/building-model-2398.md。

Phase 8 局部：依完整遮罩格型眾數按寬深分組，新增可續跑 batch-buildings.py。ai_pointcloud 提交 297 個building工作（ID 2388之外全部可能有唯一完整格型者均包含），跳過21個無完整格型或並列項。第一次狀態輪詢為1 inferencing、296 queued_inference。成功時 poll 下載LOD0並記SHA；本機忽略資料夾有工作清單及瀏覽索引。所有原始圖片與GLB只留本機。

批次錯誤診斷：服務清單最近200筆目前為1 failed、130 waiting_resources、67 queued_inference、1 inferencing、1 cancelled；不是297筆全都失敗。已確認失敗為building ID 2270 / Job 74a0dd146bc5417aa27869f48281cdae，語意幾何執行器只支援rock formations及building envelopes。其他未執行工作仍可能按預測類別失敗。

更正批次限制判讀：資源類型範圍未由使用者限制。服務AI可分類，但semantic_geometry.py硬編碼僅接受rock formations及building envelopes，屬主機幾何執行器的能力限制。Job 74a0dd146bc5417aa27869f48281cdae / ID2270在pointcloud_edit階段因該guard失敗；非使用者範圍設定。

使用者要求取消所有batch building任務。逐筆GET 297個job並取消所有可取消的排隊／資源等待工作。最後總結：278 cancelled、19 failed、0 queued/running。最後正在推論的ID2784完成到semantic階段後失敗，亦非執行中。無成功GLB下載。

Phase 7 局部：整理地圖／室內遊玩區為單一寬畫面，行跡與行囊改為遊戲場景內浮層；對話框增加半身人物造型佔位，item schema加入相容舊內容包的選填description，行囊可選道具並顯示說明。當前為CSS造型佔位，未接入原版角色肖像；戰鬥配置未改。pnpm run typecheck與web build通過；未跑測試。

Phase 7／8 局部：本機測試啟動改為直接載入完整原版衍生世界包（480×480、958圖片ID、地表／surface／building投影），不再預設Mock或單場景對話切片。Chromium單次冷啟動至完整世界標籤563ms，座標X358/Y229，canvas 1、pageerror 0。這是完整地圖資源包效能，不是完整劇情／道具／戰鬥轉換；原版事件只在手動匯入已解析切片時可用，現包道具0。
