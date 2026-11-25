# 進度 — 2026-11-25

## 2026-11-26：「使用物品」宿主命令契約（USE_ITEM）（最新）

Phase: Phase 6 宿主命令基礎契約；語意 Community Implementation（社群 Pascal `UseItem`）＋ opcode-4 DOS 觀察。Status: **USE_ITEM 契約實作完成，E2E 與 DOS 觀察一致（物品 160 正路出對話、物品 0 控制組無對話）**。Completed Tasks: 內容 schema v3 加入可選 `currentItem`（靜態決策引用，內容自宣告「目前物品」狀態位置；解析期 CURRENT_ITEM_DOMAIN／CURRENT_ITEM_REF 檢查）；受控事件 runtime 加入 `USE_ITEM` 動作（僅無游標時、set 寫入經 applyDecisionTransaction、DECISION_APPLIED notice、不消耗物品；USE_ITEM_BUSY／NO_CURRENT_ITEM／USE_ITEM_VALUE）；轉換器宣告 `currentItem: original.jy:current-item/original.jy:item/current`；`type` 欄映射升級為 Pascal case 標籤（story/equipment/secret-manual/medicine/hidden-weapon）；Web 預覽加入「使用物品」選單（寫入後保留狀態啟動事件）；轉換器寫檔清理舊 digest 產物；新增 E2E 腳本 verify_use_item_e2e.mjs。Files Changed: `packages/game-core/src/controlled-event-schema.ts`、`controlled-event.ts`、`tools/extractor/convert_original_events_generic.mjs`、`apps/web/src/original-events-preview.tsx`、`tests/unit/controlled-event.test.mjs`、`tests/unit/original-events-generic-converter.test.mjs`、`tools/analyzer/probe_item_use_event.mjs`（新）、`tools/analyzer/verify_use_item_e2e.mjs`（新）、`schemas/controlled-event-content.schema.json`、docs。Tests Executed: 單元 143/143；root＋web typecheck；schema:check；E2E（物品 160/0 × 事件 16）；fresh-state 全量驅動。Test Results: 全通過；內容包 digest `5dd732a9a7bebfa3`。Research Findings: `UnKnow7`（RANGER offset 88）＝「使用時直接調用事件」欄位（type 0 且 >0 時 CallEvent）；本地 RANGER 200 筆全為 -1 → 本版本無物品走直接事件路徑，useCommand 全空與 DOS 觀察一致；`Equip`/`PracticeMagic`/`EatOneItem`（type 1/2/3 子流程）與面向格第 3 層事件查找未建模。Known Limitations: 裝備/修煉/消耗子流程無宿主命令；面向格自動觸發未建模；CurItem 重置時機未驗（set 語意＝後者覆蓋）。Unverified Assumptions: 社群 Pascal UseItem 流程等同 DOS 原版；選單選中即寫 CurItem（Pascal 於 RETURN/SPACE/左鍵時寫入）。Next Recommended Tasks: 裝備/修煉宿主命令（需裝備領域）；ALLDEF.GRP 圖片來源追查；current-scene 寫入接入正式 Runtime（場景過渡）。見 [ADR 0066](decisions/0066-use-item-host-command.md)。

## 2026-11-25：通用物品定義合約與 RANGER 物品表轉接

Phase: Phase 3／6 內容合約；欄位語意 Community Implementation（8 筆抽樣），使用效果維持在事件腳本。Status: **物品定義合約（engine-owned）與 RANGER 物品表轉接器完成，內容包 200/200 物品、0 空記錄，fresh-state 全量驅動通過**。Completed Tasks: `controlled-event-content` schema v2→v3 加入可選 `items`（靜態識別必填 name/stackable；alias/description/imageRef/category/equipSlot/maxStack 可選；use 層 useDialogueRef/useConditions/useEffects/useCommand 可選，腳本與宣告式互斥）；新增獨立 `decision-effect-v1.json` 與解析期檢查 ITEM_NAMESPACE／ITEM_USE_CONFLICT／ITEM_STACK_CONFLICT／ITEM_DIALOGUE_REFERENCE／ITEM_EVENT_REFERENCE；`convert_original_events_generic.mjs` 解析 RANGER.GRP 物品表（offset 59076，190B×200，Thing_S 佈局）產出 `original.jy.events:item/{id}`（name/alias/description/category；use 欄位全空＝效果在場景事件；stackable 全量 Inferred true）；診斷加入 itemSource（SHA-256/offset/size/count/layoutSource）與 itemCount。Files Changed: `packages/game-core/src/decision-schema.ts`、`controlled-event-schema.ts`、`controlled-event.ts`、`tools/validator/export-schemas.mjs`、`schemas/decision-effect.schema.json`（新）、`schemas/controlled-event-content.schema.json`、`tools/extractor/convert_original_events_generic.mjs`、`tests/unit/item-definition.test.mjs`（新）、`tests/unit/original-events-generic-converter.test.mjs`、`tests/unit/controlled-event.test.mjs`、`tests/fixtures/mock-controlled-event.json`、docs。Tests Executed: 單元 142/142；root＋web typecheck；schema:check；verify_original_events_preview 全量 1,018。Test Results: 全通過；內容包 digest `2f28956a11da4cf6`（1,018 事件／0 阻擋／2,866 對話／200 物品）。Research Findings: 接線約定——inventory key `original.jy:item/{id}` 與 current-item 值的 `{id}` 即 DOS 物品 ID，host 以 `original.jy.events:item/{id}` 查定義；轉換器保證每個 inventory allowedKey 皆有定義（測試釘選）。Known Limitations: 200 筆僅抽樣 8 筆；category 映射 0-3 為 8 筆抽樣推論；stackable 全量預設 Inferred；圖片欄無來源（ALLDEF 待查）；「使用物品」宿主命令契約未建模。Unverified Assumptions: 未知5/6/7（offset 84-88）語意；武器是否可疊加。Next Recommended Tasks: 「使用物品」宿主命令契約（選單選中→寫 current-item→啟動場景事件）；ALLDEF.GRP 4,400×100 圖片來源追查；Web 預覽加入物品定義顯示；current-scene/current-item 寫入接入正式 Runtime。見 [ADR 0065](decisions/0065-item-definition-contract.md)。

## 2026-11-25：原版物品記錄欄位探測（RANGER 物品表）

Phase: Phase 3 資料讀取（物品定義）；欄位語意為 Community Implementation，已以本機 bytes 抽樣比對。Status: **RANGER.GRP 物品表（offset 59076，190 bytes × 200 筆）欄位佈局依社群 Lua（`references/jinyong-legend/script/jyconst.lua` 的 `CC.Thing_S`）解碼，8 筆抽樣（物品 0/57/78/110/138/144/160/174）名稱、說明、類型欄位全部與本地 bytes 吻合，含所有 DOS 觀察案例物品**。Completed Tasks: 確認 RANGER.GRP 表邊界（source-index：物品段 38,000 bytes＝190×200，非 200×190——記錄數 200、記錄大小 190，與 Lua `ThingSize=190` 一致）；依 `Thing_S` 解碼欄位：0 代號、2 名稱（20B）、22 名稱2（20B）、42 物品說明（30B）、72 練出武功、74 暗器動畫編號、76 使用人、78 裝備類型、80 顯示說明、82 類型、90-134 十二項属性增量、136-168 修煉前置、170-188 練出物品與所需數量；新增 `tools/analyzer/probe_item_records.mjs` 唯讀探測（RANGER.GRP SHA-256 `07b99e3c…` 釘選）。Files Changed: `tools/analyzer/probe_item_records.mjs`（新）、TODO、本檔。Tests Executed: 探測腳本對釘選 RANGER.GRP 唯讀抽樣。Test Results: 8/8 筆抽樣吻合——160＝唐詩選輯（opcode 4 DOS 觀察物品）、174＝銀兩（MONEY_ID）、110＝金蛇劍（equipType 0、atk+10，與 opcode 29/43 觀察的武器語意一致）、0＝康倍特（opcode 4 控制組物品）、144＝飛狐外傳、138＝羊羔坐臀（事件 676 物品）、57＝玄冥神掌（skill 16）、78＝辟邪劍譜（skill 60）。Research Findings: 物品記錄**沒有圖片欄位**（圖片應在別處，候選 ALLDEF.GRP 4,400×100 待查）；「使用後效果」不在物品記錄（由設計寫在 KDEF 事件腳本，事件包已涵蓋）；90-134 增量欄屬修煉系統，非使用效果。Known Limitations: 欄位語意依社群 Lua（Community Implementation），200 筆只抽樣 8 筆；未知5/6/7（offset 84-88）語意未驗；圖片來源未定位。Unverified Assumptions: Big5 編碼的中文解碼正確（8 筆皆通順）；`Thing_S` 佈局適用本釘選版本。Next Recommended Tasks: 定義通用物品定義合約（engine-owned schema：id/name/description/type/imageRef?）；建立 RANGER 物品表轉接器產出物品定義內容包；追查 ALLDEF.GRP 是否為物品圖片來源；把物品定義 ID 接入事件包 `original.jy:item/{id}` 與 `current-item`。

## 2026-11-25：14 個阻擋 opcode 依證據解鎖，全量 1,018 筆轉換

Phase: Phase 3／6 通用指令轉接；完整原版規則與自然可達性仍未驗收。Status: **最後 14 個未證 opcode（4／15／19／24／25／30／44／51／57／58／60／61／62／64）全部依社群 Pascal 來源與本機 DOS 觀察映射，內容包 1,018/1,018 筆轉換、0 阻擋、2,866 對話；全量事件皆可由 fresh-state 驅動至終止**。Completed Tasks: 依 `references/kys-jedisdl/kys_event.pas` 與 `docs/validation/` 的 DOS 觀察紀錄映射 14 個 opcode——branch：opcode 4（curItem，新建 `original.jy:current-item` 領域，事件 16 ID 160 對照有 DOS 證據）、60（slotPicAny，槽圖號欄 5/6/7 任一等於 pic，`-2` 走當前場景 keyFrom，事件 990 6068/6066 對照）、61（slot4664All，當前場景槽 11..24 欄 5 全為 4664，事件 1001 0/4664 對照）；end 步驟：opcode 15（死亡結局，109 筆事件中段停止迴圈）、62（結局）；狀態效果：opcode 44（slotPicAnimate，欄 5 動畫最終值=endpic，事件 676 7578/7622）、57（scene57Anim，槽 -1 欄 5-7=7688、槽 2/3/4 欄 5=7746/7804/7862，與事件 655 DOS 觀察吻合）；no-op＋診斷：19（玩家移動）、24（空函式）、25（鏡頭平移）、30（行走）、51（隨機 softstar 對話）、58（15 場隨機連戰）、64（隨機商店購買，DOS 觀察有未扣款異常）；`estimate_conversion_coverage.mjs` 的 SUPPORTED 擴為全 68 opcode；`buildEffect`／`buildCondition` 解構擴展至 a5；新增專責單元測試驗證各新映射的步驟結構。Files Changed: `tools/extractor/convert_original_events_generic.mjs`、`tools/analyzer/estimate_conversion_coverage.mjs`、`tools/analyzer/survey_blocked_opcodes.mjs`（新）、`tests/unit/original-events-generic-converter.test.mjs`、ADR 0064、TODO、本檔。Tests Executed: 全 Node 單元（新增 14-opcode 映射定向測試、更新全量與阻擋測試）、`tsc --noEmit`（root 與 web）、fresh-state 全事件驅動驗證。Test Results: 全 Node 136/136、root／web typecheck 通過、fresh-state 驅動 1,018/1,018 到達終止狀態；`estimate_conversion_coverage` 輸出 convertible 1018／blocked 0。Research Findings: opcode 15 恒為 `[83]` 且 109 筆在事件中段（需 `end` 步驟停止迴圈）；opcode 62 恒為最後指令；opcode 44 語料全是 6 參兩槽變體（FishEdit width 7）；51/57/58/64 無參；60 含 `-2` 場景變體；opcode 57 的 44e 最終值計算（beginpicN＋endpic1-beginpic1）與 DOS 觀察 7746/7804/7862 完全吻合。Known Limitations: opcode 4 的「CurItem＝持有物品」為推論（DOS 只驗證 ID 160 對照）；19/25/30/51/58/64 的宿主效果（移動／鏡頭／隨機對話／連戰／商店）未建模為決策狀態，僅 no-op＋診斷；62 的結局動畫狀態未建模；15 的 `83` 作用未驗。Unverified Assumptions: 各新映射的社群 Pascal 語意等同原版 DOS，未逐事件重播自然可達性；fresh-state 可執行不等於自然可達。Next Recommended Tasks: 逐欄 DOS 隔離驗收 4 的「使用物品」語意與 60 的比對欄位；為 19/25/30/58/64 建宿主命令（位置／戰鬥連戰／商店）的 Runtime 契約；場景切換寫入 `current-scene`、物品使用寫入 `current-item` 接入正式 Runtime。見 [ADR 0064](decisions/0064-generic-event-conversion-pipeline.md)。

## 2026-11-25：場景 `-2`（當前場景）動態 key 追蹤

Phase: Phase 3／6 通用指令轉接；完整原版規則與自然可達性仍未驗收。Status: **場景 `-2`（當前場景）寫入不再用固定 `current` 佔位 key，改由 `original.jy:current-scene` 領域以 `keyFrom` 動態解析到實際場景；732 筆轉換事件仍可全部由 fresh-state 驅動至終止**。Completed Tasks: 新建 `original.jy:current-scene` 決策領域（整數，唯一 key `original.jy:scene/current`）；opcode 3（slotWrite）、26（slotAdd）、27（slotSet567）的 `-2` 寫入與 opcode 55（slotField2）條件改用 `keyFrom` 組合 key（`literal 'original.jy:scene'`＋`read current-scene`＋`literal slot/{n}/field/{m}`）；`collectKeys` 分離 `-2` 的 slot/field 組合與明確場景 key；`scene-slots` 的 `allowedKeys` 改為「明確場景 key」＋「`-2` 組合 × 84 場景（RANGER 場景記錄數）」並去重（runtime 要求 allowedKeys 無重複）；移除不再使用的 `sceneName` 佔位函式；新增 `tools/analyzer/verify_scene_minus2_dynamic.mjs` 以 current-scene 預設 32／17 驅動含 `-2` 寫入的事件並確認寫入落點；新增單元測試驗證領域結構、`keyFrom` 效果目標與兩場景寫入落點。Files Changed: `tools/extractor/convert_original_events_generic.mjs`、`tests/unit/original-events-generic-converter.test.mjs`、`tools/analyzer/verify_scene_minus2_dynamic.mjs`、ADR 0064、TODO、本檔。Tests Executed: 全 Node 單元（新增 `-2` 動態場景定向測試）、`tsc --noEmit`（root）、fresh-state 全事件驅動驗證、`-2` 動態場景寫入驗證。Test Results: 全 Node 135/135、root typecheck 通過、fresh-state 驅動 732/732 到達終止狀態；current-scene 預設 32／17 時 `-2` 寫入全部落於對應場景 key（如 `original.jy:scene/32/slot/-2/field/2`），佔位 key 不再出現。Research Findings: 語料中 `-2` 寫入共 2,167 條（opcode 3 2,009、26 115、27 43）、660 筆事件；slot/field 組合跨 84 個場景（slot -2 至 104）；runtime `validateDecisionSchema` 要求 `allowedKeys` 無重複（Ajv schema 未檢查），故動態列舉與明確 key 合併時需去重。Known Limitations: 正式遊戲的場景切換寫入 `current-scene` 尚未接入（預覽／驗證由外部預設）；`-2` 的欄位規則未逐欄隔離。Unverified Assumptions: 場景編號範圍 0..83 依 RANGER 84 場景記錄；「`-2` 解析為當前場景」依社群 Pascal 來源，未逐事件 DOS 重播；fresh-state 可執行不等於自然可達。Next Recommended Tasks: 依證據逐一解鎖 14 個阻擋 opcode（4／15／19／24／25／30／44／51／57／58／60／61／62／64）；場景切換寫入 `current-scene` 接入正式 Runtime。見 [ADR 0064](decisions/0064-generic-event-conversion-pipeline.md)。

## 2026-11-25：技能／隨身物品／opcode 50 狀態領域

Phase: Phase 3／6 通用指令轉接；完整原版規則與自然可達性仍未驗收。Status: **opcode 33／35（技能）、41（隨身物品）、50（動態變體分支）已由 no-op 建成真實狀態效果與決策領域，標籤 Community Implementation；732 筆轉換事件仍可全部由 fresh-state 驅動至終止**。Completed Tasks: 依社群 Pascal 來源建立技能領域（`original.jy:skill`＋`original.jy:skill-level`，每角色 10 槽，key `skill/{role}/{slot}`）與隨身物品領域（`original.jy:carried-item`＋`original.jy:carried-item-amount`，每角色 4 格，key `carried/{role}/{slot}`）；opcode 33 學會技能以每槽交錯 plan case 重現單迴圈掃描（已持有則層級 `min(層級+1,10)`、空槽寫入層級 1）；opcode 35 寫技能槽（0..9 直接寫、超範圍找第一空槽否則回退槽 0）；opcode 41 隨身物品以雙組 plan case 重現雙迴圈（先加既有同物數量、再寫第一空格）；opcode 50 動態變體（`list[0]>128`）映射為「五件物品全在背包」分支，yes／no 目標由相對跳轉 `wordOffset+8+list[5/6]` 計算；`buildEffect` 重構為直接回傳 plan（cases＋otherwise），partyRemove 的 contains 守衛內聯。Files Changed: `tools/extractor/convert_original_events_generic.mjs`、`tests/unit/original-events-generic-converter.test.mjs`、`tools/analyzer/survey_skill_opcodes.mjs`、ADR 0064、TODO、本檔。Tests Executed: 全 Node 單元（新增技能／隨身 plan 結構與 opcode 50 相對跳轉落點定向測試）、`tsc --noEmit`（root 與 web）、fresh-state 全事件驅動驗證。Test Results: 全 Node 134/134、root／web typecheck 通過、fresh-state 驅動 732/732 到達終止狀態。Research Findings: opcode 33 與 35 共享同一組 `Magic`／`MagLevel` 陣列，但 33 單迴圈「空或同技能」掃描、35 先定槽後找空槽，plan case 順序須各自重現；opcode 35 層級可寫任意值（語料 900／100），上限 10 只屬 opcode 33 的增量路徑；opcode 50 唯一使用者事件 676 因 opcode 44 阻擋，動態變體映射由單元測試以相對跳轉落點驗證。Known Limitations: opcode 50e 參數解算器（`list[0]<=128`）仍為 no-op；技能層級領域範圍寬，上限 10 由 plan 強制而非領域範圍；286 筆阻擋事件不轉換。Unverified Assumptions: 社群 Pascal 技能／隨身語意等同原版 DOS；opcode 35 的 `MagLevel[10]` 越界 bug 以槽 0 近似；fresh-state 可執行不等於自然可達。Next Recommended Tasks: 場景 `-2` 改為追蹤當前場景的動態 key；依證據逐一解鎖 14 個阻擋 opcode（4／15／19／24／25／30／44／51／57／58／60／61／62／64）。見 [ADR 0064](decisions/0064-generic-event-conversion-pipeline.md)。

## 2026-11-25：原版事件包 Web 本機唯讀預覽

Phase: Phase 7 apps/web 局部切片＋Phase 3／6 內容預覽；完整原版規則與自然可達性仍未驗收。Status: **`original.jy.events` 內容包已可於 Web 宿主手動選檔載入並逐事件操作（對話、選項、分支、決策效果），戰鬥為模擬結果；732 筆轉換事件全部可由 fresh-state 驅動至終止狀態**。Completed Tasks: 新增 `apps/web/src/original-events-preview.tsx` 與 `original-events-preview.css`，以獨立受控事件 Runtime 執行內容包（不影響主遊戲工作狀態），支援事件篩選、逐步驟續行、選項、戰鬥／動畫／切換場景／選擇模擬結果、決策變更清單與 localStorage 存讀；App.tsx 加入「載入原版事件包（local）」側欄按鈕與檔案輸入，驗證 `schemaVersion 2`／`original.jy.events`／`original-derived` 後解析；轉換器做兩項 fresh-state 相容調整：物品領域 min 改對稱 `-1,000,000`（消耗效果不越界）、opcode 21 離隊改發 `contains` 守衛 plan（成員在隊才 `listRemove`，否則 no-op，Inferred）；新增 `tools/analyzer/verify_original_events_preview.mjs` 對全部 732 筆事件做 fresh-state 驅動驗證。Files Changed: `apps/web/src/original-events-preview.tsx`、`original-events-preview.css`、`App.tsx`、`tools/extractor/convert_original_events_generic.mjs`、`tools/analyzer/verify_original_events_preview.mjs`、ADR 0064、TODO、本檔。Tests Executed: 全 Node 單元、`tsc --noEmit`（root 與 web）、web build、fresh-state 全事件驅動驗證。Test Results: 全 Node 133/133、root／web typecheck 通過、web build 通過（846 modules）；fresh-state 驅動 732/732 到達終止狀態（對話續行、選單第一項、戰鬥模擬勝利、選擇第一候選）。Research Findings: 前輪 fresh-state 失敗定位為兩類——物品負 `add` 越下界（已改對稱範圍）與 opcode 21 `listRemove` 空隊 `DECISION_LIST_MISSING`（已加 `contains` 守衛）；戰鬥 RESOLVE 的 `RESULT_SCHEMA` 失敗是測試腳本多帶 `selectedId: undefined` 鍵，內容包本身有效。Known Limitations: 預覽以全零／空隊 fresh-state 執行，不是原版遊戲起始狀態；戰鬥無計算，僅模擬結果；286 筆阻擋事件不在內容包。Unverified Assumptions: `contains` 守衛下的離隊 no-op 行為等同原版（社群來源未定義移除不在隊者）；fresh-state 可執行不等於自然可達。Next Recommended Tasks: 逐功能補技能（33／35）、隨身物品（41）與 opcode 50 動態變體的狀態領域；場景 `-2` 改為追蹤當前場景的動態 key；依證據逐一解鎖 14 個阻擋 opcode。見 [ADR 0064](decisions/0064-generic-event-conversion-pipeline.md)。

## 2026-11-25：通用事件轉換管線與 Runtime 擴展

