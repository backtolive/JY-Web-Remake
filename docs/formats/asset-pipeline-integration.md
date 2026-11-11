# 資產轉換管線整合（JY 3D Asset Production）

## 2026-11-03 查證修正（優先於下列歷史批次判讀）

先前「building ID 不是圖片索引」尚未成立。固定來源載圖介面將圖號除以 2；場景 1 的 SDX001／SMP001 half-index 候選讓 11 個 building ID 都取得有效標頭範圍，包含 96×160 等圖片。先前直接索引 MMAP 的 1×1 結果不能當作正確圖片；ground 批次亦需重核對。詳見 ../research/tile-resource-mapping.md。

地板／牆壁優先使用版本化規則建構平面／四方體，不必逐 tile 生成模型。圖片包圍盒、繪圖偏移及 layer 4／5 垂直位移皆不直接代表 3D 尺寸；需明確原創映射。歷史作業成功只證明服務處理該 PNG，未證明輸入圖片 ID 正確。

Base URL: `http://192.168.31.254:8765`

## Agent 契約

- 先讀 `GET /health/ready`，確認 `ready=true`。
- 提交：`POST /api/jobs`，`multipart/form-data`。
- 欄位：
  - `files`：1–6 個檔案，每檔 ≤20 MiB；PNG 必須有 alpha mask。
  - `asset_type`：`prop` / `character` / `building` / `scene`。
  - `asset_id`：選填，空白由內容 SHA 產生。
  - `max_attempts`：1–3。
  - `seed`：0–4294967295。
  - `texture_resolution`：512 或 1024。
- 輪詢：`GET /api/jobs/{job_id}`，直到 `succeeded` / `failed` / `cancelled`。
- 下載：`GET /api/jobs/{job_id}/artifacts/{name}`。
- 質量報告：`GET /api/jobs/{job_id}/artifacts/quality`。

## 測試驗證（2026-11-03）

- 提交 64×64 透明 PNG（Mock 貼圖）。
- Job ID：`792115072d8041848062a5bce7a81e1c`
- 狀態：`queued_inference → inferencing → processing → succeeded`
- 產物：`master`、`lod0/1/2`、`collider`、`manifest`、`metadata`、`quality`
- Manifest `gameplay_ready`: `false`（Mock 貼圖，人物/建築尚未 rigging/animation）

## 與本專案整合原則

- 原版圖片只在本機處理，不提交商業素材。
- 資產 ID 必須與 region mapping 的 source ID 對應。
- 轉換後的 GLB/manifest 保留在 `assets/generated` 或本機資產目錄。
- Web 預覽只載入本機資產，公開建置仍只含 Mock。
- 視覺幾何不得改動遊戲碰撞與邏輯。

## 區域資產 ID（場景 1, origin 13,28, 8×8）

- Ground tile IDs：4, 8, 18, 24, 34, 36, 40, 50, 64, 70, 144, 146, 148, 150, 152, 154, 158, 164, 166, 168, 1182
- Building tile IDs：2288, 2304, 2362, 2792, 2794, 2858, 2860, 2984, 3002, 3240, 3242
- Object tile IDs：none
- Event slot：2（NPC）

## 批次測試結果（2026-11-03）

提交 6 張 36×18 原版 ground tile PNG：
- 2 個 succeeded（`cd1cfa30`、`e266bdc2`）
- 2 個 failed（collider non-convex / triangle count changed）
- 1 個 retry 後仍 failed
- 1 個 inferencing/queued

失敗原因為管線 Blender verify 對小尺寸/平面 tile 的 collider 拓撲限制，不是 Web 端問題。

## 後續步驟

1. 對 tile 類資產調整輸入或使用 `asset_type=prop` 並接受 verify 失敗；或只使用 `raw_glb`。
2. 取得原版圖片並對應上述 ID。
3. 用本管線轉換為 GLB。
4. 將結果與 region mapping 對接。
5. 在 Web 預覽載入 HD 資產，驗證座標與碰撞分離。
