# 待辦

- [x] Mock 交換事件接續隊伍狀態，驗證扣料發獎、失敗回滾及存讀檔。見 [決策紀錄](decisions/0063-mock-exchange.md)。
- [ ] 將測試面板入口接到地圖 NPC 與遊戲行囊。

## 2026-11-25：通用事件轉換管線與 Runtime 擴展

- [x] 為受控事件新增 `branch` 步驟（條件＋yes／no 目標）與 JUMP_TARGET 驗證；為決策引擎新增 `keyFrom` 動態 key、`patchList` 稀疏清單效果、`listSize` 條件，各補專責單元測試並匯出 `decision-condition.schema.json`。見 [ADR 0064](decisions/0064-generic-event-conversion-pipeline.md)。
- [x] 建立 `tools/extractor/convert_original_events_generic.mjs`：54-opcode 證據映射表（Tier 1 本地 DOS／Tier 2 社群 Pascal）、word offset→step index 分支重映射、TALK 對話抽取、14 個未證 opcode 的逐事件阻擋診斷；本機輸出 732 轉換／286 阻擋／1,822 對話，內容包通過 `resolveControlledEventContent` 全驗證。
- [x] 將產出的 `original.jy.events` 內容包接入 Web 宿主做本機唯讀預覽（對話、選項、分支、決策效果），不把它當成可遊玩完整原版：側欄「載入原版事件包（local）」選檔後以獨立 Runtime 逐事件操作，戰鬥為模擬結果；fresh-state 全事件驅動驗證 732/732 通過。見 [ADR 0064](decisions/0064-generic-event-conversion-pipeline.md)。
- [x] 逐功能補技能（33／35）、隨身物品（41）與 opcode 50 動態變體的狀態領域：新建 `original.jy:skill`／`skill-level`（10 槽）與 `carried-item`／`carried-item-amount`（4 格）領域，opcode 33／35／41 建成 per-slot 決策 plan，opcode 50 動態變體映射為物品持有分支；50e 參數解算器仍為 no-op。見 [ADR 0064](decisions/0064-generic-event-conversion-pipeline.md)。
- [x] 場景 `-2` 改為追蹤當前場景的動態 key：新建 `original.jy:current-scene` 領域，`-2` 槽位引用改由 `keyFrom` 依目前場景組合成 key，`scene-slots` 的 allowedKeys 覆蓋 `-2` 用到的 slot/field × 84 場景並去重；fresh-state 732/732 終止，專責單元測試驗證寫入落於當前場景。
- [x] 依證據解鎖全部 14 個阻擋 opcode（4／15／19／24／25／30／44／51／57／58／60／61／62／64）：branch（4 curItem、60 slotPicAny、61 slot4664All）、end（15 死亡、62 結局）、狀態效果（44 slotPicAnimate、57 scene57Anim）、no-op＋診斷（19／24／25／30／51／58／64）；內容包 1,018/1,018 筆轉換、0 阻擋、2,866 對話，fresh-state 全量驅動通過。見 [ADR 0064](decisions/0064-generic-event-conversion-pipeline.md)。
- [x] 探測 RANGER.GRP 物品表欄位佈局（190B×200，`Thing_S` 社群佈局，8 筆抽樣含全部 DOS 觀察案例物品均吻合）；確認記錄無圖片欄位、使用效果在事件腳本。見 PROGRESS 2026-11-25 物品記錄探測。
- [x] 定義通用物品定義合約（engine-owned schema：id／name／alias／description／imageRef?／category／equipSlot?／stackable＋maxStack；use 層 useDialogueRef／useConditions／useEffects／useCommand 可選，腳本與宣告式互斥）並加入 schema 匯出（decision-effect-v1）與引用驗證（ITEM_* 檢查）。見 [ADR 0065](decisions/0065-item-definition-contract.md)。
- [x] 建立 RANGER 物品表轉接器（190B×200，Thing_S 佈局），產出 git-ignored 物品定義（200/200、0 空記錄，含來源雜湊／偏移／解析器版本）；use 欄位全空（效果在場景事件）；接線約定 inventory key／current-item 值 ↔ `original.jy.events:item/{id}`，測試釘選每個 inventory allowedKey 皆有定義。
- [x] 「使用物品」宿主命令契約（USE_ITEM）：內容宣告 `currentItem` 引用、runtime 動作（無游標時寫入、不消耗）、Web 預覽物品選單；E2E 與 opcode-4 DOS 觀察一致。見 [ADR 0066](decisions/0066-use-item-host-command.md)。
- [x] 追查 ALLDEF.GRP（4,400×100）是否為物品圖片來源：確認**不是**（是場景事件槽表 100×200 slot×11 int16）；物品圖在分割地圖圖集 WMP000-025/SMP000-083（+WDX/SDX），logical index 3501+itemNumber（Pascal `ITEM_BEGIN_PIC=3501`），199 個 40×40 icon（物品 0..198，每個 1728B；物品 199 空），icon 格式＝8B header＋逐列 RLE＋MMAP.COL 256×3 palette；解碼物品 0/110/160 視覺驗證（藥丸／劍／書）吻合。見 PROGRESS 2026-11-26 ALLDEF 追查。
- [x] 把物品 icon 提取接入轉接器（`imageRef` → `original.jy.events:pic/item/{id}`，scene 圖集 logical `3501+id`）與 Web 預覽顯示；scene/world 雙圖集以 scene 為權威（world 缺 item 198、item 199 兩圖集皆空），199 張圖示打包成 800×400 圖集 PNG；順手修 `App.tsx` v3 檢查。見 [ADR 0068](decisions/0068-item-icon-extraction.md)。
- [x] 裝備／修煉宿主命令（EQUIP／PRACTICE）：內容宣告 `equipment`（slots/practice/itemUser 三個「域＋key 模板」綁定）、runtime 動作（無游標時雙寫入、key 代入驗證）、轉換器三域＋`equipSlot` 欄（EquipType clamp 0..1）、Web 預覽裝備／修煉控制；E2E 與 Pascal 寫入一致。見 [ADR 0067](decisions/0067-equip-practice-host-commands.md)。
- [x] 裝備／修煉的互斥解綁與 `CanEquip` 屬性門檻（內容效果層）：互斥解綁為結構性不變量（宿主命令讀當前綁定、與兩個寫入同一 transaction 原子）；`CanEquip` 以物品定義 `canEquip`（RANGER `Need*`）＋裝備宣告 `roleAttributes` 表之，sign 雙向＋內力性質；5 個有角色屬性域欄的 `Need*`（mp/attack/speed/aptitude/mpType）建模，其餘 8 個與 OnlyPracRole／武功數未建模。見 [ADR 0069](decisions/0069-equip-can-equip-and-unbinding.md)。
- [ ] Web 預覽加入物品定義顯示（由 `original.jy.events:item/{id}` 取名稱／說明／分類）——物品選單已顯示名稱，完整資訊面板待補。

## 2026-11-19：opcode 3 新參數形狀的事件 581 比對

- [x] 從靜態清單的 106 事件候選形狀挑已具 DOS 差分的事件 581；來源鎖定原始記錄與 ALLDEF，投影單人隊伍分支的場景 32／槽 2 後值並核對滿隊不變。見 [ADR 0059](decisions/0059-event-581-slot-segment-comparison.md)。
- [x] 以隔離單指令 DOS 腳本確認這組參數對欄 0／1、3／4、5–7 的效果，排除相鄰 opcode 14／0／13；欄 3／4 以 `123／456` 前值證實寫入 `-1`。見 [ADR 0060](decisions/0060-isolated-opcode-3-shape581.md)。
- [x] 將欄 2 前值改為 `789` 後重播同一隔離腳本，確認執行後寫成 `-1`；這組確切參數的欄 0–7 效果均已有隔離證據。見 [ADR 0060](decisions/0060-isolated-opcode-3-shape581.md)。
- [x] 建立只接受事件 581 釘選來源、精確參數、場景 32／槽 2 與原始前值的限定轉接；欄 0–7 原子更新，來源或前置不符時拒絕且不改舊 overlay。
- [x] 將限定轉接接入來源鎖定的局部工作階段，保存單人隊伍證據前置、ready／completed 狀態與 overlay；存讀、污染拒絕、重複執行及舊狀態不變均有測試。見 [ADR 0061](decisions/0061-event-581-partial-session.md)。
- [x] 鎖定自然資料鏈：擂鼓山場景 53 槽 0 的事件 533 經 `533→534→536→581` 將事件 581 安裝到槽 2；工作階段保存兩組實測六格隊伍、自然槽位及陣列座標，單人完成、滿隊阻擋。
- [ ] 接入完整原版遊戲存檔前，仍須轉接事件 533／534／536 的其他已驗效果及角色 49 狀態變更；不得只跳到事件 581 或套用到其他同形事件。

## 2026-11-19：全事件靜態覆蓋清單

- [x] 從既有全量語料與原始 bytes 產生逐事件靜態清單，分列候選切分、對話引用、純對話預覽資格與來源鎖定執行轉接；按 opcode 集合及 opcode 3 參數形狀聚合，避免把資料檢查當成 DOS 實測。見 [ADR 0058](decisions/0058-static-event-coverage-gate.md)、[驗證](validation/static-event-coverage-20261119.md)。
- [x] 從已觀察的 opcode 3 差分挑一個新參數形狀與前置條件案例：事件 581 的段落投影吻合原版前後值，但相鄰指令尚未隔離，不能擴大執行。見 [ADR 0059](decisions/0059-event-581-slot-segment-comparison.md)。
- [ ] 釐清 15 筆不符合純對話預覽限制的參數，勿直接視為資料錯誤。

## 2026-11-19：場景 32 事件 673 本機採樣互動