Phase: Phase 3／6 通用指令轉接與受控事件 Runtime；完整原版規則與自然可達性仍未驗收。Status: **732／1,018 筆僅含 54 個已證 opcode 的事件可轉為有效受控事件包；286 筆因 14 個未證 opcode 被阻擋並留診斷，不影響其他事件**。Completed Tasks: 為受控事件新增 `branch` 步驟（條件＋yes／no 目標）；為決策引擎新增 `keyFrom` 動態 key（literal／read 部件以 `/` 組合）、`patchList` 效果（逐 index 寫入並以 `maxItems` 約束補位）、`listSize` 條件（清單長度比較），並補專責單元測試；建立 `convert_original_events_generic.mjs`，以 54-opcode 證據映射表把 corpus 指令轉為 say／choice／branch／decide／invoke／end，分支目標由 word 偏移重映射到 step index，TALK token 轉為對話文字；opcode 3／26／27 寫事件槽欄位（`-2` 場景以 `current` 佔位，Inferred）、opcode 55 槽欄 2 檢查標 Verified Original、 opcode 31 以銀兩 ID 174 比較、opcode 42 有男角色檢查暫標 Unknown 並走 no 臂；技能陣列（33／35）與隨身物品（41）等未建領域的效果映射為 no-op decide 並記入診斷；產出 git-ignored 本機內容包與診斷 sidecar。Files Changed: `packages/game-core/src/decision.ts`、`decision-schema.ts`、`controlled-event.ts`、`controlled-event-schema.ts`、`schemas/decision-*.schema.json`、`schemas/controlled-event-content.schema.json`、`tools/validator/export-schemas.mjs`、`tools/extractor/convert_original_events_generic.mjs`、`tools/analyzer/analyze_opcode_shapes.mjs`、`estimate_conversion_coverage.mjs`、`inspect_opcode_instances.mjs`、`tests/unit/decision.test.mjs`、`controlled-event.test.mjs`、`original-events-generic-converter.test.mjs`、本檔。Tests Executed: 新增 `branch`／`keyFrom`／`patchList`／`listSize` 單元、轉換器內容包有效性／阻擋診斷／no-op 映射定向測試、全 Node 單元、`tsc --noEmit`。Test Results: 全 Node 133/133、typecheck 通過；轉換器本機輸出 732 轉換／286 阻擋／1,822 對話，opcode 標籤 Community Implementation 6,025、Inferred 1,198、Unknown 1、Verified Original 23。Research Findings: FishEdit 的 branch slot 與 Pascal dispatcher 的相對跳轉 `i:=i+instruct_X(...)+width` 一致，候選目標皆為指令起始；opcode 5／9／11 是 menu 選擇而非狀態條件，應映射為 `choice`；opcode 1 為對話（`dialogueRef`）。Known Limitations: 場景 `-2` 以固定 `current` key 近似（場景切換不追蹤）；銀兩與物品「持有」以數量≥1 近似成員判斷；技能／隨身物品／ opcode 50 動態變體未建狀態領域；286 筆阻擋事件不轉換。Unverified Assumptions: 各 branch opcode 的社群 Pascal 語意等同原版 DOS；未逐事件重播自然可達性。Next Recommended Tasks: 將產出的內容包接入 Web 宿主做本機唯讀預覽，逐功能補技能／隨身物品領域與 `-2` 場景追蹤，再對阻擋 opcode（4／15／19／24／25／30／44／51／57／58／60／61／62／64）依證據逐一解鎖。見 [ADR 0064](decisions/0064-generic-event-conversion-pipeline.md)。

## Mock 道具交換（Phase 6／7 局部）

受控事件面板新增交換商人。選擇同伴乙後取得材料，交換事件沿用前一事件的決策狀態，將扣料與發獎合併提交。模擬獎勵超限會保留材料、獎勵和選項續行點。完成後再次互動會顯示已兌換。

變更涵蓋受控事件內容、Web 面板、統一工作階段和瀏覽器測試。Chromium 驗證中途讀檔、回滾、成功、完成後讀檔和重複兌換。測試背包由 Mock 決策領域保存。新版內容雜湊與舊版不同，交換前請從新版測試建立檢查點。見 [決策紀錄](decisions/0063-mock-exchange.md)。

## 2026-11-20：場景 metadata、layer 與事件槽限定轉接（最新）

Phase: Phase 3／6 局部原版場景與狀態效果。Status: **場景 layer、84 筆場景 metadata、事件槽、兩個 prepared-role 案例及事件 676 背包正例已有來源鎖定切片；完整事件仍未驗收**。Completed Tasks: 建立 RANGER 84×52-byte 場景紀錄 overlay；接入事件 420 場景 75 開放條件與事件 821 四個已掃描場景條件；沿用 layer 容器接入事件 434 Synthetic State 單格替換；沿用事件槽容器接入事件 353 三槽欄 4 增量終值及事件 567 圖號欄 5–7 終值；接入事件 676 前九格背包正例；分離原始 RANGER 基線與事件 20／931 的 Synthetic State，接入 MP 清零與 HP 恢復；更新 opcode 總矩陣與 ADR／驗證／TODO。Files Changed: `original-scene-records.ts`、game-data export、場景／事件槽／prepared-role adapter、既有 inventory adapter、相關單元測試、ADR 0062、驗證紀錄、opcode 總矩陣、TODO、本檔，以及既有未提交修改。Tests Executed: Mock 場景紀錄 overlay、KDEF／RANGER／ALLSIN／ALLDEF 來源與指令鎖、精確欄位前後值、Synthetic State 污染拒絕、定向 Node、全 Node、typecheck、build、diff check。Test Results: 全 Node 126/126、typecheck、build 通過；diff check 見本輪最終檢查。Research Findings: 事件 821 四筆結果不是同值批次；事件 434 的來源格為 390，`990` 必須顯式準備；事件 20／931 採樣前值不同於 RANGER 基線；位置／朝向案例仍缺可安全命名的數值。Known Limitations: 事件 821 未掃描其餘 80 場景；事件 567 不重建動畫中間影格；事件 676 只有前九格視窗；這些案例不含同事件其他效果。Unverified Assumptions: 其他場景、欄位、背包槽、重複執行及自然可達性。Next Recommended Tasks: 位置／朝向等到軸與數值證據充分後再接入；商店、戰鬥、動畫、音訊與條件分支需要各自完整交易或受控命令，不以單張畫面猜規則。見 [ADR 0062](decisions/0062-evidence-scoped-state-adapters.md)。

## 2026-11-20：第二批依證據限制的狀態轉接（最新）

Phase: Phase 3／6 局部原版狀態轉接。Status: **七個事件的已驗人物、隊伍、局部背包及場景 layer 效果已可由來源鎖定 adapter 重現；不代表七個完整事件可執行**。Completed Tasks: 新增事件 289 角色五欄 adapter 與可序列化工作階段，涵蓋來源性別 2 及 Synthetic State 性別 0；新增事件 28 用毒、101 聲望、497 品德三個單欄角色案例；新增事件 950／932 精確六格隊伍轉換；新增事件 497 前五格背包觀察視窗；建立 ALLSIN 場景 layer 稀疏覆蓋容器並接入事件 274 單格寫入；修正 opcode 總矩陣，把已接入項目標為 scoped adapter 而非通用完成。Files Changed: 五個新 adapter、四份新 adapter 單元測試、事件 289 session、場景 layer 容器及測試、game-data export、`docs/research/event-opcode-coverage.md`、ADR 0062、驗證紀錄、TODO、本檔，以及前輪未提交的事件 581 檔案。Tests Executed: 各案例來源雜湊、事件範圍／指令位置、前後值、污染拒絕、事件 289 checkpoint、場景 layer Mock／本機來源定向測試；全 Node、typecheck、build、diff check。Test Results: 新增與事件 581 定向 17/17、全 Node 120/120、typecheck、build 通過；diff check 見本輪最終檢查。Research Findings: 本機原始角色前值與事件 28／101／289／497 DOS 採樣一致；相同通用狀態容器可承載不同事件案例，但證據範圍仍由事件來源鎖限制。Known Limitations: 多數事件另含未轉接的場景、物品、戰鬥或呈現效果；事件 497 背包只觀察前五格，不是完整背包快照。Unverified Assumptions: 其他參數、角色、隊伍排列、背包滿額及自然可達性。Next Recommended Tasks: 建立場景 metadata、位置／朝向及完整背包的來源鎖定容器，再依現有 DOS 前後值接入下一批；完整事件必須等所有到達路徑效果可原子提交。見 [ADR 0062](decisions/0062-evidence-scoped-state-adapters.md)。

## 2026-11-20：事件 581 完整已驗狀態交易（最新）

Phase: Phase 1／2 證據複核、Phase 3／6 限定工作階段。Status: **事件 581 單人樣本已將事件槽、角色 49 與隊伍一併原子提交；現有證據未支持的角色 byte、事件 536 後續場景效果仍停用**。Completed Tasks: 核對原始 RANGER 角色 49 基線與 DOS 前值完全一致；加入 HP／MP／攻擊／速度／內力屬性／武功 ID 八欄不可變 overlay；完成後隊伍改為 `[0,49,-1,-1,-1,-1]`；滿隊分支保持三個領域不變；拒絕額外角色 byte。另確認事件 536 word 160 的 52-word body 與事件 581 終止符前逐 byte 相同。Files Changed: 事件 581 adapter／session／route 及三份單元測試、`docs/validation/event-581-complete-state-adapter-20261120.md`、ADR 0061、TODO、本檔，以及本輪既有未提交的事件 581 文件。Tests Executed: 本機原始 RANGER 前值讀取、來源鎖定 adapter／route／session 定向測試、全 Node、typecheck、build、diff check。Test Results: 事件 581 定向 5/5、全 Node 108/108、typecheck、build 通過；第一次全 Node 與 typecheck/build 並行時兩個既有 CLI 失敗路徑測試受干擾，單獨 4/4 及其後完整重跑 108/108 通過。角色只容許 offset 34／36／80／82／84／86／88／128 改變，offset 42 污染會拒絕；滿隊角色與槽 overlay 皆空。Research Findings: 536 內嵌 581 body 是來源 byte identity，可共用辨識，但不是自然執行證據。Known Limitations: 未重播自然 533→534→536；536 body 後的場景 28 三筆寫入與轉場未驗，武功等級及 offset 42 差異來源未隔離。Unverified Assumptions: 其他隊伍排列、其他角色、重複取得能力時的上限／欄位選擇。Next Recommended Tasks: 現有事件 581 證據已無其他可安全寫入欄位；下一個轉接案例應另選有完整前後值且可界定交易終點的事件，不將 536 靜態相同 body 當作可達證據。見 [驗證紀錄](validation/event-581-complete-state-adapter-20261120.md)。

## 2026-11-20：事件 581 自然安裝鏈與實際隊伍前置（最新）

Phase: Phase 1／2 來源鏈複核、Phase 3／6 限定工作階段。Status: **事件 581 的自然資料鏈、場景槽位及兩組實測六格隊伍已鎖入局部工作階段；上游事件的完整效果尚未轉接**。Completed Tasks: 從釘選 KDEF／ALLDEF／ALLSIN／RANGER 追溯事件 581 無初始直接引用，確認擂鼓山場景 53 槽 0 的事件 533 經 `533→534→536→581` 動態安裝到槽 2；保存槽 0／2 的原始事件層陣列座標；局部工作階段由 partySize 改為六格角色陣列，支援單人完成及六人滿隊阻擋兩個 DOS 已觀察結果。Files Changed: `tools/extractor/trace-original-event-581-route.mjs`、`tools/extractor/original-event-581-adapter.mjs`、`tools/extractor/original-event-581-session.mjs`、三份事件 581 單元測試、`docs/decisions/0061-event-581-partial-session.md`、`docs/TODO.md`、本檔。Tests Executed: 自然鏈來源與場景測試、限定轉接及工作階段定向測試、全 Node 單元、typecheck、build、diff check。Test Results: 定向 7/7、全 Node 108/108、typecheck、build、diff check 通過；來源或場景 byte 變更會拒絕；單人 `[0,-1,-1,-1,-1,-1]` 提交槽位效果，滿隊 `[0,1,2,3,4,5]` 保持槽位並進入 blocked；未採樣的隊伍排列拒絕。Research Findings: 事件 581 是由上游事件動態安裝，不是 ALLDEF 初始事件；自然場景為擂鼓山。Known Limitations: 靜態鏈確認寫入關係，但未自然重播 533→534→536 全流程；這些事件的其他人物／場景效果尚未納入工作階段。Unverified Assumptions: 兩組已採樣隊伍以外的隊伍排列和事件鏈中間狀態。Next Recommended Tasks: 依既有 DOS 證據整理事件 536 後半的角色 49 與場景效果，逐領域接入同一原子工作階段；未驗效果保持停用。見 [ADR 0061](decisions/0061-event-581-partial-session.md)。

## 2026-11-20：事件 581 來源鎖定局部工作階段（最新）

Phase: Phase 3／6 限定原版事件工作階段；完整 Phase 3／6 未驗收。Status: **事件 581 的已驗八欄效果可在獨立工作階段原子執行、序列化與恢復；尚未接入自然路徑或完整遊戲存檔**。Completed Tasks: 新增只容許 ready／completed 的事件 581 局部狀態；記錄單人隊伍採樣前置，內容鎖包含三個來源雜湊、事件記錄、指令位置及參數；恢復時核對內容、前置、槽位與 overlay 範圍；重複執行、污染狀態或內容變更均在提交前拒絕。Files Changed: `tools/extractor/original-event-581-session.mjs`、`tests/unit/original-event-581-session.test.mjs`、`docs/decisions/0061-event-581-partial-session.md`、`docs/TODO.md`、本檔，以及前一項尚未提交的事件 581 限定轉接與證據文件。Tests Executed: 局部工作階段定向測試、全 Node 單元、typecheck、build、diff check。Test Results: 定向 6/6、全 Node 107/107、typecheck、build、diff check 通過；ready 與 completed 均可序列化／恢復；內容鎖、隊伍前置、槽位污染及重複執行拒絕，舊狀態保持不變。Research Findings: 已驗槽位效果能以來源鎖定、不可變提交的方式納入受控工作階段，不需要建立通用 opcode 3 handler。Known Limitations: `partySize: 1` 是已觀察前置標記，尚未連到正式隊伍狀態；事件 581 前段分支、自然位置、其他狀態領域與完整存檔未納入。Unverified Assumptions: 自然劇情路徑能以相同前置安全進入此限定效果。Next Recommended Tasks: 將原始事件 581 的前段分支與正式隊伍狀態做來源鎖定轉接，再接入統一原版工作階段；不要以本切片取代完整存檔。見 [ADR 0061](decisions/0061-event-581-partial-session.md)。

## 2026-11-20：事件 581 參數形狀的欄 2 隔離對照（最新）

Phase: Phase 1／2 原版行為證據、Phase 3 限定資料投影與轉接。Status: **這組確切 opcode 3 參數對事件槽欄 0–7 的效果均已在原版 DOS 解譯器隔離確認，且已有來源鎖定的限定轉接；尚未開放通用執行**。Completed Tasks: 沿用上一輪單一 opcode 3 合成腳本，把場景 32／槽 2 欄 2 前值改為 `789`；載入後唯讀確認同一活躍位址，處理場景名稱浮層後觸發事件，再讀回同一槽位；guest 回標題頁後還原 KDEF 與第三槽六檔。新增事件 581 限定轉接，綁定釘選來源、記錄、指令位置、參數、目標及前值，欄 0–7 以不可變 overlay 一次提交。Files Changed: `tools/extractor/original-event-581-adapter.mjs`、`tests/unit/original-event-581-adapter.test.mjs`、`docs/validation/opcode-3-shape581-isolated-20261119.md`、`docs/decisions/0060-isolated-opcode-3-shape581.md`、`docs/TODO.md`、本檔。Tests Executed: 基線雜湊、標題及讀檔頁逐位元畫格比對、單一 DOS 合成腳本、同位址前後記憶體差分、reset 後標題畫格比對、隔離檔案還原與獨立 SHA-256 核對；限定轉接定向測試、全 Node 單元、typecheck、build、diff check。Test Results: 槽 2 `[1,2,789,123,456,2718,2718,2718,0,30,21]→[0,0,-1,-1,-1,-1,-1,-1,0,30,21]`；欄 2 確認寫入 `-1`。KDEF 與第三槽六檔恢復基線；仍只有 PID 7508，未新增或關閉 DOSBox-X。轉接定向 4/4、全 Node 105/105、typecheck、build、diff check 通過；來源或前置變更會被拒絕且保留舊 overlay。Research Findings: 這組具體參數單獨寫入欄 0–7，欄 8–10 保留；相鄰 opcode 14／0／13 不需要參與。Known Limitations: 合成腳本不是原始事件 581 的自然路徑；其他 105 個同形事件的可達性及任意參數語意未驗證；限定轉接尚未接入原版事件工作階段。Unverified Assumptions: 原始分支前置能否由已驗證狀態安全映射到工作階段。Next Recommended Tasks: 將限定轉接接入來源鎖定且可重播的事件 581 工作階段，先驗證分支前置、存讀與失敗回滾；不推廣成通用 opcode 3。見 [ADR 0060](decisions/0060-isolated-opcode-3-shape581.md)。

## 2026-11-19：事件 581 參數形狀的單指令 DOS 對照（最新）

Phase: Phase 1／2 原版行為證據、Phase 3 限定資料投影。Status: **這組確切 opcode 3 參數的部分欄位效果已在原版 DOS 解譯器隔離確認；通用同形事件執行仍未開放**。Completed Tasks: 在唯一 DOSBox-X PID 7508 的隔離遊戲副本，以事件 464 合成單一 opcode 3 加結束指令，重用事件 581 的 13 參數；改場景 32／槽 2 欄 3／4 前值，觸發前後唯讀讀取同一活躍記憶體位址；guest 回標題頁後還原 KDEF 與第三槽六檔。Files Changed: `tools/analyzer/patch_isolated_opcode_probe.py`、`scripts/Get-DOSBoxX-CaptureMenu.ps1`、`scripts/Invoke-DOSBoxX-CaptureMenu.ps1`、`docs/decisions/0060-isolated-opcode-3-shape581.md`、`docs/decisions/0059-event-581-slot-segment-comparison.md`、`docs/validation/opcode-3-shape581-isolated-20261119.md`、`docs/validation/event-581-slot-comparison-20261119.md`、`docs/TODO.md`、本檔。Tests Executed: 單一 DOS 合成腳本、同位址前後記憶體差分、遊戲專用截圖、隔離檔案還原與雜湊檢查、定向 Node 單元、全 Node 單元、typecheck、build、diff check。Test Results: 槽 2 `[1,2,-1,123,456,2718,2718,2718,0,30,21]→[0,0,-1,-1,-1,-1,-1,-1,0,30,21]`；KDEF 和第三槽六檔已依備份 SHA-256 還原，DOSBox-X 未關閉；定向 2/2、全 Node 103/103、typecheck、build、diff check 通過。Research Findings: 這組具體參數可單獨造成欄 0／1、3／4、5–7 的已觀察變化，無須相鄰 opcode 14／0／13。Known Limitations: 欄 2 前後同為 `-1`；本輪使用合成腳本，未自然執行原始事件 581，也未檢查其他 105 筆同形事件。Unverified Assumptions: 任意參數值或其他事件上下文皆有相同寫入語意。Next Recommended Tasks: 若接入此確切形狀的原版轉接，先補欄 2 差異前置、來源／前置限制及原子提交驗收；其他形狀按代表案例逐功能核對。見 [ADR 0060](decisions/0060-isolated-opcode-3-shape581.md)。

## 2026-11-19：事件 581 新形狀的槽位段落比對（最新）

Phase: Phase 1／2 證據複核、Phase 3 限定資料投影。Status: **事件 581 的候選 opcode 3 參數可投影出既有 DOS 單人隊伍槽位後值；尚未隔離相鄰指令，不開放此形狀通用執行**。Completed Tasks: 從 106 個同形事件中選有原版前後紀錄的 581；鎖定 KDEF/IDX 與 ALLDEF 雜湊、事件記錄和 word 15 參數；將原始場景 32／槽 2 的欄 0–7 候選更新投影，單人終值吻合、滿隊原值不變。Files Changed: `tools/extractor/compare-original-event-581-slot.mjs`、`tests/unit/original-event-581-slot-comparison.test.mjs`、`docs/decisions/0059-event-581-slot-segment-comparison.md`、`docs/validation/event-581-slot-comparison-20261119.md`、`docs/TODO.md`、本檔。Tests Executed: 本機原始資料比對、來源改動拒絕定向測試、全 Node 單元、typecheck、build、diff check。Test Results: 定向 2/2、全 Node 103/103、typecheck、build、diff check 通過；本機 ignored 產物 `assets/generated/event-comparisons/event-581-slot-362825d234ab4fac.local.json`。Research Findings: word 15 的 13 參數位置與單人隊伍段落終態相符；滿隊對照維持原值。Known Limitations: opcode 14、0、13 相鄰，沒有指令間快照；未變 `-1` 欄不能區分寫入或保留。Unverified Assumptions: 欄 0／1 及圖像欄變動可單獨歸因 opcode 3，同形 105 個其他事件有相同語意。Next Recommended Tasks: 以改前值／指令邊界對照隔離一個關鍵欄位後再決定是否建立可執行轉接；勿逐事件重複 DOS 測試。見 [ADR 0059](decisions/0059-event-581-slot-segment-comparison.md)。

## 2026-11-19：全事件靜態覆蓋清單（最新）

Phase: Phase 3／6 局部資料檢查。Status: **1,018 筆事件完成自動靜態核對與逐事件分級；並未逐事件執行 DOS 或宣稱劇情可玩**。Completed Tasks: 以現有 0.3.0 語料和原始檔重新核對全檔／逐筆 bytes、候選指令參數與偏移、對話引用、候選跳轉邊界；從 ALLDEF 原始 bytes 重建 16,061 個初始互動引用；對每筆標示純對話預覽資格、已鎖定執行路徑與非對話指令，統計 opcode 3 參數形狀。Files Changed: `tools/analyzer/audit-event-conversion-coverage.mjs`、`tests/unit/event-conversion-coverage.test.mjs`、`docs/decisions/0058-static-event-coverage-gate.md`、`docs/validation/static-event-coverage-20261119.md`、`docs/TODO.md`、本檔。Tests Executed: 本機完整原始資料產生報告、定向單元、全 Node 單元、typecheck、build、diff check。Test Results: 1,018／1,018 候選切分與 TALK ID 引用相符；16,061／16,061 初始互動引用相符且 0 個無效引用；264 筆符合現有純對話預覽限制，1 筆有來源鎖定的限定執行路徑；全 Node 101/101、typecheck、build、diff check 通過。Research Findings: 15 筆對話參數不符合現行預覽器要求但 TALK ID 有效；opcode 3 出現在 587 事件，有 102 種粗略參數形狀。Known Limitations: FishEdit 長度與跳轉僅為候選結構；動態事件引用、自動觸發、全分支及 DOS 語意未由此驗證。Unverified Assumptions: 同參數形狀是否可共用狀態效果。Next Recommended Tasks: 依來源差分挑新 opcode 3 形狀做代表案例，再將已證規則納入原版轉接器；不要對每個事件做重複 DOS 測試。見 [ADR 0058](decisions/0058-static-event-coverage-gate.md)。

## 2026-11-19：事件 673 的場景 32 Web 採樣切片（最新）

Phase: Phase 3／6／7 局部原版事件 Web 接入。Status: **可在本機匯入來源鎖定的場景 32 包，從測試格與事件 673 互動，位置、對話、人物資質及事件槽可同份存讀；非完整原版遊戲**。Completed Tasks: 新增指定場景包產生器，核對 (31,25) 事件格與 (31,24) 通行測試入口；Web 專用轉接器拒絕缺附件或來源／內容不符，攔截占位事件；完成 12 段對話後同步顯示 `72→75` 與 `673→674`；提供完成前後本機存讀與上一份備份。Files Changed: `tools/extractor/prepare-event-673-web-preview.mjs`、`original-event-673-session.d.mts`、`apps/web/src/original-673-web.ts`、`App.tsx`、`tests/e2e/original-event-673-web.spec.ts`、`docs/decisions/0057-observed-event-673-web-slice.md`、`docs/TODO.md`、本檔。Tests Executed: 本機原始資料產生包、限定事件 Node 測試、全 Node 單元、根與 Web typecheck、Web build、Chromium 匯入／對話／中途存讀／完成結果／備份、缺附件拒絕與舊原版純對話預覽回歸、diff check。Test Results: 本機包 `assets/generated/mvp/original-event-673-384a19bec1c66810.local.json` 已產生且被 git 忽略；限定 Node 4/4、全 Node 98/98、Chromium 3/3、typecheck、Web build、diff check 通過。Research Findings: 場景 32 原版格位可定位事件 673，但測試入口不代表原版自然進場；原始資質 50 與 DOS 採樣前置 72 須分開。Known Limitations: 只驗已觀察事件 673 路徑；地圖占位美術、其他事件、原版存檔互通及完整規則未完成。Unverified Assumptions: 其他場景觸發、opcode 3／34 變體和自然可達性。Next Recommended Tasks: 用同樣逐功能證據擴充可達原版事件與正式原版遊戲狀態，不把本次限定存檔混同通用存檔。見 [ADR 0057](decisions/0057-observed-event-673-web-slice.md)。

## 2026-11-19：原版人物欄位與事件 673 同步覆蓋（最新）

