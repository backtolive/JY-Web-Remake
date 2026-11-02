# 原版啟動與進度載入 — BOOT-LOAD1

Date: 2026-11-02。Status: Passed for boot/menu/load only。執行對象為使用者提供的 DOS 遊戲隔離副本，不是社群引擎。

## 前置與來源

DOSBox-X 官方 2026.10.01 x64 MinGW SDL2 portable，固定配置見 dosbox-x-setup.md。使用 session-001/game，其 627 個既有檔案於本輪結束時與原始 inventory 基準逐檔 SHA256 相同。這證明本輪未改寫基準內容，不代表版本來源或先前存檔狀態已驗證為官方初始狀態。

使用者回報 CMD 啟動器可執行。本輪重新取得遊戲視窗，啟用視窗後直接觀察到原版主選單。先前的桌面存取錯誤不再阻擋此次畫面驗證。

## 實際操作與觀察

1. 主選單顯示重新開始、載入進度、離開遊戲。
2. 以 Down 選載入進度。Return 未得到可靠的選項切換結果；space 成功開啟三個進度槽。
3. 在進度一以 space 確認，成功進入可見大地圖並顯示主角與場景。
4. 透過 DOSBox-X Capture → Take screenshot 產生 capture/z_000.png；已檢查本機圖像，為遊戲畫面，不是桌面截圖。
5. 嘗試 Escape、Return、滑鼠右鍵與 Right，沒有足夠可確認的選單或角色位移結果；不列為通過，不推論遊戲不支援這些按鍵。

沒有選擇新遊戲、覆寫存檔、修改背包、進行戰鬥或觸發指定事件。未驗證聲音。本次 GUI 操作紀錄可作手動重播步驟，尚無自動輸入重播保證。

## 證據保存

本機證據目錄：`assets/generated/dosbox-x/session-001/evidence/BOOT-LOAD1-20261102T114547519305Z/`，完成標記為 manifest.local.json。包含 17 個檔案：設定、執行日誌、RANGER 與進度一的 R／S／D 資料、工作場景緩衝、KDEF／TALK 及模擬器原生 PNG。所有快照大小與 SHA256 重新驗證通過，缺檔數為 0。原始商業資料與截圖保留在忽略提交的本機目錄。

新增唯讀證據工具：

```powershell
.\.venv\Scripts\python.exe tools/validator/capture_original_evidence.py assets/generated/dosbox-x/session-001 BOOT-LOAD1
```

每次建立新目錄，保留設定、輸入雜湊及模擬器 binary 雜湊；遊戲檔案讀取期間若變動即失敗，沒有完成 manifest 的目錄不可視為完成證據。擷取時應停在穩定畫面；這不是整個模擬器原子快照，不保證能恢復記憶體或隨機狀態。

## 判定範圍

本次僅驗證指定輸入與環境可啟動、顯示選單並載入進度一至大地圖。無任何戰鬥公式、事件 15／50 或存檔續行被升為 Verified Original。Phase 1 的精確發行版本與 Phase 2 的來源／授權／規則限制仍未結案。

下一步確認可靠移動與功能選單輸入，再查明進度一的場景／背包及可到達的驗證路徑。不得為縮短路線直接修改原版資料並將結果當成未修改原版。
