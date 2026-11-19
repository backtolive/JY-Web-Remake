# ADR 0044：原版 DOS 游標證據只附在相符的內容版本

2026-11-14。Status: Accepted for Phase 3 局部資料轉換。

全量 KDEF 中間資料原先依 FishEdit 候選長度切分，保留 opcode 55 的 `14/0` 候選跳轉；原版 DOS 單點 trace 卻在事件 464 觀察到五字後加 `-1`，落於第五個 word（值 `0`）。直接把社群條件分支寫成通用 Runtime 會混淆來源，也會漏掉游標落入候選參數的情況。

轉換器 0.2.0 只在 KDEF.GRP／KDEF.IDX **兩個** SHA-256 均符合已驗版本時附加 `originalDosCursor`。事件 464 四筆標 `Verified Original`；另外 24 筆僅因五字 bytes 同形而標 `Inferred from same-shape source bytes`。候選 FishEdit 目標仍以 `branchSemantics: unverified` 留存。產物保持 `executable:false`，不影響通用引擎；若輸入版本變動，不附加 DOS 游標註記。見[全量產物紀錄](../validation/full-original-event-corpus.md)與[原版 trace](../validation/opcode-55-original-event464-trace-20261114.md)。
