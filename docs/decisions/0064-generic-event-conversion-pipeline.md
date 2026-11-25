# ADR 0064：通用事件轉換管線與受控事件 Runtime 擴展

日期：2026-11-25。狀態：Phase 3／6 局部採用；完整原版規則與自然可達性仍未驗收。

在 ADR 0062 的來源鎖定案例 adapter 之後，1,018 筆 KDEF 事件的 68 個 opcode 中已有 54 個具備本地 DOS 前後值或社群 Pascal 來源（`references/kys-jedisdl/kys_event.pas`）證據。本輪建立 `tools/extractor/convert_original_events_generic.mjs`，把這 54 個 opcode 映射為受控事件步驟，讓僅含已證 opcode 的事件可以批量轉為有效內容包；其餘 14 個未證 opcode（4／15／19／24／25／30／44／51／57／58／60／61／62／64）阻擋該事件並附診斷，不影響其他事件。

## 映射分層

- Tier 1（本地 DOS 證據）： opcode 2／16／18／20／21／23／26／27／28／29／31／32／34／36／37／39／42／43／45／46／47／48／49／55／56／59／63 的效果與條件語意來自本專案 DOS 驗證紀錄，標籤 Community Implementation 或 Verified Original（opcode 55 槽欄 2 檢查，事件 464 已 trace）。
- Tier 2（僅社群來源）： opcode 0／1／3／5／6／7／8／9／10／11／12／13／14／17／33／35／38／40／41／50／52／53／54／65／66／67 依 `kys_event.pas` 的 handler 實作映射，標籤 Community Implementation；沒有 DOS 前後值的保持 no-op decide 並記入 `uninterpreted` 診斷。
- 未證： 14 個阻擋 opcode 不出現在內容包；事件整體被擋，不提交部分狀態。

## 步驟生成

每條指令產生一個步驟（no-op 與效果走 `decide`，對話走 `say`，menu 5／9／11 走 `choice`，條件分支走 `branch`，戰鬥 6 走 `invoke`），最後附加 `end`。指令索引與步驟索引 1:1，FishEdit 候選 branch target（word offset）經 `wordOffset → instructionIndex` 映射重寫為 step index。TALK token 轉為對話文字，speaker 以 say 指令的 portraitId 記錄為 `Portrait n`。

## Runtime 擴展

為承載批量轉換，受控事件與決策引擎加入三項通用能力，皆有專責單元測試：

- `branch` 步驟：`{ op:'branch'; condition; yes; no }`，條件為決策條件，真假決定跳轉目標；內容驗證加入 JUMP_TARGET 檢查。
- `keyFrom` 動態 key：`DecisionRef.keyFrom` 接受最多 8 個 literal／read 部件，以 `/` 組合成 key；read 部件必須是靜態引用。用於 opcode 3 的 `-2`（當前場景）與動態槽位場景寫入。
- `patchList` 效果：依 index 寫入稀疏清單，超過 `domain.maxItems` 時以 `'0'` 補位並失敗 `PATCH_INDEX`；用於隊伍六格等固定長度清單。
- `listSize` 條件：清單長度與運算子比較；用於 opcode 20 滿隊檢查。

新增 `schemas/decision-condition.schema.json`（`decisionConditionSchema`）並由 `tools/validator/export-schemas.mjs` 匯出；`controlled-event-content.schema.json` 的步驟 `oneOf` 加入 `branch`。

## 產物與診斷

內容包 id `original.jy.events`，事件 `original.jy.events:event/{id}`、對話 `original.jy.events:talk/{id}`，分類 `original-derived`；決策領域為 `original.jy:party`、`original.jy:inventory`、`original.jy:scene-slots`、`original.jy:scene-records` 及 12 個角色欄位領域。輸出寫入 git-ignored 的 `assets/generated/original-events/`，含內容包與診斷 sidecar；本機輸出 732 轉換／286 阻擋／1,822 對話，opcode 標籤 Community Implementation 6,025、Inferred 1,198、Unknown 1、Verified Original 23。

## Fresh-State 執行相容

Web 預覽與 `tools/analyzer/verify_original_events_preview.mjs` 都以全新決策狀態（全零、空隊伍）獨立執行事件，因此轉換器做兩項相容調整（不改變有狀態的遊玩行為）：

- 物品領域 `original.jy:inventory` 的 min 改為對稱 `-1,000,000`：消耗效果（負 add）在全零狀態不會 `DECISION_VALUE_RANGE`；正式遊玩由遊戲起始狀態注入真實數值。
- opcode 21 離隊效果改發帶 `contains` 守衛的 plan case：成員在隊伍中才 `listRemove`，否則 no-op（社群來源未定義「移除不在隊者」的行為，標籤 Inferred）；避免空队伍的 fresh-state 預覽 `DECISION_LIST_MISSING`。

