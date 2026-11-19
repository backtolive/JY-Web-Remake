# 原版 DOS 事件 655 的動畫段

2026-11-13。Phase 1／2 局部原版執行證據。原始事件 655 位於 KDEF byte 99736，SHA-256 `a6c7ff49a62b41401bc4afb5e85cfb6167b5b8941f4ae346d5ed05381a69c0e3`；後段候選序列為對話 ID 2706、`0`、`57`、三個 opcode 3 修改事件槽 2／3／4。KDEF 未改。

隔離 `session-002` 第三槽把場景 32 槽 0 指向事件 655，主角候選攻擊設 1000，背包加入 ID 106、109、117 各 1。讀檔後唯讀確認事件載入；互動兩次後 `z_1079.raw1.png` 顯示「看我的！」。關閉該對話時啟動 DOSBox-X 原生 `Record video to AVI`，同時擷取三張遊戲專用 raw 畫格：`z_1080.raw1.png` 與 `z_1081.raw1.png` 中主角暫時不在原站位，`z_1082.raw1.png` 主角回到原站位，場景中其他圖像也已變更。AVI `z_000.avi` 大小 1,219,010 bytes，SHA-256 `8f197c0920e40f2a3d57429a6ade23252cbbabf74fecb0a5c5232ea6ca186ad7`，存於 ignored capture 目錄，未複製原始素材入產品。

同一精確 DOSBox-X 程序的唯讀事件槽紀錄，槽 2／3／4 圖號前值分別為 `2718／2720／-1`，動畫後變為 `7746／7804／7862`，吻合原始腳本在 opcode 57 後的三個 opcode 3，證明流程通過動畫段並回到後續更新。可確認原版在此段有短暫視覺序列，但緊接前置的 opcode 0 也會重畫，單憑三張畫格不能將每一幀或主角暫時消失單獨歸因於 opcode 57；原場景高昌石門素材與完整幀序未驗。

合成前置、原值與六檔還原雜湊在 ignored `assets/generated/dosbox-x/session-002/synthetic-op57-event655-conditions-20261113/manifest.json`。只使用一個精確 PID／HWND，錄影後關閉程序並逐檔核對第三槽還原。自然流程可達性未驗。