Phase: Phase 3／6 局部人物狀態。Status: **原始角色資料和事件 673 的採樣前置已分離；限定事件提交時人物欄位與事件槽覆蓋層同步更新，尚未接入 Web 場景互動**。Completed Tasks: 新增 RANGER 角色區段來源雜湊、182-byte 紀錄與明確 int16 欄位覆蓋；確認原始角色 0 offset 120 為 50，DOS 採樣前置 72 另存覆蓋層；事件 673 完成時寫為 75，checkpoint 拒絕其他人物欄位或事件槽污染。轉換檔新增 RANGER 來源與角色欄位偏移。Files Changed: `packages/game-data/src/original-role-records.ts`、`index.ts`、`tools/extractor/compare-original-event-673.mjs`、`original-event-673-session.mjs`、`tests/unit/original-role-records.test.mjs`、`original-event-673-comparison.test.mjs`、`original-event-673-session.test.mjs`、`docs/decisions/0056-original-role-field-overlay.md`、`docs/TODO.md`、本檔。Tests Executed: Mock 與本機原版角色表、事件 673 來源鎖定、人物／槽位同步存讀、污染狀態拒絕、全 Node 單元、typecheck、build、diff check。Test Results: 定向 6/6、Node 98/98、typecheck、build、diff check 通過；本機比較產物 `assets/generated/event-comparisons/event-673-7f69aa01d8875b17.local.json`。Research Findings: 原始 RANGER 主角資質欄為 50，採樣中的 72 來自後續遊戲狀態；場景 32 槽 0 指向事件 673，但場景 32 沒有可用既有純對話轉換器直接載入的事件。Known Limitations: 這仍是限定採樣狀態，非正式人物規則、Web 遊玩或 DOS 存檔互通。Unverified Assumptions: 其他角色、其他欄位及資質上下限可沿用本次觀察。Next Recommended Tasks: 以明確標示的本機測試前置接入場景 32 互動，並將人物、事件槽、位置與對話續行納入同一可驗證的遊玩狀態；未確定原版流程先維持停用。見 [ADR 0056](decisions/0056-original-role-field-overlay.md)。

## 2026-11-19：事件 673 原版專用狀態提交（最新）

Phase: Phase 3／6 限定事件狀態整合。Status: **事件 673 已觀察的資質及事件槽效果可在同一個轉接操作提交、暫停存讀並失敗回滾；尚未接入 Web 原版遊玩**。Completed Tasks: 將前一階段的來源鎖定轉換內容綁到事件槽原始表；對話續行與原版槽覆蓋層同存一份限定 checkpoint；最後對話後同操作提交資質 `72→75` 與場景 32 槽 0 欄 2 `673→674`，限定覆蓋層只含該欄差分。Files Changed: `tools/extractor/original-event-673-session.mjs`、`tests/unit/original-event-673-session.test.mjs`、`docs/decisions/0055-event-673-original-adapter-session.md`、`docs/TODO.md`、本檔。Tests Executed: 暫停／完成後存讀、錯誤後段效果回滾、內容鎖不符、污染槽位拒絕、重複啟動拒絕、全 Node 單元、typecheck、build、diff check。Test Results: 限定切片 2/2、Node 96/96、typecheck、build、diff check 通過。Research Findings: 這兩項效果可由現有受控決策與原版槽覆蓋層組合提交，不需修改通用引擎的指令規格。Known Limitations: 資質是限定決策欄位，不是完整人物資料；checkpoint 非完整遊戲存檔，未接 Web。Unverified Assumptions: 其他 opcode 3／34 參數及其他事件可沿用此效果。Next Recommended Tasks: 將已驗證的原版人物／槽位狀態嵌入正式原版內容包與 Runtime，連接場景互動後再擴展劇情路徑。見 [ADR 0055](decisions/0055-event-673-original-adapter-session.md)。

## 2026-11-19：事件 673 限定轉換比對（最新）

Phase: Phase 3／6 局部原版事件比較。Status: **釘選來源的事件 673 對話及兩個觀察效果可在受控 Runtime 重播並吻合 DOS 前後值；尚未接入正式原版遊玩**。Completed Tasks: 驗證 KDEF／TALK／ALLDEF 五檔及事件記錄 SHA-256，將 12 段對話和限定的資質／事件 ID 更新轉為受控決策內容；暫停存讀後比對資質 `72→75` 與場景 32 槽 0 欄 2 `673→674`，並驗證原版事件槽覆蓋層的投影。產生含來源偏移與雜湊的本機比較檔。Files Changed: `tools/extractor/compare-original-event-673.mjs`、`tests/unit/original-event-673-comparison.test.mjs`、`docs/decisions/0054-event-673-scoped-conversion-comparison.md`、`docs/TODO.md`、本檔。Tests Executed: 本機來源轉換及前後狀態比對、來源改動及不同前置值拒絕、對話中途存讀、全 Node 單元、typecheck、build、diff check。Test Results: 限定比較 2/2、Node 94/94、typecheck、build、diff check 通過；產物在 ignored `assets/generated/event-comparisons/event-673-048d0307af5dbce9.local.json`。Research Findings: 原始事件 word 0–59 是 12 組對話＋`0`，word 60／74 對應原版紀錄中的事件槽與資質變動；對話來源無未知控制碼。Known Limitations: 事件槽與資質在此是比較用鏡像，尚未成為正式 Web 遊玩狀態；opcode 3 其他欄、opcode 34 邊界與 `0` 畫面效果仍未驗。Unverified Assumptions: 同形 opcode 在其他事件或不同前置值下有相同語意。Next Recommended Tasks: 以來源鎖定的原版專用狀態轉接器提交已核對欄位，對照存讀與失敗回滾，再擴大案例。見 [ADR 0054](decisions/0054-event-673-scoped-conversion-comparison.md)。

## 2026-11-19：原版純對話場景逐格預覽（最新）

Phase: Phase 3／7 局部原版資料預覽。Status: **可從本機原始資料產生指定場景的唯讀純對話預覽包；效果事件仍拒絕執行**。Completed Tasks: 將既有場景預覽的固定事件配對改為事件層格位→ALLDEF 槽欄 2→KDEF 腳本查找；掃描並只收入完整解析的純對話事件，保留排除原因、來源雜湊及欄位偏移；新增 `--scene <id>`，本機產生黑木崖場景 26 包。Files Changed: `tools/extractor/prepare-mvp.mjs`、`tests/e2e/original-dialogue-scene.spec.ts`、`docs/decisions/0053-original-dialogue-scene-preview.md`、`docs/TODO.md`、本檔。Tests Executed: 本機原始資料場景掃描、既有 MVP readiness、原版事件槽相關 Node 測試、黑木崖產生器的可達／互動／存讀檢查、Chromium 本機匯入與存讀 E2E、全 Node 單元、typecheck、build、diff check。Test Results: 84 場景中 39 個至少含一個純對話事件格；黑木崖 35 個互動格／6 支腳本／3 個對話資源；MVP readiness、Node 92/92、Chromium 1/1、typecheck、build、diff check 通過。Research Findings: 河洛客棧只有原已收錄的 3 個事件格通過現有解析；黑木崖提供較大的安全唯讀試玩範圍。Known Limitations: 事件語意仍是 Community Implementation 預覽；尚未執行效果 opcode、動態事件槽寫入、原版切圖及完整存檔。Unverified Assumptions: 欄 2 在其他場景是否都是互動觸發欄位，以及原版格位和人物的完整關係。Next Recommended Tasks: 對有來源差分的效果指令逐項建立受控轉接，先在一條完整事件路徑比較前後狀態，再擴大場景覆蓋。見 [ADR 0053](decisions/0053-original-dialogue-scene-preview.md)。

## 2026-11-19：統一 Mock 工作階段與 v4 存檔（最新）

Phase: Phase 6／7 局部工作階段整合。Status: **Mock 世界遊玩和受控事件共用玩家位置，可在等待點及事件完成後以 v4 存讀；完整原版存檔尚未完成**。Completed Tasks: 新增單一位置的工作階段、世界／受控模式切換、v4 Schema 與精確內容身分檢查；Web 受控事件切圖後回到同一個可操作的世界狀態，一般存檔可讀回 v4；提供明確 v1 匯入與獨立鍵備份，保留舊版資料。Files Changed: `packages/game-core/src/unified-session*.ts`、`index.ts`、`schemas/unified-session-save.schema.json`、`tools/validator/export-schemas.mjs`、`apps/web/src/App.tsx`、`ControlledDemo.tsx`、`mock-controlled.ts`、`storage.ts`、`tests/unit/unified-session.test.mjs`、`tests/e2e/controlled-demo.spec.ts`、`docs/decisions/0052-unified-mock-session-save.md`、`docs/TODO.md`、本檔。Tests Executed: Node 全單元、Schema check、typecheck、build、受控事件及舊 Web MVP Chromium E2E。Test Results: Node 92/92、Chromium 5/5、Schema check、typecheck、build 通過。Research Findings: 舊 Web v1 與受控 v3 各自存檔，切圖後原本返回舊位置；v4 可把目前 Mock 切圖和世界遊玩銜接。Known Limitations: 原版事件槽 overlay、正式戰鬥／角色規則、完整 MOD 相容性和規則集鎖定未納入 v4；原版和地圖預覽仍採 v1。Unverified Assumptions: 原版事件及戰鬥能直接採現行 Mock 續行語意。Next Recommended Tasks: 先為已驗證的原版事件槽和規則狀態定義可接入欄位與身分驗證，再以可重播案例逐項接入。見 [ADR 0052](decisions/0052-unified-mock-session-save.md)。

## 2026-11-19：受控事件 Web Mock 宿主與引用驗證（最新）

Phase: Phase 6／7 局部 Web 宿主接入；完整原版遊玩未驗收。Status: **Mock 受控事件可在單一遊戲顯示區操作、存讀及切換可通行的 Mock 地圖；正式戰鬥與原版事件未接入**。Completed Tasks: 新增宿主引用綁定，核對入口／目的地的現有地圖通行格及戰鬥、動畫、角色 Mock 目錄；內容／宿主／目錄身分共同綁定存檔。加入遊戲區 Mock 對話、模擬戰鬥、動畫、切圖、選人與獨立存讀；切圖後 3D 畫面及行跡對應新位置，離開恢復原本場景。補遊戲區存檔面板，更新舊 Web E2E 的現行面板定位。Files Changed: `packages/game-core/src/controlled-host.ts`、`index.ts`、`apps/web/src/ControlledDemo.tsx`、`controlled-demo.css`、`App.tsx`、`tests/fixtures/mock-controlled-*.json`、`tests/unit/controlled-host.test.mjs`、`tests/e2e/controlled-demo.spec.ts`、`web-mvp.spec.ts`、`docs/decisions/0051-controlled-mock-web-host.md`、`docs/TODO.md`、本檔。Tests Executed: Mock 引用拒絕、Node 全單元、Schema 核對、typecheck、build、受控事件及舊 Web MVP Chromium E2E、diff check。Test Results: 宿主引用測試 2/2、Node 全單元 87/87、Chromium E2E 5/5、Schema check、pnpm run typecheck、pnpm run build 與 diff check 通過。Research Findings: 舊 Web E2E 仍尋找已移入遊戲區的小地圖與行囊，以及現行 CSS 隱藏的側欄存檔，需按實際 UI 路徑驗收。Known Limitations: 戰鬥勝負由 Mock 按鈕輸入；動畫為 Mock 效果；資源與角色清單不是正式內容包，受控存檔與舊版遊玩狀態尚未合併。Unverified Assumptions: 原版戰鬥、切圖與選人能直接採這些請求／結果語意，仍需逐項原版證據。Next Recommended Tasks: 正式宿主資源及規則介面、統一完整存檔，再逐功能接入已驗原版事件。見 [ADR 0051](decisions/0051-controlled-mock-web-host.md)。

## 2026-11-19：受控命令／結果與可續行 Mock 事件（最新）

Phase: Phase 6／7 局部受控事件契約；原版完整遊玩未驗收。Status: **戰鬥、動畫、切圖、選人的受控請求可暫停、存讀及回覆；Web 宿主與原版規則未接入**。Completed Tasks: 新增獨立 v2 事件內容與 v3 存檔；外部結果以請求 ID／種類／內容允許值核對，只執行內容包宣告的決策及目的地；加入固定種子的加權分支，保存待處理請求與亂數狀態；v0.1 和上一版 v1／v2 切片保持獨立。Files Changed: `packages/game-core/src/controlled-event.ts`、`controlled-event-schema.ts`、`index.ts`、`apps/web/src/storage.ts`、`schemas/controlled-*.schema.json`、`tools/validator/export-schemas.mjs`、`tests/unit/controlled-event.test.mjs`、`docs/decisions/0050-controlled-command-continuation.md`、`docs/TODO.md`、本檔。Tests Executed: Mock 戰鬥／動畫／切圖／選人連續續行、存讀、過期及畸形結果拒絕、後段失敗回滾、固定種子重播、Schema 核對、Node 全單元、typecheck、build、diff check。Test Results: 受控事件 Mock 5/5、Node 全單元 85/85、Schema check、pnpm run typecheck、pnpm run build 與 diff check 通過。Research Findings: 外部結果須只選內容預先宣告的分支，實際狀態效果保留在通用決策引擎；暫停點是交易提交界線。Known Limitations: 尚無 Web 宿主、實際戰鬥計算、原版事件與完整 MOD／規則鎖定存檔；位置未驗地圖通行。Unverified Assumptions: 已研究原版 opcode 的外部流程均能映射到這四種或後續版本化命令，需逐項驗收。Next Recommended Tasks: 將請求接入 Web 宿主與內容引用驗證，再合併正式完整存檔及原版轉接器。見 [ADR 0050](decisions/0050-controlled-command-continuation.md)。

## 2026-11-16：通用決策事件 Mock 續行切片（最新）

Phase: Phase 6／7 局部事件 Runtime 與存讀契約；完整原版遊玩未驗收。Status: **Mock 事件可在對話／選項處暫停存讀，恢復後執行原子決策；尚未接入 Web 遊玩及原版內容**。Completed Tasks: 建立獨立 v1 JSON 事件內容、對話／選項／決策／結束步驟、受控命令與可序列化游標；內容身分以版本和 SHA-256 鎖定；v2 Mock 存檔使用獨立 Web key 並備份舊檔，保留 v0.1 存讀。Files Changed: `packages/game-core/src/decision-event.ts`、`decision-event-schema.ts`、`index.ts`、`apps/web/src/storage.ts`、`schemas/decision-event-*.schema.json`、`tools/validator/export-schemas.mjs`、`tests/unit/decision-event.test.mjs`、`docs/decisions/0049-decision-event-runtime-slice.md`、`docs/TODO.md`、本檔。Tests Executed: Mock 對話／選項存讀與複合決策、失敗回滾及內容不符拒絕、Node 全單元、Schema 匯出核對、型別檢查、Web 正式建置、git diff --check。Test Results: Mock 事件 3/3、Node 全單元 80/80、Schema check、pnpm run typecheck、Vite build 與 diff check 通過。Research Findings: 現有 v0.1 `Step`／`GameState`／Save 不能直接承載通用決策和完整原版續行，獨立切片可驗證新契約而保留舊版。Known Limitations: 尚未接入現有 Web 畫面、地圖可通行性、原版事件槽、戰鬥／切圖／動畫及完整存檔；這是 Mock save。Unverified Assumptions: 後續原版指令能逐項映射到決策效果或受控特殊命令，仍須證據驗收。Next Recommended Tasks: 定義受控命令結果和完整狀態契約，接入 Web 與原版轉接器後再做本機完整遊玩驗收。見 [ADR 0049](decisions/0049-decision-event-runtime-slice.md)。

## 2026-11-15：通用 JSON 決策契約與原子執行核心（最新）

Phase: Phase 6 通用腳本／規則契約局部實作，Phase 3 原版指令映射待接入。Status: **跨領域狀態決策的版本化 JSON 核心已建立；完整遊戲 Runtime／存檔與特殊流程尚未整合**。Completed Tasks: 依使用者要求把通用狀態決策先於原版 opcode 特例；新增領域宣告與數值／布林／字串／有序清單狀態、合法 key／合法成員值、跨領域不變量、複合條件、首條命中分支、指定／加減／清單成員增減／中途斷言；整筆交易在複本驗證後才回傳，並記錄前後變更。建立四份版本化 JSON Schema 與共用匯出檢查，更新 MASTER_PLAN 與 ADR0048。Files Changed: `packages/game-core/src/decision.ts`、`decision-schema.ts`、`index.ts`、`schemas/decision-*.schema.json`、`tools/validator/export-schemas.mjs`、`tests/unit/decision.test.mjs`、`MASTER_PLAN.md`、`docs/decisions/0048-universal-decision-contract.md`、`docs/TODO.md`、本檔。Tests Executed: Mock 複合條件與跨領域交易、後段失敗不提交、分支選擇、Schema 拒絕未宣告欄位及 key、跨領域不變量、執行預算、`export-schemas --check`、`pnpm run typecheck`、Node 全單元、`pnpm run build`、`git diff --check`。Test Results: 決策測試 5/5、Node 全單元 77/77、Schema check、typecheck、build 與 diff check 通過；包含道具、成員、屬性、旗標、事件綁定的 JSON 複合案例可執行。Research Findings: 原 v0.1 `Condition`／`Step` 範圍不足以承載全部原版狀態操作，先建立獨立決策子契約可避免在通用引擎硬編碼原版 ID。Known Limitations: 尚未接入現有 `GameState`／Web 互動／完整存檔；戰鬥、對話、動畫與等待外部結果需受控可續行命令；實際內容包的引用／跨領域規則尚未全驗。Unverified Assumptions: 所有原版 opcode 均能映射到現有決策操作或後續受控特殊命令，需逐條證據驗收。Next Recommended Tasks: 先定義完整狀態與特殊命令續行契約，再版本化整合內容／存檔／Runtime；逐功能轉接原版 opcode，未知指令拒絕該事件且不提交部分狀態。見 [ADR 0048](decisions/0048-universal-decision-contract.md)。

## 2026-11-15：原版互動事件查找與事件槽 checkpoint（最新）

Phase: Phase 3／6 局部內容轉接器與存檔基礎；Phase 6／7 完整原版遊玩未驗收。Status: **事件槽動態 ID 可由原版場景格子讀回，獨立 checkpoint 可存讀；完整遊戲存檔與 opcode 執行仍未接入**。Completed Tasks: 建立事件層格子→槽位→覆蓋後事件 ID 查找，欄 2／3／4 由呼叫端明確指定，停用／越界拒絕；本機原版場景 32 cell 1374、槽 2 前後讀為 `null`／`original.jy:event/862`。建立版本化事件槽 checkpoint，鎖定基底、規則集、MOD 精確版本／雜湊／順序／優先權、設定及八個來源檔 SHA-256；Web 儲存使用獨立 key 並保留備份。Files Changed: `packages/game-data/src/original-event-reference.ts`、`original-event-checkpoint.ts`、`original-event-slots.ts`、`index.ts`、`apps/web/src/storage.ts`、`tests/unit/original-event-reference.test.mjs`、`original-event-checkpoint.test.mjs`、`docs/decisions/0047-original-event-checkpoint-and-lookup.md`、`docs/validation/original-event-checkpoint-lookup-20261115.md`、`docs/TODO.md`、本檔。Tests Executed: 原版 ALLSIN／ALLDEF／RANGER 本機唯讀查找、相關 Node 測試、`pnpm run typecheck`、`pnpm run build`、`git diff --check`。Test Results: 實際 cell 1374 為預覽 x=30、y=21，欄 2 `-1→862` 查找正確；相關 Node 16/16、typecheck、build、diff check 通過；Mock 存讀在來源／MOD／設定不符、畸形覆蓋或儲存失敗時保留舊主檔。Research Findings: 事件層的 `-1` 表示無槽；事件欄 ID 修改後，必須由當前覆蓋狀態查找，不能依初始靜態引用。Known Limitations: checkpoint 只有事件槽，未保存玩家／背包／人物／戰鬥／續行；欄 2／3／4 的觸發語意未全面驗證，Web UI 尚未提供完整原版流程。Unverified Assumptions: 原版其他場景的格子觸發行為與目前場景 32 的查找慣例完全相同。Next Recommended Tasks: 建立可回滾 opcode 轉接器與完整原版遊戲狀態；由已核對的效果與路徑開始接入，再完成存檔版本化與端到端遊玩驗收。見[驗證紀錄](validation/original-event-checkpoint-lookup-20261115.md)。

## 2026-11-15：原版事件槽狀態容器（最新）

Phase: Phase 3／6 原版內容轉接器與可序列化狀態的最小基礎；完整 Phase 6／7 未驗收。Status: **原版事件槽可無損覆蓋與讀回；opcode 執行和現有 Web 存檔尚未接入**。Completed Tasks: 對照 1,018 事件 corpus 與初始 ALLDEF 引用，盤點 307 個初始唯一事件 ID、383 個 opcode 3 候選動態新 ID、兩者聯集 666；建立原版事件槽來源表＋稀疏可序列化覆蓋層，明確欄位更新採原子新狀態，原表及舊狀態不變；用本機原版 ALLDEF 場景 32／槽 2 重現欄 2／3／4 的既有差分。Files Changed: `packages/game-data/src/original-event-slots.ts`、`packages/game-data/src/index.ts`、`tests/unit/original-event-slots.test.mjs`、`docs/decisions/0046-original-event-slot-overlay.md`、`docs/validation/original-event-slot-overlay-20261115.md`、`docs/TODO.md`、本檔。Tests Executed: 相關 Node 單元測試、實際 ALLDEF 雜湊／偏移／前後欄位核對、`pnpm run typecheck`、`pnpm run build`、`git diff --check`。Test Results: 相關 Node 11/11 通過；本機 ALLDEF 440,000 bytes、SHA-256 `3633122f6a43f0b5dd390c2fa2516766d735a064ca955c8766b73232230a4480` 與 corpus 相符；byte 140848 的場景 32／槽 2 由 `[1,2,-1,-1,-1,2718,2718,2718,0,30,21]` 經覆蓋讀為 `[1,2,862,-1,-1,2718,2718,2718,0,30,21]`，原始讀值未改；typecheck、build、diff check 通過。Research Findings: 動態事件槽是完整劇情必備狀態；225／307 個初始唯一事件 ID 含目前未實作的效果或分支。Known Limitations: 模組只接受解析後的明確欄位寫入，未解釋 opcode sentinel；未納入通用 Runtime 的存檔、事件查找或 Web 遊玩。Unverified Assumptions: 其他 opcode 3 變體的欄位語意、全部事件自然可達性及各種場景觸發規則。Next Recommended Tasks: 設計原版專用、版本化且綁定來源／MOD 身分的存檔狀態，接上互動事件查找；依逐指令證據建立可回滾事件轉接器，從已核對的功能路徑接入。見[狀態容器驗證](validation/original-event-slot-overlay-20261115.md)。

## 2026-11-15：opcode 3 欄位差分與完整劇情轉換缺口（最新）

