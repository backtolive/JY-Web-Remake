# ADR 0068：物品圖示提取與預覽（imageRef＋圖集）

日期：2026-11-26。狀態：Phase 3 資料讀取／轉換＋Phase 5 Web 預覽；圖示來源與格式依社群 Pascal/Lua/C（Community Implementation），並對本地 bytes 全量解碼視覺驗證。引擎內容只帶 `imageRef` 命名空間 ID，不讀圖檔 bytes。

承 ADR 0064/0065，本輪把物品圖示接入通用轉接器與 Web 預覽。調查（見 `docs/PROGRESS.md` 2026-11-26 ALLDEF 條目與 `tools/analyzer/probe_pic_atlas_items.mjs`、`verify_item_icon_block.mjs`）確認：

- 物品圖示**不在** ALLDEF.GRP（那是場景事件槽表），而在**分割的 map-pic 圖集**：world `WMP000-025`／`WDX000-025`、scene `SMP000-083`／`SDX000-083`。
- 邏輯索引 `3501 + itemNumber`（Pascal `ITEM_BEGIN_PIC=3501`，kys_type.pas；`DrawMPic` kys_main.pas；Lua `LoadThingPic` mode 0，jyconst.lua:601-602）。
- IDX＝累積 end-offsets（piccache.c:132-135；pic i 佔 `[idx[i], idx[i+1])`）；API picid÷2（piccache.c:188）。
- 圖示＝1728B、40×40（Lua `ThingPicWidth/Height=40`）；格式 `[w/h/xoff/yoff:2×4]`＋逐行 RLE（transparent run、solid run、palette index）＋`MMAP.COL` 256×3 RGB palette（768B）。

**兩圖集對 item 199 的證據不一致**（本輪實測，`verify_item_icon_block.mjs`）：

| 圖集 | entries | 物品圖示 | 缺 |
|---|---|---|---|
| world `WDX000` | 3701 | 198（物品 0..197） | 198、199 |
| scene `SDX000` | 3983 | 199（物品 0..198） | 199 |

兩圖集共有的 198 張（物品 0..197）**像素完全相同**。物品 199（「最後」）在兩圖集 slot 3700 皆空。因物品選單在場景內運作且 scene 圖集最完整，**以 scene 圖集（SDX000/SMP000）為權威來源**。

## 決策

- **`imageRef`（內容層）**：轉換器對解碼成功的物品（0..198）寫入 `imageRef: original.jy.events:pic/item/{id}`（通用命名空間 ID，符合 schema `id` pattern）；item 199 slot 空 → 不寫 `imageRef`。`imageRef` 只是 ID，**引擎內容不含圖檔 bytes**；解析/定位屬預覽層。
- **圖集 PNG（轉換器產物）**：轉換器讀 scene 圖集＋palette，解碼 199 張圖示，打包成**固定網格**（20 欄×10 行，cell 40px → 800×400 RGBA）寫成 `original-events-{digest}.item-icons.png`（git-ignored）。空 slot（item 199）保持全透明。用自製 `tools/extractor/png-encode.mjs`（純 `node:zlib`，無第三方相依）編碼。
- **來源雜湊入診斷**：`diagnostics.itemIcons` 記錄 scene/world IDX＋GRP、palette 的 SHA-256、logical base（3501）、icon size（1728）、網格佈局、present/missing 清單，及 world 缺 198 的註記。
- **Web 預覽**：`original-events-preview.tsx` 新增「載入物品圖集（PNG）」；載入後以 canvas 依網格切出每物品 40×40 → dataURL，顯示於「使用物品」縮圖與可點擊圖示網格（點點選取為使用物品）。網格佈局（20 欄）屬預覽層常數，不在內容。

## 與原版的差距／限制

- **圖集來源**：以 scene 圖集為權威；world 圖集缺 item 198（世界地圖不顯示該物品圖示）。兩圖集共有圖示像素相同，故選擇無影響（僅 item 198 多一張）。
- **palette**：`MMAP.COL` 為 scene/world 共用 palette（Community Implementation）；未對全部 110 個圖集檔逐一解碼，僅 scene-0／world-0 全量解碼 200 slot。
- **透明判定**：以「RLE 是否寫入該像素」判定透明（非以 RGB 為 0），避免純黑 palette 色誤判。
- item 199 無圖示為本地 bytes 實測（兩圖集 slot 3700 皆空），非推論。

## 產物與驗證

- 內容包 digest `662ce189fa32e198`（1,018 事件／200 物品／199 個 imageRef／item 199 無）。
- 單元 147/147（新增：轉接器 imageRef 釘選 0/110/160/198 有、199 無＋provenance＋PNG 尺寸；`png-encode.test.mjs` 簽章/IHDR/尺寸/越界）；root＋web typecheck；schema:check；web build。
- 全量 fresh-state 驅動 1,018/1,018 達終態（`verify_original_events_preview.mjs`）。
- Web 預覽瀏覽器實測：載入內容包＋圖集，200 張圖示網格渲染，點選 item 110 顯示縮圖（金蛇劍）＋名稱。

## 順手修訂

- `App.tsx` 原版事件包載入檢查 `schemaVersion!==2` → `!==3`：controlled-event-content schema 為 v3（`controlled-event-schema.ts` `schemaVersion:{const:3}`），舊檢查使 v3 內容包無法載入，也阻擋本輪圖示預覽。