- [x] 用已釘選來源產生場景 32 本機包，從相鄰可通行測試格觸發事件 673；Web 顯示 DOS 採樣前置 72、完整對話、資質與事件槽結果，並把位置、續行、人物及槽位存於同一份限定存檔。缺少專用附件拒絕匯入。見 [ADR 0057](decisions/0057-observed-event-673-web-slice.md)。
- [ ] 擴展到自然劇情可達路徑與更多已驗原版事件；定義正式原版人物、隊伍、道具、戰鬥與 MOD 鎖定的完整遊戲存檔，保留本切片的明確邊界。

## 2026-11-19：原版人物欄位來源狀態

- [x] 來源鎖定 RANGER 角色區段，保留原始資質 50；以獨立覆蓋層表示事件 673 DOS 採樣前 72、事件後 75，與事件槽同步提交／存讀並拒絕未驗欄位。見 [ADR 0056](decisions/0056-original-role-field-overlay.md)。
- [x] 以本機測試前置將事件 673 接到場景 32 可見互動；位置、人物、事件槽及對話續行同存讀，明確標示非完整原版遊戲。見 [ADR 0057](decisions/0057-observed-event-673-web-slice.md)。

## 2026-11-19：事件 673 原版狀態切片

- [x] 將來源鎖定的事件 673 對話、資質及事件槽覆蓋層接入同一限定轉接操作與 checkpoint；驗證存讀、完成提交、污染狀態拒絕及失敗回滾。見 [ADR 0055](decisions/0055-event-673-original-adapter-session.md)。
- [ ] 把此切片的已驗證欄位接入正式原版人物／事件 Runtime 及場景互動；完整內容鎖、遊戲存檔及其他事件仍需逐功能驗收。

## 2026-11-19：事件 673 轉換比對

- [x] 釘選本機來源，將事件 673 的 12 段對話及限定資質／事件 ID 效果轉成受控內容，暫停存讀後與 DOS 已觀察的 `72→75`、`673→674` 比對。見 [ADR 0054](decisions/0054-event-673-scoped-conversion-comparison.md)。
- [ ] 將已驗證的原版人物欄位與事件槽更新接入同一原版 Runtime 提交／存讀流程；再逐案例擴充 opcode 3／34，不推廣未驗證參數。

## 2026-11-19：原版純對話場景擴充

- [x] 沿用現有預覽格式，從原始場景事件層和 ALLDEF 槽位逐格解析指定場景的純對話事件；黑木崖本機包通過可達、互動、存讀及 Web 匯入驗證。見 [ADR 0053](decisions/0053-original-dialogue-scene-preview.md)。
- [ ] 對效果事件建立逐指令來源證據的轉接與完整路徑重播；先處理已知狀態差分，不把純對話預覽當成全部原版劇情完成。

## 2026-11-19：統一 Mock 工作階段

- [x] 將現有 Mock 世界位置與受控事件續行合併為一份 v4 存檔；切圖更新同一位置，完成後可繼續世界遊玩；保留 v1／v3，提供 v1 明確匯入和備份。見 [ADR 0052](decisions/0052-unified-mock-session-save.md)。
- [ ] 把原版事件槽 overlay、正式人物／隊伍／戰鬥狀態、規則集及 MOD 精確鎖定接入完整存檔；對各舊版本做相容性預檢及有備份遷移，依來源證據逐功能驗收。

## 2026-11-19：受控事件 Web Mock 宿主

- [x] 在單一遊戲顯示區加入 Mock 受控事件測試，驗證對話、模擬戰鬥、動畫、切圖、選人、等待點存讀及返回原有場景；依現有地圖和明確 Mock 清單驗證可通行目的地與資源／角色 ID。補上遊戲區存檔面板與現行版面 E2E。見 [ADR 0051](decisions/0051-controlled-mock-web-host.md)。
- [ ] 將 Mock 戰鬥回覆替換成實際規則結果，動畫與切圖交給正式宿主完成；角色、道具與資源改由版本化內容包提供，不使用獨立 Mock 清單作正式判定。
- [ ] 合併受控事件與原有遊戲狀態、原版事件槽及 MOD／規則集鎖定為單一完整存檔，提供舊版相容性預檢與有備份遷移。

## 2026-11-19：受控命令結果與續行契約

- [x] 建立獨立 v2 事件內容／v3 Mock 存檔，明確的戰鬥、動畫、切圖、選人請求與結果 Schema；結果只選內容已宣告的分支，待處理請求可存讀，失敗不提交。加權亂數分支使用存檔種子重播。見 [ADR 0050](decisions/0050-controlled-command-continuation.md)。
- [ ] 將受控請求交給實際 Web 宿主，完成戰鬥／動畫／切圖／選人介面與回覆；用現有地圖和內容驗證目的地、資源及角色引用。
- [ ] 合併地圖、隊伍、人物、戰鬥、原版事件槽、MOD／規則集鎖定及待處理命令為正式完整存檔；先做舊版預檢與有備份的明確遷移。

## 2026-11-16：可續行的通用決策事件 Mock 切片

- [x] 建立獨立 v1 事件內容 Schema、`say`／`choice`／`decide`／`end` Runtime、位置＋決策＋游標狀態、內容身分綁定的 v2 Mock save 與 Web 儲存備份；Mock 複合事件經暫停、存讀、選擇、原子決策及拒絕路徑驗收。見 [ADR 0049](decisions/0049-decision-event-runtime-slice.md)。
- [ ] 定義完整可續行受控命令（戰鬥、切圖、動畫、選人、隨機等）的請求／結果 Schema，及命令跨等待期間的原子提交界線。
- [ ] 將通用決策事件整合到實際 Web 遊玩、地圖／角色／戰鬥／原版事件槽及完整版本化存檔；加入內容引用、MOD 鎖定和 v0.1 相容性預檢／備份遷移。

## 2026-11-15：通用決策契約先行

- [x] 建立版本化 JSON 決策子契約：領域宣告、跨領域條件、首條命中分支、整數／布林／字串／有序清單效果、逐欄變更紀錄與原子交易；共用四份 JSON Schema 與 Mock 複合案例。見 [ADR 0048](decisions/0048-universal-decision-contract.md)。
- [ ] 將通用決策狀態接到新版 Game Content Package、事件 Runtime 與完整 Save Schema；保留 v0.1 存檔並先做版本／相容性預檢和備份遷移。
- [ ] 定義受控特殊命令的版本化請求／結果／可序列化續行契約，涵蓋對話、戰鬥、選人、動畫、切圖及規則集擴充；不得以任意 JSON 欄位寫入代替流程。
- [ ] 為內容包補充領域與 key 引用驗證、跨領域不變量（例如隊伍人數與合法成員、道具所有權）、MOD 衝突診斷；再把原版 opcode 逐功能映射到通用決策及特殊命令。

## 2026-11-15：完整原版劇情本機遊玩缺口

- [x] 建立來源雜湊綁定的原版事件槽覆蓋層，明確欄位寫入可序列化且不改原始表；本機 ALLDEF 場景 32／槽 2 差分重現、Mock 相關測試通過。這只是狀態容器，尚未接到指令執行與 Web 存檔。見[驗證](validation/original-event-slot-overlay-20261115.md)。
- [x] 將事件槽覆蓋層接到原版場景事件層查找與**獨立的事件槽 checkpoint**；讀回核對來源／規則／MOD 身分、精確順序及設定，本機儲存保留上一份備份。這不是完整遊戲存檔，見[查找與 checkpoint 驗證](validation/original-event-checkpoint-lookup-20261115.md)。
- [ ] 設計並實作**完整原版遊戲存檔**：玩家位置、背包、人物、隊伍、戰鬥、場景及腳本續行點同一版本化契約；缺包／版本變動先做相容性檢查，遷移備份且失敗不覆寫。
- [x] 事件 464 的 opcode 3 限定差分：欄 2／3／4 寫入 `862／-1／-1`，欄 5／6 在第二組對照保留；同形 55→3 共 28 組，事件 303 的檢查槽與更新槽不同。轉換器只作不可執行註記，見[證據](validation/opcode-3-after-55-event464-fields-20261115.md)。
- [ ] 釐清場景載入時圖像欄 7 `3004→3002` 的更新來源；opcode 3 其餘 `-2` 欄位與 55 helper 副作用仍需逐欄隔離。
- [ ] 將原版場景、事件槽、角色、背包、隊伍、戰鬥及劇情條件納入版本化原版內容包與可序列化 Runtime 狀態；原版 ID 只由轉接器映射，不進通用規格。
- [ ] 依逐欄 DOS 證據實作原版 opcode 轉接器與完整事件續行，未知指令／無法解析分支須停該事件且不提交部分狀態。
- [ ] 完成 1,018 個事件的可達路徑與前後狀態驗收，包含動態事件槽、自動／物品觸發、戰鬥勝敗、切圖及 7 後尾段；建立可從開場到結局的本機端到端遊玩路線。
- [ ] 目前只有 296 個候選事件純含 0／1／7／終止符；另外 722 個含至少一種效果或分支。先從高覆蓋且有差分證據的 opcode 3／2／32 開始，逐功能驗收，不因單一未知 opcode 阻塞其他案例。

目前最新：覆蓋表 68 個 opcode 中 65 個已有局部 DOS 行為紀錄、0 個仍完全沒有 DOS 行為紀錄、3 個另有獨立註記（opcode 24 在原始 KDEF 中出現 0 次）。**這不等於 65 個完整語意驗收**：opcode 0 的前景重畫、65 的隱藏效果、55 其他參數值／額外副作用、13 與相鄰 `0` 的精確幀邊界仍未確認。原始事件 464 四次 `55` 的入口、回傳與游標已 trace；KDEF 全部 28 次 `55` 都是同形 bytes，其他 24 次未逐案執行。原始 KDEF 基線與隔離第三槽六檔已還原；合成腳本只作原版 DOS 解譯器的限定控制流測試，不作原始劇情證據。已確認的 opcode 不再換事件重驗；優先用狀態差異，僅異常或里程碑時檢視遊戲畫格。

