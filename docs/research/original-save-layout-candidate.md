# 原版存檔欄位與偏移候選表

Date: 2026-11-11
Phase: Phase 1／2 局部格式查證；Phase 3／6 整體仍未驗收。
Status: 已核對隔離副本的實際檔案長度、索引 bytes、段界及 320 × 182-byte 角色記錄，並以局部 DOS 執行案例確認若干欄位變化；尚非完整且可安全寫回的存檔規格。
Confidence: 原始檔案 bytes／hash 為 `Source Confirmed`；個別欄位的 DOS 前後差分列於驗證紀錄，其餘語意名稱仍標 `Community Implementation` 或 `Inferred`。

## 目前操作狀態

目前沒有 DOSBox-X 視窗。最新測試只啟動一個隔離 session；從原版讀檔介面選第三列，DOSBox-X log 確認讀入 `S3.GRP`、`D3.GRP`、`R3.GRP`。對隔離副本 `R3.GRP` 的 offset 6 做單變量修改（235→245）後重新載入；角色與底圖位置明顯改變。測試後，六個 R3/S3/D3 槽檔均從備份還原，SHA-256 與測試前一致。完整 DOSBox-X 模擬狀態已保存為 `assets/generated/dosbox-x/session-002/save/1.sav`（981,563 bytes；SHA-256 `73648B6068EA38737266D72845A66AF549D78714E82C3EB8E840AC0021E73747`）。存檔狀態尚未跨重啟載入驗證；之後優先用 `Capture > Load state` 的 slot 1 恢復這個進度，不再靠修改原版遊戲存檔重建。

本輪發現低權限 `Stop-Process` 找不到高權限 DOSBox-X PID 時，不能據此判定 session 已不存在。之後錯誤地啟動了一個重複 session PID `23688`；已只關閉該新 PID，並確認原 PID `21252` 仍在。沒有對重複視窗送鍵，也沒有修改存檔。後續一律先以相同權限核對既有精確 PID/HWND，無法觀察不等於不存在；不得為了重試而另開副本。此操作修正已補入 ADR0038。

## 原始檔案證據

檔案來自 `assets/generated/dosbox-x/session-002/game`，是隔離副本。以下 hash 是分析依據；不修改此副本中的 slot files。

| 檔案 | 長度 | SHA-256 |
|---|---:|---|
| `RANGER.IDX` | 24 | `52c1545c8c0aa4d7919916ae840fb15f2772c567811ab9b9056e55b2e17ff92c` |
| `RANGER.GRP` | 114,242 | `07b99e3c1676e18691f00d6dfe713121faa6f7429e43666bc83e1568cecb68ab` |
| `R1.GRP` | 114,242 | `51f2e22bb578c22f72c004b3311a0569c43b05a0fe192b1fa9fee495e90ca828` |
| `S1.GRP` | 4,915,200 | `830ae313ccabe310a16d330eac83647a9c81a6c23efce6069ca87dc653f0e154` |
| `D1.GRP` | 440,000 | `b489ce6778643116eb8c333fc8b8e1a7dafa69afb36e6a4dfe23e4c8198d9127` |

### Offset 6 的隔離副本介入測試

`R3.GRP`、`R3.IDX`、`S3.GRP`、`S3.IDX`、`D3.GRP`、`D3.IDX` 的測試前雜湊均已存於 `assets/generated/dosbox-x/session-002/synthetic-coordinate-slot3/baseline-manifest.json`。只修改 `R3.GRP` offset 6：little-endian bytes `EB 00` (235) → `F5 00` (245)。原版讀檔 UI 循環在三列，逐次輸入後選第三列；log 確認載入 R3，遊戲回到地圖，畫面位置與基線明顯不同（基線 `capture/z_033.raw1.png`、合成狀態 `capture/z_041.raw1.png`）。

這是對 DOS 執行檔的實際介入結果：**R3.GRP offset 6 的值會影響載入後的大地圖角色／底圖位置**，比單靠 community 結構名稱更有證據。它尚不能證明欄位確切名為 `Mx`、代表哪個座標軸或正方向，也不能單獨解釋座標比例。合成檔測試後已還原；變更與結果見 `synthetic-coordinate-slot3/synthetic-manifest.json`。早先新建的 R4 檔無法從觀察到的原版三列介面選取，已從隔離 game 目錄移除；該次載入 R4 的嘗試仍標記為失敗，不作證據。

`RANGER.IDX` 是 24 bytes；按 little-endian uint32 讀出的六個原值為 `836, 59076, 97076, 101444, 114092, 114242`。可直接確認的是這六組 bytes／數值及 `RANGER.GRP` 長度；索引值的欄位名稱是候選對照。

