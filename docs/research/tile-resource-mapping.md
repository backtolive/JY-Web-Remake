# 場景圖塊索引與幾何映射查證 — 2026-11-03

Phase: 3／8 局部。Status: 來源與標頭候選核對完成，未完成像素解碼及 3D 尺寸驗收。

## 來源證據

固定 jinyong-legend commit `89962d7fc2837c143e176c306d83b4e38dab6e77`：

- src/piccache.c:188：載圖介面先將圖號除以 2；296–303 讀 signed 16-bit width／height／xoff／yoff，再以 RLE 建圖；244–245 將偏移自畫面座標扣除。
- src/mainmap.c:842–883：地面、建築、空中物件均送入相同載圖介面；建築使用 y1-d4，空中物件使用 y1-d5。因此 layer 4／5 為此來源的畫面垂直位移，不能直接當成物體自身高度或厚度。
- script/jyconst.lua:92–94、script/jymain.lua:438：社群版本將大地圖／場景／戰鬥分別配置 mmap／smap／wmap；readme.txt:371 明言場景／戰鬥圖片檔經合併。不能將該版本 smap 檔名直接套到 DOS 輸入。

以上為 Community Implementation，非 Verified Original；沒有複製第三方實作。

## 本機 bytes

工具：` .venv/Scripts/python.exe tools/analyzer/probe-tile-headers.py original/dos `。本輪 stdout 保存到忽略的 assets/generated/tile-headers.local.json。報告保留完整輸入雜湊、來源檔、候選索引／偏移／長度與標頭，前後核對來源 bytes 不變；未輸出圖片。

場景 1 區域 (13,28)、8×8 共 32 個 layer／ID 組合（21 ground、11 building），全部 ID 為偶數。比較 MMAP 與場景專用 SDX001／SMP001 的 direct／half 候選。SDX001／SMP001 的 half 候選 32 筆均有有效標頭範圍；ground 尺寸為 36×18 或 36×22。

| 建築圖層值 | 除 2 後候選資源索引 | SMP001 圖片尺寸 |
|---|---:|---|
| 2288 | 1144 | 33×28 |
| 2362 | 1181 | 36×34 |
| 2792 | 1396 | 96×160 |
| 2794 | 1397 | 95×152 |
| 3240 | 1620 | 37×92 |

先前直接用原值索引 MMAP 得到 1×1，不能證明 building 不是圖片索引。現有證據支持優先用「場景專用資源集＋圖號除 2」繼續解碼。仍須獨立完成 RLE／色盤／定位重組驗證，不能只憑標頭宣告已正確還原圖片。

SDX001 的尾端含零值／未覆蓋 SMP bytes，工具只檢查選定候選範圍，不裁切尾端、不宣稱整個容器已驗收。其他場景及戰鬥資源不自動套用此結論。

## 對規則幾何管線的影響

地面／牆壁可使用原創定義的平面／四方體規則。來源圖號用於查詢明確映射，但圖片寬高為像素包圍盒，定位偏移為繪圖錨點，都不等於 3D 長寬高。layer 4／5 不可當作牆體高度證據。目前 map-region.ts 的 height × 0.25 僅為 Mock 呈現，尚未完成原版比例驗收。

下一步先以 SDX001／SMP001 候選做嚴格像素解碼、保留 alpha／錨點並重組小區域；同時定義資源 ID → primitive／尺寸／方向／材質／偏移的版本化原創規則。不能因 layer 名為 building 就將所有資源自動判定為牆壁；碰撞持續獨立。

Tests Executed: Mock 候選索引／來源偏移／可重現與輸入不變測試、Python suite、Node suite、typecheck、build；結果記錄於 PROGRESS。本輪不改 Web runtime，不提交原版資源。