## 2026-11-12：原版事件指令未完驗證

- [x] 2026-11-13 事件 936 的 opcode 58：原版最後對話之後自行出現對手台詞並進入可操作戰鬥；完整連戰／獎勵未驗。見[驗證紀錄](validation/opcode-58-dos-observation.md)。
- [x] 2026-11-13 opcode 44：事件 676 正確觸發後兩槽圖號在原版動畫中升到 7560／7606；AVI 畫格可見廚師移向爐灶。見[驗證紀錄](validation/opcode-44-dos-observation.md)。
- [x] 2026-11-13 隔離事件啟動腳本出錯時不再自動 `Stop-Process`，保留 DOSBox-X 現場；同 PID 7508 重置虛擬機後已還原事件 101 第三槽六檔雜湊。見[決策](decisions/0040-dosbox-state-reload-reliability.md)。
- [ ] 2026-11-14 opcode 0：合成腳本已證明一字續行；同樣場景變更的有／無 `0` 組別穩定像素完全相同，前景重畫或瞬間效果仍未驗。見[對照紀錄](validation/opcode-0-65-dos-continuation-20261114.md)。
- [x] 2026-11-14 opcode 13 所在段：事件 935 原生 AVI 呈現暗場、黑畫面及逐幀亮屏；與相鄰 opcode 0 的精確幀分界仍未 trace。見[影格紀錄](validation/opcode-13-dos-video-20261114.md)。
- [x] 2026-11-14 opcode 55：合成腳本道具結果已記錄；正向觸發後實測 DOS handler `0160:001E1ADF`、helper 回傳 `-1`、dispatcher 腳本索引 `0→5→4`。舊「相等／不相等」輸出歸因未成立；原始 28 次比較值全為 `-1`。見[分支紀錄](validation/opcode-55-dos-branch-probe-20261114.md)與[單點 trace](validation/opcode-55-verified-entry-trace-20261114.md)。
- [ ] 2026-11-14 opcode 65：合成腳本已證明一字續行；原始獨立事件 939 無持久可見效果，但其他副作用仍待 trace。見[對照紀錄](validation/opcode-0-65-dos-continuation-20261114.md)。
- [ ] 2026-11-13 DOSBox-X save/load state：同程序儲存再載入在 SDL2 2026.10.01 既有兩次 `0xc0000005` 崩潰，不能當作可靠復位；需另建修復／替代重播路徑。見[操作紀錄](validation/dosbox-x-debugger-and-sampling.md)。
- [x] 2026-11-13 事件 344 的 opcode 25／30：原生 AVI 與逐段畫格顯示場景視野往返，之後主角移到爐灶附近；座標軸數值未校準。見[驗證紀錄](validation/opcode-25-30-dos-observation.md)。
- [x] 2026-11-13 事件 655 的 opcode 57 所在段：錄到 AVI 與短暫畫面變化，後續三槽圖號吻合腳本；前置 opcode 0 的重畫未單獨隔離。見[驗證紀錄](validation/opcode-57-dos-observation.md)。
- [x] 2026-11-13 事件 101 的 opcode 56：原版戰鬥 14 勝利後，角色聲望由 0 增為 3，符合 `56(3)`；事件 49 戰場頁先前未能續行的紀錄仍保留。見[驗證紀錄](validation/opcode-56-dos-observation.md)。
- [x] 2026-11-13 事件 620 的 opcode 8：腳本結束後出場的原生 WAV 與同場景無 opcode 8 出場對照不同；見[驗證紀錄](validation/opcode-8-dos-observation.md)。
- [x] 2026-11-13 事件 531 的 opcode 14／66：中間畫格顯示整場淡出，原生 WAV 顯示持續音訊切換；事件 514 的淡出對照未出現同樣音訊切換。見[驗證紀錄](validation/opcode-14-66-dos-observation.md)。
- [x] 2026-11-13 事件 1001 的 opcode 61：目標槽位三個圖號欄均為 0／4664 時，後續對話有明確差異；見[驗證紀錄](validation/opcode-61-dos-observation.md)。
- [x] 2026-11-13 事件 389 的 opcode 67：原版 WAV 錄音在 `67(22)` 後有短暫額外聲音，並進入後續對話；見[驗證紀錄](validation/opcode-67-dos-observation.md)。
- [x] 2026-11-13 事件 931 的 opcode 40：既有原版畫格顯示 Y 路徑後主角站姿朝向改變；未確認 `3` 的方向對應與內存欄。見[驗證紀錄](validation/opcode-40-dos-observation.md)。
- [x] 2026-11-13 原始事件 353 的 opcode 26：場景 32 槽 4／5／6 的 word 4 分別從 -1／-1／0 變為 0／0／1；見[驗證紀錄](validation/opcode-26-dos-observation.md)。
- [x] 2026-11-13 opcode 31 事件 234：ID 174 ×9／×10 對照顯示不同對話；足夠時已扣除 ID 174。見[驗證紀錄](validation/opcode-31-dos-observation.md)。
- [x] 2026-11-13 原始事件 16 的 opcode 4：ID 160 正路顯示燒書對話，同地點非 ID 160 控制組沒有；見[驗證紀錄](validation/opcode-4-dos-observation.md)。
- [x] 2026-11-13 已將 19 個 Unknown 的原始候選事件逐一載入並觸發首輪，逐項記錄實際到達點及需要的物品、對話、戰鬥或音訊前置；首輪執行不等於 19 個 opcode 語意驗收。見[逐項首輪紀錄](validation/unknown-opcode-first-pass-20261113.md)。
- [ ] 依首輪紀錄補齊需要「使用物品」的 4／13／26／31／61／66，及需要戰鬥勝利／錄音／影片的案例；未到指令不得標 Local DOS。
- [x] 2026-11-13 原始事件 821 的 opcode 54：四個世界場景候選入場條件前後差分，對話完全結束後才讀取。見 [驗證紀錄](validation/opcode-54-dos-observation.md)。
- [x] 2026-11-13 原始事件 567 的 opcode 27：場景事件槽 8 圖號欄 5／6／7 `0→6448`，於後續對話時讀取、戰鬥前停止。見 [驗證紀錄](validation/opcode-27-dos-observation.md)。
- [ ] 事件 225 的 opcode 25 尚未隔離：草地對話前後未看出指定物件的 `(44,54)↔(48,53)` 動作；需在原場景定位對象並採動畫前／中／後證據。見 [未解紀錄](validation/opcode-25-unresolved-dos-observation.md)。
- [x] 2026-11-13 原始事件 1017 的 opcode 62：對話後人物消失，無額外輸入即切入黑底紅字結局敘事。見 [驗證紀錄](validation/opcode-62-dos-observation.md)。
- [x] 2026-11-13 原始事件 115 的 opcode 5：Y/N 過招提示；N 顯示未準備並返回，Y 進入後續戰鬥選人。見 [驗證紀錄](validation/opcode-5-dos-observation.md)。
- [x] 2026-11-13 原始事件 28 的 opcode 23：角色 4 用毒候選欄 `53→99`，已到後續戰鬥選人畫面但未進行戰鬥。見 [驗證紀錄](validation/opcode-23-dos-observation.md)。
- [x] 原始事件 932 的 opcode 59：對話及物品通知完全結束後，執行中隊伍 `[0,1,49,-1,-1,-1]→[0,-1,-1,-1,-1,-1]`；載入存檔副本不變。見 [驗證紀錄](validation/opcode-59-dos-observation.md)。
- [x] 原始事件 289 的 opcode 35／41／63：角色 36 的首個武功 ID／點數、攜帶物品 ID／數量與性別候選欄依原始參數改寫。對話覆蓋層消失並穩定後才讀取最終記憶體。見 [驗證紀錄](validation/opcode-35-41-63-dos-observation.md)。
- [x] 原始事件 673 的 opcode 34：主角資質候選值 `72→75`，與 `34(0,3)` 相符，事件槽另由前一條 opcode 3 改為 674。上限／其他變體未驗。見 [驗證紀錄](validation/opcode-34-dos-observation.md)。
- [x] 原始事件 20 的 opcode 22：主角 CurrentMP／MaxMP `26/26→0/26`，發生於後續戰鬥前；同伴效果未驗。見 [驗證紀錄](validation/opcode-22-dos-observation.md)。
- [x] 原始事件 445 的 opcode 42：加入 Y 路徑中主角候選性別 `0`／`1` 產生拒絕／答應兩種對話；是否檢查任一女性同伴未驗。見 [驗證紀錄](validation/opcode-42-dos-observation.md)。
- [x] 原始事件 581 的 opcode 33／49：角色 49 學會「天山六陽掌」，原版記錄 offset 128 武功 ID `0→15`；候選內力屬性 offset 80 `1→2`。其他欄位及變體未驗。見 [驗證紀錄](validation/opcode-33-49-dos-observation.md)。
- [x] 原始事件 581 同一路徑的 opcode 45／46／47／48：角色 49 速度 +20、CurrentMP/MaxMP +300、攻擊 +30、CurrentHP/MaxHP +200，與原始參數逐一吻合；其他變體未驗。見 [驗證紀錄](validation/opcode-45-48-dos-observation.md)。
- [x] 原始事件 96 的 opcode 9：原版畫面呈現加入 Y/N，兩選項各走不同後續對話；不把後續隊伍／事件效果算入 opcode 9。見 [驗證紀錄](validation/opcode-9-dos-observation.md)。
- [x] 原始事件 581 的 opcode 20 滿隊分支：一人與六人隊伍選擇不同後續，六人顯示「隊伍已滿」且事件槽未被另一支修改；參數逐一意義仍未驗。見 [驗證紀錄](validation/opcode-20-dos-observation.md)。
- [x] 原始事件 640 的 opcode 29：候選 Attack 28 顯示力氣不足對話；Synthetic State Attack 75 走後續事件修改及物品 ID 110 ×1 路徑。上界／其他角色未驗。見 [驗證紀錄](validation/opcode-29-dos-observation.md)。
- [x] 原始事件 931 的 opcode 11：住宿 Y/N，N 返回、Y 顯示後續對話；同事件 Y 路徑的 opcode 12 局部 HP 1/44→44/44。其他數值與完整跳轉公式未驗。見 [驗證紀錄](validation/opcode-11-12-dos-observation.md)。
- [x] 原始事件 990 的 opcode 60：場景 80／事件 1 三個圖號原值 6068 與合成 6066 導致不同對話；個別圖號欄、其他變體未驗。見 [驗證紀錄](validation/opcode-60-dos-observation.md)。
- [x] 原始事件 37 缺 ID 173 路徑的 opcode 19：兩段對話間由櫃檯區切到圍欄泥地區；精確座標軸向未驗。見 [驗證紀錄](validation/opcode-19-dos-observation.md)。
- [x] 原始事件 950 的 opcode 21：對話結束後執行中隊伍移除角色 1；先前讀取載入存檔副本的「未見離隊」推論已撤回。其他角色／不在隊的情況未驗。見 [驗證紀錄](validation/opcode-21-dos-observation.md)。
- [x] 原始事件 581 尾端 opcode 10：修正角色表為 182-byte 間距後，角色 49 能力增量與五段通知吻合；執行中隊伍另有 `[0,49,-1,-1,-1,-1]` 紀錄，支持虛竹加入。其他角色／滿隊／攜帶物品未驗。見 [驗證紀錄](validation/opcode-10-dos-observation.md)。
- [x] opcode 55 原始事件 464 trace：四次實際 `55` 命中 handler，helper 都返回 `-1`，word 索引分別 `28→32`、`47→51`、`66→70`、`85→89`，後續四個事件槽變成 862～865。基線 KDEF 28 次 `55` 均為 `55,目標槽,-1,14,0` 且下一 word 為 `3`；其他 24 次尚未逐案執行。見[原始事件 trace](validation/opcode-55-original-event464-trace-20261114.md)。
- [x] opcode 55 內容轉接器：只有 KDEF.GRP／KDEF.IDX 雜湊吻合時，為 28 筆同形原版指令附 DOS 游標目的地；四筆實際執行與 24 筆 bytes 推論分級。中間資料仍不可執行，未把社群條件分支套入通用 Runtime。見[全量產物](validation/full-original-event-corpus.md)。
- [ ] opcode 55 剩餘邊界：其他參數值、24 筆其餘事件的動態路徑及 handler 額外副作用未驗；在轉為可執行命令前核對後續事件修改的資料契約。見[原始事件 trace](validation/opcode-55-original-event464-trace-20261114.md)。
- [x] 固定場景的精確遊戲畫格加入本機覆蓋層文字化比對；已知乾淨畫格、對話、Y/N 選項及物品通知可分辨有無覆蓋層。只作流程守門，場景切換或未知 UI 仍需人工檢視。
- [x] 以原版遊戲內第三槽存檔及不停模記憶體核對事件 460→675→676，完成指令 50 全缺、全有及缺 ID 142 三個局部案例；記錄 Synthetic State 邊界。
- [x] 完成 OP50-MISSING-EACH 五案；逐一核對缺料對話及其他四項未扣。
- [x] 完成 OP50 單一零數量、無關額外物品與反向槽順序案例；逐案核對載入前後背包及分支。其他非法、重複或多槽數量變體仍屬未測範圍。
- [x] 原始事件 190 的 `15,83` 敗北路徑重播兩次，均到死亡／讀檔頁；事件 0 的 `0,-1` 對照仍在場景。
- [x] 原始事件 37 有 ID 173 ×1 時觸發後事件槽 37→`-1`；無 173 時顯示另一對話且事件槽仍為 37。記錄後續 opcode 3／1 的效果，勿歸給 18 自身。
- [x] 使用者關閉事件 37 的單一測試視窗後，已用 `synthetic-op18-event37-absent-20261112/manifest.json` 核對還原第三槽；自動審核額度限制已解除。
- [x] 原始事件 497 的第一條 `2(57,1)` 已實測畫面取得提示與活躍背包新增 `(57,1)`，測後還原第三槽。見 [驗證紀錄](validation/opcode-2-dos-observation.md)。
- [x] 原始單指令事件 692／825／828 已各自實測 opcode 51 的多段對話、52 的品德 50、53 的聲望 0；各次測後關閉唯一視窗並還原第三槽。見 [驗證紀錄](validation/opcode-51-53-dos-observation.md)。
- [x] 原始單指令事件 938 已對照 opcode 64 的無銀兩不足款與合成 ID 174 ×30,000 的購買成功路徑；後者 ID 0 數量 3→4，174 數量未變。見 [驗證紀錄](validation/opcode-64-dos-observation.md)。
- [ ] 查明 opcode 64 在此合成場景顯示空白商品框、取得 ID 0 且未扣 ID 174 的原因；用自然可達的商店場景及實際價格／庫存對照，不得把這次局部案例當完整商店規則。
- [x] 原始事件 328 的 opcode 36 已用主角候選欄位 byte 864 原值 0 與合成值 2 比較，取得不同對話；值 2 的故事語意仍 Unknown。見 [驗證紀錄](validation/opcode-36-dos-observation.md)。
- [x] 原始事件 636 的 opcode 43 在 ID 110 缺／有 ×1 時出現不同後續對話；數量 0 與其他事件未驗。見 [驗證紀錄](validation/opcode-43-dos-observation.md)。
- [x] 原始事件 497 的 `37(-1)`：取得物品提示仍開啟時品德候選 50，關閉後同一執行中位址為 49；聲望未變。見 [驗證紀錄](validation/opcode-37-dos-observation.md)。
- [x] 原始事件 420 的 `39(75)`：兩段對話後場景 75 候選 EnCondition 1→0；尚需實際大地圖入口驗收。見 [驗證紀錄](validation/opcode-39-dos-observation.md)。
- [x] 原始事件 274 的第二條 opcode 17：場景 32 第 1 層 `(12,22)` 由 0→2898，列優先索引與圖層數量對照成功。見 [驗證紀錄](validation/opcode-17-dos-observation.md)。
- [x] 原始事件 434 的 opcode 38：隔離第三槽合成一格 990，執行後場景 32 第 0 層同格 990→994。多格同值與其他層未驗。見 [驗證紀錄](validation/opcode-38-dos-observation.md)。
- [x] 原始事件 458 的 opcode 28：主角候選品德 50 顯示後續對話，合成 49 三次互動均無該對話，符合候選立即返回路徑。上界與其他角色未驗。見 [驗證紀錄](validation/opcode-28-dos-observation.md)。
- [x] 原始事件 27 的 opcode 16：隊伍無角色 1 時場景 32 槽 1 腳本仍 `-1`；隔離隊伍槽 1=角色 1 時後續 opcode 3 改為 28。見 [驗證紀錄](validation/opcode-16-dos-observation.md)。
- [x] opcode 15 原版 DOS handler 入口在隔離 `15,83,7` 腳本命中；機器碼讀下一 word `83` 並傳給處理函式，死亡／讀檔頁出現。見[限定 trace](validation/opcode-15-83-binary-trace-20261114.md)。
- [ ] opcode 15 的 `83` 具體作用與後續 `7` 是否執行仍未驗；隔離 `82`／`83` 的死亡頁畫格 SHA-256 相同，只排除可見畫面差異。返回路徑雖有游標加 2 的機器碼，本死亡路徑未到返回停點。事件 16 無指定物品路徑只與 7 返回相符，尚未隔離追蹤。
- [ ] 對其餘每個實際出現的 opcode 建立原版執行案例與前後狀態證據；未出現的 24 記為語料無案例，不虛構驗證。社群 handler 靜態研究不作原版通過。
- [x] 產生 [逐 opcode 靜態採樣候選](research/event-opcode-replay-candidates.md)：68 列、67 個在語料出現，opcode 24 無案例。事件 ID、KDEF offset、事件 SHA-256、目標前置指令均列出；此表不是原版執行驗收。
- [ ] 驗證場景 23／32 入場條件原值 1 的自然解鎖規則；合成強制入場的執行結果不得用來聲稱正常流程可達。
- [ ] 補足玩家／同伴屬性、武功與隊伍的遊戲內存檔前後差分；目前僅本案位置、事件欄位及背包部份案例核對。

