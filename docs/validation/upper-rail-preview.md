# 上層欄杆規則預覽 — 2026-11-03

Phase: 3／7／8 局部。Status: 分類及兩種欄杆 proxy 完成，非完整美術還原。

命令：`node tools/extractor/prepare-ground-preview.mjs original/dos --upper-rules`。先備條件與地面預覽相同，須有本機 RLE manifest。輸出 assets/generated/ground-preview/ground-83a358887eb1d936.local.json，明確 Git 忽略；使用遊戲現有「匯入本機地圖區域預覽」載入。

結果：64 個地板、6 個上層欄杆／立柱實例；未映射資源由 11 種減為 9 種。blocked 與地面單獨預覽相同，沒有修改原始資料或核心規則。逐圖片分類見 research/scene1-upper-classification.md。

測試：38 Node、8 Python、Schema、typecheck、build／artifact、diff 通過。新增 Mock 測試覆蓋分類來源、確定性／碰撞不變、重複規則、缺圖片證據、非法幾何與 pending 狀態附帶幾何拒絕；覆核表測試鎖定 11 筆及只開放欄杆。完整 Chromium 8 passed（18.1 秒），exit 0；實際截圖 view_image 檢視可見地面邊緣欄杆，UI 顯示 9 種未呈現資源。重跑同一路徑、既存檔逐 bytes 核對通過。既有 Babylon chunk 提示保留。

限制：只有 box、純色、原創方向及尺寸，未驗證背面／原版物理比例；欄杆相鄰柱可能重複。草叢／樹／石頭未生成，告示牌需多片分組且不能生成兩面重複牌子。頁面通用 Mock 文案仍有歷史限制，實際 manifest 標示 original-derived。

下一步：分析告示牌兩片的格子／錨點／遮擋關係，定義可追溯的多格資產群組，再用原創幾何建立單一告示牌 proxy。材質／UV 及植被模型另行製作，不為了填滿畫面而猜測。