第一個索引值 `836` 和社群 Pascal 的前段排列相符：18 個 short (36 bytes) 後接 200 筆、每筆 4 bytes 的物品列表 (800 bytes)，剛好到 offset 836。資料亦在 offset 836 開始出現連續角色樣式記錄；`836..59075` 共 58,240 bytes。**2026-11-12 修正：原版記錄為 320 × 182 bytes，不是先前的 280 × 208 bytes。**僅靠段長兩種乘積都吻合；逐筆檢查 offset 8 的 CP950 姓名才可區分：以 182-byte 間距讀到角色 0「小蝦米」、1「胡斐」、16「胡青牛」、49「虛竹」，而 208-byte 間距在角色 1 讀到數值資料、角色 49 誤讀為「黃蓉」。這是原版 bytes 支持的結構修正，仍不單獨證明所有欄位語意。

| `RANGER.GRP` 範圍（半開） | bytes | 候選內容 | 證據狀態 |
|---|---:|---|---|
| `[0, 24)` | 24 | 12 個 short 的基本狀態／位置／船欄位 | Pascal `LoadR` 順序，community；各欄 DOS 意義待比對 |
| `[24, 36)` | 12 | 6 個 short 的隊伍角色 ID | Pascal `Teamlist[0..5]`；community |
| `[36, 836)` | 800 | 200 筆物品 `(ID, 數量)`，每筆兩個 short | 記錄尺寸吻合 `TItemList`；community + bytes inference |
| `[836, 59076)` | 58,240 | 320 個角色記錄，每筆 182 bytes | 原版段界及多筆 CP950 姓名間距確認；社群 `TRole` 的 208-byte 尺寸不適用 |
| `[59076, 97076)` | 38,000 | 200 個 190-byte 區塊，候選物品定義表 | 尺寸吻合 community `TItem`，非本次目標 |
| `[97076, 101444)` | 4,368 | 84 個 52-byte 區塊，候選場景定義 | 尺寸吻合 community `TScence`，非本次目標 |
| `[101444, 114092)` | 12,648 | 尚未可靠命名的區塊 | Unknown；不要修改 |
| `[114092, 114242)` | 150 | 尚未可靠命名的尾端區塊 | Unknown；不要修改 |

### 可先用來設計只讀檢視器的欄位候選

下表 offset 均是相對於 `RANGER.GRP`／slot `.GRP` 檔案起點。16-bit 值先按 little-endian signed short 解讀；須用合法載入進度的畫面和遊戲狀態校準後才可用來生成 Synthetic State。

| 欄位候選 | offset | 讀取方式 | 說明與限制 |
|---|---:|---|---|
| `InShip` | 0 | int16 | 社群 `LoadR` 第一個讀值；語意待原版核對 |
| `Useless1`／目前場景標記候選 | 2 | int16 | 社群存檔時，若 `Where=1` 寫 `CurScence+1`，否則寫 0；原版是否相同待驗 |
| `My`, `Mx` | 4, 6 | int16 | 名稱取自 community source；用途及座標系待驗 |
| `Sy`, `Sx` | 8, 10 | int16 | 角色／場景位置候選；軸順序及數值意義待由遊戲座標顯示核對 |
| `MFace`、船資料 | 12..23 | 6 × int16 | 原值區段；只把欄位名稱當社群候選 |
| `TeamList[0..5]` | 24..35 | 6 × int16 | 角色 ID 候選；現有 RANGER/R1 範例為 `[0,-1,-1,-1,-1,-1]` |
| 物品第 `i` 筆 ID | `36 + 4*i` | int16 | 社群 `TItemList.Number` 候選，`i=0..199` |
| 物品第 `i` 筆數量 | `38 + 4*i` | int16 | 社群 `TItemList.Amount` 候選；有號、溢位及刪除語意待驗 |
| 角色第 `r` 筆起始 | `836 + 182*r` | — | `r=0..319`；姓名與多個 ID 對位 |

目前兩份存檔 `[36..)` 開頭候選物品皆為 `(0,3),(2,3),(10,3),(21,3)`，之後出現 `(-1,0)` 空欄位。這是讀到的原始 bytes 的解碼候選；不能只憑此命名那些物品的遊戲用途。

角色記錄內的下列偏移來自 `references/kys-jedisdl/kys_type.pas:52–76` 的社群 packed-field 順序。原版記錄只有 182 bytes，欄位表只保留為候選；超出 182 bytes 的欄位不得用這張表直接讀取：

