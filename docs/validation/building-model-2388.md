# Building 2388 第一版模型 — 2026-11-04

Phase: 8局部。Status: 生成與世界接入完成；山體偏薄，待美術修整，不擴大批次。

使用「匯入完整世界地圖」選取：

`assets/generated/world-model-2388/world-model-2388-6d7373e5dae33a7e.local.json`

單獨模型：`assets/generated/world-model-2388/building-2388.lod0.glb`。原完整世界包仍可用於回復全原圖顯示。earth／surface維持原圖，其他building也維持原圖。

## 來源與生成

- 圖號2388／MMAP圖片1194，原圖108×102、繪圖偏移(59,101)、MMAP.GRP offset410707。
- 使用者指定此ID，既有LAN服務Job bfee967703174d92856307cc5ed4580e、seed2388、texture resolution1024、asset_type=prop；依實際山體外觀選靜態物件管線，不因圖層名就當房屋。
- 工作succeeded，LOD0 1,138,204 bytes／7,998三角形；LOD1／2亦產出，第一版只接LOD0。沒有使用服務collider改寫遊戲碰撞。
- 同ID共用模型尺度，參考錨點(355,225)來源3×3遮罩定位；等比視覺校準後約寬3.486、高3.296、深0.369格距單位。此數值為候選美術配置，非原版3D尺寸。

## 93個錨點與10種排列

一張圖在世界有93個放置位置。每個位置的buildX／buildY引用它的格位可能不同；共觀察到10種排列。這不是10種山型、模型或比例。

例如9格指向同一座山與只有8格指向它：

```text
AAA      .AA
AAA      AAA
AAA      AAA
```

點只表示不指向此錨點，可能是其他物件引用，不能直接解釋為可通行。這些差異原因仍未證明，因此沒有把模型依mask變形或縮小，也沒有修正任何來源格。

## 重跑接合

```powershell
node tools/extractor/prepare-world-model.mjs assets/generated/world-preview/world-fa9af52a0d2428da.local.json assets/generated/world-model-2388/building-2388.lod0.glb assets/generated/world-model-2388/plan.local.json
```

plan保存Job／SHA／參考錨點，工具驗證服務輸入PNG SHA、輸出GLB SHA及模型內容，確認package與projectedMap.layers完全不變。生成服務的Job／manifest／quality保留同目錄。

## 驗收與品質限制

typecheck／build／artifact、4項相關Node通過；局部Chromium1 passed（6.3秒），模型包載入ready、無pageerror／alert、僅building2388有模型綁定，原始三層及遊戲內容與原世界包完全相同。view_image檢視world-building-2388.png。未跑全圖或完整遊戲回歸。

山體實際有幾何與貼圖，但偏薄；raw推論bounds Z約[-0.0494,0.0623]，寬約1.055，深約0.112，單圖生成未恢復足夠山體體積。第一版校準維持比例，未掩蓋此缺陷。原圖綠色底緣也進入模型。朝向、背面、體積及與原圖的輪廓一致性仍未驗收。

Next Recommended Tasks: 先修整2388的體積、朝向與底緣，驗收後才轉下一個building；earth／surface最後再處理。
