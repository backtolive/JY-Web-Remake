# 門口通行與建築剖視 — 2026-11-03

Phase: 3／6／7／8局部。Status: 社群通行轉接一致化與獨立Mock建築剖視驗證完成，非原版門／屋頂驗收。

## 來源建築

`node tools/extractor/prepare-building-preview.mjs original/dos` 產生 ignored `assets/generated/building-preview/building-92575fe35b46bcaa.local.json`。包0.2.0、MapRegion parser0.2.0，原版來源bytes不變。以既有本機區域預覽匯入。

scene-passability.ts被map-region與prepare-mvp共用。門口(22,26) event slot15欄位0=0，按固定社群來源可通行；blocked由20降19。其他建築／水面／阻擋事件仍阻擋；缺事件引用不能默認可通行。地圖邊界與斜角禁止穿角仍由通用核心處理。

原版區域(13,28)完整占位重跑產生 `ground-e06ef553b5bc969e.local.json`，碰撞仍22格；與舊51937包相比只有來源策略metadata／hash等變更，不能把舊包就地覆寫。mvp:check包含三個NPC可達、對話及存讀續行通過。

門口未執行slot15的自動／互動腳本，沒有新增開門或portal。原始欄位包含672，但本輪不解釋或轉譯其效果。新版預覽明確告知腳本未轉換；僅移動可行，不表示完整劇情可行。牆片資產標cutaway，可手動隱藏改善角色可見性。

## 獨立Mock建築

`node tools/extractor/prepare-building-demo.mjs` 產生 ignored `assets/generated/building-demo/mock-building-cutaway.json`，不讀任何原版資料。7×7、直牆／牆角、入口(3,4)、窗洞、室內桌子及獨立藍色屋頂，尺寸全部原創。

匯入後使用「隱藏屋頂與遮擋牆面（僅改顯示）」；角色可穿過門洞到室內。隱藏屋頂／牆面後位置不變，隱藏的牆仍阻擋；桌子和斜角也不因剖視而穿透。取消勾選可恢復。視角選項不寫入遊戲存檔，不是開門狀態或碰撞命令。

Node驗證門洞／牆／桌子、禁止穿角、存讀及刪除視覺資料不改package；來源profile測試驗證事件flag=0／1／缺引用、水面偶數ID與building。來源建築測試由「保守阻擋」改驗證已確認通行，仍拒絕錯誤gate引用或不相容遮擋mask。

## 驗證結果

51 Node、9 Python、Schema、typecheck、build／artifact、diff及mvp:check通過，完整Chromium15 passed（38.9秒）、exit0。Mock E2E以畫布藍色像素>1000確認屋頂可見，勾選後<50確認確實隱藏，取消後恢復；同時核對室內座標與牆／桌阻擋。來源E2E走過門口並切換剖視，位置不變。兩張Mock顯隱截圖已view_image檢視。CLI重跑相同內容，原版衍生／Mock生成包均確認Git忽略，既有Babylon chunk提示保留。

限制：手動隱藏指定物件，尚無自動遮擋淡出／角色輪廓；Mock不是原版屋頂，不支援門扇動畫、垂直爬升或按模型輪廓細分碰撞。來源通行仍Community Implementation，來源事件功能停止在未轉譯界線。

Next: 覆核牆角／窗洞／屋頂的視覺尺度與剖視使用感受，決定是否需要角色輪廓或自動淡出。精細化前先明確共同模型尺寸／材質規範，不把新屋頂加入原版包。