| 角色欄位候選 | record 相對 offset | 尺寸 |
|---|---:|---:|
| `IncLife`, `UnUse` | 4, 6 | int16 each |
| `Name`, `Nick` | 8, 18 | char[10] each |
| `Sexual`, `Level`, `Exp` | 28, 30, 32 | int16, int16, uint16 |
| `CurrentHP`, `MaxHP`, `Hurt`, `Poison`, `PhyPower` | 34..42 | int16 each，間隔 2 |
| `CurrentMP`, `MaxMP` | 82, 84 | int16 each |
| `Attack`, `Speed`, `Defence`, `Medcine`, `UsePoi`, `MedPoi`, `DefPoi`, `Fist`, `Sword`, `Knife`, `Unusual`, `HidWeapon` | 86..108 | 12 個 int16，間隔 2 |
| `Knowledge`, `Ethics`, `AttPoi`, `AttTwice`, `Repute`, `Aptitude` | 110..120 | 6 個 int16，間隔 2 |
| `PracticeMagic`, `PracticeNeigong` | 122, 126 | int16 |
| `Magic[i]` 武功 ID | 原版首槽 offset `126`；社群 208-byte 候選 `130 + 2*i` 不適用 | 事件 289 的 `35(36,0,60,100)` 使角色 36 首槽 126 從 31→60；事件 581 的 `33(49,15,0)` 使已占首槽的角色 49 第二槽 128 從 0→15 |
| `MagLevel[i]` 武功點數候選 | 原版首槽 offset `146`；社群候選 `150 + 2*i` 不適用 | 事件 289 的角色 36 首槽 146 從 0→100；實際等級／經驗換算未驗 |
| `Neigong[i]` 內功 ID | 社群候選 `170 + 2*i` | 原版偏移未驗；不能直接套用 |
| `NeigongLevel[i]` 內功等級 | `180 + 2*i` | 社群欄位跨出原版 182-byte 記錄邊界；**不可用於原版** |

所以用於主角／同伴對照的候選 absolute offset 是 `836 + 182*r + fieldOffset`，且 `fieldOffset < 182`。182-byte 記錄長與姓名對位為原版 bytes 證據；個別能力欄位仍需原版執行驗證。

## 與原版 bytes 的重要差異

`kys-jedisdl/kys_main.pas:928–974` 的 `LoadR` 從 IDX 讀 8 個 uint32 offset；本機 `RANGER.IDX` 只有 6 個 uint32。它還從 `AppPath + 'save/...'` 讀檔，而本機版檔案放遊戲根目錄。因此不能直接把 community `LoadR/SaveR` 當原版 parser，也不能拿它寫回任何原始 slot。前六個索引值和前段結構的尺寸巧合吻合，提供了合理候選，但後段欄位對照仍需保留 Unknown。

`S1.GRP` 長度為 `100 × 64 × 64 × 6 × 2`；`D1.GRP` 長度為 `100 × 200 × 11 × 2`。這與 community source 的場景陣列形狀相符；實際 slot 版本、場景索引語意和事件 flag 欄位尚未原版驗證。建立跳轉／事件測試存檔前，還需用有效進度實際存檔及唯讀畫面確認座標和場景欄位。

## 安全採樣步驟

1. 先按 [ADR0038](../decisions/0038-session-state-preflight.md) 確認 session、選單選項與執行狀態，再決定輸入；新指令不沿用上次選單位置。
2. 建立新的合法遊戲存檔槽，保存全套 `R* / S* / D*` before hashes；原始 baseline 與唯一有效存檔不修改。
3. 比較一次只改變一種狀態的前後 slot 副本與畫面：物品數、加入隊友、取得武功、玩家座標。使用同一 slot、先排除自動時間／排序／其他事件差異。
4. 若要找 runtime memory address，才依 ADR0037 在完整操作前後快照期間短暫凍結，兩次快照中間恢復執行；一般 UI 操作和數值讀取保持 guest Running。
5. 僅在證據足夠後，另建工具對副本產生 Synthetic State，列出每一個改動的 file、offset、old/new bytes 和 hash。絕不覆寫原始或唯一 baseline；合成存檔要先驗證遊戲能否載入及畫面值是否一致。

尚未完成 title/load menu 的逐鍵辨識；曾嘗試載入合成槽 R4，但 DOSBox-X log 證明實際載入 R1，故此嘗試無效，絕不作座標欄位的正面或負面證據。合成檔案仍只在 ignored 的隔離 session-002 目錄。下一步應重用 PID `21252` 的既有 session，以單鍵、單次擷取、明確辨識六個選項（進度一至五、自動檔）後再確認；只有 log 證明載入 `R4.GRP` 才能比對畫面位置。若既有 session 不可操作，先解決權限觀察，不另開視窗。