最新結果：SDL1 slot 3 的 Save state 註解框位於獨立程序／視窗，留空按 OK 後 `3.sav` 成功保存；同 build 讀回雖記錄 `Loaded`，DOSBox-X 隨即以 WER `0xc0000005` 崩潰。舊記錄「slot 3 未保存」已過時。事件採樣先使用原版遊戲內進度檔，模擬器 state crash 獨立追查；仍維持一次僅一個遊戲視窗。

最新驗證：唯一 SDL1 DOSBox-X PID 9760 已在標題畫面選取空白 slot 3，日誌確認選槽；但 Save state 選單命令及 F11+S 投遞後，沒有 `save/3.sav`，畫面亦無可見提示。同 build state 保存／讀回尚未成功。下一步先修復精確視窗輸入通道，並對非預期結果先檢查目標畫面。

最新狀態（Load state 警告已查證）：PID 9760 的 SDL1 build 正在詢問是否載入 SDL2 state；已讀取畫面並選 No，標題已移除 PAUSED，等待的 HELP 已輸出。以下舊記錄的「paused／loading 未定」已由此查證取代。異常必須先檢查精確視窗畫面／dialog 內容；載入前核對 SDL1／SDL2，不強制跨 build 載入。SDL2 原先的 WER crash 仍須另行處理。

