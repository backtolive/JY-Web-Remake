# 候選建置依賴矩陣

2026-11-02。Phase 2；Status: 固定來源的靜態組態核對完成，尚未建置或完成授權審查。

A 固定 commit `89962d7fc2837c143e176c306d83b4e38dab6e77`，B 固定 commit `6fc81fb43df41b504af5310fca9fdd7bdb30e003`。本表只描述該版本的檔案，不推定目前最新版套件相容。

| 組態 | 明列工具與依賴 | 可選路徑／限制 |
|---|---|---|
| A src/Makefile | make、gcc／g++、sdl-config、SDL、SDL_image、SDL_mixer、SDL_ttf、Lua 5.1 | smpeg 與 HAS_SDL_MPEG 在 Makefile 中註解；不能預設必裝 |
| B Windows Debug／Release x64 | MSVC v145、Windows SDK 10.0；專案明列 bass.lib、bassmidi.lib、smallpot.lib | include／lib 指向作者 c:\project\local 與 smallpot；沒有可攜的依賴版本鎖定 |
| B Windows Win32 | 專案宣告 v145、Windows SDK 10.0 | 沒有 x64 組態同等的 include／lib 設定；不代表已具可用依賴 |
| B Android ARM64 CMake | CMake ≥3.22、C++23；SDL3、SDL3_image、SDL3_ttf、SDL3_mixer、Lua、iconv、charset、libzip | vcpkg arm64-android-dynamic 絕對路徑與直接 .so／.a；此檔未提供可直接重播的工具鏈／套件版本鎖定 |

## B 的實際原始碼需求

| 來源 | 依賴／條件 | 本輪判斷 |
|---|---|---|
| src/jymain.h:6–16、charset.h:4 | SDL3、image、ttf、Lua headers | 精確版本／ABI 待查；不直接套用 A 的 Lua 5.1 需求 |
| src/Audio.h:6–35、Audio.cpp:10–17 | BASSMODE、TSFMODE 的本機 define 均為註解；無外部定義時使用 SDL3_mixer | 不能由 vcxproj 的 bass.lib 推論實際採 BASS 後端；繼承的外部設定仍未知 |
| src/Audio.cpp:10–17 | TSFMODE 且非 BASSMODE 時包含 tsf.h／tml.h | MIT／ZLIB 通知盤點已記錄；目前不是預設啟用的證據 |
| src/PotConv.h:3、ZipFile.cpp:3 | iconv.h、zip.h | Windows 專案沒有在明列依賴中完整呈現；須核對外部連結設定，不能先斷言一定連結失敗 |
| src/sdlfun.cpp:6–8 | WIN32 條件包含 PotDll.h | 與 smallpot 庫及頭檔來源一併確認 |
| src/PotDllStub.h | 存在 Android stub | 本輪 src 搜尋未見其他檔案包含此 stub；不能只因檔案存在就當作已接入 Android 建置 |

MSBuild 的繼承屬性、匯入 props、命令列及環境可改變上述組態，因此此處列的是文字明載與條件需求，不是編譯後依賴圖。audit_source_notices.py 0.2.0 保留三個建置檔的 SHA256，並直接解析 vcxproj XML 的各組定義、toolset 與明載依賴，未展開繼承。

## 尚未關閉的前置條件

1. 選定單一研究建置目標，固定架構、編譯器、SDL／Lua 等實際版本及取得來源，再核對 API／ABI。
2. 對 B 釐清音效後端與專案連結清單差異、iconv／libzip 的 Windows 設定、smallpot 頭檔及庫的版本與權利鏈。
3. 補齊 A list.h、B 粒子系統的上游通知，以及所有實際啟用依賴的條款；字型／音樂／遊戲資源另列。
4. 再於隔離建置目錄配置工具鏈及執行；本輪沒有下載／安裝編譯器、修改候選來源或執行其 binary。

目前採用狀態仍為研究參考；不能由這份矩陣宣布候選可直接編譯、可散布或已符合 DOS 規則。原版 15／50 執行驗證獨立保持待辦。
