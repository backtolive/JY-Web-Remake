# 金庸群俠傳 Web 2.5D／3D 重製專案
## MASTER_PLAN.md — Codex 開發總計劃

**專案代號：** JY-Web-Remake  
**版本：** 1.3（2026-11-02：逐功能驗收及第一個場景 MVP 前置範圍）
**開發模式：** ChatGPT Desktop + Codex  
**目標平台：** 現代桌面與行動瀏覽器（桌面優先）  
**專案性質：** 通用武俠 RPG 引擎、原始遊戲資料逆向、金庸群俠傳內容包、現代化 3D 重製與 MOD 創作平台

---

# 1. 專案目標

將 DOS 版《金庸群俠傳》重製成可在瀏覽器執行的現代 2.5D／3D RPG。

核心產品架構為「通用武俠 RPG 引擎＋金庸群俠傳內容包」。引擎提供通用狀態、規則執行、事件、對話、地圖與資源服務；人物、地圖、武功、劇情、結局及遊戲特定規則由版本化內容包提供。可在不修改引擎原始碼的情況下建立原創 RPG。

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
9. 引擎不得硬編碼金庸人物、場景、事件編號或結局；原版數值 ID 經內容轉接器映射為具命名空間的穩定 ID。
10. 原版忠實度驗證針對指定版本的金庸內容包與規則集；MOD 的刻意變更必須獨立記錄與測試。
11. 內容包格式、驗證、腳本執行及存檔相容性在 Phase 6 納入核心設計；完整平台與編輯器由新增 Phase 13 交付。

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
- Game Content Package 格式、JSON Schema 與資料驗證器
- Event／Dialogue Script Runtime、Rule Engine 與條件運算器
- MOD 載入、依賴解析、優先權、衝突檢查與版本管理
- 劇情／事件視覺化編輯器、地圖及 NPC 編輯器
- 自動化劇情測試與 MOD 匯入／匯出工具
- 原版、原創、MOD 與使用者存檔的隔離機制

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
Canonical Game Data --> Jin Yong Content Package
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

## 2.3 通用引擎與內容平台邊界

```text
DOS Data -> Verified Import Adapter -> Jin Yong Content Package
Authoring / Editors ---------------> Original Content Packages / MODs
                                              |
                         Schema + Reference + Dependency Validation
                                              |
                         Resolve Packages -> Ordered Content Registry
                                              |
                Generic Wuxia RPG Engine + Versioned Rule / Script Runtime
                                              |
                                 Renderer / UI / Save Services
```

通用引擎只依賴公開內容契約，不直接讀取 DOS 檔案。DOS 指令相容性與來源追蹤由金庸內容轉接層處理；未確認的指令不能直接升格為通用腳本規格。原創規則可明確定義，但不能標記為已驗證原版規則。

內容 ID 使用 package namespace 與 local ID 組合，確切字串格式在 Schema ADR 決定。內容包、規則集、腳本格式、引擎 API 與存檔格式分別版本化。編輯器與遊戲共用 Schema、驗證器與 Runtime，避免兩套事件語意。

建議新增 `packages/content-schema`、`packages/content-runtime`、`packages/mod-loader` 與 `content/`，沿用 `apps/editor`；這是後續目錄規劃，不表示現已實作。原版轉換產物與原始商業素材持續排除公開提交。

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
3. 記錄建置可行性；只有具體研究問題需要執行時才配置工具鏈與建置，不作 Web 重製的共同前置。
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

- 候選來源與版本、可檢查的實作位置及研究限制有紀錄；參考引擎可僅作靜態研究，按需建置，不要求成功編譯。
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

解析器先保留原始 ID、bytes 與 provenance，再由內容轉接器產出版本化 Game Content Package。原版資料與作者新增內容分開儲存；對原版的變更透過 MOD patch 描述，不能覆寫匯入基底。內容包的正式契約與驗證介面最晚在 Phase 6 定稿。

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

同時建立通用武俠 RPG 核心與內容平台的最小契約，使金庸內容包與不含金庸資料的 Mock 原創內容包都能由同一引擎載入。完整平台工具在 Phase 13 擴充。

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
ContentRegistry
ContentValidator
ScriptRuntime
RuleEngine
ConditionEvaluator
ModResolver
ContentCompatibilityService
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

