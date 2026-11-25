# ADR 0065：通用物品定義合約與 RANGER 物品表轉接

日期：2026-11-25。狀態：Phase 3／6 局部採用；欄位語意依社群來源與 8 筆抽樣，未全量驗證。

承 ADR 0064 的全量 1,018 筆事件轉換，本輪補上物品定義層。原版架構中物品的「使用後效果」不在物品記錄（RANGER 190B 記錄只有靜態資料與修煉增量），而在 KDEF 場景事件腳本（opcode 4 依 `CurItem` 分支）。因此合約分兩層：**靜態識別**（必填）與**宣告式使用**（可選，複用決策 condition/effect schema），且「腳本」與「宣告式」互斥——單一事實來源。

## 合約（engine-owned）

`controlled-event-content` schema 由 v2 升至 **v3**，加入可選 `items`（object map，key＝命名空間化物品 ID，無冗餘 id 欄，與 dialogues/events 同式）：

| 欄位 | 必填 | 說明 |
|---|---|---|
| `name`／`alias`／`description` | name 必填 | 靜態識別；alias 對應原版「名稱2」欄 |
| `imageRef`／`category`／`equipSlot` | 可選 | 圖片引用（原版記錄**無**圖片欄，來源待 ALLDEF 追查）、分類、裝備槽 |
| `stackable`／`maxStack` | stackable 必填 | 疊加語意；`stackable: false` 與 `maxStack` 併存為 `ITEM_STACK_CONFLICT` |
| `useDialogueRef` | 可選 | 使用後顯示文字＝**對話引用**（不內嵌文字，保持引用驗證單一來源） |
| `useConditions`／`useEffects` | 可選 | 宣告式使用合約；陣列複用 `decision-condition`／`decision-effect` schema |
| `useCommand` | 可選 | 指向受控事件（腳本路徑）；與 `useConditions`／`useEffects` **互斥**（`ITEM_USE_CONFLICT`），腳本存在時即為唯一行為來源 |

解析期檢查（`resolveControlledEventContent`）：`ITEM_NAMESPACE`、`ITEM_USE_CONFLICT`、`ITEM_STACK_CONFLICT`、`ITEM_DIALOGUE_REFERENCE`、`ITEM_EVENT_REFERENCE`，條件/效果結構由 Ajv 內容 schema 擋下（獨立 `validCondition`／`validEffect` 為第二層防線）。新增獨立 `decision-effect-v1.json`（`decisionEffectSchema`，與 condition 對稱）並由 `export-schemas.mjs` 匯出。

## 原版物品表轉接器

`convert_original_events_generic.mjs` 新增 RANGER.GRP 物品表解析（offset 59076，190 bytes × 200 筆；佈局依 `references/jinyong-legend/script/jyconst.lua` 的 `CC.Thing_S`，Community Implementation，已以 8 筆抽樣含全部 DOS 觀察案例物品比對本地 bytes，見 `tools/analyzer/probe_item_records.mjs`）：

- 產出 `original.jy.events:item/{id}` 定義：name（offset 2）、alias（名稱2，offset 22，與 name 相同時省略）、description（offset 42）、category（offset 82 類型欄：0→misc、1→weapon、2→skill-book、3→consumable，未知值→`type-{n}`）。
- **use 欄位全部留空**：原版使用效果在場景事件腳本（opcode 4），物品定義不宣告行為——忠實還原。
- `stackable: true` 為全量統一預設（**Inferred**：190B 佈局無逐筆疊加證據）；`imageRef` 無（記錄無圖片欄）。
- 診斷 sidecar 加入 `itemSource`（RANGER.GRP SHA-256、offset、recordSize、recordCount、layoutSource）與 `summary.itemCount`／`emptyItemRecords`。

## 接線約定

事件包的決策 key 與物品定義 ID 的對應為內容層約定：inventory key `original.jy:item/{id}`（domain `original.jy:inventory`）與 current-item 值（domain `original.jy:current-item`，key `original.jy:item/current`）的 `{id}` 即 DOS 物品 ID，host 以 `original.jy.events:item/{id}` 查定義取顯示元數據。轉換器保證：inventory 領域每個 allowedKey 都有對應物品定義（單元測試釘選）。

## 驗證與產物

- 內容包 digest `2f28956a11da4cf6`：1,018/1,018 事件、0 阻擋、2,866 對話、**200 物品**、0 空記錄；`verify_original_events_preview.mjs` fresh-state 全量驅動通過。
- 單元測試 142/142（新增 `tests/unit/item-definition.test.mjs` 5 項契約測試、converter 物品定義測試）；root 與 web typecheck 通過；`schema:check` 通過。

## 限制與未驗

- 200 筆僅抽樣 8 筆逐欄比對；未知5/6/7（offset 84-88）語意未驗；`category` 映射（0-3）為 Community Implementation（8 筆抽樣推論）。
- `stackable: true` 全量預設為 Inferred；武器等語意上不疊加的物品未逐筆標記。
- 圖片欄位無來源（RANGER 記錄無；ALLDEF.GRP 4,400×100 待查），`imageRef` 在原版包一律缺席。
- 原版「使用物品」的宿主命令契約（選單選中→寫 current-item→啟動場景事件）尚未建模，與移動/連戰/商店同列宿主效果缺口。
