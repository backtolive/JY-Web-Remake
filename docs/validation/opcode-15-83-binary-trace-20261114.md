# opcode 15：原版 DOS 是否讀取 `83`

2026-11-14。Phase 1／2；Status: **`83` 作為處理函式參數已有原版 DOS 路徑證據；其具體語意未驗**。原版 KDEF 有 114 次候選 `15,83`。先前原始事件 190 敗北後進入死亡／讀檔頁，但沒有隔離出 `83` 是否被讀取。[先前紀錄](opcode-15-dos-observation.md)與社群 Pascal dispatcher 的一字前進不能代替本 DOS 程序的控制流。

在 DOSBox-X 2026.10.01、唯一 PID 7508 中，客體跳轉表 `0x001E1209 + 15×4 = 0x001E1245` 的 32-bit 表項是 `0x001E15CF`。客體 handler `0x001E15CF` 起始 bytes `0F BF 04 5D 92 EE 28 00 50 E8 7C 20 00 00`：以腳本索引從 `0x0028EE92` 讀 signed word、`push`，再呼叫處理函式。其後跳轉至 dispatcher `0x001E1530`；該處 bytes `83 C4 04 83 C3 02` 是堆疊清理四 bytes、腳本索引加 2。這是此版本原版機器碼的靜態路徑，並非社群程式碼。

為確認跳轉表項實際執行，僅在 ignored `session-002/game` 的 KDEF 事件 1017 暫換 26-byte Synthetic Script `15,83,7,-1...`，第三槽仍採先前已正向驗證的場景入口。兩份 manifest 各自備份 KDEF 與第三槽；原始遊戲檔未改。標題讀第三槽、入場，唯讀確認槽 0 指向 1017；設單一 `BP 0160:001E15CF`、`RUN`，再 `Left`、間隔一秒、`Enter`。停點 `CS:EIP=0160:001E15CF`、`EAX=0, EBX=0`；客體 `0x0028EE90` 的前 bytes 是 `0F 00 53 00 07 00`（`15,83,7`）。因此此次**實際執行**的 handler 下一步會讀到 `83` 並送入處理函式。

移除入口斷點、改在返回後的 dispatcher `0x001E1530` 設單一斷點並 `RUN`，兩秒後沒有命中；精確遊戲畫面已是死亡／讀檔頁 `z_1232.raw1.png`。故此案沒有取得索引實際加 2 的停點；處理函式在死亡路徑可能不返回。畫面符合先前原始事件 190 的敗北觀察，但本 Synthetic Script 的 `7` 是否執行尚未以指令停點排除。可以確認 `83` **被原版 handler 當參數讀取**，不能再稱其只是無關附帶 word；`83` 對死亡頁文字、結局類別或其他狀態的精確作用仍 Unknown。

本次清除暫時斷點、`BPLIST` 為空；guest 在同一 PID 回標題後，依 manifest 還原六檔第三槽及 KDEF。KDEF SHA-256 回到 `135c5e097a7fe561ee931046e1bebf55de9b469678e3d111d8e9f2c6bb600e06`，R3／D3 回到 `aa2f4dee1b6b73120ebe92a100535e30c7d608cb0d2b0dd38ffa900d9f47c22c`／`8ec61fa55fcdf698223534753b19e453f7d14f9510c3361ef4641e53ffec9d56`。客體 bytes 留在 ignored `OP15TABLE.BIN`、`OP15HANDLER.BIN`、`OP15SCRIPT.BIN`。

**後續可見輸出對照**：在同一 PID 的隔離副本，將第二字由 `83` 改為 `82`，仍以同一第三槽場景與 `Left → Enter` 鍵序觸發。兩案精確遊戲畫格 `z_1232.raw1.png`／`z_1233.raw1.png` 的 SHA-256 均為 `58cbf643da11211a0282a83a2cd1bd012c614b23cafa44fe8fed1b8a4b597406`，畫面完全相同。這只證明**此畫面沒有可見差異**，不證明處理函式忽略參數或沒有隱藏狀態差異。helper 前段 bounded 客體 bytes 未定位明確的參數讀取，不能據此否定入口讀取與傳遞。測後回標題，依 manifest 還原 KDEF 和六檔第三槽；`BPLIST` 為空，PID 7508 保持開啟。