## 2026-11-11：DOSBox-X 互動、debugger、存檔採樣及完整 opcode 邏輯

- [x] 從 DOSBox-X 2026.10.01 到達原版標題畫面；確認 debugger 選單、暫存器、反組譯與檔案 I/O 記錄視窗可用。
- [x] 建立隔離 `session-002` 及存檔相關檔案 SHA-256 基線；session-001 保留為基準。
- [x] 建立 DOSBox-X loopback debugger 橋與可重現啟動器；實測 session-002 PING／HELP／CPU／BPLIST，並設置／列出 BP 與 BPINT。BREAK 有協定 acknowledgement，但實際 CPU 暫停尚未驗證；見 `docs/validation/dosbox-x-debugger-and-sampling.md` 及 ADR0036。
- [x] 建立 0–67 opcode 覆蓋表：候選參數字數、出現次數、FishEdit文件描述、社群 Pascal dispatcher 及本專案 Runtime 支援狀態；見 `docs/research/event-opcode-coverage.md`。
- [x] 使用者確認原版 `Esc` 會打開遊戲內選單；選離開會出現 Y/N，亦可左鍵選離開。此為使用者觀察，不是本輪自動擷取；更新驗證紀錄，不再把早先黑畫面誤當退出證據。
- [x] 建立 debugger console 的精確視窗 accessibility 文字讀取路徑；取得 `surface consider=640x400 final=640x404`、401、400 resize 記錄，不以桌面截圖判讀。
- [x] 建立 `scripts/Capture-DOSBoxX-GameFrame.ps1`，以精確 HWND 對 DOSBox-X 發出內建 raw screenshot 命令；session-001 成功輸出遊戲專用 640×400 PNG，沒有置前或桌面截圖。
- [x] session-002 遊戲畫格擷取：使用者從 GUI 選擇 **Debug → Debug option → Run Normal** 後，精確視窗標題去除 `DEBUGGER` 後綴；重列 HWND/PID/title，再用 raw capture helper 成功產生 `z_001.raw1.png`，且 foreground HWND 前後皆為 `0x2042C`。見驗證文件。
- [x] 實測 Run Normal 時的 debugger 閃動與鍵盤延遲；BPLIST 找到 `BP 0160:1D543E`、`BPINT 21`、`BPINT 21 AH=4B`，逐一 BPDEL 後 BPLIST 為空、console 顯示 Running。清除後鍵盤尚未重測。
- [x] 記錄觀察原則（ADR0037）：物品數量與頁面變化以不停模的唯讀觀察為先；只有追蹤二進位指令／反組譯，或需透過操作前後完整暫存區／記憶體快照比對定位保存資料位址時，才在取得快照／指令片段期間短暫凍結。
- [x] 建立全域可自動發現的跨遊戲技能 `~/.codex/skills/dosbox-x-operator`，涵蓋啟動、視窗對應、定向輸入、遊戲畫格、debugger console 文字與非暫停式觀察規則。
- [x] 檢查指令釐清前置：1,018/1,018 事件已有候選切分及原始 bytes／offset／hash；FishEdit 與社群 dispatcher 版本已固定；session-002 可操作並取遊戲畫格。可開始逐指令取證分析，這不等於 68 條語意已知或通過原版驗證。
- [x] 第一批靜態語意對照：opcode 0／1／2／16／18／32，附社群 handler 實際讀寫、畫面等待與分支方式，以及本機候選資料樣本、offset、hash；DOS 行為仍 Unknown。見 `docs/research/event-opcode-semantics-first-batch.md`。
- [x] 第二批靜態語意對照：opcode 3–15，逐項記錄 pinned community handler 與 dispatcher 的讀寫／分支／畫面效果；DOS 行為仍 Unknown。opcode 15 的 114 筆候選尾字全為 83，但 community handler 不讀此值；含義仍 Unknown。見 `docs/research/event-opcode-semantics-second-batch.md`。
- [x] 第三至第五批靜態語意對照：opcode 17–67 已按區段記錄 community handler 實際讀寫、副作用、等待與 dispatcher 前進方式；opcode 50 的兩種路徑及 opcode 65 無 handler 均保留來源差異；DOS 行為仍 Unknown。見 `docs/research/event-opcode-semantics-third-batch.md`、`event-opcode-semantics-fourth-batch.md`、`event-opcode-semantics-fifth-batch.md`。
- [x] 原版選槽逐列驗證：Load menu 三列選取循環；第三列經 log 確認載入 R3。僅改隔離 R3.GRP offset 6（235→245）後重載，地圖位置改變；六個 R3/S3/D3 檔還原到備份 hash。詳細見 `docs/research/original-save-layout-candidate.md`。
- [x] DOSBox-X Capture slot 1 存下目前完整 emulator 狀態（`session-002/save/1.sav`，981,563 bytes，SHA-256 `73648B6068EA38737266D72845A66AF549D78714E82C3EB8E840AC0021E73747`）；跨冷啟動 restore 尚待實測。
- [x] 依使用者要求調整互動觀察：已知命令至少間隔一秒；預期動作不逐步讀圖片，只有非預期／模糊才擷取；採用 DOSBox-X state slot checkpoint 恢復完整 guest。
- [x] 依session-002本機 save bytes建立候選存檔偏移地圖：背包、隊伍表、角色record、基本數值、武功／等級與座標欄位；逐欄標明community/inferred，不據此改存檔。見 `docs/research/original-save-layout-candidate.md`。
- [x] 記錄每次新指令後先確認 DOSBox-X 精確session、遊戲頁面及執行狀態，再逐鍵決定輸入；見 ADR0038。
- [x] 在互動桌面 session 驗證擷取前後 foreground HWND 非零且不變；session-002 擷取前後皆為 `0x2042C`。
- [ ] **恢復模擬器狀態：**提升權限後可啟動 DOSBox-X。SDL2 build 的 slot 1 與新存 slot 2 載入後以 `0xc0000005` 結束；非 SDL2 build 的唯一 PID 9760 仍活著，視窗標題 `PAUSED`，日誌停在 `Loading state`。先用提升權限檢查這個精確程序與 debugger bridge，查明載入是否完成；受限權限查不到程序不代表程序已退出。不要重複開窗。恢復可玩進度後才執行 opcode 15／50 案例。每次鍵盤輸入間隔至少一秒；預期操作不逐次讀圖，只有非預期／模糊時擷取遊戲畫面。Escape/Exit 操作已由使用者確認，不需重測。
- [x] 完成 debugger loopback TCP handshake，實際執行 HELP／CPU／BPLIST，設置並列出 BP／BPINT。
- [ ] 僅在二進位指令追蹤／反組譯，或完整記憶體操作前後差分定位保存資料位址時，執行範圍明確的短暫凍結；一般操作驗收不得暫停主模擬。此 DOSBox-X build 未辨識 STEPIN。
- [ ] 建立唯讀物品數量觀察：若位址已知，遊戲保持執行並擷取操作前後值，與頁面變化交叉核對；若位址未知，依 ADR0037 在操作前、後快照時短暫凍結，中間恢復執行，再差分定位位址。
- [ ] 在 session-002 透過原版 UI 建立並讀回一般存檔；記錄前後 hash 及槽位。
- [ ] 以合法存檔的單變量前後差分確認背包 ID／數量、主角與同伴屬性／武功、隊伍表及玩家位置 offset；目前 offset 6 已由合成 R3 介入證實會影響地圖位置，但軸名／方向未明。其他欄位必要時確認 runtime memory address，遵守 ADR0037 快照時才凍結。
- [ ] 只有欄位差分經遊戲讀回核對後，才做標註 Synthetic State 的複製存檔編輯器；至少能在副本修改物品／隊伍／座標並由DOSBox-X載入驗證。
- [ ] 建立可重播事件前置存檔或可驗證路線，讀檔採樣事件前後狀態；人工編輯存檔一律標註 Synthetic State。
- [ ] 逐 opcode 建立語意證據矩陣（原始參數 bytes／來源版本／讀寫狀態／分支／可見效果／失敗行為／信心等級／可重播案例）；FishEdit結構／文件與社群 handler 不等於 Verified Original。未知 opcode 隔離，不阻擋其他已有證據的指令。
- [ ] 以 session-002 合法遊戲進度重現一個 opcode 2／32 物品變更案例；從可見頁面及唯讀狀態差異驗證原版，不先把社群 handler 當預期值。未知物品記憶體位址時依 ADR0037 僅於操作前後快照短暫凍結。
- [ ] 實作有來源證據的原版 opcode adapter 並比較 DOSBox-X 執行結果；未支援指令須停止該事件且不提交部分狀態。
- [ ] 將事件採樣接到旗標、物品、人物、位置、場景及隊伍狀態差異檢視。

歷史阻礙（2026-11-11）：PID 9760 曾在 PAUSED 視窗等待 debugger／state 操作；該程序已結束，不能當作目前執行狀態。2026-11-12 的隔離案例每案均關閉唯一精確程序並還原第三槽六檔；下一案開始仍需先查同權限程序清單。進度 checkpoint `session-002/save/1.sav` 的模擬器 state restore 尚未驗收。一般事件驗收不暫停模擬；只有二進位 trace 或完整記憶體差分才依 ADR0037 限定凍結。

測試備註：debugger protocol單元2/2、完整Node單元66/66及Python 14/14通過。執行 `node tools/validator/export-schemas.mjs` 同步新增的 item description 欄位後，原 shared-schema 測試通過。

