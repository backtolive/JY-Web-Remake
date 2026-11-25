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

## 限制

- 場景 `-2` 以固定 `current` key 近似，場景切換不追蹤；`-2` 的欄位規則未逐欄隔離。
- opcode 3／26／27 的槽位欄位寫入是 Inferred，不是 Verified Original。
- 銀兩與物品「持有」以數量 ≥1 近似成員判斷；技能（33／35）、隨身物品（41）、opcode 50 動態變體未建狀態領域，映射為 no-op。
- 社群 Pascal 語意等同原版 DOS 的假設未逐事件重播自然可達性；286 筆阻擋事件不轉換。
- Web 宿主已提供本機唯讀預覽（`apps/web/src/original-events-preview.tsx`）：玩家手動選檔載入內容包，逐事件操作對話／選項／分支／決策效果，戰鬥為模擬結果；這是內容預覽，非完整原版遊玩，不影響預設 Mock。
