# ADR 0030 — 第一批原圖生成美術候選

日期：2026-11-04。狀態：採用於本機畫面驗收，非最終美術定稿。

使用者要求停止擴充占位測試，開始替換實際美術，並明確允許把 resource-1396／1492 PNG 傳至既有 LAN 服務 http://192.168.31.254:8765。此次授權範圍為這兩張圖片，不自行延伸成任意外部服務或全量素材外送。

以場景1 (13,28) 8×8完整占位包為基底，只替換 building tile2792（圖片1396）及2984（圖片1492）各一個實例；其他占位保留便於比較。生成形狀、背面、材質與原創比例均不能標成 Verified Original。

樹木工作 f8cec7754ebd4796bf8b599d9a744c10：SPAR3D推論成功，Blender verify失敗（Triangle count changed on reload）。停止使用失敗的後處理產物；只以 raw_glb 進行視覺候選驗收，明確保留失敗狀態。岩石工作 c83a1fd3ba424f5c98b49dbc5f79bd6d succeeded，使用LOD0。不使用服務collider改寫遊戲碰撞。

實際樹木2,534,272 bytes，原先2MB占位上限不足，因此靜態GLB檔案上限改4MB、data URI上限6M字元。索引SCALAR accessor上限300k，配合既有100k三角形／頂點實際網格檢查；其他accessor保留100k。區域包仍16MB。這些是本次有界預覽預算，非完整資產管理方案。

離線工具prepare-art-sample只讀本機PNG、輸入清單、服務下載結果與基底包；核對PNG／模型SHA、來源證據清單hash、圖片ID及原始偏移，校正原創配置尺寸及底部。NullEngine尺寸檢查跳過材質讀取，真實材質由Chromium WebGL另外驗收。生成資料保留assets/generated並忽略於Git，公開build不含商業衍生資源。

後續應依實景決定樹冠亮度、岩石形狀及共同地面材質；不把兩件候選或單次渲染成功視為完整美術管線／LOD／原版3D還原完成。
