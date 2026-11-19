# 原版 DOS 事件 389 的聲音播放

2026-11-13。Phase 1／2 局部原版執行證據。原始事件 389 位於 KDEF byte 60900，SHA-256 `c26999181644dc7e98e32767e2990a24fb2bef87e87ea0376d4194552b473709`。候選首條指令為 `67(22)`，隨後是對話 ID 1255。KDEF 未改。

在隔離 `session-002` 第三槽把場景 32 槽 0 指向事件 389，讀檔後唯讀確認該事件載入。以精確 HWND／PID 查詢 DOSBox-X 的 Capture 選單，啟動原生 `Record audio to WAV`，先錄約 2 秒基線，再按 Left、Enter 互動；按鍵間隔至少 1 秒。事件後遊戲專用畫格 `z_892.raw1.png` 顯示「咦！這是什麼聲音？難道洞中藏有怪物」，證明已進入原始事件的對話段。錄音於此後停止，未使用 debugger 暫停遊戲。

新產生的 `capture/z_000.wav` 為 48 kHz、16-bit、雙聲道，長 8.417 秒，SHA-256 `7d9d010e61dadfd49ff1a2196d352d0f0dc37ed2b17aff12c3cc064bb2b5b0b5`。前 3 秒每秒 RMS 約 2.0–2.2 千（既有背景聲），互動後第 3–5 秒提高到約 4.3–6.0 千，之後回到約 2.0–2.5 千。這支持事件開頭播放一次額外聲音，而不是只顯示文字。沒有隔離音效素材本身，故不能從此錄音斷定聲音編號 22 與哪個 WAV／FM 資源的映射、混音內容或所有參數語意。

測試結果 JSON、合成前置及還原雜湊在 ignored `assets/generated/dosbox-x/session-002/synthetic-op67-event389-audio-20261113/`。錄音後關閉精確 DOSBox-X PID，六個第三槽檔案逐檔核對已還原。事件改指向與入場為 Synthetic State；自然流程可達性未驗。
