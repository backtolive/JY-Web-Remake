# 授權（2026-11-02）

## 固定版本的原始碼聲明盤點

新增 `tools/analyzer/audit_source_notices.py`，直接讀取已固定 Git commit 的物件，不依賴工作目錄內容。輸出逐檔 SHA256、編碼、聲明關鍵字行號與人工審查狀態，不輸出第三方程式碼。完整報告在 Git 忽略的 `source-notices.local.json`。

| 範圍 | src 下 C／C++ 原始碼與標頭數 | 含盤點關鍵字 | 檔名符合 LICENSE／COPYING／NOTICE |
|---|---:|---:|---:|
| A：89962d7fc2837c143e176c306d83b4e38dab6e77 | 10 | 2 | 0 |
| B：6fc81fb43df41b504af5310fca9fdd7bdb30e003 | 29 | 5 | 0 |

檔名與關鍵字盤點不是授權結論；未出現關鍵字也不代表沒有條款。這只完成明訂範圍的可重現盤點，沒有完成整包授權審查。

| 固定來源位置 | 實際聲明線索 | 尚待處理 |
|---|---|---|
| A src/jymain.c:2–4 | 作者及允許使用程式碼的聲明 | 確認適用檔案、後續貢獻與作者鏈 |
| A src/list.h:4–7 | 自述來自 Linux Kernel include/linux/list.h，經修改 | 追溯原始版本與適用條款；不能套用主程式聲明 |
| B src/jymain.cpp:2–4 | 類似作者／使用聲明 | 同樣不能涵蓋全部依賴 |
| B src/tsf.h:22–38 | MIT 標頭與通知保留條款 | 未決定採用；未整理產品通知清單 |
| B src/tml.h:16–34 | ZLIB 標頭及來源／修改標記／通知限制 | 先前紀錄漏列此依賴，現補入 |
| B src/miniz.h:6487–6506 | Unlicense 區段 | 核對實際引入版本及其他組成 |
| B src/ParticleSystem.h:3 | 指向 Cocos2dx 與 licenses 目錄 | 固定檔案樹未找到符合上述通知檔名的路徑；外部授權鏈未補齊 |

重跑兩次結果相同。A 的 Lua、B 的其他目錄、外部 SDL／Lua／BASS／smallpot／字型／音樂／素材不在此次 39 檔盤點範圍；一律保留待審，不能據此把候選標成可散布或可直接移植。

```powershell
.\.venv\Scripts\python.exe tools/analyzer/audit_source_notices.py references
```

新增 scarsty/kys-tools 的 FishEdit 0.72 保存來源（commit 1d439afe76dae41c821065c3a33c1c6709dc7fce），僅用於研究指令資料與文件。尚未完成作者／授權鏈審核，不能由公開保存判斷可直接複製或散布工具。未執行附帶 binary，未搬入產品。

新增候選：kys-jedisdl（4d225cb9b7b9a3ac46a796ecb0acde525ef72acc）與 sfe-kdef（04a5644ef8757bc7223bb7827cc1e19d74400a7a）。未找到足以判定整體可重用的授權證據；不複製或散布其程式碼、binary 或素材。前者 README 也提醒素材權利問題。具體研究範圍見 talk-kdef-source-analysis.md，不能將可檢查來源當成可採用授權。

更新：已取得兩候選來源，commit 見 [來源索引](source-index.md)。A 的 src/jymain.c:3–4 有作者及允許任意使用程式碼的聲明；B 的 src/jymain.cpp:4 亦有此聲明。不能推及所有檔案、後續貢獻或素材。

B 的 src/tsf.h 有 MIT 條款，src/miniz.h 有 Unlicense 聲明；src/ParticleSystem.h:3 要求另查 licenses 資料夾，仍需追查 Cocos2dx 原始來源。整個候選尚未通過逐檔授權審查，沒有搬入產品。

下列為初查紀錄，來源未取得的狀態已由上述更新取代：

[jinyong-legend](https://github.com/ZhanruiLiang/jinyong-legend)固定 commit 的根目錄未見明確 LICENSE；尚未審查逐檔標頭，不等於已證明沒有授權。另一候選 [jysdl-bh](https://github.com/scarsty/jysdl-bh)及 MOD 工具也尚未完成審查。

目前不可認定第三方程式碼可重用。需分別記錄程式碼、素材、字型與音樂的作者、版本、來源及條款。公開可取得不等於可散布；不搬入產品。
