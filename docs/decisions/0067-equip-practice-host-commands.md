# ADR 0067：裝備／修煉宿主命令契約（EQUIP／PRACTICE）

日期：2026-11-26。狀態：Phase 6 宿主命令基礎契約；語意依社群 Pascal `UseItem`（Community Implementation），`CanEquip` 資格判定與互斥解綁未建模。

承 ADR 0066 的 `USE_ITEM`，本輪把社群 Pascal `UseItem` 的 type 1（裝備）與 type 2（秘笈）子流程建模為宿主命令。原版流程（`references/kys-jedisdl/kys_main.pas:4546-4639`）：

```pascal
// type 1 裝備
p := Ritem[inum].EquipType;
if (p < 0) or (p > 1) then p := 0;          // 2 槽（kys_type.pas Equip array[0..1]）
if CanEquip(rnum, inum) then
begin
  if Ritem[inum].User >= 0 then
    Rrole[Ritem[inum].User].Equip[p] := -1; // 解綁前使用者
  if Rrole[rnum].Equip[p] >= 0 then
    Ritem[Rrole[rnum].Equip[p]].User := -1; // 解綁該槽原物品
  Rrole[rnum].Equip[p] := inum;
  Ritem[inum].User := rnum;
end;
// type 2 秘笈：同形，PracticeMagic 為單一 smallint（無槽）
```

`CanEquip`（kys_main.pas:4671 起）依 MP／攻擊／速度等屬性與物品 `Need*` 欄判定「此人不適合裝備此物品」——那是內容規則，不在宿主命令內。

## 契約

- **內容宣告目標**：`controlled-event-content`（v3）新增可選 `equipment`，含三個綁定（各為「域＋key 模板」）：
  - `slots`：每角色裝備槽（Pascal `Rrole[r].Equip[p]`），模板用 `{role}`／`{slot}` 佔位
  - `practice`：每角色修煉槽（Pascal `Rrole[r].PracticeMagic`），模板用 `{role}`
  - `itemUser`：每物品「目前由誰使用」（Pascal `Ritem[i].User`），模板用 `{item}`
  - 解析期檢查：`EQUIPMENT_DOMAIN`（域存在）、`EQUIPMENT_TEMPLATE`（佔位僅限 role/slot/item）。
- **宿主動作**：`{ type: 'EQUIP'; itemId; role; slot }`／`{ type: 'PRACTICE'; itemId; role }`。dispatch 規則：
  - 僅允許**無事件游標**時（與 `USE_ITEM` 同列 `USE_ITEM_BUSY`——事件進行中選單關閉）
  - 內容未宣告 `equipment` → `NO_EQUIPMENT`；非整數 → `EQUIPMENT_VALUE`
  - 引擎以動作值代入模板得具體 key，**必須落在目標域 allowedKeys** → `EQUIPMENT_KEY`
  - 成功經一次 `applyDecisionTransaction`（兩個 set 效果：槽位＝物品 ID、itemUser＝角色）原子寫入，發 `DECISION_APPLIED`
- **槽位由宿主提供**（動作的 `slot` 欄），引擎不讀物品定義——保持引擎對物品元資料零依賴；物品定義的 `equipSlot`（轉換器從 RANGER offset 78 的 `EquipType` 產出，依 Pascal 規則_CLAMP 0..1）供宿主 UI 使用。
- **原版內容包**：轉換器宣告 `equipment` 指向 `original.jy:equip`（角色×2 槽）／`original.jy:practice`（角色）／`original.jy:item-user`（200 物品）三個新域。

## 與原版的差距（明確不建模）

- **互斥解綁**：Pascal 在寫入前把前使用者的槽位、該槽原物品的 `User` 設回 -1。本契約只做兩個寫入；解綁是內容效果（可用 `decide` 步驟的 plan 表達），宿主命令不隱式做。預覽/宿主若需原版行為，須在事件腳本補。
- **CanEquip 資格**：屬性門檻判定未建模（內容規則）。
- **type 3 消耗**：`EatOneItem` 已可由事件腳本 `inventoryAdd -1` 表達，不需宿主命令。

## 產物與驗證

- 內容包 digest `5fa0d26941c5178f`（1,018 事件／200 物品／currentItem＋equipment 已宣告）。
- 單元 144/144（新增 EQUIP/PRACTICE 測試：雙寫入、busy、非整數、key 越界、值超範圍、無宣告、域/模板解析失敗、存檔往返）；root＋web typecheck；schema:check。
- E2E（`tools/analyzer/verify_equip_practice_e2e.mjs`）：原版包上 EQUIP 金蛇劍（110）role 0 槽 0＋PRACTICE 玄冥神掌（57）role 0，四筆綁定值與 Pascal 寫入一致。

## 限制

- 装备/修炼的「誰要裝備」選單（Pascal `SelectOneTeamMember`）由宿主 UI 負責；引擎不驗證角色是否真在 party。
- 裝備槽數 2 與 PracticeMagic 單槽是社群 Pascal 的證據（Community Implementation）；DOS 原版未逐筆驗證。
