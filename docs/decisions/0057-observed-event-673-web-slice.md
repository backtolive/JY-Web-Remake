# ADR 0057：事件 673 的場景 32 本機採樣切片

日期：2026-11-19。狀態：Phase 3／6／7 局部驗收；非完整原版遊戲。

場景 32 的事件層在 (31,25) 指向槽 0，初始 `ALLDEF.GRP` 欄 2 指向事件 673。(31,24) 可通行，故本機預覽以此作**測試入口**，不宣稱是原版進場位置。產生器 `tools/extractor/prepare-event-673-web-preview.mjs` 只接受已釘選的 KDEF、TALK、ALLDEF、RANGER 來源；輸出到忽略提交的 `assets/generated/mvp/original-event-673-*.local.json`。玩家在 Web 本機選檔，部署包不含原版資料。

內容包中的 `end` 事件只是 v0.1 NPC 引用必備的占位標記。Web 以專用轉接器攔截該 NPC，缺少 `observedEvent673` 附件、來源雜湊或轉換內容身分不符時拒絕匯入，不執行占位事件。通用 Runtime 仍不含原版 ID。對話 12 次暫停及限定效果經原版轉接器處理；完成時同時提交主角資質 `72→75` 和場景 32 槽 0 欄 2 `673→674`。

本機切片存檔包含 Web 玩家位置、對話游標、角色覆蓋層和事件槽覆蓋層，並鎖定 Web 包身分、設定、轉換內容與來源雜湊。讀回前驗證所有狀態，失敗不覆寫現有遊戲；本機第二次儲存會保留前一份備份。這是獨立的 `observed-673-web-slice` 格式，並非 DOS 存檔，也不遷移既有 v1／v4 存檔。

起始資質 72 是已觀察 DOS 採樣的前置狀態；原始 `RANGER.GRP` 同欄為 50。此切片未證明自然劇情可達性、其他場景／事件、通用 opcode 3／34 規則或正式人物數值系統。地圖美術仍為占位呈現。逐項證據見 [ADR 0054](0054-event-673-scoped-conversion-comparison.md)、[ADR 0056](0056-original-role-field-overlay.md) 及 [opcode 34 DOS 觀察](../validation/opcode-34-dos-observation.md)。
