# 待辦

## 2026-11-11：DOSBox-X 互動、debugger、存檔採樣及完整 opcode 邏輯

- [x] 從 DOSBox-X 2026.10.01 到達原版標題畫面；確認 debugger 選單、暫存器、反組譯與檔案 I/O 記錄視窗可用。
- [x] 建立隔離 `session-002` 及存檔相關檔案 SHA-256 基線；session-001 保留為基準。
- [x] 建立 DOSBox-X loopback debugger 橋與可重現啟動器、協定單元測試；見 `docs/validation/dosbox-x-debugger-and-sampling.md` 及 ADR0036。
- [x] 建立 0–67 opcode 覆蓋表：候選參數字數、出現次數、FishEdit文件描述、社群 Pascal dispatcher 及本專案 Runtime 支援狀態；見 `docs/research/event-opcode-coverage.md`。
- [ ] 透過桌面正常啟動 session-002，逐一錄製並驗證上／下／左／右／Esc／Enter按鍵能控制遊戲。
- [ ] 完成 debugger loopback TCP handshake，實際執行 HELP／CPU／BPLIST 與 breakpoint，保存輸出。
- [ ] 在 session-002 透過原版 UI 建立並讀回一般存檔；記錄前後 hash 及槽位。
- [ ] 建立可重播事件前置存檔或可驗證路線，讀檔採樣事件前後狀態；人工編輯存檔一律標註 Synthetic State。
- [ ] 將全部 68 opcode 的參數、分支公式、狀態讀寫、失敗及來源證據逐項釐清。FishEdit結構／文件與社群 handler 不等於 Verified Original。
- [ ] 實作有來源證據的原版 opcode adapter 並比較 DOSBox-X 執行結果；未支援指令須停止該事件且不提交部分狀態。
- [ ] 將事件採樣接到旗標、物品、人物、位置、場景及隊伍狀態差異檢視。

阻礙：本輪桌面控制器拒絕視窗輸入（`GetCursorPos failed: Access denied`），本機 sandbox 亦以 `EACCES` 阻止 loopback mock TCP，因此上述 E2E 項目不得標為通過。先處理桌面啟動／存取路徑，再依序完成按鍵→debugger→合法存檔→事件採樣；不要先改猜測的存檔 offset。

測試備註：debugger protocol單元2/2、完整Node單元66/66及Python 14/14通過。執行 `node tools/validator/export-schemas.mjs` 同步新增的 item description 欄位後，原 shared-schema 測試通過。

## 2026-11-09：全量劇情／事件轉換與狀態驗證

- [x] 將全部 1,018 個 KDEF 事件及 2,977 個 TALK 資源轉成可追溯的本機中間資料，保留原始 bytes／offset／hash；不匯出商業資料至 Git。
- [x] 驗證所有事件結構、對話引用、目前互動欄位引用、候選分支邊界及 CP950 對話解碼；見 `docs/validation/full-original-event-corpus.md`。
- [x] 建立逐 opcode 覆蓋盤點表，記錄候選長度、頻率、可取得的 FishEdit描述、Pascal dispatcher與目前 Runtime 覆蓋；此表尚未補齊每條指令的參數語意／state effects，見 `docs/research/event-opcode-coverage.md`。
- [ ] 建立逐 opcode 完整語意與 state effect 對照表，為每項記錄來源、版本、信心及 DOS 原版驗證狀態。
- [ ] 先實作有證據的 opcode Runtime adapter；遇到未知或未實作指令時停止事件且不提交部分 state。
- [ ] 將事件前後旗標、物品、人物狀態、位置、場景及隊伍變更接入本機驗證檢視。
- [ ] 使用隔離 DOSBox-X 案例優先驗證 Opcode 15／50；未取得證據前不把其效果標記為 Verified Original。
- [ ] 驗證使用者提出的結局假設：Opcode 15 是否結束遊戲；opcode 7 與 `-1` 是否區分死亡／破關。現有來源僅把 7 作事件中止、`-1` 作每筆 KDEF 資料終止標記。
- [ ] 補查自動觸發、物品觸發及動態事件表寫入引用；本輪只核對目前互動欄位。

## 2388尺寸要求與管線缺口（最新）

- [x] 釐清最大完整4×3占位與原圖比例推導高度2.5402；本機外框校準僅為實驗。
- [x] 查證API沒有尺寸／體積約束，GLB輸入只做後處理，未提交新工作。
- [ ] 先補足管線尺寸／體積重建契約；不得把本機拉伸或GLB後處理稱為重新AI生成。
- [ ] 2388山體結構仍待重產／修整，本機斜薄片候選不當完成模型。


## 2026-11-04：只轉building，首個2388（使用者核定）

