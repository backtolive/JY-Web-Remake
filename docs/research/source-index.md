# 來源索引與相容性 — 2026-11-02

來源 A：[jinyong-legend](https://github.com/ZhanruiLiang/jinyong-legend/tree/89962d7fc2837c143e176c306d83b4e38dab6e77)，commit 89962d7fc2837c143e176c306d83b4e38dab6e77。fetch --refetch --no-filter 成功，已 checkout src 與指定 Lua，未 checkout 所有素材。

來源 B：[jysdl-bh](https://github.com/scarsty/jysdl-bh/tree/6fc81fb43df41b504af5310fca9fdd7bdb30e003)，commit 6fc81fb43df41b504af5310fca9fdd7bdb30e003，完整 shallow checkout。

以下僅屬 Community Implementation，未經 DOS 行為驗證，沒有移植第三方程式碼。

| A 的模組 | 路徑與行號 | 觀察 |
|---|---|---|
| 紀錄載入 | script/jymain.lua:1568–1686 | LoadRecord 讀六個邊界，分基礎、人物、物品、場景、武功、商店 |
| 整數讀取 | src/luafun.c:639–646 | Byte_get32 使用原生 int 指標，非可攜式位元序規格 |
| 結構常數 | script/jyconst.lua:140、204、272、297、322 | 182、190、52、136、30 bytes |
| 地圖常數 | script/jyconst.lua:341–344 | 64×64，事件容量 200 |
| 場景 API | src/luafun.c:351–363 | LoadSMap 轉接 C 層，底層配置待追查 |
| 事件 | script/jymain.lua:2675 | EventExecute |
| 對話 | script/jymain.lua:2918 | instruct_1 |
| 傷害 | script/jymain.lua:5709 | War_WugongHurtLife，僅定位，未驗證公式 |
| AI | script/jymain.lua:6147 | War_Think，未驗證決策 |

## 本機 bytes 比對

以 Python struct `<6I` 候選解讀 RANGER、R1、R2、R3。四組 IDX 都為 24 bytes，GRP 都為 114,242 bytes。邊界均為 836、59076、97076、101444、114092、114242，單調遞增，最後等於 GRP 長度。

| 候選區段 | bytes | 來源紀錄大小 | 整除筆數 |
|---|---:|---:|---:|
| 基礎 | 836 | 待查 | — |
| 人物 | 58,240 | 182 | 320 |
| 物品 | 38,000 | 190 | 200 |
| 場景 | 4,368 | 52 | 84 |
| 武功 | 12,648 | 136 | 93 |
| 商店 | 150 | 30 | 5 |

這只確認長度相容，不確認欄位語意、發行版本或 DOS 規則。ALLSIN.GRP 為 4,915,200 bytes、ALLDEF.GRP 為 440,000 bytes；不能直接用 84 筆場景紀錄推定所有地圖檔配置，容量與保留區待追查。

驗證使用 .venv Python 的 read_bytes、struct.unpack，僅唯讀研究探測，未寫回，未執行遊戲，未建立批次解析器或 canonical 輸出。
