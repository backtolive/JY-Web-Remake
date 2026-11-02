# DOSBox-X 隔離環境 — 2026-11-02

Status: 使用者已確認可執行；本輪已直接觀察主選單並成功載入進度一至大地圖。詳見 [啟動與載入驗證](original-boot-load-smoke.md)。移動、功能選單、聲音及指令 15／50 仍待驗證。

## 下載與完整性

來源：[官方 GitHub 發行](https://github.com/joncampbell123/dosbox-x/releases/tag/dosbox-x-v2026.10.01)，版本 2026.10.01，Windows x64 MinGW portable。未變更系統 PATH，也未安裝至系統目錄。

檔案 `dosbox-x-mingw64-2026.10.01-portable.zip`，官方 release API 宣告 SHA256 與本機下載相符：

`def2d84d4415fc26c77252839b4dafb6b476e3a4204b896292e6b05505ca8c59`

解壓位置：`assets/generated/dosbox-x/runtime-2026.10.01`。選用 `mingw-build/mingw-sdl2/dosbox-x.exe`。下載、完整依賴與附帶授權保留在本機忽略提交的目錄，不將 binary 放入產品。

## 啟動與隔離

已準備好的本機環境，建議直接使用 CMD 啟動器開啟可見視窗：

```powershell
.\scripts\Start-OriginalGame.cmd
```

此啟動器直接執行 DOSBox-X 與既有隔離設定，不載入 PowerShell 腳本、不調整執行原則；若缺模擬器、設定或隔離副本會停止。設定由下方 PowerShell 準備流程產生。若環境要求數位簽章，未簽署的 ps1 可能無法執行；本次工作區已完成準備，不需要重新執行 ps1。

```powershell
# 僅建立設定與首次隔離副本
.\scripts\Start-OriginalGame.ps1 -PrepareOnly
# 由使用者明確要求可見視窗時啟動
.\scripts\Start-OriginalGame.ps1 -ShowWindow
```

腳本首次將 original/dos 的 627 檔複製至 `assets/generated/dosbox-x/session-001/game` 並逐檔核對 SHA256。再次啟動會保留該副本的遊戲進度，不覆寫。若需要全新實驗，應建立新的 session 目錄與複製驗證流程；不要把修改後副本當成未修改基準。

設定與日誌位於 session-001，capture 子目錄亦在此。只掛載隔離 game 子目錄為 DOS 的 C:，依原 PLAY.BAT 的入口執行 Z.COM，不執行 INSTALL.BAT。未掛載原始資料或整個使用者磁碟。

固定設定：svga_s3、32 MiB、normal core、fixed 20000 cycles、surface output、sbpro2 220／IRQ7／DMA1、MIDI 關閉。音效設定參照原 DIG.INI 的候選配置，但可聽性未驗證。官方[命令列說明](https://github.com/joncampbell123/dosbox-x/wiki/DOSBox%E2%80%90X%E2%80%99s-Command%E2%80%90Line-Options)記載 -conf 與 -nopromptfolder，已用於避免首次工作目錄提示。

## 本次驗證與限制

後續更新：已恢復可用的桌面觀察，成功載入進度一並由模擬器保存原生截圖。下列存取拒絕屬前次歷史，不再代表完全無法觀察畫面。新結果與證據範圍見 original-boot-load-smoke.md。

起初啟動被首次工作目錄選擇框阻擋；後以明確設定與 -nopromptfolder 排除。日誌記錄 DOS 內執行 z.com，繼而執行 LOGO.SCR；記錄頁面模式切換為 640×400。這證明啟動程式有執行，尚不證明遊戲選單或遊戲功能正常。

以 computer-use 技能取得首次對話框的可存取性資訊後，輸入失敗；重新選取並重試時回報 `GetCursorPos failed: 存取被拒。 (0x80070005)`。依技能規則停止桌面輸入，未繞過存取限制。因此沒有視覺確認、沒有點選遊戲選單、沒有執行原版事件案例。

本輪未宣稱 -version 執行成功；該嘗試曾觸發首次提示，不能把程序建立視為版本輸出證據。版本取自固定官方發行資訊。測試時啟動的背景程序於完成日誌檢查後關閉，避免留存不可見遊戲程序。

原始 627 檔 SHA256 再次比對不變。日誌、設定、遊戲副本與下載皆由 `.gitignore` 排除。下一步在可見桌面確認選單，再依 opcode-15-50-cases.md 建立可重播的原版案例；結果產生前維持 Pending Original Execution。