## 9.4 提前納入核心的內容與 MOD 契約

1. 定義 Game Content Package manifest、命名空間、穩定 ID、內容引用、來源與授權資訊，以及引擎／Schema／Runtime 相容版本。
2. 建立 JSON Schema 與驗證介面；除結構外，驗證跨檔引用、重複 ID、型別、資源與事件條件。錯誤須指出 package、檔案與欄位位置。
3. 定義 Event／Dialogue 的版本化宣告式腳本或受控 IR，支援條件、選項、狀態改變與流程控制。腳本經標準命令改變狀態，能序列化暫停點並在讀檔後繼續。
4. Rule Engine 與條件運算器獨立於 UI；內容包透過受控規則介面提供角色、武功、戰鬥及結局規則。條件不得隱藏寫入狀態，隨機與時間由引擎注入並可重播。
5. MOD resolver 產生確定的依賴圖、載入順序與解析結果。缺依賴、版本不符、循環依賴或未解決衝突時，在進入遊戲前提供診斷。
6. 存檔從第一版即保存精確內容組合與 Runtime 版本，並在改變遊戲狀態前檢查相容性，詳見 Phase 10。
7. 自製包預設為資料與受控腳本；禁止以 eval 或任意 JavaScript 取得宿主權限。Runtime 設定步數／呼叫深度限制、錯誤隔離及可定位的執行紀錄，循環不能卡住瀏覽器。

Phase 6 交付上述最小可測契約與核心執行能力；完整編輯器、批次匯入／匯出及進階 MOD 工作流屬 Phase 13。不得將這些基礎介面全部延後到編輯器階段。

### 驗收標準

- 不啟動畫面也能執行遊戲邏輯。
- 可以載入原版轉換資料。
- 可以模擬移動、事件與戰鬥。
- Save／Load 可以完整恢復狀態。
- 核心規則具備自動化測試。
- 同一引擎可載入原版轉換內容包與獨立 Mock 原創內容包，無須變更核心；Mock 必須明確標記。
- 可在不修改核心下新增人物、地圖、武功、事件及結局定義，未知能力或指令明確拒絕。
- Schema／引用錯誤、依賴循環與衝突可在載入前發現，載入順序可重現。
- 腳本暫停、存讀檔、繼續執行及固定 seed 重播具有自動化驗證。

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

另外，從 Phase 6 的第一版存檔開始，必須記錄：

- 引擎版本、存檔 Schema 版本、腳本 Runtime／規則介面版本。
- 基礎內容包與規則集的 package ID、精確版本及內容雜湊。
- 已啟用 MOD 的 ID、精確版本、內容雜湊、確定載入順序與有效設定。
- 已解析的相依內容包清單與組合指紋；不能只存寬鬆版本範圍。
- 命名空間化事件旗標、MOD 自有狀態、事件／對話執行位置及所需腳本版本。

## 13.2 需求

- 多存檔槽
- 自動存檔
- 存檔版本管理
- 存檔完整性驗證
- 舊版本存檔遷移
- 載入前核對存檔內容組合；相同版本號但雜湊不同也必須視為變更。
- 缺包、移除 MOD、版本／順序／設定改變或引用失效時，不得靜默套用現有內容或丟棄狀態。
- 不相容時保留原存檔，顯示所需包與差異；提供恢復原組合、匯出備份或執行明確支援的遷移流程。
- 遷移需宣告來源／目標版本，先備份、於副本執行並驗證引用與腳本續行；不支援的遷移明確拒絕，失敗不覆寫原檔。

若可行，另外研究原版 DOS 存檔格式轉換。

### 驗收標準

存檔後重新載入，所有可觀察的遊戲狀態必須一致。

必須覆蓋相同 MOD 組合完整恢復、MOD 缺失／移除／升降版、同版異雜湊、載入順序或設定變更、遷移成功／失敗與對話中途續行。舊存檔缺乏內容清單時不得猜測原環境。

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

