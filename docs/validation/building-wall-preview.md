# 第二個來源切片：牆與門口 — 2026-11-03

最新修正：本頁下列保守阻擋為歷史結果，已由共享社群通行判定取代；新版包0.2.0允許通過門口，事件效果仍不執行。詳見 building-passage-cutaway.md／ADR0026，勿以本頁舊測試推定原版門不可通行。

Phase: 3／7／8 局部。Status: 來源牆片與門口視覺配置驗證完成，門行為與屋頂未驗收。

```powershell
.venv/Scripts/python.exe tools/extractor/decode-scene-region.py original/dos 20 22 8 8
node tools/extractor/prepare-building-preview.mjs original/dos
```

輸出 ignored `assets/generated/scene1-rle-20-22-8-8` 的12張PNG／288×171合成圖，以及 `assets/generated/building-preview/building-00ddf269ea514ca7.local.json`。後者以現有本機區域預覽匯入，不隨網站發行。

## 來源檢視

先唯讀檢視(20,20)16×16合成圖，定位建築前牆、柱及門口；再縮為(20,22)8×8。固定來源／解碼語意沿用RLE及圖塊映射研究，Community Implementation，沒有新增DOS行為驗證。

| 圖號／索引 | 尺寸 | 可見外觀 | 本輪映射 |
|---|---|---|---|
| 1708／854 |20×63|木格牆片|寬1、厚0.12、高1.65原創box|
| 1710／855 |21×64|牆片＋紅柱|牆與0.15×1.9×0.18柱|
| 1712／856 |20×64|另一門側牆片＋紅柱|牆與相反側柱|
| 2858／1429 |21×25|欄杆|沿用已確認分類的原創proxy|

圖片像素尺寸不決定上述3D尺寸。選區2種ground ID、4種已映射building ID，另4種家具圖號2458／2460／2462／2464及2種object圖號4858／4860仍未映射，後兩張直接檢視為桌上器物。沒有已確認屋頂，不補造。77個視覺實例含64地板、7牆／柱組合、6欄杆。

## 門口差異

門口來源格(22,26)、相對(2,4)，event slot15，ALLSIN layer3 bytes offset77100；ALLDEF slot原值位於4730：`[0,15,-1,-1,672,-1,-1,-1,0,22,26]`。欄位0=0，依ADR0015的社群SceneCanPass應可通行；但區域提取器仍採所有event slot>=0阻擋，且此preview不執行原版事件。故目前在此格停止，不能宣稱原版門口無法通過。這項差異已回報並單獨追蹤，未為了讓測試通過而改原始資料或移除阻擋。

入口選在來源(22,27)、相對(2,5)，未宣稱為原版出生點。20個保守blocked原樣保存，沒有portal／門扇／事件轉換。

## 測試與觀察

49 Node、9 Python、typecheck、Schema、build／artifact、diff通過，完整Chromium14 passed（33.4秒）、exit0。新增2項Mock驗證牆／保守事件格阻擋、來源引用變化拒絕及無推定portal；Python新增選區bounds拒絕。optional來源E2E匯入、WebGL ready、說明、移動受阻及位置不變通過。重跑相同hash輸出、來源讀取前後hash不變，產物Git忽略。

view_image檢視原圖及遊戲截圖：牆、紅柱、門口缺口可見；目前牆／柱會遮擋部分角色。這是本次發現的呈現限制，尚未加遮擋淡出／輪廓提示。沒有測得完整室內外動線、開門、切圖或屋頂顯隱。

Next: 優先處理區域提取器與ADR0015通行規則差異，釐清門口事件的觸發需求；以獨立Mock驗證可通行門洞、牆角、屋頂顯隱及角色遮擋，不冒充原版建築還原。之後再擴家具／材質與精細化。
