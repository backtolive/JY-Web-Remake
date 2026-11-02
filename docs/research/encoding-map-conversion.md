# 編碼、地圖容量與事件轉換研究

2026-11-02。來源 A 固定 commit 與函式位置見 [source-index](source-index.md)。重現：

```powershell
.\.venv\Scripts\python.exe tools/analyzer/probe_original.py original/dos > docs/research/probe.local.json
```

本工具僅研究探測，唯讀輸入，標示 Community Implementation，輸出保留輸入雜湊；不是 Phase 3 的完整解析器。完整名稱樣本留在忽略提交的本機報告。

## 編碼

jyconst.lua:146 將人物姓名定義在紀錄 offset 8、10 bytes；275 將場景名定義在 offset 2、10 bytes。依此抽樣人物前六筆與場景前六筆，Big5 與 CP950 嚴格解碼皆成功，部分 GBK 解碼失敗或為不合語境文字。樣本支持繁體 Big5 家族，但無法區分 Big5 與 CP950，也不能證明所有文字欄位均採同一編碼。

jymain.lua:1762–1774 會依 SrcCharSet 處理文字；jyconst.lua:52 的值屬於社群 Lua 來源配置，不能用來證明本機原始檔是 GB 編碼。尚未解析 TALK.GRP，不推定其儲存方式。

## 地圖容量

mainmap.c:539–610 使用 S_Num、64×64、六層、16-bit 元素載入 S 資料；D 資料由 200×11 個 16-bit 元素構成每場景區塊（呼叫位置 jymain.lua:1686）。

| 本機檔案 | 每候選區塊 bytes | 完整區塊數 | 第 84 筆後 bytes | 其中非零 bytes |
|---|---:|---:|---:|---:|
| ALLSIN.GRP | 49,152 | 100 | 786,432 | 161,267 |
| ALLDEF.GRP | 4,400 | 100 | 70,400 | 0 |

兩者都無不足一區塊的餘數。這是容量算術，不代表有 100 個可遊玩場景。RANGER 只有 84 筆場景紀錄，社群載入器按該數量讀取；原始程式如何使用剩餘資料仍 Unknown。不得裁切、清零或丟棄尾端，也不能由非零 bytes 宣稱有隱藏場景。

## 事件轉換限制

來源：A 的 script/ConvertKdef&talk.txt（v2.0）及 script/convertkdef2.lua。

- 說明要求先由 FishEdit 0.72 匯出 kdefout.txt、talk.txt；這不是直接解析 KDEF／TALK 二進位的工具，也不證明 FishEdit 已取得或可用。
- 說明明確排除帶有 50 指令的事件，並要求用附帶修正檔覆蓋部分轉換結果。
- convertkdef2.lua:9–60 依中文說明文字判斷分支；81–107 依事件文字標記分檔，且 103 使用 Windows 路徑分隔符。來源文字編碼與匯出版本相容性必須測試。
- 114–129 將對話輸出為逐行文字；雖讀取 id，但寫出內容不含該 id。不可假設稀疏 ID 或不同排序仍能保持對應。
- jymain.lua:2927–2947 會刪除並重建 oldtalk.idx。禁止在原始資料目錄執行這類工具。

未執行轉換器，未解讀本機事件 opcode，因此不宣稱原始事件中有或沒有 50 指令。

下一步：確認完整名稱欄位的嚴格解碼、索引邊界與用途差異；取得 MOD 工具一手來源及授權。原版規則與格式驗證完成前不建立大量轉換或內容輸出。
