# 共用地面材質 — 2026-11-04

> 2026-11-04 使用者已否決地面色族合併策略；本檔地面部分僅為歷史實驗，現行流程見ADR0032及validation/independent-ground-review.md。LOD檔案分析仍有效。

Phase: 8局部。Status: 第一份共用草土base-color材質已接入原版8×8選區，樹木換成後處理成功LOD0。

## 使用與產物

匯入遊戲的本機地圖區域預覽：

`assets/generated/ground-material/scene1-ground-d7acf49a5e2ef85e.local.json`

貼圖`olive-grass-soil-v1.png`，1254×1254、2,938,369 bytes，內建image_gen生成。完整提示詞與模式見../art/ground-material-prompt.md。

地面GLB 2,953,580 bytes；64格／128三角形／1材質／1張內嵌貼圖，2格一個重複週期；地面逐格圖號及位置保留groundReferences。整包9,529,509 bytes，未超16MB。原版來源包與輸出分開、碰撞保留；其他上層仍有占位。

```powershell
node tools/extractor/prepare-art-sample.mjs assets/generated/ground-preview/ground-e06ef553b5bc969e.local.json assets/generated/art-sample/plan-lod0.local.json
node tools/extractor/prepare-ground-material.mjs assets/generated/art-sample/scene1-art-64ee2bd0a44b5ac1.local.json assets/generated/ground-material/olive-grass-soil-v1.png
```

同輸入重跑同hash及bytes。單張原始生成圖未修改像素，PNG儲存成本偏高，未完成壓縮與mipmap記憶體效能調整。

## LOD大小查證

工具`tools/analyzer/glb-budget.mjs`直接讀GLB JSON及bufferViews計算。以下bytes皆實際檔案，不以面數估算大小。

| 模型 | 三角形 | 幾何bufferViews bytes | 圖片bufferViews bytes | GLB bytes |
| --- | ---: | ---: | ---: | ---: |
| 樹raw | 37452 | 2123664 | 408820 | 2534272 |
| 樹LOD0 | 7998 | 476500 | 2200628 | 2678808 |
| 石raw | 21884 | 662384 | 199920 | 864068 |
| 石LOD0 | 7999 | 200794 | 1078728 | 1281140 |

raw各內嵌兩張JPEG；LOD0包含一張PNG及一張JPEG。樹PNG 1,906,006 bytes、石PNG 936,715 bytes，幾何縮小但貼圖增大。僅此資料不能斷言每張圖片的品質或GPU記憶體成本；未將壓縮檔bytes當作解碼大小。

樹最新Job快照succeeded；其LOD0/1/2大小2,678,808／2,462,288／2,347,180 bytes；岩石LOD0/1/2大小1,281,140／1,185,400／1,135,604 bytes。舊樹失敗紀錄由先前驗收保留，新狀態不回寫歷史。

## 驗收與限制

55 Node、typecheck、build／artifact通過；新Chromium地面實景驗收1 passed（5.9秒），實際頁面／GLB ready且無pageerror／alert，view_image檢視scene1-shared-ground.png，同場看到材質與成功LOD0樹石。公開build107檔、商業資源0，既有Babylon chunk提示不變。

本輪僅底色貼圖，未生成normal／height／roughness maps；roughness固定1、metallic固定0。地面色族與平滑混色為原創設計，不能當原版地形類別還原。生成提示要求無縫，但影像邊界未宣稱數學週期保證；遠景未見明顯格線，近景／更大區域重複感仍待評估。地面合併不代表可碰撞模型；仍依原格位資料通行。剩餘草、樹、牌、欄杆與人物仍需統一美術。

Next Recommended Tasks: 先評估這份共用地面色調及重複尺度，之後處理路面／石板材質與欄杆；材質壓縮與LOD貼圖共享另立預算。