- [x] 轉換範圍限building；earth／surface保留原圖，最後另定處理。
- [x] building2388／圖片1194送既有服務成功，LOD0接回原世界；同ID93處放置共用模型，不依10種引用mask自動變形。
- [x] 來源與服務hash、原始圖層／package不變、局部顯示驗收，見ADR0035／validation/building-model-2388.md。
- [ ] 2388生成山體偏薄；先修整體積、朝向、底緣／背面，驗收後再擴大building批次。


## 2026-11-04：世界資產占格與組合盤點

- [x] 使用者確認人工操作正常；座標軸修正的局部使用回饋已收到。
- [x] 958獨立ID圖錄、460／180／318原始圖層篩選、7832非空錨點與精確mask／變體統計。
- [x] 740組多ID相鄰候選與原座標疊圖，全部mergeApproved=false；不自行合併。
- [x] 完整JSON與空白決策模板、本機圖錄驗收；見ADR0034及research/world-asset-structure.md。
- [ ] 逐ID核對植被／房舍／坡壁等外觀及是否突起，決定原創高度；原始圖層不直接當類別。
- [ ] 從樹形2016／完整院落2784／人工選定的多圖片段開始，依各實例mask製作占位，不能用bbox填滿稀疏占格。


## 2026-11-04：完整世界座標軸（目前優先）

- [x] 世界480×480及958圖片ID原圖投影、本機完整世界包與行走入口。
- [x] 修正原版Y誤映射+Z；世界統一(x,y)→(x,0,-y)，地面／圖片錨點／玩家／輸入／小地圖同基底，相機角度不變。
- [x] 起點附近X+／Y+與一個已知阻擋格局部驗證；見ADR0033及validation/world-axis-alignment.md。
- [x] 玩家回報人工操作正常；後續若有剩餘差異，先核對具體座標，不先改blocked。
- [ ] 船隻、場景入口、完整原版通行驗收後續再做；全圖連通檢查依使用者要求延後，不作目前畫面修正前置。


## 2026-11-04：地面資源逐ID獨立（現行政策）

- [x] 核對21張地面原圖，各自獨立material ID；64格逐項對照來源圖號、保留原圖已有交界。
- [x] 外觀註記不當地形／玩法屬性；surfaceType與gameplayProperty均Unknown，mergeWith=null。
- [x] 撤回平均色分類／共用草土流程，舊工具預設拒絕，新流程見ADR0032／validation/independent-ground-review.md。
- [x] 原圖投影核對包與21圖聯絡表、本機HTML／JSON完成；不是高清材質定稿。
- [ ] 以各ID原圖獨立製作高清候選，保留自身圖案／色塊／交界；不按顏色推定類別，不合併近似資源。
- [ ] 1182厚邊的真實3D結構仍未知，不由22px推定高度；新增邊界過渡前先比對相鄰原圖。


## 2026-11-04：共用地面材質（已撤回的實驗，地面政策以ADR0032為準）

- [x] 查證樹木原Job現在succeeded，預覽更新成功LOD0；舊失敗紀錄保留歷史。
- [x] 拆解GLB幾何／圖片bytes，確認LOD0變大主要為貼圖增量；見validation/shared-ground-material.md。
- [x] 原創草土共用base-color，64格連續UV與平滑色調，一個GLB／材質／貼圖，實景可匯入。
- [ ] 確認地面色調、近景重複感／接縫；之後路面、石板及欄杆材質。
- [ ] 貼圖壓縮、normal／roughness maps及LOD共用貼圖／快取效能預算。


## 2026-11-04：開始實際美術替換

- [x] 明確授權兩張原圖送既有LAN服務；樹木raw GLB、岩石LOD0接回場景1原版8×8配置，保留來源與Job／SHA，見ADR0030及validation/first-generated-art-sample.md。
- [x] 實際帶材質模型在Chromium呈現並截圖，4MB有界預算支援；其餘占位不標為完成美術。
- [ ] 驗收樹冠亮度、岩石綠色底座、共同地面與欄杆材質，統一樣本風格後再量產。
- [x] 樹木Blender verify三角形重載差異已由使用者修正；最新原Job succeeded、預覽改用成功LOD0，見ADR0031。


## 2026-11-04：先不開放鏡頭旋轉

- [x] 本機GLB依assetId替換全部實例、實際bounds預檢／尺寸與底部校正、還原匯入時模型；只改視覺，進度／碰撞／存檔不變。見ADR0029、validation/model-replacement.md。
- [ ] 先選一個精細資產的共同尺寸／原點／朝向／材質風格驗收樣本；2MB靜態GLB目前只作前置驗證，未測大型貼圖或最終美術一致性。
- [ ] 鏡頭旋轉依使用者要求暫不開放；保留已完成的相機／小地圖同步機制。

