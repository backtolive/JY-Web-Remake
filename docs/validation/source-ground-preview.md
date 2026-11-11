# 原版地面規則預覽 — 2026-11-03

Phase: 3／7／8 局部。Status: 21 個地面 ID → 64 個原創 box 的本機預覽完成；未完成原版美術還原。

重跑：

```powershell
.venv/Scripts/python.exe tools/extractor/decode-scene-region.py original/dos
node tools/extractor/prepare-ground-preview.mjs original/dos
```

產物為忽略的 assets/generated/ground-preview/ground-4d1fc109cb7a182c.local.json。Web「內容與測試設定 → 匯入本機地圖區域預覽」選取該檔。圖片及衍生平均色未進網站成品，也未提交。

圖片平均色只計入 alpha 不為零的像素，各 RGB channel 取整數平均。每地面 box 的頂面為 y=0、底面為 -0.12，世界 x/z 以選區相對座標放置；保留絕對來源格子位置。圖片繪圖高度不參與幾何設定。上層 11 個 ID 全列 UNMAPPED_RESOURCE，不生成模型；UI 告知資源尚未呈現及碰撞獨立。

converter 固定核對 RLE manifest 版本及 SDX001／SMP001／MMAP.COL／ALLSIN 雜湊，另保存 RANGER／ALLDEF 等七份來源雜湊、逐格 ground bytes 偏移、21 個原圖來源偏移／長度／SHA256、解析版本及映射。缺地面圖號／顏色／引用證據或無合法入口立即拒絕。輸出以內容雜湊命名，已存在必須 bytes 一致；來源讀取前後雜湊核對。

驗證：35 Node、8 Python、typecheck、Schema、build／artifact 通過。完整 Chromium 7 passed（16.3 秒）、exit 0；補完來源 metadata 後最新 bundle 又單獨驗證 1 passed（3.2 秒）、exit 0。實際截圖已 view_image 檢視：地板涵蓋 8×8，顏色分區與原選區相符，沒有把上層畫成牆；不宣稱逐像素原版一致。兩項新增 Mock 測試涵蓋可重現、尺寸／相對定位、來源缺失拒絕、碰撞不變及上層診斷。重跑生成同一路徑，確認 Git 忽略。

Known Limitations: 視覺只有平均色，不含草地／土路細節、UV 或照片材質；碰撞沿原區域提取器保守結果，非 DOS 驗證；未支援上層與事件人物。現有通用區域頁面部分文案仍沿用 Mock 試玩呈現，實際包 manifest 明確 original-derived，幾何明確 original-authored。

Next: 逐資源覆核 11 個上層 ID，拆分可規則建構的柱桿／階梯與需特殊模型的樹木／告示牌，保留尺寸推論等級；再補可替換材質／UV，不改邏輯碰撞。
