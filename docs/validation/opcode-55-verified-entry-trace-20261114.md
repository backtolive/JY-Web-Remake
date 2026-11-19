# opcode 55：正向觸發後的 DOS 單點 trace

2026-11-14。Phase 1／2；Status: **合成案例的入口與游標運算已實測，完整指令語意仍未驗收**。原版 DOSBox-X 2026.10.01 保持單一 PID 7508／遊戲 HWND `0x38085A`。只修改 ignored `session-002/game` 內的第三槽與 `KDEF.GRP`，兩者各有 manifest；原始遊戲檔未修改。

## 可重現的觸發前置

本案第三槽由第一槽複製，場景 32 槽 0 指向事件 1017。KDEF 的 1017（26 bytes）暫換為 Synthetic Script：`55,2,-1,3,0,2,57,1,7,-1,-1,-1,-1`。使用先前成功案例的入口配置：`--first-coordinate-offset 0 --second-coordinate-offset 1 --unlock-scene --spawn-near-event 0`，不改候選面向、不對齊第二組入口。標題讀取第三槽後 `Up` 進入場景，唯讀確認槽 0 前五 word `[1,0,1017,-1,-1]`；再 `Left`、間隔 1 秒、`Enter`，執行中背包由無 ID 57 變成 `(57,1)`。因此後續 trace 有腳本實際執行的正向守門。上一次加上候選面向 2／第二組入口對齊時未觸發，不能據其斷點未命中淘汰 handler。

## 停點及客體 bytes

同一 PID 回標題重讀第三槽；入場第一次 `Up` 仍在世界地圖，精確遊戲畫面顯示入口，第二次 `Up` 後事件槽前五 word 唯一匹配 1017。設單一 `BP 0160:001E1ADF`，按已證實的 `Left → Enter`，`EV CS EIP` 為 `0160:001E1ADF`，確證這是本案實際經過的 opcode 55 handler。客體 `0x0028EE90` 在停點含上述 Synthetic Script；其前 26 bytes 與 manifest 一致。

在 handler 入口：`EAX=0`、`EBX=0`、`ESI=1`、`EDI=0x19`。入口 bytes 從客體 `0x001E1ADF` 讀取腳本索引 `EAX+2` 的 signed word（本案 `-1`），**連續 push 三次同一值**，再 push 索引 `EAX+1` 的 `2`，呼叫 `0x001E50D9`。停在呼叫返回 `0160:001E1AF6` 時，`EAX=0xFFFFFFFF`（signed `-1`），堆疊四個參數為 `[2,-1,-1,-1]`。被呼叫函式 `0x001E50D9` 的客體 bytes 顯示以 `22` bytes 為動態事件槽間距，讀取基址 `0x0027A694` 的 word，與第二個參數比較，然後返回第三或第四個參數；**本案兩個返回候選皆為 `-1`，因此這一次無法區分相等／不相等**。

返回後的 `0160:001E1516` 仍有 `EAX=-1, EBX=0`；在 `0160:001E151C` 實測 `EBX=5, EAX=-1`。該位置的短跳轉到 `0x001E14E9`，客體 bytes `01 C3` 是 `add ebx,eax`，故本案下一個腳本索引為 `5 + (-1) = 4`。索引 4 的 word 是 `0`，下一段才到索引 5 的 `2,57,1`；恢復執行後背包再次出現 `(57,1)`。這直接推翻「本合成案例獲得道具＝走某個 3／0 比較分支」的舊歸因。此前反轉 word 3／4 導致輸出改變，可能是游標落到不同後續 word；尚未以停點解釋每一組舊案例。

客體快照保存在 ignored `session-002/OP55HANDLER.BIN`、`OP55SCRIPT.BIN`、`OP55STACK.BIN`、`OP55DDATA.BIN`、`OP55COMPARE.BIN`、`OP55DISPATCH.BIN`、`OP55LOOP.BIN`。本次三個停點依次為 `1E1ADF`、`1E1AF6`、`1E1516`／`1E151C`；每次只留一個暫時斷點。最後 `BPDEL 0`、`BPLIST` 為空、`RUN` 恢復，並在 guest 回標題後依兩份 manifest 還原六檔第三槽及 KDEF。KDEF SHA-256 回到 `135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06`，R3／D3 回到 `aa2f4dee1b6b73120ebe92a100535e30c7d608cb0d2b0dd38ffa900d9f47c22c`／`8ec61fa55fcdf698223534753b19e453f7d14f9510c3361ef4641e53ffec9d56`。PID 7508 保持開啟。

## 尚待解決

原始事件 464 的 `55` 不在腳本開頭；需在實際游標停點讀出該次傳入的四個值與下一個索引，才能判定 28 次 `-1` 比較的原版通用行為。此次函式兩個返回候選相同，無法將 `-1` 的比較分支標為 Verified Original。已驗收的其他 opcode 無需重測。