原版差異測試使用固定版本的金庸基礎內容包與原版規則配置；MOD 組合另建測試矩陣，記錄包版本、雜湊、順序、seed 及腳本版本。不得把 MOD 刻意修改的行為誤報為原版還原結果。

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
12. 透過內容包載入居所、角色與事件，核心不硬編碼對應人物或地圖 ID。
13. MVP 存檔保存內容包／規則版本與啟用 MOD 清單；無 MOD 時也明確記錄空清單。

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
- 維持「通用引擎＋金庸內容包」邊界；新增內容透過包與規則介面，不在核心硬編碼原版人物或劇情。
- 編輯器、匯入工具與遊戲共用版本化 Schema、驗證及 Runtime；原版來源、原創內容與 MOD patch 分開保存。
- MOD 衝突與存檔內容不相容必須明確診斷，不能用載入順序默默覆寫或丟棄舊狀態。

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

採逐功能證據驗收。已有來源及實際 bytes 支持的資料格式，可先進入 Phase 3 小範圍解析與測試；Phase 1／2 的版本、授權及未知規則持續獨立追蹤，不因局部推進而視為整階段完成。參考引擎建置、未知指令 15／50 或 MMAP 特殊布局，不得成為無關功能的共同阻擋條件。

每個推進項目必須明列來源、適用輸入、限制與測試；格式不符時停止該格式並診斷，不跳過未知 bytes 或猜測語意。此調整不免除採用第三方程式碼前的授權確認、原版規則驗證或 Phase 6／MVP 的整合驗收。

依使用者「繼續直到可以進行 MVP」，第一個場景可在 Phase 3／5／6 的必要子集完成後開始：地圖／純對話資料、內容 Schema 與引用檢查、移動碰撞、受控事件／條件／選項、精確 MOD 組合與存讀檔，以及原版切片和獨立 Mock 的 headless 驗證。此為 Phase 7 第一場景的準備門檻，不是完整 Phase 6 結案；戰鬥公式、完整指令集與所有劇情仍依各自證據驗收。細節見 ADR 0009 與 docs/mvp-readiness.md。沒有實際瀏覽器畫面與操作驗收前，不可標記「可玩 MVP 完成」。

階段依賴依第 18 節的執行順序與各階段明訂前置條件判斷；Phase 編號作為穩定識別碼。Phase 6 的平台基礎驗收與首個 MVP 完成後，可依序進入 Phase 13，不必先完成編號較小但排程在後的 HD、戰鬥及部署階段。

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
| 9 | Phase 13：可擴充遊戲平台與 MOD 系統（完整工具與編輯器） | P1；基礎契約已在 Phase 6 以 P0 交付 |
| 10 | HD 素材製作流程 | P1 |
| 11 | 戰鬥系統 | P1 |
| 12 | Save／Load 完善 | P1；內容組合識別從 Phase 6 開始 |
| 13 | 自動化差異測試 | P0，從早期持續執行 |
| 14 | 效能優化與部署 | P2 |

Phase 可依研究結果調整，但不得跳過原始資料與遊戲規則驗證。

Phase 13 為新增的固定識別碼，既有 Phase 0–12 編號保持穩定；執行順序以本表及依賴為準。Phase 6 的平台基礎先於 MVP 驗收，Phase 13 的完整創作工具在首個 MVP 後推進，避免編輯器成熟度阻擋最小可玩場景。已完成的研究狀態不因本次計畫修訂而自動通過驗收。

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

---

# 20. Phase 13：可擴充遊戲平台與 MOD 系統

## 20.1 目標與前置條件

以 Phase 6 的內容契約、Runtime、規則介面與最小 MOD resolver 為基礎，交付可在網頁創作與測試新 RPG 的平台。完整階段於首個可玩 MVP 後執行，詳見第 18 節；本次修訂為架構與工作範圍規劃，沒有直接開始 Runtime 或編輯器實作。

原版忠實度與原創能力分別驗證；原創範例使用明確標示的自製或 Mock 內容，不以猜測填補原版資料。

## 20.2 核心交付成果

