# FishEdit 指令布局證據 — 2026-11-02

更新：完整追查 Pascal instruct_50 後，確認它同時包含物品檢查與擴充處理，首參數大於 128 會走物品路徑；本機為 138，兩來源的此路徑並非互斥。依 FishEdit 0.72 候選表切分的 114 條指令 15 後續欄位均為 83；FishEdit 對 opcode 15 的描述是「死亡返回選單」，記錄值為 5300（按其低位元組在前說明，換算為十進位 83）。Pascal／Lua 社群版本也將 15 當停止／Game Over 類指令，但未讀取此欄位。使用者已確認「opcode 15 是比較條件分支」為未驗證的假結論，從有效語意推論中排除；目前以本機 FishEdit／Pascal／Lua 候選證據為主。事件 676 的兩個候選目標均在指令邊界。詳見 [原版驗證案例](../validation/opcode-15-50-cases.md)。

## 來源與可信度

新取得的公開工具集合：[scarsty/kys-tools](https://github.com/scarsty/kys-tools/tree/1d439afe76dae41c821065c3a33c1c6709dc7fce)，固定 commit `1d439afe76dae41c821065c3a33c1c6709dc7fce`。以 partial clone 及小型 blob fetch 讀取指定來源，不執行附帶程式、不提交其原始碼或素材。這是 FishEdit 0.72 來源的公開保存位置，尚未證明每個檔案的完整作者、歷史與授權鏈。

| 路徑（均相對於該倉庫） | 行號 | 證據 |
|---|---:|---|
| 修改器/fishedit0.72_src/Modmain.bas | 95–100 | length 與分支參數位置的結構定義 |
| 修改器/fishedit0.72_src/modanalyzeKdef.bas | 235–267 | 依指令屬性表讀長度，參數與 opcode 分開 |
| 同上 | 353–365 | 從 KdefAttrib／AttribN 載入長度與分支設定 |
| 修改器/fishedit0.72_src/FishEdit.ini | 99 | 指令 15 為兩個 16-bit 單位 |
| 同上 | 134–135 | 指令 50 長度為八個單位，但啟用設定關閉分支標註 |
| 修改器/fishedit0.72_src/FishEdit0.72/kdefV0.3.ini | 15–16、101 | 文件以 16-bit 個數說明參數，指令 15 附帶 5300 |
| 同上 | 248–249 | 指令 50 描述為檢查五種物品，後接兩個跳轉偏移 |

文件自述參照反組譯，也明說可能存在錯誤；故仍標示 Community Implementation，不升級為 Source Confirmed 或 Verified Original。完整授權未確認，不直接採用工具程式碼。

FishEdit `kdefV0.3.ini` 第 15–16 行說明括號記錄後續 16-bit 值的數量／含義及位元組序；第 101 行把 opcode 15 描述為死亡返回選單 `(5300)`。故「114 筆後面都是 83」是實際資料在這份候選長度表下的讀取結果；`83` 與該工具所記 `5300` 相符。這只能證明 FishEdit 的解讀與本機資料相容，不能證明它就是 DOS 原版語意。

## 釐清前輪差異

Pascal 與 FishEdit 的 68 條表之間，長度差異只有指令 15：前者一單位、後者兩單位。本機前次 95 個未知值 83 全部緊接在候選指令 15 後；文件中的 5300 以小端序對應數值 83。依 FishEdit 表重掃即可涵蓋這些位置，不需要猜測或略過資料。

前輪的 95 個差異是使用 Pascal 表的線性布局結果，不證明原版執行會到達 83；Pascal 在指令 15 後本來就停止執行。此次亦不證明該附帶值在 DOS 中的具體用途。

### Opcode 15、7 與 -1：候選效果與控制邊界

全量資料掃描結果：114／114 個 opcode 15 的下一個 16-bit 欄位是十進位 83；依 FishEdit 兩 words 長度，該值歸在 opcode 15 這條記錄內。其後接 opcode 7 的有 109 筆，直接到 `-1` 結尾的有 5 筆。全部 1,018 個事件資源都以 `-1` 作最後字，故本資料中 `-1` 是普遍的資源結尾標記，不能單獨代表「破關結局」。

本機來源對 opcode 15 的候選描述一致偏向遊戲結束：FishEdit 標示「死亡返回選單」；Pascal／Lua 社群版本採 Game Over／結束類處理。`83` 的操作用途仍未由執行結果證明。

Pascal dispatcher 將 opcode 7 標為 `Break the event`；當 opcode 為負數（本資料的 `-1`）時，事件讀取迴圈停止。FishEdit 的 KDEF→Lua 轉換也把 7 轉成函式 return，將 -1 當結尾註記。這支持「7 是事件控制流程中止、-1 是資源終止符」的候選解讀。使用者提出「7 為死亡結局、-1 為破關結局」目前仍屬待驗假設，現有本機來源不支持把兩者當不同結局類別。

本機唯一位於指令邊界的 50 在事件 676，其七個參數為 `138,139,140,141,142,6,0`，與五種物品及兩個跳轉位置相容。不能將所有 opcode 50 一律稱為擴充、動態或自改寫指令。Pascal 的動態版本與此文件描述須使用不同的來源／規則配置。

## 唯讀稽核結果

```powershell
.\.venv\Scripts\python.exe tools/analyzer/audit_fishedit_layout.py original/dos references/kys-tools > docs/research/fishedit-layout.local.json
.\.venv\Scripts\python.exe -m unittest discover -s tests/unit -p 'test_*.py'
```

- 1,018 個事件全部符合候選線性布局，無未知 opcode、截斷或非預期尾端。
- 共 13,315 條指令，其中指令 15 有 114 條，指令 50 有 1 條。
- 啟用表中宣告的 1,394 個分支目標均落在指令邊界或結束標記；不代表條件語意、可達性或執行結果已驗證。
- 指令 50 的啟用設定與文件分支描述不一致，本工具保留設定原貌，不暗中補分支。因此上述分支檢查不包含 50 的兩個偏移。
- Mock 測試 4 項通過：負數參數、未知／截斷、跳入參數區、結束邊界及缺少／多餘尾端。

工具核對固定 commit、直接讀提交來源，記錄來源／輸入雜湊；來源表形狀不符即停止。不輸出全事件或對話內容、不執行事件、不建立正式 canonical 轉換。不得沿用 FishEdit 對未知指令繼續略過的策略。

## 後續界線

本次將「完全未知布局」縮小為「有來源且與本機資料相容的候選布局」。仍須查明指令 50 的分支語意、15 附帶值用途、精確原版版本與授權，並完成原版執行比對。通用 Runtime 應使用版本化中介表示，DOS opcode 僅留在內容轉接層；目前未開始 Phase 3 或平台實作。