Phase: Phase 1／2 原版指令逐欄驗證、Phase 3 局部資料轉換；Phase 6／7 完整原版遊玩未完成。Status: **事件 464 的 opcode 3 欄 2／3／4 限定寫入已驗；全量 corpus 仍不可執行**。Completed Tasks: 沿用唯一 DOSBox-X PID 7508，確認原始事件 464 載入；隔離第三槽先將場景 32 槽 2 欄 3／4 改為 `123／456`，單次觸發後唯讀確認 `-1／-1` 且事件 ID `-1→862`；第二次改前值確認圖像欄 5／6 在同一路徑保留，欄 7 在事件前即被場景載入改寫；兩次 reset 後六檔均還原。全量核對 28 組 55→3，發現事件 303 的檢查槽 4 與更新槽 2 不同；轉換器 0.3.0 只在固定雙雜湊下加限定、分級、不可執行的事件更新註記。Files Changed: `tools/analyzer/prepare_synthetic_event_slot.py`、`tools/extractor/convert_original_event_corpus.py`、`tests/unit/test_original_event_conversion.py`、`docs/validation/opcode-3-after-55-event464-fields-20261115.md`、`docs/validation/full-original-event-corpus.md`、`docs/research/event-opcode-coverage.md`、`docs/decisions/0045-original-event-field-write-scope.md`、`docs/TODO.md`、本檔。Tests Executed: DOS 精確 HWND 兩次觸發及執行前後唯讀事件槽、`BPLIST`、六檔雜湊還原、Python 7 個單元測試、1,018 事件全量轉換、0.2.0／0.3.0 核心欄位相等比較、`pnpm run typecheck`、`pnpm run build`、`git diff --check`。Test Results: 槽 2 `[1,2,-1,123,456,2718,2718,2718,0,30,21]→[1,2,862,-1,-1,2718,2718,2718,0,30,21]`；28 筆 3 註記（事件 ID 寫入 4 筆原版執行已驗；欄 3／4 改前值 1 筆已驗）、1,018 事件、2,977 對話，舊產物核心欄位完全一致；Python 7/7、typecheck、build、diff check 通過，`BPLIST` 空，隔離六檔恢復原雜湊。Research Findings: 此處 opcode 3 的 `-1` 參數會寫入 `-1`；55 檢查槽不能自動當作 3 更新槽。Known Limitations: 其餘 24 組同形只有來源 bytes，其餘 `-2` 欄位規則未隔離，55 helper 副作用未單獨排除；現有 Web 只讀純對話事件，722／1,018 事件含效果或分支而未能完整執行。Unverified Assumptions: 其他場景／參數變體有相同欄位寫入規則；以單次記憶體差分推廣到其他原版存檔。Next Recommended Tasks: 建立原版專用、可回滾且可序列化的事件狀態轉接器，先把已證實的事件更新／物品差分接入，再逐路徑比對 DOS 原版；完整本機遊玩需補全戰鬥與所有事件可達路徑。見[差分證據](validation/opcode-3-after-55-event464-fields-20261115.md)。

## 2026-11-14：全量事件資料附限定 DOS 游標證據、`83` 可見輸出對照（最新）

Phase: Phase 1／2 原版指令驗證與 Phase 3 局部資料轉換。Status: **28 筆原版 opcode 55 游標註記已進入不可執行中間資料；opcode 15 參數意義仍未解**。Completed Tasks: 版本化轉換器只在 KDEF.GRP／KDEF.IDX 雙雜湊吻合時為 28 筆 55 附原版 DOS 游標目的地及證據分級；重跑 1,018 事件全量本機轉換並與舊產物逐欄比較；沿用 DOSBox-X PID 7508，以隔離 `15,82,7` 和先前 `15,83,7` 對照死亡頁畫格，測後還原 KDEF／第三槽。Files Changed: `tools/extractor/convert_original_event_corpus.py`、`tools/analyzer/patch_isolated_opcode_probe.py`、`tests/unit/test_original_event_conversion.py`、`docs/validation/full-original-event-corpus.md`、`docs/validation/opcode-15-83-binary-trace-20261114.md`、`docs/research/opcode-15-50-status.md`、`docs/decisions/0044-scoped-original-dos-cursor-annotations.md`、`docs/TODO.md`、本檔。Tests Executed: 6 個 Python 單元測試、全量轉換、0.1.0／0.2.0 產物去除新增欄後的結構相等檢查、兩張精確遊戲 PNG SHA-256 比較、`BPLIST`、隔離檔還原雜湊、Python 語法檢查、`git diff --check`、`pnpm run typecheck`、`pnpm run build`。Test Results: 28 筆註記均指向值 0 的 word；事件 464 四筆為 Verified Original，其餘 24 筆為同形 bytes 推論；舊資料其餘欄位完全一致。`82`／`83` 死亡頁 PNG SHA-256 同為 `58cbf643da11211a0282a83a2cd1bd012c614b23cafa44fe8fed1b8a4b597406`；暫時斷點空，KDEF／第三槽基線還原；Python 6/6、typecheck、build 與 diff check 均通過。Research Findings: FishEdit 的 55 候選跳轉可與實測 DOS 游標並列但必須分級；`83` 不影響本案例可見死亡頁。Known Limitations: 中間資料仍 `executable:false`；55 其他事件與 handler 副作用、15 的隱藏狀態與後續 `7` 仍未驗。Unverified Assumptions: 24 筆未重播的同形 55 在所有前置狀態採同一動態路徑；`82`／`83` 沒有非畫面效果。Next Recommended Tasks: 為原版內容轉接器實作受控事件修改命令前，核對 55 後續 opcode 3 的欄位契約；必要時針對 opcode 15 的參數資料流做限定 trace。見[全量資料](validation/full-original-event-corpus.md)及[15 對照](validation/opcode-15-83-binary-trace-20261114.md)。

## 2026-11-14：opcode 15 的 `83` 參數原版二進位驗證

Phase: Phase 1／2 原版事件解譯驗證。Status: **DOS handler 讀取 `83` 已驗；參數具體作用及 `7` 執行仍未驗**。Completed Tasks: 沿用單一 DOSBox-X PID 7508，定位原版跳轉表的 opcode 15 表項；以 manifest 隔離最短 `15,83,7` 腳本確認 handler 入口實際命中、客體 bytes 與死亡／讀檔頁；清斷點並還原 KDEF／第三槽。Files Changed: `tools/analyzer/patch_isolated_opcode_probe.py`、`docs/validation/opcode-15-83-binary-trace-20261114.md`、`docs/validation/opcode-15-dos-observation.md`、`docs/research/opcode-15-50-status.md`、`docs/research/event-opcode-coverage.md`、`docs/decisions/0043-opcode-15-original-parameter-evidence.md`、`docs/TODO.md`、本檔。Tests Executed: handler 表項客體 dump、精確 HWND 鍵序與 `BP 0160:001E15CF`、事件腳本 bytes、返回路徑斷點、異常時單格遊戲畫面、`BPLIST`、隔離檔 SHA-256 還原、Python 語法檢查、`git diff --check`。Test Results: `CS:EIP=0160:001E15CF`、腳本 bytes `15,83,7`；handler 讀下一 word 並 push 給處理函式；畫面進入死亡／讀檔頁，未命中返回游標停點；斷點清空，KDEF／第三槽基線還原，PID 未關閉。Research Findings: 本 DOS 版本會讀取 `83`，不能採社群版「只前進一字」結論；返回路徑靜態為索引加 2。Known Limitations: `83` 對文字／狀態的精確作用與後續 `7` 是否執行仍未知。Unverified Assumptions: 所有 114 次出現皆到同一死亡路徑。Next Recommended Tasks: 在必要時針對 `83` 作用及 `7` 執行做限定 trace；已確認 opcode 不重測。見[限定 trace](validation/opcode-15-83-binary-trace-20261114.md)。

## 2026-11-14：原版事件 464 的四次 opcode 55 trace

Phase: Phase 1／2 原版事件解譯驗證。Status: **原始事件 464 的四次 `55` 游標效果已驗；其他事件仍需按功能範圍驗收**。Completed Tasks: 沿用 DOSBox-X PID 7508，以隔離第三槽指向未改動的原始事件 464；在正向觸發後單點追蹤四次 opcode 55 入口與 helper 回傳；唯讀核對槽 2～5 最終事件 ID；掃描基線 KDEF 中全部 28 次 55 的五字形狀；清斷點並依 manifest 還原第三槽。Files Changed: `docs/validation/opcode-55-original-event464-trace-20261114.md`、`docs/validation/opcode-55-unresolved-dos-observation.md`、`docs/decisions/0042-opcode-55-trace-evidence-boundary.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: 單一精確 HWND 鍵盤重播、原版 KDEF 客體 bytes、四組 handler 入口／返回 `EV`、活躍事件槽唯讀掃描、28 次原始 bytes 靜態掃描、`BPLIST`、SHA-256 還原、`git diff --check`。Test Results: 四次入口索引 28／47／66／85，helper 均返回 `-1`，dispatcher 後續索引 32／51／70／89，槽 2～5 最終 862／863／864／865；28 次 `55` 全為 `55,目標槽,-1,14,0`，下一 word 全為 `3`；暫時斷點清空、KDEF／第三槽基線還原，同一 PID 留在標題。Research Findings: 原始事件 464 的 `55` 不是先前推測的 14／0 相等選支證據；此 DOS handler 在本案例把比較 word 重複送作兩個返回候選。Known Limitations: 其餘 24 次只有靜態同形證據，未逐次 DOS 重播；非 `-1` 值與 helper 副作用未驗。Unverified Assumptions: 原版其他事件在不同前置狀態下必走相同動態路徑。Next Recommended Tasks: 依實測游標規則審核轉換器的原版 55 映射，僅針對差異補限定案例；已確認 opcode 不重測。見[原始事件 trace](validation/opcode-55-original-event464-trace-20261114.md)。

## 2026-11-14：opcode 55 正向觸發與單點 DOS trace

Phase: Phase 1／2 原版事件解譯驗證。Status: **合成案例入口及游標運算已驗，原始事件的完整語意仍未驗收**。Completed Tasks: 沿用單一 DOSBox-X PID 7508；將隔離第三槽與 KDEF 恢復成先前成功的入口配置，重現 `Up → Left → Enter` 取得 ID 57 ×1；在下一次相同鍵序命中 opcode 55 handler，讀取腳本、堆疊、helper 回傳與 dispatcher 游標；清除暫時斷點並依 manifest 還原隔離資料。Files Changed: `docs/validation/opcode-55-verified-entry-trace-20261114.md`、`docs/validation/opcode-55-trigger-preflight-20261114.md`、`docs/validation/opcode-55-binary-trace-20261114.md`、`docs/validation/opcode-55-dos-branch-probe-20261114.md`、`docs/decisions/0042-opcode-55-trace-evidence-boundary.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: 精確 HWND 鍵盤重播、執行中背包及事件槽唯讀掃描、單點 breakpoint `0160:001E1ADF`／`001E1AF6`／`001E1516`／`001E151C`、客體腳本／堆疊／機器碼 dump、`BPLIST`、隔離檔 SHA-256 還原、`git diff --check`。Test Results: 事件 1017 正向觸發後 ID 57 ×1；入口 `CS:EIP=0160:001E1ADF`；helper 四參數 `[2,-1,-1,-1]` 回傳 `-1`，dispatcher `EBX 0→5` 並在後續 `add ebx,eax` 得索引 4；`BPLIST` 空，KDEF／第三槽基線雜湊還原，PID 未關閉。Research Findings: 先前未命中的主要前提是合成配置未可靠觸發；本案獲得道具不能解釋為已驗證的相等／不相等分支，因兩個回傳候選相同。Known Limitations: 原始事件 464 的實參與下一游標未 trace；合成案例不能代表全部 28 次原始 `-1` 出現。Unverified Assumptions: 原始事件 464 與本案使用相同四個實參模式及其他比較值的分支含義。Next Recommended Tasks: 在原始事件 464 的一次已確認觸發中，單點讀取 opcode 55 實參、helper 回傳與游標；已確認的其他 opcode 不重測。見[完整 trace](validation/opcode-55-verified-entry-trace-20261114.md)。

## 2026-11-14：opcode 55 觸發前置校準

Phase: Phase 1／2 原版事件解譯驗證。Status: **觸發前置未穩定，opcode 55 完整語意未驗收**。Completed Tasks: 沿用 DOSBox-X PID 7508，對最短合成 55 腳本重新核對場景 32 事件層／槽位、穩定事件 ID、客體緩衝區與道具；以受控移動前後 32 MiB 快照尋找視野變動欄；試驗候選面向值與既有直接室內存檔路徑；修正「整筆事件槽搜尋失配＝腳本執行」的判讀，並依 manifest 還原隔離資料。Files Changed: `docs/validation/opcode-55-trigger-preflight-20261114.md`、`docs/validation/opcode-55-binary-trace-20261114.md`、`docs/decisions/0042-opcode-55-trace-evidence-boundary.md`、`docs/TODO.md`、`docs/research/event-opcode-coverage.md`、`tools/analyzer/prepare_synthetic_event_slot.py`、本檔。Tests Executed: 單一精確遊戲視窗輸入與異常畫格、5-word／11-word 事件槽唯讀掃描、活躍背包 ID 57、客體記憶體腳本 bytes 搜尋、移動前後快照、候選面向 2 與直接室內存檔、斷點清空、SHA-256 還原、`git diff --check`。Test Results: 槽 0 前五 word 的 1017 仍存在，而動畫圖號變化令 11-word 搜尋失配；本輪合成腳本未見 ID 57 或腳本 bytes，因此未證明其觸發；直接室內存檔載入世界地圖；KDEF／第三槽回到基線，PID 7508 保留。Research Findings: 事件槽搜尋需避開動態圖號，否則不能把失配歸因於 opcode；`--spawn-near-event` 的檔案位置尚未經活躍玩家格驗證。Known Limitations: 玩家實際格位／面向、觸發鍵序及 opcode 55 分支仍未確定。Unverified Assumptions: 候選 MFace offset 12 在原版控制朝向；客體候選跳轉表是正在執行的事件解譯器。Next Recommended Tasks: 先建立事件觸發正向證據與可重現的玩家位置，再做單點 opcode 55 trace；已驗收的其他 opcode 不重測。

## 2026-11-14：opcode 55 客體記憶體限定追查

Phase: Phase 1／2 原版二進位執行證據。Status: **候選處理段已定位，實際入口與完整語意仍未確認**。Completed Tasks: 沿用唯一 DOSBox-X PID 7508，於標題、場景 32 載入前及原始事件 464 後取得 32 MiB 客體記憶體快照；定位事件 464 的載入副本、候選 opcode 跳轉表及比較函式；在同一程序回標題、讀隔離第三槽、嘗試單一 opcode 55 入口斷點；移除斷點並還原六檔隔離存檔。Files Changed: `docs/validation/opcode-55-binary-trace-20261114.md`、`docs/decisions/0042-opcode-55-trace-evidence-boundary.md`、`docs/validation/opcode-55-dos-branch-probe-20261114.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: debugger `BREAK`／`MEMDUMPBIN`／`RUN` 三個時點、記憶體 bytes 比對、`BP`／`EV`／`BPLIST`／`BPDEL`、事件槽唯讀前後核對、隔離檔 SHA-256 還原、`git diff --check`。Test Results: 事件 464 的 210 bytes 於事件後快照出現在 `0x0028EE90`，在標題和入場前未找到；候選表項 55 指向 `0x001E1ADF`，其靜態呼叫指向 `0x001E50D9`；原始事件 464 執行完成，但單一斷點未觀察到命中；斷點清空，R3／D3 等六檔回到 manifest 基線，PID 7508 保持開啟。Research Findings: 可以把合成腳本輸出與候選機器碼位置分別保存為證據；目前沒有足夠資料把兩者串成同一條已證實的分支路徑。Known Limitations: 候選入口未命中，實際 dispatcher 未找到，`-1` 比較與偏移的精確語意未解。Unverified Assumptions: `0x001E1ADF` 是事件 464 實際經過的入口；先前「選到相等／不相等跳轉」是推論，已降級標註。Next Recommended Tasks: 從已載入腳本游標定位真正執行的 dispatcher，再以單點 trace 記錄 CS:EIP 與參數；已確認的其餘 opcode 無需重跑。

補記：第二次準備 debugger 模式時未取得事件前置狀態；隨後精確視窗標題已成 `COMMAND`，單一擷取顯示 `C:\>` DOS 提示符。輸入守門拒絕後未再送鍵；第二份隔離第三槽依 manifest 還原。其後在已確認提示符輸入 config 中的 `z.com`，同一 PID 回到可見遊戲標題。第三次從已確認的事件 464 前值執行 `BREAK`／單點斷點／`RUN`／觸發；候選 `0160:001E1ADF` 未命中，但主迴圈控制斷點 `0160:001D543C` 確實命中，證明此 debugger 能停機。控制斷點已清、客體已恢復執行，第三份隔離存檔亦還原。下一步須改找**實際**事件 dispatcher，不再以「斷點模式無效」解釋未命中。見[限定追查](validation/opcode-55-binary-trace-20261114.md)。

最短腳本補測：再次用 manifest 隔離事件 1017，`55,2,-1,3,0,2,57,1,7`；只檢查候選入口，沒有重測道具。已確認前置事件槽與 `BREAK`／`BP`／`RUN`，腳本觸發後仍未停在 `0160:001E1ADF`。這與原始事件 464 的未命中一致；主迴圈控制組已證實斷點功能。KDEF 與六檔第三槽均還原，PID 7508 保留。候選表項與實際執行路徑仍需釐清。

## 2026-11-14：四個剩餘 opcode 的限定對照

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；68 個 opcode 中 65 個有局部 DOS 行為紀錄、3 個另註，完整語意仍未驗收。Completed Tasks: 原版事件 935 錄到暗場與逐幀亮屏，支持 13 所在段；在同一 DOSBox-X PID 7508 的隔離 KDEF 副本執行 opcode 55 相等／不相等跳轉對照、opcode 0／65 一字續行對照，以及 opcode 0 有／無組的穩定畫面對照；依 manifest 還原所有隔離存檔與 KDEF。Files Changed: `docs/validation/opcode-13-dos-video-20261114.md`、`docs/validation/opcode-55-dos-branch-probe-20261114.md`、`docs/validation/opcode-0-65-dos-continuation-20261114.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、`docs/decisions/0041-isolated-opcode-control-probes.md`、`tools/analyzer/patch_isolated_opcode_probe.py`、本檔。Tests Executed: 原版道具觸發與 DOS 原生 AVI 逐幀解碼、唯讀事件槽／活躍背包、四組 opcode 55 合成分支、0／65 續行、0 有／無組 PNG 解壓像素對照、Python 語法檢查、隔離檔 SHA-256 還原、`git diff --check`。Test Results: 事件 935 亮度約 65→0→66；55 比較值與槽值同為 581 時略過給道具，值不同時執行給道具，`-1` 對 `-1` 未走相等；0 與 65 後接給道具均成功；0 有／無組穩定像素完全相同；KDEF 原始雜湊 `135c5e09…600e06`、R3／D3 基線均還原，PID 7508 保持開啟。Research Findings: 原版解譯器有 55 的一般正數比較分支、0／65 的一字續行；13 段呈現逐幀亮屏。Known Limitations: 55 的 `-1` 特例、0 的前景重畫、65 的其他副作用、13 與相鄰 0 的精確執行邊界未解。Unverified Assumptions: 合成腳本的測試路徑代表其他原始事件參數。Next Recommended Tasks: 若完整語意是後續轉換的必要條件，對這些特例做限定指令 trace；目前已確認功能可依局部證據分段實作，不把此階段記為完整原版驗收。

邊界補測：原始語料 28 次 opcode 55 的比較值全部是 `-1`。合成腳本中 `0` 對 `0` 與 `-1` 對 `-1` 都產生取得道具的輸出；先前以「走不相等分支」解釋，經上方追查已降為推論。`-2` 存檔被事件 ID 範圍檢查拒絕，未執行；已還原該版合成 KDEF。最後的 `0` 案測後再次還原 KDEF 和六檔隔離存檔，PID 7508 未變。

## 2026-11-14：事件 935 的亮屏影格（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；62 個 opcode 有局部 DOS 觀察、3 個仍 Unknown、3 個另註。Completed Tasks: 同一 DOSBox-X PID 7508 讀取隔離事件 935、選原版物品 ID 189，錄到對話後完整暗場與逐幀亮屏，唯讀確認事件槽關閉；同程序回標題並還原隔離第三槽。Files Changed: `docs/validation/opcode-13-dos-video-20261114.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: 遊戲專用原生 AVI、ZMBV 解碼 1887 幀、亮度序列、同址唯讀事件槽、六檔 SHA-256 還原。Test Results: 亮度 65→0→66，黑畫面後逐幀亮起；事件槽 935→-1；PID/HWND 未變。Research Findings: 原始 `0,14,3,0,13` 段支持 opcode 13 的局部亮屏語意。Known Limitations: `13` 緊鄰 `0`，沒有指令級 trace；其他事件路徑未驗。Unverified Assumptions: 每幀與各指令的精確 CPU 邊界。Next Recommended Tasks: 針對 0／55／65 做有分辨力的資料或指令 trace，不重驗已確認 opcode。

## 2026-11-13：opcode 0 獨立事件限定測試（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；本輪只測 opcode 0，仍為 Unknown；總計維持 61 個局部 DOS 觀察、4 個 Unknown、3 個另註。Completed Tasks: 沿用 DOSBox-X PID 7508 將獨立原始事件 0 載入隔離第三槽，確認執行中場景槽並錄製 Left、Enter 後的原生 AVI；同程序回標題後還原第三槽六檔。Files Changed: `docs/validation/opcode-0-standalone-bounded-20261113.md`、`docs/TODO.md`、本檔。Tests Executed: 原版讀檔、唯讀事件槽、遊戲專用畫格、ZMBV AVI 逐幀解碼、六檔 SHA-256 還原。Test Results: 事件槽唯一記錄為事件 0；AVI 共 449 幀，畫面差異可由角色移動和既有動畫解釋；六檔雜湊還原成功，PID/HWND 未變。Research Findings: 原始事件 0 僅含 `0` 與終止字，但沒有可持久觀察的執行標記。Known Limitations: 本輪未證明 `0` 已進入 dispatcher 或造成獨立重畫。Unverified Assumptions: 社群 `instruct_0` 描述及原版觸發後精確重畫時點。Next Recommended Tasks: 對 opcode 0 做限定 trace 或前景覆蓋層控制對照；其餘 13／55／65 待後續階段。

## 2026-11-13：事件 101 戰後聲望與同程序續行（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；61 個 opcode 有局部 DOS 觀察、4 個仍 Unknown、3 個另註。Completed Tasks: 沿用同一 DOSBox-X PID 7508 而未關閉或另開程序，讀取隔離事件 101、完成原版戰鬥 14，唯讀觀察勝利後角色聲望 0→3，對應候選 `56(3)`；更正先前程序查詢因權限不足造成的「已關閉」誤判；在同一程序內回標題並還原第三槽；移除啟動腳本錯誤處理中的自動關閉程序。Files Changed: `docs/validation/opcode-56-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、`docs/validation/opcode-58-dos-observation.md`、`docs/decisions/0040-dosbox-state-reload-reliability.md`、`scripts/Start-DOSBoxX-IsolatedEvent.ps1`、本檔。Tests Executed: 精確視窗遊戲專用畫格、原版戰鬥攻擊與勝利、同址唯讀角色記憶體、程序與視窗識別、隔離存檔六檔雜湊還原、PowerShell 語法檢查。Test Results: `z_1194` 顯示「戰鬥勝利」；聲望 word 59 在勝利頁為 0，續行第 5 步為 3；PID 7508／HWND `0x38085A` 始終沿用；六檔還原雜湊與 manifest 基線一致；啟動腳本無 `Stop-Process`。Research Findings: 事件 101 的勝利路徑支持 opcode 56 為聲望增加；事件 49 的敵人資訊頁未解不構成反例。Known Limitations: 沒有指令級 trace，其他參數未驗。Unverified Assumptions: 合成入場之外的自然可達性。Next Recommended Tasks: 繼續 0／13／55／65 的分離驗證。

