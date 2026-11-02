# ADR 0009：第一個場景 MVP 的準備門檻

Date: 2026-11-02。Status: Accepted for implementation scope，依使用者「繼續直到可以進行 MVP」。延續 ADR 0008 的逐功能驗收，不宣布完整 Phase 3／6 完成。

## 決定

第一個 3D 場景的前置切片涵蓋：地圖／事件位置資料、獨立邏輯座標、基本移動碰撞、鄰格 NPC 互動、可暫停對話與選項、受控條件／旗標／物品命令、宣告式切圖與完整存讀檔。戰鬥公式、完整 DOS 指令集、原版整條劇情、HD 美術與編輯器不在此前置門檻。

採同一純 TypeScript 核心驗證兩種內容：獨立 Mock 原創包涵蓋全部上述流程；本機原版切片採河洛客棧場景 1、槽 2、事件 668，只讀取已支持的純對話指令。原版其他事件格保守阻擋並列出排除清單，不轉譯未支援效果。這不是完整原版還原。

## 核心契約

- Game Content Package v1、Runtime 0.1.0；共享 Draft-07 JSON Schema 由程式來源匯出，Ajv 實際驗證，測試鎖定檔案與 runtime schema 一致。
- ID 命名空間、定義唯一性、跨包引用與事件跳轉／地圖座標檢查；依賴採精確版本，不支援版本範圍。拓撲排序以 priority、ID 確定選擇；缺包／循環／衝突先拒絕。
- MOD 最小 patch 僅支援對話文字替換，須依賴原包並符合 expectedText；同一目標多個 patch 拒絕。不代表完整 MOD 編輯／匯入工具完成。
- ScriptRuntime 支援 say、choice、if、setFlag、giveItem、end；未知能力拒絕。條件唯讀，最多 16 層；每次命令最多 1,000 步（可明確設定 1–10,000），錯誤不提交局部狀態。沒有 eval、宿主腳本或檔案權限。
- 遊戲狀態與 UI 解耦；傳入 seed、顯式 PRNG 狀態可保存，無牆鐘／Math.random。此版未提供戰鬥／時間規則。
- 存檔記錄 Schema／Runtime、所有包及 MOD 的精確版本、SHA256、priority、順序、設定、狀態與暫停 PC。內容不符或 cursor 無效先拒絕；純函式不覆寫舊檔。遷移尚未實作，未來須另加備份與驗證。

## 就緒與後續驗收

build、typecheck、schema 同步、Mock 與本機原版切片 headless 流程通過，且原始完整雜湊未變，才標記「可開始第一個場景 MVP」。尚無畫面時不能標記「可玩 MVP 完成」。

下一步於 Web app 接入此核心、固定斜角鏡頭及 placeholder 3D；渲染器只接收資料與派送命令，UI 不重寫碰撞／事件／存檔規則。MVP 須再完成實際畫面、鍵盤操作、視覺碰撞、對話／選項 UI、切圖與瀏覽器存讀檔驗收。
