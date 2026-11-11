# 世界座標軸局部修正 — 2026-11-04

Phase: 7／8局部。Status: 修正完整世界原圖投影基底，待玩家試走回饋；不代表完整原版碰撞驗收。

## 使用

重新整理本機頁面，再以「匯入完整世界地圖」載入同一份包：

`assets/generated/world-preview/world-fa9af52a0d2428da.local.json`

不需重新轉換或更改原版資料。原始地圖480×480，958個非零圖片ID各自保留；完整資料在記憶體，顯示僅建立角色附近的投影。來源在EARTH／SURFACE／BUILDING及BUILDX／BUILDY.002，圖片為MMAP.IDX／GRP及MMAP.COL；預覽檔與958張PNG位於ignored assets/generated/world-preview。此段補記先前中斷的世界工作，不代表這輪重跑全圖。

## 修正

原版X+畫面右下、Y+畫面左下；render=(x,0,-y)。原圖像素投影、圖片錨點、角色與跟隨鏡頭、小地圖及鍵盤／按鈕共用此映射。原始通行格、讀取索引與存檔座標維持原值。

原先地面基底與立面不一致，且world Y錯用正Z；不能只改相機或旋轉按鍵來修正。相機alpha=-π/4、beta=π/3.1維持不變。新函式projectedImageOffset讓同一來源像素在ground與billboard投影下具有相同螢幕座標，避免跨投影方向不一致。

## 局部驗收

- 6項相關Node測試通過：含來源X+／Y+、八向輸入／小地圖基底、不同錨點的地面與立面同像素對齊；既有實際Babylon相機投影測試維持通過。
- Chromium單項局部驗收1 passed（9.8秒）：入口(358,229)，X+→(359,229)，Y+→(359,230)，返回入口；嘗試進入原始blocked (358,228)時位置保持不變。
- typecheck／build／artifact及diff檢查通過。公開輸出107檔商業資源0；既有Babylon chunk提示保留。
- view_image檢視本機world-axis-aligned.png。這輪沒有跑全圖連通、沒有擴大路徑掃描或完整回歸。

## 限制及下一步

未驗收每棟建築的占格／遮擋，船隻外觀與場景入口仍未接；社群通行規則未證明等同原版DOS。既有8×8 GLB區域包保留原介面，未重新轉換那些舊資產。下一步優先玩家在本機同一建築附近試走，若有具體座標的剩餘落差，再局部核對錨點／占格；不先修改阻擋資料。
