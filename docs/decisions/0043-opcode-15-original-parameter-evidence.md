# ADR 0043：opcode 15 的參數寬度以原版 DOS 路徑判定

2026-11-14。Status: Accepted for Phase 1／2 research。

本地 KDEF 114 次候選 `15` 後均為 `83`。FishEdit 文件把它列成二字，社群 Pascal dispatcher 則只前進一字；兩者是不同來源，不能互相代替。先前原始事件 190 的敗北頁只證明該路徑效果，沒有隔離出 `83`。

現已在原版 DOSBox-X 中以隔離 `15,83,7` 腳本命中 `0160:001E15CF`。本機客體 handler bytes 讀取腳本下一 word，作為處理函式參數傳入，並在此案例進入死亡／讀檔頁。採用此版本原版 DOS 的「`83` 被讀取」為二進位路徑事實；`83` 的業務意義、處理函式返回行為以及 `7` 是否執行仍保持 Unknown。實作不得把 `83` 解釋成結局 ID，也不得依社群版一字游標誤將它當下一個 opcode。見[限定 trace](../validation/opcode-15-83-binary-trace-20261114.md)。