驗證結果：732 筆轉換事件全部可由 fresh-state 驅動至終止狀態（對話續行、選單取第一項、戰鬥模擬勝利、選擇取第一候選），`verify_original_events_preview.mjs` 通過。

## 技能、隨身物品與 opcode 50 狀態領域

在 fresh-state 預覽之後，依社群 Pascal 來源（`references/kys-jedisdl/kys_event.pas`）把三個原本 no-op 的 opcode 建成真實狀態效果，標籤 Community Implementation：

- **技能**（opcode 33 學會、35 寫槽）：角色有 10 個技能槽（`Magic[0..9]`／`MagLevel[0..9]`）。新建 `original.jy:skill`（技能 ID，0＝空槽）與 `original.jy:skill-level`（層級）兩個領域，key 為 `original.jy:skill/{role}/{slot}`。opcode 33 以每槽交錯的 plan case 重現 Pascal 單迴圈掃描：已持有該技能時 `層級 = min(層級+1, 10)`，空槽時寫入技能與層級 1；opcode 35 在 `magiclistnum` 0..9 時直接寫該槽，超出範圍時找第一空槽、否則回退槽 0（Pascal 的 `MagLevel[10]` 越界 bug 以槽 0 層級近似）。層級領域範圍寬（max 1,000,000），因為 opcode 35 會把層級寫成任意值（語料中 900／100），上限 10 只由 opcode 33 的 plan 強制。
- **隨身物品**（opcode 41）：角色有 4 個隨身格（`TakingItem[0..3]`／`TakingItemAmount[0..3]`，-1＝空）。新建 `original.jy:carried-item`（物品 ID，-1＝空）與 `original.jy:carried-item-amount`（數量）兩領域，key 為 `original.jy:carried/{role}/{slot}`。plan 分兩組重現 Pascal 雙迴圈：先掃四格找既有同物（增加數量），再找第一空格（寫入物品與數量）。
- **opcode 50 動態變體**：`list[0] > 128` 時是「五件物品（args 0..4）全在背包」的條件分支，yes／no 目標由相對跳轉 `wordOffset + 8 + list[5]`／`list[6]` 計算並映射到 step index；`list[0] <= 128` 的 50e 參數解算器仍標 no-op 並記入診斷。唯一使用者事件 676 因 opcode 44 被阻擋，故此映射目前未在輸出中出現，由單元測試以事件 676 的相對跳轉落點（ opcode 32 獎勵／opcode 1 對話）驗證。

驗證結果：全 Node 134/134、fresh-state 732/732 終止；技能／隨身／opcode 50 的 plan 結構與目標落點各有專責單元測試。

## 場景 `-2`（當前場景）動態 key 追蹤

之前場景 `-2`（當前場景）以固定 `current` key 近似，場景切換不追蹤。本輪改為動態解析：

- 新建 `original.jy:current-scene` 領域（整數，唯一 key `original.jy:scene/current`），由遊戲狀態在場景切換時寫入目前場景編號。
- `-2` 的槽位引用改用 `keyFrom` 組合 key：`literal 'original.jy:scene'`＋`read current-scene`＋`literal slot/{n}/field/{m}`，執行時解析到實際場景（例如 `original.jy:scene/32/slot/0/field/0`）。
- `original.jy:scene-slots` 的 `allowedKeys` 不再包含 `current` 佔位 key，改為「明確場景 key」加「`-2` 用到的 slot/field 組合 × 全部 84 個場景」（RANGER 場景記錄數），並去重（runtime 要求 allowedKeys 無重複）。
- 影響 opcode 3（slotWrite 全欄位）、26（slotAdd 欄位 2-4）、27（slotSet567 欄位 5-7）、55（slotField2 條件）；語料中 `-2` 寫入共 2,167 條、660 筆事件。
- 標籤 Inferred：場景編號範圍與「`-2` 解析為當前場景」依社群 Pascal 來源（`scene := -2` 分支）與 RANGER 84 場景記錄，未逐事件 DOS 重播。

驗證：專責單元測試以 current-scene 預設 32／17 驅動含 `-2` 寫入的事件，全部寫入落於對應場景 key 下；fresh-state 732/732 終止。

## 14 個阻擋 opcode 依證據解鎖（全量 1,018 筆轉換）

在 `-2` 動態追蹤之後，依社群 Pascal 來源與本機 DOS 觀察紀錄把最後 14 個 opcode（4／15／19／24／25／30／44／51／57／58／60／61／62／64）全部映射，內容包改為 **1,018／1,018 筆轉換、0 阻擋、2,866 對話**：

