# ADR 0018：原創規則幾何採多四方體組合

Date: 2026-11-03。Status: Accepted for Mock preview。

新增獨立於 UI／Babylon 的 PrimitiveGeometry v1：mock 或 original-authored 分類、1–32 個 box 部件，每個部件有 width／height／depth、基底中心 offset、Y 軸弧度 rotation 及具穩定 ID 的純色材質。此為原創製作契約，不宣稱原版尺寸。禁止用圖像包圍盒或 layer 4／5 隱式產生模型高度。

區域資源映射可選 geometry 與 baseY；有 geometry 時以明確基底定位，不套用舊 buildingHeight×0.25。舊預覽保留相容。新契約必須檢查版本、尺寸、轉換、材質與部件預算；瀏覽器匯入先驗證再切換狀態。

renderer 只將已定義 box 部件實例化，不生成 collider。載入區域視覺時不將 map.blocked 額外畫成實體牆，避免把碰撞資料誤當美術；核心碰撞與小地圖保留。材質目前只有純色，貼圖、UV、其他 primitive 及 GLB 留待後續。

獨立 Mock workshop 驗證地板／牆／階梯，不含原版資源 ID 或商業圖片。原版 32 張圖片的逐資源分類及尺寸設定仍待覆核，不能把 building layer 全部當牆。
