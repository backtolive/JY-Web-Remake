# 場景 1 小區域像素解碼 — 2026-11-03

Phase: 3／8 局部。Status: 選定資源 RLE 解碼與靜態合成完成，非完整原版畫面或 3D 驗收。

命令：`.venv/Scripts/python.exe tools/extractor/decode-scene-region.py original/dos`。

輸出：assets/generated/scene1-rle 的 32 張 RGBA PNG、region.png（318×249）、manifest.local.json。場景 1 起點 (13,28) 8×8，86 次地面／上層圖像放置；事件人物及區域外物件明確排除。資源圖號除 2，使用 SDX001／SMP001，索引只驗證選中區段，尾端未正規化。

來源沿用固定 jinyong-legend commit 89962d7fc2837c143e176c306d83b4e38dab6e77：piccache.c:296–303 圖片 signed 標頭；371–424 行透明跳格／不透明 run；457–469 色盤 RGB ×4；mainmap.c 場景繪圖中圖層及 y 位移。18／9 投影為預覽用社群慣例，非 DOS 原版驗證。

嚴格檢查圖片尺寸、每行長度、run 像素數與資料邊界、完整消耗及 768-byte 6-bit 色盤。透明區依 RLE 空格輸出 alpha=0，run 像素 alpha=255（含色盤 index 0，不將其一律透明）。來源檔案與逐資源 SHA256、byte 偏移／長度、圖片尺寸／錨點、格子與畫面位置均寫入 manifest。四個輸入前後 bytes 比較相同。

實際視覺檢查：合成圖可辨識草地、土路、樹木、告示牌、階梯與欄杆，未觀察到明顯 row 撕裂；不等於與 DOS 畫面逐像素對照。證明 building 圖層不能一律分類為牆。自動四方體適用於明確分類的地板／階梯／柱桿等；樹葉等需獨立資產類別。圖片無法單獨確定真實厚度、方向或背面。

Mock 測試涵蓋透明 run／色盤 index 0／signed 錨點、PNG scanline 與 CRC、損壞 rows／尺寸／色盤／尾端拒絕。無新增第三方依賴，未修改 Web runtime，未重新執行瀏覽器 E2E；靜態預覽已實際檢視。本輪測試結果見 PROGRESS。

Known Limitations: 色盤依社群縮放，無 DOS 字型／顏色校準；區域剪取可能缺少外部遮擋；原版完整畫面比對、其他場景／戰鬥索引及索引尾端用途未驗收。

Next: 建立資源分類覆核表及版本化 primitive／尺寸／材質契約，先以可確認地面和規則結構做 Mock 3D，未分類資源診斷或顯式佔位，不將全部 building 資源擠出成牆。