## 2026-11-09：全量劇情／事件轉換與狀態驗證

- [x] 將全部 1,018 個 KDEF 事件及 2,977 個 TALK 資源轉成可追溯的本機中間資料，保留原始 bytes／offset／hash；不匯出商業資料至 Git。
- [x] 驗證所有事件結構、對話引用、目前互動欄位引用、候選分支邊界及 CP950 對話解碼；見 `docs/validation/full-original-event-corpus.md`。
- [x] 建立逐 opcode 覆蓋盤點表，記錄候選長度、頻率、可取得的 FishEdit描述、Pascal dispatcher與目前 Runtime 覆蓋；此表尚未補齊每條指令的參數語意／state effects，見 `docs/research/event-opcode-coverage.md`。
- [ ] 建立逐 opcode 完整語意與 state effect 對照表，為每項記錄來源、版本、信心及 DOS 原版驗證狀態。
- [ ] 先實作有證據的 opcode Runtime adapter；遇到未知或未實作指令時停止事件且不提交部分 state。事件 673 與事件 581 已完成來源鎖定限定轉接，但不是通用 opcode 實作。
- [x] 事件 581 單人樣本的事件槽、角色 49 八欄與入隊效果已納入同一原子工作階段；滿隊樣本三個領域皆不變，未採樣隊伍拒絕。事件 536 的相同 52-word body 已做 byte identity 核對，但可達性與其後場景效果未驗。見 [驗證紀錄](validation/event-581-complete-state-adapter-20261120.md)及 [ADR 0061](decisions/0061-event-581-partial-session.md)。
- [x] 將事件 28／101／289／497／932／950 的已驗人物、局部背包與隊伍前後值建立來源鎖定案例 adapter；總矩陣明確標為 scoped、不是通用 opcode。見 [驗證紀錄](validation/evidence-scoped-state-adapters-20261120.md)及 [ADR 0062](decisions/0062-evidence-scoped-state-adapters.md)。
- [x] 建立 ALLSIN 場景 layer 稀疏覆蓋容器，並接入事件 274 的場景 32／layer 1／陣列格 `(12,22)` `0→2898` 限定案例。
- [x] 建立 RANGER 場景 metadata overlay，接入事件 420／821；沿用 layer 與事件槽容器接入事件 434／353／567。Synthetic State 與未掃描場景均保留明確限制。
- [x] 事件 676 材料齊全正例以前九格觀察視窗接入：138–142 各 1 清空，第一材料槽得到 176×1；不把此切片當作完整背包或 opcode 50 通用分支。
- [x] 事件 20／931 的 Synthetic State 人物前值已明確與原始 RANGER 基線分離，分別接入 MP `26/26→0/26` 與 HP `1/44→44/44` 限定案例。
- [ ] 為玩家位置／朝向及完整原版背包建立來源鎖定狀態容器，再評估事件 19／30／40；目前位置軸、朝向數值及完整背包全部槽位證據不足，不可自行命名或補值。
- [ ] 將事件前後旗標、物品、人物狀態、位置、場景及隊伍變更接入本機驗證檢視。
- [ ] 使用隔離 DOSBox-X 案例優先驗證 Opcode 15／50；未取得證據前不把其效果標記為 Verified Original。
- [ ] 驗證使用者提出的結局假設：Opcode 15 是否結束遊戲；opcode 7 與 `-1` 是否區分死亡／破關。現有來源僅把 7 作事件中止、`-1` 作每筆 KDEF 資料終止標記。
- [ ] 補查自動觸發、物品觸發及動態事件表寫入引用；本輪只核對目前互動欄位。

## 2388尺寸要求與管線缺口（最新）

- [x] 釐清最大完整4×3占位與原圖比例推導高度2.5402；本機外框校準僅為實驗。
- [x] 查證API沒有尺寸／體積約束，GLB輸入只做後處理，未提交新工作。
- [ ] 先補足管線尺寸／體積重建契約；不得把本機拉伸或GLB後處理稱為重新AI生成。
- [ ] 2388山體結構仍待重產／修整，本機斜薄片候選不當完成模型。


## 2026-11-04：只轉building，首個2388（使用者核定）

- [x] 轉換範圍限building；earth／surface保留原圖，最後另定處理。
- [x] building2388／圖片1194送既有服務成功，LOD0接回原世界；同ID93處放置共用模型，不依10種引用mask自動變形。
- [x] 來源與服務hash、原始圖層／package不變、局部顯示驗收，見ADR0035／validation/building-model-2388.md。
- [ ] 2388生成山體偏薄；先修整體積、朝向、底緣／背面，驗收後再擴大building批次。


## 2026-11-04：世界資產占格與組合盤點

- [x] 使用者確認人工操作正常；座標軸修正的局部使用回饋已收到。
- [x] 958獨立ID圖錄、460／180／318原始圖層篩選、7832非空錨點與精確mask／變體統計。
- [x] 740組多ID相鄰候選與原座標疊圖，全部mergeApproved=false；不自行合併。
- [x] 完整JSON與空白決策模板、本機圖錄驗收；見ADR0034及research/world-asset-structure.md。
- [ ] 逐ID核對植被／房舍／坡壁等外觀及是否突起，決定原創高度；原始圖層不直接當類別。
- [ ] 從樹形2016／完整院落2784／人工選定的多圖片段開始，依各實例mask製作占位，不能用bbox填滿稀疏占格。


## 2026-11-04：完整世界座標軸（目前優先）

- [x] 世界480×480及958圖片ID原圖投影、本機完整世界包與行走入口。
- [x] 修正原版Y誤映射+Z；世界統一(x,y)→(x,0,-y)，地面／圖片錨點／玩家／輸入／小地圖同基底，相機角度不變。
- [x] 起點附近X+／Y+與一個已知阻擋格局部驗證；見ADR0033及validation/world-axis-alignment.md。
- [x] 玩家回報人工操作正常；後續若有剩餘差異，先核對具體座標，不先改blocked。
- [ ] 船隻、場景入口、完整原版通行驗收後續再做；全圖連通檢查依使用者要求延後，不作目前畫面修正前置。


## 2026-11-04：地面資源逐ID獨立（現行政策）

- [x] 核對21張地面原圖，各自獨立material ID；64格逐項對照來源圖號、保留原圖已有交界。
- [x] 外觀註記不當地形／玩法屬性；surfaceType與gameplayProperty均Unknown，mergeWith=null。
- [x] 撤回平均色分類／共用草土流程，舊工具預設拒絕，新流程見ADR0032／validation/independent-ground-review.md。
- [x] 原圖投影核對包與21圖聯絡表、本機HTML／JSON完成；不是高清材質定稿。
- [ ] 以各ID原圖獨立製作高清候選，保留自身圖案／色塊／交界；不按顏色推定類別，不合併近似資源。
- [ ] 1182厚邊的真實3D結構仍未知，不由22px推定高度；新增邊界過渡前先比對相鄰原圖。


## 2026-11-04：共用地面材質（已撤回的實驗，地面政策以ADR0032為準）

- [x] 查證樹木原Job現在succeeded，預覽更新成功LOD0；舊失敗紀錄保留歷史。
- [x] 拆解GLB幾何／圖片bytes，確認LOD0變大主要為貼圖增量；見validation/shared-ground-material.md。
- [x] 原創草土共用base-color，64格連續UV與平滑色調，一個GLB／材質／貼圖，實景可匯入。
- [ ] 確認地面色調、近景重複感／接縫；之後路面、石板及欄杆材質。
- [ ] 貼圖壓縮、normal／roughness maps及LOD共用貼圖／快取效能預算。


## 2026-11-04：開始實際美術替換

- [x] 明確授權兩張原圖送既有LAN服務；樹木raw GLB、岩石LOD0接回場景1原版8×8配置，保留來源與Job／SHA，見ADR0030及validation/first-generated-art-sample.md。
- [x] 實際帶材質模型在Chromium呈現並截圖，4MB有界預算支援；其餘占位不標為完成美術。
- [ ] 驗收樹冠亮度、岩石綠色底座、共同地面與欄杆材質，統一樣本風格後再量產。
- [x] 樹木Blender verify三角形重載差異已由使用者修正；最新原Job succeeded、預覽改用成功LOD0，見ADR0031。


## 2026-11-04：先不開放鏡頭旋轉

- [x] 本機GLB依assetId替換全部實例、實際bounds預檢／尺寸與底部校正、還原匯入時模型；只改視覺，進度／碰撞／存檔不變。見ADR0029、validation/model-replacement.md。
- [ ] 先選一個精細資產的共同尺寸／原點／朝向／材質風格驗收樣本；2MB靜態GLB目前只作前置驗證，未測大型貼圖或最終美術一致性。
- [ ] 鏡頭旋轉依使用者要求暫不開放；保留已完成的相機／小地圖同步機制。

- [x] 行跡小地圖依要求順時針旋轉135度，背景／阻擋／角色／出口共用轉換並留邊；邏輯座標及碰撞不變。見ADR0027。
- [x] 修正旋轉後的水平鏡射差異；新增MiniMap與WebGL角色四方向實際像素位移比對，保留135度及邏輯座標。
- [x] 以實際相機alpha／beta驅動小地圖，取代固定角度／鏡射；鍵盤與觸控共用即時alpha，5方位×2俯角×8方向實際Babylon投影測試通過。見ADR0028、validation/camera-minimap-sync.md。
- [ ] 未來啟用旋轉操作後，補旋轉中手感、鏡頭限制及多角度美術驗收；目前同步機制已接好，UI仍固定鏡頭。

## 最新：圖塊來源查證與規則幾何

