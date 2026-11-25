# ADR 0066：「使用物品」宿主命令契約（USE_ITEM）

日期：2026-11-26。狀態：Phase 6 宿主命令基礎契約；語意依社群 Pascal 與 opcode-4 DOS 觀察，裝備/修煉/消耗子流程未建模。

承 ADR 0065 的物品定義合約，本輪建立「使用物品」的宿主命令契約。原版流程（社群 Pascal `UseItem`，`references/kys-jedisdl/kys_main.pas:4505-4667`，Community Implementation）：

```pascal
procedure UseItem(inum: integer);
begin
  CurItem := inum;           // 先寫「目前物品」
  case Ritem[inum].ItemType of
    0: //剧情物品  if UnKnow7 > 0 then CallEvent(UnKnow7)
       // 否則在場景中依面向格第 3 層事件 CallEvent
    1: //装备    選隊員 → Rrole[rnum].Equip[p] := inum
    2: //秘笈    選隊員 → Rrole[rnum].PracticeMagic := inum
    3: //药品    選隊員 → EatOneItem + instruct_32(inum, -1)（消耗）
  end;
end;
```

**證據範圍決定本切片只建模第一步**：選單選中 → 寫 `CurItem`。opcode-4 的 DOS 觀察（事件 16／物品 160 正路出對話、物品 0 控制組無對話、**數量不減**）支持「使用動作本身不消耗、效果由事件腳本決定」。

## 契約

- **內容宣告目標**：`controlled-event-content`（v3）新增可選 `currentItem`（靜態決策引用）。內容自己宣告「目前物品」狀態在哪個領域／key；引擎不帶命名约定。解析期檢查 `CURRENT_ITEM_DOMAIN`／`CURRENT_ITEM_REF`（領域存在、key 在 allowedKeys、不接受 keyFrom）。
- **宿主動作**：`{ type: 'USE_ITEM'; itemId: number }`。dispatch 規則：
  - 僅允許在**無事件游標**時（選單在事件之間；事件進行中選單關閉）→ `USE_ITEM_BUSY`
  - 內容未宣告 `currentItem` → `NO_CURRENT_ITEM`
  - 非整數 → `USE_ITEM_VALUE`；寫入經 `applyDecisionTransaction`（set 效果），領域範圍/allowedKeys 驗證 → `DECISION_VALUE_RANGE`
  - 成功發 `DECISION_APPLIED` notice；**不消耗物品**（消耗是事件腳本效果）
- **原版內容包**：轉換器宣告 `currentItem: { domain: 'original.jy:current-item', key: 'original.jy:item/current' }`（opcode-4 管線已用的領域）。

## 附帶發現（本輪探測，Community Implementation）

- `UnKnow7`（RANGER offset 88）是「使用時直接調用事件」欄位（type 0 且 > 0 時 `CallEvent(UnKnow7)`）——即原版數據裡的物品→事件綁定。本地 RANGER 全 200 筆 `UnKnow7 = -1`（`tools/analyzer/probe_item_use_event.mjs`），故本版本**沒有**任何物品走直接事件路徑，全部走場景事件 opcode-4 分支；物品定義的 `useCommand` 維持全空，與 DOS 觀察（物品 160 選後返回場景、無直接事件）一致。
- `type` 欄映射升級為 Pascal case 標籤：0→story、1→equipment、2→secret-manual、3→medicine、4→hidden-weapon（先前 8 筆抽樣推論的 misc/weapon/skill-book/consumable 取代）。
- `Equip`/`PracticeMagic`/`EatOneItem`（type 1/2/3 子流程）與面向格第 3 層事件查找（`SData[scene, 3, x, y]`）未建模；`CurItem` 的重置時機（事件結束後？選單關閉時？）在社群來源無明確證據。

## 產物與驗證

- Web 預覽（`original-events-preview.tsx`）加入「使用物品」選單：以物品定義清單為候選，`USE_ITEM` 寫入後可保留狀態啟動事件（`start` 沿用無游標狀態）；註記更新為全量 1,018 筆。
- 轉換器寫檔時清理舊 digest 產物（讀者假設單一現行包）。
- 內容包 digest `5dd732a9a7bebfa3`（1,018 事件／200 物品／currentItem 已宣告）。
- E2E（`tools/analyzer/verify_use_item_e2e.mjs`）：使用物品 160 → 事件 16 出「我一定是瘋了…」對話；物品 0 控制組無對話——與 DOS 觀察一致。
- 單元 143/143；root＋web typecheck；schema:check；fresh-state 全量驅動。

## 限制

- 裝備（type 1）、修煉（type 2）、消耗（type 3）子流程無宿主命令（需 `EQUIP`／`PRACTICE` 等新命令與裝備領域）；本契約只覆蓋「寫目前物品」。
- 面向格事件自動觸發（type 0 且 UnKnow7 ≤ 0 的原始路徑）未建模；預覽需手動啟動場景事件。
- `CurItem` 重置語意未驗；連用不同物品時後者覆蓋前者（set 語意）。
