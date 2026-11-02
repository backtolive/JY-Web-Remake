# 引擎比較（2026-11-02）

新增候選 kys-jedisdl：Object Pascal，固定 commit 4d225cb9b7b9a3ac46a796ecb0acde525ef72acc；已確認直接讀取 TALK／KDEF 與事件 50 分派。尚未建置執行、授權待查，不取代既定採用決策。詳細來源位置見 talk-kdef-source-analysis.md。

更新：兩候選已取得指定來源並固定 commit，見 [來源索引](source-index.md)。A 下載阻礙已解除，B 為 6fc81fb43df41b504af5310fca9fdd7bdb30e003。下表為初查狀態，最新建置與授權情況見 validation/engine-build.md 及 license-review.md。

| 候選 | 已確認 | 未確認 |
|---|---|---|
| [jinyong-legend](https://github.com/ZhanruiLiang/jinyong-legend) | 公開 C／Lua 檔案樹，含 Makefile、事件及轉換腳本路徑 | 授權、實作內容、DOS 相容性；取得與建置受阻 |
| [jysdl-bh](https://github.com/scarsty/jysdl-bh/blob/master/README.md) | README 描述 C++、SDL3，首頁列出 solution | 未固定 commit、未編譯、授權及規則完整性待查 |

第一候選固定 commit：89962d7fc2837c143e176c306d83b4e38dab6e77。不能由名稱判定完整上游。沒有已確認可直接採用的遊戲模組。
