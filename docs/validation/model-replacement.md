# 本機GLB替換與校正 — 2026-11-04

Phase: 7／8局部。Status: 替換／還原及尺寸原點前置完成，未精細生成或最終風格驗收。

## 試玩

1. 執行 `node tools/extractor/prepare-model-replacement-demo.mjs`。
2. 在遊戲「內容與測試設定 → 匯入本機地圖區域預覽」選取 `assets/generated/model-replacement-demo/mock-collision.json`。
3. 選擇視覺資產 `authored.placeholder:rock`，按「匯入替換 GLB」，選取同目錄 `shifted-blue-rock.glb`。
4. 兩顆石頭一起替換，仍留在綠／紅格；可用「還原匯入時的模型」恢復原外觀。

兩份範例均為獨立Mock，不讀或包含原版商業資料。藍色只是辨識替換結果的測試顏色，不代表最終畫風。範例原始石頭仍是既有1288-byte GLB（預設hash不變），替換版刻意放大兩倍並偏移(4,2,-3)，驗證不能直接沿用原檔尺寸／原點。

## 實作與檢查

model-inspection.ts在可拋棄的NullEngine／Scene載入GLB，合併可繪mesh的world bounding boxes，記錄頂點／三角面，完成或失敗都清理資源。無動畫／骨架、非空及預算檢查之後才進入校正。原LocalModel格式／外部URI與hash檢查持續有效，檔案最多2MB、每次最多100000頂點／面。

model-replacement.ts為無UI／Babylon依賴的純資料函式。各軸新scale = 舊模型實際extent × 舊scale ÷ 新模型extent。取新舊bbox底部中心，將縮放後差值依原rotationY旋轉，再加入offset，保留世界底部位置。不同尺寸的相同assetId實例可各自校正；同ID若現有bytes hash不一致則拒絕，以免不明確覆寫。

不修改原GLB檔、來源圖片、地圖、事件或核心狀態。校正前格式／預檢／bounds失敗保持舊模型；renderer最終載入仍沿既有fallback策略。原模型baseline保存為不可變視覺參考，還原不回滾角色位置。更換與還原會重新建置當前3D scene，但保持相同核心state和cutaway選項；本輪依要求不新增旋轉控制。

替換GLB只存在瀏覽器記憶體；目前存檔只保存遊戲狀態及內容組合，不保存視覺試驗。UI已說明刷新需重新匯入。正式資產版本管理、資產包匯出／持久化與任意本機材質檔案群組不在本切片內。

## 測試

- 新增3項Node：實際loader讀偏移／放大GLB、保留原創外框及旋轉實例底部；全實例替換不改來源物件／地圖／序列化存檔；缺ID／歧義hash／退化bounds拒絕。
- 新增E2E：FileChooser匯入Mock預覽、損壞GLB拒絕且位置不變；替換兩實例、畫布藍色像素出現、替換前後下載存檔bytes相同；裝飾可穿透／紅格阻擋、還原後藍色消失且位置保留。
- 本輪55 Node、9 Python、typecheck、Schema、build／artifact、diff通過；完整Chromium16 passed（43.7秒）、exit0。兩張替換／還原截圖已view_image檢視。範例工具重跑bytes一致、輸出Git忽略。新增預檢模組採動態載入，artifact107檔；既有Babylon chunk提示保留。

## 限制與下一步

逐軸fit可能拉伸新模型，不代表藝術比例正確。此輪只用簡單無貼圖Mock驗證，未實測精細PBR材質、內嵌大型貼圖、LOD或多硬體效能。2MB為目前切片限制，完整精細資產需另訂貼圖／面數／記憶體預算；不因功能存在便批次接受所有生成結果。

下一步先選一個資產建立共同尺寸、底部原點、朝向、粗糙度／色彩及細節密度的驗收樣本，再檢查替換後與整個占位場景的風格一致性。原版還原證據與原創重建尺寸繼續分開，不啟用鏡頭旋轉。