## 2026-11-13：事件 676 雙槽動畫與同程序切換（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；60 個 opcode 有局部 DOS 觀察、5 個仍 Unknown、3 個另註。Completed Tasks: 更正首次事件 676 未觸發的錯判；在同一 PID 7508 從標題讀取隔離第三槽，確認五件物品已被消耗後錄製 opcode 44 動畫；實測「戰敗回標題／虛擬機重置回標題 → 更換第三槽 → 原版讀檔」可沿用同一 DOSBox-X 程序；加入研究用 ZMBV AVI 解碼工具。Files Changed: `docs/validation/opcode-44-dos-observation.md`、`docs/validation/opcode-13-44-65-bounded-20261113.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、`docs/decisions/0040-dosbox-state-reload-reliability.md`、`tools/analyzer/inspect_zmbv_avi.py`、`scripts/Send-DOSBoxX-Key.ps1`、本檔。Tests Executed: 原版事件 676 材料條件與對話、同址雙槽唯讀記憶體、DOSBox-X 原生 AVI、ZMBV 逐幀解碼、同 PID 原版讀檔／VM reset。Test Results: 活躍背包五物品清空，動畫中槽 2／3 圖號為 7560／7606，影片影格可見廚師移向爐灶；原版指令 44 在此案例局部確認。Research Findings: 首次 `z_003.avi` 只有待機動畫，已撤回該次歸因；在敵人資訊頁直接送一般鍵仍無法完成事件 49 的戰鬥。Known Limitations: 44 其他參數未驗；56 的戰鬥 5 尚未勝利；emulator save/load state 仍有已記錄崩潰。Unverified Assumptions: 44 每次調用的確切幀數、其餘 Unknown 原版語意。Next Recommended Tasks: 保持同一 PID，對 0／13／55／56／65 做限定追蹤或可逆隔離腳本對照；完成受影響驗證後還原第三槽。

## 2026-11-13：事件 936 比武入口與三個限定採樣（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；59 個 opcode 有局部 DOS 觀察、6 個仍 Unknown、3 個另註。Completed Tasks: 原版事件 936 已走到唯一 opcode 58，觀察額外對手對話與可操作戰鬥；事件 935／676／939 分別完成 opcode 13／44／65 的限定採樣，並分離不能歸因之處；核對 DOSBox-X save/load state 既有崩潰證據。Files Changed: `docs/validation/opcode-58-dos-observation.md`、`docs/validation/opcode-13-44-65-bounded-20261113.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、`docs/decisions/0040-dosbox-state-reload-reliability.md`、本檔。Tests Executed: 隔離第三槽原版事件互動、遊戲專用畫格、同址唯讀事件槽、原生 AVI 容器核對、六檔還原雜湊。Test Results: opcode 58 觸發對手對話和戰鬥選單；13／44／65 個別仍 Unknown；已結束的三案六檔均還原，事件 936 的唯一測試程序在驗證時仍開啟。Research Findings: 58 不只是可見動畫，至少可自行啟動第一場戰鬥；既有 SDL2 2026.10.01 emulator state load 在同程序內亦曾崩潰。Known Limitations: 58 完整連戰未驗；44 的 ZMBV 影片尚無可用解碼器；13／65 無獨立效果證據。Unverified Assumptions: 自然流程的事件 936 可達性、戰鬥勝利後狀態、剩餘 Unknown 語意。Next Recommended Tasks: 先建立可驗證的同程序復位或限定 debugger trace，再處理 0／13／44／55／56／65，避免反覆開關程序。

## 2026-11-13：原版事件 344 的兩種移動段（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；7 個 opcode 仍標 Unknown。Completed Tasks: 在隔離第三槽逐段推進原始事件 344，於第一條／反向 opcode 25 和 opcode 30 各擷取原版畫格與 AVI；排除會停留舊值的存檔頭座標候選；關閉程序並還原六檔。Files Changed: `docs/validation/opcode-25-30-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: 原版事件對話推進、遊戲專用 raw 畫格、原生 AVI、唯讀座標候選及還原雜湊。Test Results: 第一條 opcode 25 後視野移向屋外，反向 opcode 25 後回到屋內；opcode 30 後主角從櫃檯旁移至爐灶附近並出現下一段對話。Research Findings: 本案例支持兩種不同的可見移動效果。Known Limitations: 沒有校準參數座標軸、移動物件身份或動畫速度；存檔頭候選為舊值。Unverified Assumptions: 原始自然流程可達性與所有變體。Next Recommended Tasks: 其餘 Unknown 為重畫／特殊動畫／條件分支／戰鬥後狀態及可能無畫面效果指令。

## 2026-11-13：原版事件 655 的動畫段（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；9 個 opcode 仍標 Unknown。Completed Tasks: 以隔離第三槽補足事件 655 的攻擊／物品前置，錄製原版 AVI 與三張連續遊戲畫格，唯讀核對動畫後三個事件槽圖號，關閉唯一程序並還原六檔。Files Changed: `docs/validation/opcode-57-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔、`scripts/Start-DOSBoxX-IsolatedEvent.ps1`。Tests Executed: 原版事件對話與動畫、DOSBox-X 原生 AVI／raw 畫格、同址事件槽唯讀記憶體、六檔 SHA-256 還原。Test Results: 主角站位短暫空出後復原；槽 2／3／4 圖號變成 7746／7804／7862，吻合腳本後段。Research Findings: 本案例已到達 opcode 57 所在動畫段。Known Limitations: 前置 opcode 0 也重畫，不能分辨動畫的每一幀歸屬；原場景石門畫面未驗。Unverified Assumptions: 完整動作幀序與自然流程可達性。Next Recommended Tasks: 剩餘 Unknown 需解決場景動畫定位、戰場輸入、事件比較與無明顯效果指令。

## 2026-11-13：原版事件 620 的離場音訊對照（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；10 個 opcode 仍標 Unknown。Completed Tasks: 在隔離第三槽完整推進事件 620，設置可逆相鄰出口；與不執行 opcode 8 的同場景出場對照各錄一次原生 WAV 並確認世界地圖畫格；逐案關閉程序、還原六檔。Files Changed: `docs/validation/opcode-8-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔、`tools/analyzer/prepare_synthetic_event_slot.py`、`scripts/Run-DOSBoxX-Opcode8-Case.ps1`、`scripts/Run-DOSBoxX-ExitMusicControl.ps1`。Tests Executed: 原版長對話推進、事件槽唯讀記憶體、遊戲專用畫格、原生 WAV、出場前後 RMS、六檔 SHA-256 還原。Test Results: 事件 620 結束後室內未聽得持續切換；出場後錄音約 3.1–3.6 千 RMS，同場景無 opcode 8 出場約 4.3–4.7 千。Research Findings: 本案例支持 opcode 8 選擇離場後音樂。Known Limitations: 未解曲目 ID 3 的實際資源映射，也未驗其他 ID。Unverified Assumptions: 原版自然流程到事件 620、完整參數語意。Next Recommended Tasks: 剩餘 Unknown 主要需動畫定位、戰鬥勝利、事件 ID 分支或限定 trace。

## 2026-11-13：淡出與音樂切換的分離採樣（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；11 個 opcode 仍標 Unknown。Completed Tasks: 以事件 531 的指定物品路徑錄製兩次音訊並擷取淡出前／中／後遊戲畫格；以只含淡出、不含音樂指令的事件 514 作音訊對照；每案還原隔離第三槽六檔。Files Changed: `docs/validation/opcode-14-66-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔、`scripts/Run-DOSBoxX-Opcode66-Case.ps1`、`scripts/Run-DOSBoxX-FadeAudioControl.ps1`。Tests Executed: 原版物品與對話操作、遊戲專用 raw 畫格、DOSBox-X 原生 WAV、逐秒 RMS、六檔 SHA-256 還原。Test Results: 事件 531 中間畫格全場景變暗，兩次錄音在指令段後均持續降至約 0.6–1.2 千 RMS；事件 514 淡出對照的音訊維持約 1.9–2.4 千。Research Findings: 本案例分別支持 opcode 14 畫面淡出與 opcode 66 切換音訊。Known Limitations: 未解曲目 9 資源映射、淡出幀數、其他事件變體。Unverified Assumptions: 自然流程可達性與完整參數語意。Next Recommended Tasks: 其餘 Unknown 集中在音樂場景切換、移動動畫、戰鬥後狀態、特殊分支與無明顯畫面指令。

## 2026-11-13：原版事件 1001 的圖號分支對照（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；13 個 opcode 仍標 Unknown。Completed Tasks: 以隔離第三槽讓原版事件 1001 在圖號原值 0 與合成 4664 兩種狀態下各執行一次；核對兩案都已使用 ID 144、關閉事件槽 0，並比對後續畫面；逐案還原六檔。Files Changed: `docs/validation/opcode-61-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔、`tools/analyzer/prepare_synthetic_event_slot.py`、`scripts/Run-DOSBoxX-Opcode61-Case.ps1`。Tests Executed: 原版物品頁互動、精確遊戲畫格、事件槽與背包唯讀記憶體、六檔 SHA-256 還原。Test Results: 圖號 0 案沒有後續對話，圖號 4664 案顯示「咦！好像有什麼聲音」。Research Findings: 本案例支持 opcode 61 依目標事件圖號條件分支。Known Limitations: 同時改了三個圖號欄，無法判斷原版實際讀哪一欄。Unverified Assumptions: 完整槽位範圍、跳轉公式與自然流程可達性。Next Recommended Tasks: 繼續以音訊及影片採樣其他 Unknown，對需戰鬥案例另建可重播勝利路徑。

## 2026-11-13：原版事件 389 的遊戲音訊採樣（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；14 個 opcode 仍標 Unknown。Completed Tasks: 以精確遊戲視窗的 Capture 選單錄製原版事件 389 前後 WAV，確認後續對話、關閉唯一程序並還原六檔；加入可重複使用的 Capture 選單查詢與命令工具。Files Changed: `docs/validation/opcode-67-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔、`scripts/Get-DOSBoxX-CaptureMenu.ps1`、`scripts/Invoke-DOSBoxX-CaptureMenu.ps1`、`scripts/Run-DOSBoxX-SoundEvent-Case.ps1`。Tests Executed: DOSBox-X 原生 WAV 錄製、原版畫格、逐秒音訊 RMS、精確事件槽唯讀核對、六檔 SHA-256 還原。Test Results: 8.417 秒錄音的前 3 秒 RMS 約 2.0–2.2 千，互動後第 3–5 秒約 4.3–6.0 千，再回到基線；事件後顯示原始對話。Research Findings: 本案例支持 opcode 67 觸發額外聲音。Known Limitations: 尚未隔離編號 22 的音效素材或音源映射。Unverified Assumptions: 其他參數與自然流程可達性。Next Recommended Tasks: 以相同原生錄音工具處理剩餘音訊指令，並以影片／狀態差分處理動畫案例。

## 2026-11-13：既有原版畫格核對主角朝向（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；15 個 opcode 仍標 Unknown。Completed Tasks: 以既有事件 931 的 Y 路徑原版 raw 畫格比較主角與靜態背景，記錄 opcode 40 所在段的站姿變化；未重播已確認的選項與 HP 指令。Files Changed: `docs/validation/opcode-40-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: 遊戲專用畫格目視與指定矩形逐像素顏色差異。Test Results: 主角矩形 38.59% 不同，背景控制矩形 0%；前後站姿朝向不同。Research Findings: 本案例支持 `40(3)` 所在段更新主角站姿。Known Limitations: 沒有獨立讀取朝向記憶體欄位，後續 opcode 13 可能負責重畫。Unverified Assumptions: 數值 3 對應方向及其他參數。Next Recommended Tasks: 對剩餘 Unknown 優先找可區分的音訊、動畫或狀態證據。

## 2026-11-13：原版事件 234 的金額門檻分支（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；16 個 opcode 仍標 Unknown。Completed Tasks: 以隔離第三槽和相同原始事件 234 分別執行 ID 174 ×9／×10；觀察兩路對話與不停模背包欄位，逐案關閉程序並還原六檔。Files Changed: `docs/validation/opcode-31-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔及 `scripts/Run-DOSBoxX-Opcode31-Case.ps1`。Tests Executed: 原版物品頁互動、精確遊戲畫格、背包與事件槽唯讀記憶體、六檔還原。Test Results: 數量 9 顯示要求 10 兩銀子的對話且數量未變；數量 10 顯示「客官，您慢用」，執行中背包候選紀錄已移除 ID 174 ×10。Research Findings: 本案例支持 opcode 31 依物品數量門檻分支。Known Limitations: 後續 ID 194 發放、其他門檻與比較運算子未驗。Unverified Assumptions: 自然流程可達性及所有參數語意。Next Recommended Tasks: 繼續測其餘 Unknown 的可區分案例，不重測已確認的路徑。

## 2026-11-13：opcode 31 門檻對照準備與執行阻礙（最新）

Phase: Phase 1／2 原版執行採樣。Status: **opcode 31 仍 Unknown**；自動審核額度阻止重跑。Completed Tasks: 建立 ID 174 ×9／×10 的可逆原版事件 234 試跑腳本；辨識首次試跑的啟動文字頁誤判並修正守門；核對六個第三槽檔案已還原。Files Changed: `scripts/Run-DOSBoxX-Opcode31-Case.ps1`、`docs/validation/opcode-31-pending-dos-observation.md`、`docs/decisions/0039-reversible-event-sampling.md`、`docs/TODO.md`、本檔。Tests Executed: PowerShell 語法解析、首次 DOSBox-X 啟動頁觀察、六檔 SHA-256 還原；修正後重跑被自動審核拒絕，未執行。Test Results: 首次試跑在 720×400 啟動文字頁結束，沒有載入事件；六檔原值全部還原。Research Findings: 原始事件 234 的候選分支提供 10 的可測門檻，opcode 31 語意仍未驗證。Known Limitations: 自動審核因使用額度用盡，拒絕啟動後續模擬器測試。Unverified Assumptions: 原版兩路的實際跳轉、物品 ID 174 的角色、門檻比較方式。Next Recommended Tasks: 審核可用後直接重跑 ×9／×10；再處理其他 Unknown 的音畫與戰鬥案例。

## 2026-11-13：原版事件 353 的事件欄位增量（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；17 個 opcode 仍標 Unknown。Completed Tasks: 在隔離第三槽執行原始事件 353，讀取同一程序內當前場景三個事件槽的前後值；關閉唯一程序後還原六檔。Files Changed: `docs/validation/opcode-26-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: 原版事件互動與對話推進、文字化精確遊戲畫格分類、唯讀記憶體、六檔 SHA-256 還原。Test Results: 槽 4／5／6 的 word 4 從 `-1／-1／0` 變成 `0／0／1`，吻合各 `26(-2,slot,0,0,1)`。Research Findings: 本案例支持 opcode 26 對指定事件槽欄位加 1。Known Limitations: 未驗其他欄位增量、遠端場景與自然流程。Unverified Assumptions: 其餘參數及所有變體的語意。Next Recommended Tasks: 繼續針對其餘 Unknown 建立可區分的前後狀態與音畫證據。

## 2026-11-13：原版事件 16 的物品使用分支（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部指令仍未驗收。Completed Tasks: 在隔離第三槽確認 ID 160 ×1 後，從原版物品頁選「唐詩選輯」並對事件 16 使用；同一程序再選另一物品作控制；測後關閉唯一程序並還原六檔。Files Changed: `docs/validation/opcode-4-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: 原版物品選單互動、精確遊戲畫格、事件槽與背包唯讀記憶體、六檔 SHA-256 還原。Test Results: ID 160 路徑顯示燒書對話，控制組無該對話；事件 16、物品 160 ×1 仍在。Research Findings: 本案例支持 opcode 4 依指定物品分支。Known Limitations: 合成入場與物品，未做限定 trace。Unverified Assumptions: 控制組物品使用參數、完整跳轉公式與自然可達性。Next Recommended Tasks: 沿相同 UI 操作驗證 opcode 26 所在事件 647 的物品 ID 187，並唯讀事件槽差分。

## 2026-11-13：19 個 Unknown 原始候選事件首輪（最新）

Phase: Phase 1／2 原版執行採樣。Status: **候選事件首輪完成，opcode 語意驗證仍未完成**。Completed Tasks: 以可逆第三槽依序載入並互動 19 個 Unknown 的原始候選事件；每案檢查標題頁、載入頁及事件 ID，保留到達點與所缺前置；一次只開一個 DOSBox-X 程序並逐案還原。Files Changed: `docs/validation/unknown-opcode-first-pass-20261113.md`、`scripts/Run-DOSBoxX-Unknown-FirstPass.ps1`、`docs/TODO.md`、本檔。Tests Executed: DOSBox-X 19 個候選事件首輪、精確遊戲畫格、本機文字分類、事件槽唯讀記憶體、逐案六檔 SHA-256 還原。Test Results: 19 案均在修正頁面守門後成功載入與觸發；多數停在物品使用、對話或戰鬥前置，不能提高語意信心；剩餘 Unknown 數維持 19。Research Findings: 普通 Enter 不會替代「使用物品」事件操作，音效／瞬間清屏需音訊或影片證據。Known Limitations: 首輪腳本不處理選項、物品使用、戰鬥或全部對話；初版早送鍵試驗已排除。Unverified Assumptions: 各指令的完整參數與自然流程可達性。Next Recommended Tasks: 依[首輪逐項表](validation/unknown-opcode-first-pass-20261113.md)補專用前置及可區分量測，先處理物品使用路徑與可錄音的 opcode 67。

## 2026-11-13：原版事件 821 的場景入場條件（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部 opcode 仍未驗收。Completed Tasks: 隔離第三槽執行事件 821，逐頁文字化檢查對話結束後唯讀比較四個世界場景的入場條件候選欄，測後關閉唯一程序並還原六檔。Files Changed: `docs/validation/opcode-54-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: DOSBox-X 原始事件、對話覆蓋層分類、世界場景同址唯讀記憶體、六檔 SHA-256 還原。Test Results: 第 47 次 Enter 後覆蓋層消失且三秒後仍消失；場景 2 `1→2`、4 `1→0`、38 `1→2`、75 不變。Research Findings: 本案例支持 opcode 54 批量改寫世界場景條件，且不同場景取不同值。Known Limitations: 只查四個場景，未走入口；入場為 Synthetic State。Unverified Assumptions: 全部 84 場景的映射及自然可達性。Next Recommended Tasks: 繼續其餘 19 個 Unknown，對可能修改資料的指令優先找可直接差分的原版欄位。

## 2026-11-13：原版事件 567 的圖號終值（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；完整指令清單仍未驗收。Completed Tasks: 隔離第三槽執行事件 567，於後續對話時唯讀比較同一場景槽 8 的三個圖號欄，測後關閉唯一程序並還原六檔。Files Changed: `docs/validation/opcode-27-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: DOSBox-X 原始事件、精確遊戲畫格、事件槽同址唯讀前後差分、六檔 SHA-256 還原。Test Results: `27(8,6420,6448)` 後槽 8 欄位 5／6／7 均 `0→6448`；其他欄位不變。Research Findings: 本案例支持 opcode 27 設定事件動畫的圖號終值。Known Limitations: 未採集動畫每幀，合成入場。Unverified Assumptions: 其他場景／事件槽、速度及自然可達性。Next Recommended Tasks: 繼續其餘 20 個 Unknown，只選有可區分狀態的案例。

## 2026-11-13：事件 225 的 opcode 25 保留 Unknown

Phase: Phase 1／2 原版執行證據。Status: **未完成語意驗證**。Completed Tasks: 隔離第三槽執行事件 225，觀察對話前後精確遊戲畫格，測後還原六檔。Files Changed: `docs/validation/opcode-25-unresolved-dos-observation.md`、`docs/TODO.md`、本檔。Tests Executed: DOSBox-X 事件槽唯讀核對、對話逐頁觀察、六檔 SHA-256 還原。Test Results: `z_580–582` 顯示草地對話及結束畫面，但未隔離指定物件位移。Research Findings: 此合成進場案例不足以確認 opcode 25 語意。Known Limitations: 畫面未提供目標物件座標；場景入場為 Synthetic State。Unverified Assumptions: 參數對象、起終座標與方向。Next Recommended Tasks: 在事件原場景定位座標與移動對象後重測；目前保持 Unknown。

## 2026-11-13：原版事件 1017 的結局呈現（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部原版 opcode 仍未驗收。Completed Tasks: 隔離第三槽執行原始事件 1017，對話結束後觀察人物消失與自動切入結局敘事；關閉唯一程序並還原六檔。Files Changed: `docs/validation/opcode-62-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: 原版 DOSBox-X 事件互動、精確遊戲畫格與文字化狀態、事件槽唯讀記憶體、六檔 SHA-256 還原。Test Results: `z_578` 人物消失；無額外輸入後 `z_579` 顯示黑底紅字結局敘事。Research Findings: 本案例支持 `62(0,8054,8128,1,8130,8204)` 觸發結局呈現。Known Limitations: 合成入場，未追完結局動畫或存檔效果。Unverified Assumptions: 參數對應與自然可達性。Next Recommended Tasks: 繼續尚未確認的 22 個 opcode；選項與場景變化沿用精確畫格守門。

## 2026-11-13：原版事件 115 的戰鬥選擇（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；完整指令清單仍未驗收。Completed Tasks: 同一隔離 DOSBox-X 程序比較原版事件 115 的 N／Y 兩路，戰鬥前停止，關閉唯一程序並還原六檔。Files Changed: `docs/validation/opcode-5-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、`docs/decisions/0039-reversible-event-sampling.md`、本檔。Tests Executed: 精確遊戲畫格、事件槽唯讀記憶體、N／Y 互動、六檔 SHA-256 還原。Test Results: N 顯示未準備並回室內，Y 顯示應戰對話並到戰鬥選人；初次誤入姓名頁已排除，不作指令證據。Research Findings: 本案例支持 `5(6,0)` 的是否戰鬥選擇。Known Limitations: 合成入場，未進行戰鬥，分類器不能辨識選項文字。Unverified Assumptions: 相對偏移公式、其他參數及自然可達性。Next Recommended Tasks: 繼續尚未確認的 opcode；標題頁須穩定並確認進入載入頁後才選第三槽。

## 2026-11-13：原版事件 28 的角色用毒欄（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部原版指令仍未驗收。Completed Tasks: 隔離第三槽重播事件 28，讓角色 1 在隊以進入目標路徑；在後續戰鬥選人畫面唯讀比對角色 4 用毒候選欄，隨後關閉唯一程序並還原六檔。Files Changed: `docs/validation/opcode-23-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: DOSBox-X 事件讀回與對話、精確遊戲畫格人工檢查、角色欄唯讀記憶體、六檔 SHA-256 還原。Test Results: 角色 4 欄位 `53→99`，畫面進入戰鬥選人；六檔還原基線。Research Findings: 本案例支持 `23(4,99)` 設定用毒候選值；讀數是戰鬥前中途狀態。Known Limitations: 入場與隊伍為 Synthetic State，戰鬥未執行。Unverified Assumptions: 其他角色／數值、自然可達性。Next Recommended Tasks: 繼續只對 Unknown opcode 採樣；對選項或戰鬥等未知 UI 先檢查精確遊戲畫格。

## 原版事件 932 的隊伍清除（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部指令仍未驗收。Completed Tasks: 隔離第三槽重播原始事件 932，於對話與物品通知結束後唯讀比對執行中隊伍及載入存檔副本，測後還原六檔。Files Changed: `docs/validation/opcode-59-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: 原版 DOSBox-X 事件互動、固定場景覆蓋層文字分類、精確位址唯讀隊伍、六檔 SHA-256 還原。Test Results: 第六次 Enter 後覆蓋層消失並保持消失；執行中隊伍 `[0,1,49,-1,-1,-1]→[0,-1,-1,-1,-1,-1]`，載入存檔副本不變。Research Findings: 本案例支持尾端 opcode 59 清除主角以外的隊員。Known Limitations: 合成入場與隊伍前置；覆蓋層分類非 OCR。Unverified Assumptions: 其他排列、關聯狀態、自然可達性。Next Recommended Tasks: 僅採樣尚未確認的 opcode，對需要分支的案例先找到可區分的原版前置。

