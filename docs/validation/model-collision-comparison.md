# 石頭 GLB 與通行對照 — 2026-11-03

Phase: 6／7／8 局部驗證。Status: 相同模型、不同邏輯通行的對照場景完成，不是新的原版碰撞規則。

產生：`node tools/extractor/prepare-collision-demo.mjs`。輸出為 `assets/generated/collision-demo/mock-rock-collision.json`，使用「內容與測試設定 → 匯入本機地圖區域預覽」選取。只含自行產生的 Mock，不讀原版檔案；CI 可以直接呼叫純函式產生測試內容。

5×4 地圖，入口 (1,1)。兩顆石頭同用 authored.placeholder:rock，八面體 GLB／SHA256／縮放 (0.7,0.4,0.6) 完全相同。綠格 (2,1) 是裝飾、可進入；紅格 (3,1) 為唯一 blocked 格（index8）、不可進入。角色走入綠格會與模型視覺交疊，這是明確設計的測試，不是爬上石頭或碰撞引擎故障。畫面顯示座標與綠／紅說明。

Node 實際 MOVE 從入口向 east 進綠格，存讀恢復後向 east 遇紅格受阻；斜走也不能經紅格邊角穿越。縮放／移除視覺資料不改內容包與核心結果。瀏覽器從 FileChooser 匯入，同樣走入 (2,1)、拒絕 (3,1)、離開再讀取後仍拒絕；使用畫面方向按鈕與 MiniMap 座標驗證。

Tests Executed / Results: 45 Node、8 Python、Schema、typecheck、build／artifact、diff 通過；完整 Chromium 12 passed（24.4秒）exit0。新增2個Node＋1個E2E，view_image 實際檢視角色位於綠色石頭格、紅格石頭仍可見。CLI重跑同內容、輸出Git忽略；原版輸入／現有映射未改，既有Babylon chunk提示保留。

Known Limitations: 整格通行，不是按模型輪廓的細粒度碰撞。相同模型是示範，正式場景需依內容語意指定可穿透性；不能由縮放自動改邏輯。原版格子阻擋仍按既有局部證據追蹤，未升為 Verified Original。

Next: 在維持這項對照回歸下繼續其他占位資產與模型替換契約，精細化時檢查原點、尺度、遮擋、材質與效能；不因新模型附帶 collider 就改遊戲通行。