- [x] 第二來源8×8切片(20,22)：牆片／門側紅柱／欄杆占位與本機瀏覽器呈現；家具器物6類診斷保留，無屋頂推定，見ADR0025、validation/building-wall-preview.md。
- [x] 統一map-region與prepare-mvp的社群通行判定；門口slot15欄位0=0可通行，腳本仍未執行；新版來源建築包0.2.0。見ADR0026、validation/building-passage-cutaway.md。
- [x] 獨立Mock門洞、牆角、窗洞、桌子、屋頂顯隱；手動剖視只改顯示，隱藏牆仍阻擋，Node與畫布像素E2E通過。
- [ ] 手動剖視使用感受、自動遮擋／角色輪廓需求及多視角尺度覆核；原版門事件、屋頂語意仍未驗收。

- [x] 選區完整占位覆蓋：32個layer／ID → 64地板、6欄杆／柱、1告示牌、14 GLB（10草、2樹、2石）；未映射0，碰撞22格不變。見ADR0024、validation/full-placeholder-region.md。
- [ ] 完整占位選區的角色遮擋／尺寸／多視角評估，再進共同材質及精細替換；不能將zero unmapped當原版完成。

- [x] 獨立Mock石頭碰撞對照：同一GLB／尺寸，綠格可穿透／紅格整格阻擋；存讀及斜角驗證通過，見ADR0023、validation/model-collision-comparison.md。

- [x] 真正 GLB 占位模型路徑：可重現低模石頭、穩定 assetId／hash／transform、本機來源圖號綁定、官方 loader／ready／錯誤拒絕、Mock與原版選區呈現，見 ADR 0022、validation/local-glb-placeholder.md。
- [ ] 精細模型替換的共同尺寸／原點／材質風格驗收，GLB 快取／LOD 與正式資產管理仍待後續；目前僅占位技術驗證。

- [x] PrimitiveGeometry v1 多四方體尺寸／偏移／旋轉／純色材質契約；Mock 地板、窄牆、階梯本機匯入及瀏覽器呈現，碰撞獨立。見 ADR 0018、validation/primitive-workshop.md。
- [x] 原版選區 21 個地面 ID 映射到 64 塊明確原創地板，來源圖片平均色、來源雜湊核對、本機包／瀏覽器呈現完成。見 ADR 0019、validation/source-ground-preview.md。
- [x] 11 個上層 ID 逐圖分類覆核，兩個欄杆／立柱原創 proxy 產生 6 個實例，剩餘 9 類診斷；見 research/scene1-upper-classification.md、ADR 0020、validation/upper-rail-preview.md。
- [x] 告示牌兩片格位／錨點與接縫查證，明確兩格間距群組規則；只生成一面原創 proxy、保留兩份來源引用，剩餘 7 類診斷。見 ADR 0021、validation/grouped-sign-preview.md。
- [ ] 草叢／樹／石頭的資產策略、材質／UV／多視角驗收；群組目前僅支援有明確證據的兩片接合，不自動泛化。

- [x] 固定來源圖號除 2、圖片標頭／錨點及高度用途查證；場景 1 的 SDX001／SMP001 共 32 個 half-index 標頭候選核對。見 research/tile-resource-mapping.md。
- [x] 場景 1 選區 32 張專屬圖片嚴格 RLE 解碼、色盤／alpha／錨點及區域靜態合成，318×249 本機預覽已檢視；不是完整 DOS 畫面驗收。見 validation/scene-region-rle.md。
- [ ] 依實際圖片逐資源分類：building layer 含樹木／告示牌／欄杆／階梯，不可全當牆壁；建立 primitive／特殊模型規則。
- [ ] 定義地面／牆體 primitive、尺寸、方向、材質的原創映射；圖層高度是畫面位移證據，不是牆體厚度。維持邏輯碰撞獨立。

## 下一階段優先：地圖資源 ID → Mock 3D 最小切片

- [x] 保存 2026-11-03 狀態與下階段提示詞：docs/HANDOFF.md。
- [x] 依實際 bytes 選定場景 1 起點 (13,28) 的 8×8 區域；保留六層原值、ID、來源偏移、雜湊與解析器版本（assets/generated/map-regions，本機 only）。
- [x] 定義版本化資源映射（tests/fixtures/map-region-mock-assets.json）與 `extractMapRegion`／`assembleRegion`；未映射 ID 明確診斷，不靜默略過。
- [x] 遊戲內本機預覽：web app 新增「匯入本機地圖區域預覽」，以明確 Mock 幾何組裝 8×8 區域；視覺與碰撞分離。
- [x] Mock 測試 tests/unit/map-region.test.mjs（7 項）與全量 30 項 Node 測試、typecheck、build、web build 通過。
- [x] 資產轉換管線已接通：本機 FastAPI 服務可提交 PNG 並產出 GLB/manifest/quality；已用 Mock PNG 完成一次成功作業。
- [ ] 後續以原版圖片對應區域 ID，透過管線產生 HD GLB 並接入 Web 預覽；不提交商業素材。

## 最新：原版事件擴充

- [x] 加入入口可達性／逐 NPC 碰撞及對話存讀門檻；2 項 Mock 與既有原版切片通過。
- [x] 事件 670 可達性追查：空事件格（事件欄位 0 == 0）可通行，修正後 --candidate 通過 checkSliceNpcs，槽 3／4 與事件 670 納入候選包；預設預覽仍維持槽 2，候選需明確 --candidate。見 ADR 0015。

- [x] Phase 3／5：全量 1,018 事件支援目錄，264 純對話／23 空／731 拒絕，保留來源偏移／雜湊及目前互動欄位反向引用；見 validation/dialogue-event-catalogue.md、ADR 0012。
- [x] 2 項新增 Mock 測試與實際重跑一致性；21 Node／4 Python、typecheck／Schema／build／artifact 通過，報告只留本機。
- [x] 場景 1／事件 670／槽 3、4 已納入預設原版預覽；候選包升級為預設，包含 3 個 NPC 與事件 668/670，mvp:check 通過。
- [ ] 瀏覽器實測候選包已補（5/5 E2E），但完整玩家手感與手機驗證仍待持續。
- [ ] 研究被拒絕的 10 筆對話參數差異；取得證據前不放寬解析器。未知指令、原版可達性與 Phase 1／2 未解事項持續獨立追蹤。

- [x] 使用者選定 GitHub Pages；既有 checks workflow 擴充為核心／Schema／build／E2E／artifact，只有 develop 通過才發布。
- [x] 工作流程通過 actionlint；安裝 wrapper 支援 Linux --with-deps，所有研究／原版輸入不作 CI 需求。
- [x] 使用者已將倉庫改為 Public 並設定 Pages Source=GitHub Actions；GitHub connector 已確認 visibility=public 且可讀取倉庫。
- [x] 4fc68e4 已提交／推送，Ubuntu hosted runner 所有核心／Schema／build／E2E 通過並上傳成品。
- [x] 管理者已確認將 develop 加入 github-pages 允許清單。
- [x] SSH 推送 d4e8dca 觸發 run 41470850061，check／deploy 成功；正式 HTTPS 網址 HTTP 200，4 項 E2E 通過（16.2 秒）。

- [x] 提交 daa02ae 並推送 origin/develop，保存 Web MVP 與鏡頭控制修正。
- [x] 新增可重跑 Playwright E2E：真正 WebGL 渲染方向、快速組合鍵／出口、對話／選項／備份、下載回匯／不相容拒絕及窄版觸控；4 案通過。
- [x] 修正短按組合鍵在放開時退回單鍵方向，補上 canvas 的明確無障礙圖像角色。

- [x] 修正 3D 鏡頭與鍵盤方向錯位：鏡頭相對八方向、組合鍵／長按、正交投影與嚴格牆角碰撞。
- [x] 已用獨立 Chromium 補上實際畫面方向與觸控測試；原 IAB API 故障紀錄保留，真實玩家手感仍可繼續回饋。

## 最新狀態：本機 Web MVP 可操作

- [x] 依要求先提交 e0686a8，成功推送 origin/develop（33 檔核心／資料／Schema／測試）。
- [x] Phase 7：React／Vite 靜態 app、Babylon.js 固定斜角占位場景、鍵盤／按鈕、NPC／對話／選項、場景切換。
- [x] 本機存讀檔、上一份備份、匯出／匯入 UI、內容組合分槽、MOD 問候切換及不相容存檔拒絕。
- [x] 本機原版預覽包 File API 匯入；建置拒絕 original／references／assets/generated 直接引入。
- [x] 開發與正式打包版瀏覽器操作驗證、桌面／窄版配置、15 Node＋4 Python 測試、靜態輸出檢查。
- [x] 已選 GitHub Pages 並準備 CI／CD；正式 HTTPS 發布驗證仍以上方最新待辦追蹤。
- [x] 補齊下載回匯瀏覽器測試與可獨立執行 E2E；另保留真實手機／長時間按住操作、其他瀏覽器的驗證。
- [ ] 逐項擴充原版事件與圖像，戰鬥另按證據推進；原版資料仍不隨網站發行。

詳見 validation/web-mvp.md、deployment.md、ADR 0010。本節取代下列歷史狀態中的「尚無可玩網頁／下一步開始 UI」，不表示完整 Phase 6 或原版還原完成。

## 目前狀態：可開始第一個 3D 場景 MVP

- [x] TALK 2,977 筆、84 場景及純對話事件子集解析，未知效果明確拒絕。
- [x] 最小 Game Content Package／Save Schema、Ajv 與跨引用驗證器；Schema 檔案與 runtime 同源檢查。
- [x] 無畫面核心：移動碰撞、鄰格互動、對話／選項／條件／旗標／物品、切圖與座標轉接。
- [x] 最小 MOD 依賴／排序／文字 patch／衝突診斷、精確包組合存檔、對話／選項續行及錯誤原子性。
- [x] 同一核心完成獨立 Mock 原創流程與本機河洛客棧純對話切片；mvp:check 回報 ready:true。
- [x] Phase 7 首個切片已完成上述本機畫面與操作驗收，詳細範圍見最新 Web MVP 紀錄。

