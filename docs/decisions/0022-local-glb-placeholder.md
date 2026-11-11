# ADR 0022：以內嵌占位 GLB 驗證模型替換路徑

Date: 2026-11-03。Status: Accepted for scoped local preview。

以自行產生的八面體石頭 GLB 驗證真正 mesh 載入，與既有程序化地板／欄杆／告示牌共存。此為 Mock 佔位，非精細生成模型或原版石頭還原；不呼叫外部生成服務。

LocalModel v1 保存穩定 assetId、GLB data URI、SHA256、明確 scale／offset／Y rotation。GLB 與 geometry 不可同時指定。App 在改變場景前檢查格式、雜湊與預算；拒絕外部 uri，限定內嵌資源 GLB，避免載入本機包時額外抓取外部資源。此檢查不是完整 glTF 合規驗證或模型安全認證。

使用同版 @babylonjs/loaders 8.32.0 官方載入器，renderer 回傳 ready Promise，SceneView 等待模型完成再標記 ready。載入失敗明確進 fallback，不偷偷換方塊；渲染器清理場景／資源。模型不產生或覆寫 collider，mesh.checkCollisions=false，核心依舊使用獨立地圖資料。

先採 JSON 包內嵌 GLB 方便本機選檔與雜湊驗證；單檔 GLB 同時輸出供檢視。批次模型快取、LOD、URL／檔案群組匯入、貼圖串流、骨架／動畫與精細模型驗收待後續。不改網站預設 Mock，不打包商業資料。
