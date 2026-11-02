# 授權（2026-11-02）

新增 scarsty/kys-tools 的 FishEdit 0.72 保存來源（commit 1d439afe76dae41c821065c3a33c1c6709dc7fce），僅用於研究指令資料與文件。尚未完成作者／授權鏈審核，不能由公開保存判斷可直接複製或散布工具。未執行附帶 binary，未搬入產品。

新增候選：kys-jedisdl（4d225cb9b7b9a3ac46a796ecb0acde525ef72acc）與 sfe-kdef（04a5644ef8757bc7223bb7827cc1e19d74400a7a）。未找到足以判定整體可重用的授權證據；不複製或散布其程式碼、binary 或素材。前者 README 也提醒素材權利問題。具體研究範圍見 talk-kdef-source-analysis.md，不能將可檢查來源當成可採用授權。

更新：已取得兩候選來源，commit 見 [來源索引](source-index.md)。A 的 src/jymain.c:3–4 有作者及允許任意使用程式碼的聲明；B 的 src/jymain.cpp:4 亦有此聲明。不能推及所有檔案、後續貢獻或素材。

B 的 src/tsf.h 有 MIT 條款，src/miniz.h 有 Unlicense 聲明；src/ParticleSystem.h:3 要求另查 licenses 資料夾，仍需追查 Cocos2dx 原始來源。整個候選尚未通過逐檔授權審查，沒有搬入產品。

下列為初查紀錄，來源未取得的狀態已由上述更新取代：

[jinyong-legend](https://github.com/ZhanruiLiang/jinyong-legend)固定 commit 的根目錄未見明確 LICENSE；尚未審查逐檔標頭，不等於已證明沒有授權。另一候選 [jysdl-bh](https://github.com/scarsty/jysdl-bh)及 MOD 工具也尚未完成審查。

目前不可認定第三方程式碼可重用。需分別記錄程式碼、素材、字型與音樂的作者、版本、來源及條款。公開可取得不等於可散布；不搬入產品。
