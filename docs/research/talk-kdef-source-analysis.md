# TALK／KDEF 來源研究 — 2026-11-02

語意補充：kys_event.pas:1266–1286 的 instruct_50 以首參數與 MODVersion 分流，包含五物品條件與擴充分派；本機事件 676 首參數 138 走物品路徑。不能僅因上層分派支援動態修改，就將所有 50 判為擴充。詳見 validation/opcode-15-50-cases.md。

後續補充：新取得 FishEdit 0.72 公開保存來源及資料相容證據，見 [FishEdit 證據](fishedit-opcode-evidence.md)。該來源區分了原始五物品條件指令 50 與 Pascal 動態 50；本頁 Pascal 描述僅適用於該社群版本，不能當作 DOS 語意。

## 新增候選來源

| 來源 | 固定 commit | 用途與限制 |
|---|---|---|
| [bolstycjw/kys-jedisdl](https://github.com/bolstycjw/kys-jedisdl/tree/4d225cb9b7b9a3ac46a796ecb0acde525ef72acc) | 4d225cb9b7b9a3ac46a796ecb0acde525ef72acc | Object Pascal 復刻引擎，已取得指定來源；未編譯執行、授權未完成審查 |
| [godka/sfe-kdef](https://github.com/godka/sfe-kdef/tree/04a5644ef8757bc7223bb7827cc1e19d74400a7a) | 04a5644ef8757bc7223bb7827cc1e19d74400a7a | 已取得 C# UI 原始碼；不能確認為完整 FishEdit／SFE 原始碼 |

沒有複製這些程式碼至產品，以下皆為 Community Implementation 或本機 bytes 的觀察，不是 Verified Original。

## 直接讀取來源

kys-jedisdl 的 kys_main.pas:580–581 載入 KDEF／TALK 的 IDX／GRP；kys_type.pas:40–41、415–416 定義整數索引與 byte 資料。

對話：kys_event.pas:188–199 依相鄰邊界取資料，213 做 XOR FF，214–215 將星號作為顯示分行控制；另一條 NewTalk 路徑在 2449–2457 做 XOR FF，將轉換後 FF 改為 NUL。兩條顯示路徑處理方式不同，不能直接消去所有控制符號或視為完全相同。

事件：kys_main.pas:6709 定義 smallint 陣列；6731–6745 取 KDEF 區段並複製為 16-bit 值；6761–6765 停止於負值或長度邊界，再進行 opcode 分派。6771–6774 的指令 1 取三個參數，7018–7025 的指令 50 有七個參數並可能跳轉或改寫事件資料。這只是該社群版本實作，不能直接當成 DOS 指令長度／語意規格。

## 實際資料探測

重現方式：

```powershell
.\.venv\Scripts\python.exe tools/analyzer/probe_dialogue_events.py original/dos > docs/research/dialogue-events.local.json
```

獨立實作的唯讀研究工具不輸出對話內容，不建立 canonical 資料；報告含來源 commit、輸入雜湊與錯誤位置。

- TALK：2,977 筆、零空筆，長度 5–1,269 bytes。依來源做 XOR FF 後，所有紀錄最後一 byte 均為 FF，符合來源將其映成 NUL 的處理。不能直接將含 FF 的原始轉換結果送進中文 codec，否則會全部解碼失敗。
- 依上述 NUL 映射後，CP950 嚴格解碼 2,977 筆全部成功；Big5 成功 2,976 筆，失敗在 ID 842 的轉換後 byte offset 52（失敗起始 byte F9）；GBK 全部失敗。
- KDEF：1,018 筆、零空筆，長度 4–3,786 bytes，全部偶數，與 16-bit 候選布局相容。未掃描完整 opcode 邊界，不能把任一參數值 50 當作指令 50，也不宣稱本機事件使用或未使用擴充指令。

由此，CP950 比標準 Big5 更能覆蓋目前對話資料；顯示控制符號、DOS 字型及原版行為仍待驗證，不作全域文字轉碼。

## sfe-kdef 可用性

sfeKdef/FrmKdef.cs:31–35 設定 talk1 與 Kdef 資料路徑並建立 JYkdef；84 等將事件輸出為 UTF-8。主要資料處理由引用的型別負責，本次 checkout 未找到 JYkdef 的類別原始定義，也未找到 csproj／sln 或根目錄授權。附帶 DLL／EXE 不執行、不反向宣稱原始碼完整，暫不採用為正式工具。

## 下一步

保留 CP950 與控制符號證據，建立指令長度與分支的逐條來源表，再研究本機 KDEF 的相容性；任何未知指令必須停止相關分析而非略過。精確 DOS 版本、MOD 工具授權、候選成功建置與原版執行比對仍未完成，Phase 2 不標記完成。