- [x] 行跡小地圖依要求順時針旋轉135度，背景／阻擋／角色／出口共用轉換並留邊；邏輯座標及碰撞不變。見ADR0027。
- [x] 修正旋轉後的水平鏡射差異；新增MiniMap與WebGL角色四方向實際像素位移比對，保留135度及邏輯座標。
- [x] 以實際相機alpha／beta驅動小地圖，取代固定角度／鏡射；鍵盤與觸控共用即時alpha，5方位×2俯角×8方向實際Babylon投影測試通過。見ADR0028、validation/camera-minimap-sync.md。
- [ ] 未來啟用旋轉操作後，補旋轉中手感、鏡頭限制及多角度美術驗收；目前同步機制已接好，UI仍固定鏡頭。

## 最新：圖塊來源查證與規則幾何

- [x] 第二來源8×8切片(20,22)：牆片／門側紅柱／欄杆占位與本機瀏覽器呈現；家具器物6類診斷保留，無屋頂推定，見ADR0025、validation/building-wall-preview.md。
- [x] 統一map-region與prepare-mvp的社群通行判定；門口slot15欄位0=0可通行，腳本仍未執行；新版來源建築包0.2.0。見ADR0026、validation/building-passage-cutaway.md。
- [x] 獨立Mock門洞、牆角、窗洞、桌子、屋頂顯隱；手動剖視只改顯示，隱藏牆仍阻擋，Node與畫布像素E2E通過。
- [ ] 手動剖視使用感受、自動遮擋／角色輪廓需求及多視角尺度覆核；原版門事件、屋頂語意仍未驗收。

- [x] 選區完整占位覆蓋：32個layer／ID → 64地板、6欄杆／柱、1告示牌、14 GLB（10草、2樹、2石）；未映射0，碰撞22格不變。見ADR0024、validation/full-placeholder-region.md。
- [ ] 完整占位選區的角色遮擋／尺寸／多視角評估，再進共同材質及精細替換；不能將zero unmapped當原版完成。

- [x] 獨立Mock石頭碰撞對照：同一GLB／尺寸，綠格可穿透／紅格整格阻擋；存讀及斜角驗證通過，見ADR0023、validation/model-collision-comparison.md。

- [x] 真正 GLB 占位模型路徑：可重現低模石頭、穩定 assetId／hash／transform、本機來源圖號綁定、官方 loader／ready／錯誤拒絕、Mock與原版選區呈現，見 ADR 0022、validation/local-glb-placeholder.md。
- [ ] 精細模型替換的共同尺寸／原點／材質風格驗收，GLB 快取／LOD 與正式資產管理仍待後續；目前僅占位技術驗證。

- [x] PrimitiveGeometry v1 多四方體尺寸／偏移／旋轉／純色材質契約；Mock 地板、窄牆、階梯本機匯入及瀏覽器呈現，碰撞獨立。見 ADR 0018、validation/primitive-workshop.md。
- [x] 原版選區 21 個地面 ID 映射到 64 塊明確原創地板，來源圖片平均色、來源雜湊核對、本機包／瀏覽器呈現完成。見 ADR 0019、validation/source-ground-preview.md。
- [x] 11 個上層 ID 逐圖分類覆核，兩個欄杆／立柱原創 proxy 產生 6 個實例，剩餘 9 類診斷；見 research/scene1-upper-classification.md、ADR 0020、validation/upper-rail-preview.md。
- [x] 告示牌兩片格位／錨點與接縫查證，明確兩格間距群組規則；只生成一面原創 proxy、保留兩份來源引用，剩餘 7 類診斷。見 ADR 0021、validation/grouped-sign-preview.md。
- [ ] 草叢／樹／石頭的資產策略、材質／UV／多視角驗收；群組目前僅支援有明確證據的兩片接合，不自動泛化。

- [x] 固定來源圖號除 2、圖片標頭／錨點及高度用途查證；場景 1 的 SDX001／SMP001 共 32 個 half-index 標頭候選核對。見 research/tile-resource-mapping.md。
- [x] 場景 1 選區 32 張專屬圖片嚴格 RLE 解碼、色盤／alpha／錨點及區域靜態合成，318×249 本機預覽已檢視；不是完整 DOS 畫面驗收。見 validation/scene-region-rle.md。
- [ ] 依實際圖片逐資源分類：building layer 含樹木／告示牌／欄杆／階梯，不可全當牆壁；建立 primitive／特殊模型規則。
- [ ] 定義地面／牆體 primitive、尺寸、方向、材質的原創映射；圖層高度是畫面位移證據，不是牆體厚度。維持邏輯碰撞獨立。

