# ADR 0015：事件 670 可達性阻礙的唯讀追查結果

Date: 2026-11-03。Status: Accepted for collision-model correction; still Community Implementation, not Verified Original.

## 發現

- jinyong-legend 的 `SceneCanPass` 規則為：
  1. layer 1（建築／物件）> 0 即不可通行；
  2. layer 3（事件格）>= 0 時，只有當該事件欄位 0 == 0 才可通行；
  3. layer 0（地面）屬於 `CC.SceneWater` 集合時不可通行。
- 原本預覽模型把所有 `event slot >= 0` 的格子都視為牆，過於保守；空事件格（欄位 0 == 0）實際可通行。
- 因此場景 1 欄 17 的建築牆仍阻擋左右移動，但上方／下方存在由空事件格組成的通道，可繞到 NPC 所在區域。

## 調整

- `prepare-mvp.mjs` 的 blocked 計算改用上述規則：建築 > 0、水地面、且事件欄位 0 != 0 才阻擋；空事件格可通行。
- 水地面 ID 集合採 `CC.SceneWater` 的十六進位範圍。
- 候選包（`--candidate`）現在可通過 `checkSliceNpcs`，包含槽 3／4 與事件 670，且對話存讀續行測試通過。

## 限制

- 規則來源為社群復刻引擎（jinyong-legend），等級 Community Implementation，未經 DOS 原版驗證。
- 仍不宣稱完整原版通行判定或事件 670 已還原；其他間接呼叫與動態狀態尚未排除。
- 原版精確版本、授權、15／50 與戰鬥公式仍待證據。