## 原版事件 289 的對話完成守門與角色欄位（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；完整指令清單與轉換邏輯尚未驗收。Completed Tasks: 以可逆第三槽重播原始事件 289，核對 opcode 35／41 的角色 36 欄位變化；另將該角色性別候選值合成為 0，證實 opcode 63 後成為 2。新增依覆蓋層狀態推進對話的腳本，對話消失並維持三秒後才讀最終記憶體；關閉唯一測試程序並還原六檔。Files Changed: `docs/validation/opcode-35-41-63-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/research/original-save-layout-candidate.md`、`docs/decisions/0039-reversible-event-sampling.md`、`docs/TODO.md`、`scripts/Advance-DOSBoxX-DialogueUntilClear.ps1`、`tools/analyzer/prepare_synthetic_event_slot.py`、本檔。Tests Executed: DOSBox-X 第三槽讀回／原始事件互動、遊戲專用畫格文字分類、同址角色／事件槽唯讀記憶體、六檔 SHA-256 還原。Test Results: 第 18 次 Enter 後覆蓋層消失，三秒後仍無覆蓋層；角色 36 性別候選 0→2、首槽武功 31→60／點數 0→100、物品 -1→78／數量 0→1；事件槽另經 opcode 3 指向 314。Research Findings: 原版武功首槽位於 182-byte 角色記錄相對 offset 126、點數候選 146；角色 49 先前 offset 128 是第二槽。Known Limitations: 覆蓋層分類非 OCR，未知選項／場景切換需人工檢查；合成前置不能證明自然可達。Unverified Assumptions: 其他角色、欄位邊界及參數變體。Next Recommended Tasks: 繼續尚未驗證的 opcode；事件 464 的 opcode 55 需能區分分支的原版案例或限定 trace。

## 原版事件 673 的資質增加（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部原版指令仍未驗收。Completed Tasks: 隔離第三槽重播原始事件 673，文字化檢查全部對話完成，唯讀比較主角資質及事件槽；測後還原六檔。Files Changed: `docs/validation/opcode-34-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: DOSBox-X 原版事件、精確畫格覆蓋層狀態、主角與事件槽不停模記憶體、六檔 SHA-256 還原。Test Results: 主角資質候選 `72→75`，事件槽 `673→674`；前者對應 `34(0,3)`，後者屬前一條 opcode 3。Research Findings: 本案例支持 opcode 34 增加主角資質。Known Limitations: 只測 +3、角色 0；原版事件進場為 Synthetic State。Unverified Assumptions: 上限、負值、其他角色及自然流程可達性。Next Recommended Tasks: 選其他可觀測 Unknown opcode；已確認 opcode 不再換事件重驗。

## 原版事件 20 的當前內力歸零（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部原版指令仍未驗收。Completed Tasks: 隔離第三槽重播原始事件 20，在首段與後續對話之間唯讀比對主角內力，避開後段戰鬥；測後還原六檔。Files Changed: `docs/validation/opcode-22-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: DOSBox-X 原版事件、精確遊戲畫格及文字化覆蓋層、主角執行中記憶體、六檔 SHA-256 還原。Test Results: CurrentMP／MaxMP `26/26→0/26`，HP `44/44` 未變；後續角色對話已出現，尚未進入戰鬥。Research Findings: 本案支持 opcode 22 將主角當前內力清零。Known Limitations: 只測一人隊伍；動畫、淡出及其他指令效果不在此案歸因。Unverified Assumptions: 同伴效果、自然可達性及其他上下文。Next Recommended Tasks: 未驗 opcode 優先選可在戰鬥前隔離的數值／分支案例；已確認 opcode 不再重驗。

## 原版事件 445 的性別條件分支（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部原版指令仍未驗收。Completed Tasks: 隔離第三槽只改主角候選性別 `0`／`1`，重播原始事件 445 的 Y 路徑並比較後續對話；兩案還原六檔。Files Changed: `docs/validation/opcode-42-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: DOSBox-X 原版事件與 Y/N 互動、精確畫格差異、對話人工核對、六檔 SHA-256 還原。Test Results: 值 0 出現要求先找女性同伴的拒絕對話；值 1 出現答應同行對話。Research Findings: 本案支持 opcode 42 依候選性別值選擇分支。Known Limitations: 只改主角性別，未測男性主角與女性同伴。Unverified Assumptions: 是否掃描隊伍任一女性、完整跳轉公式及自然可達性。Next Recommended Tasks: 未知 opcode 優先選具不同可見後續結果的事件；已確認 opcode 不換事件重驗。

## 原版事件 581 的武功與內力屬性（最新）

Phase: Phase 1／2 原版格式及執行證據。Status: **局部完成**；全部原版指令仍未驗收。Completed Tasks: 在隔離第三槽重播事件 581 的一人分支，對角色 49 的原版 182-byte 記錄做完整前後差分，核對學會武功通知；測後還原六檔。Files Changed: `docs/validation/opcode-33-49-dos-observation.md`、`docs/research/original-save-layout-candidate.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: DOSBox-X 原版事件、文字化覆蓋層完成點、角色記錄全部 91 個 int16 差分、遊戲單畫格通知檢視、六檔 SHA-256 還原。Test Results: opcode `33(49,15,0)` 的通知為「虛竹 學會 天山六陽掌」，角色 49 offset 128 `0→15`；`49(49,2)` 對應的候選 MPType offset 80 `1→2`。Research Findings: 社群 208-byte 角色表的 Magic 起點 130 與原版實測 offset 128 不符。Known Limitations: 武功等級／其他槽、內力屬性在戰鬥中的實際效果未驗。Unverified Assumptions: 其他角色與參數、自然可達性及相對 offset 42 的 `90→92` 來源。Next Recommended Tasks: 不再重跑已確認的 33／49；追其他 Unknown opcode，並修正尚沿用社群 208-byte 後段偏移的候選規格。

## 原版事件 581 的能力增加指令 45／46／47／48（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部原版指令仍未驗收。Completed Tasks: 利用同一有效事件 581 前後角色 49 記錄，逐項對照原始能力變更參數；不另開已確認指令的測試事件。Files Changed: `docs/validation/opcode-45-48-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: 原版 DOSBox-X 事件 581、角色 49 不停模記憶體前後差分、通知畫格文字化守門、第三槽六檔 SHA-256 還原。Test Results: `46(49,300)` MP `21/21→321/321`；`48(49,200)` HP `38/38→238/238`；`47(49,30)` 攻擊 `14→44`；`45(49,20)` 速度 `30→50`。Research Findings: 四個參數與各欄位差額吻合，均可標局部 DOS 行為。Known Limitations: 後續 opcode 33／49 尚未量測對應欄位。Unverified Assumptions: 上下限、負增量、其他角色、自然可達性。Next Recommended Tasks: 從其他未驗 opcode 選可觀測案例；事件 581 只在追尚未驗的 33／49 時才重播。

## 原版事件 950 的執行中隊伍離隊（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部原版指令仍未驗收。Completed Tasks: 在隔離第三槽合成角色 1 在隊並重播原始事件 950；對話起訖以文字化畫格確認，分別讀取載入存檔副本與執行中隊伍；測後還原六檔。Files Changed: `docs/validation/opcode-21-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、`tools/analyzer/scan_dosbox_process_memory.py`、本檔。Tests Executed: DOSBox-X 原版事件、精確畫格差異、不停模隊伍副本前後差分、六檔 SHA-256 還原。Test Results: 執行中隊伍 `[0,1,-1,-1,-1,-1]→[0,-1,-1,-1,-1,-1]`；載入存檔副本保持原值。Research Findings: 本案例支持 opcode 21 將角色 1 移出隊伍，先前「未見離隊」因讀錯副本已撤回。Known Limitations: 事件進場／隊伍前置為 Synthetic State；只驗角色 1 一案。Unverified Assumptions: 其他角色、不在隊時行為、隊伍壓縮及自然流程可達性。Next Recommended Tasks: 繼續其他 Unknown opcode，優先處理 55 的可區分分支；已確認 opcode 不重驗。

## 原版角色資料尺寸修正與 opcode 10 加入隊伍（最新）

Phase: Phase 1／2 原版格式及執行證據。Status: **局部完成**；全部原版指令仍未驗收。Completed Tasks: 以 R3 段界及多個 CP950 姓名核對原版角色記錄為 320 × 182 bytes，撤回社群 280 × 208 候選；重播原始事件 581，定位角色 49「虛竹」與真正執行中隊伍紀錄；測後還原第三槽六檔。Files Changed: `docs/research/original-save-layout-candidate.md`、`docs/validation/opcode-10-dos-observation.md`、`tools/analyzer/scan_dosbox_process_memory.py`、`tools/analyzer/prepare_synthetic_event_slot.py`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、`docs/decisions/0039-reversible-event-sampling.md`、本檔。Tests Executed: 原版 DOSBox-X 事件 581、精確畫格文字化覆蓋層檢查、角色／隊伍不停模唯讀記憶體、六檔 SHA-256 還原。Test Results: 角色 49 HP `38→238`、MaxHP `38→238`、MP `21→321`、MaxMP `21→321`、攻擊 `14→44`、速度 `30→50`；另一執行中隊伍紀錄由一人變為包含角色 49，舊存檔副本仍顯示一人。Research Findings: 本案例支持 opcode 10 加入角色 49；先前 208-byte 讀數錯位及只讀存檔副本的負面判斷均撤回。Known Limitations: 此局部案例未驗其他角色、滿隊、角色攜帶物品或所有原版路徑。Unverified Assumptions: 其他參數變體、自然流程可達性；opcode 21 是否同樣因讀錯隊伍副本而被誤判。Next Recommended Tasks: 用執行中隊伍紀錄重查未解 opcode 21，並繼續未驗指令；已確認 opcode 不重驗。

## 原版事件 464 的 opcode 55 對照仍未解（最新）

Phase: Phase 1／2 原版執行證據。Status: **未完成**；opcode 55 維持 Unknown。Completed Tasks: 兩份隔離第三槽只變更場景 32 槽 2 的事件 ID（`-1`／`581`），重播原始事件 464；各案唯讀核對目標槽前後值並還原六檔。Files Changed: `docs/validation/opcode-55-unresolved-dos-observation.md`、`tools/analyzer/prepare_synthetic_event_slot.py`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: DOSBox-X 原版事件互動、不停模事件槽唯讀差分、六檔 SHA-256 還原。Test Results: 兩案槽 0 均被先頭腳本關閉，槽 2 皆變為 `862`；未形成 opcode 55 可區分分支。Research Findings: 社群比較語意在本案尚無原版證據。Known Limitations: 複合事件中的後續 opcode 3 造成最終寫入，無直接指令 trace。Unverified Assumptions: `55(2,-1,14,0)` 的參數／分支公式、其他事件適用性。Next Recommended Tasks: 選可見對話或獨立狀態結果的 opcode 55 原始事件，或限定 trace；不重驗已確認 opcode。

## 已撤回：以錯誤角色尺寸判讀的 opcode 10（歷史紀錄）

下方舊段落的 208-byte 角色間距與「隊伍未變」判斷已由本檔最新節及 [修正後證據](validation/opcode-10-dos-observation.md) 撤回，不得作目前結論。

Phase: Phase 1／2 原版執行證據。Status: **未完成**；opcode 10 維持 Unknown。Completed Tasks: 在隔離第三槽一人隊伍跑過事件 581 的四段能力通知，文字化檢查通知覆蓋層清除及事件返回互動；唯讀比對隊伍與角色 49 候選紀錄；測後還原六檔。Files Changed: `docs/validation/opcode-10-unresolved-dos-observation.md`、`tools/analyzer/scan_dosbox_process_memory.py`、`docs/TODO.md`、本檔。Tests Executed: DOSBox-X 原版事件、PNG 畫格差異分類、隊伍／角色候選記憶體、六檔 SHA-256 還原。Test Results: `z_450` 顯示「虛竹 內力增加 300」；`z_450–453` 有通知、`z_454–455` 無覆蓋層、`z_456` 返回原首段對話；隊伍候選值仍一人，角色 49 MaxMP 候選仍 360。Research Findings: 目前角色紀錄候選與可見通知互相矛盾，不能據此定義 opcode 10 的語意。Known Limitations: 未定位會隨通知更新的原版角色記憶體副本；未 trace 尾端 `33`、`49`、`10`。Unverified Assumptions: opcode 10 是否到達、角色記憶體布局及自然流程可達性。Next Recommended Tasks: 定位真正更新的角色紀錄或做限定範圍二進位 trace，再判定 10；其餘已確認 opcode 不重驗。

## 對話完成點的文字化畫格守門（最新）

Phase: Phase 1／2 原版執行驗證工具。Status: **局部完成**；opcode 21 仍未解。Completed Tasks: 新增固定場景 PNG 覆蓋層差異分類器，校準乾淨室內、對話、Y/N 選項及物品通知；補充事件 950 目標槽位觀察與 ADR 0039 作業規則。Files Changed: `tools/analyzer/classify_dosbox_game_frame.py`、`docs/validation/opcode-21-unresolved-dos-observation.md`、`docs/decisions/0039-reversible-event-sampling.md`、`docs/TODO.md`、本檔。Tests Executed: 用已知 `z_389`、`z_390`、`z_441`、`z_442`、`z_435`、`z_447`、`z_448` 畫格比對，Python 語法檢查及隔離第三槽還原。Test Results: 已知乾淨畫格區域差異 0–0.014；對話區 0.65–0.78，Y/N／通知區 0.15–0.51；六檔恢復基線。Research Findings: 物品通知仍屬事件中途，必須等覆蓋層清除後再讀最終值。Known Limitations: 只可同場景、同鏡頭的乾淨畫格作基準；不辨識文字、不證明事件已跑到腳本終點。Unverified Assumptions: 其他 UI 和場景適用同門檻；opcode 21 的效果。Next Recommended Tasks: 對未解 opcode 21 取得對話起訖與正確目標記憶體／限定 trace；已確認 opcode 不再換事件重驗。

## 原版事件 96 的加入 Y/N 分支（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部原版指令仍未驗收。Completed Tasks: 相同隔離第三槽前置狀態重播原始事件 96 的 N／Y；兩案還原六檔。Files Changed: `docs/validation/opcode-9-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: DOSBox-X 原版事件互動、精確遊戲畫格、不停模隊伍／事件槽唯讀記憶體、六檔 SHA-256 還原。Test Results: opcode 9 畫面顯示加入 Y/N；N 為婉拒對話，Y 為答應對話；Y 案後續停在物品通知畫格，尚未跑到腳本終點。Research Findings: 本案例支持 opcode 9 控制 Y/N 後續分支，不直接證明角色已加入。Known Limitations: 角色加入可能屬後續 opcode；場景與事件指向為 Synthetic State。Unverified Assumptions: `6,0` 的完整相對跳轉公式、其他參數與自然流程可達性。Next Recommended Tasks: 優先追蹤未解的 opcode 21 與其他尚無原版證據的指令；已確認的 opcode 不再換事件重驗。

## 原版事件 581 的滿隊條件分支（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部原版指令仍未驗收。Completed Tasks: 隔離第三槽以一人／六人隊伍重播原始事件 581；確認原始對話、執行中隊伍及場景事件槽；兩案均關閉唯一程序並還原六檔。Files Changed: `docs/validation/opcode-20-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、`tools/analyzer/prepare_synthetic_event_slot.py`、本檔。Tests Executed: DOSBox-X 原版事件互動、遊戲專用畫格、不停模隊伍／事件槽唯讀記憶體、六檔 SHA-256 還原、Python 語法檢查。Test Results: 一人分支後續改寫場景 32 槽 2；六人分支顯示「你的隊伍已滿，無法再加入」，槽 2 及隊伍未變。Research Findings: 本案例支持 opcode 20 為滿隊條件分支，FishEdit「全體內力降為 0」描述與實測不符；事件槽修改屬後續 opcode 3。Known Limitations: 滿隊對話屬後續 opcode 1，原版事件為複合腳本，未逐一隔離參數。Unverified Assumptions: `0,6` 的個別作用、其他隊伍容量／排列、完整跳轉公式及自然可達性。Next Recommended Tasks: 驗證其他隊伍排列及剩餘未知 opcode；優先追蹤 21 的對話結束點。

## 原版事件 37 的室內位置變化（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部原版指令仍未驗收。Completed Tasks: 以缺 ID 173 的隔離第三槽重播原始事件 37，跟隨第一段對話到位置切換及下一段對話；測後還原六檔。Files Changed: `docs/validation/opcode-19-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: 原版 DOSBox-X 第三槽讀回／事件互動、精確遊戲畫格、六檔 SHA-256 還原。Test Results: `z_421` 在櫃檯區顯示缺道具對話；`z_422–423` 已到圍欄泥地區並出現下一段對話。Research Findings: 此案例支持兩段對話之間的 opcode 19 改變室內位置。Known Limitations: 尚未取得原版執行中的獨立局部座標讀數；動畫與淡出未單獨隔離。Unverified Assumptions: `30,49` 軸向、其他場景／參數變體、自然流程可達性。Next Recommended Tasks: 定位當前室內格位的唯讀記憶體地址，並繼續其他 opcode 原版對照。

## 原版事件 990 的圖號條件分支（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部原版指令仍未驗收。Completed Tasks: 原始事件 990 以場景 80／事件 1 原圖號 6068 與合成 6066 兩案重播；兩案均還原第三槽六檔。Files Changed: `docs/validation/opcode-60-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、`tools/analyzer/prepare_synthetic_event_slot.py`、本檔。Tests Executed: DOSBox-X 原版事件讀回／互動、遊戲專用畫格、隊伍候選唯讀記憶體、六檔 SHA-256 還原。Test Results: 6068 顯示「神雕宮中」對話；6066 顯示「古墓」對話；合成角色 58 未見離隊。Research Findings: 此案例支持 opcode 60 對指定事件圖號條件分支。Known Limitations: 三個圖號欄位同時介入，未隔離個別欄；opcode 21 仍未解。Unverified Assumptions: 任一欄匹配規則、其他場景／事件、跳轉公式及自然可達性。Next Recommended Tasks: 各自只改一個圖號欄以判斷匹配範圍，並繼續未驗 opcode 的原版對照。

## 原版事件 931 的住宿選擇與 HP 恢復（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；完整指令清單仍未驗收。Completed Tasks: 原始事件 931 的 Y/N 兩路重播；以 Synthetic State 將主角 HP 降至 1，唯讀比較同一執行中角色紀錄於住宿前後的值；兩案關閉唯一程序並還原六檔。Files Changed: `docs/validation/opcode-11-12-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、`scripts/Send-DOSBoxX-Key.ps1`、本檔。Tests Executed: DOSBox-X 原版事件互動、精確遊戲畫格、主角執行中記憶體唯讀對照、六檔 SHA-256 還原。Test Results: N 回到室內；Y 顯示住宿與隔天兩段對話；主角 HP 在第一段對話期間為 1/44，關閉後於第二段對話為 44/44。Research Findings: 本案支持 opcode 11 的 Y/N 分支，以及其 Y 路徑中 opcode 12 的 HP 恢復效果；對話由後續 opcode 1 呈現。Known Limitations: 進場／事件指向與 HP 降低為 Synthetic State；未單獨隔離 opcode 14／40。Unverified Assumptions: 其他角色／數值、完整跳轉公式及自然住宿可達性。Next Recommended Tasks: 繼續其他未驗 opcode 原版對照，對 12 補 MP／同伴／受傷中毒邊界。

## 已撤回：讀取載入存檔副本的 opcode 21 負面判斷（歷史紀錄）

下方舊段落讀取的是載入存檔副本，未觀察執行中隊伍；現以 [修正後證據](validation/opcode-21-dos-observation.md) 為準。

Phase: Phase 1／2 原版執行證據。Status: **未完成**；opcode 21 保持 Unknown。Completed Tasks: 隔離第三槽加入角色 1 並映射原始事件 950；確認原始對話可達、隊伍起始值及對話後唯讀值；測後還原六檔。Files Changed: `docs/validation/opcode-21-unresolved-dos-observation.md`、`docs/TODO.md`、本檔。Tests Executed: DOSBox-X 第三槽讀回、場景 32 進場、事件 950 互動、遊戲專用畫格、隊伍／事件槽唯讀記憶體、六檔 SHA-256 還原。Test Results: 對話出現，但同一執行中隊伍仍為 `[0,1,-1,-1,-1,-1]`；沒有把此結果標為指令語意。Research Findings: 合成角色在隊前置能載入，後續原版效果尚不明。Known Limitations: 尚未 trace 對話後指令、未用自然入隊進度。Unverified Assumptions: opcode 21 的參數長度、離隊語意及額外前置。Next Recommended Tasks: 對事件 950 的對話結束點做限定範圍 trace，或取得自然入隊／離隊存檔差分。

## 原版事件 640 的攻擊條件分支（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部原版指令仍未驗收。Completed Tasks: 在隔離第三槽以原始事件 640 對照主角候選 Attack 28／75，確認兩種不同路徑；每案關閉唯一 DOSBox-X 測試程序並還原六檔基線。Files Changed: `docs/validation/opcode-29-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、`docs/decisions/0039-reversible-event-sampling.md`、`tools/analyzer/prepare_synthetic_event_slot.py`、`tools/analyzer/scan_dosbox_process_memory.py`、本檔。Tests Executed: 原版 DOSBox-X 第三槽讀回、場景 32 進場、事件 640 互動、精確遊戲畫格、不停模唯讀角色／背包／事件槽、六檔 SHA-256 還原。Test Results: Attack 28 顯示力氣不足對話且腳本仍為 640；Attack 75 後續修改事件槽為 `-1`、顯示拔劍對話並使背包新增 ID 110 ×1。Research Findings: 此案例支持 opcode 29 依攻擊數值分支；取得物品與事件修改屬後續 opcode 2／3。Known Limitations: 世界入口及事件指向為 Synthetic State；初次進場與互動格位校準失敗的嘗試不作指令證據。Unverified Assumptions: 上界 1000、其他角色／事件、完整跳轉公式及自然可達性。Next Recommended Tasks: 按未驗 opcode 採樣表繼續原版執行對照；必要時以限定範圍 trace 查 15／83。

## 原版事件 27 的隊伍條件驗證（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部原版指令仍未驗收。Completed Tasks: 以可逆第三槽分別重播原始事件 27 的角色 1 不在隊／合成加入隊伍槽 1；唯讀確認隊伍資料與場景 32 事件槽 1 腳本 ID。Files Changed: `docs/validation/opcode-16-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、`tools/analyzer/prepare_synthetic_event_slot.py`、`tools/analyzer/scan_dosbox_process_memory.py`、本檔。Tests Executed: 兩次 DOSBox-X 原版事件讀檔／互動、精確畫格、隊伍及事件槽唯讀記憶體、每次六檔 SHA-256 還原。Test Results: 無角色 1 時腳本 ID 維持 `-1`；角色 1 在隊時後續 opcode 3 將其改為 28；兩案的 NPC 動作圖像欄位均變動，不用於分支判定。Research Findings: 此案例支持 opcode 16 依指定角色隊伍成員資格分支。Known Limitations: 入隊為 Synthetic State；未測其他隊伍槽或自然加入。Unverified Assumptions: 相對跳轉公式與其他角色／事件。Next Recommended Tasks: 繼續其他 opcode 原版對照，必要時以指令 trace 確認跳轉公式。

## 原版事件 458 的品德分支驗證（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部原版指令仍未驗收。Completed Tasks: 用可逆第三槽將原始事件 458 映射到同一 NPC，分別以主角候選品德 50／合成 49 重播；49 已由執行中主角紀錄唯讀確認。Files Changed: `docs/validation/opcode-28-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、`tools/analyzer/prepare_synthetic_event_slot.py`、本檔。Tests Executed: 兩次 DOSBox-X 原版事件讀檔／互動、精確畫格、品德與事件槽唯讀記憶體核對、每次六檔 SHA-256 還原。Test Results: 50 顯示後續對話 `z_310`；49 的 `z_315–317` 無該對話，事件槽仍為 458；兩次測後皆關閉唯一視窗且第三槽還原。Research Findings: 此案例支持 opcode 28 的主角品德下界分支；候選偏移 5 對應 word 11 的 opcode 7。Known Limitations: 49 分支沒有逐指令 trace；不能從靜態尾段推論其進入戰鬥。Unverified Assumptions: 上界 100、其他角色、完整跳轉公式。Next Recommended Tasks: 對 28 做上界／其他角色案例，並繼續其他 opcode 的原版對照。

