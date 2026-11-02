# 金庸群俠傳 Web 2.5D／3D 重製專案
## MASTER_PLAN.md — Codex 開發總計劃

**專案代號：** JY-Web-Remake  
**版本：** 1.0  
**開發模式：** ChatGPT Desktop + Codex  
**目標平台：** 現代桌面與行動瀏覽器（桌面優先）  
**專案性質：** 原始遊戲資料逆向、規則移植、現代化 3D 重製

---

# 1. 專案目標

將 DOS 版《金庸群俠傳》重製成可在瀏覽器執行的現代 2.5D／3D RPG。

保留原版遊戲的核心玩法、劇情、角色、武功、道具、戰鬥、事件條件及結局，全面重新製作視覺呈現。

## 1.1 核心原則

1. 優先重用已存在的遊戲資料解析與復刻成果。
2. 不要求保留原始 DOS EXE。
3. 遊戲邏輯與畫面渲染必須分離。
4. 不限制原始圖片尺寸、色盤或像素風格。
5. 先確認原始規則，再實作新引擎。
6. 先完成可玩的最小場景，再擴展完整遊戲。
7. 所有推導出的規則都必須有來源與驗證紀錄。
8. 原始素材與新素材必須能透過相同資源 ID 切換。

## 1.2 最終成果

- 完整的遊戲資料解析工具
- 原始遊戲資料結構文件
- 遊戲事件及計算規則規格
- 可搜尋的事件／劇情流程圖
- 可執行的 TypeScript 遊戲規則引擎
- 2.5D／3D Web 渲染引擎
- 高畫質角色、地圖、建築與動畫素材
- 戰鬥系統、對話系統、道具系統
- Save／Load 系統
- 原版與 Web 版差異測試工具
- 可部署的 Web 遊戲

---

# 2. 技術架構

## 2.1 建議技術

| 模組 | 技術 |
|---|---|
| 原始資料分析 | Python / C# |
| 原始碼逆向輔助 | Ghidra |
| 原版行為驗證 | DOSBox-X |
| 遊戲規則 | TypeScript |
| 3D 渲染 | Babylon.js |
| UI | React |
| 建模 | Blender |
| 3D 資源格式 | glTF / GLB |
| 圖像格式 | PNG / WebP |
| 音效 | Web Audio API |
| 存檔 | IndexedDB |
| 開發測試 | Vitest / Playwright |
| 劇情資料分析 | SQLite |
| 流程圖 | Mermaid / Cytoscape.js |
| 建置 | Vite / pnpm |

技術選型屬於初始建議。Codex 必須先檢查來源專案的技術、授權、資料結構及可重用程度，再確認最終架構。

## 2.2 架構分層

```text
Original Game Data
        |
        v
Data Extraction & Reverse Engineering
        |
        v
Canonical Game Data
        |
        +---------------------+
        |                     |
        v                     v
Game Logic Engine       Asset Pipeline
        |                     |
        +----------+----------+
                   |
                   v
             Web Runtime
                   |
         +---------+---------+
         |                   |
         v                   v
    3D Renderer           React UI
         |                   |
         +---------+---------+
                   |
                   v
            Browser Game
```

遊戲邏輯不得依賴 Babylon.js 或 React。

渲染器應透過標準化遊戲狀態讀取場景、人物及動畫資訊。

---

# 3. Phase 0：建立專案與開發規範

## 工作項目

1. 建立 Git Repository。
2. 建立 Monorepo。
3. 設定 TypeScript、Python 開發環境。
4. 建立 Codex 開發規範。
5. 建立任務追蹤與研究紀錄。
6. 建立自動化測試環境。
7. 設計原始資料與產生資料的隔離機制。

## 建議目錄

```text
jy-web-remake/
├── AGENTS.md
├── MASTER_PLAN.md
├── README.md
├── docs/
│   ├── research/
│   ├── architecture/
│   ├── formats/
│   ├── game-rules/
│   ├── decisions/
│   └── validation/
├── original/
│   └── README.md
├── references/
├── tools/
│   ├── extractor/
│   ├── analyzer/
│   ├── converter/
│   └── validator/
├── packages/
│   ├── game-data/
│   ├── game-core/
│   ├── game-scripts/
│   ├── game-renderer/
│   └── game-ui/
├── apps/
│   ├── web/
│   └── editor/
├── assets/
│   ├── original/
│   ├── remastered/
│   └── generated/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── regression/
│   └── golden/
└── scripts/
```

