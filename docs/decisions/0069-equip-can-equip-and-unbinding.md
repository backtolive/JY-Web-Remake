# ADR 0069：裝備／修煉互斥解綁與 CanEquip 資質門檻（內容效果層）

日期：2026-11-26。狀態：Phase 6 宿主命令基礎契約延伸；語意依社群 Pascal `CanEquip`／`UseItem`（Community Implementation），對本地 RANGER bytes 實測欄位偏移與門檻值。

承 ADR 0067 的 `EQUIP`／`PRACTICE` 宿主命令（只做兩個寫入），本輪把 Pascal 的兩個未建模行為接入內容效果層：**互斥解綁**與 **CanEquip 資質門檻**。

## 原版語意（社群 Pascal，Community Implementation）

`CanEquip`（`references/kys-jedisdl/kys_main.pas:4671-4730`）依角色屬性與物品 `Need*` 欄判定「此人不適合裝備此物品」：

```pascal
if sign(Ritem[inum].NeedMP) * Rrole[rnum].CurrentMP < Ritem[inum].NeedMP then Result := False;
// …同形：NeedAttack/Attack、NeedSpeed/Speed、NeedAptitude/Aptitude 等 12 個 Need* 欄
// 內力性質：if (MPType < 2) and (NeedMPType < 2) and (MPType <> NeedMPType) then Result := False;
// 專用人物 OnlyPracRole、武功數 ≥10 等額外規則（本輪未建模）
```

`sign(NeedX)*Attr < NeedX` 的雙向語意：**正值＝下限**（屬性 ≥ NeedX）、**負值＝上限**（屬性 ≤ −NeedX）。`UseItem` type 1/2（kys_main.pas:4546-4639）在寫入前做**互斥解綁**：

```pascal
if Ritem[inum].User >= 0 then Rrole[Ritem[inum].User].Equip[p] := -1; // 解綁前使用者的目標槽
if Rrole[rnum].Equip[p] >= 0 then Ritem[Rrole[rnum].Equip[p]].User := -1; // 解綁該槽原物品
```

## 決策

- **`canEquip`（物品定義層）**：`ItemDefinition` 新增可選 `canEquip: { mp?; attack?; speed?; aptitude?; mpType? }`，宣告物品的 `Need*` 門檻（轉換器從 RANGER `TItem` 欄位實測產出）。這是**內容規則**，引擎不硬編碼。
- **`roleAttributes`（裝備宣告層）**：`EquipmentDeclaration` 新增可選 `roleAttributes`（mp/attack/speed/aptitude/mpType →「域＋key 模板」，模板用 `{role}`）。引擎以動作角色代入得具體 key，**保持對角色屬性命名零依賴**；物品有 `canEquip` 但宣告缺 `roleAttributes` → `EQUIP_NO_ATTRIBUTES`。
- **CanEquip 門檻（宿主命令）**：`EQUIP`／`PRACTICE` dispatch 在寫入前讀角色屬性、依 `sign` 雙向語意與內力性質規則判定；未達門檻 → `EQUIP_CONDITION:{attr}`，**不寫任何狀態**（Pascal `CanEquip` 包住整個寫入）。
- **互斥解綁（結構性不變量）**：解綁是裝備綁定的**結構性不變量**（非逐物品內容），由宿主命令在兩個寫入**前**讀當前綁定、條件清空（前使用者的目標槽、該槽原物品），與兩個寫入**同一次 `applyDecisionTransaction` 原子提交**。讀取的是寫入前值。
- **轉換器**：RANGER `TItem` 欄位偏移實測（`kys_type.pas`：`NeedMPType@138`、`NeedMP@140`、`NeedAttack@142`、`NeedSpeed@144`、`NeedAptitude@162`）；只對裝備（type 1）且 `Need*` 非零者寫 `canEquip`；宣告 `roleAttributes` 指向 `original.jy:role/{current-mp|attack|speed|aptitude|mp-type}`。

## 明確不建模（與原版差距）

- **8 個 `Need*` 欄**（UsePoi/Medcine/MedPoi/Fist/Sword/Knife/Unusual/HidWeapon）：對應角色屬性不在決策狀態（`ROLE_FIELDS` 未含），故不建模；若日後補入角色屬性域再擴充。
- **OnlyPracRole（專用人物）與武功數 ≥10／武功等級規則**：需物品 `Magic` 欄與角色武功陣列，屬更深的內容規則，未建模。
- **負值門檻的「資質」語意**：Pascal 對負值做「類似資質」處理（上限），本契約以 `attr ≤ −need` 表之，Community Implementation。

## 產物與驗證

- 內容包 digest `7a02a5cb3cc7b0e4`（1,018 事件／200 物品／**20 個 canEquip**／roleAttributes 已宣告；金蛇劍 110 `canEquip {mp:50, attack:50, mpType:2}`）。
- 單元 148/148（新增：`controlled-event.test.mjs` CanEquip 門檻 pass/fail＋負值上限＋無 `roleAttributes` 拒絕＋EQUIP/PRACTICE 互斥解綁；`original-events-generic-converter.test.mjs` `canEquip` 釘選 110 有／160 無＋`roleAttributes` 宣告＋`canEquipCount`）。
- root＋web typecheck；schema:check（`controlled-event-content.schema.json` 重新匯出）；web build。
- E2E（`tools/analyzer/verify_can_equip_e2e.mjs`）：原版包 fresh-state EQUIP 110 → `EQUIP_CONDITION:mp`；屬值 60/60/2 → 寫入；EQUIP 106 覆蓋 110 → `itemUser[110]=-1`；PRACTICE 58 覆蓋 57 → `itemUser[57]=-1`。
- Web 預覽瀏覽器實測：選 item 110 顯示「裝備資質（CanEquip）：內力 ≥50、攻擊 ≥50、內力性質=2」；空狀態按「裝備」→ `CONTROLLED_EVENT_EQUIP_CONDITION:mp`。

## 限制

- CanEquip 只覆蓋 5 個有角色屬性域欄的 `Need*`（mp/attack/speed/aptitude/mpType）；其餘 8 個與 OnlyPracRole／武功數規則未建模（見上）。
- Web 預覽以**空狀態**（屬性 0）試算 CanEquip，未提供角色屬性輸入；故大多數裝備在預覽中會被拒（符合「空狀態無屬性」的原版語意）。
