# 來源與建置紀錄

## 本輪更新

2026-11-02：A 缺失 blob 已藉 fetch --refetch --no-filter 補回，指定 checkout 成功。Makefile 確認需 make、gcc／g++、sdl-config、SDL_image、SDL_mixer、SDL_ttf 與 Lua 5.1；smpeg 為註解中的可選項。

重試 make -C references/jinyong-legend/src：命令不存在，未進入編譯。Get-Command 未找到 GCC。未執行倉庫內 binary。

B 已完整 shallow clone，commit 見來源索引。src/jysdllua.vcxproj:32 等要求 v145，107、128 有作者本機絕對 include 路徑，116、143 連結 bass.lib、bassmidi.lib、smallpot.lib。未找到 msbuild；vswhere -products '*' -format json 回傳 []。未執行 B 建置，須先配置工具鏈、查依賴授權及調整隔離副本路徑。

有明確建置前置失敗紀錄，但沒有成功編譯／執行。尚不能判定來源編譯錯誤。

## 前次紀錄

2026-11-02，Windows PowerShell。

1. 初次 git ls-remote 因網路限制失敗。
2. 允許網路的執行環境以 git clone --depth 1 --filter=blob:none --no-checkout 取得候選倉庫的 commit 與檔案樹。
3. git rev-parse HEAD：89962d7fc2837c143e176c306d83b4e38dab6e77。
4. 指定檔案 checkout 回報 unable to read sha1 file，包括 src/Makefile、src/jymain.c 與 Lua 檔。
5. make -C references/jinyong-legend/src 失敗：make 未安裝／不在 PATH。尚未進入編譯，更未執行遊戲。

Status: 來源取得／建置前置受阻。不是程式編譯失敗的證據。下一步取得完整指定來源，查授權與 Makefile，再配置工具鏈和依賴重試。隔離 partial clone 不是完整 checkout。
