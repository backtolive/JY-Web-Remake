# ADR 0028：小地圖與輸入讀取實際相機視角

Date: 2026-11-03。Status: Accepted。取代ADR0027的固定135度／鏡射實作。

renderer在建立相機及alpha／beta改變時發布CameraView；App保存顯示state與同步ref，供MiniMap與畫面相對輸入使用。SceneView轉接callback，避免把相機角度寫入核心GameState或內容包。

MiniMap由cameraGroundProjection取得地面X/Z到畫面X/Y的線性投影，根據alpha處理方向、beta處理俯角壓縮。背景／碰撞／NPC／出口使用同一轉換，玩家標記中心使用同一投影但保持圓形易讀；依投影後長寬縮放留邊。沒有獨立固定角度、翻轉設定或用邏輯地圖旋轉冒充相機旋轉。

鍵盤長按每次tick讀目前alpha，觸控按鈕亦讀相同ref。未來旋轉相機需改實際camera或共用視角路徑，不能只改模型朝向；renderer每幀偵測數值變化，只有角度改變才發布，避免固定場景每幀觸發React更新。

本輪接好同步機制，沒有新增滑鼠拖曳／旋轉按鈕或解除固定相機。測試使用真實Babylon矩陣驗證多角度，不能將此宣稱為自由視角操作已驗收。核心、來源軸向及碰撞不變。