## 下一階段優先：地圖資源 ID → Mock 3D 最小切片

- [x] 保存 2026-11-03 狀態與下階段提示詞：docs/HANDOFF.md。
- [x] 依實際 bytes 選定場景 1 起點 (13,28) 的 8×8 區域；保留六層原值、ID、來源偏移、雜湊與解析器版本（assets/generated/map-regions，本機 only）。
- [x] 定義版本化資源映射（tests/fixtures/map-region-mock-assets.json）與 `extractMapRegion`／`assembleRegion`；未映射 ID 明確診斷，不靜默略過。
- [x] 遊戲內本機預覽：web app 新增「匯入本機地圖區域預覽」，以明確 Mock 幾何組裝 8×8 區域；視覺與碰撞分離。
- [x] Mock 測試 tests/unit/map-region.test.mjs（7 項）與全量 30 項 Node 測試、typecheck、build、web build 通過。
- [x] 資產轉換管線已接通：本機 FastAPI 服務可提交 PNG 並產出 GLB/manifest/quality；已用 Mock PNG 完成一次成功作業。
- [ ] 後續以原版圖片對應區域 ID，透過管線產生 HD GLB 並接入 Web 預覽；不提交商業素材。

## 最新：原版事件擴充

- [x] 加入入口可達性／逐 NPC 碰撞及對話存讀門檻；2 項 Mock 與既有原版切片通過。
- [x] 事件 670 可達性追查：空事件格（事件欄位 0 == 0）可通行，修正後 --candidate 通過 checkSliceNpcs，槽 3／4 與事件 670 納入候選包；預設預覽仍維持槽 2，候選需明確 --candidate。見 ADR 0015。

- [x] Phase 3／5：全量 1,018 事件支援目錄，264 純對話／23 空／731 拒絕，保留來源偏移／雜湊及目前互動欄位反向引用；見 validation/dialogue-event-catalogue.md、ADR 0012。
- [x] 2 項新增 Mock 測試與實際重跑一致性；21 Node／4 Python、typecheck／Schema／build／artifact 通過，報告只留本機。
- [x] 場景 1／事件 670／槽 3、4 已納入預設原版預覽；候選包升級為預設，包含 3 個 NPC 與事件 668/670，mvp:check 通過。
- [ ] 瀏覽器實測候選包已補（5/5 E2E），但完整玩家手感與手機驗證仍待持續。
- [ ] 研究被拒絕的 10 筆對話參數差異；取得證據前不放寬解析器。未知指令、原版可達性與 Phase 1／2 未解事項持續獨立追蹤。

- [x] 使用者選定 GitHub Pages；既有 checks workflow 擴充為核心／Schema／build／E2E／artifact，只有 develop 通過才發布。
- [x] 工作流程通過 actionlint；安裝 wrapper 支援 Linux --with-deps，所有研究／原版輸入不作 CI 需求。
- [x] 使用者已將倉庫改為 Public 並設定 Pages Source=GitHub Actions；GitHub connector 已確認 visibility=public 且可讀取倉庫。
- [x] 4fc68e4 已提交／推送，Ubuntu hosted runner 所有核心／Schema／build／E2E 通過並上傳成品。
- [x] 管理者已確認將 develop 加入 github-pages 允許清單。
- [x] SSH 推送 d4e8dca 觸發 run 41470850061，check／deploy 成功；正式 HTTPS 網址 HTTP 200，4 項 E2E 通過（16.2 秒）。

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


- [ ] 以 2388 通行格圖核對重複出現的底面與相鄰重疊，尺寸待證據支持。

- [x] 本機預覽自動載入原圖世界並顯示可與 2388 格圖比對的 X／Y。

- [ ] 審核三個眾數並列ID及一個無錨點引用的building，再批次生成模型底面設定。

- [x] 更新服務理解並以非2388山體2398試跑點雲AI流程，輸出GLB與品質證據。

- [ ] 續跑 building-batch.py poll，直到批次工作完成；核對成功GLB後產生可匯入世界包及更新瀏覽替換控制。

- [ ] 擴充主機 semantic_geometry.py 支援其餘 building 圖像類別，或為不支援類別設計明確 fallback，再續跑批次。

- [ ] 主機幾何執行器改為支援AI plan回傳的所有分類／部件形狀，不以building圖層或資產類型排除；再續跑失敗及待處理工作。

- [x] 依使用者要求取消building批次所有工作；記錄278取消、19失敗、沒有執行中任務。

- [ ] 將實際角色半身肖像資源接入對話框，並在後續加入故事／道具內容後進行本機可玩性驗收。

- [ ] 將完整原版事件、人物、道具與場景切換轉換至本機測試包後，再作完整遊戲內容載入與可玩性測量。
