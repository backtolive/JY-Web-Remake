# 本機占位 GLB 驗證 — 2026-11-03

Phase: 7／8 局部。Status: GLB 產生、來源 ID 映射、遊戲載入及基本尺度驗證完成。非精細模型或最終畫風驗收。

## 使用

```powershell
.venv/Scripts/python.exe tools/extractor/decode-scene-region.py original/dos
node tools/extractor/prepare-ground-preview.mjs original/dos --rock-model
```

本機輸出 assets/generated/ground-preview/mock-rock-9fb063cffa6c8aed.glb（1,288 bytes）及 ground-d4aa3b43baa00c48.local.json。後者使用遊戲既有「匯入本機地圖區域預覽」載入。輸出僅留 Git 忽略目錄；JSON 含原版衍生資訊，不發行。

## 契約及來源

tools/extractor/placeholder-rock.mjs 自行產生 glTF 2.0 GLB：24 個不共用頂點、8 個三角面、法線、純色 PBR 材質；原點位於底部中心，單位包圍盒 1×1×1。材質非金屬、roughness=1。無外部貼圖／骨架／動畫，不包含商業圖片。

同一穩定視覺 ID `authored.placeholder:rock` 綁定本機原版圖號 2984／SMP001 索引1492，縮放 (0.7,0.4,0.6)，offset=0。來源類別 rock 為前輪圖片檢視的 Inferred；模型則是 Mock 占位，沒有從原圖片推導體積。來源檔與圖片證據雜湊沿用轉換器核對，模型另有 SHA256。

現有範圍 64 地板、6 欄杆／立柱、1 告示牌、1 GLB 石頭；剩餘 6 類資源未呈現。包版本 0.4.0。圖號 3002 的另一種石頭仍未映射。--rock-model 包含 upper-rules，較早預覽包維持不同內容 hash。

App 驗證 GLB magic／version／chunk 長度、metadata／變換、SHA256、外部 uri、有限模型／部件數；模型 SHA 不符時保持先前 session。LocalModel 最多約 3 百萬字元 data URI，最多32實例；目前拒絕 required extensions，僅作受限預覽，不代替完整 glTF validator。loader 使用官方 8.32.0，與 core 同版；套件及 lock 已更新。

renderer 以獨立 transform parent 設定世界位置、縮放與朝向，等待 ImportMeshAsync 結束才 ready。模型 mesh 不啟用物理碰撞，沒有拿 GLB collider 改核心。載入出錯清理場景並顯示 fallback。

## 驗證與限制

43 Node、8 Python、typecheck／Schema／build／artifact 通過。新增 Mock Node 以官方 loader＋NullEngine 實際讀 GLB，確認24頂點／8面及單位 bounds；測試損壞 header、外部 uri、錯誤變換／hash拒絕與碰撞不變。模型無索引 buffer，面數以頂點數／3核對。

完整 Chromium 11 passed（22.3秒）exit0，包含 Mock hash拒絕／保持session、GLB ready、原版選區模型及既有回歸。Mock 案例再移除遮擋用的高牆幾何（保留邏輯阻擋），增加實際畫布石頭像素檢查，單獨重跑1 passed（3.5秒）exit0。Mock及原版選區截圖均 view_image 檢視，確認低模石頭可見。

已知限制：每實例分別載入，尚無共享快取／LOD；純色小模型，不含精細材質、風格一致性或多角度藝術驗收。載入器增加 build modules（819），產物103檔，現有 chunk 大小提示仍存在。核心原版規則與整體 Phase 8 未驗收。

## 精細化替換路徑

保留穩定 assetId 與來源映射；先讓新模型對齊底部中心、Y向上、單位尺寸與共同材質風格，再換 dataUri／sha256 及必要 scale／offset。每次替換須重新驗證 bounds、方向、遮擋、效能與同場景視覺一致性，不改邏輯地圖。這次只有技術路徑，沒有一鍵精細化服務整合或資產管理器。
