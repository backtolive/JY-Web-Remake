# 開發規範

開始前閱讀 MASTER_PLAN.md、docs/PROGRESS.md 與 docs/TODO.md，檢查 git status，再列出本次計畫。當前範圍為 Phase 0 與 Phase 1、2 的公開研究；後續階段須先完成前階段驗收。

MASTER_PLAN v1.1 已核准「通用武俠 RPG 引擎＋金庸群俠傳內容包」方向。本次架構規劃修訂不代表已完成原版研究驗收或已啟動後續實作。Phase 6 先交付內容／腳本／規則／MOD／存檔的基礎契約；新增 Phase 13 的完整平台與編輯器依第 18 節在首個 MVP 後執行。階段依賴按主計畫的明訂執行順序判斷。

- 邏輯不得依賴 React 或 Babylon.js；UI、渲染與資料轉換分層。
- 引擎不得硬編碼金庸人物、場景、事件或結局；原版 ID 與指令由內容轉接器映射，未知指令不得直接成為通用腳本規格。
- 原版基底、原創包、MOD patch、素材與存檔分開保存。內容使用命名空間與穩定 ID；編輯器與遊戲共用版本化 Schema、引用驗證器及 Runtime。
- MOD 依賴、版本、優先權與衝突必須確定解析並診斷；不以載入順序默默覆寫不相容內容。
- 第一版存檔即保存基礎包／規則集及 MOD 的精確版本、雜湊、載入順序、設定與 Runtime 版本。缺包或變更先檢查相容性，遷移須備份並驗證，失敗不覆寫或丟棄舊狀態。
- 自製腳本使用受控 Runtime 與命令介面，具執行預算及可序列化續行點，不直接 eval 任意宿主程式碼；原創規則與原版還原證據分開記錄。
- 不修改原始資料、不提交商業資源、不因缺少資料虛構遊戲內容。測試資料必須標示 Mock。
- 不假設復刻引擎等同原版，不在授權確認前複製第三方程式碼。
- 轉換必須可重現，保留原檔名、資源 ID、偏移（若適用）、解析器版本及雜湊。
- 規則標示 Verified Original / Source Confirmed / Community Implementation / Inferred / Unknown；推論不能標記為原版驗證。
- 研究結論附來源與版本；找不到來源時記錄阻礙及驗證方法。
- 重要公式需測試；執行建置、型別檢查及相關測試。
- 缺資料、格式或授權不明、重大規則差異、測試失敗時停止受影響工作並回報。
- 每階段更新 PROGRESS、TODO 與 decisions，回報 Phase、Status、Completed Tasks、Files Changed、Tests Executed、Test Results、Research Findings、Known Limitations、Unverified Assumptions、Next Recommended Tasks。
