# ADR 0010：首個 Web MVP 採靜態打包與本機內容匯入

Date: 2026-11-02。Status: Accepted for first scene implementation。

使用者要求先 commit／push 前置成果，再進行下一步。已將 e0686a8 推送 develop，接著實作 Phase 7 的 Web 切片。

使用 React＋Vite 建立 apps/web，Babylon.js 只渲染占位場景。既有 game-core 控制所有遊戲邏輯，UI 透過命令及回傳狀態連接。固定斜角與 gridToWorld 維持邏輯／世界座標分離。

MVP 採靜態網站，可直接發布 apps/web/dist；目前只在本機預覽，不建立新託管服務或公開站台。預設包為可獨立運作的 Mock；原版切片透過瀏覽器 File API 在玩家裝置讀入，建置插件拒絕原版、參考與生成資料的直接匯入。正式輸出不含商業資源。

第一版存檔採 localStorage 的內容組合分槽與單份舊檔備份；仍使用既有精確內容預檢，拒絕不相容版本而不覆寫。支援 JSON 匯出／匯入供跨 origin／裝置轉移，不宣稱已有雲端同步或自動遷移。

此版通過本機實際瀏覽器 3D／互動／存讀／切圖／MOD／原版預覽驗證；不代表正式網站已部署、完整遊戲內容完成或手機硬體全面測試。詳見 validation/web-mvp.md 與 deployment.md。