原始商業遊戲檔案預設不得提交至 Git。應使用 `.gitignore` 排除，並保存檔案雜湊以供版本辨識。

### 驗收標準

- 專案可以正常建置。
- 測試框架可以執行。
- Codex 可以讀取 AGENTS.md。
- 文件與程式碼目錄結構建立完成。

---

# 4. Phase 1：取得與盤點原始遊戲資料

## 4.1 取得資料

使用合法取得的 DOS 版《金庸群俠傳》遊戲資料。

優先取得完整遊戲目錄，而非只有可執行檔。

## 4.2 資料盤點

Codex 必須建立檔案掃描工具，產生：

- 檔案名稱
- 相對路徑
- 檔案大小
- SHA256
- 檔案格式推測
- 可能用途
- 是否有已知解析器
- 解析狀態

優先研究的檔案類型：

```text
*.EXE
*.IDX
*.GRP
*.COL
*.DAT
*.BIN
*.SAV
```

上述副檔名只是候選，必須以實際檔案及格式驗證為準。

## 4.3 建立資料盤點報告

輸出：

```text
docs/research/original-file-inventory.md
docs/research/game-version.md
docs/research/file-format-status.md
```

### 驗收標準

- 所有原始檔案完成盤點。
- 能辨識實際遊戲版本。
- 已知哪些資料可直接解析。
- 未知格式列入研究清單。
- 不修改原始檔案。

---

# 5. Phase 2：研究 JY_SDL_LUA 與既有 MOD 工具

這是專案最重要的前期研究階段之一。

## 5.1 研究目標

研究公開的《金庸群俠傳》復刻引擎、MOD 工具及資料格式文件。

優先調查：

- JY_SDL_LUA
- JY_SDL_LUA 相關分支
- jinyong-legend
- KGEdit
- FishEdit / SFE
- 原版 IDX / GRP 資料解析工具
- 既有地圖編輯器
- 事件腳本編輯工具

候選來源：

https://github.com/ZhanruiLiang/jinyong-legend

注意：不得直接假設上述專案等同於完整 JY_SDL_LUA 上游，或已包含原版全部規則。必須實際檢查 Repository、版本、授權及功能。

## 5.2 研究內容

對每個候選專案確認：

1. 是否仍能取得原始碼。
2. 使用哪種程式語言。
3. 能否成功編譯與執行。
4. 支援哪個《金庸群俠傳》版本。
5. 能否解析原版資料。
6. 地圖、角色、戰鬥、事件的實作方式。
7. 是否使用 Lua 劇情腳本。
8. 是否已還原遊戲計算規則。
9. 是否存在已知錯誤或與原版不同的行為。
10. 原始碼授權是否允許預定的重製與發布方式。

## 5.3 輸出文件

```text
docs/research/engine-comparison.md
docs/research/jy-sdl-lua-analysis.md
docs/research/mod-tools.md
docs/research/reusable-components.md
docs/research/license-review.md
```

### 驗收標準

- 至少一個候選引擎完成實際建置或有明確的建置失敗紀錄。
- 能列出可重用與必須重寫的模組。
- 能確認事件、戰鬥及資料解析是否已有現成實作。
- 產生後續採用方案的 Architecture Decision Record。

---

# 6. Phase 3：建立原始資料解析器

## 6.1 目標

將原始遊戲資料轉換成現代 Web 引擎可以使用的標準格式。

## 6.2 解析範圍

### 圖像

- 人物頭像
- 行走動畫
- 戰鬥動畫
- 場景圖塊
- 大地圖
- 武功特效
- UI 圖像

### 地圖

- 地圖 ID
- 地圖尺寸
- 地面圖層
- 物件圖層
- 遮擋資訊
- 碰撞資料
- NPC 位置
- 傳送點
- 事件觸發點

### 遊戲資料

- 人物屬性
- 武功
- 道具
- 裝備
- 商店
- 戰鬥參數
- 事件定義
- 對話文字
- 結局條件

