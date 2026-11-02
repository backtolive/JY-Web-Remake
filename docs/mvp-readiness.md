# 第一個 3D 場景 MVP：前置已就緒

後續狀態更新：已完成本機可操作的占位 Web MVP，見 [Web 驗證](validation/web-mvp.md)。以下保留「前置就緒」時點的範圍與結果；其中尚無可玩網頁的描述已由後續紀錄取代，完整 Phase 6 仍未驗收。

2026-11-02。Status: Ready to start scoped MVP implementation。尚無可玩網頁；這份報告不是完整 Phase 3／6 或 DOS 還原的驗收。

## 可重跑檢查

```powershell
pnpm run build
pnpm run typecheck
pnpm run test
pnpm run schema:check
pnpm run mvp:prepare
pnpm run mvp:check
```

前四項使用專案程式與 Mock，不需要商業資源。後兩項需要本機 original/dos 的八個原版輸入檔。`mvp:prepare` 只在 Git 忽略的 assets/generated/mvp 產生內容定址 `.local.json`，再次執行相同輸入取得同一路徑；不覆寫不同內容。`mvp:check` 完成 headless Mock 與本機原版切片檢查後回報 ready:true；缺少原版資料時不宣稱兩者都驗證完成。

## 已完成的前置

| 項目 | 證據／範圍 |
|---|---|
| 容器讀取 | 118 組中 117 組相容；MMAP 特例明確拒絕 |
| 對話 | 2,977 筆 XOR／終止符／控制碼解析；全部 WHATWG Big5 成功，本機逐筆 UTF-8 雜湊與 Python CP950 顯示字串相同，未知控制碼 0 |
| 地圖與事件槽 | 84 筆場景、6 層 64×64、200×11 事件欄位；保留 100 區塊容量及未解尾端，不猜測後 16 區用途 |
| 純對話事件子集 | 只接受 0／1／7／-1 與合法參數；未知／狀態效果拒絕，不以跳過指令換取執行 |
| 內容契約 | 真正共用 JSON Schema、Ajv 結構驗證、穩定命名空間、跨包引用／跳轉／座標驗證 |
| 核心 | 移動、靜態／NPC 碰撞、鄰格互動、對話、選項、條件、旗標、物品、切圖及座標轉接 |
| MOD | 精確依賴、確定排序、缺包／錯版／循環／定義重複／對話 patch 衝突診斷；目前僅文字 patch |
| 存讀檔 | 包／MOD 精確版本與雜湊、順序、priority、設定、Runtime、PRNG 與對話／選項 PC；不符先拒絕，原字串不變 |
| 隔離 | Mock 不含原版資料；原版切片只存在 assets/generated；完整 627 檔與既有 inventory 基準相同 |

目前 Node 測試共 13 項，Python 既有 Mock 4 項。測試包含腳本步數限制與失敗原子性、固定 seed 重播、Schema 同步、存檔內容變更、MOD 衝突等。真實資料驗證與 Mock 分開記錄，不將 Mock 規則標為 Verified Original。

## 原版切片的界線

`prepare-mvp.mjs` 選河洛客棧（scene 1）、slot 2、event 668，先檢查實際引用仍一致才產生包。只包含一條可支持的唯讀對話；目前對應 TALK 2431、portrait 200，不推定 portrait 就是人物 ID。

切片附有六層原始 tile ID／高度資料作為 renderer 輸入，不含原版貼圖，也不自動生成未存在的 3D 建築。預覽格座標 x=arrayIndex2、y=arrayIndex1，並非已證實的 DOS 軸向。入口選在 NPC 鄰近可通行格，是預覽配置，不是原版出生點／存檔位置。

碰撞使用固定 Pascal 來源的社群候選條件，並保守阻擋其他未納入的事件格；選中 NPC 格由核心 NPC 占位阻擋，避免重複靜態阻擋。其他事件／傳送未轉換。事件 0 的清畫面效果只在此預覽明確省略，非通用原版語意。來源、偏移、完整檔案雜湊、排除槽位均隨本機 bundle 保存。準備完成不等於與 DOS 逐步比對通過。

## 直接開始的 MVP 工作

1. 建立本機 Web app，以 Mock 包為預設；原版切片由使用者本機選檔載入，不公開散布。
2. Babylon.js 顯示固定斜角 3D 格地板、碰撞方塊與 placeholder 人物；使用 gridToWorld 對接邏輯格。
3. 鍵盤只派送 MOVE；NPC 互動派送 INTERACT；對話／選項派送 CONTINUE／CHOOSE。
4. UI 根據已暫停的 cursor 顯示內容；由核心回傳狀態與 notifications 更新畫面。
5. 將 serializeSave／restoreSave 接上瀏覽器本機儲存，保存新檔前預檢；匯入失敗保留原內容。
6. 在實際瀏覽器驗證移動／碰撞、對話／選項、原創兩場景往返、存讀檔及 MOD 不相容診斷。

仍待後續：完整戰鬥／裝備／武功規則、事件 15／50 原版執行、MMAP 保留區、精確發行版本、完整授權鏈、圖像／音效、美術及完整創作工具。這些未解項不阻擋上述第一個場景 UI，但不能因此宣告完整 Phase 6 通過。