此為第一場景準備就緒，不是完整 Phase 3／6 或可玩 MVP 完成。範圍與命令見 docs/mvp-readiness.md。以下舊有階段清單中的「未開始／下一項」由本節最新狀態取代，完整平台工作仍待後續。

## 目前優先：MASTER_PLAN v1.2 逐格式推進

- [x] 依使用者要求，先 commit `35c3f4d` 並推送 origin/develop，保存既有研究與原版啟動驗證。
- [x] 修正全域研究門檻，參考引擎建置改按需；ADR 0008 記錄局部驗收。
- [x] Phase 3：交付自行實作的 IDX／GRP 邊界解析、唯讀 metadata CLI 與 Mock 測試；117 組相容、MMAP 明確拒絕，627 檔未變。
- [x] Phase 3：TALK bytes／文字候選解讀與控制碼保留；本機 WHATWG Big5 與 CP950 顯示字串逐筆相同，不推定 DOS 字型完全一致。

以下 Phase 1／2 未解事項繼續追蹤，但不作無關格式的共同門檻。舊有「完成全部前置後才解析」已由 ADR 0008 取代。

- [x] Phase 1／2：唯讀追查 676 場景引用；找到事件 675 的候選動態賦值，見 validation/event-676-route.md。
- [x] 建立指令 3 的反向賦值閉包：洪七公居 460 → 海邊小屋 675 → 676；核對進度一與候選地圖事件格。
- [ ] 驗證此鏈的原版可達性／可靠操作，區分 50 條件與後續事件的背包副作用；其他間接呼叫未完整排除。
- [x] 使用者確認手動方向鍵／Esc 正常；0.3.0 核對 R1 五物品全缺並整理 OP50-NONE 手動清單。自動輸入仍受限。

## MASTER_PLAN v1.1：平台架構規劃

- [x] 更新主計畫為通用武俠 RPG 引擎＋金庸內容包，新增 Phase 13 及 ADR 0005。
- [x] 將內容／腳本／規則／MOD 契約及存檔內容組合驗證提前至 Phase 6。
- [ ] Phase 6：定義 Game Content Package manifest、穩定 ID、JSON Schema 與跨檔引用驗證器。
- [ ] Phase 6：實作受控 Event／Dialogue Runtime、Rule Engine、條件運算器與可序列化續行。
- [ ] Phase 6：建立確定 MOD 依賴／排序／衝突解析，並以原版包及獨立 Mock 原創包驗收。
- [ ] Phase 6／10：保存精確內容與 MOD 組合、預檢不相容變更，測試備份與存檔遷移。
- [ ] Phase 13（首個 MVP 後）：交付完整劇情／事件及地圖／NPC 編輯器、自動化劇情測試、MOD 匯入／匯出與版本管理，原版與自製內容保持隔離。

上述為已納入計畫的後續工作，不表示開始實作或略過目前 Phase 1／2 的原版驗收。

## 當前研究與前置工作

- [x] Phase 2：完成固定來源建置依賴矩陣；按 A Makefile、B Windows／Android 組態區分需求，保留三個建置檔雜湊與 vcxproj 明載設定。
- [ ] 僅在特定問題需要建置 B 時，釐清音效後端／連結清單與 Windows 外部依賴並配置工具鏈；目前不是優先工作。

- [x] Phase 2：完成 A／B 固定版本 src 共 39 個 C／C++ 檔的聲明／雜湊盤點，補入 tml ZLIB 與 list.h 上游線索；完整授權審查仍未完成。
- [x] Phase 2：核對 B 的 Android ARM64 CMake 配置及目前 PATH 工具鏈；更新建置阻礙與 ADR 0007。

- [x] 規範、workspace、TS 建置與測試。
- [x] 資料隔離、匯入規範、唯讀盤點器。
- [x] 公開研究初稿與建置阻礙紀錄。
- [x] Phase 0：Python 3.14.7、標準函式庫、.venv 與 pip 已驗收。
- [x] Phase 1：收到安裝後 DOS 目錄，完成 627 檔盤點、兩次雜湊一致及 Git 排除檢查。
- [x] Phase 1：記錄使用者說明：原始中文版，無 MOD 或修補。
- [ ] Phase 1：確認精確發行版本、中文編碼與取得來源，交叉驗證目錄完整性及檔案一致性。
- [ ] Phase 1：核對實際 bytes、版本與格式。
- [x] Phase 2：取得兩候選研究所需來源，固定 commit 並定位主要函式。
- [ ] Phase 2：完成逐檔與外部依賴授權審查。
- [ ] Phase 2：讀取 Makefile／solution，配置工具鏈，完成實際編譯與執行或完整失敗紀錄。
- [ ] Phase 2：建立事件、戰鬥、地圖、資源讀取函式與來源行號索引。
- [ ] Phase 2：取得 MOD 工具一手發布與授權，實測支援版本。
- [ ] Phase 2：完成引擎採用 ADR。
- [x] 按功能證據開始首個 IDX／GRP 邊界解析器與 Mock golden 測試；不表示完整資料解析驗收通過。


- [x] Phase 1／2：完成名稱編碼抽樣、地圖容量算術及事件轉換限制研究；見 encoding-map-conversion.md。
- [ ] Phase 1／2：確認完整文字資料的編碼，追查第 84 筆後地圖資料的原版用途；不可裁切非零尾端。
- [ ] Phase 2：取得 FishEdit 0.72 一手來源與授權，驗證匯出格式及 50 指令替代方案。

- [x] Phase 1／2：完成 5,668 個候選欄位編碼及 118 組索引邊界稽核，記錄 MMAP 尾端零值例外。
- [x] Phase 2：確認固定 commit 四個事件修正副本與對應事件完全相同。
- [ ] Phase 1／2：追查 MMAP 索引保留區、原版 TALK 與 KDEF 讀取來源；在證據不足前不推定轉碼或 opcode 配置。

- [x] Phase 2：取得 Pascal 候選的 TALK／KDEF 直接讀取來源並固定 commit。
- [x] Phase 1／2：確認 2,977 筆 TALK 的 CP950 解碼相容性與 1,018 筆 KDEF 的偶數長度。
- [ ] Phase 2：建立逐條 opcode 長度、參數與分支來源表，區分原版與社群擴充。
- [x] Phase 2：建立 68 條 Pascal 分派長度／參數槽／控制類別／來源行號表與實際布局稽核。
- [ ] Phase 2：解決指令 15 的來源差異、動態指令 50 與參數語意；不以跳過未知值方式推進。
- [x] Phase 2：取得 FishEdit 0.72 指令長度來源，確認 15 為兩單位的候選布局，完成 1,018 事件結構稽核。
- [x] Phase 2：確認 50 的五物品文件描述與 Pascal 動態版本有別，不將兩者混為同一語意。
- [ ] Phase 2：驗證指令 50 的分支設定／文件差異、15 附帶值的 DOS 用途與原版執行結果。
- [x] Phase 2：追查 Pascal 50 的完整分流與物品 ID 檢查，確認本機 138 走物品路徑；檢查事件 676 兩個目標邊界。
- [x] Phase 2：確認 114 條指令 15 均附帶 83，建立原版待執行案例矩陣。
- [ ] Phase 1／2：配置隔離的 DOSBox-X 執行與重播環境，執行 opcode-15-50-cases.md；原始資料不得作為可寫掛載。
- [x] Phase 1／2：下載官方 DOSBox-X 2026.10.01 portable，核對官方 SHA256、驗證 627 檔隔離副本，建立啟動腳本與日誌設定。
- [ ] Phase 1／2：確認遊戲聲音，並用 session-002 執行 15／50 案例；聲音及 opcode 的 DOS 執行效果仍待驗證。
- [x] 修正本機啟動指引：提供直接執行 DOSBox-X 的 CMD 啟動器，避免依賴未簽章的 PowerShell 腳本；既有隔離設定不變。
- [x] 使用者確認 CMD 可啟動；直接觀察原版主選單、成功載入進度一至大地圖，保存原生截圖與 17 檔證據快照。
- [x] 確認可靠方向鍵及 Enter 輸入；以既有進度一載入地圖。新增存檔及事件測試路線仍待 session-002 驗收。
- [ ] Phase 2：追查 sfe-kdef 缺少的核心原始碼與授權，不能以附帶 binary 視為完整來源。


- [ ] 以 2388 通行格圖核對重複出現的底面與相鄰重疊，尺寸待證據支持。

- [x] 本機預覽自動載入原圖世界並顯示可與 2388 格圖比對的 X／Y。

- [ ] 審核三個眾數並列ID及一個無錨點引用的building，再批次生成模型底面設定。

- [x] 更新服務理解並以非2388山體2398試跑點雲AI流程，輸出GLB與品質證據。

- [ ] 續跑 building-batch.py poll，直到批次工作完成；核對成功GLB後產生可匯入世界包及更新瀏覽替換控制。

- [ ] 擴充主機 semantic_geometry.py 支援其餘 building 圖像類別，或為不支援類別設計明確 fallback，再續跑批次。

- [ ] 主機幾何執行器改為支援AI plan回傳的所有分類／部件形狀，不以building圖層或資產類型排除；再續跑失敗及待處理工作。

- [x] 依使用者要求取消building批次所有工作；記錄278取消、19失敗、沒有執行中任務。

- [ ] 將實際角色半身肖像資源接入對話框，並在後續加入故事／道具內容後進行本機可玩性驗收。

- [ ] 將完整原版事件、人物、道具與場景切換轉換至本機測試包後，再作完整遊戲內容載入與可玩性測量。