- **opcode 4**（167 事件，`[inum,jump1,jump2]`）：`instruct_4` 比對 `inum = CurItem`（目前使用／選取的物品）。新建 `original.jy:current-item` 領域（key `original.jy:item/current`），映射為該物品 ID 的 branch。事件 16 的 ID 160 有／無對照已有本機 DOS 證據（`docs/validation/opcode-4-dos-observation.md`）；「CurItem＝持有」為推論，標籤 Community Implementation。
- **opcode 15**（95 事件，恒為 `[83]`）：死亡結局（`instruct_15` 顯示「地球上又多了一失蹤人口」後停止）。109 筆在事件中段出現，故映射為 `end` 步驟（即時停止事件迴圈）；`83` 的具體作用未驗（本機二進位 trace 只確認 handler 讀取該 word）。
- **opcode 19／25／30**（14／26／7 事件）：玩家移動、鏡頭平移、角色行走——純宿主呈現效果，決策狀態無對應領域，映射為 no-op decide 並記入 `*-unmodeled` 診斷。
- **opcode 24**（0 事件）：Pascal 空函式（「never be used」），映射為 no-op。
- **opcode 44**（2 事件，6 參）：兩槽圖號動畫（欄 5 由 beginpic 逐幀至 endpic），最終持久值為 endpic；映射為對當前場景兩槽欄 5 的 set（事件 676 的 7578／7622 已在 DOS AVI 觀察到中間影格 7560／7606）。
- **opcode 51**（1 事件，無參）：隨機 softstar 對話（`instruct_1(SOFTSTAR_BEGIN_TALK + random(...))`），對話 ID 不在 KDEF bytes，無法確定性重現，映射為 no-op＋診斷。
- **opcode 57**（1 事件，無參）：固定動畫＝`instruct_27(-1, 7664, 7688)`＋`instruct_44e(2,7690,7746, 3,7748,7804, 4,7806)`；最終值（槽 -1 欄 5-7＝7688、槽 2/3/4 欄 5＝7746/7804/7862）與事件 655 的 DOS 觀察完全吻合。
- **opcode 58**（1 事件，無參）：15 場隨機對手連戰（敗北→死亡）；連戰鏈與隨機對手未建模，映射為 no-op＋診斷（事件 936 進入可操作戰鬥已有 DOS 觀察）。
- **opcode 60**（3 事件，`[snum,enum,pic,jump1,jump2]`）：槽位圖號任一欄（5/6/7）等於 pic 的 branch，`snum=-2` 走當前場景 keyFrom；事件 990 的 6068/6066 對照已有 DOS 證據。
- **opcode 61**（14 事件，`[jump1,jump2]`）：當前場景槽 11..24 欄 5 全為 4664 的 branch（14 項 `all` 條件）；事件 1001 的 0/4664 對照已有 DOS 證據。
- **opcode 62**（1 事件）：結局動畫＋結束事件迴圈；映射為 `end` 步驟（動畫狀態未建模，記入診斷）。
- **opcode 64**（1 事件，無參）：隨機商店購買（Pascal：選單＋物品+1＋銀兩-價格）；隨機商店與 DOS 觀察的未扣款異常使確定性映射不成立，映射為 no-op＋診斷。

驗證：全量 1,018 筆事件皆可由 fresh-state 驅動至終止狀態；事件 676 解鎖後，opcode 50 的物品持有分支首次出現在內容包輸出中，由單元測試驗證。

## 限制

- 場景 `-2` 已改由 `current-scene` 領域動態解析，惟正式遊戲的場景切換寫入尚未接入（預覽／驗證由外部預設）；`-2` 的欄位規則未逐欄隔離。
- opcode 3／26／27 的槽位欄位寫入是 Inferred，不是 Verified Original。
- 銀兩與物品「持有」以數量 ≥1 近似成員判斷；技能（33／35）、隨身物品（41）已建狀態領域，opcode 50 動態變體已映射為分支，惟 50e 參數解算器（`list[0] <= 128`）仍為 no-op。
- opcode 4 的「目前使用物品」以 `current-item` 領域近似「持有」；19／25／30（移動／鏡頭／行走）、51（隨機對話）、58（連戰鏈）、64（隨機商店）的宿主效果未建模為決策狀態，僅 no-op＋診斷；62 的結局動畫狀態未建模；15 的 `83` 作用未驗。
- 社群 Pascal 語意等同原版 DOS 的假設未逐事件重播自然可達性；1,018 筆全量轉換不等於原版規則驗收。
- Web 宿主已提供本機唯讀預覽（`apps/web/src/original-events-preview.tsx`）：玩家手動選檔載入內容包，逐事件操作對話／選項／分支／決策效果，戰鬥為模擬結果；這是內容預覽，非完整原版遊玩，不影響預設 Mock。
