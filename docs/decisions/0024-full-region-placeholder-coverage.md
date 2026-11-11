# ADR 0024：以共同低模占位覆蓋選區資源

Date: 2026-11-03。Status: Accepted for local preview coverage。

依既有逐圖分類，將7個植被／石頭來源圖號映射到3個穩定視覺資產：grass、tree、rock。草叢／樹木為自行產生的實體多面體GLB，不採原版sprite或透明平面；相同類型共用模型bytes、逐圖號設定原創scale。材質統一為純色、非金屬、roughness=1，但這只是占位風格，不是最終美術規範。

配置位於scene1-placeholder-models.json，分類為mock；來源圖號只存在轉接設定，不進通用核心。--all-placeholders保留先前地面／欄杆／告示牌，產生獨立0.5.0預覽包；來源與模型hash分別追蹤。未映射為0只表示覆蓋，不表示外觀、通行或原版語意全部驗收。

區域預覽在GLB載入完成後，以實際world bounding boxes投影到鏡頭座標重新取景，避免高模型裁切；一般遊戲場景保持既有鏡頭。碰撞仍由獨立地圖資料決定，植被模型不自動變更通行。
