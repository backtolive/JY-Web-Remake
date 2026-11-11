# 版本與授權研究狀態（2026-11-03）

## 原版版本

- 使用者提供的安裝目錄共 627 檔、128,510,353 bytes；檔案日期多為 1996/10/25。
- 主執行檔為 `LEGENDX.EXE`，DOS4GW runtime；字串中可見 `1.02` 片段，但尚未找到明確版本宣告或發行說明。
- 尚未取得原版標題畫面、選單或檔案清單中的正式版本字串；需在 DOSBox-X 可見桌面確認。
- 編碼仍以 Big5/CP950 假設為主，尚未完成全資料與字型一致性驗證。

## 候選來源授權

- 已固定兩個候選研究來源 commit：kys-jedisdl 與 jinyong-legend。
- `audit_source_notices.py` 對 39 個 C/C++ 檔與候選 notice 路徑做固定版本盤點；7 個檔案含聲明關鍵字，但未找到符合 LICENSE/COPYING/NOTICE 命名的路徑。
- jinyong-legend 含 SDL3_mixer、BASS/BASSMIDI、smallpot 等依賴；Windows/Android 組態與外部依賴仍待釐清。
- sfe-kdef 缺少核心原始碼，不能以附帶 binary 視為完整來源。
- 本盤點只是 marker 掃描，不構成法律結論；完整授權審查仍待執行。

## 研究限制

- 未編譯或執行候選引擎；未取得 FishEdit 0.72 一手來源。
- 原版版本、編碼、取得來源與檔案完整性尚未獨立交叉驗證。
- 任何採用第三方程式碼前，仍需完成授權與可重用性 ADR。

## 2026-11-03 追查結果

### 原版版本

- 已對 `original/dos` 全部檔案做 Big5/CP950 關鍵字掃描；僅 `AILDRVR.LST` 與 `MDI.INI` 含 `ver`，未找到遊戲本體版本宣告。
- `LEGENDX.EXE` ASCII 字串中可見 `1.02` 片段，但無法確認是否為正式發行版本。
- DOSBox-X 已可啟動並載入進度一，但自動輸入與桌面觀察受限；版本證據仍需手動在可見桌面擷取標題畫面。
- 目前版本結論維持 Unknown，不應把 `1.02` 片段標記為 Verified Original。

### FishEdit 0.72 來源

- 本次網路搜尋未找到 FishEdit 0.72 的一手來源或授權頁面；現有 `references` 中只有 FishEdit.ini 與相關工具檔案，未含完整核心原始碼。
- 目前仍只能以 kys-jedisdl 與 jinyong-legend 作為候選參考，不能把 FishEdit 視為完整來源。

### 授權審查

- `audit_source_notices.py` 已對固定 commit 的 39 個 C/C++ 檔與候選 notice 路徑做盤點；7 個檔案含聲明關鍵字，但未找到 LICENSE/COPYING/NOTICE 命名檔案。
- jinyong-legend 的 Windows/Android 組態仍含 BASS/BASSMIDI/smallpot 與 SDL3_mixer 依賴；授權與可重用性尚未結案。
- 本次未編譯或執行任何第三方程式，未複製授權未明程式碼。

## 後續方法

- 在隔離 DOSBox-X 環境啟動原版，手動保存標題畫面與版本證據；自動輸入修復後再建立可重播案例。
- 繼續追查 FishEdit 0.72 一手來源與授權；若無法取得，則以 kys-jedisdl 與 Pascal 來源作為有限參考並明確標記限制。
- 完成逐檔與外部依賴授權審查後，再決定是否採用候選引擎。