1. **Game Content Package 格式**：manifest、基礎遊戲／MOD 類型、package ID、版本、命名空間、引擎與 Schema 相容性、作者與授權、來源、檔案／雜湊清單、資源與內容入口、相依與 patch 宣告。人物、地圖、NPC、武功、物品、事件、對話與結局可獨立引用。確切欄位由 ADR 與版本化規格定義。
2. **JSON Schema 與資料驗證器**：manifest 與各內容類型的 Schema，加上引用完整性、重複 ID、條件型別、資源存在、圖關係與版本相容性檢查；CLI、遊戲及編輯器共用驗證結果。
3. **Event／Dialogue Script Runtime**：條件分支、選項、對話、命令、暫停／續行、呼叫與受控循環，支援追蹤、錯誤定位、執行預算及可序列化狀態。原版指令經已驗證的轉接層轉入，不能直接執行未知 DOS 指令。
4. **Rule Engine 與條件運算器**：可選版本化規則集、具型別條件、角色／武功／戰鬥／結局規則；透過受控能力介面擴充，保持 deterministic 執行與可重播性。
5. **MOD 載入、依賴、優先權與衝突檢查**：宣告式版本範圍、拓撲解析、可重現順序、同 ID 修改與刪除引用診斷。優先權只能在滿足相依關係後排序；相同欄位或不相容操作的衝突須明確拒絕或由使用者選擇並保存解決方案，不能以「最後載入者勝出」靜默處理。
6. **劇情與事件視覺化編輯器**：節點、條件、選項、跳轉、引用搜尋、錯誤定位、預覽、undo／redo，能在視覺圖與標準腳本資料之間往返而不丟失 ID 或語意。
7. **地圖及 NPC 編輯器**：邏輯格子、碰撞、觸發區、傳送、NPC 位置／行程／互動與渲染位置轉接；編輯結果不直接改寫原始 DOS 資料。
8. **自動化劇情測試工具**：指定初始狀態、固定 seed、命令／選項序列及預期狀態，能無畫面執行、產生流程 trace，驗證分支、循環預算、失效引用與存讀檔續行；覆蓋度與未執行分支分開報告。
9. **MOD 匯入、匯出與版本管理**：可重現打包、版本與相容性比較、更新／移除預檢、差異與遷移宣告。匯入驗證路徑、大小與資源清單，解包不能越出目的目錄；失敗不得留下半套已啟用內容。匯出預設只含作者所選且可散布內容，不自動夾帶原版基底或使用者存檔。
10. **原版與自製內容隔離**：原版輸入唯讀、轉換基底保留來源、原創包獨立命名空間、MOD 以 patch 描述變更、存檔另外儲存。無金庸包時能載入獨立原創遊戲；每個包有各自授權與散布範圍。

## 20.3 驗收標準

- 不修改核心程式碼，即可用內容包新增人物、地圖、武功、對話分支與新結局，並在遊戲中載入與執行。
- 金庸內容包與獨立原創測試包使用同一引擎、Schema、Runtime 與編輯器；原創包不依賴受保護的金庸素材。
- 錯誤 Schema、引用遺失、依賴缺失／循環、同 ID 衝突與不相容版本均有可定位診斷；相同包與設定產生相同載入結果。
- 視覺編輯、匯出、重新匯入後穩定 ID、依賴、腳本語意及邏輯座標一致；自動化劇情測試結果一致。
- 多 MOD 的狀態與旗標不碰撞；禁用或更新 MOD 時，存檔預檢、支援的遷移或明確拒絕符合 Phase 10。
- 執行失控腳本、載入失敗或遷移失敗不破壞既有內容、原始資料或存檔；所有對外狀態變更經引擎命令與驗證介面。
- 原版忠實度測試與 MOD／原創測試各有明確的內容組合及來源分級，互不混淆。

## 20.4 文件與產物

```text
docs/architecture/content-platform.md
docs/formats/game-content-package.md
docs/formats/mod-patch-format.md
docs/game-rules/script-runtime.md
docs/validation/mod-compatibility.md
docs/decisions/（Schema、Runtime、解析順序與存檔相容性 ADR）
packages/content-schema/
packages/content-runtime/
packages/mod-loader/
apps/editor/
content/（依授權與來源隔離，商業原始／轉換素材不公開提交）
```

所有交付成果以實作與驗收紀錄判定完成，不能只因建立空目錄、文件或範例就標記平台已交付。