## 6.3 標準化資料

範例：

```json
{
  "mapId": 12,
  "name": "example_map",
  "width": 64,
  "height": 64,
  "layers": [],
  "collision": [],
  "npcs": [],
  "events": []
}
```

欄位應以實際解析結果調整，不得把範例當成原版已確認的結構。

## 6.4 保留原始索引

每一筆轉換資料必須保留：

- 原始檔名
- 原始資源 ID
- 原始偏移位置（若適用）
- 解析器版本
- 資料雜湊
- 轉換後資源 ID

這是後續進行素材替換、除錯及回溯的基礎。

### 驗收標準

- 可以批次解析已支援的原版資料。
- 可以輸出可檢視的地圖及人物資源。
- 可以將原始 ID 對應到新資料。
- 相同輸入能產生可重現的輸出。
- 未支援資料必須明確報告，不能默默略過。

---

# 7. Phase 4：還原遊戲規則與計算公式

## 7.1 目標

建立與畫面無關、可以獨立執行的遊戲規則引擎。

## 7.2 需要還原的系統

### 人物系統

- 基礎屬性
- 生命、內力
- 攻擊、防禦
- 經驗值
- 升級
- 屬性上限
- 狀態異常

### 武功系統

- 武功學習條件
- 武功等級
- 傷害計算
- 攻擊範圍
- 內力消耗
- 特殊效果

### 戰鬥系統

- 行動順序
- 移動範圍
- 攻擊判定
- 命中與傷害
- AI 行動
- 戰鬥勝敗
- 戰後獎勵

### 事件系統

- 事件觸發條件
- 道具條件
- 人物入隊條件
- 事件旗標
- 劇情跳轉
- 事件優先權
- 結局判定

### 存檔系統

- 遊戲變數
- 地圖位置
- 隊伍狀態
- 已完成事件
- 道具與裝備
- 隨機數狀態（若原版需要）

## 7.3 規則來源分級

每一條規則都必須標示來源：

- **Verified Original**：已用原版實際驗證
- **Source Confirmed**：已由可檢查的原始碼或反編譯證實
- **Community Implementation**：來自復刻引擎
- **Inferred**：根據觀察推導
- **Unknown**：尚未確認

不可把社群復刻引擎的行為直接當作原版正確規則。

## 7.4 規則文件

每個計算公式應包含：

```text
Rule ID
Description
Inputs
Outputs
Formula
Boundary Conditions
Randomness
Source Reference
Confidence Level
Test Cases
```

### 驗收標準

- 遊戲規則不依賴 UI 或 3D 引擎。
- 重要公式具備單元測試。
- 未確認規則有明確標記。
- 原版與新引擎可以執行相同測試案例。

---

# 8. Phase 5：建立事件與劇情分析系統

## 8.1 目標

還原遊戲的事件、對話、條件與分支關係，建立完整的事件流程圖。

## 8.2 需要擷取的資訊

- 事件 ID
- 對話內容
- NPC
- 觸發位置
- 前置條件
- 選項
- 變數變化
- 道具取得與消耗
- 事件跳轉
- 後續事件
- 結局條件

## 8.3 分支分析

採用靜態腳本分析與動態驗證相結合的方式。

需要支援：

- 條件分支
- 多重條件
- 事件循環
- 不可到達事件
- 多條路線匯合
- 狀態相依的分支

不可只依畫面或對話文字相同就合併事件節點。

## 8.4 截圖對應

為每個實際可顯示的事件建立：

```text
Event ID
Dialogue ID
Screenshot Path
Map ID
Character IDs
Required State
Source Script Location
```

若原始事件能直接從腳本取得，但尚未實際執行，應標記為未驗證截圖。

## 8.5 輸出

- JSON 劇情圖
- SQLite 事件資料庫
- Mermaid 靜態流程圖
- Cytoscape.js 互動式流程圖
- 事件搜尋與條件查詢工具

### 驗收標準

- 可以追蹤事件的前置條件與後續事件。
- 可以搜尋特定人物、道具或旗標相關的事件。
- 可以顯示事件對應的遊戲截圖。
- 可以統計已驗證、未驗證與未解析事件。

---

# 9. Phase 6：建立 Web 遊戲核心

