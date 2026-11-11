# ADR 0017：場景 RLE 解碼與圖層語意分離

Date: 2026-11-03。Status: Accepted for scene 1 scoped evidence。

自行實作嚴格 RLE 解碼、PNG RGBA 匯出與區域合成，拒絕超界、缺資料、尾端殘留與不支援色盤。僅處理已核對的場景 1 專用 SDX001／SMP001 選定資源；不修剪容器尾端，不宣告其他場景已支援。

實際區域輸出包含樹木、告示牌、欄杆／階梯；building layer 是繪圖／資料分類，並不保證是牆體。維持資源 ID → 明確視覺分類 → primitive／模型／材質的流程。規則尺寸與材質保持原創定義，碰撞保持邏輯獨立；圖片包圍盒或繪圖高度都不直接決定模型體積。

只在忽略的 assets/generated/scene1-rle 寫出本機 PNG 與來源 manifest，不提交或發行原版圖片，不上傳模型生成服務。完整驗證見 validation/scene-region-rle.md。
