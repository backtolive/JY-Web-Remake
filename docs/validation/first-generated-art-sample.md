# 第一批實際生成美術 — 2026-11-04

Phase: 8局部。Status: 兩件帶材質模型接入原版選區，可開始畫面驗收，尚未定稿。

## 使用

遊戲「內容與測試設定 → 匯入本機地圖區域預覽」選擇本機檔案：

`assets/generated/art-sample/scene1-art-412a35fbdc33e3dd.local.json`

相同原版8×8配置；樹木2792／岩石2984改為實際生成GLB，其餘保持原占位。碰撞、事件、入口與存檔內容未重新定義。模型依既有原創尺寸fit，比例尚需美術驗收。

| 項目 | 樹木 | 岩石 |
| --- | --- | --- |
| 原圖 | resource-1396.png，96×160 | resource-1492.png，27×18 |
| 原始SMP001偏移 | 119445 | 154722 |
| Job | f8cec7754ebd4796bf8b599d9a744c10 | c83a1fd3ba424f5c98b49dbc5f79bd6d |
| 生成器 | SPAR3D | SPAR3D |
| seed／貼圖 | 1396／1024 | 1492／1024 |
| 使用產物 | raw_glb | lod0 |
| 大小 | 2,534,272 bytes | 1,281,140 bytes |
| 三角形 | 37,452 | 7,999 |
| 工作狀態 | 推論成功、後處理verify失敗 | succeeded |

樹木後處理錯誤為Triangle count changed on reload，不重試／不宣稱量產品質通過。生成器commit fdc311b16809e6a8adc2f5a3407ebb3db1a95bd1、weight revision 5699918cb34f55cd7d828493d2725f3038313761（服務result紀錄）；不是從第三方參考引擎複製程式碼。模型／權重及原版內容的發布授權仍未完成評估，輸出僅本機。

## 可重現接合

```powershell
node tools/extractor/prepare-art-sample.mjs assets/generated/ground-preview/ground-e06ef553b5bc969e.local.json assets/generated/art-sample/plan.local.json
```

plan／job快照／quality／manifest／GLB都保留同一本機目錄。工具校驗輸入PNG及輸出GLB SHA，保留來源圖片payload hash、原始偏移及證據清單hash。PNG hash與原始RLE payload hash是不同資料，不混為同一個hash。模型推論不保證跨GPU bytes一致；上述接合步驟對同一輸入產物應完全一致。

## 驗收與限制

55 Node、9 Python、typecheck、Schema、build及artifact檢查通過；完整Chromium 17 passed（47.3秒），公開輸出107檔／商業資源0。離線接合重跑同hash／bytes，diff檢查通過。既有Babylon大型chunk提示仍在。

實際Chromium已匯入包、等待模型ready、無pageerror或匯入alert，截圖確認帶貼圖樹木與岩石出現在原配置；不是只檢查檔案置換。截圖保留e2e-results的scene1-generated-art.png及scene1-art-canvas.png。

畫面仍有明顯風格差異：生成樹冠較亮、岩石帶原圖綠色底座，其餘物件／角色及地面是占位。尚未做共同材質校色、UV修整、法線／粗糙度藝術指導、LOD效能或背面品質驗收。網格非watertight不直接影響獨立格位碰撞；不因此宣稱可用於實體物理。

Next Recommended Tasks: 以此實景選定色調與樹／石形狀修整，再製作共同地面、欄杆及剩餘植被；鏡頭旋轉仍暫緩。
