# 選區完整占位覆蓋 — 2026-11-03

Phase: 3／7／8 局部。Status: 場景1選區所有資源有占位映射，非原版還原或完整Phase8驗收。

## 使用

```powershell
.venv/Scripts/python.exe tools/extractor/decode-scene-region.py original/dos
node tools/extractor/prepare-ground-preview.mjs original/dos --all-placeholders
```

輸出本機 ignored `assets/generated/ground-preview/ground-51937fcc7335d108.local.json` 及三類Mock GLB；使用遊戲「匯入本機地圖區域預覽」選取JSON。包0.5.0，來源metadata及平均色仍為原版衍生資訊，不加入公開網站。

## 覆蓋與尺寸

- 21個ground ID → 64塊原創地板。
- 2個欄杆／柱ID → 6個規則組合。
- 2個告示牌片段ID → 1個可回溯群組。
- 7個草／樹／石頭ID → 14個GLB實例：10草叢、2樹、2石頭。
- 合計32個layer／resource ID均有明確覆蓋，85個視覺實例，unmapped=0；原始86次圖像放置中的兩片牌子合成一個實例。

placeholder-vegetation.mjs自行產生實體六邊錐組合：樹為樹幹與三層樹冠，草為4個傾斜窄錐；含法線與粗糙純色PBR材質，不讀原圖像素。底部Y=0、原始高度1；草scale高度0.3／0.35／0.65，樹scale高度2.5／2.3，均原創測試值。石頭復用既有八面體，第二圖號用較小scale。尺寸不由原圖包圍盒或來源高度推導。

catalogue保存7個來源圖號與3個穩定assetId、對應GLB hash與scale；轉換器另保存catalogue SHA256、圖片證據／原始檔SHA256及既有逐格偏移。CLI重跑必須相同bytes。原始22個blocked格完全保留，未因草叢看起來柔軟就改為可通行。

## 呈現與驗證

初次view_image發現高樹樹冠被畫面上緣裁切。已修正renderer的區域模式：等待GLB完成後讀world bounding boxes，投影到目前camera view，依視窗aspect留邊取景；resize再計算。一般無regionCells的場景仍沿用既有鏡頭。

新增Node測試以官方loader實際讀草／樹GLB，確認法線有限、底部0／高度1、roughness=1；catalogue測試驗證確定性、7個綁定共用3種資產、重複／未知類別／非法scale拒絕。既有碰撞對照繼續回歸。新增optional本機E2E檢查完整包ready、占位說明、沒有未映射提示，並檢查canvas上緣沒有被裁切葉片。完整結果記於PROGRESS。

限制：低模占位、純色，不代表原版樹種／石形或最終畫風；沒有貼圖／UV、LOD、共用載入快取或植被動畫。高模型可能遮擋角色，取景修正不等於已完成遮擋淡出或多視角驗收。zero unmapped不能當作原版規則／完整場景驗收。

Next: 以完整占位選區做尺寸與遮擋檢查，再決定角色遮擋提示／淡出、材質風格與精細資產替換。批次擴大其他場景前，先保留逐格式來源驗證與未支援診斷。
