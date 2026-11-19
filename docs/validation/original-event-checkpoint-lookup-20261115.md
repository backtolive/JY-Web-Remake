# 原版互動事件查找與事件槽 checkpoint

日期：2026-11-15。Phase 3／6 局部實作；不是完整原版遊玩驗收。

在本機原版 `RANGER.IDX/GRP`、`ALLSIN.GRP`、`ALLDEF.GRP` 上讀取場景 32。事件層 cell 1374（目前預覽格子慣例 x=30、y=21）指向槽 2。原始表槽 2 欄 2 為 `-1`，因此 `resolveOriginalEventAtCell(...,field=2)` 回傳 `null`；只在獨立覆蓋層將欄 2 寫為 `862` 後，同格回傳 `{sceneId:32,slotId:2,field:2,eventId:862,canonicalId:'original.jy:event/862'}`。這核對查找會使用更新後狀態；**這次並未執行原版事件 464 或驗證欄 2 的所有觸發條件**。格子 x/y 是目前預覽索引慣例，不作 DOS 座標軸宣稱。

Mock 測試涵蓋空格、停用 ID、欄 2／3 的不同結果、覆蓋後 ID、越界與錯誤引用。checkpoint 測試涵蓋 JSON 往返、來源／規則集／MOD／設定精確鎖定、錯誤覆蓋紀錄拒絕、本機儲存備份與失敗時舊主檔不變。此 checkpoint 只涵蓋事件槽，沒有玩家、背包、戰鬥或腳本續行點；不能當作完整遊戲存檔。