## 9.1 目標

使用 TypeScript 實作獨立的遊戲狀態機。

## 9.2 核心模組

```text
GameState
GameLoop
MapSystem
CharacterSystem
PartySystem
InventorySystem
EquipmentSystem
MartialArtsSystem
BattleSystem
EventSystem
DialogueSystem
SaveLoadSystem
RandomSystem
```

## 9.3 核心要求

所有遊戲行為應透過標準化命令執行，例如：

```typescript
game.dispatch({
  type: "PLAYER_MOVE",
  direction: "north"
});
```

執行後產生新的遊戲狀態與事件：

```typescript
{
  state: nextGameState,
  events: [
    { type: "PLAYER_MOVED" },
    { type: "MAP_EVENT_TRIGGERED", eventId: 120 }
  ]
}
```

實際 API 可調整，但必須維持遊戲規則與渲染器解耦。

### 驗收標準

- 不啟動畫面也能執行遊戲邏輯。
- 可以載入原版轉換資料。
- 可以模擬移動、事件與戰鬥。
- Save／Load 可以完整恢復狀態。
- 核心規則具備自動化測試。

---

# 10. Phase 7：建立 2.5D／3D 場景系統

## 10.1 初期策略

使用真正的 3D 場景，但先採用固定斜角鏡頭。

後續保留鏡頭旋轉與第三人稱模式的擴充能力。

## 10.2 座標轉換

建立兩套座標：

**Logic Coordinates**

原始遊戲的地圖格子、事件與碰撞座標。

**World Coordinates**

現代 3D 引擎使用的空間座標。

兩者透過 MapCoordinateAdapter 轉換。

不得直接把原版格子座標當成所有 3D 物件的唯一位置資料。

## 10.3 地圖生成

由原版地圖資料建立：

- 地形
- 道路
- 建築位置
- 場景物件
- NPC 生成點
- 碰撞區域
- 傳送區域
- 事件觸發區域

3D 建築高度、背面、屋頂及室內結構需要另外建模，不能假設能從原始 2D 圖塊自動完整還原。

## 10.4 人物系統

人物模型需支援：

- Idle
- Walk
- Run（可選）
- Talk
- Attack
- Hit
- Defeat
- Special Skill

原始遊戲邏輯座標仍然決定角色移動與事件判定。

### 驗收標準

第一個場景至少可以：

- 正確顯示地圖
- 操作主角移動
- 阻擋不可通行區域
- 與 NPC 對話
- 觸發事件
- 切換場景
- 存檔與讀檔

---

# 11. Phase 8：建立高畫質素材製作流程

## 11.1 目標

讓原版素材與新素材可以透過統一資源 ID 對應。

## 11.2 素材類型

- 3D 人物模型
- 角色頭像
- 建築模型
- 地形材質
- 場景物件
- 戰鬥特效
- UI 圖示
- 動畫
- 光影及粒子效果

## 11.3 素材替換規則

原始素材：

```text
character_001
map_tile_012
building_008
effect_020
```

新素材：

```text
characters/character_001.glb
terrain/map_tile_012.glb
buildings/building_008.glb
effects/effect_020.glb
```

上述名稱為規劃示例，實際映射必須以解析得到的原始 ID 為準。

## 11.4 AI 輔助素材生成

可使用 AI 產生概念圖、角色設計、材質及部分 3D 素材，但必須經過：

1. 美術風格一致性檢查
2. 尺寸與比例校正
3. 模型拓樸與動畫檢查
4. 角色識別一致性檢查
5. 場景座標與碰撞校正
6. 人工審核

不應將未經驗證的 AI 生成素材直接大量匯入遊戲。

### 驗收標準

- 可以切換原版與新素材。
- 素材 ID 不影響遊戲邏輯。
- 新模型不會改變原始事件判定。
- 具備資源載入失敗時的替代方案。

---

# 12. Phase 9：戰鬥系統現代化

## 12.1 原則

保留原版戰鬥計算規則，重新設計視覺表現。

## 12.2 工作項目

- 原版戰鬥地圖解析
- 戰鬥座標轉換
- 回合與行動順序
- 角色移動動畫
- 武功攻擊動畫
- 武功範圍顯示
- 傷害數字
- 戰鬥 UI
- 戰鬥 AI
- 勝敗與獎勵

