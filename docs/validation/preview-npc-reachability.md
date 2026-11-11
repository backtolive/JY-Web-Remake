# 原版候選 NPC 可達性檢查 — 2026-11-02

Phase: 3／5／7 局部。Status: 門檻已實作；事件 670 擴充停止，未開放。

`pnpm run mvp:prepare` 與 `pnpm run mvp:check` 通過；既有槽 2 保留，新增來源事件雜湊、逐槽偏移及預覽鄰格 metadata。內容 manifest 仍為 0.1.0，實際內容未增加事件，原有內容組合相容性不因 metadata 改變。

`node tools/extractor/prepare-mvp.mjs original/dos --candidate` 預期回傳非零：`NPC_UNREACHABLE:original.jy.slice:npc/3,original.jy.slice:npc/4; reachableCells=602`。此為候選驗收失敗，不是已完成擴充。入口為既有 (16,34)，目前四方向可達區 602 格，兩個候選 NPC 均不在其鄰接範圍。八方向斜走禁止穿角，無法跨過四方向不連通區。

工具只在所有 NPC 通過後寫出 bundle。開發中門檻加入前曾生成的三 NPC 暫存包已刪除；不應將該候選當成有效預覽。通行原因尚未釐清，未修改原始檔案、碰撞規則或預覽入口。場景原始資料與社群規則依據延續 ADR 0009／0012，信心等級 Community Implementation。

Tests Executed / Results: 新增 2 項 Mock 測試涵蓋共享事件的不同 NPC、實際行走／碰撞／續行及隔牆不可達拒絕；23 Node、4 Python、typecheck、Schema、build、artifact 通過。mvp:prepare 重跑同路徑，既有 mvp:check 通過；候選拒絕為預期結果。Babylon chunk 提示仍存在。

瀏覽器回歸：四個既有 Chromium 案例均輸出 ok，但 Windows webServer 收尾停滯，最後以 Ctrl+C 結束 runner（exit 1），未取得整輪正常退出結果。其後 4273 無監聽程序；CIM 程序查詢被系統拒絕。保留「案例通過、runner 收尾未通過」限制，不標記完整 E2E run 成功。

Known Limitations / Unverified Assumptions: 不是 DOS 可達性驗證；未分辨阻斷由建築、保守事件阻擋或缺少切圖／動態狀態造成。未對不可達候選執行 UI 驗收。Phase 1／2 版本／授權／15／50 未解事項不變。

Next Recommended Tasks: 唯讀追查入口與槽 3／4 的連通區邊界，對照固定來源的碰撞與事件阻擋判定，取得證據後再調整受影響轉接器；不提前開放事件 670。

## 2026-11-03 更新：事件 670 唯讀追查與 E2E 證據

- 依 jinyong-legend SceneCanPass 修正通行判定：建築 > 0、水地面、事件欄位 0 != 0 才阻擋；空事件格可通行。
- prepare-mvp.mjs --candidate 現在通過 checkSliceNpcs，候選包包含槽 2/3/4 與事件 668/670。
- 瀏覽器 E2E：新增 tests/e2e/candidate-preview.spec.ts，匯入候選包並驗證場景渲染；全量 5 項 E2E 通過（13.6 秒）。
- 來源證據：ADR 0015 記錄 SceneCanPass 規則與 water ID 集合；仍屬 Community Implementation，未經 DOS 驗證。
- 預設預覽仍維持槽 2；候選需明確 --candidate，升級前可依本證據決定。
