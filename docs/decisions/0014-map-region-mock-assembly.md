# ADR 0014：8×8 原版地圖資源 ID → Mock 3D 組裝切片

Date: 2026-11-03。Status: Accepted for minimal slice; not full Phase 3/6/8 completion.

## 決定

- 場景 1「河洛客棧」依實際 bytes 選定起點 (13,28) 的 8×8 區域，保留六層原值、資源 ID、來源偏移、雜湊與解析器版本。
- `extractMapRegion` 純函式負責邊界驗證與擷取；`regionResourceIds` 列出 layer-qualified 來源 ID；`assembleRegion` 以顯式 Mock 映射組裝，未映射 ID 明確診斷。
- Mock 映射與組裝結果與原版資料分離保存；原版衍生產物只留本機，網站與 CI 只含獨立 Mock fixture。
- Web app 新增本機區域預覽載入，Babylon.js 只渲染 Mock 幾何；邏輯碰撞仍由 game-core 管理，視覺幾何不改動 blocked 資料。
- 事件 670／槽 3、4 可達性阻礙保持追蹤，不以移除牆壁繞過，也不阻擋本切片。

## 限制

- 顏色、高度與幾何為 Mock 推測，不宣稱已找到對應原圖或原版 3D 結構。
- 未實作自動圖片擷取、模型生成、驗證、快取與 GLB 映射。
- 原版精確版本、授權、15／50、戰鬥公式與完整事件轉換仍待證據。