## 12.3 規則與動畫分離

例如：

```text
BattleEngine:
  Calculate Damage
  Apply Damage
  Update State
  Emit Battle Events

BattleRenderer:
  Play Attack Animation
  Show Effects
  Show Damage Numbers
```

動畫時間不得任意改變戰鬥計算結果。

### 驗收標準

- 可以完成一場完整戰鬥。
- 戰鬥計算可以與原版比對。
- 動畫可以替換而不影響戰鬥規則。
- AI 行為可以獨立測試。

---

# 13. Phase 10：Save／Load 與遊戲資料管理

## 13.1 存檔內容

- 遊戲版本
- 地圖與人物位置
- 人物屬性
- 隊伍
- 道具
- 武功
- 事件旗標
- 劇情進度
- 戰鬥狀態（若允許戰鬥中存檔）
- 隨機數狀態（若適用）

## 13.2 需求

- 多存檔槽
- 自動存檔
- 存檔版本管理
- 存檔完整性驗證
- 舊版本存檔遷移

若可行，另外研究原版 DOS 存檔格式轉換。

### 驗收標準

存檔後重新載入，所有可觀察的遊戲狀態必須一致。

---

# 14. Phase 11：原版與 Web 版自動化差異測試

這是確保重製忠實度的重要階段。

## 14.1 測試架構

```text
Test Scenario
      |
      +--> Original Game
      |
      +--> Web Game
      |
      v
Compare State & Result
      |
      v
Difference Report
```

## 14.2 原版測試方式

視情況使用：

- DOSBox-X
- 記憶體分析
- 原版存檔比較
- 事件腳本追蹤
- 自動按鍵操作
- 截圖擷取

若使用復刻引擎作為比較對象，必須清楚標示它不是原版 DOS 執行結果。

## 14.3 比對項目

- 人物屬性
- 道具變化
- 事件旗標
- 對話選項
- 劇情跳轉
- 武功傷害
- 戰鬥結果
- 隊伍狀態
- 存檔還原

## 14.4 邊界測試

- 最小值
- 最大值
- 條件門檻
- 多條件同時成立
- 隨機結果
- 重複事件
- 不可到達分支

### 驗收標準

所有已確認的規則必須有測試案例。發現差異時，先分析原版行為，再決定是否修正 Web 版本。

---

# 15. Phase 12：效能優化與部署

## 15.1 優化目標

- 模型與材質載入
- 場景切換
- 動畫效能
- GPU 記憶體使用
- Draw Calls
- 資源快取
- 低階設備降級
- 長時間遊戲穩定性

## 15.2 部署

優先使用靜態 Web 部署架構。

若不需要帳號、雲端存檔或多人功能，初期不建立後端服務。

### 驗收標準

- 可在主流桌面瀏覽器執行。
- 場景切換不造成遊戲狀態遺失。
- 遊戲存檔可以正常保存。
- 無持續性記憶體洩漏。
- 建立正式部署與版本發布流程。

---

# 16. 第一個 MVP：主角居所

第一個可玩的場景選擇原版主角居所。

此階段不追求完整美術品質，而是驗證整套技術架構。

## MVP 範圍

1. 從原版資料取得場景資訊。
2. 還原地圖結構。
3. 建立簡單 3D 場景。
4. 顯示主角模型。
5. 操作角色移動。
6. 驗證碰撞。
7. 觸發一個原版事件。
8. 顯示原版對話。
9. 完成場景切換。
10. 支援 Save／Load。
11. 產生原版與 Web 版的驗證報告。

## MVP 完成定義

玩家可以在瀏覽器進入主角居所、移動、互動、觸發事件並正常存檔。

此時才開始大規模製作 HD 素材及其他場景。

---

# 17. Codex 工作規則

以下規則應同步寫入 AGENTS.md。

## 17.1 開始工作前

Codex 必須：

1. 閱讀 MASTER_PLAN.md。
2. 檢查目前 Repository。
3. 確認當前 Phase。
4. 檢查已完成任務。
5. 產生本次工作計劃。
6. 只執行當前核准的 Phase。

