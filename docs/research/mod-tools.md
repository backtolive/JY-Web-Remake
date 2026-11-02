# MOD 工具候選

最新：已在 scarsty/kys-tools 的固定 commit 1d439afe76dae41c821065c3a33c1c6709dc7fce 找到 FishEdit 0.72 的 VB6 原始檔、屬性表與指令分析文件。取得的是研究所需指定檔案，完整來源鏈、授權及可執行性仍待確認；不是已驗收可用的工具。詳見 [FishEdit 證據](fishedit-opcode-evidence.md)，下方早期「尚未取得」狀態由本次更新補充。

新增研究：已取得 godka/sfe-kdef 固定 commit 04a5644ef8757bc7223bb7827cc1e19d74400a7a。只能確認 C# UI 與部分輔助來源，未找到主要 JYkdef 類別定義、csproj／sln 及整體授權；不等同已取得完整 FishEdit 0.72。未執行附帶 binary。另取得 kys-jedisdl 的直接 TALK／KDEF 讀取來源，可作格式研究。見 [詳細報告](talk-kdef-source-analysis.md)。

更新：已取得候選引擎內 script/ConvertKdef&talk.txt 及 convertkdef2.lua。前者指定 FishEdit 0.72 匯出文字作輸入，明確排除 50 指令，要求修補部分事件；因此不應直接採用為無損轉換器。工具本身尚未取得或執行。具體限制見 [研究報告](encoding-map-conversion.md)，下方「內容尚未取得」為歷史狀態。

KGEdit、FishEdit、SFE 尚未取得可審核的一手來源、精確版本及授權，不能宣稱可執行或可重用。後續需找作者發布、確認 DOS／復刻支援範圍，使用合法資料副本比較讀寫結果。

[候選引擎 script 目錄](https://github.com/ZhanruiLiang/jinyong-legend/tree/master/script)包含 convertkdef2.lua 路徑，但內容尚未取得；事件轉換、編碼及擴充指令支援均待驗證。
