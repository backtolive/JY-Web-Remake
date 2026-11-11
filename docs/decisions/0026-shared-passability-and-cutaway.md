# ADR 0026：統一來源通行規則，剖視只改顯示

Date: 2026-11-03。Status: Accepted for scoped preview。

scene-passability.ts保存固定社群來源的SceneCanPass判定：非零建築、水地面集合、非零事件阻擋欄位；缺事件引用仍保守阻擋並回傳原因。事件欄位0=0可通行。map-region與prepare-mvp共用此函式，消除兩條轉接路徑差異。來源為固定A commit的script/jymain.lua:1397–1414及jyconst.lua:378–383，仍為Community Implementation，不是Verified Original。

MapRegion parser升0.2.0並記錄collisionProfile。來源建築包升0.2.0，門口可移動穿過，但腳本效果／開門／切圖仍未支援；能移動不能當完整原版門事件驗收。舊包保持原hash，不覆寫玩家存檔；相容性仍由精確內容hash檢查。

視覺資產可明確附cutaway boolean。renderer切換可見性，不改核心state／blocked／模型尺寸；SceneView與App提供顯示選項，不將它變成遊戲命令。獨立Mock有牆角、可通行門洞、窗洞、桌子與屋頂，測試顯隱與通行分離；Mock屋頂不代表來源建築的真實結構。

本輪是手動剖視，不是角色遮擋自動偵測、逐物件淡出、屋頂碰撞或門扇動畫。改動資料轉接規則與新增視覺控制分開驗證，未知腳本只停止事件功能，不再無條件封鎖已有通行證據的格子。