## 17.2 研究規則

- 不得捏造遊戲檔案格式。
- 不得假設社群引擎與原版完全一致。
- 不得將推測的計算公式標記為已驗證。
- 所有逆向結論必須附來源。
- 優先研究現有工具，不重複造輪子。
- 找不到來源時，必須記錄阻礙與後續研究方法。

## 17.3 開發規則

- 遊戲邏輯與渲染分離。
- 所有資料轉換必須可重現。
- 重要計算公式必須有測試。
- 不得直接修改原始遊戲資料。
- 不得在未確認授權前大量複製第三方程式碼。
- 不得把受版權保護的原始遊戲資源提交至公開 Repository。
- 不得因為缺少原始資料而虛構遊戲內容。
- 可使用測試資料建立框架，但必須明確標示為 Mock。

## 17.4 每階段結束時

Codex 必須輸出：

```text
Phase:
Status:
Completed Tasks:
Files Changed:
Tests Executed:
Test Results:
Research Findings:
Known Limitations:
Unverified Assumptions:
Next Recommended Tasks:
```

並更新：

```text
docs/PROGRESS.md
docs/TODO.md
docs/decisions/
```

## 17.5 階段控制

在進入下一階段前，必須先完成當前階段的驗收標準。

如果遇到以下情況，應停止相關工作並回報：

- 缺少必要原始資料
- 無法確認資料格式
- 引擎來源或授權不明
- 規則存在重大差異
- 需要使用者決定美術或架構方向
- 自動化測試無法通過

不應為了推進進度而以猜測填補未知的遊戲規則。

---

# 18. 建議執行順序

| 順序 | Phase | 優先級 |
|---|---|---|
| 1 | 專案初始化 | P0 |
| 2 | 原始遊戲資料盤點 | P0 |
| 3 | JY_SDL_LUA / MOD 工具研究 | P0 |
| 4 | 原始資料解析器 | P0 |
| 5 | 遊戲規則分析 | P0 |
| 6 | 事件與劇情分析 | P1 |
| 7 | Web 遊戲核心 | P0 |
| 8 | 第一個 3D 場景 MVP | P0 |
| 9 | HD 素材製作流程 | P1 |
| 10 | 戰鬥系統 | P1 |
| 11 | Save／Load 完善 | P1 |
| 12 | 自動化差異測試 | P0，從早期持續執行 |
| 13 | 效能優化與部署 | P2 |

Phase 可依研究結果調整，但不得跳過原始資料與遊戲規則驗證。

---

# 19. Codex 第一個任務

## 任務：初始化專案並研究既有復刻引擎

請依照本計劃書執行 Phase 0，並開始 Phase 1、Phase 2 的可公開研究部分。

具體工作：

1. 建立專案目錄與 Git 結構。
2. 建立 AGENTS.md。
3. 建立開發環境與測試框架。
4. 搜尋並檢查 JY_SDL_LUA 及相關復刻專案。
5. 研究現有 MOD 工具及原始資料格式。
6. 建立引擎比較報告。
7. 建立原始遊戲資料匯入規範。
8. 確認哪些遊戲規則可以直接利用既有程式碼。
9. 列出必須由使用者提供的原始遊戲檔案。
10. 產生下一階段的詳細工作清單。

### 本次工作限制

- 不要開始大規模 3D 建模。
- 不要直接重寫戰鬥引擎。
- 不要自行創造原版遊戲資料。
- 不要假設已有原始遊戲檔案。
- 不要直接把第三方引擎複製進主專案。
- 先完成來源、授權、可重用性與資料結構研究。

### 第一階段交付成果

```text
AGENTS.md
MASTER_PLAN.md
README.md
docs/PROGRESS.md
docs/TODO.md
docs/research/engine-comparison.md
docs/research/jy-sdl-lua-analysis.md
docs/research/mod-tools.md
docs/research/original-file-inventory.md
docs/research/reusable-components.md
docs/research/license-review.md
```

完成後，回報目前可重用的技術成果、尚未確認的問題，以及下一個最合理的實作任務。

**最終原則：先還原遊戲資料與規則，再以現代 3D 技術重新呈現。不要把遊戲邏輯綁定在任何特定的畫面引擎上。**
