# 相機／小地圖同步 — 2026-11-03

Phase: 7顯示與輸入。Status: 同步介面完成，現有畫面仍為固定相機；沒有新增旋轉UI。

資料流：Babylon ArcRotateCamera實際alpha／beta → renderer onViewChange → SceneView → App cameraView／cameraViewRef → MiniMap及畫面相對輸入。初次建圖立即發布；render loop只有角度變更超過1e-7才再次發布。移動相機target不改方向，無須觸發小地圖重畫。

地面投影：screenX=-sin(alpha)×gridX+cos(alpha)×gridY；screenY=cos(beta)×[cos(alpha)×gridX+sin(alpha)×gridY]。此為現用正交、無roll的ArcRotateCamera地面投影，UI Y向下。不是泛用透視或任意相機投影器。背景／阻擋格／出口／NPC共用矩陣，玩家標記中心同矩陣且保持可見圓點。

view.alpha／beta是MiniMap effect依賴，改角度會重繪；角色座標與map變化仍連動。投影後bounds留8px，矩形地圖可完整容納。鍵盤與觸控都讀目前alpha，長按重複不鎖死起始角度。無GLB／來源／GameState或存檔格式變更。

驗證：新增Node測試以官方Babylon NullEngine建立正交相機，5個方位角（含非45度倍數）×2個俯角×8格方向，將MiniMap投影與實際Vector3.Project像素位移比較（等比例viewport），誤差<1e-6。長按過程改alpha，下一tick對應方向更新。既有E2E直接比對MiniMap角色點與WebGL角色四方向像素位移，保留玩家回報單軸反向的回歸防線。完整測試結果見PROGRESS。

限制：未啟用互動旋轉操作，尚無自由旋轉／旋轉中手感或多角度美術驗收。未來若加入透視、roll或不同座標轉接，需擴充投影契約並重新驗證；不能僅沿用目前公式。現用正交相機俯角壓縮已反映在小地圖，故外形比先前純旋轉版本更扁。
