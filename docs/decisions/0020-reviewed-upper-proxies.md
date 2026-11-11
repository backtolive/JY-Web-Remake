# ADR 0020：上層資源逐圖分類後才套用幾何

Date: 2026-11-03。Status: Accepted for scoped proxy preview。

11 個上層資源分為草叢、高草、樹、欄杆／立柱、石頭及告示牌片段。本輪只開放兩個欄杆類原創 proxy；其餘 9 個資源保持 needs-model 或 needs-grouping，明確診斷，不套用通用牆模型。

prepare-ground-preview 的 --upper-rules 載入版本化覆核表，核對 scene、重複圖號、圖片引用、狀態與幾何契約。每個 review 保存 Inferred 等級、來源資源／偏移／雜湊；bundle 保存覆核表 SHA256。欄杆方向／厚度為原創測試值，不能視為原版物理尺寸。

預設地面包不變，顯式啟用後內容版本改為 0.2.0、生成獨立 hash 檔；保留 blocked，不產生 collider 或新增通行規則。原版圖片及衍生資料持續不公開；獨立 Mock 測試不依賴玩家檔案。