## 原版事件 434 的圖層替換驗證（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部原版指令仍未驗收。Completed Tasks: 以可逆第三槽在場景 32 第 0 層合成一格 990，執行原始事件 434；唯讀執行中圖層的同一格 990→994，層內計數亦 990 1→0、994 0→1。Files Changed: `docs/validation/opcode-38-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、`tools/analyzer/prepare_synthetic_event_slot.py`、`tools/analyzer/scan_dosbox_process_memory.py`、本檔。Tests Executed: 原版 DOSBox-X 隔離第三槽、精確遊戲畫格、同一圖層唯讀前後比對、六檔 SHA-256 還原。Test Results: 首次 Enter 只見 NPC 動作且格值仍 990；第二次 Enter 後同格為 994；測後唯一視窗關閉，第三槽恢復基線。Research Findings: 此案例支持 `38(-2,0,990,994)` 修改目前場景第 0 層相符格。Known Limitations: 僅合成一格 990，沒有驗證多格同值。Unverified Assumptions: 全層替換規則、其他層／場景與畫面刷新。Next Recommended Tasks: 對照更多原版 opcode；以多個相同圖號格確認 38 的替換範圍。

## 原版事件 274 的圖層寫入驗證（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；全部原版指令仍未驗收。Completed Tasks: 將原始事件 274 映射到隔離第三槽，唯讀定位場景 32 第 1 層執行中資料；第二條 `17(-2,1,12,22,2898)` 執行後，ID 2898 格數 0→1、零值格 3806→3805、列優先 `(12,22)` 由 0→2898。Files Changed: `docs/validation/opcode-17-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、`tools/analyzer/scan_dosbox_process_memory.py`、本檔。Tests Executed: 原版 DOSBox-X 隔離第三槽讀取／事件觸發、遊戲專用畫格、同一 host 圖層唯讀對照、六檔 SHA-256 還原。Test Results: 指定格與層內計數同時吻合，測後唯一視窗關閉且第三槽恢復基線。Research Findings: 此案例的寫入採列優先格位索引。Known Limitations: 第一條 `17(...,0)` 的目標原值已是 0，未能單獨證實效果。Unverified Assumptions: `-2` 的全部解析情境、其他場景與圖層、視覺刷新。Next Recommended Tasks: 持續逐 opcode 對照，選有非零原值的目標驗證其他 17 變體。

## 原版事件 420 的場景條件驗證（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；完整指令清單與轉換邏輯仍未驗收。Completed Tasks: 以可逆第三槽映射原始事件 420，唯讀比對同一執行中場景 75 候選紀錄，兩段對話後 EnCondition 1→0，座標 341、137 未變。Files Changed: `docs/validation/opcode-39-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、`tools/analyzer/scan_dosbox_process_memory.py`、本檔。Tests Executed: 唯一 DOSBox-X 視窗冷啟動／讀第三槽／事件互動、遊戲專用畫格、同址不停模記憶體對照、測後六檔 SHA-256 還原。Test Results: `z_289`／`z_292–293` 時條件為 1，`z_294` 返回室內時為 0；六檔還原為基線 SHA-256。Research Findings: `39(75)` 在此案例與場景 75 候選條件變更一致。Known Limitations: 場景／事件映射為 Synthetic State；尚未親自走入場景 75。Unverified Assumptions: EnCondition 0 對全部場景的可進入語意、其他 opcode 39 參數變體。Next Recommended Tasks: 實際入口驗收，並按採樣表繼續逐 opcode 原版對照。

## 原版事件 636／497 的局部分支與數值驗證（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；完整指令清單與轉換邏輯仍未驗收。

Completed Tasks: 原始事件 636 的 `43(110,6,0)` 使用無 ID 110／ID 110 ×1 兩種隔離第三槽前置，觀察到不同對話。原始事件 497 在取得 ID 57 提示關閉前後，唯讀比較同一執行中主角紀錄，候選品德 50→49，與末段 `37(-1)` 相符。每案只保留一個精確 DOSBox-X 視窗，結束後依 manifest 還原六個第三槽檔案。

