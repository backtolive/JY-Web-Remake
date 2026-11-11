# 規則幾何最小場景 — 2026-11-03

Phase: 7／8 局部。Status: Mock 多四方體契約與遊戲內呈現完成，非原版 3D 還原。

本機使用：`pnpm run dev` 或 build 後 preview，在「內容與測試設定 → 匯入本機地圖區域預覽」選取 `tests/fixtures/mock-primitive-workshop.json`。

4×4 Mock 場景有 16 個 1×0.12×1 地板部件、一面 0.2×1.8×1 牆、三個高度 0.2／0.4／0.6 的階梯部件。每部件定義位置、Y 旋轉與純色材質 ID；單位為原創格子世界單位。position.y 是基底＋offset＋半高，厚度不影響邏輯高度或移動。

地圖 blocked 僅有格 (2,1)。實際瀏覽器按右下方向（格子 east）仍阻擋；視覺牆厚度與邏輯整格碰撞獨立。renderer 不再額外將區域 blocked 畫成牆。未新增階梯爬升功能，階梯只作視覺組裝測試。

新 module packages/game-data/src/visual-primitive.ts 不依賴 UI 或 Babylon。map-region.ts 可選 geometry／baseY，不再對新幾何套用來源 buildingHeight×0.25。legacy asset 預覽仍保留舊行為，不能將舊高度當原版物理高度。

驗證：3 項新增 Node 測試涵蓋確定性／輸入不變、非法版本／尺寸／轉換／材質／預算拒絕，以及 geometry 忽略來源繪圖高度且不改碰撞。33 Node、8 Python、typecheck、Schema、build／artifact 通過，既有 Babylon chunk 提示保留。

新增 Chromium 案例透過 FileChooser 匯入 Mock 包、檢查 WebGL ready、按鈕碰撞與畫布中的牆／階梯顏色，截圖已用 view_image 實際檢視。完整 E2E 結果見 PROGRESS。截圖位於本機 ignored assets/generated/e2e-results。

限制與下一步：純色材質尚無貼圖／UV，未支援曲面或樹木模型；原版逐資源分類及尺寸仍待覆核。下一步把已確認地面 ID 映射到明確原創地板規則，未分類上層資源保留診斷；不直接將全部圖片送模型服務或將全部 building 擠出成牆。