Files Changed: `docs/validation/opcode-43-dos-observation.md`、`docs/validation/opcode-37-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、`tools/analyzer/scan_dosbox_process_memory.py`、本檔；其餘本階段未提交變更仍保留。Tests Executed: DOSBox-X 2026.10.01 冷啟動、隔離第三槽讀取、原版事件互動、遊戲專用畫格、執行中記憶體唯讀前後對照、六檔 SHA-256 還原核對。Test Results: ID 110 缺／有分別顯示不同對話；同一主角候選位址在事件 497 取得提示仍開啟時為品德 50，關閉後為 49，聲望維持 0。

Research Findings: 43 在此事件依道具是否持有分支；37 在此事件使主角候選品德減一。Known Limitations: 場景／事件映射及道具前置為 Synthetic State；未逐指令 trace；只驗證這兩個局部案例。Unverified Assumptions: 43 對零數量的判斷、37 上下界與其他參數、尚未實測的 opcode。Next Recommended Tasks: 按逐 opcode 採樣表持續原版執行對照；對 15／83 做限定範圍 trace；證據不足的轉換維持局部停止。

## 原版單指令事件 692／825／828（最新）

Phase: Phase 1／2 原版執行證據。Status: **局部完成**；整體 opcode 驗證仍未完成。

Completed Tasks: 在隔離第三槽分別將同一 NPC 指向未修改的原始事件 692、825、828。原版事件 692（opcode 51）顯示多段人物對話；事件 825（opcode 52）顯示品德 50；事件 828（opcode 53）顯示聲望 0。三次均只維持一個 DOSBox-X 程序，測後關閉並以 SHA-256 備份還原第三槽。

Files Changed: `docs/validation/opcode-51-53-dos-observation.md`、`docs/research/event-opcode-coverage.md`、`docs/TODO.md`、本檔。Tests Executed: 三次原版 DOSBox-X 冷啟動／讀第三槽／事件互動與遊戲專用畫格；R3 主角候選 stat bytes 讀取；三次 `--restore` 雜湊核對。Test Results: 畫格 `z_240–243.raw1.png`、`z_229.raw1.png`、`z_235.raw1.png` 分別支持上述局部效果；品德候選 offset 948 為 50，聲望候選 offset 954 為 0。

Research Findings: 51 在此案例顯示對話；52／53 的畫面數字與兩個候選角色欄位一致。Known Limitations: 場景／事件映射為 Synthetic State；51 的隨機性和 52／53 的全部數值範圍未驗。Unverified Assumptions: 社群實作的隨機選句方式、原版 51 的所有文本範圍、其他 opcode 語意。Next Recommended Tasks: 使用下方採樣候選表繼續逐 opcode 原版對照；維持單一視窗、可逆存檔及前後狀態證據；必要時追蹤 15／83 的 DOS 指令位址。

## 原版事件 460／675／676、指令 50 矩陣、事件 190／37／497

Phase: Phase 1／2 原版執行證據；Phase 3／6 整體仍未驗收。Status: **部分完成**。原版遊戲內存檔證實事件 460 將場景 32／槽 0 指向 675；非暫停記憶體讀取證實事件 675 執行後同槽為 676。事件 676 的指定指令 50 案例矩陣已實測。原始事件 190 的敗北路徑 `15,83` 兩次導向死亡／讀檔頁。原始事件 37 已完成有／無 ID 173 的指令 18 分支對照。原始事件 497 的首條指令 `2(57,1)` 增加物品。0–67 指令的完整原版驗證仍未完成。

Completed Tasks: 建立可逆的隔離第三槽合成起點及 SHA-256／offset manifest；單一 DOSBox-X 視窗中觸發場景 23／32 的事件槽 0；確認原版存檔 R 欄位順序為 Y、X；事件 460 後 D3 byte 140804 從 673 變 675，執行中場景 32 槽 0 從 675 變 676；指令 50 全缺、全有、五種單項缺失、ID 140 零數量、反向槽順序、額外 ID 200 全部取得畫面及唯讀背包證據；原始事件 190 的 1 HP 敗北路徑重播兩次，均顯示死亡／讀檔頁；原始事件 0 的 `0,-1` 對照仍在場景；原始事件 37 有 ID 173 時事件槽 37→`-1`，無 173 時顯示不同對話且槽仍為 37；原始事件 497 首條指令增加 ID 57 ×1。畫格保留在 ignored 本機目錄，詳見四份 opcode DOS observation。

Files Changed: `tools/analyzer/prepare_synthetic_event_slot.py`、`tools/analyzer/scan_dosbox_process_memory.py`、`tools/analyzer/build_original_opcode_replay_plan.py`、`scripts/Capture-DOSBoxX-GameFrame.ps1`、`scripts/Send-DOSBoxX-RightClick.ps1`、`docs/validation/opcode-2-dos-observation.md`、`docs/validation/opcode-50-dos-observation.md`、`docs/validation/opcode-15-dos-observation.md`、`docs/validation/opcode-18-dos-observation.md`、`docs/validation/opcode-15-50-cases.md`、`docs/research/event-opcode-coverage.md`、`docs/research/event-opcode-replay-candidates.md`、`docs/research/opcode-15-50-status.md`、`docs/decisions/0039-reversible-event-sampling.md`、本檔及 `docs/TODO.md`。其他先前未提交檔案保留原狀。

Tests Executed: 原版 DOSBox-X 2026.10.01 隔離第三槽反覆冷啟動／讀檔／事件互動；原版遊戲內存檔前後 D3 位元組與 SHA-256 比對；不停模唯讀 `ReadProcessMemory` 搜尋事件槽／背包；每組測後 `--restore` 雜湊核對；靜態採樣表生成並核對 68 列；Python 語法與 `git diff --check`。Test Results: 指令 50 指定案例矩陣均與畫面／狀態相符；事件 190 兩次敗北後均到死亡／讀檔頁；事件 0 返回室內且仍可移動；事件 37 的有／無 ID 173 對照出現不同對話與事件欄位結果；事件 497 從無 ID 57 變為 `(57,1)`，畫面顯示取得提示。DOSBox-X state 讀回仍不可靠；未使用凍結或 breakpoint。事件 37 與 497 測後均已關閉唯一視窗並還原第三槽。

Research Findings: `R3.GRP` offset 4/6 是候選 My/Mx，已由遊戲內存檔與相鄰入口切場景交叉核對；scene 23／32 的候選進入條件原值 1，在合成副本設 0 後可從相鄰格進入。執行中背包有一份會變的候選副本及一份保持載入值的副本。事件 676 的條件在本案例接受 `(140,0)`，反向槽序與無關 ID 200 不妨礙成立。事件 37 有／無 ID 173 走不同分支。事件 497 以第一條 `2(57,1)` 增加活躍背包項目。Known Limitations: 場景入場、事件改指向與背包／HP 為 Synthetic State；自然可達性及入場條件 1 的解鎖規則未證實；只取得少數 opcode 的局部 DOS 案例。Unverified Assumptions: `83` 是否為原版 opcode 15 參數、15 是否消耗它、後續 7 是否執行，以及所有未實測 opcode 的語意。Next Recommended Tasks: 針對 15／83 做限定範圍 DOS 指令 trace；擴充逐 opcode 原版實驗矩陣；在證據足夠時實作 adapter。

## 遊戲內進度一恢復（最新）

Phase: Phase 1／2 原版互動查證。Status: 在唯一新 SDL2 session PID 15196 由原版主選單載入進度一，已到大地圖；opcode 15／50 原版效果仍未驗證。Completed Tasks: 確認標題畫面；一次 Down 前後畫格比對證實反白由第一列移至「載入進度」第二列。進入載入選單後以畫格亮度確認第一列「進度一」，送 Enter；log 實際開啟 `s1.grp`、`d1.grp`、`r1.grp`，取得大地圖基線 `z_045.raw1.png`。Files Changed: PROGRESS、TODO、DOSBox-X 驗證紀錄。Tests Executed / Test Results: 單一隔離原版互動讀檔、日誌與遊戲畫格核對，成功載入進度一；沒有執行自動化測試。Research Findings: event 676 仍需事件 460→675 啟用鏈，當前只是可重播起點。Known Limitations: 尚未到達 opcode 15／50 觸發點；DOSBox-X state 讀回在 SDL1／SDL2 都曾崩潰。Unverified Assumptions: 現有進度一是否自然可到達這些事件，需依原版路線驗證。Next Recommended Tasks: 以進度一作大地圖起點，確認路線與事件旗標，依 `docs/validation/opcode-15-50-cases.md` 執行可到達案例；日常觀察保持遊戲執行，只有二進位追蹤或完整記憶體差分時短暫凍結。

## SDL1 slot 3 保存與讀回結果（最新）

Phase: Phase 1／2 原版執行環境。Status: 已成功保存 SDL1 模擬器 slot 3，但同 build 讀回後 DOSBox-X 以 `0xc0000005` 崩潰；目前沒有遊戲視窗。Completed Tasks: 找到獨立程序 PID 9152 的 `Save state` 註解對話框，留空按 OK；產生 `save/3.sav` 451,838 bytes，SHA-256 `A55E6B6D47AB6B0677E9444D905A7510BF227C6004A3D5EE6E53153A879515AF`。同一 SDL1 PID 9760 載入 slot 3，log 記錄 `Loaded. (Slot 3)`；隨後視窗消失，Windows Application Error 1000 記錄 19:59:14 `0xc0000005`。Files Changed: PROGRESS、TODO、DOSBox-X 驗證紀錄。Tests Executed / Test Results: 真實 SDL1 state save/load、狀態檔 hash、程序／視窗與 WER 核對；保存成功，恢復可玩進度失敗。Research Findings: 保存註解框是獨立 PID/HWND，僅擷取主遊戲視窗會漏掉。Known Limitations: SDL1 及 SDL2 均曾在 state 載入後崩潰；原因尚未定位。Unverified Assumptions: 尚不能判定崩潰是 DOSBox-X 本體、此遊戲或目前設定組合造成。Next Recommended Tasks: 不再用損壞的 state restore 當事件採樣前置；在單一新 session 以原版遊戲內進度檔讀取，再以不暫停的畫面／記憶體觀察執行 opcode 案例；另外隔離分析 state crash。

## SDL1 空白狀態槽驗證（最新）

Phase: Phase 1／2 局部原版執行環境。Status: 單一 DOSBox-X SDL1 session PID 9760 仍在標題畫面；slot 3 已選取，但 Save state 未產生檔案，讀回尚未執行。

Completed Tasks: 確認標題畫面及唯一視窗。由原生選單確認 slot 2 已選、slot 3 空白；選取 slot 3 後，日誌記錄 `Active save slot: 3 [Empty]`。動態解析並送出 Save state menu command 5199，另依選單快捷鍵對精確 HWND 送 F11+S；兩次均未產生 `save/3.sav` 或保存日誌。異常時以精確視窗 GDI 擷取確認仍是標題畫面，沒有可見警告或備註框。Files Changed: `docs/PROGRESS.md`、`docs/TODO.md`、`docs/validation/dosbox-x-debugger-and-sampling.md`。

Tests Executed / Test Results: 實際 DOSBox-X SDL1 menu／快捷鍵操作、slot 3 檔案與 log 檢查、目標視窗畫面檢查；Save state 未通過。桌面控制工具及 Windows Graphics Capture 在後段回報 `GetCursorPos Access denied`／`CreateForMonitor 0x80070057`；精確視窗 GDI 擷取成功。未執行自動化測試。

Research Findings: slot 3 選槽已成功；單純 Windows `WM_COMMAND`／投遞 F11+S 成功，不代表 DOSBox-X 實際完成保存。Known Limitations: SDL1 slot 3 尚無 checkpoint；既有 SDL2 slot 1／2 載入曾以 `0xc0000005` 結束；尚未進入原版 opcode 採樣。Unverified Assumptions: SDL1 保存命令未生效的原因不明；畫面沒有可見提示。Next Recommended Tasks: 修復精確視窗輸入或切回可用的同 build 控制路徑，先實測一個同 build Save/Load checkpoint，再進行 opcode 15／50 原版案例。異常先看畫面，不連續盲送輸入。

## Load state 警告畫面查證（最新）

Phase: Phase 1／2 局部環境查證。Status: 已查明並取消 SDL2 → SDL1 的跨 build 載入警告，同一 PID 9760 已移除 PAUSED；尚未恢復 checkpoint。

Completed Tasks: 依使用者要求先查看異常畫面。實際警告是 saved `2026.10.01 (SDL2)`、current `2026.10.01 (SDL1)`，選 No 後標題恢復正常，等待中的 HELP 亦輸出至 log。將異常先讀畫面、檢查 modal、載入前核對 SDL build 寫入 ADR0038。Files Changed: PROGRESS、TODO、ADR0038、DOSBox-X 驗證紀錄。

Tests Executed / Test Results: 只對唯一 DOSBox-X 視窗讀取畫面並取消已辨識警告；未送遊戲鍵。以視窗 title 和 log 確認取消後解除等待；未跑自動化測試。Research Findings: 此次非 SDL2 的 PAUSED 是 build mismatch 對話框等待確認。Known Limitations: 先前 SDL2 WER crash 仍未解；不能當成同一原因。Unverified Assumptions: checkpoint 能否由原 SDL2 build 穩定恢復仍待驗證。Next Recommended Tasks: 保持單一 session；同一 build 的 state 與 config 必須配對，不強制跨 SDL 載入；之後再處理 SDL2 restore 與 opcode 採樣。

## DOSBox-X 權限與狀態載入追查（最新）

Phase: Phase 1／2 原版執行環境查證；Phase 3／6 整體未驗收。Status: 已用提升權限方式成功啟動及控制 DOSBox-X；目前只保留一個 session-002 程序 PID 9760，視窗顯示 `PAUSED`。狀態載入是否完成尚未確認。

Completed Tasks: 更正先前把受限權限查不到程序誤判為「已退出」的錯誤。SDL2 build 載入 slot 1 與 fresh slot 2 後都出現 WER `0xc0000005`；非 SDL2 build PID 9760 目前仍活著、視窗可回應，log 停在 `Loading state from slot: 2`。Debugger loopback 連線目前建立，但 HELP 回應尚未取得。沒有新增視窗，沒有送遊戲鍵或擷取圖片。

Files Changed: `docs/PROGRESS.md`、`docs/TODO.md`、`docs/validation/dosbox-x-debugger-and-sampling.md`。此前已有的 opcode 分批報告、決策與 scripts 仍屬未提交工作目錄變更。

Tests Executed: 提升權限程序／HWND／選單唯讀盤點；檢查 DOSBox-X log、WER 1000／1001 與 loopback TCP 狀態；`git diff --check`。未執行遊戲鍵盤操作、圖片擷取或自動化測試。

Test Results: 提升權限程序盤點確認 PID 9760、HWND `0x22086C`，title `DOSBox-X 2026.10.01: Z - 20000 cycles/ms PAUSED`。一般權限的 process lookup 不完整，不能用來判斷提升權限程序已退出。SDL2 版 crash 有 WER 證據；非 SDL2 版目前仍存活且載入結果未定。

Research Findings: DOSBox-X 可由本工具提升權限啟動，因此不需要使用者代開。此次主要阻礙是 SDL2 state-load crash 及非 SDL2 的 paused／loading 未完成，不是啟動權限。現有進度仍保存在 slot 1 與 slot 2 的檢查點檔案中。

Known Limitations: 尚未成功證明從 DOSBox-X emulator state 恢復到可玩進度；Opcode 15／50 的原版效果仍未採樣。現存 PID 9760 未確認是否完成 slot 2 載入，應避免另開視窗或向狀態不明的遊戲送鍵。

Unverified Assumptions: 非 SDL2 build 的 `PAUSED` 可能是載入狀態的一部分，但 log 沒有 `Loaded` 訊息，不能據此當成已恢復。Debugger loopback 已建立不代表 HELP 命令已成功回覆。

Next Recommended Tasks: 先用唯一的 PID 9760 查明目前 debugger 連線／paused 狀態；若不能恢復，記錄並安全結束該 session，再於啟動前先準備好 debugger bridge，單獨測試一個隔離 session 的 emulator-state 存取。成功恢復後才跑可重播案例與 opcode 15／50 採樣。每個鍵盤輸入間隔至少一秒；預期結果不逐次讀圖，只有非預期或模糊時才擷取遊戲畫格。

## DOSBox-X 狀態檢查點與 R3 座標偏移介入測試（前次 session）

Phase: Phase 1／2 局部原版資料格式查證；Phase 3／6 整體未驗收。Status: 只開一個 session-002；確認原版載入介面選取三列且第三列會載入 R3。只改隔離副本 `R3.GRP` offset 6（235→245）後，載入位置／地圖畫面改變；這證實 offset 6 會影響大地圖載入位置，尚未證明欄位軸名與正方向。測試後六個 R3/S3/D3 檔以備份 hash 還原。DOSBox-X 完整狀態保存於 `assets/generated/dosbox-x/session-002/save/1.sav`，981,563 bytes、SHA-256 `73648B6068EA38737266D72845A66AF549D78714E82C3EB8E840AC0021E73747`。唯一測試視窗已關閉，沒有活躍 session。

Completed Tasks: 以精確標題畫面和逐次一列選擇驗證載入介面；DOSBox-X log 確認選第三列實際開啟 `S3.GRP`、`D3.GRP`、`R3.GRP`。建立合成狀態備份，只修改 R3.GRP offset 6，讀回地圖後確認畫面位置不同，並還原 R3/S3/D3 六個檔案至基線 hash。建立 DOSBox-X Capture slot 1 狀態檢查點。移除無法透過原版三列選單選取的合成 R4 檔案，保留 manifest 標示為不可載入測試。

Files Changed: `docs/decisions/0037-nonblocking-dosbox-observation.md`、`docs/decisions/0038-session-state-preflight.md`、`docs/research/original-save-layout-candidate.md`、`docs/research/event-opcode-semantics-second-batch.md`、`docs/research/opcode-15-50-status.md`、`docs/validation/dosbox-x-debugger-and-sampling.md`、`docs/PROGRESS.md`、`docs/TODO.md`。Ignored local evidence: `session-002/save/1.sav`, coordinate-test manifests and frames.

Tests Executed: 沒有執行自動化測試。互動操作以 DOSBox-X 遊戲專用 raw frame 和 log 證據進行；使用者指示每個輸入至少間隔一秒，預期結果不逐步擷取圖片，僅非預期／模糊時才擷取。DOSBox-X save state 儲存已執行，尚未跨冷啟動載入測試。

Test Results: `session-002/dosbox-x.log` 確認 R3 載入。offset 6 單變量修改後地圖明顯不同；基線和合成 raw frames 為 `z_033.raw1.png`、`z_041.raw1.png`，同次操作的 R3/S3/D3 六檔 hash 已全部恢復相同。state slot 1 已存在，檔案 hash/bytes 已記錄。原版選單只觀察到三列，R4 不當作可用槽。沒有操作另一個遊戲視窗。

Research Findings: DOS 執行時對 R3.GRP offset 6 做 10 的差異會改變載入後大地圖角色／底圖位置；offset6 的具體 X/Y 名稱、軸方向、比例仍 Unknown。DOSBox-X 建置版本的 Capture 功能有 Save state／Load state，slot1 成功產生 `save/1.sav`。使用者確認手動 Esc 開遊戲選單和 Exit Y/N；背景 PostMessage 試送 Escape 未能重現畫面，記為輸入自動化限制。

Known Limitations: DOSBox-X slot 1 儲存已產生但尚未由另一啟動 session 成功載入；在驗證前仍不能說 restore path 已實測完整。原版 UI 選槽雖可確認到 R3，原版檔案是否同版本原始上限 exactly 3 仍只依實際循環觀察。R3 offset 6 只驗證影響位置，軸向／命名未明。Opcode 3–15 的 handler 對照為 community 靜態研究，不是 DOS 原版語意驗收。

Unverified Assumptions: DOSBox-X 的 slot1 state file 跨啟動載入後會恢復到相同 R3 合成地圖位置；R3 offset 6 是 community 欄位候選 `Mx`，但真實軸名／方向仍待另一個座標單變量介入確認。Opcode 15 尾字 83 的原版含義，以及 opcode7 和 KDEF terminator `-1` 的差異仍未知。

Next Recommended Tasks: 下一個互動 session 只啟動一個 DOSBox-X，先用 Capture→Load state slot1 恢復進度，檢查輸出／狀態而不重建遊戲存檔。之後使用不同獨立槽／checkpoint 測 offset 4 或另一個候選座標欄位，確定軸方向；避免修改基線。繼續批次完成 opcode 16–67 的來源／控制流靜態矩陣，挑可重播事件驗證 15／50；每鍵至少等 1 秒，圖片只在結果非預期或不明時讀取。

## 存檔欄位測試操作修正（追加）

Phase: Phase 1／2 局部格式查證；Phase 3／6 整體未驗收。Status: 合成 R4 存檔已建立，但槽位導航失敗；DOSBox-X log 明確顯示實際載入 R1，故尚無座標欄位遊戲內證據。一次低權限查詢未找到高權限 PID 21252，被錯誤當成 session 不存在而開出重複 PID 23688；已關閉該重複視窗。使用者隨後關閉所有 DOSBox-X 視窗，因此目前沒有遊戲 session。使用者確認原版 Esc 開啟遊戲選單，選「離開遊戲」後會詢問 Y/N，也可用左鍵選離開；已作為 user-observed evidence 記錄，並取代先前把黑畫面當作未知退出的紀錄。此操作修正已寫入 ADR0038；以後只啟動一個隔離 session，先辨識畫面再送鍵。

Completed Tasks: 確認 community `MenuLoadAtBeginning` 有六項選擇（進度一至五、自動檔），這只描述 community 版本；DOSBox-X log 證實先前載入的是 R1 而非合成 R4。確認並關閉本輪新增的重複 PID 23688。將「低權限找不到不等於 process 不存在、不可因重試建立重複 session」補入 ADR0038。建立 opcode 3–15 第二批來源對照；DOS 行為仍 Unknown。記錄使用者確認的 Esc／退出選單操作。

Files Changed: `docs/decisions/0038-session-state-preflight.md`、`docs/research/original-save-layout-candidate.md`、`docs/research/event-opcode-semantics-second-batch.md`、`docs/validation/dosbox-x-debugger-and-sampling.md`、本進度。

Tests Executed: 未執行遊戲測試；未向任何視窗送鍵。只檢視既有 DOSBox-X log、process/window inventory、本機事件 corpus 與 pinned community handler/dispatcher。

Test Results: 沒有 R4 載入證據；log 反而確認載入 `r1.grp`。合成 R4 座標修改尚未驗證。重複 PID 23688 已關閉；使用者確認兩個遊戲視窗已全部關閉，現在沒有活躍 session。Opcode 15 的 114 筆 candidate args 全為 `83`；社群 Pascal handler 不讀此字、僅顯示失敗畫面並結束當前 event loop。以上是靜態/候選證據，非 DOS 語意驗證。

Research Findings: 載入選單有「進度一、二、三、四、五、自動檔」六列（僅 community source）。原版選取仍須靠本機畫面與實際開啟檔名確認。Opcode 15 候選參數 83 在 corpus 114/114 相同；community dispatcher 只前進一個 word 後 break，handler 為無參數並畫失敗畫面。使用者已確認 Esc 是開啟遊戲選單，離開選項再詢問 Y/N。權限不足造成 PID 查詢失敗時，不應重啟遊戲。

Known Limitations: session-002的選單輸入尚未逐鍵成功確認；未確認 `R4.GRP` 是否能被遊戲載入，未驗證候選 Mx offset 6。使用者確認的退出操作尚無本輪 game-only frame/log capture。Opcode 3–15 社群行為整理不等於 DOS 原版驗證；opcode15 的 83 意義、opcode7與終止符 `-1` 的原版區別仍未知。

Unverified Assumptions: 原版六列載入選單對鍵盤操作方式及選中列視覺標記；合成 R4 的載入相容性與 `Mx` 遊戲座標作用皆未知。所有已知社群 handler 對應的 DOS opcode 行為仍須獨立驗證。

Next Recommended Tasks: 使用者已關閉所有視窗；下一次互動驗證時只啟動一個隔離 session，先 capture title，再逐鍵確認選擇並用實際開啟的 slot 檔名為準。優先驗證合法讀檔與合成 R4；接著建立能重播的 opcode 15 事件案例。繼續逐批完成 opcode 0–67 handler/source 對照，同時將所有 DOS 未驗證項目維持 Unknown；用戶確認的 Escape/Exit 行為已記錄，無需重測該按鍵。

## 存檔欄位定位：離線 bytes 候選地圖

Phase: Phase 1／2 格式查證局部；Phase 3／6 整體未驗收。Status: 本次收到新指令後先確認兩個 DOSBox-X session、精確視窗標題、session-002遊戲畫面與程序回應狀態，再做離線檔案分析；沒有送鍵、凍結或寫存檔。session-002 PID `17944`／HWND `0x330944` 仍在遊戲標題選單。已由本機原始 save bytes 建立背包、角色、隊伍、座標與武功欄位候選表，不把社群 source 等同原版。

Completed Tasks: 解析 session-002 的 `RANGER.IDX` 實際為24 bytes、六個 little-endian uint32 offsets `[836,59076,97076,101444,114092,114242]`；核對 `RANGER.GRP` 前836 bytes可按12個short header、6個隊伍short及200×4-byte物品記錄整除。當時把角色區間 `[836,59076)` 誤判為280×208 bytes，**已於 2026-11-12 依逐筆姓名改正為 320×182 bytes**；下述基於 208-byte 間距的角色 absolute offsets 均撤回。當時依社群 `TRole` candidate field order 推算基本屬性、武功／等級、內功／等級等欄位；後段偏移仍需原版重查。記錄社群 LoadR 讀8個 IDX offsets、而本機只有6個及路徑不同，明確禁止照社群程式直接寫回。確認 `S1.GRP`、`D1.GRP` 長度與社群陣列大小公式吻合，但語意仍待驗。新增非連續操作前確認即時視窗／畫面／guest狀態的 ADR0038。見 `docs/research/original-save-layout-candidate.md`。

Files Changed: `docs/research/original-save-layout-candidate.md`、`docs/decisions/0038-session-state-preflight.md`、`docs/PROGRESS.md`、`docs/TODO.md`。

Tests Executed: 未執行測試；僅做唯讀狀態檢查、hash／檔案長度及 bytes 結構分析，並擷取遊戲專用原始畫格。

Test Results: session-002程序 `Responding=True`，raw capture顯示遊戲標題選單。RANGER.IDX及GRP、R1.GRP、S1.GRP、D1.GRP的長度和SHA-256已記錄於候選表。沒有修改存檔，也沒有暫停主模擬。

Research Findings: 背包候選區從slot GRP offset36開始，每筆4 bytes，ID/count候選分別為+0/+2；主角候選record0自836起，每筆208 bytes；隊伍表候選在24..35；角色武功ID/level候選在record內130..149及150..169。當前RANGER.IDX實際24 bytes，而社群 Pascal LoadR讀8個uint32，兩者格式不完全相容，需以DOS遊戲前後合法存檔證據裁定。

Known Limitations: 社群 record names/order與本機 bytes尺寸相符，不足以證明原版欄位意義、座標軸、slot ID映射、空白物品處理或事件資料更新。物品數量的memory address尚未定位；也沒有取得加入同伴／學習武功前後存檔差分。session-002的debugger console目前未在其視窗清單中確認；不可用session-001的debugger狀態替代。

Unverified Assumptions: `RANGER.IDX`前六值依序對應角色、物品、場景、武功等段界的解讀；R*.GRP header offsets 2/4/6/8/10分別為場景、地圖或玩家座標欄位；角色索引0為可玩主角；每筆物品欄位是 signed int16 `(ID, count)`；角色record中標準與內功數組的偏移完全相同於community TRole。以上均待實際合法存檔差分確認。

Next Recommended Tasks: 依當下遊戲畫面先逐鍵確認標題選單，不沿用上一輪選項狀態；透過UI建立一個新的合法測試存檔槽及完整before hash。然後每次只改一類狀態（物品、隊伍、武功、座標）並另存到新槽，做前後檔案差分與遊戲畫面核對。若需定位runtime memory address，僅在操作前後完整快照期間短暫凍結，中間保持Running。確認欄位後才實作獨立的 synthetic-save patcher，且只修改副本。

## Opcode 逐項釐清：第一批靜態來源對照

Phase: Phase 3 局部研究；Phase 3／6 整體未驗收。Status: 已完成 0、1、2、16、18、32 六條常見指令的第一輪來源分層；只記錄 FishEdit 候選格式與 `kys-jedisdl` 社群實作，DOS 原版效果仍標為 Unknown。session-002 標題畫面已重啟確認；嘗試 `Down` + `Enter` 後回到 `C:\>`，所以未進入載入選單或進行 opcode 回放。20 個隔離存檔槽檔案 SHA-256 仍與基線一致；無 breakpoint、無存檔寫入。

Completed Tasks: 對照實際處理器與 dispatcher：0 在需要時重建場景再 redraw；1 依模式畫對話並等待按鍵；2 呼叫 32 修改物品後額外畫取得／失去提示；16 檢查六個隊伍欄並回傳分支偏移；18 按物品 ID 是否存在選分支（handler 未檢查數量）；32 執行物品數量增減及整理。擷取六個候選資料樣本的 event ID、KDEF bytes offset、指令 offset、args 與 event SHA-256；清楚標明是 FishEdit 候選解碼。見 `docs/research/event-opcode-semantics-first-batch.md`。

Files Changed: `docs/research/event-opcode-semantics-first-batch.md`、`docs/validation/dosbox-x-debugger-and-sampling.md`、`docs/PROGRESS.md`、`docs/TODO.md`。

Tests Executed: 未執行測試；本次為靜態文件與程式碼查證。另做 session-002 存檔槽 20 檔 baseline SHA-256 比對，以及遊戲專用 raw-frame 擷取。

Test Results: 存檔槽 20 檔全部與 baseline hash 相符；遊戲專用畫面成功擷取，重啟後確認停在標題畫面。標題 `Down` + `Enter` 的結果是 DOS `C:\>`，故按鍵選項解讀失敗，需逐鍵確認。`git diff --check` 通過；僅見工作樹 LF→CRLF 提示。

Research Findings: 在社群實作中，Opcode 2 與 32 不是單純重複：兩者都走物品更新，但 2 會畫提示並等按鍵，32 的 handler 本身不畫該提示。Opcode 16／18 的 handler 回傳偏移量，dispatcher 再加固定指令寬度；此為社群來源控制流，不是 DOS 原版已證明的分支公式。社群 title handler 候選索引是 0=新遊戲、1=載入、2=退出，但 session-002 的 `Down` + `Enter` 實測結果與預期載入不符，不能直接套用此選單模型。

Known Limitations: FishEdit labels 和 Pascal handler 都不能證明 DOS 執行效果。Opcode 18 只出現 2 次。沒有確認可重播存檔、物品記憶體位址、原版按鍵後頁面結果或原版分支目標。標題選單 `Down` + `Enter` 回到 DOS prompt，未辨認選取位置；session-002 已重啟，現停在 title。

Unverified Assumptions: 原版是否與 FishEdit／社群 Pascal 的參數含義、inventory semantics、item-presence predicate 及 relative-branch formula 相同，全部未驗證。

Next Recommended Tasks: 先把 session-002 標題選單輸入逐鍵確認，成功進入存檔選擇後載入既有合法進度；之後挑選可重現且能觀察物品變化的 Opcode 2／32 案例。一般測試保持 guest Running，以遊戲頁面及已知位址的唯讀物品數比較；若位址未知，依 ADR0037 僅在操作前後一致快照期間短暫凍結。另可挑一個隊伍條件或道具條件作分支回放。不可把社群程式碼行為當成測試預期。

## DOSBox-X 自動驗證前置與 Opcode 覆蓋盤點（最新）

Phase: Phase 1／2 原版驗證（debugger 操作前置局部完成）；Phase 3／6 局部研究，整體未驗收。Status: 已建立跨遊戲 DOSBox-X operator skill；逐項釐清事件指令的前置條件已滿足，可以開始，不代表指令語意已驗證。六個指定按鍵於 session-001 可見生效；session-002 debugger TCP PING／EXEC 成功。Debugger console 定向文字讀取與兩個 session 的遊戲畫格擷取已驗證；移除造成反覆中斷的三個暫存 breakpoint，session-002 目前為 Running。清除後鍵盤延遲是否改善尚未重新測試。實際建立新存檔及事件跳轉仍未驗收，因此尚未宣稱全指令可玩。

Completed Tasks: 建立 `session-002` 原版資料副本，核對 20 個 root-level RANGER/R1–R3/S1–S3/D1–D3 存檔檔案 SHA-256 與 session-001 初始副本一致；產生 ignored baseline manifest。新增 DOSBox-X loopback debugger 控制橋、session-002 啟動器、protocol 單元測試。新增 opcode 覆蓋產生器及來源標籤表，盤點 68 個 opcode 的候選字數、FishEdit描述、社群 Pascal dispatcher、出現次數與目前 Runtime 覆蓋。修正文檔先前錯稱 Pascal dispatcher 沒有 opcode 15 的結論。實際 handshake 後 HELP／CPU／BPLIST 有回應；BPINT 21 4B、BP 0160:001D543E 被接受且列在 breakpoint 清單；新增 PING／BREAK bridge 動作。新增 `scripts/Get-DOSBoxX-WindowInventory.ps1` 以 HWND/PID/title/class 對應兩種視窗，及 `scripts/Capture-DOSBoxX-GameFrame.ps1` 以精確 HWND 擷取遊戲畫格；session-001、session-002 在 Run Normal 下均成功產生 game-only PNG。Session-002 用戶端 Run Normal 後標題改變，工具重列視窗後使用新標題成功擷取，並觀察到 foreground HWND 擷取前後相同。以 BPLIST 確認並移除本次建立的三個臨時 breakpoint，清單現為空。定立非暫停式觀察規則：一般驗收優先唯讀記憶體物品數與頁面變化，勿用 breakpoint 暫停主模擬；見 ADR0037。新增並安裝跨遊戲技能 `~/.codex/skills/dosbox-x-operator`，涵蓋啟動、操作、遊戲畫格、debugger 與記憶體觀察。盤點 1,018 個事件已有候選指令切分、來源版本／bytes／offset／hash 與引用結果；確認可開始逐 opcode 語意釐清，見 `event-opcode-coverage.md`、`full-original-event-corpus.md`。透過定向 accessibility 讀取 debugger console 文字，取得 resize surface 記錄與 Running 狀態。

Files Changed: `~/.codex/skills/dosbox-x-operator/SKILL.md`、`~/.codex/skills/dosbox-x-operator/agents/openai.yaml`、`tools/validator/dosbox-x-debugger-control.mjs`、`tools/validator/dosbox-x-debugger-protocol.mjs`、`tools/analyzer/build_event_opcode_catalog.py`、`scripts/Start-DOSBox-X-Session-002.cmd`、`scripts/Send-DOSBoxX-Key.ps1`、`scripts/Get-DOSBoxX-WindowInventory.ps1`、`scripts/Capture-DOSBoxX-GameFrame.ps1`、`tests/unit/dosbox-x-debugger-protocol.test.mjs`、`docs/validation/dosbox-x-debugger-and-sampling.md`、`docs/research/event-opcode-coverage.md`、`docs/research/opcode-15-50-status.md`、`docs/decisions/0036-dosbox-x-event-sampling.md`、`docs/decisions/0037-nonblocking-dosbox-observation.md`、本進度及 TODO。`assets/generated/dosbox-x/session-002` 只為 ignored 本機資料，未加入版控。

Tests Executed: debugger protocol Node unit tests；完整 Node unit suite；Python unit suite；shared JSON Schema 匯出同步；session-001/session-002存檔檔案雜湊對照；FishEdit 0.72 指令表形狀及全部事件記錄統計；loopback PING／HELP／CPU／BPLIST／BPINT／BP／BREAK 真實 debugger 請求；git diff whitespace check。

Test Results: debugger protocol unit tests 3/3 通過；完整 Node suite 67/67 通過。Python 14/14 通過（TMP/TEMP 指向工作區暫存目錄後）。Skill creator 的 `quick_validate.py` 因目前 Python 環境缺少 PyYAML (`yaml`) 未能啟動；已對全域安裝的技能做標題／frontmatter／placeholder 手動結構檢查通過。68 條候選 opcode 切分覆蓋 1,018 events、13,315 opcode 指令和 1,018 個 `-1` 結尾記錄。DOSBox-X 鍵盤輸入以 elevated PowerShell 將 WM_KEYDOWN／UP 投遞至精確視窗：方向鍵在 session-001 選單與地圖產生可見反應，Enter 開啟進度槽並載入既有進度一，Esc 後畫面轉黑（語意未知）。session-002 debugger TCP command/BPLIST 成功。Session-002 GUI Run Normal 後 console 出現 I->／(Running) 交替，使用者回報鍵盤延遲；BPLIST 確認 `BP 0160:1D543E`、`BPINT 21`、`BPINT 21 AH=4B` 三個 breakpoint。依次 BPDEL 後 BPLIST 空，accessibility console 顯示 `(Running)`；鍵盤清除後尚未重測。raw capture helper 先因舊 DEBUGGER 標題遭安全拒絕，再以更新後的精確標題成功產出 session-002 `z_001.raw1.png`（11,559 bytes），檢視為原版標題畫面；foreground HWND 擷取前後 `0x2042C` 相同。debugger console accessibility text read 取得 surface resize 記錄。沒有新建存檔。pnpm typecheck／build 先前被工作區 realpath EPERM 阻擋。

Research Findings: DOSBox-X 2026.10.01 官方 debugger README 提供 `BP`、`BPINT`、`BPLIST`、`RUN`、`MEMREAD` 與 loopback 控制協定。遊戲原始 DOS 副本把 RANGER/R1–R3/S1–S3/D1–D3 存檔檔案放遊戲根目錄；社群 Pascal `LoadR`/`SaveR` 使用 `save/` 目錄，路徑差異不可直接混用。Opcode parser 只做結構/對話引用；通用 game-core IR 也不等於原版 opcode adapter。FishEdit文件只提供 43 條語意描述，全部 DOS 執行效果仍未知。Opcode 7 在645處後面還接其他候選記錄共643處，不能把整個線性資料尾端都丟棄；完整Runtime要保留尾碼並建模分支可達性。

Known Limitations: 本輪按鍵畫面驗證使用 session-001 的既有進度一；session-002 已在 Run Normal 下成功擷取原版標題畫面，但移除測試 breakpoint 後的鍵盤反應尚未重測；尚未在該 session 建立新存檔。`BP 0160:1D543E`、`BPINT 21`、`BPINT 21 AH=4B` 曾造成反覆停住/恢復的合理解釋，已移除且 BPLIST 為空。Break acknowledgement 未能藉單步證明 CPU 停止。Esc 後黑畫面狀態未判明是切換、淡出或退出。桌面控制器 API 仍被 access denied 阻止，但精確視窗 PostMessage 路徑在可見 session-001 可用。社群引擎存檔 offset 不能直接當 DOS 原版已驗證規格。dialogue-only parser 只讀Opcode 0/1，且僅容許 7 或 -1 是末字，並不建模 Opcode 7 在事件中間的 control flow；其餘Opcode效果未接入Runtime。Opcode 15／50 的原版行為仍未知。

Unverified Assumptions: `BREAK` acknowledgement 是否讓 runtime 從 RUN 狀態停住仍未確認；Esc 後黑畫面原因未知；存檔可否透過合法狀態複製出特定事件前置尚未確認。

Next Recommended Tasks: 開始逐 opcode 語意釐清，不等待整套參考引擎或 15／50 結案。先建立每條指令的參數欄位、來源、讀寫狀態、分支／控制流、可見效果、信心等級與可重播案例；候選寬度及社群程式碼只作線索，不標成原版驗證。一般案例保持運行，以唯讀物品數與頁面差異取證；只有指令追蹤／反組譯或完整操作前後記憶體差分定位時才依 ADR0037 短暫凍結。為後續狀態效果的原版驗證，另行建立合法遊戲存檔並定位物品數記憶體；這些工作不阻擋已有來源的 opcode 逐項分析。未知指令須隔離，不阻擋其他已能取證的指令。

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

## 2026-11-11：opcode 50–67 靜態對照與操作規則

Phase: Phase 3 局部研究；Phase 3／6 整體未驗收。Status: 完成 50–67 最後一批 community source 靜態比對；原版執行語意仍為 Unknown。

Completed Tasks: 逐條記錄 opcode 50–67 community handler 的候選參數寬度／出現數、讀寫或分支效果、畫面／音效／輸入等待及 dispatcher 前進方式。釐清 opcode 50 有五物品檢查與擴展指令兩種來源路徑，opcode 65 在該 dispatcher 只有一字跳過而無 handler，opcode 62 是此區段唯一明確結束事件迴圈的 opcode。依使用者操作規則記錄每個鍵盤輸入至少間隔一秒；預期操作不逐次擷取圖片，只在觀察不符或不明確時讀取遊戲畫格；回到已保存進度優先使用 DOSBox-X Capture state，而非重建遊戲存檔狀態。

Files Changed: `docs/research/event-opcode-semantics-fifth-batch.md`、`docs/PROGRESS.md`、`docs/TODO.md`。

Tests Executed: 靜態核對 pinned Pascal handler／dispatcher、FishEdit候選寬度與本機 opcode 覆蓋數；檢查行號引用及文件 diff。未啟動 DOSBox-X、未讀取圖片、未執行遊戲測試或程式測試。

Test Results: `git diff --check` 通過；沒有產生 DOS 原版語意驗證結果。

Research Findings: 社群實作 opcode 50 高參數值走五項物品 ID 檢查，低參數值分派到 `instruct_50e`；opcode 62 進入 ending flow 並停止事件迴圈；65 僅遞增指令索引；其餘記錄見 fifth-batch 報告。以上均非 Original Verified。

Known Limitations: Opcode 15／50 尚未原版重播；狀態恢復仍未驗收。提升權限啟動可成功進入標題頁。SDL2 build 載入 slot 1，以及同程序新存的 slot 2 後都記錄 `Loaded`，接著程序以 WER 1000／1001、`0xc0000005` 結束。非 SDL2 build 的 PID 9760 仍活著且回應，唯一視窗顯示 `PAUSED`，日誌停在 slot 2 `Loading state`；尚無完成或崩潰證據。受限權限的程序查詢看不到提升權限程序，不能以此判斷程序不存在。opcode 來源仍是 pinned community implementation；FishEdit 描述與原版語意可能不同。期間未向遊戲送鍵、未讀取圖片、checkpoint 檔案未變。

Unverified Assumptions: 所有 FishEdit 參數名、候選資料切分、相對分支單位、畫面與 state effect 在 DOS 原版是否相同。

Next Recommended Tasks: 先用提升權限檢查並處理唯一現存 PID 9760：確認 debugger bridge 能否回應、釐清 `PAUSED`／`Loading state` 是否完成；不得因一般權限查不到程序就另開視窗。若需重啟，先保存可用狀態並確保 loopback bridge 在 DOSBox-X 啟動前已監聽。恢復可玩狀態後，以可重播案例採樣 opcode 15／50。每個鍵盤輸入間隔至少一秒；預期操作不讀圖，只在非預期或模糊時擷取遊戲畫格。之後把逐 opcode 的來源、bytes、state effects、Original 驗證狀態合併成總矩陣。
